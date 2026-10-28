import { useState } from 'react';
import { Camera, Gift, MapPin, PackagePlus, Printer, Scissors } from 'lucide-react';
import {
  ESTADOS, TALLOS, detalleItem, empezarPedido, extra, fechaLarga, inicioDia, margen, nombreItem, papel, producto,
  surtir, tallo, tallosDe, terminarPedido, textoEntrega, useFlores, zona,
} from './datos';
import { BotonPantalla, Logo, Ventana, avisarListo, hace, useAhora } from './comun';
import { FotoItem } from './Armar';

// ─────────────────────────────────────────────────────────────────────────────
// TALLER (florista) — tablero del día: Por armar → En la mesa → Listos.
// Ordenado por lo que sale primero; cada tarjeta trae la receta en tallos,
// el papel y la tarjeta para imprimir. "Empezar" descuenta del inventario y
// "Tomar foto" manda la foto real del ramo al cliente.
// ─────────────────────────────────────────────────────────────────────────────

export function Urgencia({ p, ahora }) {
  const m = margen(p, ahora);
  const c = m < 0 ? 'tarde' : m < 75 ? 'pronto' : '';
  const t = m < 0 ? `Tarde ${Math.abs(m)} min` : m < 120 ? `Faltan ${m} min` : textoEntrega(p).split(' · ').slice(1).join(' · ') || textoEntrega(p);
  return <span className={`fl-urgencia ${c}`}>{p.expres ? 'Exprés · ' : ''}{t}</span>;
}

export default function Taller() {
  const e = useFlores();
  const ahora = useAhora(15000);
  const [tarjeta, setTarjeta] = useState(null);
  const [foto, setFoto] = useState(null);
  const hoy = e.pedidos.filter((p) => p.dia <= inicioDia(0));
  const col = (s) => hoy.filter((p) => p.estado === s).sort((a, b) => margen(a, ahora) - margen(b, ahora));
  const manana = e.pedidos.filter((p) => p.dia === inicioDia(1));
  const entregados = e.pedidos.filter((p) => p.estado === 'entregado' && p.historial.entregado >= inicioDia(0)).length;

  const columnas = [
    { s: 'recibido', titulo: 'Por armar' },
    { s: 'armando', titulo: 'En la mesa' },
    { s: 'listo', titulo: 'Listos para salir' },
  ];

  return (
    <div className="fl-panel">
      <header className="fl-panel-cab">
        <div><Logo /><span className="fl-panel-rol">Taller</span></div>
        <p>{fechaLarga(0)}</p>
        <div className="fl-panel-cuentas">
          <span><b>{col('recibido').length + col('armando').length}</b> por hacer</span>
          <span><b>{entregados}</b> entregados</span>
          <BotonPantalla />
        </div>
      </header>

      <div className="fl-taller">
        <div className="fl-kanban">
          {columnas.map(({ s, titulo }) => (
            <section key={s} className={`fl-columna c-${s}`}>
              <h2>{titulo} <span>{col(s).length}</span></h2>
              {col(s).map((p) => (
                <article key={p.id} className={`fl-orden ${p.mio ? 'mia' : ''} ${p.historial[s] > ahora - 20000 ? 'nueva' : ''}`}>
                  <div className="fl-orden-cab">
                    <b>#{p.folio}</b>
                    <Urgencia p={p} ahora={ahora} />
                  </div>
                  {p.items.map((it, k) => {
                    const receta = tallosDe(it);
                    return (
                      <div key={k} className="fl-orden-item">
                        <FotoItem it={it} />
                        <div>
                          <b>{nombreItem(it)}</b>
                          <small>{detalleItem(it)}</small>
                          <p className="fl-receta">
                            {Object.entries(receta).map(([t, q]) => <span key={t}><i style={{ background: tallo(t).color }} />{q} {tallo(t).nombre.toLowerCase()}</span>)}
                            <span><i style={{ background: papel(it.tipo === 'armado' ? it.papel : producto(it.id).papel || 'kraft').color }} />papel {papel(it.tipo === 'armado' ? it.papel : producto(it.id).papel || 'kraft').nombre.toLowerCase()}</span>
                          </p>
                          {it.extras?.length > 0 && <p className="fl-extras-linea"><Gift size={13} /> {it.extras.map((x) => extra(x).corto).join(' · ')}</p>}
                        </div>
                      </div>
                    );
                  })}
                  <p className="fl-orden-dest"><MapPin size={13} /> {zona(p.zona).nombre} · para {p.recibe}</p>
                  {p.mio && <p className="fl-orden-demo">Pedido de la demo (lo ves en Cliente)</p>}
                  <div className="fl-orden-acciones">
                    <button type="button" className="fl-boton linea chico" onClick={() => setTarjeta(p)}><Printer size={15} /> Tarjeta</button>
                    {s === 'recibido' && <button type="button" className="fl-boton chico" onClick={() => { empezarPedido(p.id); avisarListo(`#${p.folio} a la mesa`); }}><Scissors size={15} /> Empezar</button>}
                    {s === 'armando' && <button type="button" className="fl-boton chico" onClick={() => setFoto(p)}><Camera size={15} /> Tomar foto</button>}
                    {s === 'listo' && <span className="fl-suave chico">Esperando reparto · {hace(p.historial.listo, ahora)}</span>}
                  </div>
                </article>
              ))}
              {!col(s).length && <p className="fl-columna-vacia">{s === 'recibido' ? 'Nada nuevo por ahora.' : 'Vacío.'}</p>}
            </section>
          ))}
        </div>

        <aside className="fl-taller-lado">
          <section className="fl-caja">
            <h3>Tallos en el cuarto frío</h3>
            <ul className="fl-inventario">
              {TALLOS.map((t) => {
                const n = e.inventario[t.id] || 0;
                const bajo = n < 20;
                return (
                  <li key={t.id} className={bajo ? 'bajo' : ''}>
                    <span className="fl-inv-nombre"><i style={{ background: t.color }} />{t.nombre}</span>
                    <span className="fl-inv-barra"><i style={{ width: `${Math.min(100, (n / 220) * 100)}%` }} /></span>
                    <b>{n}</b>
                    <button type="button" className="fl-icono" onClick={() => { surtir(t.id, 50); avisarListo(`+50 ${t.nombre.toLowerCase()}`); }} aria-label={`Surtir 50 ${t.nombre}`} title="Llegó el proveedor: +50"><PackagePlus size={15} /></button>
                  </li>
                );
              })}
            </ul>
            <p className="fl-nota">Cada pedido descuenta sus tallos al empezarlo. Lo que baja de 20 se marca y aparece como agotado en "Arma tu ramo" al llegar a 0.</p>
          </section>
          <section className="fl-caja">
            <h3>Para mañana <span className="fl-suave">({manana.length})</span></h3>
            <ul className="fl-lista compacta">
              {manana.map((p) => <li key={p.id}><div><b>#{p.folio} · {p.items.map(nombreItem).join(' + ')}</b><small>{textoEntrega(p)} · {zona(p.zona).nombre}</small></div></li>)}
            </ul>
          </section>
        </aside>
      </div>

      {tarjeta && (
        <Ventana titulo={`Tarjeta del pedido #${tarjeta.folio}`} alCerrar={() => setTarjeta(null)} ancho={460}>
          <div className="fl-tarjeta-papel fl-imprimir">
            <p>{tarjeta.mensaje}</p>
            <span>{tarjeta.anonimo ? 'Alguien que te quiere' : `— ${tarjeta.firma}`}</span>
          </div>
          <p className="fl-nota">Para: {tarjeta.recibe}{tarjeta.anonimo ? ' · ANÓNIMO: no poner remitente en el sobre' : ''}</p>
          <button type="button" className="fl-boton ancho" onClick={() => window.print()}><Printer size={16} /> Imprimir tarjeta</button>
        </Ventana>
      )}
      {foto && <Camara p={foto} alCerrar={() => setFoto(null)} />}
    </div>
  );
}

// Cámara de la tablet del taller (simulada): la foto real del ramo terminado
// llega al seguimiento del cliente.
function Camara({ p, alCerrar }) {
  const [fase, setFase] = useState('encuadre');
  const disparar = () => {
    setFase('flash');
    setTimeout(() => {
      terminarPedido(p.id);
      setFase('lista');
    }, 650);
  };
  return (
    <Ventana titulo={`Foto del ramo #${p.folio}`} alCerrar={alCerrar} ancho={440}>
      <div className={`fl-camara ${fase}`}>
        <FotoItem it={p.items[0]} />
        <span className="fl-camara-marco" />
      </div>
      {fase === 'lista' ? (
        <>
          <p className="fl-ok">Foto enviada a {p.mio ? 'la clienta' : p.cliente}. El pedido pasó a <b>{ESTADOS[2].nombre.toLowerCase()}</b>.</p>
          <button type="button" className="fl-boton ancho" onClick={alCerrar}>Listo</button>
        </>
      ) : (
        <button type="button" className="fl-disparo" onClick={disparar} disabled={fase !== 'encuadre'} aria-label="Tomar la foto"><span /></button>
      )}
    </Ventana>
  );
}
