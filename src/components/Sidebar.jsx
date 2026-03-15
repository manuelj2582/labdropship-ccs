import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'inventory', label: 'Inventario', icon: '📦' },
  { id: 'formulas', label: 'Fórmulas', icon: '🧪' },
  { id: 'production', label: 'Producción', icon: '⚙️' },
  { id: 'products', label: 'Productos', icon: '🏷️' },
  { id: 'sales', label: 'Ventas Mayor', icon: '💰' },
  { id: 'clients', label: 'Clientes', icon: '👥' },
  { id: 'suppliers', label: 'Proveedores', icon: '🚚' },
  { id: 'categories', label: 'Categorías', icon: '🏷️' },
  { id: 'history', label: 'Historial Prod.', icon: '📋' },
  { id: 'activity', label: 'Log Actividad', icon: '🕐' },
  { id: 'reports', label: 'Reportes', icon: '📈' },
];

export { NAV_ITEMS };

export default function Sidebar({ view, setView, open, setOpen }) {
  return (
    <div className={`sidebar ${open ? 'open' : ''}`} style={{
      width: open ? 240 : 64, background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease', flexShrink: 0, overflow: 'hidden',
    }}>
      <div onClick={() => setOpen(!open)} style={{
        padding: '20px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minHeight: 64,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--accent), #A78BFA)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
        }}>🧪</div>
        {open && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.02em' }}>VeneLab</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>CARACAS · VENEZUELA</div>
          </div>
        )}
      </div>
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV_ITEMS.map(n => {
          const active = view === n.id;
          return (
            <button key={n.id} onClick={() => { setView(n.id); if (window.innerWidth < 768) setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-start' : 'center',
                gap: 10, padding: open ? '10px 14px' : '10px 0',
                background: active ? 'var(--accent-bg-strong)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-dim)',
                border: active ? '1px solid rgba(108,114,255,0.15)' : '1px solid transparent',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 600 : 500, fontFamily: 'var(--font-body)',
                transition: 'var(--transition)', width: '100%',
              }}
            >
              <span style={{ fontSize: 17, width: 24, textAlign: 'center', flexShrink: 0 }}>{n.icon}</span>
              {open && <span style={{ whiteSpace: 'nowrap' }}>{n.label}</span>}
            </button>
          );
        })}
      </nav>
      {open && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          <div>v2.2.0 · 2026</div>
          <div style={{ marginTop: 2 }}>venelab.com</div>
        </div>
      )}
    </div>
  );
}
