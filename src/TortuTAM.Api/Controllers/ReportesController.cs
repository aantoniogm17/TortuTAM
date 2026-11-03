using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TortuTAM.Api.Contracts.Reportes;
using TortuTAM.Api.Services;

namespace TortuTAM.Api.Controllers;

[ApiController]
[Route("api/reportes")]
[Authorize]
public class ReportesController(IReporteCorteService reporteCorteService) : ControllerBase
{
    [HttpGet("corte")]
    public async Task<ActionResult<ReporteCorteResponse>> Corte(
        [FromQuery] string? fecha, [FromQuery] int? playaId, CancellationToken cancellationToken)
    {
        var fechaCorte = DateOnly.FromDateTime(DateTime.Today);
        if (!string.IsNullOrWhiteSpace(fecha)
            && !DateOnly.TryParseExact(fecha, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out fechaCorte))
        {
            return BadRequest(new { error = "La fecha debe tener el formato YYYY-MM-DD." });
        }

        var reporte = await reporteCorteService.GenerarAsync(fechaCorte, playaId, cancellationToken);
        if (reporte is null)
        {
            return NotFound(new { error = "La playa indicada no existe." });
        }

        return Ok(reporte);
    }
}
