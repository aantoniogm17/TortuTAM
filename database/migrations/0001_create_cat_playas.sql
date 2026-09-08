-- Migración: 0001
-- Fecha: 2026-09-07
-- Cambio: crea la tabla catálogo cat_playas, portada de MySQL a T-SQL. Sin
-- datos semilla: el catálogo real de playas queda pendiente de definir
-- (ver docs/planteamiento.md).

CREATE TABLE cat_playas (
    id     INT IDENTITY(1,1) PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nombre NVARCHAR(120)
);
