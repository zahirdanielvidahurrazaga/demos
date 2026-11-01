import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Recorrido from './Recorrido';
import Toma from './Toma';
import { Palabras, Rotulo } from './Palabras';
import { FACHADA, FACHADA_FOTO } from './fachada';
import { useInmersion } from './inmersion';
import {
  AMENIDADES, ESTADOS, HORAS, IMG, TIPOS, TOMAS, TORRE, TRAYECTOS, UNIDADES,
  archivoVisita, diasDeVisita, dinero, dineroCorto, tipo,
} from './datos';
import './realestate.css';

// ─────────────────────────────────────────────────────────────────────────────
// THE HALDEN — /realestate/halden (31-oct-2026)
//
// Landing de desarrollo inmobiliario para vender en EE.UU. (la enseña el primo
// de Zahir en New Jersey). Referencia: reel de momo.scrolls (web de un edificio
// con recorrido que avanza con el scroll). Concepto propio: torre ficticia en
// el waterfront de Jersey City con Manhattan enfrente.
//
// Va en inglés y SIN marca KaiZen (marca blanca). Orden: recorrido (lienzo
// pegado, `Recorrido.jsx`) → cifras → residencias con plano → disponibilidad
// (la torre piso por piso) → amenidades → barrio → agenda tu visita → pie.
// Sin base de datos: la visita agendada solo vive en la pantalla.
// ─────────────────────────────────────────────────────────────────────────────

const ENLACES = [
  ['residences', 'Residences'],
  ['availability', 'Availability'],
  ['amenities', 'Amenities'],
  ['neighborhood', 'Neighborhood'],
];

function Logo() {
  return <span className="re-logo">The <b>Halden</b></span>;
}

// Pantalla de carga: tres columnas con un degradado, el % de
// la primera pasada del recorrido y, al llegar a 100, las tres columnas suben
// una tras otra y destapan el pasillo. Mínimo 0.9 s para que se lea; si algo
// se atora, suelta a los 9 s. La página no se mueve mientras está.
function Carga({ avance, onFin }) {
  const [minimo, setMinimo] = useState(false);
  const [atorada, setAtorada] = useState(false);
  const fuera = atorada || (avance >= 1 && minimo);
  useEffect(() => {
    const a = setTimeout(() => setMinimo(true), 900);
    const b = setTimeout(() => setAtorada(true), 9000);
    document.documentElement.style.overflow = 'hidden';
    return () => { clearTimeout(a); clearTimeout(b); document.documentElement.style.overflow = ''; };
  }, []);
  useEffect(() => {
    if (!fuera) return undefined;
    const t = setTimeout(onFin, 1500);
    return () => clearTimeout(t);
  }, [fuera, onFin]);
  return (
    <div className={`re-carga ${fuera ? 'fuera' : ''}`} aria-hidden>
      <i /><i /><i />
      <span className="re-carga-txt">Loading</span>
      <span className="re-carga-n">{Math.round((fuera ? 1 : avance) * 100)}%</span>
    </div>
  );
}

function Encabezado({ onReservar, lista }) {
  const [solido, setSolido] = useState(false);
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    const revisar = () => {
      // claro sobre las láminas de piedra; transparente sobre las de noche
      // (recorrido, amenidades, pie): mira qué hay debajo de él
      const debajo = document.elementsFromPoint(window.innerWidth / 2, 72).find((el) => !el.closest('.re-cab'));
      setSolido(!!debajo && !debajo.closest('.re-viaje, .re-edificio, .re-amen, .re-pie'));
    };
    revisar();
    window.addEventListener('scroll', revisar, { passive: true });
    return () => window.removeEventListener('scroll', revisar);
  }, [lista]); // al irse la carga hay que volver a mirar qué quedó debajo
  return (
    <header className={`re-cab ${solido ? 'solido' : ''} ${abierto ? 'abierto' : ''}`}>
      <a href="#top" onClick={() => setAbierto(false)}><Logo /></a>
      <nav>
        {ENLACES.map(([id, t]) => <a key={id} href={`#${id}`} onClick={() => setAbierto(false)}>{t}</a>)}
      </nav>
      <button type="button" className="re-btn chico" onClick={() => { setAbierto(false); onReservar(); }}>Book a tour</button>
      <button type="button" className="re-menu" aria-label="Menu" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
        <span /><span />
      </button>
    </header>
  );
}

function Cifras() {
  const cifras = [
    [TORRE.pisos, 'stories on the Hudson', true],
    [TORRE.residencias, 'residences', true],
    [5, 'minutes to the World Trade Center', true],
    ['2027', 'first move-ins, fall'],
  ];
  return (
    <section className="re-cifras re-panel">
      <p className="re-intro re-revela">
        <Palabras>A residential tower built around a single idea:</Palabras> <em><Palabras>the view is the home.</Palabras></em>{' '}
        <Palabras>Every plan opens to the water, every corner turns to glass.</Palabras>
      </p>
      <dl>
        {cifras.map(([n, t, cuenta]) => (<div key={t}><dt data-n={cuenta ? n : undefined}>{n}</dt><dd>{t}</dd></div>))}
      </dl>
    </section>
  );
}

// El edificio de la tarde a la noche: la misma foto (Codex, la noche hecha
// A PARTIR del atardecer para que todo coincida) y con el scroll la noche
// baja como una cortina de luz: primero el cielo, luego las ventanas de
// arriba abajo (--re-noche-a en inmersion.js mueve la máscara). Encimarlas
// parejas al 50% se veía suave.
function Edificio() {
  return (
    <section className="re-edificio" aria-label="The building from dusk to night">
      <div className="re-edificio-pegado">
        <img src={`${IMG}/edificio-atardecer.webp`} alt="The Halden at golden hour" />
        <img src={`${IMG}/edificio-noche.webp`} alt="" className="noche" />
        <div className="re-edificio-txt">
          <p className="re-sobre">Architecture</p>
          <h2>Quiet by day, <em>glowing by night.</em></h2>
        </div>
      </div>
    </section>
  );
}

// ── Plano esquemático ───────────────────────────────────────────────────────
function Plano({ t }) {
  return (
    <svg className="re-plano" viewBox="-4 -4 108 72" role="img" aria-label={`${t.nombre} floor plan`}>
      {t.cuartos.map((c) => {
        const r = c.curva ? 12 : 0;
        // la esquina de cristal redondeada va arriba a la izquierda
        const d = `M${c.x + r} ${c.y} H${c.x + c.w} V${c.y + c.h} H${c.x} V${c.y + r} ${r ? `Q${c.x} ${c.y} ${c.x + r} ${c.y}` : ''} Z`;
        return (
          <g key={c.t}>
            <path d={d} className={c.curva ? 'vidrio' : ''} />
            <text x={c.x + c.w / 2} y={c.y + c.h / 2} textAnchor="middle" dominantBaseline="middle">{c.t}</text>
          </g>
        );
      })}
      <path d="M13 -2 Q-2 -2 -2 13" className="ventanal" />
    </svg>
  );
}

// Cada tipo enseña una escena distinta en bucle (clips/ en public): la
// recámara de frente y hacia la ventana, la cocina, la sala y, el penthouse,
// el edificio de noche. Antes casi todos eran la sala y se sentía repetido.
const TOMA_TIPO = { studio: 'res-studio', '1br': 'res-1br', '2br': 'res-2br', '3br': 'res-3br', ph: null };

function Residencias({ onVerDisponibles }) {
  const [id, setId] = useState('2br');
  const t = tipo(id);
  const libres = UNIDADES.filter((u) => u.tipo === id && u.estado === 'disponible').length;
  return (
    <section id="residences" className="re-sec re-res" data-par>
      <header className="re-sec-cab">
        <Rotulo tipo="sube">Residences</Rotulo>
        <h2 className="re-revela"><Palabras>Studios to</Palabras> <em><Palabras>full-floor penthouses</Palabras></em></h2>
      </header>
      <div className="re-pestanas" role="tablist">
        {TIPOS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === id} className={x.id === id ? 'activa' : ''} onClick={() => setId(x.id)}>
            {x.nombre}
          </button>
        ))}
      </div>
      <div className="re-res-cuerpo" key={id}>
        <figure className="re-res-foto re-descubre">
          {TOMA_TIPO[id] ? <Toma clip={TOMA_TIPO[id]} /> : <Toma foto="edificio-noche" />}
        </figure>
        <div className="re-res-ficha">
          <Plano t={t} />
          <dl className="re-datos">
            <div><dt>Bedrooms</dt><dd>{t.recamaras || 'Studio'}</dd></div>
            <div><dt>Baths</dt><dd>{t.banos}</dd></div>
            <div><dt>Interior</dt><dd>{t.ft[0].toLocaleString()}–{t.ft[1].toLocaleString()} sq ft</dd></div>
            <div><dt>From</dt><dd>{dinero(t.desde)}</dd></div>
          </dl>
          <p className="re-nota">{t.nota}</p>
          <button type="button" className="re-btn" onClick={() => onVerDisponibles(id)}>
            See {libres} available
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Disponibilidad: la torre, piso por piso ─────────────────────────────────
function Disponibilidad({ filtro, setFiltro, onReservar }) {
  const [sel, setSel] = useState(null);
  const [tope, setTope] = useState(0);
  const coincide = (u) => (filtro === 'todas' || u.tipo === filtro) && (!tope || u.precio <= tope);
  const libres = UNIDADES.filter((u) => u.estado === 'disponible' && coincide(u));
  // si el filtro deja fuera la elegida, se suelta
  const elegida = sel && UNIDADES.find((x) => x.id === sel);
  const u = elegida && coincide(elegida) ? elegida : null;

  return (
    <section id="availability" className="re-sec re-disp">
      <header className="re-sec-cab">
        <Rotulo tipo="abre">Availability</Rotulo>
        <p className="re-sobre">Updated today</p>
        <h2 className="re-revela"><Palabras>Choose your</Palabras> <em><Palabras>floor</Palabras></em></h2>
      </header>
      <div className="re-filtros">
        <div className="re-pestanas chicas">
          {[['todas', 'All'], ...TIPOS.map((t) => [t.id, t.nombre])].map(([v, txt]) => (
            <button key={v} type="button" className={filtro === v ? 'activa' : ''} onClick={() => setFiltro(v)}>{txt}</button>
          ))}
        </div>
        <label className="re-tope">
          Up to
          <select value={tope} onChange={(e) => setTope(Number(e.target.value))}>
            <option value={0}>Any price</option>
            {[1000000, 1500000, 2000000, 3000000].map((n) => <option key={n} value={n}>{dineroCorto(n)}</option>)}
          </select>
        </label>
        <p className="re-cuenta"><b>{libres.length}</b> available</p>
      </div>

      <div className="re-disp-cuerpo">
        <figure className="re-fachada">
          {/* la foto del edificio con cada residencia marcada (fachada.js); se
              toca la que interesa y su ficha sale a un lado */}
          <svg viewBox={FACHADA_FOTO.vista} role="group" aria-label="Residences on the building facade">
            <image href={`${IMG}/${FACHADA_FOTO.src}`} x="0" y="0" width={FACHADA_FOTO.ancho} height={FACHADA_FOTO.alto} />
            {UNIDADES.map((x) => (
              <g
                key={x.id}
                role="button"
                tabIndex={coincide(x) ? 0 : -1}
                aria-label={`Residence ${x.id}, ${tipo(x.tipo).nombre}, ${ESTADOS[x.estado]}`}
                className={`re-f ${x.estado} ${coincide(x) ? '' : 'fuera'} ${u?.id === x.id ? 'sel' : ''}`}
                onClick={() => coincide(x) && setSel(x.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && coincide(x) && (e.preventDefault(), setSel(x.id))}
              >
                {FACHADA[x.id].map((pts, i) => <polygon key={i} points={pts.map((q) => q.join(',')).join(' ')} />)}
              </g>
            ))}
          </svg>
          <figcaption className="re-leyenda">
            <span className="disponible" />Available <span className="apartada" />Reserved <span className="vendida" />Sold
          </figcaption>
        </figure>

        <aside className={`re-detalle ${u ? 'lleno' : ''}`} aria-live="polite">
          {u ? (
            <>
              <p className="re-sobre">Residence {u.id} · Floor {u.piso}</p>
              <h3>{tipo(u.tipo).nombre}</h3>
              <p className={`re-estado ${u.estado}`}>{ESTADOS[u.estado]}</p>
              <Plano t={tipo(u.tipo)} />
              <dl className="re-datos">
                <div><dt>Interior</dt><dd>{u.ft.toLocaleString()} sq ft</dd></div>
                <div><dt>Exposure</dt><dd>{u.vista}</dd></div>
                <div><dt>Price</dt><dd>{u.estado === 'vendida' ? '—' : dinero(u.precio)}</dd></div>
                <div><dt>Est. monthly</dt><dd>{u.estado === 'vendida' ? '—' : `${dinero(Math.round(u.ft * 1.35))} CC · ${dinero(Math.round(u.precio * 0.0021))} tax`}</dd></div>
              </dl>
              {u.estado === 'disponible' && (
                <button type="button" className="re-btn" onClick={() => onReservar(u.id)}>Tour residence {u.id}</button>
              )}
              {u.estado === 'apartada' && <p className="re-nota">On hold for another buyer. Join the waitlist on your tour.</p>}
              {u.estado === 'vendida' && <p className="re-nota">This home is sold. Similar plans are on the floors above and below.</p>}
            </>
          ) : (
            <div className="re-vacio">
              <p>Tap a residence on the building to see its plan, exposure and price.</p>
              <p className="re-nota">The C homes, on the right, have the widest balconies and face Manhattan.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

// Galería que corre de lado mientras la sección está pegada (inmersion.js le
// da el alto según lo ancho de la pista).
function Amenidades() {
  return (
    <section id="amenities" className="re-amen">
      <div className="re-amen-pegado">
        <header className="re-sec-cab">
          <Rotulo tipo="enfoca">Amenities</Rotulo>
          <h2 className="re-revela"><Palabras>Everything close,</Palabras> <em><Palabras>nothing crowded</Palabras></em></h2>
        </header>
        <ol className="re-amen-pista">
          {AMENIDADES.map((x) => (
            <li key={x.nombre} className="re-amen-carta foto">
              <img src={`${IMG}/${x.foto}.webp`} alt="" loading="lazy" />
              <span>{x.lugar}</span>
              <div><b>{x.nombre}</b><p>{x.texto}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Barrio() {
  return (
    <section id="neighborhood" className="re-sec re-barrio">
      <header className="re-sec-cab">
        <Rotulo tipo="deriva">Neighborhood</Rotulo>
        <h2 className="re-revela"><Palabras>Closer to Wall Street</Palabras> <em><Palabras>than most of Manhattan</Palabras></em></h2>
      </header>
      <div className="re-barrio-cuerpo">
        <svg className="re-mapa" viewBox="0 0 400 300" role="img" aria-label="Map: The Halden in Paulus Hook, across the Hudson from Lower Manhattan">
          <path className="agua" d="M190 0 C175 70 205 120 185 190 C172 240 195 270 188 300 L270 300 C262 250 285 210 268 150 C255 95 280 50 262 0 Z" />
          <text className="agua-t" x="228" y="120" transform="rotate(-80 228 120)">Hudson River</text>
          <path className="ruta" pathLength="1" d="M170 175 C200 168 232 160 290 140" />
          <path className="ruta" pathLength="1" d="M170 175 C205 190 240 200 300 205" />
          <circle className="punto" cx="170" cy="175" r="7" />
          <text className="lugar fuerte" x="160" y="160" textAnchor="end">The Halden</text>
          <text className="lugar" x="160" y="197" textAnchor="end">Paulus Hook</text>
          <circle className="estacion" cx="150" cy="128" r="4" />
          <text className="lugar" x="140" y="124" textAnchor="end">Exchange Place PATH</text>
          <text className="lugar" x="70" y="250">Jersey City</text>
          <circle className="estacion" cx="300" cy="140" r="4" />
          <text className="lugar" x="308" y="136">Brookfield Place</text>
          <circle className="estacion" cx="300" cy="205" r="4" />
          <text className="lugar" x="308" y="209">Wall Street</text>
          <text className="lugar fuerte" x="284" y="60">Lower Manhattan</text>
        </svg>
        <ul className="re-trayectos">
          {TRAYECTOS.map((t) => (
            <li key={t.a}><b>{t.min}<small> min</small></b><div><p>{t.a}</p><span>{t.modo} · {t.nota}</span></div></li>
          ))}
        </ul>
      </div>
      <p className="re-fino">Approximate travel times.</p>
    </section>
  );
}

// ── Agenda tu visita ────────────────────────────────────────────────────────
// Se monta al abrirse (con `key` por unidad), así arranca limpia cada vez.
function Visita({ unidad, onCerrar }) {
  const dias = useMemo(() => diasDeVisita(), []);
  const [dia, setDia] = useState(0);
  const [hora, setHora] = useState('');
  const [datos, setDatos] = useState(() => ({
    nombre: '', correo: '', tel: '', agente: false,
    interes: UNIDADES.find((u) => u.id === unidad)?.tipo || '2br',
  }));
  const [hecha, setHecha] = useState(null);

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onCerrar]);

  const d = dias[dia];
  const fechaLarga = (f) => f.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const valido = hora && datos.nombre.trim() && /\S+@\S+\.\S+/.test(datos.correo);

  const enviar = (e) => {
    e.preventDefault();
    if (!valido) return;
    setHecha({ fecha: d.fecha, hora, nombre: datos.nombre.trim(), ics: archivoVisita({ fecha: d.fecha, hora, nombre: datos.nombre.trim() }) });
  };

  return (
    <div className="re-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="re-ventana" role="dialog" aria-modal="true" aria-label="Book a private tour">
        <button type="button" className="re-cerrar" onClick={onCerrar} aria-label="Close">×</button>
        {hecha ? (
          <div className="re-hecha">
            <p className="re-sobre">You’re confirmed</p>
            <h3>See you {fechaLarga(hecha.fecha)}, <em>{hecha.hora}</em></h3>
            <p>Our sales gallery is in the lobby at {TORRE.direccion}. A confirmation is on its way to {datos.correo}{unidad ? `, and residence ${unidad} will be ready to walk through` : ''}.</p>
            <div className="re-portada-acc">
              <a className="re-btn" href={hecha.ics} download="the-halden-tour.ics">Add to calendar</a>
              <button type="button" className="re-enlace" onClick={onCerrar}>Back to the site</button>
            </div>
          </div>
        ) : (
          <form onSubmit={enviar}>
            <p className="re-sobre">Private tour · Sales gallery</p>
            <h3>{unidad ? <>Tour residence <em>{unidad}</em></> : <>Book a <em>private tour</em></>}</h3>

            <div className="re-dias" role="radiogroup" aria-label="Day">
              {dias.map((x, i) => (
                <button key={i} type="button" role="radio" aria-checked={i === dia} className={i === dia ? 'activo' : ''} onClick={() => { setDia(i); setHora(''); }}>
                  <span>{x.fecha.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <b>{x.fecha.getDate()}</b>
                  <span>{x.fecha.toLocaleDateString('en-US', { month: 'short' })}</span>
                </button>
              ))}
            </div>
            <div className="re-horas" role="radiogroup" aria-label="Time">
              {HORAS.map((h) => {
                const tomada = d.tomadas.includes(h);
                return (
                  <button key={h} type="button" role="radio" aria-checked={hora === h} disabled={tomada} className={hora === h ? 'activo' : ''} onClick={() => setHora(h)}>
                    {h}
                  </button>
                );
              })}
            </div>

            <div className="re-campos">
              <label>Full name<input value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} autoComplete="name" /></label>
              <label>Email<input type="email" value={datos.correo} onChange={(e) => setDatos({ ...datos, correo: e.target.value })} autoComplete="email" /></label>
              <label>Phone<input type="tel" value={datos.tel} onChange={(e) => setDatos({ ...datos, tel: e.target.value })} autoComplete="tel" /></label>
              <label>Interested in
                <select value={datos.interes} onChange={(e) => setDatos({ ...datos, interes: e.target.value })}>
                  {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </label>
            </div>
            <label className="re-check"><input type="checkbox" checked={datos.agente} onChange={(e) => setDatos({ ...datos, agente: e.target.checked })} /> I’m a broker bringing a client</label>
            <button type="submit" className="re-btn ancho" disabled={!valido}>
              {hora ? `Confirm ${d.fecha.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${hora}` : 'Choose a time'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Pie({ onReservar }) {
  return (
    <footer className="re-pie">
      <div className="re-pie-cta">
        <Toma clip="cierre" />
        <h2 className="re-revela"><Palabras>Come see the view</Palabras> <em><Palabras>in person</Palabras></em></h2>
        <button type="button" className="re-btn claro" onClick={() => onReservar()}>Book a private tour</button>
      </div>
      <div className="re-pie-fila">
        <Logo />
        <p>Sales gallery · {TORRE.direccion}<br />{TORRE.telefono} · {TORRE.correo}</p>
        <p className="re-fino">
          Demonstration website for a fictional development. Renderings, prices, availability and
          plans are illustrative only. Equal Housing Opportunity.
        </p>
        <p className="re-fino">
          Interior tour: &ldquo;Modern Apartment&rdquo; by Visth&eacute;tique on Sketchfab (CC BY 4.0);
          sky by Poly Haven (CC0).
        </p>
      </div>
    </footer>
  );
}

export default function RealEstateDemo() {
  const [filtro, setFiltro] = useState('todas');
  const [visita, setVisita] = useState({ abierta: false, unidad: null });
  const reservar = (unidad = null) => setVisita({ abierta: true, unidad: typeof unidad === 'string' ? unidad : null });
  const cerrar = useCallback(() => setVisita({ abierta: false, unidad: null }), []);

  const raiz = useRef(null);
  const [avance, setAvance] = useState(0);
  const [lista, setLista] = useState(false);
  useInmersion(raiz);

  // Archivo ancha (logo, menú, rótulos) + Inter Tight, solo para esta demo
  useEffect(() => {
    const id = 're-letra';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,300;125,400;125,500&family=Inter+Tight:wght@200;300;400;500&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const antes = document.title;
    document.title = `${TORRE.nombre} · Jersey City residences`;
    return () => { document.title = antes; };
  }, []);

  return (
    <div className={`re ${lista ? 'lista' : ''}`} id="top" ref={raiz}>
      {!lista && <Carga avance={avance} onFin={() => setLista(true)} />}
      <Encabezado onReservar={reservar} lista={lista} />
      <Recorrido onReservar={reservar} onAvance={setAvance} />
      <Cifras />
      <Edificio />
      <Residencias onVerDisponibles={(id) => { setFiltro(id); document.getElementById('availability')?.scrollIntoView({ behavior: 'smooth' }); }} />
      <Recorrido toma={TOMAS.recamara} onReservar={reservar} />
      <Disponibilidad filtro={filtro} setFiltro={setFiltro} onReservar={reservar} />
      <Amenidades />
      <Barrio />
      <Pie onReservar={reservar} />
      {visita.abierta && <Visita key={visita.unidad || 'general'} unidad={visita.unidad} onCerrar={cerrar} />}
    </div>
  );
}
