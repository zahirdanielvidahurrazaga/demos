import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, MessageCircle } from 'lucide-react';
import { KAIZEN, PALETA, KaizenWordmark, cargarFuentesKaizen } from '../kaizen/marca';
import { codigoBonito, normalizarCodigo, verificar } from './acceso';

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA DEL CANDADO
//
// Lo que ve quien llega sin código (por ejemplo, desde un video donde salió la
// URL). No dice qué demos hay ni de qué negocios: solo pide el código y, sobre
// todo, invita a pedir una demo propia por WhatsApp.
// ─────────────────────────────────────────────────────────────────────────────

const MENSAJES = {
  invalido: 'Ese código no existe o ya no está activo.',
  vencido: 'Este acceso ya venció. Escríbenos y te lo renovamos.',
  espera: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  red: 'No pudimos comprobar tu acceso. Revisa tu conexión e inténtalo de nuevo.',
  otra: 'Tu código no incluye esta demo.',
};

function temaInicial() {
  try {
    const t = localStorage.getItem('tema');
    if (t === 'light' || t === 'dark') return t;
  } catch { /* almacenamiento bloqueado */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function Candado({ motivo: motivoInicial, codigoInicial = '', ruta, alEntrar }) {
  const [tema] = useState(temaInicial);
  const C = PALETA[tema];
  const [codigo, setCodigo] = useState(normalizarCodigo(codigoInicial));
  const [motivo, setMotivo] = useState(motivoInicial);
  const [enviando, setEnviando] = useState(false);
  const campo = useRef(null);

  useEffect(() => { cargarFuentesKaizen(); }, []);
  useEffect(() => {
    document.title = 'KaiZen — demos';
    const previo = document.body.style.background;
    document.body.style.background = C.fondo;
    return () => { document.body.style.background = previo; };
  }, [C.fondo]);

  const vencido = motivo === 'vencido';
  const mensajeWa = vencido
    ? 'Hola KaiZen, mi acceso a la demo venció. ¿Me lo pueden renovar?'
    : 'Hola KaiZen, vi una de sus demos y me gustaría una para mi negocio.';
  const whatsapp = `https://wa.me/${KAIZEN.whatsapp}?text=${encodeURIComponent(mensajeWa)}`;

  async function entrar(e) {
    e.preventDefault();
    if (codigo.length !== 8 || enviando) { campo.current?.focus(); return; }
    setEnviando(true);
    const r = await verificar(codigo, ruta);
    setEnviando(false);
    if (r.ok) alEntrar(r);
    else setMotivo(r.motivo);
  }

  const etiqueta = { fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.tenue };
  const listo = codigo.length === 8;

  return (
    <div style={{
      minHeight: '100vh', background: C.fondo, color: C.tinta, fontFamily: KAIZEN.texto,
      WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        .kz-italica { font-style: italic; background: ${C.italica}; -webkit-background-clip: text;
          background-clip: text; color: transparent; padding-right: 0.06em; }
        .kz-boton { transition: transform .2s ease, opacity .2s ease; }
        .kz-boton:hover { transform: translateY(-1px); opacity: .9; }
        .kz-codigo::placeholder { color: ${C.tenue}; opacity: .45; }
        .kz-codigo:focus { outline: none; border-color: ${C.tinta} !important; }
      `}</style>

      <header style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1120, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <a href={KAIZEN.sitio} aria-label="KaiZen" style={{ color: C.tinta, display: 'flex' }}>
          <KaizenWordmark height={15} />
        </a>
        <span style={{ ...etiqueta, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Lock size={12} /> Demos privadas</span>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '24px 16px 56px' }}>
        <div style={{ width: '100%', maxWidth: 520, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: KAIZEN.display, fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 0.98,
            fontSize: 'clamp(2.6rem, 9vw, 4.2rem)', margin: 0, color: C.fuerte,
          }}>
            Esta demo es <span className="kz-italica">personal.</span>
          </h1>
          <p style={{ fontSize: '1.02rem', lineHeight: 1.6, color: C.tenue, margin: '18px 0 28px' }}>
            Si te mandamos un link, ábrelo tal cual y entras directo. Si te dimos un código, escríbelo aquí.
          </p>

          <form onSubmit={entrar} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              ref={campo}
              className="kz-codigo"
              value={codigoBonito(codigo)}
              onChange={(e) => { setCodigo(normalizarCodigo(e.target.value)); if (motivo) setMotivo(null); }}
              placeholder="XXXX-XXXX"
              aria-label="Código de acceso"
              autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false}
              inputMode="text" maxLength={9}
              style={{
                flex: '1 1 220px', minWidth: 0, padding: '15px 20px', borderRadius: 999,
                border: `1px solid ${C.borde}`, background: C.elevado, color: C.fuerte,
                fontFamily: KAIZEN.display, fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.18em',
                boxSizing: 'border-box',
              }}
            />
            <button type="submit" className="kz-boton" disabled={enviando} style={{
              flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '15px 26px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: C.acento, color: C.sobreAcento, fontWeight: 600, fontSize: '0.98rem',
              fontFamily: KAIZEN.texto, opacity: listo && !enviando ? 1 : 0.55,
            }}>
              {enviando ? 'Revisando…' : <>Entrar <ArrowRight size={17} /></>}
            </button>
          </form>

          <div aria-live="polite" style={{ minHeight: 26, marginTop: 12, fontSize: '0.92rem', color: C.tinta }}>
            {motivo && MENSAJES[motivo]}
            {motivo === 'otra' && (
              <> <Link to="/" style={{ color: C.tinta, fontWeight: 600 }}>Ver mis demos</Link></>
            )}
          </div>

          <div style={{ marginTop: 36, paddingTop: 28, borderTop: `1px solid ${C.borde}` }}>
            <div style={{ ...etiqueta, marginBottom: 10 }}>{vencido ? 'Renovar acceso' : '¿Aún no tienes acceso?'}</div>
            <h2 style={{ fontFamily: KAIZEN.display, fontWeight: 700, letterSpacing: '-0.03em', fontSize: 'clamp(1.5rem, 4.5vw, 1.9rem)', lineHeight: 1.1, margin: '0 0 10px', color: C.fuerte }}>
              {vencido ? 'Te lo renovamos en un momento.' : '¿Quieres ver tu negocio así?'}
            </h2>
            <p style={{ margin: '0 0 20px', color: C.tenue, lineHeight: 1.6, fontSize: '0.98rem' }}>
              {vencido
                ? 'Escríbenos por WhatsApp y te mandamos un link nuevo.'
                : 'Te armamos una demo con tu marca para que la pruebes como cliente, como equipo y como dueño. Escríbenos y te mandamos tu acceso.'}
            </p>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="kz-boton" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 999,
              border: `1px solid ${C.borde}`, color: C.tinta, textDecoration: 'none', fontWeight: 600, fontSize: '0.96rem',
            }}><MessageCircle size={17} /> {vencido ? 'Renovar por WhatsApp' : 'Pide tu demo'}</a>
          </div>
        </div>
      </main>
    </div>
  );
}
