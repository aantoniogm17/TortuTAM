-- Migración: 0026
-- Fecha: 2026-10-27
-- Cambio: crea la tabla varamientos (ficha de varamiento NOAA, lados 1 y 2).
-- Convive con los códigos 9/10 de fichas.accion_codigo, que no se tocan.
-- Los campos de selección múltiple (condicion_fisica,
-- cicatrices_ubicaciones) se guardan como códigos separados por coma, sin
-- espacios; su validación la hace la API. Las preguntas SI/NO de la ficha
-- son BIT NULL (NULL = sin contestar). latitud/longitud son NULL en BD
-- igual que en fichas, pero la API las exige. idempotency_key sigue el
-- mismo patrón que fichas (migración 0016) para la sincronización offline.
-- El número de tortuga del día es único por fecha y playa; dos registros
-- sin playa en la misma fecha tampoco pueden repetir número, porque el
-- UNIQUE de SQL Server trata los NULL como iguales.

CREATE TABLE varamientos (
    id                            INT IDENTITY(1,1) PRIMARY KEY,
    observador_nombre             NVARCHAR(120) NOT NULL,
    playa_id                      INT NULL,
    latitud                       DECIMAL(9,6) NULL,
    longitud                      DECIMAL(9,6) NULL,
    descripcion_ubicacion         NVARCHAR(500) NULL,
    fecha_varamiento              DATE NOT NULL,
    numero_tortuga_dia            SMALLINT NOT NULL,
    especie_codigo                VARCHAR(5) NOT NULL,
    condicion_codigo              NVARCHAR(20) NOT NULL,
    condicion_fisica              NVARCHAR(100) NULL,

    foto_dorsal                   BIT NOT NULL DEFAULT 0,
    foto_ventral                  BIT NOT NULL DEFAULT 0,
    foto_heridas                  BIT NOT NULL DEFAULT 0,
    foto_material                 BIT NOT NULL DEFAULT 0,
    boca_revisada                 BIT NULL,
    necropsia_completada          BIT NULL,

    etiquetas_aleta_encontradas   BIT NULL,
    cicatrices_etiqueta           BIT NULL,
    cicatrices_ubicaciones        NVARCHAR(20) NULL,
    pit_escaneado                 BIT NULL,
    etiqueta_viva                 BIT NULL,
    etiqueta_viva_detalle         NVARCHAR(200) NULL,
    equipo_rastreo                BIT NULL,

    lcc_cm                        DECIMAL(5,1) NULL,
    lcc_tipo                      CHAR(1) NULL,
    cola_extendida                NVARCHAR(2) NULL,
    cola_medida_1_cm              DECIMAL(5,1) NULL,
    cola_medida_2_cm              DECIMAL(5,1) NULL,

    material_encontrado           BIT NULL,
    material_fotos                BIT NULL,
    cuerda_algo_unido             BIT NULL,
    heridas_encontradas           BIT NULL,
    heridas_fotos                 BIT NULL,
    herida_enredamiento_asociada  BIT NULL,
    enfermedad_observada          BIT NULL,
    enfermedad_fotos              BIT NULL,
    demacrada                     BIT NULL,
    epibiontes                    BIT NULL,
    fibropapiloma                 BIT NULL,
    fibropapiloma_rango           NVARCHAR(5) NULL,
    lesiones_piel                 BIT NULL,
    lesiones_piel_area            NVARCHAR(10) NULL,
    sanguijuelas                  BIT NULL,
    sanguijuelas_cantidad         NVARCHAR(10) NULL,

    comentarios                   NVARCHAR(MAX) NULL,
    idempotency_key               VARCHAR(100) NULL,

    creado_en                     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    actualizado_en                DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT fk_varamiento_playa   FOREIGN KEY (playa_id)       REFERENCES cat_playas(id),
    CONSTRAINT fk_varamiento_especie FOREIGN KEY (especie_codigo) REFERENCES cat_especies(codigo),
    CONSTRAINT uq_varamiento_fecha_playa_numero UNIQUE (fecha_varamiento, playa_id, numero_tortuga_dia),

    CONSTRAINT chk_varamientos_numero_tortuga_dia    CHECK (numero_tortuga_dia BETWEEN 1 AND 999),
    CONSTRAINT chk_varamientos_condicion_codigo      CHECK (condicion_codigo IN (N'vivo', N'ligera', N'moderada', N'severa', N'desecado', N'esqueleto')),
    CONSTRAINT chk_varamientos_latitud               CHECK (latitud BETWEEN -90 AND 90),
    CONSTRAINT chk_varamientos_longitud              CHECK (longitud BETWEEN -180 AND 180),
    CONSTRAINT chk_varamientos_lcc_cm                CHECK (lcc_cm >= 0),
    CONSTRAINT chk_varamientos_lcc_tipo              CHECK (lcc_tipo IN ('R', 'A')),
    CONSTRAINT chk_varamientos_cola_extendida        CHECK (cola_extendida IN (N'si', N'no', N'nd')),
    CONSTRAINT chk_varamientos_cola_medida_1_cm      CHECK (cola_medida_1_cm >= 0),
    CONSTRAINT chk_varamientos_cola_medida_2_cm      CHECK (cola_medida_2_cm >= 0),
    CONSTRAINT chk_varamientos_fibropapiloma_rango   CHECK (fibropapiloma_rango IN (N'lt5', N'5a10', N'gt10')),
    CONSTRAINT chk_varamientos_lesiones_piel_area    CHECK (lesiones_piel_area IN (N'pequenas', N'grandes')),
    CONSTRAINT chk_varamientos_sanguijuelas_cantidad CHECK (sanguijuelas_cantidad IN (N'pocas', N'muchas'))
);

CREATE UNIQUE INDEX uq_varamientos_idempotency_key
    ON varamientos (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_varamientos_fecha   ON varamientos(fecha_varamiento);
CREATE INDEX idx_varamientos_playa   ON varamientos(playa_id);
CREATE INDEX idx_varamientos_especie ON varamientos(especie_codigo);
