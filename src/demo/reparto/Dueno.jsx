import { useState } from 'react';
import { BarChart3, ChevronRight, ClipboardCheck, Home, MessageCircle, Package, Pencil, Plus, Search, Store, Truck } from 'lucide-react';
import {
  BAJO, PRODUCTOS, ajustarConteo, leerCantidades, producto, sugeridoProveedor, REPARTIDORES, RESTAURANTES, alertas, cajasDe, cancelarPedido, cobrar, deSemana, deuda,
  diaDe, diasSin, dinero, empezarSemana, entregar, estadoCliente, existencias, hace, horaDe, inicioDia,
  pendientes, registrarLlegada, reasignar, repartidor, restaurante, resumenItems, useReparto, waLink,
} from './datos';
import { BotonPantalla, Contador, Hoja, Punto, Segmentos, avisarListo, useAhora } from './comun';
import Pedido from './Pedido';
import Dictar from './Dictar';
import FormCliente from './FormCliente';

const PESTANAS = [
  { id: 'hoy', etiqueta: 'Hoy', Icon: Home },
  { id: 'bodega', etiqueta: 'Bodega', Icon: Package },
  { id: 'nuevo', etiqueta: 'Pedido', Icon: Plus },
  { id: 'clientes', etiqueta: 'Clientes', Icon: Store },
  { id: 'semana', etiqueta: 'Semana', Icon: BarChart3 },
];

export default function Dueno() {
  const [tab, setTab] = useState('hoy');
  const [pedido, setPedido] = useState(null); // null cerrado · {} nuevo · {rest, items} lo de siempre
  const [cliente, setCliente] = useState(null);
  const [llegada, setLlegada] = useState(false);
  const [conteo, setConteo] = useState(false);
  const [proveedor, setProveedor] = useState(false);
  const [form, setForm] = useState(null); // null · {nuevo} · {id}
  const ir = (t) => { if (t === 'nuevo') { setPedido({}); return; } setTab(t); window.scrollTo({ top: 0 }); };

  return (
    <div className="rp-app">
      <main className="rp-main">
        {tab === 'hoy' && <Hoy ir={ir} abrirCliente={setCliente} />}
        {tab === 'bodega' && <Bodega alLlegada={() => setLlegada(true)} alContar={() => setConteo(true)} alProveedor={() => setProveedor(true)} />}
        {tab === 'clientes' && <Clientes abrir={setCliente} alNuevo={() => setForm({})} />}
        {tab === 'semana' && <Semana />}
      </main>

      <nav className="rp-nav" aria-label="Secciones">
        {PESTANAS.map(({ id, etiqueta, Icon }) => (
          <button key={id} type="button" className={`${id === 'nuevo' ? 'mas' : ''} ${tab === id ? 'si' : ''}`} onClick={() => ir(id)} aria-label={etiqueta}>
            <Icon size={id === 'nuevo' ? 24 : 21} strokeWidth={id === 'nuevo' ? 2.4 : 1.9} />
            {id !== 'nuevo' && <span>{etiqueta}</span>}
          </button>
        ))}
      </nav>

      <Pedido abierta={!!pedido} inicial={pedido?.rest ? pedido : null} alCerrar={() => setPedido(null)} />
      <FichaCliente id={cliente} alCerrar={() => setCliente(null)} alPedir={(r) => { setCliente(null); setPedido({ rest: r.id, items: r.tipico }); }}
        alEditar={(id) => setForm({ id })} />
      <Llegada abierta={llegada} alCerrar={() => setLlegada(false)} />
      <Conteo abierta={conteo} alCerrar={() => setConteo(false)} />
      <Proveedor abierta={proveedor} alCerrar={() => setProveedor(false)} />
      <FormCliente abierta={!!form} id={form?.id} alCerrar={() => setForm(null)} alGuardar={(id) => { if (!form?.id) setCliente(id); }} />
    </div>
  );
}

function Cabeza({ sobre, titulo, children }) {
  return (
    <header className="rp-cab">
      <div>
        {sobre && <p className="rp-sobre">{sobre}</p>}
        <h1>{titulo}</h1>
      </div>
      <div className="rp-cab-der">{children}<BotonPantalla /></div>
    </header>
  );
}

// ── HOY ─────────────────────────────────────────────────────────────────────
function Hoy({ ir, abrirCliente }) {
  const e = useReparto();
  useAhora();
  const [abierto, setAbierto] = useState(null);
  const ex = existencias(e);
  const enBodega = ex.reduce((s, p) => s + p.bodega, 0);
  const apartadas = ex.reduce((s, p) => s + p.apartado, 0);
  const pend = pendientes(e);
  const hoy = inicioDia(0);
  const entregadasHoy = e.entregas.filter((x) => x.estado === 'entregada' && x.entregado >= hoy).sort((a, b) => b.entregado - a.entregado);
  const vendidoSemana = deSemana(e).filter((x) => x.estado === 'entregada').reduce((s, x) => s + x.total, 0);
  const al = alertas(e);
  const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <Cabeza sobre={fecha.charAt(0).toUpperCase() + fecha.slice(1)} titulo="Hoy" />

      <section className="rp-resumen">
        <button type="button" className="rp-tarjeta rp-gordo" onClick={() => ir('bodega')}>
          <span className="rp-sobre">En bodega</span>
          <strong>{enBodega}<small> cajas</small></strong>
          <span className="rp-tenue">{apartadas ? `${apartadas} ya apartadas para entregar` : 'Nada apartado'}</span>
        </button>
        <div className="rp-mini">
          <div className="rp-tarjeta"><span className="rp-sobre">Por entregar</span><strong>{pend.length}</strong></div>
          <button type="button" className="rp-tarjeta" onClick={() => ir('semana')}><span className="rp-sobre">Vendido esta semana</span><strong>{dinero(vendidoSemana)}</strong></button>
        </div>
      </section>

      <button type="button" className="rp-nuevo" onClick={() => ir('nuevo')}>
        <span className="rp-nuevo-ico"><Plus size={22} /></span>
        <span><strong>Nuevo pedido</strong><small>Pega el mensaje de WhatsApp</small></span>
        <ChevronRight size={20} />
      </button>

      {al.length > 0 && (
        <section>
          <h2 className="rp-h2">Atención <span>{al.length}</span></h2>
          <ul className="rp-lista">
            {al.map((a) => (
              <li key={a.id}>
                <button type="button" className="rp-renglon" onClick={() => {
                  if (a.tipo === 'cliente') abrirCliente(a.rest);
                  else if (a.tipo === 'stock') ir('bodega');
                  else ir('clientes');
                }}>
                  <Punto tono={a.grave ? 'rojo' : 'ambar'} />
                  <span className="rp-renglon-txt"><strong>{a.titulo}</strong><span>{a.detalle}</span></span>
                  <span className="rp-accion">{a.tipo === 'cliente' ? 'Escribirle' : a.tipo === 'stock' ? 'Ver' : 'Cobrar'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="rp-h2">Por entregar <span>{pend.length}</span></h2>
        {pend.length === 0 ? <p className="rp-vacio">Todo entregado. 🍻</p> : (
          <ul className="rp-lista">
            {pend.map((x) => (
              <li key={x.id}>
                <button type="button" className="rp-renglon" onClick={() => setAbierto(x.id)}>
                  <span className="rp-cajas">{cajasDe(x.items)}</span>
                  <span className="rp-renglon-txt"><strong>{restaurante(x.rest).nombre}</strong><span>{resumenItems(x.items)}</span></span>
                  <span className="rp-quien">{x.para > hoy ? diaDe(x.para) : repartidor(x.rep).nombre}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {entregadasHoy.length > 0 && (
        <section>
          <h2 className="rp-h2">Entregado hoy <span>{entregadasHoy.length}</span></h2>
          <ul className="rp-lista tenue">
            {entregadasHoy.map((x) => (
              <li key={x.id} className="rp-renglon">
                <Punto tono="verde" />
                <span className="rp-renglon-txt"><strong>{restaurante(x.rest).nombre}</strong><span>{cajasDe(x.items)} cajas · {repartidor(x.rep).nombre} · {horaDe(x.entregado)}</span></span>
                <span className={`rp-pago ${x.pago}`}>{x.pago === 'debe' ? 'A cuenta' : dinero(x.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DetallePedido id={abierto} alCerrar={() => setAbierto(null)} />
    </>
  );
}

function DetallePedido({ id, alCerrar }) {
  const e = useReparto();
  const x = e.entregas.find((y) => y.id === id);
  if (!x) return null;
  const r = restaurante(x.rest);
  const pendiente = x.estado === 'pendiente';
  return (
    <Hoja abierta={!!id} alCerrar={alCerrar} titulo={r.nombre}
      pie={pendiente && (
        <div className="rp-fila-btns">
          <button type="button" className="rp-btn" onClick={() => { cancelarPedido(x.id); alCerrar(); avisarListo('Pedido cancelado, las cajas regresaron a bodega'); }}>Cancelar</button>
          <button type="button" className="rp-btn lleno" onClick={() => { entregar(x.id, x.debe ? 'debe' : 'efectivo'); alCerrar(); avisarListo('Marcado como entregado'); }}>Ya se entregó</button>
        </div>
      )}>
      <p className="rp-ayuda">{diaDe(x.para)} · {r.direccion}</p>
      {x.mensaje && <div className="rp-burbuja quieta">{x.mensaje}</div>}
      <ul className="rp-items">
        {Object.entries(x.items).map(([pid, n]) => (
          <li key={pid}><div><strong>{PRODUCTOS.find((p) => p.id === pid).nombre}</strong><span>{dinero(PRODUCTOS.find((p) => p.id === pid).precio * n)}</span></div><b className="rp-n">{n}</b></li>
        ))}
      </ul>
      <p className="rp-total">Total <strong>{dinero(x.total)}</strong></p>
      {pendiente && (
        <>
          <p className="rp-rotulo">Lo lleva</p>
          <Segmentos valor={x.rep} alCambiar={(v) => reasignar(x.id, v)} opciones={REPARTIDORES.map((y) => ({ id: y.id, etiqueta: y.nombre }))} />
        </>
      )}
    </Hoja>
  );
}

// ── BODEGA ──────────────────────────────────────────────────────────────────
function Bodega({ alLlegada, alContar, alProveedor }) {
  const e = useReparto();
  const ex = existencias(e);
  const total = ex.reduce((s, p) => s + Math.max(0, p.libre), 0);
  return (
    <>
      <Cabeza sobre={`${total} cajas libres · arrancaste el ${new Date(e.semana).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' })}`} titulo="Bodega" />
      <div className="rp-acciones">
        <button type="button" onClick={alContar}><ClipboardCheck size={20} /><span>Contar</span></button>
        <button type="button" onClick={alLlegada}><Plus size={20} /><span>Llegó mercancía</span></button>
        <button type="button" onClick={alProveedor}><Truck size={20} /><span>Pedir al proveedor</span></button>
      </div>
      <ul className="rp-lista">
        {ex.map((p) => {
          const pct = p.inicial ? Math.max(0, p.libre) / p.inicial : 0;
          const tono = p.libre <= 3 ? 'rojo' : p.libre <= BAJO ? 'ambar' : 'tinta';
          return (
            <li key={p.id} className="rp-prod">
              <div className="rp-prod-fila">
                <span className="rp-renglon-txt"><strong>{p.nombre}</strong><span>{p.detalle}</span></span>
                <span className={`rp-prod-n ${tono}`}>{Math.max(0, p.libre)}</span>
              </div>
              <div className="rp-barra"><i className={tono} style={{ width: `${pct * 100}%` }} /></div>
              <p className="rp-prod-pie">Arrancó con {p.inicial} · salieron {p.salio}{p.apartado ? ` · ${p.apartado} apartadas` : ''}{p.ajustado ? ` · conteo ${p.ajustado > 0 ? '+' : ''}${p.ajustado}` : ''}</p>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Llegada({ abierta, alCerrar }) {
  const [items, setItems] = useState({});
  const n = cajasDe(items);
  return (
    <Hoja abierta={abierta} alCerrar={() => { setItems({}); alCerrar(); }} titulo="Llegó mercancía"
      pie={<button type="button" className="rp-btn lleno grande" disabled={!n} onClick={() => { registrarLlegada(items); setItems({}); alCerrar(); avisarListo(`${n} cajas sumadas a la bodega`); }}>Sumar {n || ''} {n === 1 ? 'caja' : 'cajas'}</button>}>
      <p className="rp-ayuda">Lo que te dejó el proveedor. Se suma a lo que tienes esta semana.</p>
      <Dictar etiqueta="Dictar lo que llegó" ejemplo="«treinta corona, veinte victoria, diez de indio»"
        alFrase={(f) => setItems((x) => ({ ...x, ...leerCantidades(f) }))} />
      <ul className="rp-items">
        {PRODUCTOS.map((p) => (
          <li key={p.id}><div><strong>{p.nombre}</strong><span>{p.detalle}</span></div><Contador valor={items[p.id] || 0} alCambiar={(v) => setItems((x) => ({ ...x, [p.id]: v }))} /></li>
        ))}
      </ul>
    </Hoja>
  );
}

function Conteo({ abierta, alCerrar }) {
  const e = useReparto();
  const ex = existencias(e);
  const [contado, setContado] = useState({});
  const sistema = Object.fromEntries(ex.map((p) => [p.id, Math.max(0, p.bodega)]));
  const valor = (id) => (id in contado ? contado[id] : sistema[id]);
  const difs = ex.filter((p) => valor(p.id) !== sistema[p.id]);
  const cerrar = () => { setContado({}); alCerrar(); };
  return (
    <Hoja abierta={abierta} alCerrar={cerrar} titulo="Contar bodega"
      pie={<button type="button" className="rp-btn lleno grande" onClick={() => {
        const d = ajustarConteo(Object.fromEntries(ex.map((p) => [p.id, valor(p.id)])));
        const n = Object.keys(d).length;
        avisarListo(n ? `Bodega ajustada · ${n} ${n === 1 ? 'diferencia' : 'diferencias'}` : 'Todo cuadra');
        cerrar();
      }}>{difs.length ? `Guardar · ${difs.length} ${difs.length === 1 ? 'diferencia' : 'diferencias'}` : 'Todo cuadra'}</button>}>
      <p className="rp-ayuda">Recorre la bodega y di lo que ves. Lo que no digas se queda como está.</p>
      <Dictar etiqueta="Dictar el conteo" ejemplo="«corona cuarenta, victoria treinta y dos, sin pacífico»"
        alFrase={(f) => setContado((x) => ({ ...x, ...leerCantidades(f) }))} />
      <ul className="rp-items">
        {ex.map((p) => {
          const v = valor(p.id);
          const d = v - sistema[p.id];
          return (
            <li key={p.id} className={d ? 'dif' : ''}>
              <div><strong>{p.nombre}</strong>
                <span>{d ? `El sistema dice ${sistema[p.id]} · ${d > 0 ? 'sobran' : 'faltan'} ${Math.abs(d)}` : `El sistema dice ${sistema[p.id]}`}</span></div>
              <Contador valor={v} alCambiar={(n) => setContado((x) => ({ ...x, [p.id]: n }))} />
            </li>
          );
        })}
      </ul>
    </Hoja>
  );
}

function Proveedor({ abierta, alCerrar }) {
  const e = useReparto();
  const sug = sugeridoProveedor(e);
  const [items, setItems] = useState(null);
  const lista = items || Object.fromEntries(sug.map((x) => [x.id, x.pedir]));
  const n = cajasDe(lista);
  const texto = `Hola, para esta semana te pido: ${Object.entries(lista).filter(([, c]) => c > 0).map(([id, c]) => `${c} ${producto(id).nombre}`).join(', ')}. Gracias.`;
  const cerrar = () => { setItems(null); alCerrar(); };
  return (
    <Hoja abierta={abierta} alCerrar={cerrar} titulo="Pedir al proveedor"
      pie={<div className="rp-fila-btns">
        <button type="button" className="rp-btn" disabled={!n} onClick={() => { registrarLlegada(lista); avisarListo(`${n} cajas sumadas a la bodega`); cerrar(); }}>Ya me llegó</button>
        <a className={`rp-btn wa ${n ? '' : 'apagado'}`} href={waLink(texto)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Mandar pedido</a>
      </div>}>
      <p className="rp-ayuda">Calculado con lo que vendes en una semana normal menos lo que te queda libre. Ajústalo a tu gusto.</p>
      <ul className="rp-items">
        {sug.map((x) => (
          <li key={x.id}>
            <div><strong>{producto(x.id).nombre}</strong><span>Vendes ~{x.semanal} por semana · te quedan {Math.max(0, x.libre)}</span></div>
            <Contador valor={lista[x.id] || 0} alCambiar={(v) => setItems({ ...lista, [x.id]: v })} />
          </li>
        ))}
      </ul>
      <p className="rp-total">Total <strong>{n} cajas</strong></p>
    </Hoja>
  );
}

// ── CLIENTES ────────────────────────────────────────────────────────────────
const sinAcento = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function Clientes({ abrir, alNuevo }) {
  const e = useReparto();
  const [q, setQ] = useState('');
  const deben = deuda(e).reduce((s, x) => s + x.total, 0);
  const filtro = sinAcento(q.trim());
  const lista = RESTAURANTES.filter((r) => !filtro || sinAcento(`${r.nombre} ${r.persona} ${r.zona}`).includes(filtro));
  const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
  const grupos = [
    { id: 'atencion', titulo: 'Necesitan atención', items: lista.filter((r) => ['perdido', 'tarde'].includes(estadoCliente(e, r))).sort((a, b) => diasSin(e, b.id) / b.cada - diasSin(e, a.id) / a.cada) },
    { id: 'nuevos', titulo: 'Nuevos', items: lista.filter((r) => estadoCliente(e, r) === 'nuevo').sort(porNombre) },
    { id: 'bien', titulo: 'Al día', items: lista.filter((r) => estadoCliente(e, r) === 'bien').sort(porNombre) },
  ].filter((g) => g.items.length);
  return (
    <>
      <Cabeza sobre={`${RESTAURANTES.length} restaurantes${deben ? ` · te deben ${dinero(deben)}` : ''}`} titulo="Clientes">
        <button type="button" className="rp-btn chico" onClick={alNuevo}><Plus size={16} /> Nuevo</button>
      </Cabeza>
      <label className="rp-buscar"><Search size={17} /><input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Buscar restaurante, persona o zona" /></label>
      {grupos.length === 0 && <p className="rp-vacio">No encontré a nadie con «{q}».</p>}
      {grupos.map((g) => (
        <section key={g.id}>
          <h2 className="rp-h2">{g.titulo} <span>{g.items.length}</span></h2>
          <ul className="rp-lista">
            {g.items.map((r) => {
              const est = estadoCliente(e, r);
              const d = diasSin(e, r.id);
              const debe = deuda(e, r.id).reduce((s, x) => s + x.total, 0);
              return (
                <li key={r.id}>
                  <button type="button" className="rp-renglon" onClick={() => abrir(r.id)}>
                    <Punto tono={{ perdido: 'rojo', tarde: 'ambar', bien: 'verde', nuevo: 'gris' }[est]} />
                    <span className="rp-renglon-txt">
                      <strong>{r.nombre}</strong>
                      <span>{est === 'nuevo' ? `${r.zona || 'Sin zona'} · todavía no te pide` : `Pidió ${hace(d)} · suele pedir cada ${r.cada} días`}</span>
                    </span>
                    {debe > 0 ? <span className="rp-pago debe">{dinero(debe)}</span> : <ChevronRight size={18} className="rp-tenue" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

function FichaCliente({ id, alCerrar, alPedir, alEditar }) {
  const e = useReparto();
  const r = id && restaurante(id);
  if (!r) return null;
  const d = diasSin(e, r.id);
  const deb = deuda(e, r.id);
  const debe = deb.reduce((s, x) => s + x.total, 0);
  const historial = e.entregas.filter((x) => x.rest === r.id && x.estado !== 'cancelada').sort((a, b) => b.creado - a.creado).slice(0, 5);
  const est = estadoCliente(e, r);
  const msj = est === 'bien' || est === 'nuevo'
    ? `Hola ${r.persona}, ¿cómo vas de cerveza? ¿Te llevo lo de siempre?`
    : `Hola ${r.persona}, ¿cómo va todo? Hace rato no te veo. ¿Te llevo ${resumenItems(r.tipico).replace(/ · /g, ', ')} como siempre?`;
  return (
    <Hoja abierta alCerrar={alCerrar} titulo={r.nombre}
      pie={<div className="rp-fila-btns">
        <a className="rp-btn wa" href={waLink(msj)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Escribirle</a>
        <button type="button" className="rp-btn lleno" onClick={() => alPedir(r)}>{Object.keys(r.tipico).length ? 'Pedir lo de siempre' : 'Nuevo pedido'}</button>
      </div>}>
      <div className="rp-ficha-cab">
        <p className="rp-ayuda">{[r.persona, r.tel, r.direccion].filter(Boolean).join(' · ')}</p>
        <button type="button" className="rp-btn chico" onClick={() => alEditar(r.id)}><Pencil size={14} /> Editar</button>
      </div>
      <div className="rp-mini tres">
        <div className="rp-tarjeta"><span className="rp-sobre">Último pedido</span><strong className={est === 'perdido' ? 'rojo' : ''}>{est === 'nuevo' ? '—' : hace(d)}</strong></div>
        <div className="rp-tarjeta"><span className="rp-sobre">Suele pedir</span><strong>cada {r.cada} d</strong></div>
        <div className="rp-tarjeta"><span className="rp-sobre">Te debe</span><strong className={debe ? 'rojo' : ''}>{dinero(debe)}</strong></div>
      </div>
      {debe > 0 && (
        <div className="rp-fila-btns rp-cobro">
          <a className="rp-btn" href={waLink(`Hola ${r.persona}, te paso tu saldo pendiente: ${dinero(debe)} de ${deb.length} ${deb.length === 1 ? 'entrega' : 'entregas'}. ¿Cuándo pasamos por él? Gracias.`)} target="_blank" rel="noreferrer">Recordarle el pago</a>
          <button type="button" className="rp-btn" onClick={() => { cobrar(r.id); avisarListo(`Cobrado ${dinero(debe)} de ${r.nombre}`); }}>Ya me pagó</button>
        </div>
      )}
      <p className="rp-rotulo">Lo de siempre</p>
      <p className="rp-siempre">{Object.keys(r.tipico).length ? resumenItems(r.tipico) : 'Todavía no lo sabemos.'}</p>
      {historial.length > 0 && <p className="rp-rotulo">Últimos pedidos</p>}
      <ul className="rp-lista tenue">
        {historial.map((x) => (
          <li key={x.id} className="rp-renglon">
            <span className="rp-renglon-txt"><strong>{diaDe(x.creado)}</strong><span>{resumenItems(x.items)}</span></span>
            <span className={`rp-pago ${x.estado === 'pendiente' ? 'pend' : x.pago}`}>{x.estado === 'pendiente' ? 'Por entregar' : x.pago === 'debe' ? 'A cuenta' : dinero(x.total)}</span>
          </li>
        ))}
      </ul>
    </Hoja>
  );
}

// ── SEMANA ──────────────────────────────────────────────────────────────────
function Semana() {
  const e = useReparto();
  const [cerrar, setCerrar] = useState(false);
  const ent = deSemana(e).filter((x) => x.estado === 'entregada');
  const vendido = ent.reduce((s, x) => s + x.total, 0);
  const cajas = ent.reduce((s, x) => s + cajasDe(x.items), 0);
  const cobrado = ent.filter((x) => x.pago !== 'debe').reduce((s, x) => s + x.total, 0);
  const ex = existencias(e);
  const m = {};
  ent.forEach((x) => { m[x.rest] = (m[x.rest] || 0) + x.total; });
  const porRest = Object.entries(m).sort((a, b) => b[1] - a[1]);
  const max = porRest[0]?.[1] || 1;
  const porRep = REPARTIDORES.map((r) => {
    const suyas = ent.filter((x) => x.rep === r.id);
    return { ...r, n: suyas.length, cajas: suyas.reduce((s, x) => s + cajasDe(x.items), 0) };
  });
  const desde = new Date(e.semana).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

  return (
    <>
      <Cabeza sobre={`Desde el ${desde}`} titulo="Semana">
        <button type="button" className="rp-btn chico" onClick={() => setCerrar(true)}>Empezar otra</button>
      </Cabeza>
      <section className="rp-mini tres">
        <div className="rp-tarjeta"><span className="rp-sobre">Vendido</span><strong>{dinero(vendido)}</strong></div>
        <div className="rp-tarjeta"><span className="rp-sobre">Cajas</span><strong>{cajas}</strong></div>
        <div className="rp-tarjeta"><span className="rp-sobre">Cobrado</span><strong>{dinero(cobrado)}</strong></div>
      </section>

      <section>
        <h2 className="rp-h2">Por cerveza</h2>
        <div className="rp-tabla">
          <div className="cab"><span /><span>Arrancó</span><span>Salió</span><span>Queda</span></div>
          {ex.map((p) => (
            <div key={p.id}><span>{p.nombre}</span><span>{p.inicial}</span><span>{p.salio}</span><b className={p.bodega <= BAJO ? 'rojo' : ''}>{p.bodega}</b></div>
          ))}
        </div>
        {ex.some((p) => p.ajustado) && (
          <p className="rp-pista rp-ajustes">Ajustes por conteo: {ex.filter((p) => p.ajustado).map((p) => `${p.nombre} ${p.ajustado > 0 ? '+' : ''}${p.ajustado}`).join(' · ')}</p>
        )}
      </section>

      <section>
        <h2 className="rp-h2">Quién te compró más</h2>
        <ul className="rp-barras">
          {porRest.map(([rid, t]) => (
            <li key={rid}><span>{restaurante(rid).nombre}</span><div><i style={{ width: `${(t / max) * 100}%` }} /></div><b>{dinero(t)}</b></li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="rp-h2">Repartidores</h2>
        <div className="rp-mini">
          {porRep.map((r) => <div key={r.id} className="rp-tarjeta"><span className="rp-sobre">{r.nombre}</span><strong>{r.cajas} cajas</strong><span className="rp-tenue">{r.n} entregas</span></div>)}
        </div>
      </section>

      <CerrarSemana abierta={cerrar} alCerrar={() => setCerrar(false)} />
    </>
  );
}

function CerrarSemana({ abierta, alCerrar }) {
  const e = useReparto();
  const [llego, setLlego] = useState({});
  const ex = existencias(e);
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Empezar semana nueva"
      pie={<button type="button" className="rp-btn lleno grande" onClick={() => { empezarSemana(llego); setLlego({}); alCerrar(); avisarListo('Semana nueva lista'); }}>Arrancar la semana</button>}>
      <p className="rp-ayuda">Lo que te sobró se queda. Suma lo que te llegó para esta semana y arranca de cero el conteo.</p>
      <ul className="rp-items">
        {ex.map((p) => (
          <li key={p.id}>
            <div><strong>{p.nombre}</strong><span>Te sobran {Math.max(0, p.bodega)} · arrancas con {Math.max(0, p.bodega) + (llego[p.id] || 0)}</span></div>
            <Contador valor={llego[p.id] || 0} alCambiar={(v) => setLlego((x) => ({ ...x, [p.id]: v }))} />
          </li>
        ))}
      </ul>
    </Hoja>
  );
}

