namespace TortuTAM.Api.Contracts.Auth;

public record LoginResponse(
    string Token,
    DateTime ExpiraEnUtc,
    Guid UsuarioId,
    string Email,
    string NombreCompleto,
    string Codigo,
    string Iniciales,
    IReadOnlyList<string> Roles);
