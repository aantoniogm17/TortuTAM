# Despliegue en Hostinger VPS

Guía paso a paso para desplegar TortuTAM en un VPS de Hostinger (plan **KVM 2**: 2 vCPU, 8 GB RAM, 100 GB NVMe, plantilla **Ubuntu 22.04 LTS**). Complementa `docs/auditoria-produccion.md` (qué faltaba) — este documento es el "cómo", en orden.

Las plantillas de configuración referenciadas abajo viven en [`deploy/`](../deploy/).

## Fase 0 — Contratar y registrar

1. Contratar el VPS Hostinger KVM 2, plantilla Ubuntu 22.04 LTS.
2. Registrar/apuntar el dominio del proyecto (en Hostinger o en otro registrador — son servicios independientes, solo se conectan por DNS). Crear un registro **A** hacia la IP del VPS.
3. Configurar acceso SSH por llave pública (deshabilitar login root por contraseña).

## Fase 1 — Preparar el servidor

4. Actualizar el sistema y configurar el firewall (`ufw`): permitir solo 22 (SSH), 80 y 443 (HTTP/HTTPS). El puerto de SQL Server (1433) **nunca se expone** a internet — solo escucha en `localhost`.
5. Instalar el runtime de ASP.NET Core 10 (`dotnet-runtime-10.0` o el paquete equivalente del momento; no hace falta el SDK completo en el servidor, el build se hace en CI).
6. Instalar SQL Server para Linux (paquete oficial `mssql-server` de Microsoft) + `mssql-tools`.
7. Instalar nginx.
8. Instalar certbot (Let's Encrypt).
9. Crear el usuario de sistema sin privilegios `tortutam` (dueño de `/opt/tortutam` y de la ruta de fotos).

## Fase 2 — Base de datos

10. Configurar SQL Server (contraseña de `sa`) y crear la base de datos vacía de producción (`TortuTAM`).
11. Programar backups con `cron`: un job que corra `BACKUP DATABASE` y copie el archivo resultante fuera del VPS (a un bucket, a otro servidor, etc. — Hostinger no gestiona esto por su cuenta en un VPS).

## Fase 3 — Variables de entorno y servicio

12. Crear `/etc/tortutam/api.env` en el servidor a partir de [`deploy/api.env.example`](../deploy/api.env.example), con los valores reales (connection string, `Jwt:SigningKey` propio de producción, contraseña del Superadmin, ruta de fotos). Permisos restringidos: `chmod 600`, dueño `tortutam:tortutam`. **Nunca se versiona.**
13. Instalar la unidad de systemd [`deploy/tortutam-api.service`](../deploy/tortutam-api.service):
    ```bash
    sudo cp deploy/tortutam-api.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable --now tortutam-api
    ```

## Fase 4 — nginx y TLS

14. Instalar la plantilla [`deploy/nginx-tortutam.conf`](../deploy/nginx-tortutam.conf), reemplazando `TU_DOMINIO.TLD` por el dominio real.
15. Correr certbot sobre ese dominio para activar HTTPS (certbot agrega sus propias líneas al archivo de nginx).
16. Primer despliegue manual: publicar backend (`dotnet publish`) y copiar `src/TortuTAM.Web/` al servidor, en las rutas que apunten `deploy/tortutam-api.service` y `deploy/nginx-tortutam.conf`.
17. Probar el flujo completo (login, captura de ficha, sincronización offline) contra el dominio real antes de dar por buena la fase.

## Fase 5 — Automatizar con GitHub Actions

18. `.github/workflows/ci.yml` ya corre automáticamente en cada PR/push a `main` (build del backend, sin secretos).
19. `.github/workflows/deploy.yml` hace build + publish + copia por SSH + reinicio del servicio, y de paso estampa `CACHE_VERSION` en `sw.js` a partir del commit (ver issue #67) — pero está en disparo **manual** (`workflow_dispatch`) a propósito. Una vez que el VPS exista:
    - Agregar en GitHub → Settings → Secrets los 5 secretos que pide el workflow (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_API_PATH`, `VPS_WEB_PATH`).
    - Correrlo manualmente la primera vez para confirmar que funciona.
    - Recién entonces, si se quiere despliegue continuo, cambiar su disparo a `on: push: branches: [main]`.

## Pendientes que siguen sin tocarse en esta guía

- Monitoreo/alertas básicas (uptime, espacio en disco) — queda para después del primer despliegue real.
- Separar la base de datos a su propio servidor (si el proyecto crece) — no es necesario al tamaño actual.
