-- VeneLab - Migración v3.19: Historial de compras con promedio ponderado
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity NUMERIC NOT NULL,
  purchase_unit TEXT NOT NULL DEFAULT 'unidad',
  quantity_base NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access" ON purchases FOR ALL USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_purchases_material ON purchases(material_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date DESC);
