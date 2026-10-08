import { useId } from 'react';
import { iniciales } from './datos';

export { useAncho } from '../pedidos/ui';

// Piezas visuales del gimnasio. Los colores salen de variables (--g-*) que
// GimnasioDemo.jsx define con la marca del negocio (gym_negocios.marca).

export const g = {
  pri: 'var(--g-pri)', priTexto: 'var(--g-pri-texto)', fondo: 'var(--g-fondo)', sup: 'var(--g-sup)',
  sup2: 'var(--g-sup2)', texto: 'var(--g-texto)', suave: 'var(--g-suave)', linea: 'rgba(255,255,255,0.08)',
  verde: 'var(--g-verde)', rojo: 'var(--g-rojo)', ambar: 'var(--g-ambar)',
  display: "'Barlow Condensed', 'Oswald', 'Arial Narrow', sans-serif",
  texto2: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
};

// Barlow Condensed para números y titulares (look de gimnasio), una vez por página.
export function cargarFuentesGym() {
  if (document.getElementById('fuentes-gym')) return;
  const link = document.createElement('link');
  link.id = 'fuentes-gym';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@1,125,900&family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,700&family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}

// Logo PROVISIONAL (Manhattan aún no nos da el suyo): skyline dibujado a mano sobre
// las iniciales en cromo con filo de color de marca, al estilo de su Instagram.
// Edificios: [x, ancho, alto] sobre una base en y=40 (viewBox de 120 de ancho).
const EDIFICIOS = [
  [0, 6, 10], [6, 6, 16], [12, 7, 13], [19, 5, 21], [24, 7, 15], [31, 6, 24], [37, 5, 18], [42, 7, 26],
  [49, 4, 17], [53, 14, 22], [55, 10, 28], [57, 6, 32], [59, 2, 36], [59.6, 0.8, 40], [67, 5, 19],
  [72, 8, 23], [80, 8, 30], [83, 2, 34], [88, 6, 20], [94, 7, 25], [101, 5, 15], [106, 7, 19], [113, 7, 11],
];
const SKYLINE = EDIFICIOS.map(([x, w, h]) => `M${x} 40V${40 - h}H${x + w}V40Z`).join('');
// Ventanitas solo en los edificios anchos, para que se lea como ciudad y no como gráfica.
const VENTANAS = EDIFICIOS.filter(([, w, h]) => w >= 6 && h >= 15).flatMap(([x, w, h]) => {
  const filas = [];
  for (let y = 40 - h + 3; y < 37; y += 3.4) filas.push(`M${x + 1.4} ${y}h1.3v1.5h-1.3ZM${x + w - 2.7} ${y}h1.3v1.5h-1.3Z`);
  return filas;
}).join('');

export function Emblema({ siglas = 'GFM', ancho = 76 }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 120 64" width={ancho} height={(ancho * 64) / 120} aria-hidden="true" style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}>
      <defs>
        <linearGradient id={`cromo${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.42" stopColor="#E4E6EA" />
          <stop offset="0.5" stopColor="#8B9099" />
          <stop offset="0.56" stopColor="#5E636B" />
          <stop offset="0.78" stopColor="#D3D6DB" />
          <stop offset="1" stopColor="#F7F8FA" />
        </linearGradient>
      </defs>
      <path d={SKYLINE} style={{ fill: 'var(--g-pri)' }} />
      <path d={VENTANAS} style={{ fill: 'var(--g-fondo)' }} opacity="0.55" />
      <text x="60" y="62" textAnchor="middle" textLength="114" lengthAdjust="spacingAndGlyphs" fill={`url(#cromo${id})`}
        strokeWidth="2.4" strokeLinejoin="round" paintOrder="stroke"
        style={{ stroke: 'var(--g-pri)', fontFamily: "'Archivo', 'Arial Black', sans-serif", fontWeight: 900, fontStretch: '125%', fontSize: 29, fontStyle: 'italic' }}>
        {siglas}
      </text>
    </svg>
  );
}

export function Logo({ nombre = 'GYM Fitness Manhattan', tamano = 1 }) {
  const partes = nombre.split(' ');
  const siglas = partes.map((p) => p[0]).join('').toUpperCase();
  const grande = partes.pop();
  return (
    <div role="img" aria-label={nombre} style={{ display: 'flex', alignItems: 'center', gap: 12 * tamano }}>
      <Emblema siglas={siglas} ancho={84 * tamano} />
      <div style={{ lineHeight: 0.95, paddingLeft: 12 * tamano, borderLeft: `2px solid ${g.pri}` }}>
        <div style={{ fontSize: `${0.6 * tamano}rem`, letterSpacing: '0.3em', color: g.suave, fontWeight: 600, fontFamily: g.texto2 }}>
          {partes.join(' · ').toUpperCase()}
        </div>
        <div style={{ fontFamily: g.display, fontWeight: 800, fontSize: `${1.4 * tamano}rem`, letterSpacing: '0.06em', color: g.texto }}>
          {grande.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

export function Tarjeta({ children, style, titulo, accion }) {
  return (
    <section style={{ background: g.sup, border: `1px solid ${g.linea}`, borderRadius: 22, padding: 18, ...style }}>
      {(titulo || accion) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px 12px', marginBottom: 14 }}>
          {titulo && <h3 style={{ margin: 0, color: g.texto, fontFamily: g.display, fontWeight: 700, fontSize: '1.15rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{titulo}</h3>}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Boton({ children, variante = 'primario', style, ...resto }) {
  const variantes = {
    primario: { background: g.pri, color: g.priTexto },
    verde: { background: g.verde, color: '#06210F' },
    peligro: { background: 'rgba(239,68,68,0.14)', color: '#FCA5A5' },
    suave: { background: g.sup2, color: g.texto },
    borde: { background: 'transparent', color: g.texto, border: `1px solid ${g.linea}` },
  };
  return (
    <button type="button" {...resto} style={{
      border: 'none', borderRadius: 14, padding: '12px 16px', fontSize: '0.95rem', fontWeight: 700, fontFamily: g.texto2,
      cursor: resto.disabled ? 'default' : 'pointer', opacity: resto.disabled ? 0.5 : 1, display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', gap: 8, ...variantes[variante], ...style,
    }}>{children}</button>
  );
}

export function Etiqueta({ children, color = g.suave, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: '0.74rem',
      fontWeight: 700, letterSpacing: '0.02em', color, background: `color-mix(in srgb, ${color} 14%, transparent)`,
      whiteSpace: 'nowrap', ...style,
    }}>{children}</span>
  );
}

export function Avatar({ nombre, tamano = 44, color = g.pri }) {
  return (
    <div aria-hidden="true" style={{
      width: tamano, height: tamano, borderRadius: '50%', flexShrink: 0, background: `color-mix(in srgb, ${color} 20%, ${g.sup2})`,
      color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: g.display, fontWeight: 800,
      fontSize: tamano * 0.4, letterSpacing: '0.02em',
    }}>{iniciales(nombre)}</div>
  );
}

// Medidor de aforo: arco de 240° con el porcentaje.
export function Medidor({ pct, color, tamano = 180, children }) {
  const r = 42;
  const largo = (2 * Math.PI * r * 240) / 360;
  const lleno = Math.min(1, Math.max(0, pct / 100)) * largo;
  return (
    <div style={{ position: 'relative', width: tamano, height: tamano * 0.86, margin: '0 auto' }}>
      <svg viewBox="0 0 100 86" width={tamano} height={tamano * 0.86} style={{ display: 'block' }}>
        <g transform="rotate(150 50 50)">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${largo} 999`} />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${lleno} 999`} style={{ transition: 'stroke-dasharray .8s ease, stroke .4s' }} />
        </g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: tamano * 0.06 }}>
        {children}
      </div>
    </div>
  );
}

export function Segmentado({ opciones, valor, alCambiar }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: g.sup2, borderRadius: 14 }}>
      {opciones.map((o) => (
        <button key={o.id} type="button" onClick={() => alCambiar(o.id)} style={{
          flex: 1, minWidth: 0, border: 'none', borderRadius: 10, padding: '9px 8px', cursor: 'pointer', fontFamily: g.texto2,
          fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.2, background: valor === o.id ? g.pri : 'transparent',
          color: valor === o.id ? g.priTexto : g.suave,
        }}>{o.etiqueta}</button>
      ))}
    </div>
  );
}

export function Numero({ valor, etiqueta, sub, color = g.texto }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: g.suave, fontWeight: 600 }}>{etiqueta}</div>
      <div style={{ fontFamily: g.display, fontWeight: 800, fontSize: '2.3rem', lineHeight: 1.05, color }}>{valor}</div>
      {sub && <div style={{ fontSize: '0.8rem', color: g.suave }}>{sub}</div>}
    </div>
  );
}
