-- ============================================
-- VeneLab - Migración v3.0
-- Sistema de presentaciones + inventario dividido
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Agregar tipo al inventario de materiales
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS material_type TEXT NOT NULL DEFAULT 'materia_prima';
-- Valores posibles: 'materia_prima', 'envase', 'etiqueta'

-- 2. Agregar campo de cantidad base a fórmulas (ej: "esta receta es para 100ml")
ALTER TABLE formulas ADD COLUMN IF NOT EXISTS base_amount NUMERIC NOT NULL DEFAULT 100;
ALTER TABLE formulas ADD COLUMN IF NOT EXISTS base_unit TEXT NOT NULL DEFAULT 'ml';

-- 3. Tabla de presentaciones (cada fórmula puede tener múltiples presentaciones)
CREATE TABLE IF NOT EXISTS presentations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  formula_id UUID NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ml',
  envase_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  sku TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access" ON presentations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public can read presentations" ON presentations FOR SELECT USING (true);

CREATE TRIGGER trg_presentations_updated BEFORE UPDATE ON presentations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Actualizar productos para vincular a presentación en vez de fórmula directamente
ALTER TABLE products ADD COLUMN IF NOT EXISTS presentation_id UUID REFERENCES presentations(id) ON DELETE SET NULL;

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_presentations_formula ON presentations(formula_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_type ON raw_materials(material_type);
