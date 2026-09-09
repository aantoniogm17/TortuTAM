using TortuTAM.Api.Contracts.Fichas;

namespace TortuTAM.Api.Contracts.Panel;

public record EstadisticasPanelResponse(
    int FichasRegistradas,
    long HuevosColectados,
    int NidosEnCorral,
    decimal? PromedioHuevosPorNido,
    int NidosConLimpieza,
    long CriasVivas,
    decimal? PorcentajeExitoEclosionPromedio,
    IReadOnlyList<HuevosPorPlayaResponse> HuevosPorPlaya,
    IReadOnlyList<FichaResumenResponse> UltimasFichas);
