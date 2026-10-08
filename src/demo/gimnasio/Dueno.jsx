import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, AlertTriangle, Ban, CheckCircle2, LayoutDashboard, LogIn, LogOut, MessageCircle, Search, Settings2, Timer,
  Users, UsersRound, Wallet, XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  ESTADOS, diaMx, diaRelativo, diaSemanaMx, duracion, errorLegible, fechaCorta, hora, horaMx, inicioMx, minutosDesde,
  nivelAforo, pesos, saludo, useAccesos, useAhora, usePagos, useRpc,
} from './datos';
import {
  Anillo, Avatar, Boton, Cargando, Chip, EnVivo, Fila, IconoCirculo, Logo, NumeroVivo, Segmentado, Tarjeta, Titulo, Vacio,
  degradadoTexto, g, useAncho,
} from './ui';
import { Barritas, MapaCalor, Onda } from './graficas';
import { AforoMini, AppMarco, Notificaciones } from './marco';

// ─────────────────────────────────────────────────────────────────────────────
// Tablero del dueño: Hoy (aforo, entradas, cobros y lo que pasa en vivo),
// Aforo (horas pico y quién está adentro), Socios (por cobrar y negados),
// Dinero y Ajustes (el aforo máximo). Todo se mueve solo con cada acceso.
// ─────────────────────────────────────────────────────────────────────────────

const PESTANAS = [
  { id: 'hoy', etiqueta: 'Hoy', icono: LayoutDashboard },
  { id: 'aforo', etiqueta: 'Aforo', icono: Activity },
  { id: 'socios', etiqueta: 'Socios', icono: Users },
  { id: 'dinero', etiqueta: 'Dinero', icono: Wallet },
  { id: 'ajustes', etiqueta: 'Ajustes', icono: Settings2 },
];

const dinero = (n) => pesos(n);

export default function Dueno({ negocio, alCambiarNegocio, arriba }) {
  const [tab, setTab] = useState('hoy');
  const { datos: t, error, recargar } = useRpc('gym_tablero', { p_negocio: negocio.id }, { enVivo: true, cada: 60000 });
  const { accesos } = useAccesos(negocio.id, { limite: 30 });
  const porCobrar = t?.avisos?.length ?? 0;

  return (
    <>
      <AppMarco lateral arriba={arriba} pestanas={PESTANAS.map((p) => (p.id === 'socios' ? { ...p, globo: porCobrar } : p))}
        activa={tab} alCambiar={setTab} logo={<Logo nombre={negocio.nombre} />} pie={<AforoMini aforo={t?.aforo} />}>
        {error && !t && <div style={{ padding: 40, textAlign: 'center', color: g.suave }}>{error}</div>}
        {!t ? <Cargando /> : (
          <>
            {tab === 'hoy' && <Hoy negocio={negocio} t={t} accesos={accesos} alIr={setTab} />}
            {tab === 'aforo' && <Aforo negocio={negocio} t={t} />}
            {tab === 'socios' && <Socios negocio={negocio} t={t} />}
            {tab === 'dinero' && <Dinero negocio={negocio} t={t} />}
            {tab === 'ajustes' && <Ajustes negocio={negocio} aforo={t.aforo} alGuardar={() => { recargar(); alCambiarNegocio?.(); }} />}
          </>
        )}
      </AppMarco>
      <Notificaciones accesos={accesos} arriba={arriba} />
    </>
  );
}

// ── HOY ─────────────────────────────────────────────────────────────────────
function Hoy({ negocio, t, accesos, alIr }) {
  const compu = useAncho(1000);
  const a = t.aforo;
  const nivel = nivelAforo(a.adentro, a.capacidad, a.alerta_pct);
  const usual = a.promedio.find((x) => x.h === a.hora)?.personas ?? 0;
  const sumaProm = a.promedio.filter((x) => x.h <= a.hora).length;

  const tarjetaAforo = (
    <Tarjeta brillo titulo="Aforo ahora" accion={<Chip color={nivel.color} punto>{nivel.texto}</Chip>} style={{ height: '100%' }}>
      <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
        <Anillo valor={a.adentro / a.capacidad} tamano={compu ? 230 : 220} grosor={16} interior={{ valor: usual / a.capacidad }}>
          <span style={{ fontSize: 12.5, color: g.suave }}>personas adentro</span>
          <span style={{ fontSize: 62, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05 }}><NumeroVivo valor={a.adentro} /></span>
          <Chip>de {a.capacidad} · {nivel.pct}%</Chip>
        </Anillo>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12, color: g.suave }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 9, background: g.grad }} /> Ahora</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 9, height: 9, borderRadius: 9, background: 'var(--g-pri2)', opacity: 0.8 }} /> Lo usual ({usual})</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Timer size={13} /> Estancia {t.estancia_min ? duracion(t.estancia_min) : '—'}</span>
        </div>
      </div>
    </Tarjeta>
  );

  const kpis = (
    <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
      <Fila icono={LogIn} etiqueta="Entradas hoy" valor={<NumeroVivo valor={t.hoy.entradas} />} sub={`${t.hoy.unicos} socios · ${t.hoy.manuales} a mano`} onClick={() => alIr('aforo')} />
      <Fila icono={Wallet} etiqueta="Cobrado hoy" valor={<NumeroVivo valor={Number(t.ingresos.hoy)} formato={dinero} />} sub={`${pesos(t.ingresos.mes)} en el mes`} onClick={() => alIr('dinero')} />
      <Fila icono={Ban} etiqueta="Accesos negados" valor={<NumeroVivo valor={t.hoy.denegados} />} sub={t.motivos[0] ? `${t.motivos[0].n} por ${t.motivos[0].motivo.toLowerCase()}` : 'nadie se quedó afuera'} onClick={() => alIr('socios')} />
      <Fila icono={UsersRound} etiqueta="Socios activos" valor={<NumeroVivo valor={t.socios.activos} />} sub={`${t.socios.por_vencer} vencen esta semana`} onClick={() => alIr('socios')} />
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Titulo chico={`${saludo()} 👋`} accion={<EnVivo />}>Tu gimnasio hoy</Titulo>
      {nivel.pct >= a.alerta_pct && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 20,
          background: 'color-mix(in srgb, var(--g-rojo) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--g-rojo) 35%, transparent)', color: g.rojo, fontWeight: 600, fontSize: 14,
        }}><AlertTriangle size={20} /> Aforo al {nivel.pct}%: considera pausar los pases de día.</motion.div>
      )}
      {compu ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14 }}>{tarjetaAforo}{kpis}</div>
      ) : <>{tarjetaAforo}{kpis}</>}
      <div style={{ display: 'grid', gridTemplateColumns: compu ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 14 }}>
        <Tarjeta titulo="Personas adentro por hora" accion={<span style={{ fontSize: 11.5, color: g.tenue }}>hoy vs. promedio de {sumaProm ? 'los últimos 4' : ''} {['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'][diaSemanaMx() - 1]}</span>}>
          <Onda aforo={a} alto={240} />
        </Tarjeta>
        <Tarjeta titulo="Movimientos" accion={<EnVivo />} pad={14}>
          <MiniFeed accesos={accesos.slice(0, 7)} />
        </Tarjeta>
      </div>
      {!compu && <div style={{ fontSize: 12, color: g.tenue, textAlign: 'center' }}>{negocio.nombre} · se actualiza solo</div>}
    </div>
  );
}

function MiniFeed({ accesos }) {
  return (
    <div style={{ display: 'grid' }}>
      {accesos.map((a, i) => {
        const color = !a.permitido ? 'var(--g-rojo)' : a.tipo === 'entrada' ? 'var(--g-verde)' : g.azul;
        const Icono = !a.permitido ? XCircle : a.tipo === 'entrada' ? LogIn : LogOut;
        return (
          <motion.div key={a.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderTop: i ? `1px solid ${g.linea}` : 'none' }}>
            <IconoCirculo icono={Icono} color={color} tamano={32} />
            <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
              <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.gym_socios?.nombre || 'QR desconocido'}</div>
              <div style={{ color: a.permitido ? g.suave : g.rojo, fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.permitido ? (a.tipo === 'entrada' ? 'Entró' : 'Salió') : a.motivo}</div>
            </div>
            <span style={{ fontSize: 12, color: g.tenue }}>{hora(a.creado)}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── AFORO ───────────────────────────────────────────────────────────────────
function Aforo({ negocio, t }) {
  const compu = useAncho(1000);
  const { datos: calor } = useRpc('gym_calor', { p_negocio: negocio.id });
  const a = t.aforo;
  const pico = a.promedio.reduce((m, x) => (x.personas > m.personas ? x : m), a.promedio[0] || { h: 0, personas: 0 });
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Titulo chico="Ocupación" accion={<EnVivo />}>Aforo</Titulo>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        <Tarjeta pad={14}><div style={{ fontSize: 11.5, color: g.suave }}>Adentro</div><div style={{ fontSize: 26, fontWeight: 700 }}><NumeroVivo valor={a.adentro} degradado /></div></Tarjeta>
        <Tarjeta pad={14}><div style={{ fontSize: 11.5, color: g.suave }}>Pico usual</div><div style={{ fontSize: 26, fontWeight: 700 }}>{pico.h}:00</div></Tarjeta>
        <Tarjeta pad={14}><div style={{ fontSize: 11.5, color: g.suave }}>Estancia</div><div style={{ fontSize: 26, fontWeight: 700, whiteSpace: 'nowrap' }}>{t.estancia_min ? duracion(t.estancia_min) : '—'}</div></Tarjeta>
      </div>
      <Tarjeta titulo="Hoy contra lo usual" accion={<span style={{ fontSize: 11.5, color: g.tenue }}>pasa el dedo por la gráfica</span>}>
        <Onda aforo={a} alto={compu ? 280 : 230} />
      </Tarjeta>
      <div style={{ display: 'grid', gridTemplateColumns: compu ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        <Tarjeta titulo="Horas pico" accion={<span style={{ fontSize: 11.5, color: g.tenue }}>últimas 4 semanas</span>}>
          {calor ? <MapaCalor celdas={calor} capacidad={a.capacidad} desde={5} hasta={22} diaHoy={diaSemanaMx()} horaHoy={horaMx()} /> : <div style={{ height: 200 }} />}
        </Tarjeta>
        <Adentro lista={t.adentro} />
      </div>
    </div>
  );
}

function Adentro({ lista }) {
  const ahora = useAhora(30000);
  const [q, setQ] = useState('');
  const filtrada = lista.filter((s) => !q || s.nombre.toLowerCase().includes(q.toLowerCase()) || String(s.numero).includes(q));
  return (
    <Tarjeta titulo={`Adentro ahora · ${lista.length}`} pad={14}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: g.sup2, borderRadius: 99, marginBottom: 6 }}>
        <Search size={15} color="var(--g-suave)" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: g.texto, fontSize: 14, fontFamily: g.fuente }} />
      </label>
      <div className="g-sin-barra" style={{ maxHeight: 380, overflowY: 'auto' }}>
        {filtrada.map((s, i) => {
          const min = minutosDesde(s.desde, ahora);
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderTop: i ? `1px solid ${g.linea}` : 'none' }}>
              <Avatar nombre={s.nombre} tamano={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nombre}</div>
                <div style={{ fontSize: 11.5, color: g.suave }}>#{s.numero} · desde {hora(s.desde)}</div>
              </div>
              <span style={{ fontSize: 12.5, color: min > 150 ? g.ambar : g.suave, whiteSpace: 'nowrap' }}>{duracion(min)}</span>
            </div>
          );
        })}
      </div>
    </Tarjeta>
  );
}

// ── SOCIOS ──────────────────────────────────────────────────────────────────
const FILTROS = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'vencida', etiqueta: 'Vencidas' },
  { id: 'adeudo', etiqueta: 'Adeudo' },
  { id: 'activa', etiqueta: 'Por vencer' },
];

function Socios({ negocio, t }) {
  const compu = useAncho(1000);
  const [filtro, setFiltro] = useState('todos');
  const s = t.socios;
  const partes = [
    { e: 'Activos', n: s.activos, c: 'var(--g-verde)' },
    { e: 'Con adeudo', n: s.adeudo, c: 'var(--g-ambar)' },
    { e: 'Vencidos (30 d)', n: s.vencidos, c: 'var(--g-rojo)' },
    { e: 'Congelados', n: s.congelados, c: g.azul },
  ];
  const total = partes.reduce((x, p) => x + p.n, 0) || 1;
  const avisos = t.avisos.filter((x) => filtro === 'todos' || x.estado === filtro);
  const mensaje = (x) => (x.estado === 'vencida'
    ? `Hola ${x.nombre.split(' ')[0]}, te extrañamos en ${negocio.nombre}. Tu membresía ${x.plan} venció el ${fechaCorta(x.vence)}: renuévala y vuelve a entrenar.`
    : x.estado === 'adeudo'
      ? `Hola ${x.nombre.split(' ')[0]}, tienes un saldo pendiente de ${pesos(x.adeudo)} en ${negocio.nombre}. Puedes pagarlo en recepción.`
      : `Hola ${x.nombre.split(' ')[0]}, tu membresía ${x.plan} en ${negocio.nombre} vence el ${fechaCorta(x.vence)}. Renuévala para no perder tu acceso.`);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Titulo chico={`${s.total} en total`}>Socios</Titulo>
      <Tarjeta brillo>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.04em' }}><NumeroVivo valor={s.activos} degradado /></span>
          <span style={{ color: g.suave }}>activos al día</span>
        </div>
        <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', gap: 3, margin: '14px 0 12px' }}>
          {partes.map((p, i) => (
            <motion.div key={p.e} initial={{ width: 0 }} animate={{ width: `${(p.n / total) * 100}%` }} transition={{ duration: 0.9, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: p.c, borderRadius: 99, minWidth: p.n ? 6 : 0 }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: compu ? 'repeat(4, 1fr)' : '1fr 1fr', gap: 10 }}>
          {partes.map((p) => (
            <div key={p.e} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i style={{ width: 9, height: 9, borderRadius: 9, background: p.c, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: g.suave }}>{p.e}</span>
              <b style={{ marginLeft: 'auto', fontSize: 14 }}>{p.n}</b>
            </div>
          ))}
        </div>
      </Tarjeta>

      <div style={{ display: 'grid', gridTemplateColumns: compu ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        <Tarjeta titulo="Por cobrar y por renovar" accion={<Chip>{t.avisos.length}</Chip>}>
          <div style={{ marginBottom: 12 }}><Segmentado id="cobrar" opciones={FILTROS} valor={filtro} alCambiar={setFiltro} /></div>
          {!avisos.length && <Vacio icono={CheckCircle2}>Nadie en esta lista. 🎉</Vacio>}
          <div className="g-sin-barra" style={{ display: 'grid', gap: 8, maxHeight: 460, overflowY: 'auto' }}>
            {avisos.map((x) => {
              const e = ESTADOS[x.estado];
              return (
                <motion.div key={x.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px 10px 12px', borderRadius: 18, background: g.sup2, minWidth: 0 }}>
                  <Avatar nombre={x.nombre} tamano={38} color={e.color} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.nombre}</div>
                    <div style={{ fontSize: 12, color: e.color }}>
                      {x.estado === 'vencida' ? `Venció ${fechaCorta(x.vence)}` : x.estado === 'adeudo' ? `Debe ${pesos(x.adeudo)}` : x.dias === 0 ? 'Vence hoy' : `Vence en ${x.dias} d`} · {x.plan}
                    </div>
                  </div>
                  <a href={`https://wa.me/?text=${encodeURIComponent(mensaje(x))}`} target="_blank" rel="noreferrer" title="Mandar recordatorio por WhatsApp"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: compu ? '9px 13px' : 0, width: compu ? 'auto' : 38, height: compu ? 'auto' : 38, flexShrink: 0, borderRadius: 99, background: '#25D366', color: '#05301A', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>
                    <MessageCircle size={compu ? 15 : 18} />{compu && ' Recordar'}
                  </a>
                </motion.div>
              );
            })}
          </div>
        </Tarjeta>
        <Tarjeta titulo="Accesos negados hoy" accion={<Chip color={g.rojo}>{t.hoy.denegados}</Chip>}>
          {!t.motivos.length && <Vacio icono={CheckCircle2}>Nadie se ha quedado afuera hoy.</Vacio>}
          <div style={{ display: 'grid', gap: 14 }}>
            {t.motivos.map((m, i) => (
              <div key={m.motivo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
                  <span>{m.motivo}</span><b>{m.n}</b>
                </div>
                <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(m.n / t.motivos[0].n) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                    style={{ height: '100%', borderRadius: 8, background: 'linear-gradient(90deg, var(--g-rojo), var(--g-pri2))' }} />
                </div>
              </div>
            ))}
          </div>
        </Tarjeta>
      </div>
    </div>
  );
}

// ── DINERO ──────────────────────────────────────────────────────────────────
function Dinero({ negocio, t }) {
  const compu = useAncho(1000);
  const desde = useMemo(() => inicioMx('mes'), []);
  const { pagos } = usePagos(negocio.id, { desde, limite: 1000 });
  const hoy = diaMx(Date.now());
  const dias = Number(hoy.slice(8));
  const [anio, mes] = hoy.split('-').map(Number);
  const diasMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const porDia = Array.from({ length: diasMes }, () => 0);
  const porPlan = new Map();
  (pagos || []).forEach((p) => {
    const d = Number(diaMx(p.creado).slice(8));
    if (d >= 1 && d <= diasMes) porDia[d - 1] += Number(p.monto);
    const k = p.concepto.replace(/^Renovación /, '');
    porPlan.set(k, (porPlan.get(k) || 0) + Number(p.monto));
  });
  const planes = [...porPlan.entries()].sort((a, b) => b[1] - a[1]);
  const totalMes = Number(t.ingresos.mes) || 1;
  const promedio = Number(t.ingresos.mes) / Math.max(1, dias);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Titulo chico="Cobros" accion={<EnVivo />}>Dinero</Titulo>
      <div style={{ display: 'grid', gridTemplateColumns: compu ? 'minmax(0, 1.4fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 14 }}>
        <Tarjeta brillo>
          <div style={{ fontSize: 13, color: g.suave }}>Cobrado hoy</div>
          <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1 }}><NumeroVivo valor={Number(t.ingresos.hoy)} formato={dinero} degradado /></div>
          <div style={{ display: 'flex', gap: 18, marginTop: 6, fontSize: 13, color: g.suave, flexWrap: 'wrap' }}>
            <span>En el mes <b style={{ color: g.texto }}>{pesos(t.ingresos.mes)}</b></span>
            <span>Promedio diario <b style={{ color: g.texto }}>{pesos(promedio)}</b></span>
          </div>
          <div style={{ marginTop: 18 }}>
            <Barritas valores={porDia} alto={90} resaltar={dias - 1} etiquetas={porDia.map((_, i) => ((i + 1) % 5 === 0 || i === 0 ? i + 1 : ''))} />
          </div>
        </Tarjeta>
        <Tarjeta titulo="Por plan" accion={<span style={{ fontSize: 11.5, color: g.tenue }}>este mes</span>}>
          <div style={{ display: 'grid', gap: 14 }}>
            {planes.map(([k, v], i) => (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
                  <span>{k}</span><b>{pesos(v)}</b>
                </div>
                <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(v / totalMes) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                    style={{ height: '100%', borderRadius: 8, background: g.grad }} />
                </div>
              </div>
            ))}
          </div>
        </Tarjeta>
      </div>
      <Tarjeta titulo="Últimos cobros" pad={14}>
        {pagos && !pagos.length && <Vacio icono={Wallet}>Sin cobros este mes.</Vacio>}
        {(pagos || []).slice(0, 12).map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 2px', borderTop: i ? `1px solid ${g.linea}` : 'none' }}>
            <Avatar nombre={p.gym_socios?.nombre || '?'} tamano={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.gym_socios?.nombre}</div>
              <div style={{ fontSize: 12, color: g.suave }}>{p.concepto} · {diaRelativo(p.creado)} {hora(p.creado)}</div>
            </div>
            <b style={{ fontSize: 15, ...degradadoTexto }}>{pesos(p.monto)}</b>
          </div>
        ))}
      </Tarjeta>
    </div>
  );
}

// ── AJUSTES ─────────────────────────────────────────────────────────────────
function Ajustes({ negocio, aforo, alGuardar }) {
  const [capacidad, setCapacidad] = useState(aforo.capacidad);
  const [alerta, setAlerta] = useState(aforo.alerta_pct);
  const [estado, setEstado] = useState('');
  const guardar = async () => {
    setEstado('Guardando…');
    const { error } = await supabase.rpc('gym_ajustar', { p_negocio: negocio.id, p_capacidad: Number(capacidad), p_alerta_pct: Number(alerta) });
    setEstado(error ? errorLegible(error) : 'Listo: recepción ya aplica el nuevo aforo.');
    if (!error) alGuardar();
  };
  const pct = Math.round((aforo.adentro / Math.max(1, capacidad)) * 100);
  const deslizador = { width: '100%', accentColor: 'var(--g-pri)', height: 28, cursor: 'pointer' };

  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 640 }}>
      <Titulo chico="Configuración">Ajustes</Titulo>
      <Tarjeta brillo titulo="Aforo máximo" accion={<Settings2 size={18} color="var(--g-suave)" />}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <Anillo valor={aforo.adentro / Math.max(1, capacidad)} tamano={140} grosor={12} color={pct >= 100 ? 'var(--g-rojo)' : undefined}>
            <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{pct}%</span>
            <span style={{ fontSize: 11, color: g.suave }}>{aforo.adentro} de {capacidad}</span>
          </Anillo>
          <div style={{ flex: '1 1 220px', fontSize: 13.5, color: g.suave, lineHeight: 1.5 }}>
            Al llegar al máximo, el torniquete deja de dar acceso hasta que alguien salga. <b style={{ color: g.texto }}>Bájalo a menos de {aforo.adentro} y mira cómo recepción empieza a negar entradas.</b>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span style={{ color: g.suave }}>Personas máximo</span><b style={{ fontSize: 18 }}>{capacidad}</b></div>
          <input type="range" min={10} max={300} value={capacidad} onChange={(e) => setCapacidad(Number(e.target.value))} style={deslizador} />
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span style={{ color: g.suave }}>Avisarme al</span><b style={{ fontSize: 18 }}>{alerta}%</b></div>
          <input type="range" min={50} max={100} value={alerta} onChange={(e) => setAlerta(Number(e.target.value))} style={deslizador} />
        </div>
        <Boton grande style={{ width: '100%', marginTop: 12 }} onClick={guardar}>Guardar</Boton>
        {estado && <div style={{ fontSize: 13, color: g.suave, marginTop: 10, textAlign: 'center' }}>{estado}</div>}
      </Tarjeta>
      <Tarjeta titulo="Pases de acceso">
        <div style={{ display: 'grid', gap: 10, fontSize: 13.5, color: g.suave, lineHeight: 1.5 }}>
          <div style={{ display: 'flex', gap: 10 }}><CheckCircle2 size={18} color="var(--g-pri)" style={{ flexShrink: 0 }} /> El QR de cada socio cambia cada {negocio.qr_segundos} segundos y va firmado: una captura no sirve.</div>
          <div style={{ display: 'flex', gap: 10 }}><CheckCircle2 size={18} color="var(--g-pri)" style={{ flexShrink: 0 }} /> Antipassback: si ya está adentro, el mismo pase no deja entrar a otra persona.</div>
          <div style={{ display: 'flex', gap: 10 }}><CheckCircle2 size={18} color="var(--g-pri)" style={{ flexShrink: 0 }} /> Cada plan respeta su horario (ej. estudiante de 6:00 a 14:00).</div>
        </div>
      </Tarjeta>
    </div>
  );
}
