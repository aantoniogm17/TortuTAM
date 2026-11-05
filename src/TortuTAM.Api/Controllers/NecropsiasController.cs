using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TortuTAM.Api.Contracts.Common;
using TortuTAM.Api.Contracts.Necropsias;
using TortuTAM.Api.Data;
using TortuTAM.Api.Models.Dominio;
using TortuTAM.Api.Services;

namespace TortuTAM.Api.Controllers;

[ApiController]
[Route("api/necropsias")]
[Authorize]
public class NecropsiasController(DominioDbContext dominioDb) : ControllerBase
{
    private const string CondicionVivo = "vivo";

    private static readonly string[] GrasaCorporalValida = ["abundante", "parcial", "severa", "cbd"];
    private static readonly string[] SiNoCbd = ["si", "no", "cbd"];
    private static readonly string[] CelomaValido = ["sin_hallazgos", "exudado", "coagulos", "parasitos", "palidos", "otro", "cbd"];
    private static readonly string[] CorazonValido = ["sin_hallazgos", "trauma", "vasos_engrosados", "otro", "cbd"];
    private static readonly string[] HigadoValido = ["sin_hallazgos", "atrofia", "trauma", "otro", "cbd"];
    private static readonly string[] TractoGiValido = ["sin_hallazgos", "anormal", "pescado", "camaron", "cbd"];
    private static readonly string[] GiAnormalidadesValidas = ["1", "2", "3", "4", "5", "6", "7"];
    private static readonly string[] EstadoGiValido = ["vacio", "contenido"];
    private static readonly string[] UrogenitalValido = ["sin_hallazgos", "anormal", "cbd"];
    private static readonly string[] SexosValidos = ["M", "H", "ND"];
    private static readonly string[] TesticulosValidos = ["cilindrico", "elipsoidal", "plano"];
    private static readonly string[] EpididimoValido = ["no_expandido", "cresta", "colgante", "espirales"];
    private static readonly string[] OvariosValidos = ["menor_4mm", "desarrollo"];
    private static readonly string[] OviductoValido = ["recto", "parcial", "muy_convulso", "huevos"];
    private static readonly string[] TraqueaValida = ["sin_hallazgos", "poca_espuma", "abundante_espuma", "arena", "trauma", "exudado", "cbd"];
    private static readonly string[] PulmonesValidos = ["sin_hallazgos", "mojado", "arena", "trauma", "otro", "cbd"];
    private static readonly string[] CerebroValido = ["sin_hallazgos", "trauma", "hemorragia", "exudado", "huevos_platija", "otro", "cbd"];

    [HttpPost]
    public async Task<ActionResult<NecropsiaDetalleResponse>> Crear(NecropsiaRequest request, CancellationToken cancellationToken)
    {
        var errores = ValidarCampos(request);

        Varamiento? varamiento = null;
        if (request.VaramientoId is null)
        {
            errores.Add("varamiento_id es obligatorio.");
        }
        else
        {
            varamiento = await dominioDb.Varamientos
                .AsTracking()
                .FirstOrDefaultAsync(v => v.Id == request.VaramientoId, cancellationToken);

            if (varamiento is null)
            {
                errores.Add($"varamiento_id {request.VaramientoId} no existe en los varamientos.");
            }
            else if (varamiento.CondicionCodigo == CondicionVivo)
            {
                errores.Add("No se puede registrar una necropsia para un varamiento con condición 'vivo'.");
            }
        }

        if (errores.Count > 0 || varamiento is null)
        {
            return BadRequest(new { errores });
        }

        // El cliente offline reintenta el envío si perdió la respuesta; un 409 aquí le
        // indica que la necropsia de ese varamiento ya quedó registrada.
        if (await dominioDb.Necropsias.AnyAsync(n => n.VaramientoId == varamiento.Id, cancellationToken))
        {
            return Conflict(new { mensaje = MensajeNecropsiaDuplicada(varamiento.Id) });
        }

        var necropsia = new Necropsia { VaramientoId = varamiento.Id };
        AplicarCambios(necropsia, request);
        dominioDb.Necropsias.Add(necropsia);

        varamiento.NecropsiaCompletada = true;

        try
        {
            await dominioDb.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (EsViolacionUnica(ex, "uq_necropsia_varamiento"))
        {
            return Conflict(new { mensaje = MensajeNecropsiaDuplicada(varamiento.Id) });
        }

        var detalle = await CargarDetalleAsync(n => n.Id == necropsia.Id, cancellationToken);
        return CreatedAtAction(nameof(Detalle), new { id = necropsia.Id }, detalle);
    }

    [HttpGet]
    public async Task<ActionResult<PaginaResponse<NecropsiaResumenResponse>>> Listar(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        var query = dominioDb.Necropsias.AsQueryable();

        var total = await query.CountAsync(cancellationToken);

        var elementos = await query
            .OrderByDescending(n => n.Varamiento!.FechaVaramiento)
            .ThenByDescending(n => n.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NecropsiaResumenResponse(
                n.Id,
                n.VaramientoId,
                n.Varamiento!.FechaVaramiento,
                n.Varamiento.NumeroTortugaDia,
                n.Varamiento.PlayaId,
                n.Varamiento.EspecieCodigo,
                n.FechaNecropsia,
                n.Sexo,
                n.CreadoEn))
            .ToListAsync(cancellationToken);

        return Ok(new PaginaResponse<NecropsiaResumenResponse>(total, page, pageSize, elementos));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<NecropsiaDetalleResponse>> Detalle(int id, CancellationToken cancellationToken)
    {
        var detalle = await CargarDetalleAsync(n => n.Id == id, cancellationToken);
        return detalle is null ? NotFound() : Ok(detalle);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<NecropsiaDetalleResponse>> Actualizar(int id, NecropsiaRequest request, CancellationToken cancellationToken)
    {
        var necropsia = await dominioDb.Necropsias
            .AsTracking()
            .FirstOrDefaultAsync(n => n.Id == id, cancellationToken);

        if (necropsia is null)
        {
            return NotFound();
        }

        var errores = ValidarCampos(request);
        if (request.VaramientoId is not null && request.VaramientoId != necropsia.VaramientoId)
        {
            errores.Add("varamiento_id no puede cambiar al editar una necropsia.");
        }

        if (errores.Count > 0)
        {
            return BadRequest(new { errores });
        }

        AplicarCambios(necropsia, request);
        await dominioDb.SaveChangesAsync(cancellationToken);

        var detalle = await CargarDetalleAsync(n => n.Id == id, cancellationToken);
        return Ok(detalle);
    }

    private static List<string> ValidarCampos(NecropsiaRequest request)
    {
        var errores = new List<string>();

        CodigosSeleccion.ValidarLongitud(errores, "realizo", request.Realizo, 120);

        CodigosSeleccion.ValidarOpcion(errores, "grasa_corporal", request.GrasaCorporal, GrasaCorporalValida);
        CodigosSeleccion.ValidarOpcion(errores, "tumores_fp", request.TumoresFp, SiNoCbd);
        CodigosSeleccion.ValidarOpcion(errores, "sangre_camaras", request.SangreCamaras, SiNoCbd);
        CodigosSeleccion.ValidarOpcion(errores, "material_ingerido", request.MaterialIngerido, SiNoCbd);
        CodigosSeleccion.ValidarOpcion(errores, "gi_boca_esofago_estado", request.GiBocaEsofagoEstado, EstadoGiValido);
        CodigosSeleccion.ValidarOpcion(errores, "gi_estomago_estado", request.GiEstomagoEstado, EstadoGiValido);
        CodigosSeleccion.ValidarOpcion(errores, "gi_intestino_1_estado", request.GiIntestino1Estado, EstadoGiValido);
        CodigosSeleccion.ValidarOpcion(errores, "gi_intestino_2_estado", request.GiIntestino2Estado, EstadoGiValido);
        CodigosSeleccion.ValidarOpcion(errores, "urogenital", request.Urogenital, UrogenitalValido);
        CodigosSeleccion.ValidarOpcion(errores, "sexo", request.Sexo, SexosValidos);
        CodigosSeleccion.ValidarOpcion(errores, "testiculos", request.Testiculos, TesticulosValidos);
        CodigosSeleccion.ValidarOpcion(errores, "epididimo", request.Epididimo, EpididimoValido);
        CodigosSeleccion.ValidarOpcion(errores, "ovarios", request.Ovarios, OvariosValidos);
        CodigosSeleccion.ValidarOpcion(errores, "oviducto", request.Oviducto, OviductoValido);

        CodigosSeleccion.ValidarCodigos(errores, "celoma", request.Celoma, CelomaValido);
        CodigosSeleccion.ValidarCodigos(errores, "corazon", request.Corazon, CorazonValido);
        CodigosSeleccion.ValidarCodigos(errores, "higado", request.Higado, HigadoValido);
        CodigosSeleccion.ValidarCodigos(errores, "tracto_gi", request.TractoGi, TractoGiValido);
        CodigosSeleccion.ValidarCodigos(errores, "gi_anormalidades", request.GiAnormalidades, GiAnormalidadesValidas);
        CodigosSeleccion.ValidarCodigos(errores, "traquea", request.Traquea, TraqueaValida);
        CodigosSeleccion.ValidarCodigos(errores, "pulmones", request.Pulmones, PulmonesValidos);
        CodigosSeleccion.ValidarCodigos(errores, "cerebro", request.Cerebro, CerebroValido);

        foreach (var (campo, valor, maximo) in new (string Campo, string? Valor, int Maximo)[]
        {
            ("celoma_comentarios", request.CelomaComentarios, 1000),
            ("tumores_fp_ubicaciones", request.TumoresFpUbicaciones, 500),
            ("corazon_comentarios", request.CorazonComentarios, 1000),
            ("higado_comentarios", request.HigadoComentarios, 1000),
            ("gi_descripcion", request.GiDescripcion, 1000),
            ("material_antropogenico_detalle", request.MaterialAntropogenicoDetalle, 1000),
            ("material_ingerido_descripcion", request.MaterialIngeridoDescripcion, 1000),
            ("gi_boca_esofago_descripcion", request.GiBocaEsofagoDescripcion, 500),
            ("gi_estomago_descripcion", request.GiEstomagoDescripcion, 500),
            ("gi_intestino_1_descripcion", request.GiIntestino1Descripcion, 500),
            ("gi_intestino_2_descripcion", request.GiIntestino2Descripcion, 500),
            ("urogenital_comentarios", request.UrogenitalComentarios, 1000),
            ("respiratorio_comentarios", request.RespiratorioComentarios, 1000),
            ("cerebro_comentarios", request.CerebroComentarios, 1000)
        })
        {
            CodigosSeleccion.ValidarLongitud(errores, campo, valor, maximo);
        }

        return errores;
    }

    private static void AplicarCambios(Necropsia necropsia, NecropsiaRequest request)
    {
        necropsia.FechaNecropsia = request.FechaNecropsia;
        necropsia.Realizo = request.Realizo;
        necropsia.GrasaCorporal = request.GrasaCorporal;
        necropsia.Celoma = CodigosSeleccion.Unir(request.Celoma);
        necropsia.CelomaComentarios = request.CelomaComentarios;
        necropsia.TumoresFp = request.TumoresFp;
        necropsia.TumoresFpUbicaciones = request.TumoresFpUbicaciones;
        necropsia.Corazon = CodigosSeleccion.Unir(request.Corazon);
        necropsia.SangreCamaras = request.SangreCamaras;
        necropsia.CorazonComentarios = request.CorazonComentarios;
        necropsia.Higado = CodigosSeleccion.Unir(request.Higado);
        necropsia.HigadoComentarios = request.HigadoComentarios;
        necropsia.TractoGi = CodigosSeleccion.Unir(request.TractoGi);
        necropsia.BocaExaminada = request.BocaExaminada;
        necropsia.GiAnormalidades = CodigosSeleccion.Unir(request.GiAnormalidades);
        necropsia.GiDescripcion = request.GiDescripcion;
        necropsia.MaterialAntropogenicoDetalle = request.MaterialAntropogenicoDetalle;
        necropsia.MaterialIngerido = request.MaterialIngerido;
        necropsia.MaterialIngeridoDescripcion = request.MaterialIngeridoDescripcion;
        necropsia.MaterialFotoEscala = request.MaterialFotoEscala;
        necropsia.GiBocaEsofagoEstado = request.GiBocaEsofagoEstado;
        necropsia.GiBocaEsofagoDescripcion = request.GiBocaEsofagoDescripcion;
        necropsia.GiEstomagoEstado = request.GiEstomagoEstado;
        necropsia.GiEstomagoDescripcion = request.GiEstomagoDescripcion;
        necropsia.GiIntestino1Estado = request.GiIntestino1Estado;
        necropsia.GiIntestino1Descripcion = request.GiIntestino1Descripcion;
        necropsia.GiIntestino2Estado = request.GiIntestino2Estado;
        necropsia.GiIntestino2Descripcion = request.GiIntestino2Descripcion;
        necropsia.Urogenital = request.Urogenital;
        necropsia.Sexo = request.Sexo;
        necropsia.Testiculos = request.Testiculos;
        necropsia.Epididimo = request.Epididimo;
        necropsia.Ovarios = request.Ovarios;
        necropsia.Oviducto = request.Oviducto;
        necropsia.UrogenitalComentarios = request.UrogenitalComentarios;
        necropsia.Traquea = CodigosSeleccion.Unir(request.Traquea);
        necropsia.Pulmones = CodigosSeleccion.Unir(request.Pulmones);
        necropsia.RespiratorioComentarios = request.RespiratorioComentarios;
        necropsia.Cerebro = CodigosSeleccion.Unir(request.Cerebro);
        necropsia.CerebroComentarios = request.CerebroComentarios;
        necropsia.ResumenHallazgos = request.ResumenHallazgos;
    }

    private async Task<NecropsiaDetalleResponse?> CargarDetalleAsync(
        Expression<Func<Necropsia, bool>> predicado, CancellationToken cancellationToken)
    {
        var necropsia = await dominioDb.Necropsias
            .Include(n => n.Varamiento)
            .AsNoTracking()
            .Where(predicado)
            .FirstOrDefaultAsync(cancellationToken);

        return necropsia?.Varamiento is null ? null : MapearDetalle(necropsia, necropsia.Varamiento);
    }

    private static NecropsiaDetalleResponse MapearDetalle(Necropsia necropsia, Varamiento varamiento) => new(
        necropsia.Id,
        necropsia.VaramientoId,
        varamiento.FechaVaramiento,
        varamiento.NumeroTortugaDia,
        varamiento.PlayaId,
        varamiento.EspecieCodigo,
        necropsia.FechaNecropsia,
        necropsia.Realizo,
        necropsia.GrasaCorporal,
        CodigosSeleccion.Separar(necropsia.Celoma),
        necropsia.CelomaComentarios,
        necropsia.TumoresFp,
        necropsia.TumoresFpUbicaciones,
        CodigosSeleccion.Separar(necropsia.Corazon),
        necropsia.SangreCamaras,
        necropsia.CorazonComentarios,
        CodigosSeleccion.Separar(necropsia.Higado),
        necropsia.HigadoComentarios,
        CodigosSeleccion.Separar(necropsia.TractoGi),
        necropsia.BocaExaminada,
        CodigosSeleccion.Separar(necropsia.GiAnormalidades),
        necropsia.GiDescripcion,
        necropsia.MaterialAntropogenicoDetalle,
        necropsia.MaterialIngerido,
        necropsia.MaterialIngeridoDescripcion,
        necropsia.MaterialFotoEscala,
        necropsia.GiBocaEsofagoEstado,
        necropsia.GiBocaEsofagoDescripcion,
        necropsia.GiEstomagoEstado,
        necropsia.GiEstomagoDescripcion,
        necropsia.GiIntestino1Estado,
        necropsia.GiIntestino1Descripcion,
        necropsia.GiIntestino2Estado,
        necropsia.GiIntestino2Descripcion,
        necropsia.Urogenital,
        necropsia.Sexo,
        necropsia.Testiculos,
        necropsia.Epididimo,
        necropsia.Ovarios,
        necropsia.Oviducto,
        necropsia.UrogenitalComentarios,
        CodigosSeleccion.Separar(necropsia.Traquea),
        CodigosSeleccion.Separar(necropsia.Pulmones),
        necropsia.RespiratorioComentarios,
        CodigosSeleccion.Separar(necropsia.Cerebro),
        necropsia.CerebroComentarios,
        necropsia.ResumenHallazgos,
        necropsia.CreadoEn,
        necropsia.ActualizadoEn);

    private static string MensajeNecropsiaDuplicada(int varamientoId) =>
        $"El varamiento {varamientoId} ya tiene una necropsia registrada.";

    private static bool EsViolacionUnica(DbUpdateException ex, string? indice)
    {
        if (ex.InnerException is not SqlException sqlEx)
        {
            return false;
        }

        if (sqlEx.Number != 2601 && sqlEx.Number != 2627)
        {
            return false;
        }

        return indice is null || sqlEx.Message.Contains(indice, StringComparison.OrdinalIgnoreCase);
    }
}
