import { useEffect, useId, useRef } from 'react';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { iniciales } from './datos';

export { useAncho } from '../pedidos/ui';

// ─────────────────────────────────────────────────────────────────────────────
// Piezas visuales del gimnasio — estilo "Pulso": negro profundo, tarjetas con
// un leve degradado, y el color de la marca como degradado (primario → primario2)
// que brilla: anillos, números y el botón del QR. Los colores salen de variables
// (--g-*) que GimnasioDemo.jsx define con gym_negocios.marca.
// ─────────────────────────────────────────────────────────────────────────────

export const g = {
  pri: 'var(--g-pri)', pri2: 'var(--g-pri2)', priTexto: 'var(--g-pri-texto)',
  grad: 'linear-gradient(135deg, var(--g-pri), var(--g-pri2))',
  fondo: 'var(--g-fondo)', sup: 'var(--g-sup)', sup2: 'var(--g-sup2)',
  tarjeta: 'linear-gradient(180deg, color-mix(in srgb, var(--g-sup), white 3.5%), var(--g-sup))',
  texto: 'var(--g-texto)', suave: 'var(--g-suave)', tenue: 'var(--g-tenue)', linea: 'rgba(255,255,255,0.06)',
  verde: 'var(--g-verde)', rojo: 'var(--g-rojo)', ambar: 'var(--g-ambar)', azul: '#60A5FA',
  fuente: "'Sora', -apple-system, 'Segoe UI', Roboto, sans-serif",
};

// Sora para todo (números redondos y legibles) y Archivo extendida para las
// siglas del logo. Más las animaciones globales, una vez por página.
export function cargarFuentesGym() {
  if (document.getElementById('fuentes-gym')) return;
  const link = document.createElement('link');
  link.id = 'fuentes-gym';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@1,125,900&family=Sora:wght@300;400;500;600;700;800&display=swap';
  document.head.appendChild(link);
  const css = document.createElement('style');
  css.id = 'estilos-gym';
  css.textContent = `
    @keyframes g-latido { 0% { box-shadow: 0 0 0 0 currentColor; } 70% { box-shadow: 0 0 0 7px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
    @keyframes g-barrido { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
    @keyframes g-brillo { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
    @keyframes g-carga { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .g-sin-barra { scrollbar-width: none; } .g-sin-barra::-webkit-scrollbar { display: none; }
    .g-app input::placeholder { color: var(--g-tenue); }
    .g-app button { font-family: inherit; }
  `;
  document.head.appendChild(css);
}

export const degradadoTexto = { background: 'linear-gradient(135deg, var(--g-pri), var(--g-pri2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };

// ── Logo PROVISIONAL (Manhattan aún no nos da el suyo): skyline dibujado a mano
// sobre las iniciales en cromo con filo de color de marca, al estilo de su
// Instagram. Edificios: [x, ancho, alto] sobre una base en y=40 (viewBox de 120).
const EDIFICIOS = [
  [0, 6, 10], [6, 6, 16], [12, 7, 13], [19, 5, 21], [24, 7, 15], [31, 6, 24], [37, 5, 18], [42, 7, 26],
  [49, 4, 17], [53, 14, 22], [55, 10, 28], [57, 6, 32], [59, 2, 36], [59.6, 0.8, 40], [67, 5, 19],
  [72, 8, 23], [80, 8, 30], [83, 2, 34], [88, 6, 20], [94, 7, 25], [101, 5, 15], [106, 7, 19], [113, 7, 11],
];
const SKYLINE = EDIFICIOS.map(([x, w, h]) => `M${x} 40V${40 - h}H${x + w}V40Z`).join('');
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
        <linearGradient id={`cielo${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--g-pri)' }} />
          <stop offset="1" style={{ stopColor: 'var(--g-pri2)' }} />
        </linearGradient>
      </defs>
      <path d={SKYLINE} fill={`url(#cielo${id})`} />
      <path d={VENTANAS} style={{ fill: 'var(--g-fondo)' }} opacity="0.55" />
      <text x="60" y="62" textAnchor="middle" textLength="114" lengthAdjust="spacingAndGlyphs" fill={`url(#cromo${id})`}
        strokeWidth="2.4" strokeLinejoin="round" paintOrder="stroke"
        style={{ stroke: 'var(--g-pri)', fontFamily: "'Archivo', 'Arial Black', sans-serif", fontWeight: 900, fontStretch: '125%', fontSize: 29, fontStyle: 'italic' }}>
        {siglas}
      </text>
    </svg>
  );
}

// Logo completo: emblema + nombre. `compacto` = solo "GFM MANHATTAN" en una línea.
export function Logo({ nombre = 'GYM Fitness Manhattan', tamano = 1, compacto = false }) {
  const partes = nombre.split(' ');
  const siglas = partes.map((p) => p[0]).join('').toUpperCase();
  const grande = partes[partes.length - 1];
  if (compacto) {
    return (
      <div role="img" aria-label={nombre} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, letterSpacing: '0.12em', fontSize: 15 * tamano }}>
        <span style={degradadoTexto}>{siglas}</span><span>{grande.toUpperCase()}</span>
      </div>
    );
  }
  return (
    <div role="img" aria-label={nombre} style={{ display: 'flex', alignItems: 'center', gap: 12 * tamano }}>
      <Emblema siglas={siglas} ancho={64 * tamano} />
      <div style={{ lineHeight: 1.05 }}>
        <div style={{ fontSize: 9.5 * tamano, letterSpacing: '0.28em', color: g.suave, fontWeight: 600 }}>
          {partes.slice(0, -1).join(' · ').toUpperCase()}
        </div>
        <div style={{ fontWeight: 800, fontSize: 19 * tamano, letterSpacing: '0.06em', color: g.texto }}>{grande.toUpperCase()}</div>
      </div>
    </div>
  );
}

// ── Tarjeta: el bloque base. Con onClick se vuelve botón (se hunde al tocarla).
export function Tarjeta({ children, titulo, accion, style, onClick, brillo = false, pad = 18 }) {
  const Comp = onClick ? motion.button : motion.section;
  return (
    <Comp type={onClick ? 'button' : undefined} onClick={onClick} whileTap={onClick ? { scale: 0.985 } : undefined}
      style={{
        position: 'relative', overflow: 'hidden', background: g.tarjeta, border: `1px solid ${g.linea}`, borderRadius: 26,
        padding: pad, color: g.texto, textAlign: 'left', width: onClick ? '100%' : undefined, cursor: onClick ? 'pointer' : undefined,
        display: 'block', boxSizing: 'border-box', ...style,
      }}>
      {brillo && <div aria-hidden="true" style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', top: -110, right: -110, background: 'radial-gradient(color-mix(in srgb, var(--g-pri) 30%, transparent), transparent 70%)', pointerEvents: 'none' }} />}
      {(titulo || accion) && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {titulo && <h3 style={{ margin: 0, color: g.texto, fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{titulo}</h3>}
          {accion}
        </div>
      )}
      <div style={{ position: 'relative' }}>{children}</div>
    </Comp>
  );
}

export function Chip({ children, color = 'var(--g-pri)', style, punto = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 99, fontSize: 11.5, fontWeight: 600,
      color, background: `color-mix(in srgb, ${color} 14%, transparent)`, whiteSpace: 'nowrap', lineHeight: 1.2, ...style,
    }}>
      {punto && <span style={{ width: 6, height: 6, borderRadius: 9, background: 'currentColor', color, animation: 'g-latido 1.8s infinite' }} />}
      {children}
    </span>
  );
}

export const EnVivo = ({ texto = 'En vivo' }) => <Chip punto>{texto}</Chip>;

export function IconoCirculo({ icono: Icono, color = 'var(--g-pri)', tamano = 38, fondo }) {
  return (
    <div style={{
      width: tamano, height: tamano, borderRadius: '50%', flexShrink: 0, background: fondo || 'color-mix(in srgb, var(--g-sup2), white 2%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color,
    }}><Icono size={tamano * 0.47} strokeWidth={2.1} /></div>
  );
}

// ── Anillo con degradado y brillo. valor de 0 a 1; `interior` = segundo anillo.
export function Anillo({ valor, tamano = 200, grosor = 14, interior, color, children, brillo = true }) {
  const id = useId().replace(/:/g, '');
  const r = (tamano - grosor) / 2 - 4;
  const ri = r - grosor - 6;
  const trazo = color || `url(#a${id})`;
  const v = Math.max(0, Math.min(1, valor || 0));
  return (
    <div style={{ position: 'relative', width: tamano, height: tamano, flexShrink: 0 }}>
      <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`a${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--g-pri)' }} />
            <stop offset="1" style={{ stopColor: 'var(--g-pri2)' }} />
          </linearGradient>
        </defs>
        <g transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`}>
          <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={grosor} />
          <motion.circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={trazo} strokeWidth={grosor} strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: v, opacity: v > 0.005 ? 1 : 0 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            style={brillo ? { filter: `drop-shadow(0 0 ${grosor * 0.6}px color-mix(in srgb, ${color || 'var(--g-pri)'} 75%, transparent))` } : undefined} />
          {interior && (
            <>
              <circle cx={tamano / 2} cy={tamano / 2} r={ri} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={grosor * 0.62} />
              <motion.circle cx={tamano / 2} cy={tamano / 2} r={ri} fill="none" stroke={interior.color || 'var(--g-pri2)'} strokeOpacity={0.8}
                strokeWidth={grosor * 0.62} strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: Math.max(0, Math.min(1, interior.valor || 0)), opacity: interior.valor > 0.005 ? 1 : 0 }}
                transition={{ duration: 1.3, delay: 0.15, ease: [0.16, 1, 0.3, 1] }} />
            </>
          )}
        </g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        {children}
      </div>
    </div>
  );
}

// ── Número que cuenta hasta su valor cada vez que cambia (sin re-render: escribe
// directo en el DOM en cada cuadro).
const entero = (n) => Math.round(n).toLocaleString('es-MX');
export function NumeroVivo({ valor, formato = entero, style, degradado = false }) {
  const ref = useRef(null);
  const previo = useRef(0);
  useEffect(() => {
    const desde = previo.current;
    previo.current = valor;
    const control = animate(desde, valor, {
      duration: desde === 0 ? 1.1 : 0.7, ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { if (ref.current) ref.current.textContent = formato(v); },
    });
    return () => control.stop();
  }, [valor, formato]);
  return <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums', ...(degradado ? degradadoTexto : {}), ...style }}>{formato(0)}</span>;
}

export function Boton({ children, variante = 'primario', style, grande = false, ...resto }) {
  const variantes = {
    primario: { background: g.grad, color: '#fff', boxShadow: '0 10px 26px color-mix(in srgb, var(--g-pri) 38%, transparent)' },
    verde: { background: g.verde, color: '#04261A' },
    peligro: { background: 'color-mix(in srgb, var(--g-rojo) 16%, transparent)', color: g.rojo },
    suave: { background: g.sup2, color: g.texto },
    borde: { background: 'transparent', color: g.texto, border: '1px solid rgba(255,255,255,0.12)' },
    blanco: { background: '#fff', color: '#0B0B0D' },
  };
  return (
    <motion.button type="button" whileTap={resto.disabled ? undefined : { scale: 0.96 }} {...resto} style={{
      border: 'none', borderRadius: 99, padding: grande ? '16px 22px' : '12px 18px', fontSize: grande ? 16 : 14, fontWeight: 600,
      cursor: resto.disabled ? 'default' : 'pointer', opacity: resto.disabled ? 0.5 : 1, display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: g.fuente, ...variantes[variante], ...style,
    }}>{children}</motion.button>
  );
}

export function Avatar({ nombre, tamano = 44, color, anillo = false }) {
  return (
    <div aria-hidden="true" style={{
      width: tamano, height: tamano, borderRadius: '50%', flexShrink: 0, position: 'relative',
      background: color ? `color-mix(in srgb, ${color} 18%, var(--g-sup2))` : 'linear-gradient(135deg, #2C2C31, #1A1A1D)',
      color: color || g.texto, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
      fontSize: tamano * 0.34, boxShadow: anillo ? '0 0 0 2px var(--g-fondo), 0 0 0 4px var(--g-pri)' : undefined,
    }}>{iniciales(nombre)}</div>
  );
}

// Selector en píldora; la opción activa se desliza (layoutId).
export function Segmentado({ opciones, valor, alCambiar, id = 'seg' }) {
  return (
    <div className="g-sin-barra" style={{ display: 'flex', gap: 2, padding: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflowX: 'auto' }}>
      {opciones.map((o) => (
        <button key={o.id} type="button" onClick={() => alCambiar(o.id)} style={{
          position: 'relative', flex: '1 0 auto', border: 'none', borderRadius: 99, padding: '9px 12px', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, background: 'transparent', color: valor === o.id ? '#fff' : g.suave, whiteSpace: 'nowrap',
        }}>
          {valor === o.id && <motion.span layoutId={`seg-${id}`} transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            style={{ position: 'absolute', inset: 0, borderRadius: 99, background: g.grad, boxShadow: '0 6px 18px color-mix(in srgb, var(--g-pri) 35%, transparent)' }} />}
          <span style={{ position: 'relative' }}>{o.etiqueta}</span>
        </button>
      ))}
    </div>
  );
}

// Renglón de dato: icono en círculo, etiqueta, valor grande en degradado y flecha.
export function Fila({ icono, etiqueta, valor, sub, onClick, color }) {
  return (
    <Tarjeta onClick={onClick} pad={14}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <IconoCirculo icono={icono} color={color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: g.suave }}>{etiqueta}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', ...(color ? { color } : degradadoTexto) }}>{valor}</span>
            {sub && <span style={{ fontSize: 12, color: g.tenue }}>{sub}</span>}
          </div>
        </div>
        {onClick && <ChevronRight size={18} color="var(--g-tenue)" />}
      </div>
    </Tarjeta>
  );
}

// Hoja que sube desde abajo. Se cierra arrastrándola hacia abajo, con la X o
// tocando afuera.
export function Hoja({ abierta, alCerrar, titulo, children, ancho = 480 }) {
  return (
    <AnimatePresence>
      {abierta && (
        <motion.div key="fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={alCerrar}
          style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <motion.div onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_e, i) => { if (i.offset.y > 110 || i.velocity.y > 600) alCerrar(); }}
            className="g-app g-sin-barra"
            style={{
              width: `min(${ancho}px, 100%)`, maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box', background: 'var(--g-fondo)',
              borderRadius: '30px 30px 0 0', border: `1px solid ${g.linea}`, borderBottom: 'none', padding: '10px 18px 28px',
              color: g.texto, fontFamily: g.fuente, boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
            }}>
            <div style={{ width: 40, height: 5, borderRadius: 9, background: 'rgba(255,255,255,0.18)', margin: '0 auto 12px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, minHeight: 36 }}>
              <h3 style={{ margin: 0, color: g.texto, fontSize: 18, fontWeight: 700 }}>{titulo}</h3>
              <button type="button" onClick={alCerrar} aria-label="Cerrar" style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', background: g.sup2, color: g.texto, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Vacio({ icono: Icono, children }) {
  return (
    <div style={{ padding: '28px 12px', textAlign: 'center', color: g.suave, fontSize: 13.5, display: 'grid', justifyItems: 'center', gap: 10 }}>
      {Icono && <IconoCirculo icono={Icono} color="var(--g-tenue)" tamano={46} />}
      <div>{children}</div>
    </div>
  );
}

// Bloques grises que brillan mientras carga.
export function Cargando({ alto = 120, n = 3 }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{
          height: i === 0 ? alto * 1.6 : alto, borderRadius: 26, border: `1px solid ${g.linea}`,
          background: 'linear-gradient(90deg, var(--g-sup) 0px, color-mix(in srgb, var(--g-sup), white 5%) 80px, var(--g-sup) 160px)',
          backgroundSize: '400px 100%', animation: 'g-carga 1.3s linear infinite',
        }} />
      ))}
    </div>
  );
}

export function Titulo({ chico, children, accion }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, margin: '6px 2px 16px', flexWrap: 'wrap' }}>
      <div>
        {chico && <div style={{ color: g.suave, fontSize: 14 }}>{chico}</div>}
        <h2 style={{ margin: 0, color: g.texto, fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{children}</h2>
      </div>
      {accion}
    </div>
  );
}
