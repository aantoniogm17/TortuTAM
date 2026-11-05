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
| Hosting | Decidido: VPS Hostinger, plan KVM 2 (Ubuntu 22.04 LTS). Ver `docs/auditoria-produccion.md` (qué faltaba) y `docs/despliegue-hostinger.md` (guía de despliegue) |
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
- **Códigos de uso de nido 1/2 y 3/4**: el protocolo lista dos códigos para lo que parece ser el mismo destino (corral, caja) sin explicar la diferencia; no se agregaron esos códigos adicionales a `cat_uso_nido` hasta saber qué los distingue.
- **Catálogo de corrales por playa**: cada playa debe limitar sus corrales a un conjunto propio (dropdown condicionado), pero la cantidad y nombres de corrales por playa aún no están corroborados por el equipo de campo. Bloqueado hasta esa corroboración.
- **Captura de temperaturas**: ya existe `fichas.temperatura_c` como solución interina; falta definir si se necesita una estructura más rica (lectura única por nido, o serie de lecturas por fecha/hora).
- **Catálogo previo de usuarios**: antes del alta en el login se debe registrar nombre, código e iniciales de cada brigadista.
- **Consulta rápida de tortuga por PIT**: si la tortuga ya está identificada, se debe poder buscarla por PIT y modificar solo ciertos parámetros en vez de capturar una ficha nueva completa. Pendiente de detallar como issue (endpoint de búsqueda + edición parcial).
- **Número de nido**: la numeración/consecutivo la compartirá el equipo de campo más adelante; no tocar `fichas.numero_nido` hasta recibirla.
- **Modelo C# de las columnas nuevas**: `fichas.protegido`, `fichas.compl_div_jun` y `fichas_limpieza.pasa` (migraciones 0021-0022) todavía no están reflejadas en `Models/Dominio/Ficha.cs` / `FichaLimpieza.cs`, ni en los contratos/controladores del backend. Falta ese trabajo para que la API las exponga.
- **Modificaciones a la base de datos**: hay cambios pendientes según información y requerimientos ya recibidos del cliente, todavía no consolidados. Se irán resolviendo por issue.
- **Relación `fichas_limpieza` ↔ `fichas`**: existen dos caminos (la llave foránea `ficha_anidacion_id` y el emparejamiento por corral+nido usado en `vw_estatus_nidos`); falta decidir si se deja solo la FK como fuente de verdad.
- **Medidas de cola en varamientos**: la ficha NOAA trae dos renglones "SÍ, medida: ___ cm" sin indicar qué mide cada uno; se guardan como `cola_medida_1_cm` y `cola_medida_2_cm` hasta que el equipo de campo lo aclare.
- **Listado combinado de "Fichas"**: decidido, pendiente de implementar; por ahora la sección sigue mostrando solo fichas de anidación.
- **Varamientos en el reporte de corte**: el reporte suma las dos fuentes (códigos 9/10 de `fichas` y la tabla `varamientos`, con el sexo tomado de la necropsia). Si una misma tortuga se registra en ambas, se cuenta dos veces; falta definir cómo evitarlo o si la captura debe hacerse solo en la ficha de varamiento.
- **Revisar cuentas de acceso creadas**: para pruebas locales se creó una cuenta Administrador (`admin.demo@tortutam.local`) desde el Superadmin semilla. Falta decidir una política real de alta de cuentas (quién las crea, cómo se entregan credenciales) antes de que el proyecto tenga un ambiente real; las cuentas de prueba locales no deben confundirse con cuentas de producción.

## Decisiones ya tomadas a partir del protocolo oficial

- **Especies**: se sembró `cat_especies` con las 5 del protocolo (lora `lk`, verde `cm`, caguama `cc`, laúd `dc`, carey `ei`) — el proyecto se centra en la tortuga lora, pero el protocolo real registra las 5 especies que anidan en las mismas playas. Con la ficha de varamientos (formato NOAA) se agregaron golfina `lo` y "No identificada" `ni` (migración 0025), por decisión del responsable del proyecto; quedan disponibles en todas las fichas.
- **Código de la lora**: se usa `lk` (protocolo oficial), no `LO` como en el esquema heredado.
- **Nombre científico de la lora**: el protocolo extraído en `docs/protocolo-captura-lora.md` traía un error (`Lepidochelys olivacea`, que es la tortuga golfina); se corrigió a `Lepidochelys kempii`, la especie correcta de la tortuga lora (migración 0023).
- **Playas**: la migración 0019 había sembrado `cat_playas` con las 5 del protocolo oficial (Rancho Nuevo, Tepehuajes, Barra del Tordo, Altamira, Miramar), reemplazando por decisión explícita del responsable del proyecto la confirmación previa de 6 playas de la reunión con el equipo de campo. Esa decisión quedó sin efecto: la migración 0024 vuelve a sembrar `cat_playas` con las 6 playas confirmadas en la reunión (Miramar, Altamira, Tepehuajes, La Pesca, Mezquital, Playa Bagdad), que además coinciden con los códigos usados en la base de datos real de campo de la temporada 2025.
- **Varamientos**: la decisión anterior (sin tabla propia) quedó sin efecto. Los varamientos se capturan en su propia ficha (tabla `varamientos`, basada en `docs/Ficha Varamientos NOAA lado 1.pdf` y `lado 2.pdf`). Los valores 9 ("Varada viva") y 10 ("Varada muerta") de `fichas.accion_codigo` **conviven** con la tabla nueva: se conservan para el caso de una tortuga varada que también aparece en los datos de anidación.
- **Necropsia**: ficha propia (tabla `necropsias`, basada en `docs/Ficha Necropsia 2021.pdf`) que se anexa a un varamiento con relación opcional 1 a 0/1 (`necropsias.varamiento_id` único), el mismo patrón que `fichas_limpieza.ficha_anidacion_id`. Un varamiento con condición "Vivo" no admite necropsia.
- **Menú de la aplicación**: Panel, Anidación, Limpieza, Varamientos, Necropsia, Fichas, Mapa de nidos. La sección "Fichas" pasa a ser un listado combinado de los 4 tipos de ficha (anidación, limpieza, varamientos y necropsia) con filtro por tipo.
- **Campos de clasificación de nidada**: se agregaron `protegido` y `compl_div_jun` a `fichas`, y `pasa` a `fichas_limpieza`.
- **Coordenadas GPS**: solo se capturan para tortugas con marca PIT (no en cualquier avistamiento); no requiere cambio de esquema (`fichas.latitud`/`longitud` ya cubre el caso).

## Reglas de trabajo

Ver [CLAUDE.md](../CLAUDE.md) para reglas de comportamiento, agentes del proyecto y política de atribución.
