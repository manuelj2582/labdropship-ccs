import React, { useState, useMemo } from 'react';
import { Card, Button, Modal, ModalActions, Select, Input, CategoryTag, tableStyle, thStyle, tdStyle } from './UI';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Production({ data, formulasWithCosts, loadData, showToast, user, searchQuery }) {
  const [modal, setModal] = useState(false);
  const [presId, setPresId] = useState('');
  const [batches, setBatches] = useState(1);
  const [producing, setProducing] = useState(false);

  const allPresentations = data.presentations || [];

  // Build presentation options grouped by formula
  const presOptions = useMemo(() => {
    let result = allPresentations.map(p => {
      const formula = formulasWithCosts.find(f => f.id === p.formula_id);
      return { ...p, _formula: formula };
    }).filter(p => p._formula);
    if (searchQuery) result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p._formula?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return result;
  }, [allPresentations, formulasWithCosts, searchQuery]);

  const selectedPres = presOptions.find(p => p.id === presId);
  const formula = selectedPres?._formula;

  // Calculate proportional needs
  const getNeeds = (pres, f, qty) => {
    if (!pres || !f) return { materials: [], envase: null, canProduce: false, matCost: 0, envaseCost: 0 };
    const baseAmt = f.base_amount || f.yield_amount || 100;
    const ratio = pres.amount / baseAmt;
    const materials = (f.ingredients || []).map(ing => {
      const mat = data.rawMaterials.find(m => m.id === ing.material_id);
      const needed = ing.amount * ratio * qty;
      return { mat, needed, ok: mat && mat.stock >= needed };
    });
    const envase = pres.envase_id ? data.rawMaterials.find(m => m.id === pres.envase_id) : null;
    const envaseOk = !pres.envase_id || (envase && envase.stock >= qty);
    const canProduce = materials.every(m => m.ok) && envaseOk;
    const matCost = materials.reduce((s, m) => s + (m.mat ? m.mat.cost * m.needed : 0), 0);
    const envaseCost = (envase?.cost || 0) * qty;
    return { materials, envase, envaseOk, canProduce, matCost, envaseCost };
  };

  const needs = getNeeds(selectedPres, formula, batches);

  const produce = async () => {
    if (!formula || !selectedPres || !needs.canProduce) return;
    setProducing(true);
    try {
      await db.produce(formula, selectedPres, batches, data.rawMaterials, user);
      await loadData();
      showToast(`${batches} unidad(es) de "${selectedPres.name}" producidas`);
      setModal(false);
      setPresId('');
      setBatches(1);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setProducing(false); }
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Selecciona una presentación para producir</span>
        <Button variant="success" onClick={() => setModal(true)}>⚙️ Nueva Producción</Button>
      </div>

      {/* Presentation capacity cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, marginBottom: 20 }}>
        {presOptions.map(p => {
          const f = p._formula;
          const baseAmt = f.base_amount || f.yield_amount || 100;
          const ratio = p.amount / baseAmt;
          const maxByMat = Math.min(...(f.ingredients || []).map(ing => {
            const mat = data.rawMaterials.find(m => m.id === ing.material_id);
            const perUnit = ing.amount * ratio;
            return mat && perUnit > 0 ? Math.floor(mat.stock / perUnit) : 0;
          }));
          const envase = p.envase_id ? data.rawMaterials.find(m => m.id === p.envase_id) : null;
          const maxByEnvase = envase ? envase.stock : Infinity;
          const maxUnits = Math.min(maxByMat, maxByEnvase);
          const cat = (data.categories || []).find(c => c.slug === f.category);

          return (
            <Card key={p.id} style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => { setPresId(p.id); setModal(true); }}>
              <CategoryTag category={f.category} categories={data.categories || []} />
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{p.amount}{p.unit}</div>
              <div style={{
                fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em',
                color: maxUnits > 20 ? 'var(--success)' : maxUnits > 0 ? 'var(--warning)' : 'var(--danger)',
                margin: '8px 0 2px',
              }}>{maxUnits === Infinity ? '∞' : maxUnits}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>unidades producibles</div>
              {envase && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>🫙 {envase.name}: {envase.stock} disp.</div>}
            </Card>
          );
        })}
        {presOptions.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
            No hay presentaciones. Crea fórmulas y agrega presentaciones primero.
          </div>
        )}
      </div>

      {/* Stock table */}
      <Card title="Stock Productos Terminados">
        {data.products.filter(p => p.stock > 0).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: 13 }}>No hay productos con stock</div>
        ) : (
          <table style={tableStyle}>
            <thead><tr>{['Producto', 'Categoría', 'Stock', 'Precio Mayor', 'Valor'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {data.products.filter(p => p.stock > 0).map(p => (
                <tr key={p.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                  <td style={tdStyle}><CategoryTag category={p.category} categories={data.categories || []} /></td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.stock.toLocaleString()} uds</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{fmt(p.price)}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{fmt(p.stock * p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Production Modal */}
      {modal && (
        <Modal title="Orden de Producción" onClose={() => setModal(false)}>
          <Select
            label="Presentación a producir"
            value={presId}
            options={presOptions.map(p => ({
              value: p.id,
              label: `${p.name} (${p.amount}${p.unit}) — ${p._formula?.name}`,
            }))}
            onChange={setPresId}
            placeholder="Seleccionar presentación..."
          />
          <Input label="Cantidad (unidades)" type="number" value={batches} onChange={v => setBatches(Math.max(1, +v))} />

          {selectedPres && formula && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 16, marginTop: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 10 }}>
                MATERIALES REQUERIDOS PARA {batches} × {selectedPres.name}
              </div>

              {needs.materials.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                  <span>{m.mat?.name || '—'}</span>
                  <span style={{ color: m.ok ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {m.needed.toFixed(2)} {m.mat?.unit} {m.ok ? '✓' : `(faltan ${(m.needed - (m.mat?.stock || 0)).toFixed(2)})`}
                  </span>
                </div>
              ))}

              {needs.envase && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 8 }}>
                  <span>🫙 {needs.envase.name}</span>
                  <span style={{ color: needs.envaseOk ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {batches} uds {needs.envaseOk ? '✓' : `(faltan ${batches - needs.envase.stock})`}
                  </span>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Costo materia prima</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(needs.matCost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Costo envases</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(needs.envaseCost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span style={{ color: 'var(--warning)' }}>Costo total</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{fmt(needs.matCost + needs.envaseCost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Costo por unidad</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{fmt((needs.matCost + needs.envaseCost) / batches)}</span>
                </div>
              </div>
            </div>
          )}

          <ModalActions onCancel={() => setModal(false)} onConfirm={produce}
            confirmLabel={producing ? 'Produciendo...' : `⚙️ Producir ${batches} unidad(es)`}
            confirmDisabled={!needs.canProduce || producing} confirmVariant="success" />
        </Modal>
      )}
    </div>
  );
}
