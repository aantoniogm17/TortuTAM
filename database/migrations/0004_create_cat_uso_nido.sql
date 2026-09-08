-- Migración: 0004
-- Fecha: 2026-09-07
-- Cambio: crea la tabla catálogo cat_uso_nido con su semilla, tal como
-- aparece impresa en la ficha física. Portada de MySQL a T-SQL.

CREATE TABLE cat_uso_nido (
    codigo      TINYINT PRIMARY KEY,
    descripcion NVARCHAR(60) NOT NULL
);

INSERT INTO cat_uso_nido (codigo, descripcion) VALUES
    (1,  N'Corral'),
    (3,  N'Caja'),
    (5,  N'Saqueado'),
    (6,  N'Depredado'),
    (7,  N'No localizado'),
    (8,  N'No puso'),
    (9,  N'In situ'),
    (11, N'Reubicado'),
    (12, N'Sólo rastro (arqueo)');
