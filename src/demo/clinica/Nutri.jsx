import { useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, FileText, MessageCircle, Sparkles, Wand2 } from 'lucide-react';
import {
  RECETAS, SOFIA, TIEMPOS, adherencia, aplicarPlan, borradorCopiloto, citasDe, compartirResumen, doctor, fechaCorta, guardarMedicion,
  imc, inicioDia, paciente, ponerEnPlan, r1, receta, responderSolicitud, terminarConsulta, useClinica,
} from './datos';
import { Avatar, Linea, Pestanas, Ventana, avisarListo } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// EXPEDIENTE DE NUTRICIÓN — Resumen (antecedentes, solicitudes, check-ins,
// estudios, cómo va con su plan) · Mediciones · Plan (semana editable +
// copiloto que propone un borrador) · Consulta (notas → resumen para la
// paciente). La "IA" es de demostración: reglas sobre los datos de Sofía.
// ─────────────────────────────────────────────────────────────────────────────

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function ExpedienteNutri({ pid, cita, alCerrar }) {
  const e = useClinica();
  const p = paciente(e, pid);
  const [vista, setVista] = useState('resumen');
  const enConsulta = cita && e.citas.find((c) => c.id === cita)?.estado === 'en-consulta';
  const pend = e.nutri.solicitudes.filter((s) => s.estado === 'pendiente').length;
  return (
    <div className="cl-expediente">
      <div className="cl-exp-cab">
        <button type="button" className="cl-icono" onClick={alCerrar} aria-label="Regresar"><ArrowLeft size={18} /></button>
        <Avatar nombre={p.nombre} size={46} />
        <div>
          <h2>{p.nombre}</h2>
          <p className="cl-suave chico">{p.nacimiento ? `${new Date().getFullYear() - Number(p.nacimiento.slice(0, 4))} años · ` : ''}{p.tel} · paciente desde {fechaCorta(p.alta)}</p>
        </div>
        {enConsulta && <button type="button" className="cl-boton" onClick={() => { terminarConsulta(cita); avisarListo('Consulta terminada'); alCerrar(); }}>Terminar consulta</button>}
      </div>
      {pid !== SOFIA ? <OtroPaciente p={p} /> : (
        <>
          <Pestanas valor={vista} alCambiar={setVista} opciones={[
            { id: 'resumen', etiqueta: 'Resumen', n: pend },
            { id: 'mediciones', etiqueta: 'Mediciones' },
            { id: 'plan', etiqueta: 'Plan y copiloto' },
            { id: 'consulta', etiqueta: 'Notas de consulta' },
          ]} />
          {vista === 'resumen' && <Resumen />}
          {vista === 'mediciones' && <Mediciones />}
          {vista === 'plan' && <PlanEditor />}
          {vista === 'consulta' && <NotasConsulta />}
        </>
      )}
    </div>
  );
}

function OtroPaciente({ p }) {
  const e = useClinica();
  const visitas = citasDe(e, p.id).filter((c) => doctor(c.doc).esp === 'nut');
  return (
    <div className="cl-grid2">
      <div className="cl-caja"><small>Seguimiento</small>
        {p.seg ? <><b>{p.seg.adherencia}% de su plan</b><p className="cl-suave chico">{p.seg.sinRegistro} días sin registrar · cambio de peso {p.seg.peso > 0 ? '+' : ''}{p.seg.peso} kg</p></> : <p className="cl-suave chico">Sin app todavía.</p>}
      </div>
      <div className="cl-caja"><small>Consultas</small><b>{visitas.filter((c) => c.estado === 'atendida').length} atendidas</b><p className="cl-suave chico">{visitas.filter((c) => c.estado === 'no-asistio').length} no asistió</p></div>
      <p className="cl-nota">En la demo, el expediente completo (mediciones, plan, copiloto, resumen) es el de Sofía Martínez.</p>
    </div>
  );
}

function Resumen() {
  const e = useClinica();
  const p = paciente(e, SOFIA);
  const a = p.antecedentes;
  const pend = e.nutri.solicitudes.filter((s) => s.estado === 'pendiente');
  const ult = e.nutri.checkins.slice(-2).reverse();
  const [responder, setResponder] = useState(null);
  return (
    <div className="cl-exp-grid">
      <section className="cl-caja span2">
        <h4>Objetivo</h4>
        <p><b>{e.nutri.objetivo}</b></p>
        <p className="cl-suave chico">{e.nutri.kcal} kcal · P {e.nutri.macros.p}% / C {e.nutri.macros.c}% / G {e.nutri.macros.g}% · {e.nutri.restricciones.join(' · ')}</p>
      </section>
      {pend.length > 0 && (
        <section className="cl-caja alerta span2">
          <h4><MessageCircle size={14} /> Solicitudes de Sofía</h4>
          {pend.map((s) => (
            <div key={s.id} className="cl-solicitud">
              <p>"{s.texto}"<small>{fechaCorta(s.t)}{s.tiempo ? ` · ${TIEMPOS.find((t) => t.id === s.tiempo).nombre}` : ''}</small></p>
              <button type="button" className="cl-boton chico" onClick={() => setResponder(s)}>Responder</button>
            </div>
          ))}
        </section>
      )}
      <section className="cl-caja">
        <h4>Antecedentes</h4>
        <dl className="cl-dl">
          <dt>Alergias</dt><dd className="rojo">{a.alergias.join(', ')}</dd>
          <dt>Enfermedades</dt><dd>{a.enfermedades.join(', ')}</dd>
          <dt>Medicamentos</dt><dd>{a.medicamentos.join(', ')}</dd>
          <dt>Familiares</dt><dd>{a.familiares}</dd>
          <dt>Estilo de vida</dt><dd>{a.estilo}</dd>
        </dl>
      </section>
      <section className="cl-caja">
        <h4>Cómo va con su plan · 7 días</h4>
        <Adherencia />
      </section>
      <section className="cl-caja">
        <h4>Check-ins</h4>
        {ult.map((c) => (
          <div key={c.t} className={`cl-checkin ${c.facilidad <= 2 || c.hambre >= 4 ? 'dificil' : ''}`}>
            <small>{fechaCorta(c.t)}</small>
            <span>Ánimo {c.animo}/5 · Facilidad {c.facilidad}/5 · Hambre {c.hambre}/5</span>
            <p>"{c.dificil}"</p>
          </div>
        ))}
      </section>
      <section className="cl-caja">
        <h4>Estudios que compartió</h4>
        {e.nutri.estudios.map((s) => (
          <div key={s.id} className="cl-estudio-doc">
            <b><FileText size={14} /> {s.nombre}{s.nuevo && <span className="cl-mini verde">nuevo</span>}</b>
            <small>{fechaCorta(s.t)}</small>
            <ul>{s.valores.map(([n, v, st]) => <li key={n} className={st}><span>{n}</span><b>{v}</b></li>)}</ul>
          </div>
        ))}
      </section>
      {responder && <Responder s={responder} alCerrar={() => setResponder(null)} />}
    </div>
  );
}

function Adherencia() {
  const e = useClinica();
  const dias = Array.from({ length: 7 }, (_, i) => inicioDia(i - 6));
  return (
    <div className="cl-adherencia">
      <div className="cl-adh-grid">
        <span />{dias.map((d) => <small key={d}>{DIAS[new Date(d).getDay()]}</small>)}
        {TIEMPOS.map((tm) => (
          <div key={tm.id} className="cl-adh-fila">
            <small>{tm.nombre === 'Colación' ? (tm.id === 'col1' ? 'Col. AM' : 'Col. PM') : tm.nombre}</small>
            {dias.map((d) => { const r = e.nutri.registro[d]?.[tm.id]; return <i key={d} className={r ? r.estado : ''} title={r ? `${r.estado}${r.motivo ? ` · ${r.motivo}` : ''}` : 'sin registro'} />; })}
          </div>
        ))}
      </div>
      <p className="cl-suave chico"><i className="cl-cuadrito hecho" /> lo hizo <i className="cl-cuadrito cambiado" /> cambió por opción autorizada <i className="cl-cuadrito saltado" /> no lo hizo · {adherencia(e)}% de la semana</p>
    </div>
  );
}

function Responder({ s, alCerrar }) {
  const [texto, setTexto] = useState('');
  const [rid, setRid] = useState('');
  const tid = s.tiempo || 'des';
  const opciones = RECETAS.filter((r) => r.tiempos.includes(tid));
  return (
    <Ventana titulo="Responder a Sofía" sub={`"${s.texto}"`} alCerrar={alCerrar} ancho={480}>
      <div className="cl-form">
        <label className="cl-campo"><span>Autorizar una opción nueva para {TIEMPOS.find((t) => t.id === tid).nombre.toLowerCase()} (opcional)</span>
          <select value={rid} onChange={(ev) => { setRid(ev.target.value); if (ev.target.value && !texto) setTexto(`Te agregué "${receta(ev.target.value).nombre}" como opción. Es rápida y equivalente.`); }}>
            <option value="">— Ninguna —</option>
            {opciones.map((r) => <option key={r.id} value={r.id}>{r.nombre} · {r.min} min · {r.kcal} kcal</option>)}
          </select>
        </label>
        <textarea className="cl-texto" rows={3} value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="Tu respuesta" />
        <button type="button" className="cl-boton grande" disabled={!texto.trim()} onClick={() => { responderSolicitud(s.id, texto.trim(), rid ? { tiempo: tid, receta: rid } : null); avisarListo('Respuesta enviada a Sofía'); alCerrar(); }}>Enviar a Sofía</button>
      </div>
    </Ventana>
  );
}

function Mediciones() {
  const e = useClinica();
  const m = e.nutri.mediciones;
  const ult = m[m.length - 1];
  const [f, setF] = useState({ peso: String(r1(ult.peso - 0.6)), grasa: String(r1(ult.grasa - 0.7)), musculo: String(r1(ult.musculo + 0.1)), cintura: String(r1(ult.cintura - 1)), cadera: String(r1(ult.cadera - 0.5)) });
  const hoy = m.some((x) => x.t > inicioDia(0));
  const et = m.map((x) => fechaCorta(x.t).replace('.', ''));
  return (
    <div className="cl-exp-grid">
      <section className="cl-caja">
        <h4>Medición de hoy</h4>
        {hoy ? <p className="cl-ok"><Check size={15} /> Ya registraste la de hoy. Sofía la ve en su Progreso.</p> : (
          <form className="cl-form" onSubmit={(ev) => { ev.preventDefault(); guardarMedicion(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Number(v)]))); avisarListo('Medición guardada'); }}>
            <div className="cl-medidas">
              {[['peso', 'Peso', 'kg'], ['grasa', 'Grasa', '%'], ['musculo', 'Músculo', 'kg'], ['cintura', 'Cintura', 'cm'], ['cadera', 'Cadera', 'cm']].map(([k, n, u]) => (
                <label key={k} className="cl-campo"><span>{n} ({u})</span><input value={f[k]} onChange={(ev) => setF({ ...f, [k]: ev.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal" /></label>
              ))}
            </div>
            <p className="cl-suave chico">IMC {imc(Number(f.peso) || ult.peso, e.nutri.estatura)} · estatura {e.nutri.estatura} cm · la báscula de bioimpedancia puede mandarlo sola.</p>
            <button type="submit" className="cl-boton">Guardar medición</button>
          </form>
        )}
      </section>
      <section className="cl-caja"><h4>Peso (kg)</h4><Linea puntos={m.map((x) => x.peso)} etiquetas={et} /></section>
      <section className="cl-caja"><h4>Grasa (%)</h4><Linea puntos={m.map((x) => x.grasa)} unidad="%" color="#C9792B" etiquetas={et} /></section>
      <section className="cl-caja"><h4>Cintura (cm)</h4><Linea puntos={m.map((x) => x.cintura)} color="#2F62A8" etiquetas={et} /></section>
      <section className="cl-caja span2">
        <table className="cl-tabla"><thead><tr><th>Fecha</th><th>Peso</th><th>Grasa</th><th>Músculo</th><th>Cintura</th><th>Cadera</th></tr></thead>
          <tbody>{m.slice().reverse().map((x) => <tr key={x.t}><td>{fechaCorta(x.t)}</td><td>{x.peso}</td><td>{x.grasa}%</td><td>{x.musculo}</td><td>{x.cintura}</td><td>{x.cadera}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}

function PlanEditor() {
  const e = useClinica();
  const [celda, setCelda] = useState(null);
  const [cop, setCop] = useState({ kcal: e.nutri.kcal, sinLactosa: true, rapidas: false, economicas: false });
  const [borrador, setBorrador] = useState(null);
  const [pensando, setPensando] = useState(false);
  const generar = () => { setPensando(true); setBorrador(null); setTimeout(() => { setBorrador(borradorCopiloto(cop)); setPensando(false); }, 1500); };
  const semana = borrador ? borrador.semana : e.nutri.semana;
  return (
    <div className="cl-exp-grid">
      <section className="cl-caja span2 cl-copiloto">
        <h4><Wand2 size={14} /> Copiloto nutricional</h4>
        <p className="cl-suave chico">Propone un borrador de semana con tus recetas, respetando restricciones y objetivo. Tú lo revisas y apruebas: nada le llega a Sofía sin tu visto bueno.</p>
        <div className="cl-fila">
          <label className="cl-campo chico"><span>Kcal meta</span><input value={cop.kcal} onChange={(ev) => setCop({ ...cop, kcal: Number(ev.target.value.replace(/\D/g, '')) || 0 })} inputMode="numeric" /></label>
          {[['sinLactosa', 'Sin lactosa'], ['rapidas', 'Recetas de 20 min o menos'], ['economicas', 'Económicas']].map(([k, n]) => (
            <label key={k} className="cl-toggle"><input type="checkbox" checked={cop[k]} onChange={() => setCop({ ...cop, [k]: !cop[k] })} /> {n}</label>
          ))}
          <button type="button" className="cl-boton" onClick={generar} disabled={pensando}><Sparkles size={15} /> {pensando ? 'Armando borrador…' : 'Proponer semana'}</button>
        </div>
        {pensando && <div className="cl-cargando"><span /><span /><span /></div>}
        {borrador && (
          <div className="cl-nota-verde">
            <Sparkles size={16} />
            <span><b>Borrador listo</b>Promedio {borrador.prom} kcal al día{Math.abs(borrador.porcion - 1) > 0.05 ? ` · ajusta porciones ×${borrador.porcion} para llegar a ${cop.kcal}` : ''}. Revísalo abajo; puedes cambiar cualquier platillo antes de aprobar.
              <span className="cl-fila"><button type="button" className="cl-boton chico" onClick={() => { aplicarPlan(borrador.semana, 'Tu nutrióloga te mandó un plan nuevo para esta semana.'); setBorrador(null); avisarListo('Plan aprobado y enviado a Sofía'); }}><Check size={14} /> Aprobar y enviar</button><button type="button" className="cl-link" onClick={() => setBorrador(null)}>Descartar</button></span>
            </span>
          </div>
        )}
      </section>
      <section className="cl-caja span2">
        <h4>{borrador ? 'Borrador del copiloto' : 'Plan actual de Sofía'} · toca un platillo para cambiarlo</h4>
        <div className="cl-semana-tabla">
          <span />{[1, 2, 3, 4, 5, 6, 0].map((d) => <b key={d}>{DIAS[d]}</b>)}
          {TIEMPOS.map((tm) => (
            <div key={tm.id} className="cl-semana-fila">
              <small>{tm.id === 'col1' ? 'Col. AM' : tm.id === 'col2' ? 'Col. PM' : tm.nombre}</small>
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const r = receta(semana[d][tm.id]);
                return <button key={d} type="button" style={{ '--c': r.color }} onClick={() => setCelda({ d, tid: tm.id })}>{r.nombre}</button>;
              })}
            </div>
          ))}
        </div>
      </section>
      {celda && (
        <Ventana titulo={`${DIAS[celda.d]} · ${TIEMPOS.find((t) => t.id === celda.tid).nombre}`} alCerrar={() => setCelda(null)} ancho={460}>
          <div className="cl-alternativas">
            {RECETAS.filter((r) => r.tiempos.includes(celda.tid)).map((r) => (
              <button key={r.id} type="button" className={`cl-alt ${semana[celda.d][celda.tid] === r.id ? 'activa' : ''}`} onClick={() => {
                if (borrador) { const sem = borrador.semana.map((x) => ({ ...x })); sem[celda.d][celda.tid] = r.id; setBorrador({ ...borrador, semana: sem }); }
                else { ponerEnPlan(celda.d, celda.tid, r.id); avisarListo('Plan actualizado: Sofía ya lo ve'); }
                setCelda(null);
              }}>
                <span className="cl-alt-color" style={{ background: r.color }} /><span><b>{r.nombre}</b><small>{r.kcal} kcal · {r.p} g proteína · {r.min} min</small></span><Check size={16} />
              </button>
            ))}
          </div>
        </Ventana>
      )}
    </div>
  );
}

const ACUERDOS = ['Preparar comidas el domingo', 'Colación a las 5:30 pm', 'Caminar 20 min después de comer', 'Desayunos rápidos entre semana', 'Dormir 7 horas', 'Llevar colación al trabajo'];
function NotasConsulta() {
  const e = useClinica();
  const [notas, setNotas] = useState('Refiere que entre semana no le da tiempo de desayunar. Buena adherencia en comidas. Antojo de pan dulce por la tarde.');
  const [acuerdos, setAcuerdos] = useState(['Desayunos rápidos entre semana', 'Colación a las 5:30 pm']);
  const [borrador, setBorrador] = useState('');
  const [pensando, setPensando] = useState(false);
  const m = e.nutri.mediciones;
  const ult = m[m.length - 1], ant = m[m.length - 2];
  const generar = () => {
    setPensando(true);
    setTimeout(() => {
      const dp = r1(ant.peso - ult.peso), dg = r1(ant.grasa - ult.grasa);
      const ck = e.nutri.checkins[e.nutri.checkins.length - 1];
      setBorrador([
        `Evolución: ${dp >= 0 ? `bajaste ${dp} kg` : `subiste ${-dp} kg`} y ${dg >= 0 ? `${dg}% de grasa` : `${-dg}% de grasa más`} desde la consulta pasada; tu cintura va en ${ult.cintura} cm. Esta semana seguiste tu plan ${adherencia(e)}% de las comidas.`,
        `Lo que platicamos: ${notas.split('.').filter(Boolean)[0].trim().toLowerCase()}.${ck ? ` En tu check-in dijiste que lo más difícil fue "${ck.dificil.toLowerCase().replace(/\.$/, '')}".` : ''}`,
        `Acuerdos: ${acuerdos.join('; ').toLowerCase()}.`,
        'Para las próximas 2 semanas: mantener 8 vasos de agua y 8,000 pasos; registrar tus comidas en la app.',
        'Pendiente para la siguiente consulta: revisar los desayunos rápidos y tus estudios de control.',
      ].join('\n\n'));
      setPensando(false);
    }, 1400);
  };
  return (
    <div className="cl-exp-grid">
      <section className="cl-caja">
        <h4>Notas de la consulta (privadas)</h4>
        <textarea className="cl-texto" rows={6} value={notas} onChange={(ev) => setNotas(ev.target.value)} />
        <h4>Acuerdos</h4>
        <div className="cl-rapidas">{ACUERDOS.map((a) => <button key={a} type="button" className={acuerdos.includes(a) ? 'activa' : ''} onClick={() => setAcuerdos(acuerdos.includes(a) ? acuerdos.filter((x) => x !== a) : [...acuerdos, a])}>{a}</button>)}</div>
        <button type="button" className="cl-boton" onClick={generar} disabled={pensando}><Sparkles size={15} /> {pensando ? 'Redactando…' : 'Preparar resumen para Sofía'}</button>
      </section>
      <section className="cl-caja">
        <h4>Resumen para la paciente</h4>
        {pensando && <div className="cl-cargando"><span /><span /><span /></div>}
        {!borrador && !pensando && <p className="cl-suave chico">Junta tus notas, las mediciones y su check-in en un resumen claro. Tú lo editas antes de mandarlo; tus notas privadas no se comparten.</p>}
        {borrador && (
          <>
            <textarea className="cl-texto" rows={12} value={borrador} onChange={(ev) => setBorrador(ev.target.value)} />
            <button type="button" className="cl-boton" onClick={() => { compartirResumen(borrador); setBorrador(''); avisarListo('Resumen compartido: Sofía lo ve en su app'); }}><Check size={15} /> Revisado · compartir con Sofía</button>
          </>
        )}
        {e.nutri.resumenes.length > 0 && <p className="cl-suave chico">Último compartido: {fechaCorta(e.nutri.resumenes[e.nutri.resumenes.length - 1].t)}</p>}
      </section>
      <p className="cl-nota span2"><AlertTriangle size={13} /> El copiloto y el resumen apoyan tu criterio: no diagnostican ni cambian tratamientos solos.</p>
    </div>
  );
}
