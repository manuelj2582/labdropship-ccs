-- VeneLab - Migración v3.17: Configuración de costos y precios
CREATE TABLE IF NOT EXISTS cost_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  rent NUMERIC DEFAULT 0,
  utilities NUMERIC DEFAULT 0,
  salaries NUMERIC DEFAULT 0,
  other_fixed NUMERIC DEFAULT 0,
  other_fixed_label TEXT DEFAULT 'Otros',
  monthly_units_estimate INTEGER DEFAULT 500,
  include_fixed_costs BOOLEAN DEFAULT true,
  default_margin NUMERIC DEFAULT 50,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cost_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users full access" ON cost_config FOR ALL USING (auth.role() = 'authenticated');
