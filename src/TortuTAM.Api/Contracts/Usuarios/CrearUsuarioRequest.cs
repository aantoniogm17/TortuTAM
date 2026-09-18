using System.ComponentModel.DataAnnotations;

namespace TortuTAM.Api.Contracts.Usuarios;

public class CrearUsuarioRequest
{
    [Required, EmailAddress]
    public required string Email { get; set; }

    [Required, MinLength(8)]
    public required string Password { get; set; }

    [Required, MaxLength(150)]
    public required string NombreCompleto { get; set; }

    [Required, MaxLength(20)]
    public required string Codigo { get; set; }

    [Required, MaxLength(10)]
    public required string Iniciales { get; set; }

    [Required]
    public required string Rol { get; set; }
}
