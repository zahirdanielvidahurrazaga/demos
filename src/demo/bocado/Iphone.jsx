import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// iPhone realista en CSS (estilo 17 Pro, titanio natural) para que la app siga
// siendo INTERACTIVA dentro. Marco de titanio con brillos, botones laterales,
// bisel negro, Dynamic Island con lente, barra de estado, reflejo de vidrio y
// sombra de contacto. Todo se mide en cqw (el aparato es un contenedor), así
// sirve a cualquier ancho. `inclina` = se inclina poquito siguiendo el cursor
// (se queda quieto mientras el cursor está encima, para poder usar la app).
// ─────────────────────────────────────────────────────────────────────────────

// La pantalla del aparato mide lo que le toque en la página, pero la app se dibuja
// SIEMPRE a `ancho` puntos (393 = iPhone real) y se escala para caber: así en la
// maqueta se ve con las proporciones de un teléfono de verdad y nada se corta.
function Escala({ ancho, children }) {
  const ref = useRef(null);
  const [m, setM] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const medir = () => { const k = el.clientWidth / ancho; if (k > 0) setM({ k, alto: el.clientHeight / k }); };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ancho]);
  return (
    <div ref={ref} className="ip-escala">
      {m && <div style={{ width: ancho, height: m.alto, transform: `scale(${m.k})`, transformOrigin: '0 0' }}>{children}</div>}
    </div>
  );
}

function Estado() {
  return (
    <div className="ip-estado" aria-hidden="true">
      <span className="ip-hora">9:41</span>
      <span className="ip-iconos">
        <svg viewBox="0 0 18 12" width="18" height="12"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
        <svg viewBox="0 0 16 12" width="16" height="12"><path d="M8 11.5 5.6 8.8a3.4 3.4 0 0 1 4.8 0z" /><path d="M3.4 6.6a6.5 6.5 0 0 1 9.2 0l-1.4 1.5a4.5 4.5 0 0 0-6.4 0z" /><path d="M1.2 4.3a9.6 9.6 0 0 1 13.6 0l-1.4 1.5a7.6 7.6 0 0 0-10.8 0z" /></svg>
        <svg viewBox="0 0 27 13" width="27" height="13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="17" height="9" rx="2.4" /><path d="M25 4.5v4a2.2 2.2 0 0 0 0-4z" opacity=".45" /></svg>
      </span>
    </div>
  );
}

export default function Iphone({ children, className = '', inclina = false, estado = true, logico = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!inclina || !el || window.matchMedia?.('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0; let tx = 0; let ty = 0; let x = 0; let y = 0; let encima = false;
    const mover = (ev) => {
      const r = el.getBoundingClientRect();
      encima = ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom;
      const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
      tx = encima ? 0 : Math.max(-1, Math.min(1, (ev.clientX - cx) / (window.innerWidth / 2)));
      ty = encima ? 0 : Math.max(-1, Math.min(1, (ev.clientY - cy) / (window.innerHeight / 2)));
      if (!raf) raf = requestAnimationFrame(paso);
    };
    const paso = () => {
      x += (tx - x) * 0.08; y += (ty - y) * 0.08;
      el.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
      el.style.setProperty('--luz', `${(50 + x * 30).toFixed(1)}%`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(paso) : 0;
    };
    window.addEventListener('pointermove', mover, { passive: true });
    return () => { window.removeEventListener('pointermove', mover); cancelAnimationFrame(raf); };
  }, [inclina]);

  return (
    <div className={`ip ${className}`} ref={ref}>
      <div className="ip-cuerpo">
        <i className="ip-btn accion" /><i className="ip-btn vol1" /><i className="ip-btn vol2" />
        <i className="ip-btn encendido" /><i className="ip-btn camara" />
        <div className="ip-marco">
          <div className="ip-bisel">
            <div className="ip-pantalla">
              {logico ? <Escala ancho={logico}>{children}</Escala> : children}
              {estado && <Estado />}
              <div className="ip-isla" aria-hidden="true"><i /></div>
              <div className="ip-indicador" aria-hidden="true" />
              <div className="ip-reflejo" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
      <div className="ip-sombra" aria-hidden="true" />
    </div>
  );
}
