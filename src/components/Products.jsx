import React, { useState, useMemo, useRef } from 'react';
import { Card, Button, Modal, ModalActions, Input, CategoryTag } from './UI';
import { supabase } from '../lib/supabase';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Products({ data, formulasWithCosts, loadData, showToast, searchQuery, user }) {
  const [filter, setFilter] = useState('all');
  const [editModal, setEditModal] = useState(null);
  const [produceModal, setProduceModal] = useState(null);
  const [batches, setBatches] = useState(1);
  const [producing, setProducing] = useState(false);
  const [uploading, setUploading] = useState(null); // product id being uploaded
  const [form, setForm] = useState({ price: 0, stock: 0 });
  const fileInputRef = useRef(null);

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
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    try {
      const { data: saleItems } = await supabase.from('sale_items').select('id').eq('product_id', id).limit(1);
      if (saleItems && saleItems.length > 0) {
        showToast('No se puede eliminar: tiene ventas registradas', 'error');
        return;
      }
      await db.products.removeImage(id);
      await db.products.delete(id, name, user);
      await loadData();
      showToast('Producto eliminado');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  // Image upload
  const triggerUpload = (productId) => {
    setUploading(productId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploading) return;
    if (!file.type.startsWith('image/')) { showToast('Solo imágenes', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Máximo 5MB', 'error'); return; }
    try {
      showToast('Subiendo imagen...');
      await db.products.uploadImage(uploading, file);
      await loadData();
      showToast('Imagen actualizada');
    } catch (err) { showToast('Error subiendo: ' + err.message, 'error'); }
    finally { setUploading(null); e.target.value = ''; }
  };

  const removeImage = async (productId) => {
    try {
      await db.products.removeImage(productId);
      await loadData();
      showToast('Imagen eliminada');
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
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Button variant={filter === 'all' ? 'primary' : 'muted'} size="sm" onClick={() => setFilter('all')}>Todos ({data.products.length})</Button>
          {(data.categories || []).map(c => <Button key={c.slug} variant={filter === c.slug ? 'primary' : 'muted'} size="sm" onClick={() => setFilter(c.slug)}>{c.icon} {data.products.filter(p => p.category === c.slug).length}</Button>)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
        {filtered.map(p => {
          const cat = (data.categories || []).find(c => c.slug === p.category);
          const formula = formulasWithCosts.find(f => f.id === p.formula_id);
          return (
            <Card key={p.id} style={{ position: 'relative', overflow: 'hidden', padding: 0 }}>
              {/* Image */}
              <div style={{
                height: 160, background: p.image_url ? `url(${p.image_url}) center/cover` : `linear-gradient(135deg, ${cat?.color || '#6C72FF'}15, ${cat?.color || '#6C72FF'}08)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: '1px solid var(--border)', position: 'relative',
              }}>
                {!p.image_url && <span style={{ fontSize: 48, opacity: 0.15 }}>{cat?.icon || '📦'}</span>}
                {/* Image actions overlay */}
                <div style={{
                  position: 'absolute', bottom: 8, right: 8,
                  display: 'flex', gap: 4, opacity: 0.9,
                }}>
                  <button onClick={(e) => { e.stopPropagation(); triggerUpload(p.id); }} style={{
                    width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)',
                  }} title="Subir imagen">📷</button>
                  {p.image_url && (
                    <button onClick={(e) => { e.stopPropagation(); removeImage(p.id); }} style={{
                      width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'rgba(220,38,38,0.7)', color: '#fff', fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backdropFilter: 'blur(4px)',
                    }} title="Eliminar imagen">✕</button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <CategoryTag category={p.category} categories={data.categories || []} />
                  <div style={{ display: 'flex', gap: 4, position: 'relative', zIndex: 2 }}>
                    <Button variant="successGhost" size="sm" onClick={(e) => { e.stopPropagation(); openProduce(p); }}>⚙️</Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>✎</Button>
                    <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); remove(p.id, p.name); }}>✕</Button>
                  </div>
                </div>
                <h4 style={{ margin: '6px 0', fontSize: 14, fontWeight: 700 }}>{p.name}</h4>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.03em' }}>{fmt(p.price)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>precio mayor / ud</div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Stock</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: p.stock > 50 ? 'var(--success)' : p.stock > 10 ? 'var(--warning)' : 'var(--danger)' }}>{p.stock.toLocaleString()}</span>
                </div>
                {formula && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                    <span style={{ color: 'var(--text-dim)' }}>Margen</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: formula._margin > 50 ? 'var(--success)' : 'var(--warning)' }}>{formula._margin.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <Modal title={`Editar: ${editModal.name}`} onClose={() => setEditModal(null)}>
          <Input label="Precio Mayor ($)" type="number" value={form.price} onChange={v => setForm({ ...form, price: v })} step="0.01" />
          <Input label="Stock (unidades)" type="number" value={form.stock} onChange={v => setForm({ ...form, stock: v })} />
          <ModalActions onCancel={() => setEditModal(null)} onConfirm={save} />
        </Modal>
      )}

      {/* Produce Modal */}
      {produceModal && (
        <Modal title={`Producir: ${produceModal.name}`} onClose={() => setProduceModal(null)}>
          {!produceInfo ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              Este producto no tiene presentación o fórmula vinculada.
            </div>
          ) : (
            <>
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-bg)', border: '1px solid rgba(108,114,255,0.15)', fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>
                Fórmula: <strong>{produceInfo.formula.name}</strong> · {produceInfo.pres.amount}{produceInfo.pres.unit}
              </div>
              <Input label="Cantidad (unidades)" type="number" value={batches} onChange={v => setBatches(Math.max(1, +v))} />
              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 16, marginTop: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 10 }}>MATERIALES PARA {batches} × {produceModal.name}</div>
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
                    <span style={{ color: produceInfo.envaseOk ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{batches} uds {produceInfo.envaseOk ? '✓' : `(faltan ${batches - produceInfo.envase.stock})`}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span style={{ color: 'var(--warning)' }}>Costo total</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{fmt(produceInfo.matCost + produceInfo.envaseCost)}</span></div>
                </div>
              </div>
              <ModalActions onCancel={() => setProduceModal(null)} onConfirm={doProduce} confirmLabel={producing ? 'Produciendo...' : `⚙️ Producir ${batches} uds`} confirmDisabled={!produceInfo.canProduce || producing} confirmVariant="success" />
            </>
          )}
          {!produceInfo && <ModalActions onCancel={() => setProduceModal(null)} />}
        </Modal>
      )}
    </div>
  );
}
