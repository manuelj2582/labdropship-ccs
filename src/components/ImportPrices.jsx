import React, { useState, useMemo, useCallback } from 'react';
import { Card, Button, Modal, ModalActions, Select, Input } from './UI';
import * as XLSX from 'xlsx';
import * as db from '../lib/db';
import { fmt } from '../utils';

export default function ImportPrices({ data, loadData, showToast, user }) {
  const [step, setStep] = useState('upload'); // upload, map_columns, match, review, done
  const [supplierId, setSupplierId] = useState('');
  const [rawRows, setRawRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [colMap, setColMap] = useState({ name: '', price: '', quantity: '', unit: '' });
  const [matches, setMatches] = useState([]); // { rowIdx, supplierName, price, qty, unit, materialId, autoMatch }
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState(null);

  const supplier = data.suppliers.find(s => s.id === supplierId);

  // ── Step 1: Upload file ──
  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (jsonData.length < 2) {
          showToast('El archivo no tiene suficientes filas', 'error');
          return;
        }

        // First row as headers
        const headers = jsonData[0].map(h => String(h || '').trim());
        const rows = jsonData.slice(1).filter(r => r.some(cell => cell != null && cell !== ''));

        setColumns(headers);
        setRawRows(rows);

        // Auto-detect columns
        const autoMap = { name: '', price: '', quantity: '', unit: '' };
        headers.forEach((h, i) => {
          const hl = h.toLowerCase();
          if (hl.includes('product') || hl.includes('nombre') || hl.includes('descripci') || hl.includes('material') || hl.includes('item') || hl.includes('articulo')) autoMap.name = String(i);
          if (hl.includes('precio') || hl.includes('price') || hl.includes('costo') || hl.includes('cost') || hl.includes('pvp') || hl.includes('monto')) autoMap.price = String(i);
          if (hl.includes('cantidad') || hl.includes('qty') || hl.includes('quantity') || hl.includes('contenido') || hl.includes('volumen') || hl.includes('peso')) autoMap.quantity = String(i);
          if (hl.includes('unidad') || hl.includes('unit') || hl.includes('medida') || hl.includes('presentacion')) autoMap.unit = String(i);
        });
        setColMap(autoMap);
        setStep('map_columns');
      } catch (err) {
        showToast('Error leyendo archivo: ' + err.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
  }, [showToast]);

  // ── Step 2: After column mapping, build match list ──
  const buildMatches = () => {
    const nameIdx = colMap.name !== '' ? parseInt(colMap.name) : -1;
    const priceIdx = colMap.price !== '' ? parseInt(colMap.price) : -1;
    const qtyIdx = colMap.quantity !== '' ? parseInt(colMap.quantity) : -1;
    const unitIdx = colMap.unit !== '' ? parseInt(colMap.unit) : -1;

    if (nameIdx < 0 || priceIdx < 0) {
      showToast('Debes mapear al menos Nombre y Precio', 'error');
      return;
    }

    const matchList = rawRows.map((row, rowIdx) => {
      const supplierName = String(row[nameIdx] || '').trim();
      const price = parseFloat(row[priceIdx]) || 0;
      const qty = qtyIdx >= 0 ? (parseFloat(row[qtyIdx]) || 1) : 1;
      const unit = unitIdx >= 0 ? String(row[unitIdx] || '').trim().toLowerCase() : '';

      if (!supplierName || !price) return null;

      // Auto-match: find best matching material
      const nameLower = supplierName.toLowerCase();
      let bestMatch = null;
      let bestScore = 0;

      data.rawMaterials.forEach(m => {
        const matLower = m.name.toLowerCase();
        // Check various matching strategies
        let score = 0;
        if (matLower === nameLower) score = 100;
        else if (matLower.includes(nameLower) || nameLower.includes(matLower)) score = 70;
        else {
          // Word overlap
          const matWords = matLower.split(/\s+/);
          const supWords = nameLower.split(/\s+/);
          const common = matWords.filter(w => supWords.some(sw => sw.includes(w) || w.includes(sw)));
          if (common.length > 0) score = (common.length / Math.max(matWords.length, supWords.length)) * 60;
        }
        if (score > bestScore) { bestScore = score; bestMatch = m; }
      });

      return {
        rowIdx, supplierName, price, qty, unit: unit || bestMatch?.unit || 'g',
        materialId: bestScore >= 50 ? bestMatch?.id : '',
        autoMatch: bestScore >= 50,
        matchScore: bestScore,
        matchName: bestMatch?.name || '',
      };
    }).filter(Boolean);

    setMatches(matchList);
    setStep('match');
  };

  // ── Step 3: Save matches ──
  const saveMatches = async () => {
    const toSave = matches.filter(m => m.materialId);
    if (toSave.length === 0) {
      showToast('No hay items con match para guardar', 'error');
      return;
    }

    setSaving(true);
    let saved = 0, errors = 0;

    for (const m of toSave) {
      try {
        await db.supplierPrices.upsert({
          material_id: m.materialId,
          supplier_id: supplierId,
          price: m.price,
          unit_amount: m.qty,
          unit: m.unit,
          notes: `Importado: "${m.supplierName}"`,
        }, user);
        saved++;
      } catch (err) {
        errors++;
        console.error('Error saving price:', err);
      }
    }

    await loadData();
    setResults({ saved, errors, skipped: matches.length - toSave.length });
    setStep('done');
    setSaving(false);
  };

  const reset = () => {
    setStep('upload');
    setRawRows([]);
    setColumns([]);
    setMatches([]);
    setResults(null);
    setSupplierId('');
  };

  const matchedCount = matches.filter(m => m.materialId).length;

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Importa listas de precios de proveedores desde Excel o CSV y haz match con tu inventario
        </span>
      </div>

      {/* ═══ STEP 1: Upload ═══ */}
      {step === 'upload' && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Importar Lista de Precios</h3>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
              Sube un archivo Excel (.xlsx) o CSV con la lista de precios de un proveedor. El sistema detectará las columnas automáticamente.
            </p>

            <Select label="Proveedor" value={supplierId}
              options={data.suppliers.map(s => ({ value: s.id, label: s.name }))}
              onChange={setSupplierId} placeholder="Seleccionar proveedor..." />

            {supplierId && (
              <div style={{ marginTop: 16 }}>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '14px 28px', borderRadius: 'var(--radius-md)',
                  background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600,
                }}>
                  📁 Seleccionar Archivo
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
                </label>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>Excel (.xlsx, .xls) o CSV</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ═══ STEP 2: Map Columns ═══ */}
      {step === 'map_columns' && (
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Mapear Columnas</h3>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
            {rawRows.length} filas encontradas. Indica qué columna corresponde a cada campo:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Select label="Columna de Nombre del Producto *" value={colMap.name}
              options={columns.map((c, i) => ({ value: String(i), label: `${c} (col ${i + 1})` }))}
              onChange={v => setColMap({ ...colMap, name: v })} placeholder="Seleccionar..." />
            <Select label="Columna de Precio *" value={colMap.price}
              options={columns.map((c, i) => ({ value: String(i), label: `${c} (col ${i + 1})` }))}
              onChange={v => setColMap({ ...colMap, price: v })} placeholder="Seleccionar..." />
            <Select label="Columna de Cantidad (opcional)" value={colMap.quantity}
              options={[{ value: '', label: 'No aplica (default: 1)' }, ...columns.map((c, i) => ({ value: String(i), label: `${c} (col ${i + 1})` }))]}
              onChange={v => setColMap({ ...colMap, quantity: v })} />
            <Select label="Columna de Unidad (opcional)" value={colMap.unit}
              options={[{ value: '', label: 'No aplica' }, ...columns.map((c, i) => ({ value: String(i), label: `${c} (col ${i + 1})` }))]}
              onChange={v => setColMap({ ...colMap, unit: v })} />
          </div>

          {/* Preview */}
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 6 }}>VISTA PREVIA (primeras 5 filas)</div>
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>{columns.map((c, i) => <th key={i} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)', fontSize: 10 }}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 5).map((row, i) => (
                  <tr key={i}>{columns.map((_, ci) => <td key={ci} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{row[ci] ?? ''}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="muted" onClick={reset}>← Volver</Button>
            <Button onClick={buildMatches}>Continuar →</Button>
          </div>
        </Card>
      )}

      {/* ═══ STEP 3: Match ═══ */}
      {step === 'match' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Hacer Match con Inventario</h3>
              <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {matches.length} productos del proveedor · {matchedCount} con match automático · Proveedor: <strong style={{ color: 'var(--accent)' }}>{supplier?.name}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="muted" onClick={() => setStep('map_columns')}>← Volver</Button>
              <Button variant="success" onClick={saveMatches} disabled={saving || matchedCount === 0}>
                {saving ? 'Guardando...' : `Importar ${matchedCount} cotizaciones`}
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matches.map((m, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '2fr auto 2fr auto',
                gap: 12, alignItems: 'center', padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: m.materialId ? 'var(--success-bg)' : 'var(--bg-input)',
                border: `1px solid ${m.materialId ? 'rgba(0,214,143,0.15)' : 'var(--border)'}`,
              }}>
                {/* Supplier item */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.supplierName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    ${Number(m.price).toFixed(2)} por {m.qty}{m.unit}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ fontSize: 18, color: m.materialId ? 'var(--success)' : 'var(--text-dim)' }}>
                  {m.materialId ? '✓' : '→'}
                </div>

                {/* Match selector */}
                <Select value={m.materialId}
                  options={data.rawMaterials.map(mat => ({
                    value: mat.id,
                    label: `${mat.material_type === 'envase' ? '🫙' : mat.material_type === 'etiqueta' ? '🏷️' : '🧪'} ${mat.name} (${mat.unit})`,
                  }))}
                  onChange={v => {
                    const updated = [...matches];
                    updated[i] = { ...updated[i], materialId: v };
                    setMatches(updated);
                  }}
                  placeholder="— Sin match —"
                />

                {/* Cost preview */}
                <div style={{ textAlign: 'right', minWidth: 80 }}>
                  {m.materialId && (() => {
                    const mat = data.rawMaterials.find(rm => rm.id === m.materialId);
                    const conversionMap = { 'L_ml': 1000, 'ml_L': 0.001, 'kg_g': 1000, 'g_kg': 0.001 };
                    const factor = conversionMap[`${m.unit}_${mat?.unit}`] || 1;
                    const costPerUnit = m.qty > 0 ? m.price / (m.qty * factor) : 0;
                    return (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{fmt(costPerUnit)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>/{mat?.unit}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ═══ STEP 4: Done ═══ */}
      {step === 'done' && results && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Importación Completada</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)' }}>{results.saved}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Guardadas</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-dim)' }}>{results.skipped}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Sin match</div>
              </div>
              {results.errors > 0 && (
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--danger)' }}>{results.errors}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Errores</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Button onClick={reset}>Importar otra lista</Button>
              <Button variant="muted" onClick={() => { /* navigate to pricing */ }}>Ver Cotizador</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
