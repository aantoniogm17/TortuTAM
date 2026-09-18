-- Migración: 0020
-- Fecha: 2026-09-17
-- Cambio: siembra cat_especies con los códigos oficiales del protocolo
-- (ver docs/protocolo-captura-lora.md). Se usa "lk" para lora, no "LO"
-- como en el esquema heredado, para alinear con el protocolo oficial.

INSERT INTO cat_especies (codigo, nombre_comun, nombre_cientifico) VALUES
    (N'lk', N'Lora',    N'Lepidochelys olivacea'),
    (N'cm', N'Verde',   N'Chelonia mydas'),
    (N'cc', N'Caguama', N'Caretta caretta'),
    (N'dc', N'Laúd',    N'Dermochelys coriacea'),
    (N'ei', N'Carey',   N'Eretmochelys imbricata');
