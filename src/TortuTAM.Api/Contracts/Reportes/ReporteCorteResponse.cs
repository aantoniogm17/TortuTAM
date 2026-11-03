namespace TortuTAM.Api.Contracts.Reportes;

public record ReporteCorteResponse(
    DateOnly FechaCorte,
    IReadOnlyList<ReportePlayaResponse> Playas,
    ReportePlayaResponse? Total);

public record ReportePlayaResponse(
    int PlayaId,
    string Codigo,
    string? Nombre,
    int Corral,
    int Caja,
    int InSitu,
    int Saqueadas,
    int PerdidasMarea,
    int Depredadas,
    int NidosProtegidos,
    int NidosRegistrados,
    long HuevosProtegidos,
    ReporteEclosionResponse LimpiosCorral,
    ReporteEclosionResponse LimpiosInSitu,
    long CriasLiberadas,
    long HuevosNidosLimpios,
    decimal? PorcentajeSobrevivencia,
    IReadOnlyList<ReporteVaramientoResponse> Varamientos);

public record ReporteEclosionResponse(int Nidos, long CriasVivas, long TotalHuevos, decimal? Porcentaje);

public record ReporteVaramientoResponse(string? EspecieCodigo, string? Sexo, int Vivos, int Muertos);
