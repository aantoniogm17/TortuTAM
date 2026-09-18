namespace TortuTAM.Api.Contracts.Fichas;

// Mismo cuerpo para POST y PUT: los campos editables de una ficha son
// idénticos en creación y edición, solo cambia si numero_ficha ya existe.
public record FichaRequest(
    string NumeroFicha,
    int PlayaId,
    string? Estaca,
    string? Zona,
    DateOnly Fecha,
    string? EspecieCodigo,
    string? Sexo,
    byte? AccionCodigo,
    TimeOnly? HoraA,
    TimeOnly? HoraBColecta,
    TimeOnly? HoraCSiembra,
    byte? UsoNidoCodigo,
    string? Corral,
    string? NumeroNido,
    short? HuevosColectados,
    short? HuevosRotos,
    byte? PosicionCodigo,
    decimal? Latitud,
    decimal? Longitud,
    string? Formulo,
    string? Observaciones,
    bool TumoresPresentes,
    decimal? BioMuescaPuntaLargaCm,
    decimal? BioPuntaMuescaCm,
    decimal? BioMuescaMuescaCm,
    decimal? BioAnchoCm,
    decimal? TemperaturaC,
    IReadOnlyList<MarcaRequest>? Marcas)
{
    public IReadOnlyList<MarcaRequest> Marcas { get; init; } = Marcas ?? [];
}
