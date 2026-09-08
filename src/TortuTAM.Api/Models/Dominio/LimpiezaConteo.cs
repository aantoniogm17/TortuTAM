namespace TortuTAM.Api.Models.Dominio;

public class LimpiezaConteo
{
    public int Id { get; set; }

    public int FichaLimpiezaId { get; set; }

    public required string CategoriaCodigo { get; set; }

    public short? Normales { get; set; }

    public short? Albina { get; set; }

    public short? Deforme { get; set; }

    public short? AlbinasDeformes { get; set; }

    public short? Total { get; set; }

    public FichaLimpieza? FichaLimpieza { get; set; }
}
