import React, { useState } from 'react';
import { Card, Button, CategoryTag } from './UI';
import { CATEGORIES } from '../data/initialData';
import { fmt } from '../utils';

export default function Products({ data, formulasWithCosts }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? data.products : data.products.filter(p => p.category === filter);

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant={filter === 'all' ? 'primary' : 'muted'} size="sm" onClick={() => setFilter('all')}>
            Todos ({data.products.length})
          </Button>
          {CATEGORIES.map(c => {
            const count = data.products.filter(p => p.category === c.id).length;
            return (
              <Button key={c.id} variant={filter === c.id ? 'primary' : 'muted'} size="sm" onClick={() => setFilter(c.id)}>
                {c.icon} {count}
              </Button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {filtered.map(p => {
          const cat = CATEGORIES.find(c => c.id === p.category);
          const formula = formulasWithCosts.find(f => f.id === p.formulaId);
          const totalSold = data.sales.reduce((s, sale) =>
            s + sale.items.filter(it => it.productId === p.id).reduce((si, it) => si + it.qty, 0), 0);
          return (
            <Card key={p.id} style={{
              position: 'relative', overflow: 'hidden',
              transition: 'var(--transition)', cursor: 'default',
            }}>
              <div style={{
                position: 'absolute', top: -10, right: -10,
                fontSize: 56, opacity: 0.05,
              }}>{cat?.icon}</div>
              <CategoryTag category={p.category} categories={CATEGORIES} />
              <h4 style={{ margin: '10px 0 6px', fontSize: 14, fontWeight: 700 }}>{p.name}</h4>
              <div style={{
                fontSize: 28, fontWeight: 800, color: 'var(--accent)',
                letterSpacing: '-0.03em', margin: '4px 0',
              }}>{fmt(p.price)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
                precio al mayor / unidad
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-dim)' }}>En stock</span>
                  <span style={{
                    fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: p.stock > 50 ? 'var(--success)' : p.stock > 10 ? 'var(--warning)' : 'var(--danger)',
                  }}>{p.stock.toLocaleString()} uds</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Vendidas</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{totalSold.toLocaleString()} uds</span>
                </div>
                {formula && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-dim)' }}>Costo prod.</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{fmt(formula.productionCost)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-dim)' }}>Margen</span>
                      <span style={{
                        fontWeight: 700, fontFamily: 'var(--font-mono)',
                        color: formula.margin > 50 ? 'var(--success)' : 'var(--warning)',
                      }}>{formula.margin.toFixed(1)}%</span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
