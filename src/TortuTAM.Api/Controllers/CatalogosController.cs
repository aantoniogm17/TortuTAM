using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TortuTAM.Api.Contracts.Catalogos;
using TortuTAM.Api.Data;

namespace TortuTAM.Api.Controllers;

[ApiController]
[Route("api/catalogos")]
[Authorize]
public class CatalogosController(DominioDbContext dominioDb) : ControllerBase
{
    [HttpGet("playas")]
    public async Task<ActionResult<IReadOnlyList<PlayaResponse>>> Playas(CancellationToken cancellationToken)
    {
        var playas = await dominioDb.Playas
            .OrderBy(p => p.Codigo)
            .Select(p => new PlayaResponse(p.Id, p.Codigo, p.Nombre))
            .ToListAsync(cancellationToken);

        return Ok(playas);
    }

    [HttpGet("especies")]
    public async Task<ActionResult<IReadOnlyList<EspecieResponse>>> Especies(CancellationToken cancellationToken)
    {
        var especies = await dominioDb.Especies
            .OrderBy(e => e.Codigo)
            .Select(e => new EspecieResponse(e.Codigo, e.NombreComun, e.NombreCientifico))
            .ToListAsync(cancellationToken);

        return Ok(especies);
    }

    [HttpGet("acciones")]
    public async Task<ActionResult<IReadOnlyList<AccionResponse>>> Acciones(CancellationToken cancellationToken)
    {
        var acciones = await dominioDb.Acciones
            .OrderBy(a => a.Codigo)
            .Select(a => new AccionResponse(a.Codigo, a.Descripcion))
            .ToListAsync(cancellationToken);

        return Ok(acciones);
    }

    [HttpGet("uso-nido")]
    public async Task<ActionResult<IReadOnlyList<UsoNidoResponse>>> UsoNido(CancellationToken cancellationToken)
    {
        var usoNido = await dominioDb.UsoNido
            .OrderBy(u => u.Codigo)
            .Select(u => new UsoNidoResponse(u.Codigo, u.Descripcion))
            .ToListAsync(cancellationToken);

        return Ok(usoNido);
    }

    [HttpGet("categorias-conteo")]
    public async Task<ActionResult<IReadOnlyList<CategoriaConteoResponse>>> CategoriasConteo(CancellationToken cancellationToken)
    {
        var categoriasConteo = await dominioDb.CategoriasConteo
            .OrderBy(c => c.Codigo)
            .Select(c => new CategoriaConteoResponse(
                c.Codigo,
                c.Descripcion,
                c.SoloTotal,
                c.CuentaCriaViva,
                c.ExcluirDeHuevosTotales))
            .ToListAsync(cancellationToken);

        return Ok(categoriasConteo);
    }
}
