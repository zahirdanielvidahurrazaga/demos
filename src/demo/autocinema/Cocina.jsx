import { useEffect, useRef, useState } from 'react';
import { CalendarClock, ChevronRight, PackageCheck, TriangleAlert } from 'lucide-react';
import { ESTADOS_ORDEN, INSUMOS, avanzarOrden, dinero, hora, inicioDia, nombreLugar, platillo, surtir, useCine } from './datos';
import { Controles, minutos, useAhora } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// COCINA Y REPARTO — cada pedido llega con el LUGAR del auto en grande (sale
// del boleto: nadie escribe códigos en comentarios). Tres columnas; las órdenes
// de la simulación avanzan solas, las tuyas las mueves con el botón.
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNAS = [
  ['recibido', 'Nuevos', 'Empezar'],
  ['preparando', 'En cocina', 'Mandar al auto'],
  ['camino', 'Van a los autos', 'Entregado'],
];

export default function Cocina() {
  const e = useCine();
  const ahora = useAhora(15000);
  const vistos = useRef(null);
  const [nuevas, setNuevas] = useState(new Set());
  const [vista, setVista] = useState('pedidos');
  const bajos = INSUMOS.filter((i) => (e.inventario?.[i.id] ?? i.max) <= i.minimo);
  // por su último movimiento: un pedido hecho ayer "para cuando llegue" cuenta hoy
  const hoy = e.ordenes.filter((o) => (o.cambio || o.t) >= inicioDia(0) && o.estado !== 'cancelado');

  // las que acaban de entrar parpadean
  useEffect(() => {
    const ids = new Set(e.ordenes.map((o) => o.id));
    if (vistos.current) {
      const n = [...ids].filter((id) => !vistos.current.has(id));
      if (n.length) setNuevas((s) => new Set([...s, ...n]));
    }
    vistos.current = ids;
  }, [e.ordenes]);

  const entregadas = hoy.filter((o) => o.estado === 'entregado');
  const venta = hoy.reduce((n, o) => n + o.total, 0);

  return (
    <div className="ac-envoltura ac-panel">
      <div className="ac-panel-cab">
        <div><p className="ac-etiqueta">Fuente de sodas</p><h1>{vista === 'pedidos' ? 'Pedidos de esta noche' : 'Inventario'}</h1></div>
        <div className="ac-der">
          <span className="ac-chip verde">{entregadas.length} entregados</span>
          <span className="ac-chip">{dinero(venta)} vendido hoy</span>
          <Controles vidrio={false} />
        </div>
      </div>
      <div className="ac-horas" style={{ marginBottom: 16 }}>
        <button type="button" className={`ac-hora-btn ${vista === 'pedidos' ? 'activo' : ''}`} onClick={() => setVista('pedidos')}>Pedidos</button>
        <button type="button" className={`ac-hora-btn ${vista === 'inventario' ? 'activo' : ''}`} onClick={() => setVista('inventario')}>
          Inventario{bajos.length > 0 && <small style={{ color: 'var(--ac-alerta)' }}>{bajos.length} por surtir</small>}
        </button>
      </div>
      {vista === 'inventario' ? <Inventario e={e} /> : (<>
      {bajos.length > 0 && (
        <button type="button" className="ac-aviso-dueno" style={{ maxWidth: 'none', margin: '0 0 14px', width: '100%', border: 0, textAlign: 'left', color: 'inherit', background: 'var(--ac-alerta-velo)' }} onClick={() => setVista('inventario')}>
          <TriangleAlert size={18} style={{ color: 'var(--ac-alerta)' }} />
          <span><b>Se está acabando:</b> {bajos.map((i) => i.nombre.toLowerCase()).join(', ')}. Toca para surtir.</span>
        </button>
      )}
      <Programados e={e} />
      <div className="ac-cocina">
        {COLUMNAS.map(([k, titulo, accion]) => {
          const lista = hoy.filter((o) => o.estado === k).sort((a, b) => a.t - b.t);
          return (
            <section key={k} className="ac-columna">
              <header><span>{titulo}</span><span className="ac-chip">{lista.length}</span></header>
              {lista.map((o) => {
                const espera = minutos(o.cambio, ahora);
                return (
                  <article key={o.id} className={`ac-tarjeta ac-orden ${nuevas.has(o.id) ? 'nueva' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <div className="ac-orden-lugar">{nombreLugar(o.lugar)}</div>
                      <span className="ac-mono ac-suave" style={{ fontSize: 13 }}>#{o.numero}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="ac-chip">{o.nombre}</span>
                      {o.mio && <span className="ac-chip ambar">Tu pedido</span>}
                      {o.programada && <span className="ac-chip ambar">{o.llego ? 'Programado · ya llegó' : 'Programado'}</span>}
                      {o.recompensa && <span className="ac-chip verde">Canje de Cocopuntos · no se cobra</span>}
                    </div>
                    <ul>{o.items.map(([pid, q]) => <li key={pid}><b>{q}×</b>{platillo(pid).nombre}</li>)}</ul>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <span className={espera >= 8 ? 'ac-tarde' : 'ac-suave'} style={{ fontSize: 13 }}>{espera} min {k === 'recibido' ? 'esperando' : k === 'preparando' ? 'en cocina' : 'en camino'}</span>
                      <button type="button" className="ac-btn chico" onClick={() => { avanzarOrden(o.id); setNuevas((s) => { const n = new Set(s); n.delete(o.id); return n; }); }}>
                        {accion} <ChevronRight size={15} />
                      </button>
                    </div>
                  </article>
                );
              })}
              {!lista.length && <p className="ac-suave" style={{ fontSize: 14, padding: '6px 6px 10px' }}>Nada por aquí.</p>}
            </section>
          );
        })}
      </div>
      <p className="ac-suave" style={{ fontSize: 13, marginTop: 14 }}>{ESTADOS_ORDEN.map(([, t]) => t).join(' → ')} · el cliente ve cada paso en su boleto.</p>
      </>)}
    </div>
  );
}

// Pedidos programados: "listo al llegar" (entran a cocina cuando la entrada
// lee el boleto) o a una hora (entran a esa hora).
function Programados({ e }) {
  const lista = e.ordenes.filter((o) => o.estado === 'programado').sort((a, b) => (a.para === 'llegada' ? 0 : a.para) - (b.para === 'llegada' ? 0 : b.para));
  if (!lista.length) return null;
  return (
    <div className="ac-tarjeta" style={{ padding: '14px 16px', marginBottom: 14, display: 'grid', gap: 10 }}>
      <p className="ac-etiqueta" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><CalendarClock size={15} /> Programados · {lista.length}</p>
      <div className="ac-fila">
        {lista.map((o) => (
          <div key={o.id} className="ac-programado">
            <b>{nombreLugar(o.lugar)}</b>
            <span>{o.items.map(([pid, q]) => `${q}× ${platillo(pid).nombre}`).join(' · ')}</span>
            <small>{o.para === 'llegada' ? 'Al llegar el auto' : `A las ${hora(o.para)}`}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

// Inventario: cada pedido descuenta sus insumos; abajo del mínimo se avisa y
// lo que ya no alcanza sale "agotado" en el menú del cliente.
function Inventario({ e }) {
  return (
    <div className="ac-tarjeta ac-caja">
      <div className="ac-tabla-scroll">
        <table className="ac-tabla">
          <thead><tr><th>Insumo</th><th>Existencia</th><th style={{ minWidth: 160 }}>Nivel</th><th /></tr></thead>
          <tbody>
            {INSUMOS.map((i) => {
              const hay = e.inventario?.[i.id] ?? i.max;
              const bajo = hay <= i.minimo;
              return (
                <tr key={i.id}>
                  <td><b style={{ fontWeight: 600 }}>{i.nombre}</b>{bajo && <span className="ac-chip rosa" style={{ marginLeft: 8, padding: '3px 9px', fontSize: 11.5 }}>{hay <= 0 ? 'Agotado' : 'Bajo'}</span>}</td>
                  <td className="ac-mono">{(i.unidad === 'pzas' ? Math.floor(hay) : hay).toLocaleString('es-MX', { maximumFractionDigits: 1 })} {i.unidad}</td>
                  <td><div className={`ac-barra-oc ${bajo ? 'alta' : ''}`} style={{ height: 6 }}><i style={{ width: `${Math.min(100, (hay / i.max) * 100)}%` }} /></div><span className="ac-suave" style={{ fontSize: 12 }}>mínimo {i.minimo} {i.unidad}</span></td>
                  <td style={{ textAlign: 'right' }}><button type="button" className={`ac-btn chico ${bajo ? 'acento' : 'fantasma'}`} onClick={() => surtir(i.id)}><PackageCheck size={15} /> Surtir</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="ac-suave" style={{ fontSize: 13, marginTop: 12 }}>Se descuenta solo con cada pedido (en línea, en el lugar y canjes). "Surtir" registra la llegada del proveedor.</p>
    </div>
  );
}
