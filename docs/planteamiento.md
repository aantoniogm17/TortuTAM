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

- **"Binacional"**: sigue sin resolverse qué significa en este proyecto — el protocolo no lo menciona (contacto y glosario apuntan a Tamaulipas/Veracruz, México, no a otro país).
- **Playas fuera de las 5 sembradas**: se sembró `cat_playas` con las 5 del protocolo oficial (Rancho Nuevo, Tepehuajes, Barra del Tordo, Altamira, Miramar). Si el proyecto cubre alguna playa adicional, se agrega por issue.
- **Códigos de uso de nido 1/2 y 3/4**: el protocolo lista dos códigos para lo que parece ser el mismo destino (corral, caja) sin explicar la diferencia; no se agregaron esos códigos adicionales a `cat_uso_nido` hasta saber qué los distingue.
- **Modificaciones a la base de datos**: hay cambios pendientes según información y requerimientos ya recibidos del cliente, todavía no consolidados. Se irán resolviendo por issue.
- **Relación `fichas_limpieza` ↔ `fichas`**: existen dos caminos (la llave foránea `ficha_anidacion_id` y el emparejamiento por corral+nido usado en `vw_estatus_nidos`); falta decidir si se deja solo la FK como fuente de verdad.

## Decisiones ya tomadas a partir del protocolo oficial

- **Especies**: se sembró `cat_especies` con las 5 del protocolo (lora `lk`, verde `cm`, caguama `cc`, laúd `dc`, carey `ei`) — el proyecto se centra en la tortuga lora, pero el protocolo real registra las 5 especies que anidan en las mismas playas.
- **Código de la lora**: se usa `lk` (protocolo oficial), no `LO` como en el esquema heredado.
- **Varamientos**: se mantienen como están hoy (valores 9/10 del campo `accion_codigo` dentro de `fichas`), sin tabla propia por ahora.
- **Campos de clasificación de nidada**: se agregaron `protegido` y `compl_div_jun` a `fichas`, y `pasa` a `fichas_limpieza`.

## Reglas de trabajo

Ver [CLAUDE.md](../CLAUDE.md) para reglas de comportamiento, agentes del proyecto y política de atribución.
