namespace TortuTAM.Api.Models.Dominio;

public class Marca
{
    public int Id { get; set; }

    public int FichaId { get; set; }

    public required string Aleta { get; set; }

    public string? Pit { get; set; }

    public string? NumeroMarca { get; set; }

    public string? Leyenda { get; set; }

    public string? NuevaORecap { get; set; }

    public bool CicatrizMarca { get; set; }

    public bool Verifico { get; set; }

    public Ficha? Ficha { get; set; }
}
