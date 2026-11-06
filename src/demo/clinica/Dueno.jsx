import { useState } from 'react';
import { MessageCircle, RefreshCw } from 'lucide-react';
import {
  DOCTORES, ESPECIALIDADES, NEGOCIO, SERVICIOS, bloquesDelDia, citasDe, doctor, especialidad, fechaCorta, fechaLarga, inicioDia,
  inicioDiaDe, ingresos, peso, saldoDental, servicio, useClinica,
} from './datos';
import { Avatar, BotonPantalla, Logo, avisarListo, useAhora } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// DUEÑO — cómo va la clínica: ingresos por especialidad, ocupación de cada
// agenda, citas perdidas, de dónde llegan las citas, pacientes que no han
// vuelto (con mensaje para recuperarlos) y lo que falta por cobrar.
// Gráficas en SVG a mano.
// ─────────────────────────────────────────────────────────────────────────────

const DIA = 86400000;

export default function Dueno() {
  const e = useClinica();
  useAhora(15000);
  const [sobre, setSobre] = useState(null);
  const desde = inicioDia(-29);
  const hoy = inicioDia(0);
  const fin = inicioDia(1);
  const citas30 = e.citas.filter((c) => c.inicio >= desde && c.inicio < fin);
  const atendidas = citas30.filter((c) => c.estado === 'atendida');
  const perdidas = citas30.filter((c) => c.estado === 'no-asistio');
  const ing30 = ingresos(e, desde, fin);
  const ingPrev = ingresos(e, inicioDia(-59), desde) || 1;
  // ocupación: minutos agendados / minutos disponibles en 30 días
  const disponible = () => { let m = 0; for (let d = -29; d <= 0; d += 1) bloquesDelDia(inicioDia(d)).forEach(([a, b]) => { m += (b - a) * 60; }); return m || 1; };
  const ocup = (docId) => Math.round((citas30.filter((c) => c.doc === docId && c.estado !== 'cancelada').reduce((n, c) => n + c.min, 0) / disponible(docId)) * 100);
  const nuevos = e.pacientes.filter((p) => p.alta >= desde).length;

  // 30 días apilado por especialidad
  const dias = Array.from({ length: 30 }, (_, i) => inicioDia(i - 29));
  const serie = dias.map((d) => ({ d, ...Object.fromEntries(ESPECIALIDADES.map((x) => [x.id, ingresos(e, d, d + DIA, doctorDe(x.id))])) }));
  const maxS = Math.max(1, ...serie.map((s) => ESPECIALIDADES.reduce((n, x) => n + s[x.id], 0)));
  const W = 660, H = 160, paso = W / serie.length;

  // origen de las citas
  const origen = ['web', 'whatsapp', 'recepcion', 'espera'].map((o) => ({ o, n: citas30.filter((c) => c.origen === o).length }));
  const totO = origen.reduce((n, x) => n + x.n, 0) || 1;
  const NOMBRE_O = { web: 'Agenda en línea', whatsapp: 'WhatsApp', recepcion: 'Recepción', espera: 'Lista de espera' };

  // servicios más pedidos
  const servs = SERVICIOS.map((s) => ({ s, n: atendidas.filter((c) => c.serv === s.id).length })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 6);
  const maxSv = servs[0]?.n || 1;

  // pacientes que no han vuelto (última visita hace 45+ días y sin cita futura)
  const perdidosP = e.pacientes.map((p) => {
    const cs = citasDe(e, p.id);
    const ult = cs.filter((c) => c.estado === 'atendida').slice(-1)[0];
    const futura = cs.some((c) => c.inicio > Date.now() && c.estado !== 'cancelada');
    return { p, ult, futura };
  }).filter((x) => x.ult && !x.futura && Date.now() - x.ult.inicio > 21 * DIA).sort((a, b) => a.ult.inicio - b.ult.inicio).slice(0, 6);

  const porCobrarDental = Object.keys(e.dental).reduce((n, pid) => n + Math.max(0, saldoDental(e, pid).saldo), 0);
  const recuperadas = e.citas.filter((c) => c.recuperada);
  const canceladas = citas30.filter((c) => c.estado === 'cancelada').length;
  const paquetes = e.pacientes.filter((p) => p.paquete && p.paquete.usadas < p.paquete.total).length;
  const hoyCitas = e.citas.filter((c) => inicioDiaDe(c.inicio) === hoy && c.estado !== 'cancelada');

  return (
    <div className="cl-panel">
      <header className="cl-panel-cab"><Logo /><span className="cl-panel-rol">Dueño</span><BotonPantalla /></header>
      <div className="cl-panel-sub"><div><p className="cl-cejilla">{fechaLarga()} · últimos 30 días</p><h2>{NEGOCIO.completo}</h2></div></div>
      <div className="cl-panel-cuerpo cl-dueno">
        <div className="cl-kpis">
          <div className="cl-kpi grande"><small>Ingresos · 30 días</small><b>{peso(ing30)}</b><span>{ing30 >= ingPrev ? '▲' : '▼'} {Math.abs(Math.round((ing30 / ingPrev - 1) * 100))}% vs. los 30 anteriores</span></div>
          <div className="cl-kpi"><small>Consultas atendidas</small><b>{atendidas.length}</b><span>hoy {hoyCitas.length} en agenda</span></div>
          <div className="cl-kpi"><small>No asistieron</small><b>{Math.round((perdidas.length / Math.max(1, perdidas.length + atendidas.length)) * 100)}%</b><span>{perdidas.length} citas · {peso(perdidas.reduce((n, c) => n + c.precio, 0))} que no entraron</span></div>
          <div className="cl-kpi"><small>Pacientes nuevos</small><b>{nuevos}</b><span>{paquetes} con paquete activo</span></div>
        </div>

        <section className="cl-caja">
          <div className="cl-titulo-sec"><h4>Ingresos por día</h4><small className="cl-leyenda">{ESPECIALIDADES.map((x) => <span key={x.id}><i style={{ background: x.color }} />{x.corto}</span>)}</small></div>
          <div className="cl-svg">
            <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label="Ingresos por día de los últimos 30 días por especialidad">
              {serie.map((s, i) => {
                let y = H;
                return (
                  <g key={s.d} onMouseEnter={() => setSobre(i)} onMouseLeave={() => setSobre(null)}>
                    <rect x={i * paso} y="0" width={paso} height={H} fill="transparent" />
                    {ESPECIALIDADES.map((x) => { const h = (s[x.id] / maxS) * H * 0.92; y -= h; return <rect key={x.id} x={i * paso + paso * 0.18} y={y} width={paso * 0.64} height={h} fill={x.color} opacity={s.d === hoy ? 0.55 : 1} rx="1.5" />; })}
                    {(new Date(s.d).getDay() === 1 || s.d === hoy) && <text x={i * paso + paso / 2} y={H + 14} textAnchor="middle" className="cl-linea-eje">{s.d === hoy ? 'Hoy' : fechaCorta(s.d).replace('.', '')}</text>}
                  </g>
                );
              })}
            </svg>
            {sobre != null && (
              <div className="cl-tooltip" style={{ left: `${((sobre + 0.5) / serie.length) * 100}%` }}>
                <b>{serie[sobre].d === hoy ? 'Hoy' : fechaCorta(serie[sobre].d)}</b>
                {ESPECIALIDADES.map((x) => <span key={x.id}>{x.corto} {peso(serie[sobre][x.id])}</span>)}
              </div>
            )}
          </div>
        </section>

        <section className="cl-caja">
          <h4>Por doctor</h4>
          <div className="cl-doctores">
            {DOCTORES.map((d) => {
              const suyas = atendidas.filter((c) => c.doc === d.id);
              const ing = ingresos(e, desde, fin, d.id);
              const o = ocup(d.id);
              return (
                <div key={d.id} className="cl-doc-fila" style={{ '--c': especialidad(d.esp).color }}>
                  <Avatar nombre={d.nombre} size={38} color={especialidad(d.esp).color} />
                  <span><b>{d.nombre}</b><small>{especialidad(d.esp).nombre} · {suyas.length} consultas · {perdidas.filter((c) => c.doc === d.id).length} no asistieron</small></span>
                  <span className="cl-ocup"><span className="cl-barrita"><i style={{ width: `${o}%` }} /></span><small>{o}% de su agenda ocupada</small></span>
                  <b className="mono">{peso(ing)}</b>
                </div>
              );
            })}
          </div>
        </section>

        <div className="cl-grid3">
          <section className="cl-caja">
            <h4>De dónde llegan las citas</h4>
            {origen.map(({ o, n }) => (
              <div key={o} className="cl-barra-h"><span>{NOMBRE_O[o]}</span><span className="cl-barrita"><i style={{ width: `${(n / totO) * 100}%` }} /></span><b>{Math.round((n / totO) * 100)}%</b></div>
            ))}
            <p className="cl-nota">Lo que entra en línea y por la lista de espera no le quita tiempo a recepción.</p>
          </section>
          <section className="cl-caja">
            <h4>Lo más pedido</h4>
            {servs.map(({ s, n }) => (
              <div key={s.id} className="cl-barra-h"><span>{s.nombre}</span><span className="cl-barrita"><i style={{ width: `${(n / maxSv) * 100}%`, background: especialidad(s.esp).color }} /></span><b>{n}</b></div>
            ))}
          </section>
          <section className="cl-caja">
            <h4>Agenda que se salvó</h4>
            <p className="cl-grande-num"><RefreshCw size={18} /> {recuperadas.length}</p>
            <p className="cl-suave chico">citas recuperadas de la lista de espera · {peso(recuperadas.reduce((n, c) => n + c.precio, 0))} que se habrían perdido. {canceladas} cancelaciones en 30 días.</p>
            <h4>Por cobrar</h4>
            <p className="cl-fila-precio"><span>Tratamientos dentales</span><b>{peso(porCobrarDental)}</b></p>
          </section>
        </div>

        <section className="cl-caja">
          <h4>Pacientes que no han vuelto</h4>
          <p className="cl-suave chico">Su última consulta fue hace más de 3 semanas y no tienen cita. Un mensaje a tiempo los regresa.</p>
          {perdidosP.map(({ p, ult }) => {
            const msg = `Hola ${p.nombre.split(' ')[0]}, te saludamos de ${NEGOCIO.nombre}. Ya toca tu seguimiento de ${especialidad(doctor(ult.doc).esp).nombre.toLowerCase()}. ¿Te apartamos un espacio esta semana?`;
            return (
              <div key={p.id} className="cl-perdido">
                <Avatar nombre={p.nombre} size={32} />
                <span><b>{p.nombre}</b><small>{servicio(ult.serv).nombre} · {fechaCorta(ult.inicio)} con {doctor(ult.doc).corto}</small></span>
                <a className="cl-boton chico linea" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" onClick={() => avisarListo('Mensaje listo en WhatsApp')}><MessageCircle size={14} /> Invitar</a>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

const doctorDe = (esp) => DOCTORES.find((d) => d.esp === esp).id;
