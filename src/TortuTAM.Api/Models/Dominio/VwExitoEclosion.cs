namespace TortuTAM.Api.Models.Dominio;

// Mapea la vista vw_exito_eclosion (migración 0012). Es de solo lectura:
// no se agrega DbSet<T>.Add, solo se consulta.
public class VwExitoEclosion
{
    public int FichaLimpiezaId { get; set; }

    public required string NumeroFicha { get; set; }

    public string? Corral { get; set; }

    public string? Nido { get; set; }

    public DateOnly FechaLimpieza { get; set; }

    public int? CriasVivasTotales { get; set; }

    public int? HuevosTotales { get; set; }

    public decimal? PorcentajeEclosion { get; set; }
}
