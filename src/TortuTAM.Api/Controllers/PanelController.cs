using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TortuTAM.Api.Contracts.Fichas;
using TortuTAM.Api.Contracts.Panel;
using TortuTAM.Api.Data;

namespace TortuTAM.Api.Controllers;

[ApiController]
[Route("api/panel")]
[Authorize]
public class PanelController(DominioDbContext dominioDb) : ControllerBase
{
    private const int LimiteUltimasFichasPorDefecto = 10;

    // código en cat_uso_nido (migración 0004_create_cat_uso_nido.sql) para "Corral".
    private const byte CodigoUsoNidoCorral = 1;

    [HttpGet("estadisticas")]
    public async Task<ActionResult<EstadisticasPanelResponse>> Estadisticas(
        [FromQuery] int limite = LimiteUltimasFichasPorDefecto, CancellationToken cancellationToken = default)
    {
        limite = limite is < 1 or > 100 ? LimiteUltimasFichasPorDefecto : limite;

        var fichasRegistradas = await dominioDb.Fichas.CountAsync(cancellationToken);

        var huevosColectados = await dominioDb.Fichas
            .Select(f => (long?)f.HuevosColectados)
            .SumAsync(cancellationToken) ?? 0;

        var nidosEnCorral = await dominioDb.Fichas
            .CountAsync(f => f.UsoNidoCodigo == CodigoUsoNidoCorral, cancellationToken);

        var promedioHuevosPorNido = await dominioDb.Fichas
            .Select(f => (decimal?)f.HuevosColectados)
            .AverageAsync(cancellationToken);

        // fichas_limpieza.ficha_anidacion_id es opcional (una limpieza puede
        // registrarse sin enlazar la ficha de anidación original), así que se
        // cuenta la propia tabla de limpiezas en vez de fichas de anidación con
        // limpieza asociada: cada fila ahí ya representa un nido limpiado/exhumado.
        var nidosConLimpieza = await dominioDb.FichasLimpieza.CountAsync(cancellationToken);

        var criasVivas = await dominioDb.VwExitoEclosion
            .Select(v => (long?)v.CriasVivasTotales)
            .SumAsync(cancellationToken) ?? 0;

        var porcentajeExitoEclosionPromedio = await dominioDb.VwExitoEclosion
            .Select(v => v.PorcentajeEclosion)
            .AverageAsync(cancellationToken);

        var huevosPorPlaya = await (
            from f in dominioDb.Fichas
            join p in dominioDb.Playas on f.PlayaId equals p.Id
            group f by new { p.Id, p.Codigo, p.Nombre } into g
            orderby g.Key.Codigo
            select new HuevosPorPlayaResponse(
                g.Key.Id,
                g.Key.Codigo,
                g.Key.Nombre,
                g.Sum(f => (long?)f.HuevosColectados) ?? 0))
            .ToListAsync(cancellationToken);

        var ultimasFichas = await dominioDb.Fichas
            .OrderByDescending(f => f.CreadoEn)
            .ThenByDescending(f => f.Id)
            .Take(limite)
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

        return Ok(new EstadisticasPanelResponse(
            fichasRegistradas,
            huevosColectados,
            nidosEnCorral,
            promedioHuevosPorNido,
            nidosConLimpieza,
            criasVivas,
            porcentajeExitoEclosionPromedio,
            huevosPorPlaya,
            ultimasFichas));
    }
}
