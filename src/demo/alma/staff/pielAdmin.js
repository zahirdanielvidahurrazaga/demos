import { useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// PIEL DE ALMA para las secciones de Be Fit dentro de Dirección (modo mixto).
// Las pantallas de pages/Admin.jsx pintan sus tarjetas con blanco en línea
// (casi sin clases), así que se reconocen en la página: un observador marca
// cada caja blanca redondeada con data-alma-vidrio y el CSS la vuelve vidrio.
// Las que tienen foto o degradado se respetan. Solo dentro de .alma-admin.
// ─────────────────────────────────────────────────────────────────────────────

export const estilosAdmin = `
.alma-admin .admin-incrustado .mobile-only-header,
.alma-admin .admin-incrustado .admin-desktop-sidebar,
.alma-admin .admin-incrustado .mobile-only-nav { display: none !important; }
.alma-admin .admin-app-container { background: transparent !important; min-height: 0 !important; display: block !important; }
.alma-admin .admin-incrustado .admin-main-content { margin-left: 0 !important; padding: 0 0 20px !important; background: transparent !important; min-height: 0 !important; }
.alma-admin .admin-incrustado .admin-content-area { padding: 0 !important; max-width: none !important; }
/* Una sola letra: Manrope en todo (Be Fit trae Inter, Playfair y DM Sans). */
.alma-admin, .alma-admin * { font-family: 'Manrope', 'Avenir Next', system-ui, sans-serif !important; }
.alma-admin h1, .alma-admin h2, .alma-admin h3, .alma-admin h4 { color: var(--a-tinta) !important; letter-spacing: -0.02em !important; }
.alma-admin { --font-display: 'Manrope', sans-serif; --font-body: 'Manrope', sans-serif; color: var(--a-tinta); }
.alma-admin [data-alma-vidrio] {
  background: radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,.8), rgba(255,255,255,0) 55%), linear-gradient(160deg, rgba(255,255,255,.72), rgba(255,255,255,.48)) !important;
  -webkit-backdrop-filter: blur(20px) saturate(160%); backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255,255,255,.85) !important;
  box-shadow: inset 0 1px 0 #fff, 0 10px 28px rgba(52,44,30,.10) !important;
  color: #22261B;
}
.alma-admin [data-alma-vidrio] [data-alma-vidrio] { background: rgba(255,255,255,.5) !important; -webkit-backdrop-filter: none; backdrop-filter: none; box-shadow: inset 0 1px 0 #fff !important; }
.alma-admin input, .alma-admin select, .alma-admin textarea { border-radius: 14px !important; }
`;

function esCajaBlanca(el) {
  const cs = getComputedStyle(el);
  if (cs.backgroundImage !== 'none') return false;
  const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
  if (!m) return false;
  const [r, g, b, al = 1] = m[1].split(',').map((x) => parseFloat(x));
  if (al < 0.5 || r < 236 || g < 230 || b < 222) return false;
  if (parseFloat(cs.borderTopLeftRadius) < 10) return false;
  const caja = el.getBoundingClientRect();
  return caja.width >= 60 && caja.height >= 44;
}

// Ref de callback: marca las cajas blancas ahora y cada vez que cambia el contenido.
export function useVidrioAdmin() {
  const limpiar = useRef(null);
  return useCallback((raiz) => {
    limpiar.current?.();
    limpiar.current = null;
    if (!raiz) return;
    let pendiente = null;
    const pasar = () => {
      pendiente = null;
      raiz.querySelectorAll('div[style], section[style], button[style], form[style], .ios-glass-card, .glass-card').forEach((el) => {
        if (el.dataset.almaVidrio || !esCajaBlanca(el)) return;
        el.dataset.almaVidrio = '1';
      });
    };
    const programar = () => { if (!pendiente) pendiente = requestAnimationFrame(pasar); };
    programar();
    const obs = new MutationObserver(programar);
    obs.observe(raiz, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    limpiar.current = () => { obs.disconnect(); if (pendiente) cancelAnimationFrame(pendiente); };
  }, []);
}
