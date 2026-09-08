# Migraciones de base de datos

Cada cambio a la base de datos (crear tabla, alterar, eliminar, crear o modificar un stored procedure) es un archivo nuevo en esta carpeta. Un archivo de migración ya aplicado no se edita; si algo cambia, se agrega un archivo nuevo. Esa secuencia es el historial de auditoría de la base de datos.

## Plantilla de nombre

```
NNNN_verbo_objeto.sql
```

- `NNNN`: número secuencial de 4 dígitos, compartido entre tablas, vistas, stored procedures, alters y drops — el número refleja el orden real en que se aplicó cada cambio.
- `verbo`: `create`, `alter`, `drop`, `seed`.
- `objeto`: nombre de la tabla/vista/procedimiento afectado, en snake_case.

Ejemplos:

```
0001_create_cat_playas.sql
0002_create_cat_especies.sql
0034_alter_fichas_add_foto_url.sql
0035_create_sp_reporte_eclosion.sql
0036_drop_column_fichas_campo_x.sql
```

## Encabezado de cada archivo

```sql
-- Migración: 0034
-- Fecha: 2026-09-10
-- Cambio: agrega columna foto_url a fichas para adjuntar imagen de la ficha
```

## Registro

Cada migración aplicada se agrega también como una línea en [`../CHANGELOG.md`](../CHANGELOG.md).

## Cómo se aplican

Los scripts no se ejecutan a mano. El backend usa **DbUp** para aplicar automáticamente, al iniciar la API, cualquier migración de esta carpeta que todavía no se haya corrido en esa base de datos; DbUp lleva su propio registro de qué scripts ya se aplicaron, así que nunca hay que recordar en qué punto se quedó cada ambiente ni correr algo dos veces.

## Estado actual

Todavía no hay migraciones en esta carpeta. El esquema base heredado vive en [`../schema/esquema_base_datos.sql`](../schema/esquema_base_datos.sql) (sintaxis MySQL/MariaDB, pendiente de portar a T-SQL). Las modificaciones a partir de aquí se trabajan por issue y se registran como migraciones numeradas.
