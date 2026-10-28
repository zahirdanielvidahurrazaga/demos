import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Maximize, Minimize, X } from 'lucide-react';
import { IMG, NEGOCIO } from './datos';

// Piezas compartidas por el sitio y los paneles del equipo.

// Foto con respaldo: si no carga queda el texto sobre el papel.
export function Foto({ nombre, texto = '', className = '', style, prioridad }) {
  const [falla, setFalla] = useState(false);
  return (
    <div className={`fl-foto ${className}`} style={style}>
      {!falla && <img src={IMG(nombre)} alt={texto} loading={prioridad ? 'eager' : 'lazy'} draggable={false} onError={() => setFalla(true)} />}
      {falla && <div className="fl-foto-falta">{texto}</div>}
    </div>
  );
}

// Logotipo provisional, estilo galería: la palabra en mayúsculas con punto.
export function Logo({ grande, claro }) {
  return <span className={`fl-logo ${grande ? 'grande' : ''} ${claro ? 'claro' : ''}`}>{NEGOCIO.nombre}.</span>;
}

// Las ventanas se pintan en la raíz `.fl` (no dentro de su página) para que
// ningún `isolation` o `transform` del contenido las atrape debajo.
export function enRaiz(nodo) {
  const raiz = typeof document !== 'undefined' ? document.querySelector('.fl') : null;
  return raiz ? createPortal(nodo, raiz) : nodo;
}

// Ventana (hoja que sube en celular, caja centrada en compu). Escape y clic
// afuera cierran; bloquea el scroll de atrás y regresa el foco al cerrar.
export function Ventana({ titulo, alCerrar, children, ancho = 520, className = '' }) {
  const caja = useRef(null);
  // alCerrar suele venir como función nueva en cada render: se guarda en un ref
  // para que el efecto corra UNA vez (si no, re-enfocaba la caja y en celular
  // cerraba el teclado mientras se escribía)
  const cerrar = useRef(alCerrar);
  useLayoutEffect(() => { cerrar.current = alCerrar; });
  useEffect(() => {
    const antes = document.activeElement;
    const f = (ev) => { if (ev.key === 'Escape') cerrar.current?.(); };
    document.addEventListener('keydown', f);
    const ov = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    caja.current?.focus();
    return () => { document.removeEventListener('keydown', f); document.body.style.overflow = ov; antes?.focus?.(); };
  }, []);
  return enRaiz(
    <div className="fl-velo" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) alCerrar?.(); }}>
      <div ref={caja} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo} className={`fl-ventana ${className}`} style={{ '--ancho': `${ancho}px` }}>
        <div className="fl-ventana-cab">
          <h3>{titulo}</h3>
          {alCerrar && <button type="button" className="fl-icono" onClick={alCerrar} aria-label="Cerrar"><X size={18} /></button>}
        </div>
        {children}
      </div>
    </div>,
  );
}

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
    <button type="button" className="fl-icono" onClick={pc.alternar} aria-label={pc.activa ? 'Salir de pantalla completa' : 'Pantalla completa'} title={pc.activa ? 'Salir de pantalla completa' : 'Ver como app (pantalla completa)'}>
      {pc.activa ? <Minimize size={17} /> : <Maximize size={17} />}
    </button>
  );
}

// ── aviso flotante de "listo" (uno solo, en FloreriasDemo) ──────────────────
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
  return <div className="fl-aviso" role="status"><CheckCircle2 size={18} /> {texto}</div>;
}

export function useAhora(cada = 1000) {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setT(Date.now()), cada); return () => clearInterval(id); }, [cada]);
  return t;
}

export function useAncho(min) {
  const q = `(min-width: ${min}px)`;
  const [si, setSi] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setSi(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, [q]);
  return si;
}

export const hace = (t, ahora = Date.now()) => {
  const m = Math.max(0, Math.round((ahora - t) / 60000));
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} d`;
};

// ── color de cada ramo ──────────────────────────────────────────────────────
// La ficha toma el color del ramo: se reduce la foto a 12×15, se queda con los
// pixeles con más color y se oscurece un poco para que el texto se lea.
const tonos = new Map();
export function useTono(nombre, respaldo = '#6E1F2E') {
  const src = nombre ? IMG(nombre) : null;
  const [tono, setTono] = useState(() => tonos.get(src) || null);
  useEffect(() => {
    if (!src) return undefined;
    if (tonos.has(src)) { setTono(tonos.get(src)); return undefined; }
    let vivo = true;
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = 12; c.height = 15;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, 12, 15);
        const d = x.getImageData(0, 0, 12, 15).data;
        const px = [];
        for (let i = 0; i < d.length; i += 4) {
          const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          px.push({ r, g, b, sat: max ? (max - min) / max : 0, luz: max });
        }
        const vivos = px.filter((p) => p.luz > 40 && p.luz < 240 && p.sat > 0.25).sort((a, b) => b.sat - a.sat).slice(0, 24);
        if (!vivos.length) { tonos.set(src, null); return; }
        const m = vivos.reduce((a, p) => ({ r: a.r + p.r, g: a.g + p.g, b: a.b + p.b }), { r: 0, g: 0, b: 0 });
        let [r, g, b] = [m.r / vivos.length, m.g / vivos.length, m.b / vivos.length];
        const k = Math.min(1, 165 / Math.max(r, g, b, 1));
        [r, g, b] = [r * k, g * k, b * k].map((v) => Math.round(Math.max(30, v)));
        const t = `rgb(${r}, ${g}, ${b})`;
        tonos.set(src, t);
        if (vivo) setTono(t);
      } catch { tonos.set(src, null); }
    };
    img.src = src;
    return () => { vivo = false; };
  }, [src]);
  return tono || respaldo;
}
