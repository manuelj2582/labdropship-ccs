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
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('materia_prima');
  const [form, setForm] = useState({ name: '', unit: 'g', stock: 0, min_stock: 0, cost: 0, supplier_id: '', material_type: 'materia_prima' });

  const openAdd = () => {
    setForm({ name: '', unit: activeTab === 'envase' ? 'unidad' : activeTab === 'etiqueta' ? 'unidad' : 'g', stock: 0, min_stock: 0, cost: 0, supplier_id: '', material_type: activeTab });
    setEditId(null);
    setModal(true);
  };

  const openEdit = (m) => {
    setForm({ name: m.name, unit: m.unit, stock: m.stock, min_stock: m.min_stock, cost: m.cost, supplier_id: m.supplier_id || '', material_type: m.material_type || 'materia_prima' });
    setEditId(m.id);
    setModal(true);
  };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = { ...form, cost: form.cost || 0, supplier_id: form.supplier_id || null };
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
    try {
      await db.rawMaterials.delete(id, name, user);
      await loadData();
      showToast('Material eliminado');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const materialsOfType = useMemo(() => {
    let mats = data.rawMaterials.filter(m => (m.material_type || 'materia_prima') === activeTab);
    if (searchQuery) mats = mats.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return mats;
  }, [data.rawMaterials, activeTab, searchQuery]);

  const typeCounts = useMemo(() => {
    const counts = {};
    MATERIAL_TYPES.forEach(t => { counts[t.id] = data.rawMaterials.filter(m => (m.material_type || 'materia_prima') === t.id).length; });
    return counts;
  }, [data.rawMaterials]);

  const totalValue = materialsOfType.reduce((s, m) => s + m.stock * m.cost, 0);

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
            <span style={{
              padding: '2px 8px', borderRadius: 20, fontSize: 11,
              background: activeTab === t.id ? 'var(--accent-bg)' : 'var(--bg-input)',
              fontFamily: 'var(--font-mono)',
            }}>{typeCounts[t.id] || 0}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {materialsOfType.length} items · Valor: <strong style={{ color: 'var(--warning)' }}>{fmt(totalValue)}</strong>
        </span>
        <Button onClick={openAdd}>+ Agregar {MATERIAL_TYPES.find(t => t.id === activeTab)?.label}</Button>
      </div>

      <Card>
        <table style={tableStyle}>
          <thead>
            <tr>
              {['Nombre', 'Proveedor', 'Stock', 'Mínimo', 'Estado', 'Costo/ud', 'Valor', ''].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materialsOfType.map(m => {
              const isLow = m.stock <= m.min_stock;
              return (
                <tr key={m.id} style={{ background: isLow ? 'rgba(255,90,101,0.03)' : 'transparent' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {m.name}
                    {activeTab === 'envase' && m.unit && <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>({m.unit})</span>}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-secondary)' }}>{m.supplier?.name || '—'}</td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Number(m.stock).toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>{m.unit}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{m.min_stock} {m.unit}</td>
                  <td style={tdStyle}><StatusBadge status={isLow ? 'bajo' : 'ok'} /></td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{fmt(m.cost)}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>{fmt(m.stock * m.cost)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>✎</Button>
                      <Button variant="danger" size="sm" onClick={() => remove(m.id, m.name)}>✕</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {materialsOfType.length === 0 && (
              <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
                No hay {MATERIAL_TYPES.find(t => t.id === activeTab)?.label.toLowerCase()} registrados
              </td></tr>
            )}
          </tbody>
        </table>
      </Card>

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
            <Input label="Costo por unidad ($)" type="number" value={form.cost} onChange={v => setForm({ ...form, cost: +v })} step="0.01" />
            <Select label="Proveedor" value={form.supplier_id} options={data.suppliers.map(s => ({ value: s.id, label: s.name }))} onChange={v => setForm({ ...form, supplier_id: v })} placeholder="Opcional" />
          </div>
          <ModalActions onCancel={() => setModal(false)} onConfirm={save} confirmLabel={saving ? 'Guardando...' : editId ? 'Actualizar' : 'Agregar'} confirmDisabled={saving} />
        </Modal>
      )}
    </div>
  );
}
