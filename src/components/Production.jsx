import React, { useState } from 'react';
import { Card, Button, Modal, ModalActions, Select, Input, CategoryTag, tableStyle, thStyle, tdStyle } from './UI';
import { CATEGORIES } from '../data/initialData';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Production({ data, formulasWithCosts, loadData, showToast, user }) {
  const [modal, setModal] = useState(false);
  const [formulaId, setFormulaId] = useState('');
  const [batches, setBatches] = useState(1);
  const [producing, setProducing] = useState(false);

  const formula = formulasWithCosts.find(f => f.id === formulaId);
  const canProduce = formula ? (formula.ingredients || []).every(ing => {
    const mat = data.rawMaterials.find(m => m.id === ing.material_id);
    return mat && mat.stock >= ing.amount * batches;
  }) : false;

  const produce = async () => {
    if (!formula || !canProduce) return;
    setProducing(true);
    try {
      await db.produce(formula, batches, data.rawMaterials, user);
      await loadData();
      showToast(`${batches} lote(s) de "${formula.name}" producidos`);
      setModal(false);
      setFormulaId('');
      setBatches(1);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setProducing(false); }
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Capacidad basada en materiales disponibles</span>
        <Button variant="success" onClick={() => setModal(true)}>⚙️ Nueva Producción</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {formulasWithCosts.map(f => {
          const maxB = Math.min(...(f.ingredients||[]).map(ing => {
            const mat = data.rawMaterials.find(m => m.id === ing.material_id);
            return mat && ing.amount > 0 ? Math.floor(mat.stock / ing.amount) : 0;
          }));
          return (
            <Card key={f.id} style={{ textAlign: 'center' }}>
              <CategoryTag category={f.category} categories={CATEGORIES} />
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{f.name}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: maxB > 10 ? 'var(--success)' : maxB > 0 ? 'var(--warning)' : 'var(--danger)', margin: '8px 0 2px' }}>{maxB}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>lotes · {maxB * f.yield_amount} {f.yield_unit}</div>
            </Card>
          );
        })}
      </div>
      <Card title="Stock Productos Terminados">
        <table style={tableStyle}>
          <thead><tr>{['Producto','Categoría','Stock','Precio Mayor','Valor'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
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
          </tbody>
        </table>
      </Card>
      {modal && (
        <Modal title="Orden de Producción" onClose={() => setModal(false)}>
          <Select label="Fórmula" value={formulaId} options={formulasWithCosts.map(f => ({value: f.id, label: `${f.name} (${f.yield_amount}${f.yield_unit})`}))} onChange={setFormulaId} placeholder="Seleccionar..." />
          <Input label="Lotes" type="number" value={batches} onChange={v => setBatches(Math.max(1, +v))} />
          {formula && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 16, marginTop: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 10 }}>MATERIALES REQUERIDOS</div>
              {(formula.ingredients||[]).map((ing, i) => {
                const mat = data.rawMaterials.find(m => m.id === ing.material_id);
                const needed = ing.amount * batches;
                const ok = mat && mat.stock >= needed;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                    <span>{mat?.name}</span>
                    <span style={{ color: ok ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{needed} {mat?.unit} {ok ? '✓' : `(faltan ${(needed-(mat?.stock||0)).toFixed(2)})`}</span>
                  </div>
                );
              })}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-dim)' }}>Producción:</span><span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{formula.yield_amount * batches} {formula.yield_unit}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-dim)' }}>Costo:</span><span style={{ color: 'var(--warning)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmt(formula._productionCost * batches)}</span></div>
              </div>
            </div>
          )}
          <ModalActions onCancel={() => setModal(false)} onConfirm={produce} confirmLabel={producing ? 'Produciendo...' : '⚙️ Producir'} confirmDisabled={!canProduce || producing} confirmVariant="success" />
        </Modal>
      )}
    </div>
  );
}
