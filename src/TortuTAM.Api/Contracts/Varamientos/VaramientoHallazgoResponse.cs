namespace TortuTAM.Api.Contracts.Varamientos;

public record VaramientoHallazgoResponse(
    int Id,
    string Categoria,
    string TipoCodigo,
    IReadOnlyList<string> Ubicaciones,
    string? Detalle);
