-- ============================================
-- VeneLab - Migración v2.7
-- Inventario por tipo + Presentaciones + Fórmulas mejoradas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Agregar tipo al inventario de materiales
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS material_type TEXT NOT NULL DEFAULT 'materia_prima';

-- Actualizar materiales existentes (todos son materia prima)
UPDATE raw_materials SET material_type = 'materia_prima' WHERE material_type IS NULL OR material_type = '';

-- 2. Actualizar fórmulas: agregar campo de base_amount (para cuánto rinde la receta base)
-- yield_amount ya existe y sirve para esto, así que lo renombramos conceptualmente:
-- yield_amount = cantidad base de la fórmula (ej: 100ml)
-- yield_unit = unidad base (ml, g, etc.)

-- 3. Crear tabla de presentaciones
CREATE TABLE IF NOT EXISTS presentations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  formula_id UUID NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ml',
  sale_price NUMERIC NOT NULL DEFAULT 0,
  container_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  container_qty NUMERIC NOT NULL DEFAULT 1,
  label_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  label_qty NUMERIC NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access" ON presentations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public can read presentations" ON presentations FOR SELECT USING (true);

CREATE TRIGGER trg_presentations_updated BEFORE UPDATE ON presentations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Actualizar productos para que referencien presentación en vez de fórmula directa
ALTER TABLE products ADD COLUMN IF NOT EXISTS presentation_id UUID REFERENCES presentations(id) ON DELETE SET NULL;

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_raw_materials_type ON raw_materials(material_type);
CREATE INDEX IF NOT EXISTS idx_presentations_formula ON presentations(formula_id);
