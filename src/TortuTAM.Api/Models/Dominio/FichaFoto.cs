namespace TortuTAM.Api.Models.Dominio;

public class FichaFoto
{
    public int Id { get; set; }

    public int FichaId { get; set; }

    public required string RutaRelativa { get; set; }

    public DateTime CreadoEn { get; set; }
}
