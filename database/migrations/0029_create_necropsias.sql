-- Migración: 0029
-- Fecha: 2026-10-27
-- Cambio: crea la tabla necropsias (ficha de necropsia 2021). Cada
-- necropsia se anexa a un varamiento con relación 1 a 0/1
-- (varamiento_id UNIQUE) y se elimina junto con él (ON DELETE CASCADE).
-- La regla de que un varamiento con condicion_codigo = 'vivo' no admite
-- necropsia la valida la API, igual que el marcado de
-- varamientos.necropsia_completada al crearla.
-- Los campos de selección múltiple (celoma, corazon, higado, tracto_gi,
-- gi_anormalidades, traquea, pulmones, cerebro) se guardan como códigos
-- separados por coma, sin espacios, validados por la API. Los de una sola
-- opción llevan CHECK con su lista; "cbd" = no se puede determinar.

CREATE TABLE necropsias (
    id                               INT IDENTITY(1,1) PRIMARY KEY,
    varamiento_id                    INT NOT NULL,
    fecha_necropsia                  DATE NULL,
    realizo                          NVARCHAR(120) NULL,

    grasa_corporal                   NVARCHAR(10) NULL,

    celoma                           NVARCHAR(100) NULL,
    celoma_comentarios               NVARCHAR(1000) NULL,
    tumores_fp                       NVARCHAR(3) NULL,
    tumores_fp_ubicaciones           NVARCHAR(500) NULL,

    corazon                          NVARCHAR(100) NULL,
    sangre_camaras                   NVARCHAR(3) NULL,
    corazon_comentarios              NVARCHAR(1000) NULL,

    higado                           NVARCHAR(100) NULL,
    higado_comentarios               NVARCHAR(1000) NULL,

    tracto_gi                        NVARCHAR(100) NULL,
    boca_examinada                   BIT NULL,
    gi_anormalidades                 NVARCHAR(20) NULL,
    gi_descripcion                   NVARCHAR(1000) NULL,
    material_antropogenico_detalle   NVARCHAR(1000) NULL,
    material_ingerido                NVARCHAR(3) NULL,
    material_ingerido_descripcion    NVARCHAR(1000) NULL,
    material_foto_escala             BIT NULL,

    gi_boca_esofago_estado           NVARCHAR(10) NULL,
    gi_boca_esofago_descripcion      NVARCHAR(500) NULL,
    gi_estomago_estado               NVARCHAR(10) NULL,
    gi_estomago_descripcion          NVARCHAR(500) NULL,
    gi_intestino_1_estado            NVARCHAR(10) NULL,
    gi_intestino_1_descripcion       NVARCHAR(500) NULL,
    gi_intestino_2_estado            NVARCHAR(10) NULL,
    gi_intestino_2_descripcion       NVARCHAR(500) NULL,

    urogenital                       NVARCHAR(15) NULL,
    sexo                             NVARCHAR(2) NULL,
    testiculos                       NVARCHAR(15) NULL,
    epididimo                        NVARCHAR(15) NULL,
    ovarios                          NVARCHAR(15) NULL,
    oviducto                         NVARCHAR(15) NULL,
    urogenital_comentarios           NVARCHAR(1000) NULL,

    traquea                          NVARCHAR(120) NULL,
    pulmones                         NVARCHAR(100) NULL,
    respiratorio_comentarios         NVARCHAR(1000) NULL,

    cerebro                          NVARCHAR(120) NULL,
    cerebro_comentarios              NVARCHAR(1000) NULL,

    resumen_hallazgos                NVARCHAR(MAX) NULL,

    creado_en                        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    actualizado_en                   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT fk_necropsia_varamiento FOREIGN KEY (varamiento_id) REFERENCES varamientos(id) ON DELETE CASCADE,
    CONSTRAINT uq_necropsia_varamiento UNIQUE (varamiento_id),

    CONSTRAINT chk_necropsias_grasa_corporal         CHECK (grasa_corporal IN (N'abundante', N'parcial', N'severa', N'cbd')),
    CONSTRAINT chk_necropsias_tumores_fp             CHECK (tumores_fp IN (N'si', N'no', N'cbd')),
    CONSTRAINT chk_necropsias_sangre_camaras         CHECK (sangre_camaras IN (N'si', N'no', N'cbd')),
    CONSTRAINT chk_necropsias_material_ingerido      CHECK (material_ingerido IN (N'si', N'no', N'cbd')),
    CONSTRAINT chk_necropsias_gi_boca_esofago_estado CHECK (gi_boca_esofago_estado IN (N'vacio', N'contenido')),
    CONSTRAINT chk_necropsias_gi_estomago_estado     CHECK (gi_estomago_estado IN (N'vacio', N'contenido')),
    CONSTRAINT chk_necropsias_gi_intestino_1_estado  CHECK (gi_intestino_1_estado IN (N'vacio', N'contenido')),
    CONSTRAINT chk_necropsias_gi_intestino_2_estado  CHECK (gi_intestino_2_estado IN (N'vacio', N'contenido')),
    CONSTRAINT chk_necropsias_urogenital             CHECK (urogenital IN (N'sin_hallazgos', N'anormal', N'cbd')),
    CONSTRAINT chk_necropsias_sexo                   CHECK (sexo IN (N'M', N'H', N'ND')),
    CONSTRAINT chk_necropsias_testiculos             CHECK (testiculos IN (N'cilindrico', N'elipsoidal', N'plano')),
    CONSTRAINT chk_necropsias_epididimo              CHECK (epididimo IN (N'no_expandido', N'cresta', N'colgante', N'espirales')),
    CONSTRAINT chk_necropsias_ovarios                CHECK (ovarios IN (N'menor_4mm', N'desarrollo')),
    CONSTRAINT chk_necropsias_oviducto               CHECK (oviducto IN (N'recto', N'parcial', N'muy_convulso', N'huevos'))
);
