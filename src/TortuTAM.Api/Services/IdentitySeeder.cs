using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using TortuTAM.Api.Models;

namespace TortuTAM.Api.Services;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var seedOptions = services.GetRequiredService<IOptions<IdentitySeedOptions>>().Value;

        foreach (var rol in Roles.Todos)
        {
            if (!await roleManager.RoleExistsAsync(rol))
            {
                await roleManager.CreateAsync(new IdentityRole<Guid>(rol));
            }
        }

        var superadminExistente = await userManager.FindByEmailAsync(seedOptions.SuperadminEmail);
        if (superadminExistente is not null)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(seedOptions.SuperadminPassword))
        {
            throw new InvalidOperationException(
                "Falta configurar IdentitySeed:SuperadminPassword (user-secrets o variable de entorno) para crear la cuenta semilla de Superadmin. No dejar una contraseña real en appsettings.json versionado.");
        }

        var superadmin = new ApplicationUser
        {
            UserName = seedOptions.SuperadminEmail,
            Email = seedOptions.SuperadminEmail,
            EmailConfirmed = true,
            NombreCompleto = seedOptions.SuperadminNombreCompleto,
            Codigo = seedOptions.SuperadminCodigo,
            Iniciales = seedOptions.SuperadminIniciales
        };

        var resultado = await userManager.CreateAsync(superadmin, seedOptions.SuperadminPassword);
        if (!resultado.Succeeded)
        {
            var errores = string.Join("; ", resultado.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"No se pudo crear la cuenta semilla de Superadmin: {errores}");
        }

        await userManager.AddToRoleAsync(superadmin, Roles.Superadmin);
    }
}
