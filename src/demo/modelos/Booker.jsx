import { useEffect, useRef, useState } from 'react';
import {
  CalendarRange, Check, ChevronLeft, ChevronRight, Coins, Inbox, LayoutDashboard, PartyPopper, ScanLine, Send, Sparkles, Users, X,
} from 'lucide-react';
import {
  AGENCIA, DIA, HORA,
  useAgencia, todasLasModelos, modeloPorId, nombreDe, choques, bloqueado,
  mandarOpciones, cotizar, confirmarCasting, descartarSolicitud, marcarCobrado, liquidar,
  aprobarPolaroid, convocar, marcarLlegada, llegadaPorCodigo, moverAspirante, crearEvento,
  neto, realizado, dinero, fechaCorta, fechaLarga, hora, hace, mismoDia, estaturaTxt, pedidasDe, plural,
} from './datos';
import { Campo, Foto, FotoModelo, Modal, Sello, aLocal, avisarListo } from './comun';
import Marco, { LineaAviso } from './Marco';

// ─────────────────────────────────────────────────────────────────────────────
// PANEL DE LA BOOKER — la mesa de la agencia.
// Hoy · Solicitudes (opción → cotización → confirmado) · Calendario de todas
// las modelos · Board (aprobar polaroids) · Scouting · Eventos (convocatoria y
// puerta con lector) · Dinero (cobrar al cliente, liquidar a la modelo).
// ─────────────────────────────────────────────────────────────────────────────

export default function Booker() {
  const e = useAgencia();
  const [sec, setSec] = useState('hoy');
  const [solicitud, setSolicitud] = useState(null);   // la abierta en Solicitudes
  const nuevas = e.solicitudes.filter((s) => s.estado === 'nueva').length;
  const listas = e.solicitudes.filter((s) => s.estado === 'en_opcion' && listaParaCotizar(e, s)).length;
  const aspirantes = e.aspirantes.filter((a) => a.estado === 'nueva').length;
  const polaroids = Object.values(e.polaroids).flat().filter((p) => !p.aprobada).length;
  const porCobrar = e.trabajos.filter((t) => realizado(t) && t.tarifa > 0 && !t.cobrado).length;
  const SECCIONES = [
    ['hoy', 'Hoy', LayoutDashboard, 0],
    ['solicitudes', 'Solicitudes', Inbox, nuevas + listas],
    ['calendario', 'Calendario', CalendarRange, 0],
    ['board', 'Board', Users, polaroids],
    ['scouting', 'Scouting', Sparkles, aspirantes],
    ['eventos', 'Eventos', PartyPopper, 0],
    ['dinero', 'Dinero', Coins, porCobrar],
  ];
  const ir = (s) => { setSec(s); window.scrollTo({ top: 0 }); };
  const abrirSolicitud = (sid) => { setSolicitud(sid); ir('solicitudes'); };
  // el buscador de arriba: modelos, marcas y folios
  const buscar = (q) => [
    ...todasLasModelos(e).filter((m) => `${m.nombre} ${m.apellido} ${m.num}`.toLowerCase().includes(q))
      .map((m) => ({ k: m.id, m, titulo: nombreDe(m), detalle: `Nº ${m.num} · ${m.categorias.join(', ')}`, alElegir: () => ir('board') })),
    ...e.solicitudes.filter((s) => `${s.marca} ${s.folio} ${s.proyecto}`.toLowerCase().includes(q))
      .map((s) => ({ k: s.id, titulo: `${s.marca} · ${s.folio}`, detalle: `${s.proyecto} · ${fechaCorta(s.fecha)}`, alElegir: () => abrirSolicitud(s.id) })),
  ];
  return (
    <Marco secciones={SECCIONES} sec={sec} ir={ir} para="booker" buscar={buscar}
      cabeza={<div className="mo-logo" style={{ fontSize: '1.2rem', color: '#F2EEE7' }}>{AGENCIA.nombre}<small>BOOKING</small></div>}
      pie={<><p style={{ opacity: .55 }}>Sesión de</p><b>Paola Ríos · Booker</b></>}
      quien={<span className="mo-yo">PR</span>}>
      {sec === 'hoy' && <Hoy e={e} ir={ir} abrirSolicitud={abrirSolicitud} />}
      {sec === 'solicitudes' && <Solicitudes e={e} abierta={solicitud} setAbierta={setSolicitud} />}
      {sec === 'calendario' && <Calendario e={e} />}
      {sec === 'board' && <Board e={e} />}
      {sec === 'scouting' && <Scouting e={e} />}
      {sec === 'eventos' && <Eventos e={e} />}
      {sec === 'dinero' && <Dinero e={e} />}
    </Marco>
  );
}

const listaParaCotizar = (e, s) => {
  const ts = e.trabajos.filter((t) => t.solicitud === s.id);
  return ts.length > 0 && ts.every((t) => t.estado !== 'opcion') && ts.some((t) => t.estado === 'aceptado');
};

// Barras de 6 meses (facturado y la parte de la agencia).
function meses6(e, filtro = () => true) {
  return Array.from({ length: 6 }, (_, k) => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - (5 - k));
    const fin = new Date(d); fin.setMonth(fin.getMonth() + 1);
    const total = e.trabajos.filter((t) => t.estado === 'confirmado' && t.tarifa > 0 && t.fecha >= d.getTime() && t.fecha < fin.getTime() && t.fecha < Date.now() && filtro(t)).reduce((a, t) => a + t.tarifa, 0);
    return { etiqueta: d.toLocaleDateString('es-MX', { month: 'short' }), total, actual: k === 5 };
  });
}

// ── hoy ─────────────────────────────────────────────────────────────────────
function Hoy({ e, ir, abrirSolicitud }) {
  const ahora = Date.now();
  const hoy = e.trabajos.filter((t) => mismoDia(t.fecha, ahora) && t.estado === 'confirmado');
  const manana = e.trabajos.filter((t) => mismoDia(t.fecha, ahora + DIA) && t.estado === 'confirmado');
  const semana = e.trabajos.filter((t) => t.estado === 'confirmado' && t.fecha > ahora && t.fecha < ahora + 7 * DIA);
  const esperando = e.trabajos.filter((t) => t.estado === 'opcion').length;
  const porCobrar = e.trabajos.filter((t) => realizado(t) && t.tarifa > 0 && !t.cobrado).reduce((a, t) => a + t.tarifa, 0);
  const meses = meses6(e);
  const avisos = e.avisos.filter((a) => a.para === 'booker');
  const etapas = [
    ['nueva', 'Nuevas'], ['en_opcion', 'Con modelos'], ['cotizada', 'Cotizadas'], ['confirmada', 'Confirmadas'],
  ].map(([id, t]) => {
    const ss = e.solicitudes.filter((s) => s.estado === id);
    const monto = ss.reduce((a, s) => a + (s.cotizacion?.total || s.modelos.reduce((b, mid) => b + (s.tipo === 'casting' ? 0 : modeloPorId(e, mid)?.tarifa || 0), 0)), 0);
    return { id, t, ss, monto };
  });
  // las más pedidas: la misma cuenta que ve la modelo en su "Te pidieron"
  const pedidas = todasLasModelos(e).map((m) => ({ m, n: pedidasDe(e, m.id) }))
    .sort((a, b) => b.n - a.n).slice(0, 5);
  const maxP = Math.max(...pedidas.map((x) => x.n), 1);
  return (
    <>
      <div className="mo-titulo">
        <div><p className="mo-eti">Mesa de booking</p><h1>Buenos días, <em>Paola</em></h1></div>
      </div>
      <div className="mo-kpis">
        <button type="button" className="mo-kpi" onClick={() => ir('solicitudes')}><span className="mo-eti">Solicitudes nuevas</span><b>{etapas[0].ss.length}</b><small>{plural(esperando, 'opción', 'opciones')} sin respuesta</small></button>
        <button type="button" className="mo-kpi" onClick={() => ir('calendario')}><span className="mo-eti">Trabajos · 7 días</span><b>{semana.length}</b><small>{hoy.length} hoy · {manana.length} mañana</small></button>
        <button type="button" className="mo-kpi" onClick={() => ir('dinero')}><span className="mo-eti">Facturado este mes</span><b>{dinero(meses[5].total)}</b><small className={meses[5].total >= meses[4].total ? 'sube' : 'baja'}>{meses[4].total ? `${meses[5].total >= meses[4].total ? '▲' : '▼'} ${Math.abs(Math.round((meses[5].total / meses[4].total - 1) * 100))}% vs ${meses[4].etiqueta}` : '—'}</small></button>
        <button type="button" className="mo-kpi" onClick={() => ir('dinero')}><span className="mo-eti">Por cobrar</span><b>{dinero(porCobrar)}</b><small>trabajos ya hechos</small></button>
      </div>

      <section className="mo-tuberia" aria-label="Solicitudes por etapa">
        {etapas.map((x, k) => (
          <button key={x.id} type="button" onClick={() => (x.ss[0] ? abrirSolicitud(x.ss[0].id) : ir('solicitudes'))}>
            <span className="mo-eti">{String(k + 1).padStart(2, '0')} · {x.t}</span>
            <b>{x.ss.length}</b>
            <small>{x.monto ? dinero(x.monto) : 'sin monto'}</small>
            <span className="mo-tuberia-caras">{x.ss.slice(0, 3).map((s) => <i key={s.id}>{s.marca}</i>)}</span>
          </button>
        ))}
      </section>

      <div className="mo-dos-col mo-cols-13">
        <section className="mo-tarjeta" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p className="mo-eti">Lo que pasa · en vivo</p><span className="mo-vivo">● en vivo</span>
          </div>
          {avisos.slice(0, 9).map((a) => <LineaAviso key={a.id} e={e} a={a} />)}
        </section>
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="mo-tarjeta" style={{ padding: '18px 20px' }}>
            <p className="mo-eti" style={{ marginBottom: 6 }}>Hoy y mañana</p>
            {[...hoy, ...manana].map((t) => {
              const m = modeloPorId(e, t.modeloId);
              return (
                <div key={t.id} className="mo-fila">
                  <FotoModelo m={m} className="mo-mini" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: '.9rem' }}>{m.nombre} · {t.marca}</b>
                    <p className="mo-tenue" style={{ fontSize: '.76rem' }}>{mismoDia(t.fecha, ahora) ? 'Hoy' : 'Mañana'} {hora(t.fecha)} · {t.tipo} · {t.lugar}</p>
                  </div>
                </div>
              );
            })}
            {!hoy.length && !manana.length && <p className="mo-tenue" style={{ fontSize: '.86rem', padding: '8px 0' }}>Sin trabajos hoy ni mañana.</p>}
          </section>
          <section className="mo-tarjeta" style={{ padding: '18px 20px' }}>
            <p className="mo-eti" style={{ marginBottom: 10 }}>Las más pedidas · 30 días</p>
            {pedidas.map(({ m, n }, k) => (
              <div key={m.id} className="mo-ranking">
                <span className="mo-mono mo-tenue">{k + 1}</span>
                <FotoModelo m={m} className="mo-mini-redonda" style={{ width: 30, height: 30 }} />
                <span style={{ width: 92, fontSize: '.86rem' }}>{m.nombre}</span>
                <span className="mo-ranking-barra"><i style={{ width: `${(n / maxP) * 100}%` }} /></span>
                <b className="mo-mono" style={{ fontSize: '.78rem' }}>{n}</b>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}

// ── solicitudes: lista + detalle en la misma pantalla ───────────────────────
function Solicitudes({ e, abierta, setAbierta }) {
  const [filtro, setFiltro] = useState('activas');
  // cerrada = cancelada o ya pasó; lo confirmado que viene sigue en activas
  const cerrada = (s) => s.estado === 'cancelada' || (s.estado === 'confirmada' && s.fecha < Date.now());
  const lista = e.solicitudes.filter((s) => (filtro === 'activas' ? !cerrada(s) : cerrada(s)));
  const s = e.solicitudes.find((x) => x.id === abierta) || lista[0];
  return (
    <>
      <div className="mo-titulo">
        <div><p className="mo-eti">{lista.length} {filtro}</p><h1><em>Solicitudes</em></h1></div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="mo-chip" aria-pressed={filtro === 'activas'} onClick={() => setFiltro('activas')}>Activas</button>
          <button type="button" className="mo-chip" aria-pressed={filtro === 'cerradas'} onClick={() => setFiltro('cerradas')}>Cerradas</button>
        </div>
      </div>
      <div className="mo-bandeja">
        <div className="mo-tarjeta mo-bandeja-lista">
          {lista.map((x) => (
            <button key={x.id} type="button" className="mo-bandeja-fila" aria-current={s?.id === x.id ? 'true' : undefined} onClick={() => setAbierta(x.id)}>
              <div style={{ display: 'flex' }}>
                {x.modelos.slice(0, 3).map((mid, i) => <FotoModelo key={mid} m={modeloPorId(e, mid)} className="mo-mini-redonda" style={{ width: 30, height: 30, marginLeft: i ? -10 : 0, boxShadow: '0 0 0 2px var(--mo-blanco)' }} />)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b style={{ fontSize: '.9rem' }}>{x.marca}</b><span className="mo-tenue" style={{ fontSize: '.7rem', whiteSpace: 'nowrap' }}>{hace(x.creada)}</span></div>
                <p className="mo-tenue" style={{ fontSize: '.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.folio} · {x.proyecto}</p>
                <div style={{ marginTop: 6 }}>{x.estado === 'en_opcion' && listaParaCotizar(e, x) ? <Sello estado="nueva" texto={x.tipo === 'casting' ? 'Lista para confirmar' : 'Lista para cotizar'} /> : <Sello estado={x.estado} />}</div>
              </div>
            </button>
          ))}
          {!lista.length && <p className="mo-tenue" style={{ padding: 20 }}>Nada por aquí.</p>}
        </div>
        {s ? <DetalleSolicitud key={s.id} e={e} s={s} incrustado alCerrar={() => setAbierta(null)} /> : <div className="mo-tarjeta" style={{ padding: 24 }}><p className="mo-tenue">Elige una solicitud.</p></div>}
      </div>
    </>
  );
}

// lo que dice cada modelo de la solicitud cuando ya le llegó la opción
const RESPUESTA = { opcion: 'Esperando su respuesta', aceptado: 'Aceptó: tiene la fecha apartada', rechazado: 'No puede', confirmado: 'Confirmada', liberado: 'Se liberó la fecha' };

const CajaDetalle = ({ children }) => <section className="mo-tarjeta mo-bandeja-detalle">{children}</section>;

function DetalleSolicitud({ e, s, alCerrar, incrustado }) {
  const Caja = incrustado ? CajaDetalle : Modal;
  const [tarifas, setTarifas] = useState(() => Object.fromEntries(s.modelos.map((mid) => [mid, modeloPorId(e, mid)?.tarifa || 0])));
  const trabajos = e.trabajos.filter((t) => t.solicitud === s.id);
  const lista = listaParaCotizar(e, s);
  return (
    <Caja alCerrar={alCerrar} etiqueta={s.folio}>
      <p className="mo-eti">{s.folio} · {s.tipo === 'casting' ? 'Casting' : `Booking · ${s.trabajo}`}</p>
      <h2 className="mo-serif" style={{ fontSize: '1.9rem', lineHeight: 1.05, margin: '8px 0 6px' }}>{s.marca}<br /><em>{s.proyecto}</em></h2>
      <p className="mo-tenue" style={{ fontSize: '.86rem', lineHeight: 1.55 }}>
        {fechaLarga(s.fecha)} · {hora(s.fecha)} · {s.horas} h · {s.lugar || 'lugar por definir'}<br />
        {s.contacto} · {s.correo || s.telefono}{s.tipo === 'booking' ? ` · ${s.uso}` : ''}
      </p>
      {s.nota && <p className="mo-lapiz" style={{ margin: '12px 0 0', fontSize: '1.3rem' }}>“{s.nota}”</p>}

      <div style={{ margin: '18px 0' }}>
        {s.modelos.map((mid) => {
          const m = modeloPorId(e, mid);
          const t = trabajos.find((x) => x.modeloId === mid);
          const ch = choques(e, mid, s.fecha, t?.id).filter((x) => x.solicitud !== s.id);
          return (
            <div key={mid} className="mo-fila">
              <FotoModelo m={m} className="mo-mini" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: '.92rem' }}>{nombreDe(m)}</b>
                <p style={{ fontSize: '.76rem', color: ch.length || bloqueado(e, mid, s.fecha) ? 'var(--mo-rojo)' : 'var(--mo-tenue)' }}>
                  {bloqueado(e, mid, s.fecha) ? 'Marcó ese día como NO disponible · ' : ''}{ch.length ? `Ese día: ${ch.map((x) => `${x.marca} (${x.estado === 'confirmado' ? 'confirmado' : 'opción'})`).join(', ')}` : t ? (RESPUESTA[t.estado] || 'Libre ese día') : 'Libre ese día'}
                  {t?.nota ? ` · "${t.nota}"` : ''}
                </p>
              </div>
              {s.estado === 'nueva' && s.tipo === 'booking' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.8rem' }}>$
                  <input type="number" value={tarifas[mid]} onChange={(ev) => setTarifas({ ...tarifas, [mid]: ev.target.value })} style={{ width: 84, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--mo-linea)', background: 'var(--mo-blanco)' }} aria-label={`Tarifa de ${m.nombre}`} />
                </label>
              ) : t ? <Sello estado={t.estado} /> : null}
            </div>
          );
        })}
      </div>

      {s.estado === 'nueva' && (
        <>
          <p className="mo-tenue" style={{ fontSize: '.8rem', marginBottom: 12, lineHeight: 1.5 }}>Mandar la opción le aparta la fecha a cada modelo y le llega a su app para que acepte o rechace.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="mo-boton" onClick={() => { mandarOpciones(s.id, tarifas); avisarListo(`Opción enviada: le llegó a ${s.modelos.length === 1 ? 'la modelo' : `las ${s.modelos.length} modelos`} en su app`); }}><Send size={16} /> Mandar opción a {plural(s.modelos.length, 'modelo', 'modelos')}</button>
            <button type="button" className="mo-boton mo-boton-claro" onClick={() => { descartarSolicitud(s.id); avisarListo(`${s.folio} descartada`); }}>Descartar</button>
          </div>
        </>
      )}
      {s.estado === 'en_opcion' && (
        <>
          {!lista && <p className="mo-tenue" style={{ fontSize: '.84rem', marginBottom: 12 }}>Esperando a que las modelos contesten en su app… <span className="mo-lapiz">(Valeria la contestas tú en "Modelo")</span></p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {s.tipo === 'casting'
              ? <button type="button" className="mo-boton" disabled={!trabajos.some((t) => t.estado === 'aceptado')} onClick={() => { confirmarCasting(s.id); avisarListo(`Casting confirmado: ya está en la agenda de cada modelo`); }}><Check size={16} /> Confirmar casting con las que aceptaron</button>
              : <button type="button" className="mo-boton" disabled={!trabajos.some((t) => t.estado === 'aceptado')} onClick={() => { cotizar(s.id); avisarListo(`Cotización enviada a ${s.marca}`); }}><Send size={16} /> Mandar cotización al cliente</button>}
            <button type="button" className="mo-boton mo-boton-claro" onClick={() => { descartarSolicitud(s.id); avisarListo(`${s.folio} cancelada: las fechas se liberaron`); }}>Cancelar</button>
          </div>
        </>
      )}
      {s.estado === 'cotizada' && (
        <div className="mo-aviso" style={{ color: 'var(--mo-ambar)', background: 'rgba(168,113,28,.08)' }}>
          Cotización enviada por {dinero(s.cotizacion.total)} (IVA incluido). Esperando que el cliente la acepte{s.mia ? ' en "Cliente → Mis solicitudes"' : '…'}.
        </div>
      )}
      {s.estado === 'confirmada' && <div className="mo-aviso mo-ok"><Check size={16} /> Confirmado. Ya está en la agenda de cada modelo.</div>}
    </Caja>
  );
}

// ── calendario ──────────────────────────────────────────────────────────────
function Calendario({ e }) {
  const [desde, setDesde] = useState(0);
  const [detalle, setDetalle] = useState(null);
  const base = new Date(); base.setHours(12, 0, 0, 0);
  const dias = Array.from({ length: 14 }, (_, i) => base.getTime() + (desde + i) * DIA);
  const modelos = todasLasModelos(e);
  const t = detalle && e.trabajos.find((x) => x.id === detalle);
  const tm = t && modeloPorId(e, t.modeloId);
  return (
    <>
      <div className="mo-titulo">
        <div><p className="mo-eti">{new Date(dias[0]).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} — {new Date(dias[13]).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}</p><h1><em>Calendario</em></h1></div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button type="button" className="mo-chip" onClick={() => setDesde(desde - 7)} aria-label="Semana anterior"><ChevronLeft size={15} /></button>
          <button type="button" className="mo-chip" onClick={() => setDesde(0)}>Hoy</button>
          <button type="button" className="mo-chip" onClick={() => setDesde(desde + 7)} aria-label="Semana siguiente"><ChevronRight size={15} /></button>
        </div>
      </div>
      <div className="mo-cal mo-tarjeta">
        <table>
          <colgroup><col style={{ width: 150 }} />{dias.map((d) => <col key={d} />)}</colgroup>
          <thead>
            <tr><th />{dias.map((d) => {
              const f = new Date(d);
              const cls = [mismoDia(d, Date.now()) && 'hoy', [0, 6].includes(f.getDay()) && 'finde'].filter(Boolean).join(' ');
              return <th key={d} className={cls}><span>{f.toLocaleDateString('es-MX', { weekday: 'short' })}</span><b>{f.getDate()}</b></th>;
            })}</tr>
          </thead>
          <tbody>
            {modelos.map((m) => (
              <tr key={m.id}>
                <td className="mo-cal-nombre"><FotoModelo m={m} className="mo-mini-redonda" style={{ width: 28, height: 28 }} />{m.nombre}</td>
                {dias.map((d) => {
                  const ts = e.trabajos.filter((x) => x.modeloId === m.id && mismoDia(x.fecha, d) && !['rechazado', 'liberado'].includes(x.estado));
                  const evs = e.eventos.filter((ev) => ev.convocadas[m.id] === 'confirmada' && mismoDia(ev.fecha, d));
                  const f = new Date(d);
                  const cls = [mismoDia(d, Date.now()) && 'hoy', [0, 6].includes(f.getDay()) && 'finde', bloqueado(e, m.id, d) && 'bloq'].filter(Boolean).join(' ');
                  return (
                    <td key={d} className={cls}>
                      {ts.map((x) => <button type="button" key={x.id} className={`mo-bloque ${x.estado !== 'confirmado' ? x.estado : x.tipo === 'Casting' ? 'casting' : ''}`} onClick={() => setDetalle(x.id)} title={`${x.marca} · ${x.tipo} · ${hora(x.fecha)}`}>{x.marca}</button>)}
                      {evs.map((ev) => <span key={ev.id} className="mo-bloque casting" title={ev.titulo}>★ {ev.tipo}</span>)}
                      {bloqueado(e, m.id, d) && <span className="mo-bloque-bloq" title="La modelo marcó este día como no disponible">no disp.</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mo-leyenda">
        <span><i className="l-conf" /> Confirmado</span><span><i className="l-op" /> Opción / esperando cliente</span><span><i className="l-cast" /> Casting o evento</span><span><i className="l-bloq" /> No disponible</span>
      </div>
      {t && (
        <Modal alCerrar={() => setDetalle(null)} etiqueta="Trabajo">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
            <FotoModelo m={tm} className="mo-mini" style={{ width: 56, height: 70 }} />
            <div><p className="mo-eti">{tm.nombre} {tm.apellido} · Nº {tm.num}</p><h2 className="mo-gigante" style={{ fontSize: '2rem', marginTop: 6 }}>{t.marca}</h2></div>
          </div>
          <p className="mo-tenue">{t.proyecto}</p>
          <table className="mo-cot" style={{ marginTop: 14 }}><tbody>
            <tr><td>Tipo</td><td>{t.tipo}</td></tr>
            <tr><td>Fecha</td><td>{fechaLarga(t.fecha)} · {hora(t.fecha)}</td></tr>
            <tr><td>Duración</td><td>{t.horas} h</td></tr>
            <tr><td>Lugar</td><td>{t.lugar}</td></tr>
            {t.tarifa > 0 && <tr><td>Tarifa · modelo recibe</td><td>{dinero(t.tarifa)} · {dinero(neto(t.tarifa))}</td></tr>}
            <tr><td>Estado</td><td><Sello estado={realizado(t) ? 'realizado' : t.estado} /></td></tr>
          </tbody></table>
        </Modal>
      )}
    </>
  );
}

// ── board (las modelos y sus polaroids por aprobar) ─────────────────────────
function Board({ e }) {
  const modelos = todasLasModelos(e);
  const porAprobar = modelos.flatMap((m) => (e.polaroids[m.id] || []).filter((p) => !p.aprobada).map((p) => ({ m, p })));
  return (
    <>
      <h1>El <em>board</em></h1>
      {porAprobar.length > 0 && (
        <section className="mo-tarjeta" style={{ padding: 18, marginBottom: 20 }}>
          <p className="mo-eti" style={{ marginBottom: 12 }}>Polaroids por aprobar</p>
          <div className="mo-mesa">
            {porAprobar.map(({ m, p }) => (
              <div key={p.id} className="mo-polaroid" style={{ width: 150 }}>
                <Foto src={p.src} />
                <div className="mo-polaroid-pie">
                  <span className="mo-lapiz" style={{ fontSize: '1.2rem' }}>{m.nombre}</span>
                  <button type="button" className="mo-boton mo-boton-chico" style={{ padding: '6px 10px' }} onClick={() => aprobarPolaroid(m.id, p.id)}><Check size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="mo-tarjeta mo-tabla-envuelta" style={{ padding: '4px 18px' }}>
        <table className="mo-tabla">
          <thead><tr><th /><th>Modelo</th><th>Estatura</th><th>Categorías</th><th>Ciudad</th><th className="mo-num">Tarifa día</th><th className="mo-num">Facturó · 30 días</th></tr></thead>
          <tbody>
            {modelos.map((m) => {
              const mes = e.trabajos.filter((t) => t.modeloId === m.id && t.estado === 'confirmado' && t.fecha > Date.now() - 30 * DIA && t.fecha < Date.now()).reduce((a, t) => a + t.tarifa, 0);
              return (
                <tr key={m.id}>
                  <td style={{ width: 50 }}><FotoModelo m={m} className="mo-mini" /></td>
                  <td><b>{nombreDe(m)}</b><br /><span className="mo-tenue mo-mono" style={{ fontSize: '.7rem' }}>Nº {m.num}</span></td>
                  <td>{estaturaTxt(m.estatura)}</td>
                  <td>{m.categorias.join(', ')}</td>
                  <td>{m.ciudad}</td>
                  <td className="mo-num">{dinero(m.tarifa)}</td>
                  <td className="mo-num">{dinero(mes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── scouting ────────────────────────────────────────────────────────────────
const COLUMNAS = [['nueva', 'Nuevas'], ['casting', 'Al casting'], ['firmada', 'Firmadas'], ['descartada', 'Descartadas']];
function Scouting({ e }) {
  return (
    <>
      <h1><em>Scouting</em></h1>
      <p className="mo-tenue" style={{ fontSize: '.86rem', margin: '-8px 0 18px', lineHeight: 1.5 }}>Postulaciones que llegan del sitio con sus fotos. Mándalas al casting abierto (les llega su pase) o fírmalas: entran al book como New face.</p>
      <div className="mo-kanban">
        {COLUMNAS.map(([id, t]) => {
          const lista = e.aspirantes.filter((a) => a.estado === id);
          return (
            <div key={id} className="mo-columna">
              <h3>{t}<span>{lista.length}</span></h3>
              {lista.map((a) => (
                <div key={a.id} className="mo-asp">
                  <div className="mo-asp-fotos">
                    <Foto src={a.fotos[0]} iniciales={a.nombre.split(' ').map((x) => x[0]).slice(0, 2).join('')} />
                    <Foto src={a.fotos[1]} iniciales="·" />
                  </div>
                  <div>
                    <b style={{ fontSize: '.9rem' }}>{a.nombre}</b>{a.mia && <span className="mo-lapiz" style={{ marginLeft: 6, fontSize: '1.1rem' }}>tú</span>}
                    <p className="mo-tenue" style={{ fontSize: '.74rem' }}>{a.edad} años · {estaturaTxt(a.estatura)} · {a.ciudad} · {a.ig} · {hace(a.creada)}</p>
                  </div>
                  {id === 'nueva' && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button type="button" className="mo-boton mo-boton-chico" style={{ padding: '7px 11px' }} onClick={() => moverAspirante(a.id, 'casting')}>Al casting</button>
                      <button type="button" className="mo-boton mo-boton-claro mo-boton-chico" style={{ padding: '7px 11px' }} onClick={() => moverAspirante(a.id, 'descartada', 'Por ahora no')}><X size={13} /></button>
                    </div>
                  )}
                  {id === 'casting' && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button type="button" className="mo-boton mo-boton-chico" style={{ padding: '7px 11px' }} onClick={() => moverAspirante(a.id, 'firmada')}>Firmar</button>
                      <button type="button" className="mo-boton mo-boton-claro mo-boton-chico" style={{ padding: '7px 11px' }} onClick={() => moverAspirante(a.id, 'descartada', 'No pasó el casting')}><X size={13} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── eventos ─────────────────────────────────────────────────────────────────
function Eventos({ e }) {
  const [abierto, setAbierto] = useState(e.eventos[0]?.id);
  const [nuevo, setNuevo] = useState(false);
  const ev = e.eventos.find((x) => x.id === abierto) || e.eventos[0];
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1><em>Eventos</em></h1>
        <button type="button" className="mo-boton mo-boton-chico" style={{ marginBottom: 20 }} onClick={() => setNuevo(true)}>Nuevo evento</button>
      </div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, scrollbarWidth: 'none' }}>
        {[...e.eventos].sort((a, b) => a.fecha - b.fecha).map((x) => (
          <button key={x.id} type="button" className="mo-chip" aria-pressed={x.id === ev?.id} onClick={() => setAbierto(x.id)}>{fechaCorta(x.fecha)} · {x.titulo.split('·')[0]}</button>
        ))}
      </div>
      {ev && <DetalleEvento key={ev.id} e={e} ev={ev} />}
      {nuevo && <NuevoEvento alCerrar={() => setNuevo(false)} />}
    </>
  );
}

function DetalleEvento({ e, ev }) {
  const [busca, setBusca] = useState('');
  const [codigo, setCodigo] = useState('');
  const [flash, setFlash] = useState(null);
  const lector = useRef(null);
  useEffect(() => { if (!flash) return undefined; const id = setTimeout(() => setFlash(null), 3500); return () => clearTimeout(id); }, [flash]);
  const llegaron = ev.invitados.filter((p) => p.estado === 'llegó').length;
  const lista = ev.invitados.filter((p) => !busca || `${p.nombre} ${p.empresa} ${p.codigo}`.toLowerCase().includes(busca.toLowerCase()));
  const leer = (c) => {
    const p = llegadaPorCodigo(ev.id, c);
    setFlash(p ? { ok: !p.yaEstaba, texto: p.yaEstaba ? `${p.nombre} ya había entrado` : `Bienvenida, ${p.nombre}${p.empresa ? ` · ${p.empresa}` : ''}` } : { ok: false, texto: `${c.toUpperCase()} no está en la lista` });
    setCodigo('');
    lector.current?.focus();
  };
  const pruebas = ev.invitados.filter((p) => p.estado !== 'llegó').slice(0, 2);
  return (
    <div className="mo-dos-col">
      <section className="mo-tarjeta" style={{ overflow: 'hidden' }}>
        <Foto src={ev.foto} style={{ aspectRatio: '3 / 1.5' }} />
        <div style={{ padding: 18 }}>
          <p className="mo-eti">{ev.tipo} · {ev.publico ? 'Público' : 'Privado'}</p>
          <h2 className="mo-serif" style={{ fontSize: '1.7rem', lineHeight: 1.05, margin: '8px 0 6px' }}>{ev.titulo}</h2>
          <p className="mo-tenue" style={{ fontSize: '.84rem' }}>{fechaLarga(ev.fecha)} · {hora(ev.fecha)} · {ev.lugar}</p>
          <p className="mo-eti" style={{ margin: '18px 0 8px' }}>Convocatoria · toca para convocar o quitar</p>
          {todasLasModelos(e).map((m) => {
            const est = ev.convocadas[m.id];
            return (
              <button key={m.id} type="button" className="mo-fila" style={{ width: '100%', textAlign: 'left', padding: '8px 0' }} onClick={() => convocar(ev.id, m.id)}>
                <FotoModelo m={m} className="mo-mini-redonda" style={{ width: 30, height: 30, opacity: est ? 1 : .45 }} />
                <span style={{ flex: 1, fontSize: '.88rem', color: est ? 'inherit' : 'var(--mo-tenue)' }}>{nombreDe(m)}</span>
                {est && <Sello estado={est} />}
              </button>
            );
          })}
        </div>
      </section>
      <section className="mo-tarjeta" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 10, marginBottom: 12 }}>
          <div><p className="mo-eti">Puerta</p><p className="mo-grande" style={{ fontSize: '2.2rem', marginTop: 6 }}>{llegaron}<span className="mo-tenue" style={{ fontSize: '1.2rem' }}> / {ev.invitados.length}</span></p></div>
          {ev.cupo > 0 && <span className="mo-tenue" style={{ fontSize: '.8rem' }}>Cupo {ev.cupo}</span>}
        </div>
        {ev.invitados.length > 0 && (
          <>
            <form className="mo-lector" onSubmit={(x) => { x.preventDefault(); if (codigo.trim()) leer(codigo); }}>
              <ScanLine size={18} />
              <input ref={lector} value={codigo} onChange={(x) => setCodigo(x.target.value)} placeholder="Escanea el pase con el lector" aria-label="Código del pase" />
            </form>
            {pruebas.length > 0 && (
              <div style={{ display: 'flex', gap: 6, margin: '8px 0', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="mo-tenue" style={{ fontSize: '.72rem' }}>Pases de prueba:</span>
                {pruebas.map((p) => <button key={p.id} type="button" className="mo-chip" style={{ padding: '4px 10px', fontSize: '.72rem' }} onClick={() => leer(p.codigo)}>{p.codigo}</button>)}
                <button type="button" className="mo-chip" style={{ padding: '4px 10px', fontSize: '.72rem' }} onClick={() => leer('KADE-XXXX')}>falso</button>
              </div>
            )}
            {flash && <div className="mo-flash" style={{ background: flash.ok ? 'var(--mo-verde)' : 'var(--mo-rojo)', color: '#fff', marginBottom: 8 }}>{flash.ok ? '✓ ' : '✕ '}{flash.texto}</div>}
            <input value={busca} onChange={(x) => setBusca(x.target.value)} placeholder="Buscar invitado" style={{ width: '100%', padding: '10px 0', border: 0, borderBottom: '1px solid var(--mo-linea)', background: 'transparent', outline: 'none', margin: '6px 0' }} />
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {lista.map((p) => (
                <div key={p.id} className="mo-fila" style={{ padding: '9px 0' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: '.88rem' }}>{p.nombre}</b>{p.mio && <span className="mo-lapiz" style={{ marginLeft: 6, fontSize: '1.05rem' }}>tú</span>}
                    <p className="mo-tenue" style={{ fontSize: '.72rem' }}>{p.empresa || 'Invitada'} · <span className="mo-mono">{p.codigo}</span></p>
                  </div>
                  <button type="button" className="mo-chip" aria-pressed={p.estado === 'llegó'} onClick={() => marcarLlegada(ev.id, p.id)} style={{ padding: '5px 11px', fontSize: '.74rem' }}>{p.estado === 'llegó' ? 'Llegó' : 'Marcar'}</button>
                </div>
              ))}
            </div>
          </>
        )}
        {!ev.invitados.length && <p className="mo-tenue" style={{ fontSize: '.86rem' }}>Evento privado: solo modelos convocadas y producción.</p>}
      </section>
    </div>
  );
}

function NuevoEvento({ alCerrar }) {
  const [f, setF] = useState({ titulo: '', tipo: 'Pasarela', fecha: aLocal(Date.now() + 14 * DIA).slice(0, 11) + '19:00', lugar: '', cupo: 100, publico: true, descripcion: '' });
  const pon = (k) => (x) => setF({ ...f, [k]: x.target.type === 'checkbox' ? x.target.checked : x.target.value });
  const fotos = { Pasarela: 'evento-pasarela', 'Casting abierto': 'evento-casting', Campaña: 'evento-campana', Fiesta: 'evento-pasarela' };
  return (
    <Modal alCerrar={alCerrar} etiqueta="Nuevo evento">
      <h2 className="mo-serif" style={{ fontSize: '1.9rem', marginBottom: 18 }}>Nuevo <em>evento</em></h2>
      <form style={{ display: 'grid', gap: 14 }} onSubmit={(x) => {
        x.preventDefault();
        if (!f.titulo) return;
        crearEvento({ ...f, fecha: new Date(f.fecha).getTime(), cupo: Number(f.cupo), foto: `/modelos/mira/${fotos[f.tipo]}.webp` });
        alCerrar();
      }}>
        <Campo etiqueta="Nombre"><input value={f.titulo} onChange={pon('titulo')} placeholder="Ej. Lanzamiento colección cápsula" required /></Campo>
        <div className="mo-dos">
          <Campo etiqueta="Tipo"><select value={f.tipo} onChange={pon('tipo')}>{Object.keys(fotos).map((t) => <option key={t}>{t}</option>)}</select></Campo>
          <Campo etiqueta="Fecha y hora"><input type="datetime-local" value={f.fecha} onChange={pon('fecha')} /></Campo>
          <Campo etiqueta="Lugar"><input value={f.lugar} onChange={pon('lugar')} /></Campo>
          <Campo etiqueta="Cupo"><input type="number" value={f.cupo} onChange={pon('cupo')} /></Campo>
        </div>
        <Campo etiqueta="Descripción"><textarea value={f.descripcion} onChange={pon('descripcion')} /></Campo>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '.88rem' }}><input type="checkbox" checked={f.publico} onChange={pon('publico')} /> Público: sale en el sitio con registro</label>
        <button type="submit" className="mo-boton" disabled={!f.titulo}>Crear evento</button>
      </form>
    </Modal>
  );
}

// ── dinero ──────────────────────────────────────────────────────────────────
function Dinero({ e }) {
  const hechos = e.trabajos.filter((t) => realizado(t) && t.tarifa > 0).sort((a, b) => b.fecha - a.fecha);
  const porCobrar = hechos.filter((t) => !t.cobrado);
  const porLiquidar = hechos.filter((t) => t.cobrado && !t.liquidado);
  const comision = hechos.filter((t) => t.fecha > Date.now() - 30 * DIA).reduce((a, t) => a + t.tarifa * AGENCIA.comision, 0);
  return (
    <>
      <div className="mo-titulo"><div><p className="mo-eti">Cobros y liquidaciones</p><h1><em>Dinero</em></h1></div></div>
      <div className="mo-kpis">
        <div className="mo-kpi"><span className="mo-eti">Clientes deben</span><b>{dinero(porCobrar.reduce((a, t) => a + t.tarifa * (1 + AGENCIA.iva), 0))}</b></div>
        <div className="mo-kpi"><span className="mo-eti">Por pagar a modelos</span><b>{dinero(porLiquidar.reduce((a, t) => a + neto(t.tarifa), 0))}</b></div>
        <div className="mo-kpi"><span className="mo-eti">Comisión · 30 días</span><b>{dinero(comision)}</b></div>
        <div className="mo-kpi"><span className="mo-eti">Comisión</span><b>{AGENCIA.comision * 100}%</b></div>
      </div>
      <section className="mo-tarjeta" style={{ padding: 20, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <p className="mo-eti">Facturado por mes · y lo que se queda la agencia</p>
          <div className="mo-leyenda" style={{ margin: 0 }}><span><i className="l-conf" /> Facturado</span><span><i className="l-rojo" /> Comisión {AGENCIA.comision * 100}%</span></div>
        </div>
        <div className="mo-barras mo-barras-doble">
          {(() => { const ms = meses6(e); const max = Math.max(...ms.map((x) => x.total), 1); return ms.map((x, k) => (
            <div key={x.etiqueta}>
              <b>{x.total ? `${Math.round(x.total / 1000)}k` : ''}</b>
              <span className="mo-barras-par">
                <i style={{ height: `${Math.max(2, (x.total / max) * 100)}%`, animationDelay: `${k * 60}ms` }} />
                <i className="actual" style={{ height: `${Math.max(1, (x.total * AGENCIA.comision / max) * 100)}%`, animationDelay: `${k * 60 + 30}ms` }} />
              </span>
              <span>{x.etiqueta}</span>
            </div>
          )); })()}
        </div>
      </section>
      <div className="mo-tarjeta mo-tabla-envuelta" style={{ padding: '4px 18px' }}>
        <table className="mo-tabla">
          <thead><tr><th>Trabajo</th><th>Modelo</th><th className="mo-num">Cliente paga</th><th className="mo-num">Modelo recibe</th><th className="mo-num">Agencia</th><th>Cobro</th><th>Pago a modelo</th></tr></thead>
          <tbody>
            {hechos.map((t) => {
              const m = modeloPorId(e, t.modeloId);
              return (
                <tr key={t.id}>
                  <td><b>{t.marca}</b><br /><span className="mo-tenue" style={{ fontSize: '.74rem' }}>{t.tipo} · {fechaCorta(t.fecha)}</span></td>
                  <td>{m?.nombre}</td>
                  <td className="mo-num">{dinero(t.tarifa * (1 + AGENCIA.iva))}</td>
                  <td className="mo-num">{dinero(neto(t.tarifa))}</td>
                  <td className="mo-num">{dinero(t.tarifa - neto(t.tarifa))}</td>
                  <td>{t.cobrado ? <Sello estado="confirmada" texto="Cobrado" /> : <button type="button" className="mo-chip" style={{ padding: '5px 11px', fontSize: '.74rem' }} onClick={() => marcarCobrado(t.id)}>Marcar cobrado</button>}</td>
                  <td>{t.liquidado ? <Sello estado="confirmada" texto="Pagado" /> : <button type="button" className="mo-chip" disabled={!t.cobrado} style={{ padding: '5px 11px', fontSize: '.74rem', opacity: t.cobrado ? 1 : .4 }} onClick={() => liquidar(t.id)}>Pagar {dinero(neto(t.tarifa))}</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mo-tenue" style={{ fontSize: '.76rem', marginTop: 10 }}>A la modelo se le paga hasta que el cliente pagó. En el sistema real, "cobrado" se marca solo con la transferencia o el pago con tarjeta.</p>
    </>
  );
}

