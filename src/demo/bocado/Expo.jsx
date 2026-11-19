import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import App from './App';
import Iphone from './Iphone';
import { Bolsita, Dibujo, Isotipo, Logo, Nombre, Sello } from './comun';
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
const Bolsita3D = lazy(() => import('./Bolsita3D'));

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
      <Cabeza />
      <Portada />
      <LaApp />
      <ElLocal />
      <LaMarca />
      <footer className="bx-pie">
        <Logo size={30} />
        <span>Proyecto de Emprendimiento · 2026 · prototipo</span>
      </footer>
    </div>
  );
}

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
      <div className="plato">
        <div className="aro vidrio" aria-hidden="true" />
        <Suspense fallback={<Bolsita size={260} className="respaldo" />}>
          <Bolsita3D className="bx-bolsita3d" />
        </Suspense>
        <span className="bx-toca">Gírala o tócala</span>
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
// Cómo se creó el logo (bolsa + brote + sonrisa = la bolsita, 19-nov; antes
// plato + mordida), sus cuatro formas, los
// colores escogidos, la letra, la voz y la marca aplicada (fotos `b-*` de
// Codex, 17-nov; las `m-*` viejas no le gustaron a Zahir).
// Paleta "helecho" (19-nov): siete verdes de lo más oscuro a lo más claro + el papel.
const COLORES = [
  { n: 'Noche', h: '#121F0D', u: 'Títulos. Nunca negro puro', claro: false },
  { n: 'Ceylanita', h: '#30401C', u: 'Trazo, texto y botones', claro: false },
  { n: 'Albahaca', h: '#526531', u: 'La marca: fachada, carga, empaque', claro: false },
  { n: 'Gamuza', h: '#758850', u: 'Segundo tono y detalles', claro: false },
  { n: 'Plaza', h: '#98A973', u: 'Las hojas de la bolsita', claro: true },
  { n: 'Uva blanca', h: '#B9C798', u: 'Rayas y apagados', claro: true },
  { n: 'Kiwi', h: '#DCE7BE', u: 'Etiquetas y fondos de color', claro: true },
  { n: 'Papel', h: '#F4F4E6', u: 'El fondo de todo', claro: true },
];
const IDEA = [
  ['La bolsa', 'Es para llevar: la pides, la recoges y te vas.'],
  ['El brote', 'Empaque biodegradable: lo que sobra vuelve a la tierra.'],
  ['La sonrisa', 'Comer bien se siente bien. Y te saluda.'],
];
const APLICADA = [
  ['b-bolsa', 'Bolsa kraft con tu nombre, hora y casilla'],
  ['b-bowl', 'Empaque de fibra biodegradable'],
  ['b-mandil', 'Uniforme de cocina'],
  ['b-casillas', 'La pared de casillas'],
  ['b-bebida', 'Botella retornable'],
];

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
          {IDEA.map(([t, d], i) => (
            <div key={t} className="paso vidrio">
              <div className="dibujo">{i < 2 ? <Isotipo size={130} className={i === 0 ? 'sin-brote sin-cara' : 'sin-cara'} /> : <Bolsita size={140} />}</div>
              <b>{t}</b>
              <span>{d}</span>
            </div>
          ))}
        </div>
        <p className="nota">El personaje es la bolsa en la que te llevas tu comida. Dice tres cosas a la vez: <b>es para llevar, cuida el planeta y comer bien se siente bien.</b> En el nombre, la última <b>o</b> también sonríe.</p>
      </Bloque>

      <Bloque className="bx-formas">
        <h3>Cinco formas, una sola marca</h3>
        <div className="rejilla">
          <div className="vidrio ancha"><Logo size={50} lema /><small>Principal · horizontal</small></div>
          <div className="vidrio"><div className="vert"><Bolsita size={96} /><Nombre size={38} /></div><small>Vertical</small></div>
          <div className="vidrio oscura"><span className="ico"><Isotipo size={70} /></span><small>Ícono de la app</small></div>
          <div className="vidrio"><Sello size={130} className="bx-sello" /><small>Sello</small></div>
          <div className="vidrio olivo"><Logo size={34} tinta="blanca" /><small>Una tinta</small></div>
        </div>
      </Bloque>

      <Bloque className="bx-accion">
        <h3>La bolsita en acción</h3>
        <div className="dibujos">
          {[['oficina', 'Comer bien, a tu hora.'], ['casilla', 'Recógelo sin fila.'], ['bowl', 'Junta bocados.']].map(([e, t]) => (
            <figure key={e} className="vidrio"><Dibujo escena={e} /><figcaption>{t}</figcaption></figure>
          ))}
        </div>
        <p className="nota">Los dibujos de la app van en línea, con el mismo trazo del logo: así la marca se siente hecha a mano y no de catálogo.</p>
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
          <i style={{ flex: 45, background: '#F4F4E6' }}>Papel 45%</i>
          <i style={{ flex: 20, background: '#526531', color: '#DCE7BE' }}>Albahaca 20%</i>
          <i style={{ flex: 15, background: '#DCE7BE' }}>Kiwi</i>
          <i style={{ flex: 10, background: '#30401C' }} />
          <i style={{ flex: 6, background: '#98A973' }} />
          <i style={{ flex: 4, background: '#121F0D' }} />
        </div>
        <p className="nota">Siete verdes de helecho sobre papel: fresco, natural y tranquilo. El trazo siempre es ceylanita. <b>El rojo solo vive en la bolsita</b> (sus chapitas y corazones).</p>
      </Bloque>

      <Bloque className="bx-letra">
        <div className="vidrio tipo">
          <small>Logo y títulos · Outfit 900 / 800</small>
          <div className="grande">Ya está listo.</div>
          <small>Texto y app · Inter</small>
          <p>Bowl mediterráneo con quinoa, garbanzo rostizado y aderezo de yogur con limón. 520 kcal · 28 g proteína.</p>
          <small>A mano, solo para guiños · Gochi Hand</small>
          <div className="mano">come rico, a tu hora</div>
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
