import React, { useState } from 'react';
import { Card, Button, StatusBadge, Modal, ModalActions, Input, Select, tableStyle, thStyle, tdStyle } from './UI';
import { UNITS } from '../data/initialData';
import { fmt, genId } from '../utils';

export default function Inventory({ data, setData, showToast }) {
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', unit: 'g', stock: 0, minStock: 0, cost: 0, supplierId: '' });

  const openAdd = () => {
    setForm({ name: '', unit: 'g', stock: 0, minStock: 0, cost: 0, supplierId: '' });
    setEditId(null);
    setModal('form');
  };

  const openEdit = (m) => {
    setForm({ name: m.name, unit: m.unit, stock: m.stock, minStock: m.minStock, cost: m.cost, supplierId: m.supplierId });
    setEditId(m.id);
    setModal('form');
  };

  const save = () => {
    if (!form.name) return;
    if (editId) {
      setData(d => ({
        ...d,
        rawMaterials: d.rawMaterials.map(m => m.id === editId ? { ...m, ...form } : m),
      }));
      showToast('Material actualizado');
    } else {
      setData(d => ({
        ...d,
        rawMaterials: [...d.rawMaterials, { ...form, id: 'rm' + genId() }],
      }));
      showToast('Material agregado');
    }
    setModal(null);
  };

  const remove = (id) => {
    setData(d => ({ ...d, rawMaterials: d.rawMaterials.filter(m => m.id !== id) }));
    showToast('Material eliminado', 'danger');
  };

  const totalValue = data.rawMaterials.reduce((s, m) => s + m.stock * m.cost, 0);

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {data.rawMaterials.length} materiales · Valor total: <strong style={{ color: 'var(--warning)' }}>{fmt(totalValue)}</strong>
          </span>
        </div>
        <Button onClick={openAdd}>+ Agregar Material</Button>
      </div>

      <Card>
        <table style={tableStyle}>
          <thead>
            <tr>
              {['Material', 'Proveedor', 'Stock Actual', 'Mínimo', 'Estado', 'Costo/ud', 'Valor', ''].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rawMaterials.map(m => {
              const supplier = data.suppliers.find(s => s.id === m.supplierId);
              const isLow = m.stock <= m.minStock;
              const pct = m.minStock > 0 ? (m.stock / m.minStock) * 100 : 100;
              return (
                <tr key={m.id} style={{ background: isLow ? 'rgba(255,90,101,0.03)' : 'transparent' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{m.name}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-secondary)' }}>{supplier?.name || '—'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{m.stock.toLocaleString()}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{m.unit}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 4, width: 80 }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        width: `${Math.min(pct, 100)}%`,
                        background: pct > 150 ? 'var(--success)' : pct > 100 ? 'var(--warning)' : 'var(--danger)',
                      }} />
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{m.minStock} {m.unit}</td>
                  <td style={tdStyle}><StatusBadge status={isLow ? 'bajo' : 'ok'} /></td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{fmt(m.cost)}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>{fmt(m.stock * m.cost)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>Editar</Button>
                      <Button variant="danger" size="sm" onClick={() => remove(m.id)}>✕</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {modal === 'form' && (
        <Modal title={editId ? 'Editar Material' : 'Agregar Materia Prima'} onClose={() => setModal(null)}>
          <Input label="Nombre" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Unidad" value={form.unit} options={UNITS} onChange={v => setForm({ ...form, unit: v })} />
            <Input label="Stock Actual" type="number" value={form.stock} onChange={v => setForm({ ...form, stock: +v })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Stock Mínimo" type="number" value={form.minStock} onChange={v => setForm({ ...form, minStock: +v })} />
            <Input label="Costo por unidad ($)" type="number" value={form.cost} onChange={v => setForm({ ...form, cost: +v })} step="0.01" />
          </div>
          <Select
            label="Proveedor"
            value={form.supplierId}
            options={data.suppliers.map(s => ({ value: s.id, label: s.name }))}
            onChange={v => setForm({ ...form, supplierId: v })}
            placeholder="Seleccionar..."
          />
          <ModalActions onCancel={() => setModal(null)} onConfirm={save} confirmLabel={editId ? 'Actualizar' : 'Agregar'} />
        </Modal>
      )}
    </div>
  );
}
