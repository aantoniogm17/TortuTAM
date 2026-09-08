-- Migración: 0002
-- Fecha: 2026-09-07
-- Cambio: crea la tabla catálogo cat_especies, portada de MySQL a T-SQL. Sin
-- datos semilla: el alcance de especies a cubrir queda pendiente de definir
-- (ver docs/planteamiento.md).

CREATE TABLE cat_especies (
    codigo            VARCHAR(5) PRIMARY KEY,
    nombre_comun      NVARCHAR(80),
    nombre_cientifico NVARCHAR(120)
);
