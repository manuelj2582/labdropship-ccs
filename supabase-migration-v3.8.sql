-- VeneLab - Migración v3.8: Precios por proveedor
CREATE TABLE IF NOT EXISTS supplier_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL DEFAULT 0,
  unit_amount NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'g',
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(material_id, supplier_id)
);

ALTER TABLE supplier_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access" ON supplier_prices FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_supplier_prices_material ON supplier_prices(material_id);

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
