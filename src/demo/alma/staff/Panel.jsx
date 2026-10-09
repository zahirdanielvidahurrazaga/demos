import { useEffect, useState } from 'react';
import { a, estilosAlma, variables, vidrio } from '../estilo';
import { Fondo } from '../ui';

// ─────────────────────────────────────────────────────────────────────────────
// PANEL DEL EQUIPO — Studio Alma (Mostrador, Coach, Barra y Dirección)
//
// El mismo lenguaje que la app de la clienta (fondo, Manrope, vidrio y el modo
// oscuro que la persona eligió en este navegador), con navegación de
// herramienta: menú lateral de vidrio en compu y cápsula abajo en celular.
// ─────────────────────────────────────────────────────────────────────────────

function useAncho(min = 900) {
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

function temaGuardado() {
  try { return localStorage.getItem('alma_tema') || 'claro'; } catch { return 'claro'; }
}

export default function Panel({ cfg, rol, secciones, activa, alCambiar, altoEncabezado, children }) {
  const ancho = useAncho();
  const [tema] = useState(temaGuardado);
  const alto = `calc(100dvh - ${altoEncabezado}px)`;
  return (
    <div className="alma-app" style={{
      ...variables(tema), '--a-alto-encabezado': `${altoEncabezado}px`,
      position: 'relative', minHeight: alto, fontFamily: a.letra, color: a.tinta, WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{estilosAlma}</style>
      <Fondo />
      <div id="alma-hojas" style={{ position: 'relative', zIndex: 9400 }} />

      {ancho ? (
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 20, padding: '10px 20px 30px', maxWidth: 1440, margin: '0 auto', boxSizing: 'border-box' }}>
          <aside style={{
            ...vidrio, position: 'sticky', top: altoEncabezado + 10, alignSelf: 'start', borderRadius: 30, padding: 14,
            display: 'flex', flexDirection: 'column', gap: 4, maxHeight: `calc(${alto} - 30px)`, overflowY: 'auto', boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 16px' }}>
              {cfg.marca?.logo && <img src={cfg.marca.logo} alt="" style={{ height: 30, filter: tema === 'oscuro' ? 'brightness(0) invert(1)' : 'none' }} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cfg.nombre}</div>
                <div style={{ fontSize: '0.74rem', color: a.suave }}>{rol}</div>
              </div>
            </div>
            {secciones.map((s) => <Opcion key={s.id} s={s} on={s.id === activa} alTocar={() => alCambiar(s.id)} />)}
          </aside>
          <main style={{ minWidth: 0 }}>{children}</main>
        </div>
      ) : (
        <>
          {/* Sin z-index propio: así los modales de las secciones de Be Fit (z 6001) quedan sobre la barra. */}
          <main style={{ position: 'relative', padding: '14px 16px 120px' }}>{children}</main>
          {secciones.length > 1 && (
            <nav aria-label="Secciones" className="alma-tira" style={{
              ...vidrio, position: 'fixed', zIndex: 1399, left: 12, right: 12, bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
              display: 'flex', gap: 4, padding: 6, borderRadius: 999, overflowX: 'auto',
            }}>
              {secciones.map((s) => {
                const on = s.id === activa;
                return (
                  <button key={s.id} type="button" onClick={() => alCambiar(s.id)} aria-current={on ? 'page' : undefined} aria-label={s.texto} style={{
                    flex: '1 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 14px', borderRadius: 999,
                    border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap',
                    background: on ? a.tinta : 'transparent', color: on ? a.sobreTinta : a.tinta,
                  }}><s.Icono size={17} strokeWidth={1.8} />{on && s.texto}</button>
                );
              })}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function Opcion({ s, on, alTocar }) {
  return (
    <button type="button" onClick={alTocar} aria-current={on ? 'page' : undefined} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 18, border: 'none', cursor: 'pointer',
      textAlign: 'left', fontSize: '0.9rem', fontWeight: on ? 700 : 500, width: '100%',
      background: on ? a.tinta : 'transparent', color: on ? a.sobreTinta : a.tinta, transition: 'background .2s ease',
    }}>
      <s.Icono size={18} strokeWidth={1.8} />
      <span style={{ flex: 1 }}>{s.texto}</span>
      {s.cuenta > 0 && (
        <span style={{ minWidth: 20, height: 20, padding: '0 6px', boxSizing: 'border-box', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? a.sobreTinta : a.tinta, color: on ? a.tinta : a.sobreTinta }}>{s.cuenta}</span>
      )}
    </button>
  );
}

// Encabezado de cada sección: título con dos pesos y una línea de contexto.
export function Encabezado({ ligero, fuerte, sub, derecha }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, margin: '6px 0 18px', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.7rem, 4vw, 2.3rem)', letterSpacing: '-0.035em', lineHeight: 1.05 }}>
          <span style={{ fontWeight: 300 }}>{ligero} </span><span style={{ fontWeight: 700 }}>{fuerte}</span>
        </h1>
        {sub && <div style={{ fontSize: '0.88rem', color: a.suave, marginTop: 6 }}>{sub}</div>}
      </div>
      {derecha}
    </div>
  );
}
