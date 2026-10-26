import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, CircleUser, Car, Check, ChevronLeft, ChevronRight, Clock, CreditCard, Film, MapPin, Megaphone,
  Gift, Minus, Play, Plus, Popcorn, Radio, Search, Smartphone, Ticket, Trophy, Ghost, CalendarHeart, Heart, ThumbsUp, ThumbsDown, LifeBuoy, Navigation, Send, Vote, CloudRain, Brain, CircleCheck, CircleX, CalendarSync, UtensilsCrossed, Wallet, X,
} from 'lucide-react';
import {
  AYUDAS, TRIVIA_PUNTOS, TRIVIA_SEGUNDOS, cambiarFecha, climaDe, lugarParecido, pedirReembolso, preguntasDe, rankingTrivia, terminarTrivia, BOLETOS, CASA, CLIENTE, EVENTO, MODO, PROPUESTAS, cotizar, disponible, alcanza, pedirAyuda, pedirCotizacion, reaccionar, sugerir, votar, casaOcupados, comprarCasa, misCasa, turnoT, ESTADOS_ORDEN, IMG, RECOMPENSAS, RETOS, canjear, duracion, nivelDe, progresoReto, siguienteNivel, MENU, NEGOCIO, PELICULAS, avisosDe, boleto, comprar, diaCorto, diaLargo, dinero,
  funcionPorId, funcionesDelDia, hora, inicioDia, misPases, nombreDia, nombreLugar, ordenesDe,
  pedir, platillo, quedan, useCine, ventasDe,
} from './datos';
import { Controles, Foto, Mapa, avisarListo, minutos, useAhora, useTono } from './comun';
import { useDialogo } from '../sorteos/comun';
import { enRaiz } from './capa';

// ─────────────────────────────────────────────────────────────────────────────
// SITIO DEL CLIENTE — lo que reemplaza a autocinemacocodrilo.com
//
// Inicio (carrusel de la semana con el fondo del póster + cartelera por día con
// horarios directos + carteles de temporada/comida + antojos + cómo funciona +
// visítanos) → Película (día, hora y boleto) → Compra (lugar en el mapa →
// datos y pago de prueba) → Mis boletos (pase QR + pedir al auto) · Menú.
// ─────────────────────────────────────────────────────────────────────────────

const SECCIONES = [
  { id: 'inicio', etiqueta: 'Cartelera', Icon: Film },
  { id: 'menu', etiqueta: 'Menú', Icon: Popcorn },
  { id: 'pases', etiqueta: 'Mis boletos', Icon: Ticket },
  { id: 'puntos', etiqueta: 'Perfil', Icon: CircleUser },
  { id: 'nosotros', etiqueta: 'Nosotros', Icon: MapPin },
];
const vigente = (f) => f.t + 30 * 60000 > Date.now();

export default function Sitio() {
  const e = useCine();
  const [vista, setVista] = useState({ id: 'inicio' });
  const [solido, setSolido] = useState(false);
  const nBoletos = misPases(e).length + misCasa(e).length;
  const ir = (v) => { setVista(v); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const irSeccion = (id) => {
    ir({ id });
  };
  const activa = ['pelicula', 'compra', 'casa', 'eventos'].includes(vista.id) ? 'inicio' : vista.id;
  // el encabezado flota sobre el fondo del póster y se vuelve vidrio al bajar
  const sobrePoster = ['inicio', 'pelicula', 'casa'].includes(vista.id);
  useEffect(() => {
    const f = () => setSolido(window.scrollY > 24);
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  return (
    <div className="ac-sitio">
      <header className={`ac-cab ${solido || !sobrePoster ? 'solido' : ''}`}>
        <div className="ac-envoltura ac-cab-fila">
          <button type="button" className="ac-logo" onClick={() => ir({ id: 'inicio' })} aria-label="Inicio">
            <i><Car size={19} strokeWidth={2.2} /></i>
            <span><b>Cocodrilo</b><span>Autocinema · Cholula</span></span>
          </button>
          <nav className="ac-nav" aria-label="Secciones">
            {SECCIONES.map((s) => (
              <button key={s.id} type="button" className={activa === s.id ? 'activo' : ''} onClick={() => irSeccion(s.id)}>
                {s.etiqueta}
                {s.id === 'pases' && nBoletos > 0 && <span className="ac-punto">{nBoletos}</span>}
              </button>
            ))}
          </nav>
          <Controles />
        </div>
      </header>

      {vista.id === 'inicio' && <Inicio e={e} alPelicula={(peli, funcion) => ir({ id: 'pelicula', peli, funcion })} alMenu={() => ir({ id: 'menu' })}
        alCasa={() => ir({ id: 'casa' })} alNosotros={() => ir({ id: 'nosotros' })} alEventos={() => ir({ id: 'eventos' })} />}
      {vista.id === 'eventos' && <Eventos alVolver={() => ir({ id: 'inicio' })} />}
      {vista.id === 'casa' && <CasaTerror e={e} alVolver={() => ir({ id: 'inicio' })} alListo={(codigo) => ir({ id: 'pases', codigo })} />}
      {vista.id === 'nosotros' && <Nosotros alCartelera={() => ir({ id: 'inicio' })} alEventos={() => ir({ id: 'eventos' })} />}
      {vista.id === 'pelicula' && <Pelicula e={e} peli={vista.peli} funcionInicial={vista.funcion} alVolver={() => ir({ id: 'inicio' })}
        alComprar={(funcion, tipo) => ir({ id: 'compra', peli: vista.peli, funcion, tipo })} />}
      {vista.id === 'compra' && <Compra e={e} {...vista} alVolver={() => ir({ id: 'pelicula', peli: vista.peli, funcion: vista.funcion })}
        alListo={(codigo) => ir({ id: 'pases', codigo })} />}
      {vista.id === 'pases' && <MisBoletos e={e} codigoInicial={vista.codigo} alCartelera={() => ir({ id: 'inicio' })} alPedir={(codigo) => ir({ id: 'menu', codigo })} />}
      {vista.id === 'puntos' && <Puntos e={e} alPase={(codigo) => ir({ id: 'pases', codigo })} alCartelera={() => ir({ id: 'inicio' })} />}
      {vista.id === 'menu' && <Menu e={e} codigoInicial={vista.codigo} alPedido={(codigo) => ir({ id: 'pases', codigo })} alCartelera={() => ir({ id: 'inicio' })} />}

      <nav className="ac-tabbar" aria-label="Secciones">
        {SECCIONES.map(({ id, etiqueta, Icon }) => (
          <button key={id} type="button" className={activa === id ? 'activo' : ''} onClick={() => irSeccion(id)} aria-label={etiqueta} aria-current={activa === id ? 'page' : undefined}>
            <Icon size={22} strokeWidth={activa === id ? 2.2 : 1.8} />
            {id === 'pases' && nBoletos > 0 && <span className="ac-punto">{nBoletos}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── inicio ──────────────────────────────────────────────────────────────────
function Inicio({ e, alPelicula, alMenu, alCasa, alNosotros, alEventos }) {
  const [dia, setDia] = useState(0);
  // una tarjeta por película, en el orden de su próxima función
  const semana = useMemo(() => {
    const vistas = new Map();
    e.funciones.filter(vigente).forEach((f) => { if (!vistas.has(f.peli)) vistas.set(f.peli, []); vistas.get(f.peli).push(f); });
    return [...vistas.entries()].map(([peli, fs]) => ({ peli, funciones: fs }));
  }, [e.funciones]);
  const [activo, setActivo] = useState(0);
  const [busca, setBusca] = useState('');
  const q = busca.trim().toLowerCase();
  const visibles = q ? semana.filter((s) => `${PELICULAS[s.peli].titulo} ${PELICULAS[s.peli].genero}`.toLowerCase().includes(q)) : semana;
  const idx = Math.min(activo, Math.max(0, visibles.length - 1));
  const actual = visibles[idx];
  useEffect(() => { setActivo(0); }, [q]);

  return (
    <>
      <section className="ac-portada">
        <div className="ac-ambiente" aria-hidden="true">
          {actual && <img key={actual.peli} src={IMG(PELICULAS[actual.peli].poster)} alt="" referrerPolicy="no-referrer" className="activa" />}
        </div>
        <div className="ac-envoltura ac-portada-grid">
          <div className="ac-portada-cab">
            <h1>Esta semana <em>en el Cocodrilo</em></h1>
            <label className="ac-buscar">
              <Search size={19} />
              <input value={busca} onChange={(ev) => setBusca(ev.target.value)} placeholder="Busca una película" aria-label="Buscar película" />
              {busca && <button type="button" onClick={() => setBusca('')} aria-label="Borrar búsqueda"><X size={17} /></button>}
            </label>
          </div>
          <div className="ac-portada-carrusel">
            {visibles.length
              ? <Carrusel key={q} items={visibles} activo={idx} alCambiar={setActivo} alAbrir={(s) => alPelicula(s.peli, s.funciones[0].id)} />
              : <p className="ac-suave" style={{ textAlign: 'center', padding: '120px 0' }}>No encontramos “{busca}” en la cartelera.</p>}
          </div>
          <div className="ac-flechas">
            <button type="button" className="ac-redondo vidrio" aria-label="Anterior" disabled={visibles.length < 2} onClick={() => setActivo((idx - 1 + visibles.length) % visibles.length)}><ChevronLeft size={20} /></button>
            <button type="button" className="ac-redondo vidrio" aria-label="Siguiente" disabled={visibles.length < 2} onClick={() => setActivo((idx + 1) % visibles.length)}><ChevronRight size={20} /></button>
          </div>
          <div className="ac-portada-info">
            {actual && <InfoActual e={e} s={actual} alPelicula={alPelicula} />}
          </div>
        </div>
      </section>

      <div className="ac-envoltura">
        <section className="ac-seccion" id="ac-cartelera" style={{ scrollMarginTop: 150 }}>
          <div className="ac-seccion-cab">
            <h2>Cartelera <em>por día</em></h2>
          </div>
          <div className="ac-dias" role="tablist" aria-label="Día">
            {Array.from({ length: 7 }, (_, d) => {
              const t = inicioDia(d);
              return (
                <button key={d} type="button" role="tab" aria-selected={dia === d} className={`ac-dia ${dia === d ? 'activo' : ''}`} onClick={() => setDia(d)}>
                  <small>{d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : new Date(t).toLocaleDateString('es-MX', { weekday: 'short' })}</small>
                  <b>{new Date(t).getDate()}</b>
                  {climaDe(e, t).lluvia >= 40 && <em className="ac-dia-lluvia" title={`${climaDe(e, t).lluvia}% de lluvia`}><CloudRain size={12} /> {climaDe(e, t).lluvia}%</em>}
                </button>
              );
            })}
          </div>
          <CarteleraDia e={e} dia={dia} alPelicula={alPelicula} />
        </section>

        <ProximaPeli e={e} />

        <section className="ac-seccion">
          <div className="ac-fila">
            <button type="button" className="ac-cartel" onClick={alCasa}>
              <Foto nombre="casa-terror" texto="" />
              <div className="ac-cartel-texto">
                <span className="ac-chip">Temporada · hasta el 2 de noviembre</span>
                <h3>Casa del Terror</h3>
                <p>Viene incluida en tu boleto de película. ¿Solo quieres los sustos? Compra tu entrada por separado, desde {dinero(CASA.tipos[0].precio)} por persona.</p>
                <span className="ac-btn chico" style={{ width: 'fit-content', marginTop: 4 }}>Comprar entrada <ArrowRight size={15} /></span>
              </div>
            </button>
            <button type="button" className="ac-cartel" onClick={alMenu}>
              <Foto nombre="fuente-sodas" texto="" />
              <div className="ac-cartel-texto">
                <span className="ac-chip">Fuente de sodas</span>
                <h3>Pide sin bajarte del auto</h3>
                <p>Desde tu boleto: la cocina ya sabe en qué lugar estás.</p>
              </div>
            </button>
            <button type="button" className="ac-cartel" onClick={alEventos}>
              <Foto nombre="nosotros-lugar" texto="" />
              <div className="ac-cartel-texto">
                <span className="ac-chip">Eventos privados</span>
                <h3>El autocinema para ti</h3>
                <p>Cumpleaños, empresas, pedidas de mano: tu película, tu mensaje en la pantalla. Cotiza en un minuto.</p>
                <span className="ac-btn chico" style={{ width: 'fit-content', marginTop: 4 }}>Cotizar <ArrowRight size={15} /></span>
              </div>
            </button>
            <button type="button" className="ac-cartel" onClick={alNosotros}>
              <Foto nombre="fila-autos" texto="" />
              <div className="ac-cartel-texto">
                <span className="ac-chip">La experiencia</span>
                <h3>Tu auto, tu sala</h3>
                <p>Película en la radio de tu auto, rodeados de árboles y estrellas.</p>
              </div>
            </button>
          </div>
        </section>

        <section className="ac-seccion">
          <div className="ac-seccion-cab">
            <h2>Antojos <em>de la fuente de sodas</em></h2>
            <button type="button" className="ac-ver-todo" onClick={alMenu}>Ver menú <ArrowRight size={15} /></button>
          </div>
          <div className="ac-fila">
            {MENU.filter((m) => m.cat !== 'Combos').map((m) => (
              <button key={m.id} type="button" className="ac-tarjeta ac-antojo" onClick={alMenu} style={{ border: 0 }}>
                <Foto nombre={m.foto} texto={m.nombre} />
                <div><b>{m.nombre}</b><span>{dinero(m.precio)}</span></div>
              </button>
            ))}
          </div>
        </section>

        <section className="ac-seccion">
          <div className="ac-seccion-cab"><h2>Así <em>funciona</em></h2></div>
          <div className="ac-pasos">
            {[
              [Car, 'Escoge tu lugar', 'Ves el mapa del autocinema y apartas el lugar exacto: primera fila, en medio o zona peatonal.'],
              [Smartphone, 'Llega con tu QR', 'En la entrada escanean tu pase y te dicen a qué lugar ir. Sin filas ni papelitos.'],
              [UtensilsCrossed, 'Pide sin bajarte', 'Abre tu boleto, pide de la fuente de sodas y te lo llevamos a tu lugar.'],
            ].map(([Icon, t, d], i) => (
              <div key={t} className="ac-tarjeta ac-paso">
                <span className="ac-num">0{i + 1}</span>
                <i><Icon size={20} /></i>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>

        <Pie />
      </div>
    </>
  );
}

// ── tú eliges la próxima ────────────────────────────────────────────────────
function ProximaPeli({ e }) {
  const [texto, setTexto] = useState('');
  const total = Object.values(e.votos || {}).reduce((n, x) => n + x, 0) || 1;
  const enviar = (ev) => { ev.preventDefault(); if (!texto.trim()) return; sugerir(texto.trim()); setTexto(''); avisarListo('Gracias: tu propuesta le llegó al autocinema'); };
  return (
    <section className="ac-seccion">
      <div className="ac-seccion-cab">
        <div><h2>Tú eliges <em>la próxima</em></h2><p className="ac-suave" style={{ marginTop: 6, fontSize: 14.5 }}>La más votada entra a la cartelera de noviembre.</p></div>
        <span className="ac-chip contorno"><Vote size={14} /> {total.toLocaleString('es-MX')} votos</span>
      </div>
      <div className="ac-votos">
        {PROPUESTAS.map((x) => {
          const pct = Math.round((e.votos[x.id] / total) * 100);
          const mio = e.miVoto === x.id;
          return (
            <button key={x.id} type="button" className={`ac-voto ${mio ? 'mio' : ''}`} onClick={() => votar(x.id)} aria-pressed={mio}>
              <Foto nombre={x.poster} texto={x.titulo} />
              <div>
                <b>{x.titulo}</b>
                <span className="ac-voto-barra"><i style={{ width: `${pct}%` }} /></span>
                <small>{pct}% {mio ? '· tu voto' : ''}</small>
              </div>
            </button>
          );
        })}
      </div>
      <form className="ac-sugerir" onSubmit={enviar}>
        <input value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="¿Qué otra película quieres ver aquí?" aria-label="Propón una película" />
        <button type="submit" className="ac-btn chico" disabled={!texto.trim()}><Send size={15} /> Proponer</button>
      </form>
    </section>
  );
}

// ── eventos privados: cotizador ─────────────────────────────────────────────
function Eventos({ alVolver }) {
  const [d, setD] = useState({ nombre: CLIENTE.nombre, telefono: '222 345 6789', tipo: 'Cumpleaños', fecha: '', autos: 25, extras: ['pantalla'], notas: '' });
  const [enviada, setEnviada] = useState(false);
  const q = cotizar(d);
  const alternar = (x) => setD((c) => ({ ...c, extras: c.extras.includes(x) ? c.extras.filter((y) => y !== x) : [...c.extras, x] }));
  const enviar = () => { pedirCotizacion({ ...d, fecha: d.fecha ? new Date(`${d.fecha}T20:00`).getTime() : null }); setEnviada(true); avisarListo('Solicitud enviada: te contactamos hoy'); };
  return (
    <div className="ac-detalle">
      <div className="ac-ambiente" aria-hidden="true"><img src={IMG('nosotros-lugar')} alt="" /></div>
      <div className="ac-envoltura">
        <div className="ac-detalle-barra"><button type="button" className="ac-redondo vidrio" onClick={alVolver} aria-label="Regresar"><ArrowLeft size={18} /></button></div>
        <p className="ac-cejilla">Eventos privados</p>
        <h1 style={{ fontSize: 'clamp(32px, 4.4vw, 52px)', margin: '8px 0 10px' }}>Cotiza <em>tu evento</em></h1>
        <p className="ac-suave" style={{ maxWidth: 560, fontSize: 16, lineHeight: 1.55 }}>Todo el autocinema para ti: tu película, tus invitados en sus autos y tu mensaje en la pantalla gigante. Ves el precio al momento.</p>
        <div className="ac-compra" style={{ marginTop: 26 }}>
          <div style={{ display: 'grid', gap: 18 }}>
            <div className="ac-bloque" style={{ marginTop: 0 }}>
              <p className="ac-etiqueta">¿Qué celebras?</p>
              <div className="ac-horas">{EVENTO.tipos.map((t) => <button key={t} type="button" className={`ac-hora-btn ${d.tipo === t ? 'activo' : ''}`} onClick={() => setD({ ...d, tipo: t })}>{t}</button>)}</div>
            </div>
            <div className="ac-dos">
              <label className="ac-campo"><span>Fecha</span><input type="date" value={d.fecha} onChange={(ev) => setD({ ...d, fecha: ev.target.value })} /></label>
              <label className="ac-campo"><span>Autos invitados: <b style={{ color: 'var(--ac-texto)' }}>{d.autos}</b></span>
                <input type="range" min="10" max="60" step="1" value={d.autos} onChange={(ev) => setD({ ...d, autos: Number(ev.target.value) })} style={{ padding: 0, accentColor: 'var(--ac-acento)' }} />
              </label>
            </div>
            <div className="ac-bloque" style={{ marginTop: 0 }}>
              <p className="ac-etiqueta">Agrégale</p>
              <div className="ac-extras">
                {EVENTO.extras.map((x) => (
                  <label key={x.id} className="ac-extra">
                    <input type="checkbox" checked={d.extras.includes(x.id)} onChange={() => alternar(x.id)} />
                    <div style={{ flex: 1 }}><b style={{ fontWeight: 500 }}>{x.nombre}</b></div>
                    <span className="ac-suave" style={{ fontSize: 14 }}>{dinero(x.precio)}{x.porAuto ? ' / auto' : ''}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="ac-dos">
              <label className="ac-campo"><span>Nombre</span><input value={d.nombre} onChange={(ev) => setD({ ...d, nombre: ev.target.value })} /></label>
              <label className="ac-campo"><span>WhatsApp</span><input value={d.telefono} onChange={(ev) => setD({ ...d, telefono: ev.target.value })} /></label>
            </div>
            <label className="ac-campo"><span>¿Algo más? (película que quieres, horario…)</span><textarea rows={3} value={d.notas} onChange={(ev) => setD({ ...d, notas: ev.target.value })} /></label>
          </div>
          <aside className="ac-tarjeta ac-resumen">
            <p className="ac-etiqueta">Tu cotización · {d.tipo}</p>
            {q.lineas.map(([t, v]) => <div key={t} className="ac-resumen-fila"><span className="ac-suave">{t}</span><b style={{ whiteSpace: 'nowrap' }}>{dinero(v)}</b></div>)}
            <hr className="ac-sep" />
            <div className="ac-resumen-fila" style={{ alignItems: 'baseline' }}><span>Total estimado</span><span className="ac-resumen-total">{dinero(q.total)}</span></div>
            <p className="ac-suave" style={{ fontSize: 12.5 }}>Precios de ejemplo para la demostración. Se aparta con 30% de anticipo.</p>
            {enviada
              ? <p className="ac-chip verde" style={{ whiteSpace: 'normal', padding: '10px 14px' }}><Check size={14} /> Recibimos tu solicitud. Te escribimos por WhatsApp hoy mismo.</p>
              : <button type="button" className="ac-btn acento ancho" disabled={!d.nombre.trim()} onClick={enviar}><Send size={17} /> Enviar solicitud</button>}
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── nosotros (quiénes somos + visítanos) ────────────────────────────────────
// El texto de "Quiénes somos" es el de su sitio, tal cual.
function Nosotros({ alCartelera, alEventos }) {
  return (
    <div className="ac-nosotros">
      <section className="ac-nos-hero">
        <Foto nombre="nosotros-lugar" texto="" prioridad />
        <div className="ac-envoltura">
          <p className="ac-cejilla" style={{ color: 'rgba(255,255,255,.7)' }}>Desde Puebla · San Andrés Cholula</p>
          <h1>Quiénes <em>somos</em></h1>
          <p>Autocinema Cocodrilo nació con la iniciativa de traer a Puebla nuevas experiencias que promuevan la cultura, el esparcimiento y las amistades.</p>
        </div>
      </section>

      <div className="ac-envoltura">
        <section className="ac-nos-historia">
          <div className="ac-nos-texto">
            <p className="ac-etiqueta">Nuestra historia</p>
            <p className="ac-nos-grande">Queremos que Autocinema Cocodrilo sea un lugar que cuente historias, que cada uno de ustedes viva una experiencia al visitarnos.</p>
            <blockquote>
              <p>“¿Te acuerdas cuando fuimos al autocinema y te besé por primera vez?”</p>
              <p>“¿Recuerdas cuando éramos niños y nos llevaban al autocinema?”</p>
              <footer>…que se les ponga la piel chinita.</footer>
            </blockquote>
            <p className="ac-suave" style={{ fontSize: 16, lineHeight: 1.6 }}>Eso somos, seres que viven para cautivar y ser cautivados…</p>
            <p className="ac-nos-firma">¡El cine es el pretexto perfecto, <em>los esperamos!</em></p>
            <button type="button" className="ac-btn acento" onClick={alCartelera} style={{ width: 'fit-content' }}>Ver la cartelera <ArrowRight size={17} /></button>
          </div>
          <div className="ac-nos-fotos">
            <Foto nombre="nosotros-familia" texto="" />
            <Foto nombre="nosotros-pareja" texto="" />
          </div>
        </section>

        <section className="ac-seccion">
          <button type="button" className="ac-cartel" onClick={alEventos} style={{ width: '100%', minHeight: 260 }}>
            <Foto nombre="nosotros-familia" texto="" />
            <div className="ac-cartel-texto">
              <span className="ac-chip">Eventos privados</span>
              <h3>Celebra en el autocinema</h3>
              <p>Rentamos el autocinema para tu cumpleaños, tu empresa o esa pregunta importante, con tu mensaje en la pantalla gigante.</p>
              <span className="ac-btn chico" style={{ width: 'fit-content', marginTop: 4 }}>Cotizar mi evento <ArrowRight size={15} /></span>
            </div>
          </button>
        </section>

        <section className="ac-seccion">
          <div className="ac-pasos">
            {[
              [Car, 'Tu auto, tu sala', 'La película se escucha en la radio de tu auto, rodeados de árboles y estrellas.'],
              [Popcorn, 'Fuente de sodas', 'Hamburguesas, malteadas y palomitas que te llevamos hasta tu lugar.'],
              [CalendarHeart, 'Temporadas', 'Noches de Terror con Casa del Terror, ciclos familiares y funciones especiales.'],
            ].map(([Icon, t, d]) => (
              <div key={t} className="ac-tarjeta ac-paso"><i><Icon size={20} /></i><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
        </section>

        <section className="ac-seccion" >
          <div className="ac-seccion-cab"><h2>Visítanos</h2></div>
          <div className="ac-visita">
            <div className="ac-tarjeta">
              <p className="ac-etiqueta">Dónde estamos</p>
              <h3 className="ac-serif" style={{ fontSize: 30, lineHeight: 1.05, margin: '10px 0 8px' }}>{NEGOCIO.direccion}</h3>
              <p className="ac-suave" style={{ fontSize: 14.5 }}>Búscanos en Waze o Google Maps como “Autocinema Cocodrilo”.</p>
              <div className="ac-horario">
                {NEGOCIO.horario.map(([d, h]) => <div key={d}><span>{d}</span><b style={{ fontWeight: 600 }}>{h}</b></div>)}
                <div><span>Lunes</span><span className="ac-suave">Cerrado</span></div>
              </div>
              <a className="ac-btn" href={NEGOCIO.mapa} target="_blank" rel="noreferrer" style={{ marginTop: 20 }}><MapPin size={16} /> Cómo llegar</a>
            </div>
            <div className="ac-tarjeta ac-faq">
              <p className="ac-etiqueta">Preguntas frecuentes</p>
              {[
                ['¿Cómo se escucha la película?', 'Por la radio de tu auto: al entrar te damos la frecuencia FM. En zona peatonal hay bocinas.'],
                ['¿Cuántas personas caben en un boleto de auto?', 'Hasta 6 personas por auto: el precio es por auto, no por persona.'],
                ['¿Qué pasa si llueve?', 'La función sigue con lluvia ligera. Si se cancela te avisamos en tu boleto y lo cambias a otra fecha.'],
                ['¿Puedo cambiar mi fecha?', 'Sí, hasta 3 horas antes de la función, desde Mis boletos.'],
              ].map(([q, r]) => <details key={q}><summary>{q}</summary><p>{r}</p></details>)}
            </div>
          </div>
        </section>

        <Pie />
      </div>
    </div>
  );
}

function Pie() {
  return (
    <footer className="ac-pie">
          <span>© {new Date().getFullYear()} {NEGOCIO.nombre} · San Andrés Cholula, Puebla</span>
          <span className="ac-serif">“El cine es el pretexto perfecto.”</span>
          {MODO === 'real' && <span style={{ flexBasis: '100%', fontSize: 12 }}>Pósters e información de películas: TMDB. Este producto usa la API de TMDB, pero no está avalado ni certificado por TMDB.</span>}
    </footer>
  );
}

// ── casa del terror (entrada sin película) ──────────────────────────────────
function CasaTerror({ e, alVolver, alListo }) {
  const noches = Array.from({ length: 7 }, (_, d) => inicioDia(d)).filter((dia) => funcionesDelDia(e, Math.round((dia - inicioDia(0)) / 86400000)).length);
  const [dia, setDia] = useState(noches[0]);
  const libresDe = (h) => CASA.cupo - casaOcupados(e, turnoT(dia, h));
  const turnos = CASA.turnos.filter((h) => turnoT(dia, h) > Date.now() - 15 * 60000);
  const [turno, setTurno] = useState(null);
  const [tipo, setTipo] = useState('general');
  const [personas, setPersonas] = useState(2);
  const [pagar, setPagar] = useState(false);
  const tp = CASA.tipos.find((x) => x.id === tipo);
  const total = tp.precio * personas;
  const libres = turno ? libresDe(turno) : 0;
  useEffect(() => { setTurno(null); }, [dia]);
  useEffect(() => { if (turno && personas > libres) setPersonas(Math.max(1, libres)); }, [turno, libres, personas]);

  return (
    <div className="ac-detalle">
      <div className="ac-ambiente" aria-hidden="true"><img src={IMG('casa-terror')} alt="" /></div>
      <div className="ac-envoltura">
        <div className="ac-detalle-barra">
          <button type="button" className="ac-redondo vidrio" onClick={alVolver} aria-label="Regresar"><ArrowLeft size={18} /></button>
        </div>
        <div className="ac-ficha">
          <div className="ac-ficha-poster" style={{ aspectRatio: '4/5' }}>
            <Foto nombre="terror-actor" texto="Casa del Terror" prioridad />
          </div>
          <div>
            <p className="ac-cejilla">{NEGOCIO.temporada} · hasta el 2 de noviembre</p>
            <h1>Casa del Terror</h1>
            <div className="ac-ficha-chips">
              <span className="ac-chip contorno"><Clock size={14} /> 15 min</span>
              <span className="ac-chip contorno">Actores en vivo</span>
              <span className="ac-chip contorno">Recomendada +12</span>
            </div>
            <p className="ac-sinopsis">Un recorrido entre la niebla y los árboles del autocinema, con actores que te siguen hasta la salida. Si ya tienes boleto de película, viene incluida; aquí puedes comprar solo la Casa del Terror.</p>

            <div className="ac-bloque">
              <p className="ac-etiqueta">Elige la noche</p>
              <div className="ac-horas">
                {noches.map((d) => <button key={d} type="button" className={`ac-hora-btn ${d === dia ? 'activo' : ''}`} onClick={() => setDia(d)}>{nombreDia(d)} {new Date(d).getDate()}</button>)}
              </div>
            </div>
            <div className="ac-bloque">
              <p className="ac-etiqueta">Elige tu turno</p>
              <div className="ac-horas">
                {turnos.map((h) => {
                  const q = libresDe(h);
                  return (
                    <button key={h} type="button" disabled={!q} className={`ac-hora-btn ${h === turno ? 'activo' : ''}`} style={{ opacity: q ? 1 : 0.4 }} onClick={() => setTurno(h)}>
                      {hora(turnoT(dia, h))}<small>{q ? (q < 10 ? `quedan ${q}` : '') : 'lleno'}</small>
                    </button>
                  );
                })}
                {!turnos.length && <p className="ac-suave">Ya no hay turnos esta noche.</p>}
              </div>
            </div>
          </div>
        </div>

        <section className="ac-seccion" style={{ paddingTop: 36 }}>
          <div className="ac-seccion-cab"><h2>Tu <em>entrada</em></h2></div>
          <div className="ac-boletos">
            {CASA.tipos.map((x) => (
              <button key={x.id} type="button" className={`ac-tarjeta ac-boleto ${tipo === x.id ? 'elegido' : ''}`} onClick={() => setTipo(x.id)} aria-pressed={tipo === x.id}>
                <span className="ac-marca">{tipo === x.id && <Check size={13} strokeWidth={3} />}</span>
                {x.destacado && <span className="ac-chip ambar" style={{ width: 'fit-content', marginBottom: 4 }}>Sin fila</span>}
                <h3>{x.nombre}</h3>
                <span className="ac-precio">{dinero(x.precio)}</span>
                <span className="ac-suave" style={{ fontSize: 13 }}>Por persona</span>
                <ul><li><Check size={14} />{x.detalle}</li></ul>
              </button>
            ))}
            <div className="ac-tarjeta ac-boleto" style={{ cursor: 'default' }}>
              <h3>Personas</h3>
              <div className="ac-cant" style={{ width: 'fit-content', marginTop: 6 }}>
                <button type="button" onClick={() => setPersonas((n) => Math.max(1, n - 1))} aria-label="Menos"><Minus size={15} /></button>
                <span style={{ minWidth: 34, fontSize: 18 }}>{personas}</span>
                <button type="button" className="mas" onClick={() => setPersonas((n) => Math.min(turno ? libres : 10, n + 1, 10))} aria-label="Más"><Plus size={15} /></button>
              </div>
              <span className="ac-suave" style={{ fontSize: 13, marginTop: 'auto' }}>Hasta 10 por compra</span>
            </div>
          </div>
          <div className="ac-pegado">
            <span>{turno ? `${nombreDia(dia)} · ${hora(turnoT(dia, turno))} · ${personas} ${personas === 1 ? 'persona' : 'personas'}` : 'Elige tu turno'}<b>{dinero(total)}</b></span>
            <button type="button" className="ac-btn" disabled={!turno} onClick={() => setPagar(true)}>Comprar <ArrowRight size={17} /></button>
          </div>
        </section>
      </div>
      {pagar && <PagarCasa e={e} t={turnoT(dia, turno)} tipo={tipo} personas={personas} total={total} alCerrar={() => setPagar(false)} alListo={alListo} />}
    </div>
  );
}

function PagarCasa({ t, tipo, personas, total, alCerrar, alListo }) {
  const caja = useRef(null);
  useDialogo(caja, alCerrar);
  const [tarjeta, setTarjeta] = useState('4242 4242 4242 4242');
  const [estado, setEstado] = useState('');
  const pagar = () => {
    if (tarjeta.replace(/\s/g, '') === '4000000000000002') { setEstado('La tarjeta fue rechazada. Prueba con otra.'); return; }
    setEstado('pagando');
    setTimeout(() => {
      const r = comprarCasa({ t, personas, tipo, nombre: CLIENTE.nombre });
      if (!r.ok) { setEstado('Ese turno se acaba de llenar. Elige otro.'); return; }
      avisarListo(`Listo: tu entrada está en Mis boletos · +${r.puntos} puntos`);
      alListo(r.codigo);
    }, 1400);
  };
  return enRaiz(
    <div className="ac-velo" onClick={estado === 'pagando' ? undefined : alCerrar}>
      <div className="ac-ventana" ref={caja} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Pagar Casa del Terror">
        {estado === 'pagando' ? <div className="ac-cargando"><div className="ac-rueda" /><b>Procesando tu pago…</b></div> : (<>
          <h2>Casa del Terror</h2>
          <p className="ac-suave">{nombreDia(t)} {new Date(t).getDate()} · turno {hora(t)} · {personas} {personas === 1 ? 'persona' : 'personas'}</p>
          <label className="ac-campo"><span>Tarjeta (pago de prueba)</span><input className="ac-mono" value={tarjeta} onChange={(ev) => setTarjeta(ev.target.value)} /></label>
          {estado && <p className="ac-chip rosa" style={{ whiteSpace: 'normal' }}>{estado}</p>}
          <div className="ac-resumen-fila" style={{ alignItems: 'baseline' }}><span>Total</span><span className="ac-resumen-total">{dinero(total)}</span></div>
          <button type="button" className="ac-btn acento" onClick={pagar}>Pagar {dinero(total)}</button>
        </>)}
      </div>
    </div>
  );
}

// Pósters en abanico: el del centro al frente, los de los lados asomándose.
// Se arrastra con el dedo o el mouse; tocar uno de los lados lo trae al
// centro y tocar el del centro abre la película. Avanza solo si nadie lo toca.
function Carrusel({ items, activo, alCambiar, alAbrir }) {
  const n = items.length;
  const caja = useRef(null);
  const [dx, setDx] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const arrastre = useRef(null);
  const [quieto, setQuieto] = useState(false);
  const [ancho, setAncho] = useState(300);

  useEffect(() => {
    const el = caja.current?.querySelector('.ac-carrusel-item');
    if (!el) return;
    const ro = new ResizeObserver(() => setAncho(el.offsetWidth || 300));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (quieto || n < 2) return;
    const id = setTimeout(() => alCambiar((activo + 1) % n), 6000);
    return () => clearTimeout(id);
  }, [activo, quieto, n, alCambiar]);

  const ultimoArrastre = useRef(0);
  const abajo = (ev) => { arrastre.current = { x: ev.clientX, t: Date.now(), movio: false }; setArrastrando(true); setQuieto(true); };
  const mover = (ev) => {
    if (!arrastre.current) return;
    const d = ev.clientX - arrastre.current.x;
    if (Math.abs(d) > 6) arrastre.current.movio = true;
    setDx(d);
  };
  const arriba = () => {
    if (!arrastre.current) return;
    let pasos = Math.round(-dx / (ancho * 0.64));
    // un deslizón corto pero rápido (como en el celular) también cuenta
    if (!pasos && Math.abs(dx) > 30 && Date.now() - arrastre.current.t < 350) pasos = dx < 0 ? 1 : -1;
    if (pasos) alCambiar(((activo + pasos) % n + n) % n);
    if (arrastre.current.movio) ultimoArrastre.current = Date.now();
    arrastre.current = null;
    setDx(0); setArrastrando(false);
  };

  return (
    <>
      <div ref={caja} className={`ac-carrusel ${arrastrando ? 'arrastrando' : ''}`}
        onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba} onPointerLeave={arriba}
        onMouseEnter={() => setQuieto(true)} onMouseLeave={() => setQuieto(false)} role="region" aria-roledescription="carrusel" aria-label="Películas de la semana">
        {items.map((s, i) => {
          let o = i - activo;
          if (o > n / 2) o -= n;
          if (o < -n / 2) o += n;
          o += dx / (ancho * 0.64);   // sigue al dedo: el póster se corre lo mismo que el dedo
          const a = Math.abs(o);
          const p = PELICULAS[s.peli];
          return (
            <button key={s.peli} type="button" className="ac-carrusel-item"
              aria-label={p.titulo} tabIndex={i === activo ? 0 : -1}
              onClick={() => { if (Date.now() - ultimoArrastre.current < 450) return; if (i === activo) alAbrir(s); else alCambiar(i); }}
              style={{
                transform: `translateX(${o * 64}%) scale(${1 - Math.min(a, 2) * 0.14})`,
                opacity: a > 2.4 ? 0 : 1 - Math.min(a, 2) * 0.28,
                zIndex: 20 - Math.round(a * 2),
                '--sombra': Math.min(a, 1.5) * 0.3,
                pointerEvents: a > 2.4 ? 'none' : 'auto',
                visibility: a > 3 ? 'hidden' : 'visible',
              }}>
              <Foto nombre={p.poster} texto={p.titulo} prioridad={a < 1.5} />
              <span className="ac-chips-poster">
                <span className="ac-chip oscuro">{p.clas}</span>
                <span className="ac-chip ambar">{nombreDia(s.funciones[0].t)} · {hora(s.funciones[0].t)}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="ac-puntos">
        {items.map((s, i) => <button key={s.peli} type="button" className={i === activo ? 'activo' : ''} aria-label={PELICULAS[s.peli].titulo} onClick={() => alCambiar(i)} />)}
      </div>
    </>
  );
}

function InfoActual({ e, s, alPelicula }) {
  const p = PELICULAS[s.peli];
  const proxima = s.funciones[0];
  const autos = quedan(e, proxima.id, 'auto');
  return (
    <div className="ac-tarjeta ac-info">
      <div>
        <h2>{p.titulo}</h2>
        <p className="ac-info-genero">{p.sinopsis}</p>
      </div>
      <button type="button" className="ac-redondo acento" aria-label={`Ver ${p.titulo}`} onClick={() => alPelicula(s.peli, proxima.id)}><ArrowUpRight size={24} /></button>
      <div className="ac-info-datos">
        <div><small>Duración</small><b>{duracion(p)}</b></div>
        <div><small>Género</small><b>{p.genero}</b></div>
        <div><small>Idioma</small><b>{p.idioma}</b></div>
      </div>
      <div className="ac-info-horas">
        <p className="ac-etiqueta" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span>Horarios</span>
          <span style={{ color: autos < 8 ? 'var(--ac-alerta)' : undefined, letterSpacing: 0, textTransform: 'none' }}>{autos ? `Quedan ${autos} lugares para auto` : 'Autos agotados'}</span>
        </p>
        <div className="ac-horas">
          {s.funciones.slice(0, 3).map((f) => (
            <button key={f.id} type="button" className={`ac-hora-btn ${f.id === proxima.id ? 'activo' : ''}`} onClick={() => alPelicula(s.peli, f.id)}>
              {nombreDia(f.t)} · {hora(f.t)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CarteleraDia({ e, dia, alPelicula }) {
  const fs = funcionesDelDia(e, dia);
  const porPeli = [...new Set(fs.map((f) => f.peli))].map((peli) => ({ peli, funciones: fs.filter((f) => f.peli === peli) }));
  if (!porPeli.length) return <p className="ac-suave" style={{ marginTop: 16 }}>Este día no hay funciones.</p>;
  return (
    <div className="ac-funciones">
      {porPeli.map(({ peli, funciones }) => {
        const p = PELICULAS[peli];
        const abrir = () => { const f = funciones.find(vigente); if (f) alPelicula(peli, f.id); };
        return (
          <article key={peli} className="ac-funcion">
            <button type="button" className="ac-funcion-poster" onClick={abrir} aria-label={p.titulo}><Foto nombre={p.poster} texto={p.titulo} /></button>
            <div className="ac-funcion-info">
              <h3 onClick={abrir}>{p.titulo}</h3>
              <div className="ac-funcion-meta">
                <span className="ac-chip contorno">{p.clas}</span>
                <span>{p.genero} · {duracion(p)} · {p.idioma}</span>
              </div>
              <div className="ac-funcion-pie">
                <div className="ac-horas">
                  {funciones.map((f) => {
                    const q = quedan(e, f.id, 'auto');
                    return (
                      <button key={f.id} type="button" className="ac-hora-btn" disabled={!vigente(f) || !!f.cancelada} style={{ opacity: vigente(f) && !f.cancelada ? 1 : 0.4 }} onClick={() => alPelicula(peli, f.id)}>
                        {hora(f.t)}<small>{f.cancelada ? 'Cancelada por lluvia' : q ? `${q} autos` : 'Agotado'}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ── película ────────────────────────────────────────────────────────────────
function Pelicula({ e, peli, funcionInicial, alVolver, alComprar }) {
  const p = PELICULAS[peli];
  const funciones = e.funciones.filter((f) => f.peli === peli && vigente(f) && !f.cancelada);
  const [funcion, setFuncion] = useState(funcionInicial && funciones.some((f) => f.id === funcionInicial) ? funcionInicial : funciones[0]?.id);
  const [tipo, setTipo] = useState(null);
  const [mas, setMas] = useState(false);
  const [avance, setAvance] = useState(false);
  const f = funcionPorId(e, funcion);
  const diaDe = (t) => new Date(t).setHours(0, 0, 0, 0);
  const dias = [...new Set(funciones.map((x) => diaDe(x.t)))];
  const diaSel = f ? diaDe(f.t) : dias[0];
  const horasDia = funciones.filter((x) => diaDe(x.t) === diaSel);

  return (
    <div className="ac-detalle">
      <div className="ac-ambiente" aria-hidden="true"><img src={IMG(p.poster)} alt="" /></div>
      <div className="ac-envoltura">
        <div className="ac-detalle-barra">
          <button type="button" className="ac-redondo vidrio" onClick={alVolver} aria-label="Regresar a la cartelera"><ArrowLeft size={18} /></button>
        </div>
        <div className="ac-ficha">
          <div className="ac-ficha-poster">
            <Foto nombre={p.poster} texto={p.titulo} prioridad />
            <button type="button" className="ac-play" onClick={() => setAvance(true)} aria-label="Ver avance"><Play size={24} fill="currentColor" /></button>
          </div>
          <div>
            <p className="ac-cejilla">{p.año}{p.director ? ` · ${p.director}` : ''}</p>
            <h1>{p.titulo}</h1>
            <div className="ac-ficha-chips">
              <span className="ac-chip contorno">{p.genero}</span>
              <span className="ac-chip contorno"><Clock size={14} /> {duracion(p)}</span>
              <span className="ac-chip contorno">{p.clas}</span>
              <span className="ac-chip contorno">{p.idioma}</span>
            </div>
            <p className="ac-sinopsis" style={mas ? undefined : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.sinopsis}</p>
            {!mas && <button type="button" className="ac-leer" onClick={() => setMas(true)}>Leer más</button>}
            <Reacciones e={e} peli={peli} />

            {funciones.length ? (<>
              <div className="ac-bloque">
                <p className="ac-etiqueta">Elige el día</p>
                <div className="ac-horas">
                  {dias.map((d) => (
                    <button key={d} type="button" className={`ac-hora-btn ${d === diaSel ? 'activo' : ''}`}
                      onClick={() => setFuncion(funciones.find((x) => diaDe(x.t) === d).id)}>
                      {nombreDia(d)} {new Date(d).getDate()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ac-bloque">
                <p className="ac-etiqueta">Elige la hora</p>
                <div className="ac-horas">
                  {horasDia.map((x) => (
                    <button key={x.id} type="button" className={`ac-hora-btn ${x.id === funcion ? 'activo' : ''}`} onClick={() => setFuncion(x.id)}>{hora(x.t)}</button>
                  ))}
                </div>
              </div>
            </>) : <p className="ac-suave" style={{ marginTop: 24 }}>Sin funciones próximas.</p>}
          </div>
        </div>

        {f && (
          <section className="ac-seccion" style={{ paddingTop: 40 }}>
            <div className="ac-seccion-cab">
              <h2>Tu boleto</h2>
              <span className="ac-suave" style={{ fontSize: 14 }}>{diaLargo(f.t)} · {hora(f.t)}</span>
            </div>
            <div className="ac-boletos">
              {BOLETOS.map((b) => {
                const q = quedan(e, funcion, b.id);
                return (
                  <button key={b.id} type="button" disabled={!q} className={`ac-tarjeta ac-boleto ${tipo === b.id ? 'elegido' : ''}`} onClick={() => setTipo(b.id)} aria-pressed={tipo === b.id}>
                    <span className="ac-marca">{tipo === b.id && <Check size={13} strokeWidth={3} />}</span>
                    {b.destacado && <span className="ac-chip ambar" style={{ width: 'fit-content', marginBottom: 4 }}>El más completo</span>}
                    <h3>{b.nombre}</h3>
                    <span className="ac-precio">{dinero(b.precio)}</span>
                    <span className="ac-suave" style={{ fontSize: 13 }}>{b.personas}</span>
                    <ul>{b.incluye.map((x) => <li key={x}><Check size={14} />{x}</li>)}</ul>
                    <span className={`ac-quedan ${q < 5 ? 'pocos' : ''}`} style={{ marginTop: 'auto', paddingTop: 8 }}>{q ? <>Quedan <b>{q}</b></> : <b>Agotado</b>}</span>
                  </button>
                );
              })}
            </div>
            <div className="ac-pegado">
              <span>{tipo ? <>{boleto(tipo).nombre}<b>{dinero(boleto(tipo).precio)}</b></> : <>Elige tu boleto<b>Desde {dinero(Math.min(...BOLETOS.map((b) => b.precio)))}</b></>}</span>
              <button type="button" className="ac-btn" disabled={!tipo} onClick={() => alComprar(funcion, tipo)}>Elegir mi lugar <ArrowRight size={17} /></button>
            </div>
          </section>
        )}
      </div>
      {avance && <Avance p={p} alCerrar={() => setAvance(false)} />}
    </div>
  );
}

// Lo que opina el público: una reacción por persona (se puede cambiar).
function Reacciones({ e, peli }) {
  const r = e.reacciones?.[peli];
  if (!r) return null;
  const mia = e.misReacciones?.[peli];
  const total = r.encanta + r.bien + r.no;
  const pct = total ? Math.round((r.encanta / total) * 100) : 0;
  const op = [['encanta', 'Me encantó', Heart], ['bien', 'Estuvo bien', ThumbsUp], ['no', 'No me gustó', ThumbsDown]];
  return (
    <div className="ac-reacciones">
      <p><b>{pct}%</b> le encantó · {total.toLocaleString('es-MX')} opiniones</p>
      <div>
        {op.map(([k, t, Icon]) => (
          <button key={k} type="button" className={`ac-chip contorno ${mia === k ? 'activo' : ''}`} onClick={() => reaccionar(peli, k)} aria-pressed={mia === k}>
            <Icon size={15} fill={mia === k && k === 'encanta' ? 'currentColor' : 'none'} /> {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function Avance({ p, alCerrar }) {
  const caja = useRef(null);
  useDialogo(caja, alCerrar);
  return enRaiz(
    <div className="ac-velo" onClick={alCerrar}>
      <div className="ac-ventana" ref={caja} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Avance">
        <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 18, overflow: 'hidden' }}>
          <Foto nombre={p.poster} texto={p.titulo} style={{ position: 'absolute', inset: 0 }} />
          <span className="ac-redondo vidrio" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 58, height: 58 }}><Play size={22} fill="currentColor" /></span>
        </div>
        <h2>{p.titulo}</h2>
        <p className="ac-suave" style={{ lineHeight: 1.55 }}>En el sitio real aquí se reproduce el avance oficial de la película (YouTube o video propio). En esta demostración las películas son de ejemplo.</p>
        <button type="button" className="ac-btn" onClick={alCerrar}>Cerrar</button>
      </div>
    </div>
  );
}

// ── compra ──────────────────────────────────────────────────────────────────
function Compra({ e, peli, funcion, tipo, alVolver, alListo }) {
  const p = PELICULAS[peli];
  const f = funcionPorId(e, funcion);
  const b = boleto(tipo);
  const [paso, setPaso] = useState(1);
  const [lugar, setLugar] = useState(null);
  const [datos, setDatos] = useState({ nombre: CLIENTE.nombre, telefono: '222 345 6789', tarjeta: '4242 4242 4242 4242', vence: '12/29', cvc: '123' });
  const [combo, setCombo] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState('');
  const cupon = tipo === 'auto' ? e.puntos.cupones.find((c) => !c.usado && c.recompensa === 'auto-gratis') : null;
  const [usarCupon, setUsarCupon] = useState(!!cupon);
  const conCupon = !!(cupon && usarCupon);
  const total = (conCupon ? 0 : b.precio) + (combo ? platillo('combo').precio : 0);
  const ganas = Math.floor((total / 10) * (1 + nivelDe(e.puntos.ganados).extra));

  // si otra persona (o la simulación) ganó el lugar mientras lo veías
  useEffect(() => {
    if (lugar && ventasDe(e, funcion).some((v) => v.lugar === lugar) && !pagando) {
      setLugar(null); setPaso(1); setError('Alguien acaba de comprar ese lugar. Escoge otro.');
    }
  }, [e, lugar, funcion, pagando]);

  const pagar = () => {
    if (datos.tarjeta.replace(/\s/g, '') === '4000000000000002') { setError('La tarjeta fue rechazada. Prueba con otra.'); return; }
    setError(''); setPagando(true);
    setTimeout(() => {
      const r = comprar({ funcion, tipo, lugar, nombre: datos.nombre, telefono: datos.telefono, combo, cupon: conCupon ? cupon.id : null });
      setPagando(false);
      if (!r.ok) { setLugar(null); setPaso(1); setError('Alguien acaba de comprar ese lugar. Escoge otro.'); return; }
      avisarListo(r.puntos ? `Listo: tu boleto está en Mis boletos · +${r.puntos} puntos` : 'Listo: tu boleto está en Mis boletos');
      alListo(r.codigo);
    }, 1600);
  };

  return (
    <div className="ac-envoltura" style={{ paddingTop: 22 }}>
      <button type="button" className="ac-volver" onClick={paso === 2 ? () => setPaso(1) : alVolver}>
        <span className="ac-redondo chico"><ArrowLeft size={16} /></span> {paso === 2 ? 'Cambiar lugar' : p.titulo}
      </button>
      <div className="ac-pasos-compra"><span className="hecho" /><span className={paso >= 2 ? 'hecho' : ''} /><span /></div>
      <div className="ac-compra">
        <div>
          {paso === 1 && (
            <>
              <h2>Escoge tu lugar</h2>
              <p className="ac-suave" style={{ marginBottom: 18 }}>
                Tu boleto <b style={{ color: 'var(--ac-texto)' }}>{b.nombre}</b> va en {b.zona === 'vip' ? 'la primera fila (A)' : b.zona === 'auto' ? 'las filas B a F' : b.zona === 'campana' ? 'las casas de campaña' : 'la zona peatonal'}.
              </p>
              {error && <p className="ac-chip rosa" style={{ marginBottom: 12, whiteSpace: 'normal' }}>{error}</p>}
              <Mapa e={e} funcion={funcion} zona={b.zona} elegido={lugar} alElegir={(l) => { setLugar(l); setError(''); }} />
            </>
          )}
          {paso === 2 && (
            <div style={{ display: 'grid', gap: 14 }}>
              <h2>Tus datos y pago</h2>
              <div className="ac-dos">
                <label className="ac-campo"><span>Nombre</span><input value={datos.nombre} onChange={(ev) => setDatos({ ...datos, nombre: ev.target.value })} /></label>
                <label className="ac-campo"><span>WhatsApp (te mandamos el boleto)</span><input value={datos.telefono} onChange={(ev) => setDatos({ ...datos, telefono: ev.target.value })} /></label>
              </div>
              {cupon && (
                <label className="ac-extra" style={{ borderStyle: 'dashed', borderColor: 'var(--ac-acento)' }}>
                  <input type="checkbox" checked={usarCupon} onChange={(ev) => setUsarCupon(ev.target.checked)} />
                  <span className="ac-redondo acento" style={{ width: 56, height: 56 }}><Gift size={22} /></span>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontWeight: 600 }}>Usar mi boleto de auto gratis</b>
                    <p className="ac-suave" style={{ fontSize: 13.5, marginTop: 3 }}>Lo canjeaste con tus Cocopuntos.</p>
                  </div>
                </label>
              )}
              <label className="ac-extra">
                <input type="checkbox" checked={combo} onChange={(ev) => setCombo(ev.target.checked)} />
                <Foto nombre="c-combo" texto="Combo" />
                <div style={{ flex: 1 }}>
                  <b style={{ fontWeight: 600 }}>Agrega el Combo Cocodrilo · {dinero(platillo('combo').precio)}</b>
                  <p className="ac-suave" style={{ fontSize: 13.5, marginTop: 3 }}>{platillo('combo').desc}. Te lo llevamos a tu lugar al llegar.</p>
                </div>
              </label>
              <div className="ac-tarjeta" style={{ padding: 20, display: 'grid', gap: 12 }}>
                <p className="ac-etiqueta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CreditCard size={15} /> Pago de prueba</p>
                <label className="ac-campo"><span>Número de tarjeta</span><input className="ac-mono" value={datos.tarjeta} onChange={(ev) => setDatos({ ...datos, tarjeta: ev.target.value })} /></label>
                <div className="ac-dos">
                  <label className="ac-campo"><span>Vence</span><input className="ac-mono" value={datos.vence} onChange={(ev) => setDatos({ ...datos, vence: ev.target.value })} /></label>
                  <label className="ac-campo"><span>CVC</span><input className="ac-mono" value={datos.cvc} onChange={(ev) => setDatos({ ...datos, cvc: ev.target.value })} /></label>
                </div>
                <p className="ac-suave" style={{ fontSize: 12.5 }}>Es una demostración: no se cobra nada. 4000 0000 0000 0002 simula una tarjeta rechazada.</p>
              </div>
              {error && <p className="ac-chip rosa" style={{ whiteSpace: 'normal' }}>{error}</p>}
            </div>
          )}
        </div>

        <aside className="ac-tarjeta ac-resumen">
          <div style={{ display: 'flex', gap: 14 }}>
            <Foto nombre={p.poster} texto={p.titulo} style={{ width: 64, aspectRatio: '2/3', borderRadius: 12, flexShrink: 0, fontSize: 9 }} />
            <div>
              <b className="ac-serif" style={{ fontSize: 24, lineHeight: 1 }}>{p.titulo}</b>
              <p className="ac-suave" style={{ fontSize: 13.5, marginTop: 6 }}>{diaCorto(f.t)} · {hora(f.t)}</p>
            </div>
          </div>
          <hr className="ac-sep" />
          <div className="ac-resumen-fila"><span>{b.nombre}</span><b>{conCupon ? <><s className="ac-suave" style={{ fontWeight: 400, marginRight: 6 }}>{dinero(b.precio)}</s>Gratis</> : dinero(b.precio)}</b></div>
          <div className="ac-resumen-fila"><span className="ac-suave">Lugar</span><b style={{ color: lugar ? 'var(--ac-acento)' : 'var(--ac-suave)' }}>{lugar ? nombreLugar(lugar) : 'Sin elegir'}</b></div>
          {combo && <div className="ac-resumen-fila"><span>Combo Cocodrilo</span><b>{dinero(platillo('combo').precio)}</b></div>}
          <hr className="ac-sep" />
          <div className="ac-resumen-fila" style={{ alignItems: 'baseline' }}><span>Total</span><span className="ac-resumen-total">{dinero(total)}</span></div>
          {ganas > 0 && <p className="ac-chip verde" style={{ justifySelf: 'start' }}><Gift size={14} /> Ganas {ganas} Cocopuntos</p>}
          {paso === 1
            ? <button type="button" className="ac-btn ancho" disabled={!lugar} onClick={() => setPaso(2)}>Continuar <ArrowRight size={17} /></button>
            : <button type="button" className="ac-btn ancho" disabled={!datos.nombre.trim()} onClick={pagar}>Pagar {dinero(total)}</button>}
        </aside>
      </div>
      {pagando && <Procesando texto="Procesando tu pago…" />}
    </div>
  );
}

function Procesando({ texto }) {
  const caja = useRef(null);
  useDialogo(caja, () => {});
  return enRaiz(
    <div className="ac-velo" role="dialog" aria-modal="true" aria-label={texto}>
      <div className="ac-ventana" ref={caja}><div className="ac-cargando"><div className="ac-rueda" /><b>{texto}</b></div></div>
    </div>
  );
}

// ── mis boletos ─────────────────────────────────────────────────────────────
function MisBoletos({ e, codigoInicial, alCartelera, alPedir }) {
  // boletos de película y entradas de solo Casa del Terror, en orden de fecha
  const pases = [
    ...misPases(e).map((v) => ({ casa: false, v, codigo: v.codigo, t: funcionPorId(e, v.funcion).t })),
    ...misCasa(e).map((c) => ({ casa: true, v: c, codigo: c.codigo, t: c.t })),
  ].sort((a, b) => a.t - b.t);
  const inicial = Math.max(0, pases.findIndex((x) => x.codigo === codigoInicial));
  const [activo, setActivo] = useState(inicial);
  const [wallet, setWallet] = useState(false);
  const [ayuda, setAyuda] = useState(null);
  const [trivia, setTrivia] = useState(null);
  const [cambio, setCambio] = useState(null);
  const carrete = useRef(null);

  // abre en el boleto recién comprado y sigue al que queda al centro
  useEffect(() => {
    const c = carrete.current, el = c?.children[inicial];
    if (el) c.scrollLeft = el.offsetLeft - (c.clientWidth - el.offsetWidth) / 2;
  }, [inicial]);
  const alDeslizar = () => {
    const c = carrete.current; if (!c) return;
    const centro = c.scrollLeft + c.clientWidth / 2;
    let mejor = 0, dist = Infinity;
    [...c.children].forEach((h, k) => { const d = Math.abs(h.offsetLeft + h.offsetWidth / 2 - centro); if (d < dist) { dist = d; mejor = k; } });
    if (mejor !== activo) setActivo(mejor);
  };

  if (!pases.length) {
    return (
      <div className="ac-envoltura" style={{ padding: '90px 16px', textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center' }}>
        <span className="ac-redondo" style={{ width: 68, height: 68 }}><Ticket size={28} /></span>
        <h1 style={{ fontSize: 30 }}>Aún no tienes <em>boletos</em></h1>
        <p className="ac-suave" style={{ maxWidth: 360, lineHeight: 1.5 }}>Cuando compres, aquí aparece tu boleto con QR, tu lugar y el botón para pedir comida a tu auto.</p>
        <button type="button" className="ac-btn acento" onClick={alCartelera}><Film size={18} /> Ver cartelera</button>
      </div>
    );
  }
  const sel = pases[Math.min(activo, pases.length - 1)];
  const v = sel.v;
  const poster = sel.casa ? 'terror-actor' : PELICULAS[funcionPorId(e, v.funcion).peli].poster;
  const avisos = sel.casa ? [] : avisosDe(e, v.funcion);
  const ordenes = sel.casa ? [] : ordenesDe(e, v.codigo);
  const hoy = pases.filter((x) => new Date(x.t).setHours(0, 0, 0, 0) === inicioDia(0)).length;

  return (
    <div className="ac-mis-portada">
      <div className="ac-ambiente" aria-hidden="true"><img key={poster} src={IMG(poster)} alt="" referrerPolicy="no-referrer" /></div>
      <div className="ac-envoltura">
        <div className="ac-mis-cab">
          <h1>Mis <em>boletos</em></h1>
          <p className="ac-suave">{pases.length} {pases.length === 1 ? 'boleto' : 'boletos'}{hoy ? ` · ${hoy} para hoy` : ''}</p>
          {climaDe(e, sel.t).lluvia > 0 && <span className={`ac-chip ${climaDe(e, sel.t).lluvia >= 50 ? 'rosa' : 'contorno'}`} style={{ margin: '4px auto 0', width: 'fit-content' }}><CloudRain size={14} /> {climaDe(e, sel.t).lluvia}% de lluvia {nombreDia(sel.t) === 'Hoy' ? 'esta noche' : nombreDia(sel.t).toLowerCase()}</span>}
        </div>
      </div>
      <div ref={carrete} className={`ac-carrete ${pases.length === 1 ? 'solo' : ''}`} onScroll={alDeslizar}>
        {pases.map((x, k) => x.casa
          ? <BoletoCasa key={x.codigo} c={x.v} lejos={k !== activo} />
          : <Boleto key={x.codigo} e={e} v={x.v} lejos={k !== activo} />)}
      </div>
      {pases.length > 1 && (
        <div className="ac-puntos" style={{ marginTop: -8, marginBottom: 18 }}>
          {pases.map((x, k) => <button key={x.codigo} type="button" className={k === activo ? 'activo' : ''} aria-label={`Boleto ${k + 1}`}
            onClick={() => { const c = carrete.current, el = c?.children[k]; if (el) c.scrollTo({ left: el.offsetLeft - (c.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' }); }} />)}
        </div>
      )}
      <div className="ac-envoltura">
        {!sel.casa && v.pendiente === 'lluvia' && (
          <div className="ac-lluvia">
            <span className="ac-redondo"><CloudRain size={20} /></span>
            <div>
              <b>Se canceló por lluvia</b>
              <p>Cambia tu fecha sin costo (te regalamos 100 Cocopuntos) o pide tu reembolso.</p>
              <div className="ac-lluvia-botones">
                <button type="button" className="ac-btn acento chico" onClick={() => setCambio(v.codigo)}><CalendarSync size={15} /> Cambiar de fecha</button>
                <button type="button" className="ac-btn fantasma chico" onClick={() => { pedirReembolso(v.codigo); avisarListo('Listo: el reembolso llega a tu tarjeta en 3 a 5 días'); }}>Reembolso</button>
              </div>
            </div>
          </div>
        )}
        {avisos.filter((a) => !(a.lluvia && v.pendiente === 'lluvia')).map((a) => <div key={a.id} className="ac-aviso-dueno"><Megaphone size={18} /><div><b>Aviso del autocinema</b><br />{a.texto}</div></div>)}
        {!sel.casa && v.reprogramado && <p className="ac-chip verde" style={{ margin: '0 auto 14px', display: 'flex', width: 'fit-content', whiteSpace: 'normal' }}><CalendarSync size={14} /> Cambiaste de fecha por lluvia · +100 Cocopuntos</p>}
        {!sel.casa && v.reembolso && <p className="ac-chip" style={{ margin: '0 auto 14px', display: 'flex', width: 'fit-content' }}>Reembolso en camino: {dinero(v.reembolso.total)} a tu tarjeta</p>}
        {!sel.casa && !v.pendiente && !v.reembolso && <TriviaTarjeta e={e} v={v} alJugar={() => setTrivia(v.codigo)} />}
        <div className="ac-mis-acciones">
          {!sel.casa && !v.pendiente && !v.reembolso && <button type="button" className="ac-btn ancho acento" onClick={() => alPedir(v.codigo)}><UtensilsCrossed size={18} /> Pedir comida a mi auto</button>}
          {!sel.casa && !v.pendiente && !v.reembolso && <button type="button" className="ac-btn ancho fantasma" onClick={() => setAyuda(v.codigo)}><Navigation size={18} /> Llegar a mi lugar · ayuda</button>}
          <button type="button" className="ac-btn fantasma ancho" onClick={() => setWallet(true)}><Wallet size={18} /> Agregar a Wallet</button>
        </div>
        <div className="ac-mis-abajo">
          {ordenes.map((o) => <Seguimiento key={o.id} o={o} />)}
          <div className="ac-tarjeta" style={{ padding: 22, display: 'grid', gap: 14 }}>
            <p className="ac-etiqueta">Al llegar</p>
            {[[Smartphone, 'Enseña tu QR en la entrada', 'Te escanean y te indican tu lugar.'],
              [Radio, 'Sintoniza la película', 'La frecuencia FM viene en la pantalla.'],
              [Clock, 'Llega 30 min antes', 'Para la Casa del Terror y escoger tu antojo.']].map(([Icon, t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span className="ac-redondo chico"><Icon size={16} /></span>
                <div><b style={{ fontSize: 15, fontWeight: 600 }}>{t}</b><p className="ac-suave" style={{ fontSize: 14, marginTop: 2 }}>{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {wallet && <AvisoWallet alCerrar={() => setWallet(false)} />}
      {ayuda && <AyudaLugar e={e} codigo={ayuda} alCerrar={() => setAyuda(null)} />}
      {trivia && <Trivia e={e} codigo={trivia} alCerrar={() => setTrivia(null)} />}
      {cambio && <CambiarFecha e={e} codigo={cambio} alCerrar={() => setCambio(null)} />}
    </div>
  );
}

// Cómo llegar a tu lugar dentro del autocinema + pedir ayuda al equipo (un
// acomodador, pasar corriente, sintonizar el audio). La Entrada la ve en vivo.
function AyudaLugar({ e, codigo, alCerrar }) {
  const caja = useRef(null);
  useDialogo(caja, alCerrar);
  const v = e.ventas.find((x) => x.codigo === codigo);
  const [zona, n] = v.lugar.split('-');
  const mias = e.ayuda.filter((a) => a.codigo === codigo && a.estado !== 'resuelta');
  const pasos = zona === 'P' ? ['Entra por la caseta y estaciónate en el área de visitantes', 'Camina hacia la pantalla: la zona peatonal está al frente', `Tu lugar es el ${n}, marcado en el piso`]
    : zona === 'T' ? ['Entra por la caseta y deja tu auto en el área de visitantes', 'Las casas de campaña están a la derecha de la pantalla', `La tuya es la número ${n}`]
    : ['Entra por la caseta con las luces bajas', `Sigue el carril central hasta la fila ${zona} (los letreros están en cada fila)`, `Tu lugar es el ${n}: ${Number(n) <= 5 ? 'del lado izquierdo' : 'del lado derecho'} viendo a la pantalla`];
  return enRaiz(
    <div className="ac-velo" onClick={alCerrar}>
      <div className="ac-ventana" ref={caja} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Llegar a mi lugar" style={{ width: 'min(620px, 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div><p className="ac-etiqueta">Tu lugar</p><h2 style={{ marginTop: 4 }}>{nombreLugar(v.lugar)}</h2></div>
          <button type="button" className="ac-redondo chico" onClick={alCerrar} aria-label="Cerrar"><X size={17} /></button>
        </div>
        <Mapa e={e} funcion={v.funcion} modo="ubicar" mio={v.lugar} />
        <ol className="ac-pasos-llegar">{pasos.map((t, k) => <li key={t}><span>{k + 1}</span>{t}</li>)}</ol>
        {mias.map((a) => (
          <div key={a.id} className="ac-aviso-dueno" style={{ margin: 0, maxWidth: 'none' }}>
            <LifeBuoy size={18} />
            <div><b>{a.estado === 'camino' ? 'Va en camino alguien del equipo' : 'Recibimos tu solicitud'}</b><br />{AYUDAS.find((x) => x.id === a.tipo).nombre} · {nombreLugar(a.lugar)}</div>
          </div>
        ))}
        <p className="ac-etiqueta">¿Necesitas ayuda?</p>
        <div className="ac-ayudas">
          {AYUDAS.map((a) => (
            <button key={a.id} type="button" className="ac-ayuda" disabled={mias.some((x) => x.tipo === a.id)}
              onClick={() => { pedirAyuda(codigo, a.id); avisarListo('Listo: el equipo ya lo vio'); }}>
              <b>{a.nombre}</b><span>{a.detalle}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// El boleto: el póster a sangre arriba que se funde con un cuerpo oscuro
// teñido de su color; tu lugar es lo más grande; perforación con muescas
// (medidas a la altura real de la línea) y talón con el QR.
function Boleto({ e, v, lejos }) {
  const f = funcionPorId(e, v.funcion);
  const p = PELICULAS[f.peli];
  const b = boleto(v.tipo);
  const tono = useTono(IMG(p.poster));
  const caja = useRef(null);
  const [corte, setCorte] = useState(440);
  useLayoutEffect(() => {
    const el = caja.current?.querySelector('.ac-ticket-perfora');
    if (el) setCorte(el.offsetTop);
  });
  const cupo = (b.personas.match(/\d+/) || ['—'])[0];
  const [zona] = v.lugar.split('-');
  return (
    <article ref={caja} className="ac-ticket" style={{ '--tono': tono, '--corte': `${corte}px`, opacity: lejos ? 0.5 : 1, transform: lejos ? 'scale(.93)' : 'none', filter: v.reembolso ? 'grayscale(1)' : undefined }}>
      <div className="ac-ticket-poster">
        <Foto nombre={p.poster} texto="" />
        <div className="ac-ticket-sello">
          <span className="ac-chip">{b.nombre}</span>
          <span className={`ac-chip ${v.entro ? 'listo' : ''}`} style={v.pendiente || v.reembolso ? { background: 'var(--ac-alerta)', color: '#fff' } : undefined}>{v.reembolso ? 'Reembolsado' : v.pendiente ? 'Cancelada por lluvia' : v.entro ? 'Ya adentro' : nombreDia(f.t)}</span>
        </div>
      </div>
      <div className="ac-ticket-cuerpo">
        <div>
          <p className="ac-cejilla">Autocinema Cocodrilo</p>
          <h2>{p.titulo}</h2>
        </div>
        <div className="ac-ticket-datos">
          <div><small>Día</small><b>{nombreDia(f.t) === 'Hoy' || nombreDia(f.t) === 'Mañana' ? nombreDia(f.t) : diaCorto(f.t).split(' ').slice(0, 2).join(' ')}</b></div>
          <div><small>Hora</small><b>{hora(f.t)}</b></div>
          <div><small>Personas</small><b>Hasta {cupo}</b></div>
        </div>
        <div className="ac-ticket-lugar">
          <div><small>Tu lugar</small><b>{nombreLugar(v.lugar)}</b></div>
          <i>{zona === 'P' ? <Smartphone size={20} /> : zona === 'T' ? <MapPin size={20} /> : <Car size={20} />}</i>
        </div>
      </div>
      <div className="ac-ticket-perfora" />
      <div className="ac-ticket-talon">
        <div className="ac-ticket-qr"><QRCodeSVG value={`ACC1.${v.codigo}`} size={84} bgColor="transparent" fgColor="currentColor" /></div>
        <div>
          <small>Código</small>
          <b>{v.codigo}</b>
          <span>A nombre de {v.nombre}. Enséñalo en la entrada.</span>
        </div>
      </div>
    </article>
  );
}

function BoletoCasa({ c, lejos }) {
  const tono = useTono(IMG('terror-actor'));
  const caja = useRef(null);
  const [corte, setCorte] = useState(440);
  useLayoutEffect(() => { const el = caja.current?.querySelector('.ac-ticket-perfora'); if (el) setCorte(el.offsetTop); });
  const tipo = CASA.tipos.find((x) => x.id === c.tipo);
  return (
    <article ref={caja} className="ac-ticket" style={{ '--tono': tono, '--corte': `${corte}px`, opacity: lejos ? 0.5 : 1, transform: lejos ? 'scale(.93)' : 'none' }}>
      <div className="ac-ticket-poster">
        <Foto nombre="terror-actor" texto="" />
        <div className="ac-ticket-sello">
          <span className="ac-chip">{tipo.nombre}</span>
          <span className={`ac-chip ${c.entro ? 'listo' : ''}`}>{c.entro ? 'Ya entraste' : nombreDia(c.t)}</span>
        </div>
      </div>
      <div className="ac-ticket-cuerpo">
        <div>
          <p className="ac-cejilla">{NEGOCIO.temporada}</p>
          <h2>Casa del Terror</h2>
        </div>
        <div className="ac-ticket-datos">
          <div><small>Día</small><b>{nombreDia(c.t) === 'Hoy' || nombreDia(c.t) === 'Mañana' ? nombreDia(c.t) : diaCorto(c.t).split(' ').slice(0, 2).join(' ')}</b></div>
          <div><small>Turno</small><b>{hora(c.t)}</b></div>
          <div><small>Personas</small><b>{c.personas}</b></div>
        </div>
        <div className="ac-ticket-lugar">
          <div><small>Entrada</small><b>{c.tipo === 'rapido' ? 'Sin fila' : 'General'}</b></div>
          <i><Ghost size={20} /></i>
        </div>
      </div>
      <div className="ac-ticket-perfora" />
      <div className="ac-ticket-talon">
        <div className="ac-ticket-qr"><QRCodeSVG value={`ACC1.${c.codigo}`} size={84} bgColor="transparent" fgColor="currentColor" /></div>
        <div>
          <small>Código</small>
          <b>{c.codigo}</b>
          <span>Llega 10 minutos antes de tu turno. Enséñalo en la entrada.</span>
        </div>
      </div>
    </article>
  );
}

// Tarjeta de la trivia en el boleto: invitación o tu resultado.
function TriviaTarjeta({ e, v, alJugar }) {
  const mia = e.trivia?.[v.codigo];
  const lugar = mia ? rankingTrivia(e, v.funcion).findIndex((r) => r.codigo === v.codigo) + 1 : 0;
  return (
    <button type="button" className="ac-trivia-tarjeta" onClick={mia ? undefined : alJugar} disabled={!!mia}>
      <span className="ac-redondo acento"><Brain size={20} /></span>
      <span style={{ flex: 1 }}>
        <b>{mia ? `Trivia: ${mia.aciertos} de 5${lugar > 0 ? ` · vas en el lugar ${lugar}` : ''}` : 'Trivia de esta noche'}</b>
        <span>{mia ? `Ganaste ${mia.aciertos * TRIVIA_PUNTOS} Cocopuntos. El ranking sale en la pantalla antes de la película.` : `5 preguntas · ${TRIVIA_PUNTOS} Cocopuntos por acierto · ranking en la pantalla`}</span>
      </span>
      {!mia && <ArrowRight size={18} />}
    </button>
  );
}

// La trivia a pantalla completa: una pregunta a la vez, cuenta regresiva en
// anillo, la respuesta correcta se ve al instante y avanza sola.
function Trivia({ e, codigo, alCerrar }) {
  const caja = useRef(null);
  useDialogo(caja, alCerrar);
  const v = e.ventas.find((x) => x.codigo === codigo);
  const f = funcionPorId(e, v.funcion);
  const p = PELICULAS[f.peli];
  const preguntas = useMemo(() => preguntasDe(f), [f]);
  const [paso, setPaso] = useState(-1);          // -1 portada · 0..4 preguntas · 5 final
  const [elegida, setElegida] = useState(null);
  const [resto, setResto] = useState(TRIVIA_SEGUNDOS);
  const [aciertos, setAciertos] = useState(0);
  const [puntaje, setPuntaje] = useState(0);
  const [lugar, setLugar] = useState(null);
  const q = preguntas[paso];

  useEffect(() => {
    if (paso < 0 || paso > 4 || elegida !== null) return;
    if (resto <= 0) { setElegida(-1); return; }
    const id = setTimeout(() => setResto((r) => +(r - 0.1).toFixed(1)), 100);
    return () => clearTimeout(id);
  }, [paso, resto, elegida]);
  useEffect(() => {
    if (elegida === null) return;
    const id = setTimeout(() => siguiente(), 1500);
    return () => clearTimeout(id);
  }, [elegida]); // eslint-disable-line react-hooks/exhaustive-deps

  const responder = (k) => {
    if (elegida !== null) return;
    setElegida(k);
    if (k === q.buena) { setAciertos((a) => a + 1); setPuntaje((n) => n + 100 + Math.round(resto * 10)); }
  };
  const siguiente = () => {
    if (paso >= 4) { setPaso(5); setLugar(terminarTrivia(codigo, aciertos, puntaje)); return; }
    setPaso((n) => n + 1); setElegida(null); setResto(TRIVIA_SEGUNDOS);
  };
  const R = 26, C = 2 * Math.PI * R;
  const total = rankingTrivia(e, v.funcion).length;

  return enRaiz(
    <div className="ac-trivia" role="dialog" aria-modal="true" aria-label="Trivia" ref={caja}>
      <div className="ac-ambiente" aria-hidden="true"><img src={IMG(p.poster)} alt="" referrerPolicy="no-referrer" /></div>
      <div className="ac-trivia-cab">
        <div className="ac-trivia-pasos">{preguntas.map((_, k) => <i key={k} className={k < paso || paso === 5 ? 'hecho' : k === paso ? 'ahora' : ''} />)}</div>
        <button type="button" className="ac-redondo chico vidrio" onClick={alCerrar} aria-label="Cerrar"><X size={17} /></button>
      </div>

      {paso === -1 && (
        <div className="ac-trivia-cuerpo">
          <span className="ac-redondo acento" style={{ width: 72, height: 72 }}><Brain size={32} /></span>
          <p className="ac-cejilla">Trivia de esta noche</p>
          <h2>{p.titulo}</h2>
          <p className="ac-suave" style={{ fontSize: 16, lineHeight: 1.5, maxWidth: 360 }}>5 preguntas, {TRIVIA_SEGUNDOS} segundos cada una. Ganas {TRIVIA_PUNTOS} Cocopuntos por acierto y mientras más rápido contestes, más subes en el ranking.</p>
          <button type="button" className="ac-btn acento" onClick={() => setPaso(0)}>Empezar</button>
          <p className="ac-suave" style={{ fontSize: 12.5 }}>En el sistema real se abre 30 minutos antes de la función.</p>
        </div>
      )}

      {q && paso <= 4 && (
        <div className="ac-trivia-cuerpo">
          <div className="ac-trivia-reloj" aria-label={`${Math.ceil(resto)} segundos`}>
            <svg viewBox="0 0 60 60"><circle cx="30" cy="30" r={R} className="pista" /><circle cx="30" cy="30" r={R} className="avance" strokeDasharray={C} strokeDashoffset={C * (1 - resto / TRIVIA_SEGUNDOS)} /></svg>
            <b>{Math.ceil(resto)}</b>
          </div>
          <p className="ac-cejilla">Pregunta {paso + 1} de 5</p>
          <h2 key={paso}>{q.pregunta}</h2>
          <div className="ac-trivia-opciones">
            {q.opciones.map((o, k) => {
              const estado = elegida === null ? '' : k === q.buena ? 'buena' : k === elegida ? 'mala' : 'apagada';
              return (
                <button key={o} type="button" className={`ac-trivia-op ${estado}`} onClick={() => responder(k)} disabled={elegida !== null}>
                  <span>{'ABCD'[k]}</span>{o}
                  {estado === 'buena' && <CircleCheck size={20} />}{estado === 'mala' && <CircleX size={20} />}
                </button>
              );
            })}
          </div>
          <p className={`ac-trivia-feedback ${elegida === null ? '' : elegida === q.buena ? 'si' : 'no'}`}>
            {elegida === null ? ' ' : elegida === q.buena ? `¡Correcto! +${TRIVIA_PUNTOS} Cocopuntos` : elegida === -1 ? 'Se acabó el tiempo' : 'Casi. La buena está en verde'}
          </p>
        </div>
      )}

      {paso === 5 && (
        <div className="ac-trivia-cuerpo">
          <p className="ac-cejilla">Tu resultado</p>
          <div className="ac-trivia-final"><b>{aciertos}</b><span>de 5</span></div>
          <h2>{aciertos >= 4 ? '¡Eres de primera fila!' : aciertos >= 2 ? '¡Muy bien!' : 'La próxima te va mejor'}</h2>
          <div className="ac-resumen-pts" style={{ maxWidth: 420 }}>
            <div><small>Cocopuntos</small><b>+{aciertos * TRIVIA_PUNTOS}</b></div>
            <div><small>Puntaje</small><b>{puntaje.toLocaleString('es-MX')}</b></div>
            <div><small>Ranking</small><b>{lugar ? `${lugar}° de ${total}` : '—'}</b></div>
          </div>
          <p className="ac-suave" style={{ fontSize: 14.5 }}>El ranking de la noche sale en la pantalla gigante antes de la película.</p>
          <button type="button" className="ac-btn" onClick={alCerrar}>Listo</button>
        </div>
      )}
    </div>
  );
}

// Cambiar de fecha por lluvia: funciones que siguen, con el lugar que te toca
// (el mismo si está libre; si no, el más parecido de tu zona).
function CambiarFecha({ e, codigo, alCerrar }) {
  const caja = useRef(null);
  useDialogo(caja, alCerrar);
  const v = e.ventas.find((x) => x.codigo === codigo);
  const fv = funcionPorId(e, v.funcion);
  const opciones = e.funciones.filter((f) => f.t > Date.now() && !f.cancelada && f.id !== v.funcion)
    .sort((a, b) => (b.peli === fv.peli) - (a.peli === fv.peli) || a.t - b.t).slice(0, 8);
  const [elegida, setElegida] = useState(opciones[0]?.id);
  const lugar = elegida ? lugarParecido(e, elegida, v.lugar, v.tipo) : null;
  const confirmar = () => {
    const r = cambiarFecha(codigo, elegida);
    if (r.ok) { avisarListo(`Listo: ${nombreLugar(r.lugar)} · +100 Cocopuntos`); alCerrar(); }
    else if (r.motivo === 'ya-cambiado') { avisarListo('Este boleto ya se cambió de fecha'); alCerrar(); }
  };
  return enRaiz(
    <div className="ac-velo" onClick={alCerrar}>
      <div className="ac-ventana" ref={caja} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Cambiar de fecha" style={{ width: 'min(560px, 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div><p className="ac-etiqueta">Sin costo · +100 Cocopuntos</p><h2 style={{ marginTop: 4 }}>Elige tu nueva fecha</h2></div>
          <button type="button" className="ac-redondo chico" onClick={alCerrar} aria-label="Cerrar"><X size={17} /></button>
        </div>
        <div className="ac-opciones-fecha">
          {opciones.map((f) => {
            const p = PELICULAS[f.peli];
            const ll = climaDe(e, f.t).lluvia;
            return (
              <button key={f.id} type="button" className={`ac-opcion-fecha ${elegida === f.id ? 'activo' : ''}`} onClick={() => setElegida(f.id)} aria-pressed={elegida === f.id}>
                <Foto nombre={p.poster} texto="" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>{p.titulo}</b>
                  <span>{nombreDia(f.t)} {new Date(f.t).getDate()} · {hora(f.t)}{f.peli === fv.peli ? ' · la misma película' : ''}</span>
                </span>
                {ll >= 40 && <span className="ac-chip rosa" style={{ padding: '3px 8px', fontSize: 11.5 }}><CloudRain size={12} /> {ll}%</span>}
              </button>
            );
          })}
        </div>
        {lugar && <div className="ac-pase-lugar"><span className="ac-etiqueta">Tu lugar será</span><b>{nombreLugar(lugar)}</b></div>}
        <button type="button" className="ac-btn acento" disabled={!lugar} onClick={confirmar}>Cambiar mi boleto</button>
      </div>
    </div>
  );
}

function AvisoWallet({ alCerrar }) {
  const caja = useRef(null);
  useDialogo(caja, alCerrar);
  return enRaiz(
    <div className="ac-velo" onClick={alCerrar}>
      <div className="ac-ventana" ref={caja} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true">
        <h2>Apple Wallet y Google Wallet</h2>
        <p className="ac-suave" style={{ lineHeight: 1.55 }}>En el sistema real el boleto se guarda en la cartera del celular con tu lugar y la hora, y te avisa cuando estás llegando al autocinema. En esta demostración se queda aquí.</p>
        <button type="button" className="ac-btn" onClick={alCerrar}>Entendido</button>
      </div>
    </div>
  );
}

function Seguimiento({ o }) {
  useAhora(15000);
  const i = ESTADOS_ORDEN.findIndex(([k]) => k === o.estado);
  if (o.estado === 'cancelado') {
    return (
      <div className="ac-tarjeta ac-seguimiento">
        <b className="ac-serif" style={{ fontSize: 22 }}>Pedido #{o.numero}</b>
        <p className="ac-suave" style={{ fontSize: 13.5, marginTop: 4 }}>Cancelado · {o.enBoleto ? 'venía con tu boleto, entra en el mismo reembolso' : `${dinero(o.total)} incluido en tu reembolso`}</p>
      </div>
    );
  }
  return (
    <div className="ac-tarjeta ac-seguimiento">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
        <b className="ac-serif" style={{ fontSize: 26 }}>Pedido #{o.numero}</b>
        <span className="ac-suave" style={{ fontSize: 13 }}>hace {minutos(o.t)} min</span>
      </div>
      <p className="ac-suave" style={{ fontSize: 13.5, marginTop: 4 }}>
        {o.estado === 'programado'
          ? (o.para === 'llegada' ? 'Programado: lo preparamos en cuanto escaneen tu boleto' : `Programado: listo en tu lugar a las ${hora(o.para)}`)
          : `Va a ${nombreLugar(o.lugar)}${o.llego ? ' · lo empezamos al llegar' : ''}`}
      </p>
      <div className="ac-pasos-orden">
        {ESTADOS_ORDEN.map(([k, t], j) => <div key={k} className={`${j <= i ? 'hecho' : ''} ${j === i && k !== 'entregado' ? 'ahora' : ''}`}><i />{t}</div>)}
      </div>
      <p style={{ fontSize: 13.5 }}>{o.items.map(([pid, q]) => `${q}× ${platillo(pid).nombre}`).join(' · ')} — <b>{dinero(o.total)}</b></p>
    </div>
  );
}

// ── Cocopuntos ──────────────────────────────────────────────────────────────
function Puntos({ e, alPase, alCartelera }) {
  const pz = e.puntos;
  const nivel = nivelDe(pz.ganados);
  const sig = siguienteNivel(pz.ganados);
  const avance = sig ? (pz.ganados - nivel.desde) / (sig.desde - nivel.desde) : 1;
  const pases = misPases(e).filter((v) => funcionPorId(e, v.funcion).t + 3 * 3600000 > Date.now());
  const [confirmar, setConfirmar] = useState(null);
  const cupones = pz.cupones.filter((c) => !c.usado);

  return (
    <div className="ac-mis-portada">
      <div className="ac-ambiente" aria-hidden="true"><img src={IMG('fila-autos')} alt="" /></div>
      <div className="ac-envoltura">
        <div className="ac-perfil">
          <div className="ac-perfil-quien">
            <span className="ac-avatar">{CLIENTE.iniciales}</span>
            <div>
              <h1>{CLIENTE.nombre}</h1>
              <p className="ac-suave">Socia {nivel.nombre} desde {CLIENTE.desde}</p>
            </div>
          </div>

          <div className="ac-qr-cliente">
            <div className="ac-qr-cliente-codigo"><QRCodeSVG value={`ACS1.${CLIENTE.codigo}`} size={196} bgColor="transparent" fgColor="currentColor" /></div>
            <b>{CLIENTE.codigo}</b>
            <p>Enséñalo al pagar en taquilla o en la fuente de sodas y suma puntos también en lo que compras aquí.</p>
          </div>

          <div className="ac-tarjeta ac-resumen-pts">
            <div><small>Tus puntos</small><b>{pz.saldo.toLocaleString('es-MX')}</b></div>
            <div><small>Nivel</small><b>{nivel.nombre}</b></div>
            <div><small>{sig ? `Para ${sig.nombre}` : 'Nivel máximo'}</small><b>{sig ? (sig.desde - pz.ganados).toLocaleString('es-MX') : '—'}</b></div>
            <div className="ac-resumen-pts-barra"><i style={{ width: `${Math.max(3, avance * 100)}%` }} /></div>
            <p>{nivel.beneficio}{sig ? ` · en ${sig.nombre}: ${sig.beneficio.toLowerCase()}` : ''}</p>
          </div>

          {cupones.map((c) => (
            <button key={c.id} type="button" className="ac-cupon" onClick={alCartelera}>
              <span className="ac-redondo acento chico"><Gift size={17} /></span>
              <span style={{ flex: 1 }}><b style={{ fontWeight: 600, display: 'block' }}>{c.nombre}</b><span className="ac-suave" style={{ fontSize: 13 }}>Se aplica solo en tu siguiente boleto de Auto</span></span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>

        <section className="ac-seccion" style={{ paddingTop: 40 }}>
          <div className="ac-tarjeta ac-ganar">
            <div><span className="ac-redondo chico"><Ticket size={17} /></span><span><b>1 punto por cada $10</b>en boletos y comida</span></div>
            <div><span className="ac-redondo chico"><Car size={17} /></span><span><b>+50 por visita</b>cuando escanean tu boleto</span></div>
            <div><span className="ac-redondo chico"><Trophy size={17} /></span><span><b>Retos de temporada</b>con puntos extra</span></div>
          </div>
        </section>

        <section className="ac-seccion" style={{ paddingTop: 36 }}>
          <div className="ac-seccion-cab"><h2>Retos <em>de {NEGOCIO.temporada}</em></h2></div>
          <div className="ac-fila">
            {RETOS.map((r) => {
              const hecho = pz.retos.includes(r.id);
              const pr = Math.min(r.meta, progresoReto(e, r));
              return (
                <article key={r.id} className="ac-reto">
                  <Foto nombre={r.foto} texto="" />
                  <span className={`ac-chip ${hecho ? 'verde' : 'ambar'}`} style={hecho ? { background: 'var(--ac-acento)', color: 'var(--ac-acento-texto)' } : undefined}>{hecho ? <><Check size={13} /> Cumplido</> : `+${r.premio} pts`}</span>
                  <div>
                    <h3>{r.nombre}</h3>
                    <p>{r.detalle}</p>
                    <div className="ac-reto-barra"><span><i style={{ width: `${Math.max(4, (pr / r.meta) * 100)}%` }} /></span>{pr} de {r.meta}</div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="ac-seccion" style={{ paddingTop: 36 }}>
          <div className="ac-seccion-cab"><h2>Canjea <em>tus puntos</em></h2></div>
          <div className="ac-fila">
            {RECOMPENSAS.map((r) => {
              const falta = r.costo - pz.saldo;
              return (
                <button key={r.id} type="button" className="ac-tarjeta ac-premio" disabled={falta > 0} onClick={() => setConfirmar(r)} style={{ position: 'relative' }}>
                  <Foto nombre={r.foto} texto={r.nombre} />
                  <span className="ac-chip ambar">{r.costo.toLocaleString('es-MX')} pts</span>
                  <div><b>{r.nombre}</b><small>{falta > 0 ? `Te faltan ${falta.toLocaleString('es-MX')}` : 'Toca para canjear'}</small></div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="ac-seccion" style={{ paddingTop: 36 }}>
          <div className="ac-seccion-cab"><h2>Movimientos</h2></div>
          <div className="ac-tarjeta ac-movs">
            {pz.movs.slice(0, 10).map((m) => (
              <div key={m.id} className="ac-mov">
                <span>{m.texto}<span className="ac-suave" style={{ display: 'block', fontSize: 12.5 }}>{diaCorto(m.t)}</span></span>
                <b className={m.pts > 0 ? 'mas' : ''}>{m.pts > 0 ? '+' : ''}{m.pts.toLocaleString('es-MX')}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
      {confirmar && <Canje r={confirmar} pases={pases} e={e} alCerrar={() => setConfirmar(null)} alPase={alPase} />}
    </div>
  );
}

function Canje({ r, e, pases, alCerrar, alPase }) {
  const caja = useRef(null);
  useDialogo(caja, alCerrar);
  const [codigo, setCodigo] = useState(pases[0]?.codigo || '');
  const comida = r.tipo === 'comida';
  const listo = () => {
    const res = canjear(r.id, codigo);
    if (!res.ok) return;
    avisarListo(comida ? `${r.nombre} va a tu lugar` : 'Cupón listo para tu siguiente boleto');
    alCerrar();
    if (comida) alPase(codigo);
  };
  return enRaiz(
    <div className="ac-velo" onClick={alCerrar}>
      <div className="ac-ventana" ref={caja} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Canjear ${r.nombre}`}>
        <Foto nombre={r.foto} texto={r.nombre} style={{ aspectRatio: '16/9', borderRadius: 20 }} />
        <h2>Canjear {r.nombre}</h2>
        <p className="ac-suave">Se descuentan <b style={{ color: 'var(--ac-texto)' }}>{r.costo.toLocaleString('es-MX')} puntos</b> de tu saldo.</p>
        {comida && (pases.length ? (
          <label className="ac-campo"><span>¿A qué lugar te lo llevamos?</span>
            <select value={codigo} onChange={(ev) => setCodigo(ev.target.value)}>
              {pases.map((x) => { const f = funcionPorId(e, x.funcion); return <option key={x.codigo} value={x.codigo}>{PELICULAS[f.peli].titulo} · {nombreDia(f.t)} {hora(f.t)} · {nombreLugar(x.lugar)}</option>; })}
            </select>
          </label>
        ) : <p className="ac-chip rosa" style={{ whiteSpace: 'normal' }}>Necesitas un boleto para que te lo llevemos a tu lugar.</p>)}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="ac-btn fantasma" onClick={alCerrar}>Cancelar</button>
          <button type="button" className="ac-btn acento" disabled={comida && !pases.length} onClick={listo}>Canjear</button>
        </div>
      </div>
    </div>
  );
}

// ── menú ────────────────────────────────────────────────────────────────────
function Menu({ e, codigoInicial, alPedido, alCartelera }) {
  const pases = misPases(e);
  const cats = useMemo(() => [...new Set(MENU.map((m) => m.cat))], []);
  const [cat, setCat] = useState(cats[0]);
  const [carrito, setCarrito] = useState({});
  const [abierto, setAbierto] = useState(false);
  const piezas = Object.values(carrito).reduce((n, q) => n + q, 0);
  const total = Object.entries(carrito).reduce((n, [pid, q]) => n + platillo(pid).precio * q, 0);
  const cambiar = (pid, d) => setCarrito((c) => { const q = Math.max(0, (c[pid] || 0) + d); const n = { ...c, [pid]: q }; if (!q) delete n[pid]; return n; });
  // ¿alcanza el inventario para uno más de este platillo, junto con lo que ya llevas?
  const cabeUno = (pid) => alcanza(e, Object.entries({ ...carrito, [pid]: (carrito[pid] || 0) + 1 }));

  return (
    <div className="ac-envoltura" style={{ paddingBottom: 120 }}>
      <section className="ac-seccion" style={{ paddingTop: 30 }}>
        <div className="ac-seccion-cab">
          <div>
            <p className="ac-cejilla" style={{ marginBottom: 10 }}>Te lo llevamos a tu lugar</p>
            <h2>Fuente <em>de sodas</em></h2>
          </div>
        </div>
        <div className="ac-cats">{cats.map((c) => <button key={c} type="button" className={`ac-chip ${cat === c ? 'activo' : ''}`} style={{ padding: '9px 16px', fontSize: 14 }} onClick={() => setCat(c)}>{c}</button>)}</div>
        <div className="ac-platillos">
          {MENU.filter((m) => m.cat === cat).map((m) => (
            <div key={m.id} className="ac-tarjeta ac-platillo">
              <Foto nombre={m.foto} texto={m.nombre} />
              <div className="ac-platillo-info">
                <h3>{m.nombre} {m.estrella && <span className="ac-chip ambar" style={{ marginLeft: 4, padding: '3px 9px', fontSize: 11.5 }}>Favorito</span>}{!disponible(e, m.id) && <span className="ac-chip rosa" style={{ marginLeft: 4, padding: '3px 9px', fontSize: 11.5 }}>Agotado</span>}</h3>
                <p>{m.desc}</p>
                <div className="ac-platillo-pie">
                  <b>{dinero(m.precio)}</b>
                  {carrito[m.id]
                    ? <span className="ac-cant"><button type="button" onClick={() => cambiar(m.id, -1)} aria-label="Quitar"><Minus size={15} /></button><span>{carrito[m.id]}</span><button type="button" className="mas" disabled={!cabeUno(m.id)} style={{ opacity: cabeUno(m.id) ? 1 : 0.35 }} onClick={() => cambiar(m.id, 1)} aria-label="Agregar"><Plus size={15} /></button></span>
                    : <button type="button" className="ac-redondo chico" disabled={!cabeUno(m.id)} style={{ opacity: cabeUno(m.id) ? 1 : 0.35 }} onClick={() => cambiar(m.id, 1)} aria-label={`Agregar ${m.nombre}`}><Plus size={17} /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      {piezas > 0 && (
        <div className="ac-carrito">
          <span style={{ flex: 1 }}>{piezas} {piezas === 1 ? 'producto' : 'productos'} · <b>{dinero(total)}</b></span>
          <button type="button" className="ac-btn" onClick={() => setAbierto(true)}>Pedir a mi auto</button>
        </div>
      )}
      {abierto && <Pagar pases={pases} e={e} codigoInicial={codigoInicial} carrito={carrito} total={total} alCerrar={() => setAbierto(false)} alCartelera={alCartelera}
        alListo={(codigo, pts, cuando) => { setCarrito({}); setAbierto(false); avisarListo(`${cuando === 'ahora' ? 'Pedido recibido: va a tu lugar' : 'Pedido programado'}${pts ? ` · +${pts} puntos` : ''}`); alPedido(codigo); }} />}
    </div>
  );
}

function Pagar({ e, pases, codigoInicial, carrito, total, alCerrar, alListo, alCartelera }) {
  const caja = useRef(null);
  useDialogo(caja, alCerrar);
  const [codigo, setCodigo] = useState(codigoInicial || pases[0]?.codigo || '');
  const [pagando, setPagando] = useState(false);
  const [cuando, setCuando] = useState('ahora');
  const [falta, setFalta] = useState(false);
  const v = pases.find((x) => x.codigo === codigo);
  const f = v && funcionPorId(e, v.funcion);
  // horas para programar: de una hora antes de la función a hora y media después
  const horas = f ? Array.from({ length: 6 }, (_, k) => f.t - 3600000 + k * 1800000).filter((t) => t > Date.now() + 10 * 60000) : [];
  const hhmm = (t) => { const x = new Date(t); return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };
  const enviar = () => {
    setPagando(true);
    setTimeout(() => {
      const r = pedir(codigo, Object.entries(carrito), cuando);
      if (!r?.ok) { setPagando(false); setFalta(true); return; }
      alListo(codigo, r.puntos || 0, cuando);
    }, 1300);
  };
  return enRaiz(
    <div className="ac-velo" onClick={alCerrar}>
      <div className="ac-ventana" ref={caja} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Pedir a mi auto">
        {pagando ? <div className="ac-cargando"><div className="ac-rueda" /><b>Mandando tu pedido a cocina…</b></div> : (<>
          <h2>¿A qué lugar te lo llevamos?</h2>
          {pases.length ? (<>
            <label className="ac-campo"><span>Tu boleto</span>
              <select value={codigo} onChange={(ev) => setCodigo(ev.target.value)}>
                {pases.map((x) => { const f = funcionPorId(e, x.funcion); return <option key={x.codigo} value={x.codigo}>{PELICULAS[f.peli].titulo} · {diaCorto(f.t)} {hora(f.t)} · {nombreLugar(x.lugar)}</option>; })}
              </select>
            </label>
            {v && <div className="ac-pase-lugar" style={{ display: 'flex' }}><span className="ac-etiqueta">Entregamos en</span><b>{nombreLugar(v.lugar)}</b></div>}
            <div className="ac-bloque" style={{ marginTop: 0 }}>
              <p className="ac-etiqueta">¿Cuándo lo quieres?</p>
              <div className="ac-horas">
                <button type="button" className={`ac-hora-btn ${cuando === 'ahora' ? 'activo' : ''}`} onClick={() => setCuando('ahora')}>Ahora</button>
                {!v?.entro && <button type="button" className={`ac-hora-btn ${cuando === 'llegada' ? 'activo' : ''}`} onClick={() => setCuando('llegada')}>Listo al llegar</button>}
                {horas.map((t) => <button key={t} type="button" className={`ac-hora-btn ${cuando === hhmm(t) ? 'activo' : ''}`} onClick={() => setCuando(hhmm(t))}>{hora(t)}</button>)}
              </div>
              <p className="ac-suave" style={{ fontSize: 13 }}>{cuando === 'llegada' ? 'Lo empezamos a preparar en cuanto escaneen tu boleto en la entrada.' : cuando === 'ahora' ? 'Ya no tienes que escribir el código de tu auto: tu boleto le dice a cocina dónde estás.' : 'Lo tenemos listo en tu lugar a esa hora.'}</p>
            </div>
            <div className="ac-resumen-fila" style={{ alignItems: 'baseline' }}><span>Total (pago de prueba)</span><span className="ac-resumen-total">{dinero(total)}</span></div>
            {falta && <p className="ac-chip rosa" style={{ whiteSpace: 'normal' }}>Se acaba de terminar algo de tu pedido en la cocina. Quita un producto e inténtalo de nuevo.</p>}
            <button type="button" className="ac-btn" onClick={enviar} disabled={!v}>Pagar y pedir</button>
          </>) : (<>
            <p className="ac-suave" style={{ lineHeight: 1.55 }}>Para llevarte la comida a tu lugar necesitas un boleto. Compra uno y desde tu pase podrás pedir a tu lugar.</p>
            <button type="button" className="ac-btn" onClick={alCartelera}><Ticket size={18} /> Comprar boleto</button>
          </>)}
        </>)}
      </div>
    </div>
  );
}
