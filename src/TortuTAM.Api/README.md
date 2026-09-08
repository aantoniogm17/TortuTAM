# TortuTAM.Api

Proyecto ASP.NET Core Web API (net10.0, controladores) que expone la autenticación y gestión básica de usuarios/roles de TortuTAM mediante ASP.NET Core Identity.

## Requisitos previos

- .NET SDK 10.0.
- SQL Server accesible (local o remoto).
- Herramienta `dotnet-ef`, ya declarada en el manifiesto de herramientas del repo (`.config/dotnet-tools.json`). Se instala con:

  ```bash
  dotnet tool restore
  ```

## Configuración local (cadena de conexión, JWT y contraseña semilla)

`appsettings.json` (versionado, público en el repo) solo trae claves vacías/placeholder para todo lo que sea un secreto real: `ConnectionStrings:DefaultConnection`, `Jwt:SigningKey` e `IdentitySeed:SuperadminPassword`. Ninguna de las tres lleva un valor por defecto funcional en el código ni en el repo — si falta cualquiera, la API falla al iniciar con un mensaje explícito en vez de arrancar con un valor inseguro conocido públicamente.

`appsettings.Development.json` está en `.gitignore` a propósito, así que cada quien crea el suyo localmente. Ejemplo mínimo para desarrollo:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=TortuTAM;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "SigningKey": "clave-de-desarrollo-local-solo-para-pruebas-cambiar-en-produccion"
  }
}
```

La contraseña del Superadmin semilla es más sensible que la clave de firma de desarrollo (es una credencial de login real, no solo una clave de prueba), así que **no** se recomienda ponerla en `appsettings.Development.json` aunque esté en `.gitignore`; mejor usar [user-secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets), que ASP.NET Core carga automáticamente en `Development` y vive fuera del repo por completo:

```bash
dotnet user-secrets init --project src/TortuTAM.Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=TortuTAM;Trusted_Connection=True;TrustServerCertificate=True;" --project src/TortuTAM.Api
dotnet user-secrets set "Jwt:SigningKey" "clave-de-desarrollo-local-solo-para-pruebas" --project src/TortuTAM.Api
dotnet user-secrets set "IdentitySeed:SuperadminPassword" "EligeUnaClaveSoloParaTuMaquina123!" --project src/TortuTAM.Api
```

En cualquier ambiente que no sea `Development`, las tres claves deben llegar por variables de entorno o el mecanismo de secretos del hosting (todavía sin definir, ver `docs/planteamiento.md`).

## Migraciones de Identity (EF Core)

Este proyecto usa **dos mecanismos de migración independientes, sin mezclarse**:

- Las tablas de dominio (`fichas`, `cat_playas`, etc.) viven en `database/migrations/` y las aplica DbUp (issue #16), no EF Core.
- Las tablas de ASP.NET Core Identity (`identity_usuarios`, `identity_roles`, etc.) se manejan solo con migraciones de EF Core, generadas y versionadas dentro de este proyecto en `src/TortuTAM.Api/Migrations/`.

### Generar una nueva migración de Identity

Después de modificar `ApplicationUser`, `ApplicationDbContext` o la configuración de Identity:

```bash
dotnet tool run dotnet-ef migrations add NombreDescriptivoDelCambio --project src/TortuTAM.Api --startup-project src/TortuTAM.Api
```

Esto agrega archivos nuevos en `src/TortuTAM.Api/Migrations/` (no se editan migraciones ya aplicadas; un cambio adicional es una migración nueva).

### Aplicar migraciones pendientes

En desarrollo, de forma manual:

```bash
dotnet tool run dotnet-ef database update --project src/TortuTAM.Api --startup-project src/TortuTAM.Api
```

Además, `Program.cs` llama a `Database.MigrateAsync()` al iniciar la aplicación, así que cualquier migración de Identity pendiente se aplica automáticamente al arrancar la API (igual que DbUp hará con los scripts T-SQL, pero por una vía separada). No se requiere un paso manual en un ambiente ya desplegado; el paso manual de arriba es solo para desarrollo/depuración.

## Roles y cuenta semilla

Al iniciar, `IdentitySeeder` (`Services/IdentitySeeder.cs`) garantiza que existan los tres roles (`UsuarioNormal`, `Administrador`, `Superadmin`) y, si no hay ninguna cuenta con el correo configurado en `IdentitySeed:SuperadminEmail`, crea una cuenta Superadmin con esas credenciales.

`appsettings.json` solo trae un valor de ejemplo para el correo (`superadmin@tortutam.local`, no es sensible); la contraseña (`IdentitySeed:SuperadminPassword`) llega vacía a propósito. Si toca crear la cuenta semilla (primer arranque contra una base de datos sin usuarios) y esa clave no está configurada por fuera del repo (user-secrets, variable de entorno, o el mecanismo de secretos del hosting), `IdentitySeeder` lanza una excepción clara al iniciar en vez de crear una cuenta con una contraseña que quedaría pública en el historial de git. Ver la sección anterior para configurarla localmente con user-secrets.

Con esa cuenta, un Superadmin puede dar de alta cuentas de Administrador, y un Administrador puede dar de alta cuentas de Usuario normal, vía `POST /api/usuarios` (ver más abajo). Nadie crea cuentas de Superadmin desde la API; eso queda fuera de alcance de este issue y se resuelve manualmente (seed o acceso directo a base de datos) hasta que se defina ese flujo.

## Endpoints incluidos

- `POST /api/auth/login`: recibe `email`/`password`, valida contra Identity (con bloqueo tras intentos fallidos) y devuelve un JWT junto con roles y datos básicos del usuario.
- `GET /api/usuarios`: lista usuarios con sus roles. Requiere rol `Administrador` o `Superadmin`.
- `POST /api/usuarios`: crea un usuario. Requiere rol `Administrador` o `Superadmin`; un `Administrador` solo puede crear usuarios con rol `UsuarioNormal`, un `Superadmin` puede crear `UsuarioNormal` o `Administrador` (nunca `Superadmin` por esta vía).

Restringir qué ficha puede editar cada rol queda fuera de alcance de este issue (se resuelve en los endpoints de fichas, en otro issue).

## Decisión de diseño: sesión offline con JWT

El login requiere conexión, pero el resto de la captura en campo no. Se eligió un **JWT firmado (HMAC-SHA256), sin estado en el servidor**, en vez de cookies de sesión de ASP.NET Core Identity, porque:

- Un JWT se valida por firma y expiración localmente en el cliente/API, sin necesitar consultar al servidor en cada request — compatible con operar sin señal.
- El cliente (PWA) puede guardar el token en el dispositivo (p. ej. IndexedDB/localStorage) y seguir adjuntándolo a las fichas capturadas offline; al recuperar señal, sincroniza usando ese mismo token si sigue vigente.
- La expiración es configurable (`Jwt:ExpirationDays`, 30 días por defecto) pensando en brigadistas que pueden pasar varios días en campo sin conexión entre que hacen login y logran sincronizar.

Trade-off aceptado conscientemente: no hay todavía revocación de tokens ni refresh token — un token robado es válido hasta que expira. Para el alcance de este issue (base de autenticación y roles) se prioriza que la sesión siga siendo utilizable sin conexión; revocación/rotación de tokens queda como mejora futura a evaluar en un issue aparte si se vuelve necesaria.
