namespace TortuTAM.Api.Models.Dominio;

// Los campos de selección múltiple (CondicionFisica, CicatricesUbicaciones) se
// guardan como códigos separados por coma; el controller los expone como arreglo.
public class Varamiento
{
    public int Id { get; set; }

    public required string ObservadorNombre { get; set; }

    public int? PlayaId { get; set; }

    public decimal? Latitud { get; set; }

    public decimal? Longitud { get; set; }

    public string? DescripcionUbicacion { get; set; }

    public DateOnly FechaVaramiento { get; set; }

    public short NumeroTortugaDia { get; set; }

    public required string EspecieCodigo { get; set; }

    public required string CondicionCodigo { get; set; }

    public string? CondicionFisica { get; set; }

    public bool FotoDorsal { get; set; }

    public bool FotoVentral { get; set; }

    public bool FotoHeridas { get; set; }

    public bool FotoMaterial { get; set; }

    public bool? BocaRevisada { get; set; }

    public bool? NecropsiaCompletada { get; set; }

    public bool? EtiquetasAletaEncontradas { get; set; }

    public bool? CicatricesEtiqueta { get; set; }

    public string? CicatricesUbicaciones { get; set; }

    public bool? PitEscaneado { get; set; }

    public bool? EtiquetaViva { get; set; }

    public string? EtiquetaVivaDetalle { get; set; }

    public bool? EquipoRastreo { get; set; }

    public decimal? LccCm { get; set; }

    public string? LccTipo { get; set; }

    public string? ColaExtendida { get; set; }

    public decimal? ColaMedida1Cm { get; set; }

    public decimal? ColaMedida2Cm { get; set; }

    public bool? MaterialEncontrado { get; set; }

    public bool? MaterialFotos { get; set; }

    public bool? CuerdaAlgoUnido { get; set; }

    public bool? HeridasEncontradas { get; set; }

    public bool? HeridasFotos { get; set; }

    public bool? HeridaEnredamientoAsociada { get; set; }

    public bool? EnfermedadObservada { get; set; }

    public bool? EnfermedadFotos { get; set; }

    public bool? Demacrada { get; set; }

    public bool? Epibiontes { get; set; }

    public bool? Fibropapiloma { get; set; }

    public string? FibropapilomaRango { get; set; }

    public bool? LesionesPiel { get; set; }

    public string? LesionesPielArea { get; set; }

    public bool? Sanguijuelas { get; set; }

    public string? SanguijuelasCantidad { get; set; }

    public string? Comentarios { get; set; }

    public string? IdempotencyKey { get; set; }

    public DateTime CreadoEn { get; set; }

    public DateTime ActualizadoEn { get; set; }

    public List<VaramientoEtiqueta> Etiquetas { get; set; } = [];

    public List<VaramientoHallazgo> Hallazgos { get; set; } = [];

    public Necropsia? Necropsia { get; set; }
}
