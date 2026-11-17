import { useEffect, useRef, useState } from 'react';
import App from './App';
import Iphone from './Iphone';
import { Escena, FotoPlato, Isotipo, Logo } from './comun';
import { NEGOCIO, PLANES, PLATILLOS, delDia, diaLargo, diasHabiles, dinero, numDia, platillo } from './datos';

// ─────────────────────────────────────────────────────────────────────────────
// La PRESENTACIÓN del proyecto (13-nov, 2ª versión). Zahir: "una web para
// mostrar cómo sería cada cosa" → caso de estudio por capítulos, con la voz del
// negocio adentro:
//   Carga (el plato recibe su mordida) → Portada con índice →
//   01 La idea (frase que se lee con el scroll + cifras) →
//   02 El local (recorrido del pedido + maqueta 3D con puntos + galería) →
//   03 La app (iPhone realista con la app VIVA + recorrido guiado) →
//   04 La marca (símbolo, color, letra, marca aplicada) →
//   05 El negocio (menú de la semana + planes) → cierre.
// ─────────────────────────────────────────────────────────────────────────────

const CAPITULOS = [
  ['idea', '01', 'La idea'],
  ['local', '02', 'El local'],
  ['app', '03', 'La app'],
  ['marca', '04', 'La marca'],
  ['negocio', '05', 'El negocio'],
];

const ESCENAS = [
  { img: '01-oficina', hora: '8:40', titulo: 'Lo pides desde tu escritorio.', texto: 'Eliges tu comida y la hora a la que pasas. Treinta segundos entre correo y correo.', tel: 'programar' },
  { img: '04-cocina', hora: '12:30', titulo: 'Se cocina cuando lo necesitas.', texto: 'Tu pedido entra a cocina 30 minutos antes de tu hora. Nada se queda esperando en una vitrina.', tel: 'cocina' },
  { img: '02-fachada', hora: '12:58', titulo: 'Llegas.', texto: 'A dos cuadras de tu oficina. Sin fila, sin mesero, sin ticket.', tel: 'listo' },
  { img: '03-entrada', hora: '13:00', titulo: 'Tu nombre, tu casilla.', texto: 'Una pared de casillas numeradas. La app te dice cuál es la tuya.', tel: 'listo' },
  { img: '05-repisa', hora: '13:01', titulo: 'Lo tomas y te vas.', texto: 'Dos minutos desde que entras. El resto de tu hora de comida es tuya.', tel: 'recogido' },
  { img: '06-comedor', hora: '13:05', titulo: 'O te quedas un rato.', texto: 'Una barra con luz de ventana para comer tranquilo, si te late.', tel: 'gracias' },
];

// Zonas de la maqueta: x/y en % de la imagen (medidos sobre maqueta.webp).
const ZONAS = [
  { id: 'entrada', n: 1, x: 53, y: 79, titulo: 'Entrada', texto: 'Fachada de vidrio a pie de calle. Lo primero que ves al entrar es la pared de casillas: sabes a dónde ir sin preguntar.' },
  { id: 'casillas', n: 2, x: 48, y: 60, titulo: 'Pared de casillas', texto: '12 casillas de roble abiertas por los dos lados: cocina las llena por atrás, tú tomas la tuya por delante. Rotan cada 15 minutos.' },
  { id: 'mostrador', n: 3, x: 76, y: 64, titulo: 'Mostrador', texto: 'Una persona para dudas, pedidos sin app y pago en efectivo. No hay caja registradora ni fila.' },
  { id: 'cocina', n: 4, x: 59, y: 35, titulo: 'Cocina a la vista', texto: 'Línea de armado detrás de vidrio: frío, caliente y empaque. Ver cómo se prepara tu comida da confianza.' },
  { id: 'barra', n: 5, x: 22.5, y: 54, titulo: 'Barra para comer', texto: 'Bancos frente al ventanal para quien prefiere quedarse. La mayoría se lo lleva.' },
  { id: 'servicio', n: 6, x: 42, y: 15, titulo: 'Servicio', texto: 'Bodega, cuarto frío y baño, con acceso de proveedores por atrás sin cruzarse con los clientes.' },
];

const GUIA = [
  { tipo: 'bienvenida', t: 'La primera vez', d: 'Te da la bienvenida, te pregunta qué buscas, qué evitas y cómo lo quieres.' },
  { tipo: 'personaliza', t: 'Personaliza', d: 'Sin cebolla, doble proteína, extra aguacate. Con kcal y proteína a la vista.' },
  { tipo: 'programa', t: 'Recoge a tu hora', d: 'Eliges día y hora; los horarios muestran cuánto cupo queda.' },
  { tipo: 'domicilio', t: 'O te lo llevamos', d: 'A tu oficina, en la ventana de 15 minutos que elijas.' },
  { tipo: 'semana', t: 'Arma tu semana', d: 'Cinco comidas en un minuto, con precio de plan.' },
  { tipo: 'aviso', t: 'Te avisa', d: 'Cuando tu pedido llega a su casilla, te llega el número.' },
  { tipo: 'camino', t: 'Síguelo en el mapa', d: 'Si es a domicilio, ves a tu repartidor en camino.' },
];

const quieto = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const ir = (id) => document.getElementById(id)?.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth' });

// Avance 0..1 de una sección alta mientras su hijo pegado está en pantalla.
function useAvance(ref) {
  const [a, setA] = useState(0);
  useEffect(() => {
    let raf = 0;
    const medir = () => {
      raf = 0;
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setA(total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0);
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(medir); };
    medir();
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    return () => { window.removeEventListener('scroll', pedir); window.removeEventListener('resize', pedir); cancelAnimationFrame(raf); };
  }, [ref]);
  return a;
}

function useVisto(umbral = 0.18) {
  const ref = useRef(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    if (quieto() || !('IntersectionObserver' in window)) { setVisto(true); return undefined; }
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { setVisto(true); io.disconnect(); } }, { threshold: umbral });
    io.observe(el);
    return () => io.disconnect();
  }, [umbral]);
  return [ref, visto];
}
function Aparece({ as: Tag = 'div', className = '', children, retraso = 0, ...rest }) {
  const [ref, visto] = useVisto();
  return <Tag ref={ref} className={`bb-aparece ${visto ? 'visto' : ''} ${className}`} style={{ transitionDelay: `${retraso}ms`, ...rest.style }} {...rest}>{children}</Tag>;
}

// Titular que entra palabra por palabra desde su ranura.
function Titular({ as: Tag = 'h2', className = '', lineas }) {
  const [ref, visto] = useVisto(0.3);
  let k = 0;
  return (
    <Tag ref={ref} className={`bb-h ${visto ? 'visto' : ''} ${className}`}>
      {lineas.map((l, i) => (
        <span key={i} className={`linea ${i > 0 ? 'tenue' : ''}`}>
          {l.split(' ').map((w) => { k += 1; return <span key={k} className="pal"><span style={{ transitionDelay: `${k * 55}ms` }}>{w}</span></span>; })}
        </span>
      ))}
    </Tag>
  );
}

function Cabecera({ n, nombre, lineas, lead }) {
  return (
    <header className="bb-cap-cab">
      <div className="bb-filete"><span>{n} — {nombre}</span><i /><span>el buen bocado</span></div>
      <div className="fila">
        <Titular lineas={lineas} />
        {lead && <Aparece as="p" className="lead" retraso={200}>{lead}</Aparece>}
      </div>
    </header>
  );
}

// ── CARGA: el plato aparece y recibe su mordida ──────────────────────────────
function Carga({ onFin }) {
  const [fuera, setFuera] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setFuera(true), 1900);
    const b = setTimeout(onFin, 2700);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [onFin]);
  return (
    <div className={`bb-carga ${fuera ? 'fuera' : ''}`} aria-hidden="true">
      <div className="centro">
        <svg viewBox="0 0 100 100" className="plato">
          <defs>
            <mask id="bb-carga-m" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
              <rect width="100" height="100" fill="#fff" />
              <g className="dientes"><circle cx="88" cy="22" r="13" fill="#000" /><circle cx="96" cy="38" r="11" fill="#000" /><circle cx="76" cy="10" r="11" fill="#000" /></g>
            </mask>
          </defs>
          <g mask="url(#bb-carga-m)">
            <circle className="aro" cx="50" cy="50" r="44" fill="#E2553B" />
            <circle className="centro-c" cx="50" cy="50" r="22" fill="#5E6B3F" />
          </g>
        </svg>
        <div className="bb-wm"><span className="el">el buen</span>bocado</div>
      </div>
    </div>
  );
}

export default function Sitio() {
  const [cargando, setCargando] = useState(() => {
    try { return !quieto() && !sessionStorage.getItem('bb_carga'); } catch { return false; }
  });
  const terminar = () => { try { sessionStorage.setItem('bb_carga', '1'); } catch { /* sin almacenamiento */ } setCargando(false); };
  const [solido, setSolido] = useState(false);
  const [menu, setMenu] = useState(false);
  const [cap, setCap] = useState(null);

  useEffect(() => {
    const f = () => {
      setSolido(window.scrollY > window.innerHeight * 0.75);
      let actual = null;
      CAPITULOS.forEach(([id, n, nombre]) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.45) actual = { n, nombre, id };
      });
      setCap(actual);
    };
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  const navegar = (id) => { setMenu(false); ir(id); };

  return (
    <div className="bb-sitio">
      {cargando && <Carga onFin={terminar} />}
      <header className={`bb-cab ${solido ? 'solido' : ''} ${menu ? 'abierto' : ''}`}>
        <button className="bb-cab-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Inicio">
          <Logo size={32} centro={solido || menu ? 'var(--bb-masa)' : 'var(--bb-albahaca)'} />
        </button>
        <nav>
          {CAPITULOS.map(([id, n, nombre]) => (
            <button key={id} className={cap?.id === id ? 'on' : ''} onClick={() => navegar(id)}><small>{n}</small>{nombre}</button>
          ))}
        </nav>
        <button className="bb-hamburguesa" onClick={() => setMenu(!menu)} aria-label="Menú" aria-expanded={menu}><i /><i /></button>
      </header>

      <Portada navegar={navegar} />
      <Idea />
      <Local />
      <LaApp />
      <Marca />
      <Negocio />
      <Cierre />
    </div>
  );
}

// ── PORTADA ─────────────────────────────────────────────────────────────────
function Portada({ navegar }) {
  return (
    <section className="bb-portada">
      <div className="bb-portada-cab">
        <span>Proyecto de Emprendimiento</span>
        <span>Prototipo del local y de la app</span>
        <span>Puebla · 2026</span>
      </div>
      <div className="bb-portada-centro">
        <div className="txt">
          <h1 className="bb-wm gigante"><span className="el">el buen</span>bocado</h1>
          <p className="lema">Comida saludable para gente sin tiempo. Para recoger sin fila o a domicilio en tu oficina.<br /><em>Pídelo a las 9. Recógelo a la 1.</em></p>
        </div>
        <div className="plato">
          <div className="plato-giro"><FotoPlato id="mediterraneo" className="foto" /></div>
          <span className="sello"><b>Bowl mediterráneo</b> 520 kcal · {dinero(125)}</span>
        </div>
      </div>
      <nav className="bb-indice" aria-label="Capítulos">
        {CAPITULOS.map(([id, n, nombre]) => (
          <button key={id} onClick={() => navegar(id)}><small>{n}</small><span>{nombre}</span><i>↓</i></button>
        ))}
      </nav>
    </section>
  );
}

// ── 01 LA IDEA ──────────────────────────────────────────────────────────────
const FRASE = 'Tienes una hora para comer. Pierdes veinte minutos en la fila y terminas comiendo lo que sea. Nosotros cocinamos para tu hora: lo pides en la mañana y a la una lo recoges sin fila, o te lo llevamos a tu oficina.';

function Idea() {
  const ref = useRef(null);
  const a = useAvance(ref);
  const palabras = FRASE.split(' ');
  const hasta = (a * 1.25 - 0.08) * palabras.length;
  return (
    <section id="idea" className="bb-idea">
      <div className="bb-lee" ref={ref}>
        <div className="pegado">
          <div className="bb-filete claro"><span>01 — La idea</span><i /><span>el problema y la respuesta</span></div>
          <p className="frase">
            {palabras.map((w, i) => <span key={i} className={i < hasta ? 'on' : ''}>{w} </span>)}
          </p>
        </div>
      </div>
      <div className="bb-pilares">
        {[
          ['Saludable de verdad', 'Porciones medidas, kcal y proteína a la vista. Comida que se antoja, no "de dieta".'],
          ['Lista a tu hora', 'Se prepara 30 minutos antes de que llegues. Ni antes, ni después.'],
          ['Sin fila, o a tu puerta', 'Casillas con tu nombre para recoger en dos minutos, o entrega en tu oficina en la ventana que elijas.'],
        ].map(([t, d], i) => (
          <Aparece key={t} className="pilar" retraso={i * 110}>
            <Isotipo size={44} aro={['var(--bb-tomate)', 'var(--bb-pepino)', 'var(--bb-masa)'][i]} centro="var(--bb-albahaca)" />
            <b>{t}</b><p>{d}</p>
          </Aparece>
        ))}
      </div>
      <div className="bb-cifras">
        {[['30 s', 'para pedir desde la app'], ['30 min', 'antes de tu hora entra a cocina'], ['2 min', 'de la puerta a la calle'], ['0', 'filas, tickets o meseros']].map(([n, t], k) => (
          <Aparece key={t} className="cifra" retraso={k * 90}><b>{n}</b><span>{t}</span></Aparece>
        ))}
      </div>
    </section>
  );
}

// ── 02 EL LOCAL ─────────────────────────────────────────────────────────────
function Local() {
  return (
    <section id="local" className="bb-local">
      <div className="bb-pad">
        <Cabecera n="02" nombre="El local" lineas={['Un local hecho', 'para no esperar.']} lead="Unos 70 m² a pie de calle, en zona de oficinas. Primero, el recorrido de un pedido de principio a fin." />
      </div>
      <Recorrido />
      <div className="bb-pad">
        <Maqueta />
      </div>
    </section>
  );
}

function Recorrido() {
  const ref = useRef(null);
  const a = useAvance(ref);
  const n = ESCENAS.length;
  const pos = a * (n - 0.001);
  const i = Math.floor(pos);
  const dentro = pos - i;
  const e = ESCENAS[i];
  return (
    <div className="bb-recorrido" ref={ref} style={{ height: `${n * 110 + 60}vh` }}>
      <div className="pegado">
        {ESCENAS.map((s, k) => {
          const zoom = 1.03 + 0.07 * (k === i ? dentro : k < i ? 1 : 0);
          return (
            <div key={s.img} className={`capa ${k === i ? 'on' : ''}`} style={{ transform: `scale(${zoom})` }}>
              <Escena nombre={s.img} />
            </div>
          );
        })}
        <div className="velo" />
        <div className="bb-reloj-caja">
          <div className="paso">Paso {i + 1} de {n}</div>
          <div className="hora" key={e.hora}>{e.hora}</div>
          <h3 key={`t${i}`}>{e.titulo}</h3>
          <p key={`p${i}`}>{e.texto}</p>
          <div className="ticks">{ESCENAS.map((s, k) => <i key={s.img} className={k <= i ? 'on' : ''} style={k === i ? { '--x': dentro } : undefined} />)}</div>
        </div>
        <div className="bb-tel-flota"><Iphone className="chico"><MiniTel estado={e.tel} /></Iphone></div>
      </div>
    </div>
  );
}

function MiniTel({ estado }) {
  const p = platillo('pollo-limon');
  return (
    <div className="mini" key={estado}>
      {estado === 'programar' && (
        <>
          <div className="mini-cab"><small>Hola, Ana</small><b>¿Qué se te antoja hoy?</b></div>
          <div className="mini-card"><FotoPlato id={p.id} /><div><b>{p.nombre}</b><span>{dinero(p.precio)}</span></div></div>
          <div className="mini-horas"><span>12:30</span><span className="on">13:00</span><span>13:30</span></div>
          <div className="mini-btn">Pagar · Hoy 13:00</div>
        </>
      )}
      {estado === 'cocina' && (
        <>
          <div className="mini-cab"><small>Hoy · 13:00</small><b>En cocina</b></div>
          <div className="mini-grande"><FotoPlato id={p.id} /></div>
          <div className="mini-pasos"><i className="on" /><i className="on" /><i /></div>
          <p className="mini-txt">Lo están armando para ti.</p>
        </>
      )}
      {estado === 'listo' && (
        <>
          <div className="mini-notif"><Isotipo size={18} centro="var(--bb-carbon)" /><div><b>el buen bocado · ahora</b><span>Tu pedido ya está en la casilla 04</span></div></div>
          <div className="mini-casilla"><small>Tu casilla</small><b>04</b><span>Busca tu nombre</span></div>
          <div className="mini-pasos"><i className="on" /><i className="on" /><i className="on" /></div>
        </>
      )}
      {estado === 'recogido' && (
        <>
          <div className="mini-cab"><small>BB-1042</small><b>¡Buen provecho!</b></div>
          <div className="mini-check"><Isotipo size={110} centro="var(--bb-masa)" /></div>
          <p className="mini-txt">+16 bocados · llevas 136</p>
        </>
      )}
      {estado === 'gracias' && (
        <>
          <div className="mini-cab"><small>Para mañana</small><b>¿Lo de siempre?</b></div>
          <div className="mini-card"><FotoPlato id="lentejas" /><div><b>Lentejas tibias</b><span>El del día</span></div></div>
          <div className="mini-btn">Programar 13:00</div>
        </>
      )}
    </div>
  );
}

function Maqueta() {
  const [zona, setZona] = useState('casillas');
  const [mal, setMal] = useState(false);
  const z = ZONAS.find((x) => x.id === zona);
  return (
    <div className="bb-maqueta-sec">
      <div className="bb-subcab">
        <Titular as="h3" className="chico" lineas={['La maqueta.', 'Toca cada zona.']} />
      </div>
      <div className="bb-maqueta">
        <div className="lienzo">
          {mal ? <div className="bb-escena-falta" style={{ aspectRatio: '3 / 2' }} /> : <img src="/bocado/maqueta.webp" alt="Maqueta del local en corte" onError={() => setMal(true)} draggable={false} />}
          {ZONAS.map((x) => (
            <button key={x.id} className={`pin ${zona === x.id ? 'on' : ''}`} style={{ left: `${x.x}%`, top: `${x.y}%` }} onClick={() => setZona(x.id)} onMouseEnter={() => setZona(x.id)} aria-label={x.titulo}>
              <span>{x.n}</span>
            </button>
          ))}
        </div>
        <aside className="ficha">
          <div className="lista">
            {ZONAS.map((x) => (
              <button key={x.id} className={zona === x.id ? 'on' : ''} onClick={() => setZona(x.id)}><small>{String(x.n).padStart(2, '0')}</small>{x.titulo}</button>
            ))}
          </div>
          <div className="detalle" key={z.id}><b>{z.titulo}</b><p>{z.texto}</p></div>
          <div className="datos"><span><b>~70 m²</b>superficie</span><span><b>12</b>casillas</span><span><b>6</b>bancos</span></div>
        </aside>
      </div>
      <div className="bb-galeria">
        {['02-fachada', '04-cocina', '03-entrada', '06-comedor'].map((n, i) => (
          <Aparece key={n} className="g" retraso={i * 90}><Escena nombre={n} /></Aparece>
        ))}
      </div>
    </div>
  );
}

// ── 03 LA APP ───────────────────────────────────────────────────────────────
function LaApp() {
  const [comando, setComando] = useState(null);
  const [activo, setActivo] = useState(null);
  const mandar = (tipo) => { setActivo(tipo); setComando({ tipo, k: Date.now() }); };
  return (
    <section id="app" className="bb-app-sec">
      <div className="bb-pad">
        <Cabecera n="03" nombre="La app" lineas={['Pruébala.', 'Es de verdad.']} lead="El prototipo funciona: pide, personaliza, programa y mira cómo avanza tu pedido. Toca una función y la app te lleva." />
      </div>
      <div className="bb-app-escena bb-pad">
        <ol className="bb-guia">
          {GUIA.map((g, i) => (
            <li key={g.tipo}>
              <button className={activo === g.tipo ? 'on' : ''} onClick={() => mandar(g.tipo)}>
                <small>{String(i + 1).padStart(2, '0')}</small>
                <span><b>{g.t}</b><em>{g.d}</em></span>
                <i aria-hidden="true">→</i>
              </button>
            </li>
          ))}
          <li className="pie">
            <a className="bb-btn" href="?rol=app" target="_blank" rel="noopener">Abrir la app sola ↗</a>
            <span className="bb-nota">Prototipo: pagos de prueba; los pedidos de hoy avanzan acelerados.</span>
          </li>
        </ol>
        <div className="bb-app-tel">
          <div className="halo" aria-hidden="true" />
          <Iphone inclina className="grande" logico={393}><App marco comando={comando} /></Iphone>
        </div>
      </div>
    </section>
  );
}

// ── 04 LA MARCA ─────────────────────────────────────────────────────────────
function Marca() {
  const COLORES = [
    ['Olivo', '#5E6B3F', 'La marca'],
    ['Tomate', '#E2553B', 'Lo importante'],
    ['Masa', '#EEF0E2', 'El fondo'],
    ['Salvia', '#D8DFA8', 'Detalles'],
    ['Carbón', '#2E3320', 'Texto'],
  ];
  return (
    <section id="marca" className="bb-marca">
      <div className="bb-pad">
        <Cabecera n="04" nombre="La marca" lineas={['Un plato con la', 'mordida ya dada.']} lead="El símbolo es un plato visto desde arriba al que ya le dieron el primer bocado: es comida, se antoja y alguien ya la está disfrutando." />
        <div className="bb-marca-grid">
          <Aparece className="m-logo">
            <Isotipo size={180} centro="var(--bb-albahaca)" />
            <div className="bb-wm"><span className="el">el buen</span>bocado</div>
          </Aparece>
          <Aparece className="m-colores" retraso={100}>
            {COLORES.map(([n, h, u]) => (
              <div key={n} style={{ background: h, color: ['Masa', 'Salvia'].includes(n) ? 'var(--bb-albahaca)' : 'var(--bb-masa)' }}>
                <b>{n}</b><span>{h}</span><small>{u}</small>
              </div>
            ))}
          </Aparece>
          <Aparece className="m-letra" retraso={160}>
            <small>Títulos</small><div className="d">Bricolage Grotesque</div>
            <small>Texto y app</small><div className="t">Inter: clara en pantalla, hasta en letra chica.</div>
            <div className="aa">Aa</div>
          </Aparece>
          <Aparece className="m-voz" retraso={220}>
            <small>Así hablamos</small>
            <p>"Tu bowl ya está en la casilla 4."</p>
            <span>De tú, en corto, sin culpa ni "detox". Siempre que se puede, decimos la hora.</span>
          </Aparece>
        </div>
        <div className="bb-aplicada">
          {[['m-bolsa', 'Bolsa de papel kraft'], ['m-empaque', 'Empaque biodegradable'], ['m-uniforme', 'Uniforme'], ['p-agua-pepino', 'Botella retornable']].map(([img, t], i) => (
            <Aparece key={img} as="figure" className="ap" retraso={i * 90}>
              <Escena nombre={img} /><figcaption>{t}</figcaption>
            </Aparece>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 05 EL NEGOCIO ───────────────────────────────────────────────────────────
function Negocio() {
  const dias = diasHabiles(5);
  return (
    <section id="negocio" className="bb-negocio">
      <div className="bb-pad">
        <Cabecera n="05" nombre="El negocio" lineas={['Un menú corto', 'que cambia cada día.']} lead="Un platillo especial por día más la carta de siempre. Menos opciones = cocina más rápida y menos merma." />
        <div className="bb-semana-web">
          {dias.map((d, k) => {
            const p = platillo(delDia(d));
            return (
              <Aparece key={d} className="dia" retraso={k * 80}>
                <div className="foto"><FotoPlato id={p.id} /></div>
                <small>{diaLargo(d)} {numDia(d)}</small>
                <b>{p.nombre}</b>
                <span>{p.kcal} kcal · {p.prot} g proteína · {dinero(p.precio)}</span>
              </Aparece>
            );
          })}
        </div>
        <div className="bb-carta">
          <h3>Siempre en la carta</h3>
          {PLATILLOS.map((p) => (
            <div key={p.id} className="renglon"><b>{p.nombre}</b><span className="puntos" /><span>{dinero(p.precio)}</span></div>
          ))}
        </div>
      </div>
      <div className="bb-planes-sec">
        <div className="bb-pad">
          <Titular className="claro" lineas={['Deja de pensar', 'qué vas a comer.']} />
          <div className="bb-planes">
            {PLANES.map((p, k) => (
              <Aparece key={p.id} className={`plan ${p.destacado ? 'destacado' : ''}`} retraso={k * 90}>
                {p.destacado && <span className="cinta">El favorito</span>}
                <small>{p.nombre}</small>
                <b>{p.precio ? dinero(p.precio) : 'Desde $129'}</b>
                <span className="det">{p.detalle}</span>
                <ul>{p.puntos.map((t) => <li key={t}>{t}</li>)}</ul>
              </Aparece>
            ))}
          </div>
          <div className="bb-modelo">
            <div><b>{dinero(125)}</b><span>precio promedio por platillo</span></div>
            <div><b>Bocado+ · {dinero(149)}</b><span>al mes: envío gratis, 10% en todo y doble de bocados</span></div>
            <div><b>A domicilio</b><span>{dinero(25)} en 3 km · gratis con plan o Bocado+</span></div>
            <div><b>100% biodegradable</b><span>empaques sin plástico</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── CIERRE ──────────────────────────────────────────────────────────────────
function Cierre() {
  return (
    <footer className="bb-cierre">
      <div className="bb-pad">
        <Titular className="gigante-cierre" lineas={['Pídelo a las 9.', 'Recógelo a la 1.']} />
        <div className="fila">
          <div className="marca"><Isotipo size={72} aro="#fff" centro="var(--bb-tomate)" /><div className="bb-wm"><span className="el">el buen</span>bocado</div></div>
          <div className="datos"><p>{NEGOCIO.direccion}</p><p>{NEGOCIO.horario}</p></div>
          <div className="kz"><p>Proyecto de Emprendimiento</p><p>Diseño y desarrollo · KaiZen Studio</p></div>
        </div>
      </div>
    </footer>
  );
}
