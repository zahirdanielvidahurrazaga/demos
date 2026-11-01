import { useEffect, useRef } from 'react';
import { IMG } from './datos';
import { fundido } from './fundido';

// ─────────────────────────────────────────────────────────────────────────────
// Una toma "viva": los cuadros `de`..`a` del render del recorrido corriendo
// solos de ida y vuelta, despacio, como un video corto en bucle (1-nov-2026:
// que las imágenes del render sean las protagonistas del resto de la página).
// Usa los MISMOS archivos que el recorrido (r/ y rm/), así que salen de la
// caché y, cuando llegan los cuadros finales del render, se ven solos.
// Solo corre mientras está en pantalla; con movimiento reducido se queda en
// el primer cuadro.
// ─────────────────────────────────────────────────────────────────────────────

const ruta = (k) => `${IMG}/${window.innerWidth < 820 ? 'rm' : 'r'}/${String(k).padStart(4, '0')}.webp`;
const sirve = (im) => im?.complete && im.naturalWidth > 0;

function cubrir(ctx, im, w, h, alfa = 1) {
  const e = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  ctx.globalAlpha = alfa;
  ctx.drawImage(im, (w - im.naturalWidth * e) / 2, (h - im.naturalHeight * e) / 2, im.naturalWidth * e, im.naturalHeight * e);
  ctx.globalAlpha = 1;
}

export default function Toma({ de, a, className = '', cps = 6 }) {
  const lienzo = useRef(null);

  useEffect(() => {
    const c = lienzo.current;
    const ctx = c.getContext('2d');
    const n = a - de + 1;
    const cuadros = [];
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let ciclo = 0;
    let visible = false;
    let t0 = 0;

    const ajustar = () => {
      const d = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(c.clientWidth * d);
      c.height = Math.round(c.clientHeight * d);
    };

    const dibujar = (pos) => {
      const k = Math.floor(pos);
      let im = cuadros[k];
      if (!sirve(im)) im = cuadros.find(sirve);
      if (!im) return;
      cubrir(ctx, im, c.width, c.height);
      const sig = cuadros[k + 1];
      const alfa = fundido(pos - k, false);
      if (im === cuadros[k] && sirve(sig) && alfa > 0) cubrir(ctx, sig, c.width, c.height, alfa);
    };

    // ida y vuelta: 0 → n-1 → 0
    const correr = (ahora) => {
      if (!t0) t0 = ahora;
      const x = (((ahora - t0) / 1000) * cps) % (2 * (n - 1));
      dibujar(x < n - 1 ? x : 2 * (n - 1) - x);
      ciclo = visible && !quieto ? requestAnimationFrame(correr) : 0;
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !cuadros.length) {
        for (let k = 0; k < n; k++) {
          const im = new Image();
          im.decoding = 'async';
          im.onload = () => { if (k === 0 || !ciclo) dibujar(0); };
          im.src = ruta(de + k);
          cuadros.push(im);
        }
      }
      if (visible && !ciclo && !quieto) ciclo = requestAnimationFrame(correr);
    }, { rootMargin: '200px 0px' });

    ajustar();
    io.observe(c);
    window.addEventListener('resize', ajustar);
    return () => { io.disconnect(); cancelAnimationFrame(ciclo); window.removeEventListener('resize', ajustar); };
  }, [de, a, cps]);

  return <canvas ref={lienzo} className={`re-toma ${className}`} aria-hidden />;
}
