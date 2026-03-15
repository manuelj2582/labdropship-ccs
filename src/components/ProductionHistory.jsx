import React from 'react';
import { Card, EmptyState, tableStyle, thStyle, tdStyle } from './UI';
import { fmt } from '../utils';

export default function ProductionHistory({ data, searchQuery }) {
  const logs = data.productionLogs || [];

  const filtered = searchQuery
    ? logs.filter(l =>
        l.formula_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.produced_by_email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs;

  if (filtered.length === 0) {
    return (
      <div className="animate-in">
        <EmptyState icon="📋" message="No hay registros de producción aún. Produce tu primer lote desde el módulo de Producción." />
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {filtered.length} registros de producción
        </span>
      </div>

      <Card>
        <table style={tableStyle}>
          <thead>
            <tr>
              {['Fecha/Hora', 'Fórmula', 'Lotes', 'Producción', 'Costo Total', 'Materiales Usados', 'Producido por'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id}>
                <td style={{ ...tdStyle, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                  {new Date(log.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
                  <br />
                  <span style={{ color: 'var(--text-dim)' }}>
                    {new Date(log.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{log.formula_name}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                  {log.batches}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                  {log.total_yield}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--warning)', fontWeight: 600 }}>
                  {fmt(log.total_cost)}
                </td>
                <td style={{ ...tdStyle, fontSize: 11 }}>
                  {(log.materials || []).map((m, i) => (
                    <div key={i} style={{ padding: '1px 0', color: 'var(--text-secondary)' }}>
                      {m.material_name}: <span style={{ fontFamily: 'var(--font-mono)' }}>{m.amount_used} {m.unit}</span>
                    </div>
                  ))}
                </td>
                <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-dim)' }}>
                  {log.produced_by_email || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
