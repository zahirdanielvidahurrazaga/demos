import { useState } from 'react';
import { ArrowLeft, Check, FileText, Plus, Send, Trash2, Wallet } from 'lucide-react';
import {
  DIAGNOSTICOS, ESTADOS_DIENTE, MEDICAMENTOS, NEGOCIO, PROCEDIMIENTOS, SOFIA, abonarDental, agregarAlPlan, doctor, estadoDiente,
  fechaCorta, guardarConsultaMedica, hacerProcedimiento, marcarDiente, paciente, peso, procedimiento, quitarDelPlan,
  saldoDental, terminarConsulta, useClinica,
} from './datos';
import { Avatar, Pestanas, Ventana, avisarListo } from './comun';
import { MiniOdontograma, RecetaMedica } from './PacienteMas';

// ─────────────────────────────────────────────────────────────────────────────
// EXPEDIENTES de medicina general (signos, nota, diagnóstico y receta con
// cédula, imprimible) y de odontología (odontograma que se toca diente por
// diente, plan de tratamiento con presupuesto y abonos).
// ─────────────────────────────────────────────────────────────────────────────

function Cabeza({ pid, cita, alCerrar }) {
  const e = useClinica();
  const p = paciente(e, pid);
  const enConsulta = cita && e.citas.find((c) => c.id === cita)?.estado === 'en-consulta';
  return (
    <div className="cl-exp-cab">
      <button type="button" className="cl-icono" onClick={alCerrar} aria-label="Regresar"><ArrowLeft size={18} /></button>
      <Avatar nombre={p.nombre} size={46} />
      <div>
        <h2>{p.nombre}</h2>
        <p className="cl-suave chico">{p.tel}{p.antecedentes ? ` · Alergias: ${p.antecedentes.alergias.join(', ')}` : ''}</p>
      </div>
      {enConsulta && <button type="button" className="cl-boton" onClick={() => { terminarConsulta(cita); avisarListo('Consulta terminada'); alCerrar(); }}>Terminar consulta</button>}
    </div>
  );
}

// ── medicina general ────────────────────────────────────────────────────────
export function ExpedienteMedico({ pid, cita, alCerrar }) {
  const e = useClinica();
  const [vista, setVista] = useState('consulta');
  const hist = (e.medico[pid] || []).slice().reverse();
  const [rx, setRx] = useState(null);
  return (
    <div className="cl-expediente">
      <Cabeza pid={pid} cita={cita} alCerrar={alCerrar} />
      <Pestanas valor={vista} alCambiar={setVista} opciones={[{ id: 'consulta', etiqueta: 'Consulta de hoy' }, { id: 'historial', etiqueta: 'Historial', n: hist.length }, ...(pid === SOFIA ? [{ id: 'estudios', etiqueta: 'Estudios' }] : [])]} />
      {vista === 'consulta' && <ConsultaMedica pid={pid} alGuardar={(r) => { setRx(r); setVista('historial'); }} />}
      {vista === 'historial' && (
        <div className="cl-lista">
          {!hist.length && <p className="cl-suave">Sin consultas médicas anteriores.</p>}
          {hist.map((h) => (
            <div key={h.t} className="cl-caja">
              <small>{fechaCorta(h.t)} · {doctor(h.doc).nombre}</small>
              <p><b>{h.motivo}</b></p>
              <p className="cl-suave chico">TA {h.signos.ta} · FC {h.signos.fc} · T {h.signos.temp} · SpO₂ {h.signos.spo2}% · {h.signos.peso} kg</p>
              <p className="cl-suave chico">Dx: {h.dx.map((k) => DIAGNOSTICOS.find((x) => x[0] === k)?.[1]).join(', ')}</p>
              {h.receta && <button type="button" className="cl-link" onClick={() => setRx(h)}>Ver receta {h.receta.folio}</button>}
            </div>
          ))}
        </div>
      )}
      {vista === 'estudios' && (
        <div className="cl-lista">
          {e.nutri.estudios.map((s) => (
            <div key={s.id} className="cl-caja cl-estudio-doc">
              <b><FileText size={14} /> {s.nombre}</b><small>{fechaCorta(s.t)} · lo subió la paciente · también lo ve su nutrióloga</small>
              <ul>{s.valores.map(([n, v, st]) => <li key={n} className={st}><span>{n}</span><b>{v}</b></li>)}</ul>
            </div>
          ))}
        </div>
      )}
      {rx && <RecetaMedica r={rx} pac={paciente(e, pid)} alCerrar={() => setRx(null)} />}
    </div>
  );
}

function ConsultaMedica({ pid, alGuardar }) {
  const [s, setS] = useState({ ta: '120/80', fc: '74', temp: '36.5', spo2: '98', peso: '' });
  const [motivo, setMotivo] = useState('');
  const [explo, setExplo] = useState('');
  const [dx, setDx] = useState([]);
  const [meds, setMeds] = useState([]);
  const [plan, setPlan] = useState('');
  const [nuevo, setNuevo] = useState({ m: MEDICAMENTOS[0], dosis: '1 tableta', frec: 'cada 8 h', dias: '5' });
  const ejemplo = () => {
    setMotivo('Dolor de garganta y fiebre de 2 días.'); setExplo('Faringe hiperémica, sin exudado. Ganglios cervicales no palpables.');
    setDx(['J02.9']); setMeds([{ m: 'Paracetamol 500 mg tabletas', dosis: '1 tableta', frec: 'cada 8 h si hay fiebre o dolor', dias: 3 }, { m: 'Loratadina 10 mg tabletas', dosis: '1 tableta', frec: 'cada 24 h', dias: 5 }]);
    setPlan('Líquidos abundantes, reposo. Regresar si la fiebre dura más de 3 días.'); setS({ ...s, temp: '37.9', peso: '71.4' });
  };
  const guardar = () => {
    const r = guardarConsultaMedica(pid, { signos: { ...s, fc: Number(s.fc), temp: Number(s.temp), spo2: Number(s.spo2), peso: Number(s.peso) || '—' }, motivo, exploracion: explo, dx, plan, meds });
    avisarListo(meds.length ? 'Consulta guardada · receta enviada a la paciente' : 'Consulta guardada');
    alGuardar(r.receta ? r : null);
  };
  return (
    <div className="cl-exp-grid">
      <section className="cl-caja">
        <div className="cl-titulo-sec"><h4>Signos vitales</h4><button type="button" className="cl-link chico" onClick={ejemplo}>Llenar ejemplo</button></div>
        <div className="cl-medidas">
          {[['ta', 'TA (mmHg)'], ['fc', 'FC (lpm)'], ['temp', 'Temp. (°C)'], ['spo2', 'SpO₂ (%)'], ['peso', 'Peso (kg)']].map(([k, n]) => (
            <label key={k} className="cl-campo"><span>{n}</span><input value={s[k]} onChange={(ev) => setS({ ...s, [k]: ev.target.value })} /></label>
          ))}
        </div>
        <label className="cl-campo"><span>Motivo de consulta</span><textarea className="cl-texto" rows={2} value={motivo} onChange={(ev) => setMotivo(ev.target.value)} /></label>
        <label className="cl-campo"><span>Exploración física</span><textarea className="cl-texto" rows={2} value={explo} onChange={(ev) => setExplo(ev.target.value)} /></label>
        <h4>Diagnóstico (CIE-10)</h4>
        <div className="cl-rapidas">{DIAGNOSTICOS.map(([k, n]) => <button key={k} type="button" className={dx.includes(k) ? 'activa' : ''} onClick={() => setDx(dx.includes(k) ? dx.filter((x) => x !== k) : [...dx, k])}>{k} · {n}</button>)}</div>
      </section>
      <section className="cl-caja">
        <h4>Receta</h4>
        {meds.map((m, i) => (
          <div key={m.m} className="cl-med">
            <span><b>{m.m}</b><small>{m.dosis} {m.frec} por {m.dias} días</small></span>
            <button type="button" className="cl-icono" onClick={() => setMeds(meds.filter((_, j) => j !== i))} aria-label="Quitar"><Trash2 size={15} /></button>
          </div>
        ))}
        <div className="cl-med-nuevo">
          <select value={nuevo.m} onChange={(ev) => setNuevo({ ...nuevo, m: ev.target.value })} aria-label="Medicamento">{MEDICAMENTOS.map((m) => <option key={m}>{m}</option>)}</select>
          <input value={nuevo.dosis} onChange={(ev) => setNuevo({ ...nuevo, dosis: ev.target.value })} aria-label="Dosis" />
          <input value={nuevo.frec} onChange={(ev) => setNuevo({ ...nuevo, frec: ev.target.value })} aria-label="Frecuencia" />
          <input value={nuevo.dias} onChange={(ev) => setNuevo({ ...nuevo, dias: ev.target.value.replace(/\D/g, '') })} aria-label="Días" className="corto" />
          <button type="button" className="cl-boton chico linea" onClick={() => setMeds([...meds.filter((x) => x.m !== nuevo.m), { ...nuevo, dias: Number(nuevo.dias) || 1 }])}><Plus size={14} /> Agregar</button>
        </div>
        <label className="cl-campo"><span>Indicaciones y plan</span><textarea className="cl-texto" rows={3} value={plan} onChange={(ev) => setPlan(ev.target.value)} /></label>
        <button type="button" className="cl-boton grande" disabled={!motivo.trim() || !dx.length} onClick={guardar}><Check size={16} /> Guardar consulta{meds.length ? ' y mandar receta' : ''}</button>
        <p className="cl-nota">La receta sale con tu cédula profesional, se imprime o se manda a la app de la paciente.</p>
      </section>
    </div>
  );
}

// ── odontología ─────────────────────────────────────────────────────────────
export function ExpedienteDental({ pid, cita, alCerrar }) {
  const e = useClinica();
  const [vista, setVista] = useState('odontograma');
  const [sel, setSel] = useState(null);
  const [abono, setAbono] = useState(false);
  const d = e.dental[pid] || { dientes: {}, plan: [], abonos: [] };
  const sd = saldoDental(e, pid);
  const p = paciente(e, pid);
  const texto = `Hola, ${p.nombre.split(' ')[0]}. Te comparto tu presupuesto dental de ${NEGOCIO.nombre}:\n\n${d.plan.filter((x) => x.estado === 'pendiente').map((x) => `• ${x.diente ? `Diente ${x.diente}: ` : ''}${procedimiento(x.proc).nombre} — ${peso(x.precio)}`).join('\n')}\n\nSaldo: ${peso(sd.saldo)}. Puedes abonar en la clínica o desde tu app.`;
  return (
    <div className="cl-expediente">
      <Cabeza pid={pid} cita={cita} alCerrar={alCerrar} />
      <Pestanas valor={vista} alCambiar={setVista} opciones={[{ id: 'odontograma', etiqueta: 'Odontograma' }, { id: 'plan', etiqueta: 'Plan y presupuesto', n: d.plan.filter((x) => x.estado === 'pendiente').length }]} />
      {vista === 'odontograma' && (
        <div className="cl-exp-grid">
          <section className="cl-caja span2">
            <MiniOdontograma dientes={d.dientes} alTocar={setSel} sel={sel} />
            <div className="cl-leyenda">{ESTADOS_DIENTE.map((x) => <span key={x.id}><i style={{ background: x.color }} />{x.nombre}</span>)}</div>
          </section>
          {sel ? (
            <section className="cl-caja span2">
              <h4>Diente {sel} · {estadoDiente(d.dientes[sel]).nombre}</h4>
              <div className="cl-rapidas">{ESTADOS_DIENTE.map((x) => <button key={x.id} type="button" className={(d.dientes[sel] || 'sano') === x.id ? 'activa' : ''} onClick={() => marcarDiente(pid, sel, x.id)}><i className="cl-bolita" style={{ background: x.color }} /> {x.nombre}</button>)}</div>
              <h4>Agregar al plan de tratamiento</h4>
              <div className="cl-rapidas">
                {PROCEDIMIENTOS.filter((x) => x.para.includes(d.dientes[sel])).map((x) => <button key={x.id} type="button" onClick={() => { agregarAlPlan(pid, sel, x.id); avisarListo(`${x.nombre} del ${sel} agregada al presupuesto`); }}><Plus size={13} /> {x.nombre} · {peso(x.precio)}</button>)}
                {!PROCEDIMIENTOS.some((x) => x.para.includes(d.dientes[sel])) && <span className="cl-suave chico">Marca primero el hallazgo (caries, endodoncia, por extraer…).</span>}
              </div>
            </section>
          ) : <p className="cl-nota span2">Toca un diente para marcar lo que encontraste y agregar su tratamiento al presupuesto.</p>}
          {d.notas && <p className="cl-suave chico span2">Notas: {d.notas}</p>}
        </div>
      )}
      {vista === 'plan' && (
        <div className="cl-exp-grid">
          <section className="cl-caja span2">
            <table className="cl-tabla">
              <thead><tr><th>Diente</th><th>Procedimiento</th><th>Precio</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {d.plan.map((x) => (
                  <tr key={x.id} className={x.estado}>
                    <td>{x.diente || '—'}</td><td>{procedimiento(x.proc).nombre}</td><td>{peso(x.precio)}</td>
                    <td>{x.estado === 'hecho' ? `Hecho ${fechaCorta(x.t)}` : 'Pendiente'}</td>
                    <td>{x.estado === 'pendiente' && <span className="cl-fila"><button type="button" className="cl-boton chico" onClick={() => { hacerProcedimiento(pid, x.id); avisarListo('Procedimiento hecho: el odontograma se actualizó'); }}>Hecho</button><button type="button" className="cl-icono" onClick={() => quitarDelPlan(pid, x.id)} aria-label="Quitar"><Trash2 size={14} /></button></span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="cl-caja">
            <div className="cl-saldo">
              <span><small>Total</small><b>{peso(sd.total)}</b></span><span><small>Abonado</small><b>{peso(sd.abonado)}</b></span><span><small>Saldo</small><b>{peso(sd.saldo)}</b></span>
            </div>
            {d.aceptado ? <p className="cl-ok"><Check size={15} /> La paciente aceptó el presupuesto el {fechaCorta(d.aceptado)}</p> : <p className="cl-suave chico">La paciente aún no acepta el presupuesto en su app.</p>}
            <div className="cl-fila">
              <button type="button" className="cl-boton" onClick={() => setAbono(true)}><Wallet size={15} /> Registrar abono</button>
              <a className="cl-boton linea" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"><Send size={15} /> Mandar presupuesto</a>
            </div>
          </section>
          <section className="cl-caja">
            <h4>Abonos</h4>
            {!d.abonos.length && <p className="cl-suave chico">Sin abonos.</p>}
            {d.abonos.map((a) => <p key={a.t} className="cl-fila-precio"><span>{fechaCorta(a.t)} · {a.metodo}</span><b>{peso(a.monto)}</b></p>)}
          </section>
        </div>
      )}
      {abono && <AbonoDental pid={pid} saldo={sd.saldo} alCerrar={() => setAbono(false)} />}
    </div>
  );
}

function AbonoDental({ pid, saldo, alCerrar }) {
  const [monto, setMonto] = useState('1000');
  const [metodo, setMetodo] = useState('efectivo');
  return (
    <Ventana titulo="Registrar abono" sub={`Saldo ${peso(saldo)}`} alCerrar={alCerrar} ancho={380}>
      <div className="cl-form">
        <label className="cl-campo"><span>Monto</span><input value={monto} onChange={(ev) => setMonto(ev.target.value.replace(/\D/g, ''))} inputMode="numeric" autoFocus /></label>
        <div className="cl-rapidas">{['efectivo', 'tarjeta', 'transferencia'].map((m) => <button key={m} type="button" className={metodo === m ? 'activa' : ''} onClick={() => setMetodo(m)}>{m}</button>)}</div>
        <button type="button" className="cl-boton grande" disabled={!Number(monto)} onClick={() => { abonarDental(pid, Number(monto), metodo); avisarListo('Abono registrado'); alCerrar(); }}>Registrar {peso(Number(monto))}</button>
      </div>
    </Ventana>
  );
}
