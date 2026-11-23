import { useState } from 'react';
import { Check, MapPin, Phone } from 'lucide-react';
import {
  REPARTIDORES, cajasDe, diaDe, dinero, entregar, horaDe, inicioDia, pendientes, producto, repartidor,
  restaurante, useReparto,
} from './datos';
import { BotonPantalla, Hoja, Segmentos, avisarListo } from './comun';

// Lo que ve el repartidor en su celular: qué entregar, a dónde, y "Entregado".
export default function Repartidor() {
  const e = useReparto();
  const [quien, setQuien] = useState(REPARTIDORES[0].id);
  const [entregando, setEntregando] = useState(null);
  const yo = repartidor(quien);
  const hoy = inicioDia(0);
  const mias = pendientes(e).filter((x) => x.rep === quien);
  const deHoy = mias.filter((x) => x.para <= hoy);
  const despues = mias.filter((x) => x.para > hoy);
  const hechas = e.entregas.filter((x) => x.rep === quien && x.estado === 'entregada' && x.entregado >= hoy).sort((a, b) => b.entregado - a.entregado);
  const efectivo = hechas.filter((x) => x.pago === 'efectivo').reduce((s, x) => s + x.total, 0);
  const x = e.entregas.find((y) => y.id === entregando);

  return (
    <div className="rp-app solo">
      <main className="rp-main">
        <header className="rp-cab">
          <div>
            <p className="rp-sobre">{yo.unidad}</p>
            <h1>Hola, {yo.nombre}</h1>
          </div>
          <div className="rp-cab-der">
            <Segmentos valor={quien} alCambiar={setQuien} opciones={REPARTIDORES.map((r) => ({ id: r.id, etiqueta: r.nombre }))} />
            <BotonPantalla />
          </div>
        </header>

        <section className="rp-mini">
          <div className="rp-tarjeta"><span className="rp-sobre">Te faltan</span><strong>{deHoy.length} <small>{deHoy.length === 1 ? 'entrega' : 'entregas'}</small></strong><span className="rp-tenue">{deHoy.reduce((s, y) => s + cajasDe(y.items), 0)} cajas en la camioneta</span></div>
          <div className="rp-tarjeta"><span className="rp-sobre">Traes en efectivo</span><strong>{dinero(efectivo)}</strong><span className="rp-tenue">{hechas.length} entregadas hoy</span></div>
        </section>

        {deHoy.length === 0 && <p className="rp-vacio grande">No tienes entregas pendientes.</p>}
        {deHoy.map((y, i) => <Tarjeta key={y.id} x={y} primero={i === 0} alEntregar={() => setEntregando(y.id)} />)}

        {despues.length > 0 && (
          <section>
            <h2 className="rp-h2">Después <span>{despues.length}</span></h2>
            <ul className="rp-lista tenue">
              {despues.map((y) => (
                <li key={y.id} className="rp-renglon">
                  <span className="rp-cajas">{cajasDe(y.items)}</span>
                  <span className="rp-renglon-txt"><strong>{restaurante(y.rest).nombre}</strong><span>{diaDe(y.para)}</span></span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hechas.length > 0 && (
          <section>
            <h2 className="rp-h2">Entregadas hoy</h2>
            <ul className="rp-lista tenue">
              {hechas.map((y) => (
                <li key={y.id} className="rp-renglon">
                  <span className="rp-punto verde" />
                  <span className="rp-renglon-txt"><strong>{restaurante(y.rest).nombre}</strong><span>{horaDe(y.entregado)}</span></span>
                  <span className={`rp-pago ${y.pago}`}>{y.pago === 'debe' ? 'A cuenta' : y.pago === 'transferencia' ? 'Transfirió' : dinero(y.total)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <Hoja abierta={!!x} alCerrar={() => setEntregando(null)} titulo="¿Cómo te pagó?">
        {x && (
          <>
            <p className="rp-ayuda">{restaurante(x.rest).nombre} · {dinero(x.total)}</p>
            <div className="rp-opciones">
              {[
                { id: 'efectivo', t: 'Efectivo', d: `Te dio ${dinero(x.total)}` },
                { id: 'transferencia', t: 'Transferencia', d: 'Ya le llegó al dueño' },
                { id: 'debe', t: 'Quedó a deber', d: 'Se anota a su cuenta' },
              ].map((o) => (
                <button key={o.id} type="button" className={`rp-opcion ${x.debe && o.id === 'debe' ? 'sugerida' : ''}`} onClick={() => {
                  entregar(x.id, o.id); setEntregando(null); avisarListo(`Entregado en ${restaurante(x.rest).nombre}`);
                }}>
                  <strong>{o.t}</strong><span>{o.d}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </Hoja>
    </div>
  );
}

function Tarjeta({ x, primero, alEntregar }) {
  const r = restaurante(x.rest);
  return (
    <article className={`rp-entrega ${primero ? 'primero' : ''}`}>
      <div className="rp-entrega-cab">
        <div>
          <h3>{r.nombre}</h3>
          {r.direccion && <p>{r.direccion}</p>}
        </div>
        {primero && <span className="rp-sigue">Sigue</span>}
      </div>
      <ul className="rp-carga">
        {Object.entries(x.items).map(([id, n]) => <li key={id}><b>{n}</b>{producto(id).nombre}</li>)}
      </ul>
      <p className="rp-entrega-total">
        {x.debe ? 'Va a cuenta · no cobrar' : <>Cobrar <strong>{dinero(x.total)}</strong></>}
      </p>
      {(r.tel || r.direccion) && (
        <div className="rp-fila-btns">
          {r.tel && <a className="rp-btn" href={`tel:${r.tel.replace(/\s/g, '')}`}><Phone size={16} /> Llamar</a>}
          {r.direccion && <a className="rp-btn" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.direccion}, Puebla`)}`} target="_blank" rel="noreferrer"><MapPin size={16} /> Cómo llegar</a>}
        </div>
      )}
      <button type="button" className="rp-btn lleno grande" onClick={alEntregar}><Check size={18} /> Entregado</button>
    </article>
  );
}
