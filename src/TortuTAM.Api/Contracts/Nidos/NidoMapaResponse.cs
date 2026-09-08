namespace TortuTAM.Api.Contracts.Nidos;

public record NidoMapaResponse(
    int FichaId,
    string NumeroFicha,
    string? Corral,
    string? NumeroNido,
    DateOnly Fecha,
    decimal? Latitud,
    decimal? Longitud,
    short? HuevosColectados,
    int? FichaLimpiezaId,
    int? CriasVivasTotales,
    int? HuevosTotales,
    decimal? PorcentajeEclosion,
    string Estatus);
