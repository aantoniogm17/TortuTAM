using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TortuTAM.Api.Contracts.Nidos;
using TortuTAM.Api.Data;

namespace TortuTAM.Api.Controllers;

[ApiController]
[Route("api/nidos")]
[Authorize]
public class NidosController(DominioDbContext dominioDb) : ControllerBase
{
    [HttpGet("mapa")]
    public async Task<ActionResult<IReadOnlyList<NidoMapaResponse>>> Mapa(CancellationToken cancellationToken = default)
    {
        var nidos = await dominioDb.VwEstatusNidos
            .Select(v => new NidoMapaResponse(
                v.FichaId,
                v.NumeroFicha,
                v.Corral,
                v.NumeroNido,
                v.Fecha,
                v.Latitud,
                v.Longitud,
                v.HuevosColectados,
                v.FichaLimpiezaId,
                v.CriasVivasTotales,
                v.HuevosTotales,
                v.PorcentajeEclosion,
                v.Estatus))
            .ToListAsync(cancellationToken);

        return Ok(nidos);
    }
}
