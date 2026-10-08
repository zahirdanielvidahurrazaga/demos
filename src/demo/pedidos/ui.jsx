import { useEffect, useState } from 'react';
import { Leaf, X } from 'lucide-react';

// Piezas visuales de la maqueta de pedidos. Los colores salen de variables
// (--p-*) que PedidosDemo.jsx define con la marca de cada negocio.

export const t = {
  pri: 'var(--p-pri)', priOsc: 'var(--p-pri-osc)', acento: 'var(--p-acento)',
  fondo: 'var(--p-fondo)', sup: 'var(--p-sup)', texto: 'var(--p-texto)', suave: 'var(--p-suave)',
  linea: 'rgba(0,0,0,0.08)', serif: "ui-serif, 'Iowan Old Style', Georgia, serif",
};

// ¿Pantalla de computadora? (la maqueta se enseña mucho en juntas, en laptop)
export function useAncho(min = 1000) {
  const consulta = `(min-width: ${min}px)`;
  const [ancho, setAncho] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const m = window.matchMedia(consulta);
    const alCambiar = () => setAncho(m.matches);
    m.addEventListener('change', alCambiar);
    return () => m.removeEventListener('change', alCambiar);
  }, [consulta]);
  return ancho;
}

export function Foto({ src, alt, style, redonda = 16 }) {
  const [falla, setFalla] = useState(!src);
  useEffect(() => { setFalla(!src); }, [src]);
  if (falla) {
    return (
      <div aria-hidden="true" style={{
        background: 'linear-gradient(135deg, #DCE5D2, #B9C9A9)', borderRadius: redonda,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6E8A62', ...style,
      }}>
        <Leaf size={28} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFalla(true)}
    style={{ objectFit: 'cover', borderRadius: redonda, display: 'block', ...style }} />;
}

export function Boton({ children, variante = 'primario', style, ...resto }) {
  const base = {
    border: 'none', borderRadius: 16, padding: '14px 18px', fontSize: '1rem', fontWeight: 800,
    cursor: resto.disabled ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', gap: 8, opacity: resto.disabled ? 0.55 : 1, transition: 'transform .12s ease',
  };
  const variantes = {
    primario: { background: t.pri, color: '#fff', boxShadow: '0 10px 24px rgba(47,66,41,0.25)' },
    oscuro: { background: t.priOsc, color: '#fff' },
    suave: { background: 'rgba(79,107,71,0.1)', color: t.priOsc },
    borde: { background: 'transparent', color: t.texto, border: `1px solid ${t.linea}` },
    peligro: { background: 'rgba(185,28,28,0.08)', color: '#9B1C1C' },
  };
  return <button type="button" {...resto} style={{ ...base, ...variantes[variante], ...style }}>{children}</button>;
}

export function Chip({ children, activo, onClick, style }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      style={{
        border: activo ? 'none' : `1px solid ${t.linea}`, borderRadius: 999, padding: '8px 14px',
        background: activo ? t.priOsc : t.sup, color: activo ? '#fff' : t.texto,
        fontSize: '0.85rem', fontWeight: 700, cursor: onClick ? 'pointer' : 'default', whiteSpace: 'nowrap',
        flexShrink: 0, ...style,
      }}>
      {children}
    </button>
  );
}

export function Etiqueta({ children, color = '#4F6B47', fondo = 'rgba(79,107,71,0.1)' }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.02em',
      padding: '3px 8px', borderRadius: 999, color, background: fondo, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// Hoja que sube desde abajo (en pantallas anchas queda centrada).
export function Hoja({ abierta, alCerrar, children, ancho = 520, titulo }) {
  // En computadora la hoja es una ventana centrada; en el celular sube desde abajo.
  const centrada = useAncho(760);
  useEffect(() => {
    if (!abierta) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tecla = (e) => { if (e.key === 'Escape') alCerrar?.(); };
    window.addEventListener('keydown', tecla);
    return () => { document.body.style.overflow = previo; window.removeEventListener('keydown', tecla); };
  }, [abierta, alCerrar]);
  if (!abierta) return null;
  return (
    <div onClick={alCerrar} style={{
      position: 'fixed', inset: 0, zIndex: 9400, background: 'rgba(20,24,18,0.5)',
      display: 'flex', alignItems: centrada ? 'center' : 'flex-end', justifyContent: 'center',
      padding: centrada ? 24 : 0, boxSizing: 'border-box',
    }}>
      <div role="dialog" aria-label={titulo} onClick={(e) => e.stopPropagation()} style={{
        width: `min(${ancho}px, 100%)`, maxHeight: centrada ? 'calc(100dvh - 48px)' : 'calc(100dvh - 40px)', overflowY: 'auto',
        overscrollBehavior: 'contain', background: t.fondo, borderRadius: centrada ? 26 : '26px 26px 0 0',
        boxShadow: '0 -20px 50px rgba(0,0,0,0.25)', boxSizing: 'border-box',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)', position: 'relative',
      }}>
        {alCerrar && (
          <button type="button" aria-label="Cerrar" onClick={alCerrar} style={{
            position: 'absolute', top: 12, right: 12, zIndex: 2, width: 36, height: 36, borderRadius: '50%',
            border: 'none', background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.texto,
          }}><X size={18} /></button>
        )}
        {children}
      </div>
    </div>
  );
}

export function Vacio({ icono: Icono = Leaf, titulo, texto, children }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: t.suave }}>
      <Icono size={34} style={{ opacity: 0.6, marginBottom: 10 }} />
      <p style={{ margin: '0 0 4px', fontWeight: 800, color: t.texto }}>{titulo}</p>
      {texto && <p style={{ margin: 0, fontSize: '0.9rem' }}>{texto}</p>}
      {children}
    </div>
  );
}
