import { useMemo, useState } from 'react';
import {
  Award, CalendarPlus, Check, ChevronRight, FileText, FileUp, Package, Pill, Printer, Share2, Sparkles, Wallet, X,
} from 'lucide-react';
import {
  DIENTES, DOCTORES, ESPECIALIDADES, NEGOCIO, PAQUETES, PASILLOS, SERVICIOS, SOFIA, abonarDental, aceptarPresupuesto, adherencia,
  agendar, ajustarAPresupuesto, aplicarCambiosSuper, cancelarCita, citasDe, confirmar, cuandoTexto, doctor, doctorDe, espacios,
  estadoDiente, fechaCorta, horaDe, imc, inicioDia, listaSuper, paciente, peso, procedimiento, r1, receta, reprogramar,
  saldoDental, servicio, subirEstudio, useClinica, ACTIVAS, DIAGNOSTICOS,
} from './datos';
import { Avatar, ChipEsp, ChipEstado, Linea, PagoPrueba, Ventana, avisarListo } from './comun';

// La otra mitad de la app de la paciente: Súper, Progreso y Mi clínica.

// ── súper ───────────────────────────────────────────────────────────────────
export function Super() {
  const e = useClinica();
  const [dias, setDias] = useState(7);
  const [tengo, setTengo] = useState({});
  const [presu, setPresu] = useState(String(e.nutri.presupuesto));
  const [ajuste, setAjuste] = useState(null);
  const lista = useMemo(() => listaSuper(e, dias, ajuste?.cambios || {}), [e, dias, ajuste]);
  const total = lista.reduce((n, x) => n + x.$, 0);
  const falta = lista.filter((x) => !tengo[x.n]).reduce((n, x) => n + x.$, 0);
  const meta = Number(presu) || 0;
  const texto = `Mi lista del súper (${dias} días):\n${PASILLOS.map((p) => { const xs = lista.filter((x) => x.p === p && !tengo[x.n]); return xs.length ? `\n${p}\n${xs.map((x) => `• ${x.n} — ${x.c} ${x.u}`).join('\n')}` : ''; }).join('')}`;
  return (
    <div className="cl-super">
      <section className="cl-saludo">
        <p className="cl-cejilla">Lista automática</p>
        <h1>Tu súper <em>de la semana</em></h1>
        <p className="cl-suave chico">Se arma sola con tu plan (y con lo que cambiaste). Marca lo que ya tienes.</p>
      </section>
      <div className="cl-seg">
        {[3, 7].map((n) => <button key={n} type="button" className={dias === n ? 'activa' : ''} onClick={() => { setDias(n); setAjuste(null); }}>{n} días</button>)}
      </div>

      <section className="cl-presupuesto">
        <div>
          <p className="cl-cejilla">Mi presupuesto, mi alimentación</p>
          <label className="cl-presu-campo"><span>$</span><input value={presu} onChange={(ev) => { setPresu(ev.target.value.replace(/\D/g, '')); setAjuste(null); }} inputMode="numeric" aria-label="Presupuesto de la semana" /><small>para {dias} días</small></label>
        </div>
        <div className={`cl-presu-total ${total > meta ? 'arriba' : 'ok'}`}>
          <small>Costo estimado</small><b>{peso(total)}</b>
          <span>{total > meta ? `${peso(total - meta)} arriba` : `${peso(meta - total)} debajo`}</span>
        </div>
        {total > meta && !ajuste && (
          <button type="button" className="cl-boton" onClick={() => setAjuste(ajustarAPresupuesto(e, meta, dias))}><Sparkles size={16} /> Ajustar a mi presupuesto</button>
        )}
        {ajuste && (
          <div className="cl-ajuste">
            <p><b>{ajuste.hechos.length} cambios</b> por opciones que ya autorizó tu nutrióloga: de {peso(ajuste.antes)} a {peso(ajuste.despues)}.</p>
            <ul>{ajuste.hechos.slice(0, 5).map((h) => <li key={h.k}>{new Date(inicioDia(h.d)).toLocaleDateString('es-MX', { weekday: 'short' })}: {receta(h.de).nombre} → <b>{receta(h.a).nombre}</b></li>)}</ul>
            {ajuste.hechos.length > 5 && <p className="cl-suave chico">y {ajuste.hechos.length - 5} más.</p>}
            {ajuste.despues > meta && <p className="cl-suave chico">Es lo más que se puede bajar sin salirte del plan.</p>}
            <div className="cl-fila">
              <button type="button" className="cl-boton" onClick={() => { aplicarCambiosSuper(ajuste.cambios); setAjuste(null); avisarListo('Tu plan y tu lista ya tienen los cambios'); }}>Usar estos cambios</button>
              <button type="button" className="cl-link" onClick={() => setAjuste(null)}>Deshacer</button>
            </div>
          </div>
        )}
        <p className="cl-nota">Precios estimados de mercado en Puebla. En el sistema real se actualizan o los captura la clínica.</p>
      </section>

      {PASILLOS.map((p) => {
        const xs = lista.filter((x) => x.p === p);
        if (!xs.length) return null;
        return (
          <section key={p} className="cl-pasillo">
            <h4>{p}</h4>
            {xs.map((x) => (
              <label key={x.n} className={`cl-item ${tengo[x.n] ? 'tachado' : ''}`}>
                <input type="checkbox" checked={!!tengo[x.n]} onChange={() => setTengo({ ...tengo, [x.n]: !tengo[x.n] })} />
                <span>{x.n}</span><small>{x.c} {x.u}</small><b>{peso(x.$)}</b>
              </label>
            ))}
          </section>
        );
      })}
      <div className="cl-super-pie">
        <span>Por comprar <b>{peso(falta)}</b></span>
        <a className="cl-boton" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"><Share2 size={16} /> Compartir lista</a>
      </div>
    </div>
  );
}

// ── progreso ────────────────────────────────────────────────────────────────
export function Progreso() {
  const e = useClinica();
  const [compartir, setCompartir] = useState(false);
  const m = e.nutri.mediciones;
  const ult = m[m.length - 1], pri = m[0];
  const etiquetas = m.map((x) => fechaCorta(x.t).replace('.', ''));
  const semanaAgua = Array.from({ length: 7 }, (_, i) => e.nutri.habitos[inicioDia(i - 6)]?.agua || 0);
  const adh = adherencia(e);
  const consultas = citasDe(e, SOFIA).filter((c) => c.estado === 'atendida' && doctor(c.doc).esp === 'nut').length;
  const LOGROS = [
    { ok: consultas >= 5, t: '5 consultas seguidas', s: 'Constancia' },
    { ok: pri.peso - ult.peso >= 3, t: `${r1(pri.peso - ult.peso)} kg menos`, s: 'Desde tu primera consulta' },
    { ok: adh >= 70, t: `${adh}% esta semana`, s: 'Siguiendo tu plan' },
    { ok: semanaAgua.filter((x) => x >= e.nutri.agua).length >= 3, t: 'Hidratada', s: '3 días con tu meta de agua' },
  ];
  return (
    <div className="cl-progreso">
      <section className="cl-saludo">
        <p className="cl-cejilla">{consultas} consultas · desde el {fechaCorta(pri.t)}</p>
        <h1>{r1(pri.peso - ult.peso)} kg menos, <em>{r1(pri.grasa - ult.grasa)}% menos grasa</em></h1>
        <p className="cl-suave chico">Y tu músculo subió {r1(ult.musculo - pri.musculo)} kg: bajaste lo que querías bajar.</p>
      </section>
      <div className="cl-grid2">
        <div className="cl-caja"><small>Peso</small><b>{ult.peso} kg</b><Linea puntos={m.map((x) => x.peso)} unidad="" etiquetas={etiquetas} /></div>
        <div className="cl-caja"><small>Grasa corporal</small><b>{ult.grasa}%</b><Linea puntos={m.map((x) => x.grasa)} unidad="%" color="#C9792B" etiquetas={etiquetas} /></div>
        <div className="cl-caja"><small>Cintura</small><b>{ult.cintura} cm</b><Linea puntos={m.map((x) => x.cintura)} unidad="" color="#2F62A8" etiquetas={etiquetas} /></div>
        <div className="cl-caja"><small>Agua · últimos 7 días</small><b>{semanaAgua[6]}/{e.nutri.agua} hoy</b>
          <div className="cl-barras">{semanaAgua.map((v, i) => <i key={i} style={{ height: `${(v / 10) * 100}%` }} className={v >= e.nutri.agua ? 'meta' : ''} title={`${v} vasos`} />)}</div>
        </div>
      </div>
      <section>
        <div className="cl-titulo-sec"><h2>Logros</h2></div>
        <div className="cl-logros">{LOGROS.map((l) => <div key={l.t} className={`cl-logro ${l.ok ? 'si' : ''}`}><Award size={20} /><b>{l.t}</b><small>{l.s}</small></div>)}</div>
      </section>
      <p className="cl-suave chico">IMC {imc(ult.peso, e.nutri.estatura)} · Las mediciones las toma tu nutrióloga en cada consulta.</p>
      <button type="button" className="cl-boton linea" onClick={() => setCompartir(true)}><Share2 size={16} /> Compartir mis avances</button>
      {compartir && (
        <Ventana titulo="Tus avances" sub="Tú decides si lo compartes. No lleva datos médicos." alCerrar={() => setCompartir(false)} ancho={380}>
          <div className="cl-tarjeta-logro">
            <p className="cl-cejilla claro">{NEGOCIO.nombre} · {consultas} consultas</p>
            <b>−{r1(pri.peso - ult.peso)} kg</b>
            <span>−{r1(pri.cintura - ult.cintura)} cm de cintura</span>
            <small>Constancia &gt; perfección</small>
          </div>
          <button type="button" className="cl-boton grande" onClick={() => { avisarListo('Imagen lista para compartir'); setCompartir(false); }}><Share2 size={16} /> Descargar imagen</button>
        </Ventana>
      )}
    </div>
  );
}

// ── mi clínica ──────────────────────────────────────────────────────────────
export function MiClinica() {
  const e = useClinica();
  const yo = paciente(e, SOFIA);
  const [agendarA, setAgendarA] = useState(false);
  const [cita, setCita] = useState(null);
  const [rx, setRx] = useState(null);
  const [dental, setDental] = useState(false);
  const proximas = citasDe(e, SOFIA).filter((c) => ACTIVAS.includes(c.estado));
  const pasadas = citasDe(e, SOFIA).filter((c) => !ACTIVAS.includes(c.estado)).reverse().slice(0, 6);
  const recetas = (e.medico[SOFIA] || []).filter((x) => x.receta).reverse();
  const sd = saldoDental(e, SOFIA);
  const pq = yo.paquete;
  return (
    <div className="cl-miclinica">
      <section className="cl-saludo">
        <p className="cl-cejilla">{NEGOCIO.completo}</p>
        <h1>Tu salud, <em>en un solo lugar</em></h1>
      </section>
      <button type="button" className="cl-boton grande" onClick={() => setAgendarA(true)}><CalendarPlus size={18} /> Agendar una cita</button>

      <section>
        <div className="cl-titulo-sec"><h2>Próximas citas</h2></div>
        {!proximas.length && <p className="cl-suave chico">No tienes citas. Agenda la siguiente.</p>}
        {proximas.map((c) => (
          <button key={c.id} type="button" className="cl-cita-fila" onClick={() => setCita(c.id)}>
            <Avatar nombre={doctor(c.doc).nombre} size={40} color={ESPECIALIDADES.find((x) => x.id === doctor(c.doc).esp).color} />
            <span><b>{servicio(c.serv).nombre}</b><small>{cuandoTexto(c.inicio)} · {doctor(c.doc).nombre}</small></span>
            <ChipEstado estado={c.estado} />
          </button>
        ))}
      </section>

      {pq && (
        <section className="cl-paquete">
          <Package size={20} />
          <span><b>{PAQUETES.find((x) => x.id === pq.id).nombre}</b><small>Te quedan {pq.total - pq.usadas} de {pq.total} consultas de nutrición</small></span>
          <div className="cl-paquete-puntos">{Array.from({ length: pq.total }, (_, i) => <i key={i} className={i < pq.usadas ? 'usada' : ''} />)}</div>
        </section>
      )}

      {e.dental[SOFIA] && (
        <button type="button" className="cl-tarjeta-dental" onClick={() => setDental(true)}>
          <span className="cl-diente-icono">🦷</span>
          <span><b>Tu tratamiento dental</b><small>{e.dental[SOFIA].plan.filter((x) => x.estado === 'pendiente').length} procedimientos pendientes · saldo {peso(sd.saldo)}</small></span>
          <ChevronRight size={18} />
        </button>
      )}

      {recetas.length > 0 && (
        <section>
          <div className="cl-titulo-sec"><h2>Recetas</h2></div>
          {recetas.map((r) => (
            <button key={r.t} type="button" className="cl-cita-fila" onClick={() => setRx(r)}>
              <span className="cl-icono-redondo"><Pill size={18} /></span>
              <span><b>Receta {r.receta.folio}</b><small>{doctor(r.doc).nombre} · {fechaCorta(r.t)} · {r.receta.meds.length} medicamento{r.receta.meds.length > 1 ? 's' : ''}</small></span>
              <ChevronRight size={16} />
            </button>
          ))}
        </section>
      )}

      <section>
        <div className="cl-titulo-sec"><h2>Mis estudios</h2><button type="button" className="cl-link" onClick={() => { subirEstudio('Química sanguínea de control'); avisarListo('Estudio compartido con tu nutrióloga y tu médico'); }}><FileUp size={14} /> Subir</button></div>
        {e.nutri.estudios.map((s) => (
          <div key={s.id} className="cl-estudio">
            <FileText size={18} />
            <span><b>{s.nombre}</b><small>{fechaCorta(s.t)} · lo ven tu nutrióloga y tu médico</small></span>
          </div>
        ))}
      </section>

      {pasadas.length > 0 && (
        <section>
          <div className="cl-titulo-sec"><h2>Historial</h2></div>
          {pasadas.map((c) => <p key={c.id} className="cl-historial"><ChipEsp esp={doctor(c.doc).esp} /> {servicio(c.serv).nombre} · {fechaCorta(c.inicio)} <ChipEstado estado={c.estado} /></p>)}
        </section>
      )}

      {agendarA && <Agendar alCerrar={() => setAgendarA(false)} />}
      {cita && <CitaPaciente cid={cita} alCerrar={() => setCita(null)} />}
      {rx && <RecetaMedica r={rx} pac={yo} alCerrar={() => setRx(null)} />}
      {dental && <DentalPaciente alCerrar={() => setDental(false)} />}
    </div>
  );
}

// agenda en línea: especialidad → servicio → día → hora → pago
export function Agendar({ alCerrar, preEsp, reprogramarId }) {
  const e = useClinica();
  const yo = paciente(e, SOFIA);
  const original = reprogramarId ? e.citas.find((c) => c.id === reprogramarId) : null;
  const [esp, setEsp] = useState(original ? doctor(original.doc).esp : preEsp || null);
  const [serv, setServ] = useState(original?.serv || null);
  const [dia, setDia] = useState(null);
  const [hora, setHora] = useState(null);
  const [pagar, setPagar] = useState(false);
  const doc = esp ? doctorDe(esp) : null;
  const sv = serv ? servicio(serv) : null;
  const dias = Array.from({ length: 14 }, (_, i) => inicioDia(i)).filter((d) => doc && espacios(e, doc.id, d, sv?.min || 45).length);
  const horas = doc && dia ? espacios(e, doc.id, dia, sv?.min || 45, sv?.min >= 45 ? 30 : 15) : [];
  const conPaquete = esp === 'nut' && yo.paquete && yo.paquete.usadas < yo.paquete.total && serv !== 'nut-1';
  const terminar = (metodo) => {
    if (original) {
      const r = reprogramar(original.id, hora);
      if (r?.error) { avisarListo('Ese horario se acaba de ocupar'); return; }
      avisarListo(`Cambiada a ${cuandoTexto(hora)}`);
    } else {
      const r = agendar({ pac: SOFIA, doc: doc.id, serv, inicio: hora, origen: 'web', anticipo: metodo === 'paquete' || !sv.precio ? 0 : NEGOCIO.anticipo, metodo, paquete: metodo === 'paquete' });
      if (r?.error) { avisarListo('Ese horario se acaba de ocupar'); return; }
      avisarListo('¡Listo! Te llega la confirmación por WhatsApp');
    }
    alCerrar();
  };
  return (
    <Ventana titulo={original ? 'Cambiar tu cita' : 'Agendar cita'} sub={NEGOCIO.completo} alCerrar={alCerrar} ancho={520}>
      <div className="cl-form">
        {!original && (
          <div className="cl-especialidades">
            {ESPECIALIDADES.map((x) => (
              <button key={x.id} type="button" className={esp === x.id ? 'activa' : ''} style={{ '--c': x.color, '--s': x.suave }} onClick={() => { setEsp(x.id); setServ(null); setDia(null); setHora(null); }}>
                <b>{x.nombre}</b><small>{doctorDe(x.id).nombre}</small>
              </button>
            ))}
          </div>
        )}
        {esp && !original && (
          <div className="cl-servicios">
            {SERVICIOS.filter((s) => s.esp === esp).map((s) => (
              <button key={s.id} type="button" className={serv === s.id ? 'activa' : ''} onClick={() => { setServ(s.id); setDia(null); setHora(null); }}>
                <span><b>{s.nombre}</b><small>{s.nota} · {s.min} min</small></span><b>{s.precio ? peso(s.precio) : 'Según plan'}</b>
              </button>
            ))}
          </div>
        )}
        {serv && (
          <>
            <div className="cl-dias">
              {dias.slice(0, 10).map((d) => <button key={d} type="button" className={dia === d ? 'activa' : ''} onClick={() => { setDia(d); setHora(null); }}><small>{d === inicioDia(0) ? 'Hoy' : new Date(d).toLocaleDateString('es-MX', { weekday: 'short' })}</small><b>{new Date(d).getDate()}</b></button>)}
            </div>
            {dia && <div className="cl-horas">{horas.map((t) => <button key={t} type="button" className={hora === t ? 'activa' : ''} onClick={() => setHora(t)}>{horaDe(t)}</button>)}{!horas.length && <p className="cl-suave chico">Sin horarios este día.</p>}</div>}
          </>
        )}
        {hora && !pagar && (
          <div className="cl-confirmar">
            <p><b>{sv.nombre}</b> con {doc.nombre}<br />{cuandoTexto(hora)} · {doc.consultorio}</p>
            {original ? <button type="button" className="cl-boton grande" onClick={() => terminar(null)}>Cambiar a este horario</button>
              : conPaquete ? <button type="button" className="cl-boton grande" onClick={() => terminar('paquete')}><Package size={16} /> Usar mi paquete ({yo.paquete.total - yo.paquete.usadas} disponibles)</button>
                : sv.precio ? <button type="button" className="cl-boton grande" onClick={() => setPagar(true)}><Wallet size={16} /> Apartar con {peso(NEGOCIO.anticipo)}</button>
                  : <button type="button" className="cl-boton grande" onClick={() => terminar(null)}>Confirmar cita</button>}
            {!original && sv.precio > 0 && !conPaquete && <p className="cl-nota centro">El resto ({peso(sv.precio - NEGOCIO.anticipo)}) lo pagas en la clínica. Cancela gratis hasta 24 h antes.</p>}
          </div>
        )}
        {pagar && <PagoPrueba monto={NEGOCIO.anticipo} texto="Apartar mi cita" alPagar={() => terminar('tarjeta')} />}
      </div>
    </Ventana>
  );
}

function CitaPaciente({ cid, alCerrar }) {
  const e = useClinica();
  const c = e.citas.find((x) => x.id === cid);
  const [cambiar, setCambiar] = useState(false);
  const [seguro, setSeguro] = useState(false);
  if (!c) return null;
  if (cambiar) return <Agendar reprogramarId={c.id} alCerrar={alCerrar} />;
  const doc = doctor(c.doc);
  const cal = `data:text/calendar;charset=utf-8,${encodeURIComponent(`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${servicio(c.serv).nombre} · ${NEGOCIO.nombre}\nDTSTART:${new Date(c.inicio).toISOString().replace(/[-:]/g, '').slice(0, 15)}Z\nDURATION:PT${c.min}M\nLOCATION:${NEGOCIO.direccion}\nEND:VEVENT\nEND:VCALENDAR`)}`;
  return (
    <Ventana titulo={servicio(c.serv).nombre} sub={`${doc.nombre} · ${doc.consultorio}`} alCerrar={alCerrar} ancho={440}>
      <div className="cl-form">
        <p className="cl-cita-grande"><b>{cuandoTexto(c.inicio)}</b><ChipEstado estado={c.estado} /></p>
        <p className="cl-suave chico">{NEGOCIO.direccion}{c.paquete ? ' · usa tu paquete' : c.anticipo ? ` · apartaste con ${peso(c.anticipo)}` : ''}</p>
        {c.estado === 'agendada' && <button type="button" className="cl-boton" onClick={() => { confirmar(c.id); avisarListo('Cita confirmada'); }}><Check size={16} /> Confirmar asistencia</button>}
        <div className="cl-fila">
          <button type="button" className="cl-boton linea" onClick={() => setCambiar(true)}>Cambiar horario</button>
          <a className="cl-boton linea" href={cal} download="cita.ics">Agregar a mi calendario</a>
        </div>
        {!seguro ? <button type="button" className="cl-link gris" onClick={() => setSeguro(true)}>Cancelar cita</button> : (
          <div className="cl-nota-ambar">
            <span>¿Cancelar? Tu lugar se le ofrece a alguien en lista de espera.{c.anticipo ? ' Te regresamos el anticipo.' : ''}
              <button type="button" className="cl-boton chico rojo" onClick={() => { cancelarCita(c.id, 'paciente'); avisarListo('Cita cancelada'); alCerrar(); }}>Sí, cancelar</button>
            </span>
          </div>
        )}
      </div>
    </Ventana>
  );
}

export function RecetaMedica({ r, pac, alCerrar }) {
  const doc = doctor(r.doc);
  return (
    <Ventana titulo={`Receta ${r.receta.folio}`} alCerrar={alCerrar} ancho={520}>
      <div className="cl-receta-medica cl-imprimir">
        <div className="cl-rx-cab">
          <div><b>{doc.nombre}</b><small>{doc.titulo} · Céd. prof. {doc.cedula}</small><small>{NEGOCIO.completo} · {NEGOCIO.direccion} · {NEGOCIO.telefono}</small></div>
          <span className="cl-rx">Rx</span>
        </div>
        <p className="cl-rx-pac"><span>Paciente: <b>{pac.nombre}</b></span><span>Fecha: {fechaCorta(r.t)}</span></p>
        {r.signos && <p className="cl-rx-signos">TA {r.signos.ta} · FC {r.signos.fc} · T {r.signos.temp} °C · SpO₂ {r.signos.spo2}% · Peso {r.signos.peso} kg</p>}
        {r.dx?.length > 0 && <p className="cl-rx-dx">Dx: {r.dx.map((k) => DIAGNOSTICOS.find((x) => x[0] === k)?.[1]).join(', ')}</p>}
        <ol className="cl-rx-meds">{r.receta.meds.map((m) => <li key={m.m}><b>{m.m}</b><span>{m.dosis} {m.frec} por {m.dias} días</span></li>)}</ol>
        {r.plan && <p className="cl-rx-plan">{r.plan}</p>}
        <div className="cl-rx-firma"><span>Firma electrónica</span><b>{doc.nombre}</b></div>
      </div>
      <button type="button" className="cl-boton linea" onClick={() => window.print()}><Printer size={16} /> Imprimir o guardar PDF</button>
    </Ventana>
  );
}

function DentalPaciente({ alCerrar }) {
  const e = useClinica();
  const d = e.dental[SOFIA];
  const sd = saldoDental(e, SOFIA);
  const [abono, setAbono] = useState(null);
  const [agendarA, setAgendarA] = useState(false);
  if (agendarA) return <Agendar preEsp="den" alCerrar={alCerrar} />;
  return (
    <Ventana titulo="Tu tratamiento dental" sub={`${doctor('paula').nombre} · ${NEGOCIO.nombre}`} alCerrar={alCerrar} ancho={560}>
      <div className="cl-form">
        <MiniOdontograma dientes={d.dientes} />
        <div className="cl-plan-dental">
          {d.plan.map((x) => (
            <p key={x.id} className={x.estado}><span>{x.diente ? `Diente ${x.diente} · ` : ''}{procedimiento(x.proc).nombre}</span><b>{peso(x.precio)}</b>{x.estado === 'hecho' ? <Check size={15} /> : <i />}</p>
          ))}
        </div>
        <div className="cl-saldo">
          <span><small>Total</small><b>{peso(sd.total)}</b></span>
          <span><small>Abonado</small><b>{peso(sd.abonado)}</b></span>
          <span><small>Saldo</small><b>{peso(sd.saldo)}</b></span>
        </div>
        {!d.aceptado ? <button type="button" className="cl-boton" onClick={() => { aceptarPresupuesto(SOFIA); avisarListo('Presupuesto aceptado'); }}><Check size={16} /> Aceptar presupuesto</button> : <p className="cl-ok"><Check size={15} /> Presupuesto aceptado el {fechaCorta(d.aceptado)}</p>}
        <div className="cl-fila">
          <button type="button" className="cl-boton linea" onClick={() => setAbono(1000)}><Wallet size={16} /> Abonar</button>
          <button type="button" className="cl-boton linea" onClick={() => setAgendarA(true)}><CalendarPlus size={16} /> Agendar siguiente cita</button>
        </div>
        {abono != null && (
          <>
            <div className="cl-rapidas">{[500, 1000, 2000, sd.saldo].map((m) => <button key={m} type="button" className={abono === m ? 'activa' : ''} onClick={() => setAbono(m)}>{m === sd.saldo ? `Todo (${peso(m)})` : peso(m)}</button>)}</div>
            <PagoPrueba monto={abono} texto="Abonar" alPagar={() => { abonarDental(SOFIA, abono, 'tarjeta'); avisarListo(`Abono de ${peso(abono)} registrado`); setAbono(null); }} />
          </>
        )}
      </div>
    </Ventana>
  );
}

export function MiniOdontograma({ dientes, alTocar, sel }) {
  const D = (n) => {
    const st = estadoDiente(dientes[n]);
    return (
      <button key={n} type="button" className={`cl-diente ${sel === n ? 'sel' : ''} ${st.id}`} onClick={alTocar ? () => alTocar(n) : undefined} disabled={!alTocar} title={`${n} · ${st.nombre}`} style={{ '--d': st.color }}>
        <svg viewBox="0 0 24 30" aria-hidden="true"><path d="M5 3c3-2 5 0 7 0s4-2 7 0c3 2 2 8 0 12-1 3-1 9-3 12-1 1-2 0-2-2l-1-6c0-1-2-1-2 0l-1 6c0 2-1 3-2 2-2-3-2-9-3-12C3 11 2 5 5 3Z" /></svg>
        <small>{n}</small>
      </button>
    );
  };
  return (
    <div className="cl-odontograma">
      <div className="cl-arcada">{DIENTES.arriba.map(D)}</div>
      <div className="cl-arcada abajo">{DIENTES.abajo.map(D)}</div>
    </div>
  );
}

