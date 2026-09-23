-- Migración: 0024
-- Fecha: 2026-09-23
-- Cambio: ajusta cat_playas al alcance confirmado con el equipo de campo
-- (reunión 2026-09-07, ver docs/planteamiento.md) en lugar de la lista de
-- docs/protocolo-captura-lora.md, documento que el propio protocolo marca
-- como lista abierta ("...DEFINIR") y que no coincide con el catálogo real
-- usado en la base de datos de campo de la temporada 2025 (issue #55).
--
-- La migración 0019 sembró: rn, tepe, bt, alt, mir.
-- El alcance confirmado es: alt, tp, mir, lp, bag, mez.
--   - alt y mir ya existen con el código correcto, se dejan igual.
--   - tepe cambia de código a tp (mismo nombre, Tepehuajes).
--   - rn (Rancho Nuevo) y bt (Barra del Tordo) se eliminan, no forman
--     parte del alcance confirmado.
--   - se agregan lp (La Pesca), bag (Playa Bagdad) y mez (Mezquital).

DELETE FROM cat_playas WHERE codigo IN (N'rn', N'bt');

UPDATE cat_playas SET codigo = N'tp' WHERE codigo = N'tepe';

INSERT INTO cat_playas (codigo, nombre) VALUES
    (N'lp',  N'La Pesca'),
    (N'bag', N'Playa Bagdad'),
    (N'mez', N'Mezquital');
