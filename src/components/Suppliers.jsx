import React, { useState } from 'react';
import { Card, Button, Modal, ModalActions, Input } from './UI';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Suppliers({ data, loadData, showToast, searchQuery, user }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', email: '', rif: '', address: '', whatsapp: '' });

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
    try { await db.suppliers.delete(id, name, user); await loadData(); showToast('Proveedor eliminado'); }
    catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  let suppliers = data.suppliers;
  if (searchQuery) suppliers = suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.rif?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{suppliers.length} proveedores</span>
        <Button onClick={openAdd}>+ Nuevo Proveedor</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {suppliers.map(s => {
          const materials = data.rawMaterials.filter(m => m.supplier_id === s.id);
          const totalValue = materials.reduce((sum, m) => sum + m.stock * m.cost, 0);
          const lowStock = materials.filter(m => m.stock <= m.min_stock);
          return (
            <Card key={s.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700 }}>{s.name}</h4>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{s.rif}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>✎</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(s.id, s.name)}>✕</Button>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div>📞 {s.contact}</div>
                <div>✉️ {s.email}</div>
                {s.address && <div>📍 {s.address}</div>}
              </div>
              {materials.length > 0 && (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 8 }}>MATERIALES ({materials.length})</div>
                  {materials.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: m.stock <= m.min_stock ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      <span>{m.stock <= m.min_stock ? '⚠ ' : ''}{m.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{Number(m.stock).toLocaleString()} {m.unit}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 12, fontWeight: 700 }}>
                    <span style={{ color: 'var(--text-dim)' }}>Valor inventario</span>
                    <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{fmt(totalValue)}</span>
                  </div>
                  {lowStock.length > 0 && (
                    <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg)', border: '1px solid rgba(255,90,101,0.15)', fontSize: 11, color: 'var(--danger)' }}>
                      ⚠ {lowStock.length} material(es) con stock bajo
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
    </div>
  );
}
