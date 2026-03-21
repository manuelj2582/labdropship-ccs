import { supabase } from './supabase';

// ── Auth ──
export const auth = {
  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getUser: () => supabase.auth.getUser(),
  onAuthChange: (cb) => supabase.auth.onAuthStateChange(cb),
};

// ── Activity Log ──
export const activityLog = {
  log: async (user, action, entityType, entityId, entityName, details = null) => {
    try {
      await supabase.from('activity_log').insert({
        user_id: user?.id, user_email: user?.email || 'sistema',
        action, entity_type: entityType, entity_id: entityId,
        entity_name: entityName, details,
      });
    } catch (e) { console.warn('Activity log error:', e); }
  },
  getAll: async (limit = 100) => {
    const { data, error } = await supabase.from('activity_log')
      .select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  },
  getByEntity: async (entityType, limit = 50) => {
    const { data, error } = await supabase.from('activity_log')
      .select('*').eq('entity_type', entityType)
      .order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  },
};

// ── User Preferences ──
export const preferences = {
  get: async (userId) => {
    const { data } = await supabase.from('user_preferences')
      .select('*').eq('user_id', userId).single();
    return data;
  },
  set: async (userId, prefs) => {
    const { data, error } = await supabase.from('user_preferences')
      .upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    return data;
  },
};

// ── Suppliers ──
export const suppliers = {
  getAll: async () => {
    const { data, error } = await supabase.from('suppliers').select('*').order('name');
    if (error) throw error; return data;
  },
  create: async (supplier, user) => {
    const { data, error } = await supabase.from('suppliers').insert(supplier).select().single();
    if (error) throw error;
    await activityLog.log(user, 'crear', 'proveedor', data.id, data.name);
    return data;
  },
  update: async (id, updates, user) => {
    const { data, error } = await supabase.from('suppliers').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await activityLog.log(user, 'editar', 'proveedor', data.id, data.name, updates);
    return data;
  },
  delete: async (id, name, user) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    await activityLog.log(user, 'eliminar', 'proveedor', id, name);
  },
};

// ── Raw Materials ──
export const rawMaterials = {
  getAll: async () => {
    const { data, error } = await supabase.from('raw_materials').select('*, supplier:suppliers(id, name)').order('name');
    if (error) throw error; return data;
  },
  create: async (material, user) => {
    const { data, error } = await supabase.from('raw_materials').insert(material).select('*, supplier:suppliers(id, name)').single();
    if (error) throw error;
    await activityLog.log(user, 'crear', 'material', data.id, data.name, { stock: material.stock, unit: material.unit });
    return data;
  },
  update: async (id, updates, user) => {
    const { data, error } = await supabase.from('raw_materials').update(updates).eq('id', id).select('*, supplier:suppliers(id, name)').single();
    if (error) throw error;
    await activityLog.log(user, 'editar', 'material', data.id, data.name, updates);
    return data;
  },
  delete: async (id, name, user) => {
    const { error } = await supabase.from('raw_materials').delete().eq('id', id);
    if (error) throw error;
    await activityLog.log(user, 'eliminar', 'material', id, name);
  },
  updateStock: async (id, newStock) => {
    const { error } = await supabase.from('raw_materials').update({ stock: newStock }).eq('id', id);
    if (error) throw error;
  },
};

// ── Formulas ──
export const formulas = {
  getAll: async () => {
    const { data, error } = await supabase.from('formulas')
      .select('*, ingredients:formula_ingredients(id, material_id, amount)').order('name');
    if (error) throw error; return data;
  },
  create: async (formula, ingredients, user) => {
    const { data: f, error: fErr } = await supabase.from('formulas').insert({
      name: formula.name, category: formula.category,
      yield_amount: formula.yieldAmount, yield_unit: formula.yieldUnit,
      base_amount: formula.baseAmount || formula.yieldAmount,
      base_unit: formula.baseUnit || formula.yieldUnit,
      sale_price: formula.salePrice,
    }).select().single();
    if (fErr) throw fErr;
    if (ingredients.length > 0) {
      const { error: iErr } = await supabase.from('formula_ingredients').insert(
        ingredients.map(i => ({ formula_id: f.id, material_id: i.materialId, amount: i.amount }))
      );
      if (iErr) throw iErr;
    }
    await activityLog.log(user, 'crear', 'formula', f.id, f.name, { category: formula.category, ingredients: ingredients.length });
    return f;
  },
  delete: async (id, name, user) => {
    const { error } = await supabase.from('formulas').delete().eq('id', id);
    if (error) throw error;
    await activityLog.log(user, 'eliminar', 'formula', id, name);
  },
  update: async (id, formula, ingredients, user) => {
    const { data: f, error: fErr } = await supabase.from('formulas').update({
      name: formula.name, category: formula.category,
      yield_amount: formula.baseAmount, yield_unit: formula.baseUnit,
      base_amount: formula.baseAmount, base_unit: formula.baseUnit,
      sale_price: formula.salePrice || 0,
    }).eq('id', id).select().single();
    if (fErr) throw fErr;
    // Replace ingredients: delete old, insert new
    await supabase.from('formula_ingredients').delete().eq('formula_id', id);
    if (ingredients.length > 0) {
      const { error: iErr } = await supabase.from('formula_ingredients').insert(
        ingredients.map(i => ({ formula_id: id, material_id: i.materialId, amount: i.amount }))
      );
      if (iErr) throw iErr;
    }
    await activityLog.log(user, 'editar', 'formula', f.id, f.name, { ingredients: ingredients.length });
    return f;
  },
};

// ── Products ──
export const products = {
  getAll: async () => {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) throw error; return data;
  },
  create: async (product, user) => {
    const { data, error } = await supabase.from('products').insert(product).select().single();
    if (error) throw error;
    if (user) await activityLog.log(user, 'crear', 'producto', data.id, data.name);
    return data;
  },
  update: async (id, updates, user) => {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await activityLog.log(user, 'editar', 'producto', data.id, data.name, updates);
    return data;
  },
  delete: async (id, name, user) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    await activityLog.log(user, 'eliminar', 'producto', id, name);
  },
  updateStock: async (id, newStock) => {
    const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', id);
    if (error) throw error;
  },
  uploadImage: async (productId, file) => {
    const ext = file.name.split('.').pop();
    const path = `${productId}.${ext}`;
    // Remove old image if exists
    await supabase.storage.from('product-images').remove([path]);
    // Upload new
    const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
    const imageUrl = urlData.publicUrl + '?t=' + Date.now(); // cache bust
    await supabase.from('products').update({ image_url: imageUrl }).eq('id', productId);
    return imageUrl;
  },
  removeImage: async (productId) => {
    const { data: prod } = await supabase.from('products').select('image_url').eq('id', productId).single();
    if (prod?.image_url) {
      const path = prod.image_url.split('/product-images/')[1]?.split('?')[0];
      if (path) await supabase.storage.from('product-images').remove([path]);
    }
    await supabase.from('products').update({ image_url: null }).eq('id', productId);
  },
};

// ── Clients ──
export const clients = {
  getAll: async () => {
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (error) throw error; return data;
  },
  create: async (client, user) => {
    const { data, error } = await supabase.from('clients').insert(client).select().single();
    if (error) throw error;
    await activityLog.log(user, 'crear', 'cliente', data.id, data.name);
    return data;
  },
  update: async (id, updates, user) => {
    const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await activityLog.log(user, 'editar', 'cliente', data.id, data.name, updates);
    return data;
  },
  delete: async (id, name, user) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    await activityLog.log(user, 'eliminar', 'cliente', id, name);
  },
};

// ── Sales ──
export const sales = {
  getAll: async () => {
    const { data, error } = await supabase.from('sales')
      .select('*, items:sale_items(id, product_id, qty, unit_price)')
      .order('date', { ascending: false });
    if (error) throw error; return data;
  },
  create: async (sale, items, user) => {
    const { data: invData } = await supabase.rpc('next_invoice_num');
    const invoiceNum = invData || 'FAC-???';
    const { data: s, error: sErr } = await supabase.from('sales').insert({
      invoice_num: invoiceNum, date: sale.date, client_id: sale.clientId,
      client_name: sale.clientName, client_rif: sale.clientRif,
      client_contact: sale.clientContact, status: 'pendiente',
      payment_method: sale.paymentMethod, notes: sale.notes,
    }).select().single();
    if (sErr) throw sErr;
    const { error: iErr } = await supabase.from('sale_items').insert(
      items.map(i => ({ sale_id: s.id, product_id: i.productId, qty: i.qty, unit_price: i.unitPrice }))
    );
    if (iErr) throw iErr;
    for (const item of items) {
      const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
      if (prod) await supabase.from('products').update({ stock: Math.max(0, prod.stock - item.qty) }).eq('id', item.productId);
    }
    const total = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
    const totalUnits = items.reduce((s, it) => s + it.qty, 0);
    await activityLog.log(user, 'crear', 'venta', s.id, invoiceNum, { cliente: sale.clientName, total, unidades: totalUnits });
    return { ...s, items };
  },
  updateStatus: async (id, status, invoiceNum, user) => {
    const { error } = await supabase.from('sales').update({ status }).eq('id', id);
    if (error) throw error;
    await activityLog.log(user, 'cambiar_estado', 'venta', id, invoiceNum, { nuevo_estado: status });
  },
  delete: async (id, invoiceNum, user) => {
    const { data: sale } = await supabase.from('sales').select('*, items:sale_items(product_id, qty)').eq('id', id).single();
    if (sale) {
      for (const item of sale.items) {
        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
        if (prod) await supabase.from('products').update({ stock: prod.stock + item.qty }).eq('id', item.product_id);
      }
    }
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) throw error;
    await activityLog.log(user, 'eliminar', 'venta', id, invoiceNum, { stock_restaurado: true });
  },
};

// ── Production Log ──
export const productionLog = {
  getAll: async () => {
    const { data, error } = await supabase.from('production_log')
      .select('*, materials:production_log_materials(id, material_name, amount_used, unit)')
      .order('created_at', { ascending: false });
    if (error) throw error; return data;
  },
  create: async (log, materialsUsed) => {
    const { data: entry, error: lErr } = await supabase.from('production_log').insert({
      formula_id: log.formulaId, formula_name: log.formulaName, batches: log.batches,
      total_yield: log.totalYield, total_cost: log.totalCost,
      produced_by: log.producedBy, produced_by_email: log.producedByEmail, notes: log.notes,
    }).select().single();
    if (lErr) throw lErr;
    if (materialsUsed.length > 0) {
      const { error: mErr } = await supabase.from('production_log_materials').insert(
        materialsUsed.map(m => ({ production_log_id: entry.id, material_id: m.materialId, material_name: m.materialName, amount_used: m.amountUsed, unit: m.unit }))
      );
      if (mErr) throw mErr;
    }
    return entry;
  },
};

// ── Produce ──
export const produce = async (formula, presentation, batches, rawMats, user) => {
  const baseAmt = formula.base_amount || formula.yield_amount || 100;
  const ratio = presentation.amount / baseAmt;
  const materialsUsed = [];

  // 1. Deduct raw materials (proportional to presentation size)
  for (const ing of formula.ingredients) {
    const mat = rawMats.find(m => m.id === ing.material_id);
    if (!mat) throw new Error(`Material no encontrado: ${ing.material_id}`);
    const needed = ing.amount * ratio * batches;
    if (mat.stock < needed) throw new Error(`Stock insuficiente de ${mat.name} (necesitas ${needed.toFixed(2)}, tienes ${mat.stock})`);
    await rawMaterials.updateStock(mat.id, mat.stock - needed);
    materialsUsed.push({ materialId: mat.id, materialName: mat.name, amountUsed: needed, unit: mat.unit });
  }

  // 2. Deduct envase stock
  if (presentation.envase_id) {
    const envase = rawMats.find(m => m.id === presentation.envase_id);
    if (envase) {
      if (envase.stock < batches) throw new Error(`Stock insuficiente de envase "${envase.name}" (necesitas ${batches}, tienes ${envase.stock})`);
      await rawMaterials.updateStock(envase.id, envase.stock - batches);
      materialsUsed.push({ materialId: envase.id, materialName: envase.name, amountUsed: batches, unit: 'unidad' });
    }
  }

  // 3. Add stock to the correct product (by presentation_id)
  const { data: prods } = await supabase.from('products').select('*').eq('presentation_id', presentation.id);
  if (prods && prods.length > 0) {
    await products.updateStock(prods[0].id, prods[0].stock + batches);
  }

  // 4. Calculate cost
  const matCost = formula.ingredients.reduce((s, ing) => {
    const mat = rawMats.find(m => m.id === ing.material_id);
    return s + (mat ? mat.cost * ing.amount * ratio : 0);
  }, 0);
  const envaseCost = presentation.envase?.cost || 0;
  const totalCostPerUnit = matCost + envaseCost;

  // 5. Log
  await productionLog.create({
    formulaId: formula.id, formulaName: `${presentation.name}`,
    batches,
    totalYield: `${batches} uds de ${presentation.amount}${presentation.unit}`,
    totalCost: totalCostPerUnit * batches,
    producedBy: user?.id, producedByEmail: user?.email, notes: '',
  }, materialsUsed);
  await activityLog.log(user, 'producir', 'produccion', presentation.id, presentation.name, { lotes: batches, presentacion: `${presentation.amount}${presentation.unit}` });
};

// ── Categories ──
export const categories = {
  getAll: async () => {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order');
    if (error) throw error;
    return data;
  },
  create: async (category, user) => {
    const { data, error } = await supabase.from('categories').insert(category).select().single();
    if (error) throw error;
    await activityLog.log(user, 'crear', 'categoria', data.id, data.name);
    return data;
  },
  update: async (id, updates, user) => {
    const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await activityLog.log(user, 'editar', 'categoria', data.id, data.name, updates);
    return data;
  },
  delete: async (id, name, user) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    await activityLog.log(user, 'eliminar', 'categoria', id, name);
  },
};

// ── Presentations ──
export const presentations = {
  getAll: async () => {
    const { data, error } = await supabase.from('presentations')
      .select('*, envase:raw_materials(id, name, cost, unit)')
      .order('formula_id').order('sort_order');
    if (error) throw error;
    return data;
  },
  getByFormula: async (formulaId) => {
    const { data, error } = await supabase.from('presentations')
      .select('*, envase:raw_materials(id, name, cost, unit)')
      .eq('formula_id', formulaId).order('sort_order');
    if (error) throw error;
    return data;
  },
  create: async (presentation, user) => {
    const { data, error } = await supabase.from('presentations').insert(presentation).select().single();
    if (error) throw error;
    await activityLog.log(user, 'crear', 'presentacion', data.id, data.name, { amount: presentation.amount, unit: presentation.unit });
    return data;
  },
  update: async (id, updates, user) => {
    const { data, error } = await supabase.from('presentations').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await activityLog.log(user, 'editar', 'presentacion', data.id, data.name, updates);
    return data;
  },
  delete: async (id, name, user) => {
    // Delete associated product first
    await supabase.from('products').delete().eq('presentation_id', id);
    const { error } = await supabase.from('presentations').delete().eq('id', id);
    if (error) throw error;
    await activityLog.log(user, 'eliminar', 'presentacion', id, name);
  },
};

// ── Supplier Prices ──
export const supplierPrices = {
  getAll: async () => {
    const { data, error } = await supabase.from('supplier_prices')
      .select('*, supplier:suppliers(id, name, whatsapp, contact), material:raw_materials(id, name, unit)')
      .order('material_id');
    if (error) throw error;
    return data;
  },
  getByMaterial: async (materialId) => {
    const { data, error } = await supabase.from('supplier_prices')
      .select('*, supplier:suppliers(id, name, whatsapp, contact)')
      .eq('material_id', materialId)
      .order('cost_per_unit');
    if (error) throw error;
    return data;
  },
  upsert: async (entry, user) => {
    const { data, error } = await supabase.from('supplier_prices')
      .upsert({
        material_id: entry.material_id,
        supplier_id: entry.supplier_id,
        price: entry.price,
        unit_amount: entry.unit_amount,
        unit: entry.unit,
        cost_per_unit: entry.unit_amount > 0 ? entry.price / entry.unit_amount : 0,
        notes: entry.notes || null,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'material_id,supplier_id' })
      .select('*, supplier:suppliers(id, name)').single();
    if (error) throw error;
    await activityLog.log(user, 'cotizar', 'precio_proveedor', data.id, `${data.supplier?.name}`, { precio: entry.price, cantidad: entry.unit_amount, unit: entry.unit });
    return data;
  },
  delete: async (id, user) => {
    const { error } = await supabase.from('supplier_prices').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Image Upload ──
export const images = {
  upload: async (file, folder = 'products') => {
    const ext = file.name.split('.').pop();
    const name = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await supabase.storage.from('product-images').upload(name, file, {
      cacheControl: '3600', upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(data.path);
    return urlData.publicUrl;
  },
  delete: async (url) => {
    if (!url) return;
    try {
      const path = url.split('/product-images/')[1];
      if (path) await supabase.storage.from('product-images').remove([path]);
    } catch (e) { console.warn('Error deleting image:', e); }
  },
};

// ── Cost Config ──
export const costConfig = {
  get: async () => {
    const { data, error } = await supabase.from('cost_config').select('*').limit(1).single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  },
  save: async (config) => {
    const { data: existing } = await supabase.from('cost_config').select('id').limit(1).single();
    if (existing) {
      const { data, error } = await supabase.from('cost_config').update({ ...config, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('cost_config').insert(config).select().single();
      if (error) throw error;
      return data;
    }
  },
};
