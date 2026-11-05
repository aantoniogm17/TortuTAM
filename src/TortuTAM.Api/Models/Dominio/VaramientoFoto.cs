namespace TortuTAM.Api.Models.Dominio;

public class VaramientoFoto
{
    public int Id { get; set; }

    public int VaramientoId { get; set; }

    public required string RutaRelativa { get; set; }

    public DateTime CreadoEn { get; set; }
}
