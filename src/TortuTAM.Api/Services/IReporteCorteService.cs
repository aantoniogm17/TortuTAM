using TortuTAM.Api.Contracts.Reportes;

namespace TortuTAM.Api.Services;

public interface IReporteCorteService
{
    // Devuelve null si se pide una playa que no existe en el catálogo.
    Task<ReporteCorteResponse?> GenerarAsync(DateOnly fechaCorte, int? playaId, CancellationToken cancellationToken);
}
