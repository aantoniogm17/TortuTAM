# Esquema — estado vigente

`esquema_base_datos.sql` es el esquema heredado del proceso anterior de captura en papel, tal como fue transcrito. Sigue en sintaxis MySQL/MariaDB.

Pendiente, a resolver por issue (ver [docs/planteamiento.md](../../docs/planteamiento.md)):

- Portarlo a T-SQL para SQL Server.
- Aplicar las modificaciones ya solicitadas por el cliente que aún no están consolidadas.
- Revisar la relación `fichas_limpieza` ↔ `fichas`.

Una vez que el esquema quede definido en SQL Server, este archivo se reemplaza por el conjunto de objetos vigentes (tablas, vistas, stored procedures) y el historial de cómo se llegó ahí queda en [`../migrations/`](../migrations/).
