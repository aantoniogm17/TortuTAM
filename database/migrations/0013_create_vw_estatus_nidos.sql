-- Migración: 0013
-- Fecha: 2026-09-07
-- Cambio: crea la vista vw_estatus_nidos (estatus de cada nido para el
-- mapa), portada de MySQL a T-SQL sin cambios de sintaxis. Se mantiene el
-- join por corral+nido tal como está en el original; la inconsistencia
-- con la FK ficha_anidacion_id queda documentada como pendiente en
-- docs/planteamiento.md, no se resuelve aquí.

CREATE VIEW vw_estatus_nidos AS
SELECT
    f.id AS ficha_id,
    f.numero_ficha,
    f.corral,
    f.numero_nido,
    f.fecha,
    f.latitud,
    f.longitud,
    f.huevos_colectados,
    ve.ficha_limpieza_id,
    ve.crias_vivas_totales,
    ve.huevos_totales,
    ve.porcentaje_eclosion,
    CASE
        WHEN f.latitud IS NULL OR f.longitud IS NULL THEN 'sin_coordenadas'
        WHEN ve.ficha_limpieza_id IS NULL THEN 'sin_limpieza'
        WHEN ve.porcentaje_eclosion IS NULL THEN 'limpiado_sin_conteo'
        WHEN ve.porcentaje_eclosion >= 50 THEN 'limpiado_exito_alto'
        ELSE 'limpiado_exito_bajo'
    END AS estatus
FROM fichas f
LEFT JOIN fichas_limpieza fl ON fl.corral = f.corral AND fl.nido = f.numero_nido
LEFT JOIN vw_exito_eclosion ve ON ve.ficha_limpieza_id = fl.id;
