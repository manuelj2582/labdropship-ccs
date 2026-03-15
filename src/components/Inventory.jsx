import React, { useState } from 'react';
import { Card, Button, StatusBadge, Modal, ModalActions, Input, Select, tableStyle, thStyle, tdStyle } from './UI';
import { UNITS } from '../data/initialData';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Inventory({ data, loadData, showToast, searchQuery }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', unit: 'g', stock: 0, min_stock: 0, cost: 0, supplier_id: '' });
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setForm({ name: '', unit: 'g', stock: 0, min_stock: 0, cost: 0, supplier_id: '' }); setEditId(null); setModal(true); };
  const openEdit = (m) => { setForm({ name: m.name, unit: m.unit, stock: m.stock, min_stock: m.min_stock, cost: m.cost, supplier_id: m.supplier_id || '' }); setEditId(m.id); setModal(true); };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editId) {
        await db.rawMaterials.update(editId, form, user);
        showToast('Material actualizado');
      } else {
        await db.rawMaterials.create(form, user);
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

  const materials = searchQuery
    ? data.rawMaterials.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : data.rawMaterials;

  const totalValue = data.rawMaterials.reduce((s, m) => s + m.stock * m.cost, 0);

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {materials.length} materiales · Valor: <strong style={{ color: 'var(--warning)' }}>{fmt(totalValue)}</strong>
        </span>
        <Button onClick={openAdd}>+ Agregar Material</Button>
      </div>
      <Card>
        <table style={tableStyle}>
          <thead><tr>{['Material','Proveedor','Stock','Mínimo','Estado','Costo/ud','Valor',''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {materials.map(m => {
              const isLow = m.stock <= m.min_stock;
              return (
                <tr key={m.id} style={{ background: isLow ? 'rgba(255,90,101,0.03)' : 'transparent' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{m.name}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-secondary)' }}>{m.supplier?.name || '—'}</td>
                  <td style={tdStyle}><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Number(m.stock).toLocaleString()}</span> <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{m.unit}</span></td>
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{m.min_stock} {m.unit}</td>
                  <td style={tdStyle}><StatusBadge status={isLow ? 'bajo' : 'ok'} /></td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{fmt(m.cost)}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>{fmt(m.stock * m.cost)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>Editar</Button>
                      <Button variant="danger" size="sm" onClick={() => remove(m.id, m.name)}>✕</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      {modal && (
        <Modal title={editId ? 'Editar Material' : 'Agregar Materia Prima'} onClose={() => setModal(false)}>
          <Input label="Nombre" value={form.name} onChange={v => setForm({...form, name: v})} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Unidad" value={form.unit} options={UNITS} onChange={v => setForm({...form, unit: v})} />
            <Input label="Stock Actual" type="number" value={form.stock} onChange={v => setForm({...form, stock: +v})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Stock Mínimo" type="number" value={form.min_stock} onChange={v => setForm({...form, min_stock: +v})} />
            <Input label="Costo/unidad ($)" type="number" value={form.cost} onChange={v => setForm({...form, cost: +v})} step="0.01" />
          </div>
          <Select label="Proveedor" value={form.supplier_id} options={data.suppliers.map(s => ({value: s.id, label: s.name}))} onChange={v => setForm({...form, supplier_id: v})} placeholder="Seleccionar..." />
          <ModalActions onCancel={() => setModal(false)} onConfirm={save} confirmLabel={saving ? 'Guardando...' : editId ? 'Actualizar' : 'Agregar'} confirmDisabled={saving} />
        </Modal>
      )}
    </div>
  );
}
