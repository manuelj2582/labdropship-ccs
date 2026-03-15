import { supabase } from './supabase';

// ── Auth ──
export const auth = {
  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getUser: () => supabase.auth.getUser(),
  onAuthChange: (cb) => supabase.auth.onAuthStateChange(cb),
};

// ── Suppliers ──
export const suppliers = {
  getAll: async () => {
    const { data, error } = await supabase.from('suppliers').select('*').order('name');
    if (error) throw error;
    return data;
  },
  create: async (supplier) => {
    const { data, error } = await supabase.from('suppliers').insert(supplier).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase.from('suppliers').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Raw Materials ──
export const rawMaterials = {
  getAll: async () => {
    const { data, error } = await supabase.from('raw_materials').select('*, supplier:suppliers(id, name)').order('name');
    if (error) throw error;
    return data;
  },
  create: async (material) => {
    const { data, error } = await supabase.from('raw_materials').insert(material).select('*, supplier:suppliers(id, name)').single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase.from('raw_materials').update(updates).eq('id', id).select('*, supplier:suppliers(id, name)').single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('raw_materials').delete().eq('id', id);
    if (error) throw error;
  },
  updateStock: async (id, newStock) => {
    const { error } = await supabase.from('raw_materials').update({ stock: newStock }).eq('id', id);
    if (error) throw error;
  },
};

// ── Formulas ──
export const formulas = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('formulas')
      .select('*, ingredients:formula_ingredients(id, material_id, amount)')
      .order('name');
    if (error) throw error;
    return data;
  },
  create: async (formula, ingredients) => {
    const { data: f, error: fErr } = await supabase.from('formulas').insert({
      name: formula.name, category: formula.category,
      yield_amount: formula.yieldAmount, yield_unit: formula.yieldUnit,
      sale_price: formula.salePrice,
    }).select().single();
    if (fErr) throw fErr;

    if (ingredients.length > 0) {
      const { error: iErr } = await supabase.from('formula_ingredients').insert(
        ingredients.map(i => ({ formula_id: f.id, material_id: i.materialId, amount: i.amount }))
      );
      if (iErr) throw iErr;
    }
    return f;
  },
  delete: async (id) => {
    const { error } = await supabase.from('formulas').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Products ──
export const products = {
  getAll: async () => {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) throw error;
    return data;
  },
  create: async (product) => {
    const { data, error } = await supabase.from('products').insert(product).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },
  updateStock: async (id, newStock) => {
    const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', id);
    if (error) throw error;
  },
};

// ── Clients ──
export const clients = {
  getAll: async () => {
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (error) throw error;
    return data;
  },
  create: async (client) => {
    const { data, error } = await supabase.from('clients').insert(client).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Sales ──
export const sales = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(id, product_id, qty, unit_price)')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
  create: async (sale, items) => {
    // Get next invoice number
    const { data: invData } = await supabase.rpc('next_invoice_num');
    const invoiceNum = invData || 'FAC-???';

    const { data: s, error: sErr } = await supabase.from('sales').insert({
      invoice_num: invoiceNum,
      date: sale.date,
      client_id: sale.clientId,
      client_name: sale.clientName,
      client_rif: sale.clientRif,
      client_contact: sale.clientContact,
      status: 'pendiente',
      payment_method: sale.paymentMethod,
      notes: sale.notes,
    }).select().single();
    if (sErr) throw sErr;

    const { error: iErr } = await supabase.from('sale_items').insert(
      items.map(i => ({ sale_id: s.id, product_id: i.productId, qty: i.qty, unit_price: i.unitPrice }))
    );
    if (iErr) throw iErr;

    // Decrease product stock
    for (const item of items) {
      const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
      if (prod) {
        await supabase.from('products').update({ stock: Math.max(0, prod.stock - item.qty) }).eq('id', item.productId);
      }
    }

    return { ...s, items };
  },
  updateStatus: async (id, status) => {
    const { error } = await supabase.from('sales').update({ status }).eq('id', id);
    if (error) throw error;
  },
  delete: async (id) => {
    // Get sale items to restore stock
    const { data: sale } = await supabase.from('sales').select('*, items:sale_items(product_id, qty)').eq('id', id).single();
    if (sale) {
      for (const item of sale.items) {
        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
        if (prod) {
          await supabase.from('products').update({ stock: prod.stock + item.qty }).eq('id', item.product_id);
        }
      }
    }
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Production Log ──
export const productionLog = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('production_log')
      .select('*, materials:production_log_materials(id, material_name, amount_used, unit)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  create: async (log, materialsUsed) => {
    const { data: entry, error: lErr } = await supabase.from('production_log').insert({
      formula_id: log.formulaId,
      formula_name: log.formulaName,
      batches: log.batches,
      total_yield: log.totalYield,
      total_cost: log.totalCost,
      produced_by: log.producedBy,
      produced_by_email: log.producedByEmail,
      notes: log.notes,
    }).select().single();
    if (lErr) throw lErr;

    if (materialsUsed.length > 0) {
      const { error: mErr } = await supabase.from('production_log_materials').insert(
        materialsUsed.map(m => ({
          production_log_id: entry.id,
          material_id: m.materialId,
          material_name: m.materialName,
          amount_used: m.amountUsed,
          unit: m.unit,
        }))
      );
      if (mErr) throw mErr;
    }

    return entry;
  },
};

// ── Produce (transaction-like) ──
export const produce = async (formula, batches, rawMats, user) => {
  // 1. Decrease raw materials
  const materialsUsed = [];
  for (const ing of formula.ingredients) {
    const mat = rawMats.find(m => m.id === ing.material_id);
    if (!mat) throw new Error(`Material no encontrado: ${ing.material_id}`);
    const needed = ing.amount * batches;
    if (mat.stock < needed) throw new Error(`Stock insuficiente de ${mat.name}`);
    await rawMaterials.updateStock(mat.id, mat.stock - needed);
    materialsUsed.push({
      materialId: mat.id,
      materialName: mat.name,
      amountUsed: needed,
      unit: mat.unit,
    });
  }

  // 2. Increase product stock
  const { data: prods } = await supabase.from('products').select('*').eq('formula_id', formula.id);
  if (prods && prods.length > 0) {
    const prod = prods[0];
    await products.updateStock(prod.id, prod.stock + batches);
  }

  // 3. Log production
  await productionLog.create({
    formulaId: formula.id,
    formulaName: formula.name,
    batches,
    totalYield: `${formula.yield_amount * batches} ${formula.yield_unit}`,
    totalCost: formula._productionCost * batches,
    producedBy: user?.id,
    producedByEmail: user?.email,
    notes: '',
  }, materialsUsed);
};
