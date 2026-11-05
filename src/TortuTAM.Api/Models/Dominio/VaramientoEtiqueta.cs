namespace TortuTAM.Api.Models.Dominio;

public class VaramientoEtiqueta
{
    public int Id { get; set; }

    public int VaramientoId { get; set; }

    public required string Tipo { get; set; }

    public required string Numero { get; set; }

    public string? Ubicacion { get; set; }

    public Varamiento? Varamiento { get; set; }
}
