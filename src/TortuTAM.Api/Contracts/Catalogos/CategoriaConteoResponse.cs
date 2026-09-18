namespace TortuTAM.Api.Contracts.Catalogos;

public record CategoriaConteoResponse(
    string Codigo,
    string Descripcion,
    bool SoloTotal,
    bool CuentaCriaViva,
    bool ExcluirDeHuevosTotales);
