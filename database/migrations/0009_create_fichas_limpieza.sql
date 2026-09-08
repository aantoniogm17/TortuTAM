-- Migración: 0009
-- Fecha: 2026-09-07
-- Cambio: crea la tabla fichas_limpieza (limpieza/exhumación de nido),
-- portada de MySQL a T-SQL. Se conserva la doble relación con fichas
-- (FK ficha_anidacion_id, y el emparejamiento por corral+nido que usa
-- vw_estatus_nidos en la migración 0013) documentada como pendiente en
-- docs/planteamiento.md; no se resuelve aquí.

CREATE TABLE fichas_limpieza (
    id                       INT IDENTITY(1,1) PRIMARY KEY,
    numero_ficha             VARCHAR(20) NOT NULL UNIQUE,
    ficha_anidacion_id       INT NULL,
    playa_id                 INT NULL,
    corral                   VARCHAR(20),
    nido                     VARCHAR(20),
    fecha_primera_emergencia DATE,
    fecha_limpieza           DATE NOT NULL,
    especie_codigo           VARCHAR(5),
    uso_nido_codigo          TINYINT,
    formulo                  VARCHAR(10),
    latitud                  DECIMAL(9,6),
    longitud                 DECIMAL(9,6),

    hormigas                 VARCHAR(1) CHECK (hormigas IN ('S','N')),
    raices                   VARCHAR(1) CHECK (raices IN ('S','N')),
    larvas                   VARCHAR(1) CHECK (larvas IN ('S','N')),
    piedras                  VARCHAR(1) CHECK (piedras IN ('S','N')),
    huellas                  VARCHAR(1) CHECK (huellas IN ('S','N')),
    otros                    VARCHAR(1) CHECK (otros IN ('S','N')),
    otros_detalle            NVARCHAR(MAX),

    creado_en                DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    actualizado_en           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT fk_limpieza_ficha_origen FOREIGN KEY (ficha_anidacion_id) REFERENCES fichas(id) ON DELETE SET NULL,
    CONSTRAINT fk_limpieza_playa        FOREIGN KEY (playa_id)           REFERENCES cat_playas(id),
    CONSTRAINT fk_limpieza_especie      FOREIGN KEY (especie_codigo)     REFERENCES cat_especies(codigo),
    CONSTRAINT fk_limpieza_uso          FOREIGN KEY (uso_nido_codigo)    REFERENCES cat_uso_nido(codigo)
);
