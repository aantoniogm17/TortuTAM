-- Migración: 0027
-- Fecha: 2026-10-27
-- Cambio: trigger que mantiene varamientos.actualizado_en al día en cada
-- UPDATE, equivalente al "ON UPDATE CURRENT_TIMESTAMP" que no existe en
-- T-SQL.

CREATE TRIGGER trg_varamientos_actualizado_en
ON varamientos
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE v
    SET actualizado_en = SYSUTCDATETIME()
    FROM varamientos v
    INNER JOIN inserted i ON v.id = i.id;
END;
