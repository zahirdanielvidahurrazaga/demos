import { useEffect, useRef } from 'react';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { iniciales } from './datos';

export { useAncho } from '../pedidos/ui';

// ─────────────────────────────────────────────────────────────────────────────
// Piezas visuales del gimnasio — estilo "Volt" (10-oct, referencias de apps de
// fitness): negro, UN solo color de acento plano (sin degradados ni brillos),
// fotos de gente entrenando y titulares en letra condensada mayúscula.
//
// La paleta vive aquí (TEMA), no en gym_negocios.marca: el usuario pidió no
// basarse en el Instagram del gimnasio por ahora. Para probar otro acento basta
// con cambiar `acento` (lima = '#D7FF3A' con acentoTexto '#0A0A0A').
// "Bueno" (activa, entró, tranquilo) va en blanco hueso; el rojo es para lo que
// hay que atender, igual que el acento.
// ─────────────────────────────────────────────────────────────────────────────

export const TEMA = {
  acento: '#FF3326',
  acentoTexto: '#FFFFFF',
  fondo: '#050505',
  carta: '#151515',
  carta2: '#1E1E1E',
  texto: '#F3F3EE',
  suave: '#8B8B86',
  tenue: '#4E4E4A',
  bueno: '#F3F3EE',
  malo: '#FF3326',
  ambar: '#FFB938',
};

// Variables CSS (--g-*) que usan todas las pantallas.
export const variablesTema = {
  '--g-pri': TEMA.acento, '--g-pri2': TEMA.acento, '--g-pri-texto': TEMA.acentoTexto,
  '--g-fondo': TEMA.fondo, '--g-sup': TEMA.carta, '--g-sup2': TEMA.carta2,
  '--g-texto': TEMA.texto, '--g-suave': TEMA.suave, '--g-tenue': TEMA.tenue,
  '--g-verde': TEMA.bueno, '--g-rojo': TEMA.malo, '--g-ambar': TEMA.ambar,
};

export const g = {
  pri: 'var(--g-pri)', pri2: 'var(--g-pri)', priTexto: 'var(--g-pri-texto)',
  grad: 'var(--g-pri)',
  fondo: 'var(--g-fondo)', sup: 'var(--g-sup)', sup2: 'var(--g-sup2)',
  tarjeta: 'var(--g-sup)',
  texto: 'var(--g-texto)', suave: 'var(--g-suave)', tenue: 'var(--g-tenue)', linea: 'rgba(255,255,255,0.07)',
  verde: 'var(--g-verde)', rojo: 'var(--g-rojo)', ambar: 'var(--g-ambar)', azul: '#A9A9A3',
  fuente: "'Geist', -apple-system, 'Segoe UI', Roboto, sans-serif",
  cond: "'Barlow Condensed', 'Arial Narrow', sans-serif",
};

// Titular: condensada, mayúsculas, apretada.
export const titular = { fontFamily: g.cond, fontWeight: 600, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '0.005em', color: 'inherit' };

// Fotos de la demo (las generó Codex; public/gimnasio/fotos).
export const FOTOS = {
  hero: '/gimnasio/img/hero.webp',
  piso: '/gimnasio/img/piso.webp',
  socio: '/gimnasio/img/socio.webp',
  crossfit: '/gimnasio/img/clase-funcional.webp',
  spinning: '/gimnasio/img/clase-spinning.webp',
  box: '/gimnasio/img/clase-box.webp',
  zumba: '/gimnasio/img/clase-zumba.webp',
};
// Foto del socio de prueba con cuenta (#1001); los demás van con iniciales.
export const fotoSocio = (numero) => (Number(numero) === 1001 ? FOTOS.socio : null);
export const fotoClase = (nombre = '') => {
  const n = nombre.toLowerCase();
  if (n.includes('cross') || n.includes('funcional')) return FOTOS.crossfit;
  if (n.includes('spin')) return FOTOS.spinning;
  if (n.includes('box') || n.includes('cardio')) return FOTOS.box;
  if (n.includes('zumba') || n.includes('baile')) return FOTOS.zumba;
  return null;
};

// Geist para todo y Barlow Condensed para titulares y números grandes.
export function cargarFuentesGym() {
  if (document.getElementById('fuentes-gym')) return;
  const link = document.createElement('link');
  link.id = 'fuentes-gym';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Geist:wght@300;400;500;600;700&display=swap';
  document.head.appendChild(link);
  const css = document.createElement('style');
  css.id = 'estilos-gym';
  css.textContent = `
    @keyframes g-latido { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 55%, transparent); } 70% { box-shadow: 0 0 0 7px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
    @keyframes g-onda { from { transform: scale(.85); opacity: 1; } to { transform: scale(1.35); opacity: 0; } }
    @keyframes g-carga { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .g-sin-barra { scrollbar-width: none; } .g-sin-barra::-webkit-scrollbar { display: none; }
    .g-app input::placeholder { color: var(--g-tenue); }
    .g-app button { font-family: inherit; }
  `;
  document.head.appendChild(css);
}

// Antes era texto en degradado; en Volt el número va en el color de acento.
export const degradadoTexto = { color: 'var(--g-pri)' };

// Marca: cuadro de acento con las siglas + el nombre en condensada.
// Logo genérico (siglas en el cuadro de acento + nombre en condensada).
export function Logo({ nombre = 'Atlas Fitness', tamano = 1, compacto = false, sub }) {
  const partes = nombre.split(' ');
  const siglas = partes.map((p) => p[0]).join('').toUpperCase();
  const grande = partes[partes.length - 1];
  return (
    <div role="img" aria-label={nombre} style={{ display: 'flex', alignItems: 'center', gap: 10 * tamano }}>
      <div style={{
        width: 36 * tamano, height: 36 * tamano, borderRadius: 11 * tamano, background: g.pri, color: g.priTexto, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: g.cond, fontWeight: 700, fontSize: 16 * tamano,
      }}>{siglas}</div>
      <div style={{ lineHeight: 1 }}>
        <div style={{ ...titular, fontSize: (compacto ? 20 : 22) * tamano, color: g.texto }}>{grande}</div>
        {!compacto && <div style={{ fontSize: 11, color: g.suave, marginTop: 3 }}>{sub || partes.slice(0, -1).join(' ')}</div>}
      </div>
    </div>
  );
}

// ── Tarjeta: el bloque base. Con onClick se vuelve botón (se hunde al tocarla).
// `acento` = tarjeta pintada del color de acento (el dato estrella).
export function Tarjeta({ children, titulo, accion, style, onClick, acento = false, pad = 18 }) {
  const Comp = onClick ? motion.button : motion.section;
  return (
    <Comp type={onClick ? 'button' : undefined} onClick={onClick} whileTap={onClick ? { scale: 0.985 } : undefined}
      style={{
        position: 'relative', overflow: 'hidden', background: acento ? g.pri : g.tarjeta, border: acento ? 'none' : `1px solid ${g.linea}`, borderRadius: 22,
        padding: pad, color: acento ? g.priTexto : g.texto, textAlign: 'left', width: onClick ? '100%' : undefined, cursor: onClick ? 'pointer' : undefined,
        display: 'block', boxSizing: 'border-box', fontFamily: g.fuente, ...style,
      }}>
      {(titulo || accion) && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {titulo && <h3 style={{ margin: 0, color: 'inherit', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{titulo}</h3>}
          {accion}
        </div>
      )}
      <div style={{ position: 'relative' }}>{children}</div>
    </Comp>
  );
}

// Foto con degradado a negro abajo (para escribir encima).
export function Foto({ src, children, style, radio = 22, arriba = false, posicion = 'center' }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: radio, background: `#161616 url(${src}) ${posicion}/cover no-repeat`, ...style,
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, ${arriba ? 'rgba(0,0,0,.7)' : 'rgba(0,0,0,0)'} 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,.9) 100%)`,
      }} />
      <div style={{ position: 'relative', height: '100%' }}>{children}</div>
    </div>
  );
}

// Píldora. Por defecto neutra; con `color`, el texto va de ese color.
export function Chip({ children, color, style, punto = false, relleno = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 500,
      color: relleno ? g.priTexto : color || g.texto, background: relleno ? g.pri : g.sup2, whiteSpace: 'nowrap', lineHeight: 1.2, ...style,
    }}>
      {punto && <span style={{ width: 7, height: 7, borderRadius: 9, background: relleno ? 'currentColor' : color || g.pri, color: relleno ? g.priTexto : color || g.pri, animation: 'g-latido 1.8s infinite', flexShrink: 0 }} />}
      {children}
    </span>
  );
}

export const EnVivo = ({ texto = 'En vivo' }) => <Chip punto>{texto}</Chip>;

export function IconoCirculo({ icono: Icono, color = 'var(--g-texto)', tamano = 38, fondo }) {
  return (
    <div style={{
      width: tamano, height: tamano, borderRadius: '50%', flexShrink: 0, background: fondo || g.sup2,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color,
    }}><Icono size={tamano * 0.46} strokeWidth={1.9} /></div>
  );
}

// ── Anillo plano. valor de 0 a 1; `interior` = segundo anillo (lo usual).
export function Anillo({ valor, tamano = 200, grosor = 14, interior, color, children }) {
  const r = (tamano - grosor) / 2 - 4;
  const ri = r - grosor - 6;
  const v = Math.max(0, Math.min(1, valor || 0));
  return (
    <div style={{ position: 'relative', width: tamano, height: tamano, flexShrink: 0 }}>
      <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} style={{ display: 'block', overflow: 'visible' }}>
        <g transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`}>
          <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={grosor} />
          <motion.circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={color || 'var(--g-pri)'} strokeWidth={grosor} strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: v, opacity: v > 0.005 ? 1 : 0 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
          {interior && (
            <>
              <circle cx={tamano / 2} cy={tamano / 2} r={ri} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={grosor * 0.62} />
              <motion.circle cx={tamano / 2} cy={tamano / 2} r={ri} fill="none" stroke="#5E5E5A"
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

// Barra de progreso fina (aforo, vigencia…).
export function Barra({ valor, color = 'var(--g-pri)', alto = 8, style }) {
  return (
    <div style={{ height: alto, borderRadius: alto, background: 'rgba(255,255,255,0.09)', overflow: 'hidden', ...style }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(1, valor || 0)) * 100}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', borderRadius: alto, background: color }} />
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

// Número grande en condensada (el dato estrella de cada tarjeta).
export function Grande({ children, tamano = 56, style }) {
  return <div style={{ ...titular, fontSize: tamano, fontVariantNumeric: 'tabular-nums', ...style }}>{children}</div>;
}

export function Boton({ children, variante = 'primario', style, grande = false, ...resto }) {
  const variantes = {
    primario: { background: g.pri, color: g.priTexto },
    verde: { background: g.texto, color: '#0A0A0A' },
    peligro: { background: 'color-mix(in srgb, var(--g-rojo) 16%, transparent)', color: g.rojo },
    suave: { background: g.sup2, color: g.texto },
    borde: { background: 'transparent', color: g.texto, border: '1px solid rgba(255,255,255,0.14)' },
    blanco: { background: '#fff', color: '#0A0A0A' },
    oscuro: { background: 'rgba(0,0,0,0.22)', color: 'inherit' },
  };
  return (
    <motion.button type="button" whileTap={resto.disabled ? undefined : { scale: 0.96 }} {...resto} style={{
      border: 'none', borderRadius: 99, padding: grande ? '0 24px' : '0 18px', height: grande ? 52 : 44, fontSize: grande ? 15 : 14, fontWeight: 600,
      cursor: resto.disabled ? 'default' : 'pointer', opacity: resto.disabled ? 0.5 : 1, display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: g.fuente, ...variantes[variante], ...style,
    }}>{children}</motion.button>
  );
}

export function Avatar({ nombre, tamano = 44, color, foto, anillo = false }) {
  if (foto) {
    return <div aria-hidden="true" style={{ width: tamano, height: tamano, borderRadius: '50%', flexShrink: 0, background: `#222 url(${foto}) center/cover`, boxShadow: anillo ? '0 0 0 2px var(--g-fondo), 0 0 0 4px var(--g-pri)' : undefined }} />;
  }
  return (
    <div aria-hidden="true" style={{
      width: tamano, height: tamano, borderRadius: '50%', flexShrink: 0, position: 'relative',
      background: g.sup2, color: color || g.suave, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600,
      fontSize: tamano * 0.32, boxShadow: anillo ? '0 0 0 2px var(--g-fondo), 0 0 0 4px var(--g-pri)' : undefined,
    }}>{iniciales(nombre)}</div>
  );
}

// Selector en píldora; la opción activa es blanca y se desliza (layoutId).
export function Segmentado({ opciones, valor, alCambiar, id = 'seg' }) {
  return (
    <div className="g-sin-barra" style={{ display: 'flex', gap: 2, padding: 4, background: g.sup2, borderRadius: 99, overflowX: 'auto' }}>
      {opciones.map((o) => (
        <button key={o.id} type="button" onClick={() => alCambiar(o.id)} style={{
          position: 'relative', flex: '1 0 auto', border: 'none', borderRadius: 99, padding: '8px 14px', cursor: 'pointer',
          fontSize: 13, fontWeight: 500, background: 'transparent', color: valor === o.id ? '#0A0A0A' : g.suave, whiteSpace: 'nowrap',
        }}>
          {valor === o.id && <motion.span layoutId={`seg-${id}`} transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            style={{ position: 'absolute', inset: 0, borderRadius: 99, background: '#fff' }} />}
          <span style={{ position: 'relative' }}>{o.etiqueta}</span>
        </button>
      ))}
    </div>
  );
}

// Renglón de dato: número grande, etiqueta, nota y flecha.
export function Fila({ icono, etiqueta, valor, sub, onClick, color }) {
  return (
    <Tarjeta onClick={onClick} pad={16}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {icono && <IconoCirculo icono={icono} color={color} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: g.suave }}>{etiqueta}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
            <Grande tamano={34} style={{ color: color || g.texto }}>{valor}</Grande>
            {sub && <span style={{ fontSize: 12, color: g.suave }}>{sub}</span>}
          </div>
        </div>
        {onClick && <Flecha />}
      </div>
    </Tarjeta>
  );
}

export function Flecha() {
  return (
    <span style={{ width: 36, height: 36, borderRadius: '50%', background: g.sup2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <ChevronRight size={17} color="var(--g-texto)" />
    </span>
  );
}

// Hoja que sube desde abajo. Se cierra arrastrándola hacia abajo, con la X o
// tocando afuera.
export function Hoja({ abierta, alCerrar, titulo, children, ancho = 480 }) {
  return (
    <AnimatePresence>
      {abierta && (
        <motion.div key="fondo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={alCerrar}
          style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <motion.div onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_e, i) => { if (i.offset.y > 110 || i.velocity.y > 600) alCerrar(); }}
            className="g-app g-sin-barra"
            style={{
              width: `min(${ancho}px, 100%)`, maxHeight: 'calc(100dvh - 24px - env(safe-area-inset-top, 0px))', overflowY: 'auto', boxSizing: 'border-box', background: '#0E0E0E',
              borderRadius: '30px 30px 0 0', border: `1px solid ${g.linea}`, borderBottom: 'none', padding: '10px 18px 28px',
              color: g.texto, fontFamily: g.fuente,
            }}>
            <div style={{ width: 40, height: 5, borderRadius: 9, background: 'rgba(255,255,255,0.18)', margin: '0 auto 12px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, minHeight: 36 }}>
              <h3 style={{ margin: 0, ...titular, color: g.texto, fontSize: 30 }}>{titulo}</h3>
              <button type="button" onClick={alCerrar} aria-label="Cerrar" style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none', background: g.sup2, color: g.texto, cursor: 'pointer',
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
      {Icono && <IconoCirculo icono={Icono} color="var(--g-suave)" tamano={46} />}
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
          height: i === 0 ? alto * 1.6 : alto, borderRadius: 22, border: `1px solid ${g.linea}`,
          background: 'linear-gradient(90deg, var(--g-sup) 0px, color-mix(in srgb, var(--g-sup), white 4%) 80px, var(--g-sup) 160px)',
          backgroundSize: '400px 100%', animation: 'g-carga 1.3s linear infinite',
        }} />
      ))}
    </div>
  );
}

// Encabezado de pantalla: renglón chico arriba y el titular en condensada.
export function Titulo({ chico, children, accion, tamano = 44 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, margin: '6px 2px 14px', flexWrap: 'wrap' }}>
      <div>
        {chico && <div style={{ color: g.suave, fontSize: 13, marginBottom: 6 }}>{chico}</div>}
        <h2 style={{ margin: 0, ...titular, color: g.texto, fontSize: tamano }}>{children}</h2>
      </div>
      {accion}
    </div>
  );
}

