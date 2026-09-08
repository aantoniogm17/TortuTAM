-- Migración: 0011
-- Fecha: 2026-09-07
-- Cambio: crea la tabla limpieza_conteos (detalle de conteo por
-- categoría), portada de MySQL a T-SQL. SMALLINT UNSIGNED -> SMALLINT
-- con CHECK >= 0.

CREATE TABLE limpieza_conteos (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    ficha_limpieza_id INT NOT NULL,
    categoria_codigo  VARCHAR(30) NOT NULL,
    normales          SMALLINT CHECK (normales >= 0),
    albina            SMALLINT CHECK (albina >= 0),
    deforme           SMALLINT CHECK (deforme >= 0),
    albinas_deformes  SMALLINT CHECK (albinas_deformes >= 0),
    total             SMALLINT CHECK (total >= 0),

    CONSTRAINT fk_conteo_ficha     FOREIGN KEY (ficha_limpieza_id) REFERENCES fichas_limpieza(id) ON DELETE CASCADE,
    CONSTRAINT fk_conteo_categoria FOREIGN KEY (categoria_codigo)  REFERENCES cat_categorias_conteo(codigo),
    CONSTRAINT uq_ficha_categoria UNIQUE (ficha_limpieza_id, categoria_codigo)
);
