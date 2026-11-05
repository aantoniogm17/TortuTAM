namespace TortuTAM.Api.Contracts.Varamientos;

public record VaramientoEtiquetaResponse(
    int Id,
    string Tipo,
    string Numero,
    string? Ubicacion);
