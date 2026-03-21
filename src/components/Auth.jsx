import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/db';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { error } = await auth.signIn(email, password);
      if (error) throw error;
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : err.message || 'Error de autenticación');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(108,114,255,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(167,139,250,0.04) 0%, transparent 50%)',
    }}>
      <div style={{
        width: 400, padding: 40,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-modal)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, var(--accent), #A78BFA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>🧪</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
            VeneLab
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Sistema de Gestión
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 5 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="tu@email.com"
              style={{
                width: '100%', padding: '11px 14px', background: 'var(--bg-input)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', fontSize: 14, fontFamily: 'var(--font-body)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 5 }}>Contraseña</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              minLength={6}
              style={{
                width: '100%', padding: '11px 14px', background: 'var(--bg-input)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', fontSize: 14, fontFamily: 'var(--font-body)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: 14, borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-bg)', border: '1px solid rgba(255,90,101,0.2)',
              color: 'var(--danger)', fontSize: 13,
            }}>{error}</div>
          )}

          <button type="submit" disabled={submitting} style={{
            width: '100%', padding: '12px 0', border: 'none',
            borderRadius: 'var(--radius-sm)', cursor: submitting ? 'wait' : 'pointer',
            background: submitting ? 'var(--border-light)' : 'var(--accent)',
            color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)',
            transition: 'var(--transition)',
          }}>
            {submitting ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', marginTop: 20 }}>
          Acceso solo para usuarios autorizados
        </p>
      </div>
    </div>
  );
}
