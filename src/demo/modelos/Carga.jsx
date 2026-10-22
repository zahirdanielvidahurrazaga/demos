import { useEffect, useRef, useState } from 'react';
import { AGENCIA, MODELOS, FOTO } from './datos';

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA DE CARGA — al entrar al sitio, una vez por visita. La carga forma
// el logo: KADE en contorno que se llena de abajo hacia arriba con el % (ligado
// a lo que de verdad ya cargó, con un mínimo de 2 s para que se vea). En 100
// sale "Model Management" y se abre como telón hacia el video. (La primera
// versión apilaba polaroids; a Zahir no le gustó, 22-oct.)
// ─────────────────────────────────────────────────────────────────────────────

const LLAVE = 'demo_modelos_carga';
const MINIMO = 2000;
export const yaCargo = () => { try { return sessionStorage.getItem(LLAVE) === '1'; } catch { return false; } };
export const olvidarCarga = () => { try { sessionStorage.removeItem(LLAVE); } catch { /* */ } };

export default function Carga({ alTerminar }) {
  const [pct, setPct] = useState(0);
  const [fase, setFase] = useState('cargando');   // cargando → nombre → abre
  const real = useRef(0);
  const fin = useRef(alTerminar);
  useEffect(() => { fin.current = alTerminar; });

  // lo que de verdad hay que cargar antes de enseñar el sitio
  useEffect(() => {
    const urls = ['/modelos/mira/video/hero-1.jpg', ...MODELOS.map((m) => FOTO(m.id, 'book'))];   // la portada del video y el carrusel
    let listos = 0;
    urls.forEach((u) => {
      const img = new Image();
      img.onload = img.onerror = () => { listos += 1; real.current = listos / urls.length; };
      img.src = u;
    });
  }, []);

  // el % avanza con el tiempo, pero nunca más allá de lo que ya cargó
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
    // si algo no responde, a los 7 s se entra igual
    const tope = setTimeout(() => { real.current = 1; }, 7000);
    return () => { cancelAnimationFrame(raf); clearTimeout(tope); };
  }, []);

  useEffect(() => {
    if (pct < 100) return undefined;
    const t1 = setTimeout(() => setFase('nombre'), 250);
    const t2 = setTimeout(() => setFase('abre'), 1500);
    const t3 = setTimeout(() => { try { sessionStorage.setItem(LLAVE, '1'); } catch { /* */ } fin.current(); }, 2450);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pct]);

  return (
    <div className={`mo-carga fase-${fase}`} role="status" aria-live="polite" aria-label={`Cargando ${AGENCIA.completo}, ${pct}%`}>
      <div className="mo-carga-telon arriba" />
      <div className="mo-carga-telon abajo" />
      <div className="mo-carga-contenido">
        <div className="mo-carga-centro">
          <div className="mo-carga-logo" aria-hidden="true">
            <span className="mo-carga-contorno">{AGENCIA.nombre}</span>
            <span className="mo-carga-lleno" style={{ clipPath: `inset(${100 - pct}% 0 0 0)` }}>{AGENCIA.nombre}</span>
          </div>
          <div className="mo-carga-linea"><i style={{ width: `${pct}%` }} /></div>
          <span className="mo-carga-num mo-mono" aria-hidden="true">{fase === 'cargando' ? `${String(pct).padStart(2, '0')}%` : 'Model Management'}</span>
        </div>
      </div>
    </div>
  );
}
