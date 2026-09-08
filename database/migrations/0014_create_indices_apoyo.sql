-- Migración: 0014
-- Fecha: 2026-09-07
-- Cambio: crea los índices de apoyo para las búsquedas frecuentes del
-- panel. Sin cambios de sintaxis respecto al original.

CREATE INDEX idx_fichas_fecha         ON fichas(fecha);
CREATE INDEX idx_fichas_playa         ON fichas(playa_id);
CREATE INDEX idx_marcas_pit           ON marcas(pit);
CREATE INDEX idx_limpieza_fecha       ON fichas_limpieza(fecha_limpieza);
CREATE INDEX idx_limpieza_corral_nido ON fichas_limpieza(corral, nido);
CREATE INDEX idx_fichas_corral_nido   ON fichas(corral, numero_nido);
