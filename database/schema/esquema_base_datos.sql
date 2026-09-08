-- ============================================================================
-- PROGRAMA BINACIONAL PARA LA RECUPERACIÓN DE LA TORTUGA LORA
-- Ficha de Anidación, Marcado y Varamientos — Esquema de base de datos
-- Compatible con MySQL 8+ / MariaDB 10.4+  (usar CREATE TYPE en vez de CHECK
-- para PostgreSQL si se requiere ese motor)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS tortuga_lora
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tortuga_lora;

-- ----------------------------------------------------------------------------
-- Catálogos (tomados literalmente de la leyenda impresa en la ficha física)
-- ----------------------------------------------------------------------------
CREATE TABLE cat_playas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(10) NOT NULL UNIQUE,     -- ej. "MIR"
  nombre        VARCHAR(120)
);

CREATE TABLE cat_especies (
  codigo            VARCHAR(5) PRIMARY KEY,       -- ej. "CM", "LO"
  nombre_comun      VARCHAR(80),
  nombre_cientifico VARCHAR(120)
);

CREATE TABLE cat_acciones (
  codigo      TINYINT PRIMARY KEY,
  descripcion VARCHAR(60) NOT NULL
);
INSERT INTO cat_acciones (codigo, descripcion) VALUES
 (0,'Apareando'),(1,'Sube'),(2,'Hace nido'),(3,'Pone'),(4,'Tapa'),(5,'Baja'),
 (6,'No puso (arqueo)'),(7,'Nadando (de regreso)'),(8,'Sólo nido (sin tortuga)'),
 (9,'Varada viva'),(10,'Varada muerta');

CREATE TABLE cat_uso_nido (
  codigo      TINYINT PRIMARY KEY,
  descripcion VARCHAR(60) NOT NULL
);
INSERT INTO cat_uso_nido (codigo, descripcion) VALUES
 (1,'Corral'),(3,'Caja'),(5,'Saqueado'),(6,'Depredado'),(7,'No localizado'),
 (8,'No puso'),(9,'In situ'),(11,'Reubicado'),(12,'Sólo rastro (arqueo)');

-- ----------------------------------------------------------------------------
-- Tabla principal: una fila por ficha física
-- ----------------------------------------------------------------------------
CREATE TABLE fichas (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  numero_ficha        VARCHAR(20) NOT NULL UNIQUE,   -- "No." impreso en la esquina, ej. 15681
  playa_id            INT NOT NULL,
  estaca              VARCHAR(20),
  zona                VARCHAR(40),
  fecha               DATE NOT NULL,
  especie_codigo      VARCHAR(5),
  sexo                ENUM('H','M','ND'),

  accion_codigo       TINYINT,
  hora_a              TIME NULL,                     -- hora de arribo
  hora_b_colecta      TIME NULL,
  hora_c_siembra      TIME NULL,
  uso_nido_codigo     TINYINT,
  corral              VARCHAR(20),
  numero_nido         VARCHAR(20),

  huevos_colectados   SMALLINT UNSIGNED,
  huevos_rotos        SMALLINT UNSIGNED,
  posicion_codigo     TINYINT,                       -- 1: <1cm 2: 1-4cm 3: 4-10cm 4: >10cm (a vegetación)

  latitud             DECIMAL(9,6),                  -- ubicación GPS del nido (WGS84)
  longitud            DECIMAL(9,6),

  formulo             VARCHAR(10),                   -- iniciales de quien llenó la ficha
  observaciones        TEXT,

  tumores_presentes   BOOLEAN DEFAULT FALSE,
  bio_muesca_punta_larga_cm DECIMAL(5,1),
  bio_punta_muesca_cm       DECIMAL(5,1),
  bio_muesca_muesca_cm      DECIMAL(5,1),
  bio_ancho_cm              DECIMAL(5,1),

  creado_en           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_ficha_playa   FOREIGN KEY (playa_id)        REFERENCES cat_playas(id),
  CONSTRAINT fk_ficha_especie FOREIGN KEY (especie_codigo)  REFERENCES cat_especies(codigo),
  CONSTRAINT fk_ficha_accion  FOREIGN KEY (accion_codigo)   REFERENCES cat_acciones(codigo),
  CONSTRAINT fk_ficha_uso     FOREIGN KEY (uso_nido_codigo) REFERENCES cat_uso_nido(codigo),
  CONSTRAINT chk_posicion CHECK (posicion_codigo BETWEEN 1 AND 4)
);

-- ----------------------------------------------------------------------------
-- Marcado por aleta (normalizado: una fila por aleta izquierda/derecha)
-- ----------------------------------------------------------------------------
CREATE TABLE marcas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  ficha_id        INT NOT NULL,
  aleta           ENUM('izquierda','derecha') NOT NULL,
  pit             VARCHAR(30),
  marca           VARCHAR(30),
  leyenda         VARCHAR(80),
  nueva_o_recap   ENUM('N','R'),          -- N = nueva, R = recaptura
  cicatriz_marca  BOOLEAN DEFAULT FALSE,
  verifico        BOOLEAN DEFAULT FALSE,

  CONSTRAINT fk_marca_ficha FOREIGN KEY (ficha_id) REFERENCES fichas(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ficha_aleta (ficha_id, aleta)
);

-- ----------------------------------------------------------------------------
-- FICHA DE LIMPIEZA DE NIDO (exhumación / éxito de eclosión)
-- Una fila por ficha física de limpieza. Se vincula opcionalmente a la ficha
-- de anidación original mediante corral + nido (fk_limpieza_ficha_origen),
-- ya que en campo no siempre se conoce el id interno de esa ficha.
-- ----------------------------------------------------------------------------
CREATE TABLE fichas_limpieza (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  numero_ficha          VARCHAR(20) NOT NULL UNIQUE,   -- "No." impreso, ej. 10933
  ficha_anidacion_id    INT NULL,                      -- referencia opcional a fichas.id
  playa_id              INT,
  corral                VARCHAR(20),
  nido                  VARCHAR(20),
  fecha_primera_emergencia DATE,
  fecha_limpieza        DATE NOT NULL,
  especie_codigo        VARCHAR(5),
  uso_nido_codigo       TINYINT,
  formulo               VARCHAR(10),
  latitud                DECIMAL(9,6),  -- opcional: sólo si difiere de la ubicación registrada en la ficha de anidación
  longitud               DECIMAL(9,6),

  hormigas              ENUM('S','N'),
  raices                ENUM('S','N'),
  larvas                ENUM('S','N'),
  piedras               ENUM('S','N'),
  huellas               ENUM('S','N'),
  otros                 ENUM('S','N'),
  otros_detalle         TEXT,

  creado_en             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_limpieza_ficha_origen FOREIGN KEY (ficha_anidacion_id) REFERENCES fichas(id) ON DELETE SET NULL,
  CONSTRAINT fk_limpieza_playa        FOREIGN KEY (playa_id)           REFERENCES cat_playas(id),
  CONSTRAINT fk_limpieza_especie      FOREIGN KEY (especie_codigo)     REFERENCES cat_especies(codigo),
  CONSTRAINT fk_limpieza_uso          FOREIGN KEY (uso_nido_codigo)    REFERENCES cat_uso_nido(codigo)
);

-- Catálogo de las categorías de conteo tal como aparecen impresas en la ficha
CREATE TABLE cat_categorias_conteo (
  codigo       VARCHAR(30) PRIMARY KEY,
  descripcion  VARCHAR(80) NOT NULL,
  solo_total   BOOLEAN DEFAULT FALSE,     -- TRUE para "Cascarones" (no desglosa normales/albina/deforme)
  cuenta_cria_viva BOOLEAN DEFAULT FALSE, -- TRUE si el total suma al conteo de crías vivas
  excluir_de_huevos_totales BOOLEAN DEFAULT FALSE -- TRUE para "Cascarones" (no es huevo)
);
INSERT INTO cat_categorias_conteo (codigo, descripcion, solo_total, cuenta_cria_viva, excluir_de_huevos_totales) VALUES
 ('superficie_vivas',    'En superficie · Crías vivas',    FALSE, TRUE,  FALSE),
 ('superficie_muertas',  'En superficie · Crías muertas',  FALSE, FALSE, FALSE),
 ('nido_vivas',          'Dentro del nido · Crías vivas',  FALSE, TRUE,  FALSE),
 ('nido_muertas',        'Dentro del nido · Crías muertas',FALSE, FALSE, FALSE),
 ('cascarones',          'Cascarones',                     TRUE,  FALSE, TRUE),
 ('eclosionando_vivas',  'Crías eclosionando · Vivas',     FALSE, TRUE,  FALSE),
 ('eclosionando_muertas','Crías eclosionando · Muertas',   FALSE, FALSE, FALSE),
 ('no_ecl_fase1',        'Huevos no eclosionados · 1a. fase', FALSE, FALSE, FALSE),
 ('no_ecl_fase2',        'Huevos no eclosionados · 2a. fase', FALSE, FALSE, FALSE),
 ('no_ecl_fase3_vivas',  'Huevos no eclosionados · 3a. vivas',  FALSE, FALSE, FALSE),
 ('no_ecl_fase3_muertas','Huevos no eclosionados · 3a. muertas',FALSE, FALSE, FALSE),
 ('sin_desarrollo',      'Sin desarrollo embrionario aparente (rosas, huevos)', FALSE, FALSE, FALSE);

-- Detalle normalizado: una fila por categoría de conteo dentro de cada ficha de limpieza
CREATE TABLE limpieza_conteos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  ficha_limpieza_id INT NOT NULL,
  categoria_codigo  VARCHAR(30) NOT NULL,
  normales          SMALLINT UNSIGNED,
  albina            SMALLINT UNSIGNED,
  deforme           SMALLINT UNSIGNED,
  albinas_deformes  SMALLINT UNSIGNED,
  total             SMALLINT UNSIGNED,

  CONSTRAINT fk_conteo_ficha     FOREIGN KEY (ficha_limpieza_id) REFERENCES fichas_limpieza(id) ON DELETE CASCADE,
  CONSTRAINT fk_conteo_categoria FOREIGN KEY (categoria_codigo)  REFERENCES cat_categorias_conteo(codigo),
  UNIQUE KEY uq_ficha_categoria (ficha_limpieza_id, categoria_codigo)
);

-- Vista de apoyo: éxito de eclosión por ficha de limpieza
-- (crías vivas totales / huevos totales, excluyendo cascarones)
CREATE VIEW vw_exito_eclosion AS
SELECT
  fl.id AS ficha_limpieza_id,
  fl.numero_ficha,
  fl.corral,
  fl.nido,
  fl.fecha_limpieza,
  SUM(CASE WHEN cc.cuenta_cria_viva THEN lc.total ELSE 0 END) AS crias_vivas_totales,
  SUM(CASE WHEN cc.excluir_de_huevos_totales THEN 0 ELSE COALESCE(lc.total,0) END) AS huevos_totales,
  ROUND(
    100 * SUM(CASE WHEN cc.cuenta_cria_viva THEN lc.total ELSE 0 END) /
    NULLIF(SUM(CASE WHEN cc.excluir_de_huevos_totales THEN 0 ELSE COALESCE(lc.total,0) END), 0)
  , 1) AS porcentaje_eclosion
FROM fichas_limpieza fl
LEFT JOIN limpieza_conteos lc ON lc.ficha_limpieza_id = fl.id
LEFT JOIN cat_categorias_conteo cc ON cc.codigo = lc.categoria_codigo
GROUP BY fl.id, fl.numero_ficha, fl.corral, fl.nido, fl.fecha_limpieza;

-- Vista de apoyo para el mapa: ubicación de cada nido + estatus de limpieza
-- (vinculación por corral + número de nido, igual que en la aplicación web)
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

-- ----------------------------------------------------------------------------
-- Índices de apoyo para búsquedas frecuentes del panel
-- ----------------------------------------------------------------------------
CREATE INDEX idx_fichas_fecha  ON fichas(fecha);
CREATE INDEX idx_fichas_playa  ON fichas(playa_id);
CREATE INDEX idx_marcas_pit    ON marcas(pit);
CREATE INDEX idx_limpieza_fecha ON fichas_limpieza(fecha_limpieza);
CREATE INDEX idx_limpieza_corral_nido ON fichas_limpieza(corral, nido);
CREATE INDEX idx_fichas_corral_nido ON fichas(corral, numero_nido);

-- ============================================================================
-- Datos de ejemplo — transcripción de la ficha física No. 15681
-- (algunos campos manuscritos ilegibles se dejan en blanco; verificar en campo)
-- ============================================================================
INSERT INTO cat_playas (codigo, nombre) VALUES ('MIR', 'Playa Mirador');
INSERT INTO cat_especies (codigo, nombre_comun, nombre_cientifico)
  VALUES ('CM', 'Tortuga verde', 'Chelonia mydas');

INSERT INTO fichas (
  numero_ficha, playa_id, estaca, zona, fecha, especie_codigo, sexo,
  accion_codigo, hora_a, hora_b_colecta, hora_c_siembra, uso_nido_codigo,
  corral, numero_nido, huevos_colectados, huevos_rotos, posicion_codigo,
  latitud, longitud,
  formulo, observaciones
) VALUES (
  '15681', (SELECT id FROM cat_playas WHERE codigo='MIR'), '19.3', NULL, '2026-06-16', 'CM', NULL,
  8, NULL, '17:35:00', '13:18:00', 1,
  '1', '3', 103, NULL, NULL,
  22.255300, -97.861100,
  'JA', 'Ficha original escaneada del formato físico No. 15681.'
);

-- Ejemplo de inserción de marcado (sin datos manuscritos en este caso, se deja plantilla):
-- INSERT INTO marcas (ficha_id, aleta, pit, marca, leyenda, nueva_o_recap, cicatriz_marca, verifico)
-- VALUES (LAST_INSERT_ID(), 'izquierda', NULL, NULL, NULL, NULL, FALSE, FALSE);

-- ============================================================================
-- Datos de ejemplo — transcripción de la Ficha de Limpieza de Nido No. 10933
-- (Corral 1 / Nido 3 de la ficha de anidación anterior; algunos campos
-- manuscritos parcialmente ilegibles, verificar en campo)
-- ============================================================================
INSERT INTO cat_especies (codigo, nombre_comun, nombre_cientifico)
  VALUES ('LO', 'Tortuga lora', 'Lepidochelys olivacea')
  ON DUPLICATE KEY UPDATE nombre_comun = VALUES(nombre_comun);

INSERT INTO fichas_limpieza (
  numero_ficha, ficha_anidacion_id, playa_id, corral, nido,
  fecha_primera_emergencia, fecha_limpieza, especie_codigo, formulo, otros_detalle
) VALUES (
  '10933',
  (SELECT id FROM fichas WHERE numero_ficha='15681'),
  (SELECT id FROM cat_playas WHERE codigo='MIR'),
  '1', '3',
  '2026-08-09', '2026-08-17', 'LO', 'JA',
  'Ficha original escaneada del formato físico No. 10933. Notas manuscritas adicionales parcialmente ilegibles; verificar en campo.'
);

SET @ficha_limpieza_id = LAST_INSERT_ID();

INSERT INTO limpieza_conteos (ficha_limpieza_id, categoria_codigo, normales, total) VALUES
 (@ficha_limpieza_id, 'superficie_vivas',   16, 16),  -- "13+3" en la ficha física
 (@ficha_limpieza_id, 'cascarones',       NULL, 17),
 (@ficha_limpieza_id, 'no_ecl_fase1',       22, 22),
 (@ficha_limpieza_id, 'no_ecl_fase3_vivas',  1, 1),
 (@ficha_limpieza_id, 'sin_desarrollo',     48, 48);

-- Consulta de verificación del éxito de eclosión calculado:
-- SELECT * FROM vw_exito_eclosion WHERE numero_ficha = '10933';
