namespace TortuTAM.Api.Contracts.Limpiezas;

public record LimpiezaConteoRequest(
    string CategoriaCodigo,
    short? Normales,
    short? Albina,
    short? Deforme,
    short? AlbinasDeformes,
    short? Total);
