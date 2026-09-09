namespace TortuTAM.Api.Contracts.Common;

public record PaginaResponse<T>(int Total, int Pagina, int TamanoPagina, IReadOnlyList<T> Elementos);
