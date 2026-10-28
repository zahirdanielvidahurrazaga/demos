import { createContext, useContext, useEffect, useState } from 'react';
import { ArrowRight, CalendarHeart, Flower2, Home, MapPin, Package, User } from 'lucide-react';
import {
  NEGOCIO, OCASIONES, PRODUCTOS, ZONAS, agotado, duracion, elegirZona, faltaCorte, llegaHoy, misPedidos,
  peso, precioProducto, useFlores, zona,
} from './datos';
import { BotonPantalla, Foto, Logo, Ventana, useAhora } from './comun';
import { Catalogo, Ficha, TarjetaRamo } from './Catalogo';
import Armar, { RamoVivo } from './Armar';
import { Carrito, Pagar } from './Compra';
import { Fechas, Pedido, Pedidos, Perfil } from './Cuenta';
import Portada from './Portada';

// ─────────────────────────────────────────────────────────────────────────────
// SITIO / APP DEL CLIENTE
//
// Una sola pieza para web y app: en compu es un sitio editorial con menú
// arriba; en celular la misma página se vuelve app (encabezado compacto +
// barra de abajo). La navegación es un estado propio que entra al historial
// del navegador, así el "atrás" del celular regresa de pantalla.
// ─────────────────────────────────────────────────────────────────────────────

const Nav = createContext(null);
export const useNav = () => useContext(Nav);

const TABS = [
  { p: 'inicio', etiqueta: 'Inicio', Icon: Home },
  { p: 'catalogo', etiqueta: 'Ramos', Icon: Flower2 },
  { p: 'armar', etiqueta: 'Arma', Icon: Flower2 },
  { p: 'pedidos', etiqueta: 'Pedidos', Icon: Package },
  { p: 'perfil', etiqueta: 'Yo', Icon: User },
];
const NAV_RAIZ = { catalogo: 'catalogo', ficha: 'catalogo', armar: 'armar', pedidos: 'pedidos', pedido: 'pedidos', fechas: 'fechas', perfil: 'fechas' };
const RAIZ = { inicio: 'inicio', catalogo: 'catalogo', ficha: 'catalogo', armar: 'armar', pedidos: 'pedidos', pedido: 'pedidos', perfil: 'perfil', fechas: 'perfil' };

export default function Sitio() {
  const [vista, setVista] = useState({ p: 'inicio' });
  const e = useFlores();

  useEffect(() => {
    const f = (ev) => { if (ev.state?.flor) { setVista(ev.state.flor); window.scrollTo({ top: 0 }); } };
    window.history.replaceState({ ...(window.history.state || {}), flor: { p: 'inicio' } }, '');
    window.addEventListener('popstate', f);
    return () => window.removeEventListener('popstate', f);
  }, []);

  const ir = (p, params = {}) => {
    const v = { p, ...params };
    window.history.pushState({ flor: v }, '');
    setVista(v);
    window.scrollTo({ top: 0 });
  };
  const atras = () => window.history.back();

  const pagina = {
    inicio: <Inicio />,
    catalogo: <Catalogo ocasionInicial={vista.ocasion} />,
    ficha: <Ficha id={vista.id} />,
    armar: <Armar inicial={vista.tallo} />,
    carrito: <Carrito />,
    pagar: <Pagar />,
    pedidos: <Pedidos />,
    pedido: <Pedido id={vista.id} recien={vista.recien} />,
    perfil: <Perfil />,
    fechas: <Fechas />,
  }[vista.p] || <Inicio />;

  const enCamino = misPedidos(e).filter((p) => p.estado !== 'entregado').length;

  return (
    <Nav.Provider value={{ vista, ir, atras }}>
      <div className="fl-sitio">
        <Cabeza carrito={e.carrito.length} />
        <main key={vista.p + (vista.id || '')} className="fl-pagina">{pagina}</main>
        {!['pagar', 'carrito'].includes(vista.p) && <Pie />}
        <nav className="fl-tabbar" aria-label="Secciones">
          {TABS.map((t) => (
            <button key={t.p} type="button" className={RAIZ[vista.p] === t.p ? 'activo' : ''} onClick={() => ir(t.p)} aria-label={t.etiqueta}>
              {t.p === 'armar' ? <span className="fl-tab-armar"><Flower2 size={20} /></span> : <t.Icon size={21} strokeWidth={1.8} />}
              <small>{t.etiqueta}</small>
              {t.p === 'pedidos' && enCamino > 0 && <i className="fl-punto" />}
            </button>
          ))}
        </nav>
      </div>
    </Nav.Provider>
  );
}

function Cabeza({ carrito }) {
  const { vista, ir } = useNav();
  const e = useFlores();
  const z = e.zonaElegida ? zona(e.zonaElegida) : null;
  const [verZona, setVerZona] = useState(false);
  const enlaces = [['catalogo', 'Ramos'], ['armar', 'Arma tu ramo'], ['pedidos', 'Mis pedidos'], ['fechas', 'Mis fechas']];
  return (
    <header className="fl-cab">
      <div className="fl-cab-in">
        <button type="button" className="fl-cab-logo" onClick={() => ir('inicio')} aria-label="Inicio">Dalia.</button>
        <nav className="fl-cab-nav">
          {enlaces.map(([p, t]) => (
            <button key={p} type="button" className={NAV_RAIZ[vista.p] === p ? 'activo' : ''} onClick={() => ir(p)}>{t}</button>
          ))}
          <button type="button" onClick={() => setVerZona(true)}>{z ? z.nombre : 'Puebla'}</button>
          <button type="button" className={vista.p === 'carrito' ? 'activo' : ''} onClick={() => ir('carrito')}>Carrito ({carrito})</button>
        </nav>
        <div className="fl-cab-movil">
          <button type="button" onClick={() => setVerZona(true)}>{z ? z.nombre : 'Puebla'}</button>
          <button type="button" onClick={() => ir('carrito')}>Carrito ({carrito})</button>
        </div>
        <BotonPantalla />
      </div>
      {verZona && <Ventana titulo="Entrega a domicilio" alCerrar={() => setVerZona(false)} ancho={440}><Entrega compacta /></Ventana>}
    </header>
  );
}

// ── inicio ──────────────────────────────────────────────────────────────────
function Inicio() {
  const { ir } = useNav();
  const e = useFlores();
  const favoritos = ['dalia', 'pasion', 'mandarina', 'nube'].map((id) => PRODUCTOS.find((p) => p.id === id));
  return (
    <>
      <Portada />
      <section className="fl-envoltura fl-franja-entrega"><Entrega /></section>

      <section className="fl-envoltura fl-seccion">
        <div className="fl-titular">
          <h2>¿Qué <em>celebras</em>?</h2>
          <button type="button" className="fl-enlace" onClick={() => ir('catalogo')}>Ver todos <ArrowRight size={16} /></button>
        </div>
        <div className="fl-ocasiones">
          {OCASIONES.map((o) => (
            <button key={o.id} type="button" className="fl-ocasion" onClick={() => ir('catalogo', { ocasion: o.id })}>
              <Foto nombre={o.foto} texto={o.nombre} />
              <span>{o.nombre}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="fl-envoltura fl-seccion">
        <div className="fl-titular">
          <h2>Los de <em>esta semana</em></h2>
          <button type="button" className="fl-enlace" onClick={() => ir('catalogo')}>Todo el catálogo <ArrowRight size={16} /></button>
        </div>
        <div className="fl-rejilla">
          {favoritos.map((p) => <TarjetaRamo key={p.id} p={p} precio={precioProducto(e, p, 'S')} agotado={agotado(e, p.id)} />)}
        </div>
      </section>

      <section className="fl-armar-anuncio">
        <div className="fl-envoltura fl-armar-anuncio-in">
          <div>
            <p className="fl-cejilla claro">Arma tu ramo</p>
            <h2>Tú eliges <em>cada tallo</em>.</h2>
            <p>Dalias, peonías, tulipanes, girasoles… escoge cuántos de cada uno y el color del papel. Ves el ramo armarse mientras eliges y sabes el precio al momento.</p>
            <button type="button" className="fl-boton claro" onClick={() => ir('armar')}>Empezar mi ramo <ArrowRight size={17} /></button>
          </div>
          <RamoVivo tallos={{ dalia: 3, peonia: 2, ranunculo: 2, tulipan: 2, eucalipto: 3 }} papelId="rosa" />
        </div>
      </section>

      <section className="fl-envoltura fl-seccion">
        <div className="fl-titular"><h2>Así <em>funciona</em></h2></div>
        <ol className="fl-pasos">
          <li><b>01</b><h3>Elige el ramo</h3><p>Por ocasión, por flor o arma el tuyo. Ves el precio final antes de pagar.</p></li>
          <li><b>02</b><h3>Escribe la tarjeta</h3><p>Te damos ideas para cada ocasión. Puede ir firmada o anónima.</p></li>
          <li><b>03</b><h3>Te mandamos la foto</h3><p>Antes de salir del taller ves cómo quedó tu ramo, de verdad.</p></li>
          <li><b>04</b><h3>Llega a su puerta</h3><p>Sigues la entrega en vivo y recibes la foto de cuando lo entregamos.</p></li>
        </ol>
      </section>

      <section className="fl-envoltura fl-seccion fl-nosotros">
        <Foto nombre="escena-taller" texto="Nuestro taller" className="fl-nosotros-foto" />
        <div>
          <p className="fl-cejilla">Nuestro taller</p>
          <h2>Cada ramo, <em>a mano</em>.</h2>
          <p>Compramos flor fresca tres veces por semana y la armamos el mismo día que sale. Si una flor no está a la altura, la cambiamos por otra de su mismo color y te avisamos.</p>
          <dl className="fl-datos">
            <div><dt>Dirección</dt><dd>{NEGOCIO.direccion}</dd></div>
            {NEGOCIO.horario.map(([d, h]) => <div key={d}><dt>{d}</dt><dd>{h}</dd></div>)}
            <div><dt>Mismo día</dt><dd>Pidiendo antes de las {NEGOCIO.corte - 12}:00 pm</dd></div>
          </dl>
        </div>
      </section>
    </>
  );
}

// "¿A dónde lo mandamos?": colonia → si llega hoy y cuánto falta para el corte.
export function Entrega({ compacta }) {
  const e = useFlores();
  const ahora = useAhora(30000);
  const z = e.zonaElegida ? zona(e.zonaElegida) : null;
  const hoy = llegaHoy(ahora);
  return (
    <div id={compacta ? undefined : 'fl-entrega'} className={`fl-entrega ${compacta ? 'compacta' : ''}`}>
      <label>
        <span><MapPin size={15} /> ¿A dónde lo mandamos?</span>
        <select value={e.zonaElegida || ''} onChange={(ev) => elegirZona(ev.target.value || null)}>
          <option value="">Elige la colonia</option>
          {ZONAS.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
        </select>
      </label>
      <p>
        {hoy
          ? <><b>Llega hoy</b>{z ? ` a ${z.nombre}` : ''} si pides en las próximas <b>{duracion(faltaCorte(ahora))}</b>.</>
          : <><b>Llega mañana</b> desde las 9:00 am. Hoy ya cerramos entregas.</>}
        {z && <> Envío {peso(z.costo)}.</>}
      </p>
    </div>
  );
}

function Pie() {
  const { ir } = useNav();
  return (
    <footer className="fl-pie">
      <div className="fl-envoltura fl-pie-in">
        <div>
          <Logo grande claro />
          <p>{NEGOCIO.direccion}<br />{NEGOCIO.telefono} · {NEGOCIO.instagram}</p>
        </div>
        <div className="fl-pie-enlaces">
          <button type="button" onClick={() => ir('catalogo')}>Ramos</button>
          <button type="button" onClick={() => ir('armar')}>Arma tu ramo</button>
          <button type="button" onClick={() => ir('pedidos')}>Mis pedidos</button>
          <button type="button" onClick={() => ir('fechas')}><CalendarHeart size={14} /> Mis fechas</button>
        </div>
      </div>
      <p className="fl-pie-nota">Florería de ejemplo · demostración de KaiZen</p>
    </footer>
  );
}
