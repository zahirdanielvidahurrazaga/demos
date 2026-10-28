import { useState } from 'react';
import { ArrowRight, Bell, CalendarHeart, Check, MapPin, Package, Plus, RotateCcw, Trash2, Truck } from 'lucide-react';
import {
  CLIENTE, ESTADOS, NEGOCIO, agregarFecha, detalleItem, estado, extra, horaDe, misPedidos, nombreItem, pasoDe, pedidoPorId,
  peso, proximaFecha, quitarFecha, repetirPedido, textoEntrega, useFlores, zona,
} from './datos';
import { Foto, avisarListo, useAhora } from './comun';
import { FotoItem } from './Armar';
import { useNav } from './Sitio';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const OCASION_DE = { 'Cumpleaños': 'cumpleanos', 'Aniversario': 'aniversario', 'Día especial': 'porque' };

export function Pedidos() {
  const e = useFlores();
  const { ir } = useNav();
  const lista = misPedidos(e);
  const vivos = lista.filter((p) => p.estado !== 'entregado');
  const antes = lista.filter((p) => p.estado === 'entregado');
  if (!lista.length) {
    return (
      <div className="fl-envoltura fl-vacio grande">
        <Package size={34} strokeWidth={1.4} />
        <h1>Aún no tienes <em>pedidos</em></h1>
        <button type="button" className="fl-boton" onClick={() => ir('catalogo')}>Ver ramos</button>
      </div>
    );
  }
  return (
    <div className="fl-envoltura fl-pedidos">
      <h1>Mis <em>pedidos</em></h1>
      {vivos.length > 0 && <p className="fl-cejilla">En curso</p>}
      {vivos.map((p) => <FilaPedido key={p.id} p={p} />)}
      {antes.length > 0 && <p className="fl-cejilla">Entregados</p>}
      {antes.map((p) => <FilaPedido key={p.id} p={p} />)}
    </div>
  );
}

function FilaPedido({ p }) {
  const { ir } = useNav();
  const i = pasoDe(p.estado);
  return (
    <button type="button" className="fl-fila-pedido" onClick={() => ir('pedido', { id: p.id })}>
      <FotoItem it={p.items[0]} />
      <div>
        <b>{p.items.map(nombreItem).join(' + ')}</b>
        <small>Para {p.recibe} · {textoEntrega(p)}</small>
        <div className="fl-barrita"><i style={{ width: `${(i / (ESTADOS.length - 1)) * 100}%` }} /></div>
      </div>
      <span className={`fl-estado e-${p.estado}`}>{estado(p.estado).corto}</span>
    </button>
  );
}

export function Pedido({ id, recien }) {
  const e = useFlores();
  const { ir } = useNav();
  const ahora = useAhora(5000);
  const p = pedidoPorId(e, id);
  if (!p) return <div className="fl-envoltura fl-vacio grande"><h1>No encontramos ese <em>pedido</em></h1></div>;
  const i = pasoDe(p.estado);
  const s = estado(p.estado);
  const z = zona(p.zona);
  const yaGuardada = e.fechas.some((f) => f.quien === p.recibe.split(' ')[0]);

  // en camino: avance aproximado según los minutos de la zona
  const salio = p.historial.camino || ahora;
  const avance = p.estado === 'entregado' ? 1 : p.estado === 'camino' ? Math.min(0.92, (ahora - salio) / (z.min * 60000)) : 0;

  const guardarFecha = () => {
    const d = new Date(p.dia);
    agregarFecha({ quien: p.recibe.split(' ')[0], motivo: p.ocasion === 'aniversario' ? 'Aniversario' : p.ocasion === 'cumpleanos' ? 'Cumpleaños' : 'Día especial', dia: d.getDate(), mes: d.getMonth() });
    avisarListo('Te lo recordamos el próximo año');
  };

  return (
    <div className="fl-envoltura fl-seguimiento">
      {recien && i === 0 && (
        <div className="fl-recien"><Check size={18} /> Pago aprobado. Tu pedido <b>#{p.folio}</b> ya está en el taller.</div>
      )}
      <div className="fl-seg-in">
        <div className="fl-seg-foto">
          {p.fotoEntrega ? (
            <figure><Foto nombre={p.fotoEntrega} texto="Foto de la entrega" /><figcaption>Lo recibió <b>{p.recibio}</b> · {horaDe(p.historial.entregado)}</figcaption></figure>
          ) : p.fotoArreglo ? (
            <figure>
              {p.items[0].tipo === 'armado' ? <FotoItem it={p.items[0]} /> : <Foto nombre={p.fotoArreglo} texto="Así quedó tu ramo" />}
              <figcaption>Foto real del taller · {horaDe(p.historial.listo)}</figcaption>
            </figure>
          ) : (
            <figure className="espera">
              <FotoItem it={p.items[0]} />
              <figcaption>Aquí vas a ver la foto real de tu ramo antes de que salga.</figcaption>
            </figure>
          )}
        </div>

        <div className="fl-seg-txt">
          <p className="fl-cejilla">Pedido #{p.folio} · {textoEntrega(p)}</p>
          <h1>{s.cliente}<em>.</em></h1>
          <p className="fl-suave">{s.texto}</p>

          {p.estado === 'camino' && (
            <div className="fl-ruta">
              <div className="fl-ruta-linea"><i style={{ left: `${avance * 100}%` }}><Truck size={16} /></i></div>
              <div className="fl-ruta-pie"><span>Taller</span><span>{z.nombre}</span></div>
              <p>Lo lleva <b>{p.repartidor}</b> · llega aprox. a las <b>{horaDe(salio + z.min * 60000)}</b></p>
            </div>
          )}

          <ol className="fl-linea">
            {ESTADOS.map((x, k) => (
              <li key={x.id} className={k < i ? 'hecho' : k === i ? 'ahora' : ''}>
                <span>{k <= i ? <Check size={12} /> : null}</span>
                <b>{x.nombre}</b>
                <small>{p.historial[x.id] ? horaDe(p.historial[x.id]) : ''}</small>
              </li>
            ))}
          </ol>

          <div className="fl-tarjeta-papel chica">
            <p>{p.mensaje}</p>
            <span>{p.anonimo ? 'Alguien que te quiere' : `— ${p.firma}`}</span>
          </div>

          <dl className="fl-datos">
            <div><dt>Para</dt><dd>{p.recibe} · {p.tel}</dd></div>
            <div><dt>Dirección</dt><dd>{p.direccion}, {z.nombre}{p.referencia ? ` · ${p.referencia}` : ''}</dd></div>
            {p.items.map((it, k) => (
              <div key={k}><dt>{nombreItem(it)}</dt><dd>{detalleItem(it)}{it.extras?.length ? ` + ${it.extras.map((x) => extra(x).corto).join(', ')}` : ''}</dd></div>
            ))}
            <div><dt>Total</dt><dd><b>{peso(p.total)}</b> (envío {peso(p.envio)})</dd></div>
          </dl>

          <div className="fl-fila">
            <button type="button" className="fl-boton" onClick={() => { repetirPedido(p.id); ir('carrito'); }}><RotateCcw size={16} /> Volver a pedirlo</button>
            {!yaGuardada && <button type="button" className="fl-boton linea" onClick={guardarFecha}><CalendarHeart size={16} /> Recordarme esta fecha</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Perfil() {
  const e = useFlores();
  const { ir } = useNav();
  const proxima = [...e.fechas].map((f) => ({ f, ...proximaFecha(f) })).sort((a, b) => a.dias - b.dias)[0];
  const pedidos = misPedidos(e);
  return (
    <div className="fl-envoltura fl-perfil">
      <div className="fl-perfil-cab">
        <span className="fl-avatar">{CLIENTE.iniciales}</span>
        <div><h1>{CLIENTE.nombre}</h1><p className="fl-suave">{CLIENTE.telefono} · {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'}</p></div>
      </div>

      <button type="button" className="fl-caja fl-caja-fecha" onClick={() => ir('fechas')}>
        <CalendarHeart size={20} />
        <div>
          <b>Mis fechas</b>
          {proxima ? <small>La próxima: {proxima.f.quien} ({proxima.f.motivo.toLowerCase()}) en {proxima.dias === 0 ? 'hoy' : `${proxima.dias} días`}</small> : <small>Guarda cumpleaños y aniversarios</small>}
        </div>
        <ArrowRight size={17} />
      </button>

      <h3>Direcciones guardadas</h3>
      <ul className="fl-lista">
        {e.direcciones.map((d) => (
          <li key={d.id}><MapPin size={16} /><div><b>{d.etiqueta} · {d.recibe}</b><small>{d.direccion}, {zona(d.zona).nombre}</small></div></li>
        ))}
      </ul>

      <h3>Avisos</h3>
      <ul className="fl-lista">
        <li><Bell size={16} /><div><b>Seguimiento del pedido</b><small>Notificación cuando sale y cuando se entrega, con la foto</small></div><span className="fl-interruptor si" aria-hidden="true" /></li>
        <li><CalendarHeart size={16} /><div><b>Recordatorio de fechas</b><small>5 días antes, con ideas de ramos</small></div><span className="fl-interruptor si" aria-hidden="true" /></li>
      </ul>
      <p className="fl-nota">{NEGOCIO.completo} · {NEGOCIO.telefono}</p>
    </div>
  );
}

export function Fechas() {
  const e = useFlores();
  const { ir } = useNav();
  const [nueva, setNueva] = useState(false);
  const [f, setF] = useState({ quien: '', motivo: 'Cumpleaños', fecha: '' });
  const lista = e.fechas.map((x) => ({ x, ...proximaFecha(x) })).sort((a, b) => a.dias - b.dias);
  const guardar = (ev) => {
    ev.preventDefault();
    const [, m, d] = f.fecha.split('-').map(Number);
    agregarFecha({ quien: f.quien.trim(), motivo: f.motivo, dia: d, mes: m - 1 });
    setF({ quien: '', motivo: 'Cumpleaños', fecha: '' });
    setNueva(false);
    avisarListo('Fecha guardada');
  };
  return (
    <div className="fl-envoltura fl-fechas">
      <h1>Mis <em>fechas</em></h1>
      <p className="fl-suave">Te avisamos 5 días antes con ideas de ramos para que nunca se te pase.</p>
      <ul className="fl-fechas-lista">
        {lista.map(({ x, t, dias }) => (
          <li key={x.id} className={dias <= 7 ? 'pronto' : ''}>
            <div className="fl-fecha-num"><b>{x.dia}</b><small>{MESES[x.mes].slice(0, 3)}</small></div>
            <div>
              <b>{x.quien}</b>
              <small>{x.motivo} · {dias === 0 ? 'es hoy' : dias === 1 ? 'mañana' : `faltan ${dias} días`}</small>
              {dias <= 7 && <small className="fl-alerta">Llega a tiempo si pides hoy</small>}
            </div>
            <button type="button" className="fl-boton chico" onClick={() => ir('catalogo', { ocasion: OCASION_DE[x.motivo] || 'porque' })}>Elegir ramo</button>
            <button type="button" className="fl-icono" onClick={() => quitarFecha(x.id)} aria-label={`Quitar ${x.quien}`} title={new Date(t).toLocaleDateString('es-MX')}><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
      {nueva ? (
        <form className="fl-form fl-caja" onSubmit={guardar}>
          <div className="fl-campos tres">
            <label><span>¿Quién?</span><input required value={f.quien} onChange={(ev) => setF({ ...f, quien: ev.target.value })} placeholder="Mamá, Dani…" /></label>
            <label><span>Motivo</span>
              <select value={f.motivo} onChange={(ev) => setF({ ...f, motivo: ev.target.value })}>
                {Object.keys(OCASION_DE).map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label><span>Fecha</span><input required type="date" value={f.fecha} onChange={(ev) => setF({ ...f, fecha: ev.target.value })} /></label>
          </div>
          <div className="fl-fila"><button type="submit" className="fl-boton">Guardar</button><button type="button" className="fl-boton linea" onClick={() => setNueva(false)}>Cancelar</button></div>
        </form>
      ) : (
        <button type="button" className="fl-boton linea" onClick={() => setNueva(true)}><Plus size={16} /> Agregar fecha</button>
      )}
    </div>
  );
}
