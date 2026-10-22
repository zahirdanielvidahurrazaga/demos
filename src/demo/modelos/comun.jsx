import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { fotoDe } from './datos';

// Piezas compartidas por el sitio, la app de la modelo y el panel.

// Foto con respaldo: si la imagen no carga, iniciales sobre papel.
export function Foto({ src, alt = '', className = '', style, iniciales, children }) {
  // recuerda QUÉ foto falló: si cambia el src, se vuelve a intentar sola
  const [fallo, setFallo] = useState(null);
  const mal = fallo === src;
  return (
    <div className={`mo-foto ${className}`} style={style}>
      {src && !mal
        ? <img src={src} alt={alt} loading="lazy" onError={() => setFallo(src)} />
        : <div className="mo-foto-vacia">{iniciales || '·'}</div>}
      {children}
    </div>
  );
}

export const inicialesDe = (m) => `${m?.nombre?.[0] || ''}${m?.apellido?.[0] || ''}`;

export function FotoModelo({ m, tipo = 'book', className, style, children }) {
  return <Foto src={fotoDe(m, tipo)} alt={`${m.nombre} ${m.apellido}`} iniciales={inicialesDe(m)} className={className} style={style}>{children}</Foto>;
}

export function Polaroid({ m, src, pie, extra, style }) {
  return (
    <div className="mo-polaroid" style={style}>
      {m ? <FotoModelo m={m} tipo="polaroid" /> : <Foto src={src} />}
      <div className="mo-polaroid-pie">
        <span className="mo-lapiz" style={{ fontSize: '1.25rem' }}>{pie}</span>
        {extra}
      </div>
    </div>
  );
}

const SELLOS = {
  opcion: ['Opción', 'ambar'],
  aceptado: ['Aceptó', 'ambar'],
  confirmado: ['Confirmado', 'verde'],
  rechazado: ['No puede', 'rojo'],
  liberado: ['Liberado', 'tenue'],
  realizado: ['Realizado', 'tenue'],
  nueva: ['Nueva', 'rojo'],
  en_opcion: ['Con modelos', 'ambar'],
  cotizada: ['Cotizada', 'ambar'],
  confirmada: ['Confirmada', 'verde'],
  cancelada: ['Cancelada', 'tenue'],
  pendiente: ['Pendiente', 'ambar'],
  no: ['No va', 'tenue'],
  casting: ['A casting', 'ambar'],
  firmada: ['Firmada', 'verde'],
  descartada: ['Descartada', 'tenue'],
};
export function Sello({ estado, texto }) {
  const [t, color] = SELLOS[estado] || [estado, 'tenue'];
  return <span className={`mo-sello mo-sello-${color}`}>{texto || t}</span>;
}

// Ventana modal accesible (la misma idea que Sorteos): foco adentro, Tab no se
// sale, Escape cierra, la página de atrás no se mueve.
export function Modal({ alCerrar, ancho, children, etiqueta }) {
  const ref = useRef(null);
  useEffect(() => {
    const antes = document.activeElement;
    const html = document.documentElement;
    const previo = { h: html.style.overflow, b: document.body.style.overflow };
    html.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
    const enfocables = () => [...(ref.current?.querySelectorAll('button:not([disabled]), input, select, textarea, a[href]') || [])];
    (enfocables()[0])?.focus({ preventScroll: true });
    const tecla = (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); alCerrar(); return; }
      if (ev.key !== 'Tab') return;
      const els = enfocables();
      if (!els.length) return;
      const primero = els[0], ultimo = els[els.length - 1];
      if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      html.style.overflow = previo.h; document.body.style.overflow = previo.b;
      antes?.focus?.({ preventScroll: true });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="mo-modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div ref={ref} className={`mo-modal ${ancho ? 'mo-modal-ancho' : ''}`} role="dialog" aria-modal="true" aria-label={etiqueta}>
        <button type="button" className="mo-modal-cerrar" onClick={alCerrar} aria-label="Cerrar"><X size={18} /></button>
        {children}
      </div>
    </div>
  );
}

export function Campo({ etiqueta, children, style }) {
  return <label className="mo-campo" style={style}><span>{etiqueta}</span>{children}</label>;
}

// Reduce una foto para guardarla en la demo (localStorage).
export function miniatura(archivo, ancho = 360) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, ancho / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

// Para el input de fecha/hora local
export const aLocal = (ts) => { const d = new Date(ts); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

// Mide el encabezado fijo de KADE y deja su alto en --mo-cab (en el .mo de
// arriba): en celular es mucho más alto (logo + fila de secciones) y lo que
// se queda fijo debajo de él (el carrusel) tiene que saber dónde empieza.
export function useAltoCabeza() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const raiz = el?.closest('.mo');
    if (!el || !raiz) return undefined;
    const ro = new ResizeObserver(() => raiz.style.setProperty('--mo-cab', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return ref;
}
