import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import App from './App';
import Iphone from './Iphone';
import { Isotipo, Logo } from './comun';
import { ZONAS } from './zonasLocal';
import './expo.css';

// ─────────────────────────────────────────────────────────────────────────────
// EXPOSICIÓN DEL PROYECTO (17-nov-2026) — la ruta por defecto de
// /comida/buenbocado. Zahir: "no quiero un sitio web, solo una web para
// exponer el proyecto, con la app y el local". Portada corta → 01 La app
// (viva en el iPhone + recorrido guiado) → 02 El local (3D girable con
// zonas). Olivo pastel con fondo difuminado y vidrio líquido. Prefijo bx-.
// ─────────────────────────────────────────────────────────────────────────────

const Local3D = lazy(() => import('./Local3D'));

const GUIA = [
  { tipo: 'bienvenida', t: 'La primera vez', d: 'Registro con tu celular, qué buscas, qué evitas y cómo lo quieres.' },
  { tipo: 'personaliza', t: 'Personaliza', d: 'Sin cebolla, doble proteína, extra aguacate. Con kcal y proteína a la vista.' },
  { tipo: 'programa', t: 'Recoge a tu hora', d: 'Eliges día y hora; los horarios muestran cuánto cupo queda.' },
  { tipo: 'domicilio', t: 'O te lo llevamos', d: 'A tu oficina, en la ventana de 15 minutos que elijas.' },
  { tipo: 'semana', t: 'Arma tu semana', d: 'Cinco comidas en un minuto, con precio de plan.' },
  { tipo: 'aviso', t: 'Te avisa', d: 'Cuando tu pedido llega a su casilla, te llega el número.' },
  { tipo: 'camino', t: 'Síguelo en el mapa', d: 'Si es a domicilio, ves a tu repartidor en camino.' },
];

const quieto = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const ir = (id) => document.getElementById(id)?.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'start' });

// Aparece al entrar en pantalla.
function useAparece() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { el.classList.add('visto'); return undefined; }
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { el.classList.add('visto'); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function Expo() {
  return (
    <div className="bx">
      <div className="bx-fondo" aria-hidden="true"><i /><i /><i /><i /></div>
      <Cabeza />
      <Portada />
      <LaApp />
      <ElLocal />
      <LaMarca />
      <footer className="bx-pie">
        <Logo size={30} aro="#E2553B" centro="#DCE0C6" />
        <span>Proyecto de Emprendimiento · 2026 · prototipo</span>
      </footer>
    </div>
  );
}

function Cabeza() {
  return (
    <header className="bx-cab vidrio">
      <button className="marca" onClick={() => window.scrollTo({ top: 0, behavior: quieto() ? 'auto' : 'smooth' })} aria-label="Inicio">
        <Isotipo size={26} aro="#E2553B" centro="#E9ECD6" />
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

function Portada() {
  return (
    <section className="bx-portada">
      <div className="txt">
        <span className="bx-chip vidrio">Proyecto de Emprendimiento</span>
        <h1>Comer bien,<br /><em>a tu hora.</em></h1>
        <p>Comida saludable para quien trabaja en oficina. La pides en la mañana desde la app y a la 1 la recoges en tu casilla, sin filas. O te la llevamos.</p>
        <div className="botones">
          <button className="bx-btn" onClick={() => ir('app')}>Ver la app</button>
          <button className="bx-btn vidrio" onClick={() => ir('local')}>Recorrer el local</button>
        </div>
      </div>
      <div className="plato" aria-hidden="true">
        <div className="aro vidrio" />
        <Isotipo size={260} aro="#E2553B" centro="#D3D8B6" />
      </div>
    </section>
  );
}

function Titulo({ n, titulo, lead }) {
  const ref = useAparece();
  return (
    <div className="bx-titulo" ref={ref}>
      <small>{n}</small>
      <h2>{titulo}</h2>
      <p>{lead}</p>
    </div>
  );
}

// ── 01 LA APP ───────────────────────────────────────────────────────────────
function LaApp() {
  const [comando, setComando] = useState(null);
  const [activo, setActivo] = useState(null);
  const mandar = (tipo) => { setActivo(tipo); setComando({ tipo, k: Date.now() }); };
  return (
    <section id="app" className="bx-sec">
      <Titulo n="01" titulo="La app" lead="Es un prototipo que funciona: pide, personaliza, programa y sigue tu pedido. Toca una función y la app te lleva." />
      <div className="bx-app">
        <ol className="bx-guia vidrio">
          {GUIA.map((g, i) => (
            <li key={g.tipo}>
              <button className={activo === g.tipo ? 'on' : ''} onClick={() => mandar(g.tipo)}>
                <small>{String(i + 1).padStart(2, '0')}</small>
                <span><b>{g.t}</b><em>{g.d}</em></span>
              </button>
            </li>
          ))}
          <li className="pie"><a href="?rol=app" target="_blank" rel="noopener">Abrir la app sola ↗</a></li>
        </ol>
        <div className="bx-tel">
          <Iphone inclina logico={393}><App marco comando={comando} /></Iphone>
        </div>
      </div>
    </section>
  );
}

// ── 02 EL LOCAL ─────────────────────────────────────────────────────────────
function ElLocal() {
  const [id, setId] = useState('corte');
  const [montar, setMontar] = useState(false);
  const ref = useRef(null);
  const zona = ZONAS.find((z) => z.id === id);

  // three.js se baja cuando la sección se acerca, no al abrir la página.
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { setMontar(true); return undefined; }
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { setMontar(true); io.disconnect(); } }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="local" className="bx-sec" ref={ref}>
      <Titulo n="02" titulo="El local" lead="12 × 9 metros en San Manuel. Sin caja ni fila: tu pedido te espera en una casilla. Gíralo con el dedo o elige una zona." />
      <div className="bx-local vidrio">
        {montar
          ? <Suspense fallback={<div className="bx-lienzo cargando"><span>Cargando el local…</span></div>}><Local3D zona={zona} /></Suspense>
          : <div className="bx-lienzo cargando"><span>Cargando el local…</span></div>}
        <div className="bx-ficha vidrio" key={zona.id}>
          <small>{zona.n}</small>
          <b>{zona.titulo}</b>
          <p>{zona.texto}</p>
        </div>
        <span className="bx-ayuda">Arrastra para girar · pellizca o rueda para acercar</span>
      </div>
      <div className="bx-zonas">
        {ZONAS.map((z) => (
          <button key={z.id} className={`vidrio ${z.id === id ? 'on' : ''}`} onClick={() => setId(z.id)}>
            <small>{z.n}</small>{z.titulo}
          </button>
        ))}
      </div>
    </section>
  );
}

// ── 03 LA MARCA ─────────────────────────────────────────────────────────────
// Cómo se creó el logo (plato + mordida = bocado), sus cuatro formas, los
// colores escogidos, la letra, la voz y la marca aplicada (fotos `b-*` de
// Codex, 17-nov; las `m-*` viejas no le gustaron a Zahir).
const COLORES = [
  { n: 'Olivo', h: '#5E6B3F', u: 'La marca: fachada, app, empaque', claro: false },
  { n: 'Salvia', h: '#B8BF94', u: 'Fondos y ambiente', claro: true },
  { n: 'Salvia clara', h: '#D8DFA8', u: 'Etiquetas y detalles', claro: true },
  { n: 'Masa', h: '#EEF0E2', u: 'El fondo limpio', claro: true },
  { n: 'Tomate', h: '#E2553B', u: 'Lo importante: botones y tu hora', claro: false },
  { n: 'Carbón', h: '#2E3320', u: 'Texto. Nunca negro puro', claro: false },
];
const APLICADA = [
  ['b-bolsa', 'Bolsa kraft con tu nombre, hora y casilla'],
  ['b-bowl', 'Empaque de fibra biodegradable'],
  ['b-mandil', 'Uniforme de cocina'],
  ['b-casillas', 'La pared de casillas'],
  ['b-bebida', 'Botella retornable'],
];

function Plato({ paso }) {
  // paso 0 = el plato · 1 = la mordida · 2 = el bocado
  const id = `bx-m${paso}`;
  return (
    <svg viewBox="0 0 100 100" className={`bx-plato p${paso}`} aria-hidden="true">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          {paso === 2 && <><circle cx="88" cy="22" r="13" fill="#000" /><circle cx="96" cy="38" r="11" fill="#000" /><circle cx="76" cy="10" r="11" fill="#000" /></>}
        </mask>
      </defs>
      {paso === 1 ? (
        <g fill="none" stroke="#E2553B" strokeWidth="1.6" strokeDasharray="3 3">
          <circle cx="50" cy="50" r="44" stroke="rgba(46,51,32,.25)" />
          <circle cx="88" cy="22" r="13" /><circle cx="96" cy="38" r="11" /><circle cx="76" cy="10" r="11" />
        </g>
      ) : (
        <g mask={`url(#${id})`}>
          <circle cx="50" cy="50" r="44" fill="#E2553B" />
          <circle cx="50" cy="50" r="22" fill="#5E6B3F" />
        </g>
      )}
    </svg>
  );
}

function Bloque({ className = '', children }) {
  const ref = useAparece();
  return <div className={`bx-bloque ${className}`} ref={ref}>{children}</div>;
}

function LaMarca() {
  return (
    <section id="marca" className="bx-sec">
      <Titulo n="03" titulo="La marca" lead="Cómo nació el logo, los colores que escogimos y cómo se ve todo ya aplicado." />

      <Bloque className="bx-idea">
        <div className="pasos">
          {['El plato', 'La mordida', 'El bocado'].map((t, i) => (
            <div key={t} className="paso vidrio">
              <Plato paso={i} />
              <b>{t}</b>
              <span>{['Visto desde arriba: es comida.', 'Tres curvas arriba a la derecha.', 'Se antoja y alguien ya lo disfruta.'][i]}</span>
            </div>
          ))}
        </div>
        <p className="nota">El símbolo es un plato al que ya le dieron el primer bocado. Dice tres cosas a la vez: <b>es comida, se antoja y alguien ya la está disfrutando.</b></p>
      </Bloque>

      <Bloque className="bx-formas">
        <h3>Cuatro formas, una sola marca</h3>
        <div className="rejilla">
          <div className="vidrio ancha"><Logo size={64} aro="#E2553B" centro="#5E6B3F" /><small>Principal · horizontal</small></div>
          <div className="vidrio"><div className="vert"><Isotipo size={70} aro="#E2553B" centro="#5E6B3F" /><span className="bb-wm" style={{ fontSize: 34 }}><span className="el">el buen</span>bocado</span></div><small>Vertical</small></div>
          <div className="vidrio oscura"><Isotipo size={80} aro="#E2553B" centro="#2E3320" /><small>Símbolo · app y sellos</small></div>
          <div className="vidrio olivo"><span className="bb-wm" style={{ fontSize: 46 }}><span className="el">el buen</span>bocado</span><small>Solo nombre</small></div>
        </div>
      </Bloque>

      <Bloque className="bx-colores">
        <h3>Los colores escogidos</h3>
        <div className="muestras">
          {COLORES.map((c) => (
            <div key={c.n} className={`muestra ${c.claro ? 'clara' : ''}`} style={{ background: c.h }}>
              <b>{c.n}</b><code>{c.h}</code><span>{c.u}</span>
            </div>
          ))}
        </div>
        <div className="proporcion" aria-label="Proporción sugerida">
          <i style={{ flex: 45, background: '#EEF0E2' }}>Masa 45%</i>
          <i style={{ flex: 30, background: '#5E6B3F', color: '#EEF0E2' }}>Olivo 30%</i>
          <i style={{ flex: 15, background: '#B8BF94' }}>Salvia</i>
          <i style={{ flex: 6, background: '#2E3320' }} />
          <i style={{ flex: 4, background: '#E2553B' }} />
        </div>
        <p className="nota">Un olivo pastel, tranquilo y fresco, con poquito tomate: <b>si algo es tomate, es importante</b> (el botón, la hora de tu pedido).</p>
      </Bloque>

      <Bloque className="bx-letra">
        <div className="vidrio tipo">
          <small>Títulos · Bricolage Grotesque 800</small>
          <div className="grande">Ya está listo.</div>
          <small>Texto y app · Inter</small>
          <p>Bowl mediterráneo con quinoa, garbanzo rostizado y aderezo de yogur con limón. 520 kcal · 28 g proteína.</p>
        </div>
        <div className="vidrio voz">
          <small>Así hablamos</small>
          <div className="frase">“Tu bowl ya está en la casilla 4.”</div>
          <ul>
            <li className="si">Llegas, lo tomas, te vas.</li>
            <li className="si">Pídelo a las 9. Recógelo a la 1.</li>
            <li className="no">Elimina la culpa con opciones detox.</li>
          </ul>
          <span>De tú, en corto y sin sermones. Nunca “dieta”, “culpa” ni “detox”.</span>
        </div>
      </Bloque>

      <Bloque className="bx-aplicada">
        <h3>Así se ve</h3>
        <div className="fotos">
          {APLICADA.map(([img, t]) => (
            <figure key={img} className="vidrio">
              <img src={`/bocado/${img}.webp`} alt={t} loading="lazy" onError={(ev) => { ev.currentTarget.closest('figure').style.display = 'none'; }} />
              <figcaption>{t}</figcaption>
            </figure>
          ))}
        </div>
      </Bloque>
    </section>
  );
}
