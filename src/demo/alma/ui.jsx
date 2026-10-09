import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import { a, vidrio, vidrioFoto, PALETA } from './estilo';

// Piezas compartidas de la app de Alma.

// Foto con el color suavizado y un toque cálido: todas se ven de una misma sesión.
export function Foto({ src, style, children, oscura = 0.35, radio = 30 }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: radio, background: '#2a2620', ...style }}>
      {src && <img src={src} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(.72) contrast(1.04) brightness(.97) sepia(.08)' }} />}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(24,20,14,${oscura}) 0%, rgba(24,20,14,${oscura * 0.45}) 48%, rgba(24,20,14,${oscura + 0.25}) 100%)` }} />
      <div style={{ position: 'relative', height: '100%' }}>{children}</div>
    </div>
  );
}

// Tarjeta oscura (kombu) con brillo de vidrio: lo importante sin foto, como
// una tarjeta de Wallet. Letra blanca.
export function TarjetaTinta({ children, style, radio = 30 }) {
  return (
    <div style={{
      position: 'relative', borderRadius: radio, color: '#fff', overflow: 'hidden',
      background: 'radial-gradient(130% 90% at 0% 0%, rgba(255,255,255,.16), rgba(255,255,255,0) 50%), radial-gradient(90% 80% at 100% 100%, rgba(205,184,150,.22), rgba(205,184,150,0) 60%), linear-gradient(150deg, #3B4231, #22261B)',
      border: '1px solid rgba(255,255,255,.12)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18), 0 20px 40px rgba(34,38,27,.28)', ...style,
    }}>{children}</div>
  );
}

export function Chip({ children, icono: Icono, claro, style }) {
  return (
    <span style={{
      ...(claro ? vidrio : vidrioFoto), display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
      fontSize: '0.76rem', fontWeight: 600, whiteSpace: 'nowrap', color: claro ? a.tinta : '#fff', boxShadow: claro ? 'none' : vidrioFoto.boxShadow, ...style,
    }}>{Icono && <Icono size={13} />}{children}</span>
  );
}

export function Avatar({ src, nombre, tam = 36, borde = 'rgba(255,255,255,.9)' }) {
  const inicial = (nombre || '?').trim()[0]?.toUpperCase();
  return src ? (
    <img src={src} alt="" style={{ width: tam, height: tam, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${borde}`, flexShrink: 0 }} />
  ) : (
    <span aria-hidden="true" style={{
      width: tam, height: tam, borderRadius: '50%', flexShrink: 0, border: `2px solid ${borde}`, background: a.solido, color: a.tinta,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: tam * 0.42,
    }}>{inicial}</span>
  );
}

export function Boton({ children, tipo = 'tinta', style, ...resto }) {
  const tipos = {
    tinta: { background: a.tinta, color: a.sobreTinta, border: 'none' },
    blanco: { background: '#fff', color: a.tinta, border: 'none' },
    vidrio: { ...vidrio, color: a.tinta },
    vidrioFoto: { ...vidrioFoto },
    linea: { background: 'transparent', color: a.tinta, border: `1px solid ${a.linea}` },
  };
  return (
    <button type="button" {...resto} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999,
      padding: '15px 22px', fontFamily: a.letra, fontSize: '0.95rem', fontWeight: 600, cursor: resto.disabled ? 'default' : 'pointer',
      opacity: resto.disabled ? 0.5 : 1, ...tipos[tipo], ...style,
    }}>{children}</button>
  );
}

// "Desliza para…": una perilla que se arrastra hasta el final para confirmar.
export function Deslizar({ texto, alTerminar, claro }) {
  const pista = useRef(null);
  const [x, setX] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [ancho, setAncho] = useState(260);
  const inicio = useRef(0);
  useEffect(() => {
    const el = pista.current;
    if (!el) return undefined;
    const obs = new ResizeObserver(() => setAncho(el.offsetWidth));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const max = () => Math.max(1, ancho - 52);
  const mover = (e) => { if (arrastrando) setX(Math.max(0, Math.min(max(), e.clientX - inicio.current))); };
  const soltar = () => {
    if (!arrastrando) return;
    setArrastrando(false);
    if (x > max() * 0.82) { setX(max()); setTimeout(() => { alTerminar(); setX(0); }, 160); } else setX(0);
  };
  return (
    <div ref={pista} role="button" tabIndex={0} aria-label={texto}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alTerminar(); } }}
      onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} onPointerLeave={soltar}
      style={{
        ...(claro ? vidrio : vidrioFoto), position: 'relative', height: 52, borderRadius: 999, flex: 1, touchAction: 'none', userSelect: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.88rem', fontWeight: 600, color: claro ? a.tinta : '#fff',
      }}>
      <span style={{ paddingLeft: 40, opacity: 1 - x / max() }}>{texto}</span>
      <span
        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); inicio.current = e.clientX - x; setArrastrando(true); }}
        style={{
          position: 'absolute', left: 4, top: 4, width: 44, height: 44, borderRadius: '50%', background: '#fff', color: a.tinta,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', transform: `translateX(${x}px)`,
          transition: arrastrando ? 'none' : 'transform .35s cubic-bezier(.3,1.4,.5,1)', boxShadow: '0 4px 12px rgba(0,0,0,.18)',
        }}>
        <ArrowRight size={19} style={{ animation: x ? 'none' : 'alma-flecha 1.6s ease-in-out infinite' }} />
      </span>
    </div>
  );
}

// Hoja de vidrio que sube desde abajo (o baja desde arriba, como el pase).
export function Hoja({ abierta, alCerrar, titulo, children, desdeArriba }) {
  useEffect(() => {
    if (!abierta) return undefined;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tecla = (e) => { if (e.key === 'Escape') alCerrar?.(); };
    window.addEventListener('keydown', tecla);
    return () => { document.body.style.overflow = previo; window.removeEventListener('keydown', tecla); };
  }, [abierta, alCerrar]);
  if (!abierta) return null;
  // Se pinta en la capa común #alma-hojas (dentro de .alma-app, por encima de
  // la barra): así hereda el tema y ninguna sección con z-index la deja abajo.
  const capa = document.getElementById('alma-hojas');
  const hoja = (
    <div onClick={alCerrar} style={{
      position: 'fixed', inset: 0, zIndex: 9400, display: 'flex', justifyContent: 'center',
      alignItems: desdeArriba ? 'flex-start' : 'flex-end',
      background: 'var(--a-velo)', WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)',
      animation: 'alma-velo .25s ease both',
    }}>
      <div role="dialog" aria-label={titulo} onClick={(e) => e.stopPropagation()} style={{
        ...vidrio, background: 'var(--a-hoja)',
        width: 'min(560px, 100%)', maxHeight: 'calc(100dvh - var(--a-alto-encabezado, 70px) - 12px)', overflowY: 'auto', overscrollBehavior: 'contain',
        boxSizing: 'border-box', position: 'relative', color: a.tinta, fontFamily: a.letra,
        borderRadius: desdeArriba ? '0 0 34px 34px' : '34px 34px 0 0',
        paddingBottom: desdeArriba ? 0 : 'env(safe-area-inset-bottom, 0px)',
        animation: `${desdeArriba ? 'alma-baja' : 'alma-sube'} .45s cubic-bezier(.2,.9,.25,1) both`,
      }}>
        {!desdeArriba && <div aria-hidden="true" style={{ width: 40, height: 5, borderRadius: 3, background: a.linea, margin: '10px auto 0' }} />}
        <button type="button" aria-label="Cerrar" onClick={alCerrar} style={{
          ...vidrio, position: 'absolute', top: 14, right: 14, zIndex: 3, width: 36, height: 36, borderRadius: '50%',
          color: a.tinta, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><X size={17} /></button>
        {children}
      </div>
    </div>
  );
  return capa ? createPortal(hoja, capa) : hoja;
}

export function Aviso({ children, tono = 'info' }) {
  const colores = { info: [a.tenue, a.tinta], error: ['rgba(170,40,30,.10)', a.peligro], ok: [a.tenue, a.tinta] }[tono];
  return <p role={tono === 'error' ? 'alert' : 'status'} style={{ margin: '12px 0 0', padding: '11px 14px', borderRadius: 16, background: colores[0], color: colores[1], fontSize: '0.88rem', lineHeight: 1.4 }}>{children}</p>;
}

export function Titulo({ children, accion, alAccion }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '28px 0 12px' }}>
      <h2 style={{ margin: 0, fontWeight: 600, fontSize: '1.15rem', letterSpacing: '-0.01em' }}>{children}</h2>
      {accion && <button type="button" onClick={alAccion} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: a.letra, fontSize: '0.86rem', fontWeight: 500, color: a.tinta }}>{accion}</button>}
    </div>
  );
}

// Fondo: niebla con una luz arriba y una mancha cálida que se mueve lento.
export function Fondo() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none', background: 'linear-gradient(180deg, var(--a-niebla) 0%, var(--a-niebla2) 100%)', transition: 'background .4s ease' }}>
      <div style={{ position: 'absolute', width: '70vmax', height: '70vmax', top: '-30vmax', right: '-25vmax', borderRadius: '50%', background: 'var(--a-luz-fondo)', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', width: '55vmax', height: '55vmax', bottom: '-22vmax', left: '-22vmax', borderRadius: '50%', background: 'var(--a-mancha)', filter: 'blur(80px)', animation: 'alma-deriva 40s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: '30vmax', height: '30vmax', top: '45%', right: '-10vmax', borderRadius: '50%', background: `${PALETA.musgo}22`, filter: 'blur(70px)', animation: 'alma-deriva 52s ease-in-out infinite reverse' }} />
    </div>
  );
}
