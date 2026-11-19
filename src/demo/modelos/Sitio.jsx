import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowRight, Check, Download, Heart, MapPin, Printer, Send, Sparkles, X } from 'lucide-react';
import {
  AGENCIA, CATEGORIAS, PORTADAS, TIPOS_TRABAJO, USOS, DIA,
  useAgencia, todasLasModelos, modeloPorId, nombreDe, choques, alternarFavorito, vaciarPackage,
  enviarSolicitud, aceptarCotizacion, rechazarCotizacion, registrarseEvento,
  dinero, fechaLarga, hora, medidasTxt, estaturaTxt,
} from './datos';
import { Campo, FotoModelo, Foto, Modal, Polaroid, Sello, aLocal } from './comun';
import Portada from './Portada';
import { Enlace, Folio, Imagen, RasgaFondo, Rasgado, useAvance, useRevela } from './kade';

// ─────────────────────────────────────────────────────────────────────────────
// SITIO DE LA AGENCIA — lo que ve una marca, un fotógrafo o una productora.
// Rediseño 18-nov-2026 ("cine + revista"; referencias de Zahir: una agencia con
// paneles de foto a pantalla completa y serotoninn.com — solo inspiración):
// fotos grandes de Unsplash a máxima calidad, blanco y negro que se RASGA a
// color, letra condensada enorme + máquina de escribir, folios rojos.
// Book con filtros → página de la modelo → package → solicitud → cotización.
// ─────────────────────────────────────────────────────────────────────────────

const VISTAS = [
  ['inicio', 'Inicio'], ['mujeres', 'Mujeres'], ['hombres', 'Hombres'], ['new', 'New faces'],
  ['eventos', 'Eventos'], ['solicitudes', 'Mis solicitudes'],
];
const TITULOS = { ...Object.fromEntries(VISTAS), inicio: AGENCIA.nombre };

export default function Sitio({ alPostularse }) {
  const e = useAgencia();
  const [menu, setMenu] = useState(false);
  const [bajo, setBajo] = useState(false);
  useEffect(() => {
    const alBajar = () => setBajo(window.scrollY > 40);
    alBajar();
    window.addEventListener('scroll', alBajar, { passive: true });
    return () => window.removeEventListener('scroll', alBajar);
  }, []);
  useEffect(() => {
    if (!menu) return undefined;
    const html = document.documentElement;
    const antes = html.style.overflow;
    html.style.overflow = 'hidden';
    const tecla = (ev) => { if (ev.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', tecla);
    return () => { html.style.overflow = antes; window.removeEventListener('keydown', tecla); };
  }, [menu]);
  const [vista, setVista] = useState('inicio');
  const [modelo, setModelo] = useState(null);
  const [lista, setLista] = useState([]);
  const [package_, setPackage] = useState(null);
  const [composite, setComposite] = useState(null);
  const [evento, setEvento] = useState(null);

  // telón entre secciones: baja negro con el nombre de lo que viene
  const [telon, setTelon] = useState(null);
  const conTelon = (texto, accion) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { accion(); window.scrollTo({ top: 0 }); return; }
    setTelon({ texto, fase: 'cubre' });
    setTimeout(() => { accion(); window.scrollTo({ top: 0 }); setTelon({ texto, fase: 'abre' }); }, 560);
    setTimeout(() => setTelon(null), 1250);
  };
  const ir = (v) => conTelon(TITULOS[v], () => { setModelo(null); setVista(v); });
  const abrir = (id, ids) => conTelon(modeloPorId(e, id)?.nombre || AGENCIA.nombre, () => {
    setLista(ids?.length ? ids : todasLasModelos(e).map((m) => m.id)); setModelo(id);
  });
  const pedir = (id) => { if (!e.favoritos.includes(id)) alternarFavorito(id); setPackage('form'); };
  const misSolicitudes = e.solicitudes.filter((s) => s.mia);
  const porContestar = misSolicitudes.filter((s) => s.estado === 'cotizada').length;
  const sobreFoto = !modelo && ['inicio', 'eventos'].includes(vista) && !bajo;

  return (
    <div className="kd kd-sitio">
      <header className={`kd-cab ${sobreFoto ? 'sobre-foto' : ''} ${bajo ? 'bajo' : ''}`}>
        <button type="button" className="kd-logo" onClick={() => ir('inicio')} aria-label="Inicio">{AGENCIA.nombre}</button>
        <p className="kd-cab-giro">Model management<br />Casting · Booking</p>
        <nav className="kd-nav" aria-label="Secciones">
          {VISTAS.slice(1).map(([id, t]) => (
            <button key={id} type="button" aria-current={!modelo && vista === id ? 'page' : undefined} onClick={() => ir(id)}>
              {t}{id === 'solicitudes' && porContestar > 0 && <sup>{porContestar}</sup>}
            </button>
          ))}
        </nav>
        <div className="kd-cab-der">
          <button type="button" className="kd-cab-postula" onClick={alPostularse}>Quiero ser modelo</button>
          <button type="button" className="kd-cab-package" onClick={() => setPackage('mesa')}>Package <b>({e.favoritos.length})</b></button>
          <button type="button" className="kd-cab-menu" onClick={() => setMenu(true)} aria-expanded={menu}>Menú{porContestar > 0 && <i />}</button>
        </div>
      </header>

      {modelo ? (
        <Portada key={modelo} id={modelo} lista={lista} alCambiar={setModelo} alCerrar={() => conTelon(TITULOS[vista], () => setModelo(null))}
          alComposite={setComposite} alPedir={pedir} />
      ) : (
        <>
          {vista === 'inicio' && <Inicio e={e} ir={ir} abrir={abrir} abrirEvento={setEvento} alPostularse={alPostularse} />}
          {['mujeres', 'hombres', 'new'].includes(vista) && <Book key={vista} e={e} board={vista} abrir={abrir} />}
          {vista === 'eventos' && <Eventos e={e} abrir={setEvento} />}
          {vista === 'solicitudes' && <Solicitudes e={e} lista={misSolicitudes} ir={ir} />}
        </>
      )}

      <footer className="kd-pie">
        <div className="kd-pie-cta">
          <Folio n={6}>Contacto</Folio>
          <h2 className="kd-titulo">¿Tienes un<br /><span>proyecto?</span></h2>
          <div className="kd-pie-cta-der">
            <p>Castings, campañas, pasarela y contenido. Cuéntanos qué buscas y te mandamos un package en 24 horas.</p>
            <a className="kd-pie-correo" href={`mailto:${AGENCIA.correo}`}>{AGENCIA.correo} <span aria-hidden="true">↗</span></a>
            <button type="button" className="kd-enlace" onClick={() => setPackage(e.favoritos.length ? 'form' : 'mesa')}>[ Arma tu package ]</button>
          </div>
        </div>
        <div className="kd-pie-fila">
          <div><p className="kd-mono-chico">Agencia</p><p>{AGENCIA.completo}<br />{AGENCIA.ciudad}</p></div>
          <div><p className="kd-mono-chico">Booking</p><p>{AGENCIA.correo}<br />Lun a vie · 9 a 19 h</p></div>
          <div><p className="kd-mono-chico">Board</p><p className="kd-pie-links">
            {VISTAS.slice(1, 5).map(([id, t]) => <button key={id} type="button" onClick={() => ir(id)}>{t}</button>)}
          </p></div>
          <div><p className="kd-mono-chico">Scouting</p><p>¿Quieres ser modelo?<br /><button type="button" className="kd-rojo" onClick={alPostularse}>Postúlate →</button></p></div>
        </div>
        <p className="kd-pie-marca" aria-hidden="true">{AGENCIA.nombre}</p>
        <div className="kd-pie-legal">
          <span>© 2026 {AGENCIA.completo}</span>
          <span>Aviso de privacidad</span>
          <span>Instagram · TikTok</span>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Volver arriba ↑</button>
        </div>
      </footer>

      {menu && (
        <div className="kd kd-menu" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="kd-menu-cab">
            <span className="kd-logo">{AGENCIA.nombre}</span>
            <button type="button" className="kd-cab-menu" onClick={() => setMenu(false)} aria-label="Cerrar menú"><X size={20} /></button>
          </div>
          <nav>
            {VISTAS.map(([id, t], k) => (
              <button key={id} type="button" style={{ animationDelay: `${k * 45}ms` }} onClick={() => { setMenu(false); ir(id); }}>
                <small>{String(k + 1).padStart(2, '0')}</small>{t}{id === 'solicitudes' && porContestar > 0 && <sup>{porContestar}</sup>}
              </button>
            ))}
            <button type="button" style={{ animationDelay: `${VISTAS.length * 45}ms` }} onClick={() => { setMenu(false); alPostularse(); }}>
              <small>{String(VISTAS.length + 1).padStart(2, '0')}</small><span className="kd-rojo">Quiero ser modelo</span>
            </button>
          </nav>
          <p className="kd-mono-chico">{AGENCIA.ciudad} · {AGENCIA.correo}</p>
        </div>
      )}
      {telon && <div className={`kd-telon ${telon.fase}`} aria-hidden="true"><span>{telon.texto}</span></div>}
      {composite && <Composite m={modeloPorId(e, composite)} alCerrar={() => setComposite(null)} />}
      {package_ && <Package e={e} pasoInicial={package_} alCerrar={() => setPackage(null)} alEnviado={() => { setPackage(null); ir('solicitudes'); }} abrir={(id) => { setPackage(null); abrir(id, e.favoritos); }} />}
      {evento && <RegistroEvento e={e} ev={e.eventos.find((x) => x.id === evento)} alCerrar={() => setEvento(null)} />}
    </div>
  );
}

// ── entrada: video a pantalla completa ──────────────────────────────────────
// Montaje de 17 s (6 tomas 4K de Pexels, cortes secos de 2.8 s; se arma con
// ffmpeg, ver CLAUDE.md). 1440p en pantallas grandes, 1080p en lo demás; el
// cuadro fijo se ve mientras llega. Encima casi nada (19-nov, Zahir: "que no
// tenga tanta info"): el lema y un enlace para bajar.
const VIDEO = '/modelos/kade/video/hero';

function Entrada({ alBajar }) {
  const video = useRef(null);
  const [listo, setListo] = useState(false);
  const [src] = useState(() => (window.innerWidth * (window.devicePixelRatio || 1) > 2000 ? `${VIDEO}-1440.mp4` : `${VIDEO}-1080.mp4`));
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) video.current?.pause();
  }, []);
  return (
    <section className="kd-entrada" aria-label="Portada">
      <img className="kd-entrada-poster" src={`${VIDEO}-poster.webp`} alt="" />
      <video ref={video} className={`kd-entrada-video ${listo ? 'listo' : ''}`} src={src} autoPlay muted loop playsInline preload="auto"
        onPlaying={() => setListo(true)} aria-label="Video de la agencia" />
      <p className="kd-entrada-lema">Caras que se quedan.</p>
      <button type="button" className="kd-entrada-bajar" onClick={alBajar}>[ Ver el talento ↓ ]</button>
    </section>
  );
}

// ── inicio ──────────────────────────────────────────────────────────────────
const DESTACADAS = ['valeria', 'nia', 'renata', 'mara', 'zuri', 'andres'];

function Inicio({ e, ir, abrir, abrirEvento, alPostularse }) {
  const proximos = e.eventos.filter((x) => x.publico && x.fecha > Date.now()).sort((a, b) => a.fecha - b.fecha);
  const revela = useRevela();
  const talento = useRef(null);
  return (
    <div ref={revela}>
      <Entrada alBajar={() => talento.current?.scrollIntoView({ behavior: 'smooth' })} />

      <section ref={talento} className="kd-claro kd-talento">
        <div className="kd-sec-cab">
          <Folio n={1}>Talento</Folio>
          <h2 className="kd-titulo kd-revela">Caras que<br /><span>se quedan</span></h2>
          <Enlace onClick={() => ir('mujeres')}>Ver todas</Enlace>
        </div>
        <div className="kd-rejilla kd-rejilla-3">
          {DESTACADAS.map((id, i) => <Carta key={id} m={modeloPorId(e, id)} e={e} i={i} abrir={(x) => abrir(x, DESTACADAS)} />)}
        </div>
      </section>

      <Campana />

      <Lista e={e} ir={ir} abrir={abrir} />

      {proximos.length > 0 && (
        <section className="kd-oscuro kd-eventos-inicio">
          <div className="kd-sec-cab">
            <Folio n={4}>Eventos</Folio>
            <h2 className="kd-titulo kd-revela">En<br /><span>la agenda</span></h2>
            <Enlace onClick={() => ir('eventos')}>Ver eventos</Enlace>
          </div>
          <ol className="kd-filas">
            {proximos.slice(0, 3).map((ev, k) => (
              <li key={ev.id} className="kd-revela" style={{ '--k': k }}>
                <button type="button" onClick={() => abrirEvento(ev.id)}>
                  <span className="kd-fila-fecha">{new Date(ev.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).replace('.', '')}</span>
                  <span className="kd-fila-nombre">{ev.titulo}</span>
                  <span className="kd-fila-lugar">{ev.lugar} · {hora(ev.fecha)}</span>
                  <span className="kd-fila-ir">[ Registrarme ]</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="kd-scouting">
        <Imagen nombre="estudio-luz" sizes="(max-width: 760px) 100vw, 50vw" className="kd-scouting-foto" />
        <div className="kd-scouting-txt">
          <Folio n={5}>Scouting</Folio>
          <h2 className="kd-titulo kd-revela">Tu cara,<br /><span>nuestro</span><br />próximo book</h2>
          <p>Mándanos dos fotos con el celular, sin maquillaje y con luz de día. Si vemos algo, te invitamos al siguiente casting abierto.</p>
          <Enlace onClick={alPostularse}>Postúlate en 2 minutos</Enlace>
        </div>
      </section>
    </div>
  );
}

// "02. Campaña": una foto a sangre partida en color | blanco y negro por una
// rasgadura que se mueve con el scroll.
function Campana() {
  const [ref, a] = useAvance();
  const p = 18 + a * 64;
  return (
    <section ref={ref} className="kd-campana">
      <Rasgado nombre="valeria-2" sizes="100vw" semilla={11} p={p} posicion="50% 12%" />
      <div className="kd-campana-txt">
        <Folio n={2}>Campaña</Folio>
        <h2 className="kd-titulo">Invierno<br />26 / 27</h2>
      </div>
      <p className="kd-campana-nota">Valeria Ruiz para Norte Denim.<br />Fotografiada en Puebla, octubre 2026.</p>
    </section>
  );
}

// "03. El board": todos los nombres en líneas gigantes. Al pasar el cursor el
// renglón se rasga a negro de izquierda a derecha (la misma orilla de papel de
// las fotos, SIN foto) y el nombre queda en hueso encima. (19-nov: la foto que
// seguía al cursor, la "ventana" y la foto dentro del renglón no le gustaron.)
function Lista({ e, ir, abrir }) {
  const modelos = todasLasModelos(e);
  const ids = modelos.map((m) => m.id);
  return (
    <section className="kd-claro kd-lista">
      <div className="kd-sec-cab">
        <Folio n={3}>El board</Folio>
        <p className="kd-mono-chico">{modelos.length} caras · {AGENCIA.ciudad}</p>
        <Enlace onClick={() => ir('mujeres')}>Filtrar el board</Enlace>
      </div>
      <ol>
        {modelos.map((m, k) => (
          <li key={m.id}>
            <button type="button" onClick={() => abrir(m.id, ids)}>
              <RasgaFondo semilla={k + 5} />
              <small>{String(k + 1).padStart(2, '0')}</small>
              <span className="kd-lista-nombre">{m.nombre} {m.apellido}</span>
              <span className="kd-lista-datos">{estaturaTxt(m.estatura)} · {m.categorias[0]} · Nº {m.num}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── book con filtros ────────────────────────────────────────────────────────
function Book({ e, board, abrir }) {
  const [cat, setCat] = useState('');
  const [min, setMin] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [cabello, setCabello] = useState('');
  const [filtrar, setFiltrar] = useState(false);
  const todas = todasLasModelos(e);
  const base = board === 'new' ? todas.filter((m) => m.categorias.includes('New faces')) : todas.filter((m) => m.board === board);
  const lista = base.filter((m) => (!cat || m.categorias.includes(cat)) && (!min || m.estatura >= Number(min))
    && (!ciudad || m.ciudad === ciudad) && (!cabello || m.cabello === cabello));
  const cabellos = [...new Set(base.map((m) => m.cabello))];
  const activos = [cat, min, ciudad, cabello].filter(Boolean).length;
  const titulo = { mujeres: 'Mujeres', hombres: 'Hombres', new: 'New faces' }[board];
  const ids = lista.map((m) => m.id);
  const revela = useRevela(ids.join());
  return (
    <section ref={revela} className="kd-claro kd-book">
      <div className="kd-sec-cab">
        <Folio n={{ mujeres: 1, hombres: 2, new: 3 }[board]}>{titulo}</Folio>
        <h1 className="kd-titulo kd-revela">{titulo}<sup>({String(lista.length).padStart(2, '0')})</sup></h1>
        <Enlace aria-expanded={filtrar} onClick={() => setFiltrar((x) => !x)}>Filtrar{activos ? ` (${activos})` : ''}</Enlace>
      </div>
      {filtrar && (
        <div className="kd-filtros">
          <button type="button" aria-pressed={!cat} onClick={() => setCat('')}>Todas</button>
          {CATEGORIAS.filter((c) => board !== 'new' || c !== 'New faces').map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(cat === c ? '' : c)}>{c}</button>
          ))}
          <span style={{ flex: 1 }} />
          <select value={min} onChange={(ev) => setMin(ev.target.value)} aria-label="Estatura mínima">
            <option value="">Estatura</option>
            {[170, 175, 178, 180, 185].map((n) => <option key={n} value={n}>Desde {estaturaTxt(n)}</option>)}
          </select>
          <select value={ciudad} onChange={(ev) => setCiudad(ev.target.value)} aria-label="Ciudad">
            <option value="">Ciudad</option><option>CDMX</option><option>Puebla</option>
          </select>
          <select value={cabello} onChange={(ev) => setCabello(ev.target.value)} aria-label="Cabello">
            <option value="">Cabello</option>
            {cabellos.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      )}
      {!lista.length && <p className="kd-vacio">Nadie con esos filtros. <button type="button" onClick={() => { setCat(''); setMin(''); setCiudad(''); setCabello(''); }}>[ Quitar filtros ]</button></p>}
      <div className="kd-rejilla kd-rejilla-4">
        {lista.map((m, i) => <Carta key={m.id} m={m} e={e} i={i} abrir={(id) => abrir(id, ids)} />)}
      </div>
    </section>
  );
}

// Una modelo en el board: blanco y negro que se rasga a color al pasar el
// cursor; nombre en grande abajo; ♡ para el package.
function Carta({ m, e, i, abrir }) {
  const fav = e.favoritos.includes(m.id);
  const nombreFoto = m.fotos ? (m.principal === 'pose' && m.fotos[1]) || m.fotos[0] : null;
  return (
    <article className="kd-carta kd-revela" style={{ '--k': i % 4 }}>
      <button type="button" className="kd-carta-foto" onClick={() => abrir(m.id)} aria-label={`Ver a ${nombreDe(m)}`}>
        {nombreFoto
          ? <Rasgado nombre={nombreFoto} sizes="(max-width: 760px) 92vw, (max-width: 1200px) 46vw, 32vw" semilla={i + 1} />
          : <FotoModelo m={m} style={{ position: 'absolute', inset: 0 }} />}
        {m.categorias.includes('New faces') && <span className="kd-sello">New face</span>}
        <span className="kd-carta-num">Nº {m.num}</span>
      </button>
      <div className="kd-carta-pie">
        <h3>{m.nombre} {m.apellido}</h3>
        <button type="button" className="kd-corazon" aria-pressed={fav} onClick={() => alternarFavorito(m.id)}
          aria-label={fav ? `Quitar a ${m.nombre} del package` : `Agregar a ${m.nombre} al package`}>
          <Heart size={16} fill={fav ? 'currentColor' : 'none'} />
        </button>
        <p>{estaturaTxt(m.estatura)} · {m.medidas.join(' · ')} · {m.ciudad}</p>
      </div>
    </article>
  );
}

// composite card: la hoja que las agencias mandan a los clientes (se imprime o
// se guarda como PDF desde el navegador)
function Composite({ m, alCerrar }) {
  return (
    <Modal alCerrar={alCerrar} ancho etiqueta="Composite">
      <div className="mo-composite">
        <FotoModelo m={m} />
        <div className="mo-composite-der">
          <FotoModelo m={m} tipo="polaroid" />
          <div style={{ display: 'grid', alignContent: 'end', gap: 6, fontSize: '.86rem' }}>
            <span className="mo-eti">Nº {m.num}</span>
            <div className="mo-serif" style={{ fontSize: '2.2rem', lineHeight: 1 }}>{m.nombre}<br /><em>{m.apellido}</em></div>
            <div>{estaturaTxt(m.estatura)} · {medidasTxt(m)}</div>
            <div>Ojos {m.ojos.toLowerCase()} · Cabello {m.cabello.toLowerCase()}{m.board === 'mujeres' ? ` · Calzado ${m.calzado}` : ''}</div>
          </div>
        </div>
        <div className="mo-composite-pie">
          <div className="mo-logo" style={{ fontSize: '1.3rem' }}>{AGENCIA.nombre}<small>MODEL MANAGEMENT</small></div>
          <span style={{ fontSize: '.78rem' }}>{AGENCIA.correo} · {AGENCIA.ciudad}</span>
        </div>
      </div>
      <div style={{ padding: '0 28px 24px', display: 'flex', gap: 8 }}>
        <button type="button" className="mo-boton" onClick={() => window.print()}><Printer size={16} /> Imprimir o guardar PDF</button>
      </div>
    </Modal>
  );
}

// ── package + solicitud ─────────────────────────────────────────────────────
// Hoja lateral de papel (19-nov). Paso 1: las modelos elegidas en renglones con
// su foto; paso 2: el formulario con campos de línea; al final, el folio.
function Package({ e, pasoInicial = 'mesa', alCerrar, alEnviado, abrir }) {
  const modelos = e.favoritos.map((id) => modeloPorId(e, id)).filter(Boolean);
  const [paso, setPaso] = useState(pasoInicial);
  const previa = e.solicitudes.find((s) => s.mia);
  const [f, setF] = useState(() => ({
    marca: previa?.marca || '', contacto: previa?.contacto || '', correo: previa?.correo || '', telefono: previa?.telefono || '',
    proyecto: '', tipo: 'casting', trabajo: 'Casting',
    fecha: aLocal(Date.now() + 5 * DIA).slice(0, 11) + '10:00', horas: 2, lugar: '', uso: USOS[0], nota: '',
  }));
  const [hecho, setHecho] = useState(null);
  const pon = (k) => (ev) => setF((x) => ({ ...x, [k]: ev.target.value }));
  const fechaTs = new Date(f.fecha).getTime();
  const ocupadas = modelos.filter((m) => choques(e, m.id, fechaTs).some((t) => t.estado === 'confirmado'));
  const falta = [!f.marca.trim() && 'marca', !f.contacto.trim() && 'tu nombre', !f.correo && !f.telefono && 'correo o WhatsApp', !f.proyecto.trim() && 'proyecto', !f.fecha && 'fecha'].filter(Boolean);
  const listo = !falta.length && modelos.length > 0;

  if (hecho) {
    return (
      <Modal variante="kd" alCerrar={alCerrar} etiqueta="Solicitud enviada">
        <div className="kd-v-hecho">
          <Folio n={1}>Solicitud recibida</Folio>
          <p className="kd-v-titulo">Folio<br /><span>{hecho}</span></p>
          <p className="kd-v-texto">Tu booker ya la tiene. Te avisamos cuando las modelos confirmen y aquí mismo te llega la cotización.</p>
          <button type="button" className="kd-boton" onClick={alEnviado}>Ver mis solicitudes →</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal variante="kd" alCerrar={alCerrar} etiqueta="Tu package">
      <Folio n={paso === 'mesa' ? 1 : 2}>{paso === 'mesa' ? 'Tu package' : 'La solicitud'}</Folio>
      <p className="kd-v-titulo">
        {paso === 'mesa'
          ? <>{modelos.length ? String(modelos.length).padStart(2, '0') : 'Sin'}<br /><span>{modelos.length === 1 ? 'modelo' : 'modelos'}</span></>
          : <>Pide tu<br /><span>{f.tipo === 'casting' ? 'casting' : 'booking'}</span></>}
      </p>

      {paso === 'mesa' && (modelos.length ? (
        <>
          <ol className="kd-v-modelos">
            {modelos.map((m, k) => (
              <li key={m.id}>
                <button type="button" className="kd-v-modelo" onClick={() => abrir(m.id)} aria-label={`Ver a ${nombreDe(m)}`}>
                  <span className="kd-v-modelo-foto">{m.fotos?.[0] ? <Imagen nombre={m.fotos[0]} sizes="120px" /> : <FotoModelo m={m} />}</span>
                  <span>
                    <small>{String(k + 1).padStart(2, '0')} · Nº {m.num}</small>
                    <b>{m.nombre} {m.apellido}</b>
                    <small>{estaturaTxt(m.estatura)} · {m.categorias.join(' · ')}</small>
                  </span>
                </button>
                <button type="button" className="kd-v-quitar" onClick={() => alternarFavorito(m.id)} aria-label={`Quitar a ${m.nombre}`}><X size={16} /></button>
              </li>
            ))}
          </ol>
          <div className="kd-v-acciones">
            <button type="button" className="kd-boton" onClick={() => setPaso('form')}>Pedir casting o booking →</button>
            <button type="button" className="kd-enlace" onClick={vaciarPackage}>[ Vaciar ]</button>
          </div>
        </>
      ) : (
        <p className="kd-v-texto">Toca el <Heart size={14} style={{ verticalAlign: -2 }} /> en las modelos que te gusten. Aquí se juntan para pedir casting o booking de todas en una sola solicitud.</p>
      ))}

      {paso === 'form' && (
        <form className="kd-form" onSubmit={(ev) => { ev.preventDefault(); if (!listo) return; setHecho(enviarSolicitud({ ...f, fecha: fechaTs, horas: Number(f.horas), modelos: modelos.map((m) => m.id) })); }}>
          <div className="kd-pestanas" role="group" aria-label="Tipo de solicitud">
            {[['casting', 'Casting'], ['booking', 'Booking directo']].map(([v, t]) => (
              <button key={v} type="button" aria-pressed={f.tipo === v} onClick={() => setF((x) => ({ ...x, tipo: v, trabajo: v === 'casting' ? 'Casting' : 'Sesión', horas: v === 'casting' ? 2 : 6 }))}>{t}</button>
            ))}
          </div>
          <p className="kd-v-nota">{f.tipo === 'casting' ? 'Las conoces en persona antes de decidir. El casting no tiene costo.' : 'Ya sabes a quién quieres: te cotizamos con las que estén disponibles.'}</p>
          <div className="mo-dos">
            <Campo etiqueta="Marca o empresa *"><input value={f.marca} onChange={pon('marca')} required /></Campo>
            <Campo etiqueta="Tu nombre *"><input value={f.contacto} onChange={pon('contacto')} required /></Campo>
            <Campo etiqueta="Correo"><input type="email" value={f.correo} onChange={pon('correo')} /></Campo>
            <Campo etiqueta="WhatsApp"><input type="tel" inputMode="tel" value={f.telefono} onChange={pon('telefono')} /></Campo>
          </div>
          <Campo etiqueta="Proyecto *"><input value={f.proyecto} onChange={pon('proyecto')} placeholder="Ej. Lookbook primavera" required /></Campo>
          <div className="mo-dos">
            {f.tipo === 'booking' && (
              <Campo etiqueta="Tipo de trabajo">
                <select value={f.trabajo} onChange={pon('trabajo')}>{TIPOS_TRABAJO.filter((t) => t !== 'Casting').map((t) => <option key={t}>{t}</option>)}</select>
              </Campo>
            )}
            <Campo etiqueta="Fecha y hora *"><input type="datetime-local" value={f.fecha} onChange={pon('fecha')} required /></Campo>
            <Campo etiqueta="Duración"><select value={f.horas} onChange={pon('horas')}>{[1, 2, 4, 6, 8, 10].map((h) => <option key={h} value={h}>{h} h</option>)}</select></Campo>
            {f.tipo === 'booking' && (
              <Campo etiqueta="Uso de imagen"><select value={f.uso} onChange={pon('uso')}>{USOS.map((u) => <option key={u}>{u}</option>)}</select></Campo>
            )}
          </div>
          <Campo etiqueta="Lugar"><input value={f.lugar} onChange={pon('lugar')} placeholder="Estudio, locación o ciudad" /></Campo>
          <Campo etiqueta="Algo que debamos saber"><textarea value={f.nota} onChange={pon('nota')} placeholder="Look, edad, referencias…" rows={3} /></Campo>
          {ocupadas.length > 0 && (
            <p className="kd-v-aviso">{ocupadas.map((m) => m.nombre).join(', ')} ya {ocupadas.length === 1 ? 'tiene' : 'tienen'} trabajo confirmado ese día. Puedes mandarla igual y tu booker te propone otra fecha.</p>
          )}
          <div className="kd-v-tira">
            {modelos.map((m) => <span key={m.id}>{m.fotos?.[0] ? <Imagen nombre={m.fotos[0]} sizes="90px" /> : <FotoModelo m={m} />}<small>{m.nombre}</small></span>)}
          </div>
          <div className="kd-v-acciones">
            <button type="submit" className="kd-boton" disabled={!listo}><Send size={15} /> Enviar solicitud</button>
            <button type="button" className="kd-enlace" onClick={() => setPaso('mesa')}>[ Atrás ]</button>
          </div>
          {falta.length > 0 && <p className="kd-v-falta">Te falta: {falta.join(', ')}.</p>}
        </form>
      )}
    </Modal>
  );
}

// ── mis solicitudes ─────────────────────────────────────────────────────────
const PASOS = ['Enviada', 'Con las modelos', 'Cotización', 'Confirmada'];
const pasoDe = (s) => ({ nueva: 0, en_opcion: 1, cotizada: 2, confirmada: 3, cancelada: -1 }[s.estado] ?? 0);
const ESTADO_TXT = { nueva: 'Enviada', en_opcion: 'Con las modelos', cotizada: 'Por aceptar', confirmada: 'Confirmada', cancelada: 'Cancelada' };

function Solicitudes({ e, lista, ir }) {
  const revela = useRevela(lista.length);
  return (
    <section ref={revela} className="kd-claro kd-book kd-solicitudes">
      <div className="kd-sec-cab">
        <Folio n={1}>Mis solicitudes</Folio>
        <h1 className="kd-titulo kd-revela">Tus<br /><span>proyectos</span></h1>
        <p className="kd-mono-chico">{lista.length} {lista.length === 1 ? 'solicitud' : 'solicitudes'}</p>
      </div>
      {!lista.length && (
        <div className="kd-vacio-grande">
          <p>Aún no pides nada. Arma tu package en el board y aquí sigues todo: la respuesta de las modelos, la cotización y la confirmación.</p>
          <button type="button" className="kd-boton" onClick={() => ir('mujeres')}>Ir al board →</button>
        </div>
      )}
      <div className="kd-sols">
        {lista.map((s) => {
          const p = pasoDe(s);
          const trabajos = e.trabajos.filter((t) => t.solicitud === s.id);
          return (
            <article key={s.id} className={`kd-sol kd-revela ${s.estado}`}>
              <div className="kd-sol-cab">
                <p className="kd-mono-chico">{s.folio} · {s.tipo === 'casting' ? 'Casting' : s.trabajo}</p>
                <span className={`kd-insignia ${s.estado}`}>{ESTADO_TXT[s.estado] || s.estado}</span>
                <h2>{s.proyecto}</h2>
                <p className="kd-sol-cuando">{fechaLarga(s.fecha)} · {hora(s.fecha)} · {s.horas} h{s.lugar ? ` · ${s.lugar}` : ''}</p>
              </div>
              {p >= 0 && (
                <ol className="kd-pasos" style={{ '--p': p }}>
                  {PASOS.map((t, i) => <li key={t} className={i <= p ? 'hecho' : ''}><i />{t}</li>)}
                </ol>
              )}
              <div className="kd-sol-modelos">
                {s.modelos.map((mid) => {
                  const m = modeloPorId(e, mid);
                  const t = trabajos.find((x) => x.modeloId === mid);
                  const txt = !t ? 'Esperando' : { opcion: 'Preguntando…', aceptado: 'Disponible', rechazado: 'No puede', confirmado: 'Confirmada', liberado: 'Liberada' }[t.estado];
                  return m && (
                    <div key={mid} className={`kd-sol-modelo ${t?.estado || ''}`}>
                      <span className="kd-sol-foto">{m.fotos?.[0] ? <Imagen nombre={m.fotos[0]} sizes="160px" /> : <FotoModelo m={m} />}</span>
                      <b>{m.nombre}</b>
                      <small>{txt}</small>
                    </div>
                  );
                })}
              </div>
              {s.estado === 'cotizada' && s.cotizacion && (
                <div className="kd-cot">
                  <p className="kd-mono-chico">Cotización · {s.uso}</p>
                  <table><tbody>
                    {s.cotizacion.lineas.map((l) => <tr key={l.modeloId}><td>{nombreDe(modeloPorId(e, l.modeloId))} · {s.horas} h</td><td>{dinero(l.tarifa)}</td></tr>)}
                    <tr><td>IVA 16%</td><td>{dinero(s.cotizacion.iva)}</td></tr>
                  </tbody></table>
                  <p className="kd-cot-total"><span>Total</span>{dinero(s.cotizacion.total)}</p>
                  <div className="kd-v-acciones">
                    <button type="button" className="kd-boton" onClick={() => aceptarCotizacion(s.id)}><Check size={15} /> Aceptar y confirmar</button>
                    <button type="button" className="kd-enlace" onClick={() => rechazarCotizacion(s.id)}>[ No, gracias ]</button>
                  </div>
                </div>
              )}
              {s.estado === 'confirmada' && (
                <p className="kd-sol-listo">Listo. Las modelos ya lo tienen en su agenda con dirección y hora{s.cotizacion ? `; te llega la factura por ${dinero(s.cotizacion.total)}` : ''}.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ── eventos ─────────────────────────────────────────────────────────────────
// La foto de cada evento (sale de public/modelos/kade; los que crea la booker
// usan la del estudio).
const FOTO_EVENTO = { pasarela: 'nia-1', casting: 'casting-1', campana: 'campana-hombres' };
const fotoEvento = (ev) => FOTO_EVENTO[ev.id] || 'estudio-luz';

function Cuenta({ hasta }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(id); }, []);
  const s = Math.max(0, Math.floor((hasta - ahora) / 1000));
  const partes = [['días', Math.floor(s / 86400)], ['horas', Math.floor((s % 86400) / 3600)], ['min', Math.floor((s % 3600) / 60)], ['seg', s % 60]];
  return (
    <div className="kd-cuenta" role="timer" aria-label={`Faltan ${partes[0][1]} días`}>
      {partes.map(([t, v]) => <span key={t}><b>{String(v).padStart(2, '0')}</b><small>{t}</small></span>)}
    </div>
  );
}

function Eventos({ e, abrir }) {
  const ahora = useState(() => Date.now())[0];
  const lista = e.eventos.filter((x) => x.publico && x.fecha > ahora - 6 * 3600000).sort((a, b) => a.fecha - b.fecha);
  const revela = useRevela(lista.length);
  const [primero] = lista;
  if (!primero) return <section className="kd-claro kd-book"><p className="kd-vacio">Sin eventos por ahora.</p></section>;
  const modelos = Object.entries(primero.convocadas).filter(([, v]) => v === 'confirmada').map(([id]) => modeloPorId(e, id)).filter(Boolean);
  const [titulo, sub] = primero.titulo.split(' · ');
  return (
    <div ref={revela}>
      <section className="kd-ev-portada">
        <Imagen nombre={fotoEvento(primero)} sizes="100vw" prioridad posicion="50% 30%" />
        <div className="kd-ev-portada-txt">
          <Folio n={1}>Próximo evento · {primero.tipo}</Folio>
          <h1 className="kd-titulo">{titulo}{sub && <><br /><span>{sub}</span></>}</h1>
          <p className="kd-ev-cuando">{fechaLarga(primero.fecha)} · {hora(primero.fecha)} · {primero.lugar}</p>
          <div className="kd-ev-pie">
            <Cuenta hasta={primero.fecha} />
            <button type="button" className="kd-boton kd-boton-claro" onClick={() => abrir(primero.id)}>Registrarme →</button>
          </div>
        </div>
      </section>

      {modelos.length > 0 && (
        <section className="kd-claro kd-talento">
          <div className="kd-sec-cab">
            <Folio n={2}>Line-up</Folio>
            <h2 className="kd-titulo kd-revela">Des<br /><span>filan</span></h2>
            <p className="kd-mono-chico">{modelos.length} modelos confirmadas</p>
          </div>
          <div className={`kd-rejilla ${modelos.length <= 3 ? 'kd-rejilla-3' : 'kd-rejilla-4'}`}>
            {modelos.map((m, i) => <Carta key={m.id} m={m} e={e} i={i} abrir={() => {}} />)}
          </div>
        </section>
      )}

      <section className="kd-oscuro kd-eventos-inicio">
        <div className="kd-sec-cab">
          <Folio n={3}>La agenda</Folio>
          <h2 className="kd-titulo kd-revela">Lo que<br /><span>viene</span></h2>
          <p className="kd-mono-chico">{lista.length} eventos abiertos</p>
        </div>
        <ol className="kd-filas">
          {lista.map((ev, k) => {
            const mio = e.misRegistros.some((r) => r.evento === ev.id);
            return (
              <li key={ev.id} className="kd-revela" style={{ '--k': k }}>
                <button type="button" onClick={() => abrir(ev.id)}>
                  <span className="kd-fila-fecha">{new Date(ev.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).replace('.', '')}</span>
                  <span className="kd-fila-nombre">{ev.titulo}</span>
                  <span className="kd-fila-lugar">{ev.lugar} · {hora(ev.fecha)}</span>
                  <span className="kd-fila-ir">{mio ? '[ Ver mi pase ]' : '[ Registrarme ]'}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

// archivo .ics para el calendario del celular
function icsEvento(ev, pase) {
  const f = (ts) => new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KADE//Demo//ES', 'BEGIN:VEVENT', `UID:${pase.id}@kade.mx`, `DTSTAMP:${f(Date.now())}`,
    `DTSTART:${f(ev.fecha)}`, `DTEND:${f(ev.fecha + 3 * 3600000)}`, `SUMMARY:${ev.titulo}`, `LOCATION:${ev.lugar}`, `DESCRIPTION:Pase ${pase.codigo}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'KADE-evento.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function RegistroEvento({ e, ev, alCerrar }) {
  const yaMio = e.misRegistros.find((r) => r.evento === ev.id);
  const miPase = yaMio && ev.invitados.find((p) => p.id === yaMio.pase);
  const [f, setF] = useState({ nombre: '', empresa: '', correo: '' });
  const quedan = ev.cupo ? Math.max(0, ev.cupo - ev.invitados.length) : null;
  const modelos = Object.entries(ev.convocadas).filter(([, v]) => v === 'confirmada').map(([id]) => modeloPorId(e, id)).filter(Boolean);
  const d = new Date(ev.fecha);
  return (
    <Modal variante="kd" alCerrar={alCerrar} etiqueta={ev.titulo}>
      <div className="kd-v-portada"><Imagen nombre={fotoEvento(ev)} sizes="640px" posicion="50% 30%" /></div>
      <Folio n={1}>{ev.tipo} · {fechaLarga(ev.fecha)} · {hora(ev.fecha)}</Folio>
      <p className="kd-v-titulo kd-v-titulo-chico">{ev.titulo}</p>
      <p className="kd-v-texto">{ev.descripcion}</p>
      <p className="kd-v-lugar"><MapPin size={14} /> {ev.lugar}</p>
      {modelos.length > 0 && !miPase && (
        <div className="kd-v-tira">
          {modelos.map((m) => <span key={m.id}>{m.fotos?.[0] ? <Imagen nombre={m.fotos[0]} sizes="90px" /> : <FotoModelo m={m} />}<small>{m.nombre}</small></span>)}
        </div>
      )}
      {miPase ? (
        <>
          <div className="kd-pase">
            <div className="kd-pase-fecha">
              <small>{d.toLocaleDateString('es-MX', { weekday: 'long' })}</small>
              <b>{d.getDate()}</b>
              <small>{d.toLocaleDateString('es-MX', { month: 'long' })} · {hora(ev.fecha)}</small>
            </div>
            <div className="kd-pase-cuerpo">
              <small>{AGENCIA.nombre} · {ev.tipo} · Admite 1</small>
              <b>{miPase.nombre}</b>
              <small>{miPase.empresa || 'Invitada'}</small>
              <code>{miPase.codigo}</code>
            </div>
            <div className="kd-pase-qr"><QRCodeSVG value={miPase.codigo} size={116} bgColor="#F1EEE8" fgColor="#121211" /></div>
          </div>
          <div className="kd-v-acciones">
            <button type="button" className="kd-boton" onClick={() => icsEvento(ev, miPase)}><Check size={15} /> Agregar a mi calendario</button>
            <a className="kd-enlace" href={`https://maps.google.com/?q=${encodeURIComponent(ev.lugar)}`} target="_blank" rel="noreferrer">[ Cómo llegar ]</a>
          </div>
          <p className="kd-v-nota">Enséñalo en la puerta: lo escanean con el lector.</p>
        </>
      ) : (
        <form className="kd-form" onSubmit={(x) => { x.preventDefault(); if (f.nombre) registrarseEvento(ev.id, f); }}>
          <Campo etiqueta="Tu nombre *"><input value={f.nombre} onChange={(x) => setF({ ...f, nombre: x.target.value })} required /></Campo>
          <div className="mo-dos">
            <Campo etiqueta="Empresa o medio"><input value={f.empresa} onChange={(x) => setF({ ...f, empresa: x.target.value })} /></Campo>
            <Campo etiqueta="Correo"><input type="email" value={f.correo} onChange={(x) => setF({ ...f, correo: x.target.value })} /></Campo>
          </div>
          {quedan !== null && <p className="kd-v-nota">{ev.invitados.length} registrados · {quedan ? `quedan ${quedan} lugares` : 'cupo lleno'}</p>}
          <div className="kd-v-acciones">
            <button type="submit" className="kd-boton" disabled={!f.nombre || quedan === 0}>Registrarme →</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
