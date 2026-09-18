namespace TortuTAM.Api.Models.Dominio;

public class CatCategoriaConteo
{
    public required string Codigo { get; set; }

    public required string Descripcion { get; set; }

    public bool SoloTotal { get; set; }

    public bool CuentaCriaViva { get; set; }

    public bool ExcluirDeHuevosTotales { get; set; }
}
