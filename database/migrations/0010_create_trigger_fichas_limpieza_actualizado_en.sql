-- Migración: 0010
-- Fecha: 2026-09-07
-- Cambio: trigger que mantiene fichas_limpieza.actualizado_en al día en
-- cada UPDATE, equivalente al "ON UPDATE CURRENT_TIMESTAMP" que no existe
-- en T-SQL.

CREATE TRIGGER trg_fichas_limpieza_actualizado_en
ON fichas_limpieza
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE fl
    SET actualizado_en = SYSUTCDATETIME()
    FROM fichas_limpieza fl
    INNER JOIN inserted i ON fl.id = i.id;
END;
