-- VeneLab - Migración v3.2: Campo de procedimiento en fórmulas
ALTER TABLE formulas ADD COLUMN IF NOT EXISTS procedure_steps TEXT;
