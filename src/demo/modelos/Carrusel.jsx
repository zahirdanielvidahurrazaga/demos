import { useEffect, useRef, useState } from 'react';
import { fotoDe, estaturaTxt } from './datos';
import { Letras } from './Portada';

// ─────────────────────────────────────────────────────────────────────────────
// CARRUSEL DE TIRAS — inspirado en aristidebenoist.com (solo la idea).
//
// La sección se queda fija mientras se hace scroll y el scroll mueve la fila
// de derecha a izquierda con inercia. Las tiras entran separadas y se van
// juntando; la foto adentro corre más lento que su tira (parallax). Quieta, la
// fila es plana y gris; al scrollear se abomba hacia ti en el centro de la
// pantalla según la velocidad (visto cuadro por cuadro en la grabación de Zahir del
// 21-oct). La que tiene el cursor (en celular, la del centro) toma color y
// abajo sale el nombre. Al dar clic la tira crece a pantalla completa y abre la
// portada de la modelo.
//
// Todo el movimiento se escribe directo al DOM en requestAnimationFrame; React
// solo se entera cuando cambia la tira activa.
// ─────────────────────────────────────────────────────────────────────────────

const lerp = (a, b, t) => a + (b - a) * t;
const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
const suave = (t) => 1 - (1 - t) ** 3;

export default function Carrusel({ modelos, abrir }) {
  const seccion = useRef(null);
  const pista = useRef(null);
  const tiras = useRef([]);
  const marcas = useRef([]);
  const [activa, setActiva] = useState(null);
  const [zoom, setZoom] = useState(null);
  // una tira por modelo (sin repetir), con la foto que ella eligió como principal
  const lista = modelos.map((m) => ({ m, t: m.principal || 'book', k: m.id }));
  const ids = modelos.map((m) => m.id);

  useEffect(() => {
    const sec = seccion.current;
    const conCursor = window.matchMedia('(hover: hover)').matches;
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let actual = 0, raf = 0, ultimaCentro = null, velocidad = 0;

    const objetivo = () => {
      const r = sec.getBoundingClientRect();
      const recorrido = sec.offsetHeight - window.innerHeight;
      return recorrido > 0 ? limitar(-r.top / recorrido, 0, 1) : 0;
    };
    // k: qué tan rápido se scrollea (0 quieto … 1 rápido). En reposo la fila es
    // plana y gris; al moverse se forma una joroba hacia ti en el centro
    // de la pantalla: esas tiras crecen, se acercan y toman
    // color, y las de las orillas giran y se adelgazan.
    const pintar = (p, k) => {
      const V = window.innerWidth;
      const n = tiras.current.length;
      const ancho = tiras.current[0]?.offsetWidth || 60;
      const hueco = lerp(V * 0.045, 16, suave(limitar(p * 3.2, 0, 1)));     // entran separadas y se juntan
      const total = n * ancho + (n - 1) * hueco;
      // simétrico: entra con la primera a media pantalla (izquierda en negro) y
      // sale con la última a media pantalla (derecha en negro). El último 10%
      // del scroll ya no se mueve, para que ese negro se alcance a ver.
      const q = limitar(p / 0.9, 0, 1);
      const x = lerp(V * 0.55, V * 0.45 - total, q);
      pista.current.style.transform = `translate3d(${x}px,0,0)`;
      pista.current.style.gap = `${hueco}px`;
      const centroFoco = V / 2;                                            // la joroba siempre al centro, como la referencia
      let centro = null, distancia = Infinity;
      tiras.current.forEach((el, i) => {
        if (!el) return;
        const cx = x + i * (ancho + hueco) + ancho / 2;
        const rel = cx / V - 0.5;
        const d = (cx - centroFoco) / V;                                   // distancia al foco, en pantallas
        const campana = Math.exp(-(d * d) / 0.045);                        // 1 en el foco, 0 lejos
        const z = k * campana;
        // como hojas de un libro: cada una gira sobre su eje y se estira hacia
        // arriba, sin moverse de su lugar (así nunca se enciman)
        el.style.transform = `rotateY(${limitar(d * k * 190, -78, 78)}deg) scaleY(${1 + z * 0.42})`;
        const img = el.firstChild;
        img.style.transform = `translate3d(${rel * -38}%,0,0)`;            // parallax adentro
        img.style.setProperty('--color', z.toFixed(3));
        const visible = cx > -ancho && cx < V + ancho;
        marcas.current[i]?.classList.toggle('on', visible);
        if (Math.abs(rel) < distancia) { distancia = Math.abs(rel); centro = i; }
      });
      if (!conCursor && centro !== ultimaCentro) { ultimaCentro = centro; setActiva(centro); }
    };
    const vuelta = () => {
      raf = requestAnimationFrame(vuelta);
      // oculto (otra vista de la demo) o fuera de pantalla: no se pinta nada
      const r = sec.getBoundingClientRect();
      if (!sec.offsetParent || r.bottom < 0 || r.top > window.innerHeight) return;
      const meta = objetivo();
      const antes = actual;
      actual = quieto ? meta : lerp(actual, meta, 0.085);                  // inercia
      if (Math.abs(meta - actual) < 0.00005) actual = meta;
      // velocidad suavizada: sube rápido al scrollear y regresa sola al soltar
      const ahora = limitar(Math.abs(actual - antes) * 140, 0, 1);
      velocidad = quieto ? 0 : lerp(velocidad, ahora, ahora > velocidad ? 0.25 : 0.06);
      pintar(actual, velocidad);
    };
    actual = objetivo();
    raf = requestAnimationFrame(vuelta);
    return () => cancelAnimationFrame(raf);
  }, [lista.length]);

  const entrar = (i, el) => {
    const r = el.getBoundingClientRect();
    const { m, t } = lista[i];
    setZoom({ src: fotoDe(m, t), r, abierto: false });
    requestAnimationFrame(() => requestAnimationFrame(() => setZoom((z) => z && { ...z, abierto: true })));
    setTimeout(() => { abrir(m.id, ids); setZoom(null); }, 750);
  };

  const sel = activa != null ? lista[activa] : null;
  return (
    <section ref={seccion} className="mo-carrusel" style={{ height: `calc(100vh + ${Math.max(1300, lista.length * 150)}px)` }} aria-label="Board de modelos">
      <div className="mo-carrusel-fijo">
        <div className="mo-marcas" aria-hidden="true">
          {lista.map((x, i) => <i key={x.k} ref={(el) => { marcas.current[i] = el; }} />)}
        </div>
        <div ref={pista} className="mo-pista">
          {lista.map(({ m, t, k }, i) => (
            <button key={k} ref={(el) => { tiras.current[i] = el; }} type="button" className={`mo-tira2 ${activa === i ? 'activa' : ''}`}
              onMouseEnter={() => setActiva(i)} onMouseLeave={() => setActiva((a) => (a === i ? null : a))}
              onFocus={() => setActiva(i)} onClick={(ev) => entrar(i, ev.currentTarget)} aria-label={`Ver a ${m.nombre} ${m.apellido}`}>
              <img src={fotoDe(m, t)} alt="" loading="lazy" draggable="false" />
            </button>
          ))}
        </div>
        <div className="mo-carrusel-pie" aria-live="polite">
          {sel ? (
            <div key={sel.m.id}>
              <p className="mo-gigante" style={{ fontSize: 'clamp(2.4rem, 5vw, 4.4rem)' }}><Letras texto={`${sel.m.nombre} ${sel.m.apellido}`} /></p>
              <p className="mo-eti" style={{ marginTop: 10 }}>Nº {sel.m.num} · {estaturaTxt(sel.m.estatura)} · {sel.m.categorias.join(' · ')}</p>
            </div>
          ) : <p className="mo-eti">Desliza para ver el board · toca una para entrar</p>}
        </div>
      </div>
      {zoom && (
        <div className="mo-zoom" style={zoom.abierto ? { top: 0, left: 0, width: '100vw', height: '100vh' } : { top: zoom.r.top, left: zoom.r.left, width: zoom.r.width, height: zoom.r.height }}>
          <img src={zoom.src} alt="" />
        </div>
      )}
    </section>
  );
}
