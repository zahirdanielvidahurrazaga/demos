import { useEffect, useMemo, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// PIEZAS DEL SITIO NUEVO DE KADE (18-nov-2026, rediseño "cine + revista").
// Fotos de Unsplash a máxima calidad: cada una existe en 1200 / 2400 / 3600 px
// (WebP) + 2400 en AVIF + un desenfoque de 24 px que se ve mientras llega.
// El navegador escoge el tamaño con `sizes`: en una Retina grande baja la de
// 3600, en un celular la de 1200. Nunca se estira una foto más allá de su
// tamaño. Prefijo de CSS: kd- (kade.css).
// ─────────────────────────────────────────────────────────────────────────────

const RUTA = '/modelos/kade';
export const srcKade = (n, w = 1200) => `${RUTA}/${n}-${w}.webp`;

// nombre = 'valeria-1' (sin tamaño). `prioridad` para lo que se ve al entrar.
export function Imagen({ nombre, sizes = '100vw', alt = '', prioridad = false, className = '', style, posicion }) {
  const [lista, setLista] = useState(false);
  const ref = useRef(null);
  // si ya estaba en caché, el onLoad pudo pasar antes de montar
  useEffect(() => { if (ref.current?.complete && ref.current.naturalWidth) setLista(true); }, [nombre]);
  if (!nombre) return <div className={`kd-img ${className}`} style={style} />;
  return (
    <div className={`kd-img ${lista ? 'lista' : ''} ${className}`} style={{ ...style, '--lqip': `url(${RUTA}/${nombre}-lqip.webp)`, '--pos': posicion }}>
      <picture>
        <source type="image/avif" srcSet={`${RUTA}/${nombre}-2400.avif 2400w`} sizes={sizes} />
        <source type="image/webp" srcSet={`${srcKade(nombre, 1200)} 1200w, ${srcKade(nombre, 2400)} 2400w, ${srcKade(nombre, 3600)} 3600w`} sizes={sizes} />
        <img ref={ref} src={srcKade(nombre, 2400)} alt={alt} decoding="async" loading={prioridad ? 'eager' : 'lazy'}
          fetchpriority={prioridad ? 'high' : undefined} onLoad={() => setLista(true)} draggable={false} />
      </picture>
    </div>
  );
}

// El borde de papel rasgado: una línea vertical irregular (siempre la misma
// por semilla) que se usa como clip-path. --p (registrado en CSS con
// @property) mueve la rasgadura de 0% a 100% y se puede animar.
function bordeRasgado(semilla, n = 46) {
  let s = semilla * 9301 + 49297;
  const azar = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  return Array.from({ length: n + 1 }, (_, k) => {
    const y = (k / n) * 100;
    const x = (azar() - 0.5) * 14 + (k % 7 === 0 ? (azar() - 0.5) * 12 : 0);
    return [x.toFixed(1), y.toFixed(2)];
  });
}
export function useRasgado(semilla = 1) {
  return useMemo(() => {
    const b = bordeRasgado(semilla);
    const linea = (extra = 0) => b.map(([x, y]) => `calc(var(--p) + ${(Number(x) + extra).toFixed(1)}px) ${y}%`);
    // color: de la izquierda hasta la rasgadura · papel: una tira de ~7 px pegada a ella
    const color = `polygon(-20px 0%, ${linea().join(', ')}, -20px 100%)`;
    const papel = `polygon(${linea(-2).join(', ')}, ${linea(7).reverse().join(', ')})`;
    return { color, papel };
  }, [semilla]);
}

// Foto en blanco y negro que se "rasga" a color. `p` = 0..100 (o controlado
// por CSS con la clase .kd-rasga-hover en el padre).
export function Rasgado({ nombre, sizes, semilla = 1, p, prioridad, posicion, alt = '', sinBase = false }) {
  const { color, papel } = useRasgado(semilla);
  return (
    <div className="kd-rasgado" style={p == null ? undefined : { '--p': `${p}%` }}>
      {!sinBase && <Imagen nombre={nombre} sizes={sizes} prioridad={prioridad} posicion={posicion} className="kd-bn" alt={alt} />}
      <div className="kd-rasgado-color" style={{ clipPath: color }}>
        <Imagen nombre={nombre} sizes={sizes} prioridad={prioridad} posicion={posicion} />
      </div>
      <div className="kd-rasgado-papel" style={{ clipPath: papel }} aria-hidden="true" />
    </div>
  );
}

// Solo el rasgado, sin foto (19-nov, los nombres del board): un fondo de tinta
// que entra rompiendo el papel, con la misma orilla blanca de las fotos.
export function RasgaFondo({ semilla = 1 }) {
  const { color, papel } = useRasgado(semilla);
  return (
    <span className="kd-rasgado kd-rasga-fondo" aria-hidden="true">
      <span className="kd-rasgado-color" style={{ clipPath: color }} />
      <span className="kd-rasgado-papel" style={{ clipPath: papel }} />
    </span>
  );
}

// "01. Talento" en rojo, como en una revista
export const Folio = ({ n, children }) => <p className="kd-folio">{String(n).padStart(2, '0')}. {children}</p>;
export const Enlace = ({ children, ...props }) => <button type="button" className="kd-enlace" {...props}>[ {children} ]</button>;

// lo que entra a la pantalla recibe .visto (las animaciones las pone el CSS)
export function useRevela(dep) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((xs) => xs.forEach((x) => {
      if (x.isIntersecting) { x.target.classList.add('visto'); io.unobserve(x.target); }
    }), { threshold: 0.12 });
    el.querySelectorAll('.kd-revela').forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [dep]);
  return ref;
}

// avance 0..1 de una sección mientras cruza la pantalla
export function useAvance() {
  const ref = useRef(null);
  const [a, setA] = useState(0);
  useEffect(() => {
    let raf = 0;
    const medir = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const t = (window.innerHeight - r.top) / (window.innerHeight + r.height);
        setA(Math.min(1, Math.max(0, t)));
      });
    };
    medir();
    window.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    return () => { window.removeEventListener('scroll', medir); window.removeEventListener('resize', medir); cancelAnimationFrame(raf); };
  }, []);
  return [ref, a];
}

export const FUENTES_KADE = 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800&family=Inter:wght@400;500&family=Courier+Prime:wght@400;700&display=swap';

// lo que la pantalla de carga deja listo antes de abrir: el cuadro fijo del video
export const PRECARGA = ['/modelos/kade/video/hero-poster.webp'];
