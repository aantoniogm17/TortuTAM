-- Migración: 0018
-- Fecha: 2026-09-17
-- Cambio: agrega a cat_uso_nido los códigos 10 (Muerta, para varamientos)
-- y 13 (Sólo nido sin tortuga - picado), que faltaban respecto al
-- protocolo oficial de captura (ver docs/protocolo-captura-lora.md).
-- La tabla se creó en la migración 0004 con un subconjunto incompleto.

INSERT INTO cat_uso_nido (codigo, descripcion) VALUES
    (10, N'Muerta (para varamientos)'),
    (13, N'Sólo nido (sin tortuga - picado)');
