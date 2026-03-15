import React, { useState } from 'react';
import { Card, Button, Modal, ModalActions, Select, Input, tableStyle, thStyle, tdStyle, CategoryTag } from './UI';
import { CATEGORIES } from '../data/initialData';
import { fmt } from '../utils';

export default function Production({ data, setData, formulasWithCosts, showToast }) {
  const [modal, setModal] = useState(false);
  const [formulaId, setFormulaId] = useState('');
  const [batches, setBatches] = useState(1);

  const formula = formulasWithCosts.find(f => f.id === formulaId);

  const canProduce = formula ? formula.ingredients.every(ing => {
    const mat = data.rawMaterials.find(m => m.id === ing.materialId);
    return mat && mat.stock >= ing.amount * batches;
  }) : false;

  const produce = () => {
    if (!formula || !canProduce) return;
    setData(d => {
      const mats = d.rawMaterials.map(m => {
        const ing = formula.ingredients.find(i => i.materialId === m.id);
        return ing ? { ...m, stock: m.stock - ing.amount * batches } : m;
      });
      const prods = d.products.map(p =>
        p.formulaId === formula.id ? { ...p, stock: p.stock + batches } : p
      );
      return { ...d, rawMaterials: mats, products: prods };
    });
    showToast(`${batches} lote(s) de "${formula.name}" producidos`);
    setModal(false);
    setFormulaId('');
    setBatches(1);
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Capacidad de producción basada en materiales disponibles
        </span>
        <Button variant="success" onClick={() => setModal(true)}>⚙️ Nueva Producción</Button>
      </div>

      {/* Capacity cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {formulasWithCosts.map(f => {
          const maxBatches = Math.min(...f.ingredients.map(ing => {
            const mat = data.rawMaterials.find(m => m.id === ing.materialId);
            return mat && ing.amount > 0 ? Math.floor(mat.stock / ing.amount) : 0;
          }));
          const cat = CATEGORIES.find(c => c.id === f.category);
          return (
            <Card key={f.id} style={{ textAlign: 'center' }}>
              <CategoryTag category={f.category} categories={CATEGORIES} />
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{f.name}</div>
              <div style={{
                fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em',
                color: maxBatches > 10 ? 'var(--success)' : maxBatches > 0 ? 'var(--warning)' : 'var(--danger)',
                margin: '8px 0 2px',
              }}>{maxBatches}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                lotes producibles
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                = {maxBatches * f.yieldAmount} {f.yieldUnit} total
              </div>
            </Card>
          );
        })}
      </div>

      {/* Stock de productos terminados */}
      <Card title="Stock de Productos Terminados">
        <table style={tableStyle}>
          <thead>
            <tr>
              {['Producto', 'Categoría', 'Stock', 'Precio Mayor', 'Valor Stock'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.products.map(p => (
              <tr key={p.id}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                <td style={tdStyle}><CategoryTag category={p.category} categories={CATEGORIES} /></td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.stock.toLocaleString()} uds</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{fmt(p.price)}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{fmt(p.stock * p.price)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} style={{ ...tdStyle, fontWeight: 700, textAlign: 'right' }}>Total en Stock:</td>
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: 800, fontSize: 15 }}>
                {fmt(data.products.reduce((s, p) => s + p.stock * p.price, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {modal && (
        <Modal title="Orden de Producción" onClose={() => setModal(false)}>
          <Select
            label="Fórmula a producir"
            value={formulaId}
            options={formulasWithCosts.map(f => ({
              value: f.id,
              label: `${f.name} (rinde ${f.yieldAmount}${f.yieldUnit})`,
            }))}
            onChange={setFormulaId}
            placeholder="Seleccionar fórmula..."
          />
          <Input label="Cantidad de lotes" type="number" value={batches} onChange={v => setBatches(Math.max(1, +v))} />

          {formula && (
            <div style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
              padding: 16, marginTop: 8, border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
                MATERIALES REQUERIDOS
              </div>
              {formula.ingredients.map((ing, i) => {
                const mat = data.rawMaterials.find(m => m.id === ing.materialId);
                const needed = ing.amount * batches;
                const enough = mat && mat.stock >= needed;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                    <span>{mat?.name}</span>
                    <span style={{
                      color: enough ? 'var(--success)' : 'var(--danger)',
                      fontFamily: 'var(--font-mono)', fontWeight: 600,
                    }}>
                      {needed} {mat?.unit} {enough ? '✓' : `(faltan ${(needed - (mat?.stock || 0)).toFixed(2)})`}
                    </span>
                  </div>
                );
              })}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Producción total:</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {formula.yieldAmount * batches} {formula.yieldUnit} ({batches} uds)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Costo total:</span>
                  <span style={{ color: 'var(--warning)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {fmt(formula.productionCost * batches)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Valor de venta (al mayor):</span>
                  <span style={{ color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {fmt(formula.salePrice * batches)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <ModalActions onCancel={() => setModal(false)} onConfirm={produce} confirmLabel="⚙️ Producir" confirmDisabled={!canProduce} confirmVariant="success" />
        </Modal>
      )}
    </div>
  );
}
