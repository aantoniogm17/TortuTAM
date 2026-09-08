namespace TortuTAM.Api.Contracts.Limpiezas;

// Mismo cuerpo para POST y (a futuro) PUT: los campos editables de una ficha
// de limpieza son los mismos en creación y edición.
public record FichaLimpiezaRequest(
    string NumeroFicha,
    int? FichaAnidacionId,
    int? PlayaId,
    string? Corral,
    string? Nido,
    DateOnly? FechaPrimeraEmergencia,
    DateOnly FechaLimpieza,
    string? EspecieCodigo,
    byte? UsoNidoCodigo,
    string? Formulo,
    decimal? Latitud,
    decimal? Longitud,
    string? Hormigas,
    string? Raices,
    string? Larvas,
    string? Piedras,
    string? Huellas,
    string? Otros,
    string? OtrosDetalle,
    IReadOnlyList<LimpiezaConteoRequest>? Conteos)
{
    public IReadOnlyList<LimpiezaConteoRequest> Conteos { get; init; } = Conteos ?? [];
}
