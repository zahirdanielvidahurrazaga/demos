import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { KAIZEN, PALETA, KaizenWordmark, cargarFuentesKaizen } from './marca';

// ─────────────────────────────────────────────────────────────────────────────
// BARRA DE LAS DEMOS — la misma en todas las maquetas (Studio Alma, Hoja, …).
//
// Es la navbar de kaizenstudiomx.com: píldora de cristal flotante, wordmark
// ΚΛΙΖΣΝ, el elemento activo en tinta. La marca del negocio vive DENTRO de la
// app; esta barra es de KaiZen y por eso no toma los colores del negocio.
// ─────────────────────────────────────────────────────────────────────────────

const C = PALETA.light;

function useAnchoBarra(min) {
  const consulta = `(min-width: ${min}px)`;
  const [ancho, setAncho] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const m = window.matchMedia(consulta);
    const alCambiar = () => setAncho(m.matches);
    m.addEventListener('change', alCambiar);
    return () => m.removeEventListener('change', alCambiar);
  }, [consulta]);
  return ancho;
}

export default function BarraDemo({ roles, rol, alCambiar, guiaAbierta, alGuia, aviso }) {
  const ancho = useAnchoBarra(900);
  useEffect(() => { cargarFuentesKaizen(); }, []);

  return (
    <div style={{ padding: ancho ? '12px 16px 0' : '8px 8px 0', pointerEvents: 'auto', fontFamily: KAIZEN.texto }}>
      <div style={{
        maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', gap: ancho ? 14 : 6,
        padding: ancho ? '6px 6px 6px 18px' : 5, borderRadius: 999, boxSizing: 'border-box',
        background: C.cristal, border: `1px solid ${C.cristalBorde}`,
        backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
      }}>
        <Link to="/" aria-label="Todas las demos" title="Todas las demos" style={{
          display: 'flex', alignItems: 'center', gap: 10, color: C.tinta, textDecoration: 'none', flexShrink: 0,
          padding: ancho ? '6px 4px' : '0 10px', alignSelf: 'stretch', borderRadius: 999,
          background: ancho ? 'transparent' : C.velo,
        }}>
          <ArrowLeft size={16} strokeWidth={2.2} />
          {ancho && (
            <>
              <KaizenWordmark height={14} />
              <span style={{ fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.tenue }}>Demos</span>
            </>
          )}
        </Link>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <div role="group" aria-label="Cambiar de vista en la demostración" style={{
            display: 'flex', gap: 2, padding: 4, borderRadius: 999, background: C.velo,
            overflowX: 'auto', scrollbarWidth: 'none', maxWidth: '100%',
          }}>
            {roles.map((r) => {
              const activo = rol === r.id;
              return (
                <button key={r.id} type="button" onClick={() => alCambiar(r.id)} aria-pressed={activo} title={r.etiqueta}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap',
                    padding: ancho || activo ? '8px 14px' : '8px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: activo ? C.tinta : 'transparent', color: activo ? '#fff' : C.tenue,
                    fontFamily: KAIZEN.texto, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.01em',
                    boxShadow: activo ? '0 4px 12px rgba(0,0,0,0.18)' : 'none',
                    transition: 'background .18s ease, color .18s ease',
                  }}>
                  <r.Icon size={15} strokeWidth={2.2} />
                  {/* En el celular solo el rol activo lleva texto, para que quepan todos. */}
                  {(ancho || activo) && r.etiqueta}
                </button>
              );
            })}
          </div>
        </div>

        {alGuia && (
          <button type="button" onClick={alGuia} aria-pressed={guiaAbierta} aria-label="Guía de la demostración" style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, alignSelf: 'stretch',
            padding: ancho ? '0 18px' : '0 12px', borderRadius: 999, cursor: 'pointer',
            border: guiaAbierta ? `1px solid ${C.borde}` : 'none',
            background: guiaAbierta ? '#fff' : C.tinta, color: guiaAbierta ? C.tinta : '#fff',
            fontFamily: KAIZEN.texto, fontSize: '0.8rem', fontWeight: 600,
          }}>
            <Compass size={15} strokeWidth={2.2} /> {ancho && 'Guía'}
          </button>
        )}
      </div>

      {aviso && (
        <div style={{ textAlign: 'center', margin: '6px auto 0', maxWidth: 1120, padding: '0 12px' }}>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 999, background: C.cristal,
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: C.tenue, lineHeight: 1.5,
          }}>
            {aviso}
          </span>
        </div>
      )}
    </div>
  );
}
