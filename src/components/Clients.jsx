import React, { useState, useMemo } from 'react';
import { Card, Button, Modal, ModalActions, Input, Select } from './UI';
import { CLIENT_TYPES } from '../data/initialData';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Clients({ data, loadData, showToast, searchQuery }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', rif: '', contact: '', email: '', client_type: 'Nuevo', credit_days: 0 });

  const clientStats = useMemo(() => {
    const stats = {};
    data.clients.forEach(c => {
      const cs = data.sales.filter(s => s.client_rif === c.rif);
      const totalPurchased = cs.reduce((s, sale) => s + (sale.items || []).reduce((si, it) => si + it.qty * it.unit_price, 0), 0);
      const totalUnits = cs.reduce((s, sale) => s + (sale.items || []).reduce((si, it) => si + it.qty, 0), 0);
      const pending = cs.filter(s => s.status !== 'completada').reduce((s, sale) => s + (sale.items || []).reduce((si, it) => si + it.qty * it.unit_price, 0), 0);
      stats[c.id] = { totalPurchased, totalUnits, pending, orders: cs.length };
    });
    return stats;
  }, [data]);

  const openAdd = () => { setForm({ name: '', rif: '', contact: '', email: '', client_type: 'Nuevo', credit_days: 0 }); setEditId(null); setModal(true); };
  const openEdit = (c) => { setForm({ name: c.name, rif: c.rif, contact: c.contact, email: c.email, client_type: c.client_type, credit_days: c.credit_days }); setEditId(c.id); setModal(true); };

  const save = async () => {
    if (!form.name || !form.rif) return;
    setSaving(true);
    try {
      if (editId) { await db.clients.update(editId, form); showToast('Cliente actualizado'); }
      else { await db.clients.create(form); showToast('Cliente registrado'); }
      await loadData();
      setModal(false);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    try { await db.clients.delete(id); await loadData(); showToast('Cliente eliminado'); }
    catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const typeColors = {
    'Nuevo': { bg: 'var(--accent-bg)', color: 'var(--accent)', border: 'rgba(108,114,255,0.2)' },
    'Regular': { bg: 'var(--success-bg)', color: 'var(--success)', border: 'rgba(0,214,143,0.2)' },
    'Premium': { bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'rgba(255,181,71,0.2)' },
    'VIP': { bg: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: 'rgba(167,139,250,0.3)' },
  };

  let clients = data.clients;
  if (searchQuery) clients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.rif?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{clients.length} dropshippers</span>
        <Button onClick={openAdd}>+ Nuevo Cliente</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {clients.map(c => {
          const st = clientStats[c.id] || { totalPurchased: 0, totalUnits: 0, pending: 0, orders: 0 };
          const tc = typeColors[c.client_type] || typeColors['Nuevo'];
          return (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span style={{ background: tc.bg, color: tc.color, padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, border: `1px solid ${tc.border}`, fontFamily: 'var(--font-mono)' }}>{c.client_type?.toUpperCase()}</span>
                  <h4 style={{ margin: '8px 0 2px', fontSize: 16, fontWeight: 700 }}>{c.name}</h4>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{c.rif}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>✎</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(c.id)}>✕</Button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div>📞 {c.contact}</div>
                <div>✉️ {c.email}</div>
                {c.credit_days > 0 && <div>🏦 Crédito: {c.credit_days} días</div>}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>COMPRAS</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{fmt(st.totalPurchased)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{st.totalUnits.toLocaleString()} uds · {st.orders} pedidos</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>POR COBRAR</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: st.pending > 0 ? 'var(--warning)' : 'var(--text-dim)' }}>{fmt(st.pending)}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal title={editId ? 'Editar Cliente' : 'Nuevo Dropshipper'} onClose={() => setModal(false)}>
          <Input label="Nombre / Razón Social" value={form.name} onChange={v => setForm({...form, name: v})} />
          <Input label="RIF" value={form.rif} onChange={v => setForm({...form, rif: v})} placeholder="J-00000000-0" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Teléfono" value={form.contact} onChange={v => setForm({...form, contact: v})} placeholder="+58 4XX-XXX-XXXX" />
            <Input label="Email" value={form.email} onChange={v => setForm({...form, email: v})} type="email" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Tipo" value={form.client_type} options={CLIENT_TYPES} onChange={v => setForm({...form, client_type: v})} />
            <Input label="Días Crédito" type="number" value={form.credit_days} onChange={v => setForm({...form, credit_days: +v})} min="0" />
          </div>
          <ModalActions onCancel={() => setModal(false)} onConfirm={save} confirmLabel={saving ? 'Guardando...' : editId ? 'Actualizar' : 'Registrar'} confirmDisabled={saving} />
        </Modal>
      )}
    </div>
  );
}
