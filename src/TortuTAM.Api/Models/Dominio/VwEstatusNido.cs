namespace TortuTAM.Api.Models.Dominio;

// Mapea la vista vw_estatus_nidos (migración 0013). Es de solo lectura:
// no se agrega DbSet<T>.Add, solo se consulta.
public class VwEstatusNido
{
    public int FichaId { get; set; }

    public required string NumeroFicha { get; set; }

    public string? Corral { get; set; }

    public string? NumeroNido { get; set; }

    public DateOnly Fecha { get; set; }

    public decimal? Latitud { get; set; }

    public decimal? Longitud { get; set; }

    public short? HuevosColectados { get; set; }

    public int? FichaLimpiezaId { get; set; }

    public int? CriasVivasTotales { get; set; }

    public int? HuevosTotales { get; set; }

    public decimal? PorcentajeEclosion { get; set; }

    public required string Estatus { get; set; }
}
