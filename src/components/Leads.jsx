import React, { useEffect, useState } from 'react';
import { Card, Button, EmptyState, tableStyle, thStyle, tdStyle } from './UI';
import * as db from '../lib/db';
import { canEdit } from '../lib/roles';

const TYPE_LABEL = { A: 'A · Importa', B: 'B · Dropshipper', C: 'C · Arranca', D: 'D · Curioso', E: 'E · Aliado' };
const STATUS = ['nuevo', 'contactado', 'negociando', 'cliente', 'descartado'];

// Clasificación automática sugerida a partir de las respuestas del formulario.
function suggestType(l) {
  if (l.sells === 'stock') return 'A';
  if (l.sells === 'dropshipping') return 'B';
  if (l.sells === 'arrancando') return 'C';
  return 'D';
}

export default function Leads({ showToast, role, searchQuery }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    try { setLeads(await db.leads.getAll()); }
    catch (e) { showToast('Error cargando leads: ' + e.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setField = async (id, updates) => {
    try { await db.leads.update(id, updates); setLeads(ls => ls.map(l => l.id === id ? { ...l, ...updates } : l)); }
    catch (e) { showToast('No se pudo actualizar: ' + e.message, 'error'); }
  };

  const q = (searchQuery || '').toLowerCase();
  const shown = leads
    .filter(l => filter === 'all' || (l.lead_type || suggestType(l)) === filter)
    .filter(l => !q || `${l.name} ${l.whatsapp} ${l.instagram} ${l.notes}`.toLowerCase().includes(q));

  const counts = leads.reduce((acc, l) => { const t = l.lead_type || suggestType(l); acc[t] = (acc[t] || 0) + 1; return acc; }, {});
  const wa = (n) => `https://wa.me/${String(n || '').replace(/\D/g, '')}`;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {['all', 'A', 'B', 'C', 'D', 'E'].map(t => (
          <Button key={t} size="sm" variant={filter === t ? 'primary' : 'ghost'} onClick={() => setFilter(t)}>
            {t === 'all' ? `Todos (${leads.length})` : `${TYPE_LABEL[t]} (${counts[t] || 0})`}
          </Button>
        ))}
        <div style={{ flex: 1 }} />
        <Button size="sm" variant="ghost" onClick={load}>↻ Actualizar</Button>
      </div>

      <Card>
        {loading ? <div style={{ padding: 24, color: 'var(--text-dim)' }}>Cargando...</div>
        : shown.length === 0 ? <EmptyState icon="🎯" title="Sin leads" text="Los registros del QR del stand aparecen aquí." />
        : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead><tr>
                <th style={thStyle}>Fecha</th><th style={thStyle}>Nombre</th><th style={thStyle}>WhatsApp</th><th style={thStyle}>IG</th>
                <th style={thStyle}>Vende</th><th style={thStyle}>Canal</th><th style={thStyle}>Líneas</th><th style={thStyle}>Modalidad</th>
                <th style={thStyle}>Tipo</th><th style={thStyle}>Estado</th><th style={thStyle}>Nota</th>
              </tr></thead>
              <tbody>
                {shown.map(l => (
                  <tr key={l.id}>
                    <td style={tdStyle}>{new Date(l.created_at).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{l.name}</td>
                    <td style={tdStyle}><a href={wa(l.whatsapp)} target="_blank" rel="noreferrer" style={{ color: '#25D366' }}>{l.whatsapp}</a></td>
                    <td style={tdStyle}>{l.instagram}</td>
                    <td style={tdStyle}>{l.sells}</td>
                    <td style={tdStyle}>{(l.channels || []).join(', ')}</td>
                    <td style={tdStyle}>{(l.lines || []).join(', ')}</td>
                    <td style={tdStyle}>{l.mode}{l.wants_landing ? ' · 🌐' : ''}</td>
                    <td style={tdStyle}>
                      <select disabled={!canEdit(role)} value={l.lead_type || suggestType(l)} onChange={e => setField(l.id, { lead_type: e.target.value })}
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', fontSize: 12 }}>
                        {Object.keys(TYPE_LABEL).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <select disabled={!canEdit(role)} value={l.status || 'nuevo'} onChange={e => setField(l.id, { status: e.target.value })}
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', fontSize: 12 }}>
                        {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <input disabled={!canEdit(role)} defaultValue={l.notes || ''} placeholder="5 palabras" onBlur={e => e.target.value !== (l.notes || '') && setField(l.id, { notes: e.target.value })}
                        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', fontSize: 12, width: 160 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
