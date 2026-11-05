-- Migración: 0030
-- Fecha: 2026-10-27
-- Cambio: trigger que mantiene necropsias.actualizado_en al día en cada
-- UPDATE, equivalente al "ON UPDATE CURRENT_TIMESTAMP" que no existe en
-- T-SQL.

CREATE TRIGGER trg_necropsias_actualizado_en
ON necropsias
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE n
    SET actualizado_en = SYSUTCDATETIME()
    FROM necropsias n
    INNER JOIN inserted i ON n.id = i.id;
END;
