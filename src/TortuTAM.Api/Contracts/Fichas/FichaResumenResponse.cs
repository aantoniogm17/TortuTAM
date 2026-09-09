namespace TortuTAM.Api.Contracts.Fichas;

public record FichaResumenResponse(
    int Id,
    string NumeroFicha,
    int PlayaId,
    DateOnly Fecha,
    string? EspecieCodigo,
    byte? AccionCodigo,
    byte? UsoNidoCodigo,
    string? NumeroNido,
    DateTime CreadoEn);
