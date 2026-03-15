import React, { useState } from 'react';
import { Card, Button, Modal, ModalActions, Input, Select, CategoryTag } from './UI';
import { CATEGORIES, UNITS } from '../data/initialData';
import { fmt, genId } from '../utils';

export default function Formulas({ data, setData, formulasWithCosts, showToast }) {
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    name: '', category: 'serum', yieldAmount: 0, yieldUnit: 'ml', salePrice: 0,
    ingredients: [{ materialId: '', amount: 0 }],
  });

  const openAdd = () => {
    setForm({ name: '', category: 'serum', yieldAmount: 0, yieldUnit: 'ml', salePrice: 0, ingredients: [{ materialId: '', amount: 0 }] });
    setModal(true);
  };

  const addIng = () => setForm({ ...form, ingredients: [...form.ingredients, { materialId: '', amount: 0 }] });
  const updateIng = (i, k, v) => {
    const ings = [...form.ingredients];
    ings[i] = { ...ings[i], [k]: k === 'amount' ? +v : v };
    setForm({ ...form, ingredients: ings });
  };
  const removeIng = (i) => setForm({ ...form, ingredients: form.ingredients.filter((_, idx) => idx !== i) });

  const cost = form.ingredients.reduce((s, ing) => {
    const mat = data.rawMaterials.find(m => m.id === ing.materialId);
    return s + (mat ? mat.cost * ing.amount : 0);
  }, 0);

  const save = () => {
    if (!form.name || form.ingredients.some(i => !i.materialId)) return;
    const newF = { ...form, id: 'f' + genId(), productionCost: cost };
    setData(d => ({
      ...d,
      formulas: [...d.formulas, newF],
      products: [...d.products, {
        id: 'p' + genId(), formulaId: newF.id, name: newF.name,
        category: newF.category, stock: 0, price: newF.salePrice,
      }],
    }));
    showToast('Fórmula creada y producto registrado');
    setModal(false);
  };

  const filtered = filter === 'all' ? formulasWithCosts : formulasWithCosts.filter(f => f.category === filter);

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant={filter === 'all' ? 'primary' : 'muted'} size="sm" onClick={() => setFilter('all')}>Todas</Button>
          {CATEGORIES.map(c => (
            <Button key={c.id} variant={filter === c.id ? 'primary' : 'muted'} size="sm" onClick={() => setFilter(c.id)}>
              {c.icon} {c.name}
            </Button>
          ))}
        </div>
        <Button onClick={openAdd}>+ Nueva Fórmula</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {filtered.map(f => {
          const cat = CATEGORIES.find(c => c.id === f.category);
          return (
            <Card key={f.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <CategoryTag category={f.category} categories={CATEGORIES} />
                  <h4 style={{ margin: '10px 0 4px', fontSize: 16, fontWeight: 700 }}>{f.name}</h4>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    Rinde: {f.yieldAmount} {f.yieldUnit} por lote
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>PRECIO MAYOR</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>{fmt(f.salePrice)}</div>
                  <div style={{
                    fontSize: 12, fontWeight: 700, marginTop: 2,
                    color: f.margin > 60 ? 'var(--success)' : f.margin > 30 ? 'var(--warning)' : 'var(--danger)',
                  }}>
                    {f.margin.toFixed(1)}% margen
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
                  INGREDIENTES
                </div>
                {f.ingredients.map((ing, i) => {
                  const mat = data.rawMaterials.find(m => m.id === ing.materialId);
                  return (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 12, padding: '4px 0', color: 'var(--text-secondary)',
                    }}>
                      <span>{mat?.name || '—'}</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        {ing.amount} {mat?.unit} · {fmt(mat ? mat.cost * ing.amount : 0)}
                      </span>
                    </div>
                  );
                })}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, fontWeight: 700, marginTop: 8, paddingTop: 8,
                  borderTop: '1px solid var(--border)',
                }}>
                  <span>Costo Producción</span>
                  <span style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>{fmt(f.productionCost)}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 12, color: 'var(--text-dim)', marginTop: 2,
                }}>
                  <span>Ganancia por unidad</span>
                  <span style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(f.salePrice - f.productionCost)}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title="Nueva Fórmula" onClose={() => setModal(false)} wide>
          <Input label="Nombre del Producto" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Select label="Categoría" value={form.category}
              options={CATEGORIES.map(c => ({ value: c.id, label: c.icon + ' ' + c.name }))}
              onChange={v => setForm({ ...form, category: v })} />
            <Input label="Rendimiento por lote" type="number" value={form.yieldAmount}
              onChange={v => setForm({ ...form, yieldAmount: +v })} />
            <Select label="Unidad" value={form.yieldUnit} options={UNITS}
              onChange={v => setForm({ ...form, yieldUnit: v })} />
          </div>

          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 8 }}>Ingredientes</label>
            {form.ingredients.map((ing, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, marginBottom: 8 }}>
                <Select value={ing.materialId}
                  options={data.rawMaterials.map(m => ({ value: m.id, label: `${m.name} (${m.unit})` }))}
                  onChange={v => updateIng(i, 'materialId', v)}
                  placeholder="Materia prima..." />
                <Input type="number" value={ing.amount} onChange={v => updateIng(i, 'amount', v)} placeholder="Cantidad" step="0.01" />
                <Button variant="danger" size="sm" onClick={() => removeIng(i)}>✕</Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addIng}>+ Ingrediente</Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <Input label="Precio al Mayor ($)" type="number" value={form.salePrice}
              onChange={v => setForm({ ...form, salePrice: +v })} step="0.01" />
            <div style={{ paddingTop: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Costo: <strong style={{ color: 'var(--warning)' }}>{fmt(cost)}</strong> ·
                Margen: <strong style={{ color: form.salePrice > 0 && ((form.salePrice - cost) / form.salePrice * 100) > 30 ? 'var(--success)' : 'var(--danger)' }}>
                  {form.salePrice > 0 ? ((form.salePrice - cost) / form.salePrice * 100).toFixed(1) : 0}%
                </strong>
              </div>
            </div>
          </div>

          <ModalActions onCancel={() => setModal(false)} onConfirm={save} />
        </Modal>
      )}
    </div>
  );
}
