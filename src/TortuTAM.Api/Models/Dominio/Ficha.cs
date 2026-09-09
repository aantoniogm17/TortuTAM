namespace TortuTAM.Api.Models.Dominio;

public class Ficha
{
    public int Id { get; set; }

    public required string NumeroFicha { get; set; }

    public int PlayaId { get; set; }

    public string? Estaca { get; set; }

    public string? Zona { get; set; }

    public DateOnly Fecha { get; set; }

    public string? EspecieCodigo { get; set; }

    public string? Sexo { get; set; }

    public byte? AccionCodigo { get; set; }

    public TimeOnly? HoraA { get; set; }

    public TimeOnly? HoraBColecta { get; set; }

    public TimeOnly? HoraCSiembra { get; set; }

    public byte? UsoNidoCodigo { get; set; }

    public string? Corral { get; set; }

    public string? NumeroNido { get; set; }

    public short? HuevosColectados { get; set; }

    public short? HuevosRotos { get; set; }

    public byte? PosicionCodigo { get; set; }

    public decimal? Latitud { get; set; }

    public decimal? Longitud { get; set; }

    public string? Formulo { get; set; }

    public string? Observaciones { get; set; }

    public bool TumoresPresentes { get; set; }

    public decimal? BioMuescaPuntaLargaCm { get; set; }

    public decimal? BioPuntaMuescaCm { get; set; }

    public decimal? BioMuescaMuescaCm { get; set; }

    public decimal? BioAnchoCm { get; set; }

    public decimal? TemperaturaC { get; set; }

    public string? IdempotencyKey { get; set; }

    public DateTime CreadoEn { get; set; }

    public DateTime ActualizadoEn { get; set; }

    public List<Marca> Marcas { get; set; } = [];
}
