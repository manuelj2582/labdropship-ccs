import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const WHATSAPP_NUMBER = '584121234567'; // CAMBIAR por tu número real

export default function Catalog() {
  const { category: urlCategory } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(urlCategory || 'all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [hoveredProduct, setHoveredProduct] = useState(null);

  useEffect(() => {
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    const root = document.getElementById('root');
    if (root) { root.style.overflow = 'auto'; root.style.height = 'auto'; }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      if (root) { root.style.overflow = ''; root.style.height = ''; }
    };
  }, []);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (urlCategory) setActiveCategory(urlCategory); }, [urlCategory]);

  const loadData = async () => {
    try {
      const [{ data: prods }, { data: cats }, { data: pres }] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('presentations').select('*').order('formula_id'),
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
      setPresentations(pres || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const displayCategories = useMemo(() => [
    { slug: 'all', name: 'Todos', icon: '🧪', color: '#6C72FF' },
    ...categories,
  ], [categories]);

  const filtered = useMemo(() => {
    let result = products;
    if (activeCategory !== 'all') result = result.filter(p => p.category === activeCategory);
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [products, activeCategory, search]);

  const catCounts = useMemo(() => {
    const counts = { all: products.length };
    products.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [products]);

  const selectCategory = (slug) => {
    setActiveCategory(slug);
    navigate(slug === 'all' ? '/catalogo' : `/catalogo/${slug}`, { replace: true });
  };

  const whatsappOrder = (product, msg) => {
    const text = msg || `Hola VeneLab, estoy interesado en:\n\n*${product.name}*\nPrecio: $${Number(product.price).toFixed(2)}\n\n¿Cuál es el mínimo de pedido y disponibilidad?`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const whatsappBulk = (product) => {
    const pres = presentations.filter(p => p.formula_id === product.formula_id);
    let text = `Hola VeneLab, quiero hacer un pedido al mayor:\n\n*${product.name}*`;
    if (pres.length > 0) {
      text += `\n\nPresentaciones disponibles:`;
      pres.forEach(p => { text += `\n• ${p.name} (${p.amount}${p.unit}) - $${Number(p.sale_price).toFixed(2)}`; });
    }
    text += `\n\n¿Cuál es el mínimo y tiempo de entrega?`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050910', color: '#E8EDF5', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* ═══ HEADER ═══ */}
      <header style={{ position: 'relative', overflow: 'hidden', padding: '48px 0 40px', background: 'linear-gradient(180deg, #0C1222 0%, #050910 100%)' }}>
        <div style={{ position: 'absolute', top: -80, left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,114,255,0.08), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -40, right: '15%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.06), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #6C72FF, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧪</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>VeneLab</div>
                <div style={{ fontSize: 10, color: '#4F6289', fontFamily: "'JetBrains Mono', monospace" }}>CATÁLOGO MAYORISTA · CCS</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" style={{
                padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: '#25D366', color: '#fff', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>📱 WhatsApp</a>
            </div>
          </div>

          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 12, maxWidth: 600 }}>
            Productos al <span style={{ background: 'linear-gradient(135deg, #6C72FF, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mayor</span> para tu Negocio
          </h1>
          <p style={{ fontSize: 16, color: '#8B9DC3', maxWidth: 500, lineHeight: 1.6, marginBottom: 8 }}>
            Fabricados en Caracas. Producción bajo pedido. Precios al mayor para dropshippers y distribuidores.
          </p>
          <p style={{ fontSize: 13, color: '#4F6289', marginBottom: 32 }}>
            {products.length} productos · {categories.length} líneas de producto
          </p>

          <div style={{ position: 'relative', maxWidth: 440 }}>
            <input type="text" placeholder="Buscar productos..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '14px 20px 14px 48px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#E8EDF5', fontSize: 15, fontFamily: "'Outfit', sans-serif", outline: 'none', backdropFilter: 'blur(10px)' }} />
            <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 18, opacity: 0.4 }}>🔍</span>
          </div>
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 60px' }}>
        {/* Category pills */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 32, overflowX: 'auto', paddingBottom: 4 }}>
          {displayCategories.map(cat => {
            const active = activeCategory === cat.slug;
            return (
              <button key={cat.slug} onClick={() => selectCategory(cat.slug)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 50, border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: '0.2s', fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600,
                background: active ? `linear-gradient(135deg, ${cat.color || '#6C72FF'}, ${cat.color || '#6C72FF'}CC)` : 'rgba(255,255,255,0.04)',
                color: active ? '#fff' : '#8B9DC3',
                boxShadow: active ? `0 4px 20px ${cat.color || '#6C72FF'}40` : 'none',
              }}>
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                {cat.name}
                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)', fontFamily: "'JetBrains Mono', monospace" }}>{catCounts[cat.slug] || 0}</span>
              </button>
            );
          })}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 40, animation: 'pulse 1.5s infinite' }}>🧪</div>
          </div>
        )}

        {/* Products grid */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {filtered.map(product => {
              const cat = displayCategories.find(c => c.slug === product.category);
              const isHovered = hoveredProduct === product.id;
              const prodPres = presentations.filter(p => p.formula_id === product.formula_id);
              return (
                <div key={product.id}
                  onMouseEnter={() => setHoveredProduct(product.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                  style={{
                    background: isHovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isHovered ? 'rgba(108,114,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 16, position: 'relative', overflow: 'hidden',
                    transition: '0.25s ease', cursor: 'default',
                    transform: isHovered ? 'translateY(-4px)' : 'none',
                    boxShadow: isHovered ? '0 12px 40px rgba(0,0,0,0.3)' : 'none',
                  }}>
                  {/* Product image */}
                  <div style={{
                    height: 180,
                    background: product.image_url ? `url(${product.image_url}) center/cover` : `linear-gradient(135deg, ${cat?.color || '#6C72FF'}12, ${cat?.color || '#6C72FF'}06)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {!product.image_url && <span style={{ fontSize: 56, opacity: 0.12 }}>{cat?.icon || '📦'}</span>}
                  </div>

                  <div style={{ padding: 20 }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cat?.color || '#6C72FF', opacity: isHovered ? 1 : 0.4, transition: '0.25s' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${cat?.color}15`, color: cat?.color, border: `1px solid ${cat?.color}25` }}>
                      {cat?.icon} {cat?.name}
                    </span>
                    {product.stock > 0 && (
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'rgba(0,214,143,0.1)', color: '#00D68F', fontFamily: "'JetBrains Mono', monospace" }}>
                        {product.stock} en stock
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{product.name}</h3>

                  {/* Presentations badges */}
                  {prodPres.length > 1 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      {prodPres.map(p => (
                        <span key={p.id} style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                          fontFamily: "'JetBrains Mono', monospace", color: '#8B9DC3',
                        }}>{p.amount}{p.unit}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginTop: 4 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#4F6289', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', fontWeight: 600 }}>DESDE</div>
                      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #6C72FF, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ${Number(product.price).toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: '#4F6289' }}>por unidad al mayor</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button onClick={() => whatsappBulk(product)} style={{
                        padding: '10px 18px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff',
                        cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                        display: 'flex', alignItems: 'center', gap: 6, transition: '0.15s',
                        boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
                      }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <WaIcon /> Pedir
                      </button>
                      {prodPres.length > 0 && (
                        <button onClick={() => setSelectedProduct(product)} style={{
                          padding: '8px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.04)', color: '#8B9DC3',
                          cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
                        }}>Ver detalles</button>
                      )}
                    </div>
                  </div>
                  </div>{/* close padding wrapper */}
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📦</div>
            <div style={{ fontSize: 16, color: '#4F6289' }}>
              {search ? `No hay productos que coincidan con "${search}"` : 'No hay productos en esta categoría'}
            </div>
          </div>
        )}
      </main>

      {/* ═══ PRODUCT DETAIL MODAL ═══ */}
      {selectedProduct && (() => {
        const cat = displayCategories.find(c => c.slug === selectedProduct.category);
        const prodPres = presentations.filter(p => p.formula_id === selectedProduct.formula_id);
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(6px)' }}
            onClick={() => setSelectedProduct(null)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: '#0C1222', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
              padding: 32, width: 520, maxHeight: '85vh', overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${cat?.color}15`, color: cat?.color }}>{cat?.icon} {cat?.name}</span>
                  <h2 style={{ margin: '12px 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{selectedProduct.name}</h2>
                </div>
                <button onClick={() => setSelectedProduct(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#8B9DC3', cursor: 'pointer', width: 36, height: 36, borderRadius: 10, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {prodPres.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: '#4F6289', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>PRESENTACIONES DISPONIBLES</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {prodPres.map(p => (
                      <div key={p.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#4F6289', fontFamily: "'JetBrains Mono', monospace" }}>{p.amount}{p.unit} {p.sku && `· ${p.sku}`}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#6C72FF' }}>${Number(p.sale_price).toFixed(2)}</div>
                            <div style={{ fontSize: 10, color: '#4F6289' }}>por unidad</div>
                          </div>
                          <button onClick={() => {
                            const text = `Hola VeneLab, quiero pedir:\n\n*${p.name}* (${p.amount}${p.unit})\nPrecio: $${Number(p.sale_price).toFixed(2)}/ud\n\n¿Cuántas unidades tienen disponibles?`;
                            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
                          }} style={{
                            padding: '10px 16px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff',
                            cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}><WaIcon size={14} /> Pedir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => whatsappBulk(selectedProduct)} style={{
                width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                background: '#25D366', color: '#fff', cursor: 'pointer',
                fontSize: 15, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(37,211,102,0.3)',
              }}>
                <WaIcon /> Consultar pedido al mayor
              </button>
            </div>
          </div>
        );
      })()}

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6C72FF, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🧪</div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>VeneLab</span>
          </div>
          <p style={{ fontSize: 13, color: '#4F6289', marginBottom: 16, lineHeight: 1.6 }}>Laboratorio de productos para dropshipping · Caracas, Venezuela</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" style={{ padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#25D366', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>📱 WhatsApp</a>
            <a href="mailto:ventas@venelab.com" style={{ padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'rgba(108,114,255,0.1)', color: '#6C72FF', border: '1px solid rgba(108,114,255,0.2)', textDecoration: 'none' }}>✉️ Email</a>
          </div>
          <div style={{ marginTop: 24, fontSize: 11, color: '#2D3A54', fontFamily: "'JetBrains Mono', monospace" }}>© 2026 VeneLab · Todos los derechos reservados</div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @media (max-width: 768px) {
          header { padding: 32px 0 28px !important; }
          h1 { font-size: 26px !important; }
        }
      `}</style>
    </div>
  );
}

function WaIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
