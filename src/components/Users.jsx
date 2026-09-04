import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, ModalActions, Input, Select } from './UI';
import { supabase } from '../lib/supabase';
import * as db from '../lib/db';

import { ROLES } from '../lib/roles';

export default function Users({ user, showToast }) {
  const [users, setUsers] = useState([]);
  const [detectedUsers, setDetectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'operator' });

  const loadUsers = async () => {
    try {
      const data = await db.userRoles.getAll();
      setUsers(data);

      // Detect existing users from activity_log and user_preferences that aren't in user_roles
      const registeredIds = new Set(data.map(u => u.user_id));
      const detected = [];

      // From activity_log
      const { data: logs } = await supabase.from('activity_log')
        .select('user_id, user_email')
        .not('user_id', 'is', null);
      if (logs) {
        const seen = new Set();
        logs.forEach(l => {
          if (l.user_id && l.user_email && !registeredIds.has(l.user_id) && !seen.has(l.user_id)) {
            seen.add(l.user_id);
            detected.push({ user_id: l.user_id, email: l.user_email, source: 'actividad' });
          }
        });
      }

      // From user_preferences
      const { data: prefs } = await supabase.from('user_preferences').select('user_id');
      if (prefs) {
        prefs.forEach(p => {
          if (p.user_id && !registeredIds.has(p.user_id) && !detected.find(d => d.user_id === p.user_id)) {
            detected.push({ user_id: p.user_id, email: '(email desconocido)', source: 'preferencias' });
          }
        });
      }

      // Current user if not registered
      if (user?.id && !registeredIds.has(user.id) && !detected.find(d => d.user_id === user.id)) {
        detected.push({ user_id: user.id, email: user.email, source: 'sesión actual' });
      }

      setDetectedUsers(detected);
    } catch (err) { console.warn('Error loading users:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const createUser = async () => {
    if (!form.email || !form.password || form.password.length < 6) {
      showToast('Email y contraseña (mín 6 caracteres) requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      const newUser = await db.userRoles.createUser(form.email, form.password);
      if (newUser?.id) {
        await db.userRoles.setRole(newUser.id, form.email, form.role, form.name);
      }
      showToast(`Usuario "${form.email}" creado como ${ROLES.find(r => r.id === form.role)?.label}`);
      setCreateModal(false);
      setForm({ email: '', password: '', name: '', role: 'operator' });
      await loadUsers();
    } catch (err) {
      if (err.message?.includes('already registered')) {
        showToast('Este email ya está registrado', 'error');
      } else {
        showToast('Error: ' + err.message, 'error');
      }
    }
    finally { setSaving(false); }
  };

  const assignRole = async (userId, email, role, name) => {
    try {
      await db.userRoles.setRole(userId, email, role, name || '');
      showToast(`Rol asignado a "${email}"`);
      await loadUsers();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const updateRole = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await db.userRoles.setRole(editModal.user_id, editModal.email, form.role, form.name);
      showToast(`Rol de "${editModal.email}" actualizado`);
      setEditModal(null);
      await loadUsers();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const removeUser = async (u) => {
    if (u.user_id === user?.id) { showToast('No puedes eliminarte a ti mismo', 'error'); return; }
    if (!confirm(`¿Eliminar el acceso de "${u.email}"?`)) return;
    try {
      await db.userRoles.delete(u.id);
      showToast(`Acceso de "${u.email}" eliminado`);
      await loadUsers();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const myRole = users.find(u => u.user_id === user?.id);

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{users.length} usuarios con rol</span>
          {myRole && (
            <span style={{ marginLeft: 12, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--accent-bg)', color: 'var(--accent)' }}>
              Tu rol: {ROLES.find(r => r.id === myRole.role)?.icon} {ROLES.find(r => r.id === myRole.role)?.label}
            </span>
          )}
        </div>
        <Button onClick={() => { setForm({ email: '', password: '', name: '', role: 'operator' }); setCreateModal(true); }}>+ Crear Usuario</Button>
      </div>

      {/* Detected users without role */}
      {detectedUsers.length > 0 && (
        <Card style={{ marginBottom: 16, border: '1px solid rgba(255,170,0,0.3)' }}>
          <div style={{ fontSize: 10, color: 'var(--warning)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>
            ⚠️ USUARIOS EXISTENTES SIN ROL ASIGNADO ({detectedUsers.length})
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Estos usuarios se registraron antes. Asígnales un rol o elimínalos desde Supabase.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {detectedUsers.map(d => (
              <div key={d.user_id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{d.email}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    Detectado en: {d.source} · ID: {d.user_id.slice(0, 8)}...
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {ROLES.map(r => (
                    <button key={r.id} onClick={() => assignRole(d.user_id, d.email, r.id)} style={{
                      padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
                      background: 'var(--bg-card)', color: 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      fontFamily: 'var(--font-body)',
                    }} title={r.desc}>
                      {r.icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Roles legend */}
      <Card style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>
          ROLES DISPONIBLES
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {ROLES.map(r => (
            <div key={r.id} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.icon} {r.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Users list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Cargando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map(u => {
            const role = ROLES.find(r => r.id === u.role) || ROLES[3];
            const isMe = u.user_id === user?.id;
            return (
              <Card key={u.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: u.role === 'admin' ? 'linear-gradient(135deg, #6C72FF, #A78BFA)' :
                        u.role === 'manager' ? 'linear-gradient(135deg, #00D68F, #60A5FA)' :
                        u.role === 'operator' ? 'linear-gradient(135deg, #FBBF24, #F97316)' :
                        'linear-gradient(135deg, #64748B, #94A3B8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    }}>{role.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {u.name || u.email.split('@')[0]}
                        {isMe && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>(tú)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{u.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{role.label}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setForm({ name: u.name || '', role: u.role });
                      setEditModal(u);
                    }}>✎</Button>
                    {!isMe && <Button variant="danger" size="sm" onClick={() => removeUser(u)}>✕</Button>}
                  </div>
                </div>
              </Card>
            );
          })}

          {users.length === 0 && !loading && (
            <Card>
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)', fontSize: 13 }}>
                No hay usuarios con roles asignados.
                <div style={{ marginTop: 12 }}>
                  <Button size="sm" onClick={() => assignRole(user.id, user.email, 'admin', 'Administrador')}>
                    👑 Asignarme como Admin
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ═══ CREATE USER MODAL ═══ */}
      {createModal && (
        <Modal title="Crear Nuevo Usuario" onClose={() => setCreateModal(false)}>
          <Input label="Nombre" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Nombre del usuario" />
          <Input label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="usuario@email.com" />
          <Input label="Contraseña (mín 6 caracteres)" type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} placeholder="••••••••" />
          <Select label="Rol" value={form.role}
            options={ROLES.map(r => ({ value: r.id, label: `${r.icon} ${r.label}` }))}
            onChange={v => setForm({ ...form, role: v })} />

          {form.role && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-bg)', border: '1px solid rgba(108,114,255,0.15)', fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>
              {ROLES.find(r => r.id === form.role)?.icon} {ROLES.find(r => r.id === form.role)?.desc}
            </div>
          )}

          <ModalActions onCancel={() => setCreateModal(false)} onConfirm={createUser}
            confirmLabel={saving ? 'Creando...' : 'Crear Usuario'} confirmDisabled={saving || !form.email || !form.password} />
        </Modal>
      )}

      {/* ═══ EDIT ROLE MODAL ═══ */}
      {editModal && (
        <Modal title={`Editar: ${editModal.email}`} onClose={() => setEditModal(null)}>
          <Input label="Nombre" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Select label="Rol" value={form.role}
            options={ROLES.map(r => ({ value: r.id, label: `${r.icon} ${r.label}` }))}
            onChange={v => setForm({ ...form, role: v })} />

          <ModalActions onCancel={() => setEditModal(null)} onConfirm={updateRole}
            confirmLabel={saving ? 'Guardando...' : 'Actualizar Rol'} confirmDisabled={saving} />
        </Modal>
      )}
    </div>
  );
}
