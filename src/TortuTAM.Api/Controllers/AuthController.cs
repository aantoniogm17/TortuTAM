using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
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
}
