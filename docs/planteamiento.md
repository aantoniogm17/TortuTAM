# Planteamiento del proyecto

## Contexto

TortuTAM digitaliza la captura de datos del Programa Binacional para la Recuperación de la Tortuga Lora. Hoy la información se levanta en fichas físicas (anidación, marcado, limpieza de nido, varamientos) y se transcribe después a mano; el objetivo es capturarla directo en campo desde el dispositivo móvil del brigadista.

## Decisiones técnicas

| Área | Decisión |
|---|---|
| Backend | ASP.NET Core (C#) |
| Base de datos | SQL Server |
| Cliente | Sitio web responsivo, sin apps nativas por ahora |
| Offline | Captura sin conexión con sincronización posterior al recuperar señal |
| GPS | Obligatorio en cada toma de datos |
| Imágenes | La app debe permitir adjuntar fotos a la ficha |
| Hosting | Sin definir; probable AWS a futuro. Sin servidor, dominio ni presupuesto asignado todavía |
| Idioma | Español únicamente por ahora; inglés queda para una fase futura |
| Exportación de datos | A futuro, sin especificar formato aún |
| Cronograma | No definido todavía |

## Pendientes

- **Alcance de especies, playas y roles**: qué especies cubre la app además de las ya presentes en el esquema, cuántas playas/organizaciones participan, qué significa "binacional" en este proyecto, y qué rol tiene cada tipo de usuario (quién captura vs. quién solo consulta/reporta). Se documentará como issue antes de tocar catálogos o tablas relacionadas.
- **Modificaciones a la base de datos**: hay cambios pendientes según información y requerimientos ya recibidos del cliente, todavía no consolidados. Se irán resolviendo por issue.
- **Puerto del esquema a T-SQL**: el esquema heredado (`database/schema/esquema_base_datos.sql`) está en sintaxis MySQL/MariaDB.
- **Relación `fichas_limpieza` ↔ `fichas`**: existen dos caminos (la llave foránea `ficha_anidacion_id` y el emparejamiento por corral+nido usado en `vw_estatus_nidos`); falta decidir si se deja solo la FK como fuente de verdad.

## Reglas de trabajo

Ver [CLAUDE.md](../CLAUDE.md) para reglas de comportamiento, agentes del proyecto y política de atribución.
