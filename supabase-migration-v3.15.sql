-- VeneLab - Migración v3.15: Imágenes de productos

-- Agregar columna image_url a products
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Agregar columna image_url a formulas (imagen principal de la fórmula)
ALTER TABLE formulas ADD COLUMN IF NOT EXISTS image_url TEXT;

-- IMPORTANTE: Crear el bucket manualmente en Supabase Dashboard:
-- 1. Ve a Storage en el sidebar
-- 2. Click "New Bucket"
-- 3. Nombre: "product-images"
-- 4. Marca "Public bucket" = ON
-- 5. Click "Create bucket"
-- 
-- Luego crea esta policy para permitir uploads:
-- Ve a Storage > product-images > Policies > New Policy > "Custom"
-- 
-- Policy 1 - SELECT (public read):
-- Name: "Public read"
-- Operation: SELECT
-- Target roles: (dejar vacío = todos)
-- USING: true
--
-- Policy 2 - INSERT (auth upload):
-- Name: "Auth upload"  
-- Operation: INSERT
-- Target roles: authenticated
-- WITH CHECK: true
--
-- Policy 3 - DELETE (auth delete):
-- Name: "Auth delete"
-- Operation: DELETE
-- Target roles: authenticated
-- USING: true
