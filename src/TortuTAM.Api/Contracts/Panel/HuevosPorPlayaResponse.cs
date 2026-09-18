namespace TortuTAM.Api.Contracts.Panel;

public record HuevosPorPlayaResponse(int PlayaId, string PlayaCodigo, string? PlayaNombre, long HuevosColectados);
