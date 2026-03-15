import React from 'react';

// ── Styles ──
const s = {
  input: {
    width: '100%', padding: '9px 13px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-body)',
    outline: 'none', transition: 'var(--transition)', boxSizing: 'border-box',
  },
  label: { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 4 },
  btn: {
    border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    fontWeight: 600, fontSize: 13, padding: '9px 18px', transition: 'var(--transition)',
    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)',
  },
};

export function Card({ title, children, span, className, style }) {
  return (
    <div className={className} style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: 20,
      boxShadow: 'var(--shadow-card)',
      gridColumn: span ? `span ${span}` : undefined, ...style,
    }}>
      {title && (
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-dim)',
          marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em',
          fontFamily: 'var(--font-mono)',
        }}>{title}</div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '18px 20px',
      boxShadow: 'var(--shadow-card)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -8, right: -8, fontSize: 48, opacity: 0.06,
      }}>{icon}</div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function Button({ children, variant = 'primary', size = 'md', disabled, onClick, style: extraStyle }) {
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff' },
    success: { background: 'var(--success)', color: '#fff' },
    danger: { background: 'var(--danger-bg)', color: 'var(--danger)' },
    ghost: { background: 'var(--accent-bg)', color: 'var(--accent)' },
    muted: { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
    warningGhost: { background: 'var(--warning-bg)', color: 'var(--warning)' },
    successGhost: { background: 'var(--success-bg)', color: 'var(--success)' },
  };
  const sizes = {
    sm: { padding: '5px 12px', fontSize: 11 },
    md: { padding: '9px 18px', fontSize: 13 },
    lg: { padding: '12px 24px', fontSize: 14 },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...s.btn, ...variants[variant], ...sizes[size],
      opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
      ...extraStyle,
    }}>{children}</button>
  );
}

export function Input({ label, value, onChange, type = 'text', placeholder, step, min, style: extraStyle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={s.label}>{label}</label>}
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} step={step} min={min}
        style={{ ...s.input, ...extraStyle }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  );
}

export function Select({ label, value, options, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={s.label}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...s.input, cursor: 'pointer' }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o =>
          typeof o === 'object'
            ? <option key={o.value} value={o.value}>{o.label}</option>
            : <option key={o} value={o}>{o}</option>
        )}
      </select>
    </div>
  );
}

export function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={s.label}>{label}</label>}
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{ ...s.input, resize: 'vertical', minHeight: 60 }}
      />
    </div>
  );
}

export function Modal({ title, children, onClose, wide }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000,
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div className="modal-animate" onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: 28,
        width: wide ? 640 : 480, maxHeight: '82vh', overflow: 'auto',
        boxShadow: 'var(--shadow-modal)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14,
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ onCancel, onConfirm, confirmLabel = 'Guardar', confirmDisabled, confirmVariant = 'primary' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      <Button variant="muted" onClick={onCancel}>Cancelar</Button>
      <Button variant={confirmVariant} onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Button>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    completada: { bg: 'var(--success-bg)', color: 'var(--success)', label: '● Completada', border: 'rgba(0,214,143,0.2)' },
    pendiente: { bg: 'var(--warning-bg)', color: 'var(--warning)', label: '● Pendiente', border: 'rgba(255,181,71,0.2)' },
    enviada: { bg: 'var(--accent-bg)', color: 'var(--accent)', label: '● Enviada', border: 'rgba(108,114,255,0.2)' },
    bajo: { bg: 'var(--danger-bg)', color: 'var(--danger)', label: '⚠ Stock Bajo', border: 'rgba(255,90,101,0.2)' },
    ok: { bg: 'var(--success-bg)', color: 'var(--success)', label: '✓ OK', border: 'rgba(0,214,143,0.2)' },
  };
  const cfg = map[status] || map.pendiente;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, padding: '4px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 600,
      border: `1px solid ${cfg.border}`,
    }}>{cfg.label}</span>
  );
}

export function CategoryTag({ category, categories }) {
  const cat = categories.find(c => c.id === category);
  if (!cat) return null;
  return (
    <span style={{
      background: cat.color + '18', color: cat.color,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      border: `1px solid ${cat.color}30`,
    }}>{cat.icon} {cat.name}</span>
  );
}

export function EmptyState({ icon, message }) {
  return (
    <div style={{
      textAlign: 'center', padding: '48px 20px',
      color: 'var(--text-dim)',
    }}>
      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{message}</div>
    </div>
  );
}

// Table helpers
export const tableStyle = { width: '100%', borderCollapse: 'collapse' };
export const thStyle = {
  textAlign: 'left', padding: '11px 14px', fontSize: 10, fontWeight: 700,
  color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em',
  borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)',
};
export const tdStyle = {
  padding: '12px 14px', fontSize: 13, color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border)',
};
