namespace TortuTAM.Api.Contracts.Usuarios;

public record UsuarioResponse(
    Guid Id,
    string Email,
    string NombreCompleto,
    string Codigo,
    string Iniciales,
    bool Activo,
    IReadOnlyList<string> Roles);
