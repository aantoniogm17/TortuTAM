-- Migración: 0025
-- Fecha: 2026-10-27
-- Cambio: agrega a cat_especies la tortuga golfina (código lo,
-- Lepidochelys olivacea) y el valor "No identificada" (código ni, sin
-- nombre científico) que requiere la ficha de varamientos cuando el
-- ejemplar no puede identificarse. El catálogo queda con 7 especies.

INSERT INTO cat_especies (codigo, nombre_comun, nombre_cientifico) VALUES
    (N'lo', N'Golfina',         N'Lepidochelys olivacea'),
    (N'ni', N'No identificada', NULL);
