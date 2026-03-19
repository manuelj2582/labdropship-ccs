import React, { useState, useMemo } from 'react';
import { Card, Button, Modal, ModalActions, Input, Select, StatusBadge } from './UI';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Suppliers({ data, loadData, showToast, searchQuery, user }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', email: '', rif: '', address: '', whatsapp: '' });

  // Detail / price list
  const [detailId, setDetailId] = useState(null);
  const [priceModal, setPriceModal] = useState(false);
  const [editPriceId, setEditPriceId] = useState(null);
  const [priceForm, setPriceForm] = useState({ material_id: '', price: 0, unit_amount: 1, unit: 'unidad', notes: '' });

  const openAdd = () => { setForm({ name: '', contact: '', email: '', rif: '', address: '', whatsapp: '' }); setEditId(null); setModal(true); };
  const openEdit = (s) => { setForm({ name: s.name, contact: s.contact, email: s.email, rif: s.rif, address: s.address || '', whatsapp: s.whatsapp || '' }); setEditId(s.id); setModal(true); };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editId) { await db.suppliers.update(editId, form, user); showToast('Proveedor actualizado'); }
      else { await db.suppliers.create(form, user); showToast('Proveedor agregado'); }
      await loadData();
      setModal(false);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id, name) => {
    if (!confirm(`¿Eliminar proveedor "${name}"?`)) return;
    try { await db.suppliers.delete(id, name, user); await loadData(); showToast('Proveedor eliminado'); if (detailId === id) setDetailId(null); }
    catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  // Price CRUD
  const openAddPrice = () => {
    setPriceForm({ material_id: '', price: 0, unit_amount: 1, unit: 'unidad', notes: '' });
    setEditPriceId(null);
    setPriceModal(true);
  };

  const openEditPrice = (sp) => {
    setPriceForm({ material_id: sp.material_id, price: sp.price, unit_amount: sp.unit_amount, unit: sp.unit, notes: sp.notes || '' });
    setEditPriceId(sp.id);
    setPriceModal(true);
  };

  const savePrice = async () => {
    if (!priceForm.material_id || !priceForm.price) return;
    setSaving(true);
    try {
      await db.supplierPrices.upsert({
        material_id: priceForm.material_id,
        supplier_id: detailId,
        price: +priceForm.price,
        unit_amount: +priceForm.unit_amount || 1,
        unit: priceForm.unit,
        notes: priceForm.notes,
      }, user);
      await loadData();
      showToast(editPriceId ? 'Precio actualizado' : 'Precio agregado');
      setPriceModal(false);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const removePrice = async (id) => {
    try { await db.supplierPrices.delete(id, user); await loadData(); showToast('Precio eliminado'); }
    catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const whatsappSupplier = (supplier, text) => {
    const phone = supplier.whatsapp || supplier.contact?.replace(/[^0-9]/g, '') || '';
    if (!phone) { showToast('Sin WhatsApp registrado', 'error'); return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text || `Hola ${supplier.name}, soy de VeneLab.`)}`, '_blank');
  };

  let suppliers = data.suppliers;
  if (searchQuery) suppliers = suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.rif?.toLowerCase().includes(searchQuery.toLowerCase()));

  const detailSupplier = detailId ? data.suppliers.find(s => s.id === detailId) : null;
  const supplierPrices = useMemo(() =>
    (data.supplierPrices || []).filter(sp => sp.supplier_id === detailId).sort((a, b) => {
      const matA = data.rawMaterials.find(m => m.id === a.material_id);
      const matB = data.rawMaterials.find(m => m.id === b.material_id);
      return (matA?.name || '').localeCompare(matB?.name || '');
    }),
  [data.supplierPrices, detailId, data.rawMaterials]);

  const supplierMaterials = useMemo(() => data.rawMaterials.filter(m => m.supplier_id === detailId), [data.rawMaterials, detailId]);

  // Check if this supplier has the best price for each item
  const isBestPrice = (sp) => {
    const allForMat = (data.supplierPrices || []).filter(p => p.material_id === sp.material_id);
    if (allForMat.length <= 1) return false;
    const cheapest = allForMat.reduce((best, p) => p.cost_per_unit < best.cost_per_unit ? p : best);
    return cheapest.supplier_id === detailId;
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{suppliers.length} proveedores</span>
        <Button onClick={openAdd}>+ Nuevo Proveedor</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {suppliers.map(s => {
          const prices = (data.supplierPrices || []).filter(sp => sp.supplier_id === s.id);
          const materials = data.rawMaterials.filter(m => m.supplier_id === s.id);
          return (
            <Card key={s.id} style={{ cursor: 'pointer', transition: '0.2s' }}
              onClick={() => setDetailId(s.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700 }}>{s.name}</h4>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{s.rif || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  {s.whatsapp && (
                    <button onClick={() => whatsappSupplier(s)} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', background: '#25D366', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                    </button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>✎</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(s.id, s.name)}>✕</Button>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 12 }}>
                {s.contact && <span>📞 {s.contact}</span>}
                {s.email && <span>✉️ {s.email}</span>}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
                <div style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                  💲 <strong>{prices.length}</strong> cotizaciones
                </div>
                <div style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                  📦 <strong>{materials.length}</strong> materiales
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ═══ DETAIL MODAL ═══ */}
      {detailSupplier && (
        <Modal title={detailSupplier.name} onClose={() => setDetailId(null)} wide>
          {/* Supplier info header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {detailSupplier.rif && <span>🏢 {detailSupplier.rif}</span>}
              {detailSupplier.contact && <span>📞 {detailSupplier.contact}</span>}
              {detailSupplier.email && <span>✉️ {detailSupplier.email}</span>}
              {detailSupplier.address && <span>📍 {detailSupplier.address}</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {detailSupplier.whatsapp && (
                <button onClick={() => whatsappSupplier(detailSupplier)} style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: '#25D366', border: 'none',
                  color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--font-body)',
                }}>📱 WhatsApp</button>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setDetailId(null); openEdit(detailSupplier); }}>✎ Editar info</Button>
            </div>
          </div>

          {/* Price list */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em' }}>
              LISTA DE PRECIOS ({supplierPrices.length} productos)
            </div>
            <Button size="sm" onClick={openAddPrice}>+ Agregar Producto</Button>
          </div>

          {supplierPrices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)', fontSize: 13 }}>
              Este proveedor no tiene productos registrados. Agrega su lista de precios.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {supplierPrices.map(sp => {
                const mat = data.rawMaterials.find(m => m.id === sp.material_id);
                const best = isBestPrice(sp);
                const allForMat = (data.supplierPrices || []).filter(p => p.material_id === sp.material_id);
                return (
                  <div key={sp.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    background: best ? 'var(--success-bg)' : 'var(--bg-input)',
                    border: `1px solid ${best ? 'rgba(0,214,143,0.2)' : 'var(--border)'}`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {best && <span style={{ fontSize: 12 }}>🏆</span>}
                        <span style={{
                          padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600,
                          background: (mat?.material_type || 'materia_prima') === 'envase' ? 'rgba(96,165,250,0.1)' : (mat?.material_type || 'materia_prima') === 'etiqueta' ? 'rgba(251,191,36,0.1)' : 'rgba(167,139,250,0.1)',
                          color: (mat?.material_type || 'materia_prima') === 'envase' ? '#60A5FA' : (mat?.material_type || 'materia_prima') === 'etiqueta' ? '#FBBF24' : '#A78BFA',
                        }}>{(mat?.material_type || 'materia_prima') === 'envase' ? '🫙' : (mat?.material_type || 'materia_prima') === 'etiqueta' ? '🏷️' : '🧪'}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{mat?.name || '—'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 3, marginLeft: best ? 28 : 20 }}>
                        ${Number(sp.price).toFixed(2)} por {sp.unit_amount} {sp.unit}
                        {sp.notes && <span style={{ fontStyle: 'italic', marginLeft: 6 }}>· {sp.notes}</span>}
                        {allForMat.length > 1 && <span style={{ marginLeft: 6, color: 'var(--text-dim)' }}>({allForMat.length} proveedores)</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: best ? 'var(--success)' : 'var(--text-primary)' }}>
                          {fmt(sp.cost_per_unit)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>por {mat?.unit || 'ud'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <Button variant="ghost" size="sm" onClick={() => openEditPrice(sp)}>✎</Button>
                        <Button variant="danger" size="sm" onClick={() => removePrice(sp.id)}>✕</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Materials assigned to this supplier */}
          {supplierMaterials.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
                📦 MATERIALES EN INVENTARIO ASIGNADOS ({supplierMaterials.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {supplierMaterials.map(m => (
                  <span key={m.id} style={{
                    padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11,
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    color: m.stock <= m.min_stock && m.min_stock > 0 ? 'var(--danger)' : 'var(--text-secondary)',
                  }}>
                    {m.name} · {Number(m.stock).toLocaleString()} {m.unit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ═══ ADD/EDIT SUPPLIER MODAL ═══ */}
      {modal && (
        <Modal title={editId ? 'Editar Proveedor' : 'Nuevo Proveedor'} onClose={() => setModal(false)}>
          <Input label="Nombre / Razón Social" value={form.name} onChange={v => setForm({...form, name: v})} />
          <Input label="RIF" value={form.rif} onChange={v => setForm({...form, rif: v})} placeholder="J-00000000-0" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Teléfono" value={form.contact} onChange={v => setForm({...form, contact: v})} />
            <Input label="Email" value={form.email} onChange={v => setForm({...form, email: v})} type="email" />
          </div>
          <Input label="Dirección" value={form.address} onChange={v => setForm({...form, address: v})} />
          <Input label="WhatsApp (con código de país, ej: 584121234567)" value={form.whatsapp} onChange={v => setForm({...form, whatsapp: v})} placeholder="584121234567" />
          <ModalActions onCancel={() => setModal(false)} onConfirm={save} confirmLabel={saving ? 'Guardando...' : editId ? 'Actualizar' : 'Agregar'} confirmDisabled={saving} />
        </Modal>
      )}

      {/* ═══ ADD/EDIT PRICE MODAL ═══ */}
      {priceModal && (() => {
        const mat = data.rawMaterials.find(m => m.id === priceForm.material_id);
        const costPerUnit = priceForm.unit_amount > 0 ? priceForm.price / priceForm.unit_amount : 0;
        // Conversion
        const conversionMap = { 'L_ml': 1000, 'ml_L': 0.001, 'kg_g': 1000, 'g_kg': 0.001 };
        const factor = conversionMap[`${priceForm.unit}_${mat?.unit}`] || 1;
        const costPerBaseUnit = priceForm.unit_amount > 0 ? priceForm.price / (priceForm.unit_amount * factor) : 0;

        return (
          <Modal title={editPriceId ? 'Editar Precio' : `Agregar Producto — ${detailSupplier?.name}`} onClose={() => setPriceModal(false)}>
            <Select label="Material / Producto" value={priceForm.material_id}
              options={data.rawMaterials.map(m => ({
                value: m.id,
                label: `${m.material_type === 'envase' ? '🫙' : m.material_type === 'etiqueta' ? '🏷️' : '🧪'} ${m.name} (${m.unit})`,
              }))}
              onChange={v => {
                const m = data.rawMaterials.find(rm => rm.id === v);
                setPriceForm({ ...priceForm, material_id: v, unit: m?.unit || 'unidad' });
              }}
              placeholder="Seleccionar material..." />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Input label="Precio ($)" type="number" value={priceForm.price} onChange={v => setPriceForm({ ...priceForm, price: +v })} step="0.01" placeholder="0.45" />
              <Input label="Cantidad" type="number" value={priceForm.unit_amount} onChange={v => setPriceForm({ ...priceForm, unit_amount: +v })} step="0.01" placeholder="1" />
              <Select label="Unidad de venta" value={priceForm.unit}
                options={['unidad', 'ml', 'L', 'g', 'kg', 'oz'].map(u => ({ value: u, label: u }))}
                onChange={v => setPriceForm({ ...priceForm, unit: v })} />
            </div>

            <Input label="Notas (opcional)" value={priceForm.notes} onChange={v => setPriceForm({ ...priceForm, notes: v })} placeholder="Ej: precio de 120+ unidades, mínimo 60, etc." />

            {priceForm.price > 0 && priceForm.unit_amount > 0 && (
              <div style={{
                padding: 14, borderRadius: 'var(--radius-sm)',
                background: 'var(--success-bg)', border: '1px solid rgba(0,214,143,0.2)', marginTop: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
                  <span style={{ color: 'var(--success)' }}>Costo por {mat?.unit || 'unidad'}:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                    {fmt(priceForm.unit === mat?.unit ? costPerUnit : costPerBaseUnit)}
                  </span>
                </div>
                {priceForm.unit !== mat?.unit && mat?.unit && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                    Conversión: ${Number(priceForm.price).toFixed(2)} ÷ ({priceForm.unit_amount} {priceForm.unit} × {factor} {mat.unit}/{priceForm.unit})
                  </div>
                )}
              </div>
            )}

            <ModalActions onCancel={() => setPriceModal(false)} onConfirm={savePrice}
              confirmLabel={saving ? 'Guardando...' : editPriceId ? 'Actualizar' : 'Agregar'}
              confirmDisabled={saving || !priceForm.material_id} />
          </Modal>
        );
      })()}
    </div>
  );
}
