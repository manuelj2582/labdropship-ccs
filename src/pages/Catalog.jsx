import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: '🧪', gradient: 'linear-gradient(135deg, #6C72FF, #A78BFA)' },
  { id: 'serum', name: 'Serums & Skincare', icon: '💧', gradient: 'linear-gradient(135deg, #A78BFA, #C4B5FD)', color: '#A78BFA' },
  { id: 'auto', name: 'Automotriz', icon: '🚗', gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)', color: '#60A5FA' },
  { id: 'mascotas', name: 'Mascotas', icon: '🐾', gradient: 'linear-gradient(135deg, #059669, #34D399)', color: '#34D399' },
  { id: 'hogar', name: 'Limpieza & Hogar', icon: '🏠', gradient: 'linear-gradient(135deg, #D97706, #FBBF24)', color: '#FBBF24' },
];

const WHATSAPP_NUMBER = '584121234567'; // CAMBIAR por tu número real

export default function Catalog() {
  const { category: urlCategory } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(urlCategory || 'all');
  const [search, setSearch] = useState('');
  const [hoveredProduct, setHoveredProduct] = useState(null);

  useEffect(() => {
    // Override global overflow:hidden for catalog page
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    document.getElementById('root').style.overflow = 'auto';
    document.getElementById('root').style.height = 'auto';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.getElementById('root').style.overflow = '';
      document.getElementById('root').style.height = '';
    };
  }, []);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (urlCategory) setActiveCategory(urlCategory);
  }, [urlCategory]);

  const loadProducts = async () => {
    try {
      const [{ data: prods }, { data: forms }] = await Promise.all([
        supabase.from('products').select('*').gt('stock', 0).order('name'),
        supabase.from('formulas').select('*, ingredients:formula_ingredients(id, material_id, amount)'),
      ]);
      setProducts(prods || []);
      setFormulas(forms || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

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

  const selectCategory = (id) => {
    setActiveCategory(id);
    navigate(id === 'all' ? '/catalogo' : `/catalogo/${id}`, { replace: true });
  };

  const whatsappOrder = (product) => {
    const msg = `Hola, estoy interesado en el producto: *${product.name}*\nPrecio al mayor: $${product.price}\nStock disponible: ${product.stock} unidades\n\n¿Cuál es el mínimo de pedido?`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const stockLevel = (stock) => {
    if (stock > 200) return { label: 'Disponible', color: '#00D68F', bg: 'rgba(0,214,143,0.1)' };
    if (stock > 50) return { label: 'Stock medio', color: '#FFB547', bg: 'rgba(255,181,71,0.1)' };
    return { label: 'Últimas unidades', color: '#FF5A65', bg: 'rgba(255,90,101,0.1)' };
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050910', color: '#E8EDF5', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      {/* Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Hero Header */}
      <header style={{
        position: 'relative', overflow: 'hidden', padding: '48px 0 40px',
        background: 'linear-gradient(180deg, #0C1222 0%, #050910 100%)',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -80, left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,114,255,0.08), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -40, right: '15%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.06), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          {/* Nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'linear-gradient(135deg, #6C72FF, #A78BFA)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>🧪</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>VeneLab</div>
                <div style={{ fontSize: 10, color: '#4F6289', fontFamily: "'JetBrains Mono', monospace" }}>CATÁLOGO MAYORISTA · CCS</div>
              </div>
            </div>
            <a href="/" style={{
              padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'rgba(108,114,255,0.1)', color: '#6C72FF',
              border: '1px solid rgba(108,114,255,0.2)', textDecoration: 'none',
              transition: '0.15s', fontFamily: "'Outfit', sans-serif",
            }}>
              Acceso Interno →
            </a>
          </div>

          {/* Hero text */}
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.1,
            letterSpacing: '-0.04em', marginBottom: 12, maxWidth: 650,
          }}>
            Productos al <span style={{ background: 'linear-gradient(135deg, #6C72FF, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mayor</span> para Dropshipping
          </h1>
          <p style={{ fontSize: 16, color: '#8B9DC3', maxWidth: 500, lineHeight: 1.6, marginBottom: 32 }}>
            Skincare, automotriz, mascotas y hogar. Fabricados en Caracas, listos para tu tienda online.
          </p>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 440 }}>
            <input
              type="text" placeholder="Buscar productos..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '14px 20px 14px 48px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, color: '#E8EDF5', fontSize: 15,
                fontFamily: "'Outfit', sans-serif", outline: 'none',
                backdropFilter: 'blur(10px)',
              }}
            />
            <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 18, opacity: 0.4 }}>🔍</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 60px' }}>
        {/* Category Pills */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 32, overflowX: 'auto',
          paddingBottom: 4, scrollbarWidth: 'none',
        }}>
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id;
            const count = catCounts[cat.id] || 0;
            return (
              <button key={cat.id} onClick={() => selectCategory(cat.id)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 50, border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: '0.2s',
                fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600,
                background: active ? cat.gradient : 'rgba(255,255,255,0.04)',
                color: active ? '#fff' : '#8B9DC3',
                boxShadow: active ? '0 4px 20px rgba(108,114,255,0.3)' : 'none',
              }}>
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                {cat.name}
                <span style={{
                  padding: '2px 8px', borderRadius: 20, fontSize: 11,
                  background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 40, animation: 'pulse 1.5s infinite' }}>🧪</div>
            <div style={{ color: '#4F6289', marginTop: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>Cargando catálogo...</div>
          </div>
        )}

        {/* Products Grid */}
        {!loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 18,
          }}>
            {filtered.map(product => {
              const cat = CATEGORIES.find(c => c.id === product.category);
              const stock = stockLevel(product.stock);
              const isHovered = hoveredProduct === product.id;
              return (
                <div
                  key={product.id}
                  onMouseEnter={() => setHoveredProduct(product.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                  style={{
                    background: isHovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isHovered ? 'rgba(108,114,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 16, padding: 24, position: 'relative', overflow: 'hidden',
                    transition: '0.25s ease', cursor: 'default',
                    transform: isHovered ? 'translateY(-4px)' : 'none',
                    boxShadow: isHovered ? '0 12px 40px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  {/* Category accent line */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: cat?.gradient || 'var(--accent)',
                    opacity: isHovered ? 1 : 0.4, transition: '0.25s',
                  }} />

                  {/* Background icon */}
                  <div style={{
                    position: 'absolute', bottom: -15, right: -10, fontSize: 80,
                    opacity: 0.03, pointerEvents: 'none',
                  }}>{cat?.icon}</div>

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: `${cat?.color}15`, color: cat?.color,
                      border: `1px solid ${cat?.color}25`,
                    }}>{cat?.icon} {cat?.name}</span>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                      background: stock.bg, color: stock.color,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{stock.label}</span>
                  </div>

                  {/* Name */}
                  <h3 style={{
                    fontSize: 18, fontWeight: 700, marginBottom: 6,
                    letterSpacing: '-0.02em', lineHeight: 1.3,
                  }}>{product.name}</h3>

                  {/* Stock */}
                  <div style={{
                    fontSize: 12, color: '#4F6289', marginBottom: 20,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {product.stock.toLocaleString()} unidades disponibles
                  </div>

                  {/* Price + CTA */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                    borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16,
                  }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#4F6289', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', fontWeight: 600 }}>
                        PRECIO MAYOR
                      </div>
                      <div style={{
                        fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em',
                        background: 'linear-gradient(135deg, #6C72FF, #A78BFA)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      }}>
                        ${Number(product.price).toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: '#4F6289' }}>por unidad</div>
                    </div>
                    <button
                      onClick={() => whatsappOrder(product)}
                      style={{
                        padding: '12px 20px', borderRadius: 10, border: 'none',
                        background: '#25D366', color: '#fff', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                        display: 'flex', alignItems: 'center', gap: 8,
                        transition: '0.15s', boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Pedir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📦</div>
            <div style={{ fontSize: 16, color: '#4F6289' }}>
              {search ? `No hay productos que coincidan con "${search}"` : 'No hay productos disponibles en esta categoría'}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 24px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #6C72FF, #A78BFA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>🧪</div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>VeneLab</span>
          </div>
          <p style={{ fontSize: 13, color: '#4F6289', marginBottom: 16, lineHeight: 1.6 }}>
            Laboratorio de productos para dropshipping · Caracas, Venezuela
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" style={{
              padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: '#25D366', color: '#fff', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              📱 WhatsApp
            </a>
            <a href="mailto:ventas@venelab.com" style={{
              padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'rgba(108,114,255,0.1)', color: '#6C72FF',
              border: '1px solid rgba(108,114,255,0.2)', textDecoration: 'none',
            }}>
              ✉️ Email
            </a>
          </div>
          <div style={{ marginTop: 24, fontSize: 11, color: '#2D3A54', fontFamily: "'JetBrains Mono', monospace" }}>
            © 2026 VeneLab · Todos los derechos reservados
          </div>
        </div>
      </footer>

      {/* Global catalog styles */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @media (max-width: 768px) {
          header { padding: 32px 0 28px !important; }
          h1 { font-size: 28px !important; }
        }
      `}</style>
    </div>
  );
}
