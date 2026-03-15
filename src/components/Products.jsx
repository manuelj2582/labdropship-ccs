import React, { useState, useMemo } from 'react';
import { Card, Button, Modal, ModalActions, Input, CategoryTag } from './UI';
import { supabase } from '../lib/supabase';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Products({ data, formulasWithCosts, loadData, showToast, searchQuery, user }) {
  const [filter, setFilter] = useState('all');
  const [editModal, setEditModal] = useState(null);
  const [produceModal, setProduceModal] = useState(null); // product to produce
  const [batches, setBatches] = useState(1);
  const [producing, setProducing] = useState(false);
  const [form, setForm] = useState({ price: 0, stock: 0 });

  const openEdit = (p) => { setForm({ price: p.price, stock: p.stock }); setEditModal(p); };
  const openProduce = (p) => { setBatches(1); setProduceModal(p); };

  const save = async () => {
    if (!editModal) return;
    try {
      await db.products.update(editModal.id, { price: +form.price, stock: +form.stock }, user);
      await loadData();
      showToast('Producto actualizado');
      setEditModal(null);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const remove = async (id, name) => {
    if (!confirm(`¿Eliminar "${name}"? Esto no se puede deshacer.`)) return;
    try {
      const { data: saleItems } = await supabase.from('sale_items').select('id').eq('product_id', id).limit(1);
      if (saleItems && saleItems.length > 0) {
        showToast('No se puede eliminar: este producto tiene ventas registradas', 'error');
        return;
      }
      await db.products.delete(id, name, user);
      await loadData();
      showToast('Producto eliminado');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  // Produce logic
  const produceInfo = useMemo(() => {
    if (!produceModal) return null;
    const pres = (data.presentations || []).find(p => p.id === produceModal.presentation_id);
    const formula = formulasWithCosts.find(f => f.id === produceModal.formula_id);
    if (!pres || !formula) return null;

    const baseAmt = formula.base_amount || formula.yield_amount || 100;
    const ratio = pres.amount / baseAmt;
    const materials = (formula.ingredients || []).map(ing => {
      const mat = data.rawMaterials.find(m => m.id === ing.material_id);
      const needed = ing.amount * ratio * batches;
      return { mat, needed, ok: mat && mat.stock >= needed };
    });
    const envase = pres.envase_id ? data.rawMaterials.find(m => m.id === pres.envase_id) : null;
    const envaseOk = !pres.envase_id || (envase && envase.stock >= batches);
    const canProduce = materials.every(m => m.ok) && envaseOk;
    const matCost = materials.reduce((s, m) => s + (m.mat ? m.mat.cost * m.needed : 0), 0);
    const envaseCost = (envase?.cost || 0) * batches;
    return { pres, formula, materials, envase, envaseOk, canProduce, matCost, envaseCost };
  }, [produceModal, batches, data, formulasWithCosts]);

  const doProduce = async () => {
    if (!produceInfo || !produceInfo.canProduce) return;
    setProducing(true);
    try {
      await db.produce(produceInfo.formula, produceInfo.pres, batches, data.rawMaterials, user);
      await loadData();
      showToast(`${batches} unidad(es) de "${produceModal.name}" producidas`);
      setProduceModal(null);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setProducing(false); }
  };

  let filtered = filter === 'all' ? data.products : data.products.filter(p => p.category === filter);
  if (searchQuery) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Button variant={filter === 'all' ? 'primary' : 'muted'} size="sm" onClick={() => setFilter('all')}>Todos ({data.products.length})</Button>
          {((data.categories) || []).map(c => <Button key={c.slug} variant={filter === c.slug ? 'primary' : 'muted'} size="sm" onClick={() => setFilter(c.slug)}>{c.icon} {data.products.filter(p => p.category === c.slug).length}</Button>)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
        {filtered.map(p => {
          const cat = ((data.categories) || []).find(c => c.slug === p.category);
          const formula = formulasWithCosts.find(f => f.id === p.formula_id);
          return (
            <Card key={p.id} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 56, opacity: 0.05 }}>{cat?.icon}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <CategoryTag category={p.category} categories={data.categories || []} />
                <div style={{ display: 'flex', gap: 4, position: 'relative', zIndex: 2 }}>
                  <Button variant="successGhost" size="sm" onClick={(e) => { e.stopPropagation(); openProduce(p); }}>⚙️</Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>✎</Button>
                  <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); remove(p.id, p.name); }}>✕</Button>
                </div>
              </div>
              <h4 style={{ margin: '10px 0 6px', fontSize: 14, fontWeight: 700 }}>{p.name}</h4>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.03em' }}>{fmt(p.price)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>precio mayor / ud</div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Stock</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: p.stock > 50 ? 'var(--success)' : p.stock > 10 ? 'var(--warning)' : 'var(--danger)' }}>{p.stock.toLocaleString()}</span>
                </div>
                {formula && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--text-dim)' }}>Margen</span><span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: formula._margin > 50 ? 'var(--success)' : 'var(--warning)' }}>{formula._margin.toFixed(1)}%</span></div>}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <Modal title={`Editar: ${editModal.name}`} onClose={() => setEditModal(null)}>
          <Input label="Precio Mayor ($)" type="number" value={form.price} onChange={v => setForm({...form, price: v})} step="0.01" />
          <Input label="Stock (unidades)" type="number" value={form.stock} onChange={v => setForm({...form, stock: v})} />
          <ModalActions onCancel={() => setEditModal(null)} onConfirm={save} />
        </Modal>
      )}

      {/* Produce Modal */}
      {produceModal && (
        <Modal title={`Producir: ${produceModal.name}`} onClose={() => setProduceModal(null)}>
          {!produceInfo ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              Este producto no tiene presentación o fórmula vinculada. Créala desde el módulo de Fórmulas.
            </div>
          ) : (
            <>
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-bg)', border: '1px solid rgba(108,114,255,0.15)', fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>
                Fórmula: <strong>{produceInfo.formula.name}</strong> · Presentación: <strong>{produceInfo.pres.amount}{produceInfo.pres.unit}</strong>
              </div>
              <Input label="Cantidad a producir (unidades)" type="number" value={batches} onChange={v => setBatches(Math.max(1, +v))} />

              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 16, marginTop: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 10 }}>
                  MATERIALES PARA {batches} × {produceModal.name}
                </div>
                {produceInfo.materials.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                    <span>{m.mat?.name || '—'}</span>
                    <span style={{ color: m.ok ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {m.needed.toFixed(2)} {m.mat?.unit} {m.ok ? '✓' : `(faltan ${(m.needed - (m.mat?.stock || 0)).toFixed(2)})`}
                    </span>
                  </div>
                ))}
                {produceInfo.envase && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 8 }}>
                    <span>🫙 {produceInfo.envase.name}</span>
                    <span style={{ color: produceInfo.envaseOk ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {batches} uds {produceInfo.envaseOk ? '✓' : `(faltan ${batches - produceInfo.envase.stock})`}
                    </span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Costo MP</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(produceInfo.matCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Costo envases</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(produceInfo.envaseCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span style={{ color: 'var(--warning)' }}>Total</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{fmt(produceInfo.matCost + produceInfo.envaseCost)}</span>
                  </div>
                </div>
              </div>

              <ModalActions onCancel={() => setProduceModal(null)} onConfirm={doProduce}
                confirmLabel={producing ? 'Produciendo...' : `⚙️ Producir ${batches} uds`}
                confirmDisabled={!produceInfo.canProduce || producing} confirmVariant="success" />
            </>
          )}
          {!produceInfo && <ModalActions onCancel={() => setProduceModal(null)} />}
        </Modal>
      )}
    </div>
  );
}
