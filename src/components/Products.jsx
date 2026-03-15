import React, { useState } from 'react';
import { Card, Button, Modal, ModalActions, Input, CategoryTag } from './UI';
import { CATEGORIES } from '../data/initialData';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Products({ data, formulasWithCosts, loadData, showToast, searchQuery }) {
  const [filter, setFilter] = useState('all');
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({ price: 0, stock: 0 });

  const openEdit = (p) => { setForm({ price: p.price, stock: p.stock }); setEditModal(p); };

  const save = async () => {
    if (!editModal) return;
    try {
      await db.products.update(editModal.id, { price: +form.price, stock: +form.stock });
      await loadData();
      showToast('Producto actualizado');
      setEditModal(null);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const remove = async (id) => {
    try { await db.products.delete(id); await loadData(); showToast('Producto eliminado'); }
    catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  let filtered = filter === 'all' ? data.products : data.products.filter(p => p.category === filter);
  if (searchQuery) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant={filter === 'all' ? 'primary' : 'muted'} size="sm" onClick={() => setFilter('all')}>Todos ({data.products.length})</Button>
          {CATEGORIES.map(c => <Button key={c.id} variant={filter === c.id ? 'primary' : 'muted'} size="sm" onClick={() => setFilter(c.id)}>{c.icon} {data.products.filter(p => p.category === c.id).length}</Button>)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {filtered.map(p => {
          const cat = CATEGORIES.find(c => c.id === p.category);
          const formula = formulasWithCosts.find(f => f.id === p.formula_id);
          return (
            <Card key={p.id} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 56, opacity: 0.05 }}>{cat?.icon}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <CategoryTag category={p.category} categories={CATEGORIES} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>✎</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(p.id)}>✕</Button>
                </div>
              </div>
              <h4 style={{ margin: '10px 0 6px', fontSize: 14, fontWeight: 700 }}>{p.name}</h4>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.03em' }}>{fmt(p.price)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>precio mayor / ud</div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Stock</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: p.stock > 50 ? 'var(--success)' : p.stock > 10 ? 'var(--warning)' : 'var(--danger)' }}>{p.stock.toLocaleString()}</span>
                </div>
                {formula && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--text-dim)' }}>Margen</span><span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: formula._margin > 50 ? 'var(--success)' : 'var(--warning)' }}>{formula._margin.toFixed(1)}%</span></div>}
              </div>
            </Card>
          );
        })}
      </div>
      {editModal && (
        <Modal title={`Editar: ${editModal.name}`} onClose={() => setEditModal(null)}>
          <Input label="Precio Mayor ($)" type="number" value={form.price} onChange={v => setForm({...form, price: v})} step="0.01" />
          <Input label="Stock (unidades)" type="number" value={form.stock} onChange={v => setForm({...form, stock: v})} />
          <ModalActions onCancel={() => setEditModal(null)} onConfirm={save} />
        </Modal>
      )}
    </div>
  );
}
