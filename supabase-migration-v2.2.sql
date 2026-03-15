-- ============================================
-- LabDropship CCS - Migración v2.2
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Habilita lectura pública de productos para el catálogo
-- ============================================

-- Permitir lectura pública de productos (para el catálogo)
CREATE POLICY "Public can read products" ON products
  FOR SELECT USING (true);

-- Permitir lectura pública de fórmulas (solo para info)
CREATE POLICY "Public can read formulas" ON formulas
  FOR SELECT USING (true);

CREATE POLICY "Public can read formula ingredients" ON formula_ingredients
  FOR SELECT USING (true);
