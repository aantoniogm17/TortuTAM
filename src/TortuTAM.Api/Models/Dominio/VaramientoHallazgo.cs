namespace TortuTAM.Api.Models.Dominio;

public class VaramientoHallazgo
{
    public int Id { get; set; }

    public int VaramientoId { get; set; }

    public required string Categoria { get; set; }

    public required string TipoCodigo { get; set; }

    public string? Ubicaciones { get; set; }

    public string? Detalle { get; set; }

    public Varamiento? Varamiento { get; set; }
}
