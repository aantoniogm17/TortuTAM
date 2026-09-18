-- Migración: 0015
-- Fecha: 2026-09-07
-- Cambio: agrega columna temperatura_c a fichas (ficha de anidación), como
-- valor único de lectura en grados Celsius (temperatura ambiente/de arena).
-- Nullable: no toda ficha registra este dato.

ALTER TABLE fichas
    ADD temperatura_c DECIMAL(4,1) NULL;
