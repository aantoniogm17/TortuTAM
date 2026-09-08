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

    public async Task<string> GuardarAsync(int fichaId, IFormFile archivo, CancellationToken cancellationToken)
    {
        var carpetaFicha = Path.Combine(_rutaBase, fichaId.ToString());
        Directory.CreateDirectory(carpetaFicha);

        var extension = Path.GetExtension(archivo.FileName);
        var nombreArchivo = $"{Guid.NewGuid():N}{extension}";
        var rutaFisica = Path.Combine(carpetaFicha, nombreArchivo);

        await using (var destino = File.Create(rutaFisica))
        {
            await archivo.CopyToAsync(destino, cancellationToken);
        }

        return $"{fichaId}/{nombreArchivo}";
    }

    public string ObtenerRutaFisica(string rutaRelativa)
    {
        var segmentos = rutaRelativa.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return Path.Combine([_rutaBase, .. segmentos]);
    }
}
