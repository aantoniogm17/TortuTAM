namespace TortuTAM.Api.Services;

public class IdentitySeedOptions
{
    public const string SectionName = "IdentitySeed";

    public string SuperadminEmail { get; set; } = "superadmin@tortutam.local";

    public string SuperadminPassword { get; set; } = string.Empty;

    public string SuperadminNombreCompleto { get; set; } = "Superadministrador TortuTAM";

    public string SuperadminCodigo { get; set; } = "SA-000";

    public string SuperadminIniciales { get; set; } = "SA";
}
