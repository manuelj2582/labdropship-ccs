import React, { useState } from 'react';
import { Card, Button, Modal, ModalActions, Input } from './UI';
import { fmt, genId } from '../utils';

export default function Suppliers({ data, setData, showToast }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', contact: '', email: '', rif: '', address: '' });

  const openAdd = () => {
    setForm({ name: '', contact: '', email: '', rif: '', address: '' });
    setEditId(null);
    setModal(true);
  };

  const openEdit = (s) => {
    setForm({ name: s.name, contact: s.contact, email: s.email, rif: s.rif, address: s.address || '' });
    setEditId(s.id);
    setModal(true);
  };

  const save = () => {
    if (!form.name) return;
    if (editId) {
      setData(d => ({
        ...d,
        suppliers: d.suppliers.map(s => s.id === editId ? { ...s, ...form } : s),
      }));
      showToast('Proveedor actualizado');
    } else {
      setData(d => ({
        ...d,
        suppliers: [...d.suppliers, { ...form, id: 'sup' + genId() }],
      }));
      showToast('Proveedor agregado');
    }
    setModal(false);
  };

  const remove = (id) => {
    setData(d => ({ ...d, suppliers: d.suppliers.filter(s => s.id !== id) }));
    showToast('Proveedor eliminado', 'danger');
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {data.suppliers.length} proveedores registrados
        </span>
        <Button onClick={openAdd}>+ Nuevo Proveedor</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {data.suppliers.map(s => {
          const materials = data.rawMaterials.filter(m => m.supplierId === s.id);
          const totalValue = materials.reduce((sum, m) => sum + m.stock * m.cost, 0);
          const lowStockMats = materials.filter(m => m.stock <= m.minStock);
          return (
            <Card key={s.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700 }}>{s.name}</h4>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{s.rif}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Editar</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(s.id)}>✕</Button>
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div>📞 {s.contact}</div>
                <div>✉️ {s.email}</div>
                {s.address && <div>📍 {s.address}</div>}
              </div>

              {materials.length > 0 && (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{
                    fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
                    fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8,
                  }}>
                    MATERIALES SUMINISTRADOS ({materials.length})
                  </div>
                  {materials.map(m => {
                    const isLow = m.stock <= m.minStock;
                    return (
                      <div key={m.id} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '4px 0', fontSize: 12,
                        color: isLow ? 'var(--danger)' : 'var(--text-secondary)',
                      }}>
                        <span>{isLow ? '⚠ ' : ''}{m.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          {m.stock.toLocaleString()} {m.unit} · {fmt(m.cost)}/{m.unit}
                        </span>
                      </div>
                    );
                  })}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    <span style={{ color: 'var(--text-dim)' }}>Valor en inventario</span>
                    <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{fmt(totalValue)}</span>
                  </div>
                  {lowStockMats.length > 0 && (
                    <div style={{
                      marginTop: 8, padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--danger-bg)', border: '1px solid rgba(255,90,101,0.15)',
                      fontSize: 11, color: 'var(--danger)',
                    }}>
                      ⚠ {lowStockMats.length} material(es) con stock bajo — considerar reabastecimiento
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={editId ? 'Editar Proveedor' : 'Nuevo Proveedor'} onClose={() => setModal(false)}>
          <Input label="Nombre / Razón Social" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Input label="RIF" value={form.rif} onChange={v => setForm({ ...form, rif: v })} placeholder="J-00000000-0" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Teléfono" value={form.contact} onChange={v => setForm({ ...form, contact: v })} placeholder="+58 2XX-XXX-XXXX" />
            <Input label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" />
          </div>
          <Input label="Dirección" value={form.address} onChange={v => setForm({ ...form, address: v })} placeholder="Dirección en Caracas..." />
          <ModalActions onCancel={() => setModal(false)} onConfirm={save} confirmLabel={editId ? 'Actualizar' : 'Agregar'} />
        </Modal>
      )}
    </div>
  );
}
