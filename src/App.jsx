import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AuthProvider, useAuth, LoginPage } from './components/Auth';
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
import ProductionHistory from './components/ProductionHistory';
import ActivityLog from './components/ActivityLog';
import Categories from './components/Categories';
import { Button } from './components/UI';
import { auth, preferences } from './lib/db';
import * as db from './lib/db';

function AppContent() {
  const { user, loading } = useAuth();
  const [data, setData] = useState({
    rawMaterials: [], formulas: [], products: [], presentations: [],
    sales: [], suppliers: [], clients: [], productionLogs: [], categories: [],
  });
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    const validViews = ['dashboard','inventory','formulas','production','products','sales','clients','suppliers','categories','history','activity','reports'];
    return validViews.includes(hash) ? hash : 'dashboard';
  };
  const [view, setViewState] = useState(getInitialView);
  const setView = (v) => {
    window.location.hash = v;
    setViewState(v);
  };

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setViewState(hash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [toast, setToast] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('dark');

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      preferences.get(user.id).then(prefs => {
        if (prefs?.theme) { setTheme(prefs.theme); }
      }).catch(() => {});
    }
  }, [user]);

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (user) {
      try { await preferences.set(user.id, { theme: next }); } catch (e) {}
    }
  };

  // Mobile resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      const [rawMats, formulas, prods, salesData, supps, cls, logs, cats, pres] = await Promise.all([
        db.rawMaterials.getAll(), db.formulas.getAll(), db.products.getAll(),
        db.sales.getAll(), db.suppliers.getAll(), db.clients.getAll(), db.productionLog.getAll(),
        db.categories.getAll(), db.presentations.getAll(),
      ]);
      setData({ rawMaterials: rawMats, formulas, products: prods, presentations: pres, sales: salesData, suppliers: supps, clients: cls, productionLogs: logs, categories: cats });
    } catch (err) {
      console.error('Error loading:', err);
      showToast('Error cargando datos: ' + err.message, 'error');
    } finally { setDataLoading(false); }
  }, [showToast]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const formulasWithCosts = useMemo(() => {
    return data.formulas.map(f => {
      const cost = (f.ingredients || []).reduce((sum, ing) => {
        const mat = data.rawMaterials.find(m => m.id === ing.material_id);
        return sum + (mat ? mat.cost * ing.amount : 0);
      }, 0);
      return { ...f, _productionCost: cost, _margin: f.sale_price > 0 ? ((f.sale_price - cost) / f.sale_price) * 100 : 0 };
    });
  }, [data.formulas, data.rawMaterials]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, var(--accent), #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, animation: 'pulse 1.5s infinite' }}>🧪</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Cargando...</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const currentNav = NAV_ITEMS.find(n => n.id === view);

  const renderView = () => {
    const props = { data, setData, showToast, formulasWithCosts, loadData, user, searchQuery };
    const views = {
      dashboard: Dashboard, inventory: Inventory, formulas: Formulas, production: Production,
      products: Products, sales: Sales, clients: Clients, suppliers: Suppliers,
      categories: Categories, reports: Reports, history: ProductionHistory, activity: ActivityLog,
    };
    const View = views[view] || Dashboard;
    return <View {...props} />;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar view={view} setView={setView} open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Mobile overlay */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
      )}

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div className="main-header" style={{
          padding: '14px 28px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexShrink: 0, gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Mobile hamburger */}
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              display: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', width: 36, height: 36, cursor: 'pointer',
              alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text-primary)',
            }}>☰</button>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{currentNav?.icon} {currentNav?.label}</h2>
              <div className="desktop-only" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="search-input" type="text" placeholder="🔍 Buscar..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: '8px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 12, width: 180, fontFamily: 'var(--font-body)', outline: 'none' }}
            />

            {/* Theme toggle */}
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, transition: 'var(--transition)', color: 'var(--text-primary)',
            }}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <Button variant="successGhost" size="sm" onClick={() => setView('production')} style={{ display: window.innerWidth < 480 ? 'none' : undefined }}>⚙️ Producir</Button>
            <Button variant="ghost" size="sm" onClick={() => setView('sales')} style={{ display: window.innerWidth < 480 ? 'none' : undefined }}>💰 Pedido</Button>

            {/* User */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
              background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-bg-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
              }}>{user.email?.charAt(0).toUpperCase()}</div>
              <span className="user-menu-email" style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
              <button onClick={() => auth.signOut()} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }} title="Cerrar Sesión">⏻</button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="main-content" style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {dataLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 32, animation: 'pulse 1.5s infinite' }}>🧪</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Cargando datos...</div>
            </div>
          ) : renderView()}
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, left: window.innerWidth < 768 ? 24 : 'auto',
          background: toast.type === 'error' ? 'var(--danger)' : 'var(--success)',
          color: '#fff', padding: '12px 22px', borderRadius: 'var(--radius-md)',
          fontSize: 13, fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          zIndex: 999999, animation: 'fadeIn 0.2s ease', textAlign: 'center',
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
