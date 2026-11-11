#!/bin/bash
# Respaldo diario de la base TortuTAM; conserva 7 dias.
#
# Instalacion en el servidor:
#   sudo cp deploy/tortutam-backup.sh /usr/local/bin/tortutam-backup.sh
#   sudo chmod 750 /usr/local/bin/tortutam-backup.sh
#   sudo cp deploy/tortutam-backup.cron /etc/cron.d/tortutam-backup
#   sudo mkdir -p /var/opt/mssql/backups
#   sudo chown mssql:mssql /var/opt/mssql/backups && sudo chmod 750 /var/opt/mssql/backups
#
# Lee SA_PASSWORD de /etc/tortutam/backup.env (chmod 600, dueño root, NUNCA se
# versiona), con una sola linea: SA_PASSWORD=<contraseña de sa>.
#
# Sin COMPRESSION: SQL Server Express no la admite. Los respaldos quedan en el
# mismo VPS; la copia externa esta pendiente (ver issue de respaldos externos).
set -euo pipefail
. /etc/tortutam/backup.env
ARCH="/var/opt/mssql/backups/TortuTAM_$(date +%Y%m%d_%H%M).bak"
/opt/mssql-tools18/bin/sqlcmd -S 127.0.0.1 -U sa -P "$SA_PASSWORD" -C -b \
  -Q "BACKUP DATABASE [TortuTAM] TO DISK = N'$ARCH' WITH CHECKSUM, INIT"
find /var/opt/mssql/backups -name 'TortuTAM_*.bak' -mtime +7 -delete
