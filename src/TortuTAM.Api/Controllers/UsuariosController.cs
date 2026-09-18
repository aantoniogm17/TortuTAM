using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using TortuTAM.Api.Contracts.Usuarios;
using TortuTAM.Api.Models;

namespace TortuTAM.Api.Controllers;

[ApiController]
[Route("api/usuarios")]
[Authorize(Roles = $"{Roles.Administrador},{Roles.Superadmin}")]
public class UsuariosController(
    UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UsuarioResponse>>> Listar()
    {
        var usuarios = userManager.Users.ToList();
        var respuesta = new List<UsuarioResponse>(usuarios.Count);

        foreach (var usuario in usuarios)
        {
            var roles = await userManager.GetRolesAsync(usuario);
            respuesta.Add(new UsuarioResponse(
                usuario.Id,
                usuario.Email!,
                usuario.NombreCompleto,
                usuario.Codigo,
                usuario.Iniciales,
                usuario.Activo,
                [.. roles]));
        }

        return Ok(respuesta);
    }

    [HttpPost]
    public async Task<ActionResult<UsuarioResponse>> Crear(CrearUsuarioRequest request)
    {
        if (!Roles.Todos.Contains(request.Rol))
        {
            return BadRequest(new { mensaje = "Rol inválido." });
        }

        if (request.Rol == Roles.Superadmin)
        {
            return Forbid();
        }

        if (request.Rol == Roles.Administrador && !User.IsInRole(Roles.Superadmin))
        {
            return Forbid();
        }

        var usuario = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true,
            NombreCompleto = request.NombreCompleto,
            Codigo = request.Codigo,
            Iniciales = request.Iniciales
        };

        var resultado = await userManager.CreateAsync(usuario, request.Password);
        if (!resultado.Succeeded)
        {
            return BadRequest(new { errores = resultado.Errors.Select(e => e.Description) });
        }

        await userManager.AddToRoleAsync(usuario, request.Rol);

        var respuesta = new UsuarioResponse(
            usuario.Id,
            usuario.Email!,
            usuario.NombreCompleto,
            usuario.Codigo,
            usuario.Iniciales,
            usuario.Activo,
            [request.Rol]);

        return CreatedAtAction(nameof(Listar), respuesta);
    }
}
