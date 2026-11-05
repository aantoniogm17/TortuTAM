namespace TortuTAM.Api.Services;

// Aisla el destino físico de las fotos de ficha (filesystem local por ahora)
// para poder migrar a almacenamiento externo más adelante sin tocar los
// controllers (no hay hosting definido todavía, ver docs/planteamiento.md).
public interface IAlmacenamientoFotos
{
    Task<string> GuardarAsync(int fichaId, IFormFile archivo, CancellationToken cancellationToken);

    // Variante para registros que no son fichas de anidación (p. ej. varamientos):
    // la carpeta relativa evita mezclar sus fotos con las de una ficha del mismo id.
    Task<string> GuardarAsync(string carpetaRelativa, IFormFile archivo, CancellationToken cancellationToken);

    string ObtenerRutaFisica(string rutaRelativa);
}
