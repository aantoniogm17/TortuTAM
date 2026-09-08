-- Migración: 0017
-- Fecha: 2026-09-08
-- Cambio: crea la tabla ficha_fotos para las fotos adjuntas a una ficha de
-- anidación (una ficha admite varias). Solo guarda la ruta relativa del
-- archivo; el almacenamiento físico lo resuelve la capa de aplicación
-- (filesystem local por ahora, ver IAlmacenamientoFotos).

CREATE TABLE ficha_fotos (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    ficha_id       INT NOT NULL,
    ruta_relativa  NVARCHAR(260) NOT NULL,
    creado_en      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT fk_ficha_foto_ficha FOREIGN KEY (ficha_id) REFERENCES fichas(id) ON DELETE CASCADE
);

CREATE INDEX idx_ficha_fotos_ficha ON ficha_fotos(ficha_id);
