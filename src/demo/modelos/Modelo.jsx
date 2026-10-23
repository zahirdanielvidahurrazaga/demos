import { useRef, useState } from 'react';
import {
  Bell, CalendarDays, CalendarPlus, Camera, Check, ChevronLeft, ChevronRight, Eye, FileText, Home, Inbox, Lock,
  MapPin, Printer, Ruler, Wallet, X,
} from 'lucide-react';
import {
  AGENCIA, YO_MODELO, DIA, HORA, PORTADAS,
  useAgencia, modeloPorId, fotoDe, bloqueado, responderOpcion, responderConvocatoria, subirPolaroid, marcarLeidos,
  elegirPrincipal, actualizarPerfil, alternarBloqueo,
  neto, realizado, dinero, fechaCorta, fechaLarga, hora, mismoDia, estaturaTxt, pedidasDe,
} from './datos';
import { Campo, Foto, FotoModelo, Modal, Polaroid, Sello, avisarListo, miniatura } from './comun';
import Portada from './Portada';
import Marco, { LineaAviso } from './Marco';

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL DE LA MODELO — la cuenta de la demo es Valeria Ruiz.
// Ya no es una vista de celular: es su sistema completo, con menú lateral en
// compu (arriba en celular). Inicio con sus números · Agenda de mes con días
// bloqueados · Opciones, convocatorias y lo que dijeron en cada casting ·
// Pagos con gráfica y recibos · Mi book (foto principal, polaroids, medidas) ·
// Documentos (contrato, fiscales, banco).
// ─────────────────────────────────────────────────────────────────────────────

const SECCIONES = [
  ['inicio', 'Inicio', Home],
  ['agenda', 'Agenda', CalendarDays],
  ['opciones', 'Opciones', Inbox],
  ['pagos', 'Pagos', Wallet],
  ['book', 'Mi book', Camera],
  ['documentos', 'Documentos', FileText],
];

export default function Modelo() {
  const e = useAgencia();
  const m = modeloPorId(e, YO_MODELO);
  const [sec, setSec] = useState('inicio');
  const [verPortada, setVerPortada] = useState(false);
  const mios = e.trabajos.filter((t) => t.modeloId === YO_MODELO);
  const opciones = mios.filter((t) => t.estado === 'opcion');
  const convocatorias = e.eventos.filter((ev) => ev.convocadas[YO_MODELO] === 'pendiente');
  const pendientes = opciones.length + convocatorias.length;
  const ir = (s) => { setSec(s); window.scrollTo({ top: 0 }); };

  if (verPortada) {
    return (
      <div className="mo-oscuro" style={{ background: 'var(--mo-papel)', color: 'var(--mo-tinta)', minHeight: '100vh' }}>
        <div className="mo-sitio">
          <p className="mo-eti" style={{ padding: '6px 0 4px' }}>Así te ven las marcas en el sitio</p>
          <Portada id={YO_MODELO} lista={[YO_MODELO]} alCambiar={() => {}} alCerrar={() => setVerPortada(false)} soloVer />
        </div>
      </div>
    );
  }

  // el buscador de arriba: sus trabajos y castings
  const buscar = (q) => mios.filter((t) => `${t.marca} ${t.proyecto} ${t.tipo}`.toLowerCase().includes(q)).sort((x, y) => y.fecha - x.fecha)
    .map((t) => ({ k: t.id, titulo: `${t.marca} · ${t.tipo}`, detalle: `${t.proyecto} · ${fechaCorta(t.fecha)}`, alElegir: () => ir(t.fecha > Date.now() ? 'agenda' : 'pagos') }));
  const SECS = SECCIONES.map(([id, t, Icon]) => [id, t, Icon, id === 'opciones' ? pendientes : 0]);
  return (
    <Marco secciones={[...SECS, ['portada', 'Ver mi portada', Eye, 0]]} sec={sec} para={YO_MODELO} buscar={buscar} pista="Buscar trabajo o marca"
      ir={(s) => (s === 'portada' ? setVerPortada(true) : ir(s))}
      cabeza={(
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <FotoModelo m={m} className="mo-mini-redonda" />
          <div>
            <div className="mo-logo" style={{ fontSize: '1rem', color: '#F2EEE7' }}>{AGENCIA.nombre}</div>
            <p style={{ fontSize: '.72rem', marginTop: 4, opacity: .55 }}>{m.nombre} · Nº {m.num}</p>
          </div>
        </div>
      )}
      pie={<><p style={{ opacity: .55 }}>Tu booker</p><b>Paola Ríos</b><p style={{ opacity: .55, marginTop: 2 }}>{AGENCIA.correo}</p></>}
      quien={<FotoModelo m={m} className="mo-mini-redonda" style={{ width: 34, height: 34 }} />}>
      {sec === 'inicio' && <Inicio e={e} m={m} mios={mios} pendientes={pendientes} ir={ir} verPortada={() => setVerPortada(true)} />}
      {sec === 'agenda' && <Agenda e={e} mios={mios} />}
      {sec === 'opciones' && <Opciones e={e} mios={mios} opciones={opciones} convocatorias={convocatorias} />}
      {sec === 'pagos' && <Pagos mios={mios} />}
      {sec === 'book' && <MiBook e={e} m={m} verPortada={() => setVerPortada(true)} />}
      {sec === 'documentos' && <Documentos />}
    </Marco>
  );
}

// ── inicio ──────────────────────────────────────────────────────────────────
function Chispa({ datos }) {
  const max = Math.max(...datos, 1);
  const pts = datos.map((v, i) => `${(i / (datos.length - 1)) * 100},${40 - (v / max) * 36}`).join(' ');
  return (
    <svg className="mo-chispa" viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Inicio({ e, m, mios, pendientes, ir, verPortada }) {
  const ahora = Date.now();
  const proximo = mios.filter((t) => t.estado === 'confirmado' && t.fecha + t.horas * HORA > ahora).sort((a, b) => a.fecha - b.fecha)[0];
  const vistas = e.vistas[YO_MODELO] || [];
  const enPackages = pedidasDe(e, YO_MODELO);
  // lo ganado = trabajos ya hechos (igual que la barra del mes en Pagos);
  // lo que falta del mes va aparte como "agendado"
  const mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0);
  const finMes = new Date(mes); finMes.setMonth(finMes.getMonth() + 1);
  const delMes = mios.filter((t) => t.estado === 'confirmado' && t.tarifa > 0 && t.fecha >= mes.getTime() && t.fecha < finMes.getTime());
  const esteMes = delMes.filter(realizado).reduce((a, t) => a + neto(t.tarifa), 0);
  const agendado = delMes.filter((t) => !realizado(t)).reduce((a, t) => a + neto(t.tarifa), 0);
  const misAvisos = e.avisos.filter((a) => a.para === YO_MODELO);
  const [palabra] = PORTADAS[YO_MODELO];
  return (
    <>
      <section className="mo-banner">
        <img src={fotoDe(m, 'cerca')} alt="" />
        <div>
          <p className="mo-eti" style={{ color: 'rgba(255,255,255,.7)' }}>Nº {m.num} · {m.categorias.join(' · ')}</p>
          <h1 className="mo-gigante">Hola, <em>{m.nombre}</em></h1>
          <p style={{ opacity: .8, marginTop: 8 }}>{proximo ? `Lo que sigue: ${proximo.marca} · ${fechaCorta(proximo.fecha)}, ${hora(proximo.fecha)}` : 'Agenda libre por ahora.'}</p>
        </div>
      </section>

      {pendientes > 0 && (
        <button type="button" onClick={() => ir('opciones')} className="mo-aviso" style={{ width: '100%', textAlign: 'left', marginBottom: 18 }}>
          <span className="mo-lapiz" style={{ fontSize: '1.4rem' }}>!</span>
          <span><b>{pendientes} {pendientes === 1 ? 'opción espera' : 'opciones esperan'} tu respuesta.</b> Tu booker no puede confirmarle al cliente hasta que contestes.</span>
        </button>
      )}

      <div className="mo-kpis">
        <div className="mo-kpi"><span className="mo-eti">Vieron tu ficha · 7 días</span><b>{vistas.reduce((a, v) => a + v, 0)}</b><Chispa datos={vistas} /></div>
        <div className="mo-kpi"><span className="mo-eti">Te pidieron · 30 días</span><b>{enPackages}</b><p className="mo-tenue" style={{ fontSize: '.74rem', marginTop: 8 }}>packages y solicitudes</p></div>
        <button type="button" className="mo-kpi" onClick={() => ir('pagos')}><span className="mo-eti">Ganaste este mes</span><b>{dinero(esteMes)}</b><p className="mo-tenue" style={{ fontSize: '.74rem', marginTop: 8 }}>{agendado ? `+ ${dinero(agendado)} ya agendado` : 'ya sin comisión'}</p></button>
        <button type="button" className="mo-kpi" onClick={() => ir('opciones')}><span className="mo-eti">Por contestar</span><b>{pendientes}</b><p className="mo-tenue" style={{ fontSize: '.74rem', marginTop: 8 }}>opciones y convocatorias</p></button>
      </div>

      <div className="mo-portal-grid">
        <div style={{ display: 'grid', gap: 18 }}>
          {proximo ? (
            <section className="mo-tarjeta-negra">
              <p className="mo-eti" style={{ color: 'rgba(242,238,231,.55)' }}>Lo que sigue · {fechaCorta(proximo.fecha)}</p>
              <p className="mo-gigante" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', margin: '12px 0 10px' }}>{proximo.marca}<br /><em>{proximo.tipo.toLowerCase()}</em></p>
              <p style={{ opacity: .75, fontSize: '.9rem' }}>{proximo.proyecto}</p>
              <p style={{ opacity: .75, fontSize: '.9rem', marginTop: 4 }}>Call time {hora(proximo.fecha)} · {proximo.horas} h · {proximo.lugar}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <a className="mo-boton mo-boton-chico mo-boton-blanco" href={`https://maps.google.com/?q=${encodeURIComponent(proximo.lugar)}`} target="_blank" rel="noreferrer"><MapPin size={14} /> Cómo llegar</a>
                <button type="button" className="mo-boton mo-boton-chico mo-boton-blanco" onClick={() => descargarIcs(proximo)}><CalendarPlus size={14} /> A mi calendario</button>
              </div>
            </section>
          ) : <section className="mo-tarjeta" style={{ padding: 22 }}><p className="mo-tenue">Sin trabajos confirmados por ahora.</p></section>}

          <section className="mo-tarjeta" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><Bell size={15} /><p className="mo-eti">Avisos de la agencia</p>
              {misAvisos.some((a) => !a.leido) && <button type="button" className="mo-chip" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '.72rem' }} onClick={() => marcarLeidos(YO_MODELO)}>Marcar leídos</button>}
            </div>
            {misAvisos.slice(0, 7).map((a) => <LineaAviso key={a.id} e={e} a={a} />)}
            {!misAvisos.length && <p className="mo-tenue" style={{ fontSize: '.86rem', padding: '10px 0' }}>Aquí te llegan opciones, confirmaciones y depósitos al momento.</p>}
          </section>
        </div>

        <button type="button" onClick={verPortada} className="mo-tarjeta" style={{ overflow: 'hidden', textAlign: 'left' }}>
          <div style={{ position: 'relative' }}>
            <Foto src={fotoDe(m, 'cerca')} style={{ aspectRatio: '16 / 9' }} />
            <span className="mo-gigante" style={{ position: 'absolute', left: 14, bottom: 4, color: '#fff', fontSize: '3.4rem', textTransform: 'uppercase' }}>{palabra}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: 6 }}>
            {['book', 'pose', 'bn'].map((t) => <Foto key={t} src={fotoDe(m, t)} style={{ aspectRatio: '3 / 4' }} />)}
          </div>
          <div style={{ padding: '10px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><p className="mo-eti">Tu portada en el sitio</p><p style={{ fontSize: '.84rem', marginTop: 4 }}>Así te ven las marcas</p></div>
            <Eye size={18} />
          </div>
        </button>
      </div>
    </>
  );
}

// archivo .ics para agregar el trabajo al calendario del teléfono
function descargarIcs(t) {
  const f = (ts) => new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KADE//Demo//ES', 'BEGIN:VEVENT', `UID:${t.id}@kade.mx`, `DTSTAMP:${f(Date.now())}`,
    `DTSTART:${f(t.fecha)}`, `DTEND:${f(t.fecha + t.horas * HORA)}`, `SUMMARY:${t.marca} · ${t.tipo}`, `LOCATION:${t.lugar}`, `DESCRIPTION:${t.proyecto}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `${t.marca}.ics`.replace(/\s+/g, '-');
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ── agenda de mes ───────────────────────────────────────────────────────────
function Agenda({ e, mios }) {
  const [desfase, setDesfase] = useState(0);
  const [dia, setDia] = useState(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.getTime(); });
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + desfase); base.setHours(12, 0, 0, 0);
  const inicio = new Date(base); inicio.setDate(1 - ((base.getDay() + 6) % 7));   // lunes
  const celdas = Array.from({ length: 42 }, (_, i) => inicio.getTime() + i * DIA);
  const visibles = mios.filter((t) => !['rechazado', 'liberado'].includes(t.estado));
  const itemsDe = (d) => [
    ...visibles.filter((t) => mismoDia(t.fecha, d)).map((t) => ({ k: t.id, t })),
    ...e.eventos.filter((ev) => ev.convocadas[YO_MODELO] === 'confirmada' && mismoDia(ev.fecha, d)).map((ev) => ({ k: ev.id, ev })),
  ];
  const delDia = itemsDe(dia);
  const bloq = bloqueado(e, YO_MODELO, dia);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ textTransform: 'capitalize' }}>{base.toLocaleDateString('es-MX', { month: 'long' })} <em>{base.getFullYear()}</em></h1>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <button type="button" className="mo-chip" onClick={() => setDesfase(desfase - 1)} aria-label="Mes anterior"><ChevronLeft size={15} /></button>
          <button type="button" className="mo-chip" onClick={() => setDesfase(0)}>Hoy</button>
          <button type="button" className="mo-chip" onClick={() => setDesfase(desfase + 1)} aria-label="Mes siguiente"><ChevronRight size={15} /></button>
        </div>
      </div>
      <div className="mo-portal-grid mo-cols-17">
        <div>
        <div className="mo-mes">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => <span key={d}>{d}</span>)}
          {celdas.map((d) => {
            const its = itemsDe(d);
            const cls = [new Date(d).getMonth() !== base.getMonth() && 'fuera', mismoDia(d, Date.now()) && 'hoy', bloqueado(e, YO_MODELO, d) && 'bloq'].filter(Boolean).join(' ');
            return (
              <button key={d} type="button" className={cls} aria-pressed={mismoDia(d, dia)} onClick={() => setDia(d)}>
                <span className="mo-mes-dia">{new Date(d).getDate()}</span>
                {its.slice(0, 3).map(({ k, t, ev }) => (
                  <span key={k} className={`mo-bloque ${t ? (t.estado !== 'confirmado' ? t.estado : t.tipo === 'Casting' ? 'casting' : '') : 'casting'}`}>{t ? t.marca : `★ ${ev.tipo}`}</span>
                ))}
              </button>
            );
          })}
        </div>
        <div className="mo-dispo-leyenda mo-agenda-leyenda">
          {[['', 'Trabajo confirmado'], ['opcion', 'Opción por contestar'], ['casting', 'Casting o evento'], ['bloq', 'No disponible']].map(([c, t]) => (
            <span key={t}><i className={c} />{t}</span>
          ))}
        </div>
        </div>
        <section className="mo-tarjeta" style={{ padding: 20 }}>
          <p className="mo-eti">{new Date(dia).toLocaleDateString('es-MX', { weekday: 'long' })}</p>
          <p className="mo-gigante" style={{ fontSize: '2.6rem', margin: '6px 0 14px' }}>{new Date(dia).getDate()} <em style={{ fontSize: '1.4rem' }}>{new Date(dia).toLocaleDateString('es-MX', { month: 'long' })}</em></p>
          {delDia.map(({ k, t, ev }) => (
            <div key={k} style={{ padding: '14px 0', borderTop: '1px solid var(--mo-linea)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
                <b>{t ? `${t.marca} · ${t.tipo}` : ev.titulo}</b>
                {t && <Sello estado={realizado(t) ? 'realizado' : t.estado} texto={t.estado === 'aceptado' ? 'Esperando cliente' : undefined} />}
              </div>
              <p className="mo-tenue" style={{ fontSize: '.84rem', marginTop: 4 }}>{t ? t.proyecto : ev.descripcion}</p>
              <p style={{ fontSize: '.84rem', marginTop: 6 }}>{hora(t ? t.fecha : ev.fecha)}{t ? ` · ${t.horas} h` : ''} · {(t ? t.lugar : ev.lugar) || 'Lugar por confirmar'}</p>
              {t && t.tarifa > 0 && <p className="mo-tenue" style={{ fontSize: '.8rem', marginTop: 4 }}>Te quedan {dinero(neto(t.tarifa))}</p>}
              {t?.feedback && <p className="mo-lapiz" style={{ fontSize: '1.2rem', marginTop: 8 }}>“{t.feedback}”</p>}
              {t && t.fecha > Date.now() && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <a className="mo-chip" href={`https://maps.google.com/?q=${encodeURIComponent(t.lugar)}`} target="_blank" rel="noreferrer"><MapPin size={13} /> Cómo llegar</a>
                  <button type="button" className="mo-chip" onClick={() => descargarIcs(t)}><CalendarPlus size={13} /> A mi calendario</button>
                </div>
              )}
            </div>
          ))}
          {!delDia.length && <p className="mo-tenue" style={{ fontSize: '.88rem', padding: '6px 0 14px' }}>{bloq ? 'Marcaste este día como no disponible.' : 'Día libre.'}</p>}
          {dia >= new Date().setHours(0, 0, 0, 0) && !delDia.some((x) => x.t?.estado === 'confirmado') && (
            <button type="button" className={`mo-boton mo-boton-chico ${bloq ? '' : 'mo-boton-claro'}`} style={{ marginTop: 10 }} onClick={() => alternarBloqueo(YO_MODELO, dia)}>
              <Lock size={14} /> {bloq ? 'Volver a estar disponible' : 'No estoy disponible este día'}
            </button>
          )}
          <p className="mo-tenue" style={{ fontSize: '.74rem', marginTop: 12, lineHeight: 1.5 }}>Los días que bloqueas salen tachados en tu ficha del sitio y en el calendario de tu booker: nadie te aparta en tus vacaciones.</p>
        </section>
      </div>
    </>
  );
}

// ── opciones, convocatorias y castings ──────────────────────────────────────
const MOTIVOS = ['Ya tengo trabajo', 'Estoy de viaje', 'No me late el proyecto'];
const RESULTADO = { quedo: ['¡Quedaste!', 'confirmada'], no: ['No quedaste', 'descartada'], espera: ['En espera', 'pendiente'] };

function Opciones({ e, mios, opciones, convocatorias }) {
  const [rechazo, setRechazo] = useState(null);
  const castings = mios.filter((t) => t.tipo === 'Casting' && t.feedback).sort((a, b) => b.fecha - a.fecha);
  return (
    <>
      <h1>Por <em>contestar</em></h1>
      <p className="mo-tenue" style={{ fontSize: '.9rem', margin: '-8px 0 20px', lineHeight: 1.55, maxWidth: 620 }}>Una opción es la agencia apartándote la fecha. Si aceptas, tu booker cotiza al cliente; si no puedes, te libera y le avisa.</p>
      <div className="mo-portal-grid">
        <div>
          {opciones.map((t) => {
            const choca = e.trabajos.filter((x) => x.modeloId === YO_MODELO && x.id !== t.id && x.estado === 'confirmado' && mismoDia(x.fecha, t.fecha));
            return (
              <article key={t.id} className="mo-tarjeta" style={{ padding: 20, marginBottom: 12, animation: 'mo-sube .3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <Sello estado="opcion" texto={`Opción · ${t.tipo}`} />
                  <span className="mo-tenue" style={{ fontSize: '.78rem' }}>{fechaLarga(t.fecha)}</span>
                </div>
                <h3 className="mo-gigante" style={{ fontSize: '2.2rem', margin: '14px 0 6px' }}>{t.marca}</h3>
                <p className="mo-tenue">{t.proyecto}</p>
                <p style={{ fontSize: '.9rem', marginTop: 8 }}>{hora(t.fecha)} · {t.horas} h · {t.lugar}</p>
                {t.tarifa > 0 && <p style={{ fontSize: '.9rem', marginTop: 4 }}>Te quedan <b>{dinero(neto(t.tarifa))}</b> <span className="mo-tenue">({dinero(t.tarifa)} menos {AGENCIA.comision * 100}% de agencia)</span></p>}
                {bloqueado(e, YO_MODELO, t.fecha) && <div className="mo-aviso" style={{ marginTop: 10 }}>Ese día lo marcaste como no disponible.</div>}
                {choca.length > 0 && <div className="mo-aviso" style={{ marginTop: 10 }}>Ese día ya tienes {choca.map((x) => x.marca).join(', ')}.</div>}
                {rechazo === t.id ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
                    {MOTIVOS.map((mo) => <button key={mo} type="button" className="mo-chip" onClick={() => { responderOpcion(t.id, false, mo); setRechazo(null); avisarListo(`Listo: tu booker ya sabe que no puedes con ${t.marca}`); }}>{mo}</button>)}
                    <button type="button" className="mo-chip" onClick={() => setRechazo(null)} aria-label="Cancelar"><X size={13} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button type="button" className="mo-boton mo-boton-chico" onClick={() => { responderOpcion(t.id, true); avisarListo(t.solicitud ? `Aceptaste ${t.marca}: tu booker ya puede cotizarle al cliente` : `Confirmado: ${t.marca} ya está en tu agenda`); }}><Check size={15} /> Acepto</button>
                    <button type="button" className="mo-boton mo-boton-claro mo-boton-chico" onClick={() => setRechazo(t.id)}>No puedo</button>
                  </div>
                )}
              </article>
            );
          })}
          {convocatorias.map((ev) => (
            <article key={ev.id} className="mo-tarjeta mo-convoca">
              <Foto src={ev.foto} style={{ height: '100%', minHeight: 170 }} />
              <div style={{ padding: 18 }}>
                <Sello estado="pendiente" texto={`Convocatoria · ${ev.tipo}`} />
                <h3 className="mo-gigante" style={{ fontSize: '1.7rem', margin: '10px 0 4px' }}>{ev.titulo}</h3>
                <p className="mo-tenue" style={{ fontSize: '.86rem' }}>{fechaCorta(ev.fecha)} · {hora(ev.fecha)} · {ev.lugar}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button type="button" className="mo-boton mo-boton-chico" onClick={() => { responderConvocatoria(ev.id, YO_MODELO, true); avisarListo(`Listo: te esperan en ${ev.titulo}`); }}><Check size={15} /> Ahí estaré</button>
                  <button type="button" className="mo-boton mo-boton-claro mo-boton-chico" onClick={() => { responderConvocatoria(ev.id, YO_MODELO, false); avisarListo('Listo: tu booker ya sabe que no vas'); }}>No puedo</button>
                </div>
              </div>
            </article>
          ))}
          {!opciones.length && !convocatorias.length && (
            <div className="mo-tarjeta" style={{ padding: 22 }}><p className="mo-tenue">Nada pendiente. <span className="mo-lapiz">todo al día</span></p></div>
          )}
        </div>
        <section className="mo-tarjeta" style={{ padding: '18px 20px' }}>
          <p className="mo-eti">Tus castings · lo que dijo el cliente</p>
          {castings.map((t) => {
            const [txt, est] = RESULTADO[t.resultado] || ['Sin respuesta', 'pendiente'];
            return (
              <div key={t.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--mo-linea)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <b style={{ fontSize: '.92rem' }}>{t.marca}</b><Sello estado={est} texto={txt} />
                </div>
                <p className="mo-tenue" style={{ fontSize: '.76rem', marginTop: 2 }}>{t.proyecto} · {fechaCorta(t.fecha)}</p>
                <p className="mo-lapiz" style={{ fontSize: '1.2rem', marginTop: 8, lineHeight: 1.1 }}>“{t.feedback}”</p>
              </div>
            );
          })}
          <p className="mo-tenue" style={{ fontSize: '.74rem', marginTop: 12, lineHeight: 1.5 }}>Tu booker anota lo que comentan después de cada casting, para que sepas qué funciona.</p>
        </section>
      </div>
    </>
  );
}

// ── pagos ───────────────────────────────────────────────────────────────────
function Pagos({ mios }) {
  const [recibo, setRecibo] = useState(null);
  const hechos = mios.filter((t) => realizado(t) && t.tarifa > 0).sort((a, b) => b.fecha - a.fecha);
  const porCobrar = hechos.filter((t) => !t.cobrado);
  const porDepositar = hechos.filter((t) => t.cobrado && !t.liquidado);
  const suma = (l) => l.reduce((a, t) => a + neto(t.tarifa), 0);
  const meses = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - (5 - k));
    const fin = new Date(d); fin.setMonth(fin.getMonth() + 1);
    const total = hechos.filter((t) => t.fecha >= d.getTime() && t.fecha < fin.getTime()).reduce((a, t) => a + neto(t.tarifa), 0);
    return { etiqueta: d.toLocaleDateString('es-MX', { month: 'short' }), total, actual: k === 5 };
  });
  const max = Math.max(...meses.map((x) => x.total), 1);
  const anio = meses.reduce((a, x) => a + x.total, 0);
  return (
    <>
      <h1><em>Pagos</em></h1>
      <div className="mo-kpis">
        <div className="mo-kpi"><span className="mo-eti">Viene en camino</span><b>{dinero(suma(porCobrar) + suma(porDepositar))}</b></div>
        <div className="mo-kpi"><span className="mo-eti">El cliente debe</span><b>{dinero(suma(porCobrar))}</b></div>
        <div className="mo-kpi"><span className="mo-eti">Por depositarte</span><b>{dinero(suma(porDepositar))}</b></div>
        <div className="mo-kpi"><span className="mo-eti">Seis meses</span><b>{dinero(anio)}</b></div>
      </div>
      <div className="mo-portal-grid">
        <section className="mo-tarjeta" style={{ padding: '6px 20px 10px' }}>
          <div className="mo-tabla-envuelta">
            <table className="mo-tabla">
              <thead><tr><th>Trabajo</th><th className="mo-num">Cobra la agencia</th><th className="mo-num">Para ti</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {hechos.map((t) => (
                  <tr key={t.id}>
                    <td><b>{t.marca}</b><br /><span className="mo-tenue" style={{ fontSize: '.74rem' }}>{t.tipo} · {fechaCorta(t.fecha)}</span></td>
                    <td className="mo-num">{dinero(t.tarifa)}</td>
                    <td className="mo-num"><b>{dinero(neto(t.tarifa))}</b></td>
                    <td><Sello estado={t.liquidado ? 'confirmada' : t.cobrado ? 'cotizada' : 'pendiente'} texto={t.liquidado ? 'Depositado' : t.cobrado ? 'Por depositar' : 'Cobrando'} /></td>
                    <td>{t.liquidado && <button type="button" className="mo-chip" style={{ padding: '4px 10px', fontSize: '.72rem' }} onClick={() => setRecibo(t)}>Recibo</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="mo-tarjeta" style={{ padding: 20 }}>
          <p className="mo-eti">Lo que ganaste · por mes</p>
          <div className="mo-barras" role="img" aria-label="Ganancias de los últimos seis meses">
            {meses.map((x, k) => (
              <div key={x.etiqueta}>
                <b>{x.total ? `${Math.round(x.total / 1000)}k` : ''}</b>
                <i className={x.actual ? 'actual' : ''} style={{ height: `${Math.max(2, (x.total / max) * 100)}%`, animationDelay: `${k * 70}ms` }} />
                <span>{x.etiqueta}</span>
              </div>
            ))}
          </div>
          <p className="mo-tenue" style={{ fontSize: '.78rem', marginTop: 16, lineHeight: 1.5 }}>
            La agencia cobra al cliente, se queda el {AGENCIA.comision * 100}% y te deposita el resto a tu cuenta BBVA ••4821 cuando el cliente paga. Cada depósito trae su recibo.
          </p>
        </section>
      </div>
      {recibo && (
        <Modal alCerrar={() => setRecibo(null)} etiqueta="Recibo">
          <div className="mo-imprimible" style={{ borderRadius: 14, margin: '10px 0 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
              <div className="mo-logo" style={{ fontSize: '1.2rem' }}>{AGENCIA.nombre}<small>MODEL MANAGEMENT</small></div>
              <span className="mo-mono" style={{ fontSize: '.74rem' }}>REC-{recibo.id.slice(0, 5).toUpperCase()}</span>
            </div>
            <p className="mo-gigante" style={{ fontSize: '2rem', margin: '24px 0 4px' }}>Recibo de <em>pago</em></p>
            <p style={{ fontSize: '.84rem', color: '#666' }}>Valeria Ruiz · Nº 014 · depositado a BBVA ••4821</p>
            <table className="mo-cot" style={{ marginTop: 18 }}><tbody>
              <tr><td>{recibo.marca} · {recibo.tipo} · {fechaLarga(recibo.fecha)}</td><td>{dinero(recibo.tarifa)}</td></tr>
              <tr><td>Comisión de agencia {AGENCIA.comision * 100}%</td><td>−{dinero(recibo.tarifa - neto(recibo.tarifa))}</td></tr>
              <tr className="total"><td>Depositado</td><td>{dinero(neto(recibo.tarifa))}</td></tr>
            </tbody></table>
          </div>
          <button type="button" className="mo-boton" onClick={() => window.print()}><Printer size={16} /> Imprimir o guardar PDF</button>
        </Modal>
      )}
    </>
  );
}

// ── mi book ─────────────────────────────────────────────────────────────────
function MiBook({ e, m, verPortada }) {
  const input = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [medidas, setMedidas] = useState(false);
  const mias = e.polaroids[m.id] || [];
  const alElegir = async (ev) => {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (!f) return;
    setSubiendo(true);
    try { subirPolaroid(m.id, await miniatura(f, 420)); } finally { setSubiendo(false); }
  };
  const NOMBRES = { book: 'Book', pose: 'Pose', bn: 'Blanco y negro', cerca: 'Acercamiento', polaroid: 'Polaroid' };
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1>Mi <em>book</em></h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button type="button" className="mo-boton mo-boton-claro mo-boton-chico" onClick={verPortada}><Eye size={15} /> Ver mi portada</button>
          <button type="button" className="mo-boton mo-boton-claro mo-boton-chico" onClick={() => setMedidas(true)}><Ruler size={15} /> Actualizar medidas</button>
          <input ref={input} type="file" accept="image/*" hidden onChange={alElegir} />
          <button type="button" className="mo-boton mo-boton-chico" onClick={() => input.current?.click()} disabled={subiendo}><Camera size={15} /> {subiendo ? 'Subiendo…' : 'Subir polaroid'}</button>
        </div>
      </div>
      <p className="mo-tenue" style={{ fontSize: '.88rem', margin: '-8px 0 18px' }}>Elige la foto principal: es la que sale en el board y en las tiras del sitio.</p>
      <div className="mo-galeria">
        {['book', 'pose', 'bn', 'cerca', 'polaroid'].map((t) => (
          <div key={t} className={`mo-galeria-item ${m.principal === t ? 'principal' : ''}`}>
            <Foto src={fotoDe(m, t)} alt={NOMBRES[t]} />
            <div style={{ display: 'grid', justifyItems: 'start', gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: '.8rem' }}>{NOMBRES[t]}</span>
              {m.principal === t ? <Sello estado="confirmada" texto="Principal" />
                : <button type="button" className="mo-chip" style={{ padding: '4px 10px', fontSize: '.72rem' }} onClick={() => elegirPrincipal(m.id, t)}>Principal</button>}
            </div>
          </div>
        ))}
      </div>
      <section className="mo-tarjeta" style={{ padding: 20, marginTop: 24 }}>
        <p className="mo-eti">Polaroids nuevas</p>
        <p className="mo-tenue" style={{ fontSize: '.86rem', margin: '6px 0 14px', lineHeight: 1.5 }}>¿Te cortaste el cabello o cambiaste de look? Sube una con luz de día, sin maquillaje. Tu booker la aprueba y entra a tu book.</p>
        {mias.length ? (
          <div className="mo-mesa">{mias.map((p) => <Polaroid key={p.id} src={p.src} pie={p.aprobada ? 'en tu book' : 'revisando…'} />)}</div>
        ) : <p className="mo-tenue" style={{ fontSize: '.84rem' }}>Todavía no subes ninguna.</p>}
      </section>
      <section className="mo-tarjeta" style={{ padding: 20, marginTop: 14 }}>
        <p className="mo-eti" style={{ marginBottom: 10 }}>Mis medidas en el sitio</p>
        <div className="mo-cifras-grandes" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div><span className="mo-eti">Estatura</span><b>{estaturaTxt(m.estatura)}</b></div>
          <div><span className="mo-eti">Busto</span><b>{m.medidas[0]}</b></div>
          <div><span className="mo-eti">Cintura</span><b>{m.medidas[1]}</b></div>
          <div><span className="mo-eti">Cadera</span><b>{m.medidas[2]}</b></div>
          <div><span className="mo-eti">Cabello</span><b style={{ fontSize: '1.3rem' }}>{m.cabello}</b></div>
        </div>
      </section>
      {medidas && <Medidas m={m} alCerrar={() => setMedidas(false)} />}
    </>
  );
}

function Medidas({ m, alCerrar }) {
  const [f, setF] = useState({ estatura: m.estatura, b: m.medidas[0], c: m.medidas[1], h: m.medidas[2], cabello: m.cabello });
  const pon = (k) => (ev) => setF({ ...f, [k]: ev.target.value });
  return (
    <Modal alCerrar={alCerrar} etiqueta="Actualizar medidas">
      <h2 className="mo-gigante" style={{ fontSize: '2.2rem', marginBottom: 18 }}>Mis <em>medidas</em></h2>
      <form style={{ display: 'grid', gap: 16 }} onSubmit={(ev) => {
        ev.preventDefault();
        actualizarPerfil(m.id, { estatura: Number(f.estatura), medidas: [Number(f.b), Number(f.c), Number(f.h)], cabello: f.cabello });
        alCerrar();
      }}>
        <div className="mo-dos">
          <Campo etiqueta="Estatura (cm)"><input type="number" value={f.estatura} onChange={pon('estatura')} /></Campo>
          <Campo etiqueta="Cabello"><input value={f.cabello} onChange={pon('cabello')} /></Campo>
          <Campo etiqueta="Busto"><input type="number" value={f.b} onChange={pon('b')} /></Campo>
          <Campo etiqueta="Cintura"><input type="number" value={f.c} onChange={pon('c')} /></Campo>
          <Campo etiqueta="Cadera"><input type="number" value={f.h} onChange={pon('h')} /></Campo>
        </div>
        <p className="mo-tenue" style={{ fontSize: '.8rem' }}>Se actualizan al instante en tu ficha, tu composite y tu portada; a tu booker le llega el aviso.</p>
        <button type="submit" className="mo-boton">Guardar</button>
      </form>
    </Modal>
  );
}

// ── documentos ──────────────────────────────────────────────────────────────
const DOCS = [
  { nombre: 'Contrato de representación', detalle: 'Firmado el 12 de marzo de 2025 · vence el 12 de marzo de 2027', estado: ['confirmada', 'Vigente'] },
  { nombre: 'Identificación oficial (INE)', detalle: 'Vence en 2031', estado: ['confirmada', 'Vigente'] },
  { nombre: 'Pasaporte', detalle: 'Vence en agosto de 2029 · listo para viajes', estado: ['confirmada', 'Vigente'] },
  { nombre: 'Constancia de situación fiscal', detalle: 'La agencia la necesita para timbrar tus recibos', estado: ['nueva', 'Vence en 12 días'], accion: ['Subir la nueva', ['cotizada', 'En revisión'], 'Constancia recibida: tu booker la revisa hoy'] },
  { nombre: 'Datos bancarios', detalle: 'BBVA · CLABE ••• ••• ••4821', estado: ['confirmada', 'Verificada'] },
  { nombre: 'Uso de imagen · Norte Denim', detalle: 'Campaña primavera · redes + web 1 año', estado: ['pendiente', 'Por firmar'], accion: ['Firmar', ['confirmada', 'Firmado'], 'Firmado: la agencia ya tiene tu permiso de uso de imagen'] },
];
function Documentos() {
  // en la demo, lo que la modelo resuelve aquí (subir o firmar) se queda en la pantalla
  const [hechos, setHechos] = useState({});
  return (
    <>
      <h1><em>Documentos</em></h1>
      <div className="mo-portal-grid">
        <section className="mo-tarjeta" style={{ padding: '6px 20px' }}>
          {DOCS.map((d) => (
            <div key={d.nombre} className="mo-doc">
              <div className="mo-doc-icono"><FileText size={18} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: '.92rem' }}>{d.nombre}</b>
                <p className="mo-tenue" style={{ fontSize: '.78rem', marginTop: 2 }}>{d.detalle}</p>
              </div>
              {d.accion && !hechos[d.nombre]
                ? <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
                    <Sello estado={d.estado[0]} texto={d.estado[1]} />
                    <button type="button" className="mo-chip" style={{ padding: '4px 10px', fontSize: '.72rem' }} onClick={() => { setHechos({ ...hechos, [d.nombre]: true }); avisarListo(d.accion[2]); }}>{d.accion[0]}</button>
                  </div>
                : <Sello estado={(hechos[d.nombre] ? d.accion[1] : d.estado)[0]} texto={(hechos[d.nombre] ? d.accion[1] : d.estado)[1]} />}
            </div>
          ))}
        </section>
        <section className="mo-tarjeta-negra">
          <p className="mo-eti" style={{ color: 'rgba(242,238,231,.55)' }}>Todo en un lugar</p>
          <p className="mo-gigante" style={{ fontSize: '2.4rem', margin: '12px 0' }}>Tu carrera,<br /><em>en orden.</em></p>
          <p style={{ opacity: .75, fontSize: '.9rem', lineHeight: 1.6 }}>Contrato, identificaciones, datos fiscales y permisos de uso de imagen de cada campaña. La app te avisa antes de que algo venza para que nunca se detenga un pago.</p>
        </section>
      </div>
    </>
  );
}
