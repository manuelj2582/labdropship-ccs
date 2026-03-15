-- ============================================
-- LabDropship - LIMPIAR TODA LA DATA
-- ⚠️ CUIDADO: Esto borra TODOS los datos
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================

-- Borrar en orden correcto (por foreign keys)
DELETE FROM production_log_materials;
DELETE FROM production_log;
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM formula_ingredients;
DELETE FROM formulas;
DELETE FROM products;
DELETE FROM raw_materials;
DELETE FROM clients;
DELETE FROM suppliers;
DELETE FROM activity_log;

-- Verificar que todo está vacío
SELECT 'suppliers' as tabla, count(*) from suppliers
UNION ALL SELECT 'raw_materials', count(*) from raw_materials
UNION ALL SELECT 'formulas', count(*) from formulas
UNION ALL SELECT 'formula_ingredients', count(*) from formula_ingredients
UNION ALL SELECT 'products', count(*) from products
UNION ALL SELECT 'clients', count(*) from clients
UNION ALL SELECT 'sales', count(*) from sales
UNION ALL SELECT 'sale_items', count(*) from sale_items
UNION ALL SELECT 'production_log', count(*) from production_log
UNION ALL SELECT 'activity_log', count(*) from activity_log;
