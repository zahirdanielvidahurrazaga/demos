import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, MessageCircle } from 'lucide-react';
import { SECTORES, TOTAL_DEMOS, destinoDe } from '../demo/catalogo';
import { KAIZEN, PALETA, KaizenWordmark, cargarFuentesKaizen } from '../demo/kaizen/marca';

// ─────────────────────────────────────────────────────────────────────────────
// PORTADA DEL DESPLIEGUE DE MAQUETAS
//
// Solo existe cuando VITE_DEMOS=true. Ocupa la raíz de ese dominio para que, si
// una prospecta borra el path del link que le mandaste, NO aterrice en el sitio
// de Be Fit Lab —la marca de su competencia— sino en algo de KaiZen.
//
// Es el centro de TODAS las demos, por sector. Lo que se muestra sale de
// `catalogo.js`; aquí no hay nada escrito a mano.
//
// ⚠️ Esta página es para quien llega en frío o pide "ver ejemplos". El link que
// le mandas a una prospecta debe ir DIRECTO a su maqueta: un menú donde tiene
// que elegir convierte peor que ver su propio negocio de entrada.
//
// El estilo es el de kaizenstudiomx.com (marca KaiZen, paleta Mármol, Familjen
// Grotesk + Inter): quien llega desde el sitio, o al revés, tiene que sentir que
// es la misma marca. Los tokens viven en src/demo/kaizen/marca.jsx.
// ─────────────────────────────────────────────────────────────────────────────

// Misma regla que el sitio (su index.html): manda lo guardado en
// localStorage.tema y, si no hay nada, la preferencia del sistema.
function temaInicial() {
  try {
    const t = localStorage.getItem('tema');
    if (t === 'light' || t === 'dark') return t;
  } catch { /* almacenamiento bloqueado */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const MENSAJE = 'Hola KaiZen, vi sus demos y me interesa algo así para mi negocio.';

export default function IndiceDemos() {
  const [tema, setTema] = useState(temaInicial);
  const C = PALETA[tema];

  useEffect(() => { cargarFuentesKaizen(); }, []);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const alCambiar = () => {
      try { if (localStorage.getItem('tema')) return; } catch { /* vacío */ }
      setTema(mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

  useEffect(() => {
    const previo = document.body.style.background;
    document.body.style.background = PALETA[tema].fondo;
    return () => { document.body.style.background = previo; };
  }, [tema]);

  useEffect(() => {
    document.title = 'KaiZen — demos en vivo';
    const resumen = 'Apps y sitios web a la medida para negocios. Recorre las demos '
      + 'con datos de ejemplo, sin registrarte.';
    const poner = (sel, valor) => document.head.querySelector(sel)?.setAttribute('content', valor);
    poner('meta[name="description"]', resumen);
    poner('meta[property="og:title"]', 'KaiZen — demos en vivo');
    poner('meta[property="og:description"]', resumen);
    poner('meta[property="og:image"]', '');
    poner('meta[name="twitter:title"]', 'KaiZen — demos en vivo');
    poner('meta[name="twitter:description"]', resumen);
    poner('meta[name="twitter:image"]', '');
    poner('meta[name="keywords"]', '');
    poner('meta[property="og:site_name"]', 'KaiZen');
    // index.html declara a Be Fit Lab como negocio local: aquí no aplica.
    document.head.querySelectorAll('script[type="application/ld+json"]')
      .forEach((n) => { n.type = 'application/ld+json-demo-desactivado'; });
  }, []);

  const whatsapp = `https://wa.me/${KAIZEN.whatsapp}?text=${encodeURIComponent(MENSAJE)}`;
  const etiqueta = { fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.tenue };

  return (
    <div style={{ minHeight: '100vh', background: C.fondo, color: C.tinta, fontFamily: KAIZEN.texto, WebkitFontSmoothing: 'antialiased' }}>
      {/* :hover y degradado sobre texto no se pueden en estilos en línea. */}
      <style>{`
        .kz-italica { font-style: italic; background: ${C.italica}; -webkit-background-clip: text;
          background-clip: text; color: transparent; padding-right: 0.06em; }
        .kz-demo { transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
        .kz-demo:hover { transform: translateY(-3px); box-shadow: ${C.sombraHover}; border-color: ${C.borde}; }
        .kz-demo:hover .kz-flecha { transform: translateX(4px); }
        .kz-flecha { transition: transform .25s ease; }
        .kz-boton { transition: transform .2s ease, opacity .2s ease; }
        .kz-boton:hover { transform: translateY(-1px); opacity: .9; }
        .kz-nav-relleno { display: none; }
        @media (max-width: 760px) {
          .kz-sector { grid-template-columns: 1fr !important; gap: 14px !important; }
          .kz-nav-centro { display: none !important; }
          .kz-nav-relleno { display: block; }
        }
      `}</style>

      {/* Navbar del sitio: píldora de cristal flotante */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 16px 0' }}>
        <nav style={{
          maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16,
          padding: '8px 8px 8px 22px', borderRadius: 999, boxSizing: 'border-box',
          background: C.cristal, border: `1px solid ${C.cristalBorde}`,
          backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: C.sombra,
        }}>
          <a href={KAIZEN.sitio} aria-label="KaiZen" style={{ color: C.tinta, display: 'flex' }}>
            <KaizenWordmark height={15} />
          </a>
          <div className="kz-nav-centro" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 28 }}>
            <span style={{ ...etiqueta, color: C.tinta }}>Demos</span>
            <a href={KAIZEN.sitio} style={{ ...etiqueta, textDecoration: 'none' }}>Sitio</a>
          </div>
          <div style={{ flex: 1 }} className="kz-nav-relleno" />
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="kz-boton" style={{
            padding: '9px 18px', borderRadius: 999, background: C.acento, color: C.sobreAcento,
            textDecoration: 'none', fontSize: '0.84rem', fontWeight: 600, flexShrink: 0,
          }}>Cotizar</a>
        </nav>
      </div>

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', boxSizing: 'border-box' }}>
        {/* Encabezado editorial */}
        <section style={{ padding: 'clamp(56px, 9vw, 110px) 0 clamp(40px, 6vw, 72px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 12, borderBottom: `1px solid ${C.borde}` }}>
            <span style={etiqueta}>Demos · en vivo</span>
            <span style={etiqueta}>{TOTAL_DEMOS} {TOTAL_DEMOS === 1 ? 'demo' : 'demos'} — 2026</span>
          </div>
          <h1 style={{
            fontFamily: KAIZEN.display, fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 0.95,
            fontSize: 'clamp(3rem, 9vw, 7rem)', margin: '28px 0 0', color: C.fuerte,
          }}>
            Pruébalo antes<br />de <span className="kz-italica">tenerlo.</span>
          </h1>
          <p style={{ maxWidth: 620, fontSize: 'clamp(1.02rem, 1.6vw, 1.2rem)', lineHeight: 1.6, color: C.tenue, margin: '28px 0 32px' }}>
            Cada demo es una app real con datos de ejemplo. Entra como cliente, como
            tu equipo o como dueño, y mira cómo trabajaría tu negocio. Sin registrarte.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="kz-boton" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 26px', borderRadius: 999,
              background: C.acento, color: C.sobreAcento, textDecoration: 'none', fontWeight: 600, fontSize: '0.98rem',
            }}><MessageCircle size={17} /> Cuéntanos tu proyecto</a>
            <a href={KAIZEN.sitio} className="kz-boton" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '15px 24px', borderRadius: 999,
              border: `1px solid ${C.borde}`, color: C.tinta, textDecoration: 'none', fontWeight: 600, fontSize: '0.98rem',
            }}>Ver el sitio <ArrowUpRight size={16} /></a>
          </div>
        </section>

        {/* Demos por sector, como lista editorial numerada */}
        {SECTORES.map((s, i) => (
          <section key={s.id} className="kz-sector" style={{
            display: 'grid', gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.4fr)', gap: 40,
            padding: '36px 0', borderTop: `1px solid ${C.borde}`,
          }}>
            <div>
              <div style={{ fontFamily: KAIZEN.display, fontSize: '0.95rem', fontWeight: 600, color: C.tenue, marginBottom: 10 }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <h2 style={{ fontFamily: KAIZEN.display, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05, fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', margin: '0 0 12px', color: C.fuerte }}>
                {s.titulo}
              </h2>
              <p style={{ margin: 0, color: C.tenue, lineHeight: 1.6, fontSize: '0.98rem', maxWidth: 380 }}>{s.descripcion}</p>
            </div>
            <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
              {s.demos.map((demo) => {
                const destino = destinoDe(demo);
                const externa = demo.tipo === 'externa';
                const contenido = (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...etiqueta, fontSize: '0.62rem', marginBottom: 8 }}>{demo.nota || 'demo en vivo'}</div>
                      <div style={{ fontFamily: KAIZEN.display, fontWeight: 700, letterSpacing: '-0.02em', fontSize: 'clamp(1.35rem, 2.4vw, 1.75rem)', color: C.fuerte }}>
                        {demo.nombre}
                      </div>
                      <div style={{ color: C.tenue, fontSize: '0.92rem', marginTop: 4 }}>{demo.detalle}</div>
                    </div>
                    <span className="kz-flecha" style={{
                      width: 46, height: 46, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', background: C.acento, color: C.sobreAcento,
                    }}>
                      {externa ? <ArrowUpRight size={19} /> : <ArrowRight size={19} />}
                    </span>
                  </>
                );
                const estilo = {
                  display: 'flex', alignItems: 'center', gap: 18, padding: '22px 22px 22px 26px', borderRadius: 26,
                  background: C.tarjeta, border: `1px solid ${C.bordeSuave}`, boxShadow: C.sombra,
                  textDecoration: 'none', color: 'inherit',
                };
                return externa
                  ? <a key={destino} href={destino} target="_blank" rel="noopener noreferrer" className="kz-demo" style={estilo}>{contenido}</a>
                  : <Link key={destino} to={destino} className="kz-demo" style={estilo}>{contenido}</Link>;
              })}
            </div>
          </section>
        ))}

        <footer style={{
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'space-between',
          padding: '32px 0 48px', borderTop: `1px solid ${C.borde}`, marginTop: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: C.tinta }}>
            <KaizenWordmark height={13} />
            <a href={`mailto:${KAIZEN.correo}`} style={{ color: C.tenue, fontSize: '0.85rem', textDecoration: 'none' }}>{KAIZEN.correo}</a>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.6, color: C.tenue, maxWidth: 520 }}>
            Las demos funcionan de verdad, con negocios y datos inventados: nada se conecta a un
            negocio real y los pagos son de prueba. Se reinician solas cada noche, o desde su guía.
          </p>
        </footer>
      </main>
    </div>
  );
}
