namespace TortuTAM.Api.Models;

public static class Roles
{
    public const string UsuarioNormal = "UsuarioNormal";
    public const string Administrador = "Administrador";
    public const string Superadmin = "Superadmin";

    public static readonly IReadOnlyList<string> Todos =
    [
        UsuarioNormal,
        Administrador,
        Superadmin
    ];
}
