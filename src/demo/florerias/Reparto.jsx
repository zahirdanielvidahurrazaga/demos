import { useState } from 'react';
import { Camera, Navigation, Phone, Truck } from 'lucide-react';
import {
  REPARTIDORES, entregarPedido, horaDe, inicioDia, margen, nombreItem, salirPedido, textoEntrega, useFlores, zona,
} from './datos';
import { BotonPantalla, Foto, Logo, Ventana, avisarListo, useAhora } from './comun';
import { FotoItem } from './Armar';
import { Urgencia } from './Taller';

// ─────────────────────────────────────────────────────────────────────────────
// REPARTO — la app del repartidor: recoger en el taller, ruta ordenada por lo
// que vence primero, llamar, abrir en Maps y entregar con foto + quién recibió.
// ─────────────────────────────────────────────────────────────────────────────

export default function Reparto() {
  const e = useFlores();
  const ahora = useAhora(15000);
  const [yo, setYo] = useState(REPARTIDORES[0]);
  const [entrega, setEntrega] = useState(null);
  const porMargen = (a, b) => margen(a, ahora) - margen(b, ahora);
  const recoger = e.pedidos.filter((p) => p.estado === 'listo').sort(porMargen);
  const ruta = e.pedidos.filter((p) => p.estado === 'camino' && p.repartidor === yo).sort(porMargen);
  const hechos = e.pedidos.filter((p) => p.estado === 'entregado' && p.repartidor === yo && p.historial.entregado >= inicioDia(0)).sort((a, b) => b.historial.entregado - a.historial.entregado);

  return (
    <div className="fl-panel fl-reparto">
      <header className="fl-panel-cab">
        <div><Logo /><span className="fl-panel-rol">Reparto</span></div>
        <div className="fl-segmento" role="group" aria-label="Repartidor">
          {REPARTIDORES.map((r) => <button key={r} type="button" className={yo === r ? 'activo' : ''} onClick={() => setYo(r)}>{r}</button>)}
        </div>
        <BotonPantalla />
      </header>

      <div className="fl-reparto-in">
        <section>
          <h2>En mi ruta <span>{ruta.length}</span></h2>
          {ruta.map((p, k) => {
            const z = zona(p.zona);
            const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.direccion}, ${z.nombre}, Puebla`)}`;
            return (
              <article key={p.id} className={`fl-entrega-tarjeta ${p.mio ? 'mia' : ''}`}>
                <div className="fl-orden-cab"><b>{k + 1}. {p.recibe}</b><Urgencia p={p} ahora={ahora} /></div>
                <p className="fl-dir">{p.direccion}<br /><small>{z.nombre}{p.referencia ? ` · ${p.referencia}` : ''}</small></p>
                <p className="fl-suave chico">#{p.folio} · {p.items.map(nombreItem).join(' + ')}{p.anonimo ? ' · ANÓNIMO' : ''}</p>
                <div className="fl-orden-acciones">
                  <a className="fl-boton linea chico" href={`tel:${p.tel.replace(/\s/g, '')}`}><Phone size={15} /> Llamar</a>
                  <a className="fl-boton linea chico" href={mapa} target="_blank" rel="noreferrer"><Navigation size={15} /> Maps</a>
                  <button type="button" className="fl-boton chico" onClick={() => setEntrega(p)}><Camera size={15} /> Entregué</button>
                </div>
              </article>
            );
          })}
          {!ruta.length && <p className="fl-columna-vacia">Sin entregas en la ruta. Recoge en el taller.</p>}
        </section>

        <section>
          <h2>Para recoger en el taller <span>{recoger.length}</span></h2>
          {recoger.map((p) => (
            <article key={p.id} className={`fl-entrega-tarjeta chica ${p.mio ? 'mia' : ''}`}>
              <FotoItem it={p.items[0]} />
              <div>
                <b>#{p.folio} · {zona(p.zona).nombre}</b>
                <small>{textoEntrega(p)}</small>
              </div>
              <button type="button" className="fl-boton chico" onClick={() => { salirPedido(p.id, yo); avisarListo(`#${p.folio} va en camino`); }}><Truck size={15} /> Salir</button>
            </article>
          ))}
          {!recoger.length && <p className="fl-columna-vacia">Nada listo todavía en el taller.</p>}
        </section>

        <section>
          <h2>Entregados hoy <span>{hechos.length}</span></h2>
          <ul className="fl-lista compacta">
            {hechos.map((p) => <li key={p.id}><div><b>{p.recibio}</b><small>{zona(p.zona).nombre} · {horaDe(p.historial.entregado)}</small></div></li>)}
          </ul>
        </section>
      </div>

      {entrega && <Entregar p={entrega} alCerrar={() => setEntrega(null)} />}
    </div>
  );
}

function Entregar({ p, alCerrar }) {
  const [quien, setQuien] = useState('el');
  const [otro, setOtro] = useState('');
  const [foto, setFoto] = useState(false);
  const recibio = quien === 'el' ? p.recibe : otro.trim();
  const confirmar = () => {
    entregarPedido(p.id, recibio);
    avisarListo(`Entregado a ${recibio}`);
    alCerrar();
  };
  return (
    <Ventana titulo={`Entregar #${p.folio}`} alCerrar={alCerrar} ancho={440}>
      <div className="fl-form">
        <h4>¿Quién lo recibió?</h4>
        <div className="fl-segmento ancho" role="radiogroup">
          <button type="button" role="radio" aria-checked={quien === 'el'} className={quien === 'el' ? 'activo' : ''} onClick={() => setQuien('el')}>{p.recibe}</button>
          <button type="button" role="radio" aria-checked={quien === 'otro'} className={quien === 'otro' ? 'activo' : ''} onClick={() => setQuien('otro')}>Otra persona</button>
        </div>
        {quien === 'otro' && <label className="fl-campo"><span>Nombre de quien recibió</span><input value={otro} onChange={(ev) => setOtro(ev.target.value)} placeholder="Ej. la vecina, el portero…" autoFocus /></label>}
        <h4>Foto de la entrega</h4>
        {foto ? (
          <Foto nombre="escena-entrega" texto="Foto de la entrega" className="fl-foto-entrega" />
        ) : (
          <button type="button" className="fl-tomar-foto" onClick={() => setFoto(true)}><Camera size={22} /> Tomar foto</button>
        )}
        <p className="fl-nota">La foto y el nombre le llegan al cliente en su seguimiento.</p>
        <button type="button" className="fl-boton ancho" disabled={!foto || !recibio} onClick={confirmar}>Confirmar entrega</button>
      </div>
    </Ventana>
  );
}
