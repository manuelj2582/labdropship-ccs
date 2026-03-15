-- ============================================
-- VeneLab - Migración v2.5: Categorías dinámicas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  color TEXT NOT NULL DEFAULT '#6C72FF',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public can read categories" ON categories FOR SELECT USING (true);

-- Insertar las 4 categorías existentes
INSERT INTO categories (slug, name, icon, color, sort_order) VALUES
  ('serum', 'Serums & Skincare', '💧', '#A78BFA', 1),
  ('auto', 'Automotriz', '🚗', '#60A5FA', 2),
  ('mascotas', 'Mascotas', '🐾', '#34D399', 3),
  ('hogar', 'Limpieza & Hogar', '🏠', '#FBBF24', 4);
