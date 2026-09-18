-- Migración: 0021
-- Fecha: 2026-09-17
-- Cambio: agrega a fichas los campos "protegido" y "compl_div_jun" que
-- documenta el protocolo oficial de captura y que no existían en el
-- esquema heredado (ver docs/protocolo-captura-lora.md).
--
-- protegido: 's' si se conoce el resultado de la incubación, 'n' si no.
-- En caso de contingencia ambiental (inundación, sismo, tsunami) puede
-- llevar en cambio la inicial de esa contingencia; por eso se deja como
-- texto libre corto en vez de un CHECK cerrado a 's'/'n'.
--
-- compl_div_jun: tipo de siembra de la nidada. 'c' completa (tal como se
-- colectó), 'd' dividida (huevos de una misma nidada sembrados en dos
-- estacas), 'j' juntada (nidadas de dos tortugas en un mismo nido).

ALTER TABLE fichas ADD
    protegido      VARCHAR(10) NULL,
    compl_div_jun  CHAR(1) NULL CONSTRAINT chk_fichas_compl_div_jun CHECK (compl_div_jun IN ('c','d','j'));
