import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CreditCard, Lock, ShoppingBag, Trash2, Zap } from 'lucide-react';
import {
  CLIENTE, EXPRES, conAgotados, inicioDia, MENSAJES, OCASIONES, ZONAS, detalleItem, expresPosible, extra, franjasDe, nombreDia, nombreItem,
  pagarPedido, peso, precioItem, producto, quitarDelCarrito, subtotal, textoFranja, useFlores, zona,
} from './datos';
import { useAhora } from './comun';
import { FotoItem } from './Armar';
import { useNav } from './Sitio';

export function Carrito() {
  const e = useFlores();
  const { ir } = useNav();
  const sub = subtotal(e, e.carrito);
  const sinStock = conAgotados(e, e.carrito);
  if (!e.carrito.length) {
    return (
      <div className="fl-envoltura fl-vacio grande">
        <ShoppingBag size={34} strokeWidth={1.4} />
        <h1>Tu carrito está <em>vacío</em></h1>
        <p>Elige un ramo del catálogo o arma el tuyo tallo por tallo.</p>
        <div className="fl-fila">
          <button type="button" className="fl-boton" onClick={() => ir('catalogo')}>Ver ramos</button>
          <button type="button" className="fl-boton linea" onClick={() => ir('armar')}>Arma tu ramo</button>
        </div>
      </div>
    );
  }
  return (
    <div className="fl-envoltura fl-carrito">
      <h1>Tu <em>carrito</em></h1>
      <ul className="fl-renglones">
        {e.carrito.map((it) => (
          <li key={it.key}>
            <FotoItem it={it} />
            <div>
              <b>{nombreItem(it)}</b>
              <small>{detalleItem(it)}</small>
              {it.extras?.length > 0 && <small>+ {it.extras.map((x) => extra(x).corto).join(', ')}</small>}
              {sinStock.includes(it) && <small className="fl-alerta">Se agotó por hoy · quítalo para seguir</small>}
            </div>
            <em>{peso(precioItem(e, it))}</em>
            <button type="button" className="fl-icono" onClick={() => quitarDelCarrito(it.key)} aria-label={`Quitar ${nombreItem(it)}`}><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
      <div className="fl-carrito-pie">
        <button type="button" className="fl-enlace" onClick={() => ir('catalogo')}><ArrowLeft size={15} /> Seguir viendo</button>
        <div className="fl-comprar">
          <div><small>Subtotal · el envío se calcula con la colonia</small><b>{peso(sub)}</b></div>
          <button type="button" className="fl-boton" disabled={sinStock.length > 0} onClick={() => ir('pagar')}>Elegir entrega <ArrowRight size={17} /></button>
        </div>
      </div>
    </div>
  );
}

const PASOS = ['Entrega', 'Tarjeta', 'Pago'];

export function Pagar() {
  const e = useFlores();
  const { ir, atras } = useNav();
  const ahora = useAhora(30000);
  const primero = e.carrito[0];
  const ocInicial = primero?.tipo === 'producto' ? producto(primero.id).ocasiones[0] : 'porque';
  const hoyLibre = franjasDe(0, ahora).some((f) => f.libre);
  const [paso, setPaso] = useState(0);
  const [pagando, setPagando] = useState(false);
  const [problema, setProblema] = useState(null);
  const [d, setD] = useState({
    recibe: '', tel: '', zona: e.zonaElegida || '', direccion: '', referencia: '', guardarDireccion: true,
    dia: hoyLibre ? 0 : 1, franja: null, expres: false,
    ocasion: ocInicial, mensaje: '', firma: CLIENTE.nombre.split(' ')[0], anonimo: false,
  });
  const pon = (k, v) => setD((x) => ({ ...x, [k]: v }));

  if (!e.carrito.length && !pagando) {
    return (
      <div className="fl-envoltura fl-vacio grande">
        <h1>No hay nada por <em>pagar</em></h1>
        <button type="button" className="fl-boton" onClick={() => ir('catalogo')}>Ver ramos</button>
      </div>
    );
  }

  const franjas = franjasDe(d.dia, ahora);
  const puedeExpres = d.dia === 0 && expresPosible(ahora);
  const z = d.zona ? zona(d.zona) : null;
  const envio = (z?.costo || 0) + (d.expres ? EXPRES : 0);
  const sub = subtotal(e, e.carrito);

  const listo = [
    d.recibe.trim() && d.tel.replace(/\D/g, '').length >= 10 && d.zona && d.direccion.trim() && ((d.expres && puedeExpres) || franjas[d.franja]?.libre),
    d.mensaje.trim().length > 0,
    true,
  ][paso];

  const pagar = () => {
    setPagando(true);
    setTimeout(() => {
      const r = pagarPedido({ ...d, expres: d.expres && puedeExpres });
      if (typeof r === 'string') { ir('pedido', { id: r, recien: true }); return; }
      setPagando(false);
      if (r.error === 'vacio') { ir('pedidos'); return; }
      if (r.error === 'horario') { setProblema('La hora de entrega que elegiste ya no alcanza. Elige otra.'); setPaso(0); setD((v) => ({ ...v, franja: null, expres: false })); return; }
      setProblema('Uno de los ramos se agotó mientras pagabas. Revisa tu carrito.');
    }, 1400);
  };

  const usarDireccion = (x) => setD((v) => ({ ...v, recibe: x.recibe, tel: x.tel, zona: x.zona, direccion: x.direccion, referencia: x.referencia, guardarDireccion: false }));

  return (
    <div className="fl-envoltura fl-pagar">
      <div className="fl-pagar-main">
        <button type="button" className="fl-volver" onClick={() => (paso ? setPaso(paso - 1) : atras())}><ArrowLeft size={17} /> {paso ? PASOS[paso - 1] : 'Carrito'}</button>
        <ol className="fl-progreso">
          {PASOS.map((p, i) => <li key={p} className={i < paso ? 'hecho' : i === paso ? 'activo' : ''}><span>{i < paso ? <Check size={13} /> : i + 1}</span>{p}</li>)}
        </ol>

        {paso === 0 && (
          <div className="fl-form">
            <h1>¿A quién se <em>lo llevamos</em>?</h1>
            {e.direcciones.length > 0 && (
              <div className="fl-guardadas">
                {e.direcciones.map((x) => (
                  <button key={x.id} type="button" className={d.direccion === x.direccion ? 'activo' : ''} onClick={() => usarDireccion(x)}>
                    <b>{x.etiqueta}</b><small>{x.direccion} · {zona(x.zona).nombre}</small>
                  </button>
                ))}
              </div>
            )}
            <div className="fl-campos dos">
              <label><span>Quién lo recibe</span><input value={d.recibe} onChange={(ev) => pon('recibe', ev.target.value)} placeholder="Nombre y apellido" autoComplete="off" /></label>
              <label><span>Su teléfono</span><input value={d.tel} onChange={(ev) => pon('tel', ev.target.value)} placeholder="222 000 0000" inputMode="tel" autoComplete="off" /></label>
            </div>
            <div className="fl-campos dos">
              <label><span>Colonia</span>
                <select value={d.zona} onChange={(ev) => pon('zona', ev.target.value)}>
                  <option value="">Elige la colonia</option>
                  {ZONAS.map((x) => <option key={x.id} value={x.id}>{x.nombre} · envío {peso(x.costo)}</option>)}
                </select>
              </label>
              <label><span>Calle y número</span><input value={d.direccion} onChange={(ev) => pon('direccion', ev.target.value)} placeholder="Calle 23 Sur 1904, int. 3" autoComplete="off" /></label>
            </div>
            <label className="fl-campo"><span>Referencias (opcional)</span><input value={d.referencia} onChange={(ev) => pon('referencia', ev.target.value)} placeholder="Portón verde, tocar fuerte" autoComplete="off" /></label>

            <h4>¿Cuándo?</h4>
            <div className="fl-dias">
              {[0, 1, 2, 3, 4, 5, 6].map((x) => {
                const vacio = x === 0 && !franjasDe(0, ahora).some((f) => f.libre) && !expresPosible(ahora);
                return (
                  <button key={x} type="button" disabled={vacio} className={d.dia === x ? 'activo' : ''} onClick={() => setD((v) => ({ ...v, dia: x, franja: null, expres: false }))}>
                    {x < 2 ? nombreDia(x) : new Date(inicioDia(x)).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}
                  </button>
                );
              })}
            </div>
            <div className="fl-franjas">
              {franjas.map(({ i, f, libre }) => (
                <button key={i} type="button" disabled={!libre} className={!d.expres && d.franja === i ? 'activo' : ''} onClick={() => setD((v) => ({ ...v, franja: i, expres: false }))}>
                  <b>{textoFranja(f)}</b><small>{libre ? 'Disponible' : 'Ya no alcanza'}</small>
                </button>
              ))}
              {puedeExpres && (
                <button type="button" className={`expres ${d.expres ? 'activo' : ''}`} onClick={() => setD((v) => ({ ...v, expres: true, franja: null }))}>
                  <b><Zap size={14} /> Exprés en 2 h</b><small>+{peso(EXPRES)}</small>
                </button>
              )}
            </div>
            {!e.direcciones.some((x) => x.direccion === d.direccion) && d.direccion && (
              <label className="fl-check"><input type="checkbox" checked={d.guardarDireccion} onChange={(ev) => pon('guardarDireccion', ev.target.checked)} /> Guardar esta dirección para la próxima</label>
            )}
          </div>
        )}

        {paso === 1 && (
          <div className="fl-form">
            <h1>Escribe la <em>tarjeta</em></h1>
            <div className="fl-filtros" role="group" aria-label="Ocasión">
              {OCASIONES.map((o) => <button key={o.id} type="button" className={d.ocasion === o.id ? 'activo' : ''} onClick={() => pon('ocasion', o.id)}>{o.nombre}</button>)}
            </div>
            <label className="fl-campo">
              <span>Mensaje <small>{d.mensaje.length}/220</small></span>
              <textarea rows={4} maxLength={220} value={d.mensaje} onChange={(ev) => pon('mensaje', ev.target.value)} placeholder="Escribe lo que quieras que diga la tarjeta" />
            </label>
            <div className="fl-ideas">
              <span>Ideas:</span>
              {MENSAJES[d.ocasion].map((m) => <button key={m} type="button" onClick={() => pon('mensaje', m)}>{m}</button>)}
            </div>
            <div className="fl-campos dos">
              <label><span>Firma</span><input value={d.anonimo ? '' : d.firma} disabled={d.anonimo} onChange={(ev) => pon('firma', ev.target.value)} placeholder="Tu nombre" /></label>
              <label className="fl-check alto"><input type="checkbox" checked={d.anonimo} onChange={(ev) => pon('anonimo', ev.target.checked)} /> Enviarlo anónimo</label>
            </div>
            <div className="fl-tarjeta-papel">
              <p>{d.mensaje || 'Tu mensaje aparecerá aquí.'}</p>
              <span>{d.anonimo ? 'Alguien que te quiere' : `— ${d.firma || '…'}`}</span>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="fl-form">
            <h1>Último <em>paso</em></h1>
            <div className="fl-tarjeta-pago">
              <div className="fl-tarjeta-pago-cab"><CreditCard size={18} /> Tarjeta de crédito o débito</div>
              <label className="fl-campo"><span>Número</span><input defaultValue="4242 4242 4242 4242" inputMode="numeric" /></label>
              <div className="fl-campos tres">
                <label><span>Vence</span><input defaultValue="12/28" /></label>
                <label><span>CVC</span><input defaultValue="123" /></label>
                <label><span>Nombre</span><input defaultValue={CLIENTE.nombre} /></label>
              </div>
              <p className="fl-nota"><Lock size={13} /> Tarjeta de prueba: en la demo no se cobra nada.</p>
            </div>
            <div className="fl-resumen-entrega">
              <p><b>{d.recibe}</b> · {d.tel}</p>
              <p>{d.direccion}, {z?.nombre}{d.referencia ? ` · ${d.referencia}` : ''}</p>
              <p>{d.expres ? 'Exprés: llega en máximo 2 horas' : `${nombreDia(d.dia)} · ${textoFranja(franjas[d.franja].f)}`}</p>
              <p className="fl-suave">“{d.mensaje}” — {d.anonimo ? 'anónimo' : d.firma}</p>
            </div>
          </div>
        )}

        {problema && <p className="fl-alerta fl-problema" role="alert">{problema}</p>}
        <div className="fl-pagar-acciones">
          {paso < 2
            ? <button type="button" className="fl-boton" disabled={!listo} onClick={() => { setPaso(paso + 1); window.scrollTo({ top: 0 }); }}>Continuar <ArrowRight size={17} /></button>
            : <button type="button" className="fl-boton" disabled={pagando} onClick={pagar}>{pagando ? 'Procesando pago…' : `Pagar ${peso(sub + envio)}`}</button>}
        </div>
      </div>

      <aside className="fl-resumen">
        <h3>Tu pedido</h3>
        <ul>
          {e.carrito.map((it) => (
            <li key={it.key}>
              <FotoItem it={it} />
              <div><b>{nombreItem(it)}</b><small>{detalleItem(it)}{it.extras?.length ? ` + ${it.extras.map((x) => extra(x).corto).join(', ')}` : ''}</small></div>
              <em>{peso(precioItem(e, it))}</em>
            </li>
          ))}
        </ul>
        <dl>
          <div><dt>Subtotal</dt><dd>{peso(sub)}</dd></div>
          <div><dt>Envío{z ? ` · ${z.nombre}` : ''}{d.expres ? ' · exprés' : ''}</dt><dd>{z ? peso(envio) : '—'}</dd></div>
          <div className="total"><dt>Total</dt><dd>{peso(sub + envio)}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
