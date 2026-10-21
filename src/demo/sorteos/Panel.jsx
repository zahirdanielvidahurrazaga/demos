import { useState } from 'react';
import { Check, Clock, Download, LayoutDashboard, MessageCircle, Receipt, Search, ShieldCheck, Ticket, Trophy, Unlock, X } from 'lucide-react';
import {
  NEGOCIO, SORTEOS, aprobar, fmtNum, liberar, numeroGanador, oportunidadesDe, pesos, rechazar, resumen, setAuto, useSorteos,
} from './datos';
import { ESTADO_TXT, Progreso, Restante, fechaLarga, hora, wa } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// PANEL DEL VERIFICADOR (el dueño y su equipo): resumen en vivo, comprobantes
// por aprobar, apartados que vencen, buscador de boletos y el ganador.
// ─────────────────────────────────────────────────────────────────────────────

const SECCIONES = [
  { id: 'resumen', t: 'Resumen', Icon: LayoutDashboard },
  { id: 'comprobantes', t: 'Comprobantes', Icon: Receipt },
  { id: 'apartados', t: 'Apartados', Icon: Clock },
  { id: 'boletos', t: 'Boletos', Icon: Ticket },
  { id: 'ganador', t: 'Ganador', Icon: Trophy },
];

export default function Panel() {
  const [sec, setSec] = useState('resumen');
  const e = useSorteos();
  const pendientes = Object.values(e.pedidos).filter((p) => p.estado === 'revision').length;

  return (
    <div className="so-panel">
      <nav className="so-panel-menu" aria-label="Secciones del panel">
        <p className="so-panel-marca"><b>FORTUNA</b><small>Panel</small></p>
        {SECCIONES.map(({ id, t, Icon }) => (
          <button key={id} aria-current={sec === id} onClick={() => setSec(id)}>
            <Icon size={18} /> <span>{t}</span>
            {id === 'comprobantes' && pendientes > 0 && <i>{pendientes}</i>}
          </button>
        ))}
      </nav>
      <main className="so-panel-cuerpo">
        {sec === 'resumen' && <Resumen />}
        {sec === 'comprobantes' && <Comprobantes />}
        {sec === 'apartados' && <Apartados />}
        {sec === 'boletos' && <Boletos />}
        {sec === 'ganador' && <Ganador />}
      </main>
    </div>
  );
}

function Resumen() {
  const e = useSorteos();
  const totales = SORTEOS.map((s) => resumen(e, s));
  const dinero = totales.reduce((t, r) => t + r.dinero, 0);
  const porCobrar = Object.values(e.pedidos).filter((p) => p.estado === 'apartado' || p.estado === 'revision').reduce((t, p) => t + p.total, 0);
  const revisar = Object.values(e.pedidos).filter((p) => p.estado === 'revision').length;
  return (
    <>
      <h1 className="so-panel-h1">Hoy en {NEGOCIO.nombre}</h1>
      <div className="so-kpis">
        <div><span>Cobrado</span><b>{pesos(dinero)}</b></div>
        <div><span>Por cobrar (apartados)</span><b>{pesos(porCobrar)}</b></div>
        <div className={revisar ? 'so-kpi-alerta' : ''}><span>Comprobantes por revisar</span><b>{revisar}</b></div>
        <div><span>Aprobados solos (Banxico)</span><b>{e.autoHoy || 0}</b></div>
      </div>
      <div className="so-panel-sorteos">
        {SORTEOS.map((s, i) => {
          const r = totales[i];
          return (
            <article key={s.id} className="so-panel-sorteo">
              <img src={s.foto} alt="" />
              <div>
                <h2>{s.titulo}</h2>
                <p className="so-dato-chico">Se juega {fechaLarga(s.fecha)}</p>
                <Progreso pct={r.pct} />
                <dl>
                  <div><dt>Pagados</dt><dd>{r.pagados.toLocaleString('es-MX')}</dd></div>
                  <div><dt>Apartados</dt><dd>{r.apartados.toLocaleString('es-MX')}</dd></div>
                  <div><dt>Libres</dt><dd>{r.libres.toLocaleString('es-MX')}</dd></div>
                  <div><dt>Cobrado</dt><dd>{pesos(r.dinero)}</dd></div>
                </dl>
              </div>
            </article>
          );
        })}
      </div>
      <h2 className="so-panel-h2">En vivo</h2>
      <ul className="so-feed">
        {e.eventos.slice(0, 12).map((x) => (
          <li key={x.id} className={`so-feed-${x.tipo}`}><span>{hora(x.t)}</span>{x.texto}</li>
        ))}
        {e.eventos.length === 0 && <li>Esperando movimientos… (los compradores simulados aparecen en unos segundos)</li>}
      </ul>
    </>
  );
}

function Comprobantes() {
  const e = useSorteos();
  const [avisar, setAvisar] = useState(null);
  const lista = Object.values(e.pedidos).filter((p) => p.estado === 'revision').sort((a, b) => (b.simulado ? 0 : 1) - (a.simulado ? 0 : 1) || a.subido - b.subido);
  return (
    <>
      <h1 className="so-panel-h1">Comprobantes por revisar</h1>
      <label className="so-interruptor">
        <input type="checkbox" checked={!!e.auto} onChange={(ev) => setAuto(ev.target.checked)} />
        <span><b><ShieldCheck size={18} /> Comprobación automática con Banxico</b>
          <small>{e.auto ? `Encendida: las transferencias que cuadran se aprueban solas (${e.autoHoy || 0} hoy). Aquí solo llega lo que necesita ojos.` : 'Apagada: todos los comprobantes se revisan a mano.'}</small></span>
      </label>
      {avisar && (
        <div className="so-avisar">
          <p><Check size={18} /> Folio {avisar.folio} pagado. ¿Le avisas a {avisar.nombre}?</p>
          <a className="so-boton so-boton-verde so-boton-chico" target="_blank" rel="noreferrer"
            href={wa(avisar.tel, `¡Hola ${avisar.nombre}! Tu pago del folio ${avisar.folio} quedó confirmado. Tus boletos: ${avisar.numeros.map((n) => fmtNum(SORTEOS.find((s) => s.id === avisar.sorteo), n)).join(', ')}. ¡Mucha suerte! — ${NEGOCIO.nombre}`)}>
            <MessageCircle size={16} /> Avisar por WhatsApp
          </a>
          <button className="so-icono" onClick={() => setAvisar(null)} aria-label="Cerrar"><X size={18} /></button>
        </div>
      )}
      {lista.length === 0 && <p className="so-vacio">No hay comprobantes pendientes. Cuando un comprador suba el suyo, aparece aquí.</p>}
      <div className="so-comprobantes">
        {lista.map((p) => {
          const s = SORTEOS.find((x) => x.id === p.sorteo);
          return (
            <article key={p.folio} className="so-comp">
              <div className="so-comp-img">
                {p.comprobante?.img ? <img src={p.comprobante.img} alt={`Comprobante del folio ${p.folio}`} /> : <ComprobanteFalso p={p} />}
              </div>
              <div className="so-comp-datos">
                <p className="so-sello">{s.titulo} · Folio {p.folio}{!p.simulado && <em> · tuyo</em>}</p>
                <h3>{p.nombre} {p.apellidos}</h3>
                <p>{p.lugar} · WhatsApp {p.tel}</p>
                {p.motivo && <p className="so-motivo">Revisión manual: {p.motivo}</p>}
                <p className="so-comp-total">{pesos(p.total)} <span>{p.numeros.length} boleto{p.numeros.length > 1 ? 's' : ''}</span></p>
                <p className="so-comp-nums">{p.numeros.slice(0, 12).map((n) => fmtNum(s, n)).join(' · ')}{p.numeros.length > 12 ? ' …' : ''}</p>
                <div className="so-comp-acciones">
                  <button className="so-boton so-boton-verde" onClick={() => { aprobar(p.folio); setAvisar(p); }}><Check size={18} /> Aprobar</button>
                  <button className="so-boton so-boton-claro" onClick={() => rechazar(p.folio)}><X size={18} /> Rechazar</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

// comprobante dibujado para los compradores simulados
function ComprobanteFalso({ p }) {
  return (
    <div className="so-comp-falso">
      <b>Transferencia SPEI</b>
      <span>Enviada</span>
      <strong>{pesos(p.total)}</strong>
      <small>Concepto: {p.folio}</small>
      <small>Clave de rastreo: MBAN01{String(p.creado).slice(-10)}</small>
    </div>
  );
}

function Apartados() {
  const e = useSorteos();
  const lista = Object.values(e.pedidos).filter((p) => p.estado === 'apartado').sort((a, b) => a.vence - b.vence);
  return (
    <>
      <h1 className="so-panel-h1">Apartados sin pagar</h1>
      <p className="so-entrada">Se liberan solos al vencer. Antes, un recordatorio por WhatsApp suele cerrar la venta.</p>
      <div className="so-tabla-envoltura">
        <table className="so-tabla">
          <thead><tr><th>Folio</th><th>Cliente</th><th>Sorteo</th><th>Boletos</th><th>Total</th><th>Vence en</th><th /></tr></thead>
          <tbody>
            {lista.slice(0, 60).map((p) => {
              const s = SORTEOS.find((x) => x.id === p.sorteo);
              return (
                <tr key={p.folio}>
                  <td>{p.folio}</td>
                  <td><b>{p.nombre} {p.apellidos}</b><small>{p.tel}</small></td>
                  <td>{s.titulo}</td>
                  <td>{p.numeros.length}</td>
                  <td>{pesos(p.total)}</td>
                  <td><Restante hasta={p.vence} /></td>
                  <td className="so-tabla-acciones">
                    <a className="so-icono" title="Recordar por WhatsApp" target="_blank" rel="noreferrer"
                      href={wa(p.tel, `Hola ${p.nombre}, te recordamos que tu folio ${p.folio} (${p.numeros.length} boletos, ${pesos(p.total)}) sigue apartado. Sube tu comprobante antes de que se liberen. — ${NEGOCIO.nombre}`)}>
                      <MessageCircle size={17} />
                    </a>
                    <button className="so-icono" title="Liberar ahora" onClick={() => liberar(p.folio)}><Unlock size={17} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {lista.length > 60 && <p className="so-dato-chico">y {lista.length - 60} más…</p>}
    </>
  );
}

function Boletos() {
  const e = useSorteos();
  const [sorteo, setSorteo] = useState(SORTEOS[0].id);
  const [q, setQ] = useState('');
  const s = SORTEOS.find((x) => x.id === sorteo);
  const n = q === '' ? null : Number(q);
  const folio = n == null ? null : e.boletos[sorteo][n];
  const p = folio ? e.pedidos[folio] : null;

  const exportar = () => {
    const filas = [['folio', 'numero', 'oportunidades', 'nombre', 'apellidos', 'whatsapp', 'estado']];
    Object.entries(e.boletos[sorteo]).forEach(([num, f]) => {
      const x = e.pedidos[f];
      if (x.estado === 'pagado') filas.push([f, fmtNum(s, num), oportunidadesDe(s, Number(num)).join(' '), x.nombre, x.apellidos, x.tel, x.lugar]);
    });
    const csv = filas.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = `boletos-pagados-${s.id}.csv`;
    a.click();
  };

  return (
    <>
      <h1 className="so-panel-h1">Buscar un boleto</h1>
      <div className="so-verificar-campos">
        <select value={sorteo} onChange={(ev) => setSorteo(ev.target.value)}>{SORTEOS.map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}</select>
        <input inputMode="numeric" placeholder="Número" value={q} onChange={(ev) => setQ(ev.target.value.replace(/\D/g, '').slice(0, String(s.total - 1).length))} />
      </div>
      {n != null && n < s.total && (
        <div className="so-caja so-boleto-ficha">
          <p className="so-num-grande">{fmtNum(s, n)}</p>
          {p ? (
            <>
              <p><span className={`so-estado so-e-${p.estado}`}>{ESTADO_TXT[p.estado]}</span> · Folio {p.folio}</p>
              <p><b>{p.nombre} {p.apellidos}</b> · {p.lugar} · {p.tel}</p>
            </>
          ) : <p>Disponible</p>}
        </div>
      )}
      <button className="so-boton so-boton-claro" onClick={exportar}><Download size={17} /> Descargar lista de pagados (Excel)</button>
      <p className="so-dato-chico">La lista con números, oportunidades y nombres para la transmisión en vivo.</p>
    </>
  );
}

function Ganador() {
  const e = useSorteos();
  const [sorteo, setSorteo] = useState(SORTEOS[0].id);
  const [segundo, setSegundo] = useState('');
  const [mayor, setMayor] = useState('');
  const s = SORTEOS.find((x) => x.id === sorteo);
  const listo = segundo.length >= 3 && mayor.length >= 3;
  const n = listo ? numeroGanador(s, segundo, mayor) : null;

  // el número puede ser boleto u oportunidad de otro boleto
  let p = null, como = '';
  if (n != null) {
    const f = e.boletos[sorteo][n];
    if (f) { p = e.pedidos[f]; como = 'boleto'; }
  }

  return (
    <>
      <h1 className="so-panel-h1">Sacar al ganador</h1>
      <p className="so-entrada">Escribe los resultados de la Lotería Nacional y el sistema arma el número ganador con la dinámica del sorteo.</p>
      <div className="so-ganador-campos">
        <label>Sorteo<select value={sorteo} onChange={(ev) => setSorteo(ev.target.value)}>{SORTEOS.map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}</select></label>
        <label>Segundo lugar<input inputMode="numeric" value={segundo} onChange={(ev) => setSegundo(ev.target.value.replace(/\D/g, ''))} placeholder="Ej. 48213" /></label>
        <label>Premio mayor<input inputMode="numeric" value={mayor} onChange={(ev) => setMayor(ev.target.value.replace(/\D/g, ''))} placeholder="Ej. 07956" /></label>
      </div>
      {n != null && (
        <div className={`so-caja so-ganador-res ${p?.estado === 'pagado' ? 'so-ganador-si' : ''}`}>
          <p className="so-sello">Número ganador</p>
          <p className="so-num-grande">{fmtNum(s, n)}</p>
          {p?.estado === 'pagado' ? (
            <>
              <p><Trophy size={20} /> <b>{p.nombre} {p.apellidos}</b> · {p.lugar} · {como}</p>
              <a className="so-boton so-boton-verde" target="_blank" rel="noreferrer"
                href={wa(p.tel, `¡${p.nombre}, ganaste ${s.titulo} con tu boleto ${fmtNum(s, n)}! Comunícate con nosotros para entregarte tu premio. — ${NEGOCIO.nombre}`)}>
                <MessageCircle size={17} /> Avisarle al ganador
              </a>
            </>
          ) : p ? (
            <p>Ese número estaba <b>apartado sin pagar</b>: según tus reglas, se vuelve a jugar o pasa al siguiente.</p>
          ) : (
            <p>Ese número <b>no se vendió</b>. Según tus reglas: se vuelve a jugar con el siguiente sorteo de la Lotería.</p>
          )}
        </div>
      )}
      <p className="so-dato-chico"><Search size={14} /> Prueba con cualquier par de números de 5 cifras.</p>
    </>
  );
}
