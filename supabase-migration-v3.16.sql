-- VeneLab - Migración v3.16: Volumen en envases
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS volume NUMERIC;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS volume_unit TEXT DEFAULT 'ml';
