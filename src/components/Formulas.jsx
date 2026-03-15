import React, { useState, useMemo } from 'react';
import { Card, Button, Modal, ModalActions, Input, Select, Textarea, CategoryTag } from './UI';
import { UNITS } from '../data/initialData';
import { supabase } from '../lib/supabase';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Formulas({ data, formulasWithCosts, loadData, showToast, searchQuery, user }) {
  const [filter, setFilter] = useState('all');
  const [createModal, setCreateModal] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [presModal, setPresModal] = useState(null);
  const [editPresId, setEditPresId] = useState(null);
  const [procModal, setProcModal] = useState(null);
  const [saving, setSaving] = useState(false);

  // Create formula form
  const [form, setForm] = useState({
    name: '', category: '', baseAmount: 100, baseUnit: 'ml',
    yieldAmount: 100, yieldUnit: 'ml', salePrice: 0,
    ingredients: [{ materialId: '', amount: 0 }],
  });

  // Presentation form
  const [presForm, setPresForm] = useState({ name: '', amount: 0, unit: 'ml', envase_id: '', sale_price: 0, sku: '' });

  // Procedure form
  const [procText, setProcText] = useState('');

  const envases = useMemo(() => data.rawMaterials.filter(m => m.material_type === 'envase'), [data.rawMaterials]);
  const materiasPrimas = useMemo(() => data.rawMaterials.filter(m => (m.material_type || 'materia_prima') === 'materia_prima'), [data.rawMaterials]);

  const detailFormula = detailId ? formulasWithCosts.find(f => f.id === detailId) : null;
  const detailPresentations = detailId ? (data.presentations || []).filter(p => p.formula_id === detailId) : [];

  // ── Create Formula ──
  const openCreate = () => {
    setForm({ name: '', category: '', baseAmount: 100, baseUnit: 'ml', yieldAmount: 100, yieldUnit: 'ml', salePrice: 0, ingredients: [{ materialId: '', amount: 0 }] });
    setCreateModal(true);
  };
  const addIng = () => setForm({ ...form, ingredients: [...form.ingredients, { materialId: '', amount: 0 }] });
  const updateIng = (i, k, v) => { const ings = [...form.ingredients]; ings[i] = { ...ings[i], [k]: k === 'amount' ? +v : v }; setForm({ ...form, ingredients: ings }); };
  const removeIng = (i) => setForm({ ...form, ingredients: form.ingredients.filter((_, idx) => idx !== i) });

  const baseCost = form.ingredients.reduce((s, ing) => {
    const mat = data.rawMaterials.find(m => m.id === ing.materialId);
    return s + (mat ? mat.cost * ing.amount : 0);
  }, 0);

  const saveFormula = async () => {
    if (!form.name || !form.category || form.ingredients.some(i => !i.materialId)) return;
    setSaving(true);
    try {
      await db.formulas.create(form, form.ingredients, user);
      await loadData();
      showToast('Fórmula creada');
      setCreateModal(false);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  // ── Presentations ──
  const openAddPres = () => {
    setPresForm({ name: '', amount: 0, unit: 'ml', envase_id: '', sale_price: 0, sku: '' });
    setEditPresId(null);
    setPresModal(detailId);
  };
  const openEditPres = (pres) => {
    setPresForm({ name: pres.name, amount: pres.amount, unit: pres.unit, envase_id: pres.envase_id || '', sale_price: pres.sale_price || 0, sku: pres.sku || '' });
    setEditPresId(pres.id);
    setPresModal(pres.formula_id);
  };

  const savePres = async () => {
    if (!presForm.name || !presForm.amount) return;
    setSaving(true);
    try {
      if (editPresId) {
        await db.presentations.update(editPresId, {
          name: presForm.name, amount: presForm.amount, unit: presForm.unit,
          envase_id: presForm.envase_id || null, sale_price: presForm.sale_price || 0, sku: presForm.sku || null,
        }, user);
        const { data: prods } = await supabase.from('products').select('id').eq('presentation_id', editPresId);
        if (prods?.length > 0) await db.products.update(prods[0].id, { name: presForm.name, price: presForm.sale_price || 0 }, user);
        showToast('Presentación actualizada');
      } else {
        const pres = await db.presentations.create({
          formula_id: presModal, name: presForm.name, amount: presForm.amount, unit: presForm.unit,
          envase_id: presForm.envase_id || null, sale_price: presForm.sale_price || 0, sku: presForm.sku || null,
        }, user);
        const formula = data.formulas.find(f => f.id === presModal);
        await db.products.create({ formula_id: presModal, presentation_id: pres.id, name: presForm.name, category: formula?.category || '', stock: 0, price: presForm.sale_price || 0 }, user);
        showToast('Presentación creada');
      }
      await loadData();
      setPresModal(null);
      setEditPresId(null);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const removePres = async (pres) => {
    try { await db.presentations.delete(pres.id, pres.name, user); await loadData(); showToast('Presentación eliminada'); }
    catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  // ── Procedure ──
  const openProcedure = () => {
    setProcText(detailFormula?.procedure_steps || '');
    setProcModal(detailId);
  };
  const saveProcedure = async () => {
    setSaving(true);
    try {
      await supabase.from('formulas').update({ procedure_steps: procText }).eq('id', procModal);
      await loadData();
      showToast('Procedimiento guardado');
      setProcModal(null);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  // ── Cost helpers ──
  const getPresCost = (formula, presAmount) => {
    const baseAmt = formula.base_amount || formula.yield_amount || 100;
    const ratio = presAmount / baseAmt;
    return (formula.ingredients || []).reduce((s, ing) => {
      const mat = data.rawMaterials.find(m => m.id === ing.material_id);
      return s + (mat ? mat.cost * ing.amount * ratio : 0);
    }, 0);
  };

  // ── Filter ──
  let filtered = filter === 'all' ? formulasWithCosts : formulasWithCosts.filter(f => f.category === filter);
  if (searchQuery) filtered = filtered.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-in">
      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Button variant={filter === 'all' ? 'primary' : 'muted'} size="sm" onClick={() => setFilter('all')}>Todas ({formulasWithCosts.length})</Button>
          {(data.categories || []).map(c => (
            <Button key={c.slug} variant={filter === c.slug ? 'primary' : 'muted'} size="sm" onClick={() => setFilter(c.slug)}>
              {c.icon} {formulasWithCosts.filter(f => f.category === c.slug).length}
            </Button>
          ))}
        </div>
        <Button onClick={openCreate}>+ Nueva Fórmula</Button>
      </div>

      {/* ═══ CARD GRID ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {filtered.map(f => {
          const presCount = (data.presentations || []).filter(p => p.formula_id === f.id).length;
          const baseAmt = f.base_amount || f.yield_amount || 100;
          const cat = (data.categories || []).find(c => c.slug === f.category);
          return (
            <div key={f.id} onClick={() => setDetailId(f.id)} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 18,
              cursor: 'pointer', transition: '0.2s',
              position: 'relative', overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
            >
              {/* Color accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cat?.color || 'var(--accent)' }} />

              <CategoryTag category={f.category} categories={data.categories || []} />
              <h4 style={{ margin: '10px 0 6px', fontSize: 15, fontWeight: 700 }}>{f.name}</h4>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
                Base: {baseAmt}{f.base_unit || f.yield_unit} · {(f.ingredients || []).length} ingredientes
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>COSTO BASE</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--warning)' }}>{fmt(f._productionCost)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>PRESENTACIONES</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{presCount}</div>
                </div>
              </div>
              {f.procedure_steps && <div style={{ fontSize: 10, color: 'var(--success)', marginTop: 8 }}>📋 Tiene procedimiento</div>}
            </div>
          );
        })}
      </div>

      {/* ═══ DETAIL MODAL ═══ */}
      {detailFormula && (
        <Modal title={detailFormula.name} onClose={() => setDetailId(null)} wide>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <CategoryTag category={detailFormula.category} categories={data.categories || []} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>COSTO BASE ({detailFormula.base_amount || detailFormula.yield_amount}{detailFormula.base_unit || detailFormula.yield_unit})</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--warning)' }}>{fmt(detailFormula._productionCost)}</div>
            </div>
          </div>

          {/* Ingredients */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
              INGREDIENTES
            </div>
            {(detailFormula.ingredients || []).map((ing, i) => {
              const mat = data.rawMaterials.find(m => m.id === ing.material_id);
              const baseAmt = detailFormula.base_amount || detailFormula.yield_amount || 100;
              const pct = baseAmt > 0 ? ((ing.amount / baseAmt) * 100).toFixed(1) : 0;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{mat?.name || '—'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {ing.amount} {mat?.unit} <span style={{ color: 'var(--text-dim)' }}>({pct}%)</span> · {fmt(mat ? mat.cost * ing.amount : 0)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Procedure */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em' }}>
                PROCEDIMIENTO
              </div>
              <Button variant="ghost" size="sm" onClick={openProcedure}>
                {detailFormula.procedure_steps ? '✎ Editar' : '+ Agregar'}
              </Button>
            </div>
            {detailFormula.procedure_steps ? (
              <div style={{
                background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: 14,
                border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.8,
                color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
              }}>
                {detailFormula.procedure_steps}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic', padding: '8px 0' }}>
                Sin procedimiento — opcional
              </div>
            )}
          </div>

          {/* Presentations */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em' }}>
                PRESENTACIONES ({detailPresentations.length})
              </div>
              <Button variant="ghost" size="sm" onClick={openAddPres}>+ Presentación</Button>
            </div>
            {detailPresentations.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '16px 0' }}>Sin presentaciones</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {detailPresentations.map(pres => {
                  const matCost = getPresCost(detailFormula, pres.amount);
                  const envaseCost = pres.envase?.cost || 0;
                  const totalCost = matCost + envaseCost;
                  const margin = pres.sale_price > 0 ? ((pres.sale_price - totalCost) / pres.sale_price * 100) : 0;
                  return (
                    <div key={pres.id} style={{
                      background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                      padding: 14, border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{pres.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            {pres.amount}{pres.unit} {pres.sku && `· ${pres.sku}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button variant="ghost" size="sm" onClick={() => openEditPres(pres)}>✎</Button>
                          <Button variant="danger" size="sm" onClick={() => removePres(pres)}>✕</Button>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-dim)' }}>MP</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(matCost)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Envase</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(envaseCost)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 3, marginTop: 2 }}>
                          <span style={{ color: 'var(--warning)' }}>Costo</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{fmt(totalCost)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                          <span style={{ color: 'var(--accent)' }}>Precio</span>
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
        </Modal>
      )}

      {/* ═══ CREATE FORMULA MODAL ═══ */}
      {createModal && (
        <Modal title="Nueva Fórmula" onClose={() => setCreateModal(false)} wide>
          <Input label="Nombre" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Ej: Serum Vitamina C" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Select label="Categoría" value={form.category} options={(data.categories || []).map(c => ({ value: c.slug, label: c.icon + ' ' + c.name }))} onChange={v => setForm({ ...form, category: v })} placeholder="Seleccionar..." />
            <Input label="Cantidad base" type="number" value={form.baseAmount} onChange={v => { const val = +v; setForm({ ...form, baseAmount: val, yieldAmount: val }); }} />
            <Select label="Unidad" value={form.baseUnit} options={UNITS} onChange={v => setForm({ ...form, baseUnit: v, yieldUnit: v })} />
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 8, background: 'var(--accent-bg)', border: '1px solid rgba(108,114,255,0.15)', fontSize: 12, color: 'var(--accent)' }}>
            💡 Cantidades de ingredientes para <strong>{form.baseAmount || '?'}{form.baseUnit}</strong> de producto
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 8 }}>Ingredientes</label>
            {form.ingredients.map((ing, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, marginBottom: 8 }}>
                <Select value={ing.materialId} options={materiasPrimas.map(m => ({ value: m.id, label: `${m.name} (${m.unit})` }))} onChange={v => updateIng(i, 'materialId', v)} placeholder="Materia prima..." />
                <Input type="number" value={ing.amount} onChange={v => updateIng(i, 'amount', v)} step="0.01" placeholder="Cant." />
                <Button variant="danger" size="sm" onClick={() => removeIng(i)}>✕</Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addIng}>+ Ingrediente</Button>
          </div>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 13 }}>
            Costo base ({form.baseAmount}{form.baseUnit}): <strong style={{ color: 'var(--warning)' }}>{fmt(baseCost)}</strong>
            {form.baseAmount > 0 && <span style={{ marginLeft: 12 }}>por {form.baseUnit}: <strong>{fmt(baseCost / form.baseAmount)}</strong></span>}
          </div>
          <ModalActions onCancel={() => setCreateModal(false)} onConfirm={saveFormula} confirmLabel={saving ? 'Guardando...' : 'Crear'} confirmDisabled={saving} />
        </Modal>
      )}

      {/* ═══ PRESENTATION MODAL ═══ */}
      {presModal && (
        <Modal title={editPresId ? 'Editar Presentación' : 'Nueva Presentación'} onClose={() => { setPresModal(null); setEditPresId(null); }}>
          <Input label="Nombre" value={presForm.name} onChange={v => setPresForm({ ...presForm, name: v })} placeholder="Ej: Serum Vit C 30ml" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Cantidad" type="number" value={presForm.amount} onChange={v => setPresForm({ ...presForm, amount: +v })} />
            <Select label="Unidad" value={presForm.unit} options={UNITS} onChange={v => setPresForm({ ...presForm, unit: v })} />
          </div>
          <Select label="Envase" value={presForm.envase_id} options={envases.map(e => ({ value: e.id, label: `${e.name} (${fmt(e.cost)})` }))} onChange={v => setPresForm({ ...presForm, envase_id: v })} placeholder="Seleccionar envase..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Precio Mayor ($)" type="number" value={presForm.sale_price} onChange={v => setPresForm({ ...presForm, sale_price: +v })} step="0.01" />
            <Input label="SKU (opcional)" value={presForm.sku} onChange={v => setPresForm({ ...presForm, sku: v })} />
          </div>
          {presForm.amount > 0 && (() => {
            const formula = formulasWithCosts.find(f => f.id === (presModal));
            if (!formula) return null;
            const matCost = getPresCost(formula, presForm.amount);
            const envase = envases.find(e => e.id === presForm.envase_id);
            const envaseCost = envase?.cost || 0;
            const totalCost = matCost + envaseCost;
            const margin = presForm.sale_price > 0 ? ((presForm.sale_price - totalCost) / presForm.sale_price * 100) : 0;
            return (
              <div style={{ padding: 14, borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border)', marginTop: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: 'var(--text-dim)' }}>MP ({presForm.amount}{presForm.unit})</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(matCost)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: 'var(--text-dim)' }}>Envase</span><span style={{ fontFamily: 'var(--font-mono)' }}>{envase ? fmt(envaseCost) : '—'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}><span style={{ color: 'var(--warning)' }}>Costo</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{fmt(totalCost)}</span></div>
                {presForm.sale_price > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 4 }}><span>Margen</span><span style={{ color: margin > 50 ? 'var(--success)' : margin > 20 ? 'var(--warning)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{margin.toFixed(1)}%</span></div>}
              </div>
            );
          })()}
          <ModalActions onCancel={() => { setPresModal(null); setEditPresId(null); }} onConfirm={savePres} confirmLabel={saving ? 'Guardando...' : editPresId ? 'Actualizar' : 'Crear'} confirmDisabled={saving} />
        </Modal>
      )}

      {/* ═══ PROCEDURE MODAL ═══ */}
      {procModal && (
        <Modal title="Procedimiento de Preparación" onClose={() => setProcModal(null)} wide>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
            Escribe los pasos de preparación. Opcional — puedes dejarlo vacío.
          </div>
          <Textarea
            value={procText} onChange={setProcText} rows={12}
            placeholder={"1. Pesar los ingredientes\n2. Mezclar la base acuosa a 70°C\n3. Agregar activos cuando baje a 40°C\n4. Mezclar por 5 minutos\n5. Envasar y etiquetar"}
          />
          <ModalActions onCancel={() => setProcModal(null)} onConfirm={saveProcedure} confirmLabel={saving ? 'Guardando...' : 'Guardar'} confirmDisabled={saving} />
        </Modal>
      )}
    </div>
  );
}
