# Auditoría de preparación para producción

Revisión del estado actual del backend (`src/TortuTAM.Api/`) y frontend (`src/TortuTAM.Web/`) frente a lo que hace falta para desplegarlos en un servidor/hosting real con dominio propio. Basada en revisión directa del código, no en suposiciones. Cada punto indica qué falta y por qué importa.

## Dominio, DNS y certificado

- **Falta todo**: no hay dominio registrado, no hay DNS configurado, no hay certificado TLS. `docs/planteamiento.md` ya lo tenía anotado como pendiente ("Hosting: sin definir... sin presupuesto asignado todavía").
- La API no implementa `UseHttpsRedirection()` ni HSTS — no es necesariamente un problema (es normal delegar TLS a un proxy/balanceador enfrente), pero hoy no hay ninguna decisión documentada de quién hace esa terminación TLS.

## CORS en producción — bloqueante real

`src/TortuTAM.Api/Program.cs:99-113`: la política CORS **solo se registra y se aplica cuando `IsDevelopment()` es verdadero**. En cualquier otro ambiente, `UseCors` nunca se llama. Esto significa:

- Si el frontend y la API terminan en dominios/puertos distintos en producción, el navegador bloqueará las peticiones del frontend por CORS.
- Esto ya se había detectado en la auditoría de login (issue #48, hallazgo #2) pero solo se corrigió para desarrollo, no para producción.

**Qué falta**: definir si frontend y API se sirven bajo el mismo origen (evita el problema de raíz) o si necesitan dominios distintos (y entonces configurar una política CORS real para `Production`, con origins explícitos — nunca `AllowAnyOrigin` en producción).

## Configuración del frontend hacia la API

`src/TortuTAM.Web/js/api.js:16`: por defecto usa `/api` (ruta relativa) salvo que `window.TortuTAM_CONFIG.apiBase` la sobreescriba (hoy solo se sobreescribe en `js/config.local.js`, usado nada más para desarrollo local con puertos distintos).

**Implicación**: en producción, si frontend y API no están en el mismo origen, hay que generar un `config` de producción con la URL real de la API — hoy no existe ese archivo ni el mecanismo para generarlo en un build/deploy.

## Secretos — sin mecanismo definido para producción

`Program.cs` exige (falla al arrancar si faltan, lo cual está bien) tres secretos: `ConnectionStrings:DefaultConnection`, `Jwt:SigningKey`, `Storage:FichasFotosPath`, más `IdentitySeed:SuperadminPassword` para la cuenta semilla. Hoy solo están resueltos para desarrollo local (user-secrets). El propio `src/TortuTAM.Api/README.md` ya dice: *"en cualquier ambiente que no sea Development, las tres claves deben llegar por variables de entorno o el mecanismo de secretos del hosting (todavía sin definir)"*.

**Qué falta**: elegir el hosting primero (define el mecanismo: variables de entorno del contenedor/VM, AWS Secrets Manager/SSM Parameter Store, Azure Key Vault, etc.) y documentar el procedimiento de carga inicial.

## Almacenamiento de fotos — no sirve en hosting típico tal como está

`src/TortuTAM.Api/Services/AlmacenamientoFotosLocal.cs`: las fotos de las fichas se guardan en el **filesystem local** del proceso (`Storage:FichasFotosPath`). Esto funciona en una VM con disco persistente y una sola instancia corriendo, pero **se pierde en cualquier hosting con filesystem efímero** (la mayoría de PaaS/contenedores) y **no se comparte entre instancias** si se escala horizontalmente.

**A favor**: ya existe la interfaz `IAlmacenamientoFotos`, así que agregar una implementación para almacenamiento de objetos (S3, Azure Blob, etc.) es un cambio contenido, no un rediseño. Pero hoy no hay ninguna, y es necesaria antes de desplegar en la mayoría de hosting modernos.

## Base de datos

- **Motor/host sin decidir**: ¿SQL Server administrado (RDS, Azure SQL) o una VM propia? No hay decisión ni presupuesto, según `docs/planteamiento.md`.
- **Sin resiliencia de conexión**: `Program.cs:22-26`, `options.UseSqlServer(connectionString)` sin `EnableRetryOnFailure()`. Un corte momentáneo de red hacia la base se convierte en un error 500 inmediato en vez de que EF Core reintente solo (ya se había señalado esto en una revisión anterior de la app offline).
- **Migraciones automáticas en cada arranque, sin bloqueo verificado para DbUp**: tanto las migraciones de Identity (EF Core, con `sp_getapplock`, sí tiene bloqueo distribuido) como las de dominio (DbUp, `DatabaseMigrator.ApplyPendingMigrations`) corren solas al iniciar la API. Si en producción llegan a correr **varias instancias a la vez** contra una base nueva, no está verificado que DbUp maneje esa concurrencia de forma segura — hoy el diseño asume una sola instancia arrancando a la vez.
- **Sin backups definidos**: no hay ninguna estrategia de respaldo de la base de datos documentada.

## Caché del Service Worker — bloqueante para actualizaciones

Ya reportado antes en esta misma conversación: `src/TortuTAM.Web/sw.js` usa estrategia cache-first con una versión fija (`CACHE_VERSION = 'v1'`) que hay que subir a mano en cada cambio. En producción, esto significa que un despliegue nuevo puede no llegar a los usuarios ya instalados sin intervención manual de su parte. Sigue sin resolverse.

## CI/CD — no existe ningún pipeline

No hay ningún workflow de GitHub Actions (`.github/workflows/` no existe) ni ningún otro mecanismo de build/test/deploy automatizado. Hoy, cualquier despliegue sería 100% manual.

## Empaquetado / contenerización

No hay `Dockerfile` en ningún lado del repo. No está decidido cómo se empaqueta el backend para desplegarlo (contenedor, publish a una VM, App Service, etc.), ni cómo se sirve el frontend en producción — hoy el único mecanismo documentado (`iniciar-local.bat`) usa `python -m http.server`, que es un servidor de desarrollo, no apto para producción (sin HTTPS, sin cacheo HTTP real, de un solo hilo).

## Pruebas automatizadas

No existe ningún proyecto de pruebas en el repo (`find *test*.csproj` no encontró nada). No hay cobertura automatizada de nada antes de desplegar — todo lo que se ha verificado en este proyecto hasta ahora fue manual.

## Logging y monitoreo

Solo está configurado el logging por consola por defecto de ASP.NET Core (niveles `Default`/`Microsoft.AspNetCore` en `appsettings.json`). No hay ningún sumidero externo (Application Insights, CloudWatch, etc.), ni un health check real más allá de un `app.MapGet("/", ...)` agregado de forma ad hoc (`Program.cs:126`) que ya se había señalado como un cambio hecho directo sobre `main` sin pasar por su propio issue/PR (issue #48, hallazgo #5) — sigue ahí, sin resolver esa deuda de proceso.

## Variables de entorno por ambiente

No existe `appsettings.Production.json` ni ningún documento que liste qué variables de entorno necesita la API en producción (si existe para desarrollo, en `src/TortuTAM.Api/README.md`).

## Resumen — qué hace falta antes de poner esto en un servidor real

1. Decidir el hosting (y con eso, el mecanismo de secretos y de almacenamiento de fotos).
2. Registrar dominio + DNS + certificado TLS.
3. Resolver CORS para producción (o garantizar mismo origen).
4. Implementar almacenamiento de fotos que no dependa del filesystem local.
5. Agregar `EnableRetryOnFailure()` a la conexión de SQL Server.
6. Definir estrategia de backups de la base de datos.
7. Resolver la versión automática del caché del Service Worker.
8. Armar al menos un pipeline de CI (build + lo que haya de pruebas) antes de automatizar el deploy.
9. Decidir empaquetado (Docker u otro) y cómo se sirve el frontend estático en producción.
10. Agregar pruebas automatizadas, aunque sea un primer set básico.
11. Definir logging/monitoreo real y resolver el endpoint de health-check pendiente del issue #48.
12. Documentar variables de entorno de producción.

Ningún punto de esta lista está resuelto hoy. El sistema funciona bien para desarrollo/pruebas locales, pero no está listo para un despliegue real.
