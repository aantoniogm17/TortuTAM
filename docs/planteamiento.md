# Planteamiento del proyecto

## Contexto

TortuTAM digitaliza la captura de datos del Programa Binacional para la Recuperación de la Tortuga Lora. Hoy la información se levanta en fichas físicas (anidación, marcado, limpieza de nido, varamientos) y se transcribe después a mano; el objetivo es capturarla directo en campo desde el dispositivo móvil del brigadista.

## Decisiones técnicas

| Área | Decisión |
|---|---|
| Backend | ASP.NET Core (C#) |
| Base de datos | SQL Server |
| Cliente | Sitio web responsivo, sin apps nativas por ahora |
| Autenticación | ASP.NET Core Identity (hashing de contraseñas, roles y sesión ya resueltos por el framework, sobre tablas SQL normales) |
| Offline | Captura sin conexión con sincronización posterior al recuperar señal |
| GPS | Obligatorio en cada toma de datos |
| Imágenes | La app debe permitir adjuntar fotos a la ficha |
| Hosting | Sin definir; probable AWS a futuro. Sin servidor, dominio ni presupuesto asignado todavía |
| Idioma | Español únicamente por ahora; inglés queda para una fase futura |
| Exportación de datos | A futuro, sin especificar formato aún |
| Cronograma | No definido todavía |

## Usuarios y roles

Autenticación vía ASP.NET Core Identity. El inicio de sesión requiere conexión, pero la sesión (token) queda guardada en el dispositivo para que la app siga funcionando offline en campo; la sincronización de fichas capturadas usa esa misma sesión al recuperar señal.

| Rol | Alcance |
|---|---|
| Usuario normal | Captura fichas y puede modificar cualquier ficha de cualquier playa del programa (no está restringido a una playa específica) |
| Administrador | Control total sobre datos, catálogos y cuentas de Usuario normal. No puede crear ni gestionar cuentas de Administrador |
| Superadmin | Único rol que gestiona cuentas de Administrador y el único con acceso para hacer cambios a nivel de código/despliegue |

## Pendientes

- **Alcance de especies, playas**: qué especies cubre la app además de las ya presentes en el esquema, cuántas playas/organizaciones participan, y qué significa "binacional" en este proyecto. Se documentará como issue antes de tocar catálogos o tablas relacionadas.
- **Modificaciones a la base de datos**: hay cambios pendientes según información y requerimientos ya recibidos del cliente, todavía no consolidados. Se irán resolviendo por issue.
- **Puerto del esquema a T-SQL**: el esquema heredado (`database/schema/esquema_base_datos.sql`) está en sintaxis MySQL/MariaDB.
- **Relación `fichas_limpieza` ↔ `fichas`**: existen dos caminos (la llave foránea `ficha_anidacion_id` y el emparejamiento por corral+nido usado en `vw_estatus_nidos`); falta decidir si se deja solo la FK como fuente de verdad.

## Reglas de trabajo

Ver [CLAUDE.md](../CLAUDE.md) para reglas de comportamiento, agentes del proyecto y política de atribución.
