import React, { useMemo } from 'react';
import { Card, StatCard } from './UI';

import { fmt } from '../utils';

export default function Reports({ data, formulasWithCosts }) {
  const report = useMemo(() => {
    const totalCostInv = data.rawMaterials.reduce((s, m) => s + m.stock * m.cost, 0);
    const totalValProd = data.products.reduce((s, p) => s + p.stock * p.price, 0);
    const salesCompleted = data.sales.filter(s => s.status === 'completada').reduce((s, sale) => s + (sale.items||[]).reduce((si, it) => si + it.qty * it.unit_price, 0), 0);
    const salesPending = data.sales.filter(s => s.status !== 'completada').reduce((s, sale) => s + (sale.items||[]).reduce((si, it) => si + it.qty * it.unit_price, 0), 0);
    const totalUnits = data.sales.reduce((s, sale) => s + (sale.items||[]).reduce((si, it) => si + it.qty, 0), 0);
    const totalProdCost = data.sales.reduce((s, sale) => {
      return s + (sale.items||[]).reduce((si, it) => {
        const prod = data.products.find(p => p.id === it.product_id);
        const formula = prod ? formulasWithCosts.find(f => f.id === prod.formula_id) : null;
        return si + (formula ? formula._productionCost * it.qty : 0);
      }, 0);
    }, 0);
    const grossProfit = salesCompleted + salesPending - totalProdCost;

    const categoryStats = {};
    ((data.categories) || []).forEach(cat => {
      const catProds = data.products.filter(p => p.category === cat.slug);
      const catFormulas = formulasWithCosts.filter(f => f.category === cat.slug);
      let revenue = 0, units = 0, cost = 0;
      data.sales.forEach(sale => {
        (sale.items||[]).forEach(it => {
          const prod = catProds.find(p => p.id === it.product_id);
          if (prod) { revenue += it.qty * it.unit_price; units += it.qty; const f = catFormulas.find(fo => fo.id === prod.formula_id); if (f) cost += f._productionCost * it.qty; }
        });
      });
      categoryStats[cat.slug] = { revenue, units, cost, profit: revenue - cost, margin: revenue > 0 ? ((revenue - cost) / revenue * 100) : 0 };
    });

    const clientStats = {};
    data.sales.forEach(sale => {
      const n = sale.client_name;
      if (!clientStats[n]) clientStats[n] = { revenue: 0, units: 0, orders: 0, pending: 0 };
      const t = (sale.items||[]).reduce((s, it) => s + it.qty * it.unit_price, 0);
      const u = (sale.items||[]).reduce((s, it) => s + it.qty, 0);
      clientStats[n].revenue += t; clientStats[n].units += u; clientStats[n].orders++; if (sale.status !== 'completada') clientStats[n].pending += t;
    });

    const paymentStats = {};
    data.sales.forEach(sale => { const t = (sale.items||[]).reduce((s, it) => s + it.qty * it.unit_price, 0); paymentStats[sale.payment_method] = (paymentStats[sale.payment_method] || 0) + t; });

    return { totalCostInv, totalValProd, salesCompleted, salesPending, totalUnits, totalProdCost, grossProfit, categoryStats, clientStats, paymentStats };
  }, [data, formulasWithCosts]);

  const maxCatRev = Math.max(...Object.values(report.categoryStats).map(c => c.revenue), 1);

  return (
    <div className="animate-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard icon="🧪" label="Materia Prima" value={fmt(report.totalCostInv)} color="var(--warning)" sub="inventario" />
        <StatCard icon="📦" label="Prod. Terminados" value={fmt(report.totalValProd)} color="var(--accent)" sub="valor mayor" />
        <StatCard icon="✅" label="Cobrado" value={fmt(report.salesCompleted)} color="var(--success)" />
        <StatCard icon="⏳" label="Por Cobrar" value={fmt(report.salesPending)} color="var(--warning)" />
        <StatCard icon="📈" label="Ganancia Bruta" value={fmt(report.grossProfit)} color={report.grossProfit > 0 ? 'var(--success)' : 'var(--danger)'} sub={`${report.totalUnits.toLocaleString()} uds`} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Card title="Rentabilidad por Producto">
          {formulasWithCosts.map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Costo: {fmt(f._productionCost)} → {fmt(f.sale_price)} → Gan: {fmt(f.sale_price - f._productionCost)}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: f._margin > 60 ? 'var(--success)' : f._margin > 30 ? 'var(--warning)' : 'var(--danger)', minWidth: 70, textAlign: 'right' }}>{f._margin.toFixed(1)}%</div>
            </div>
          ))}
        </Card>
        <Card title="Rendimiento por Línea">
          {((data.categories) || []).map(cat => {
            const st = report.categoryStats[cat.slug];
            return (
              <div key={cat.slug} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.icon} {cat.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{fmt(st.revenue)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${(st.revenue / maxCatRev) * 100}%`, background: `linear-gradient(90deg, ${cat.color}AA, ${cat.color})`, borderRadius: 3 }} />
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  <span>{st.units.toLocaleString()} uds</span>
                  <span>Gan: {fmt(st.profit)}</span>
                  <span>{st.margin.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </Card>
        <Card title="Ranking Clientes">
          {Object.entries(report.clientStats).sort(([,a],[,b]) => b.revenue - a.revenue).map(([name, st], i) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: i < 3 ? 'var(--accent-bg-strong)' : 'var(--bg-input)', color: i < 3 ? 'var(--accent)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{i+1}</span>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div><div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{st.orders} ped · {st.units.toLocaleString()} uds</div></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{fmt(st.revenue)}</div>
                {st.pending > 0 && <div style={{ fontSize: 11, color: 'var(--warning)' }}>Pend: {fmt(st.pending)}</div>}
              </div>
            </div>
          ))}
        </Card>
        <Card title="Por Método de Pago">
          {Object.entries(report.paymentStats).sort(([,a],[,b]) => b - a).map(([method, total]) => {
            const pct = (total / (report.salesCompleted + report.salesPending || 1)) * 100;
            return (
              <div key={method} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 500 }}>{method}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(total)} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({pct.toFixed(1)}%)</span></span>
                </div>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), #A78BFA)', borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
