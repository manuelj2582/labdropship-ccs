-- ============================================
-- LabDropship CCS - Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Habilitar Row Level Security en todas las tablas
-- 2. Crear tablas
-- 3. Crear políticas RLS
-- 4. Insertar datos iniciales

-- ============================================
-- TABLAS
-- ============================================

-- Proveedores
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rif TEXT,
  contact TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Materias Primas
CREATE TABLE raw_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'g',
  stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fórmulas
CREATE TABLE formulas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  yield_amount NUMERIC NOT NULL DEFAULT 0,
  yield_unit TEXT NOT NULL DEFAULT 'ml',
  sale_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ingredientes de Fórmulas
CREATE TABLE formula_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  formula_id UUID NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0
);

-- Productos Terminados
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  formula_id UUID REFERENCES formulas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Clientes Mayoristas
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rif TEXT,
  contact TEXT,
  email TEXT,
  client_type TEXT NOT NULL DEFAULT 'Nuevo',
  credit_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ventas (Pedidos al Mayor)
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_num TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_rif TEXT,
  client_contact TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente',
  payment_method TEXT NOT NULL DEFAULT 'Transferencia',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Items de Venta
CREATE TABLE sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0
);

-- Historial de Producción
CREATE TABLE production_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  formula_id UUID REFERENCES formulas(id) ON DELETE SET NULL,
  formula_name TEXT NOT NULL,
  batches INTEGER NOT NULL DEFAULT 1,
  total_yield TEXT,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  produced_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  produced_by_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Items consumidos en producción (log detallado)
CREATE TABLE production_log_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  production_log_id UUID NOT NULL REFERENCES production_log(id) ON DELETE CASCADE,
  material_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  material_name TEXT NOT NULL,
  amount_used NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL
);

-- ============================================
-- FUNCIONES HELPER
-- ============================================

-- Auto-update de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_raw_materials_updated BEFORE UPDATE ON raw_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_formulas_updated BEFORE UPDATE ON formulas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para generar número de factura
CREATE OR REPLACE FUNCTION next_invoice_num()
RETURNS TEXT AS $$
DECLARE
  last_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_num FROM '[0-9]+$') AS INTEGER)), 0)
  INTO last_num FROM sales;
  RETURN 'FAC-' || LPAD((last_num + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_log_materials ENABLE ROW LEVEL SECURITY;

-- Políticas: usuarios autenticados tienen acceso total
-- (todos los 2-5 usuarios del lab comparten los mismos datos)
CREATE POLICY "Auth users full access" ON suppliers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON raw_materials FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON formulas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON formula_ingredients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON clients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON sales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON sale_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON production_log FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON production_log_materials FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Proveedores
INSERT INTO suppliers (id, name, rif, contact, email, address) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'QuimVen C.A.', 'J-12345678-9', '+58 212-555-0101', 'ventas@quimven.com', 'Zona Industrial La Yaguara, Caracas'),
  ('a1000000-0000-0000-0000-000000000002', 'BioInsumos Venezuela', 'J-98765432-1', '+58 212-555-0202', 'pedidos@bioinsumos.com', 'Los Ruices, Caracas'),
  ('a1000000-0000-0000-0000-000000000003', 'AutoChem Importadora', 'J-45678901-2', '+58 212-555-0303', 'info@autochem.com', 'La California, Caracas'),
  ('a1000000-0000-0000-0000-000000000004', 'AromaVzla', 'J-11223344-5', '+58 212-555-0404', 'ventas@aromavzla.com', 'El Marqués, Caracas');

-- Materias Primas
INSERT INTO raw_materials (id, name, unit, stock, min_stock, cost, supplier_id) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Ácido Hialurónico', 'ml', 25000, 5000, 0.85, 'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000002', 'Vitamina C (Ác. Ascórbico)', 'g', 15000, 3000, 0.12, 'a1000000-0000-0000-0000-000000000002'),
  ('b1000000-0000-0000-0000-000000000003', 'Glicerina Vegetal', 'L', 200, 40, 4.50, 'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000004', 'Cera de Carnauba', 'g', 40000, 8000, 0.08, 'a1000000-0000-0000-0000-000000000003'),
  ('b1000000-0000-0000-0000-000000000005', 'Aceite de Neem', 'ml', 10000, 2500, 0.35, 'a1000000-0000-0000-0000-000000000002'),
  ('b1000000-0000-0000-0000-000000000006', 'Bicarbonato de Sodio', 'kg', 120, 25, 2.00, 'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000007', 'Fragancia Lavanda', 'ml', 15000, 3000, 0.22, 'a1000000-0000-0000-0000-000000000004'),
  ('b1000000-0000-0000-0000-000000000008', 'Niacinamida', 'g', 8000, 2000, 0.45, 'a1000000-0000-0000-0000-000000000002'),
  ('b1000000-0000-0000-0000-000000000009', 'Alcohol Isopropílico', 'L', 80, 20, 3.20, 'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000010', 'Aceite de Coco Fraccionado', 'L', 60, 15, 6.80, 'a1000000-0000-0000-0000-000000000002');

-- Fórmulas
INSERT INTO formulas (id, name, category, yield_amount, yield_unit, sale_price) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Serum Vitamina C 20%', 'serum', 30, 'ml', 2.80),
  ('c1000000-0000-0000-0000-000000000002', 'Serum Niacinamida 10%', 'serum', 30, 'ml', 2.50),
  ('c1000000-0000-0000-0000-000000000003', 'Cera Protectora Auto Premium', 'auto', 250, 'g', 1.80),
  ('c1000000-0000-0000-0000-000000000004', 'Limpiador de Tablero Auto', 'auto', 500, 'ml', 1.50),
  ('c1000000-0000-0000-0000-000000000005', 'Spray Anti-Pulgas Natural', 'mascotas', 500, 'ml', 1.40),
  ('c1000000-0000-0000-0000-000000000006', 'Shampoo Mascotas Avena', 'mascotas', 350, 'ml', 1.60),
  ('c1000000-0000-0000-0000-000000000007', 'Limpiador Multiuso Lavanda', 'hogar', 1000, 'ml', 0.90),
  ('c1000000-0000-0000-0000-000000000008', 'Desengrasante Industrial', 'hogar', 1000, 'ml', 1.10);

-- Ingredientes de Fórmulas
INSERT INTO formula_ingredients (formula_id, material_id, amount) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 6),
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 0.02),
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 5),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000008', 3),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 0.02),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 4),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004', 200),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 0.03),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000009', 0.1),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', 0.05),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000007', 10),
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005', 100),
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000007', 50),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000010', 0.05),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000003', 0.08),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000007', 15),
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000006', 0.05),
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000007', 30),
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000003', 0.01),
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000006', 0.08),
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000009', 0.05);

-- Productos
INSERT INTO products (id, formula_id, name, category, stock, price) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Serum Vitamina C 20%', 'serum', 480, 2.80),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Serum Niacinamida 10%', 'serum', 360, 2.50),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'Cera Protectora Auto Premium', 'auto', 200, 1.80),
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 'Limpiador de Tablero Auto', 'auto', 150, 1.50),
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005', 'Spray Anti-Pulgas Natural', 'mascotas', 300, 1.40),
  ('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000006', 'Shampoo Mascotas Avena', 'mascotas', 240, 1.60),
  ('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000007', 'Limpiador Multiuso Lavanda', 'hogar', 500, 0.90),
  ('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000008', 'Desengrasante Industrial', 'hogar', 400, 1.10);

-- Clientes Mayoristas
INSERT INTO clients (id, name, rif, contact, email, client_type, credit_days) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'DropBeauty VE', 'J-40123456-7', '+58 412-111-2222', 'compras@dropbeauty.com', 'Premium', 15),
  ('e1000000-0000-0000-0000-000000000002', 'AutoShine Dropship', 'J-41234567-8', '+58 414-333-4444', 'orders@autoshine.com', 'Regular', 0),
  ('e1000000-0000-0000-0000-000000000003', 'PetWorld Express', 'J-42345678-9', '+58 416-555-6666', 'pedidos@petworld.com', 'Regular', 0),
  ('e1000000-0000-0000-0000-000000000004', 'CleanMax Distribuidora', 'J-43456789-0', '+58 424-777-8888', 'compras@cleanmax.com', 'Premium', 30),
  ('e1000000-0000-0000-0000-000000000005', 'TodoHogar Drop', 'J-44567890-1', '+58 412-999-0000', 'info@todohogar.com', 'Nuevo', 0);

-- Ventas de ejemplo
INSERT INTO sales (id, invoice_num, date, client_id, client_name, client_rif, client_contact, status, payment_method, notes) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'FAC-001', '2026-03-08', 'e1000000-0000-0000-0000-000000000001', 'DropBeauty VE', 'J-40123456-7', '+58 412-111-2222', 'completada', 'Transferencia', 'Entrega en Chacao'),
  ('f1000000-0000-0000-0000-000000000002', 'FAC-002', '2026-03-09', 'e1000000-0000-0000-0000-000000000002', 'AutoShine Dropship', 'J-41234567-8', '+58 414-333-4444', 'completada', 'Zelle', ''),
  ('f1000000-0000-0000-0000-000000000003', 'FAC-003', '2026-03-10', 'e1000000-0000-0000-0000-000000000003', 'PetWorld Express', 'J-42345678-9', '+58 416-555-6666', 'enviada', 'Pago Móvil', 'Envío por MRW a Valencia'),
  ('f1000000-0000-0000-0000-000000000004', 'FAC-004', '2026-03-11', 'e1000000-0000-0000-0000-000000000004', 'CleanMax Distribuidora', 'J-43456789-0', '+58 424-777-8888', 'pendiente', 'Crédito 30d', 'Cliente recurrente - descuento 5%'),
  ('f1000000-0000-0000-0000-000000000005', 'FAC-005', '2026-03-13', 'e1000000-0000-0000-0000-000000000001', 'DropBeauty VE', 'J-40123456-7', '+58 412-111-2222', 'pendiente', 'Transferencia', 'Pedido grande - precio especial');

INSERT INTO sale_items (sale_id, product_id, qty, unit_price) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 100, 2.80),
  ('f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 80, 2.50),
  ('f1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000003', 50, 1.80),
  ('f1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000004', 60, 1.50),
  ('f1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000005', 120, 1.40),
  ('f1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000006', 80, 1.60),
  ('f1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000007', 200, 0.90),
  ('f1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000008', 150, 1.10),
  ('f1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 200, 2.70),
  ('f1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000002', 150, 2.40);
