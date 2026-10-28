import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Droplets, Heart, Scissors, Sun, Truck } from 'lucide-react';
import {
  EXTRAS, OCASIONES, PRODUCTOS, TALLOS, TAMANOS, agotado, agregarAlCarrito, franjasDe, llegaHoy, ocasion,
  peso, precioProducto, textoFranja, unidad, useFlores, zona,
} from './datos';
import { Foto, avisarListo, useTono } from './comun';
import { useNav } from './Sitio';

const ORDEN = [['relevancia', 'Recomendados'], ['menor', 'Menor precio'], ['mayor', 'Mayor precio']];
const RANGOS = [['todos', 'Cualquier precio', 0, Infinity], ['1000', 'Hasta $1,000', 0, 1000], ['1500', '$1,000 – $1,500', 1000, 1500], ['mas', 'Más de $1,500', 1500, Infinity]];

export function TarjetaRamo({ p, precio, agotado: sinStock }) {
  const { ir } = useNav();
  return (
    <button type="button" className={`fl-tarjeta ${sinStock ? 'agotado' : ''}`} onClick={() => ir('ficha', { id: p.id })}>
      <div className="fl-tarjeta-foto">
        <Foto nombre={p.foto} texto={p.nombre} />
        {p.etiqueta && !sinStock && <span className="fl-sello">{p.etiqueta}</span>}
        {sinStock && <span className="fl-sello gris">Agotado hoy</span>}
      </div>
      <div className="fl-tarjeta-txt">
        <h3>{p.nombre}</h3>
        <p>desde {peso(precio)}</p>
      </div>
    </button>
  );
}

export function Catalogo({ ocasionInicial }) {
  const e = useFlores();
  const [oc, setOc] = useState(ocasionInicial || 'todas');
  const [flor, setFlor] = useState('todas');
  const [rango, setRango] = useState('todos');
  const [orden, setOrden] = useState('relevancia');

  const lista = useMemo(() => {
    const [, , min, max] = RANGOS.find((r) => r[0] === rango);
    let l = PRODUCTOS.filter((p) => (oc === 'todas' || p.ocasiones.includes(oc)) && (flor === 'todas' || p.flores.includes(flor)));
    l = l.filter((p) => { const x = precioProducto(e, p, 'S'); return x >= min && x < max; });
    if (orden !== 'relevancia') l = [...l].sort((a, b) => (precioProducto(e, a, 'S') - precioProducto(e, b, 'S')) * (orden === 'menor' ? 1 : -1));
    return [...l.filter((p) => !agotado(e, p.id)), ...l.filter((p) => agotado(e, p.id))];
  }, [e, oc, flor, rango, orden]);

  const titulo = oc === 'todas' ? <>Todos los <em>ramos</em></> : <>Para <em>{ocasion(oc).nombre.toLowerCase()}</em></>;
  return (
    <div className="fl-envoltura fl-catalogo">
      <div className="fl-cat-cab">
        <h1>{titulo}</h1>
        <p>{lista.length} {lista.length === 1 ? 'opción' : 'opciones'} · {llegaHoy() ? 'todas llegan hoy' : 'llegan mañana'}</p>
      </div>
      <div className="fl-filtros" role="group" aria-label="Ocasión">
        <button type="button" className={oc === 'todas' ? 'activo' : ''} onClick={() => setOc('todas')}>Todas</button>
        {OCASIONES.map((o) => <button key={o.id} type="button" className={oc === o.id ? 'activo' : ''} onClick={() => setOc(o.id)}>{o.nombre}</button>)}
      </div>
      <div className="fl-filtros-2">
        <label><span>Flor</span>
          <select value={flor} onChange={(ev) => setFlor(ev.target.value)}>
            <option value="todas">Todas</option>
            {TALLOS.filter((t) => PRODUCTOS.some((p) => p.flores.includes(t.id))).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </label>
        <label><span>Precio</span>
          <select value={rango} onChange={(ev) => setRango(ev.target.value)}>
            {RANGOS.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
          </select>
        </label>
        <label><span>Ordenar</span>
          <select value={orden} onChange={(ev) => setOrden(ev.target.value)}>
            {ORDEN.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
          </select>
        </label>
      </div>
      {lista.length ? (
        <div className="fl-rejilla">
          {lista.map((p) => <TarjetaRamo key={p.id} p={p} precio={precioProducto(e, p, 'S')} agotado={agotado(e, p.id)} />)}
        </div>
      ) : (
        <div className="fl-vacio">
          <p>Ningún ramo con esos filtros.</p>
          <button type="button" className="fl-boton linea" onClick={() => { setOc('todas'); setFlor('todas'); setRango('todos'); }}>Quitar filtros</button>
        </div>
      )}
    </div>
  );
}

export function Ficha({ id }) {
  const e = useFlores();
  const { ir, atras } = useNav();
  const p = PRODUCTOS.find((x) => x.id === id) || PRODUCTOS[0];
  const tono = useTono(p.foto);
  const [tam, setTam] = useState('M' in p.tam ? 'M' : 'S');
  const [extras, setExtras] = useState([]);
  const [fav, setFav] = useState(false);
  const sinStock = agotado(e, p.id);
  const z = e.zonaElegida ? zona(e.zonaElegida) : null;
  const total = precioProducto(e, p, tam) + extras.reduce((n, x) => n + EXTRAS.find((y) => y.id === x).precio, 0);
  const hoy = llegaHoy();
  const primera = franjasDe(hoy ? 0 : 1).find((f) => f.libre);
  const parecidos = PRODUCTOS.filter((x) => x.id !== p.id && x.ocasiones.some((o) => p.ocasiones.includes(o))).slice(0, 4);

  const agregar = (irAPagar) => {
    agregarAlCarrito({ tipo: 'producto', id: p.id, tam, extras });
    avisarListo(`${p.nombre} está en tu carrito`);
    if (irAPagar) ir('carrito');
  };

  return (
    <div className="fl-ficha" style={{ '--tono': tono }}>
      <div className="fl-envoltura">
        <button type="button" className="fl-volver" onClick={atras}><ArrowLeft size={17} /> Volver</button>
      </div>
      <div className="fl-envoltura fl-ficha-in">
        <div className="fl-ficha-foto">
          <Foto nombre={p.foto} texto={p.nombre} prioridad />
          <button type="button" className={`fl-fav ${fav ? 'si' : ''}`} onClick={() => setFav((x) => !x)} aria-label="Guardar en favoritos"><Heart size={19} /></button>
        </div>
        <div className="fl-ficha-txt">
          <p className="fl-cejilla">{p.ocasiones.map((o) => ocasion(o).nombre).join(' · ')}</p>
          <h1>{p.nombre}</h1>
          <p className="fl-ficha-desc">{p.descripcion}</p>

          <div className="fl-bloque">
            <h4>Tamaño</h4>
            <div className="fl-tamanos" role="radiogroup" aria-label="Tamaño">
              {Object.entries(p.tam).map(([k, [n]]) => (
                <button key={k} type="button" role="radio" aria-checked={tam === k} className={tam === k ? 'activo' : ''} onClick={() => setTam(k)}>
                  <b>{TAMANOS[k]}</b>
                  <span>{n} {unidad(p, n)}</span>
                  <em>{peso(precioProducto(e, p, k))}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="fl-bloque">
            <h4>¿Le agregas algo?</h4>
            <div className="fl-extras">
              {EXTRAS.map((x) => {
                const si = extras.includes(x.id);
                return (
                  <button key={x.id} type="button" aria-pressed={si} className={si ? 'activo' : ''} onClick={() => setExtras((l) => (si ? l.filter((y) => y !== x.id) : [...l, x.id]))}>
                    <Foto nombre={x.foto} texto={x.corto} />
                    <span>{x.corto}</span>
                    <small>+{peso(x.precio)}</small>
                    {si && <i><Check size={13} /></i>}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="fl-ficha-entrega">
            <Truck size={17} />
            <span>
              {hoy ? 'Llega hoy' : 'Llega mañana'}{z ? ` a ${z.nombre}` : ''}{primera ? `, desde la franja de ${textoFranja(primera.f)}` : ''}.
              {z ? ` Envío ${peso(z.costo)}.` : ' El envío depende de la colonia.'}
            </span>
          </p>

          <div className="fl-comprar">
            <div><small>Total</small><b>{peso(total)}</b></div>
            {sinStock
              ? <button type="button" className="fl-boton" disabled>Agotado por hoy</button>
              : (<>
                <button type="button" className="fl-boton linea" onClick={() => agregar(false)}>Agregar</button>
                <button type="button" className="fl-boton tono" onClick={() => agregar(true)}>Enviar este ramo</button>
              </>)}
          </div>

          <div className="fl-cuidados">
            <div><Scissors size={17} /><p><b>Corta en diagonal</b>1 cm del tallo al llegar.</p></div>
            <div><Droplets size={17} /><p><b>Agua fresca</b>cámbiala cada dos días.</p></div>
            <div><Sun size={17} /><p><b>Lejos del sol</b>directo y de la fruta.</p></div>
          </div>
        </div>
      </div>

      {parecidos.length > 0 && (
        <section className="fl-envoltura fl-seccion">
          <div className="fl-titular"><h2>También le puede <em>gustar</em></h2></div>
          <div className="fl-rejilla">
            {parecidos.map((x) => <TarjetaRamo key={x.id} p={x} precio={precioProducto(e, x, 'S')} agotado={agotado(e, x.id)} />)}
          </div>
        </section>
      )}
    </div>
  );
}
