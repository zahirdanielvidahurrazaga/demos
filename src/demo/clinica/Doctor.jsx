import { useState } from 'react';
import { ChevronRight, Radar, Search, Stethoscope, Users, Video } from 'lucide-react';
import {
  DOCTORES, SOFIA, cuandoTexto, delDia, doctor, especialidad, fechaLarga, horaDe, paciente, pasarAConsulta, radar,
  servicio, terminarConsulta, useClinica, citasDe, fechaCorta,
} from './datos';
import { Avatar, BotonPantalla, ChipEstado, Logo, Pestanas, avisarListo, useAhora } from './comun';
import { ExpedienteNutri } from './Nutri';
import { ExpedienteMedico, ExpedienteDental } from './Especialidades';

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR — un panel para los tres (se elige arriba). Mi día con la agenda y
// "pasar a consulta", Pacientes y el expediente de cada especialidad.
// La nutrióloga además tiene el Radar: a quién darle seguimiento primero.
// ─────────────────────────────────────────────────────────────────────────────

export default function Doctor() {
  const e = useClinica();
  const [docId, setDocId] = useState('andrea');
  const doc = doctor(docId);
  const esp = especialidad(doc.esp);
  const [vista, setVista] = useState(docId === 'andrea' ? 'radar' : 'dia');
  const [abierto, setAbierto] = useState(null);   // { pac, cita }
  const r = radar(e);
  const cambiarDoc = (id) => { setDocId(id); setVista(id === 'andrea' ? 'radar' : 'dia'); setAbierto(null); };
  return (
    <div className="cl-panel" style={{ '--cl-acento': esp.color, '--cl-acento-suave': esp.suave }}>
      <header className="cl-panel-cab">
        <Logo />
        <div className="cl-quien">
          {DOCTORES.map((d) => (
            <button key={d.id} type="button" className={docId === d.id ? 'activa' : ''} onClick={() => cambiarDoc(d.id)} style={{ '--c': especialidad(d.esp).color }}>
              <Avatar nombre={d.nombre} size={26} color={especialidad(d.esp).color} /><span>{d.corto}</span>
            </button>
          ))}
        </div>
        <BotonPantalla />
      </header>
      {!abierto && (
        <div className="cl-panel-sub">
          <div>
            <p className="cl-cejilla">{doc.titulo} · {doc.consultorio}</p>
            <h2>{doc.nombre}</h2>
          </div>
          <Pestanas valor={vista} alCambiar={setVista} opciones={[
            ...(docId === 'andrea' ? [{ id: 'radar', etiqueta: 'Radar', Icon: Radar, n: r.length }] : []),
            { id: 'dia', etiqueta: 'Mi día', Icon: Stethoscope },
            { id: 'pacientes', etiqueta: 'Pacientes', Icon: Users },
          ]} />
        </div>
      )}
      <div className="cl-panel-cuerpo">
        {abierto ? (
          <Expediente docId={docId} pac={abierto.pac} cita={abierto.cita} alCerrar={() => setAbierto(null)} />
        ) : (
          <>
            {vista === 'radar' && <RadarVista filas={r} alAbrir={(pac) => setAbierto({ pac })} />}
            {vista === 'dia' && <MiDia docId={docId} alAbrir={setAbierto} />}
            {vista === 'pacientes' && <Pacientes docId={docId} alAbrir={(pac) => setAbierto({ pac })} />}
          </>
        )}
      </div>
    </div>
  );
}

function Expediente({ docId, pac, cita, alCerrar }) {
  const esp = doctor(docId).esp;
  if (esp === 'nut') return <ExpedienteNutri pid={pac} cita={cita} alCerrar={alCerrar} />;
  if (esp === 'med') return <ExpedienteMedico pid={pac} cita={cita} alCerrar={alCerrar} />;
  return <ExpedienteDental pid={pac} cita={cita} alCerrar={alCerrar} />;
}

function RadarVista({ filas, alAbrir }) {
  const ICONO = { ajuste: 'Pidió ajuste', checkin: 'Check-in', cita: 'Cita', silencio: 'Sin registros', adherencia: 'Adherencia', animo: 'Ánimo', peso: 'Peso' };
  return (
    <div className="cl-radar">
      <p className="cl-suave">Quién necesita atención primero, con lo que cada paciente registra en su app. Sin calificar a nadie de "bueno" o "malo": solo dónde ayudar.</p>
      {filas.map(({ p, motivos, adherencia: adh, demo }) => (
        <button key={p.id} type="button" className={`cl-radar-fila ${demo ? 'demo' : ''}`} onClick={() => alAbrir(p.id)}>
          <Avatar nombre={p.nombre} size={40} />
          <span className="cl-radar-texto">
            <b>{p.nombre}{demo && <span className="cl-mini verde">paciente de la demo</span>}</b>
            {motivos.map((m) => <small key={m.k}><i className={`cl-motivo ${m.k}`}>{ICONO[m.k]}</i>{m.texto}</small>)}
          </span>
          <span className="cl-radar-adh"><b>{adh}%</b><small>plan</small></span>
          <ChevronRight size={18} />
        </button>
      ))}
      {!filas.length && <p className="cl-vacio">Todo en orden. Nadie necesita seguimiento urgente.</p>}
      <p className="cl-nota">Prueba: como Paciente manda un check-in difícil o pide un ajuste en "¿Qué pasó?" y mira cómo Sofía sube aquí.</p>
    </div>
  );
}

function MiDia({ docId, alAbrir }) {
  const e = useClinica();
  useAhora(15000);
  const citas = delDia(e, 0, docId).filter((c) => c.estado !== 'cancelada');
  const manana = delDia(e, 1, docId).filter((c) => c.estado !== 'cancelada');
  const sofia = citasDe(e, SOFIA).find((c) => c.doc === docId && c.inicio > Date.now() && c.estado !== 'cancelada');
  const lista = citas.length ? citas : manana;
  return (
    <div className="cl-midia">
      <p className="cl-suave">{citas.length ? `${fechaLarga()} · ${citas.length} citas` : `Hoy ya no hay consultas. Mañana: ${manana.length} citas.`}</p>
      {sofia && (
        <button type="button" className="cl-radar-fila demo" onClick={() => alAbrir({ pac: SOFIA, cita: sofia.id })}>
          <Avatar nombre="Sofía Martínez" size={40} />
          <span className="cl-radar-texto"><b>Sofía Martínez <span className="cl-mini verde">paciente de la demo</span></b><small>{servicio(sofia.serv).nombre} · {cuandoTexto(sofia.inicio)}</small></span>
          <span className="cl-link">Abrir expediente</span>
        </button>
      )}
      <div className="cl-agenda-lista">
        {lista.map((c) => {
          const p = paciente(e, c.pac);
          return (
            <div key={c.id} className={`cl-agenda-fila ${c.estado}`}>
              <span className="cl-agenda-hora"><b>{horaDe(c.inicio)}</b><small>{c.min} min</small></span>
              <span className="cl-agenda-pac">
                <b>{p?.nombre}{p?.nuevo && <span className="cl-mini">1ª vez</span>}</b>
                <small>{servicio(c.serv).nombre}{servicio(c.serv).virtual && <> · <Video size={12} /> en línea</>}{c.llego && c.estado === 'llego' ? ` · en sala desde ${horaDe(c.llego)}` : ''}</small>
              </span>
              <ChipEstado estado={c.estado} />
              <span className="cl-agenda-acc">
                {['llego', 'confirmada', 'agendada'].includes(c.estado) && citas.length > 0 && <button type="button" className="cl-boton chico" onClick={() => { pasarAConsulta(c.id); alAbrir({ pac: c.pac, cita: c.id }); }}>Pasar a consulta</button>}
                {c.estado === 'en-consulta' && <><button type="button" className="cl-boton chico linea" onClick={() => alAbrir({ pac: c.pac, cita: c.id })}>Expediente</button><button type="button" className="cl-boton chico" onClick={() => { terminarConsulta(c.id); avisarListo('Consulta terminada'); }}>Terminar</button></>}
                {['atendida', 'no-asistio'].includes(c.estado) && <button type="button" className="cl-link chico" onClick={() => alAbrir({ pac: c.pac })}>Ver</button>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Pacientes({ docId, alAbrir }) {
  const e = useClinica();
  const [q, setQ] = useState('');
  const esp = doctor(docId).esp;
  const lista = e.pacientes.filter((p) => p.esp.includes(esp) && p.nombre.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.id === SOFIA ? -1 : b.id === SOFIA ? 1 : a.nombre.localeCompare(b.nombre)));
  return (
    <div className="cl-pacientes">
      <label className="cl-buscar"><Search size={16} /><input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Buscar paciente" aria-label="Buscar paciente" /></label>
      <div className="cl-pacientes-grid">
        {lista.map((p) => {
          const ult = citasDe(e, p.id).filter((c) => c.doc === docId && c.estado === 'atendida').slice(-1)[0];
          return (
            <button key={p.id} type="button" className={`cl-pac ${p.id === SOFIA ? 'demo' : ''}`} onClick={() => alAbrir(p.id)}>
              <Avatar nombre={p.nombre} size={38} />
              <span><b>{p.nombre}</b><small>{ult ? `Última consulta ${fechaCorta(ult.inicio)}` : 'Sin consultas aún'}</small></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
