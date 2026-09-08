-- Migración: 0012
-- Fecha: 2026-09-07
-- Cambio: crea la vista vw_exito_eclosion (% de eclosión por ficha de
-- limpieza), portada de MySQL a T-SQL. Ajustes: CASE WHEN sobre BIT
-- requiere comparación explícita (= 1); se usa 100.0 en vez de 100 para
-- forzar división decimal (T-SQL trunca en división entera).

CREATE VIEW vw_exito_eclosion AS
SELECT
    fl.id AS ficha_limpieza_id,
    fl.numero_ficha,
    fl.corral,
    fl.nido,
    fl.fecha_limpieza,
    SUM(CASE WHEN cc.cuenta_cria_viva = 1 THEN lc.total ELSE 0 END) AS crias_vivas_totales,
    SUM(CASE WHEN cc.excluir_de_huevos_totales = 1 THEN 0 ELSE COALESCE(lc.total, 0) END) AS huevos_totales,
    ROUND(
        100.0 * SUM(CASE WHEN cc.cuenta_cria_viva = 1 THEN lc.total ELSE 0 END) /
        NULLIF(SUM(CASE WHEN cc.excluir_de_huevos_totales = 1 THEN 0 ELSE COALESCE(lc.total, 0) END), 0)
    , 1) AS porcentaje_eclosion
FROM fichas_limpieza fl
LEFT JOIN limpieza_conteos lc ON lc.ficha_limpieza_id = fl.id
LEFT JOIN cat_categorias_conteo cc ON cc.codigo = lc.categoria_codigo
GROUP BY fl.id, fl.numero_ficha, fl.corral, fl.nido, fl.fecha_limpieza;
