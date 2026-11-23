import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, MessageCircle, PenLine, Plus, UserPlus } from 'lucide-react';
import {
  EJEMPLOS, PRODUCTOS, REPARTIDORES, RESTAURANTES, cajasDe, crearPedido, dinero, existencias, importe,
  leerCantidades, leerMensaje, producto, repartidor, restaurante, useReparto, waLink,
} from './datos';
import { Contador, Hoja, Segmentos, avisarListo } from './comun';
import Dictar from './Dictar';
import FormCliente from './FormCliente';

// Nuevo pedido: pegar el WhatsApp → revisar lo que entendió → guardar.
// `inicial` = { rest, items } para "Pedir lo de siempre" (salta el pegado).
export default function Pedido({ abierta, alCerrar, inicial }) {
  const e = useReparto();
  const [paso, setPaso] = useState('pegar');
  const [texto, setTexto] = useState('');
  const [de, setDe] = useState('');
  const [rest, setRest] = useState(null);
  const [items, setItems] = useState({});
  const [para, setPara] = useState(0);
  const [rep, setRep] = useState(null);
  const [debe, setDebe] = useState(false);
  const [otras, setOtras] = useState(false);
  const [entendi, setEntendi] = useState(null);
  const [guardado, setGuardado] = useState(null);
  const [alta, setAlta] = useState(false);
  const area = useRef(null);

  useEffect(() => {
    if (!abierta) return;
    setTexto(''); setDe(''); setPara(0); setDebe(false); setOtras(false); setEntendi(null); setGuardado(null);
    if (inicial) {
      setRest(inicial.rest); setItems({ ...inicial.items }); setRep(restaurante(inicial.rest).rep); setPaso('armar');
    } else { setRest(null); setItems({}); setRep(null); setPaso('pegar'); }
  }, [abierta, inicial]);

  const libres = useMemo(() => Object.fromEntries(existencias(e).map((p) => [p.id, p.libre])), [e]);

  function leer(t = texto, quien = de) {
    const r = leerMensaje(t, quien);
    setItems(r.items); setRest(r.restaurante); setPara(r.cuando); setDebe(r.debe);
    setRep(r.restaurante ? restaurante(r.restaurante).rep : REPARTIDORES[0].id);
    setEntendi({ cervezas: Object.keys(r.items).length, rest: !!r.restaurante });
    setPaso('armar');
  }
  // "agrega dos de indio", "quita la negra", "que sea para mañana"
  function corregir(frase) {
    const m = leerMensaje(frase);
    const c = leerCantidades(frase);
    setItems((x) => ({ ...x, ...m.items, ...c }));
    if (m.restaurante && !rest) { setRest(m.restaurante); setRep(restaurante(m.restaurante).rep); }
    if (m.cuando) setPara(1);
    if (m.debe) setDebe(true);
  }
  async function pegar() {
    try { const t = await navigator.clipboard.readText(); if (t) { setTexto(t); setDe(''); return; } } catch { /* sin permiso */ }
    area.current?.focus();
  }
  function guardar() {
    const id = crearPedido({ rest, items, rep, para, mensaje: texto, origen: texto ? 'whatsapp' : 'manual', debe });
    setGuardado({ id, rest, items: { ...items }, rep, para });
    setPaso('listo');
    avisarListo(`Pedido guardado · lo lleva ${repartidor(rep).nombre}`);
  }

  const lista = Object.entries(items).filter(([, n]) => n > 0);
  const total = importe(Object.fromEntries(lista));
  const cajas = cajasDe(Object.fromEntries(lista));
  const faltan = lista.filter(([id, n]) => n > libres[id]);
  const resto = PRODUCTOS.filter((p) => !(p.id in items));
  const poner = (id, n) => setItems((x) => ({ ...x, [id]: n }));

  let titulo = 'Nuevo pedido';
  if (paso === 'armar') titulo = inicial ? 'Lo de siempre' : 'Revisa el pedido';
  if (paso === 'listo') titulo = 'Pedido guardado';

  let pie = null;
  if (paso === 'pegar') {
    pie = <button type="button" className="rp-btn lleno grande" disabled={!texto.trim()} onClick={() => leer()}>Leer pedido</button>;
  } else if (paso === 'armar') {
    pie = (
      <div className="rp-pie-pedido">
        <div><strong>{cajas} {cajas === 1 ? 'caja' : 'cajas'}</strong><span>{dinero(total)}</span></div>
        <button type="button" className="rp-btn lleno grande" disabled={!rest || !cajas} onClick={guardar}>Guardar pedido</button>
      </div>
    );
  } else if (paso === 'listo') {
    pie = <button type="button" className="rp-btn lleno grande" onClick={alCerrar}>Listo</button>;
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={titulo} pie={pie}>
      {paso === 'pegar' && (
        <>
          <p className="rp-ayuda">Pega el mensaje de WhatsApp o díctalo. El sistema lo lee y arma el pedido.</p>
          <Dictar etiqueta="Dictar el pedido" ejemplo="«Para el Fogón, cinco corona y tres de vicky»"
            alFrase={(f) => { setDe(''); setTexto((t) => `${t ? `${t.trim()} ` : ''}${f.trim()}`); }} />
          <textarea ref={area} className="rp-area" rows={5} value={texto} placeholder="Pega aquí el mensaje…"
            onChange={(ev) => { setTexto(ev.target.value); setDe(''); }} />
          <div className="rp-fila-btns">
            <button type="button" className="rp-btn" onClick={pegar}><ClipboardPaste size={17} /> Pegar</button>
            <button type="button" className="rp-btn" onClick={() => { setTexto(''); setRest(null); setItems({}); setRep(REPARTIDORES[0].id); setEntendi(null); setPaso('armar'); }}><PenLine size={17} /> Capturar a mano</button>
          </div>
          <p className="rp-rotulo">Prueba con un mensaje</p>
          <div className="rp-ejemplos">
            {EJEMPLOS.map((m) => (
              <button key={m.de} type="button" className="rp-burbuja" onClick={() => { setTexto(m.texto); setDe(m.de); leer(m.texto, m.de); }}>
                <span className="de">{m.de}</span>{m.texto}
              </button>
            ))}
          </div>
        </>
      )}

      {paso === 'armar' && (
        <>
          {texto && (
            <div className="rp-burbuja quieta">
              {de && <span className="de">{de}</span>}{texto}
            </div>
          )}
          {entendi && (
            <p className={`rp-entendi ${cajas && rest ? 'bien' : 'falta'}`}>
              {cajas > 0 && rest && 'Entendí esto. Revísalo y guarda.'}
              {!rest && 'No supe de qué restaurante es. Elígelo abajo.'}
              {rest && !cajas && 'No encontré cervezas en el mensaje. Agrégalas abajo.'}
            </p>
          )}

          <label className="rp-rotulo" htmlFor="rp-rest">Restaurante</label>
          <select id="rp-rest" className="rp-select" value={rest || ''} onChange={(ev) => { setRest(ev.target.value || null); if (ev.target.value) setRep(restaurante(ev.target.value).rep); }}>
            <option value="">Elige…</option>
            {[...RESTAURANTES].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
          {!rest && <button type="button" className="rp-enlace" onClick={() => setAlta(true)}><UserPlus size={15} /> ¿Es nuevo? Darlo de alta</button>}

          <p className="rp-rotulo">Qué lleva</p>
          <Dictar etiqueta="Corregir con voz" ejemplo="«agrega dos de indio» · «quita la negra»" alFrase={corregir} />
          <ul className="rp-items">
            {lista.length === 0 && <li className="rp-vacio">Todavía no hay cervezas.</li>}
            {Object.entries(items).map(([id, n]) => (
              <li key={id} className={n > libres[id] ? 'corto' : ''}>
                <div>
                  <strong>{producto(id).nombre}</strong>
                  <span>{n > libres[id] ? `Solo te quedan ${Math.max(0, libres[id])}` : `${producto(id).detalle} · ${dinero(producto(id).precio)}`}</span>
                </div>
                <Contador valor={n} alCambiar={(v) => poner(id, v)} />
              </li>
            ))}
          </ul>
          {resto.length > 0 && (otras ? (
            <div className="rp-otras">
              {resto.map((p) => (
                <button key={p.id} type="button" className="rp-chip" onClick={() => { poner(p.id, 1); }}>
                  <Plus size={14} /> {p.nombre}
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className="rp-enlace" onClick={() => setOtras(true)}><Plus size={15} /> Agregar otra cerveza</button>
          ))}

          <div className="rp-dos">
            <div>
              <p className="rp-rotulo">Para</p>
              <Segmentos valor={para} alCambiar={setPara} opciones={[{ id: 0, etiqueta: 'Hoy' }, { id: 1, etiqueta: 'Mañana' }]} />
            </div>
            <div>
              <p className="rp-rotulo">Lo lleva</p>
              <Segmentos valor={rep} alCambiar={setRep} opciones={REPARTIDORES.map((r) => ({ id: r.id, etiqueta: r.nombre }))} />
            </div>
          </div>
          <label className="rp-check">
            <input type="checkbox" checked={debe} onChange={(ev) => setDebe(ev.target.checked)} />
            <span>Va a cuenta (paga después)</span>
          </label>
          {faltan.length > 0 && <p className="rp-entendi falta">No te alcanza para todo. Puedes guardarlo igual y surtir antes de salir.</p>}
        </>
      )}

      {paso === 'listo' && guardado && (() => {
        const r = restaurante(guardado.rest);
        const resumen = Object.entries(guardado.items).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${producto(id).nombre}`).join(', ');
        const msj = `Listo ${r.persona}, ${guardado.para ? 'mañana' : 'hoy'} le llevamos ${resumen}. Total ${dinero(importe(guardado.items))}. Lo lleva ${repartidor(guardado.rep).nombre}. ¡Gracias!`;
        return (
          <div className="rp-listo">
            <p className="rp-grande">{r.nombre}</p>
            <p className="rp-ayuda">{resumen}</p>
            <p className="rp-ayuda">Ya se apartó de tu bodega y {repartidor(guardado.rep).nombre} lo ve en su celular.</p>
            <p className="rp-rotulo">¿Le confirmas?</p>
            <div className="rp-burbuja quieta mia">{msj}</div>
            <a className="rp-btn wa" href={waLink(msj)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Mandar por WhatsApp</a>
          </div>
        );
      })()}
      <FormCliente abierta={alta} alCerrar={() => setAlta(false)} sugerido={de ? { persona: de.split(' ')[0] } : null}
        alGuardar={(id) => { setRest(id); setRep(restaurante(id).rep); }} />
    </Hoja>
  );
}
