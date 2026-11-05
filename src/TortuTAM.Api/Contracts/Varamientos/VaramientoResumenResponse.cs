namespace TortuTAM.Api.Contracts.Varamientos;

public record VaramientoResumenResponse(
    int Id,
    DateOnly FechaVaramiento,
    short NumeroTortugaDia,
    int? PlayaId,
    string EspecieCodigo,
    string CondicionCodigo,
    string ObservadorNombre,
    decimal? Latitud,
    decimal? Longitud,
    int? NecropsiaId,
    DateTime CreadoEn);
