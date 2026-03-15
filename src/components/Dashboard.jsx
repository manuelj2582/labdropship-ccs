import React, { useMemo } from 'react';
import { Card, StatCard, StatusBadge, tableStyle, thStyle, tdStyle } from './UI';
import { CATEGORIES } from '../data/initialData';
import { fmt, fmtDate } from '../utils';

export default function Dashboard({ data, formulasWithCosts }) {
  const stats = useMemo(() => {
    const totalRevenue = data.sales.reduce((s, sale) =>
      s + (sale.items || []).reduce((si, it) => si + it.qty * it.unit_price, 0), 0);
    const totalUnits = data.sales.reduce((s, sale) =>
      s + (sale.items || []).reduce((si, it) => si + it.qty, 0), 0);
    const pendingRevenue = data.sales.filter(s => s.status === 'pendiente')
      .reduce((s, sale) => s + (sale.items || []).reduce((si, it) => si + it.qty * it.unit_price, 0), 0);
    const pendingCount = data.sales.filter(s => s.status === 'pendiente').length;
    const lowStock = data.rawMaterials.filter(m => m.stock <= m.min_stock).length;
    const totalProducts = data.products.reduce((s, p) => s + p.stock, 0);
    const activeClients = new Set(data.sales.map(s => s.client_name)).size;

    const salesByCategory = {};
    data.sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const prod = data.products.find(p => p.id === item.product_id);
        if (prod) salesByCategory[prod.category] = (salesByCategory[prod.category] || 0) + item.qty * item.unit_price;
      });
    });

    const clientVolume = {};
    data.sales.forEach(sale => {
      const total = (sale.items || []).reduce((s, it) => s + it.qty * it.unit_price, 0);
      clientVolume[sale.client_name] = (clientVolume[sale.client_name] || 0) + total;
    });

    const topProducts = {};
    data.sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const prod = data.products.find(p => p.id === item.product_id);
        if (prod) topProducts[prod.name] = (topProducts[prod.name] || 0) + item.qty;
      });
    });

    return { totalRevenue, totalUnits, pendingRevenue, pendingCount, lowStock, totalProducts, activeClients, salesByCategory, clientVolume, topProducts };
  }, [data]);

  const maxCatSale = Math.max(...Object.values(stats.salesByCategory), 1);

  return (
    <div className="animate-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard icon="💰" label="Facturación Total" value={fmt(stats.totalRevenue)} color="var(--success)" sub={`${stats.totalUnits.toLocaleString()} uds`} />
        <StatCard icon="⏳" label="Por Cobrar" value={fmt(stats.pendingRevenue)} color="var(--warning)" sub={`${stats.pendingCount} pedidos`} />
        <StatCard icon="📦" label="Stock Terminado" value={stats.totalProducts.toLocaleString()} color="var(--accent)" sub="unidades" />
        <StatCard icon="👥" label="Clientes Activos" value={stats.activeClients} color="#A78BFA" sub="dropshippers" />
        <StatCard icon="⚠️" label="Alertas Stock" value={stats.lowStock} color={stats.lowStock > 0 ? 'var(--danger)' : 'var(--success)'} sub="materias primas" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Card title="Ventas por Línea">
          {CATEGORIES.map(cat => {
            const val = stats.salesByCategory[cat.id] || 0;
            return (
              <div key={cat.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 500 }}>{cat.icon} {cat.name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(val)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(val / maxCatSale) * 100}%`, background: `linear-gradient(90deg, ${cat.color}CC, ${cat.color})`, borderRadius: 3, transition: 'width 0.6s' }} />
                </div>
              </div>
            );
          })}
        </Card>
        <Card title="Productos Más Movidos">
          {Object.entries(stats.topProducts).sort(([,a],[,b]) => b - a).slice(0, 6).map(([name, qty], i) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: i < 3 ? 'var(--accent-bg-strong)' : 'var(--bg-input)', color: i < 3 ? 'var(--accent)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{i+1}</span>
                <span style={{ fontSize: 13 }}>{name}</span>
              </div>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-mono)' }}>{qty.toLocaleString()}</span>
            </div>
          ))}
        </Card>
        <Card title="Clientes por Volumen">
          {Object.entries(stats.clientVolume).sort(([,a],[,b]) => b - a).map(([name, total]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
              <span style={{ color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmt(total)}</span>
            </div>
          ))}
        </Card>
      </div>

      {stats.lowStock > 0 && (
        <Card title="⚠ Materiales con Stock Bajo" style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {data.rawMaterials.filter(m => m.stock <= m.min_stock).map(m => (
              <div key={m.id} style={{ background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', padding: 14, border: '1px solid rgba(255,90,101,0.15)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{m.stock} {m.unit} · Mín: {m.min_stock}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{m.supplier?.name || '—'}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Últimos Pedidos Mayoristas">
        <table style={tableStyle}>
          <thead><tr>{['Factura','Fecha','Cliente','Total','Pago','Estado'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {data.sales.slice(0, 6).map(sale => {
              const total = (sale.items||[]).reduce((s,it) => s + it.qty * it.unit_price, 0);
              return (
                <tr key={sale.id}>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12, color: 'var(--accent)' }}>{sale.invoice_num}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{fmtDate(sale.date)}</td>
                  <td style={tdStyle}><div style={{ fontWeight: 600 }}>{sale.client_name}</div><div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{sale.client_rif}</div></td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{fmt(total)}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-secondary)' }}>{sale.payment_method}</td>
                  <td style={tdStyle}><StatusBadge status={sale.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
