import { useId, useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import {
  ARMADO_BASE, MAX_TALLOS, MIN_TALLOS, PAPELES, TALLOS, agregarAlCarrito, cuantosTallos, papel, peso, precioArmado, producto, useFlores,
} from './datos';
import { Foto, avisarListo } from './comun';
import { useNav } from './Sitio';

// ─────────────────────────────────────────────────────────────────────────────
// ARMA TU RAMO — se elige tallo por tallo y el ramo se compone en pantalla con
// las flores recortadas (fondo transparente) acomodadas en domo; el papel va
// adelante tapando los tallos y el listón encima.
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS = [
  { nombre: 'Romántico', tallos: { rosa: 7, peonia: 3, eucalipto: 4 }, papel: 'vino' },
  { nombre: 'Alegre', tallos: { girasol: 3, tulipan: 5, ranunculo: 3, eucalipto: 2 }, papel: 'kraft' },
  { nombre: 'Suave', tallos: { peonia: 3, ranunculo: 4, alcatraz: 2, eucalipto: 3 }, papel: 'rosa' },
  { nombre: 'Dalia', tallos: { dalia: 5, ranunculo: 3, eucalipto: 3 }, papel: 'negro' },
];

// pseudoazar fijo por posición: el ramo no "baila" al volver a pintarse
const ruido = (i, s = 1) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };

// Dónde está la cabeza de cada flor dentro de su foto recortada (fracción del
// ancho y del alto, medido en los PNG de Codex) y qué tan ancha se ve la flor
// (`d`, fracción del ancho de la foto). `escala` = tamaño real relativo.
const CABEZA = {
  rosa: { x: 0.46, y: 0.2, d: 0.5, escala: 0.9 },
  dalia: { x: 0.49, y: 0.24, d: 0.66, escala: 1.12 },
  tulipan: { x: 0.42, y: 0.17, d: 0.45, escala: 0.82 },
  peonia: { x: 0.45, y: 0.22, d: 0.7, escala: 1.15 },
  ranunculo: { x: 0.56, y: 0.2, d: 0.6, escala: 0.88 },
  girasol: { x: 0.42, y: 0.22, d: 0.58, escala: 1.08 },
  alcatraz: { x: 0.46, y: 0.17, d: 0.4, escala: 0.85 },
  eucalipto: { x: 0.58, y: 0.4, d: 0.5, escala: 1 },
};
const AMARRE = { x: 50, y: 103 };   // en unidades del cuadro (100 de ancho × 125 de alto)
const ORO = Math.PI * (3 - Math.sqrt(5));   // ángulo áureo: la espiral del girasol

// Reparte parejo: las cabezas se empujan entre sí hasta traslaparse solo un
// poco (como en un ramo real) sin salirse del domo, con un leve jalón al
// centro para que no queden huecos. Determinista: mismo ramo, mismo acomodo.
function repartir(cabezas, cx, cy, rx, ry) {
  for (let it = 0; it < 60; it++) {
    for (let i = 0; i < cabezas.length; i++) {
      for (let j = i + 1; j < cabezas.length; j++) {
        const a = cabezas[i], b = cabezas[j];
        let dx = b.x - a.x, dy = (b.y - a.y) * 1.15;
        let dist = Math.hypot(dx, dy);
        if (dist < 0.01) { dx = 0.5; dy = 0.3; dist = 0.58; }
        const min = (a.r + b.r) * 0.8;
        if (dist < min) {
          const k = (min - dist) / dist / 2;
          a.x -= dx * k; a.y -= (dy * k) / 1.15;
          b.x += dx * k; b.y += (dy * k) / 1.15;
        }
      }
    }
    cabezas.forEach((c) => {
      c.x += (cx - c.x) * 0.012; c.y += (cy - c.y) * 0.012;
      const e = ((c.x - cx) / rx) ** 2 + ((c.y - cy) / ry) ** 2;
      if (e > 1) { const f = 1 / Math.sqrt(e); c.x = cx + (c.x - cx) * f; c.y = cy + (c.y - cy) * f; }
    });
  }
  return cabezas;
}

// El ramo como DOMO: las cabezas parten de una espiral de girasol dentro de
// un óvalo (las grandes tienden al centro) y luego se reparten parejo; cada
// tallo apunta al amarre y, entre más flores, más chicas se ven. El follaje
// va en la orilla, atrás. Papel: hoja trasera fruncida con picos y dos hojas
// al frente que se cruzan en V, moño con lazos y colas, y los tallos cortados
// asomando abajo. Medidas en `cqw` (el cuadro es contenedor) para que el
// mismo ramo sirva grande o en miniatura.
export function RamoVivo({ tallos, papelId, className = '' }) {
  const pa = papel(papelId);
  const uid = useId().replace(/:/g, '');
  const { flores, follaje } = useMemo(() => {
    const grupos = TALLOS.filter((t) => t.id !== 'eucalipto').map((t) => Array.from({ length: tallos[t.id] || 0 }, (_, k) => ({ t, k })));
    const mezcla = [];
    const max = Math.max(0, ...grupos.map((g) => g.length));
    for (let k = 0; k < max; k++) grupos.forEach((g) => { if (g[k]) mezcla.push(g[k]); });
    mezcla.forEach((x, i) => { x.orden = (2 - CABEZA[x.t.id].escala) + ruido(i, 7) * 0.5; });
    mezcla.sort((a, b) => a.orden - b.orden);
    const n = mezcla.length;
    const rx = Math.min(40, 14 + 4.8 * Math.sqrt(n));
    const ry = rx * 0.62;
    const cy = 66 - ry * 0.75;
    const d = Math.min(32, Math.max(12, 1.3 * Math.sqrt((Math.PI * rx * ry) / Math.max(n, 1))));
    const ubicar = (x, cx0, cy0, ancho) => {
      const c = CABEZA[x.t.id];
      const ang = Math.atan2(-(AMARRE.x - cx0), AMARRE.y - cy0) * (180 / Math.PI);
      return { ...x, cx: cx0, cy: cy0, ancho, ang, c };
    };
    const cabezas = repartir(mezcla.map((x, i) => {
      const r = n === 1 ? 0 : Math.sqrt((i + 0.6) / n);
      const th = i * ORO + 0.4;
      return { x: 50 + rx * r * Math.cos(th), y: cy + ry * r * Math.sin(th), r: (d * CABEZA[x.t.id].escala) / 2 };
    }), 50, cy, rx, ry);
    const fl = mezcla.map((x, i) => {
      const c = CABEZA[x.t.id];
      // un pelo más grandes las de abajo (están más cerca)
      const cerca = 1 + ((cabezas[i].y - cy) / Math.max(ry, 1)) * 0.06;
      return ubicar(x, cabezas[i].x, cabezas[i].y, ((d * c.escala) / c.d) * cerca);
    });
    const m = tallos.eucalipto || 0;
    const fo = Array.from({ length: m }, (_, k) => {
      const t = m === 1 ? 0.5 : k / (m - 1);
      const th = Math.PI * (1.08 + 0.84 * t);   // arco de arriba, de izquierda a derecha
      const px = 50 + (rx + 4) * Math.cos(th);
      const py = cy + (ry + 6) * Math.sin(th) - 2;
      return ubicar({ t: TALLOS.find((x) => x.id === 'eucalipto'), k }, px, py, Math.max(22, d * 1.7));
    });
    return { flores: fl, follaje: fo };
  }, [tallos]);

  const total = flores.length + follaje.length;
  const liston = pa.id === 'vino' || pa.id === 'negro' ? '#E9C6C2' : '#6E1F2E';
  const pinta = (x, z, atras) => (
    <img key={`${x.t.id}-${x.k}`} src={`/florerias/${x.t.foto}.webp`} alt="" draggable={false}
      className={`fl-ramo-tallo ${atras ? 'atras' : ''}`}
      style={{
        left: `${x.cx}cqw`, top: `${x.cy}cqw`, width: `${x.ancho}cqw`, zIndex: z,
        transformOrigin: `${x.c.x * 100}% ${x.c.y * 100}%`,
        transform: `translate(${-x.c.x * 100}%, ${-x.c.y * 100}%) rotate(${x.ang}deg)`,
      }} />
  );

  return (
    <div className={`fl-ramo ${total === 0 ? 'vacio' : ''} ${className}`} aria-label={`Ramo de ${cuantosTallos(tallos)} tallos en papel ${pa.nombre}`} role="img">
      {/* hoja trasera, fruncida en picos detrás de las flores */}
      <svg className="fl-ramo-papel atras" viewBox="0 0 100 125" aria-hidden="true">
        <defs>
          <linearGradient id={`t${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: `color-mix(in srgb, ${pa.color} 78%, #fff)` }} />
            <stop offset="1" stopColor={pa.borde} />
          </linearGradient>
        </defs>
        <path d="M50 104 L9 60 Q12 50 22 52 L27 40 Q36 33 43 41 L50 31 Q58 30 61 40 L70 36 Q80 37 80 48 L91 58 Z" fill={`url(#t${uid})`} />
        <path d="M27 40 L44 96 M50 31 L50 100 M70 36 L56 96" stroke="#000" strokeOpacity=".08" strokeWidth=".5" fill="none" />
      </svg>
      {/* tallos que bajan al amarre (los de la foto a veces no alcanzan) */}
      <svg className="fl-ramo-tallos" viewBox="0 0 100 125" aria-hidden="true">
        {[...follaje, ...flores].map((x) => <line key={`l-${x.t.id}-${x.k}`} x1={x.cx} y1={x.cy} x2={AMARRE.x + (x.cx - 50) * 0.06} y2={AMARRE.y} />)}
      </svg>
      {follaje.map((x, i) => pinta(x, 2 + i, true))}
      {flores.map((x) => pinta(x, 10 + Math.round(x.cy), false))}
      {/* dos hojas al frente que se cruzan en V, tallos cortados y moño */}
      <svg className="fl-ramo-papel" viewBox="0 0 100 125" aria-hidden="true">
        <defs>
          <linearGradient id={`i${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={pa.color} />
            <stop offset=".55" stopColor={pa.color} />
            <stop offset="1" stopColor={pa.borde} />
          </linearGradient>
          <linearGradient id={`d${uid}`} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor={pa.color} />
            <stop offset="1" stopColor={pa.borde} />
          </linearGradient>
        </defs>
        <g className="fl-ramo-cortes">
          {[-3.5, -1.75, 0, 1.75, 3.5].map((o) => <line key={o} x1={50 + o * 0.7} y1="101" x2={50 + o * 1.25} y2="119" />)}
        </g>
        <path d="M3 70 Q8.5 72.5 14 73.5 Q19.5 77.5 27 78 Q33 81.5 40 81.6 Q46 83.8 52 83 L53 104 L46.5 104 Z" fill={`url(#i${uid})`} />
        <path d="M97 68 Q91.5 71 86 72 Q80.5 76 73 77 Q67 81 60 81.6 Q53.5 84.2 47 84 L50 104 L55 104 Z" fill={`url(#d${uid})`} />
        <path d="M22 78.5 L47.5 103 M36 83 L49 103.5 M78 77.5 L53.5 103" stroke="#000" strokeOpacity=".1" strokeWidth=".45" fill="none" />
        <path d="M3 70 Q8.5 72.5 14 73.5 Q19.5 77.5 27 78 Q33 81.5 40 81.6 Q46 83.8 52 83" stroke="#fff" strokeOpacity=".45" strokeWidth=".6" fill="none" />
        <path d="M97 68 Q91.5 71 86 72 Q80.5 76 73 77 Q67 81 60 81.6 Q53.5 84.2 47 84" stroke="#fff" strokeOpacity=".25" strokeWidth=".5" fill="none" />
        <g fill={liston} stroke="#000" strokeOpacity=".18" strokeWidth=".25">
          <path d="M49 101.5 L43.6 115.5 L46.2 114.6 L47.6 117.4 L50.6 102.5 Z" />
          <path d="M51 101.5 L57 115 L54.4 114.4 L53.4 117.2 L49.6 102.5 Z" />
          <path d="M44.8 99 L55.2 99 L55.6 102.6 L44.4 102.6 Z" />
          <path d="M50 100.8 C44 93.5 36.5 95.5 38.6 100.6 C40.6 105 46 103 50 100.8 Z" />
          <path d="M50 100.8 C56 93.5 63.5 95.5 61.4 100.6 C59.4 105 54 103 50 100.8 Z" />
          <rect x="48.3" y="99" width="3.4" height="3.6" rx="1" />
        </g>
      </svg>
      {total === 0 && <p className="fl-ramo-vacio">Agrega flores para empezar</p>}
    </div>
  );
}

export default function Armar({ inicial }) {
  const e = useFlores();
  const { ir } = useNav();
  const [tallos, setTallos] = useState(() => (inicial ? { [inicial]: 3, eucalipto: 2 } : {}));
  const [papelId, setPapel] = useState('kraft');
  const n = cuantosTallos(tallos);
  const total = precioArmado(tallos);

  const poner = (id, d) => setTallos((t) => {
    const q = Math.max(0, Math.min((t[id] || 0) + d, e.inventario[id] ?? 0));
    if (d > 0 && cuantosTallos(t) >= MAX_TALLOS) return t;
    const sig = { ...t, [id]: q };
    if (!q) delete sig[id];
    return sig;
  });

  const agregar = () => {
    agregarAlCarrito({ tipo: 'armado', tallos, papel: papelId, extras: [] });
    avisarListo('Tu ramo está en el carrito');
    ir('carrito');
  };

  return (
    <div className="fl-envoltura fl-armar">
      <div className="fl-armar-vista">
        <RamoVivo tallos={tallos} papelId={papelId} />
        <div className="fl-armar-cuenta">
          <span><b>{n}</b> {n === 1 ? 'tallo' : 'tallos'}</span>
          <b>{peso(total)}</b>
          <small>{n < MIN_TALLOS ? `Faltan ${MIN_TALLOS - n} para armarlo` : 'Listo para agregar'}</small>
        </div>
      </div>

      <div className="fl-armar-panel">
        <p className="fl-cejilla">Arma tu ramo</p>
        <h1>Tú eliges <em>cada tallo</em></h1>
        <p className="fl-suave">Mínimo {MIN_TALLOS}, máximo {MAX_TALLOS}. Incluye papel, listón, hidratación para el viaje y el armado ({peso(ARMADO_BASE)}).</p>

        <div className="fl-presets" role="group" aria-label="Empezar con una idea">
          <span>Empieza con una idea:</span>
          {PRESETS.map((p) => (
            <button key={p.nombre} type="button" onClick={() => {
              // la idea se ajusta a lo que hay en el cuarto frío
              const t = Object.fromEntries(Object.entries(p.tallos).map(([k, q]) => [k, Math.min(q, e.inventario[k] ?? 0)]).filter(([, q]) => q > 0));
              setTallos(t); setPapel(p.papel);
            }}>{p.nombre}</button>
          ))}
        </div>

        <ul className="fl-tallos">
          {TALLOS.map((t) => {
            const q = tallos[t.id] || 0;
            const hay = e.inventario[t.id] ?? 0;
            return (
              <li key={t.id} className={hay === 0 ? 'agotado' : ''}>
                <span className="fl-tallo-foto" style={{ '--c': t.color }}><img src={`/florerias/${t.foto}.webp`} alt="" /></span>
                <div>
                  <b>{t.nombre}</b>
                  <small>{peso(t.precio)} c/u{hay === 0 ? ' · agotado hoy' : hay < 15 ? ` · quedan ${hay}` : ''}</small>
                </div>
                <div className="fl-contador">
                  <button type="button" onClick={() => poner(t.id, -1)} disabled={!q} aria-label={`Quitar ${t.nombre}`}><Minus size={15} /></button>
                  <output aria-live="polite">{q}</output>
                  <button type="button" onClick={() => poner(t.id, 1)} disabled={q >= hay || n >= MAX_TALLOS} aria-label={`Agregar ${t.nombre}`}><Plus size={15} /></button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="fl-bloque">
          <h4>Papel</h4>
          <div className="fl-papeles" role="radiogroup" aria-label="Papel">
            {PAPELES.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={papelId === p.id} className={papelId === p.id ? 'activo' : ''} onClick={() => setPapel(p.id)}>
                <i style={{ background: p.color }} /> {p.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="fl-comprar">
          <div><small>{n < MIN_TALLOS ? `Faltan ${MIN_TALLOS - n} ${MIN_TALLOS - n === 1 ? 'tallo' : 'tallos'}` : 'Total'}</small><b>{peso(total)}</b></div>
          {n > 0 && <button type="button" className="fl-boton linea" onClick={() => setTallos({})} aria-label="Empezar de nuevo"><RotateCcw size={16} /></button>}
          <button type="button" className="fl-boton" disabled={n < MIN_TALLOS} onClick={agregar}>Agregar al carrito</button>
        </div>
      </div>
    </div>
  );
}

// Foto de un renglón del pedido: la del producto o, si lo armaron, el ramo compuesto.
export function FotoItem({ it, className = '' }) {
  if (it.tipo === 'armado') return <div className={`fl-foto fl-foto-armado ${className}`}><RamoVivo tallos={it.tallos} papelId={it.papel} /></div>;
  return <Foto nombre={producto(it.id).foto} texto={producto(it.id).nombre} className={className} />;
}
