namespace TortuTAM.Api.Contracts.Necropsias;

// Mismo cuerpo para POST y PUT; en PUT el varamiento asociado no puede cambiar.
public record NecropsiaRequest(
    int? VaramientoId,
    DateOnly? FechaNecropsia,
    string? Realizo,
    string? GrasaCorporal,
    IReadOnlyList<string>? Celoma,
    string? CelomaComentarios,
    string? TumoresFp,
    string? TumoresFpUbicaciones,
    IReadOnlyList<string>? Corazon,
    string? SangreCamaras,
    string? CorazonComentarios,
    IReadOnlyList<string>? Higado,
    string? HigadoComentarios,
    IReadOnlyList<string>? TractoGi,
    bool? BocaExaminada,
    IReadOnlyList<string>? GiAnormalidades,
    string? GiDescripcion,
    string? MaterialAntropogenicoDetalle,
    string? MaterialIngerido,
    string? MaterialIngeridoDescripcion,
    bool? MaterialFotoEscala,
    string? GiBocaEsofagoEstado,
    string? GiBocaEsofagoDescripcion,
    string? GiEstomagoEstado,
    string? GiEstomagoDescripcion,
    string? GiIntestino1Estado,
    string? GiIntestino1Descripcion,
    string? GiIntestino2Estado,
    string? GiIntestino2Descripcion,
    string? Urogenital,
    string? Sexo,
    string? Testiculos,
    string? Epididimo,
    string? Ovarios,
    string? Oviducto,
    string? UrogenitalComentarios,
    IReadOnlyList<string>? Traquea,
    IReadOnlyList<string>? Pulmones,
    string? RespiratorioComentarios,
    IReadOnlyList<string>? Cerebro,
    string? CerebroComentarios,
    string? ResumenHallazgos)
{
    public IReadOnlyList<string> Celoma { get; init; } = Celoma ?? [];

    public IReadOnlyList<string> Corazon { get; init; } = Corazon ?? [];

    public IReadOnlyList<string> Higado { get; init; } = Higado ?? [];

    public IReadOnlyList<string> TractoGi { get; init; } = TractoGi ?? [];

    public IReadOnlyList<string> GiAnormalidades { get; init; } = GiAnormalidades ?? [];

    public IReadOnlyList<string> Traquea { get; init; } = Traquea ?? [];

    public IReadOnlyList<string> Pulmones { get; init; } = Pulmones ?? [];

    public IReadOnlyList<string> Cerebro { get; init; } = Cerebro ?? [];
}
