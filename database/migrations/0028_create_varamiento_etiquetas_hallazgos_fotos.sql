-- Migración: 0028
-- Fecha: 2026-10-27
-- Cambio: crea las tres tablas hijas de varamientos, todas con
-- ON DELETE CASCADE:
--   - varamiento_etiquetas: etiquetas de aleta (máx. 3) y PIT (máx. 2)
--     encontradas en el ejemplar; el máximo por tipo lo valida la API.
--   - varamiento_hallazgos: material antropogénico y heridas, un renglón
--     por categoría y tipo; ubicaciones son códigos separados por coma,
--     sin espacios, validados por la API.
--   - varamiento_fotos: fotos adjuntas, mismo diseño que ficha_fotos
--     (migración 0017).

CREATE TABLE varamiento_etiquetas (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    varamiento_id  INT NOT NULL,
    tipo           NVARCHAR(10) NOT NULL,
    numero         NVARCHAR(50) NOT NULL,
    ubicacion      NVARCHAR(100) NULL,

    CONSTRAINT fk_varamiento_etiqueta_varamiento FOREIGN KEY (varamiento_id) REFERENCES varamientos(id) ON DELETE CASCADE,
    CONSTRAINT chk_varamiento_etiquetas_tipo CHECK (tipo IN (N'aleta', N'pit'))
);

CREATE INDEX idx_varamiento_etiquetas_varamiento ON varamiento_etiquetas(varamiento_id);

CREATE TABLE varamiento_hallazgos (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    varamiento_id  INT NOT NULL,
    categoria      NVARCHAR(10) NOT NULL,
    tipo_codigo    NVARCHAR(20) NOT NULL,
    ubicaciones    NVARCHAR(100) NULL,
    detalle        NVARCHAR(500) NULL,

    CONSTRAINT fk_varamiento_hallazgo_varamiento FOREIGN KEY (varamiento_id) REFERENCES varamientos(id) ON DELETE CASCADE,
    CONSTRAINT uq_varamiento_hallazgo_tipo UNIQUE (varamiento_id, categoria, tipo_codigo),
    CONSTRAINT chk_varamiento_hallazgos_categoria CHECK (categoria IN (N'material', N'herida')),
    CONSTRAINT chk_varamiento_hallazgos_tipo_codigo CHECK (
        (categoria = N'material' AND tipo_codigo IN (N'anzuelo', N'sedal', N'cuerda', N'red', N'petroleo', N'otro'))
        OR (categoria = N'herida' AND tipo_codigo IN (N'propela', N'aplastamiento', N'enredamiento', N'tiburon', N'otro'))
    )
);

CREATE TABLE varamiento_fotos (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    varamiento_id  INT NOT NULL,
    ruta_relativa  NVARCHAR(260) NOT NULL,
    creado_en      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT fk_varamiento_foto_varamiento FOREIGN KEY (varamiento_id) REFERENCES varamientos(id) ON DELETE CASCADE
);

CREATE INDEX idx_varamiento_fotos_varamiento ON varamiento_fotos(varamiento_id);
