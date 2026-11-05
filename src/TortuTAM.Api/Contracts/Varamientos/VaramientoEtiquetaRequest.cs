namespace TortuTAM.Api.Contracts.Varamientos;

public record VaramientoEtiquetaRequest(
    string Tipo,
    string Numero,
    string? Ubicacion);
