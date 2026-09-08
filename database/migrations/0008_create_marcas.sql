-- Migración: 0008
-- Fecha: 2026-09-07
-- Cambio: crea la tabla marcas (marcado por aleta), portada de MySQL a
-- T-SQL. ENUM -> CHECK, BOOLEAN -> BIT, UNIQUE KEY -> CONSTRAINT UNIQUE.

CREATE TABLE marcas (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    ficha_id       INT NOT NULL,
    aleta          VARCHAR(10) NOT NULL CHECK (aleta IN ('izquierda','derecha')),
    pit            VARCHAR(30),
    marca          VARCHAR(30),
    leyenda        NVARCHAR(80),
    nueva_o_recap  VARCHAR(1) CHECK (nueva_o_recap IN ('N','R')),
    cicatriz_marca BIT NOT NULL DEFAULT 0,
    verifico       BIT NOT NULL DEFAULT 0,

    CONSTRAINT fk_marca_ficha FOREIGN KEY (ficha_id) REFERENCES fichas(id) ON DELETE CASCADE,
    CONSTRAINT uq_ficha_aleta UNIQUE (ficha_id, aleta)
);
