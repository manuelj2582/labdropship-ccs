import React, { useState, useMemo } from 'react';
import { Card, Button, Modal, ModalActions, Input, Select, tableStyle, thStyle, tdStyle } from './UI';
import { CLIENT_TYPES } from '../data/initialData';
import { fmt, genId } from '../utils';

export default function Clients({ data, setData, showToast }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', rif: '', contact: '', email: '', type: 'Nuevo', creditDays: 0 });

  const clientStats = useMemo(() => {
    const stats = {};
    data.clients.forEach(c => {
      const clientSales = data.sales.filter(s => s.client.rif === c.rif);
      const totalPurchased = clientSales.reduce((s, sale) =>
        s + sale.items.reduce((si, it) => si + it.qty * it.unitPrice, 0), 0);
      const totalUnits = clientSales.reduce((s, sale) =>
        s + sale.items.reduce((si, it) => si + it.qty, 0), 0);
      const pendingAmount = clientSales
        .filter(s => s.status !== 'completada')
        .reduce((s, sale) => s + sale.items.reduce((si, it) => si + it.qty * it.unitPrice, 0), 0);
      stats[c.id] = { totalPurchased, totalUnits, pendingAmount, orders: clientSales.length };
    });
    return stats;
  }, [data]);

  const openAdd = () => {
    setForm({ name: '', rif: '', contact: '', email: '', type: 'Nuevo', creditDays: 0 });
    setEditId(null);
    setModal(true);
  };

  const openEdit = (c) => {
    setForm({ name: c.name, rif: c.rif, contact: c.contact, email: c.email, type: c.type, creditDays: c.creditDays });
    setEditId(c.id);
    setModal(true);
  };

  const save = () => {
    if (!form.name || !form.rif) return;
    if (editId) {
      setData(d => ({
        ...d,
        clients: d.clients.map(c => c.id === editId ? { ...c, ...form } : c),
      }));
      showToast('Cliente actualizado');
    } else {
      setData(d => ({
        ...d,
        clients: [...d.clients, { ...form, id: 'cl' + genId(), totalPurchased: 0 }],
      }));
      showToast('Cliente registrado');
    }
    setModal(false);
  };

  const typeColors = {
    'Nuevo': { bg: 'var(--accent-bg)', color: 'var(--accent)', border: 'rgba(108,114,255,0.2)' },
    'Regular': { bg: 'var(--success-bg)', color: 'var(--success)', border: 'rgba(0,214,143,0.2)' },
    'Premium': { bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'rgba(255,181,71,0.2)' },
    'VIP': { bg: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(108,114,255,0.15))', color: '#A78BFA', border: 'rgba(167,139,250,0.3)' },
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {data.clients.length} dropshippers registrados
        </span>
        <Button onClick={openAdd}>+ Nuevo Cliente</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {data.clients.map(c => {
          const st = clientStats[c.id] || { totalPurchased: 0, totalUnits: 0, pendingAmount: 0, orders: 0 };
          const tc = typeColors[c.type] || typeColors['Nuevo'];
          return (
            <Card key={c.id} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span style={{
                    background: tc.bg, color: tc.color, padding: '3px 10px',
                    borderRadius: 20, fontSize: 10, fontWeight: 700,
                    border: `1px solid ${tc.border}`, fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.05em',
                  }}>{c.type.toUpperCase()}</span>
                  <h4 style={{ margin: '8px 0 2px', fontSize: 16, fontWeight: 700 }}>{c.name}</h4>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{c.rif}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Editar</Button>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div>📞 {c.contact}</div>
                <div>✉️ {c.email}</div>
                {c.creditDays > 0 && <div>🏦 Crédito: {c.creditDays} días</div>}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em' }}>COMPRAS</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                    {fmt(st.totalPurchased)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{st.totalUnits.toLocaleString()} uds · {st.orders} pedidos</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em' }}>POR COBRAR</div>
                  <div style={{
                    fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em',
                    color: st.pendingAmount > 0 ? 'var(--warning)' : 'var(--text-dim)',
                  }}>
                    {fmt(st.pendingAmount)}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={editId ? 'Editar Cliente' : 'Nuevo Cliente Dropshipper'} onClose={() => setModal(false)}>
          <Input label="Nombre / Razón Social" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Input label="RIF" value={form.rif} onChange={v => setForm({ ...form, rif: v })} placeholder="J-00000000-0" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Teléfono" value={form.contact} onChange={v => setForm({ ...form, contact: v })} placeholder="+58 4XX-XXX-XXXX" />
            <Input label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Tipo de Cliente" value={form.type} options={CLIENT_TYPES} onChange={v => setForm({ ...form, type: v })} />
            <Input label="Días de Crédito" type="number" value={form.creditDays} onChange={v => setForm({ ...form, creditDays: +v })} min="0" />
          </div>
          <ModalActions onCancel={() => setModal(false)} onConfirm={save} confirmLabel={editId ? 'Actualizar' : 'Registrar'} />
        </Modal>
      )}
    </div>
  );
}
