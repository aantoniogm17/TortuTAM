using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TortuTAM.Api.Contracts.Common;
using TortuTAM.Api.Contracts.Varamientos;
using TortuTAM.Api.Data;
using TortuTAM.Api.Models.Dominio;
using TortuTAM.Api.Services;

namespace TortuTAM.Api.Controllers;

[ApiController]
[Route("api/varamientos")]
[Authorize]
public class VaramientosController(DominioDbContext dominioDb, IAlmacenamientoFotos almacenamientoFotos) : ControllerBase
{
    private const string EncabezadoIdempotencia = "Idempotency-Key";
    private const string CondicionVivo = "vivo";
    private const int MaximoEtiquetasAleta = 3;
    private const int MaximoEtiquetasPit = 2;

    private static readonly string[] CondicionesValidas = [CondicionVivo, "ligera", "moderada", "severa", "desecado", "esqueleto"];
    private static readonly string[] CondicionFisicaValida = ["completa", "sin_cabeza", "sin_aletas", "sin_caparazon", "nd"];
    private static readonly string[] CicatricesUbicacionesValidas = ["di", "dd", "ti", "td"];
    private static readonly string[] LccTiposValidos = ["R", "A"];
    private static readonly string[] ColaExtendidaValida = ["si", "no", "nd"];
    private static readonly string[] FibropapilomaRangosValidos = ["lt5", "5a10", "gt10"];
    private static readonly string[] LesionesPielAreasValidas = ["pequenas", "grandes"];
    private static readonly string[] SanguijuelasCantidadesValidas = ["pocas", "muchas"];
    private static readonly string[] TiposEtiquetaValidos = ["aleta", "pit"];
    private static readonly string[] UbicacionesHallazgoValidas =
        ["boca", "cabeza", "cuello", "caparazon", "plastron", "aleta_del", "aleta_tras", "cola"];

    // Mismo par categoría/tipo que el CHECK chk_varamiento_hallazgos_tipo_codigo (migración 0028);
    // se valida aquí para responder 400 en vez de dejar que la BD rechace el INSERT.
    private static readonly Dictionary<string, string[]> TiposHallazgoPorCategoria = new()
    {
        ["material"] = ["anzuelo", "sedal", "cuerda", "red", "petroleo", "otro"],
        ["herida"] = ["propela", "aplastamiento", "enredamiento", "tiburon", "otro"]
    };

    private static readonly FileExtensionContentTypeProvider ProveedorTipoContenido = new();

    [HttpPost]
    public async Task<ActionResult<VaramientoDetalleResponse>> Crear(VaramientoRequest request, CancellationToken cancellationToken)
    {
        var claveIdempotencia = ObtenerClaveIdempotencia();
        if (!string.IsNullOrWhiteSpace(claveIdempotencia))
        {
            var existente = await CargarDetalleAsync(v => v.IdempotencyKey == claveIdempotencia, cancellationToken);
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

        if (await ExisteNumeroDelDiaAsync(request, idExcluido: null, cancellationToken))
        {
            return Conflict(new { mensaje = MensajeNumeroDuplicado(request) });
        }

        var varamiento = new Varamiento
        {
            ObservadorNombre = request.ObservadorNombre,
            EspecieCodigo = request.EspecieCodigo,
            CondicionCodigo = request.CondicionCodigo
        };
        AplicarCambios(varamiento, request);
        foreach (var etiqueta in request.Etiquetas)
        {
            varamiento.Etiquetas.Add(MapearEtiquetaNueva(etiqueta));
        }

        foreach (var hallazgo in request.Hallazgos)
        {
            varamiento.Hallazgos.Add(MapearHallazgoNuevo(hallazgo));
        }

        varamiento.IdempotencyKey = string.IsNullOrWhiteSpace(claveIdempotencia) ? null : claveIdempotencia;

        dominioDb.Varamientos.Add(varamiento);

        try
        {
            await dominioDb.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (EsViolacionUnica(ex, "uq_varamientos_idempotency_key"))
        {
            var existenteConcurrente = await CargarDetalleAsync(v => v.IdempotencyKey == claveIdempotencia, cancellationToken);
            if (existenteConcurrente is not null)
            {
                return Ok(existenteConcurrente);
            }

            throw;
        }
        catch (DbUpdateException ex) when (EsViolacionUnica(ex, "uq_varamiento_fecha_playa_numero"))
        {
            return Conflict(new { mensaje = MensajeNumeroDuplicado(request) });
        }

        var detalle = await CargarDetalleAsync(v => v.Id == varamiento.Id, cancellationToken);
        return CreatedAtAction(nameof(Detalle), new { id = varamiento.Id }, detalle);
    }

    [HttpGet]
    public async Task<ActionResult<PaginaResponse<VaramientoResumenResponse>>> Listar(
        [FromQuery] DateOnly? fechaDesde,
        [FromQuery] DateOnly? fechaHasta,
        [FromQuery] int? playaId,
        [FromQuery] string? especieCodigo,
        [FromQuery] bool? necropsiaPendiente,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        var query = dominioDb.Varamientos.AsQueryable();

        if (fechaDesde is not null)
        {
            query = query.Where(v => v.FechaVaramiento >= fechaDesde);
        }

        if (fechaHasta is not null)
        {
            query = query.Where(v => v.FechaVaramiento <= fechaHasta);
        }

        if (playaId is not null)
        {
            query = query.Where(v => v.PlayaId == playaId);
        }

        if (!string.IsNullOrWhiteSpace(especieCodigo))
        {
            query = query.Where(v => v.EspecieCodigo == especieCodigo);
        }

        // Pendiente = admite necropsia (no está vivo) y todavía no tiene una registrada.
        if (necropsiaPendiente is true)
        {
            query = query.Where(v => v.CondicionCodigo != CondicionVivo && v.Necropsia == null);
        }
        else if (necropsiaPendiente is false)
        {
            query = query.Where(v => v.CondicionCodigo == CondicionVivo || v.Necropsia != null);
        }

        var total = await query.CountAsync(cancellationToken);

        var elementos = await query
            .OrderByDescending(v => v.FechaVaramiento)
            .ThenByDescending(v => v.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(v => new VaramientoResumenResponse(
                v.Id,
                v.FechaVaramiento,
                v.NumeroTortugaDia,
                v.PlayaId,
                v.EspecieCodigo,
                v.CondicionCodigo,
                v.ObservadorNombre,
                v.Latitud,
                v.Longitud,
                v.Necropsia != null ? v.Necropsia.Id : null,
                v.CreadoEn))
            .ToListAsync(cancellationToken);

        return Ok(new PaginaResponse<VaramientoResumenResponse>(total, page, pageSize, elementos));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<VaramientoDetalleResponse>> Detalle(int id, CancellationToken cancellationToken)
    {
        var detalle = await CargarDetalleAsync(v => v.Id == id, cancellationToken);
        return detalle is null ? NotFound() : Ok(detalle);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<VaramientoDetalleResponse>> Actualizar(int id, VaramientoRequest request, CancellationToken cancellationToken)
    {
        var varamiento = await dominioDb.Varamientos
            .Include(v => v.Etiquetas)
            .Include(v => v.Hallazgos)
            .AsTracking()
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (varamiento is null)
        {
            return NotFound();
        }

        var errores = await ValidarAsync(request, cancellationToken);

        var tieneNecropsia = await dominioDb.Necropsias.AnyAsync(n => n.VaramientoId == id, cancellationToken);
        if (tieneNecropsia && request.CondicionCodigo == CondicionVivo)
        {
            errores.Add("condicion_codigo no puede ser 'vivo' porque el varamiento ya tiene una necropsia registrada.");
        }

        if (errores.Count > 0)
        {
            return BadRequest(new { errores });
        }

        if (await ExisteNumeroDelDiaAsync(request, idExcluido: id, cancellationToken))
        {
            return Conflict(new { mensaje = MensajeNumeroDuplicado(request) });
        }

        AplicarCambios(varamiento, request);
        if (tieneNecropsia)
        {
            varamiento.NecropsiaCompletada = true;
        }

        varamiento.Etiquetas.Clear();
        foreach (var etiqueta in request.Etiquetas)
        {
            varamiento.Etiquetas.Add(MapearEtiquetaNueva(etiqueta));
        }

        SincronizarHallazgos(varamiento, request.Hallazgos);

        try
        {
            await dominioDb.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (EsViolacionUnica(ex, "uq_varamiento_fecha_playa_numero"))
        {
            return Conflict(new { mensaje = MensajeNumeroDuplicado(request) });
        }

        var detalle = await CargarDetalleAsync(v => v.Id == id, cancellationToken);
        return Ok(detalle);
    }

    [HttpPost("{id:int}/fotos")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<IReadOnlyList<VaramientoFotoResponse>>> SubirFotos(
        int id, [FromForm] IFormFileCollection archivos, CancellationToken cancellationToken)
    {
        var varamientoExiste = await dominioDb.Varamientos.AnyAsync(v => v.Id == id, cancellationToken);
        if (!varamientoExiste)
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

        var fotos = new List<VaramientoFoto>();
        foreach (var archivo in archivos)
        {
            var rutaRelativa = await almacenamientoFotos.GuardarAsync($"varamientos/{id}", archivo, cancellationToken);
            fotos.Add(new VaramientoFoto { VaramientoId = id, RutaRelativa = rutaRelativa });
        }

        dominioDb.VaramientoFotos.AddRange(fotos);
        await dominioDb.SaveChangesAsync(cancellationToken);

        var respuesta = fotos.Select(MapearFoto).ToList();
        return CreatedAtAction(nameof(ListarFotos), new { id }, respuesta);
    }

    [HttpGet("{id:int}/fotos")]
    public async Task<ActionResult<IReadOnlyList<VaramientoFotoResponse>>> ListarFotos(int id, CancellationToken cancellationToken)
    {
        var varamientoExiste = await dominioDb.Varamientos.AnyAsync(v => v.Id == id, cancellationToken);
        if (!varamientoExiste)
        {
            return NotFound();
        }

        var fotos = await CargarFotosAsync(id, cancellationToken);
        return Ok(fotos);
    }

    [HttpGet("{id:int}/fotos/{fotoId:int}/archivo")]
    public async Task<IActionResult> DescargarFoto(int id, int fotoId, CancellationToken cancellationToken)
    {
        var foto = await dominioDb.VaramientoFotos
            .FirstOrDefaultAsync(f => f.Id == fotoId && f.VaramientoId == id, cancellationToken);
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

    private async Task<List<string>> ValidarAsync(VaramientoRequest request, CancellationToken cancellationToken)
    {
        var errores = new List<string>();

        if (string.IsNullOrWhiteSpace(request.ObservadorNombre))
        {
            errores.Add("observador_nombre es obligatorio.");
        }

        CodigosSeleccion.ValidarLongitud(errores, "observador_nombre", request.ObservadorNombre, 120);

        if (request.PlayaId is not null
            && !await dominioDb.Playas.AnyAsync(p => p.Id == request.PlayaId, cancellationToken))
        {
            errores.Add($"playa_id {request.PlayaId} no existe en el catálogo de playas.");
        }

        // GPS es obligatorio en el flujo principal de captura (regla del proyecto),
        // aunque la columna en base de datos permita NULL por flexibilidad de esquema.
        if (request.Latitud is null || request.Longitud is null)
        {
            errores.Add("latitud y longitud son obligatorias.");
        }

        if (request.Latitud is < -90 or > 90)
        {
            errores.Add("latitud debe estar entre -90 y 90.");
        }

        if (request.Longitud is < -180 or > 180)
        {
            errores.Add("longitud debe estar entre -180 y 180.");
        }

        CodigosSeleccion.ValidarLongitud(errores, "descripcion_ubicacion", request.DescripcionUbicacion, 500);

        if (request.FechaVaramiento is null)
        {
            errores.Add("fecha_varamiento es obligatoria.");
        }

        if (request.NumeroTortugaDia is null)
        {
            errores.Add("numero_tortuga_dia es obligatorio.");
        }
        else if (request.NumeroTortugaDia is < 1 or > 999)
        {
            errores.Add("numero_tortuga_dia debe estar entre 1 y 999.");
        }

        if (string.IsNullOrWhiteSpace(request.EspecieCodigo))
        {
            errores.Add("especie_codigo es obligatorio.");
        }
        else if (!await dominioDb.Especies.AnyAsync(e => e.Codigo == request.EspecieCodigo, cancellationToken))
        {
            errores.Add($"especie_codigo '{request.EspecieCodigo}' no existe en el catálogo de especies.");
        }

        if (string.IsNullOrWhiteSpace(request.CondicionCodigo))
        {
            errores.Add("condicion_codigo es obligatorio.");
        }
        else
        {
            CodigosSeleccion.ValidarOpcion(errores, "condicion_codigo", request.CondicionCodigo, CondicionesValidas);
        }

        CodigosSeleccion.ValidarCodigos(errores, "condicion_fisica", request.CondicionFisica, CondicionFisicaValida);
        CodigosSeleccion.ValidarCodigos(errores, "cicatrices_ubicaciones", request.CicatricesUbicaciones, CicatricesUbicacionesValidas);
        CodigosSeleccion.ValidarLongitud(errores, "etiqueta_viva_detalle", request.EtiquetaVivaDetalle, 200);

        foreach (var (campo, valor) in new (string Campo, decimal? Valor)[]
        {
            ("lcc_cm", request.LccCm),
            ("cola_medida_1_cm", request.ColaMedida1Cm),
            ("cola_medida_2_cm", request.ColaMedida2Cm)
        })
        {
            if (valor is < 0 or > 9999.9m)
            {
                errores.Add($"{campo} debe estar entre 0 y 9999.9.");
            }
        }

        CodigosSeleccion.ValidarOpcion(errores, "lcc_tipo", request.LccTipo, LccTiposValidos);
        CodigosSeleccion.ValidarOpcion(errores, "cola_extendida", request.ColaExtendida, ColaExtendidaValida);
        CodigosSeleccion.ValidarOpcion(errores, "fibropapiloma_rango", request.FibropapilomaRango, FibropapilomaRangosValidos);
        CodigosSeleccion.ValidarOpcion(errores, "lesiones_piel_area", request.LesionesPielArea, LesionesPielAreasValidas);
        CodigosSeleccion.ValidarOpcion(errores, "sanguijuelas_cantidad", request.SanguijuelasCantidad, SanguijuelasCantidadesValidas);

        foreach (var etiqueta in request.Etiquetas)
        {
            if (!TiposEtiquetaValidos.Contains(etiqueta.Tipo))
            {
                errores.Add($"tipo de etiqueta '{etiqueta.Tipo}' no es válido; use aleta o pit.");
            }

            if (string.IsNullOrWhiteSpace(etiqueta.Numero))
            {
                errores.Add("numero es obligatorio en cada etiqueta.");
            }

            CodigosSeleccion.ValidarLongitud(errores, "numero de etiqueta", etiqueta.Numero, 50);
            CodigosSeleccion.ValidarLongitud(errores, "ubicacion de etiqueta", etiqueta.Ubicacion, 100);
        }

        if (request.Etiquetas.Count(e => e.Tipo == "aleta") > MaximoEtiquetasAleta)
        {
            errores.Add($"Un varamiento admite máximo {MaximoEtiquetasAleta} etiquetas de aleta.");
        }

        if (request.Etiquetas.Count(e => e.Tipo == "pit") > MaximoEtiquetasPit)
        {
            errores.Add($"Un varamiento admite máximo {MaximoEtiquetasPit} etiquetas PIT.");
        }

        var hallazgosVistos = new HashSet<(string, string)>();
        foreach (var hallazgo in request.Hallazgos)
        {
            if (string.IsNullOrWhiteSpace(hallazgo.Categoria)
                || !TiposHallazgoPorCategoria.TryGetValue(hallazgo.Categoria, out var tiposValidos))
            {
                errores.Add($"categoria de hallazgo '{hallazgo.Categoria}' no es válida; use material o herida.");
                continue;
            }

            if (!tiposValidos.Contains(hallazgo.TipoCodigo))
            {
                errores.Add($"tipo_codigo '{hallazgo.TipoCodigo}' no es válido para la categoría '{hallazgo.Categoria}'; use {string.Join(", ", tiposValidos)}.");
            }
            else if (!hallazgosVistos.Add((hallazgo.Categoria, hallazgo.TipoCodigo)))
            {
                errores.Add($"El hallazgo '{hallazgo.Categoria}/{hallazgo.TipoCodigo}' está repetido.");
            }

            CodigosSeleccion.ValidarCodigos(errores, "ubicaciones de hallazgo", hallazgo.Ubicaciones, UbicacionesHallazgoValidas);
            CodigosSeleccion.ValidarLongitud(errores, "detalle de hallazgo", hallazgo.Detalle, 500);
        }

        return errores;
    }

    private Task<bool> ExisteNumeroDelDiaAsync(VaramientoRequest request, int? idExcluido, CancellationToken cancellationToken) =>
        dominioDb.Varamientos.AnyAsync(
            v => v.Id != idExcluido
                && v.FechaVaramiento == request.FechaVaramiento
                && v.PlayaId == request.PlayaId
                && v.NumeroTortugaDia == request.NumeroTortugaDia,
            cancellationToken);

    private static string MensajeNumeroDuplicado(VaramientoRequest request) =>
        $"Ya existe un varamiento con número del día {request.NumeroTortugaDia} para el {request.FechaVaramiento:yyyy-MM-dd} en esa playa.";

    private static void AplicarCambios(Varamiento varamiento, VaramientoRequest request)
    {
        varamiento.ObservadorNombre = request.ObservadorNombre;
        varamiento.PlayaId = request.PlayaId;
        varamiento.Latitud = request.Latitud;
        varamiento.Longitud = request.Longitud;
        varamiento.DescripcionUbicacion = request.DescripcionUbicacion;
        varamiento.FechaVaramiento = request.FechaVaramiento!.Value;
        varamiento.NumeroTortugaDia = request.NumeroTortugaDia!.Value;
        varamiento.EspecieCodigo = request.EspecieCodigo;
        varamiento.CondicionCodigo = request.CondicionCodigo;
        varamiento.CondicionFisica = CodigosSeleccion.Unir(request.CondicionFisica);
        varamiento.FotoDorsal = request.FotoDorsal;
        varamiento.FotoVentral = request.FotoVentral;
        varamiento.FotoHeridas = request.FotoHeridas;
        varamiento.FotoMaterial = request.FotoMaterial;
        varamiento.BocaRevisada = request.BocaRevisada;
        varamiento.NecropsiaCompletada = request.NecropsiaCompletada;
        varamiento.EtiquetasAletaEncontradas = request.EtiquetasAletaEncontradas;
        varamiento.CicatricesEtiqueta = request.CicatricesEtiqueta;
        varamiento.CicatricesUbicaciones = CodigosSeleccion.Unir(request.CicatricesUbicaciones);
        varamiento.PitEscaneado = request.PitEscaneado;
        varamiento.EtiquetaViva = request.EtiquetaViva;
        varamiento.EtiquetaVivaDetalle = request.EtiquetaVivaDetalle;
        varamiento.EquipoRastreo = request.EquipoRastreo;
        varamiento.LccCm = request.LccCm;
        varamiento.LccTipo = request.LccTipo;
        varamiento.ColaExtendida = request.ColaExtendida;
        varamiento.ColaMedida1Cm = request.ColaMedida1Cm;
        varamiento.ColaMedida2Cm = request.ColaMedida2Cm;
        varamiento.MaterialEncontrado = request.MaterialEncontrado;
        varamiento.MaterialFotos = request.MaterialFotos;
        varamiento.CuerdaAlgoUnido = request.CuerdaAlgoUnido;
        varamiento.HeridasEncontradas = request.HeridasEncontradas;
        varamiento.HeridasFotos = request.HeridasFotos;
        varamiento.HeridaEnredamientoAsociada = request.HeridaEnredamientoAsociada;
        varamiento.EnfermedadObservada = request.EnfermedadObservada;
        varamiento.EnfermedadFotos = request.EnfermedadFotos;
        varamiento.Demacrada = request.Demacrada;
        varamiento.Epibiontes = request.Epibiontes;
        varamiento.Fibropapiloma = request.Fibropapiloma;
        varamiento.FibropapilomaRango = request.FibropapilomaRango;
        varamiento.LesionesPiel = request.LesionesPiel;
        varamiento.LesionesPielArea = request.LesionesPielArea;
        varamiento.Sanguijuelas = request.Sanguijuelas;
        varamiento.SanguijuelasCantidad = request.SanguijuelasCantidad;
        varamiento.Comentarios = request.Comentarios;
    }

    // Se actualiza en sitio el renglón que ya existe para la misma categoría y tipo
    // en lugar de borrarlo y reinsertarlo, para no chocar con uq_varamiento_hallazgo_tipo.
    private static void SincronizarHallazgos(Varamiento varamiento, IReadOnlyList<VaramientoHallazgoRequest> hallazgos)
    {
        var porClave = hallazgos.ToDictionary(h => (h.Categoria, h.TipoCodigo), h => h);

        foreach (var existente in varamiento.Hallazgos.ToList())
        {
            if (!porClave.ContainsKey((existente.Categoria, existente.TipoCodigo)))
            {
                varamiento.Hallazgos.Remove(existente);
            }
        }

        foreach (var (clave, hallazgo) in porClave)
        {
            var existente = varamiento.Hallazgos.FirstOrDefault(h => h.Categoria == clave.Categoria && h.TipoCodigo == clave.TipoCodigo);
            if (existente is null)
            {
                varamiento.Hallazgos.Add(MapearHallazgoNuevo(hallazgo));
                continue;
            }

            existente.Ubicaciones = CodigosSeleccion.Unir(hallazgo.Ubicaciones);
            existente.Detalle = hallazgo.Detalle;
        }
    }

    private static VaramientoEtiqueta MapearEtiquetaNueva(VaramientoEtiquetaRequest etiqueta) => new()
    {
        Tipo = etiqueta.Tipo,
        Numero = etiqueta.Numero,
        Ubicacion = etiqueta.Ubicacion
    };

    private static VaramientoHallazgo MapearHallazgoNuevo(VaramientoHallazgoRequest hallazgo) => new()
    {
        Categoria = hallazgo.Categoria,
        TipoCodigo = hallazgo.TipoCodigo,
        Ubicaciones = CodigosSeleccion.Unir(hallazgo.Ubicaciones),
        Detalle = hallazgo.Detalle
    };

    private async Task<VaramientoDetalleResponse?> CargarDetalleAsync(
        Expression<Func<Varamiento, bool>> predicado, CancellationToken cancellationToken)
    {
        var varamiento = await dominioDb.Varamientos
            .Include(v => v.Etiquetas)
            .Include(v => v.Hallazgos)
            .AsNoTracking()
            .Where(predicado)
            .FirstOrDefaultAsync(cancellationToken);

        if (varamiento is null)
        {
            return null;
        }

        var necropsiaId = await dominioDb.Necropsias
            .Where(n => n.VaramientoId == varamiento.Id)
            .Select(n => (int?)n.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var fotos = await CargarFotosAsync(varamiento.Id, cancellationToken);

        return MapearDetalle(varamiento, necropsiaId, fotos);
    }

    private async Task<List<VaramientoFotoResponse>> CargarFotosAsync(int varamientoId, CancellationToken cancellationToken)
    {
        var fotos = await dominioDb.VaramientoFotos
            .Where(f => f.VaramientoId == varamientoId)
            .OrderBy(f => f.CreadoEn)
            .ToListAsync(cancellationToken);

        return fotos.Select(MapearFoto).ToList();
    }

    private static VaramientoDetalleResponse MapearDetalle(
        Varamiento varamiento, int? necropsiaId, IReadOnlyList<VaramientoFotoResponse> fotos) => new(
        varamiento.Id,
        varamiento.ObservadorNombre,
        varamiento.PlayaId,
        varamiento.Latitud,
        varamiento.Longitud,
        varamiento.DescripcionUbicacion,
        varamiento.FechaVaramiento,
        varamiento.NumeroTortugaDia,
        varamiento.EspecieCodigo,
        varamiento.CondicionCodigo,
        CodigosSeleccion.Separar(varamiento.CondicionFisica),
        varamiento.FotoDorsal,
        varamiento.FotoVentral,
        varamiento.FotoHeridas,
        varamiento.FotoMaterial,
        varamiento.BocaRevisada,
        varamiento.NecropsiaCompletada,
        varamiento.EtiquetasAletaEncontradas,
        varamiento.CicatricesEtiqueta,
        CodigosSeleccion.Separar(varamiento.CicatricesUbicaciones),
        varamiento.PitEscaneado,
        varamiento.EtiquetaViva,
        varamiento.EtiquetaVivaDetalle,
        varamiento.EquipoRastreo,
        varamiento.LccCm,
        varamiento.LccTipo,
        varamiento.ColaExtendida,
        varamiento.ColaMedida1Cm,
        varamiento.ColaMedida2Cm,
        varamiento.MaterialEncontrado,
        varamiento.MaterialFotos,
        varamiento.CuerdaAlgoUnido,
        varamiento.HeridasEncontradas,
        varamiento.HeridasFotos,
        varamiento.HeridaEnredamientoAsociada,
        varamiento.EnfermedadObservada,
        varamiento.EnfermedadFotos,
        varamiento.Demacrada,
        varamiento.Epibiontes,
        varamiento.Fibropapiloma,
        varamiento.FibropapilomaRango,
        varamiento.LesionesPiel,
        varamiento.LesionesPielArea,
        varamiento.Sanguijuelas,
        varamiento.SanguijuelasCantidad,
        varamiento.Comentarios,
        necropsiaId,
        varamiento.CreadoEn,
        varamiento.ActualizadoEn,
        varamiento.Etiquetas.OrderBy(e => e.Id).Select(MapearEtiqueta).ToList(),
        varamiento.Hallazgos.OrderBy(h => h.Id).Select(MapearHallazgo).ToList(),
        fotos);

    private static VaramientoEtiquetaResponse MapearEtiqueta(VaramientoEtiqueta etiqueta) => new(
        etiqueta.Id,
        etiqueta.Tipo,
        etiqueta.Numero,
        etiqueta.Ubicacion);

    private static VaramientoHallazgoResponse MapearHallazgo(VaramientoHallazgo hallazgo) => new(
        hallazgo.Id,
        hallazgo.Categoria,
        hallazgo.TipoCodigo,
        CodigosSeleccion.Separar(hallazgo.Ubicaciones),
        hallazgo.Detalle);

    private VaramientoFotoResponse MapearFoto(VaramientoFoto foto) => new(
        foto.Id,
        Url.Action(nameof(DescargarFoto), "Varamientos", new { id = foto.VaramientoId, fotoId = foto.Id }) ?? $"/api/varamientos/{foto.VaramientoId}/fotos/{foto.Id}/archivo",
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
