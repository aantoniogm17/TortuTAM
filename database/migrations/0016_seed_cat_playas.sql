-- Migración: 0016
-- Fecha: 2026-09-17
-- Cambio: siembra cat_playas con las playas del protocolo oficial (ver
-- docs/protocolo-captura-lora.md). Códigos en minúsculas por la regla
-- general del protocolo ("escribir todo con minúsculas").

INSERT INTO cat_playas (codigo, nombre) VALUES
    (N'rn',   N'Rancho Nuevo'),
    (N'tepe', N'Tepehuajes'),
    (N'bt',   N'Barra del Tordo'),
    (N'alt',  N'Altamira'),
    (N'mir',  N'Miramar');
