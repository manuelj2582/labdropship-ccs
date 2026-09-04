-- ============================================
-- VeneLab (LabDropship CCS) - Migración v3.20
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- 1. Cierra la lectura pública de fórmulas e ingredientes (recetas expuestas por v2.2)
-- 2. Aplica los roles de user_roles en RLS (antes: cualquier usuario autenticado = acceso total)
-- 3. Crea la tabla leads para la captura del stand (/ecom), con INSERT anónimo
-- ============================================

-- ---------- 0. Bootstrap de roles ----------
-- Si la tabla user_roles está vacía, todos los usuarios existentes pasan a admin
-- (evita quedar bloqueado al activar RLS por rol).
INSERT INTO user_roles (user_id, email, role, name)
SELECT id, email, 'admin', COALESCE(raw_user_meta_data->>'name', email)
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM user_roles)
ON CONFLICT (user_id) DO NOTHING;

-- Rol del usuario actual. Sin fila → 'viewer'.
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role FROM user_roles WHERE user_id = auth.uid()), 'viewer');
$$;

CREATE OR REPLACE FUNCTION public.app_role_in(VARIADIC roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND public.app_role() = ANY(roles);
$$;

-- ---------- 1. Quitar políticas anteriores ----------
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('suppliers','raw_materials','formulas','formula_ingredients','products','clients','sales','sale_items',
                        'production_log','production_log_materials','categories','presentations','supplier_prices','purchases',
                        'cost_config','user_roles','activity_log')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- ---------- 2. Políticas por rol ----------
-- Catálogo público: solo productos, categorías y presentaciones.
CREATE POLICY "public read products"      ON products      FOR SELECT USING (true);
CREATE POLICY "public read categories"    ON categories    FOR SELECT USING (true);
CREATE POLICY "public read presentations" ON presentations FOR SELECT USING (true);

CREATE POLICY "staff write products"      ON products      FOR ALL USING (app_role_in('admin','manager','operator')) WITH CHECK (app_role_in('admin','manager','operator'));
CREATE POLICY "staff write categories"    ON categories    FOR ALL USING (app_role_in('admin','manager'))            WITH CHECK (app_role_in('admin','manager'));
CREATE POLICY "staff write presentations" ON presentations FOR ALL USING (app_role_in('admin','manager','operator')) WITH CHECK (app_role_in('admin','manager','operator'));

-- Recetas, inventario, compras, producción, proveedores, costos: solo producción y dirección.
CREATE POLICY "prod read formulas"    ON formulas            FOR SELECT USING (app_role_in('admin','manager','operator'));
CREATE POLICY "prod write formulas"   ON formulas            FOR ALL    USING (app_role_in('admin','manager','operator')) WITH CHECK (app_role_in('admin','manager','operator'));
CREATE POLICY "prod read ingredients" ON formula_ingredients FOR SELECT USING (app_role_in('admin','manager','operator'));
CREATE POLICY "prod write ingredients"ON formula_ingredients FOR ALL    USING (app_role_in('admin','manager','operator')) WITH CHECK (app_role_in('admin','manager','operator'));
CREATE POLICY "prod all raw_materials" ON raw_materials      FOR ALL    USING (app_role_in('admin','manager','operator')) WITH CHECK (app_role_in('admin','manager','operator'));
CREATE POLICY "prod all purchases"    ON purchases           FOR ALL    USING (app_role_in('admin','manager','operator')) WITH CHECK (app_role_in('admin','manager','operator'));
CREATE POLICY "prod all production_log" ON production_log    FOR ALL    USING (app_role_in('admin','manager','operator','viewer')) WITH CHECK (app_role_in('admin','manager','operator'));
CREATE POLICY "prod all production_log_materials" ON production_log_materials FOR ALL USING (app_role_in('admin','manager','operator')) WITH CHECK (app_role_in('admin','manager','operator'));
CREATE POLICY "prod all suppliers"    ON suppliers           FOR ALL    USING (app_role_in('admin','manager','operator')) WITH CHECK (app_role_in('admin','manager','operator'));
CREATE POLICY "prod all supplier_prices" ON supplier_prices  FOR ALL    USING (app_role_in('admin','manager','operator')) WITH CHECK (app_role_in('admin','manager','operator'));
CREATE POLICY "mgmt all cost_config"  ON cost_config         FOR ALL    USING (app_role_in('admin','manager'))            WITH CHECK (app_role_in('admin','manager'));

-- Clientes y ventas: vendedor puede crear/editar, solo dirección borra, visor solo lee.
CREATE POLICY "read clients"   ON clients    FOR SELECT USING (app_role_in('admin','manager','operator','sales','viewer'));
CREATE POLICY "insert clients" ON clients    FOR INSERT WITH CHECK (app_role_in('admin','manager','operator','sales'));
CREATE POLICY "update clients" ON clients    FOR UPDATE USING (app_role_in('admin','manager','operator','sales'));
CREATE POLICY "delete clients" ON clients    FOR DELETE USING (app_role_in('admin','manager'));
CREATE POLICY "read sales"     ON sales      FOR SELECT USING (app_role_in('admin','manager','operator','sales','viewer'));
CREATE POLICY "insert sales"   ON sales      FOR INSERT WITH CHECK (app_role_in('admin','manager','operator','sales'));
CREATE POLICY "update sales"   ON sales      FOR UPDATE USING (app_role_in('admin','manager','operator','sales'));
CREATE POLICY "delete sales"   ON sales      FOR DELETE USING (app_role_in('admin','manager'));
CREATE POLICY "read sale_items"   ON sale_items FOR SELECT USING (app_role_in('admin','manager','operator','sales','viewer'));
CREATE POLICY "insert sale_items" ON sale_items FOR INSERT WITH CHECK (app_role_in('admin','manager','operator','sales'));
CREATE POLICY "delete sale_items" ON sale_items FOR DELETE USING (app_role_in('admin','manager'));

-- Roles: cada uno lee el suyo; solo admin administra.
CREATE POLICY "read own role"  ON user_roles FOR SELECT USING (auth.uid() = user_id OR app_role_in('admin'));
CREATE POLICY "admin manage roles" ON user_roles FOR ALL USING (app_role_in('admin')) WITH CHECK (app_role_in('admin'));

-- Log de actividad: todos escriben, dirección lee.
CREATE POLICY "insert activity" ON activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "read activity"   ON activity_log FOR SELECT USING (app_role_in('admin','manager'));

-- ---------- 3. Leads del stand ----------
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'ecom2026',
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  instagram TEXT,
  sells TEXT,                 -- stock | dropshipping | arrancando | curioso
  channels TEXT[] DEFAULT '{}',
  lines TEXT[] DEFAULT '{}',
  mode TEXT,                  -- mayor | despacho | ambas
  wants_landing BOOLEAN DEFAULT false,
  lead_type TEXT,             -- A/B/C/D/E (lo asigna el encargado)
  status TEXT NOT NULL DEFAULT 'nuevo',
  notes TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_whatsapp_idx ON leads (whatsapp);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public insert leads" ON leads;
DROP POLICY IF EXISTS "staff read leads" ON leads;
DROP POLICY IF EXISTS "staff update leads" ON leads;
DROP POLICY IF EXISTS "mgmt delete leads" ON leads;
-- Cualquiera (anon) puede registrarse desde /ecom; nadie anónimo puede leer.
CREATE POLICY "public insert leads" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "staff read leads"    ON leads FOR SELECT USING (app_role_in('admin','manager','operator','sales','viewer'));
CREATE POLICY "staff update leads"  ON leads FOR UPDATE USING (app_role_in('admin','manager','operator','sales'));
CREATE POLICY "mgmt delete leads"   ON leads FOR DELETE USING (app_role_in('admin','manager'));

-- ---------- Verificación ----------
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY 1,2;
-- SELECT public.app_role();
