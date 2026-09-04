import React, { useEffect, useState } from 'react';
import { leads } from '../lib/db';

const WHATSAPP_NUMBER = '584246528973';
const SOURCE = 'ecom2026';

const SELLS = [
  { id: 'stock', label: 'Sí, vendo con stock propio' },
  { id: 'dropshipping', label: 'Sí, vendo sin stock (dropshipping)' },
  { id: 'arrancando', label: 'Estoy arrancando' },
  { id: 'curioso', label: 'Solo curioseo' },
];
const CHANNELS = ['Instagram', 'TikTok', 'Dropi', 'Dropanas', 'Tienda propia', 'Otro'];
const LINES = ['Skincare', 'Automotriz', 'Mascotas', 'Hogar'];
const MODES = [
  { id: 'mayor', label: 'Comprar al mayor' },
  { id: 'despacho', label: 'Que despachen por mí' },
  { id: 'ambas', label: 'Ambas' },
];

const S = {
  page: { minHeight: '100vh', background: '#050910', color: '#E8EDF5', fontFamily: "'Outfit', system-ui, sans-serif", padding: '24px 16px 48px' },
  wrap: { maxWidth: 520, margin: '0 auto' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#8B9DC3', margin: '18px 0 8px' },
  input: { width: '100%', padding: '14px', background: '#0D1526', border: '1px solid #1A2744', borderRadius: 10, color: '#E8EDF5', fontSize: 16, outline: 'none', fontFamily: 'inherit' },
  chip: (on) => ({ padding: '10px 14px', borderRadius: 999, fontSize: 14, cursor: 'pointer', border: `1px solid ${on ? '#6C72FF' : '#1A2744'}`, background: on ? 'rgba(108,114,255,0.18)' : '#0D1526', color: on ? '#fff' : '#8B9DC3' }),
  btn: (bg, color = '#fff') => ({ display: 'block', width: '100%', padding: '16px', borderRadius: 12, fontSize: 16, fontWeight: 700, background: bg, color, border: 'none', cursor: 'pointer', textDecoration: 'none', textAlign: 'center', fontFamily: 'inherit', marginTop: 12 }),
};

export default function Ecom() {
  const [form, setForm] = useState({ name: '', whatsapp: '', instagram: '', sells: '', channels: [], lines: [], mode: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'VeneLab · ECOM 2026';
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    const root = document.getElementById('root');
    if (root) { root.style.overflow = 'auto'; root.style.height = 'auto'; }
  }, []);

  const toggle = (key, v) => setForm(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const phone = form.whatsapp.replace(/\D/g, '');
    if (form.name.trim().length < 2) return setError('Escribe tu nombre.');
    if (phone.length < 10) return setError('Escribe tu WhatsApp con código de área (ej. 0424 123 4567).');
    if (!form.sells) return setError('Dinos si vendes online.');
    if (form.lines.length === 0) return setError('Elige al menos una línea.');
    if (!form.mode) return setError('Elige una modalidad.');
    setSending(true);
    try {
      await leads.create({
        source: SOURCE, name: form.name.trim(),
        whatsapp: phone.startsWith('58') ? `+${phone}` : `+58${phone.replace(/^0/, '')}`,
        instagram: form.instagram.trim().replace(/^@/, '') || null,
        sells: form.sells, channels: form.channels, lines: form.lines, mode: form.mode,
        user_agent: navigator.userAgent.slice(0, 200),
      });
      setDone(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError('No se pudo enviar. Muéstrale esta pantalla a la persona del stand. (' + err.message + ')');
    } finally { setSending(false); }
  };

  const waText = encodeURIComponent('Hola VeneLab, vengo de ECOM y quiero información para vender sus productos.');

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap" rel="stylesheet" />
      <div style={S.wrap}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#6C72FF,#A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧪</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em' }}>VeneLab</div>
            <div style={{ fontSize: 11, color: '#4F6289', letterSpacing: '0.12em' }}>FABRICADO EN VENEZUELA · ECOM 2026</div>
          </div>
        </div>

        {done ? (
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.1, margin: '0 0 10px' }}>¡Listo, {form.name.split(' ')[0]}! 🎉</h1>
            <p style={{ color: '#8B9DC3', fontSize: 16, lineHeight: 1.5, margin: '0 0 24px' }}>Ya quedaste registrado. Ahora elige por dónde seguimos:</p>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`} style={S.btn('#25D366')}>① Hablar por WhatsApp</a>
            <a href="/catalogo" style={S.btn('rgba(108,114,255,0.15)', '#A78BFA')}>② Ver catálogo mayorista</a>
            <p style={{ color: '#4F6289', fontSize: 13, marginTop: 24, textAlign: 'center' }}>Oferta especial del evento válida hasta el martes 30 de septiembre.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1, margin: '0 0 8px' }}>Producto hecho en Venezuela<br /><span style={{ background: 'linear-gradient(135deg,#6C72FF,#A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>para vender online</span></h1>
            <p style={{ color: '#8B9DC3', fontSize: 15, lineHeight: 1.5, margin: 0 }}>Al mayor y dropshipping. 60 segundos y te contactamos por WhatsApp con la oferta del evento.</p>

            <label style={S.label}>Nombre</label>
            <input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoComplete="name" />

            <label style={S.label}>WhatsApp</label>
            <input style={S.input} type="tel" inputMode="tel" placeholder="0424 123 4567" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} autoComplete="tel" />

            <label style={S.label}>Instagram o TikTok <span style={{ color: '#4F6289', fontWeight: 400 }}>(opcional)</span></label>
            <input style={S.input} placeholder="@tuusuario" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} />

            <label style={S.label}>¿Vendes online hoy?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SELLS.map(o => <button type="button" key={o.id} style={S.chip(form.sells === o.id)} onClick={() => setForm({ ...form, sells: o.id })}>{o.label}</button>)}
            </div>

            <label style={S.label}>¿Por dónde vendes? <span style={{ color: '#4F6289', fontWeight: 400 }}>(varias)</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CHANNELS.map(c => <button type="button" key={c} style={S.chip(form.channels.includes(c))} onClick={() => toggle('channels', c)}>{c}</button>)}
            </div>

            <label style={S.label}>Línea que te interesa <span style={{ color: '#4F6289', fontWeight: 400 }}>(varias)</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LINES.map(c => <button type="button" key={c} style={S.chip(form.lines.includes(c))} onClick={() => toggle('lines', c)}>{c}</button>)}
            </div>

            <label style={S.label}>Modalidad</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {MODES.map(o => <button type="button" key={o.id} style={S.chip(form.mode === o.id)} onClick={() => setForm({ ...form, mode: o.id })}>{o.label}</button>)}
            </div>


            {error && <div style={{ background: 'rgba(255,90,101,0.12)', border: '1px solid #FF5A65', color: '#FF8B93', padding: 12, borderRadius: 10, marginTop: 16, fontSize: 14 }}>{error}</div>}

            <button type="submit" disabled={sending} style={{ ...S.btn('linear-gradient(135deg,#6C72FF,#A78BFA)'), marginTop: 22, opacity: sending ? 0.6 : 1 }}>
              {sending ? 'Enviando…' : 'Quiero información →'}
            </button>
            <p style={{ color: '#4F6289', fontSize: 12, textAlign: 'center', marginTop: 14 }}>Solo usamos tus datos para contactarte. Sin spam.</p>
          </form>
        )}
      </div>
    </div>
  );
}
