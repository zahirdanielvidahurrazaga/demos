import { Suspense, forwardRef, lazy, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import App from './App';
import Iphone from './Iphone';
import { Bolsita, Dibujo, Isotipo, Logo, Nombre, Sello } from './comun';
import { ZONAS } from './zonasLocal';
import './expo.css';
import './recorrido.css';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// EXPOSICIÓN · RECORRIDO CON LA BOLSITA (25-nov-2026) — la ruta por defecto de
// /comida/buenbocado. Se abre con un QR en la clase de Emprendimiento: se ve
// en CELULAR. Zahir: "que se sienta como una animación" (transiciones con el
// scroll, vertical u horizontal) y la bolsita como anfitriona con globitos,
// compañera que flota y presentadora de la app.
//
// Portada (la bolsita saluda; el disco albahaca crece hasta llenar la pantalla
// y ella se va a la esquina) → 01 La app (fija: cada tramo de scroll es un paso
// del recorrido guiado y la app se mueve sola) → 02 El local (entra en círculo;
// el scroll lleva la cámara de zona en zona) → 03 La marca (el scroll vertical
// la recorre de lado, lámina por lámina) → cierre (la bolsita vuelve grande y
// se despide). Con "reducir movimiento" no hay nada fijo: todo en columna y los
// pasos/zonas se tocan. Prefijo bx-r- en recorrido.css.
// ─────────────────────────────────────────────────────────────────────────────

const Local3D = lazy(() => import('./Local3D'));

const GUIA = [
  { tipo: 'bienvenida', t: 'La primera vez', d: 'Registro con tu celular, qué buscas, qué evitas y cómo lo quieres.', dice: 'La primera vez te registras con tu celular.' },
  { tipo: 'personaliza', t: 'Personaliza', d: 'Sin cebolla, doble proteína, extra aguacate. Con kcal y proteína a la vista.', dice: '¿Sin cebolla? ¿Doble proteína? Tú mandas.' },
  { tipo: 'programa', t: 'Recoge a tu hora', d: 'Eliges día y hora; los horarios muestran cuánto cupo queda.', dice: 'Pídelo a las 9, recógelo a la 1.' },
  { tipo: 'domicilio', t: 'O te lo llevamos', d: 'A tu oficina, en la ventana de 15 minutos que elijas.', dice: '¿No puedes salir? Te lo llevamos.' },
  { tipo: 'semana', t: 'Arma tu semana', d: 'Cinco comidas en un minuto, con precio de plan.', dice: 'Toda tu semana en un minuto.' },
  { tipo: 'aviso', t: 'Te avisa', d: 'Cuando tu pedido llega a su casilla, te llega el número.', dice: 'Te aviso en qué casilla te espero.' },
  { tipo: 'camino', t: 'Síguelo en el mapa', d: 'Si es a domicilio, ves a tu repartidor en camino.', dice: 'Y si voy en camino, me ves en el mapa.' },
];

const DICE_ZONA = {
  corte: 'Este es nuestro local. ¡Pásale!',
  fachada: 'Desde la calle ves la cocina.',
  casillas: 'Aquí te espero, en tu casilla.',
  mostrador: '¿Dudas? Aquí te atienden.',
  cocina: 'Aquí me llenan de cosas ricas.',
  barra: '¿Te quedas? Hay barra.',
};

// ?mov=1 fuerza las animaciones aunque el sistema pida reducir movimiento (para revisar
// desde una compu con las animaciones de Windows apagadas).
const forzado = () => new URLSearchParams(window.location.search).get('mov') === '1';
const quieto = () => !forzado() && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const esCompu = () => window.matchMedia?.('(min-width: 900px)').matches;

// Lleva a una sección (con las secciones fijas, al punto donde empiezan).
function ir(id) {
  const el = document.getElementById(id); if (!el) return;
  const st = ScrollTrigger.getById(`bx-${id}`);
  const y = st ? st.start + 2 : el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: y, behavior: quieto() ? 'auto' : 'smooth' });
}

export default function Expo() {
  const raiz = useRef(null);
  const anfi = useRef(null);
  const [paso, setPaso] = useState(-1);
  const [zona, setZona] = useState(0);
  const [lamina, setLamina] = useState(0);
  const [fijo] = useState(() => !quieto());
  const [compu, setCompu] = useState(esCompu);
  // cada paso nuevo = un comando para la app (App reacciona cuando cambia `k`)
  const comando = useMemo(() => (paso < 0 ? null : { tipo: GUIA[paso].tipo, k: paso }), [paso]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const cambia = () => setCompu(mq.matches);
    mq.addEventListener?.('change', cambia);
    return () => mq.removeEventListener?.('change', cambia);
  }, []);

  // Tamaño de la bolsita grande (--s) y su escala de compañera en la esquina (--k).
  useLayoutEffect(() => {
    const medir = () => {
      const el = raiz.current; if (!el) return;
      const s = Math.round(Math.min(window.innerWidth * 0.88, window.innerHeight * 0.5, 440));
      const chica = window.innerWidth < 700 ? 150 : 200;
      el.style.setProperty('--s', `${s}px`);
      el.style.setProperty('--k', (chica / s).toFixed(4));
      // --top: dónde empieza la bolsita grande. Portada (bolsita + texto) centrada en lo
      // alto de la pantalla para que no quede hueco abajo (25-nov).
      const cab = parseFloat(getComputedStyle(el).getPropertyValue('--cab')) || 80;
      const txt = el.querySelector('.bx-r-portada .txt')?.offsetHeight || 260;
      const libre = window.innerHeight - cab - s - 6 - txt - 64;
      el.style.setProperty('--top', `${Math.round(cab + Math.max(0, libre / 2))}px`);
    };
    medir();
    document.fonts?.ready.then(medir);
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  // Lo que dice la bolsita = la sección en la que estás + su paso/zona/lámina. UNA sola
  // regla: cuando el scroll salta rápido los avisos de GSAP llegan en desorden y antes
  // se quedaba diciendo la frase de otra sección.
  const [escena, setEscena] = useState('inicio');
  useEffect(() => {
    const t = escena === 'app' ? GUIA[Math.max(0, paso)].dice
      : escena === 'local' ? DICE_ZONA[ZONAS[zona].id]
        : escena === 'marca' ? LAMINAS[lamina].dice : null;
    if (t) anfi.current?.decir(t, null, { queda: true });
  }, [escena, paso, zona, lamina]);

  // ── Las animaciones con el scroll
  useLayoutEffect(() => {
    if (!fijo) return undefined;
    ScrollTrigger.config({ ignoreMobileResize: true });
    const ctx = gsap.context(() => {
      const a = () => anfi.current;
      // al entrar a una sección: la bolsita cambia de pose, mira hacia allá y dice lo suyo
      const entra = (n, pose, mira) => {
        setEscena(n);
        const b = a(); if (!b) return;
        b.pose(pose);
        if (mira) b.mirar(...mira); else b.mirar(null);
      };

      // PORTADA: el disco crece hasta llenar la pantalla y la bolsita se va a la esquina.
      gsap.timeline({
        scrollTrigger: {
          id: 'bx-inicio', trigger: '.bx-r-portada', start: 'top top', end: '+=110%', pin: true, scrub: 0.6,
          onUpdate: (st) => a()?.esquina(st.progress > 0.55),
          onLeaveBack: () => { setEscena('inicio'); a()?.pose('saluda'); a()?.mirar(null); a()?.callar(); },
        },
      })
        .fromTo('.bx-r-saludo', { opacity: 1, y: 0 }, { opacity: 0, y: -20, duration: 0.18 }, 0)
        .to('.bx-r-portada .txt', { opacity: 0, y: -60, duration: 0.35 }, 0.05)
        .to('.bx-r-disco', { scale: () => (Math.hypot(window.innerWidth, window.innerHeight) * 2.1) / (document.querySelector('.bx-r-disco')?.offsetWidth || 300), duration: 0.75, ease: 'power2.in' }, 0.1)
        .to(raiz.current, { '--p': 1, duration: 0.55, ease: 'power2.inOut' }, 0.3)
        .fromTo('.bx-r-desliza, .bx-r-gira', { opacity: 1 }, { opacity: 0, duration: 0.1 }, 0);

      // 01 LA APP: fija; el scroll avanza los 7 pasos.
      gsap.timeline({
        scrollTrigger: {
          id: 'bx-app', trigger: '.bx-r-app', start: 'top top', end: () => `+=${window.innerHeight * 0.55 * GUIA.length}`, pin: true, scrub: true,
          onEnter: () => entra('app', 'senala', [-0.9, -0.3]),
          onEnterBack: () => entra('app', 'senala', [-0.9, -0.3]),
          onLeaveBack: () => { a()?.pose('saluda'); a()?.mirar(null); },
          onUpdate: (st) => setPaso(Math.min(GUIA.length - 1, Math.floor(st.progress * GUIA.length * 0.999))),
        },
      })
        .to('.bx-r-barra i', { scaleX: 1, ease: 'none', duration: 1 }, 0);
      // el teléfono sube girando mientras la sección entra
      gsap.fromTo('.bx-r-app .bx-r-tel', { y: 160, rotate: -8, scale: 0.86 }, {
        y: 0, rotate: 0, scale: 1, ease: 'none',
        scrollTrigger: { trigger: '.bx-r-app', start: 'top 85%', end: 'top top', scrub: true },
      });

      // 02 EL LOCAL: entra como un círculo que se abre desde la bolsita; luego, zona por zona.
      gsap.fromTo('.bx-r-local .bx-r-capa', { clipPath: 'circle(0% at 88% 92%)' }, {
        clipPath: 'circle(150% at 88% 92%)', ease: 'none',
        scrollTrigger: { trigger: '.bx-r-local', start: 'top bottom', end: 'top top', scrub: true },
      });
      ScrollTrigger.create({
        id: 'bx-local', trigger: '.bx-r-local', start: 'top top', end: () => `+=${window.innerHeight * 0.6 * ZONAS.length}`, pin: true,
        onEnter: () => entra('local', 'senala', [-0.6, -0.6]),
        onEnterBack: () => entra('local', 'senala', [-0.6, -0.6]),
        onLeaveBack: () => entra('app', 'senala', [-0.9, -0.3]),
        onUpdate: (st) => setZona(Math.min(ZONAS.length - 1, Math.floor(st.progress * ZONAS.length * 0.999))),
      });

      // 03 LA MARCA: el scroll vertical mueve las láminas de lado.
      const pista = document.querySelector('.bx-r-pista');
      const marca = document.querySelector('.bx-r-marca');
      const largo = () => pista.scrollWidth - marca.clientWidth;
      const n = pista.children.length;
      const viaje = gsap.to(pista, {
        x: () => -largo(), ease: 'none',
        scrollTrigger: {
          id: 'bx-marca', trigger: '.bx-r-marca', start: 'top top', end: () => `+=${largo()}`, pin: true, scrub: 0.5, invalidateOnRefresh: true,
          // al soltar, la lámina más cercana se acomoda sola
          snap: { snapTo: 1 / (n - 1), directional: false, inertia: false, duration: { min: 0.25, max: 0.6 }, delay: 0.1, ease: 'power2.inOut' },
          onEnter: () => entra('marca', 'quieta', null),
          onEnterBack: () => entra('marca', 'quieta', null),
          onUpdate: (st) => setLamina(Math.round(st.progress * (n - 1))),
        },
      });
      // Profundidad: dentro de cada lámina el número de fondo, el título y el contenido
      // corren a velocidades distintas; sus animaciones arrancan desde que se asoma
      // (antes la lámina entrante venía VACÍA hasta pasar la mitad: se veía raro).
      gsap.utils.toArray('.bx-r-lamina').forEach((lam) => {
        const st = { trigger: lam, containerAnimation: viaje, start: 'left right', end: 'right left', scrub: true };
        gsap.fromTo(lam.querySelector('.num'), { xPercent: 60 }, { xPercent: -60, ease: 'none', scrollTrigger: st });
        gsap.fromTo(lam.querySelector('.tit'), { x: () => window.innerWidth * 0.12 }, { x: () => -window.innerWidth * 0.12, ease: 'none', scrollTrigger: { ...st } });
        gsap.fromTo(lam.querySelector('.cuerpo'), { x: () => window.innerWidth * 0.22, rotate: 2.5 }, { x: () => -window.innerWidth * 0.22, rotate: -2.5, ease: 'none', scrollTrigger: { ...st } });
        ScrollTrigger.create({ trigger: lam, containerAnimation: viaje, start: 'left 80%', end: 'right 20%', toggleClass: { targets: lam, className: 'on' } });
      });

      // CIERRE: la bolsita vuelve al centro, grande, y se despide.
      gsap.timeline({
        scrollTrigger: {
          trigger: '.bx-r-cierre', start: 'top bottom', end: 'top top', scrub: 0.6,
          onUpdate: (st) => { a()?.esquina(st.progress < 0.6); if (st.progress > 0.6) { setEscena('cierre'); a()?.pose('saluda'); a()?.mirar(null); } else setEscena('marca'); },
          onLeave: () => a()?.brincar(),
        },
      })
        .fromTo(raiz.current, { '--p': 1 }, { '--p': 0, ease: 'power2.inOut', immediateRender: false }, 0)
        .from('.bx-r-cierre .txt > *', { y: 50, opacity: 0, stagger: 0.08 }, 0.4);
    }, raiz);

    // Las letras y el 3D cambian alturas: recalcular cuando ya cargó todo.
    const recalcular = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(recalcular);
    const t = setTimeout(recalcular, 1500);
    return () => { clearTimeout(t); ctx.revert(); };
  }, [fijo]);


  return (
    <div className={`bx bx-r ${fijo ? '' : 'bx-quieto'} ${forzado() ? 'bx-forzado' : ''}`} ref={raiz}>
      <Cabeza />
      <Anfitriona ref={anfi} />
      <Portada />
      <LaApp paso={paso} comando={comando} compu={compu} fijo={fijo} alTocar={(i) => (fijo ? irAPaso(i) : setPaso(i))} />
      <ElLocal zona={zona} fijo={fijo} alTocar={(i) => (fijo ? irAZona(i) : (setZona(i), anfi.current?.decir(DICE_ZONA[ZONAS[i].id])))} />
      <LaMarca lamina={lamina} fijo={fijo} />
      <Cierre />
    </div>
  );
}

// Tocar un paso/zona lleva el scroll a su tramo (así todo sigue en sincronía).
function irATramo(id, i, total) {
  const st = ScrollTrigger.getById(id); if (!st) return;
  const y = st.start + (st.end - st.start) * ((i + 0.5) / total);
  window.scrollTo({ top: y, behavior: 'smooth' });
}
const irAPaso = (i) => irATramo('bx-app', i, GUIA.length);
const irAZona = (i) => irATramo('bx-local', i, ZONAS.length);

function Cabeza() {
  return (
    <header className="bx-cab vidrio">
      <button className="marca" onClick={() => window.scrollTo({ top: 0, behavior: quieto() ? 'auto' : 'smooth' })} aria-label="Inicio">
        <Isotipo size={30} />
        <span>el buen bocado</span>
      </button>
      <nav>
        <button onClick={() => ir('app')}><small>01</small> La app</button>
        <button onClick={() => ir('local')}><small>02</small> El local</button>
        <button onClick={() => ir('marca')}><small>03</small> La marca</button>
      </nav>
    </header>
  );
}

// ── LA ANFITRIONA: la bolsita 3D fija encima de todo + su globito ──────────────
const Anfitriona = forwardRef(function Anfitriona(_, ref) {
  const lienzo = useRef(null);
  const b = useRef(null);
  const [globo, setGlobo] = useState(null);
  const [ve, setVe] = useState(false);
  const [esquina, setEsquina] = useState(false);
  const reloj = useRef(0);

  useEffect(() => {
    let vivo = true;
    import('./montarBolsita').then(({ montarBolsita }) => {
      if (!vivo || !lienzo.current) return;
      b.current = montarBolsita(lienzo.current, { girar: true, orbitar: false, movimiento: forzado() });
    });
    return () => { vivo = false; clearTimeout(reloj.current); b.current?.quitar(); b.current = null; };
  }, []);

  useImperativeHandle(ref, () => ({
    decir: (t, d = null, { queda = false } = {}) => {
      if (!t) return;
      setGlobo((g) => (g?.t === t ? g : { t, d, k: Date.now() }));
      setVe(true);
      clearTimeout(reloj.current);
      if (!queda) reloj.current = setTimeout(() => setVe(false), 5000);
    },
    callar: () => setVe(false),
    esquina: (si) => setEsquina((e) => (e === si ? e : si)),
    pose: (p) => b.current?.pose(p),
    mirar: (x, y) => b.current?.mirar(x, y),
    brincar: () => b.current?.brincar(),
  }), []);

  const tocar = () => { if (globo) setVe(true); }; // el brinco lo da montarBolsita solo si fue toque (no arrastre)

  return (
    <div className={`bx-r-anfi-capa ${esquina ? 'esquina' : ''}`} aria-hidden="true">
      <div className="bx-r-anfi" ref={lienzo} onClick={tocar} />
      {globo && <Globo key={globo.k} t={globo.t} d={globo.d} ve={ve && esquina} />}
    </div>
  );
});

// El globito (25-nov, v2): mensaje tipo chat — oscuro, con "la bolsita" arriba y tres
// puntitos de "escribiendo…" antes del texto. Al de cómic con colita lo vio informal.
function Globo({ t, d, ve }) {
  const [escribe, setEscribe] = useState(true);
  useEffect(() => { const r = setTimeout(() => setEscribe(false), 520); return () => clearTimeout(r); }, []);
  return (
    <div className={`bx-r-globo ${ve ? 've' : ''} ${escribe ? 'escribe' : ''}`}>
      <small>la bolsita</small>
      {escribe
        ? <span className="puntos" aria-hidden="true"><i /><i /><i /></span>
        : <><b>{t}</b>{d && <span>{d}</span>}</>}
    </div>
  );
}

// ── PORTADA ─────────────────────────────────────────────────────────────────
function Portada() {
  return (
    <section className="bx-r-portada" id="inicio">
      <div className="bx-r-escena">
        <div className="bx-r-disco" />
        <span className="bx-r-gira" aria-hidden="true"><span className="in"><i>↔</i> Gírala o tócala</span></span>
        {/* afuera lo mueve el scroll (GSAP); adentro, la entrada de CSS: separados para que no se pisen */}
        <div className="bx-r-saludo"><div className="in"><small>la bolsita</small><b>¡Hola! Soy la bolsita.</b><span>Baja y te enseño todo.</span></div></div>
      </div>
      {/* 25-nov: el logo en vez de "Comer bien, a tu hora" y sin la píldora (con la de "Gírala" se veía saturado) */}
      <div className="txt">
        <small className="bx-r-proyecto">Proyecto de Emprendimiento · 2026</small>
        <h1 className="bx-r-logo"><Logo size={60} sinMono /><span className="sr">el buen bocado</span></h1>
        <p>Comida saludable para quien trabaja en oficina. La pides en la mañana desde la app y a la 1 la recoges en tu casilla, sin filas. O te la llevamos.</p>
      </div>
      <div className="bx-r-desliza" aria-hidden="true"><span>Desliza</span><div className="flechas"><i /><i /><i /></div></div>
    </section>
  );
}

// ── 01 LA APP ───────────────────────────────────────────────────────────────
function LaApp({ paso, comando, compu, fijo, alTocar }) {
  const g = GUIA[Math.max(0, paso)];
  return (
    <section id="app" className="bx-r-app">
      <div className="bx-r-app-in">
        <div className="bx-r-cabecera">
          <small>01 · La app</small>
          <h2>{compu || !fijo ? 'Así se pide' : g.t}</h2>
          {fijo && <div className="bx-r-barra"><i /></div>}
        </div>
        <ol className="bx-r-pasos">
          {GUIA.map((x, i) => (
            <li key={x.tipo}>
              <button className={paso === i ? 'on' : ''} onClick={() => alTocar(i)}>
                <small>{String(i + 1).padStart(2, '0')}</small>
                <span><b>{x.t}</b><em>{x.d}</em></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="bx-r-tel">
          <Iphone logico={393}><App marco aparte comando={comando} /></Iphone>
        </div>
        <a className="bx-r-prueba" href="?rol=app" target="_blank" rel="noopener">Pruébala tú ↗</a>
      </div>
    </section>
  );
}

// ── 02 EL LOCAL ─────────────────────────────────────────────────────────────
function ElLocal({ zona: i, fijo, alTocar }) {
  const [montar, setMontar] = useState(false);
  const ref = useRef(null);
  const zona = ZONAS[i];

  // three.js se baja cuando la sección se acerca, no al abrir la página.
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { setMontar(true); return undefined; }
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { setMontar(true); io.disconnect(); } }, { rootMargin: '900px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="local" className="bx-r-local" ref={ref}>
      <div className="bx-r-capa">
        {montar
          ? <Suspense fallback={<div className="bx-r-lienzo cargando"><span>Cargando el local…</span></div>}><Local3D zona={zona} fijo={fijo} className="bx-r-lienzo" /></Suspense>
          : <div className="bx-r-lienzo cargando"><span>Cargando el local…</span></div>}
        <div className="bx-r-cabecera sobre">
          <small>02 · El local</small>
          <h2>{zona.titulo}</h2>
          <p key={zona.id}>{zona.texto}</p>
        </div>
        <div className="bx-r-zonas">
          {ZONAS.map((z, k) => (
            <button key={z.id} className={k === i ? 'on' : ''} onClick={() => alTocar(k)} aria-label={z.titulo}>
              <small>{z.n}</small><span>{z.titulo}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 03 LA MARCA (láminas que corren de lado) ────────────────────────────────
// Paleta "helecho" (19-nov): siete verdes de lo más oscuro a lo más claro + el papel.
const COLORES = [
  { n: 'Noche', h: '#121F0D', u: 'Títulos', claro: false },
  { n: 'Ceylanita', h: '#30401C', u: 'Trazo y botones', claro: false },
  { n: 'Albahaca', h: '#526531', u: 'La marca', claro: false },
  { n: 'Gamuza', h: '#758850', u: 'Detalles', claro: false },
  { n: 'Plaza', h: '#98A973', u: 'Las hojas', claro: true },
  { n: 'Uva blanca', h: '#B9C798', u: 'Rayas', claro: true },
  { n: 'Kiwi', h: '#DCE7BE', u: 'Etiquetas', claro: true },
  { n: 'Papel', h: '#F4F4E6', u: 'El fondo', claro: true },
];
const IDEA = [
  ['La bolsa', 'Es para llevar.'],
  ['El brote', 'Empaque biodegradable.'],
  ['La sonrisa', 'Comer bien se siente bien.'],
];
const APLICADA = [
  ['b-bolsa', 'Bolsa kraft con tu nombre y casilla'],
  ['b-bowl', 'Empaque de fibra biodegradable'],
  ['b-mandil', 'Uniforme de cocina'],
  ['b-casillas', 'La pared de casillas'],
  ['b-bebida', 'Botella retornable'],
];
const LAMINAS = [
  { id: 'idea', dice: 'Soy una bolsa de papel, para llevar.' },
  { id: 'formas', dice: 'Así me ves en todos lados.' },
  { id: 'accion', dice: 'También me dibujan en la app.' },
  { id: 'colores', dice: 'Siete verdes. El rojo solo lo traigo yo.' },
  { id: 'letra', dice: 'Hablamos de tú, en corto.' },
  { id: 'fotos', dice: 'Así me veo ya en la calle.' },
];

// Cada lámina: número gigante de fondo + título + cuerpo; GSAP los mueve a velocidades
// distintas al deslizar (profundidad) y le pone `on` cuando se asoma.
function Lamina({ n, clase, titulo, fijo, children }) {
  return (
    <article className={`bx-r-lamina bx-r-l-${clase} ${fijo ? '' : 'on'}`}>
      <span className="num" aria-hidden="true">{String(n).padStart(2, '0')}</span>
      <header className="tit">
        <small className="bx-r-folio">03 · La marca <i>{n} / {LAMINAS.length}</i></small>
        <h2>{titulo}</h2>
      </header>
      <div className="cuerpo">{children}</div>
    </article>
  );
}

function LaMarca({ lamina, fijo }) {
  return (
    <section id="marca" className="bx-r-marca">
      <div className="bx-r-pista">
        <Lamina n={1} clase="idea" fijo={fijo} titulo={<>Cómo nació <em>la bolsita</em></>}>
          <div className="trio">
            {IDEA.map(([t, d], i) => (
              <div key={t} className="paso">
                <div className="dibujo">{i < 2 ? <Isotipo size={84} className={i === 0 ? 'sin-brote sin-cara' : 'sin-cara'} /> : <Bolsita size={96} />}</div>
                <div className="txt"><b>{t}</b><span>{d}</span></div>
              </div>
            ))}
          </div>
          <p className="nota">Es la bolsa en la que te llevas tu comida. En el nombre, la última <b>o</b> también sonríe.</p>
        </Lamina>

        <Lamina n={2} clase="formas" fijo={fijo} titulo={<>Cinco formas, <em>una marca</em></>}>
          <div className="rejilla">
            <div className="ancha"><Logo size={38} lema /><small>Principal</small></div>
            <div><div className="vert"><Bolsita size={62} /><Nombre size={22} /></div><small>Vertical</small></div>
            <div className="oscura"><span className="ico"><Isotipo size={48} /></span><small>Ícono de la app</small></div>
            <div><Sello size={96} className="bx-sello" /><small>Sello</small></div>
            <div className="olivo"><Logo size={24} tinta="blanca" /><small>Una tinta</small></div>
          </div>
        </Lamina>

        <Lamina n={3} clase="accion" fijo={fijo} titulo={<>La bolsita <em>en acción</em></>}>
          <div className="dibujos">
            {[['oficina', 'Comer bien, a tu hora.'], ['casilla', 'Recógelo sin fila.'], ['bowl', 'Junta bocados.']].map(([e, t]) => (
              <figure key={e}><Dibujo escena={e} /><figcaption>{t}</figcaption></figure>
            ))}
          </div>
        </Lamina>

        <Lamina n={4} clase="colores" fijo={fijo} titulo={<>Los <em>colores</em></>}>
          <div className="muestras">
            {COLORES.map((c, i) => (
              <div key={c.n} className={`muestra ${c.claro ? 'clara' : ''}`} style={{ background: c.h, '--i': i }}>
                <b>{c.n}</b><code>{c.h}</code><span>{c.u}</span>
              </div>
            ))}
          </div>
          <p className="nota">Siete verdes de helecho sobre papel. <b>El rojo solo vive en la bolsita.</b></p>
        </Lamina>

        <Lamina n={5} clase="letra" fijo={fijo} titulo={<>La letra <em>y la voz</em></>}>
          <div className="tipo">
            <small>Títulos · Outfit</small>
            <div className="grande">Ya está listo.</div>
            <small>Texto · Inter</small>
            <p>Bowl mediterráneo con quinoa y garbanzo. 520 kcal · 28 g proteína.</p>
            <small>A mano · Gochi Hand</small>
            <div className="mano">come rico, a tu hora</div>
          </div>
          <div className="voz">
            <small>Así hablamos</small>
            <div className="frase">“Tu bowl ya está en la casilla 4.”</div>
            <ul>
              <li className="si">Llegas, lo tomas, te vas.</li>
              <li className="no">Elimina la culpa con opciones detox.</li>
            </ul>
          </div>
        </Lamina>

        <Lamina n={6} clase="fotos" fijo={fijo} titulo={<>Así <em>se ve</em></>}>
          <div className="fotos">
            {APLICADA.map(([img, t]) => (
              <figure key={img}>
                <img src={`/bocado/${img}.webp`} alt={t} loading="lazy" onError={(ev) => { ev.currentTarget.closest('figure').style.display = 'none'; }} />
                <figcaption>{t}</figcaption>
              </figure>
            ))}
          </div>
        </Lamina>
      </div>
      {fijo && (
        <div className="bx-r-puntos" aria-hidden="true">
          {LAMINAS.map((l, i) => <i key={l.id} className={i === lamina ? 'on' : ''} />)}
        </div>
      )}
    </section>
  );
}

// ── CIERRE ──────────────────────────────────────────────────────────────────
function Cierre() {
  return (
    <section className="bx-r-cierre">
      <div className="bx-r-escena" />
      <div className="txt">
        <div className="bx-r-adios">¡Gracias por visitarnos!</div>
        <h2>el buen <em>bocado</em></h2>
        <p>Comer bien, a tu hora.</p>
        <div className="botones">
          <a className="bx-btn claro" href="?rol=app" target="_blank" rel="noopener">Abrir la app</a>
          <button className="bx-btn vidrio" onClick={() => window.scrollTo({ top: 0, behavior: quieto() ? 'auto' : 'smooth' })}>Ver otra vez</button>
        </div>
      </div>
      <footer className="bx-pie">
        <Logo size={26} tinta="blanca" />
        <span>Proyecto de Emprendimiento · 2026 · prototipo</span>
      </footer>
    </section>
  );
}
