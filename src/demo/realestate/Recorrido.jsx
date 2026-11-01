import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fundido } from './fundido';
import { IMG, TEXTOS, TOMAS, TORRE, dineroCorto } from './datos';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// Una toma continua del render de Blender (1-nov-2026) que avanza con el
// scroll: el recorrido (pasillo → sala → cocina, abre la página) o la
// recámara (`toma`, ver TOMAS en datos.js). Lienzo pegado a la pantalla en
// una sección alta; el scroll mueve la cámara según sus tramos y los tramos
// con texto avanzan despacio para leerlos.
//
// Cuadros webp a 1920 (en celular solo el centro, a resolución completa),
// fundiendo cada uno con el siguiente solo en el cambio (fundido.js); se
// piden por pasadas (≈50 primero, luego la mitad que falta…) y se
// decodifican al llegar. El recorrido se pide de inmediato (es la portada);
// las demás tomas al acercarse. El avance alcanza al scroll poco a poco (la
// rueda salta ~100 px por giro).
// ─────────────────────────────────────────────────────────────────────────────

const chico = () => window.innerWidth < 820;
const quieto = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// la serie de cuadros que toca según la pantalla
const serie = (toma) => (chico() ? { dir: toma.movil, n: toma.nMovil } : { dir: toma.compu, n: toma.n });
const sirve = (im) => !!im?.decodificada && im.naturalWidth > 0;


function cargar(src, alListo) {
  const im = new Image();
  im.decoding = 'async';
  im.onload = () => {
    (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => { im.decodificada = true; alListo?.(); });
  };
  im.onerror = () => alListo?.();
  im.src = src;
  return im;
}

// Dibuja `im` cubriendo el lienzo.
function cubrir(ctx, im, w, h, alfa = 1) {
  const e = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const iw = im.naturalWidth * e;
  const ih = im.naturalHeight * e;
  ctx.globalAlpha = alfa;
  ctx.drawImage(im, (w - iw) / 2, (h - ih) / 2, iw, ih);
  ctx.globalAlpha = 1;
}

// Dónde va el scroll `p`: { n: índice del tramo, t: 0 a 1 dentro de él }.
function ubicar(tramos, p) {
  let a = 0;
  for (let n = 0; n < tramos.length; n++) {
    const d = tramos[n].dur;
    if (p <= a + d || n === tramos.length - 1) return { n, t: Math.min(1, Math.max(0, (p - a) / d)) };
    a += d;
  }
  return { n: 0, t: 0 };
}

function Portada({ onReservar, opacidad }) {
  return (
    <div className="re-portada" style={{ opacity: opacidad }}>
      <p className="re-sobre">{TORRE.barrio}</p>
      <h1>Step inside <em>The Halden.</em></h1>
      <p className="re-portada-sub">{TORRE.pisos} stories · {TORRE.residencias} residences · from {dineroCorto(TORRE.desde)}</p>
      <div className="re-portada-acc">
        <button type="button" className="re-btn claro" onClick={onReservar}>Book a private tour</button>
        <a className="re-enlace claro" href="#residences">View residences</a>
      </div>
      <div className="re-baja" aria-hidden><span />Scroll to walk through</div>
    </div>
  );
}

// `onAvance(0..1)`: cuánto va de la primera pasada, lo que necesita la
// pantalla de carga para soltar la página (solo el recorrido).
export default function Recorrido({ toma = TOMAS.recorrido, onReservar, onAvance }) {
  const { tramos } = toma;
  const sr = useRef(null); // serie elegida al montar (no cambia si giran el teléfono)
  sr.current ??= serie(toma);
  const raiz = useRef(null);
  const lienzo = useRef(null);
  const cuadros = useRef([]);
  const actual = useRef(0); // cuadro (con decimales) que se está viendo
  const prog = useRef({ meta: 0, ahora: 0, ciclo: 0 });
  const [donde, setDonde] = useState({ n: 0, t: 0 });
  const [lista, setLista] = useState(false);

  function cuadroCerca(k) {
    const hay = cuadros.current;
    for (let d = 0; d < sr.current.n; d++) {
      for (const j of d ? [k - d, k + d] : [k]) if (sirve(hay[j])) return hay[j];
    }
    return null;
  }

  function dibujar() {
    const c = lienzo.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const { width: w, height: h } = c;
    const pos = actual.current;
    const k = Math.floor(pos);
    const im = cuadroCerca(k);
    if (!im) return;
    cubrir(ctx, im, w, h);
    const sig = cuadros.current[k + 1];
    const a = fundido(pos - k, !prog.current.ciclo);
    if (a > 0 && im === cuadros.current[k] && sirve(sig)) cubrir(ctx, sig, w, h, a);
  }

  function aplicar(p) {
    const u = ubicar(tramos, p);
    const tr = tramos[u.n];
    // de unidades de los tramos a cuadros de la serie
    actual.current = ((tr.de + (tr.a - tr.de) * u.t) / toma.base) * (sr.current.n - 1);
    dibujar();
    setDonde((d) => (d.n === u.n && Math.abs(d.t - u.t) < 0.02 ? d : u));
  }

  function suavizado() {
    const a = prog.current;
    const falta = a.meta - a.ahora;
    a.ahora = Math.abs(falta) < 0.0002 ? a.meta : a.ahora + falta * 0.14;
    aplicar(a.ahora);
    a.ciclo = a.ahora === a.meta ? 0 : requestAnimationFrame(suavizado);
    if (!a.ciclo) dibujar(); // ya quieto: un solo cuadro nítido
  }

  // Por pasadas: primero ≈50 repartidos, luego los de en medio…
  useEffect(() => {
    let vivo = true;
    const a = prog.current;
    const { dir, n } = sr.current;
    const ruta = (k) => `${IMG}/${dir}/${String(k + 1).padStart(4, '0')}.webp`;
    let paso = 1;
    while (n / paso > 60) paso *= 2;
    const pendientes = [];
    for (let p = paso; p >= 1; p /= 2) for (let k = 0; k < n; k += p) pendientes.push(k);
    let sig = 0;
    const primera = Math.ceil(n / paso);
    let listos = 0;
    const lanzar = () => {
      while (vivo && sig < pendientes.length) {
        const k = pendientes[sig++];
        if (cuadros.current[k]) continue;
        cuadros.current[k] = cargar(ruta(k), () => {
          if (!vivo) return;
          if (k === 0) setLista(true);
          if (k % paso === 0) onAvance?.(Math.min(1, ++listos / primera));
          dibujar();
          lanzar();
        });
        return;
      }
    };
    const empezar = () => { for (let i = 0; i < 6; i++) lanzar(); };
    let io = null;
    if (toma.tapa) empezar();
    else {
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); empezar(); } }, { rootMargin: '150% 0px' });
      io.observe(raiz.current);
    }
    // al desmontar (StrictMode monta dos veces) se olvidan: sus avisos ya no
    // dibujan y, si se quedaran, la segunda vuelta no los volvería a pedir
    return () => { vivo = false; io?.disconnect(); cuadros.current = []; cancelAnimationFrame(a.ciclo); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lienzo = pantalla × densidad (tope 2).
  useEffect(() => {
    const ajustar = () => {
      const c = lienzo.current;
      if (!c) return;
      const d = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(c.clientWidth * d);
      c.height = Math.round(c.clientHeight * d);
      dibujar();
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const st = ScrollTrigger.create({
      // el recorrido termina una pantalla antes: la última la tapa la hoja
      trigger: raiz.current, start: 'top top',
      end: () => `+=${raiz.current.offsetHeight - (toma.tapa ? 2 : 1) * window.innerHeight}`,
      onUpdate: (s) => {
        const a = prog.current;
        a.meta = s.progress;
        if (quieto() || Math.abs(a.meta - a.ahora) > 0.1) { a.ahora = a.meta; aplicar(a.ahora); return; }
        if (!a.ciclo) a.ciclo = requestAnimationFrame(suavizado);
      },
    });
    return () => st.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Texto del tramo en curso: entra en su primer 20% y se va en el último
  // (la portada ya está al llegar y el cierre se queda).
  const tr = tramos[donde.n];
  const clave = tr.texto;
  const primero = donde.n === 0;
  const ultimo = donde.n === tramos.length - 1;
  const op = clave ? Math.min(primero ? 1 : donde.t / 0.2, ultimo ? 1 : (1 - donde.t) / 0.2, 1) : 0;
  const texto = clave && TEXTOS[clave];

  return (
    <section ref={raiz} className="re-viaje" data-toma={toma.id} style={{ height: `${toma.alto}vh` }} aria-label={toma.etiqueta}>
      <div className="re-pegado">
        <canvas ref={lienzo} className={`re-lienzo ${lista ? 'listo' : ''}`} aria-hidden />
        <div className="re-velo" />
        {clave === 'portada' && <Portada onReservar={onReservar} opacidad={op} />}
        {texto && (
          <div key={clave} className="re-cap">
            <div style={{ opacity: op }}>
              <h2>{texto.titulo} <em>{texto.em}</em></h2>
              <p>{texto.texto}</p>
              {texto.cta && <button type="button" className="re-btn claro" onClick={onReservar}>Book a private tour</button>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
