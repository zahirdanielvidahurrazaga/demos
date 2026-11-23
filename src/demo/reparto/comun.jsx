import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Maximize, Minimize, Minus, Plus, X } from 'lucide-react';

// ── hoja (abajo en celular, centrada en compu), por portal ──────────────────
export function Hoja({ abierta, alCerrar, titulo, children, pie, ancha }) {
  useEffect(() => {
    if (!abierta) return undefined;
    const tecla = (e) => { if (e.key === 'Escape') alCerrar?.(); };
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', tecla);
    return () => { document.body.style.overflow = antes; window.removeEventListener('keydown', tecla); };
  }, [abierta, alCerrar]);
  if (!abierta) return null;
  return createPortal(
    <div className="rp rp-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar?.(); }}>
      <div className={`rp-hoja ${ancha ? 'ancha' : ''}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="rp-hoja-cab">
          <h2>{titulo}</h2>
          <button type="button" className="rp-x" onClick={alCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="rp-hoja-cuerpo">{children}</div>
        {pie && <div className="rp-hoja-pie">{pie}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Contador({ valor, alCambiar, max }) {
  return (
    <div className="rp-contador">
      <button type="button" onClick={() => alCambiar(Math.max(0, valor - 1))} disabled={valor <= 0} aria-label="Una menos"><Minus size={16} /></button>
      <input inputMode="numeric" value={valor} onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); alCambiar(Number.isFinite(n) ? n : 0); }} aria-label="Cajas" />
      <button type="button" onClick={() => alCambiar(valor + 1)} disabled={max != null && valor >= max} aria-label="Una más"><Plus size={16} /></button>
    </div>
  );
}

export function Segmentos({ opciones, valor, alCambiar }) {
  return (
    <div className="rp-seg" role="tablist">
      {opciones.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={valor === o.id} className={valor === o.id ? 'si' : ''} onClick={() => alCambiar(o.id)}>{o.etiqueta}</button>
      ))}
    </div>
  );
}

export const Punto = ({ tono }) => <span className={`rp-punto ${tono}`} aria-hidden="true" />;

// ── pantalla completa = modo app ────────────────────────────────────────────
export function usePantallaCompleta() {
  const [activa, setActiva] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const f = () => setActiva(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  const posible = !!document.documentElement.requestFullscreen;
  const alternar = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  return { activa, posible, alternar };
}
export function BotonPantalla() {
  const pc = usePantallaCompleta();
  if (!pc.posible) return null;
  return (
    <button type="button" className="rp-icono" onClick={pc.alternar} aria-label={pc.activa ? 'Salir de pantalla completa' : 'Ver como app'} title={pc.activa ? 'Salir de pantalla completa' : 'Ver como app'}>
      {pc.activa ? <Minimize size={18} /> : <Maximize size={18} />}
    </button>
  );
}

// ── aviso flotante ──────────────────────────────────────────────────────────
let mostrar = () => {};
export function avisarListo(texto) { mostrar(texto); }
export function AvisoListo() {
  const [texto, setTexto] = useState(null);
  useEffect(() => {
    let id;
    mostrar = (t) => { setTexto(t); clearTimeout(id); id = setTimeout(() => setTexto(null), 2600); };
    return () => { mostrar = () => {}; clearTimeout(id); };
  }, []);
  if (!texto) return null;
  return createPortal(<div className="rp rp-aviso" role="status"><CheckCircle2 size={18} /> {texto}</div>, document.body);
}

export function useAhora(cada = 30000) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setT(Date.now()), cada); return () => clearInterval(id); }, [cada]);
  return t;
}
