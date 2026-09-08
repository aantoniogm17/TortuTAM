# Esquema de base de datos — estado actual

Referencia legible del esquema heredado en [`database/schema/esquema_base_datos.sql`](../database/schema/esquema_base_datos.sql). Este archivo describe el estado vigente; los cambios futuros se aplican como migraciones numeradas en `database/migrations/` (ver [convención](../database/migrations/README.md)).

## Catálogos

| Tabla | Contenido |
|---|---|
| `cat_playas` | Playas donde se hace la toma de datos |
| `cat_especies` | Especies de tortuga |
| `cat_acciones` | Qué hacía la tortuga al momento del registro (sube, hace nido, pone, varada, etc.) |
| `cat_uso_nido` | Qué pasó con el nido (corral, caja, depredado, in situ, etc.) |
| `cat_categorias_conteo` | Categorías del conteo de eclosión (crías vivas, muertas, cascarones, huevos sin eclosionar, etc.) |

## Tablas principales

- **`fichas`** — una fila por ficha de anidación: ubicación (playa, corral, zona, coordenadas GPS), fecha, especie, sexo, acción, horas, uso del nido, conteo de huevos, biometría de la tortuga y observaciones. Se relaciona con los catálogos vía `playa_id`, `especie_codigo`, `accion_codigo` y `uso_nido_codigo`.
- **`marcas`** — marcado por aleta (izquierda/derecha) de cada tortuga; cada fila cuelga de una `ficha` vía `ficha_id` (máximo una fila por aleta por ficha).
- **`fichas_limpieza`** — una fila por ficha de limpieza/exhumación de nido: fechas, condición del nido, y opcionalmente ligada a la ficha de anidación original vía `ficha_anidacion_id`.
- **`limpieza_conteos`** — detalle del conteo por categoría dentro de cada ficha de limpieza, ligado por `ficha_limpieza_id` y `categoria_codigo`.

## Vistas de apoyo

- **`vw_exito_eclosion`** — calcula el % de eclosión sumando `limpieza_conteos` por ficha de limpieza.
- **`vw_estatus_nidos`** — arma el estatus para el mapa, uniendo `fichas` con `fichas_limpieza` por corral + número de nido.

## Pendiente de revisión

`fichas_limpieza` tiene dos caminos de relación con `fichas` (la FK `ficha_anidacion_id` y el emparejamiento por corral+nido en `vw_estatus_nidos`), que hoy pueden quedar inconsistentes entre sí. Ver [pendientes del planteamiento](planteamiento.md#pendientes).
