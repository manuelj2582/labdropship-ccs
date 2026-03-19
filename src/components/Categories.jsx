import React, { useState } from 'react';
import { Card, Button, Modal, ModalActions, Input } from './UI';
import * as db from '../lib/db';

const ICON_OPTIONS = ['💧','🚗','🐾','🏠','✨','🧴','🧹','🌿','🔧','💊','🧪','🎨','👶','🏋️','🍳','📱','💅','🪥','🧽','🫧','🕯️','🧼'];
const COLOR_OPTIONS = ['#A78BFA','#60A5FA','#34D399','#FBBF24','#F472B6','#FB923C','#38BDF8','#4ADE80','#C084FC','#F87171','#2DD4BF','#A3E635','#E879F9','#818CF8'];

export default function Categories({ data, loadData, showToast, user, searchQuery }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ slug: '', name: '', icon: '📦', color: '#6C72FF', sort_order: 0 });

  const openAdd = () => {
    const nextOrder = (data.categories || []).length + 1;
    setForm({ slug: '', name: '', icon: '📦', color: '#6C72FF', sort_order: nextOrder });
    setEditId(null);
    setModal(true);
  };

  const openEdit = (cat) => {
    setForm({ slug: cat.slug, name: cat.name, icon: cat.icon, color: cat.color, sort_order: cat.sort_order });
    setEditId(cat.id);
    setModal(true);
  };

  const generateSlug = (name) => {
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug || generateSlug(form.name),
      };
      if (editId) {
        await db.categories.update(editId, payload, user);
        showToast('Categoría actualizada');
      } else {
        await db.categories.create(payload, user);
        showToast('Categoría creada');
      }
      await loadData();
      setModal(false);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (cat) => {
    const productsInCat = data.products.filter(p => p.category === cat.slug).length;
    if (productsInCat > 0) {
      showToast(`No se puede eliminar: hay ${productsInCat} producto(s) en esta categoría`, 'error');
      return;
    }
    try {
      await db.categories.delete(cat.id, cat.name, user);
      await loadData();
      showToast('Categoría eliminada');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  let cats = data.categories || [];
  if (searchQuery) cats = cats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.slug.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {cats.length} categorías de productos
        </span>
        <Button onClick={openAdd}>+ Nueva Categoría</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {cats.map(cat => {
          const productCount = data.products.filter(p => p.category === cat.slug).length;
          const formulaCount = data.formulas.filter(f => f.category === cat.slug).length;
          return (
            <Card key={cat.id} style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Color accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: cat.color }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--radius-md)',
                    background: `${cat.color}18`, border: `1px solid ${cat.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                  }}>{cat.icon}</div>
                  <div>
                    <h4 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700 }}>{cat.name}</h4>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      slug: {cat.slug}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>✎</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(cat)}>✕</Button>
                </div>
              </div>

              <div style={{
                marginTop: 16, display: 'flex', gap: 16,
                borderTop: '1px solid var(--border)', paddingTop: 12,
              }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: cat.color }}>{productCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Productos</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-secondary)' }}>{formulaCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Fórmulas</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: cat.color,
                    margin: '0 auto 4px', border: '2px solid var(--border)',
                  }} />
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Color</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={editId ? 'Editar Categoría' : 'Nueva Categoría'} onClose={() => setModal(false)}>
          <Input label="Nombre" value={form.name} onChange={v => {
            setForm({ ...form, name: v, slug: editId ? form.slug : generateSlug(v) });
          }} placeholder="Ej: Cuidado Capilar" />

          <Input label="Slug (identificador único)" value={form.slug} onChange={v => setForm({ ...form, slug: v })}
            placeholder="cuidado_capilar" />

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Ícono</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ICON_OPTIONS.map(icon => (
                <button key={icon} onClick={() => setForm({ ...form, icon })} style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  border: form.icon === icon ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: form.icon === icon ? 'var(--accent-bg-strong)' : 'var(--bg-input)',
                  cursor: 'pointer', fontSize: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{icon}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COLOR_OPTIONS.map(color => (
                <button key={color} onClick={() => setForm({ ...form, color })} style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: color, cursor: 'pointer',
                  border: form.color === color ? '3px solid var(--text-primary)' : '2px solid var(--border)',
                  boxShadow: form.color === color ? `0 0 0 2px var(--bg-secondary), 0 0 12px ${color}60` : 'none',
                  transition: 'var(--transition)',
                }} />
              ))}
            </div>
            {/* Preview */}
            <div style={{
              marginTop: 10, padding: '8px 14px', borderRadius: 'var(--radius-md)',
              background: `${form.color}15`, border: `1px solid ${form.color}30`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>{form.icon}</span>
              <span style={{ fontWeight: 600, color: form.color }}>{form.name || 'Vista previa'}</span>
            </div>
          </div>

          <Input label="Orden" type="number" value={form.sort_order} onChange={v => setForm({ ...form, sort_order: +v })} min="0" />

          <ModalActions onCancel={() => setModal(false)} onConfirm={save}
            confirmLabel={saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}
            confirmDisabled={saving} />
        </Modal>
      )}
    </div>
  );
}
