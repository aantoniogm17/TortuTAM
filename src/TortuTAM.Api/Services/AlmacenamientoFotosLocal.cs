using Microsoft.Extensions.Options;

namespace TortuTAM.Api.Services;

public class AlmacenamientoFotosLocal : IAlmacenamientoFotos
{
    private readonly string _rutaBase;

    public AlmacenamientoFotosLocal(IOptions<StorageOptions> options, IHostEnvironment entorno)
    {
        var rutaConfigurada = options.Value.FichasFotosPath;
        _rutaBase = Path.IsPathRooted(rutaConfigurada)
            ? rutaConfigurada
            : Path.Combine(entorno.ContentRootPath, rutaConfigurada);
    }

    public Task<string> GuardarAsync(int fichaId, IFormFile archivo, CancellationToken cancellationToken) =>
        GuardarAsync(fichaId.ToString(), archivo, cancellationToken);

    public async Task<string> GuardarAsync(string carpetaRelativa, IFormFile archivo, CancellationToken cancellationToken)
    {
        var segmentos = carpetaRelativa.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var carpeta = Path.Combine([_rutaBase, .. segmentos]);
        Directory.CreateDirectory(carpeta);

        var extension = Path.GetExtension(archivo.FileName);
        var nombreArchivo = $"{Guid.NewGuid():N}{extension}";
        var rutaFisica = Path.Combine(carpeta, nombreArchivo);

        await using (var destino = File.Create(rutaFisica))
        {
            await archivo.CopyToAsync(destino, cancellationToken);
        }

        return $"{string.Join('/', segmentos)}/{nombreArchivo}";
    }

    public string ObtenerRutaFisica(string rutaRelativa)
    {
        var segmentos = rutaRelativa.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return Path.Combine([_rutaBase, .. segmentos]);
    }
}
