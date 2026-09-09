using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TortuTAM.Api.Contracts.Auth;
using TortuTAM.Api.Models;
using TortuTAM.Api.Services;

namespace TortuTAM.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    SignInManager<ApplicationUser> signInManager,
    UserManager<ApplicationUser> userManager,
    IJwtTokenService jwtTokenService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var usuario = await userManager.FindByEmailAsync(request.Email);
        if (usuario is null || !usuario.Activo)
        {
            return Unauthorized(new { mensaje = "Credenciales inválidas." });
        }

        var resultado = await signInManager.CheckPasswordSignInAsync(usuario, request.Password, lockoutOnFailure: true);
        if (!resultado.Succeeded)
        {
            return Unauthorized(new { mensaje = "Credenciales inválidas." });
        }

        var roles = await userManager.GetRolesAsync(usuario);
        var token = jwtTokenService.CrearToken(usuario, roles);

        return Ok(new LoginResponse(
            token.Token,
            token.ExpiraEnUtc,
            usuario.Id,
            usuario.Email!,
            usuario.NombreCompleto,
            usuario.Codigo,
            usuario.Iniciales,
            [.. roles]));
    }

    [HttpPost("registro")]
    public async Task<ActionResult<LoginResponse>> Registro(RegistroRequest request)
    {
        var existente = await userManager.FindByEmailAsync(request.Email);
        if (existente is not null)
        {
            return Conflict(new { mensaje = "Ya existe una cuenta con este correo." });
        }

        var usuario = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true,
            NombreCompleto = $"{request.Nombre.Trim()} {request.Apellido.Trim()}",
            Codigo = await GenerarCodigoUnicoAsync(),
            Iniciales = ObtenerIniciales(request.Nombre, request.Apellido)
        };

        var resultado = await userManager.CreateAsync(usuario, request.Password);
        if (!resultado.Succeeded)
        {
            if (resultado.Errors.Any(e => e.Code is "DuplicateUserName" or "DuplicateEmail"))
            {
                return Conflict(new { mensaje = "Ya existe una cuenta con este correo." });
            }

            return BadRequest(new { errores = resultado.Errors.Select(e => e.Description) });
        }

        await userManager.AddToRoleAsync(usuario, Roles.UsuarioNormal);

        var roles = await userManager.GetRolesAsync(usuario);
        var token = jwtTokenService.CrearToken(usuario, roles);

        var respuesta = new LoginResponse(
            token.Token,
            token.ExpiraEnUtc,
            usuario.Id,
            usuario.Email!,
            usuario.NombreCompleto,
            usuario.Codigo,
            usuario.Iniciales,
            [.. roles]);

        return StatusCode(StatusCodes.Status201Created, respuesta);
    }

    private static string ObtenerIniciales(string nombre, string apellido)
    {
        var inicialNombre = nombre.Trim()[0];
        var inicialApellido = apellido.Trim()[0];
        return $"{inicialNombre}{inicialApellido}".ToUpperInvariant();
    }

    private async Task<string> GenerarCodigoUnicoAsync()
    {
        for (var intento = 0; intento < 5; intento++)
        {
            var candidato = $"USR-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
            var enUso = await userManager.Users.AnyAsync(u => u.Codigo == candidato);
            if (!enUso)
            {
                return candidato;
            }
        }

        return $"USR-{Guid.NewGuid():N}"[..20];
    }
}
