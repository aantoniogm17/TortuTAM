using System.Reflection;
using DbUp;
using DbUp.Helpers;
using Microsoft.Extensions.Logging;

namespace TortuTAM.Api.Services;

public static class DatabaseMigrator
{
    private const string ResourcePrefix = "TortuTAM.Api.Migrations.";

    public static void ApplyPendingMigrations(string connectionString, ILogger logger)
    {
        EnsureDatabase.For.SqlDatabase(connectionString);

        var upgrader = DeployChanges.To
            .SqlDatabase(connectionString)
            .WithScriptsEmbeddedInAssembly(
                Assembly.GetExecutingAssembly(),
                script => script.StartsWith(ResourcePrefix, StringComparison.Ordinal)
                          && script.EndsWith(".sql", StringComparison.OrdinalIgnoreCase))
            .LogTo(logger)
            .Build();

        var resultado = upgrader.PerformUpgrade();

        if (!resultado.Successful)
        {
            throw new InvalidOperationException(
                $"Falló al aplicar las migraciones de database/migrations (script: {resultado.ErrorScript?.Name ?? "desconocido"}). " +
                "La API no arranca hasta que la base de datos quede en un estado consistente. Ver el detalle en la excepción interna.",
                resultado.Error);
        }
    }
}
