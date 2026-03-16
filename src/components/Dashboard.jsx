import React, { useMemo } from 'react';
import { Card, StatCard, StatusBadge, tableStyle, thStyle, tdStyle } from './UI';
import { fmt, fmtDate } from '../utils';

export default function Dashboard({ data, formulasWithCosts }) {
  const cats = data.categories || [];

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
    const totalFormulas = data.formulas.length;
    const totalPresentations = (data.presentations || []).length;

    // Sales by category
    const salesByCategory = {};
    data.sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const prod = data.products.find(p => p.id === item.product_id);
        if (prod) salesByCategory[prod.category] = (salesByCategory[prod.category] || 0) + item.qty * item.unit_price;
      });
    });

    // Sales by date (last 14 days)
    const salesByDate = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      salesByDate[d.toISOString().split('T')[0]] = 0;
    }
    data.sales.forEach(sale => {
      const total = (sale.items || []).reduce((s, it) => s + it.qty * it.unit_price, 0);
      if (salesByDate.hasOwnProperty(sale.date)) salesByDate[sale.date] += total;
    });

    // Units by date
    const unitsByDate = {};
    Object.keys(salesByDate).forEach(d => unitsByDate[d] = 0);
    data.sales.forEach(sale => {
      const units = (sale.items || []).reduce((s, it) => s + it.qty, 0);
      if (unitsByDate.hasOwnProperty(sale.date)) unitsByDate[sale.date] += units;
    });

    // Client volume
    const clientVolume = {};
    data.sales.forEach(sale => {
      const total = (sale.items || []).reduce((s, it) => s + it.qty * it.unit_price, 0);
      clientVolume[sale.client_name] = (clientVolume[sale.client_name] || 0) + total;
    });

    // Top products
    const topProducts = {};
    data.sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const prod = data.products.find(p => p.id === item.product_id);
        if (prod) topProducts[prod.name] = (topProducts[prod.name] || 0) + item.qty;
      });
    });

    // Inventory value
    const inventoryValue = data.rawMaterials.reduce((s, m) => s + m.stock * m.cost, 0);
    const productValue = data.products.reduce((s, p) => s + p.stock * p.price, 0);

    return { totalRevenue, totalUnits, pendingRevenue, pendingCount, lowStock, totalProducts, activeClients,
      totalFormulas, totalPresentations, salesByCategory, salesByDate, unitsByDate, clientVolume, topProducts,
      inventoryValue, productValue };
  }, [data]);

  const maxSaleDay = Math.max(...Object.values(stats.salesByDate), 1);
  const maxCatSale = Math.max(...Object.values(stats.salesByCategory), 1);
  const dates = Object.keys(stats.salesByDate);

  return (
    <div className="animate-in">
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard icon="💰" label="Facturación" value={fmt(stats.totalRevenue)} color="var(--success)" sub={`${stats.totalUnits.toLocaleString()} uds`} />
        <StatCard icon="⏳" label="Por Cobrar" value={fmt(stats.pendingRevenue)} color="var(--warning)" sub={`${stats.pendingCount} pedidos`} />
        <StatCard icon="📦" label="Prod. en Stock" value={stats.totalProducts.toLocaleString()} color="var(--accent)" sub={fmt(stats.productValue)} />
        <StatCard icon="🧪" label="Inventario MP" value={fmt(stats.inventoryValue)} color="#A78BFA" sub={`${data.rawMaterials.length} materiales`} />
        <StatCard icon="👥" label="Clientes" value={stats.activeClients} color="#60A5FA" />
        {stats.lowStock > 0 && <StatCard icon="⚠️" label="Stock Bajo" value={stats.lowStock} color="var(--danger)" sub="materiales" />}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Sales chart */}
        <Card title="Ventas últimos 14 días">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160, padding: '0 4px' }}>
            {dates.map((date, i) => {
              const val = stats.salesByDate[date];
              const height = maxSaleDay > 0 ? (val / maxSaleDay) * 140 : 0;
              const d = new Date(date + 'T12:00:00');
              const dayLabel = d.toLocaleDateString('es-VE', { day: '2-digit' });
              const isToday = date === new Date().toISOString().split('T')[0];
              return (
                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={`${fmtDate(date)}: ${fmt(val)}`}>
                  <div style={{
                    width: '100%', height: Math.max(height, 2), borderRadius: '4px 4px 0 0',
                    background: isToday
                      ? 'linear-gradient(180deg, var(--accent), #A78BFA)'
                      : val > 0 ? 'linear-gradient(180deg, var(--accent)80, var(--accent)40)' : 'var(--border)',
                    transition: '0.3s',
                  }} />
                  <span style={{ fontSize: 9, color: isToday ? 'var(--accent)' : 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: isToday ? 700 : 400 }}>{dayLabel}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>
            <span>Total período: <strong style={{ color: 'var(--success)' }}>{fmt(Object.values(stats.salesByDate).reduce((a, b) => a + b, 0))}</strong></span>
            <span>Promedio diario: <strong style={{ color: 'var(--accent)' }}>{fmt(Object.values(stats.salesByDate).reduce((a, b) => a + b, 0) / 14)}</strong></span>
          </div>
        </Card>

        {/* Category breakdown */}
        <Card title="Ventas por Línea">
          {cats.map(cat => {
            const val = stats.salesByCategory[cat.slug] || 0;
            return (
              <div key={cat.slug} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 500 }}>{cat.icon} {cat.name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(val)}</span>
                </div>
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(val / maxCatSale) * 100}%`, background: `linear-gradient(90deg, ${cat.color}CC, ${cat.color})`, borderRadius: 4, transition: 'width 0.6s' }} />
                </div>
              </div>
            );
          })}
          {cats.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)', fontSize: 13 }}>Sin categorías</div>}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Top products */}
        <Card title="Más Vendidos">
          {Object.entries(stats.topProducts).sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, qty], i) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: i < 3 ? 'var(--accent-bg-strong)' : 'var(--bg-input)', color: i < 3 ? 'var(--accent)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                <span style={{ fontSize: 13 }}>{name}</span>
              </div>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{qty.toLocaleString()}</span>
            </div>
          ))}
          {Object.keys(stats.topProducts).length === 0 && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)', fontSize: 13 }}>Sin ventas aún</div>}
        </Card>

        {/* Client ranking */}
        <Card title="Clientes por Volumen">
          {Object.entries(stats.clientVolume).sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, total]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
              <span style={{ color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmt(total)}</span>
            </div>
          ))}
          {Object.keys(stats.clientVolume).length === 0 && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)', fontSize: 13 }}>Sin clientes aún</div>}
        </Card>

        {/* Quick stats */}
        <Card title="Resumen del Lab">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Fórmulas', value: stats.totalFormulas, icon: '🧪' },
              { label: 'Presentaciones', value: stats.totalPresentations, icon: '📐' },
              { label: 'Productos', value: data.products.length, icon: '🏷️' },
              { label: 'Categorías', value: cats.length, icon: '📂' },
              { label: 'Proveedores', value: data.suppliers.length, icon: '🚚' },
              { label: 'Materias Primas', value: data.rawMaterials.filter(m => (m.material_type || 'materia_prima') === 'materia_prima').length, icon: '🧪' },
              { label: 'Envases', value: data.rawMaterials.filter(m => m.material_type === 'envase').length, icon: '🫙' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.icon} {item.label}</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: 15 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Low stock alerts */}
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

      {/* Recent sales */}
      <Card title="Últimos Pedidos">
        {data.sales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)', fontSize: 13 }}>Sin ventas registradas</div>
        ) : (
          <table style={tableStyle}>
            <thead><tr>{['Factura', 'Fecha', 'Cliente', 'Total', 'Estado'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {data.sales.slice(0, 6).map(sale => {
                const total = (sale.items || []).reduce((s, it) => s + it.qty * it.unit_price, 0);
                return (
                  <tr key={sale.id}>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12, color: 'var(--accent)' }}>{sale.invoice_num}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{fmtDate(sale.date)}</td>
                    <td style={tdStyle}><div style={{ fontWeight: 600 }}>{sale.client_name}</div></td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{fmt(total)}</td>
                    <td style={tdStyle}><StatusBadge status={sale.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
