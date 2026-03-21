import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Modal, ModalActions, Input, Select } from './UI';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Pricing({ data, formulasWithCosts, loadData, showToast, searchQuery, user }) {
  const [config, setConfig] = useState({
    rent: 0, utilities: 0, salaries: 0, other_fixed: 0, other_fixed_label: 'Otros',
    monthly_units_estimate: 500, include_fixed_costs: true, default_margin: 50,
  });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editPrice, setEditPrice] = useState(null); // { presId, price }

  // Load config
  useEffect(() => {
    db.costConfig.get().then(c => {
      if (c) setConfig({
        rent: c.rent || 0, utilities: c.utilities || 0, salaries: c.salaries || 0,
        other_fixed: c.other_fixed || 0, other_fixed_label: c.other_fixed_label || 'Otros',
        monthly_units_estimate: c.monthly_units_estimate || 500,
        include_fixed_costs: c.include_fixed_costs !== false,
        default_margin: c.default_margin || 50,
      });
      setConfigLoaded(true);
    }).catch(() => setConfigLoaded(true));
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await db.costConfig.save(config);
      showToast('Configuración guardada');
      setShowConfig(false);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  // Calculations
  const totalFixed = +config.rent + +config.utilities + +config.salaries + +config.other_fixed;
  const fixedPerUnit = config.monthly_units_estimate > 0 ? totalFixed / config.monthly_units_estimate : 0;

  const presentations = useMemo(() => {
    return (data.presentations || []).map(pres => {
      const formula = formulasWithCosts.find(f => f.id === pres.formula_id);
      if (!formula) return null;

      const baseAmt = formula.base_amount || formula.yield_amount || 100;
      const ratio = pres.amount / baseAmt;

      // Material cost
      const matCost = (formula.ingredients || []).reduce((s, ing) => {
        const mat = data.rawMaterials.find(m => m.id === ing.material_id);
        return s + (mat ? mat.cost * ing.amount * ratio : 0);
      }, 0);

      // Envase cost
      const envase = pres.envase_id ? data.rawMaterials.find(m => m.id === pres.envase_id) : null;
      const envaseCost = envase?.cost || 0;

      const directCost = matCost + envaseCost;
      const totalCost = config.include_fixed_costs ? directCost + fixedPerUnit : directCost;

      const margin = config.default_margin;
      const suggestedPrice = totalCost / (1 - margin / 100);

      // Current product price
      const product = data.products.find(p => p.presentation_id === pres.id);
      const currentPrice = product?.price || pres.sale_price || 0;
      const currentMarginPct = currentPrice > 0 ? ((currentPrice - totalCost) / currentPrice) * 100 : 0;
      const currentProfit = currentPrice - totalCost;

      return {
        ...pres, _formula: formula, _product: product,
        matCost, envaseCost, directCost, fixedPerUnit: config.include_fixed_costs ? fixedPerUnit : 0,
        totalCost, suggestedPrice, currentPrice, currentMarginPct, currentProfit,
      };
    }).filter(Boolean);
  }, [data, formulasWithCosts, config, fixedPerUnit]);

  let filtered = presentations;
  if (filter !== 'all') filtered = filtered.filter(p => p._formula?.category === filter);
  if (searchQuery) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Apply suggested price to a product
  const applyPrice = async (pres, price) => {
    try {
      if (pres._product) {
        await db.products.update(pres._product.id, { price: Math.round(price * 100) / 100 }, user);
      }
      // Also update presentation sale_price
      const { error } = await (await import('../lib/supabase')).supabase
        .from('presentations').update({ sale_price: Math.round(price * 100) / 100 }).eq('id', pres.id);
      await loadData();
      showToast(`Precio de "${pres.name}" actualizado a ${fmt(price)}`);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const applyAllSuggested = async () => {
    if (!confirm(`¿Aplicar precio sugerido (${config.default_margin}% margen) a las ${filtered.length} presentaciones?`)) return;
    setSaving(true);
    let count = 0;
    for (const pres of filtered) {
      try {
        await applyPrice(pres, pres.suggestedPrice);
        count++;
      } catch (e) { /* continue */ }
    }
    setSaving(false);
    showToast(`${count} precios actualizados`);
  };

  const saveEditPrice = async () => {
    if (!editPrice) return;
    const pres = presentations.find(p => p.id === editPrice.presId);
    if (pres) await applyPrice(pres, +editPrice.price);
    setEditPrice(null);
  };

  if (!configLoaded) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Cargando...</div>;

  return (
    <div className="animate-in">
      {/* Config summary bar */}
      <Card style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>GASTOS FIJOS/MES</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)' }}>{fmt(totalFixed)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>PRODUCCIÓN EST.</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{config.monthly_units_estimate} uds/mes</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>COSTO FIJO/UD</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--warning)' }}>{fmt(fixedPerUnit)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>MARGEN OBJETIVO</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{config.default_margin}%</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={config.include_fixed_costs}
                  onChange={e => setConfig({ ...config, include_fixed_costs: e.target.checked })}
                  style={{ accentColor: 'var(--accent)' }} />
                Incluir fijos
              </label>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowConfig(true)}>⚙️ Configurar</Button>
        </div>
      </Card>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Button variant={filter === 'all' ? 'primary' : 'muted'} size="sm" onClick={() => setFilter('all')}>
            Todos ({presentations.length})
          </Button>
          {(data.categories || []).map(c => (
            <Button key={c.slug} variant={filter === c.slug ? 'primary' : 'muted'} size="sm" onClick={() => setFilter(c.slug)}>
              {c.icon} {presentations.filter(p => p._formula?.category === c.slug).length}
            </Button>
          ))}
        </div>
        <Button variant="success" size="sm" onClick={applyAllSuggested} disabled={saving}>
          {saving ? 'Aplicando...' : `✓ Aplicar ${config.default_margin}% a todos`}
        </Button>
      </div>

      {/* Price table */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Producto', 'MP', 'Envase', 'Costo Directo', config.include_fixed_costs ? 'Fijo/ud' : null, 'Costo Total', `Sugerido ${config.default_margin}%`, 'Precio Actual', 'Margen', 'Ganancia', ''].filter(Boolean).map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                    color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
                    borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const marginColor = p.currentMarginPct >= config.default_margin ? 'var(--success)' :
                  p.currentMarginPct >= config.default_margin * 0.7 ? 'var(--warning)' : 'var(--danger)';
                const cat = (data.categories || []).find(c => c.slug === p._formula?.category);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        {cat?.icon} {p._formula?.name} · {p.amount}{p.unit}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(p.matCost)}</td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(p.envaseCost)}</td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{fmt(p.directCost)}</td>
                    {config.include_fixed_costs && (
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>{fmt(p.fixedPerUnit)}</td>
                    )}
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--warning)' }}>{fmt(p.totalCost)}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <button onClick={() => applyPrice(p, p.suggestedPrice)} style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(108,114,255,0.3)',
                        background: 'var(--accent-bg)', color: 'var(--accent)', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                      }} title="Clic para aplicar este precio">
                        {fmt(p.suggestedPrice)}
                      </button>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <button onClick={() => setEditPrice({ presId: p.id, price: p.currentPrice })} style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                      }} title="Clic para editar precio">
                        {p.currentPrice > 0 ? fmt(p.currentPrice) : '—'}
                      </button>
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: marginColor }}>
                      {p.currentPrice > 0 ? `${p.currentMarginPct.toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: p.currentProfit > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {p.currentPrice > 0 ? fmt(p.currentProfit) : '—'}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <Button variant="ghost" size="sm" onClick={() => setEditPrice({ presId: p.id, price: p.currentPrice || p.suggestedPrice })}>✎</Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                  No hay presentaciones. Crea fórmulas con presentaciones primero.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {filtered.length > 0 && (
          <div style={{ borderTop: '2px solid var(--border)', paddingTop: 14, marginTop: 8, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12 }}>
            <div>Costo promedio: <strong style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>{fmt(filtered.reduce((s, p) => s + p.totalCost, 0) / filtered.length)}</strong></div>
            <div>Precio promedio: <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{fmt(filtered.reduce((s, p) => s + p.currentPrice, 0) / filtered.length)}</strong></div>
            <div>Margen promedio: <strong style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
              {(filtered.filter(p => p.currentPrice > 0).reduce((s, p) => s + p.currentMarginPct, 0) / (filtered.filter(p => p.currentPrice > 0).length || 1)).toFixed(1)}%
            </strong></div>
          </div>
        )}
      </Card>

      {/* ═══ CONFIG MODAL ═══ */}
      {showConfig && (
        <Modal title="⚙️ Configuración de Costos" onClose={() => setShowConfig(false)}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
            GASTOS FIJOS MENSUALES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Alquiler ($)" type="number" value={config.rent} onChange={v => setConfig({ ...config, rent: +v })} step="0.01" />
            <Input label="Servicios (luz, agua, internet) ($)" type="number" value={config.utilities} onChange={v => setConfig({ ...config, utilities: +v })} step="0.01" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Sueldos ($)" type="number" value={config.salaries} onChange={v => setConfig({ ...config, salaries: +v })} step="0.01" />
            <Input label={`${config.other_fixed_label} ($)`} type="number" value={config.other_fixed} onChange={v => setConfig({ ...config, other_fixed: +v })} step="0.01" />
          </div>
          <Input label="Nombre del gasto adicional" value={config.other_fixed_label} onChange={v => setConfig({ ...config, other_fixed_label: v })} placeholder="Ej: Transporte, Marketing..." />

          <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--warning-bg)', border: '1px solid rgba(255,170,0,0.2)', marginTop: 8, fontSize: 13 }}>
            Total gastos fijos: <strong style={{ color: 'var(--warning)' }}>{fmt(totalFixed)}</strong> /mes
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', marginTop: 16, marginBottom: 8 }}>
            PRODUCCIÓN Y MARGEN
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Producción estimada (uds/mes)" type="number" value={config.monthly_units_estimate} onChange={v => setConfig({ ...config, monthly_units_estimate: +v })} />
            <Input label="Margen objetivo (%)" type="number" value={config.default_margin} onChange={v => setConfig({ ...config, default_margin: +v })} step="1" />
          </div>

          <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--accent-bg)', border: '1px solid rgba(108,114,255,0.2)', marginTop: 8, fontSize: 13 }}>
            Costo fijo por unidad: <strong style={{ color: 'var(--accent)' }}>{fmt(fixedPerUnit)}</strong>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              {fmt(totalFixed)} ÷ {config.monthly_units_estimate} uds = {fmt(fixedPerUnit)} por unidad
            </div>
          </div>

          <ModalActions onCancel={() => setShowConfig(false)} onConfirm={saveConfig}
            confirmLabel={saving ? 'Guardando...' : 'Guardar Configuración'} confirmDisabled={saving} />
        </Modal>
      )}

      {/* ═══ EDIT PRICE MODAL ═══ */}
      {editPrice && (() => {
        const pres = presentations.find(p => p.id === editPrice.presId);
        if (!pres) return null;
        const price = +editPrice.price;
        const margin = price > 0 ? ((price - pres.totalCost) / price) * 100 : 0;
        const profit = price - pres.totalCost;

        return (
          <Modal title={`Precio: ${pres.name}`} onClose={() => setEditPrice(null)}>
            <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border)', marginBottom: 12, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-dim)' }}>Costo MP:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(pres.matCost)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-dim)' }}>Costo envase:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(pres.envaseCost)}</span>
              </div>
              {config.include_fixed_costs && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Gasto fijo/ud:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(pres.fixedPerUnit)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                <span style={{ color: 'var(--warning)' }}>Costo total:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{fmt(pres.totalCost)}</span>
              </div>
            </div>

            <Input label="Precio de venta ($)" type="number" value={editPrice.price}
              onChange={v => setEditPrice({ ...editPrice, price: v })} step="0.01" />

            {/* Quick margin buttons */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {[30, 40, 50, 60, 70, 80].map(m => {
                const p = pres.totalCost / (1 - m / 100);
                return (
                  <button key={m} onClick={() => setEditPrice({ ...editPrice, price: Math.round(p * 100) / 100 })} style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: '1px solid var(--border)', background: m === config.default_margin ? 'var(--accent-bg)' : 'var(--bg-input)',
                    color: m === config.default_margin ? 'var(--accent)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {m}% → {fmt(p)}
                  </button>
                );
              })}
            </div>

            {/* Live preview */}
            {price > 0 && (
              <div style={{
                marginTop: 12, padding: 14, borderRadius: 'var(--radius-sm)',
                background: margin >= config.default_margin ? 'var(--success-bg)' : margin > 0 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                border: `1px solid ${margin >= config.default_margin ? 'rgba(0,214,143,0.2)' : margin > 0 ? 'rgba(255,170,0,0.2)' : 'rgba(255,90,101,0.2)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                  <span>Margen:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: margin >= config.default_margin ? 'var(--success)' : margin > 0 ? 'var(--warning)' : 'var(--danger)' }}>
                    {margin.toFixed(1)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                  <span>Ganancia/ud:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: profit > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {fmt(profit)}
                  </span>
                </div>
              </div>
            )}

            <ModalActions onCancel={() => setEditPrice(null)} onConfirm={saveEditPrice} confirmLabel="Aplicar Precio" />
          </Modal>
        );
      })()}
    </div>
  );
}
