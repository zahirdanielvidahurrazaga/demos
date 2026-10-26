import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ESTADOS_ORDEN, avanzarOrden, dinero, inicioDia, nombreLugar, platillo, useCine } from './datos';
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
  const hoy = e.ordenes.filter((o) => o.t >= inicioDia(0));

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
        <div><p className="ac-etiqueta">Fuente de sodas</p><h1>Pedidos de esta noche</h1></div>
        <div className="ac-der">
          <span className="ac-chip verde">{entregadas.length} entregados</span>
          <span className="ac-chip">{dinero(venta)} vendido hoy</span>
          <Controles vidrio={false} />
        </div>
      </div>
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
                      {o.programada && <span className="ac-chip rosa">Pagado con el boleto</span>}
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
    </div>
  );
}
