import { useEffect, useRef } from 'react';
import { IMG } from './datos';

// ─────────────────────────────────────────────────────────────────────────────
// Una toma "viva": un video corto en bucle del render (1-nov-2026), para que
// las imágenes sean las protagonistas fuera del recorrido. Antes se armaba
// pasando cuadros sueltos en un lienzo y se veía a saltos; ahora es un mp4
// que va y regresa (el bucle no brinca) y lo reproduce el navegador.
// public/realestate/halden/clips/<clip>.mp4 + <clip>.webp (primer cuadro).
// Solo corre mientras está en pantalla; con movimiento reducido se queda en
// el primer cuadro. Con `foto` (una imagen fija) no hay video: el navegador
// la acerca despacio con CSS (`.re-toma-foto`); hecho con zoom de ffmpeg
// temblaba, porque mueve la imagen de píxel en píxel.
// ─────────────────────────────────────────────────────────────────────────────

export default function Toma({ clip, foto, className = '' }) {
  const video = useRef(null);

  useEffect(() => {
    const v = video.current;
    if (!v || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { rootMargin: '100px 0px' });
    io.observe(v);
    return () => io.disconnect();
  }, [clip]);

  if (foto) return <img className={`re-toma re-toma-foto ${className}`} src={`${IMG}/${foto}.webp`} alt="" aria-hidden />;
  return (
    <video
      ref={video}
      className={`re-toma ${className}`}
      src={`${IMG}/clips/${clip}.mp4`}
      poster={`${IMG}/clips/${clip}.webp`}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
    />
  );
}
