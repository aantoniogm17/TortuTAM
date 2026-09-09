using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TortuTAM.Api.Contracts.Common;
using TortuTAM.Api.Contracts.Fichas;
using TortuTAM.Api.Data;
using TortuTAM.Api.Models.Dominio;
using TortuTAM.Api.Services;

namespace TortuTAM.Api.Controllers;

[ApiController]
[Route("api/fichas")]
[Authorize]
public class FichasController(DominioDbContext dominioDb, IAlmacenamientoFotos almacenamientoFotos) : ControllerBase
{
    private const string EncabezadoIdempotencia = "Idempotency-Key";

    private static readonly string[] AletasValidas = ["izquierda", "derecha"];
    private static readonly string[] SexosValidos = ["H", "M", "ND"];
    private static readonly string[] NuevaORecapValidos = ["N", "R"];
    private static readonly FileExtensionContentTypeProvider ProveedorTipoContenido = new();

    [HttpPost]
    public async Task<ActionResult<FichaDetalleResponse>> Crear(FichaRequest request, CancellationToken cancellationToken)
    {
        var claveIdempotencia = ObtenerClaveIdempotencia();
        if (!string.IsNullOrWhiteSpace(claveIdempotencia))
        {
            var existente = await CargarDetalleAsync(f => f.IdempotencyKey == claveIdempotencia, cancellationToken);
            if (existente is not null)
            {
                return Ok(existente);
            }
        }

        var errores = await ValidarAsync(request, cancellationToken);
        if (errores.Count > 0)
        {
            return BadRequest(new { errores });
        }

        if (await dominioDb.Fichas.AnyAsync(f => f.NumeroFicha == request.NumeroFicha, cancellationToken))
        {
            return Conflict(new { mensaje = $"Ya existe una ficha con numero_ficha '{request.NumeroFicha}'." });
        }

        var ficha = new Ficha { NumeroFicha = request.NumeroFicha };
        AplicarCambios(ficha, request);
        AgregarMarcas(ficha, request.Marcas);
        ficha.IdempotencyKey = string.IsNullOrWhiteSpace(claveIdempotencia) ? null : claveIdempotencia;

        dominioDb.Fichas.Add(ficha);

        try
        {
            await dominioDb.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (EsViolacionUnica(ex, "uq_fichas_idempotency_key"))
        {
            var existenteConcurrente = await CargarDetalleAsync(f => f.IdempotencyKey == claveIdempotencia, cancellationToken);
            if (existenteConcurrente is not null)
            {
                return Ok(existenteConcurrente);
            }

            throw;
        }
        catch (DbUpdateException ex) when (EsViolacionUnica(ex, indice: null))
        {
            return Conflict(new { mensaje = $"Ya existe una ficha con numero_ficha '{request.NumeroFicha}'." });
        }

        var detalle = await CargarDetalleAsync(f => f.Id == ficha.Id, cancellationToken);
        return CreatedAtAction(nameof(Detalle), new { id = ficha.Id }, detalle);
    }

    [HttpGet]
    public async Task<ActionResult<PaginaResponse<FichaResumenResponse>>> Listar(
        [FromQuery] string? numeroFicha,
        [FromQuery] int? playaId,
        [FromQuery] string? pit,
        [FromQuery] byte? accionCodigo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        var query = dominioDb.Fichas.AsQueryable();

        if (!string.IsNullOrWhiteSpace(numeroFicha))
        {
            query = query.Where(f => f.NumeroFicha.Contains(numeroFicha));
        }

        if (playaId is not null)
        {
            query = query.Where(f => f.PlayaId == playaId);
        }

        if (accionCodigo is not null)
        {
            query = query.Where(f => f.AccionCodigo == accionCodigo);
        }

        if (!string.IsNullOrWhiteSpace(pit))
        {
            query = query.Where(f => dominioDb.Marcas.Any(m => m.FichaId == f.Id && m.Pit == pit));
        }

        var total = await query.CountAsync(cancellationToken);

        var elementos = await query
            .OrderByDescending(f => f.Fecha)
            .ThenByDescending(f => f.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(f => new FichaResumenResponse(
                f.Id,
                f.NumeroFicha,
                f.PlayaId,
                f.Fecha,
                f.EspecieCodigo,
                f.AccionCodigo,
                f.UsoNidoCodigo,
                f.NumeroNido,
                f.CreadoEn))
            .ToListAsync(cancellationToken);

        return Ok(new PaginaResponse<FichaResumenResponse>(total, page, pageSize, elementos));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<FichaDetalleResponse>> Detalle(int id, CancellationToken cancellationToken)
    {
        var detalle = await CargarDetalleAsync(f => f.Id == id, cancellationToken);
        return detalle is null ? NotFound() : Ok(detalle);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<FichaDetalleResponse>> Actualizar(int id, FichaRequest request, CancellationToken cancellationToken)
    {
        var ficha = await dominioDb.Fichas
            .Include(f => f.Marcas)
            .AsTracking()
            .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);

        if (ficha is null)
        {
            return NotFound();
        }

        var errores = await ValidarAsync(request, cancellationToken);
        if (errores.Count > 0)
        {
            return BadRequest(new { errores });
        }

        var numeroDuplicado = await dominioDb.Fichas
            .AnyAsync(f => f.Id != id && f.NumeroFicha == request.NumeroFicha, cancellationToken);
        if (numeroDuplicado)
        {
            return Conflict(new { mensaje = $"Ya existe otra ficha con numero_ficha '{request.NumeroFicha}'." });
        }

        AplicarCambios(ficha, request);
        SincronizarMarcas(ficha, request.Marcas);

        try
        {
            await dominioDb.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (EsViolacionUnica(ex, indice: null))
        {
            return Conflict(new { mensaje = $"Ya existe otra ficha con numero_ficha '{request.NumeroFicha}'." });
        }

        var detalle = await CargarDetalleAsync(f => f.Id == id, cancellationToken);
        return Ok(detalle);
    }

    [HttpPost("{id:int}/fotos")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<IReadOnlyList<FichaFotoResponse>>> SubirFotos(
        int id, [FromForm] IFormFileCollection archivos, CancellationToken cancellationToken)
    {
        var fichaExiste = await dominioDb.Fichas.AnyAsync(f => f.Id == id, cancellationToken);
        if (!fichaExiste)
        {
            return NotFound();
        }

        if (archivos is null || archivos.Count == 0)
        {
            return BadRequest(new { mensaje = "Debe adjuntar al menos un archivo." });
        }

        var invalidos = archivos.Where(a => a.Length == 0 || !EsImagen(a)).Select(a => a.FileName).ToList();
        if (invalidos.Count > 0)
        {
            return BadRequest(new
            {
                mensaje = "Los siguientes archivos no son imágenes válidas o están vacíos.",
                archivos = invalidos
            });
        }

        var fotos = new List<FichaFoto>();
        foreach (var archivo in archivos)
        {
            var rutaRelativa = await almacenamientoFotos.GuardarAsync(id, archivo, cancellationToken);
            fotos.Add(new FichaFoto { FichaId = id, RutaRelativa = rutaRelativa });
        }

        dominioDb.FichaFotos.AddRange(fotos);
        await dominioDb.SaveChangesAsync(cancellationToken);

        var respuesta = fotos.Select(MapearFoto).ToList();
        return CreatedAtAction(nameof(ListarFotos), new { id }, respuesta);
    }

    [HttpGet("{id:int}/fotos")]
    public async Task<ActionResult<IReadOnlyList<FichaFotoResponse>>> ListarFotos(int id, CancellationToken cancellationToken)
    {
        var fichaExiste = await dominioDb.Fichas.AnyAsync(f => f.Id == id, cancellationToken);
        if (!fichaExiste)
        {
            return NotFound();
        }

        var fotos = await dominioDb.FichaFotos
            .Where(f => f.FichaId == id)
            .OrderBy(f => f.CreadoEn)
            .ToListAsync(cancellationToken);

        return Ok(fotos.Select(MapearFoto).ToList());
    }

    [HttpGet("{id:int}/fotos/{fotoId:int}/archivo")]
    public async Task<IActionResult> DescargarFoto(int id, int fotoId, CancellationToken cancellationToken)
    {
        var foto = await dominioDb.FichaFotos
            .FirstOrDefaultAsync(f => f.Id == fotoId && f.FichaId == id, cancellationToken);
        if (foto is null)
        {
            return NotFound();
        }

        var rutaFisica = almacenamientoFotos.ObtenerRutaFisica(foto.RutaRelativa);
        if (!System.IO.File.Exists(rutaFisica))
        {
            return NotFound();
        }

        if (!ProveedorTipoContenido.TryGetContentType(rutaFisica, out var tipoContenido))
        {
            tipoContenido = "application/octet-stream";
        }

        var flujo = System.IO.File.OpenRead(rutaFisica);
        return File(flujo, tipoContenido);
    }

    private async Task<List<string>> ValidarAsync(FichaRequest request, CancellationToken cancellationToken)
    {
        var errores = new List<string>();

        if (string.IsNullOrWhiteSpace(request.NumeroFicha))
        {
            errores.Add("numero_ficha es obligatorio.");
        }

        if (!await dominioDb.Playas.AnyAsync(p => p.Id == request.PlayaId, cancellationToken))
        {
            errores.Add($"playa_id {request.PlayaId} no existe en el catálogo de playas.");
        }

        if (!string.IsNullOrWhiteSpace(request.EspecieCodigo)
            && !await dominioDb.Especies.AnyAsync(e => e.Codigo == request.EspecieCodigo, cancellationToken))
        {
            errores.Add($"especie_codigo '{request.EspecieCodigo}' no existe en el catálogo de especies.");
        }

        if (request.AccionCodigo is not null
            && !await dominioDb.Acciones.AnyAsync(a => a.Codigo == request.AccionCodigo, cancellationToken))
        {
            errores.Add($"accion_codigo {request.AccionCodigo} no existe en el catálogo de acciones.");
        }

        if (request.UsoNidoCodigo is not null
            && !await dominioDb.UsoNido.AnyAsync(u => u.Codigo == request.UsoNidoCodigo, cancellationToken))
        {
            errores.Add($"uso_nido_codigo {request.UsoNidoCodigo} no existe en el catálogo de uso de nido.");
        }

        if (!string.IsNullOrWhiteSpace(request.Sexo) && !SexosValidos.Contains(request.Sexo))
        {
            errores.Add("sexo debe ser H, M o ND.");
        }

        if (request.PosicionCodigo is not null && (request.PosicionCodigo < 1 || request.PosicionCodigo > 4))
        {
            errores.Add("posicion_codigo debe estar entre 1 y 4.");
        }

        if (request.Marcas.Count > 2)
        {
            errores.Add("Una ficha admite máximo 2 marcas (una por aleta).");
        }

        var aletasVistas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var marca in request.Marcas)
        {
            if (!AletasValidas.Contains(marca.Aleta))
            {
                errores.Add($"aleta '{marca.Aleta}' no es válida; use izquierda o derecha.");
                continue;
            }

            if (!aletasVistas.Add(marca.Aleta))
            {
                errores.Add($"Solo puede haber una marca por aleta ('{marca.Aleta}' está repetida).");
            }

            if (!string.IsNullOrWhiteSpace(marca.NuevaORecap) && !NuevaORecapValidos.Contains(marca.NuevaORecap))
            {
                errores.Add("nueva_o_recap debe ser N o R.");
            }
        }

        var requiereCoordenadas = request.Marcas.Any(m => !string.IsNullOrWhiteSpace(m.Pit));
        if (requiereCoordenadas && (request.Latitud is null || request.Longitud is null))
        {
            errores.Add("latitud y longitud son obligatorias cuando la ficha incluye una marca con PIT.");
        }

        if (request.Latitud is < -90 or > 90)
        {
            errores.Add("latitud debe estar entre -90 y 90.");
        }

        if (request.Longitud is < -180 or > 180)
        {
            errores.Add("longitud debe estar entre -180 y 180.");
        }

        return errores;
    }

    private static void AplicarCambios(Ficha ficha, FichaRequest request)
    {
        ficha.NumeroFicha = request.NumeroFicha;
        ficha.PlayaId = request.PlayaId;
        ficha.Estaca = request.Estaca;
        ficha.Zona = request.Zona;
        ficha.Fecha = request.Fecha;
        ficha.EspecieCodigo = request.EspecieCodigo;
        ficha.Sexo = request.Sexo;
        ficha.AccionCodigo = request.AccionCodigo;
        ficha.HoraA = request.HoraA;
        ficha.HoraBColecta = request.HoraBColecta;
        ficha.HoraCSiembra = request.HoraCSiembra;
        ficha.UsoNidoCodigo = request.UsoNidoCodigo;
        ficha.Corral = request.Corral;
        ficha.NumeroNido = request.NumeroNido;
        ficha.HuevosColectados = request.HuevosColectados;
        ficha.HuevosRotos = request.HuevosRotos;
        ficha.PosicionCodigo = request.PosicionCodigo;
        ficha.Latitud = request.Latitud;
        ficha.Longitud = request.Longitud;
        ficha.Formulo = request.Formulo;
        ficha.Observaciones = request.Observaciones;
        ficha.TumoresPresentes = request.TumoresPresentes;
        ficha.BioMuescaPuntaLargaCm = request.BioMuescaPuntaLargaCm;
        ficha.BioPuntaMuescaCm = request.BioPuntaMuescaCm;
        ficha.BioMuescaMuescaCm = request.BioMuescaMuescaCm;
        ficha.BioAnchoCm = request.BioAnchoCm;
        ficha.TemperaturaC = request.TemperaturaC;
    }

    private static void AgregarMarcas(Ficha ficha, IReadOnlyList<MarcaRequest> marcas)
    {
        foreach (var marca in marcas)
        {
            ficha.Marcas.Add(MapearMarcaNueva(marca));
        }
    }

    private static void SincronizarMarcas(Ficha ficha, IReadOnlyList<MarcaRequest> marcas)
    {
        var porAleta = marcas.ToDictionary(m => m.Aleta, m => m, StringComparer.OrdinalIgnoreCase);

        foreach (var existente in ficha.Marcas.ToList())
        {
            if (!porAleta.ContainsKey(existente.Aleta))
            {
                ficha.Marcas.Remove(existente);
            }
        }

        foreach (var (aleta, marca) in porAleta)
        {
            var existente = ficha.Marcas.FirstOrDefault(m => string.Equals(m.Aleta, aleta, StringComparison.OrdinalIgnoreCase));
            if (existente is null)
            {
                ficha.Marcas.Add(MapearMarcaNueva(marca));
                continue;
            }

            existente.Pit = marca.Pit;
            existente.NumeroMarca = marca.NumeroMarca;
            existente.Leyenda = marca.Leyenda;
            existente.NuevaORecap = marca.NuevaORecap;
            existente.CicatrizMarca = marca.CicatrizMarca;
            existente.Verifico = marca.Verifico;
        }
    }

    private static Marca MapearMarcaNueva(MarcaRequest marca) => new()
    {
        Aleta = marca.Aleta,
        Pit = marca.Pit,
        NumeroMarca = marca.NumeroMarca,
        Leyenda = marca.Leyenda,
        NuevaORecap = marca.NuevaORecap,
        CicatrizMarca = marca.CicatrizMarca,
        Verifico = marca.Verifico
    };

    private async Task<FichaDetalleResponse?> CargarDetalleAsync(
        Expression<Func<Ficha, bool>> predicado, CancellationToken cancellationToken)
    {
        var ficha = await dominioDb.Fichas
            .Include(f => f.Marcas)
            .AsNoTracking()
            .Where(predicado)
            .FirstOrDefaultAsync(cancellationToken);

        return ficha is null ? null : MapearDetalle(ficha);
    }

    private static FichaDetalleResponse MapearDetalle(Ficha ficha) => new(
        ficha.Id,
        ficha.NumeroFicha,
        ficha.PlayaId,
        ficha.Estaca,
        ficha.Zona,
        ficha.Fecha,
        ficha.EspecieCodigo,
        ficha.Sexo,
        ficha.AccionCodigo,
        ficha.HoraA,
        ficha.HoraBColecta,
        ficha.HoraCSiembra,
        ficha.UsoNidoCodigo,
        ficha.Corral,
        ficha.NumeroNido,
        ficha.HuevosColectados,
        ficha.HuevosRotos,
        ficha.PosicionCodigo,
        ficha.Latitud,
        ficha.Longitud,
        ficha.Formulo,
        ficha.Observaciones,
        ficha.TumoresPresentes,
        ficha.BioMuescaPuntaLargaCm,
        ficha.BioPuntaMuescaCm,
        ficha.BioMuescaMuescaCm,
        ficha.BioAnchoCm,
        ficha.TemperaturaC,
        ficha.CreadoEn,
        ficha.ActualizadoEn,
        ficha.Marcas.Select(MapearMarca).ToList());

    private static MarcaResponse MapearMarca(Marca marca) => new(
        marca.Id,
        marca.Aleta,
        marca.Pit,
        marca.NumeroMarca,
        marca.Leyenda,
        marca.NuevaORecap,
        marca.CicatrizMarca,
        marca.Verifico);

    private FichaFotoResponse MapearFoto(FichaFoto foto) => new(
        foto.Id,
        Url.Action(nameof(DescargarFoto), "Fichas", new { id = foto.FichaId, fotoId = foto.Id }) ?? $"/api/fichas/{foto.FichaId}/fotos/{foto.Id}/archivo",
        foto.CreadoEn);

    private string? ObtenerClaveIdempotencia() =>
        Request.Headers.TryGetValue(EncabezadoIdempotencia, out var valores) && !string.IsNullOrWhiteSpace(valores)
            ? valores.ToString()
            : null;

    private static bool EsImagen(IFormFile archivo) =>
        !string.IsNullOrWhiteSpace(archivo.ContentType)
        && archivo.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);

    private static bool EsViolacionUnica(DbUpdateException ex, string? indice)
    {
        if (ex.InnerException is not SqlException sqlEx)
        {
            return false;
        }

        if (sqlEx.Number != 2601 && sqlEx.Number != 2627)
        {
            return false;
        }

        return indice is null || sqlEx.Message.Contains(indice, StringComparison.OrdinalIgnoreCase);
    }
}
