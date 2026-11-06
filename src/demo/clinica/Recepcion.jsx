import { useState } from 'react';
import {
  BellRing, CalendarPlus, ChevronLeft, ChevronRight, Clock, CreditCard, Hourglass, LogIn, MessageCircle, Package, RefreshCw, Search,
  UserPlus, Users, X,
} from 'lucide-react';
import {
  DOCTORES, NEGOCIO, PAQUETES, SERVICIOS, ACTIVAS, agendar, cancelarCita, cobrarCita, confirmar, cuandoTexto, delDia, doctor, espacios,
  especialidad, fechaLarga, horaDe, inicioDia, llego, noAsistio, paciente, pasarAConsulta, peso, recordatoriosManana, reprogramar,
  servicio, useClinica, venderPaquete, cubrirConPaquete,
} from './datos';
import { Avatar, BotonPantalla, ChipEstado, Logo, Pestanas, Ventana, avisarListo, colorDoc, useAhora } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// RECEPCIÓN — la agenda de los tres doctores en columnas, llegadas a sala,
// cobros (consulta, paquete), recordatorios por WhatsApp, reprogramar y
// cancelar (el espacio se le ofrece solo a la lista de espera).
// ─────────────────────────────────────────────────────────────────────────────

export default function Recepcion() {
  const e = useClinica();
  useAhora(15000);
  const [vista, setVista] = useState('agenda');
  const [d, setD] = useState(0);
  const [ver, setVer] = useState(null);
  const [nueva, setNueva] = useState(false);
  const enSala = delDia(e, 0).filter((c) => c.estado === 'llego');
  const espera = e.espera.length;
  return (
    <div className="cl-panel">
      <header className="cl-panel-cab">
        <Logo />
        <span className="cl-panel-rol">Recepción</span>
        <BotonPantalla />
      </header>
      <div className="cl-panel-sub">
        <div><p className="cl-cejilla">{fechaLarga(inicioDia(d))}</p><h2>Recepción</h2></div>
        <Pestanas valor={vista} alCambiar={setVista} opciones={[
          { id: 'agenda', etiqueta: 'Agenda', Icon: CalendarPlus },
          { id: 'sala', etiqueta: 'Sala de espera', Icon: Users, n: enSala.length },
          { id: 'espera', etiqueta: 'Lista de espera', Icon: Hourglass, n: espera },
        ]} />
      </div>
      <div className="cl-panel-cuerpo">
        {vista === 'agenda' && <Agenda d={d} setD={setD} alVer={setVer} alNueva={() => setNueva(true)} />}
        {vista === 'sala' && <Sala alVer={setVer} />}
        {vista === 'espera' && <ListaEspera />}
      </div>
      {ver && <CitaRecep cid={ver} alCerrar={() => setVer(null)} />}
      {nueva && <NuevaCita alCerrar={() => setNueva(false)} />}
    </div>
  );
}

function Agenda({ d, setD, alVer, alNueva }) {
  const e = useClinica();
  const citas = delDia(e, d);
  const activas = citas.filter((c) => c.estado !== 'cancelada');
  const porConfirmar = delDia(e, 1).filter((c) => c.estado === 'agendada');
  const sinAviso = porConfirmar.filter((c) => !c.recordatorio).length;
  const ingreso = citas.reduce((n, c) => n + (c.pagado || 0), 0);
  return (
    <div className="cl-agenda">
      <div className="cl-agenda-barra">
        <div className="cl-fila">
          <button type="button" className="cl-icono" onClick={() => setD(d - 1)} aria-label="Día anterior"><ChevronLeft size={18} /></button>
          <button type="button" className={`cl-boton chico ${d === 0 ? '' : 'linea'}`} onClick={() => setD(0)}>Hoy</button>
          <button type="button" className="cl-icono" onClick={() => setD(d + 1)} aria-label="Día siguiente"><ChevronRight size={18} /></button>
          <span className="cl-suave chico">{activas.length} citas · {peso(ingreso)} cobrado</span>
        </div>
        <div className="cl-fila">
          {d >= 0 && porConfirmar.length > 0 && (
            <button type="button" className="cl-boton chico linea" disabled={!sinAviso} onClick={() => { const n = recordatoriosManana(); avisarListo(`${n} recordatorios enviados por WhatsApp`); }}>
              <BellRing size={14} /> {sinAviso ? `Recordar a ${sinAviso} de mañana` : 'Recordatorios enviados'}
            </button>
          )}
          <button type="button" className="cl-boton chico" onClick={alNueva}><CalendarPlus size={14} /> Nueva cita</button>
        </div>
      </div>
      <div className="cl-columnas">
        {DOCTORES.map((doc) => {
          const suyas = citas.filter((c) => c.doc === doc.id && c.estado !== 'cancelada');
          return (
            <section key={doc.id} className="cl-columna" style={{ '--c': especialidad(doc.esp).color }}>
              <header><Avatar nombre={doc.nombre} size={30} color={especialidad(doc.esp).color} /><span><b>{doc.nombre}</b><small>{especialidad(doc.esp).nombre} · {suyas.length} citas</small></span></header>
              {!suyas.length && <p className="cl-suave chico">Sin citas.</p>}
              {suyas.map((c) => {
                const p = paciente(e, c.pac);
                return (
                  <button key={c.id} type="button" className={`cl-cita-card ${c.estado} ${c.pac === 'sofia' ? 'demo' : ''}`} onClick={() => alVer(c.id)}>
                    <span className="cl-cita-card-hora">{horaDe(c.inicio)}</span>
                    <span className="cl-cita-card-txt"><b>{p?.nombre}</b><small>{servicio(c.serv).nombre}</small></span>
                    <ChipEstado estado={c.estado} />
                    <span className="cl-cita-card-tags">
                      {c.origen === 'web' && <i>en línea</i>}{c.origen === 'espera' && <i className="verde">recuperada</i>}{c.recordatorio && c.estado === 'agendada' && <i>avisada</i>}{c.porWhats && <i className="verde">confirmó por WhatsApp</i>}{c.pagado > 0 && c.pagado < c.precio && <i>anticipo {peso(c.pagado)}</i>}
                    </span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Sala({ alVer }) {
  const e = useClinica();
  const ahora = useAhora(10000);
  const hoy = delDia(e, 0);
  const sala = hoy.filter((c) => c.estado === 'llego');
  const consulta = hoy.filter((c) => c.estado === 'en-consulta');
  const vienen = hoy.filter((c) => ['agendada', 'confirmada'].includes(c.estado) && c.inicio - ahora < 90 * 60000);
  const Fila = ({ c, extra }) => {
    const p = paciente(e, c.pac);
    return (
      <button type="button" className="cl-sala-fila" onClick={() => alVer(c.id)} style={{ '--c': colorDoc(c.doc) }}>
        <Avatar nombre={p.nombre} size={36} />
        <span><b>{p.nombre}</b><small>{horaDe(c.inicio)} · {doctor(c.doc).corto} · {servicio(c.serv).nombre}</small></span>
        <span className="cl-sala-extra">{extra}</span>
      </button>
    );
  };
  return (
    <div className="cl-sala">
      <section><h4>En sala ({sala.length})</h4>{sala.map((c) => <Fila key={c.id} c={c} extra={<><Clock size={13} /> {Math.round((ahora - c.llego) / 60000)} min{c.pagado < c.precio ? <span className="cl-mini ambar">por cobrar</span> : null}</>} />)}{!sala.length && <p className="cl-suave chico">Nadie esperando.</p>}</section>
      <section><h4>En consulta ({consulta.length})</h4>{consulta.map((c) => <Fila key={c.id} c={c} extra={doctor(c.doc).consultorio} />)}</section>
      <section><h4>Llegan en la próxima hora y media</h4>{vienen.map((c) => <Fila key={c.id} c={c} extra={<ChipEstado estado={c.estado} />} />)}{!vienen.length && <p className="cl-suave chico">Nadie más por ahora.</p>}</section>
    </div>
  );
}

function ListaEspera() {
  const e = useClinica();
  const recuperadas = e.citas.filter((c) => c.recuperada);
  return (
    <div className="cl-lista">
      <p className="cl-suave">Cuando alguien cancela, el espacio se le ofrece solo al primero de la lista que pueda en ese horario. Si acepta, entra a la agenda sin que nadie haga nada.</p>
      {e.espera.map((w) => (
        <div key={w.id} className="cl-caja cl-espera-fila">
          <Avatar nombre={paciente(e, w.pac).nombre} size={36} />
          <span><b>{paciente(e, w.pac).nombre}</b><small>Quiere cita con {doctor(w.doc).nombre} · prefiere {w.pref === 'cualquier' ? 'cualquier horario' : w.pref}</small></span>
          {w.ofrecida ? <span className="cl-mini verde">Se le ofreció {cuandoTexto(w.ofrecida.inicio)} · esperando respuesta</span> : <span className="cl-mini">Esperando espacio</span>}
        </div>
      ))}
      {!e.espera.length && <p className="cl-vacio">La lista de espera está vacía.</p>}
      <div className="cl-caja">
        <h4><RefreshCw size={14} /> Citas recuperadas</h4>
        {recuperadas.length ? recuperadas.map((c) => <p key={c.id} className="cl-fila-precio"><span>{paciente(e, c.pac).nombre} · {cuandoTexto(c.inicio)}</span><b>{peso(c.precio)}</b></p>) : <p className="cl-suave chico">Prueba: cancela la cita de una persona con la Nut. Andrea por la mañana y mira cómo se llena sola en unos segundos.</p>}
      </div>
    </div>
  );
}

// detalle de una cita: todo lo que hace recepción
function CitaRecep({ cid, alCerrar }) {
  const e = useClinica();
  const c = e.citas.find((x) => x.id === cid);
  const [cobro, setCobro] = useState(false);
  const [mover, setMover] = useState(false);
  const [seguro, setSeguro] = useState(false);
  if (!c) return null;
  const p = paciente(e, c.pac);
  const doc = doctor(c.doc);
  const sv = servicio(c.serv);
  const falta = Math.max(0, c.precio - (c.pagado || 0));
  const whats = `Hola ${p.nombre.split(' ')[0]}, te escribimos de ${NEGOCIO.nombre}. Te recordamos tu cita de ${sv.nombre.toLowerCase()} con ${doc.nombre} ${cuandoTexto(c.inicio).toLowerCase()}. ¿Nos confirmas tu asistencia? Responde SÍ o NO.`;
  if (mover) return <Reprogramar c={c} alCerrar={alCerrar} />;
  return (
    <Ventana titulo={p.nombre} sub={`${sv.nombre} · ${doc.nombre}`} alCerrar={alCerrar} ancho={500}>
      <div className="cl-form">
        <p className="cl-cita-grande"><b>{cuandoTexto(c.inicio)}</b><ChipEstado estado={c.estado} /></p>
        <p className="cl-suave chico">{p.tel} · folio {c.folio} · {c.origen === 'web' ? 'agendó en línea' : c.origen === 'espera' ? 'recuperada de la lista de espera' : c.origen === 'whatsapp' ? 'agendó por WhatsApp' : 'agendada en recepción'}{c.paquete ? ' · usa paquete' : ''}</p>
        <div className="cl-saldo">
          <span><small>Precio</small><b>{c.paquete ? 'Paquete' : peso(c.precio)}</b></span>
          <span><small>Pagado</small><b>{peso(c.pagado)}</b></span>
          <span><small>Falta</small><b>{c.paquete ? '—' : peso(falta)}</b></span>
        </div>
        <div className="cl-acciones">
          {c.estado === 'agendada' && <a className="cl-boton linea" href={`https://wa.me/?text=${encodeURIComponent(whats)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Recordar por WhatsApp</a>}
          {c.estado === 'agendada' && <button type="button" className="cl-boton linea" onClick={() => { confirmar(c.id); avisarListo('Confirmada'); }}>Marcar confirmada</button>}
          {['agendada', 'confirmada'].includes(c.estado) && <button type="button" className="cl-boton" onClick={() => { llego(c.id); avisarListo(`${p.nombre.split(' ')[0]} está en sala`); }}><LogIn size={15} /> Llegó</button>}
          {c.estado === 'llego' && <button type="button" className="cl-boton" onClick={() => { pasarAConsulta(c.id); avisarListo(`Pasa con ${doc.corto}`); alCerrar(); }}>Pasar a consulta</button>}
          {!c.paquete && falta > 0 && c.estado !== 'cancelada' && <button type="button" className="cl-boton" onClick={() => setCobro(true)}><CreditCard size={15} /> Cobrar {peso(falta)}</button>}
          {ACTIVAS.slice(0, 2).includes(c.estado) && <button type="button" className="cl-boton linea" onClick={() => setMover(true)}>Reprogramar</button>}
          {['agendada', 'confirmada', 'llego'].includes(c.estado) && c.inicio < Date.now() && <button type="button" className="cl-boton linea rojo" onClick={() => { noAsistio(c.id); alCerrar(); }}>No asistió</button>}
        </div>
        {ACTIVAS.slice(0, 2).includes(c.estado) && (!seguro ? <button type="button" className="cl-link gris" onClick={() => setSeguro(true)}>Cancelar cita</button> : (
          <div className="cl-nota-ambar"><span>Se cancela y el espacio se ofrece a la lista de espera.
            <button type="button" className="cl-boton chico rojo" onClick={() => { const r = cancelarCita(c.id, 'recepcion'); avisarListo(r?.ofrecida ? `Cancelada · se le ofreció a ${r.ofrecida}` : 'Cita cancelada'); alCerrar(); }}>Sí, cancelar</button></span></div>
        ))}
      </div>
      {cobro && <Cobro c={c} monto={falta} alCerrar={() => setCobro(false)} />}
    </Ventana>
  );
}

function Cobro({ c, monto, alCerrar }) {
  const e = useClinica();
  const [metodo, setMetodo] = useState('tarjeta');
  const [paq, setPaq] = useState(null);
  const p = paciente(e, c.pac);
  const esNut = doctor(c.doc).esp === 'nut';
  const total = paq ? PAQUETES.find((x) => x.id === paq).precio : monto;
  return (
    <Ventana titulo={`Cobrar a ${p.nombre}`} alCerrar={alCerrar} ancho={440}>
      <div className="cl-form">
        <p className="cl-total-grande">{peso(total)}</p>
        <div className="cl-rapidas">{['efectivo', 'tarjeta', 'transferencia'].map((m) => <button key={m} type="button" className={metodo === m ? 'activa' : ''} onClick={() => setMetodo(m)}>{m}</button>)}</div>
        {esNut && !p.paquete && (
          <div className="cl-paquetes">
            <p className="cl-suave chico"><Package size={13} /> ¿Le ofreces un paquete? Esta consulta entra como la primera.</p>
            {PAQUETES.map((x) => <button key={x.id} type="button" className={paq === x.id ? 'activa' : ''} onClick={() => setPaq(paq === x.id ? null : x.id)}><b>{x.nombre}</b><small>{peso(x.precio)}{x.ahorro ? ` · ahorra ${peso(x.ahorro)}` : ''}{x.mensual ? ' al mes' : ''}</small></button>)}
          </div>
        )}
        <button type="button" className="cl-boton grande" onClick={() => {
          if (paq) { venderPaquete(c.pac, paq, metodo); cubrirConPaquete(c.id); }
          else cobrarCita(c.id, { monto, metodo });
          avisarListo(`Cobrado ${peso(total)} · recibo enviado por WhatsApp`); alCerrar();
        }}>Cobrar {peso(total)}</button>
        <p className="cl-nota">Con tarjeta se cobra en la terminal; también se puede mandar liga de pago por WhatsApp.</p>
      </div>
    </Ventana>
  );
}

function Reprogramar({ c, alCerrar }) {
  const e = useClinica();
  const [dia, setDia] = useState(null);
  const dias = Array.from({ length: 12 }, (_, i) => inicioDia(i)).filter((d) => espacios(e, c.doc, d, c.min).length);
  return (
    <Ventana titulo="Reprogramar" sub={`${paciente(e, c.pac).nombre} · ${doctor(c.doc).nombre}`} alCerrar={alCerrar} ancho={480}>
      <div className="cl-form">
        <div className="cl-dias">{dias.map((d) => <button key={d} type="button" className={dia === d ? 'activa' : ''} onClick={() => setDia(d)}><small>{d === inicioDia(0) ? 'Hoy' : new Date(d).toLocaleDateString('es-MX', { weekday: 'short' })}</small><b>{new Date(d).getDate()}</b></button>)}</div>
        {dia && <div className="cl-horas">{espacios(e, c.doc, dia, c.min, 30).map((t) => <button key={t} type="button" onClick={() => { reprogramar(c.id, t); avisarListo(`Movida a ${cuandoTexto(t)} · se le avisa por WhatsApp`); alCerrar(); }}>{horaDe(t)}</button>)}</div>}
      </div>
    </Ventana>
  );
}

function NuevaCita({ alCerrar }) {
  const e = useClinica();
  const [q, setQ] = useState('');
  const [pac, setPac] = useState(null);
  const [nuevo, setNuevo] = useState(null);
  const [doc, setDoc] = useState('andrea');
  const [serv, setServ] = useState(null);
  const [dia, setDia] = useState(null);
  const encontrados = q.length > 1 ? e.pacientes.filter((p) => p.nombre.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];
  const sv = serv && servicio(serv);
  const dias = Array.from({ length: 12 }, (_, i) => inicioDia(i)).filter((d) => espacios(e, doc, d, sv?.min || 30).length);
  const listo = (pac || nuevo?.nombre) && serv;
  return (
    <Ventana titulo="Nueva cita" alCerrar={alCerrar} ancho={540}>
      <div className="cl-form">
        {!pac && !nuevo && (
          <>
            <label className="cl-buscar"><Search size={16} /><input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Buscar paciente por nombre" autoFocus aria-label="Buscar paciente" /></label>
            {encontrados.map((p) => <button key={p.id} type="button" className="cl-opcion" onClick={() => setPac(p.id)}>{p.nombre} <small>{p.tel}</small></button>)}
            <button type="button" className="cl-link" onClick={() => setNuevo({ nombre: q, tel: '' })}><UserPlus size={14} /> Paciente nuevo{q ? `: "${q}"` : ''}</button>
          </>
        )}
        {pac && <p className="cl-elegido"><b>{paciente(e, pac).nombre}</b><button type="button" className="cl-icono" onClick={() => setPac(null)} aria-label="Cambiar paciente"><X size={15} /></button></p>}
        {nuevo && (
          <div className="cl-dos">
            <label className="cl-campo"><span>Nombre</span><input value={nuevo.nombre} onChange={(ev) => setNuevo({ ...nuevo, nombre: ev.target.value })} /></label>
            <label className="cl-campo"><span>WhatsApp</span><input value={nuevo.tel} onChange={(ev) => setNuevo({ ...nuevo, tel: ev.target.value })} inputMode="tel" /></label>
          </div>
        )}
        <div className="cl-rapidas">{DOCTORES.map((d) => <button key={d.id} type="button" className={doc === d.id ? 'activa' : ''} onClick={() => { setDoc(d.id); setServ(null); setDia(null); }}>{d.nombre}</button>)}</div>
        <div className="cl-rapidas">{SERVICIOS.filter((s) => s.esp === doctor(doc).esp).map((s) => <button key={s.id} type="button" className={serv === s.id ? 'activa' : ''} onClick={() => { setServ(s.id); setDia(null); }}>{s.nombre}{s.precio ? ` · ${peso(s.precio)}` : ''}</button>)}</div>
        {serv && <div className="cl-dias">{dias.map((d) => <button key={d} type="button" className={dia === d ? 'activa' : ''} onClick={() => setDia(d)}><small>{d === inicioDia(0) ? 'Hoy' : new Date(d).toLocaleDateString('es-MX', { weekday: 'short' })}</small><b>{new Date(d).getDate()}</b></button>)}</div>}
        {dia && listo && (
          <div className="cl-horas">
            {espacios(e, doc, dia, sv.min, 30).map((t) => (
              <button key={t} type="button" onClick={() => {
                const r = agendar({ pac, doc, serv, inicio: t, origen: 'recepcion', nombreNuevo: nuevo?.nombre, telNuevo: nuevo?.tel });
                if (r?.error) { avisarListo('Ese horario se acaba de ocupar'); return; }
                avisarListo(`Agendada ${cuandoTexto(t)} · confirmación enviada por WhatsApp`); alCerrar();
              }}>{horaDe(t)}</button>
            ))}
          </div>
        )}
      </div>
    </Ventana>
  );
}
