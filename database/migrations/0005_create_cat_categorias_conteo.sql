-- Migración: 0005
-- Fecha: 2026-09-07
-- Cambio: crea la tabla catálogo cat_categorias_conteo con su semilla
-- (categorías de conteo de la ficha de limpieza de nido). Portada de MySQL
-- a T-SQL; BOOLEAN se traduce a BIT.

CREATE TABLE cat_categorias_conteo (
    codigo                    VARCHAR(30) PRIMARY KEY,
    descripcion               NVARCHAR(80) NOT NULL,
    solo_total                BIT NOT NULL DEFAULT 0,
    cuenta_cria_viva          BIT NOT NULL DEFAULT 0,
    excluir_de_huevos_totales BIT NOT NULL DEFAULT 0
);

INSERT INTO cat_categorias_conteo (codigo, descripcion, solo_total, cuenta_cria_viva, excluir_de_huevos_totales) VALUES
    (N'superficie_vivas',     N'En superficie · Crías vivas',                         0, 1, 0),
    (N'superficie_muertas',   N'En superficie · Crías muertas',                       0, 0, 0),
    (N'nido_vivas',           N'Dentro del nido · Crías vivas',                       0, 1, 0),
    (N'nido_muertas',         N'Dentro del nido · Crías muertas',                     0, 0, 0),
    (N'cascarones',           N'Cascarones',                                          1, 0, 1),
    (N'eclosionando_vivas',   N'Crías eclosionando · Vivas',                          0, 1, 0),
    (N'eclosionando_muertas', N'Crías eclosionando · Muertas',                        0, 0, 0),
    (N'no_ecl_fase1',         N'Huevos no eclosionados · 1a. fase',                   0, 0, 0),
    (N'no_ecl_fase2',         N'Huevos no eclosionados · 2a. fase',                   0, 0, 0),
    (N'no_ecl_fase3_vivas',   N'Huevos no eclosionados · 3a. vivas',                  0, 0, 0),
    (N'no_ecl_fase3_muertas', N'Huevos no eclosionados · 3a. muertas',                0, 0, 0),
    (N'sin_desarrollo',       N'Sin desarrollo embrionario aparente (rosas, huevos)', 0, 0, 0);
