namespace TortuTAM.Api.Services;

// Los campos de selección múltiple de varamientos y necropsias se guardan en BD
// como códigos separados por coma (sin espacios) y en la API viajan como arreglo.
// Los valores válidos son listas fijas en la API más un CHECK en BD, sin tablas
// catálogo (ver migraciones 0026 y 0029).
public static class CodigosSeleccion
{
    public static string? Unir(IEnumerable<string> codigos)
    {
        var limpios = codigos
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim())
            .Distinct()
            .ToList();

        return limpios.Count == 0 ? null : string.Join(',', limpios);
    }

    public static IReadOnlyList<string> Separar(string? csv) =>
        string.IsNullOrWhiteSpace(csv)
            ? []
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public static void ValidarOpcion(List<string> errores, string campo, string? valor, string[] validos)
    {
        if (!string.IsNullOrWhiteSpace(valor) && !validos.Contains(valor))
        {
            errores.Add($"{campo} '{valor}' no es válido; use {string.Join(", ", validos)}.");
        }
    }

    public static void ValidarCodigos(List<string> errores, string campo, IEnumerable<string> valores, string[] validos)
    {
        foreach (var valor in valores)
        {
            if (string.IsNullOrWhiteSpace(valor) || !validos.Contains(valor.Trim()))
            {
                errores.Add($"{campo} contiene '{valor}', que no es válido; use {string.Join(", ", validos)}.");
            }
        }
    }

    public static void ValidarLongitud(List<string> errores, string campo, string? valor, int maximo)
    {
        if (valor is not null && valor.Length > maximo)
        {
            errores.Add($"{campo} admite máximo {maximo} caracteres.");
        }
    }
}
