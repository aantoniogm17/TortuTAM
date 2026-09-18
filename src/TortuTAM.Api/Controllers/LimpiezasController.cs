using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TortuTAM.Api.Contracts.Common;
using TortuTAM.Api.Contracts.Limpiezas;
using TortuTAM.Api.Data;
using TortuTAM.Api.Models.Dominio;

namespace TortuTAM.Api.Controllers;

[ApiController]
[Route("api/limpiezas")]
[Authorize]
public class LimpiezasController(DominioDbContext dominioDb) : ControllerBase
{
    private static readonly string[] SiNoValidos = ["S", "N"];

    [HttpPost]
    public async Task<ActionResult<FichaLimpiezaDetalleResponse>> Crear(FichaLimpiezaRequest request, CancellationToken cancellationToken)
    {
        var errores = await ValidarAsync(request, cancellationToken);
        if (errores.Count > 0)
        {
            return BadRequest(new { errores });
        }

        if (await dominioDb.FichasLimpieza.AnyAsync(f => f.NumeroFicha == request.NumeroFicha, cancellationToken))
        {
            return Conflict(new { mensaje = $"Ya existe una ficha de limpieza con numero_ficha '{request.NumeroFicha}'." });
        }

        var ficha = new FichaLimpieza { NumeroFicha = request.NumeroFicha };
        AplicarCambios(ficha, request);
        AgregarConteos(ficha, request.Conteos);

        dominioDb.FichasLimpieza.Add(ficha);

        try
        {
            await dominioDb.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (EsViolacionUnica(ex))
        {
            return Conflict(new { mensaje = $"Ya existe una ficha de limpieza con numero_ficha '{request.NumeroFicha}'." });
        }

        var detalle = await CargarDetalleAsync(f => f.Id == ficha.Id, cancellationToken);
        return CreatedAtAction(nameof(Detalle), new { id = ficha.Id }, detalle);
    }

    [HttpGet]
    public async Task<ActionResult<PaginaResponse<FichaLimpiezaResumenResponse>>> Listar(
        [FromQuery] string? numeroFicha,
        [FromQuery] string? corral,
        [FromQuery] string? nido,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        var query = dominioDb.FichasLimpieza.AsQueryable();

        if (!string.IsNullOrWhiteSpace(numeroFicha))
        {
            query = query.Where(f => f.NumeroFicha.Contains(numeroFicha));
        }

        if (!string.IsNullOrWhiteSpace(corral))
        {
            query = query.Where(f => f.Corral == corral);
        }

        if (!string.IsNullOrWhiteSpace(nido))
        {
            query = query.Where(f => f.Nido == nido);
        }

        var total = await query.CountAsync(cancellationToken);

        var elementos = await (
            from f in query
            join v in dominioDb.VwExitoEclosion on f.Id equals v.FichaLimpiezaId into vg
            from v in vg.DefaultIfEmpty()
            orderby f.FechaLimpieza descending, f.Id descending
            select new FichaLimpiezaResumenResponse(
                f.Id,
                f.NumeroFicha,
                f.PlayaId,
                f.Corral,
                f.Nido,
                f.FechaLimpieza,
                f.EspecieCodigo,
                f.UsoNidoCodigo,
                v.CriasVivasTotales,
                v.HuevosTotales,
                v.PorcentajeEclosion,
                f.CreadoEn))
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PaginaResponse<FichaLimpiezaResumenResponse>(total, page, pageSize, elementos));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<FichaLimpiezaDetalleResponse>> Detalle(int id, CancellationToken cancellationToken)
    {
        var detalle = await CargarDetalleAsync(f => f.Id == id, cancellationToken);
        return detalle is null ? NotFound() : Ok(detalle);
    }

    private async Task<List<string>> ValidarAsync(FichaLimpiezaRequest request, CancellationToken cancellationToken)
    {
        var errores = new List<string>();

        if (string.IsNullOrWhiteSpace(request.NumeroFicha))
        {
            errores.Add("numero_ficha es obligatorio.");
        }

        if (request.FichaAnidacionId is not null
            && !await dominioDb.Fichas.AnyAsync(f => f.Id == request.FichaAnidacionId, cancellationToken))
        {
            errores.Add($"ficha_anidacion_id {request.FichaAnidacionId} no existe en las fichas de anidación.");
        }

        if (request.PlayaId is not null
            && !await dominioDb.Playas.AnyAsync(p => p.Id == request.PlayaId, cancellationToken))
        {
            errores.Add($"playa_id {request.PlayaId} no existe en el catálogo de playas.");
        }

        if (!string.IsNullOrWhiteSpace(request.EspecieCodigo)
            && !await dominioDb.Especies.AnyAsync(e => e.Codigo == request.EspecieCodigo, cancellationToken))
        {
            errores.Add($"especie_codigo '{request.EspecieCodigo}' no existe en el catálogo de especies.");
        }

        if (request.UsoNidoCodigo is not null
            && !await dominioDb.UsoNido.AnyAsync(u => u.Codigo == request.UsoNidoCodigo, cancellationToken))
        {
            errores.Add($"uso_nido_codigo {request.UsoNidoCodigo} no existe en el catálogo de uso de nido.");
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

        foreach (var (campo, valor) in new (string Campo, string? Valor)[]
        {
            ("hormigas", request.Hormigas),
            ("raices", request.Raices),
            ("larvas", request.Larvas),
            ("piedras", request.Piedras),
            ("huellas", request.Huellas),
            ("otros", request.Otros)
        })
        {
            if (!string.IsNullOrWhiteSpace(valor) && !SiNoValidos.Contains(valor))
            {
                errores.Add($"{campo} debe ser S o N.");
            }
        }

        var codigosVistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var conteo in request.Conteos)
        {
            if (string.IsNullOrWhiteSpace(conteo.CategoriaCodigo))
            {
                errores.Add("categoria_codigo es obligatorio en cada conteo.");
                continue;
            }

            if (!codigosVistos.Add(conteo.CategoriaCodigo))
            {
                errores.Add($"La categoría de conteo '{conteo.CategoriaCodigo}' está repetida.");
            }

            if (!await dominioDb.CategoriasConteo.AnyAsync(c => c.Codigo == conteo.CategoriaCodigo, cancellationToken))
            {
                errores.Add($"categoria_codigo '{conteo.CategoriaCodigo}' no existe en el catálogo de categorías de conteo.");
            }

            foreach (var (campo, valor) in new (string Campo, short? Valor)[]
            {
                ("normales", conteo.Normales),
                ("albina", conteo.Albina),
                ("deforme", conteo.Deforme),
                ("albinas_deformes", conteo.AlbinasDeformes),
                ("total", conteo.Total)
            })
            {
                if (valor is < 0)
                {
                    errores.Add($"{campo} de la categoría '{conteo.CategoriaCodigo}' no puede ser negativo.");
                }
            }
        }

        return errores;
    }

    private static void AplicarCambios(FichaLimpieza ficha, FichaLimpiezaRequest request)
    {
        ficha.NumeroFicha = request.NumeroFicha;
        ficha.FichaAnidacionId = request.FichaAnidacionId;
        ficha.PlayaId = request.PlayaId;
        ficha.Corral = request.Corral;
        ficha.Nido = request.Nido;
        ficha.FechaPrimeraEmergencia = request.FechaPrimeraEmergencia;
        ficha.FechaLimpieza = request.FechaLimpieza;
        ficha.EspecieCodigo = request.EspecieCodigo;
        ficha.UsoNidoCodigo = request.UsoNidoCodigo;
        ficha.Formulo = request.Formulo;
        ficha.Latitud = request.Latitud;
        ficha.Longitud = request.Longitud;
        ficha.Hormigas = request.Hormigas;
        ficha.Raices = request.Raices;
        ficha.Larvas = request.Larvas;
        ficha.Piedras = request.Piedras;
        ficha.Huellas = request.Huellas;
        ficha.Otros = request.Otros;
        ficha.OtrosDetalle = request.OtrosDetalle;
    }

    private static void AgregarConteos(FichaLimpieza ficha, IReadOnlyList<LimpiezaConteoRequest> conteos)
    {
        foreach (var conteo in conteos)
        {
            ficha.Conteos.Add(MapearConteoNuevo(conteo));
        }
    }

    private static LimpiezaConteo MapearConteoNuevo(LimpiezaConteoRequest conteo) => new()
    {
        CategoriaCodigo = conteo.CategoriaCodigo,
        Normales = conteo.Normales,
        Albina = conteo.Albina,
        Deforme = conteo.Deforme,
        AlbinasDeformes = conteo.AlbinasDeformes,
        Total = CalcularTotal(conteo)
    };

    // El cliente puede mandar total ya calculado (p. ej. categorías "solo_total"
    // como cascarones, que no tienen desglose) o solo el desglose y dejar que la
    // API sume normales+albina+deforme+albinas_deformes. Si no llega ninguno de
    // los dos, el total queda NULL.
    private static short? CalcularTotal(LimpiezaConteoRequest conteo)
    {
        if (conteo.Total is not null)
        {
            return conteo.Total;
        }

        if (conteo.Normales is null && conteo.Albina is null && conteo.Deforme is null && conteo.AlbinasDeformes is null)
        {
            return null;
        }

        return (short)((conteo.Normales ?? 0) + (conteo.Albina ?? 0) + (conteo.Deforme ?? 0) + (conteo.AlbinasDeformes ?? 0));
    }

    private async Task<FichaLimpiezaDetalleResponse?> CargarDetalleAsync(
        Expression<Func<FichaLimpieza, bool>> predicado, CancellationToken cancellationToken)
    {
        var ficha = await dominioDb.FichasLimpieza
            .Include(f => f.Conteos)
            .AsNoTracking()
            .Where(predicado)
            .FirstOrDefaultAsync(cancellationToken);

        if (ficha is null)
        {
            return null;
        }

        var exito = await dominioDb.VwExitoEclosion
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.FichaLimpiezaId == ficha.Id, cancellationToken);

        return MapearDetalle(ficha, exito);
    }

    private static FichaLimpiezaDetalleResponse MapearDetalle(FichaLimpieza ficha, VwExitoEclosion? exito) => new(
        ficha.Id,
        ficha.NumeroFicha,
        ficha.FichaAnidacionId,
        ficha.PlayaId,
        ficha.Corral,
        ficha.Nido,
        ficha.FechaPrimeraEmergencia,
        ficha.FechaLimpieza,
        ficha.EspecieCodigo,
        ficha.UsoNidoCodigo,
        ficha.Formulo,
        ficha.Latitud,
        ficha.Longitud,
        ficha.Hormigas,
        ficha.Raices,
        ficha.Larvas,
        ficha.Piedras,
        ficha.Huellas,
        ficha.Otros,
        ficha.OtrosDetalle,
        exito?.CriasVivasTotales,
        exito?.HuevosTotales,
        exito?.PorcentajeEclosion,
        ficha.CreadoEn,
        ficha.ActualizadoEn,
        ficha.Conteos.Select(MapearConteo).ToList());

    private static LimpiezaConteoResponse MapearConteo(LimpiezaConteo conteo) => new(
        conteo.Id,
        conteo.CategoriaCodigo,
        conteo.Normales,
        conteo.Albina,
        conteo.Deforme,
        conteo.AlbinasDeformes,
        conteo.Total);

    private static bool EsViolacionUnica(DbUpdateException ex) =>
        ex.InnerException is SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627);
}
