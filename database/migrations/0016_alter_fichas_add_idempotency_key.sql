-- Migración: 0016
-- Fecha: 2026-09-08
-- Cambio: agrega columna idempotency_key a fichas para que POST /api/fichas
-- pueda reconocer un reintento de sincronización offline (mismo dispositivo
-- reenviando la misma ficha tras perder la respuesta) y devolver la ficha ya
-- creada en vez de duplicarla. Nullable: no toda ficha llega con esa clave
-- (p. ej. las creadas antes de este cambio). Índice único filtrado porque
-- varias filas con NULL son válidas, pero una clave repetida no.

ALTER TABLE fichas
    ADD idempotency_key VARCHAR(100) NULL;
GO

CREATE UNIQUE INDEX uq_fichas_idempotency_key
    ON fichas (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
