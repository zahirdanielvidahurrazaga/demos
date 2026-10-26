import { useRef, useState } from 'react';
import { Brain, CloudRain, Megaphone, Plus, Projector, Ticket, UtensilsCrossed, X } from 'lucide-react';
import {
  BOLETOS, CUPO_TOTAL, PELICULAS, PROPUESTAS, cancelarPorLluvia, climaDe, funcionesDelDia, marcarCotizacion, rankingTrivia, reanudarFuncion, crearFuncion, diaCorto, dinero, hora, inicioDia, mandarAviso, nombreLugar,
  ocupacion, platillo, useCine, ventasDe,
} from './datos';
import { Controles, avisarListo, minutos, useAhora } from './comun';
import { useDialogo } from '../sorteos/comun';

// ─────────────────────────────────────────────────────────────────────────────
// DUEÑO — la noche en números: boletos y comida en un solo lugar (hoy viven en
// dos sistemas distintos), ocupación por función, mezcla de boletos, lo más
// pedido, avisos a todos los de una función (lluvia, cambio de horario) y
// alta de funciones.
// ─────────────────────────────────────────────────────────────────────────────

export default function Dueno() {
  const e = useCine();
  const ahora = useAhora(20000);
  const [aviso, setAviso] = useState(null);
  const [nueva, setNueva] = useState(false);
  const hoy0 = inicioDia(0);

  const ventasHoy = e.ventas.filter((v) => v.t >= hoy0);
  const comidaHoy = e.ordenes.filter((o) => o.t >= hoy0);
  const boletosHoy = ventasHoy.reduce((n, v) => n + v.total, 0);
  const comidaTotal = comidaHoy.reduce((n, o) => n + o.total, 0);
  const estaNoche = e.funciones.filter((f) => f.t >= hoy0 && f.t < inicioDia(1));
  const ocNoche = estaNoche.length ? estaNoche.reduce((n, f) => n + ventasDe(e, f.id).length, 0) / (CUPO_TOTAL * estaNoche.length) : 0;
  const adentro = estaNoche.flatMap((f) => ventasDe(e, f.id)).filter((v) => v.entro).length;
  const porAuto = adentro ? comidaTotal / adentro : 0;

  const semana = e.funciones.filter((f) => f.t >= hoy0);
  const ventasSemana = semana.flatMap((f) => ventasDe(e, f.id));
  const mezcla = BOLETOS.map((b) => ({ b, n: ventasSemana.filter((v) => v.tipo === b.id).length })).sort((a, b) => b.n - a.n);
  const conteo = {};
  e.ordenes.forEach((o) => o.items.forEach(([pid, q]) => { conteo[pid] = (conteo[pid] || 0) + q; }));
  const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const feed = [
    ...e.ventas.filter((v) => ahora - v.t < 3 * 3600000).map((v) => ({ t: v.t, Icon: Ticket, texto: <>{v.nombre} compró <b>{BOLETOS.find((b) => b.id === v.tipo).nombre}</b> · {nombreLugar(v.lugar)}</>, monto: v.total })),
    ...comidaHoy.map((o) => ({ t: o.t, Icon: UtensilsCrossed, texto: <>Pedido #{o.numero} a <b>{nombreLugar(o.lugar)}</b></>, monto: o.total })),
  ].sort((a, b) => b.t - a.t).slice(0, 25);

  return (
    <div className="ac-envoltura ac-panel">
      <div className="ac-panel-cab">
        <div><p className="ac-etiqueta">Dirección</p><h1>Hoy en el Cocodrilo</h1></div>
        <div className="ac-der"><button type="button" className="ac-btn chico" onClick={() => setNueva(true)}><Plus size={15} /> Nueva función</button><Controles vidrio={false} /></div>
      </div>

      <div className="ac-kpis">
        <div className="ac-tarjeta ac-kpi verde"><small>Boletos vendidos hoy</small><b>{dinero(boletosHoy)}</b><small>{ventasHoy.length} boletos</small></div>
        <div className="ac-tarjeta ac-kpi"><small>Fuente de sodas hoy</small><b>{dinero(comidaTotal)}</b><small>{comidaHoy.length} pedidos</small></div>
        <div className="ac-tarjeta ac-kpi rosa"><small>Ocupación de esta noche</small><b>{Math.round(ocNoche * 100)}%</b><small>{estaNoche.length} funciones</small></div>
        <div className="ac-tarjeta ac-kpi"><small>Comida por auto adentro</small><b>{dinero(porAuto)}</b><small>{adentro} ya llegaron</small></div>
      </div>

      <div className="ac-dueno">
        <div className="ac-tarjeta ac-caja ancho">
          <h3>Ventas de los últimos 15 días <span className="ac-leyenda-g">
            <span><i style={{ background: 'var(--ac-acento)' }} />Boletos</span>
            <span><i style={{ background: 'var(--ac-ambar)' }} />Comida</span>
          </span></h3>
          <Grafica dias={[...e.historial, { dia: hoy0, boletos: boletosHoy, comida: comidaTotal, hoy: true }]} />
        </div>

        <div className="ac-tarjeta ac-caja">
          <h3>Funciones de la semana</h3>
          <div className="ac-tabla-scroll">
            <table className="ac-tabla">
              <thead><tr><th>Función</th><th>Ocupación</th><th>Boletos</th><th /></tr></thead>
              <tbody>
                {semana.map((f) => {
                  const oc = ocupacion(e, f.id);
                  const total = ventasDe(e, f.id).reduce((n, v) => n + v.total, 0);
                  return (
                    <tr key={f.id}>
                      <td><b>{PELICULAS[f.peli].titulo}</b><div className="ac-suave" style={{ fontSize: 12.5 }}>{diaCorto(f.t)} · {hora(f.t)}</div></td>
                      <td style={{ minWidth: 120 }}><div className={`ac-barra-oc ${oc > 0.8 ? 'alta' : ''}`}><i style={{ width: `${oc * 100}%` }} /></div><span className="ac-suave" style={{ fontSize: 12 }}>{Math.round(oc * 100)}% · {ventasDe(e, f.id).length}/{CUPO_TOTAL}</span></td>
                      <td className="ac-mono">{dinero(total)}</td>
                      <td><button type="button" className="ac-btn fantasma chico" onClick={() => setAviso(f)} title="Avisar a todos los de esta función"><Megaphone size={14} /> Avisar</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="ac-tarjeta ac-caja">
            <h3>Qué boletos se venden <span className="ac-suave" style={{ fontSize: 12.5, fontWeight: 500 }}>esta semana</span></h3>
            <div className="ac-barras-h">
              {mezcla.map(({ b, n }) => (
                <div key={b.id}><span>{b.nombre}</span><b className="ac-mono">{n}</b><i><span className={b.destacado ? 'ambar' : ''} style={{ width: `${(n / (mezcla[0].n || 1)) * 100}%` }} /></i></div>
              ))}
            </div>
          </div>
          <div className="ac-tarjeta ac-caja">
            <h3>Cocopuntos <span className="ac-suave" style={{ fontSize: 13, fontWeight: 400 }}>programa de recompensas</span></h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><small className="ac-suave" style={{ fontSize: 12.5 }}>Socios</small><b style={{ display: 'block', fontSize: 24, fontWeight: 600 }}>1,284</b></div>
              <div><small className="ac-suave" style={{ fontSize: 12.5 }}>Regresan en 30 días</small><b style={{ display: 'block', fontSize: 24, fontWeight: 600, color: 'var(--ac-acento)' }}>41%</b></div>
              <div><small className="ac-suave" style={{ fontSize: 12.5 }}>Canjes hoy</small><b style={{ display: 'block', fontSize: 24, fontWeight: 600 }}>{e.ordenes.filter((o) => o.recompensa && o.t >= hoy0).length + 7}</b></div>
              <div><small className="ac-suave" style={{ fontSize: 12.5 }}>Ventas de socios</small><b style={{ display: 'block', fontSize: 24, fontWeight: 600 }}>38%</b></div>
            </div>
            <p className="ac-suave" style={{ fontSize: 13, marginTop: 12, lineHeight: 1.45 }}>Los socios gastan 27% más en la fuente de sodas que quien viene sin cuenta.</p>
          </div>
          <div className="ac-tarjeta ac-caja">
            <h3>Lo más pedido</h3>
            <div className="ac-barras-h">
              {top.map(([pid, n]) => (
                <div key={pid}><span>{platillo(pid).nombre}</span><b className="ac-mono">{n}</b><i><span className="acento" style={{ width: `${(n / top[0][1]) * 100}%` }} /></i></div>
              ))}
            </div>
          </div>
        </div>

        <div className="ac-tarjeta ac-caja">
          <h3>Clima <span className="ac-suave" style={{ fontSize: 13, fontWeight: 400 }}>pronóstico y lluvia</span></h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto' }}>
            {Array.from({ length: 5 }, (_, d) => inicioDia(d)).map((t) => {
              const c = climaDe(e, t);
              return (
                <div key={t} className={`ac-clima-dia ${c.lluvia >= 50 ? 'alta' : ''}`}>
                  <small>{d0(t)}</small><CloudRain size={18} /><b>{c.lluvia}%</b>
                </div>
              );
            })}
          </div>
          <p className="ac-etiqueta" style={{ marginBottom: 8 }}>Funciones de hoy y mañana</p>
          {[...funcionesDelDia(e, 0), ...funcionesDelDia(e, 1)].map((f) => {
            const n = ventasDe(e, f.id).length;
            const pend = ventasDe(e, f.id).filter((v) => v.pendiente === 'lluvia').length;
            return (
              <div key={f.id} className="ac-clima-funcion">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{PELICULAS[f.peli].titulo}</b>
                  <span>{diaCorto(f.t)} · {hora(f.t)} · {f.cancelada ? `cancelada · ${pend} por reprogramar` : `${n} boletos · ${climaDe(e, f.t).lluvia}% de lluvia`}</span>
                </div>
                {f.cancelada
                  ? <button type="button" className="ac-btn chico fantasma" onClick={() => reanudarFuncion(f.id)}>Reanudar</button>
                  : <button type="button" className="ac-btn chico rosa" onClick={() => { cancelarPorLluvia(f.id); avisarListo(`Aviso enviado a ${n} boletos`); }}><CloudRain size={14} /> Cancelar por lluvia</button>}
              </div>
            );
          })}
          <p className="ac-suave" style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.45 }}>Al cancelar, todos reciben el aviso y en su boleto eligen otra fecha (con lugar en su misma zona) o su reembolso. Nadie tiene que llamar.</p>
        </div>

        <TriviaNoche e={e} />

        <div className="ac-tarjeta ac-caja ancho">
          <h3>Eventos privados <span className="ac-suave" style={{ fontSize: 13, fontWeight: 400 }}>cotizaciones que llegan del sitio</span></h3>
          <div className="ac-tabla-scroll">
            <table className="ac-tabla">
              <thead><tr><th>Quién</th><th>Evento</th><th>Autos</th><th>Cotización</th><th /></tr></thead>
              <tbody>
                {(e.cotizaciones || []).map((c) => (
                  <tr key={c.id}>
                    <td><b style={{ fontWeight: 600 }}>{c.nombre}</b>{c.mio && <span className="ac-chip ambar" style={{ marginLeft: 6, padding: '2px 8px', fontSize: 11 }}>Nueva</span>}<div className="ac-suave" style={{ fontSize: 12.5 }}>hace {minutos(c.t, ahora) < 120 ? `${minutos(c.t, ahora)} min` : `${Math.round(minutos(c.t, ahora) / 60)} h`}</div></td>
                    <td>{c.tipo}<div className="ac-suave" style={{ fontSize: 12.5 }}>{c.fecha ? diaCorto(c.fecha) : 'Fecha por definir'}</div></td>
                    <td className="ac-mono">{c.autos}</td>
                    <td className="ac-mono">{dinero(c.total)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {c.estado === 'nueva' && <button type="button" className="ac-btn chico acento" onClick={() => marcarCotizacion(c.id, 'enviada')}>Mandar por WhatsApp</button>}
                      {c.estado === 'enviada' && <button type="button" className="ac-btn chico fantasma" onClick={() => marcarCotizacion(c.id, 'apartado')}>Marcar apartado</button>}
                      {c.estado === 'apartado' && <span className="ac-chip verde">Apartado · 30%</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ac-tarjeta ac-caja">
          <h3>Lo que opina el público</h3>
          <div className="ac-barras-h">
            {Object.entries(e.reacciones || {}).filter(([k]) => PELICULAS[k]).map(([k, r]) => ({ k, pct: Math.round((r.encanta / Math.max(1, r.encanta + r.bien + r.no)) * 100), n: r.encanta + r.bien + r.no }))
              .sort((a, b) => b.pct - a.pct).slice(0, 6).map(({ k, pct, n }) => (
                <div key={k}><span>{PELICULAS[k].titulo}</span><b className="ac-mono">{pct}%</b><i><span className="acento" style={{ width: `${pct}%` }} /></i><small className="ac-suave" style={{ fontSize: 12 }}>{n} opiniones</small></div>
              ))}
          </div>
        </div>

        <div className="ac-tarjeta ac-caja">
          <h3>Tú eliges la próxima <span className="ac-suave" style={{ fontSize: 13, fontWeight: 400 }}>votos del público</span></h3>
          <div className="ac-barras-h">
            {[...PROPUESTAS].sort((a, b) => (e.votos?.[b.id] || 0) - (e.votos?.[a.id] || 0)).map((x) => (
              <div key={x.id}><span>{x.titulo}</span><b className="ac-mono">{e.votos?.[x.id] || 0}</b><i><span className="ambar" style={{ width: `${((e.votos?.[x.id] || 0) / Math.max(...Object.values(e.votos || { a: 1 }))) * 100}%` }} /></i></div>
            ))}
          </div>
          <p className="ac-etiqueta" style={{ margin: '16px 0 8px' }}>Propuestas</p>
          {(e.sugerencias || []).slice(0, 4).map((x) => <p key={x.id} style={{ fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--ac-linea)' }}>“{x.texto}” <span className="ac-suave" style={{ fontSize: 12.5 }}>· {x.nombre}</span></p>)}
        </div>

        <div className="ac-tarjeta ac-caja ancho">
          <h3>En vivo</h3>
          <div className="ac-feed">
            {feed.map((x, i) => (
              <div key={i}><span className="ac-redondo chico" style={{ width: 30, height: 30 }}><x.Icon size={14} /></span><span>{x.texto}</span><b className="ac-mono" style={{ marginLeft: 'auto' }}>{dinero(x.monto)}</b><time>{minutos(x.t, ahora) ? `hace ${minutos(x.t, ahora)} min` : 'ahora'}</time></div>
            ))}
          </div>
        </div>
      </div>

      {aviso && <VentanaAviso f={aviso} n={ventasDe(e, aviso.id).length} alCerrar={() => setAviso(null)} />}
      {nueva && <VentanaFuncion alCerrar={() => setNueva(false)} />}
    </div>
  );
}

// barras apiladas boletos + comida, SVG a mano (recharts no carga con Vite 8)
function Grafica({ dias }) {
  const W = 760, H = 220, pad = 26;
  const max = Math.max(...dias.map((d) => d.boletos + d.comida), 1);
  const ancho = (W - pad) / dias.length;
  return (
    <div className="ac-grafica">
      <svg viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label="Ventas por día">
        {[0.5, 1].map((k) => <line key={k} x1={pad} x2={W} y1={H - (H - 10) * k} y2={H - (H - 10) * k} style={{ stroke: 'var(--ac-linea)' }} />)}
        <text x={0} y={14} style={{ fill: 'var(--ac-suave)' }} fontSize="11">{dinero(max)}</text>
        {dias.map((d, i) => {
          const x = pad + i * ancho + ancho * 0.18, w = ancho * 0.64;
          const hb = ((H - 10) * d.boletos) / max, hc = ((H - 10) * d.comida) / max;
          return (
            <g key={d.dia}>
              <title>{`${diaCorto(d.dia)}: boletos ${dinero(d.boletos)}, comida ${dinero(d.comida)}`}</title>
              <rect x={x} y={H - hb} width={w} height={Math.max(0, hb)} rx="5" style={{ fill: 'var(--ac-acento)' }} opacity={d.hoy ? 1 : 0.8} />
              <rect x={x} y={H - hb - hc - (hc ? 2 : 0)} width={w} height={Math.max(0, hc)} rx="5" style={{ fill: 'var(--ac-ambar)' }} opacity={d.hoy ? 1 : 0.8} />
              <text x={x + w / 2} y={H + 17} style={{ fill: d.hoy ? 'var(--ac-texto)' : 'var(--ac-suave)' }} fontSize="11" textAnchor="middle" fontWeight={d.hoy ? 700 : 400}>
                {d.hoy ? 'Hoy' : new Date(d.dia).toLocaleDateString('es-MX', { weekday: 'narrow' }) + new Date(d.dia).getDate()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function VentanaAviso({ f, n, alCerrar }) {
  const caja = useRef(null);
  useDialogo(caja, alCerrar);
  const [texto, setTexto] = useState('Por lluvia, la función empieza 20 minutos más tarde. La Casa del Terror abre normal.');
  return (
    <div className="ac-velo" onClick={alCerrar}>
      <div className="ac-ventana" ref={caja} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Avisar a la función">
        <h2>Avisar a {n} boletos</h2>
        <p className="ac-suave">{PELICULAS[f.peli].titulo} · <span>{diaCorto(f.t)}</span> {hora(f.t)}. Les llega por WhatsApp y aparece en su boleto.</p>
        <label className="ac-campo"><span>Mensaje</span><textarea rows={4} value={texto} onChange={(ev) => setTexto(ev.target.value)} /></label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="ac-btn fantasma" onClick={alCerrar}>Cancelar</button>
          <button type="button" className="ac-btn rosa" disabled={!texto.trim()} onClick={() => { mandarAviso(f.id, texto.trim()); avisarListo(`Aviso enviado a ${n} boletos`); alCerrar(); }}><Megaphone size={16} /> Enviar aviso</button>
        </div>
      </div>
    </div>
  );
}

function VentanaFuncion({ alCerrar }) {
  const caja = useRef(null);
  useDialogo(caja, alCerrar);
  const [peli, setPeli] = useState('pantano');
  const [dia, setDia] = useState(2);
  const [hh, setHh] = useState('20:30');
  const guardar = () => {
    const [h, m] = hh.split(':').map(Number);
    crearFuncion(peli, inicioDia(dia) + h * 3600000 + m * 60000);
    avisarListo('Función agregada a la cartelera');
    alCerrar();
  };
  return (
    <div className="ac-velo" onClick={alCerrar}>
      <div className="ac-ventana" ref={caja} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Nueva función">
        <h2>Nueva función</h2>
        <label className="ac-campo"><span>Película</span>
          <select value={peli} onChange={(ev) => setPeli(ev.target.value)}>{Object.entries(PELICULAS).map(([k, p]) => <option key={k} value={k}>{p.titulo}</option>)}</select>
        </label>
        <div className="ac-dos">
          <label className="ac-campo"><span>Día</span>
            <select value={dia} onChange={(ev) => setDia(Number(ev.target.value))}>
              {Array.from({ length: 7 }, (_, d) => <option key={d} value={d}>{diaCorto(inicioDia(d))}</option>)}
            </select>
          </label>
          <label className="ac-campo"><span>Hora</span><input type="time" value={hh} onChange={(ev) => setHh(ev.target.value)} /></label>
        </div>
        <p className="ac-suave" style={{ fontSize: 13.5 }}>Sale en la cartelera al instante con los 6 tipos de boleto y el mapa vacío.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="ac-btn fantasma" onClick={alCerrar}>Cancelar</button>
          <button type="button" className="ac-btn" onClick={guardar}>Agregar</button>
        </div>
      </div>
    </div>
  );
}

const d0 = (t) => (t === inicioDia(0) ? 'Hoy' : t === inicioDia(1) ? 'Mañana' : new Date(t).toLocaleDateString('es-MX', { weekday: 'short' }));

// Trivia de esta noche: el ranking de la próxima función y la vista para la
// pantalla gigante (16:9, se puede poner en pantalla completa con el botón).
function TriviaNoche({ e }) {
  const hoy = funcionesDelDia(e, 0);
  const f = hoy.find((x) => x.t > Date.now() && !x.cancelada) || hoy[0];
  const [pantalla, setPantalla] = useState(false);
  if (!f) return null;
  const ranking = rankingTrivia(e, f.id);
  return (
    <div className="ac-tarjeta ac-caja">
      <h3><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Brain size={17} /> Trivia de esta noche</span><span className="ac-suave" style={{ fontSize: 13, fontWeight: 400 }}>{ranking.length} autos jugaron</span></h3>
      <p className="ac-suave" style={{ fontSize: 13.5, marginBottom: 10 }}>{PELICULAS[f.peli].titulo} · {hora(f.t)}</p>
      <ol className="ac-ranking">
        {ranking.slice(0, 5).map((r, k) => <li key={r.codigo} className={r.mio ? 'mio' : ''}><span>{k + 1}</span><b>{r.nombre}</b><small>{nombreLugar(r.lugar)}</small><em>{r.aciertos}/5</em></li>)}
      </ol>
      <button type="button" className="ac-btn ancho" style={{ marginTop: 12 }} onClick={() => setPantalla(true)}><Projector size={16} /> Proyectar en la pantalla</button>
      {pantalla && (
        <div className="ac-proyeccion" onClick={() => setPantalla(false)} role="dialog" aria-label="Ranking en la pantalla">
          <div className="ac-proyeccion-lienzo" onClick={(ev) => ev.stopPropagation()}>
            <button type="button" className="ac-redondo chico vidrio" onClick={() => setPantalla(false)} aria-label="Cerrar" style={{ position: 'absolute', top: 16, right: 16 }}><X size={17} /></button>
            <p className="ac-cejilla" style={{ color: 'rgba(255,255,255,.6)' }}>Trivia Cocodrilo · {PELICULAS[f.peli].titulo}</p>
            <h2>Los que más saben <em>esta noche</em></h2>
            <ol>
              {ranking.slice(0, 5).map((r, k) => <li key={r.codigo}><span>{k + 1}</span><b>{r.nombre}</b><small>{nombreLugar(r.lugar)}</small><em>{r.puntaje.toLocaleString('es-MX')}</em></li>)}
            </ol>
            <p className="ac-proyeccion-pie">Juega desde tu boleto en el celular · {TRIVIA_TXT}</p>
          </div>
        </div>
      )}
    </div>
  );
}
const TRIVIA_TXT = 'gana Cocopuntos por cada acierto';
