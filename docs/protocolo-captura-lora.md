# Protocolo oficial de captura de datos

Extracto operativo de "BASE DE DATOS Lora_2025.pdf" — instrucciones de llenado del programa de monitoreo de tortuga marina, a cargo de CONANP. Contacto del protocolo: Laura Sarti (lsarti@conanp.gob.mx), coordinado con Héctor Hugo Acosta y Martha López.

Este documento resume las reglas relevantes para el diseño de la base de datos y la validación de captura. El PDF original documenta el llenado de una hoja de cálculo; aquí se traduce a reglas de negocio aplicables a TortuTAM.

## Reglas generales (aplican a toda captura)

- Cada temporada/playa es una unidad de captura independiente.
- No se pueden "juntar nidadas": cada nidada se registra por separado.
- Si se olvida capturar una ficha, no se inserta fuera de orden — se anota al final, en su propio registro.
- Los campos de hora nunca quedan vacíos: si no hay dato, se marca explícitamente como ausente (en el original, con un carácter reservado); usar horario de 24 horas.
- Existen columnas de verificación ("dif") que comparan un total capturado contra un total calculado; un registro con diferencia distinta de 0 no debe pasar a análisis estadístico sin revisión.
- Un registro tiene una marca de "pasa" / "no pasa" (o "depredado" como caso intermedio) que indica si es válido para análisis estadístico. Los que no pasan igual cuentan para el total de huevos protegidos y crías liberadas cuando aplica.
- Margen de error aceptado (regla 2018): en una nidada grande (>80 huevos) se acepta un error de -15 a +15 y aun así "pasa". Si el nido fue depredado, el límite de cascarones contados para que "pase" es 20.

## Catálogos oficiales

### Playas (códigos observados en el protocolo, lista marcada como abierta — "…DEFINIR")

| Código | Playa |
|---|---|
| rn | Rancho Nuevo |
| tepe | Tepehuajes |
| bt | Barra del Tordo |
| Alt | Altamira |
| Mir | Miramar |

El propio protocolo indica que esta lista se debe completar por proyecto ("DEFINIR"). **No coincide necesariamente con el catálogo `cat_playas` actual del repositorio** (que hoy no tiene datos semilla).

### Especies

| Código oficial | Especie |
|---|---|
| lk | Lora (*Lepidochelys kempii*) |
| cm | Verde (*Chelonia mydas*) |
| cc | Caguama (*Caretta caretta*) |
| dc | Laúd (*Dermochelys coriacea*) |
| ei | Carey (*Eretmochelys imbricata*) |

**Discrepancia con el repositorio**: el esquema heredado (`database/schema/esquema_base_datos.sql`) y el boceto usaban `LO` para lora; el protocolo oficial usa `lk`. Ver "Discrepancias" abajo.

### Acción (qué hace la tortuga al momento de observarla)

| Código | Descripción |
|---|---|
| 0 | Apareando |
| 1 | Sube |
| 2 | Hace nido |
| 3 | Pone |
| 4 | Tapa |
| 5 | Baja |
| 6 | No puso (arqueo) |
| 7 | Nadando (de regreso) |
| 8 | Sólo nido (sin tortuga) |

Coincide con `cat_acciones` (0-8). El protocolo trata la mortalidad/varamiento como una hoja aparte, no como un código de "acción" (ver "Mortalidad" abajo) — a diferencia del esquema actual, que agrega 9 "Varada viva" y 10 "Varada muerta" como códigos de acción adicionales.

### Uso de nido / destino final

| Código | Descripción |
|---|---|
| 1 | Corral |
| 2 | Corral (variante — sin definir en el protocolo qué la distingue de 1) |
| 3 | Caja |
| 4 | Caja (variante — sin definir en el protocolo qué la distingue de 3) |
| 5 | Saqueado |
| 6 | Depredado |
| 7 | No localizado |
| 8 | No puso |
| 9 | In situ |
| 10 | Muerta (para varamientos) |
| 11 | Reubicado |
| 12 | Sólo rastro (arqueo) |
| 13 | Sólo nido (sin tortuga - picado) |

**`cat_uso_nido` en el repositorio no tenía los códigos 10 y 13** — se corrige en esta misma rama (ver migración 0015).

Regla especial: si un nido se registró inicialmente como corral o in situ pero después es depredado o saqueado, el uso de nido se deja igual (corral/in situ) y se marca por separado en una columna de "depredado" — no se reclasifica el uso de nido original.

### Sexo (solo aplica a tortugas muertas/varadas)

`m` o `1` = macho, `h` o `2` = hembra. No aplica a hembras anidando (ya se asume hembra).

### Posición del nido respecto a vegetación

Igual al esquema actual: 1 (<1cm), 2 (1-4cm), 3 (4-10cm), 4 (>10cm).

### Tamaño de tumor

Mismo código que posición: 1 (<1cm), 2 (1-4cm), 3 (4-10cm), 4 (>10cm). El protocolo permite registrar hasta dos sitios del cuerpo con tumor (cabeza, cuello, hombros, aletas anteriores/posteriores derecha/izquierda, cloaca, cola, u otro).

## Sección de marcado

- Dos PIT posibles (aleta derecha y aleta izquierda) y dos marcas físicas (misma distribución), cada una con su propio `nuevo/recaptura` (`n`/`r`) y cicatriz de marca previa (`s`/`n`).
- Las marcas físicas se escriben sin guion ni espacio, en minúsculas (ej. `ab123`).
- Columna "verificado" para cada aleta: solo se marca `s` después de revisar; nunca se marca `n` a propósito (si no se ha revisado, se deja pendiente y se va a revisar).

## Biometrías del caparazón

Tres medidas, en cm con un decimal, tomadas siempre en curvo con cinta (no vernier/regla, salvo que se anote la excepción en observaciones):
- Punta-punta (a la punta supracaudal más larga).
- Punta-muesca.
- Muesca-muesca.
- Ancho.

## Clasificación de la nidada

- **Protegida**: se conoce el resultado de la incubación (aunque no haya sido posible contar todo con precisión). Se marca "s"/"n". En caso de contingencia ambiental (inundación, sismo, tsunami) el nido perdido por esa causa también se considera protegido, anotando la inicial de la contingencia — nunca se inventan contingencias.
- **No protegida**: no se le dio seguimiento (pérdida total sin revisión, o nidos reubicados al final de temporada sin seguimiento, o saqueados del vivero sin conocerse el resultado).
- **Tipo de siembra**: completa (`c`, tal como se colectó), dividida (`d`, huevos de una misma nidada sembrados en dos estacas), o juntada (`j`, nidadas de dos tortugas sembradas en un mismo nido) — estas dos últimas están fuera de práctica recomendada pero se registran si ocurrieron.

`protegido` y `compl_div_jun` ya se agregaron a `fichas` (migración 0018).

## Limpieza / revisión de nido

Categorías de conteo (coinciden con `cat_categorias_conteo` del repositorio): crías en superficie vivas/muertas, crías dentro del nido vivas/muertas, cascarones, crías eclosionando vivas/muertas, huevos no eclosionados en 3 fases, sin desarrollo embrionario aparente — todas desglosadas en normales/albinas/deformes/albinas y deformes.

- "Huellas" alrededor del nido: hormigas, raíces, larvas, piedras, huellas de depredador, otros — `s`/`n`/vacío si no hay dato. Coincide con los campos ya presentes en `fichas_limpieza`.
- Fecha de limpieza puede diferir de la fecha de primera emergencia (días después).
- `pasa` ya se agregó a `fichas_limpieza` (migración 0019).

## Mortalidad (varamientos)

El protocolo captura las tortugas muertas encontradas en una **hoja separada de "MORTALIDAD"**, no mezclada con los datos de anidación — salvo que esa tortuga sí haya construido un nido, en cuyo caso también aparece en los datos de anidación.

Esto es distinto al esquema actual del repositorio, donde "varada viva"/"varada muerta" son solo valores del campo `accion_codigo` dentro de `fichas`, sin una tabla propia. Ver "Discrepancias" abajo.

## Glosario (abreviaturas usadas en el protocolo)

| Abreviatura | Significado |
|---|---|
| mb | madre blanca (mancha blanca en el cuello de las laúdes) |
| ad, ai | aleta anterior derecha/izquierda |
| pd, pi | aleta posterior derecha/izquierda |
| hp | huevos puestos |
| hsaq | huevos saqueados |
| hs | huevos sembrados |
| hrot | huevos rotos |
| hd | huevos depredados |
| cap | caparazón |
| bal | balanos |
| per | percebes |
| mr | mancha rosa |
| pc / pcc / pci | proyección caudal / completa / incompleta |
| qc / qcc / qci | quilla central / completa / incompleta |
| cic | cicatriz |
| cm (en este contexto) | cicatriz de marca (no confundir con el código de especie `cm` = verde) |
| cft | crías fuera de trampa |
| cftemp / nftemp | crías o nidos fuera de temporada |

## Discrepancias encontradas vs. el esquema actual del repositorio

1. **Código de especie de la lora**: resuelto — se sembró `cat_especies` usando `lk` (protocolo oficial), no `LO` como en el esquema heredado (migración 0017).
2. **`cat_uso_nido` incompleto**: resuelto — se agregaron los códigos 10 (Muerta, para varamientos) y 13 (Sólo nido sin tortuga - picado) (migración 0015).
3. **Varamientos como tabla propia**: decisión tomada — se mantienen como están (valores 9/10 de `accion_codigo` dentro de `fichas`), sin tabla propia por ahora.
4. **Campos de clasificación de nidada ausentes**: resuelto — se agregaron `protegido` y `compl_div_jun` a `fichas` (migración 0018), y `pasa` a `fichas_limpieza` (migración 0019).
5. **Códigos 1/2 (Corral) y 3/4 (Caja)**: sigue sin resolverse. No se agregaron los códigos 2 y 4 a `cat_uso_nido` hasta saber qué los distingue de 1 y 3.

Estas discrepancias quedan documentadas para decidir con el responsable del proyecto antes de tocar más catálogos o la estructura de `fichas`.
