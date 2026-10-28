import { useEffect, useRef, useState } from 'react';
import {
  EXTRAS, IMG, NEGOCIO, PRODUCTOS, TAMANOS, agotado, agregarAlCarrito, llegaHoy, ocasion, peso, precioProducto, unidad, useFlores,
} from './datos';
import { avisarListo } from './comun';
import { useNav } from './Sitio';

// ─────────────────────────────────────────────────────────────────────────────
// PORTADA — "Galería" (28-oct-2026, 5ª versión; referencia de Zahir: un sitio
// de portafolio minimalista de Dribbble). Le gustó TAL CUAL la maqueta.
// Descartadas: palabra "Dalia" gigante con flores flotando, "Herbario",
// "Jardín que crece" y foto a sangre (jarrón y manos).
//
// Columna central de ramos que corre sola en bucle: la del centro a tamaño
// completo y las de los lados más chicas pero PEGADAS (Y(u) suma los altos ya
// achicados); nombre y precio en vertical; miniaturas con esquineros a la
// derecha; titular que se arma letra por letra. Dentro del sitio el scroll de
// la página empuja la columna (no se secuestra la rueda) y con ratón se puede
// arrastrar. Todo se mide en "piezas" (1 = una foto). Al tocar la del centro
// NO se cambia de pantalla: la columna se detiene, la foto crece y se va a la
// izquierda (arriba en celular), las demás se desvanecen y a la derecha sale
// la ficha (tamaño, complementos, agregar). ✕ / Esc regresa; ← → cambian.
// ─────────────────────────────────────────────────────────────────────────────


const GAP = 8;
const ACHICA = 0.1, TOPE = 1.6;
const VEL_SOLA = 0.0035;
const escala = (u) => 1 - ACHICA * Math.min(Math.abs(u), TOPE);
function Y(u, H) {
  const a = Math.abs(u);
  const tramo = Math.min(a, TOPE);
  let y = (H + GAP) * tramo - (ACHICA * H / 2) * tramo * tramo;
  if (a > TOPE) y += (H * (1 - ACHICA * TOPE) + GAP) * (a - TOPE);
  return Math.sign(u) * y;
}

export default function Portada() {
  const e = useFlores();
  const { ir } = useNav();
  const ramos = PRODUCTOS;
  const N = ramos.length;
  const escena = useRef(null);
  const piezas = useRef([]);
  const estado = useRef({ pos: 0, vel: 0, meta: null, quieto: 0, arr: null, H: 400, W: 320, abre: 0, objetivo: 0 });
  const [activo, setActivo] = useState(0);
  const [listo, setListo] = useState(false);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => { const id = setTimeout(() => setListo(true), 150); return () => clearTimeout(id); }, []);

  useEffect(() => {
    const s = estado.current;
    const el = escena.current;
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const medir = () => {
      const movil = window.innerWidth < 760;
      const alto = el.clientHeight;
      if (!alto) return;   // oculto: se mide al aparecer
      s.W = movil ? Math.min(window.innerWidth * 0.56, alto * 0.62, 300) : Math.min(window.innerWidth * 0.26, alto * 0.56, 420);
      s.H = s.W * 1.25;
      el.style.setProperty('--w', `${s.W}px`);
    };
    medir();
    // también cuando aparece: si se entró como Taller, el sitio estaba oculto
    // (alto 0) y al cambiar a Cliente las fotos quedaban en ancho cero
    const ro = new ResizeObserver(medir);
    ro.observe(el);

    // el scroll de la página empuja la columna (no cuando hay un ramo abierto)
    let ultimoY = window.scrollY;
    const alScroll = () => {
      const d = window.scrollY - ultimoY; ultimoY = window.scrollY;
      if (s.objetivo) return;
      s.vel += d * 0.0009; s.meta = null; s.quieto = performance.now();
    };
    window.addEventListener('scroll', alScroll, { passive: true });

    let raf, ultimo = -1;
    const cuadro = (t) => {
      if (s.meta !== null) { s.pos += (s.meta - s.pos) * 0.09; if (Math.abs(s.meta - s.pos) < 0.002) { s.pos = s.meta; s.meta = null; } }
      else if (!s.arr && !s.objetivo) {
        s.pos += s.vel; s.vel *= 0.92;
        if (!quieto && Math.abs(s.vel) < 0.001 && t - s.quieto > 2500) s.pos += VEL_SOLA;
      }
      s.abre += (s.objetivo - s.abre) * (quieto ? 1 : 0.11);
      if (Math.abs(s.objetivo - s.abre) < 0.001) s.abre = s.objetivo;
      const ab = s.abre * s.abre * (3 - 2 * s.abre);   // suavizado
      const SW = el.clientWidth, SH = el.clientHeight, c = SH / 2, T = 3 * N;
      // a dónde va el ramo abierto: grande y a la izquierda (arriba en celular)
      const movil = SW < 760;
      // en celular la foto va arriba con alto fijo (75% del ancho) y la ficha
      // fluye debajo (el CSS deja ese mismo espacio con padding-top)
      const Hb = movil ? SW * 0.75 : SH * 0.86;
      const sb = Hb / s.H;
      const cx = movil ? SW / 2 : Math.max(40 + (s.W * sb) / 2, SW * 0.28);
      const cy = movil ? 18 + Hb / 2 : c;
      piezas.current.forEach((p, k) => {
        if (!p) return;
        const u = ((k - s.pos + T / 2) % T + T) % T - T / 2;
        const foco = Math.abs(u) < 0.5;
        const y0 = c + Y(u, s.H) - s.H / 2, sc0 = escala(u);
        if (foco && ab > 0) {
          const dx = (cx - SW / 2) * ab, y = y0 + (cy - s.H / 2 - y0) * ab, sc = sc0 + (sb - sc0) * ab;
          p.style.transform = `translate(calc(-50% + ${dx}px), ${y}px) scale(${sc})`;
          p.style.opacity = 1;
          p.style.zIndex = 200;
        } else {
          p.style.transform = `translate(-50%, ${y0}px) scale(${sc0})`;
          p.style.opacity = 1 - ab;
          p.style.zIndex = 100 - Math.round(Math.abs(u) * 10);
        }
        p.classList.toggle('foco', foco && ab > 0.02);
      });
      const a = ((Math.round(s.pos) % N) + N) % N;
      if (a !== ultimo) { ultimo = a; setActivo(a); }
      raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('scroll', alScroll); };
  }, [N]);

  const irA = (i) => {
    const s = estado.current;
    const actual = Math.round(s.pos);
    let dif = i - (((actual % N) + N) % N);
    if (dif > N / 2) dif -= N;
    if (dif < -N / 2) dif += N;
    s.meta = actual + dif; s.vel = 0; s.quieto = performance.now();
  };
  const abrir = () => {
    const s = estado.current;
    s.meta = Math.round(s.pos); s.vel = 0; s.objetivo = 1; setAbierto(true);
    // en celular se esconde el titular y todo sube: se desliza la página para
    // que la foto quede justo bajo el encabezado (con un ramo abierto el
    // scroll ya no empuja la columna)
    if (window.innerWidth < 760) {
      requestAnimationFrame(() => {
        const cab = document.querySelector('.fl-cab')?.getBoundingClientRect().bottom || 0;
        const top = escena.current.getBoundingClientRect().top;
        window.scrollTo({ top: window.scrollY + top - cab, behavior: 'smooth' });
      });
    }
  };
  const cerrar = () => { const s = estado.current; s.objetivo = 0; s.quieto = performance.now(); setAbierto(false); };

  useEffect(() => {
    if (!abierto) return undefined;
    const f = (ev) => {
      if (ev.key === 'Escape') cerrar();
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') irA((activo + 1) % N);
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') irA((activo - 1 + N) % N);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  });

  // arrastre solo con ratón (en celular el dedo baja la página)
  const abajo = (ev) => {
    const s = estado.current;
    if (s.objetivo) return;
    const raton = ev.pointerType === 'mouse';
    s.arr = { y: ev.clientY, p: s.pos, d: 0, v: 0, raton };
    if (raton) { s.meta = null; s.vel = 0; ev.currentTarget.setPointerCapture(ev.pointerId); }
  };
  const mueve = (ev) => {
    const s = estado.current;
    if (!s.arr?.raton) return;
    const d = (s.arr.y - ev.clientY) / (s.H + GAP);
    s.arr.v = d - s.arr.d; s.arr.d = d; s.pos = s.arr.p + d; s.quieto = performance.now();
  };
  const arriba = (ev) => {
    const s = estado.current;
    if (!s.arr) return;   // soltar sin haber presionado aquí no cuenta como toque
    const corto = Math.abs(s.arr.d) * (s.H + GAP) < 4;
    if (!corto) s.vel = s.arr.v;
    s.arr = null; s.quieto = performance.now();
    if (!corto) return;
    // tocar la del centro la abre aquí mismo; arriba o abajo, la trae al centro
    const r = escena.current.getBoundingClientRect();
    const y = ev.clientY - r.top, c = r.height / 2;
    if (Math.abs(y - c) < s.H / 2) abrir();
    else irA((activo + (y > c ? 1 : -1) + N) % N);
  };

  const palabras = [['Ramos', 'de'], ['temporada']];
  let k = 0;
  const hoy = llegaHoy();

  return (
    <section className={`fl-galeria ${listo ? 'listo' : ''} ${abierto ? 'abierta' : ''}`}>
      <div ref={escena} className="fl-galeria-columna" onPointerDown={abajo} onPointerMove={mueve} onPointerUp={arriba} onPointerCancel={() => { estado.current.arr = null; }}
        tabIndex={abierto ? -1 : 0} role="region" aria-label={`Ramos de temporada. ${ramos[activo].nombre}: Enter para abrir, flechas para cambiar`}
        onKeyDown={(ev) => {
          if (abierto) return;
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); }
          if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') { ev.preventDefault(); irA((activo + 1) % N); }
          if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') { ev.preventDefault(); irA((activo - 1 + N) % N); }
        }}>
        {[0, 1, 2].flatMap((v) => ramos.map((p, i) => (
          <div key={`${v}-${p.id}`} ref={(n) => { piezas.current[v * N + i] = n; }} className="fl-galeria-pieza">
            <img src={IMG(p.foto)} alt={v === 1 ? p.nombre : ''} draggable={false} loading={v === 1 && i < 3 ? 'eager' : 'lazy'} />
            <div className="fl-galeria-rotulo"><b>{p.nombre}</b><span>desde {peso(precioProducto(e, p, 'S'))}</span></div>
          </div>
        )))}
      </div>

      <div className="fl-galeria-minis" aria-hidden={abierto}>
        {ramos.map((p, i) => (
          <button key={p.id} type="button" tabIndex={abierto ? -1 : 0} className={`fl-galeria-mini ${i === activo ? 'activa' : ''}`} style={{ transitionDelay: `${120 + i * 70}ms` }} onClick={() => irA(i)} aria-label={p.nombre}>
            <img src={IMG(p.foto)} alt="" /><i />
          </button>
        ))}
      </div>

      <div className="fl-galeria-titular" aria-hidden={abierto}>
        <small>({N})</small>
        <h1>
          {palabras.map((linea) => (
            <span key={linea.join()} className="fl-galeria-linea">
              {linea.map((w, j) => (
                <span key={w} className="fl-galeria-palabra" style={{ '--i': k++ }}>{w}{j < linea.length - 1 ? ' ' : ''}</span>
              ))}
            </span>
          ))}
        </h1>
        <button type="button" tabIndex={abierto ? -1 : 0} onClick={() => ir('catalogo')}>Ver todos</button>
      </div>

      <button type="button" className="fl-galeria-pie" tabIndex={abierto ? -1 : 0} onClick={() => document.getElementById('fl-entrega')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
        <span>{hoy ? 'Llega hoy' : 'Llega mañana'}</span>
        <span>{hoy ? `Pide antes de ${NEGOCIO.corte - 12} pm` : 'Desde las 9 am'}</span>
        <span className="flecha">↓</span>
      </button>

      {abierto && <FichaGaleria key={ramos[activo].id} p={ramos[activo]} i={activo} n={N} alCerrar={cerrar}
        alMover={(d) => irA((activo + d + N) % N)} />}
    </section>
  );
}

// La ficha que aparece a la derecha del ramo abierto (abajo en celular).
function FichaGaleria({ p, i, n, alCerrar, alMover }) {
  const e = useFlores();
  const { ir } = useNav();
  const [tam, setTam] = useState('M' in p.tam ? 'M' : 'S');
  const [extras, setExtras] = useState([]);
  const sinStock = agotado(e, p.id);
  const total = precioProducto(e, p, tam) + extras.reduce((t, x) => t + EXTRAS.find((y) => y.id === x).precio, 0);
  const agregar = (pagar) => {
    agregarAlCarrito({ tipo: 'producto', id: p.id, tam, extras });
    avisarListo(`${p.nombre} está en tu carrito`);
    if (pagar) ir('carrito');
  };
  return (
    <aside className="fl-galeria-ficha" aria-label={p.nombre}>
      <div className="fl-gf-cab">
        <span>({String(i + 1).padStart(2, '0')}/{n})</span>
        <div>
          <button type="button" onClick={() => alMover(-1)} aria-label="Ramo anterior">←</button>
          <button type="button" onClick={() => alMover(1)} aria-label="Ramo siguiente">→</button>
          <button type="button" onClick={alCerrar}>Cerrar ✕</button>
        </div>
      </div>
      <p className="fl-gf-ocasion">{p.ocasiones.map((o) => ocasion(o).nombre).join(' · ')}</p>
      <h2>{p.nombre}</h2>
      <p className="fl-gf-desc">{p.descripcion}</p>
      <div className="fl-gf-grupo" role="radiogroup" aria-label="Tamaño">
        {Object.entries(p.tam).map(([t, [cant]]) => (
          <button key={t} type="button" role="radio" aria-checked={tam === t} className={tam === t ? 'activo' : ''} onClick={() => setTam(t)}>
            <b>{TAMANOS[t]}</b><span>{cant} {unidad(p, cant)}</span><span>{peso(precioProducto(e, p, t))}</span>
          </button>
        ))}
      </div>
      <div className="fl-gf-extras">
        {EXTRAS.map((x) => {
          const si = extras.includes(x.id);
          return (
            <button key={x.id} type="button" aria-pressed={si} className={si ? 'activo' : ''} onClick={() => setExtras((l) => (si ? l.filter((y) => y !== x.id) : [...l, x.id]))}>
              {si ? '−' : '+'} {x.corto} <span>{peso(x.precio)}</span>
            </button>
          );
        })}
      </div>
      <div className="fl-gf-pie">
        <div><small>Total</small><b>{peso(total)}</b></div>
        {sinStock ? <button type="button" className="fl-gf-boton" disabled>Agotado hoy</button> : (<>
          <button type="button" className="fl-gf-boton linea" onClick={() => agregar(false)}>Agregar</button>
          <button type="button" className="fl-gf-boton" onClick={() => agregar(true)}>Enviar este ramo</button>
        </>)}
      </div>
      <button type="button" className="fl-gf-mas" onClick={() => ir('ficha', { id: p.id })}>Ver ficha completa →</button>
    </aside>
  );
}
