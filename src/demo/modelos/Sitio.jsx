import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowRight, Check, Download, Heart, MapPin, Menu, Printer, Send, Sparkles, X } from 'lucide-react';
import {
  AGENCIA, CATEGORIAS, PORTADAS, TIPOS_TRABAJO, USOS, DIA,
  useAgencia, todasLasModelos, modeloPorId, nombreDe, fotoDe, choques, alternarFavorito, vaciarPackage,
  enviarSolicitud, aceptarCotizacion, rechazarCotizacion, registrarseEvento,
  dinero, fechaLarga, hora, medidasTxt, estaturaTxt,
} from './datos';
import { Campo, FotoModelo, Foto, Modal, Polaroid, Sello, aLocal, useAltoCabeza } from './comun';
import Portada from './Portada';
import Carrusel from './Carrusel';
import Giro from './Giro';

// ─────────────────────────────────────────────────────────────────────────────
// SITIO DE LA AGENCIA — lo que ve una marca, un fotógrafo o una productora.
// Book con filtros → ficha con medidas, polaroids y disponibilidad → package
// (la mesa de polaroids) → solicitud de casting o booking → cotización.
// ─────────────────────────────────────────────────────────────────────────────

const VISTAS = [
  ['inicio', 'Inicio'], ['mujeres', 'Mujeres'], ['hombres', 'Hombres'], ['new', 'New faces'],
  ['eventos', 'Eventos'], ['solicitudes', 'Mis solicitudes'],
];
// lo que dice el telón al cambiar de sección
const TITULOS = { ...Object.fromEntries(VISTAS), inicio: AGENCIA.nombre };

export default function Sitio({ alPostularse }) {
  const e = useAgencia();
  const cabeza = useAltoCabeza();
  // en celular, al bajar la fila de secciones se recoge en un menú
  const [compacto, setCompacto] = useState(false);
  const [menu, setMenu] = useState(false);
  const [sobreClaro, setSobreClaro] = useState(false);
  useEffect(() => {
    // con margen (se recoge pasando 120 px, regresa abajo de 40) para que no
    // parpadee justo en el límite
    const alBajar = () => {
      setCompacto((c) => (c ? window.scrollY > 40 : window.scrollY > 120));
      // ¿qué hay justo debajo del encabezado? sobre el estudio claro del Giro
      // el encabezado se vuelve claro (una barra negra ahí se ve pesada)
      const r = cabeza.current?.getBoundingClientRect();
      const debajo = r && document.elementFromPoint(window.innerWidth / 2, r.bottom + 6);
      setSobreClaro(!!debajo?.closest?.('.mo-giro'));
    };
    alBajar();
    window.addEventListener('scroll', alBajar, { passive: true });
    return () => window.removeEventListener('scroll', alBajar);
  }, []);
  // con el menú abierto: la página de atrás no se mueve y Esc lo cierra
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
  const [modelo, setModelo] = useState(null);       // la portada abierta
  const [lista, setLista] = useState([]);           // con quién se pasa ← →
  const [package_, setPackage] = useState(null);    // null | 'mesa' | 'form'
  const [composite, setComposite] = useState(null);
  const [evento, setEvento] = useState(null);

  // telón entre secciones: baja negro con el nombre de lo que viene, se
  // cambia la página por debajo y sube. Así la revista no "salta".
  const [telon, setTelon] = useState(null);           // { texto, fase: 'cubre' | 'abre' }
  const conTelon = (texto, accion) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { accion(); window.scrollTo({ top: 0 }); return; }
    setTelon({ texto, fase: 'cubre' });
    setTimeout(() => { accion(); window.scrollTo({ top: 0 }); setTelon({ texto, fase: 'abre' }); }, 560);
    setTimeout(() => setTelon(null), 1250);
  };
  const ir = (v) => conTelon(TITULOS[v], () => { setModelo(null); setVista(v); });
  // desde el carrusel la foto ya creció a pantalla completa: sin telón encima
  const abrir = (id, ids, { sinTelon } = {}) => {
    const hacer = () => { setLista(ids?.length ? ids : todasLasModelos(e).map((m) => m.id)); setModelo(id); };
    if (sinTelon) hacer(); else conTelon(modeloPorId(e, id)?.nombre || AGENCIA.nombre, hacer);
  };
  const pedir = (id) => { if (!e.favoritos.includes(id)) alternarFavorito(id); setPackage('form'); };
  const misSolicitudes = e.solicitudes.filter((s) => s.mia);
  const porContestar = misSolicitudes.filter((s) => s.estado === 'cotizada').length;

  return (
    <div className="mo-sitio">
      {/* sin barra: los elementos flotan; sobre el video (inicio y eventos) el
          video sube hasta arriba; al bajar, un degradado suave para que se lean */}
      <div ref={cabeza} className={`mo-noche-cab ${!modelo && ['inicio', 'eventos'].includes(vista) ? 'sobre' : ''} ${compacto || menu ? 'solido' : ''} ${sobreClaro && !menu ? 'mo-claro sobre-claro' : ''}`}>
        <header className={`mo-cabeza ${compacto ? 'compacto' : ''}`}>
          <button type="button" className="mo-logo" onClick={() => ir('inicio')} aria-label="Inicio">
            {AGENCIA.nombre}<small>MODEL MANAGEMENT</small>
          </button>
          <nav className="mo-nav" aria-label="Secciones">
            {VISTAS.slice(1).map(([id, t]) => (
              <button key={id} type="button" aria-current={!modelo && vista === id ? 'page' : undefined} onClick={() => ir(id)}>
                {t}{id === 'solicitudes' && porContestar > 0 && <span className="mo-lapiz" style={{ marginLeft: 4 }}>({porContestar})</span>}
              </button>
            ))}
            <button type="button" onClick={alPostularse}>Quiero ser modelo</button>
          </nav>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" className="mo-package-boton" onClick={() => setPackage('mesa')}>
              Package <b>{e.favoritos.length}</b>
            </button>
            <button type="button" className="mo-hamburguesa" onClick={() => setMenu(true)} aria-label="Abrir menú" aria-expanded={menu}>
              <Menu size={20} />{porContestar > 0 && <i />}
            </button>
          </div>
          <div className="mo-nav-movil" aria-hidden={compacto || undefined}>
            {VISTAS.map(([id, t]) => (
              <button key={id} type="button" className="mo-chip" aria-pressed={!modelo && vista === id} onClick={() => ir(id)}>
                {t}{id === 'solicitudes' && porContestar > 0 ? ` (${porContestar})` : ''}
              </button>
            ))}
            <button type="button" className="mo-chip" onClick={alPostularse}>Quiero ser modelo</button>
          </div>
        </header>
      </div>

      {modelo ? (
        <Portada key={modelo} id={modelo} lista={lista} alCambiar={setModelo} alCerrar={() => conTelon(TITULOS[vista], () => setModelo(null))}
          alComposite={setComposite} alPedir={pedir} />
      ) : (
        <>
          {vista === 'inicio' && <Inicio e={e} ir={ir} abrir={abrir} abrirEvento={setEvento} />}
          {['mujeres', 'hombres', 'new'].includes(vista) && <Book key={vista} e={e} board={vista} abrir={abrir} />}
          {vista === 'eventos' && <Eventos e={e} abrir={setEvento} />}
          {vista === 'solicitudes' && <Solicitudes e={e} lista={misSolicitudes} ir={ir} />}
        </>
      )}

      <footer className="mo-pie">
        <div>
          <div className="mo-logo" style={{ fontSize: '1.1rem' }}>{AGENCIA.nombre}</div>
          <p style={{ marginTop: 8 }}>{AGENCIA.ciudad} · {AGENCIA.correo}</p>
        </div>
        <button type="button" className="mo-boton mo-boton-claro mo-boton-chico" onClick={alPostularse}>
          ¿Quieres ser modelo? Postúlate <ArrowRight size={15} />
        </button>
      </footer>

      {menu && (
        <div className="mo-menu" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="mo-menu-cab">
            <span className="mo-logo">{AGENCIA.nombre}<small>MODEL MANAGEMENT</small></span>
            <button type="button" className="mo-hamburguesa" style={{ display: 'grid' }} onClick={() => setMenu(false)} aria-label="Cerrar menú"><X size={20} /></button>
          </div>
          <nav>
            {VISTAS.map(([id, t], k) => (
              <button key={id} type="button" style={{ animationDelay: `${k * 45}ms` }} aria-current={!modelo && vista === id ? 'page' : undefined}
                onClick={() => { setMenu(false); ir(id); }}>
                <span className="mo-mono">{String(k + 1).padStart(2, '0')}</span>{t}
                {id === 'solicitudes' && porContestar > 0 && <span className="mo-lapiz" style={{ fontSize: '1.4rem' }}>({porContestar})</span>}
              </button>
            ))}
            <button type="button" style={{ animationDelay: `${VISTAS.length * 45}ms` }} onClick={() => { setMenu(false); alPostularse(); }}>
              <span className="mo-mono">{String(VISTAS.length + 1).padStart(2, '0')}</span><em>Quiero ser modelo</em>
            </button>
          </nav>
          <p className="mo-eti" style={{ marginTop: 'auto' }}>{AGENCIA.ciudad} · {AGENCIA.correo}</p>
        </div>
      )}
      {telon && <div className={`mo-telon ${telon.fase}`} aria-hidden="true"><span className="mo-gigante">{telon.texto}</span></div>}
      {composite && <Composite m={modeloPorId(e, composite)} alCerrar={() => setComposite(null)} />}
      {package_ && <Package e={e} pasoInicial={package_} alCerrar={() => setPackage(null)} alEnviado={() => { setPackage(null); ir('solicitudes'); }} abrir={(id) => { setPackage(null); abrir(id, e.favoritos); }} />}
      {evento && <RegistroEvento e={e} ev={e.eventos.find((x) => x.id === evento)} alCerrar={() => setEvento(null)} />}
    </div>
  );
}

// ── inicio ──────────────────────────────────────────────────────────────────
const VIDEOS = ['hero-1', 'hero-2', 'hero-3'].map((n) => `/modelos/mira/video/${n}.mp4`);
const DIAPOSITIVAS = ['renata', 'diego', 'ana', 'valeria', 'emilio'];

// Video a pantalla completa con KADE encima. Corre los videos que existan (los
// hace Gemini); si ninguno carga, pasa las fotos con movimiento lento.
function Portadilla({ alBajar }) {
  // primero se pregunta cuáles videos existen (un 404 aquí regresa el index
  // de la SPA, por eso se revisa el tipo): así no hay parpadeo buscando los
  // que faltan. Mientras, y si no hay ninguno, van las fotos con Ken Burns.
  const [videos, setVideos] = useState([]);
  const [i, setI] = useState(0);
  const [listo, setListo] = useState(false);
  const [dia, setDia] = useState(0);
  useEffect(() => {
    let vivo = true;
    Promise.all(VIDEOS.map((v) => fetch(v, { method: 'HEAD' })
      .then((r) => (r.ok && (r.headers.get('content-type') || '').startsWith('video') ? v : null)).catch(() => null)))
      .then((l) => { if (vivo) setVideos(l.filter(Boolean)); });
    return () => { vivo = false; };
  }, []);
  const video = videos.length ? videos[i % videos.length] : null;
  useEffect(() => {
    if (video && listo) return undefined;
    const id = setInterval(() => setDia((d) => (d + 1) % DIAPOSITIVAS.length), 6000);
    return () => clearInterval(id);
  }, [video, listo]);
  return (
    <section className="mo-video" aria-label="Portada">
      {DIAPOSITIVAS.map((id, k) => (
        <div key={id} className={`mo-kb ${k === dia && !(video && listo) ? 'activa' : ''}`}><img src={`/modelos/mira/${id}-book.webp`} alt="" /></div>
      ))}
      {video && (
        <video key={video} src={video} poster={video.replace('.mp4', '.jpg')} autoPlay muted playsInline loop={videos.length === 1}
          className={`mo-video-clip ${listo ? 'listo' : ''}`} onPlaying={() => setListo(true)}
          onEnded={() => setI((x) => x + 1)} onError={() => setVideos((l) => l.filter((x) => x !== video))} />
      )}
      <div className="mo-video-logo"><span>{AGENCIA.nombre}</span></div>
      <div className="mo-video-pie">
        <span />
        <button type="button" onClick={alBajar}>Ver el board ↓</button>
        <span />
      </div>
    </section>
  );
}

function Inicio({ e, ir, abrir, abrirEvento }) {
  const modelos = todasLasModelos(e);
  const tiras = useRef(null);
  const destacada = modeloPorId(e, 'valeria');
  const proximos = e.eventos.filter((x) => x.publico && x.fecha > Date.now()).sort((a, b) => a.fecha - b.fecha);
  const [palabra, linea] = PORTADAS.valeria;
  return (
    <>
      <Portadilla alBajar={() => tiras.current?.scrollIntoView({ behavior: 'smooth' })} />

      <section ref={tiras} className="mo-tiras-sec">
        {/* el board del inicio es el mismo Giro del book: todas en fila, al tocar una crece y gira */}
        <Giro e={e} modelos={modelos} abrir={abrir} />
      </section>

      <Indice modelos={modelos} eventos={proximos.length} ir={ir} />

      {/* la portada de la semana: un adelanto del collage */}
      <section className="mo-seccion">
        <button type="button" onClick={() => abrir('valeria')} className="mo-destacada">
          <div style={{ position: 'relative' }}>
            <FotoModelo m={destacada} tipo="cerca" style={{ aspectRatio: '16 / 10' }} />
            <span className="mo-gigante" style={{ position: 'absolute', left: 18, bottom: 6, color: '#fff', fontSize: 'clamp(3rem, 9vw, 8rem)', textTransform: 'uppercase' }}>{palabra}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FotoModelo m={destacada} tipo="bn" style={{ aspectRatio: '3 / 4.6' }} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 6 }}>
              <p className="mo-eti">En portada · Nº {destacada.num}</p>
              <div>
                <p className="mo-gigante" style={{ fontSize: 'clamp(2.2rem, 4.5vw, 4rem)' }}>{destacada.nombre}<br /><em>{destacada.apellido}</em></p>
                <p className="mo-tenue" style={{ marginTop: 12, fontFamily: 'var(--mo-serif)', fontStyle: 'italic', fontSize: '1.1rem' }}>{linea}</p>
                <span className="mo-boton mo-boton-chico" style={{ marginTop: 18 }}>Ver su portada <ArrowRight size={14} /></span>
              </div>
            </div>
          </div>
        </button>
      </section>

      {/* doble página: una foto a sangre y una frase, como abre una sección de revista */}
      <section className="mo-doble">
        <FotoModelo m={modeloPorId(e, 'renata')} tipo="bn" className="mo-doble-foto" />
        <div className="mo-doble-texto">
          <p className="mo-eti">Temporada 26/27 · Nº 008</p>
          <p className="mo-gigante">Caras que<br /><em>se quedan.</em></p>
          <p className="mo-doble-pie">Renata Salas, fotografiada para el desfile de invierno de Atelier Ruiz. Pasarela en París, Madrid y CDMX.</p>
        </div>
      </section>

      {proximos.length > 0 && <Carteles eventos={proximos} abrir={abrirEvento} />}
    </>
  );
}

// "En este número": el índice de la revista. Al pasar el cursor por una línea,
// la foto de esa sección flota junto al cursor.
function Indice({ modelos, eventos, ir }) {
  const flota = useRef(null);
  const [foto, setFoto] = useState(null);
  const lineas = [
    ['mujeres', 'Mujeres', modelos.filter((m) => m.board === 'mujeres').length, '/modelos/mira/camila-book.webp'],
    ['hombres', 'Hombres', modelos.filter((m) => m.board === 'hombres').length, '/modelos/mira/diego-book.webp'],
    ['new', 'New faces', modelos.filter((m) => m.categorias.includes('New faces')).length, '/modelos/mira/sofia-book.webp'],
    ['eventos', 'Eventos', eventos, '/modelos/mira/evento-pasarela.webp'],
  ];
  const mover = (ev) => { if (flota.current) flota.current.style.transform = `translate3d(${ev.clientX + 24}px, ${ev.clientY - 120}px, 0)`; };
  return (
    <section className="mo-indice" onMouseMove={mover} onMouseLeave={() => setFoto(null)}>
      <p className="mo-eti">En este número</p>
      <ol>
        {lineas.map(([id, t, n, src], k) => (
          <li key={id}>
            <button type="button" onClick={() => ir(id)} onMouseEnter={() => setFoto(src)} onFocus={() => setFoto(null)}>
              <span className="mo-mono">{String(k + 1).padStart(2, '0')}</span>
              <span className="mo-indice-t">{t}</span>
              <sup>({String(n).padStart(2, '0')})</sup>
              <ArrowRight size={22} />
            </button>
          </li>
        ))}
      </ol>
      <div ref={flota} className={`mo-indice-foto ${foto ? 'on' : ''}`} aria-hidden="true">{foto && <img key={foto} src={foto} alt="" />}</div>
    </section>
  );
}

// ── book con filtros ────────────────────────────────────────────────────────
function Book({ e, board, abrir }) {
  const [cat, setCat] = useState('');
  const [min, setMin] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [cabello, setCabello] = useState('');
  const [modo, setModo] = useState('giro');          // primero el giro, luego tiras y cuadrícula
  const todas = todasLasModelos(e);
  const base = board === 'new' ? todas.filter((m) => m.categorias.includes('New faces')) : todas.filter((m) => m.board === board);
  const lista = base.filter((m) => (!cat || m.categorias.includes(cat)) && (!min || m.estatura >= Number(min))
    && (!ciudad || m.ciudad === ciudad) && (!cabello || m.cabello === cabello));
  const cabellos = [...new Set(base.map((m) => m.cabello))];
  const titulo = { mujeres: <>Mujeres</>, hombres: <>Hombres</>, new: <>New <em>faces</em></> }[board];
  const ids = lista.map((m) => m.id);
  const rejilla = useRef(null);

  // cada foto se descubre al entrar a la pantalla
  useEffect(() => {
    const el = rejilla.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((xs) => xs.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('visto'); io.unobserve(x.target); } }), { threshold: 0.15 });
    el.querySelectorAll('.mo-carta').forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [ids.join(), modo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="mo-seccion mo-book" style={{ paddingTop: 30 }}>
      <div className="mo-book-cab">
        <h2 className="mo-gigante">{titulo}<sup className="mo-mono">({String(lista.length).padStart(2, '0')})</sup></h2>
        <div className="mo-book-modo" role="group" aria-label="Cómo ver el board">
          <button type="button" aria-pressed={modo === 'giro'} onClick={() => setModo('giro')}>Giro</button>
          <span>/</span>
          <button type="button" aria-pressed={modo === 'tiras'} onClick={() => setModo('tiras')}>Tiras</button>
          <span>/</span>
          <button type="button" aria-pressed={modo === 'cuadricula'} onClick={() => setModo('cuadricula')}>Cuadrícula</button>
        </div>
      </div>
      <div className="mo-filtros mo-filtros-texto">
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
      {!lista.length && <p className="mo-tenue" style={{ padding: '40px 0' }}>Nadie con esos filtros. <span className="mo-lapiz">quita uno</span></p>}
      {lista.length > 0 && modo === 'tiras' && <Carrusel key={ids.join()} modelos={lista} abrir={abrir} />}
      {lista.length > 0 && modo === 'giro' && <Giro key={ids.join()} e={e} modelos={lista} abrir={abrir} />}
      {lista.length > 0 && modo === 'cuadricula' && (
        <div ref={rejilla} className="mo-board mo-board-revista">{lista.map((m, i) => <Carta key={m.id} m={m} e={e} i={i} abrir={(id) => abrir(id, ids)} />)}</div>
      )}
      <CursorVer />
    </section>
  );
}

// Sobre las fotos, el cursor se vuelve un círculo con "Ver" (solo con mouse).
function CursorVer() {
  const ref = useRef(null);
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return undefined;
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0, dentro = false;
    const mover = (ev) => {
      x = ev.clientX; y = ev.clientY;
      const sobre = !!ev.target.closest?.('.mo-carta-foto');
      if (sobre !== dentro) { dentro = sobre; ref.current?.classList.toggle('on', sobre); }
    };
    const vuelta = () => {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      if (ref.current) ref.current.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(vuelta);
    };
    window.addEventListener('mousemove', mover, { passive: true });
    raf = requestAnimationFrame(vuelta);
    return () => { window.removeEventListener('mousemove', mover); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} className="mo-cursor" aria-hidden="true">Ver</div>;
}

function Carta({ m, e, i, abrir }) {
  const fav = e.favoritos.includes(m.id);
  const alterna = m.principal === 'pose' ? 'bn' : 'pose';
  return (
    <div className="mo-carta" style={{ '--i': i % 4 }}>
      <button type="button" onClick={() => abrir(m.id)} style={{ width: '100%', textAlign: 'left' }} aria-label={`Ver a ${nombreDe(m)}`}>
        <div className="mo-carta-foto mo-foto">
          <FotoModelo m={m} tipo={m.principal} className="mo-carta-base" style={{ position: 'absolute', inset: 0 }} />
          {!m.foto && <img className="mo-carta-alt" src={fotoDe(m, alterna)} alt="" loading="lazy" onError={(ev) => { ev.currentTarget.style.display = 'none'; }} />}
          <span className="mo-carta-num">Nº {m.num}</span>
          <span className="mo-carta-medidas">{estaturaTxt(m.estatura)} · {m.medidas.join('·')} · {m.ciudad}</span>
        </div>
      </button>
      <div style={{ position: 'relative' }}>
        <button type="button" className="mo-corazon" aria-pressed={fav} onClick={() => alternarFavorito(m.id)}
          aria-label={fav ? `Quitar a ${m.nombre} del package` : `Agregar a ${m.nombre} al package`}
          style={{ position: 'absolute', top: -52 }}>
          <Heart size={17} fill={fav ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="mo-carta-pie">
        <span className="mo-mono">{String(i + 1).padStart(2, '0')}</span>
        <div>
          <h3>{m.nombre} <em>{m.apellido}</em></h3>
          <p>{m.categorias.join(' · ')}</p>
        </div>
      </div>
    </div>
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
function Package({ e, pasoInicial = 'mesa', alCerrar, alEnviado, abrir }) {
  const modelos = e.favoritos.map((id) => modeloPorId(e, id)).filter(Boolean);
  const [paso, setPaso] = useState(pasoInicial);
  // el cliente ya pidió antes: sus datos de contacto vienen llenos
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
  const listo = !falta.length;

  if (hecho) {
    return (
      <Modal alCerrar={alCerrar} etiqueta="Solicitud enviada">
        <div style={{ textAlign: 'center', display: 'grid', gap: 14, justifyItems: 'center', padding: '10px 0' }}>
          <span className="mo-sello mo-sello-verde" style={{ fontSize: '.8rem' }}><Check size={14} /> Recibida</span>
          <h2 className="mo-serif" style={{ fontSize: '2.2rem', lineHeight: 1 }}>Folio <em>{hecho}</em></h2>
          <p className="mo-tenue" style={{ maxWidth: 360, lineHeight: 1.55 }}>Tu booker ya la tiene. Te avisamos cuando las modelos confirmen y te mandamos la cotización aquí mismo.</p>
          <button type="button" className="mo-boton" onClick={alEnviado}>Ver mis solicitudes <ArrowRight size={16} /></button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal alCerrar={alCerrar} etiqueta="Tu package">
      <p className="mo-eti">Tu package</p>
      <h2 className="mo-serif" style={{ fontSize: '2rem', margin: '8px 0 16px', lineHeight: 1 }}>
        {paso === 'mesa' ? <>{modelos.length || 'Sin'} <em>{modelos.length === 1 ? 'modelo' : 'modelos'}</em></> : <>Pide tu <em>{f.tipo}</em></>}
      </h2>

      {paso === 'mesa' && (
        modelos.length ? (
          <>
            <div className="mo-mesa">
              {modelos.map((m, i) => (
                <button key={m.id} type="button" onClick={() => abrir(m.id)} style={{ display: 'block' }} aria-label={`Ver a ${m.nombre}`}>
                  <Polaroid m={m} pie={`${i + 1}. ${m.nombre}`} />
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
              <button type="button" className="mo-boton" onClick={() => setPaso('form')}>Pedir casting o booking <ArrowRight size={16} /></button>
              <button type="button" className="mo-boton mo-boton-claro" onClick={vaciarPackage}>Vaciar</button>
            </div>
          </>
        ) : (
          <p className="mo-tenue" style={{ lineHeight: 1.6 }}>Toca el <Heart size={14} style={{ verticalAlign: -2 }} /> en las modelos que te gusten y aquí se juntan para pedir casting o booking de todas en una sola solicitud.</p>
        )
      )}

      {paso === 'form' && (
        <form onSubmit={(ev) => { ev.preventDefault(); if (!listo) return; setHecho(enviarSolicitud({ ...f, fecha: fechaTs, horas: Number(f.horas), modelos: modelos.map((m) => m.id) })); }} style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['casting', 'Casting'], ['booking', 'Booking directo']].map(([v, t]) => (
              <button key={v} type="button" className="mo-chip" aria-pressed={f.tipo === v} onClick={() => setF((x) => ({ ...x, tipo: v, trabajo: v === 'casting' ? 'Casting' : 'Sesión', horas: v === 'casting' ? 2 : 6 }))}>{t}</button>
            ))}
          </div>
          <p className="mo-tenue" style={{ fontSize: '.8rem', lineHeight: 1.5 }}>
            {f.tipo === 'casting' ? 'Las conoces en persona antes de decidir. El casting no tiene costo.' : 'Ya sabes a quién quieres: te cotizamos con las que estén disponibles.'}
          </p>
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
          <Campo etiqueta="Algo que debamos saber"><textarea value={f.nota} onChange={pon('nota')} placeholder="Look, edad, referencias…" /></Campo>
          {ocupadas.length > 0 && (
            <div className="mo-aviso">
              <span>●</span>
              <span>{ocupadas.map((m) => m.nombre).join(', ')} ya {ocupadas.length === 1 ? 'tiene' : 'tienen'} trabajo confirmado ese día. Puedes mandarla igual y tu booker te propone otra fecha.</span>
            </div>
          )}
          <div className="mo-mesa" style={{ gap: 8 }}>
            {modelos.map((m) => <FotoModelo key={m.id} m={m} className="mo-mini" />)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="mo-boton" disabled={!listo}><Send size={16} /> Enviar solicitud</button>
            <button type="button" className="mo-boton mo-boton-claro" onClick={() => setPaso('mesa')}>Atrás</button>
          </div>
          {falta.length > 0 && <p className="mo-falta">Te falta: {falta.join(', ')}.</p>}
        </form>
      )}
    </Modal>
  );
}

// ── mis solicitudes ─────────────────────────────────────────────────────────
const PASOS = ['Enviada', 'Con las modelos', 'Cotización', 'Confirmada'];
const pasoDe = (s) => ({ nueva: 0, en_opcion: 1, cotizada: 2, confirmada: 3, cancelada: -1 }[s.estado] ?? 0);

function Solicitudes({ e, lista, ir }) {
  return (
    <section className="mo-hoja mo-claro">
      <div className="mo-seccion-cab"><h2>Mis <em>solicitudes</em></h2></div>
      {!lista.length && (
        <div style={{ padding: '30px 0', display: 'grid', gap: 16, justifyItems: 'start' }}>
          <p className="mo-tenue">Aún no pides nada. Arma tu package en el book y aquí sigues todo: respuesta de las modelos, cotización y confirmación.</p>
          <button type="button" className="mo-boton" onClick={() => ir('mujeres')}>Ir al book <ArrowRight size={16} /></button>
        </div>
      )}
      <div style={{ display: 'grid', gap: 16 }}>
        {lista.map((s) => {
          const p = pasoDe(s);
          const trabajos = e.trabajos.filter((t) => t.solicitud === s.id);
          return (
            <article key={s.id} className="mo-tarjeta" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'start' }}>
                <div>
                  <p className="mo-eti">{s.folio} · {s.tipo === 'casting' ? 'Casting' : s.trabajo}</p>
                  <h3 className="mo-serif" style={{ fontSize: '1.7rem', marginTop: 6 }}>{s.proyecto}</h3>
                  <p className="mo-tenue" style={{ fontSize: '.86rem', marginTop: 4 }}>{fechaLarga(s.fecha)} · {hora(s.fecha)} · {s.horas} h{s.lugar ? ` · ${s.lugar}` : ''}</p>
                </div>
                <Sello estado={s.estado} />
              </div>
              {p >= 0 && <div className="mo-pasos">{PASOS.map((t, i) => <div key={t} className={i <= p ? 'hecho' : ''}>{t}</div>)}</div>}
              <div className="mo-mesa" style={{ marginTop: 14 }}>
                {s.modelos.map((mid) => {
                  const m = modeloPorId(e, mid);
                  const t = trabajos.find((x) => x.modeloId === mid);
                  const txt = !t ? 'esperando' : { opcion: 'preguntando…', aceptado: 'disponible', rechazado: 'no puede', confirmado: 'confirmada', liberado: 'liberada' }[t.estado];
                  return m && <Polaroid key={mid} m={m} pie={m.nombre} extra={<span style={{ fontSize: '.62rem', color: 'var(--mo-tenue)' }}>{txt}</span>} />;
                })}
              </div>
              {s.estado === 'cotizada' && s.cotizacion && (
                <div style={{ marginTop: 20, padding: 18, borderRadius: 14, background: 'var(--mo-papel)' }}>
                  <p className="mo-eti" style={{ marginBottom: 8 }}>Cotización · {s.uso}</p>
                  <table className="mo-cot"><tbody>
                    {s.cotizacion.lineas.map((l) => <tr key={l.modeloId}><td>{nombreDe(modeloPorId(e, l.modeloId))} · {s.horas} h</td><td>{dinero(l.tarifa)}</td></tr>)}
                    <tr><td>IVA 16%</td><td>{dinero(s.cotizacion.iva)}</td></tr>
                    <tr className="total"><td>Total</td><td>{dinero(s.cotizacion.total)}</td></tr>
                  </tbody></table>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button type="button" className="mo-boton" onClick={() => aceptarCotizacion(s.id)}><Check size={16} /> Aceptar y confirmar</button>
                    <button type="button" className="mo-boton mo-boton-claro" onClick={() => rechazarCotizacion(s.id)}>No, gracias</button>
                  </div>
                </div>
              )}
              {s.estado === 'confirmada' && (
                <div className="mo-aviso mo-ok" style={{ marginTop: 16 }}><Sparkles size={16} /> <span>Listo. Las modelos ya lo tienen en su agenda con dirección y hora{s.cotizacion ? `; te llega la factura por ${dinero(s.cotizacion.total)}` : ''}.</span></div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ── eventos ─────────────────────────────────────────────────────────────────
// Video del evento si existe (lo hace Gemini: video/<id>.mp4, por ahora solo
// "casting"); si no, su foto. Un 404 regresa el HTML de la SPA y el <video>
// falla solo: ahí se queda la foto.
function FondoEvento({ ev }) {
  const [sinVideo, setSinVideo] = useState(false);
  return sinVideo
    ? <img src={ev.foto} alt="" />
    : <video src={`/modelos/mira/video/${ev.id}.mp4`} poster={ev.foto} autoPlay muted loop playsInline onError={() => setSinVideo(true)} />;
}

function Cuenta({ hasta }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(id); }, []);
  const s = Math.max(0, Math.floor((hasta - ahora) / 1000));
  const partes = [['días', Math.floor(s / 86400)], ['horas', Math.floor((s % 86400) / 3600)], ['min', Math.floor((s % 3600) / 60)], ['seg', s % 60]];
  return (
    <div className="mo-cuenta" role="timer" aria-label={`Faltan ${partes[0][1]} días`}>
      {partes.map(([t, v]) => <div key={t}><b>{String(v).padStart(2, '0')}</b><span>{t}</span></div>)}
    </div>
  );
}

// Próximos eventos del inicio: carteles a sangre, uno junto al otro, en blanco y
// negro; el que tiene el cursor se ensancha y toma color. Encima, solo la fecha
// en contorno, el título y una línea con lugar y hora.
function Carteles({ eventos, abrir }) {
  return (
    <section className="mo-carteles" aria-label="Próximos eventos">
      <p className="mo-eti mo-carteles-eti">Próximos eventos</p>
      {eventos.map((ev) => {
        const d = new Date(ev.fecha);
        return (
          <button key={ev.id} type="button" className="mo-cartel" onClick={() => abrir(ev.id)}>
            <img src={ev.foto} alt="" loading="lazy" />
            <span className="mo-cartel-texto">
              <span className="mo-cartel-fecha">{String(d.getDate()).padStart(2, '0')}·{String(d.getMonth() + 1).padStart(2, '0')}</span>
              <span className="mo-cartel-titulo">{ev.titulo}</span>
              <span className="mo-cartel-pie"><span className="mo-mono">{ev.lugar} · {hora(ev.fecha)}</span><span className="mo-cartel-ir">Registrarme <ArrowRight size={14} /></span></span>
            </span>
          </button>
        );
      })}
    </section>
  );
}

function Eventos({ e, abrir }) {
  const lista = e.eventos.filter((x) => x.publico && x.fecha > Date.now() - 6 * 3600000).sort((a, b) => a.fecha - b.fecha);
  const [primero] = lista;
  if (!primero) return <section className="mo-seccion"><p className="mo-tenue">Sin eventos por ahora.</p></section>;
  const modelos = Object.entries(primero.convocadas).filter(([, v]) => v === 'confirmada').map(([id]) => modeloPorId(e, id)).filter(Boolean);
  const [titulo, sub] = primero.titulo.split(' · ');
  return (
    <>
      <section className="mo-evento-portada">
        <FondoEvento ev={primero} />
        <div className="mo-evento-portada-texto">
          <p className="mo-eti" style={{ color: 'rgba(255,255,255,.75)' }}>Próximo · {primero.tipo}</p>
          <h1 className="mo-gigante">{titulo}{sub && <><br /><em>{sub}</em></>}</h1>
          <p style={{ opacity: .85, display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}><MapPin size={15} /> {fechaLarga(primero.fecha)} · {hora(primero.fecha)} · {primero.lugar}</p>
          <div className="mo-evento-portada-pie">
            <Cuenta hasta={primero.fecha} />
            <button type="button" className="mo-boton mo-boton-blanco" onClick={() => abrir(primero.id)}>Registrarme <ArrowRight size={16} /></button>
          </div>
        </div>
      </section>

      {modelos.length > 0 && (
        <section className="mo-seccion mo-lineup">
          <div className="mo-seccion-cab"><h2>Desfilan <em>en {titulo.split(' ')[0].toLowerCase()}</em></h2><p className="mo-tenue" style={{ fontSize: '.86rem' }}>{modelos.length} modelos de {AGENCIA.nombre} confirmadas</p></div>
          <div className="mo-lineup-fila">
            {modelos.map((m, k) => (
              <div key={m.id} className="mo-lineup-modelo" style={{ '--k': k }}>
                <FotoModelo m={m} tipo="book" />
                <span className="mo-mono">LOOK {String(k + 1).padStart(2, '0')}</span>
                <b>{m.nombre}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mo-seccion">
        <div className="mo-seccion-cab"><h2>La <em>agenda</em></h2><p className="mo-tenue" style={{ fontSize: '.86rem' }}>Regístrate y llévate tu pase digital</p></div>
        <div className="mo-agenda-ev">
          {lista.map((ev) => {
            const d = new Date(ev.fecha);
            const pct = ev.cupo ? Math.min(1, ev.invitados.length / ev.cupo) : 0;
            const mio = e.misRegistros.some((r) => r.evento === ev.id);
            return (
              <button key={ev.id} type="button" className="mo-agenda-fila" onClick={() => abrir(ev.id)}>
                <span className="mo-agenda-fecha"><b>{d.getDate()}</b>{d.toLocaleDateString('es-MX', { month: 'short' })}<br />{d.toLocaleDateString('es-MX', { weekday: 'short' })}</span>
                <span className="mo-agenda-info">
                  <span className="mo-eti">{ev.tipo}{mio ? ' · ya tienes pase' : ''}</span>
                  <b>{ev.titulo}</b>
                  <small>{hora(ev.fecha)} · {ev.lugar}</small>
                </span>
                {ev.cupo > 0 && (
                  <span className="mo-agenda-cupo">
                    <small className="mo-mono">{ev.invitados.length}/{ev.cupo}</small>
                    <i><em style={{ width: `${pct * 100}%` }} /></i>
                  </span>
                )}
                <span className="mo-agenda-foto"><img src={ev.foto} alt="" loading="lazy" /></span>
                <ArrowRight className="mo-agenda-flecha" size={22} strokeWidth={1.4} />
              </button>
            );
          })}
        </div>
      </section>
    </>
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
    <Modal alCerrar={alCerrar} etiqueta={ev.titulo}>
      <Foto src={ev.foto} className="mo-modal-portada" />
      <p className="mo-eti">{ev.tipo} · {fechaLarga(ev.fecha)} · {hora(ev.fecha)}</p>
      <h2 className="mo-serif" style={{ fontSize: '2rem', lineHeight: 1.02, margin: '8px 0 10px' }}>{ev.titulo}</h2>
      <p className="mo-tenue" style={{ lineHeight: 1.55 }}>{ev.descripcion}</p>
      <p style={{ fontSize: '.86rem', margin: '10px 0 16px', display: 'flex', gap: 6, alignItems: 'center' }}><MapPin size={14} /> {ev.lugar}</p>
      {modelos.length > 0 && !miPase && (
        <div style={{ marginBottom: 18 }}>
          <p className="mo-eti" style={{ marginBottom: 8 }}>Desfilan</p>
          <div style={{ display: 'flex', gap: 6 }}>{modelos.map((m) => <FotoModelo key={m.id} m={m} className="mo-mini-redonda" />)}</div>
        </div>
      )}
      {miPase ? (
        <>
          <div className="mo-boleto">
            <div className="mo-boleto-talon">
              <span className="mo-eti">{d.toLocaleDateString('es-MX', { weekday: 'long' })}</span>
              <b className="mo-gigante">{d.getDate()}</b>
              <span className="mo-eti">{d.toLocaleDateString('es-MX', { month: 'long' })}</span>
              <span className="mo-mono" style={{ fontSize: '.8rem', marginTop: 8 }}>{hora(ev.fecha)}</span>
            </div>
            <div className="mo-boleto-cuerpo">
              <div>
                <p className="mo-eti">{AGENCIA.nombre} · {ev.tipo}</p>
                <p className="mo-gigante" style={{ fontSize: '1.5rem', marginTop: 6 }}>{miPase.nombre}</p>
                <p className="mo-tenue" style={{ fontSize: '.78rem', marginTop: 2 }}>{miPase.empresa || 'Invitada'}</p>
                <b className="mo-mono" style={{ letterSpacing: '.14em', display: 'block', marginTop: 12 }}>{miPase.codigo}</b>
              </div>
              <QRCodeSVG value={miPase.codigo} size={112} bgColor="#FBF9F5" fgColor="#151413" />
            </div>
            <span className="mo-boleto-sello">Admite 1</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button type="button" className="mo-boton mo-boton-chico" onClick={() => icsEvento(ev, miPase)}><Check size={15} /> Agregar a mi calendario</button>
            <a className="mo-boton mo-boton-claro mo-boton-chico" href={`https://maps.google.com/?q=${encodeURIComponent(ev.lugar)}`} target="_blank" rel="noreferrer"><MapPin size={15} /> Cómo llegar</a>
          </div>
          <p className="mo-tenue" style={{ fontSize: '.76rem', marginTop: 10 }}>Enséñalo en la puerta: lo escanean con el lector.</p>
        </>
      ) : (
        <form onSubmit={(x) => { x.preventDefault(); if (f.nombre) registrarseEvento(ev.id, f); }} style={{ display: 'grid', gap: 14 }}>
          <Campo etiqueta="Tu nombre"><input value={f.nombre} onChange={(x) => setF({ ...f, nombre: x.target.value })} required /></Campo>
          <div className="mo-dos">
            <Campo etiqueta="Empresa o medio"><input value={f.empresa} onChange={(x) => setF({ ...f, empresa: x.target.value })} /></Campo>
            <Campo etiqueta="Correo"><input type="email" value={f.correo} onChange={(x) => setF({ ...f, correo: x.target.value })} /></Campo>
          </div>
          {quedan !== null && (
            <div className="mo-agenda-cupo" style={{ width: '100%' }}>
              <small className="mo-mono">{ev.invitados.length} registrados · {quedan ? `quedan ${quedan}` : 'cupo lleno'}</small>
              <i><em style={{ width: `${Math.min(1, ev.invitados.length / ev.cupo) * 100}%` }} /></i>
            </div>
          )}
          <button type="submit" className="mo-boton" disabled={!f.nombre || quedan === 0}>Registrarme</button>
        </form>
      )}
    </Modal>
  );
}
