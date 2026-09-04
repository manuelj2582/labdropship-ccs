import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import '../styles/landing.css';

const WHATSAPP = '584246528973';
const wa = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
const WA_DEFAULT = 'Hola VeneLab, quiero información para vender sus productos.';

// Testimonios reales de clientes. Vacío = la sección no se muestra. Formato: { quote, name, handle, role }
const TESTIMONIALS = [];

const LINES = [
  { slug: 'salud_y_belleza', name: 'Salud y Belleza', blurb: 'Cremas, aceites, elixires, cuidado bucal, íntimo y corporal.' },
  { slug: 'serum', name: 'Skincare', blurb: 'Serums, tónicos, agua micelar, cremas faciales.' },
  { slug: 'auto', name: 'Automotriz', blurb: 'Ceras, restauradores, shampoo, cerámico, cauchos.' },
  { slug: 'hogar', name: 'Hogar y Limpieza', blurb: 'Quita moho, desengrasante, suavizante, plantas.' },
  { slug: 'mascotas', name: 'Mascotas', blurb: 'Shampoo, perfume, spray bucal, eliminador de olores.' },
  { slug: 'perfume', name: 'Perfume', blurb: 'Fragancias con feromonas y splashes.' },
];

const WaIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c1.7.7 2.3.8 3.1.7a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z"/></svg>
);

export default function Landing() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    document.title = 'VeneLab · Fabricado en Venezuela para vender online';
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    const root = document.getElementById('root');
    if (root) { root.style.overflow = 'auto'; root.style.height = 'auto'; }
    supabase.from('products').select('id,name,category,image_url').order('name')
      .then(({ data }) => setProducts((data || []).filter(p => p.image_url)));
  }, []);

  const byLine = useMemo(() => {
    const m = {};
    for (const p of products) (m[p.category] ||= []).push(p);
    return m;
  }, [products]);

  // Marquee: mezcla de todas las líneas para que se vea la variedad real
  const marquee = useMemo(() => {
    const out = [];
    const lists = LINES.map(l => byLine[l.slug] || []);
    for (let i = 0; i < 6; i++) for (const list of lists) if (list[i]) out.push(list[i]);
    return out.slice(0, 22);
  }, [byLine]);

  const total = products.length;
  const vextaCount = products.length;
  const brandPhotos = useMemo(() => {
    const picks = [];
    for (const l of LINES) { const it = (byLine[l.slug] || [])[0]; if (it) picks.push(it); }
    return picks.slice(0, 5);
  }, [byLine]);

  return (
    <div className="vl">
      <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800&family=Archivo:wght@400;500;600&display=swap" rel="stylesheet" />

      <header className="vl-nav">
        <div className="wrap">
          <a href="/" aria-label="VeneLab, inicio"><img src="/venelab-logo.png" alt="VeneLab — Fabricado en Venezuela" /></a>
          <nav aria-label="Secciones">
            <a href="#lineas">Líneas</a>
            <a href="#como">Cómo funciona</a>
            <a href="#marca">Tu marca</a>
            <a href="/catalogo">Catálogo</a>
          </nav>
          <a className="btn btn-wa" href={wa(WA_DEFAULT)} target="_blank" rel="noreferrer"><WaIcon /> WhatsApp</a>
        </div>
      </header>

      <section className="vl-hero">
        <div className="wrap">
          <div>
            <h1 className="vl-reveal">Producto hecho en Venezuela <em>para vender online.</em></h1>
            <p className="lede vl-reveal">Fabricamos en Caracas seis líneas de producto y te las despachamos al mayor o pedido por pedido. Sin aduana, sin importar, sin comprar stock.</p>
            <div className="ctas vl-reveal">
              <a className="btn btn-wa" href={wa(WA_DEFAULT)} target="_blank" rel="noreferrer"><WaIcon /> Hablar por WhatsApp</a>
              <a className="btn btn-ghost" href="/catalogo">Ver el catálogo</a>
            </div>
            <p className="fine vl-reveal">{total > 0 ? `${total} productos con foto real · producción bajo pedido · Caracas` : 'Producción bajo pedido · Caracas'}</p>
          </div>
        </div>
        {marquee.length > 0 && (
          <div className="vl-marquee" aria-label="Productos VeneLab">
            <div className="track">
              {[...marquee, ...marquee].map((p, i) => (
                <figure key={p.id + i} aria-hidden={i >= marquee.length}>
                  <div className="ph"><img src={p.image_url} alt={i < marquee.length ? p.name : ''} loading="lazy" /></div>
                  <figcaption>{p.name}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="vl-band">
        <div className="wrap">
          <h2>Sin aduana. Sin importar. Sin comprar stock.</h2>
          <div className="grid">
            <div><strong>Producto local</strong><p>Se fabrica aquí. Lo que pides hoy no viaja 45 días en un contenedor ni pasa por aduana.</p></div>
            <div><strong>Reposición en días</strong><p>Cuando se te acaba, producimos otro lote. Tu capital no se queda dormido en un depósito.</p></div>
            <div><strong>Despacho por unidad</strong><p>Si vendes sin stock, tú cierras la venta y nosotros despachamos ese pedido contra entrega.</p></div>
          </div>
        </div>
      </section>

      <section className="vl-sec" id="lineas">
        <div className="wrap">
          <h2>Seis líneas, un solo proveedor.</h2>
          <p className="sub">Todo lo que ves está fabricado por nosotros. Toca una línea para ver los productos; el precio al mayor te lo pasamos por WhatsApp.</p>
          <div className="vl-lines">
            {LINES.map(l => {
              const items = byLine[l.slug] || [];
              return (
                <a className="vl-line" key={l.slug} href={`/catalogo/${l.slug}`}>
                  <div>
                    <div className="name">{l.name}</div>
                    <div className="count">{items.length > 0 ? `${items.length} productos · ${l.blurb}` : l.blurb}</div>
                  </div>
                  <div className="strip" aria-hidden="true">
                    {items.slice(0, 5).map(p => <span key={p.id}><img src={p.image_url} alt="" loading="lazy" /></span>)}
                  </div>
                  <div className="go">Ver línea →</div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="vl-sec" id="como">
        <div className="wrap">
          <h2>Así trabajamos contigo.</h2>
          <p className="sub">Dos formas de vender producto VeneLab. Escoge la que va con tu negocio; puedes combinar las dos.</p>
          <div className="vl-modes">
            <article className="vl-mode">
              <h3>Al mayor</h3>
              <p className="who">Para quien ya vende y quiere margen.</p>
              <ol>
                <li><span><b>Escoges</b> los productos y la cantidad. Sin mínimos de contenedor.</span></li>
                <li><span><b>Producimos</b> tu lote bajo pedido y te confirmamos fecha.</span></li>
                <li><span><b>Retiras o te entregamos</b> en Caracas; al interior por courier.</span></li>
              </ol>
            </article>
            <article className="vl-mode alt">
              <h3>Dropshipping</h3>
              <p className="who">Para quien vende sin stock.</p>
              <ol>
                <li><span><b>Te registras</b> como dropshipper VeneLab. Sin comprar inventario.</span></li>
                <li><span><b>Vendes</b> el producto en tu tienda, Instagram, TikTok o Dropi.</span></li>
                <li><span><b>Nosotros despachamos</b> cada pedido contra entrega. Tú cobras tu margen.</span></li>
              </ol>
            </article>
          </div>
        </div>
      </section>

      <section className="vl-sec vl-brand" id="marca">
        <div className="wrap">
          <div className="vl-brand-grid">
            <div>
              <h2>Creamos VEXTA. Podemos crear tu marca.</h2>
              <p className="sub">VEXTA es una marca que nació en nuestro laboratorio: fórmula, envase, etiqueta y producción, todo hecho aquí. Hoy tiene {vextaCount > 0 ? `${vextaCount} productos` : 'decenas de productos'} en seis líneas y se vende online en Venezuela.</p>
              <p className="sub">Si vendes al mayor, hacemos lo mismo contigo: formulamos, envasamos y etiquetamos con tu nombre. Tu marca, nuestra fábrica.</p>
              <div className="ctas">
                <a className="btn btn-wa" href={wa('Hola VeneLab, quiero información sobre fabricar con mi propia marca.')} target="_blank" rel="noreferrer"><WaIcon /> Quiero mi marca</a>
              </div>
            </div>
            <div className="vl-brand-photos" aria-label="Productos VEXTA fabricados por VeneLab">
              {brandPhotos.map((p, i) => <figure key={p.id} className={`p${i}`}><img src={p.image_url} alt={`${p.name}, marca VEXTA`} loading="lazy" /></figure>)}
            </div>
          </div>
        </div>
      </section>

      {TESTIMONIALS.length > 0 && (
        <section className="vl-sec" id="clientes">
          <div className="wrap">
            <h2>Lo que dicen quienes ya venden VeneLab.</h2>
            <div className="vl-quotes">
              {TESTIMONIALS.map((t, i) => (
                <blockquote key={i}>
                  <p>“{t.quote}”</p>
                  <footer><b>{t.name}</b>{t.handle ? ` · ${t.handle}` : ''}{t.role ? ` · ${t.role}` : ''}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="vl-sec">
        <div className="wrap">
          <h2>Importar o fabricar aquí.</h2>
          <div className="vl-table">
            <table>
              <thead><tr><th scope="col"></th><th scope="col">Importar de China</th><th scope="col">VeneLab</th></tr></thead>
              <tbody>
                <tr><td>Tiempo hasta tener producto</td><td>30 a 60 días</td><td>Días</td></tr>
                <tr><td>Aduana y nacionalización</td><td>Tú la pagas y la esperas</td><td>No existe</td></tr>
                <tr><td>Capital inmovilizado</td><td>Todo el lote por adelantado</td><td>Solo lo que vendes</td></tr>
                <tr><td>Reposición</td><td>Otro contenedor</td><td>Otro lote, misma semana</td></tr>
                <tr><td>Si el producto no vende</td><td>Te quedas con las cajas</td><td>Cambias de producto</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="vl-sec">
        <div className="wrap">
          <h2>Preguntas que nos hacen.</h2>
          <div className="vl-faq">
            <details><summary>¿Cuál es el mínimo de compra al mayor?</summary><p>Depende del producto y la presentación. Te pasamos la lista con mínimos y precios por WhatsApp; no publicamos precios en la web.</p></details>
            <details><summary>¿Puedo vender sin comprar stock?</summary><p>Sí. Te registras como dropshipper, subes el producto a tu tienda o plataforma y nosotros despachamos cada pedido contra entrega.</p></details>
            <details><summary>¿Entregan fuera de Caracas?</summary><p>En Caracas entregamos directo. Al interior del país despachamos por courier nacional.</p></details>
            <details><summary>¿Puedo poner mi propia marca?</summary><p>Sí. Así nació VEXTA. Para volúmenes al mayor formulamos, envasamos y etiquetamos con tu marca. Escríbenos y lo cotizamos según el producto.</p></details>
            <details><summary>¿Cómo empiezo?</summary><p>Escríbenos por WhatsApp con la línea que te interesa. Te respondemos con catálogo, mínimos y precios el mismo día.</p></details>
          </div>
        </div>
      </section>

      <section className="vl-cta">
        <div className="wrap">
          <h2>Tú vendes. Nosotros producimos y despachamos.</h2>
          <p>Escríbenos con la línea que te interesa y te respondemos con la lista al mayor hoy mismo.</p>
          <div className="ctas">
            <a className="btn btn-wa" href={wa(WA_DEFAULT)} target="_blank" rel="noreferrer"><WaIcon /> Escribir por WhatsApp</a>
            <a className="btn btn-ghost" href="/catalogo">Ver el catálogo</a>
          </div>
        </div>
      </section>

      <footer className="vl-foot">
        <div className="wrap">
          <img src="/venelab-logo.png" alt="VeneLab" />
          <nav aria-label="Enlaces"><a href="/catalogo">Catálogo</a><a href={wa(WA_DEFAULT)} target="_blank" rel="noreferrer">WhatsApp</a><a href="/app">Acceso</a></nav>
          <span>© {new Date().getFullYear()} VeneLab · Fabricado en Venezuela · Caracas</span>
        </div>
      </footer>

      <a className="vl-fab" href={wa(WA_DEFAULT)} target="_blank" rel="noreferrer" aria-label="Escribir por WhatsApp"><WaIcon /></a>
    </div>
  );
}
