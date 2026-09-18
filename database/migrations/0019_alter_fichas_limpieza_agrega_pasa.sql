-- Migración: 0019
-- Fecha: 2026-09-17
-- Cambio: agrega a fichas_limpieza el campo "pasa", documentado en el
-- protocolo oficial de captura (ver docs/protocolo-captura-lora.md).
--
-- pasa: si el registro es válido para análisis estadístico. 's' si los
-- conteos coinciden sin diferencias, 'n' si no se contó bien, 'd' si el
-- nido fue dejado in situ y luego depredado. Los registros con 'n' o 'd'
-- igual cuentan para el total de huevos protegidos y crías liberadas
-- cuando aplica; solo se excluyen del análisis estadístico fino.

ALTER TABLE fichas_limpieza ADD
    pasa CHAR(1) NULL CONSTRAINT chk_limpieza_pasa CHECK (pasa IN ('s','n','d'));
