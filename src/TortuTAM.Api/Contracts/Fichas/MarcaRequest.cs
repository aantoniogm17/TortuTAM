namespace TortuTAM.Api.Contracts.Fichas;

public record MarcaRequest(
    string Aleta,
    string? Pit,
    string? NumeroMarca,
    string? Leyenda,
    string? NuevaORecap,
    bool CicatrizMarca,
    bool Verifico);
