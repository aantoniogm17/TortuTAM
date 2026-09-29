-- Migración: 0023
-- Fecha: 2026-09-23
-- Cambio: corrige el nombre científico de la tortuga lora (código lk) en
-- cat_especies. La migración 0020 sembró "Lepidochelys olivacea", que es
-- la tortuga golfina, copiando el mismo error de
-- docs/protocolo-captura-lora.md. La tortuga lora es Lepidochelys kempii
-- (Kemp's ridley), la especie que da nombre al programa binacional que
-- este proyecto digitaliza (issue #55).

UPDATE cat_especies
SET nombre_cientifico = N'Lepidochelys kempii'
WHERE codigo = N'lk';
