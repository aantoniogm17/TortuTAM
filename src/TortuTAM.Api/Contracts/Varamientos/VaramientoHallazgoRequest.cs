namespace TortuTAM.Api.Contracts.Varamientos;

public record VaramientoHallazgoRequest(
    string Categoria,
    string TipoCodigo,
    IReadOnlyList<string>? Ubicaciones,
    string? Detalle)
{
    public IReadOnlyList<string> Ubicaciones { get; init; } = Ubicaciones ?? [];
}
