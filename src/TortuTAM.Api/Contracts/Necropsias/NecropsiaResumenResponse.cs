namespace TortuTAM.Api.Contracts.Necropsias;

public record NecropsiaResumenResponse(
    int Id,
    int VaramientoId,
    DateOnly FechaVaramiento,
    short NumeroTortugaDia,
    int? PlayaId,
    string EspecieCodigo,
    DateOnly? FechaNecropsia,
    string? Sexo,
    DateTime CreadoEn);
