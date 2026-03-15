import React, { useState, useEffect } from 'react';
import { Card, Button, EmptyState, tableStyle, thStyle, tdStyle } from './UI';
import * as db from '../lib/db';

const ACTION_ICONS = {
  crear: '➕', editar: '✏️', eliminar: '🗑️', producir: '⚙️',
  cambiar_estado: '🔄', login: '🔑',
};
const ENTITY_COLORS = {
  material: 'var(--warning)', formula: '#A78BFA', producto: 'var(--accent)',
  venta: 'var(--success)', cliente: '#60A5FA', proveedor: '#34D399',
  produccion: '#FBBF24',
};

export default function ActivityLog({ searchQuery }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const data = await db.activityLog.getAll(200);
      setLogs(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const entityTypes = [...new Set(logs.map(l => l.entity_type))];

  let filtered = filter === 'all' ? logs : logs.filter(l => l.entity_type === filter);
  if (searchQuery) filtered = filtered.filter(l =>
    l.entity_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.action?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatDetails = (details) => {
    if (!details) return null;
    return Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(' · ');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ fontSize: 28, animation: 'pulse 1.5s infinite' }}>📋</div>
    </div>;
  }

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Button variant={filter === 'all' ? 'primary' : 'muted'} size="sm" onClick={() => setFilter('all')}>
            Todos ({logs.length})
          </Button>
          {entityTypes.map(t => (
            <Button key={t} variant={filter === t ? 'primary' : 'muted'} size="sm" onClick={() => setFilter(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)} ({logs.filter(l => l.entity_type === t).length})
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={loadLogs}>🔄 Actualizar</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📋" message="No hay actividad registrada aún." />
      ) : (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtered.map((log, i) => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {ACTION_ICONS[log.action] || '📌'}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{log.user_email}</span>
                    {' '}
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {log.action === 'crear' && 'creó'}
                      {log.action === 'editar' && 'editó'}
                      {log.action === 'eliminar' && 'eliminó'}
                      {log.action === 'producir' && 'produjo'}
                      {log.action === 'cambiar_estado' && 'cambió estado de'}
                    </span>
                    {' '}
                    <span style={{
                      fontWeight: 700,
                      color: ENTITY_COLORS[log.entity_type] || 'var(--text-primary)',
                    }}>
                      {log.entity_name || '—'}
                    </span>
                    {' '}
                    <span style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 10,
                      background: 'var(--bg-input)', color: 'var(--text-dim)',
                      fontFamily: 'var(--font-mono)', fontWeight: 600,
                      border: '1px solid var(--border)',
                    }}>
                      {log.entity_type}
                    </span>
                  </div>

                  {/* Details */}
                  {log.details && (
                    <div style={{
                      fontSize: 11, color: 'var(--text-dim)', marginTop: 4,
                      fontFamily: 'var(--font-mono)', lineHeight: 1.6,
                    }}>
                      {formatDetails(log.details)}
                    </div>
                  )}
                </div>

                {/* Time */}
                <div style={{
                  fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-mono)', flexShrink: 0,
                }}>
                  {formatTime(log.created_at)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
