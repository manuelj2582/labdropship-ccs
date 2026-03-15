import React, { useState, useCallback, useMemo } from 'react';
import Sidebar, { NAV_ITEMS } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Formulas from './components/Formulas';
import Production from './components/Production';
import Products from './components/Products';
import Sales from './components/Sales';
import Clients from './components/Clients';
import Suppliers from './components/Suppliers';
import Reports from './components/Reports';
import { Button } from './components/UI';
import { INITIAL_DATA } from './data/initialData';

export default function App() {
  const [data, setData] = useState(INITIAL_DATA);
  const [view, setView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const formulasWithCosts = useMemo(() => {
    return data.formulas.map(f => {
      const cost = f.ingredients.reduce((sum, ing) => {
        const mat = data.rawMaterials.find(m => m.id === ing.materialId);
        return sum + (mat ? mat.cost * ing.amount : 0);
      }, 0);
      return {
        ...f,
        productionCost: cost,
        margin: f.salePrice > 0 ? ((f.salePrice - cost) / f.salePrice) * 100 : 0,
      };
    });
  }, [data.formulas, data.rawMaterials]);

  const currentNav = NAV_ITEMS.find(n => n.id === view);

  const renderView = () => {
    const props = { data, setData, showToast, formulasWithCosts };
    switch (view) {
      case 'dashboard': return <Dashboard {...props} />;
      case 'inventory': return <Inventory {...props} />;
      case 'formulas': return <Formulas {...props} />;
      case 'production': return <Production {...props} />;
      case 'products': return <Products {...props} />;
      case 'sales': return <Sales {...props} />;
      case 'clients': return <Clients {...props} />;
      case 'suppliers': return <Suppliers {...props} />;
      case 'reports': return <Reports {...props} />;
      default: return <Dashboard {...props} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        view={view}
        setView={setView}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          padding: '16px 28px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {currentNav?.icon} {currentNav?.label}
            </h2>
            <div style={{
              fontSize: 11, color: 'var(--text-dim)', marginTop: 3,
              fontFamily: 'var(--font-mono)',
            }}>
              {new Date().toLocaleDateString('es-VE', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="successGhost" onClick={() => setView('production')}>⚙️ Producir</Button>
            <Button variant="ghost" onClick={() => setView('sales')}>💰 Pedido Mayor</Button>
          </div>
        </div>

        {/* View Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {renderView()}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
          color: '#fff', padding: '12px 22px', borderRadius: 'var(--radius-md)',
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease',
          fontFamily: 'var(--font-body)',
        }}>{toast.msg}</div>
      )}
    </div>
  );
}
