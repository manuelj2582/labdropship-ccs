import React, { useState, useMemo } from 'react';
import { Card, Button, StatusBadge, Modal, ModalActions, Input, Select, tableStyle, thStyle, tdStyle } from './UI';
import { UNITS } from '../data/initialData';
import * as db from '../lib/db';
import { fmt } from '../utils';

const MATERIAL_TYPES = [
  { id: 'materia_prima', label: 'Materia Prima', icon: '🧪' },
  { id: 'envase', label: 'Envases', icon: '🫙' },
  { id: 'etiqueta', label: 'Etiquetas', icon: '🏷️' },
];

export default function Inventory({ data, loadData, showToast, searchQuery, user }) {
  const [modal, setModal] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('materia_prima');
  const [form, setForm] = useState({ name: '', unit: 'g', stock: 0, min_stock: 0, cost: 0, supplier_id: '', material_type: 'materia_prima' });

  const openAdd = () => {
    setForm({ name: '', unit: activeTab === 'envase' ? 'unidad' : activeTab === 'etiqueta' ? 'unidad' : 'g', stock: 0, min_stock: 0, cost: 0, supplier_id: '', material_type: activeTab, volume: '', volume_unit: 'ml' });
    setEditId(null);
    setModal(true);
  };

  const openEdit = (m) => {
    setForm({ name: m.name, unit: m.unit, stock: m.stock, min_stock: m.min_stock, cost: m.cost, supplier_id: m.supplier_id || '', material_type: m.material_type || 'materia_prima', volume: m.volume || '', volume_unit: m.volume_unit || 'ml' });
    setEditId(m.id);
    setDetailId(null);
    setModal(true);
  };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = { ...form, cost: form.cost || 0, supplier_id: form.supplier_id || null, volume: form.volume || null, volume_unit: form.volume ? (form.volume_unit || 'ml') : null };
      if (editId) {
        await db.rawMaterials.update(editId, payload, user);
        showToast('Material actualizado');
      } else {
        await db.rawMaterials.create(payload, user);
        showToast('Material agregado');
      }
      await loadData();
      setModal(false);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id, name) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    try {
      await db.rawMaterials.delete(id, name, user);
      await loadData();
      showToast('Material eliminado');
      setDetailId(null);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  // Where is this material used?
  const getUsage = (materialId) => {
    // As ingredient in formulas
    const inFormulas = data.formulas.filter(f =>
      (f.ingredients || []).some(ing => ing.material_id === materialId)
    ).map(f => ({ type: 'formula', name: f.name, id: f.id }));

    // As envase in presentations
    const inPresentations = (data.presentations || []).filter(p => p.envase_id === materialId)
      .map(p => {
        const formula = data.formulas.find(f => f.id === p.formula_id);
        return { type: 'presentacion', name: p.name, formulaName: formula?.name, id: p.id };
      });

    return { inFormulas, inPresentations, total: inFormulas.length + inPresentations.length };
  };

  // Supplier prices for a material
  const getPrices = (materialId) => {
    return (data.supplierPrices || [])
      .filter(sp => sp.material_id === materialId)
      .sort((a, b) => a.cost_per_unit - b.cost_per_unit);
  };

  const materialsOfType = useMemo(() => {
    let mats = data.rawMaterials.filter(m => (m.material_type || 'materia_prima') === activeTab);
    if (searchQuery) mats = mats.filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    // Sort envases by volume
    if (activeTab === 'envase') {
      mats.sort((a, b) => (a.volume || 9999) - (b.volume || 9999));
    }
    return mats;
  }, [data.rawMaterials, activeTab, searchQuery]);

  const typeCounts = useMemo(() => {
    const counts = {};
    MATERIAL_TYPES.forEach(t => { counts[t.id] = data.rawMaterials.filter(m => (m.material_type || 'materia_prima') === t.id).length; });
    return counts;
  }, [data.rawMaterials]);

  const totalValue = materialsOfType.reduce((s, m) => s + m.stock * m.cost, 0);
  const detailMaterial = detailId ? data.rawMaterials.find(m => m.id === detailId) : null;

  return (
    <div className="animate-in">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {MATERIAL_TYPES.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 'var(--radius-md)', border: 'none',
            cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
            background: activeTab === t.id ? 'var(--accent-bg-strong)' : 'var(--bg-card)',
            color: activeTab === t.id ? 'var(--accent)' : 'var(--text-dim)',
            borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'var(--transition)',
          }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: activeTab === t.id ? 'var(--accent-bg)' : 'var(--bg-input)', fontFamily: 'var(--font-mono)' }}>{typeCounts[t.id] || 0}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {materialsOfType.length} items · Valor: <strong style={{ color: 'var(--warning)' }}>{fmt(totalValue)}</strong>
        </span>
        <Button onClick={openAdd}>+ Agregar {MATERIAL_TYPES.find(t => t.id === activeTab)?.label}</Button>
      </div>

      {/* Table */}
      <Card>
        <table style={tableStyle}>
          <thead>
            <tr>
              {[...(activeTab === 'envase' ? ['Volumen'] : []), 'Nombre', 'Proveedor', 'Stock', 'Estado', 'Costo/ud', 'Usado en', ''].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materialsOfType.map(m => {
              const isLow = m.stock <= m.min_stock && m.min_stock > 0;
              const usage = getUsage(m.id);
              const prices = getPrices(m.id);
              return (
                <tr key={m.id} onClick={() => setDetailId(m.id)} style={{ background: isLow ? 'rgba(255,90,101,0.03)' : 'transparent', cursor: 'pointer', transition: '0.1s' }}>
                  {activeTab === 'envase' && (
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                      {m.volume ? `${m.volume} ${m.volume_unit || 'ml'}` : '—'}
                    </td>
                  )}
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{m.name}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {m.supplier?.name || '—'}
                    {prices.length > 1 && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>+{prices.length} cot.</span>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Number(m.stock).toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>{m.unit}</span>
                  </td>
                  <td style={tdStyle}><StatusBadge status={isLow ? 'bajo' : 'ok'} /></td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{fmt(m.cost)}/{m.unit}</td>
                  <td style={tdStyle}>
                    {usage.total > 0 ? (
                      <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                        {usage.inFormulas.length > 0 && `${usage.inFormulas.length} fórmula(s)`}
                        {usage.inFormulas.length > 0 && usage.inPresentations.length > 0 && ' · '}
                        {usage.inPresentations.length > 0 && `${usage.inPresentations.length} envase(s)`}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Sin usar</span>
                    )}
                  </td>
                  <td style={tdStyle} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>✎</Button>
                      <Button variant="danger" size="sm" onClick={() => remove(m.id, m.name)}>✕</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {materialsOfType.length === 0 && (
              <tr><td colSpan={activeTab === 'envase' ? 8 : 7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
                No hay {MATERIAL_TYPES.find(t => t.id === activeTab)?.label.toLowerCase()} registrados
              </td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* ═══ DETAIL MODAL ═══ */}
      {detailMaterial && (() => {
        const usage = getUsage(detailMaterial.id);
        const prices = getPrices(detailMaterial.id);
        const isLow = detailMaterial.stock <= detailMaterial.min_stock && detailMaterial.min_stock > 0;
        return (
          <Modal title={detailMaterial.name} onClose={() => setDetailId(null)} wide>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: detailMaterial.material_type === 'envase' ? 'rgba(96,165,250,0.1)' : detailMaterial.material_type === 'etiqueta' ? 'rgba(251,191,36,0.1)' : 'rgba(167,139,250,0.1)',
                  color: detailMaterial.material_type === 'envase' ? '#60A5FA' : detailMaterial.material_type === 'etiqueta' ? '#FBBF24' : '#A78BFA',
                }}>{MATERIAL_TYPES.find(t => t.id === (detailMaterial.material_type || 'materia_prima'))?.icon} {detailMaterial.material_type || 'materia_prima'}</span>
                {isLow && <StatusBadge status="bajo" />}
                <Button variant="ghost" size="sm" onClick={() => openEdit(detailMaterial)}>✎ Editar</Button>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>{fmt(detailMaterial.cost)}<span style={{ fontSize: 12, color: 'var(--text-dim)' }}>/{detailMaterial.unit}</span></div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Stock: {Number(detailMaterial.stock).toLocaleString()} {detailMaterial.unit}</div>
                {detailMaterial.volume && <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Volumen: {detailMaterial.volume} {detailMaterial.volume_unit || 'ml'}</div>}
              </div>
            </div>

            {/* Where is it used */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
                📌 USADO EN ({usage.total})
              </div>
              {usage.total === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 0' }}>Este material no está siendo usado en ninguna fórmula o presentación</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {usage.inFormulas.map(f => (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: 14 }}>🧪</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Como ingrediente en fórmula</div>
                      </div>
                    </div>
                  ))}
                  {usage.inPresentations.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: 14 }}>🫙</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Envase de {p.formulaName || 'fórmula'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Supplier prices */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
                💲 PRECIOS DE PROVEEDORES ({prices.length})
              </div>
              {prices.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 0' }}>Sin cotizaciones — ve al módulo Cotizador para agregar precios</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {prices.map((p, i) => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                      background: i === 0 ? 'var(--success-bg)' : 'var(--bg-input)',
                      border: `1px solid ${i === 0 ? 'rgba(0,214,143,0.2)' : 'var(--border)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {i === 0 && prices.length > 1 && <span>🏆</span>}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{p.supplier?.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            ${Number(p.price).toFixed(2)} por {p.unit_amount}{p.unit}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)',
                        color: i === 0 ? 'var(--success)' : 'var(--text-primary)',
                      }}>
                        {fmt(p.cost_per_unit)}<span style={{ fontSize: 10, color: 'var(--text-dim)' }}>/{detailMaterial.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* ═══ ADD/EDIT MODAL ═══ */}
      {modal && (
        <Modal title={editId ? 'Editar Material' : `Agregar ${MATERIAL_TYPES.find(t => t.id === form.material_type)?.label || 'Material'}`} onClose={() => setModal(false)}>
          <Input label="Nombre" value={form.name} onChange={v => setForm({ ...form, name: v })}
            placeholder={form.material_type === 'envase' ? 'Ej: Frasco gotero 30ml' : form.material_type === 'etiqueta' ? 'Ej: Etiqueta Serum Vit C' : 'Ej: Ácido Hialurónico'} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Tipo" value={form.material_type} options={MATERIAL_TYPES.map(t => ({ value: t.id, label: t.icon + ' ' + t.label }))} onChange={v => setForm({ ...form, material_type: v })} />
            <Select label="Unidad" value={form.unit} options={UNITS} onChange={v => setForm({ ...form, unit: v })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Stock Actual" type="number" value={form.stock} onChange={v => setForm({ ...form, stock: +v })} />
            <Input label="Stock Mínimo" type="number" value={form.min_stock} onChange={v => setForm({ ...form, min_stock: +v })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label={`Costo por ${form.unit || 'unidad'} ($)`} type="number" value={form.cost} onChange={v => setForm({ ...form, cost: +v })} step="0.0001" placeholder="0.00" />
            <Select label="Proveedor" value={form.supplier_id} options={data.suppliers.map(s => ({ value: s.id, label: s.name }))} onChange={v => setForm({ ...form, supplier_id: v })} placeholder="Opcional" />
          </div>
          {form.material_type === 'envase' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Input label="Volumen del envase" type="number" value={form.volume} onChange={v => setForm({ ...form, volume: +v })} step="0.1" placeholder="Ej: 30, 60, 120..." />
              <Select label="Unidad" value={form.volume_unit} options={['ml', 'L', 'oz', 'g', 'kg'].map(u => ({ value: u, label: u }))} onChange={v => setForm({ ...form, volume_unit: v })} />
            </div>
          )}
          <ModalActions onCancel={() => setModal(false)} onConfirm={save} confirmLabel={saving ? 'Guardando...' : editId ? 'Actualizar' : 'Agregar'} confirmDisabled={saving} />
        </Modal>
      )}
    </div>
  );
}
