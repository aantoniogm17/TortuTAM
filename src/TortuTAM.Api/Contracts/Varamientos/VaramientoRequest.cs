namespace TortuTAM.Api.Contracts.Varamientos;

// Mismo cuerpo para POST y PUT. Fecha, número del día y coordenadas son
// anulables solo para poder reportar su ausencia como error de validación.
public record VaramientoRequest(
    string ObservadorNombre,
    int? PlayaId,
    decimal? Latitud,
    decimal? Longitud,
    string? DescripcionUbicacion,
    DateOnly? FechaVaramiento,
    short? NumeroTortugaDia,
    string EspecieCodigo,
    string CondicionCodigo,
    IReadOnlyList<string>? CondicionFisica,
    bool FotoDorsal,
    bool FotoVentral,
    bool FotoHeridas,
    bool FotoMaterial,
    bool? BocaRevisada,
    bool? NecropsiaCompletada,
    bool? EtiquetasAletaEncontradas,
    bool? CicatricesEtiqueta,
    IReadOnlyList<string>? CicatricesUbicaciones,
    bool? PitEscaneado,
    bool? EtiquetaViva,
    string? EtiquetaVivaDetalle,
    bool? EquipoRastreo,
    decimal? LccCm,
    string? LccTipo,
    string? ColaExtendida,
    decimal? ColaMedida1Cm,
    decimal? ColaMedida2Cm,
    bool? MaterialEncontrado,
    bool? MaterialFotos,
    bool? CuerdaAlgoUnido,
    bool? HeridasEncontradas,
    bool? HeridasFotos,
    bool? HeridaEnredamientoAsociada,
    bool? EnfermedadObservada,
    bool? EnfermedadFotos,
    bool? Demacrada,
    bool? Epibiontes,
    bool? Fibropapiloma,
    string? FibropapilomaRango,
    bool? LesionesPiel,
    string? LesionesPielArea,
    bool? Sanguijuelas,
    string? SanguijuelasCantidad,
    string? Comentarios,
    IReadOnlyList<VaramientoEtiquetaRequest>? Etiquetas,
    IReadOnlyList<VaramientoHallazgoRequest>? Hallazgos)
{
    public IReadOnlyList<string> CondicionFisica { get; init; } = CondicionFisica ?? [];

    public IReadOnlyList<string> CicatricesUbicaciones { get; init; } = CicatricesUbicaciones ?? [];

    public IReadOnlyList<VaramientoEtiquetaRequest> Etiquetas { get; init; } = Etiquetas ?? [];

    public IReadOnlyList<VaramientoHallazgoRequest> Hallazgos { get; init; } = Hallazgos ?? [];
}
