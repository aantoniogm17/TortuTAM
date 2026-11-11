# Despliegue en Hostinger VPS

Guía paso a paso para desplegar TortuTAM en un VPS de Hostinger (plan **KVM 2**: 2 vCPU, 8 GB RAM, 100 GB NVMe, plantilla **Ubuntu 22.04 LTS**). Complementa `docs/auditoria-produccion.md` (qué faltaba) — este documento es el "cómo", en orden.

Las plantillas de configuración referenciadas abajo viven en [`deploy/`](../deploy/).

## Fase 0 — Contratar y registrar

1. Contratar el VPS Hostinger KVM 2, plantilla Ubuntu 22.04 LTS.
2. Apuntar el dominio del proyecto: `datalora.prospectiva360.cloud` (exclusivo de TortuTAM; `prospectiva360.cloud` se usa para otra cosa). En la zona DNS de Hostinger, crear un registro **A** `datalora` hacia la IP del VPS (TTL 300).
3. Generar una llave SSH propia (`ssh-keygen -t ed25519`) y agregar la pública al VPS (hPanel → VPS → Clave SSH, o por la API de Hostinger). El endurecimiento (solo llave, sin contraseña de root) va en la Fase 1.

## Fase 1 — Preparar el servidor

4. Actualizar el sistema y configurar el firewall (`ufw`): permitir solo 22 (SSH), 80 y 443 (HTTP/HTTPS). El puerto de SQL Server (1433) **nunca se expone** a internet — solo escucha en `localhost`.
5. Instalar el runtime de ASP.NET Core 10. El feed de Microsoft para Ubuntu 22.04 no lo trae como paquete, así que se usa el script oficial (no hace falta el SDK en el servidor, el build se hace en CI):
    ```bash
    curl -sSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
    sudo bash /tmp/dotnet-install.sh --channel 10.0 --runtime aspnetcore --install-dir /usr/share/dotnet
    sudo ln -sf /usr/share/dotnet/dotnet /usr/bin/dotnet
    ```
6. Instalar SQL Server 2022 para Linux (`mssql-server` + `mssql-tools18`) en edición **Express** (gratuita, con licencia válida para producción; límite de 10 GB por base de datos y sin `COMPRESSION` en los respaldos). Si la base llegara al límite, habría que pasar a Standard. Dejarlo escuchando solo en localhost: `sudo /opt/mssql/bin/mssql-conf set network.ipaddress 127.0.0.1`.
7. Instalar nginx.
8. Instalar certbot (`certbot` y `python3-certbot-nginx`).
9. Crear el usuario de sistema sin privilegios `tortutam` (dueño de `/opt/tortutam` y de la ruta de fotos).
10. Endurecer SSH con un drop-in que gane sobre `50-cloud-init.conf` (que trae `PasswordAuthentication yes`; sshd respeta el primer valor leído, por eso el archivo empieza con `00-`). En `/etc/ssh/sshd_config.d/00-tortutam.conf`:
    ```
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    PermitRootLogin prohibit-password
    ```
    Validar con `sudo sshd -T | grep -E "passwordauthentication|permitrootlogin"` y recargar con `sudo systemctl reload ssh` sin cerrar la sesión abierta.
11. Crear el usuario de despliegue `deploy` (miembro del grupo `tortutam`, sin privilegios): directorios `/opt/tortutam/api` y `/opt/tortutam/web` con `chmod 2775` (setgid) y `g+w`, su llave autorizada en `~deploy/.ssh/authorized_keys`, y un sudoers que solo permite `systemctl restart tortutam-api` (`/etc/sudoers.d/tortutam-deploy`).

## Fase 2 — Base de datos

12. Configurar SQL Server (contraseña de `sa`, en `MSSQL_SA_PASSWORD` al correr `mssql-conf setup`) y crear la base de datos vacía de producción (`TortuTAM`). Al probar con `sqlcmd` usar `-S 127.0.0.1` (no `localhost`) y `-C` por el certificado autofirmado.
13. Programar el respaldo diario: copiar [`deploy/tortutam-backup.sh`](../deploy/tortutam-backup.sh) y [`deploy/tortutam-backup.cron`](../deploy/tortutam-backup.cron) (instrucciones en el encabezado del script). Guardan 7 días en `/var/opt/mssql/backups`, **en el mismo VPS**; la copia fuera del VPS (bucket, otro servidor) sigue pendiente. Hostinger hace un respaldo semanal del VPS, pero no sustituye esto.

## Fase 3 — Variables de entorno y servicio

14. Crear `/etc/tortutam/api.env` en el servidor a partir de [`deploy/api.env.example`](../deploy/api.env.example), con los valores reales (`ASPNETCORE_URLS`, connection string con `Server=127.0.0.1`, `Jwt:SigningKey` propio de producción, contraseña del Superadmin, ruta de fotos). Generar los secretos con `openssl rand` y guardarlos fuera del repositorio. Permisos restringidos: `chmod 600`, dueño `tortutam:tortutam`. **Nunca se versiona.**
15. Instalar la unidad de systemd [`deploy/tortutam-api.service`](../deploy/tortutam-api.service):
    ```bash
    sudo cp deploy/tortutam-api.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable --now tortutam-api
    ```

## Fase 4 — nginx y TLS

16. Instalar la plantilla [`deploy/nginx-tortutam.conf`](../deploy/nginx-tortutam.conf) (ya trae `datalora.prospectiva360.cloud`), quitar el `default` de nginx e instalar [`deploy/nginx-hosts-desconocidos.conf`](../deploy/nginx-hosts-desconocidos.conf) para que otros dominios que apunten al VPS (p. ej. `prospectiva360.cloud`) no sirvan TortuTAM. Las instrucciones están en el encabezado de la plantilla.
17. Correr `certbot --nginx -d datalora.prospectiva360.cloud --redirect` para activar HTTPS (certbot agrega sus propias líneas al archivo de nginx y programa la renovación). Hacerlo antes de instalar `nginx-hosts-desconocidos.conf`, que referencia ese certificado.
18. Primer despliegue manual: publicar backend (`dotnet publish`) y copiar `src/TortuTAM.Web/` al servidor, en las rutas que apunten `deploy/tortutam-api.service` y `deploy/nginx-tortutam.conf`. **Dejar `js/config.local.js` vacío** en el servidor: en el repositorio apunta la API a `localhost` (solo desarrollo) y en producción se usa `/api` por mismo origen.
19. Probar el flujo completo (login, captura de ficha, sincronización offline) contra el dominio real antes de dar por buena la fase.

## Fase 5 — Automatizar con GitHub Actions

20. `.github/workflows/ci.yml` ya corre automáticamente en cada PR/push a `main` (build del backend, sin secretos).
21. `.github/workflows/deploy.yml` hace build + publish + copia por SSH + reinicio del servicio, y de paso estampa `CACHE_VERSION` en `sw.js` a partir del commit (ver issue #67) — pero está en disparo **manual** (`workflow_dispatch`) a propósito. Una vez que el VPS exista:
    - Generar una llave SSH exclusiva para el despliegue (distinta de la personal), autorizarla solo para el usuario `deploy` (paso 11) y cargar en GitHub los 5 secretos que pide el workflow (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_API_PATH`, `VPS_WEB_PATH`, p. ej. con `gh secret set`). Ya están cargados en este repositorio.
    - Correrlo manualmente la primera vez para confirmar que funciona.
    - Recién entonces, si se quiere despliegue continuo, cambiar su disparo a `on: push: branches: [main]`.

## Pendientes que siguen sin tocarse en esta guía

- Monitoreo/alertas básicas (uptime, espacio en disco) — queda para después del primer despliegue real.
- Separar la base de datos a su propio servidor (si el proyecto crece) — no es necesario al tamaño actual.
