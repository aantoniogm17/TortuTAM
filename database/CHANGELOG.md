# Changelog de base de datos

Índice de una línea por migración aplicada, en orden. El detalle de cada cambio vive en su archivo dentro de [`migrations/`](migrations/).

| Migración | Fecha | Descripción |
|---|---|---|
| 0001 | 2026-09-07 | Crea `cat_playas`. |
| 0002 | 2026-09-07 | Crea `cat_especies`. |
| 0003 | 2026-09-07 | Crea `cat_acciones` con su semilla (11 acciones de la ficha física). |
| 0004 | 2026-09-07 | Crea `cat_uso_nido` con su semilla (9 usos de la ficha física). |
| 0005 | 2026-09-07 | Crea `cat_categorias_conteo` con su semilla (12 categorías de conteo). |
| 0006 | 2026-09-07 | Crea `fichas` (ficha de anidación). |
| 0007 | 2026-09-07 | Trigger de `actualizado_en` en `fichas`. |
| 0008 | 2026-09-07 | Crea `marcas` (marcado por aleta). |
| 0009 | 2026-09-07 | Crea `fichas_limpieza`. |
| 0010 | 2026-09-07 | Trigger de `actualizado_en` en `fichas_limpieza`. |
| 0011 | 2026-09-07 | Crea `limpieza_conteos`. |
| 0012 | 2026-09-07 | Crea vista `vw_exito_eclosion`. |
| 0013 | 2026-09-07 | Crea vista `vw_estatus_nidos`. |
| 0014 | 2026-09-07 | Crea índices de apoyo (fecha, playa, PIT, corral/nido). |
| 0015 | 2026-09-07 | Agrega columna `temperatura_c` a `fichas`. |
| 0016 | 2026-09-08 | Agrega columna `idempotency_key` a `fichas` (índice único filtrado) para sincronización offline sin duplicados. |
| 0017 | 2026-09-08 | Crea `ficha_fotos` (fotos adjuntas a la ficha de anidación). |
| 0018 | 2026-09-17 | Agrega a `cat_uso_nido` los códigos 10 y 13, faltantes según el protocolo oficial (ver `docs/protocolo-captura-lora.md`). |
| 0019 | 2026-09-17 | Siembra `cat_playas` con las 5 playas del protocolo oficial. |
| 0020 | 2026-09-17 | Siembra `cat_especies` con las 5 especies del protocolo oficial (código de lora: `lk`). |
| 0021 | 2026-09-17 | Agrega a `fichas` los campos `protegido` y `compl_div_jun` del protocolo oficial. |
| 0022 | 2026-09-17 | Agrega a `fichas_limpieza` el campo `pasa` del protocolo oficial. |
