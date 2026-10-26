import { createContext, useContext, useEffect, useState } from 'react';
import { CarFront, CheckCircle2, Maximize, Minimize, Moon, Sun } from 'lucide-react';
import { IMG, ZONAS, ocupados, ventasDe } from './datos';

// Piezas compartidas por el sitio y los paneles del equipo.

// Foto con respaldo: si la imagen no carga queda el texto sobre el gris.
// crossOrigin: así la copia en caché sirve también para leer su color (useTono);
// sin eso el canvas queda bloqueado y el boleto sale gris.
export function Foto({ nombre, texto = '', className = '', style, prioridad }) {
  // 0 = con CORS · 1 = sin CORS (si una copia vieja en caché la bloqueó) · 2 = no cargó
  const [intento, setIntento] = useState(0);
  return (
    <div className={`ac-foto ${className}`} style={style}>
      {intento < 2 && (
        <img key={intento} src={IMG(nombre)} alt={texto} loading={prioridad ? 'eager' : 'lazy'} draggable={false}
          referrerPolicy="no-referrer" crossOrigin={intento === 0 ? 'anonymous' : undefined} onError={() => setIntento((n) => n + 1)} />
      )}
      {intento === 2 && <div className="ac-foto-falta">{texto}</div>}
    </div>
  );
}

// ── tema claro / oscuro ─────────────────────────────────────────────────────
// Por defecto sigue al sistema; si lo cambian a mano se recuerda en este
// navegador (`demo_autocinema_tema`).
const LLAVE_TEMA = 'demo_autocinema_tema';
export const TemaContexto = createContext({ tema: 'oscuro', alternar: () => {} });
export function useTemaInicial() {
  const [tema, setTema] = useState(() => {
    try { const t = localStorage.getItem(LLAVE_TEMA); if (t === 'claro' || t === 'oscuro') return t; } catch { /* sin almacenamiento */ }
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro';
  });
  const alternar = () => setTema((t) => {
    const n = t === 'claro' ? 'oscuro' : 'claro';
    try { localStorage.setItem(LLAVE_TEMA, n); } catch { /* */ }
    return n;
  });
  return { tema, alternar };
}

// ── pantalla completa ───────────────────────────────────────────────────────
// Para enseñarla en una tablet o en la tele de la taquilla. En iPhone Safari
// no existe la API: el botón no sale.
function usePantallaCompleta() {
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

// Botones de tema y pantalla completa (encabezado del sitio y de cada panel).
export function Controles({ vidrio = true }) {
  const { tema, alternar } = useContext(TemaContexto);
  const pc = usePantallaCompleta();
  const c = `ac-redondo chico ${vidrio ? 'vidrio' : ''}`;
  return (
    <div className="ac-controles">
      <button type="button" className={c} onClick={alternar} aria-label={tema === 'claro' ? 'Modo oscuro' : 'Modo claro'} title={tema === 'claro' ? 'Modo oscuro' : 'Modo claro'}>
        {tema === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
      </button>
      {pc.posible && (
        <button type="button" className={c} onClick={pc.alternar} aria-label={pc.activa ? 'Salir de pantalla completa' : 'Pantalla completa'} title={pc.activa ? 'Salir de pantalla completa' : 'Pantalla completa'}>
          {pc.activa ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      )}
    </div>
  );
}

// Aviso flotante de "listo" (comprar, pedir, avisar). Uno solo, en AutocinemaDemo.
let mostrar = () => {};
export function avisarListo(texto) { mostrar(texto); }
export function AvisoListo() {
  const [texto, setTexto] = useState(null);
  useEffect(() => {
    let id;
    mostrar = (t) => { setTexto(t); clearTimeout(id); id = setTimeout(() => setTexto(null), 2800); };
    return () => { mostrar = () => {}; clearTimeout(id); };
  }, []);
  if (!texto) return null;
  return <div className="ac-aviso-flotante" role="status"><CheckCircle2 size={18} /> {texto}</div>;
}

// Mapa del lugar: pantalla arriba, zona peatonal y casas de campaña al frente,
// primera fila (A) y filas B–F de autos.
//   modo 'compra'  → solo se tocan los libres de `zona`; `elegido` en verde
//   modo 'vivo'    → entrada y dueño: adentro (verde) · vendido sin llegar (contorno) · libre
export function Mapa({ e, funcion, modo = 'compra', zona, elegido, alElegir, recien, mio }) {
  const oc = ocupados(e, funcion);
  const adentro = new Set(ventasDe(e, funcion).filter((v) => v.entro).map((v) => v.lugar));
  const clase = (l, z) => {
    if (modo === 'compra') {
      if (l === elegido) return 'elegido';
      if (z !== zona) return 'fuera';
      return oc.has(l) ? 'vendido' : 'libre';
    }
    if (l === mio) return 'mio';
    if (adentro.has(l)) return `adentro${l === recien ? ' recien' : ''}`;
    if (oc.has(l)) return 'esperando';
    return 'fuera';
  };
  const lugar = (l, z, extra = '') => {
    const c = clase(l, z);
    const tocable = modo === 'compra' && (c === 'libre' || c === 'elegido');
    return (
      <button key={l} type="button" className={`ac-lugar ${extra} ${c}`} disabled={!tocable && modo === 'compra'}
        onClick={tocable ? () => alElegir?.(l) : undefined} aria-label={l} title={l} tabIndex={tocable ? 0 : -1}>
        {extra === 'auto' && c === 'libre' ? <CarFront /> : l.split('-')[1]}
      </button>
    );
  };
  const filas = [['A', 'vip'], ...['B', 'C', 'D', 'E', 'F'].map((f) => [f, 'auto'])];
  return (
    <div className="ac-mapa">
      <div className="ac-pantalla" />
      <div className="ac-pantalla-txt">PANTALLA</div>
      <div className="ac-mapa-frente">
        <div className="ac-mapa-zona">
          <small>Zona peatonal</small>
          <div className="ac-peatonal">{ZONAS.peatonal.lugares.map((l) => lugar(l, 'peatonal', 'p'))}</div>
        </div>
        <div className="ac-mapa-zona">
          <small>Casas de campaña</small>
          <div className="ac-tiendas">{ZONAS.campana.lugares.map((l) => lugar(l, 'campana', 't'))}</div>
        </div>
      </div>
      <div className="ac-mapa-filas">
        {filas.map(([f, z]) => (
          <div key={f} className="ac-mapa-fila">
            <em>{f}</em>
            {(z === 'vip' ? ZONAS.vip.lugares : ZONAS.auto.lugares.filter((l) => l.startsWith(f + '-'))).map((l) => lugar(l, z, 'auto'))}
          </div>
        ))}
      </div>
      <div className="ac-leyenda">
        {modo === 'compra' ? (<>
          <span><i className="l-libre" />Libre</span>
          <span><i className="l-vendido" />Vendido</span>
          <span><i className="l-tuyo" />Tu lugar</span>
        </>) : (<>
          <span><i className="l-adentro" />Ya llegó</span>
          <span><i className="l-espera" />Por llegar</span>
        </>)}
      </div>
    </div>
  );
}

export function useAhora(cada = 1000) {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setT(Date.now()), cada); return () => clearInterval(id); }, [cada]);
  return t;
}

export const minutos = (desde, ahora = Date.now()) => Math.max(0, Math.round((ahora - desde) / 60000));

// ── color de cada película ──────────────────────────────────────────────────
// El boleto toma el color del póster: se reduce la imagen a 12×18, se queda
// con los pixeles con más color y se oscurece para que el texto blanco se lea.
// Wikimedia y las fotos locales permiten leerla (CORS); si falla, gris noche.
const tonos = new Map();
export function useTono(src) {
  const [tono, setTono] = useState(() => tonos.get(src) || null);
  useEffect(() => {
    if (!src || tonos.has(src)) { setTono(tonos.get(src) || null); return; }
    let vivo = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = 12; c.height = 18;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, 12, 18);
        const d = x.getImageData(0, 0, 12, 18).data;
        const px = [];
        for (let i = 0; i < d.length; i += 4) {
          const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          px.push({ r, g, b, sat: max ? (max - min) / max : 0, luz: max });
        }
        const vivos = px.filter((p) => p.luz > 50 && p.luz < 245).sort((a, b) => b.sat - a.sat).slice(0, Math.max(8, px.length / 5));
        const m = vivos.reduce((a, p) => ({ r: a.r + p.r, g: a.g + p.g, b: a.b + p.b }), { r: 0, g: 0, b: 0 });
        const n = vivos.length || 1;
        let [r, g, b] = [m.r / n, m.g / n, m.b / n];
        const k = Math.min(1, 150 / Math.max(r, g, b, 1));   // tope de brillo
        [r, g, b] = [r * k, g * k, b * k].map((v) => Math.round(Math.max(28, v)));
        const t = `rgb(${r}, ${g}, ${b})`;
        tonos.set(src, t);
        if (vivo) setTono(t);
      } catch { tonos.set(src, null); }
    };
    // de TMDB basta la miniatura de 92 px (pesa nada y no choca con la copia grande en caché)
    img.src = src.replace('/t/p/w780/', '/t/p/w92/');
    return () => { vivo = false; };
  }, [src]);
  return tono || '#2A3350';
}
