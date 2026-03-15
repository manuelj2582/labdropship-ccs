import React, { useState, useMemo } from 'react';
import { Card, Button, Modal, ModalActions, Input, Select, CategoryTag } from './UI';
import { UNITS } from '../data/initialData';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Formulas({ data, formulasWithCosts, loadData, showToast, searchQuery, user }) {
  const [modal, setModal] = useState(false);
  const [presModal, setPresModal] = useState(null); // formula id for presentation modal
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', category: '', baseAmount: 100, baseUnit: 'ml',
    yieldAmount: 100, yieldUnit: 'ml', salePrice: 0,
    ingredients: [{ materialId: '', amount: 0 }],
  });
  const [presForm, setPresForm] = useState({ name: '', amount: 0, unit: 'ml', envase_id: '', sale_price: 0, sku: '' });

  const envases = useMemo(() => data.rawMaterials.filter(m => m.material_type === 'envase'), [data.rawMaterials]);
  const materiasPrimas = useMemo(() => data.rawMaterials.filter(m => (m.material_type || 'materia_prima') === 'materia_prima'), [data.rawMaterials]);

  const openAdd = () => {
    setForm({ name: '', category: '', baseAmount: 100, baseUnit: 'ml', yieldAmount: 100, yieldUnit: 'ml', salePrice: 0, ingredients: [{ materialId: '', amount: 0 }] });
    setModal(true);
  };

  const addIng = () => setForm({ ...form, ingredients: [...form.ingredients, { materialId: '', amount: 0 }] });
  const updateIng = (i, k, v) => { const ings = [...form.ingredients]; ings[i] = { ...ings[i], [k]: k === 'amount' ? +v : v }; setForm({ ...form, ingredients: ings }); };
  const removeIng = (i) => setForm({ ...form, ingredients: form.ingredients.filter((_, idx) => idx !== i) });

  // Cost for the base amount
  const baseCost = form.ingredients.reduce((s, ing) => {
    const mat = data.rawMaterials.find(m => m.id === ing.materialId);
    return s + (mat ? mat.cost * ing.amount : 0);
  }, 0);

  const save = async () => {
    if (!form.name || !form.category || form.ingredients.some(i => !i.materialId)) return;
    setSaving(true);
    try {
      await db.formulas.create(form, form.ingredients, user);
      await loadData();
      showToast('Fórmula creada');
      setModal(false);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  // ── Presentations ──
  const openPresModal = (formulaId) => {
    setPresForm({ name: '', amount: 0, unit: 'ml', envase_id: '', sale_price: 0, sku: '' });
    setPresModal(formulaId);
  };

  const savePresentation = async () => {
    if (!presForm.name || !presForm.amount) return;
    setSaving(true);
    try {
      const pres = await db.presentations.create({
        formula_id: presModal,
        name: presForm.name,
        amount: presForm.amount,
        unit: presForm.unit,
        envase_id: presForm.envase_id || null,
        sale_price: presForm.sale_price || 0,
        sku: presForm.sku || null,
      }, user);
      // Auto-create product for this presentation
      const formula = data.formulas.find(f => f.id === presModal);
      await db.products.create({
        formula_id: presModal,
        presentation_id: pres.id,
        name: presForm.name,
        category: formula?.category || '',
        stock: 0,
        price: presForm.sale_price || 0,
      }, user);
      await loadData();
      showToast(`Presentación "${presForm.name}" creada`);
      setPresModal(null);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const removePresentation = async (pres) => {
    try {
      await db.presentations.delete(pres.id, pres.name, user);
      await loadData();
      showToast('Presentación eliminada');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  // Calculate proportional cost for a presentation
  const getPresCost = (formula, presAmount) => {
    const baseAmt = formula.base_amount || formula.yield_amount || 100;
    const ratio = presAmount / baseAmt;
    const ingredientCost = (formula.ingredients || []).reduce((s, ing) => {
      const mat = data.rawMaterials.find(m => m.id === ing.material_id);
      return s + (mat ? mat.cost * ing.amount * ratio : 0);
    }, 0);
    return ingredientCost;
  };

  let filtered = filter === 'all' ? formulasWithCosts : formulasWithCosts.filter(f => f.category === filter);
  if (searchQuery) filtered = filtered.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Button variant={filter === 'all' ? 'primary' : 'muted'} size="sm" onClick={() => setFilter('all')}>Todas</Button>
          {(data.categories || []).map(c => (
            <Button key={c.slug} variant={filter === c.slug ? 'primary' : 'muted'} size="sm" onClick={() => setFilter(c.slug)}>{c.icon} {c.name}</Button>
          ))}
        </div>
        <Button onClick={openAdd}>+ Nueva Fórmula</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {filtered.map(f => {
          const presentations = (data.presentations || []).filter(p => p.formula_id === f.id);
          const baseAmt = f.base_amount || f.yield_amount || 100;
          return (
            <Card key={f.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <CategoryTag category={f.category} categories={data.categories || []} />
                  <h4 style={{ margin: '10px 0 4px', fontSize: 18, fontWeight: 700 }}>{f.name}</h4>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    Fórmula base para <strong style={{ color: 'var(--accent)' }}>{baseAmt} {f.base_unit || f.yield_unit}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>COSTO BASE ({baseAmt}{f.base_unit || f.yield_unit})</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--warning)' }}>{fmt(f._productionCost)}</div>
                </div>
              </div>

              {/* Ingredients */}
              <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
                  INGREDIENTES (para {baseAmt}{f.base_unit || f.yield_unit})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
                  {(f.ingredients || []).map((ing, i) => {
                    const mat = data.rawMaterials.find(m => m.id === ing.material_id);
                    const pct = baseAmt > 0 ? ((ing.amount / baseAmt) * 100).toFixed(1) : 0;
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: 'var(--text-secondary)' }}>
                        <span>{mat?.name || '—'}</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          {ing.amount} {mat?.unit} <span style={{ color: 'var(--text-dim)' }}>({pct}%)</span> · {fmt(mat ? mat.cost * ing.amount : 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Presentations */}
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em' }}>
                    PRESENTACIONES ({presentations.length})
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openPresModal(f.id)}>+ Presentación</Button>
                </div>

                {presentations.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
                    Sin presentaciones — agrega una para definir tamaños y precios
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {presentations.map(pres => {
                      const matCost = getPresCost(f, pres.amount);
                      const envaseCost = pres.envase?.cost || 0;
                      const totalCost = matCost + envaseCost;
                      const margin = pres.sale_price > 0 ? ((pres.sale_price - totalCost) / pres.sale_price * 100) : 0;
                      return (
                        <div key={pres.id} style={{
                          background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                          padding: 14, border: '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{pres.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                {pres.amount}{pres.unit} {pres.sku && `· SKU: ${pres.sku}`}
                              </div>
                            </div>
                            <Button variant="danger" size="sm" onClick={() => removePresentation(pres)}>✕</Button>
                          </div>
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-dim)' }}>Materia prima</span>
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{fmt(matCost)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-dim)' }}>Envase</span>
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{pres.envase?.name || '—'} ({fmt(envaseCost)})</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 2 }}>
                              <span style={{ color: 'var(--warning)' }}>Costo total</span>
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{fmt(totalCost)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                              <span style={{ color: 'var(--accent)' }}>Precio mayor</span>
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{fmt(pres.sale_price)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-dim)' }}>Margen</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: margin > 50 ? 'var(--success)' : margin > 20 ? 'var(--warning)' : 'var(--danger)' }}>{margin.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* New Formula Modal */}
      {modal && (
        <Modal title="Nueva Fórmula" onClose={() => setModal(false)} wide>
          <Input label="Nombre de la Fórmula" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Ej: Serum Vitamina C" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Select label="Categoría" value={form.category}
              options={(data.categories || []).map(c => ({ value: c.slug, label: c.icon + ' ' + c.name }))}
              onChange={v => setForm({ ...form, category: v })} placeholder="Seleccionar..." />
            <Input label="Cantidad base" type="number" value={form.baseAmount}
              onChange={v => { const val = +v; setForm({ ...form, baseAmount: val, yieldAmount: val }); }}
              placeholder="100" />
            <Select label="Unidad base" value={form.baseUnit} options={UNITS}
              onChange={v => setForm({ ...form, baseUnit: v, yieldUnit: v })} />
          </div>
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 8,
            background: 'var(--accent-bg)', border: '1px solid rgba(108,114,255,0.15)',
            fontSize: 12, color: 'var(--accent)',
          }}>
            💡 Ingresa las cantidades de ingredientes para preparar <strong>{form.baseAmount || '?'}{form.baseUnit}</strong> de producto. El sistema calcula proporciones automáticamente para cada presentación.
          </div>

          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 8 }}>Ingredientes (materia prima)</label>
            {form.ingredients.map((ing, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, marginBottom: 8 }}>
                <Select value={ing.materialId}
                  options={materiasPrimas.map(m => ({ value: m.id, label: `${m.name} (${m.unit})` }))}
                  onChange={v => updateIng(i, 'materialId', v)} placeholder="Materia prima..." />
                <Input type="number" value={ing.amount} onChange={v => updateIng(i, 'amount', v)} step="0.01" placeholder="Cantidad" />
                <Button variant="danger" size="sm" onClick={() => removeIng(i)}>✕</Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addIng}>+ Ingrediente</Button>
          </div>

          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Costo base ({form.baseAmount}{form.baseUnit}): <strong style={{ color: 'var(--warning)' }}>{fmt(baseCost)}</strong>
              {form.baseAmount > 0 && <span style={{ marginLeft: 12 }}>Costo por ml/g: <strong style={{ color: 'var(--text-primary)' }}>{fmt(baseCost / form.baseAmount)}</strong></span>}
            </div>
          </div>

          <ModalActions onCancel={() => setModal(false)} onConfirm={save} confirmLabel={saving ? 'Guardando...' : 'Crear Fórmula'} confirmDisabled={saving} />
        </Modal>
      )}

      {/* New Presentation Modal */}
      {presModal && (
        <Modal title="Nueva Presentación" onClose={() => setPresModal(null)}>
          <Input label="Nombre de la presentación" value={presForm.name} onChange={v => setPresForm({ ...presForm, name: v })}
            placeholder="Ej: Serum Vit C 30ml" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Cantidad del producto" type="number" value={presForm.amount}
              onChange={v => setPresForm({ ...presForm, amount: +v })} placeholder="30" />
            <Select label="Unidad" value={presForm.unit} options={UNITS}
              onChange={v => setPresForm({ ...presForm, unit: v })} />
          </div>
          <Select label="Envase" value={presForm.envase_id}
            options={envases.map(e => ({ value: e.id, label: `${e.name} (${fmt(e.cost)})` }))}
            onChange={v => setPresForm({ ...presForm, envase_id: v })} placeholder="Seleccionar envase..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Precio al Mayor ($)" type="number" value={presForm.sale_price}
              onChange={v => setPresForm({ ...presForm, sale_price: +v })} step="0.01" />
            <Input label="SKU (opcional)" value={presForm.sku}
              onChange={v => setPresForm({ ...presForm, sku: v })} placeholder="VEN-SC30" />
          </div>

          {/* Cost preview */}
          {presForm.amount > 0 && (() => {
            const formula = formulasWithCosts.find(f => f.id === presModal);
            if (!formula) return null;
            const matCost = getPresCost(formula, presForm.amount);
            const envase = envases.find(e => e.id === presForm.envase_id);
            const envaseCost = envase?.cost || 0;
            const totalCost = matCost + envaseCost;
            const margin = presForm.sale_price > 0 ? ((presForm.sale_price - totalCost) / presForm.sale_price * 100) : 0;
            return (
              <div style={{ padding: 14, borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border)', marginTop: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Materia prima ({presForm.amount}{presForm.unit})</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(matCost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Envase</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{envase ? `${envase.name} (${fmt(envaseCost)})` : '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
                  <span style={{ color: 'var(--warning)' }}>Costo total</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{fmt(totalCost)}</span>
                </div>
                {presForm.sale_price > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 4 }}>
                    <span>Margen</span>
                    <span style={{ color: margin > 50 ? 'var(--success)' : margin > 20 ? 'var(--warning)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{margin.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            );
          })()}

          <ModalActions onCancel={() => setPresModal(null)} onConfirm={savePresentation}
            confirmLabel={saving ? 'Guardando...' : 'Crear Presentación'} confirmDisabled={saving} />
        </Modal>
      )}
    </div>
  );
}
