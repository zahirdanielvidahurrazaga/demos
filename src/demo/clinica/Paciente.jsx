import { useState } from 'react';
import {
  Bell, CalendarDays, Camera, Check, ChevronRight, Clock, Droplet, Footprints, Heart, HeartPulse, Home, Leaf, ListChecks,
  MessageCircle, Minus, Plus, ShoppingBasket, Sparkles, Store, TrendingUp, Utensils, X,
} from 'lucide-react';
import {
  LUGARES, SOFIA, TIEMPOS, adherencia, alternarFavorita, confirmar, cuandoTexto, doctor, elegirParaDia, enviarCheckin,
  evaluarPlatillo, fechaLarga, guardarFuera, inicioDia, marcarComida, paciente, pedirAjuste, planDelDia,
  proximaCita, receta, servicio, sumarAgua, tiempo, useClinica,
} from './datos';
import { Anillo, Avatar, BotonPantalla, Logo, Ventana, avisarListo } from './comun';
import { MiClinica, Progreso, Super } from './PacienteMas';

// ─────────────────────────────────────────────────────────────────────────────
// PACIENTE — la app de Sofía. Hoy (sus comidas, agua, "¿qué pasó?", comer
// fuera, check-in, próxima cita) · Plan (la semana con sus alternativas) ·
// Súper (lista automática con presupuesto) · Progreso · Mi clínica (citas,
// recetas, tratamiento dental, estudios). En compu va centrada como teléfono.
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'hoy', etiqueta: 'Hoy', Icon: Home },
  { id: 'plan', etiqueta: 'Plan', Icon: Utensils },
  { id: 'super', etiqueta: 'Súper', Icon: ShoppingBasket },
  { id: 'progreso', etiqueta: 'Progreso', Icon: TrendingUp },
  { id: 'clinica', etiqueta: 'Mi clínica', Icon: HeartPulse },
];

export default function Paciente() {
  const e = useClinica();
  const [tab, setTab] = useState('hoy');
  const [avisos, setAvisos] = useState(false);
  const [visto, setVisto] = useState(() => Date.now() - 3 * 3600000);
  const mios = e.avisos.filter((a) => a.para === SOFIA).sort((a, b) => b.t - a.t);
  const nuevos = mios.filter((a) => a.t > visto).length;
  const ir = (t) => { setTab(t); window.scrollTo({ top: 0 }); };
  return (
    <div className="cl-app-fondo">
      <div className="cl-app">
        <header className="cl-app-cab">
          <Logo />
          <span className="cl-app-cab-der">
            <button type="button" className="cl-icono" onClick={() => { setAvisos(true); setVisto(Date.now()); }} aria-label={`Avisos${nuevos ? ` (${nuevos} nuevos)` : ''}`}>
              <Bell size={19} />{nuevos > 0 && <i className="cl-punto" />}
            </button>
            <BotonPantalla />
            <Avatar nombre="Sofía Martínez" size={32} color="#2F7D5B" />
          </span>
        </header>
        <main className="cl-app-cuerpo">
          {tab === 'hoy' && <Hoy ir={ir} />}
          {tab === 'plan' && <Plan />}
          {tab === 'super' && <Super />}
          {tab === 'progreso' && <Progreso />}
          {tab === 'clinica' && <MiClinica />}
        </main>
        <nav className="cl-tabbar" aria-label="Secciones">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={tab === t.id ? 'activa' : ''} onClick={() => ir(t.id)} aria-current={tab === t.id}>
              <t.Icon size={20} strokeWidth={tab === t.id ? 2.3 : 1.8} /><span>{t.etiqueta}</span>
            </button>
          ))}
        </nav>
      </div>
      {avisos && (
        <Ventana titulo="Avisos" alCerrar={() => setAvisos(false)} ancho={420}>
          <div className="cl-lista">
            {mios.slice(0, 12).map((a) => <p key={a.id} className="cl-aviso-fila"><b>{a.texto}</b><small>{cuandoTexto(a.t)}</small></p>)}
          </div>
        </Ventana>
      )}
    </div>
  );
}

// ── hoy ─────────────────────────────────────────────────────────────────────
function Hoy({ ir }) {
  const e = useClinica();
  const yo = paciente(e, SOFIA);
  const plan = planDelDia(e);
  const h = e.nutri.habitos[inicioDia(0)] || { agua: 0, pasos: 0 };
  const consumidas = plan.filter((x) => x.reg && x.reg.estado !== 'saltado').reduce((n, x) => n + receta(x.receta).kcal, 0);
  const [ver, setVer] = useState(null);
  const [quePaso, setQuePaso] = useState(null);
  const [fuera, setFuera] = useState(false);
  const [checkin, setCheckin] = useState(false);
  const cita = proximaCita(e, SOFIA);
  const ultimoCheck = e.nutri.checkins[e.nutri.checkins.length - 1];
  const tocaCheck = !ultimoCheck || Date.now() - ultimoCheck.t > 6 * 86400000;
  const resumen = e.nutri.resumenes.filter((r) => r.compartido).slice(-1)[0];
  const pend = e.nutri.solicitudes.filter((s) => s.estado === 'pendiente');
  const resp = e.nutri.solicitudes.filter((s) => s.estado === 'resuelta' && Date.now() - s.resuelta < 86400000).slice(-1)[0];
  const horaNow = new Date().getHours();

  return (
    <div className="cl-hoy">
      <section className="cl-saludo">
        <p className="cl-cejilla">{fechaLarga()}</p>
        <h1>{horaNow < 12 ? 'Buenos días' : horaNow < 19 ? 'Buenas tardes' : 'Buenas noches'}, <em>{yo.nombre.split(' ')[0]}</em></h1>
      </section>

      <section className="cl-resumen-dia">
        <Anillo valor={consumidas} max={e.nutri.kcal} tam={104} grosor={10}>
          <b>{consumidas}</b><small>de {e.nutri.kcal} kcal</small>
        </Anillo>
        <div className="cl-habitos">
          <div className="cl-habito">
            <span><Droplet size={16} /> Agua</span>
            <div className="cl-vasos" aria-label={`${h.agua} de ${e.nutri.agua} vasos`}>
              {Array.from({ length: e.nutri.agua }, (_, i) => <i key={i} className={i < h.agua ? 'lleno' : ''} />)}
            </div>
            <span className="cl-habito-btns">
              <button type="button" onClick={() => sumarAgua(-1)} aria-label="Quitar un vaso"><Minus size={14} /></button>
              <b>{h.agua}/{e.nutri.agua}</b>
              <button type="button" onClick={() => { sumarAgua(1); if (h.agua + 1 === e.nutri.agua) avisarListo('¡Meta de agua cumplida!'); }} aria-label="Sumar un vaso"><Plus size={14} /></button>
            </span>
          </div>
          <div className="cl-habito">
            <span><Footprints size={16} /> Pasos</span>
            <div className="cl-barrita"><i style={{ width: `${Math.min(100, (h.pasos / e.nutri.pasos) * 100)}%` }} /></div>
            <small>{h.pasos.toLocaleString('es-MX')} de {e.nutri.pasos.toLocaleString('es-MX')} · desde tu reloj</small>
          </div>
        </div>
      </section>

      {resp && <div className="cl-nota-verde"><MessageCircle size={16} /><span><b>Andrea te respondió</b>{resp.respuesta}</span></div>}
      {pend.length > 0 && <div className="cl-nota-ambar"><Clock size={16} /><span><b>Tu nutrióloga ya vio tu solicitud</b>"{pend[pend.length - 1].texto}" · te responde hoy</span></div>}

      <button type="button" className="cl-fuera-boton" onClick={() => setFuera(true)}>
        <Store size={20} />
        <span><b>Estoy comiendo fuera</b><small>¿Qué pido? Escribe el menú o toma una foto</small></span>
        <ChevronRight size={18} />
      </button>

      <section>
        <div className="cl-titulo-sec"><h2>Tus comidas de hoy</h2><button type="button" className="cl-link" onClick={() => ir('plan')}>Ver semana</button></div>
        <div className="cl-comidas">
          {plan.map(({ tm, receta: rid, reg, base, elegida }) => {
            const r = receta(rid);
            return (
              <article key={tm.id} className={`cl-comida ${reg ? reg.estado : ''}`}>
                <button type="button" className="cl-comida-foto" style={{ '--c': r.color }} onClick={() => setVer(rid)} aria-label={`Ver receta de ${r.nombre}`}>
                  <Leaf size={20} />
                </button>
                <div className="cl-comida-texto" onClick={() => setVer(rid)} role="presentation">
                  <small>{tm.nombre} · {tm.hora}</small>
                  <b>{r.nombre}</b>
                  <span>{r.kcal} kcal · {r.min} min{(reg?.estado === 'cambiado' || elegida) && rid !== base ? ' · cambiada por ti' : ''}</span>
                </div>
                <div className="cl-comida-acc">
                  {reg?.estado === 'saltado' ? <span className="cl-mini gris">No la hice</span> : (
                    <button type="button" className={`cl-check ${reg && reg.estado !== 'saltado' ? 'si' : ''}`} onClick={() => marcarComida(tm.id, reg?.estado === 'cambiado' ? 'cambiado' : 'hecho')} aria-label={reg ? 'Desmarcar' : 'Ya lo comí'}><Check size={17} /></button>
                  )}
                  {!reg && <button type="button" className="cl-link chico" onClick={() => setQuePaso(tm.id)}>¿Qué pasó?</button>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {tocaCheck && (
        <button type="button" className="cl-tarjeta-check" onClick={() => setCheckin(true)}>
          <Sparkles size={20} />
          <span><b>Tu check-in de la semana</b><small>3 preguntas · así Andrea sabe qué ajustar antes de tu consulta</small></span>
          <ChevronRight size={18} />
        </button>
      )}

      {cita && (
        <section className="cl-proxima">
          <div className="cl-titulo-sec"><h2>Tu próxima cita</h2></div>
          <div className="cl-cita-tarjeta">
            <Avatar nombre={doctor(cita.doc).nombre} size={44} />
            <span><b>{servicio(cita.serv).nombre}</b><small>{doctor(cita.doc).nombre} · {cuandoTexto(cita.inicio)}</small></span>
          </div>
          {cita.estado === 'agendada'
            ? <div className="cl-fila"><button type="button" className="cl-boton" onClick={() => { confirmar(cita.id); avisarListo('Cita confirmada'); }}>Confirmar asistencia</button><button type="button" className="cl-boton linea" onClick={() => ir('clinica')}>Cambiar</button></div>
            : <p className="cl-ok"><Check size={15} /> Confirmada{cita.estado === 'llego' ? ' · ya estás en sala' : ''}</p>}
        </section>
      )}

      {resumen && (
        <section className="cl-resumen-consulta">
          <p className="cl-cejilla">Resumen de tu última consulta</p>
          <p>{resumen.texto}</p>
        </section>
      )}

      {ver && <Receta rid={ver} alCerrar={() => setVer(null)} />}
      {quePaso && <QuePaso tid={quePaso} alCerrar={() => setQuePaso(null)} alFuera={() => { setQuePaso(null); setFuera(true); }} />}
      {fuera && <ComerFuera alCerrar={() => setFuera(false)} />}
      {checkin && <Checkin alCerrar={() => setCheckin(false)} />}
    </div>
  );
}

export function Receta({ rid, alCerrar, accion }) {
  const e = useClinica();
  const r = receta(rid);
  const fav = e.nutri.favoritas.includes(rid);
  return (
    <Ventana titulo={r.nombre} sub={`${r.kcal} kcal · ${r.p} g de proteína · ${r.min} min`} alCerrar={alCerrar} ancho={460}>
      <div className="cl-receta">
        <div className="cl-receta-portada" style={{ '--c': r.color }}><Leaf size={34} /><span>{r.tags.join(' · ')}</span></div>
        <h4>Ingredientes</h4>
        <ul className="cl-ingredientes">{r.ing.map((g) => <li key={g.n}><span>{g.n}</span><b>{g.c} {g.u}</b></li>)}</ul>
        <h4>Preparación</h4>
        <ol className="cl-pasos">{r.pasos.map((p) => <li key={p}>{p}</li>)}</ol>
        <div className="cl-fila">
          <button type="button" className={`cl-boton linea ${fav ? 'activa' : ''}`} onClick={() => alternarFavorita(rid)}><Heart size={16} fill={fav ? 'currentColor' : 'none'} /> {fav ? 'En favoritas' : 'Guardar'}</button>
          {accion}
        </div>
      </div>
    </Ventana>
  );
}

// "Mi plan cambió": alternativas que la nutrióloga ya autorizó
const MOTIVOS = [
  { id: 'tiempo', texto: 'No tuve tiempo', filtro: (r) => r.min <= 12 },
  { id: 'ingredientes', texto: 'No tengo ingredientes', filtro: (r) => r.tags.includes('económica') || r.tags.includes('sin cocinar') || r.min <= 10 },
  { id: 'fuera', texto: 'Comeré fuera' },
  { id: 'otra', texto: 'Quiero otra opción', filtro: () => true },
];
function QuePaso({ tid, alCerrar, alFuera }) {
  const e = useClinica();
  const [motivo, setMotivo] = useState(null);
  const [pedir, setPedir] = useState(false);
  const [texto, setTexto] = useState('');
  const base = planDelDia(e).find((x) => x.tm.id === tid).base;
  const alts = motivo ? e.nutri.alternativas[tid].filter((rid) => rid !== base && motivo.filtro(receta(rid))) : [];
  if (pedir) {
    return (
      <Ventana titulo="Pedir un ajuste a Andrea" alCerrar={alCerrar} ancho={440}>
        <div className="cl-form">
          <p className="cl-suave">Cuéntale qué no te funciona. Le llega a su panel y te responde aquí.</p>
          <textarea className="cl-texto" rows={3} value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder="Ej. en las mañanas no me da tiempo de cocinar huevo" autoFocus />
          <div className="cl-rapidas">{['No me da tiempo de cocinar en la mañana', 'Me da mucha hambre en la tarde', 'No me gusta el pescado'].map((x) => <button key={x} type="button" onClick={() => setTexto(x)}>{x}</button>)}</div>
          <button type="button" className="cl-boton grande" disabled={!texto.trim()} onClick={() => { pedirAjuste(texto.trim(), tid); avisarListo('Se lo mandamos a tu nutrióloga'); alCerrar(); }}>Mandar a mi nutrióloga</button>
        </div>
      </Ventana>
    );
  }
  return (
    <Ventana titulo={`${tiempo(tid).nombre}: ¿qué pasó?`} sub="Sin culpas: tu plan tiene opciones para estos días." alCerrar={alCerrar} ancho={460}>
      <div className="cl-form">
        <div className="cl-motivos">
          {MOTIVOS.map((m) => <button key={m.id} type="button" className={motivo?.id === m.id ? 'activa' : ''} onClick={() => (m.id === 'fuera' ? alFuera() : setMotivo(m))}>{m.texto}</button>)}
        </div>
        {motivo && (
          <>
            <p className="cl-suave chico">Opciones equivalentes que autorizó Andrea{motivo.id === 'tiempo' ? ' · las más rápidas' : ''}:</p>
            <div className="cl-alternativas">
              {alts.map((rid) => {
                const r = receta(rid);
                return (
                  <button key={rid} type="button" className="cl-alt" onClick={() => { marcarComida(tid, 'cambiado', { receta: rid, motivo: motivo.texto }); avisarListo(`Cambiado por ${r.nombre}`); alCerrar(); }}>
                    <span className="cl-alt-color" style={{ background: r.color }} />
                    <span><b>{r.nombre}</b><small>{r.kcal} kcal · {r.min} min</small></span>
                    <Check size={16} />
                  </button>
                );
              })}
              {!alts.length && <p className="cl-suave chico">No hay opciones así para este tiempo.</p>}
            </div>
            <button type="button" className="cl-link" onClick={() => setPedir(true)}>Ninguna me sirve · pedir un ajuste</button>
          </>
        )}
        <button type="button" className="cl-link gris" onClick={() => { marcarComida(tid, 'saltado'); alCerrar(); }}>Hoy no la hice</button>
      </div>
    </Ventana>
  );
}

// "Estoy comiendo fuera": elige el tipo de lugar, escribe o "fotografía" el menú
const MENU_FOTO = 'Rollo empanizado con queso crema\nSashimi de salmón\nSopa miso\nYakimeshi\nEnsalada de pepino con ajonjolí\nTeriyaki de pollo';
export function ComerFuera({ alCerrar }) {
  const e = useClinica();
  const [lugar, setLugar] = useState(null);
  const [texto, setTexto] = useState('');
  const [leyendo, setLeyendo] = useState(false);
  const platillos = (lugar ? LUGARES.find((l) => l.id === lugar).platillos : texto.split('\n')).map(evaluarPlatillo).filter(Boolean);
  const orden = { si: 0, moderado: 1, lactosa: 2, evitar: 3 };
  const foto = () => { setLugar(null); setLeyendo(true); setTexto(''); setTimeout(() => { setLeyendo(false); setTexto(MENU_FOTO); }, 1600); };
  return (
    <Ventana titulo="Estoy comiendo fuera" sub="Te decimos qué va con tu plan. Son sugerencias: tu nutrióloga tiene la última palabra." alCerrar={alCerrar} ancho={520}>
      <div className="cl-form">
        <div className="cl-motivos">
          {LUGARES.map((l) => <button key={l.id} type="button" className={lugar === l.id ? 'activa' : ''} onClick={() => setLugar(lugar === l.id ? null : l.id)}>{l.nombre}</button>)}
        </div>
        {!lugar && (
          <>
            <textarea className="cl-texto" rows={4} value={texto} onChange={(ev) => setTexto(ev.target.value)} placeholder={'Escribe o pega el menú, un platillo por renglón…'} />
            <button type="button" className="cl-boton linea" onClick={foto} disabled={leyendo}><Camera size={16} /> {leyendo ? 'Leyendo el menú…' : 'Tomar foto del menú'}</button>
          </>
        )}
        {leyendo && <div className="cl-cargando"><span /><span /><span /></div>}
        {platillos.length > 0 && (
          <div className="cl-platillos">
            {platillos.sort((a, b) => orden[a.nivel] - orden[b.nivel]).map((p) => (
              <div key={p.nombre} className={`cl-platillo ${p.nivel}`}>
                <span className="cl-platillo-sem" />
                <span><b>{p.nombre}</b><small><em>{p.texto}.</em> {p.ajuste}</small></span>
                {p.nivel === 'si' && <button type="button" className="cl-icono" onClick={() => { guardarFuera({ ...p, lugar }); avisarListo('Guardado en tus opciones de fuera'); }} aria-label="Guardar"><Heart size={16} fill={e.nutri.fuera.some((x) => x.nombre === p.nombre) ? 'currentColor' : 'none'} /></button>}
              </div>
            ))}
          </div>
        )}
        <p className="cl-nota"><Sparkles size={13} /> Revisado contra tu plan: sin lactosa y bajar grasa. Las porciones son estimadas.</p>
        {e.nutri.fuera.length > 0 && <p className="cl-suave chico">Tus guardadas: {e.nutri.fuera.map((x) => x.nombre).join(' · ')}</p>}
      </div>
    </Ventana>
  );
}

function Checkin({ alCerrar }) {
  const [r, setR] = useState({ facilidad: 0, hambre: 0, animo: 0, dificil: '' });
  const P = [
    { k: 'animo', q: '¿Cómo te has sentido esta semana?', o: ['Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'] },
    { k: 'facilidad', q: '¿Qué tan fácil fue seguir tu plan?', o: ['Muy difícil', 'Difícil', 'Regular', 'Fácil', 'Muy fácil'] },
    { k: 'hambre', q: '¿Has tenido hambre entre comidas?', o: ['Nada', 'Poca', 'A veces', 'Seguido', 'Mucha'] },
  ];
  const listo = r.facilidad && r.hambre && r.animo;
  return (
    <Ventana titulo="Check-in de la semana" sub="Tus respuestas solo las ve tu nutrióloga." alCerrar={alCerrar} ancho={480}>
      <div className="cl-form">
        {P.map((p) => (
          <div key={p.k} className="cl-pregunta">
            <b>{p.q}</b>
            <div className="cl-escala">{p.o.map((o, i) => <button key={o} type="button" className={r[p.k] === i + 1 ? 'activa' : ''} onClick={() => setR({ ...r, [p.k]: i + 1 })}>{o}</button>)}</div>
          </div>
        ))}
        <label className="cl-campo"><span>¿Qué fue lo más difícil?</span><textarea className="cl-texto" rows={2} value={r.dificil} onChange={(ev) => setR({ ...r, dificil: ev.target.value })} placeholder="Ej. preparar los desayunos" /></label>
        <div className="cl-rapidas">{['Preparar los desayunos', 'Las cenas con la familia', 'El antojo de pan dulce en la tarde'].map((x) => <button key={x} type="button" onClick={() => setR({ ...r, dificil: x })}>{x}</button>)}</div>
        <button type="button" className="cl-boton grande" disabled={!listo} onClick={() => { enviarCheckin(r); avisarListo('Check-in enviado a Andrea'); alCerrar(); }}>Enviar</button>
      </div>
    </Ventana>
  );
}

// ── plan de la semana ───────────────────────────────────────────────────────
function Plan() {
  const e = useClinica();
  const [d, setD] = useState(0);
  const [ver, setVer] = useState(null);
  const [cambiar, setCambiar] = useState(null);
  const dia = inicioDia(d);
  const plan = planDelDia(e, dia);
  const total = plan.reduce((n, x) => n + receta(x.receta).kcal, 0);
  return (
    <div className="cl-plan">
      <section className="cl-saludo">
        <p className="cl-cejilla">Tu plan · {e.nutri.kcal} kcal al día</p>
        <h1>{e.nutri.objetivo.split(' ').slice(0, 3).join(' ')} <em>{e.nutri.objetivo.split(' ').slice(3, 5).join(' ')}</em></h1>
        <div className="cl-macros">
          {[['Proteína', e.nutri.macros.p], ['Carbohidratos', e.nutri.macros.c], ['Grasas', e.nutri.macros.g]].map(([n, v]) => <span key={n}><b>{v}%</b>{n}</span>)}
        </div>
        <p className="cl-suave chico">{e.nutri.restricciones.join(' · ')} · adherencia de esta semana {adherencia(e)}%</p>
      </section>
      <div className="cl-dias" role="tablist">
        {Array.from({ length: 7 }, (_, i) => {
          const t = inicioDia(i);
          return <button key={i} type="button" className={d === i ? 'activa' : ''} onClick={() => setD(i)}><small>{i === 0 ? 'Hoy' : new Date(t).toLocaleDateString('es-MX', { weekday: 'short' })}</small><b>{new Date(t).getDate()}</b></button>;
        })}
      </div>
      <p className="cl-suave chico">{total} kcal este día</p>
      <div className="cl-comidas">
        {plan.map(({ tm, receta: rid, reg }) => {
          const r = receta(rid);
          return (
            <article key={tm.id} className="cl-comida">
              <button type="button" className="cl-comida-foto" style={{ '--c': r.color }} onClick={() => setVer(rid)} aria-label={`Ver receta de ${r.nombre}`}><Leaf size={20} /></button>
              <div className="cl-comida-texto" onClick={() => setVer(rid)} role="presentation">
                <small>{tm.nombre} · {tm.hora}</small><b>{r.nombre}</b><span>{r.kcal} kcal · {r.min} min</span>
              </div>
              {!reg && <button type="button" className="cl-link chico" onClick={() => setCambiar(tm.id)}>Cambiar</button>}
            </article>
          );
        })}
      </div>
      {ver && <Receta rid={ver} alCerrar={() => setVer(null)} />}
      {cambiar && (
        <Ventana titulo={`${tiempo(cambiar).nombre} del ${new Date(dia).toLocaleDateString('es-MX', { weekday: 'long' })}`} sub="Opciones equivalentes que autorizó tu nutrióloga" alCerrar={() => setCambiar(null)} ancho={440}>
          <div className="cl-alternativas">
            {e.nutri.alternativas[cambiar].map((rid) => {
              const r = receta(rid);
              const actual = plan.find((x) => x.tm.id === cambiar).receta === rid;
              return (
                <button key={rid} type="button" className={`cl-alt ${actual ? 'activa' : ''}`} onClick={() => { elegirParaDia(dia, cambiar, rid); setCambiar(null); avisarListo('Listo, tu lista del súper ya lo toma en cuenta'); }}>
                  <span className="cl-alt-color" style={{ background: r.color }} />
                  <span><b>{r.nombre}</b><small>{r.kcal} kcal · {r.min} min</small></span>
                  {actual ? <ListChecks size={16} /> : <Check size={16} />}
                </button>
              );
            })}
          </div>
        </Ventana>
      )}
    </div>
  );
}

