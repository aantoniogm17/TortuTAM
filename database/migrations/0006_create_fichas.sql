-- Migración: 0006
-- Fecha: 2026-09-07
-- Cambio: crea la tabla principal fichas (ficha de anidación), portada de
-- MySQL a T-SQL. ENUM -> CHECK, BOOLEAN -> BIT, TEXT -> NVARCHAR(MAX),
-- TIMESTAMP -> DATETIME2; actualizado_en se mantiene con un trigger (ver
-- migración 0007), ya que T-SQL no tiene "ON UPDATE CURRENT_TIMESTAMP".

CREATE TABLE fichas (
    id                          INT IDENTITY(1,1) PRIMARY KEY,
    numero_ficha                VARCHAR(20) NOT NULL UNIQUE,
    playa_id                    INT NOT NULL,
    estaca                      VARCHAR(20),
    zona                        NVARCHAR(40),
    fecha                       DATE NOT NULL,
    especie_codigo              VARCHAR(5),
    sexo                        VARCHAR(2) CHECK (sexo IN ('H','M','ND')),

    accion_codigo               TINYINT,
    hora_a                      TIME NULL,
    hora_b_colecta              TIME NULL,
    hora_c_siembra              TIME NULL,
    uso_nido_codigo             TINYINT,
    corral                      VARCHAR(20),
    numero_nido                 VARCHAR(20),

    huevos_colectados           SMALLINT CHECK (huevos_colectados >= 0),
    huevos_rotos                SMALLINT CHECK (huevos_rotos >= 0),
    posicion_codigo             TINYINT,

    latitud                     DECIMAL(9,6),
    longitud                    DECIMAL(9,6),

    formulo                     VARCHAR(10),
    observaciones               NVARCHAR(MAX),

    tumores_presentes           BIT NOT NULL DEFAULT 0,
    bio_muesca_punta_larga_cm   DECIMAL(5,1),
    bio_punta_muesca_cm         DECIMAL(5,1),
    bio_muesca_muesca_cm        DECIMAL(5,1),
    bio_ancho_cm                DECIMAL(5,1),

    creado_en                   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    actualizado_en              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT fk_ficha_playa   FOREIGN KEY (playa_id)        REFERENCES cat_playas(id),
    CONSTRAINT fk_ficha_especie FOREIGN KEY (especie_codigo)  REFERENCES cat_especies(codigo),
    CONSTRAINT fk_ficha_accion  FOREIGN KEY (accion_codigo)   REFERENCES cat_acciones(codigo),
    CONSTRAINT fk_ficha_uso     FOREIGN KEY (uso_nido_codigo) REFERENCES cat_uso_nido(codigo),
    CONSTRAINT chk_posicion CHECK (posicion_codigo BETWEEN 1 AND 4)
);
