import React, { useMemo } from 'react';
import { Card, StatCard, CategoryTag } from './UI';
import { CATEGORIES } from '../data/initialData';
import { fmt } from '../utils';

export default function Reports({ data, formulasWithCosts }) {
  const report = useMemo(() => {
    const totalCostInv = data.rawMaterials.reduce((s, m) => s + m.stock * m.cost, 0);
    const totalValProd = data.products.reduce((s, p) => s + p.stock * p.price, 0);

    const salesCompleted = data.sales
      .filter(s => s.status === 'completada')
      .reduce((s, sale) => s + sale.items.reduce((si, it) => si + it.qty * it.unitPrice, 0), 0);
    const salesPending = data.sales
      .filter(s => s.status !== 'completada')
      .reduce((s, sale) => s + sale.items.reduce((si, it) => si + it.qty * it.unitPrice, 0), 0);

    const totalUnitsSold = data.sales.reduce((s, sale) =>
      s + sale.items.reduce((si, it) => si + it.qty, 0), 0);

    const totalProductionCost = data.sales.reduce((s, sale) => {
      return s + sale.items.reduce((si, it) => {
        const prod = data.products.find(p => p.id === it.productId);
        const formula = prod ? formulasWithCosts.find(f => f.id === prod.formulaId) : null;
        return si + (formula ? formula.productionCost * it.qty : 0);
      }, 0);
    }, 0);

    const grossProfit = salesCompleted + salesPending - totalProductionCost;

    // By category
    const categoryStats = {};
    CATEGORIES.forEach(cat => {
      const catProducts = data.products.filter(p => p.category === cat.id);
      const catFormulas = formulasWithCosts.filter(f => f.category === cat.id);
      let revenue = 0, units = 0, cost = 0;
      data.sales.forEach(sale => {
        sale.items.forEach(it => {
          const prod = catProducts.find(p => p.id === it.productId);
          if (prod) {
            revenue += it.qty * it.unitPrice;
            units += it.qty;
            const formula = catFormulas.find(f => f.id === prod.formulaId);
            if (formula) cost += formula.productionCost * it.qty;
          }
        });
      });
      categoryStats[cat.id] = { revenue, units, cost, profit: revenue - cost, margin: revenue > 0 ? ((revenue - cost) / revenue * 100) : 0 };
    });

    // By client
    const clientStats = {};
    data.sales.forEach(sale => {
      const name = sale.client.name;
      if (!clientStats[name]) clientStats[name] = { revenue: 0, units: 0, orders: 0, pending: 0 };
      const total = sale.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
      const totalU = sale.items.reduce((s, it) => s + it.qty, 0);
      clientStats[name].revenue += total;
      clientStats[name].units += totalU;
      clientStats[name].orders += 1;
      if (sale.status !== 'completada') clientStats[name].pending += total;
    });

    // By payment
    const paymentStats = {};
    data.sales.forEach(sale => {
      const total = sale.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
      paymentStats[sale.paymentMethod] = (paymentStats[sale.paymentMethod] || 0) + total;
    });

    return { totalCostInv, totalValProd, salesCompleted, salesPending, totalUnitsSold, totalProductionCost, grossProfit, categoryStats, clientStats, paymentStats };
  }, [data, formulasWithCosts]);

  const maxCatRevenue = Math.max(...Object.values(report.categoryStats).map(c => c.revenue), 1);

  return (
    <div className="animate-in">
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard icon="🧪" label="Materia Prima" value={fmt(report.totalCostInv)} color="var(--warning)" sub="en inventario" />
        <StatCard icon="📦" label="Prod. Terminados" value={fmt(report.totalValProd)} color="var(--accent)" sub="valor al mayor" />
        <StatCard icon="✅" label="Facturado Cobrado" value={fmt(report.salesCompleted)} color="var(--success)" />
        <StatCard icon="⏳" label="Por Cobrar" value={fmt(report.salesPending)} color="var(--warning)" />
        <StatCard icon="📈" label="Ganancia Bruta" value={fmt(report.grossProfit)} color={report.grossProfit > 0 ? 'var(--success)' : 'var(--danger)'} sub={`${report.totalUnitsSold.toLocaleString()} uds vendidas`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Rentabilidad por producto */}
        <Card title="Rentabilidad por Producto">
          {formulasWithCosts.map(f => (
            <div key={f.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  Costo: {fmt(f.productionCost)} → Mayor: {fmt(f.salePrice)} → Ganancia: {fmt(f.salePrice - f.productionCost)}
                </div>
              </div>
              <div style={{
                fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)',
                color: f.margin > 60 ? 'var(--success)' : f.margin > 30 ? 'var(--warning)' : 'var(--danger)',
                minWidth: 70, textAlign: 'right',
              }}>{f.margin.toFixed(1)}%</div>
            </div>
          ))}
        </Card>

        {/* Rendimiento por categoría */}
        <Card title="Rendimiento por Línea de Producto">
          {CATEGORIES.map(cat => {
            const st = report.categoryStats[cat.id];
            return (
              <div key={cat.id} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.icon} {cat.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{fmt(st.revenue)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    height: '100%', width: `${(st.revenue / maxCatRevenue) * 100}%`,
                    background: `linear-gradient(90deg, ${cat.color}AA, ${cat.color})`,
                    borderRadius: 3, transition: 'width 0.6s',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  <span>{st.units.toLocaleString()} uds</span>
                  <span>Costo: {fmt(st.cost)}</span>
                  <span>Ganancia: <span style={{ color: st.profit > 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(st.profit)}</span></span>
                  <span>Margen: {st.margin.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Clientes mayoristas */}
        <Card title="Ranking Clientes Mayoristas">
          {Object.entries(report.clientStats)
            .sort(([, a], [, b]) => b.revenue - a.revenue)
            .map(([name, st], i) => (
              <div key={name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: i < 3 ? 'var(--accent-bg-strong)' : 'var(--bg-input)',
                    color: i < 3 ? 'var(--accent)' : 'var(--text-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  }}>{i + 1}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {st.orders} pedidos · {st.units.toLocaleString()} uds
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{fmt(st.revenue)}</div>
                  {st.pending > 0 && <div style={{ fontSize: 11, color: 'var(--warning)' }}>Pendiente: {fmt(st.pending)}</div>}
                </div>
              </div>
            ))}
        </Card>

        {/* Métodos de pago */}
        <Card title="Facturación por Método de Pago">
          {Object.entries(report.paymentStats)
            .sort(([, a], [, b]) => b - a)
            .map(([method, total]) => {
              const pct = (total / (report.salesCompleted + report.salesPending)) * 100;
              return (
                <div key={method} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ fontWeight: 500 }}>{method}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(total)} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: 'linear-gradient(90deg, var(--accent), #A78BFA)',
                      borderRadius: 3,
                    }} />
                  </div>
                </div>
              );
            })}
        </Card>
      </div>
    </div>
  );
}
