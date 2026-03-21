import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, ModalActions, Input, Select } from './UI';
import * as db from '../lib/db';

const ROLES = [
  { id: 'admin', label: 'Administrador', icon: '👑', desc: 'Acceso total: crear usuarios, configurar, eliminar datos' },
  { id: 'manager', label: 'Gerente', icon: '📊', desc: 'Todo excepto crear usuarios y configuración del sistema' },
  { id: 'operator', label: 'Operador', icon: '⚙️', desc: 'Producción, inventario, ventas. Sin acceso a precios ni reportes' },
  { id: 'viewer', label: 'Visor', icon: '👁️', desc: 'Solo puede ver datos, no puede modificar nada' },
];

export default function Users({ user, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'operator' });

  const loadUsers = async () => {
    try {
      const data = await db.userRoles.getAll();
      setUsers(data);
    } catch (err) { console.warn('user_roles not available:', err); }
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
    if (!confirm(`¿Eliminar el acceso de "${u.email}"? El usuario no podrá iniciar sesión.`)) return;
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
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{users.length} usuarios registrados</span>
          {myRole && (
            <span style={{ marginLeft: 12, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--accent-bg)', color: 'var(--accent)' }}>
              Tu rol: {ROLES.find(r => r.id === myRole.role)?.icon} {ROLES.find(r => r.id === myRole.role)?.label}
            </span>
          )}
        </div>
        <Button onClick={() => { setForm({ email: '', password: '', name: '', role: 'operator' }); setCreateModal(true); }}>+ Crear Usuario</Button>
      </div>

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
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{role.label} — {role.desc}</div>
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

          {users.length === 0 && (
            <Card>
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)', fontSize: 13 }}>
                No hay usuarios con roles asignados. Tu cuenta es la primera — créate un rol de Admin.
                <div style={{ marginTop: 12 }}>
                  <Button size="sm" onClick={async () => {
                    try {
                      await db.userRoles.setRole(user.id, user.email, 'admin', 'Administrador');
                      showToast('Te asignaste como Administrador');
                      await loadUsers();
                    } catch (err) { showToast('Error: ' + err.message, 'error'); }
                  }}>👑 Asignarme como Admin</Button>
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

          {form.role && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-bg)', border: '1px solid rgba(108,114,255,0.15)', fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>
              {ROLES.find(r => r.id === form.role)?.icon} {ROLES.find(r => r.id === form.role)?.desc}
            </div>
          )}

          <ModalActions onCancel={() => setEditModal(null)} onConfirm={updateRole}
            confirmLabel={saving ? 'Guardando...' : 'Actualizar Rol'} confirmDisabled={saving} />
        </Modal>
      )}
    </div>
  );
}
