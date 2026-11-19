import { useEffect, useRef, useState } from 'react';
import { AGENCIA } from './datos';
import { PRECARGA, Rasgado } from './kade';

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA DE CARGA — al entrar al sitio, una vez por visita. Una foto en
// blanco y negro que se va RASGANDO a color de izquierda a derecha con el %
// (ligado a lo que de verdad ya cargó: el video de la entrada; mínimo 2 s,
// tope 7 s). En 100 la foto sube como telón y aparece la entrada.
// (18-nov-2026: la del logo en contorno era del diseño anterior.)
// ─────────────────────────────────────────────────────────────────────────────

const LLAVE = 'demo_modelos_carga';
const MINIMO = 2000;
export const yaCargo = () => { try { return sessionStorage.getItem(LLAVE) === '1'; } catch { return false; } };
export const olvidarCarga = () => { try { sessionStorage.removeItem(LLAVE); } catch { /* */ } };

export default function Carga({ alTerminar }) {
  const [pct, setPct] = useState(0);
  const [fase, setFase] = useState('cargando');   // cargando → abre
  const real = useRef(0);
  const fin = useRef(alTerminar);
  useEffect(() => { fin.current = alTerminar; });

  // lo que hay que tener antes de abrir: las tres fotos de la entrada
  useEffect(() => {
    // el cuadro fijo del video + que el video ya tenga con qué arrancar
    const urls = [...PRECARGA];
    const ancho = window.innerWidth * (window.devicePixelRatio || 1) > 2000 ? 1440 : 1080;
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.src = `/modelos/kade/video/hero-${ancho}.mp4`;
    urls.push(v);
    let listos = 0;
    const uno = () => { listos += 1; real.current = listos / urls.length; };
    urls.forEach((u) => {
      if (typeof u !== 'string') { u.addEventListener('canplaythrough', uno, { once: true }); u.addEventListener('error', uno, { once: true }); u.load(); return; }
      const img = new Image();
      img.onload = img.onerror = uno;
      img.src = u;
    });
  }, []);

  useEffect(() => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inicio = performance.now();
    let raf = 0;
    const vuelta = (t) => {
      const porTiempo = Math.min(1, (t - inicio) / (quieto ? 400 : MINIMO));
      const v = Math.round(Math.min(porTiempo, real.current) * 100);
      setPct((p) => Math.max(p, v));
      if (v < 100) raf = requestAnimationFrame(vuelta);
    };
    raf = requestAnimationFrame(vuelta);
    const tope = setTimeout(() => { real.current = 1; }, 7000);
    return () => { cancelAnimationFrame(raf); clearTimeout(tope); };
  }, []);

  useEffect(() => {
    if (pct < 100) return undefined;
    const t1 = setTimeout(() => setFase('abre'), 450);
    const t2 = setTimeout(() => { try { sessionStorage.setItem(LLAVE, '1'); } catch { /* */ } fin.current(); }, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pct]);

  return (
    <div className={`kd kd-carga ${fase}`} role="status" aria-live="polite" aria-label={`Cargando ${AGENCIA.completo}, ${pct}%`}>
      <p className="kd-carga-txt">Cargando<span className="kd-puntos"><i /><i /><i /></span></p>
      <div className="kd-carga-foto">
        <Rasgado nombre="sofia-1" sizes="(max-width: 760px) 70vw, 34vw" semilla={7} p={pct} prioridad />
      </div>
      <p className="kd-carga-lema">[ Caras que se quedan ]</p>
      <p className="kd-carga-pct" aria-hidden="true">{pct}%</p>
    </div>
  );
}
