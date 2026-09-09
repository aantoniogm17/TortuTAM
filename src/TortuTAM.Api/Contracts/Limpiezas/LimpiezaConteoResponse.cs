namespace TortuTAM.Api.Contracts.Limpiezas;

public record LimpiezaConteoResponse(
    int Id,
    string CategoriaCodigo,
    short? Normales,
    short? Albina,
    short? Deforme,
    short? AlbinasDeformes,
    short? Total);
