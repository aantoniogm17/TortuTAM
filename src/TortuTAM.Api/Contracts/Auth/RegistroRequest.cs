using System.ComponentModel.DataAnnotations;

namespace TortuTAM.Api.Contracts.Auth;

public class RegistroRequest
{
    [Required, MaxLength(70)]
    public required string Nombre { get; set; }

    [Required, MaxLength(70)]
    public required string Apellido { get; set; }

    [Required, EmailAddress]
    public required string Email { get; set; }

    [Required, MinLength(8)]
    public required string Password { get; set; }
}
