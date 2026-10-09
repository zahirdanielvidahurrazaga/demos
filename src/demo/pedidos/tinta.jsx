import { useEffect, useRef, useState } from 'react';
import { Foto } from './ui';
import { k, partirNombre } from './tintaBase';

// ─────────────────────────────────────────────────────────────────────────────
// ESTILO "TINTA" — la app del cliente de pedidos.
//
// Un solo color de marca sobre crema, dibujos a mano y una palabra en letra de
// plumón en cada título. Los dibujos son PNG con transparencia que se usan como
// máscara (mask-image): así el mismo dibujo sale azul sobre crema o blanco
// sobre azul. Cocina, Reparto y Dueño siguen con ui.jsx.
// ─────────────────────────────────────────────────────────────────────────────

// Si un producto no tiene dibujo (p. ej. uno nuevo del dueño) se cae a su foto.
export function Dibujo({ src, foto, color = k.pri, alto, ancho, style }) {
  // Resultado de la última carga; mientras no corresponda a `src`, sigue "cargando".
  const [carga, setCarga] = useState({ src: null, ok: false });
  useEffect(() => {
    if (!src) return undefined;
    let vivo = true;
    const img = new Image();
    img.onload = () => vivo && setCarga({ src, ok: true });
    img.onerror = () => vivo && setCarga({ src, ok: false });
    img.src = src;
    return () => { vivo = false; };
  }, [src]);
  const estado = !src ? 'falla' : carga.src !== src ? 'cargando' : carga.ok ? 'ok' : 'falla';
  const caja = { width: ancho ?? alto, height: alto, flexShrink: 0, ...style };
  if (estado === 'falla') return foto ? <Foto src={foto} alt="" style={caja} redonda={14} /> : <span style={caja} />;
  return (
    <span aria-hidden="true" style={{
      display: 'block', ...caja, background: color, opacity: estado === 'ok' ? 1 : 0, transition: 'opacity .3s ease',
      WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
      WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center', maskPosition: 'center',
    }} />
  );
}

export function Nombre({ nombre, tam = 1, color = 'inherit', alinear = 'left' }) {
  const [arriba, mano] = partirNombre(nombre);
  return (
    <div style={{ color, textAlign: alinear, lineHeight: 1 }}>
      {arriba && <div style={{ fontFamily: k.sans, fontWeight: 400, fontSize: `${1.12 * tam}rem`, letterSpacing: '-0.01em' }}>{arriba}</div>}
      <div style={{
        fontFamily: k.mano, fontSize: `${2 * tam}rem`, lineHeight: 0.95, marginTop: arriba ? 2 : 0,
        paddingLeft: alinear === 'left' && arriba ? '0.9em' : 0,
      }}>{mano}</div>
    </div>
  );
}

// Precio sobre un brochazo, como etiqueta pegada a mano.
export function Precio({ texto, invertido, tam = 1, style }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', padding: `${0.3 * tam}em ${0.75 * tam}em ${0.35 * tam}em`, transform: 'rotate(-7deg)', ...style }}>
      <svg viewBox="0 0 120 52" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <path d="M7 13 C 24 6, 62 10, 112 3 C 118 3, 119 11, 116 17 C 113 27, 118 36, 113 45 C 88 47, 52 43, 10 50 C 3 50, 2 42, 5 35 C 8 27, 1 21, 7 13 Z"
          fill="var(--p-pri)" stroke={invertido ? '#fff' : 'none'} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M108 47 C 112 49, 116 49, 119 46" fill="none" stroke={invertido ? '#fff' : 'var(--p-pri)'} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span style={{ position: 'relative', fontFamily: k.mano, fontSize: `${1.65 * tam}rem`, color: '#fff', lineHeight: 1, whiteSpace: 'nowrap' }}>{texto}</span>
    </span>
  );
}

export function Pildora({ children, invertida, style, ...resto }) {
  return (
    <button type="button" {...resto} style={{
      border: 'none', borderRadius: 999, padding: '15px 22px', fontFamily: k.sans, fontSize: '1rem', fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: invertida ? '#fff' : k.pri, color: invertida ? k.pri : '#fff',
      cursor: resto.disabled ? 'default' : 'pointer', opacity: resto.disabled ? 0.5 : 1, ...style,
    }}>{children}</button>
  );
}

// Botón o casilla con contorno (opciones, modalidad, método de pago).
export function Contorno({ children, activo, style, ...resto }) {
  return (
    <button type="button" aria-pressed={activo} {...resto} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 16, cursor: 'pointer',
      fontFamily: k.sans, fontSize: '0.95rem', fontWeight: 500, textAlign: 'left',
      border: `1.5px solid ${activo ? k.pri : k.linea}`, background: activo ? k.pri : k.sup, color: activo ? '#fff' : k.texto,
      transition: 'background .15s ease, color .15s ease', ...style,
    }}>{children}</button>
  );
}

export function Titulo({ sans, mano, tam = 1, color = k.texto, style }) {
  return (
    <h2 style={{ margin: 0, color, lineHeight: 1, fontWeight: 400, ...style }}>
      <span style={{ fontFamily: k.sans, fontSize: `${1.75 * tam}rem`, letterSpacing: '-0.02em' }}>{sans} </span>
      <span style={{ fontFamily: k.mano, fontSize: `${2.3 * tam}rem` }}>{mano}</span>
    </h2>
  );
}

export function Insignia({ children, invertida }) {
  return (
    <span style={{
      display: 'inline-block', fontFamily: k.sans, fontSize: '0.74rem', fontWeight: 500, padding: '4px 10px', borderRadius: 999,
      border: `1.2px solid ${invertida ? 'rgba(255,255,255,0.6)' : k.linea}`, color: invertida ? '#fff' : k.texto, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// ── Pantalla de carga: un bowl que se dibuja solo y el porcentaje a mano ─────
export function Carga({ alTerminar, alto }) {
  const [n, setN] = useState(0);
  const [saliendo, setSaliendo] = useState(false);
  const fin = useRef(alTerminar);
  useEffect(() => { fin.current = alTerminar; }, [alTerminar]);
  useEffect(() => {
    const dura = 1700;
    const inicio = performance.now();
    let cuadro;
    let espera;
    const paso = (ahora) => {
      const avance = Math.min(1, (ahora - inicio) / dura);
      setN(Math.round(100 * (1 - (1 - avance) ** 2)));
      if (avance < 1) cuadro = requestAnimationFrame(paso);
      else { setSaliendo(true); espera = setTimeout(() => fin.current(), 380); }
    };
    cuadro = requestAnimationFrame(paso);
    return () => { cancelAnimationFrame(cuadro); clearTimeout(espera); };
  }, []);
  const trazo = (d, retraso, dur = 0.9) => (
    <path d={d} pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `tinta-trazo ${dur}s ${retraso}s ease forwards` }} />
  );
  return (
    <div className="tinta-anima" style={{
      height: alto, background: k.priOsc, color: '#fff', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saliendo ? 0 : 1, transition: 'opacity .38s ease',
    }}>
      <svg viewBox="0 0 140 130" width="150" height="140" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {trazo('M18 66 C 50 72, 92 70, 122 63', 0)}
        {trazo('M20 67 C 22 96, 44 112, 70 112 C 98 111, 118 94, 121 64', 0.25)}
        {trazo('M52 113 C 54 119, 86 119, 88 112', 0.7, 0.4)}
        {trazo('M52 54 C 44 44, 60 38, 52 24', 0.8, 0.6)}
        {trazo('M72 52 C 64 40, 82 34, 72 16', 0.95, 0.6)}
        {trazo('M92 54 C 84 44, 100 38, 92 26', 1.1, 0.6)}
        {trazo('M30 80 l 10 6 M36 90 l 10 6 M44 99 l 8 4', 0.6, 0.5)}
      </svg>
      <span aria-live="polite" style={{ fontFamily: k.mano, fontSize: '1.5rem', opacity: 0.9, minWidth: 60, textAlign: 'center' }}>{n}%</span>
    </div>
  );
}

// ── Bienvenida: título grande, el bowl que salpica y la flecha para entrar ───
export function Bienvenida({ negocio, categorias, mesaQR, alEntrar, alto, ancho }) {
  const marca = negocio.marca || {};
  const horario = marca.horario || '7 am – 8 pm';
  const entra = (retraso) => ({ animation: `tinta-entra .7s ${retraso}s both cubic-bezier(.2,.7,.2,1)` });
  return (
    <div className="tinta-anima" style={{
      position: 'relative', height: alto, minHeight: 520, overflow: 'hidden', background: k.priOsc, color: '#fff',
      borderRadius: ancho ? 32 : 0, boxSizing: 'border-box', padding: ancho ? '56px 64px' : '30px 24px',
    }}>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: ancho ? 620 : 380, marginLeft: ancho ? 0 : 'auto', textAlign: ancho ? 'left' : 'right' }}>
        <div style={{ fontFamily: k.sans, fontWeight: 400, fontSize: ancho ? '4.2rem' : '2.55rem', lineHeight: 1.02, letterSpacing: '-0.03em' }}>
          <div style={{ ...entra(0.05), textAlign: 'left' }}>Pásale a</div>
          <div style={{ ...entra(0.15), paddingLeft: ancho ? '1.6em' : 0 }}>nuestra cocina</div>
        </div>
        <div style={{ ...entra(0.3), fontFamily: k.mano, fontSize: ancho ? '6.4rem' : '4.4rem', lineHeight: 0.9, marginTop: 4, paddingLeft: ancho ? '3.2em' : 0 }}>fit!</div>
        <div style={{ ...entra(0.45), fontFamily: k.sans, fontSize: ancho ? '0.95rem' : '0.8rem', opacity: 0.85, marginTop: 10, lineHeight: 1.4, paddingLeft: ancho ? '6.2em' : 0 }}>
          {mesaQR ? <>Estás en la <strong>mesa {mesaQR}</strong><br /></> : null}
          {negocio.direccion}
        </div>
      </div>

      <div style={{
        position: 'absolute', right: ancho ? '4%' : '-6%', bottom: ancho ? '-3%' : '-2%',
        height: ancho ? '84%' : '58%', maxWidth: ancho ? '50%' : '92%', aspectRatio: '643 / 900',
        animation: 'tinta-salpica 1s .25s both cubic-bezier(.2,.8,.2,1)',
      }}>
        <div style={{ width: '100%', height: '100%', animation: 'tinta-flota 6s 1.3s ease-in-out infinite' }}>
          <Dibujo src="/pedidos/hoja/dibujos/bienvenida.png" color="#fff" alto="100%" ancho="100%" />
        </div>
      </div>

      <div style={{ position: 'absolute', zIndex: 1, left: ancho ? 64 : 24, bottom: ancho ? 56 : 30, ...entra(0.6) }}>
        <div style={{ fontFamily: k.mano, fontSize: '1.5rem', marginBottom: 4 }}>{horario}</div>
        <div style={{ fontFamily: k.sans, fontSize: '0.85rem', lineHeight: 1.45, opacity: 0.9, marginBottom: 22 }}>
          {categorias.slice(0, 3).map((c) => <div key={c.id}>{c.nombre}</div>)}
        </div>
        <button type="button" onClick={alEntrar} aria-label="Ver el menú" style={{
          width: ancho ? 64 : 54, height: ancho ? 64 : 54, borderRadius: '50%', border: 'none', background: '#fff', color: k.priOsc,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5 C 12 8, 14 10, 16 12 C 14 14, 12 16, 9 19" /></svg>
        </button>
      </div>
    </div>
  );
}
