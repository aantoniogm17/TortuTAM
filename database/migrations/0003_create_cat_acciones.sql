-- Migración: 0003
-- Fecha: 2026-09-07
-- Cambio: crea la tabla catálogo cat_acciones con su semilla, tal como
-- aparece impresa en la ficha física. Portada de MySQL a T-SQL.

CREATE TABLE cat_acciones (
    codigo      TINYINT PRIMARY KEY,
    descripcion NVARCHAR(60) NOT NULL
);

INSERT INTO cat_acciones (codigo, descripcion) VALUES
    (0,  N'Apareando'),
    (1,  N'Sube'),
    (2,  N'Hace nido'),
    (3,  N'Pone'),
    (4,  N'Tapa'),
    (5,  N'Baja'),
    (6,  N'No puso (arqueo)'),
    (7,  N'Nadando (de regreso)'),
    (8,  N'Sólo nido (sin tortuga)'),
    (9,  N'Varada viva'),
    (10, N'Varada muerta');
