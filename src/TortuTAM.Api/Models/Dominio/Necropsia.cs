namespace TortuTAM.Api.Models.Dominio;

// Los campos de selección múltiple se guardan como códigos separados por coma;
// el controller los expone como arreglo.
public class Necropsia
{
    public int Id { get; set; }

    public int VaramientoId { get; set; }

    public DateOnly? FechaNecropsia { get; set; }

    public string? Realizo { get; set; }

    public string? GrasaCorporal { get; set; }

    public string? Celoma { get; set; }

    public string? CelomaComentarios { get; set; }

    public string? TumoresFp { get; set; }

    public string? TumoresFpUbicaciones { get; set; }

    public string? Corazon { get; set; }

    public string? SangreCamaras { get; set; }

    public string? CorazonComentarios { get; set; }

    public string? Higado { get; set; }

    public string? HigadoComentarios { get; set; }

    public string? TractoGi { get; set; }

    public bool? BocaExaminada { get; set; }

    public string? GiAnormalidades { get; set; }

    public string? GiDescripcion { get; set; }

    public string? MaterialAntropogenicoDetalle { get; set; }

    public string? MaterialIngerido { get; set; }

    public string? MaterialIngeridoDescripcion { get; set; }

    public bool? MaterialFotoEscala { get; set; }

    public string? GiBocaEsofagoEstado { get; set; }

    public string? GiBocaEsofagoDescripcion { get; set; }

    public string? GiEstomagoEstado { get; set; }

    public string? GiEstomagoDescripcion { get; set; }

    public string? GiIntestino1Estado { get; set; }

    public string? GiIntestino1Descripcion { get; set; }

    public string? GiIntestino2Estado { get; set; }

    public string? GiIntestino2Descripcion { get; set; }

    public string? Urogenital { get; set; }

    public string? Sexo { get; set; }

    public string? Testiculos { get; set; }

    public string? Epididimo { get; set; }

    public string? Ovarios { get; set; }

    public string? Oviducto { get; set; }

    public string? UrogenitalComentarios { get; set; }

    public string? Traquea { get; set; }

    public string? Pulmones { get; set; }

    public string? RespiratorioComentarios { get; set; }

    public string? Cerebro { get; set; }

    public string? CerebroComentarios { get; set; }

    public string? ResumenHallazgos { get; set; }

    public DateTime CreadoEn { get; set; }

    public DateTime ActualizadoEn { get; set; }

    public Varamiento? Varamiento { get; set; }
}
