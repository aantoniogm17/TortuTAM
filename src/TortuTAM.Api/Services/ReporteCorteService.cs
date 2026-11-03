using Microsoft.EntityFrameworkCore;
using TortuTAM.Api.Contracts.Reportes;
using TortuTAM.Api.Data;

namespace TortuTAM.Api.Services;

public class ReporteCorteService(DominioDbContext dominioDb) : IReporteCorteService
{
    // códigos en cat_uso_nido (migraciones 0004 y 0018).
    private const byte UsoCorral = 1;
    private const byte UsoCaja = 3;
    private const byte UsoSaqueado = 5;
    private const byte UsoDepredado = 6;
    private const byte UsoInSitu = 9;

    // códigos en cat_acciones para varamientos.
    private const byte AccionVarada = 9;
    private const byte AccionMuerta = 10;

    private sealed record FichaNido(int Id, int PlayaId, string? Corral, string? NumeroNido, byte? Uso, short? Huevos);

    private sealed record Limpieza(int? PlayaId, byte? Uso, long Vivas, long Huevos);

    private static bool EsVaramiento(byte? accion) => accion is AccionVarada or AccionMuerta;

    public async Task<ReporteCorteResponse?> GenerarAsync(
        DateOnly fechaCorte, int? playaId, CancellationToken cancellationToken)
    {
        var playasQuery = dominioDb.Playas.AsNoTracking();
        if (playaId is not null)
        {
            playasQuery = playasQuery.Where(p => p.Id == playaId);
        }

        var playas = await playasQuery.OrderBy(p => p.Codigo).ToListAsync(cancellationToken);
        if (playaId is not null && playas.Count == 0)
        {
            return null;
        }

        // Corte acumulado de temporada: del 1 de enero del año de corte a la fecha de corte.
        var inicio = new DateOnly(fechaCorte.Year, 1, 1);

        var fichasQuery = dominioDb.Fichas.AsNoTracking()
            .Where(f => f.Fecha >= inicio && f.Fecha <= fechaCorte);
        if (playaId is not null)
        {
            fichasQuery = fichasQuery.Where(f => f.PlayaId == playaId);
        }

        var fichas = await fichasQuery
            .Select(f => new
            {
                f.Id,
                f.PlayaId,
                f.Corral,
                f.NumeroNido,
                f.UsoNidoCodigo,
                f.AccionCodigo,
                f.EspecieCodigo,
                f.Sexo,
                f.HuevosColectados
            })
            .ToListAsync(cancellationToken);

        var nidos = fichas
            .Where(f => !EsVaramiento(f.AccionCodigo))
            .Select(f => new FichaNido(f.Id, f.PlayaId, f.Corral, f.NumeroNido, f.UsoNidoCodigo, f.HuevosColectados))
            .ToList();

        var varamientos = fichas.Where(f => EsVaramiento(f.AccionCodigo)).ToList();

        var limpiezasBase = await (
            from fl in dominioDb.FichasLimpieza.AsNoTracking()
            join ve in dominioDb.VwExitoEclosion.AsNoTracking() on fl.Id equals ve.FichaLimpiezaId
            where fl.FechaLimpieza >= inicio && fl.FechaLimpieza <= fechaCorte
            select new
            {
                fl.FichaAnidacionId,
                fl.PlayaId,
                fl.Corral,
                fl.Nido,
                fl.UsoNidoCodigo,
                Vivas = ve.CriasVivasTotales ?? 0,
                Huevos = ve.HuevosTotales ?? 0
            })
            .ToListAsync(cancellationToken);

        // La ficha origen se busca por vínculo directo o, en su defecto, por
        // corral + nido (mismo criterio que vw_estatus_nidos). Puede quedar fuera
        // del rango de fechas del corte, por eso se consulta aparte.
        var idsVinculados = limpiezasBase
            .Where(l => l.FichaAnidacionId is not null)
            .Select(l => l.FichaAnidacionId!.Value)
            .Distinct()
            .ToList();
        var corrales = limpiezasBase
            .Where(l => l.Corral != null && l.Nido != null)
            .Select(l => l.Corral!)
            .Distinct()
            .ToList();

        var origenes = await dominioDb.Fichas.AsNoTracking()
            .Where(f => idsVinculados.Contains(f.Id) || (f.Corral != null && corrales.Contains(f.Corral)))
            .Select(f => new FichaNido(f.Id, f.PlayaId, f.Corral, f.NumeroNido, f.UsoNidoCodigo, f.HuevosColectados))
            .ToListAsync(cancellationToken);

        var origenPorId = origenes.ToDictionary(o => o.Id);
        var origenPorClave = origenes
            .Where(o => o.Corral != null && o.NumeroNido != null)
            .GroupBy(o => (o.Corral!, o.NumeroNido!))
            .ToDictionary(g => g.Key, g => g.OrderBy(o => o.Id).First());

        var limpiezas = limpiezasBase
            .Select(l =>
            {
                FichaNido? origen = null;
                if (l.FichaAnidacionId is { } fichaId)
                {
                    origenPorId.TryGetValue(fichaId, out origen);
                }
                else if (l.Corral != null && l.Nido != null)
                {
                    origenPorClave.TryGetValue((l.Corral, l.Nido), out origen);
                }

                return new Limpieza(l.PlayaId ?? origen?.PlayaId, origen?.Uso ?? l.UsoNidoCodigo, l.Vivas, l.Huevos);
            })
            .Where(l => l.PlayaId is not null && (playaId is null || l.PlayaId == playaId))
            .ToList();

        var porPlaya = playas.Select(p =>
        {
            var misNidos = nidos.Where(n => n.PlayaId == p.Id).ToList();
            var misLimpiezas = limpiezas.Where(l => l.PlayaId == p.Id).ToList();
            var misVaramientos = varamientos
                .Where(v => v.PlayaId == p.Id)
                .GroupBy(v => (v.EspecieCodigo, v.Sexo))
                .Select(g => new ReporteVaramientoResponse(
                    g.Key.EspecieCodigo,
                    g.Key.Sexo,
                    g.Count(v => v.AccionCodigo == AccionVarada),
                    g.Count(v => v.AccionCodigo == AccionMuerta)))
                .OrderBy(v => v.EspecieCodigo)
                .ThenBy(v => v.Sexo)
                .ToList();

            int Contar(byte uso) => misNidos.Count(n => n.Uso == uso);

            var huevosProtegidos = misNidos
                .Where(n => n.Uso is UsoCorral or UsoCaja or UsoInSitu)
                .Sum(n => (long)(n.Huevos ?? 0));

            ReporteEclosionResponse Eclosion(byte uso)
            {
                var grupo = misLimpiezas.Where(l => l.Uso == uso).ToList();
                return ArmarEclosion(grupo.Count, grupo.Sum(l => l.Vivas), grupo.Sum(l => l.Huevos));
            }

            return ArmarPlaya(
                p.Id, p.Codigo, p.Nombre,
                Contar(UsoCorral), Contar(UsoCaja), Contar(UsoInSitu), Contar(UsoSaqueado), Contar(UsoDepredado),
                huevosProtegidos, Eclosion(UsoCorral), Eclosion(UsoInSitu), misVaramientos);
        }).ToList();

        var total = playaId is null ? ConsolidarPlayas(porPlaya) : null;

        return new ReporteCorteResponse(fechaCorte, porPlaya, total);
    }

    private static ReportePlayaResponse ArmarPlaya(
        int playaId, string codigo, string? nombre,
        int corral, int caja, int inSitu, int saqueadas, int depredadas,
        long huevosProtegidos,
        ReporteEclosionResponse limpiosCorral, ReporteEclosionResponse limpiosInSitu,
        IReadOnlyList<ReporteVaramientoResponse> varamientos)
    {
        // "Pérdidas por marea" no existe en cat_uso_nido; queda en 0 hasta que
        // se defina con un issue previo (issue #71, pregunta abierta a).
        const int perdidasMarea = 0;

        var protegidos = corral + caja + inSitu;
        var criasLiberadas = limpiosCorral.CriasVivas + limpiosInSitu.CriasVivas;
        var huevosLimpios = limpiosCorral.TotalHuevos + limpiosInSitu.TotalHuevos;

        return new ReportePlayaResponse(
            playaId, codigo, nombre,
            corral, caja, inSitu, saqueadas, perdidasMarea, depredadas,
            protegidos,
            protegidos + saqueadas + perdidasMarea + depredadas,
            huevosProtegidos,
            limpiosCorral, limpiosInSitu,
            criasLiberadas, huevosLimpios,
            Porcentaje(criasLiberadas, huevosLimpios),
            varamientos);
    }

    // El total se recalcula con sumas de crías y huevos; nunca se promedian porcentajes.
    private static ReportePlayaResponse ConsolidarPlayas(IReadOnlyList<ReportePlayaResponse> playas)
    {
        ReporteEclosionResponse Sumar(Func<ReportePlayaResponse, ReporteEclosionResponse> bloque) =>
            ArmarEclosion(
                playas.Sum(p => bloque(p).Nidos),
                playas.Sum(p => bloque(p).CriasVivas),
                playas.Sum(p => bloque(p).TotalHuevos));

        var varamientos = playas
            .SelectMany(p => p.Varamientos)
            .GroupBy(v => (v.EspecieCodigo, v.Sexo))
            .Select(g => new ReporteVaramientoResponse(
                g.Key.EspecieCodigo, g.Key.Sexo, g.Sum(v => v.Vivos), g.Sum(v => v.Muertos)))
            .OrderBy(v => v.EspecieCodigo)
            .ThenBy(v => v.Sexo)
            .ToList();

        return ArmarPlaya(
            0, "TOTAL", "Total",
            playas.Sum(p => p.Corral),
            playas.Sum(p => p.Caja),
            playas.Sum(p => p.InSitu),
            playas.Sum(p => p.Saqueadas),
            playas.Sum(p => p.Depredadas),
            playas.Sum(p => p.HuevosProtegidos),
            Sumar(p => p.LimpiosCorral),
            Sumar(p => p.LimpiosInSitu),
            varamientos);
    }

    private static ReporteEclosionResponse ArmarEclosion(int nidos, long criasVivas, long totalHuevos) =>
        new(nidos, criasVivas, totalHuevos, Porcentaje(criasVivas, totalHuevos));

    private static decimal? Porcentaje(long criasVivas, long totalHuevos) =>
        totalHuevos > 0 ? Math.Round(criasVivas * 100m / totalHuevos, 1) : null;
}
