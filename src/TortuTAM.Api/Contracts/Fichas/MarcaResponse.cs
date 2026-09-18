namespace TortuTAM.Api.Contracts.Fichas;

public record MarcaResponse(
    int Id,
    string Aleta,
    string? Pit,
    string? NumeroMarca,
    string? Leyenda,
    string? NuevaORecap,
    bool CicatrizMarca,
    bool Verifico);
