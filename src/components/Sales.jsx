import React, { useState } from 'react';
import { Card, Button, Modal, ModalActions, Input, Select, Textarea, StatusBadge, tableStyle, thStyle, tdStyle } from './UI';
import { PAYMENT_METHODS } from '../data/initialData';
import * as db from '../lib/db';
import { generateInvoicePDF, generateDeliveryNotePDF } from '../lib/pdf';
import { fmt, fmtDate, today } from '../utils';

export default function Sales({ data, loadData, showToast, searchQuery }) {
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: '', items: [{ productId: '', qty: 0, unitPrice: 0 }],
    paymentMethod: 'Transferencia', notes: '',
  });

  const openNew = () => {
    setForm({ clientId: '', items: [{ productId: '', qty: 0, unitPrice: 0 }], paymentMethod: 'Transferencia', notes: '' });
    setModal(true);
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', qty: 0, unitPrice: 0 }] });
  const updateItem = (i, k, v) => {
    const items = [...form.items];
    if (k === 'productId') {
      const prod = data.products.find(p => p.id === v);
      items[i] = { ...items[i], productId: v, unitPrice: prod?.price || 0 };
    } else {
      items[i] = { ...items[i], [k]: k === 'qty' || k === 'unitPrice' ? +v : v };
    }
    setForm({ ...form, items });
  };
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const total = form.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const totalUnits = form.items.reduce((s, it) => s + it.qty, 0);

  const save = async () => {
    if (!form.clientId || form.items.some(i => !i.productId || !i.qty)) return;
    const client = data.clients.find(c => c.id === form.clientId);
    if (!client) return;
    setSaving(true);
    try {
      await db.sales.create({
        date: today(),
        clientId: client.id,
        clientName: client.name,
        clientRif: client.rif,
        clientContact: client.contact,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      }, form.items.map(it => ({ productId: it.productId, qty: it.qty, unitPrice: it.unitPrice })));
      await loadData();
      showToast(`Pedido registrado · ${totalUnits} uds · ${fmt(total)}`);
      setModal(false);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (saleId, newStatus) => {
    try {
      await db.sales.updateStatus(saleId, newStatus);
      await loadData();
      showToast(`Pedido ${newStatus}`);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const removeSale = async (saleId) => {
    if (!confirm('¿Eliminar esta venta? Se restaurará el stock.')) return;
    try {
      await db.sales.delete(saleId);
      await loadData();
      showToast('Venta eliminada y stock restaurado');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const downloadInvoice = (sale) => {
    generateInvoicePDF(sale, data.products);
  };

  const downloadDeliveryNote = (sale) => {
    generateDeliveryNotePDF(sale, data.products);
  };

  let filtered = filter === 'all' ? data.sales : data.sales.filter(s => s.status === filter);
  if (searchQuery) filtered = filtered.filter(s =>
    s.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.invoice_num?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = data.sales.reduce((s, sale) => s + (sale.items || []).reduce((si, it) => si + it.qty * it.unit_price, 0), 0);
  const pendingAmount = data.sales.filter(s => s.status === 'pendiente').reduce((s, sale) => s + (sale.items || []).reduce((si, it) => si + it.qty * it.unit_price, 0), 0);

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { id: 'all', label: `Todos (${data.sales.length})` },
              { id: 'pendiente', label: 'Pendientes' },
              { id: 'enviada', label: 'Enviados' },
              { id: 'completada', label: 'Completados' },
            ].map(f => (
              <Button key={f.id} variant={filter === f.id ? 'primary' : 'muted'} size="sm" onClick={() => setFilter(f.id)}>{f.label}</Button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 8 }}>
            Total: <strong style={{ color: 'var(--success)' }}>{fmt(totalRevenue)}</strong>
            {pendingAmount > 0 && <> · Pendiente: <strong style={{ color: 'var(--warning)' }}>{fmt(pendingAmount)}</strong></>}
          </span>
        </div>
        <Button variant="success" onClick={openNew}>+ Pedido Mayorista</Button>
      </div>

      <Card>
        <table style={tableStyle}>
          <thead>
            <tr>
              {['Factura', 'Fecha', 'Cliente', 'Productos', 'Uds', 'Total', 'Pago', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(sale => {
              const saleTotal = (sale.items || []).reduce((s, it) => s + it.qty * it.unit_price, 0);
              const saleUnits = (sale.items || []).reduce((s, it) => s + it.qty, 0);
              return (
                <tr key={sale.id}>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>{sale.invoice_num}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{fmtDate(sale.date)}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{sale.client_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{sale.client_rif}</div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>
                    {(sale.items || []).map((it, i) => {
                      const p = data.products.find(pr => pr.id === it.product_id);
                      return <div key={i}>{p?.name} <span style={{ color: 'var(--text-dim)' }}>×{it.qty}</span></div>;
                    })}
                    {sale.notes && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3, fontStyle: 'italic' }}>📝 {sale.notes}</div>}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'center' }}>{saleUnits.toLocaleString()}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)', fontSize: 14 }}>{fmt(saleTotal)}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-secondary)' }}>{sale.payment_method}</td>
                  <td style={tdStyle}><StatusBadge status={sale.status} /></td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {sale.status === 'pendiente' && (
                        <>
                          <Button variant="warningGhost" size="sm" onClick={() => updateStatus(sale.id, 'enviada')}>Enviar</Button>
                          <Button variant="successGhost" size="sm" onClick={() => updateStatus(sale.id, 'completada')}>Cobrar</Button>
                        </>
                      )}
                      {sale.status === 'enviada' && (
                        <Button variant="successGhost" size="sm" onClick={() => updateStatus(sale.id, 'completada')}>Cobrar</Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => downloadInvoice(sale)}>📄 PDF</Button>
                      <Button variant="muted" size="sm" onClick={() => downloadDeliveryNote(sale)}>📋 Nota</Button>
                      <Button variant="danger" size="sm" onClick={() => removeSale(sale.id)}>✕</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {modal && (
        <Modal title="Nuevo Pedido Mayorista" onClose={() => setModal(false)} wide>
          <Select
            label="Cliente (Dropshipper)"
            value={form.clientId}
            options={data.clients.map(c => ({ value: c.id, label: `${c.name} · ${c.rif} (${c.client_type})` }))}
            onChange={v => setForm({ ...form, clientId: v })}
            placeholder="Seleccionar cliente..."
          />
          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 8 }}>Productos</label>
            {form.items.map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 90px 80px auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <Select value={it.productId} options={data.products.map(pr => ({ value: pr.id, label: `${pr.name} (${pr.stock} disp.)` }))} onChange={v => updateItem(i, 'productId', v)} placeholder="Producto..." />
                <Input type="number" value={it.qty} onChange={v => updateItem(i, 'qty', v)} placeholder="Cant." min="1" />
                <Input type="number" value={it.unitPrice} onChange={v => updateItem(i, 'unitPrice', v)} placeholder="Precio" step="0.01" />
                <span style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'right' }}>{fmt(it.qty * it.unitPrice)}</span>
                <Button variant="danger" size="sm" onClick={() => removeItem(i)}>✕</Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addItem}>+ Producto</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <Select label="Método de Pago" value={form.paymentMethod} options={PAYMENT_METHODS} onChange={v => setForm({ ...form, paymentMethod: v })} />
            <div style={{ paddingTop: 24, textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{totalUnits.toLocaleString()} unidades</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{fmt(total)}</div>
            </div>
          </div>
          <Textarea label="Notas" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Envío, descuentos, etc." />
          <ModalActions onCancel={() => setModal(false)} onConfirm={save} confirmLabel={saving ? 'Guardando...' : 'Registrar Pedido'} confirmDisabled={saving} confirmVariant="success" />
        </Modal>
      )}
    </div>
  );
}
