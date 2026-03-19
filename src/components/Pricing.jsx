import React, { useState, useMemo } from 'react';
import { Card, Button, Modal, ModalActions, Input, Select } from './UI';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function Pricing({ data, loadData, showToast, searchQuery, user }) {
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', price: 0, unit_amount: 1, unit: 'g', notes: '' });

  const prices = data.supplierPrices || [];

  // Group prices by material
  const pricesByMaterial = useMemo(() => {
    const grouped = {};
    prices.forEach(p => {
      if (!grouped[p.material_id]) grouped[p.material_id] = [];
      grouped[p.material_id].push(p);
    });
    // Sort each group by cost_per_unit
    Object.keys(grouped).forEach(k => {
      grouped[k].sort((a, b) => a.cost_per_unit - b.cost_per_unit);
    });
    return grouped;
  }, [prices]);

  // Materials with price info
  const materialsWithPrices = useMemo(() => {
    return data.rawMaterials.map(m => {
      const matPrices = pricesByMaterial[m.id] || [];
      const cheapest = matPrices[0] || null;
      return { ...m, prices: matPrices, cheapest };
    });
  }, [data.rawMaterials, pricesByMaterial]);

  let filtered = materialsWithPrices;
  if (searchQuery) filtered = filtered.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const openAddPrice = (materialId) => {
    const mat = data.rawMaterials.find(m => m.id === materialId);
    setForm({ supplier_id: '', price: 0, unit_amount: 1, unit: mat?.unit || 'g', notes: '' });
    setSelectedMaterial(materialId);
    setAddModal(true);
  };

  const savePrice = async () => {
    if (!form.supplier_id || !form.price) return;
    setSaving(true);
    try {
      await db.supplierPrices.upsert({
        material_id: selectedMaterial,
        supplier_id: form.supplier_id,
        price: +form.price,
        unit_amount: +form.unit_amount || 1,
        unit: form.unit,
        notes: form.notes,
      }, user);
      await loadData();
      showToast('Cotización guardada');
      setAddModal(false);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const removePrice = async (id) => {
    try {
      await db.supplierPrices.delete(id, user);
      await loadData();
      showToast('Cotización eliminada');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const whatsappSupplier = (supplier, material, price) => {
    const phone = supplier.whatsapp || supplier.contact?.replace(/[^0-9]/g, '') || '';
    if (!phone) { showToast('Este proveedor no tiene WhatsApp registrado', 'error'); return; }
    const mat = data.rawMaterials.find(m => m.id === material);
    const text = `Hola ${supplier.name}, soy de VeneLab.\n\nQuiero cotizar/comprar:\n*${mat?.name || 'Material'}*\n\nÚltimo precio: $${Number(price.price).toFixed(2)} por ${price.unit_amount}${price.unit}\n\n¿Tienen disponibilidad? ¿Cuál es el precio actual?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Use best price to update material cost
  const useBestPrice = async (material) => {
    if (!material.cheapest) return;
    try {
      await db.rawMaterials.update(material.id, { cost: material.cheapest.cost_per_unit, supplier_id: material.cheapest.supplier_id }, user);
      await loadData();
      showToast(`Costo de "${material.name}" actualizado a ${fmt(material.cheapest.cost_per_unit)}/${material.unit}`);
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Compara precios de proveedores para cada material · {prices.length} cotizaciones registradas
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map(m => {
          const hasPrices = m.prices.length > 0;
          const cheapest = m.cheapest;
          const isUsingCheapest = cheapest && Math.abs(m.cost - cheapest.cost_per_unit) < 0.0001;

          return (
            <Card key={m.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: m.material_type === 'envase' ? 'rgba(96,165,250,0.1)' : m.material_type === 'etiqueta' ? 'rgba(251,191,36,0.1)' : 'rgba(167,139,250,0.1)',
                      color: m.material_type === 'envase' ? '#60A5FA' : m.material_type === 'etiqueta' ? '#FBBF24' : '#A78BFA',
                      fontFamily: 'var(--font-mono)',
                    }}>{m.material_type === 'envase' ? '🫙' : m.material_type === 'etiqueta' ? '🏷️' : '🧪'} {m.material_type || 'materia_prima'}</span>
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0' }}>{m.name}</h4>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    Costo actual: <strong style={{ color: 'var(--warning)' }}>{fmt(m.cost)}</strong> / {m.unit}
                    {m.supplier?.name && <span> · Proveedor: {m.supplier.name}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openAddPrice(m.id)}>+ Cotización</Button>
              </div>

              {/* Price comparison table */}
              {hasPrices && (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
                    COTIZACIONES ({m.prices.length} proveedores)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {m.prices.map((p, i) => {
                      const isCheapest = i === 0 && m.prices.length > 1;
                      return (
                        <div key={p.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 14px', borderRadius: 'var(--radius-md)',
                          background: isCheapest ? 'var(--success-bg)' : 'var(--bg-input)',
                          border: `1px solid ${isCheapest ? 'rgba(0,214,143,0.2)' : 'var(--border)'}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {isCheapest && <span style={{ fontSize: 14 }}>🏆</span>}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.supplier?.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                ${Number(p.price).toFixed(2)} por {p.unit_amount}{p.unit}
                                {p.notes && <span style={{ marginLeft: 6, fontStyle: 'italic' }}>· {p.notes}</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{
                                fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)',
                                color: isCheapest ? 'var(--success)' : 'var(--text-primary)',
                              }}>
                                {fmt(p.cost_per_unit)}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>por {m.unit}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => whatsappSupplier(p.supplier, m.id, p)} title="Comprar por WhatsApp" style={{
                                width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                                background: '#25D366', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              </button>
                              <button onClick={() => removePrice(p.id)} title="Eliminar cotización" style={{
                                width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                                background: 'var(--danger-bg)', border: '1px solid rgba(255,90,101,0.2)',
                                color: 'var(--danger)', cursor: 'pointer', fontSize: 14,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>✕</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Use best price button */}
                  {cheapest && !isUsingCheapest && (
                    <button onClick={() => useBestPrice(m)} style={{
                      marginTop: 10, width: '100%', padding: '10px 0',
                      borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,214,143,0.3)',
                      background: 'var(--success-bg)', color: 'var(--success)',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                    }}>
                      ✓ Usar mejor precio: {fmt(cheapest.cost_per_unit)}/{m.unit} de {cheapest.supplier?.name}
                    </button>
                  )}
                  {isUsingCheapest && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)', textAlign: 'center' }}>
                      ✓ Ya estás usando el mejor precio
                    </div>
                  )}
                </div>
              )}

              {!hasPrices && (
                <div style={{ marginTop: 12, padding: '12px 0', fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                  Sin cotizaciones — agrega precios de proveedores para comparar
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Price Modal */}
      {addModal && (() => {
        const mat = data.rawMaterials.find(m => m.id === selectedMaterial);
        const existingSuppliers = (pricesByMaterial[selectedMaterial] || []).map(p => p.supplier_id);
        const availableSuppliers = data.suppliers.filter(s => !existingSuppliers.includes(s.id));
        const costPerUnit = form.unit_amount > 0 ? form.price / form.unit_amount : 0;

        // Conversion to material base unit
        const conversionMap = { 'L_ml': 1000, 'ml_L': 0.001, 'kg_g': 1000, 'g_kg': 0.001 };
        const convKey = `${form.unit}_${mat?.unit}`;
        const factor = conversionMap[convKey] || 1;
        const costPerBaseUnit = form.unit_amount > 0 ? form.price / (form.unit_amount * factor) : 0;

        return (
          <Modal title={`Cotización: ${mat?.name}`} onClose={() => setAddModal(false)}>
            <Select label="Proveedor" value={form.supplier_id}
              options={[
                ...availableSuppliers.map(s => ({ value: s.id, label: s.name })),
                ...data.suppliers.filter(s => existingSuppliers.includes(s.id)).map(s => ({ value: s.id, label: `${s.name} (actualizar)` })),
              ]}
              onChange={v => setForm({ ...form, supplier_id: v })} placeholder="Seleccionar proveedor..." />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Input label="Precio ($)" type="number" value={form.price} onChange={v => setForm({ ...form, price: +v })} step="0.01" placeholder="45.00" />
              <Input label="Cantidad" type="number" value={form.unit_amount} onChange={v => setForm({ ...form, unit_amount: +v })} step="0.01" placeholder="20" />
              <Select label="Unidad" value={form.unit} options={['ml', 'L', 'g', 'kg', 'oz', 'unidad']} onChange={v => setForm({ ...form, unit: v })} />
            </div>

            <Input label="Notas (opcional)" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Ej: precio del mes, mínimo 5 unidades, etc." />

            {/* Cost preview */}
            {form.price > 0 && form.unit_amount > 0 && (
              <div style={{
                padding: 14, borderRadius: 'var(--radius-sm)',
                background: 'var(--success-bg)', border: '1px solid rgba(0,214,143,0.2)',
                marginTop: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Precio por {form.unit}:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(costPerUnit)}</span>
                </div>
                {form.unit !== mat?.unit && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
                    <span style={{ color: 'var(--success)' }}>Costo por {mat?.unit}:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{fmt(costPerBaseUnit)}</span>
                  </div>
                )}
                {form.unit === mat?.unit && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
                    <span style={{ color: 'var(--success)' }}>Costo por {mat?.unit}:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{fmt(costPerUnit)}</span>
                  </div>
                )}
              </div>
            )}

            <ModalActions onCancel={() => setAddModal(false)} onConfirm={savePrice}
              confirmLabel={saving ? 'Guardando...' : 'Guardar Cotización'} confirmDisabled={saving || !form.supplier_id} />
          </Modal>
        );
      })()}
    </div>
  );
}
