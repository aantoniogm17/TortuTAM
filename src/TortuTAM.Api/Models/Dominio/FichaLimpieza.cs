namespace TortuTAM.Api.Models.Dominio;

public class FichaLimpieza
{
    public int Id { get; set; }

    public required string NumeroFicha { get; set; }

    public int? FichaAnidacionId { get; set; }

    public int? PlayaId { get; set; }

    public string? Corral { get; set; }

    public string? Nido { get; set; }

    public DateOnly? FechaPrimeraEmergencia { get; set; }

    public DateOnly FechaLimpieza { get; set; }

    public string? EspecieCodigo { get; set; }

    public byte? UsoNidoCodigo { get; set; }

    public string? Formulo { get; set; }

    public decimal? Latitud { get; set; }

    public decimal? Longitud { get; set; }

    public string? Hormigas { get; set; }

    public string? Raices { get; set; }

    public string? Larvas { get; set; }

    public string? Piedras { get; set; }

    public string? Huellas { get; set; }

    public string? Otros { get; set; }

    public string? OtrosDetalle { get; set; }

    public DateTime CreadoEn { get; set; }

    public DateTime ActualizadoEn { get; set; }

    public List<LimpiezaConteo> Conteos { get; set; } = [];
}
