namespace TortuTAM.Api.Contracts.Limpiezas;

public record FichaLimpiezaResumenResponse(
    int Id,
    string NumeroFicha,
    int? PlayaId,
    string? Corral,
    string? Nido,
    DateOnly FechaLimpieza,
    string? EspecieCodigo,
    byte? UsoNidoCodigo,
    int? CriasVivasTotales,
    int? HuevosTotales,
    decimal? PorcentajeEclosion,
    DateTime CreadoEn);
