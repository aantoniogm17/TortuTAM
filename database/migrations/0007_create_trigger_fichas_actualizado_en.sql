-- Migración: 0007
-- Fecha: 2026-09-07
-- Cambio: trigger que mantiene fichas.actualizado_en al día en cada UPDATE,
-- equivalente al "ON UPDATE CURRENT_TIMESTAMP" que no existe en T-SQL.

CREATE TRIGGER trg_fichas_actualizado_en
ON fichas
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE f
    SET actualizado_en = SYSUTCDATETIME()
    FROM fichas f
    INNER JOIN inserted i ON f.id = i.id;
END;
