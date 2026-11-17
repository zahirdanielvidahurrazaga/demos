import { useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ESPEJO (17-nov) — fondo detrás del mockup: una copia de lo que se ve en la
// pantalla del iPhone, en grande y muy difuminada (como el catálogo de
// Navidad, que difumina la portada detrás de la revista).
// CALMADO a pedido de Zahir ("más estático, parpadeaba al cambiar de página"):
// solo se vuelve a copiar cuando la pantalla lleva QUIETA un rato (o como
// máximo cada pocos segundos si algo se mueve sin parar), nunca por el scroll,
// y la copia nueva se FUNDE despacio sobre la anterior. Si lo copiado es igual
// a lo que ya está, no hace nada. Solo es decorado: aria-hidden, inert.
// ─────────────────────────────────────────────────────────────────────────────
const SCROLLS = '.ba-cuerpo, .ba-carrusel, .ba-hoja-scroll, .ba-paso-cuerpo, .ba-recompensas, .ba-chips.cats';
const QUIETO = 900;     // ms sin cambios antes de copiar
const TOPE = 4000;      // aunque algo se mueva sin parar, copia a lo mucho cada 4 s
const FUNDIDO = 1600;   // ms (igual que la transición de .capa en bocado.css)

export default function Espejo({ selector }) {
  const lienzo = useRef(null);

  useEffect(() => {
    let fuente = null; let mo = null; let espera = 0; let tope = 0; let reloj = 0; let ultimo = '';
    const ajustar = () => {
      if (!fuente || !lienzo.current) return;
      const w = fuente.offsetWidth; const h = fuente.offsetHeight;
      const k = Math.max(window.innerWidth / w, window.innerHeight / h) * 1.05;   // la pantalla cubre toda la ventana
      Object.assign(lienzo.current.style, { width: `${w}px`, height: `${h}px`, transform: `translate(-50%, -50%) scale(${k})` });
    };
    const copiar = () => {
      clearTimeout(espera); clearTimeout(tope); espera = 0; tope = 0;
      const caja = lienzo.current;
      if (!fuente || !caja) return;
      const html = fuente.innerHTML;
      if (html === ultimo) return;
      ultimo = html;
      const copia = fuente.cloneNode(true);
      const capa = document.createElement('div'); capa.className = 'capa'; capa.appendChild(copia);
      caja.appendChild(capa);
      const a = fuente.querySelectorAll(SCROLLS); const b = copia.querySelectorAll(SCROLLS);
      a.forEach((el, i) => { if (b[i]) { b[i].scrollTop = el.scrollTop; b[i].scrollLeft = el.scrollLeft; } });
      requestAnimationFrame(() => requestAnimationFrame(() => capa.classList.add('on')));
      // las capas viejas se van cuando la nueva ya cubrió
      setTimeout(() => { [...caja.children].forEach((c) => { if (c !== capa && c !== caja.lastElementChild) c.remove(); }); }, FUNDIDO + 100);
    };
    const pedir = () => {
      clearTimeout(espera); espera = setTimeout(copiar, QUIETO);
      if (!tope) tope = setTimeout(copiar, TOPE);
    };
    const atar = () => {
      mo = new MutationObserver(pedir);
      mo.observe(fuente, { subtree: true, childList: true, attributes: true, characterData: true });
    };
    const revisar = () => {
      // React puede volver a montar el iPhone: si el nodo cambió, se re-engancha.
      const actual = document.querySelector(selector);
      if (!actual || actual === fuente) return;
      mo?.disconnect(); fuente = actual; atar(); ajustar(); pedir();
    };
    revisar();
    reloj = setInterval(revisar, 500);
    window.addEventListener('resize', ajustar);
    return () => {
      clearInterval(reloj); clearTimeout(espera); clearTimeout(tope); mo?.disconnect();
      window.removeEventListener('resize', ajustar);
    };
  }, [selector]);

  return (
    <div className="bb-espejo" aria-hidden="true" inert="">
      <div className="lienzo" ref={lienzo} />
      <div className="velo" />
    </div>
  );
}
