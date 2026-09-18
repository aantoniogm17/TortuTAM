using Microsoft.AspNetCore.Identity;

namespace TortuTAM.Api.Models;

public class ApplicationUser : IdentityUser<Guid>
{
    public required string NombreCompleto { get; set; }

    public required string Codigo { get; set; }

    public required string Iniciales { get; set; }

    public bool Activo { get; set; } = true;
}
