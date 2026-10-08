import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, AtSign, CalendarDays, CheckCircle2, Clock, Dumbbell, Flame, Home, LogOut, MapPin, QrCode, Receipt,
  ShieldCheck, Sun, Timer, UserRound, Users, XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  ESTADOS, diaMx, diaRelativo, diaSemanaMx, duracion, errorLegible, fechaCorta, hora, horaMx, mejorHora, minutosDesde,
  nivelAforo, pesos, saludo, useAccesos, useAhora, useAlCambiarAccesos, usePagos, useRpc, visitasDe,
} from './datos';
import {
  Anillo, Avatar, Cargando, Chip, EnVivo, Hoja, IconoCirculo, Logo, NumeroVivo, Tarjeta, Titulo, Vacio, degradadoTexto, g,
} from './ui';
import { MapaCalor, Onda } from './graficas';
import { AppMarco } from './marco';

// ─────────────────────────────────────────────────────────────────────────────
// App del socio. Inicio (su pase, qué tan lleno está, su semana), En vivo
// (aforo y horas tranquilas), Visitas y Membresía; el botón central abre el
// pase en grande. El QR cambia cada 30 s y cuando recepción lo escanea le llega
// la bienvenida al instante.
// ─────────────────────────────────────────────────────────────────────────────

const PESTANAS = [
  { id: 'inicio', etiqueta: 'Inicio', icono: Home },
  { id: 'vivo', etiqueta: 'En vivo', icono: Activity },
  { id: 'visitas', etiqueta: 'Visitas', icono: CalendarDays },
  { id: 'membresia', etiqueta: 'Membresía', icono: UserRound },
];

const sumarDias = (ymd, n) => {
  const [a, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
};

export default function Socio({ negocio }) {
  const [tab, setTab] = useState('inicio');
  const [paseAbierto, setPaseAbierto] = useState(false);
  const [pase, setPase] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState(null);
  const adentroAntes = useRef(null);

  const pedirPase = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('gym_mi_pase', { p_negocio: negocio.id });
    if (e) { setError(errorLegible(e)); return; }
    setError('');
    setPase({ ...data, recibido: Date.now() });
  }, [negocio.id]);

  useEffect(() => { pedirPase(); }, [pedirPase]);
  // El QR se pide de nuevo justo cuando cambia de ventana.
  useEffect(() => {
    if (!pase) return undefined;
    const t = setTimeout(pedirPase, Math.max(300, pase.restan_ms + 150));
    return () => clearTimeout(t);
  }, [pase, pedirPase]);
  useEffect(() => { if (pase) adentroAntes.current = pase.adentro_desde; }, [pase]);

  const socioId = pase?.socio?.id;
  const { accesos, recargar } = useAccesos(negocio.id, { socio: socioId, limite: 200 });
  const { datos: aforo, recargar: recargarAforo } = useRpc('gym_aforo', { p_negocio: negocio.id }, { cada: 30000 });

  useAlCambiarAccesos(socioId ? negocio.id : null, (fila) => {
    setAviso({ ...fila, entroA: adentroAntes.current });
    setPaseAbierto(false);
    pedirPase();
    recargar();
    recargarAforo();
  }, { socio: socioId });
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(null), 4800);
    return () => clearTimeout(t);
  }, [aviso]);

  const visitas = useMemo(() => (socioId ? visitasDe(accesos) : []), [accesos, socioId]);

  if (error && !pase) return <div style={{ padding: 40, textAlign: 'center', color: g.suave }}>{error}</div>;

  return (
    <>
      <AppMarco pestanas={PESTANAS} activa={tab} alCambiar={setTab}
        fab={{ icono: QrCode, etiqueta: 'Mi pase', onClick: () => setPaseAbierto(true) }}>
        {!pase ? <Cargando /> : (
          <>
            {tab === 'inicio' && <Inicio negocio={negocio} pase={pase} aforo={aforo} visitas={visitas} alAbrirPase={() => setPaseAbierto(true)} alIr={setTab} />}
            {tab === 'vivo' && <EnVivoSocio negocio={negocio} aforo={aforo} />}
            {tab === 'visitas' && <Visitas visitas={visitas} adentro={pase.adentro_desde} />}
            {tab === 'membresia' && <Membresia negocio={negocio} socio={pase.socio} />}
          </>
        )}
      </AppMarco>

      <Hoja abierta={paseAbierto && !!pase} alCerrar={() => setPaseAbierto(false)} titulo="Tu pase de acceso" ancho={440}>
        {pase && <PaseGrande pase={pase} />}
      </Hoja>

      <AnimatePresence>
        {aviso && pase && <Bienvenida aviso={aviso} nombre={pase.socio.nombre.split(' ')[0]} aforo={aforo} />}
      </AnimatePresence>
    </>
  );
}

// Segundos que le quedan al QR actual.
function useRestan(pase) {
  const ahora = useAhora(250);
  return Math.max(0, Math.ceil((pase.recibido + pase.restan_ms - ahora) / 1000));
}

function QrBlanco({ token, tamano, radio = 20, pad = 10 }) {
  return (
    <div style={{ background: '#fff', padding: pad, borderRadius: radio, lineHeight: 0, flexShrink: 0 }}>
      <motion.div key={token} initial={{ opacity: 0.25, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
        <QRCodeSVG value={token} size={tamano} level="M" fgColor="#0B0B0D" />
      </motion.div>
    </div>
  );
}

function ChipEstado({ pase }) {
  const s = pase.socio;
  if (pase.adentro_desde) return <Chip color={g.verde} punto>Adentro · {hora(pase.adentro_desde)}</Chip>;
  const e = ESTADOS[s.estado];
  return <Chip color={e.color}>● {e.texto}</Chip>;
}

// ── INICIO ──────────────────────────────────────────────────────────────────
function Inicio({ negocio, pase, aforo, visitas, alAbrirPase, alIr }) {
  const s = pase.socio;
  const restan = useRestan(pase);
  const nivel = aforo ? nivelAforo(aforo.adentro, aforo.capacidad, aforo.alerta_pct) : null;
  const mejor = mejorHora(aforo);
  const mes = diaMx(Date.now()).slice(0, 7);
  const delMes = visitas.filter((v) => diaMx(v.entra).startsWith(mes)).length;

  const frase = !nivel ? ' '
    : pase.adentro_desde ? (minutosDesde(pase.adentro_desde) < 2 ? 'Acabas de llegar. ¡A darle!' : `Llevas ${duracion(minutosDesde(pase.adentro_desde))} entrenando. ¡Dale!`)
      : nivel.pct >= aforo.alerta_pct ? `Está a tope.${mejor ? ` Mejor ven a las ${mejor.h}:00.` : ''}`
        : nivel.pct >= 50 ? 'Hay movimiento, pero cabes.'
          : 'El gym está tranquilo. Buen momento.';

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 2px 6px' }}>
        <Logo nombre={negocio.nombre} compacto />
        <div style={{ position: 'relative' }}>
          <Avatar nombre={s.nombre} tamano={42} anillo />
          <span style={{ position: 'absolute', top: -1, right: -1, width: 11, height: 11, borderRadius: '50%', background: g.pri, border: '2px solid var(--g-fondo)' }} />
        </div>
      </div>

      <div style={{ margin: '0 2px 6px' }}>
        <div style={{ color: g.suave, fontSize: 15 }}>{saludo()},</div>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15 }}>{s.nombre.split(' ')[0]} 👋</div>
        <div style={{ color: g.suave, fontSize: 13.5, marginTop: 2 }}>{frase}</div>
      </div>

      {/* El pase (toca para abrirlo en grande) */}
      <Tarjeta brillo onClick={alAbrirPase}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Tu pase · #{s.numero}</span>
          <ChipEstado pase={pase} />
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 14 }}>
          <QrBlanco token={pase.token} tamano={128} />
          <div style={{ flex: 1, display: 'grid', justifyItems: 'center', gap: 8, textAlign: 'center' }}>
            <Anillo valor={restan / pase.segundos} tamano={92} grosor={9}>
              <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{restan}</span>
              <span style={{ fontSize: 10, color: g.suave }}>seg</span>
            </Anillo>
            <div style={{ fontSize: 11.5, color: g.suave, lineHeight: 1.4 }}>Cambia solo.<br />Las capturas no entran.</div>
          </div>
        </div>
      </Tarjeta>

      <AvisoMembresia socio={s} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Tarjeta onClick={() => alIr('vivo')} pad={16}>
          <IconoCirculo icono={Users} />
          <div style={{ fontSize: 12.5, color: g.suave, marginTop: 12 }}>Adentro ahora</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {aforo ? <NumeroVivo valor={aforo.adentro} degradado /> : '—'}
            <span style={{ fontSize: 13, color: g.tenue, fontWeight: 500 }}> / {aforo?.capacidad ?? '—'}</span>
          </div>
        </Tarjeta>
        <Tarjeta onClick={() => alIr('visitas')} pad={16}>
          <IconoCirculo icono={Flame} />
          <div style={{ fontSize: 12.5, color: g.suave, marginTop: 12 }}>Este mes</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
            <NumeroVivo valor={delMes} degradado /><span style={{ fontSize: 13, color: g.tenue, fontWeight: 500 }}> visitas</span>
          </div>
        </Tarjeta>
      </div>

      <Tarjeta titulo="¿Qué tan lleno está?" accion={<EnVivo />} onClick={() => alIr('vivo')}>
        {aforo ? <Onda aforo={aforo} compacto alto={104} /> : <div style={{ height: 104 }} />}
        {mejor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: g.suave }}>
            <Clock size={15} color="var(--g-pri2)" /> Mejor hora hoy: <b style={{ color: g.texto }}>{mejor.h}:00</b> · ~{mejor.personas} personas
          </div>
        )}
      </Tarjeta>

      <TuSemana visitas={visitas} />

      {negocio.info?.clases?.length > 0 && (
        <Tarjeta titulo="Clases en el gym">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {negocio.info.clases.map((c) => (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 99, background: g.sup2, fontSize: 13, fontWeight: 600 }}>
                <Dumbbell size={14} color="var(--g-pri)" /> {c}
              </span>
            ))}
          </div>
        </Tarjeta>
      )}
    </div>
  );
}

function AvisoMembresia({ socio: s }) {
  let texto = null;
  let color = g.ambar;
  if (s.estado === 'vencida') { texto = `Tu membresía venció el ${fechaCorta(s.vence)}. Renuévala en recepción para entrar.`; color = g.rojo; }
  else if (s.estado === 'adeudo') texto = `Tienes un adeudo de ${pesos(s.adeudo)}. Pásalo a pagar en recepción.`;
  else if (s.estado === 'congelada') { texto = 'Tu membresía está congelada. Avísanos en recepción para reactivarla.'; color = g.azul; }
  else if (s.dias <= 7) texto = `Tu membresía vence ${s.dias === 0 ? 'hoy' : `en ${s.dias} día${s.dias === 1 ? '' : 's'}`}. Renuévala para no perder tu acceso.`;
  if (!texto) return null;
  return (
    <div style={{ padding: '13px 16px', borderRadius: 20, background: `color-mix(in srgb, ${color} 13%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, color, fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>
      {texto}
    </div>
  );
}

// Los 7 días de esta semana, con los que vino marcados.
function TuSemana({ visitas }) {
  const hoy = diaMx(Date.now());
  const dow = diaSemanaMx();
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i + 1 - dow));
  const vino = new Set(visitas.map((v) => diaMx(v.entra)));
  const n = dias.filter((d) => vino.has(d)).length;
  const letras = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  return (
    <Tarjeta titulo="Tu semana" accion={<Chip>{n} de 7 días</Chip>}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        {dias.map((d, i) => {
          const si = vino.has(d);
          const esHoy = d === hoy;
          return (
            <div key={d} style={{ display: 'grid', justifyItems: 'center', gap: 6, flex: 1 }}>
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 18 }}
                style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: si ? g.grad : 'rgba(255,255,255,0.05)', color: si ? '#fff' : g.tenue,
                  boxShadow: si ? '0 6px 16px color-mix(in srgb, var(--g-pri) 45%, transparent)' : esHoy ? 'inset 0 0 0 2px var(--g-pri)' : undefined,
                }}>
                {si ? <CheckCircle2 size={17} /> : <span style={{ fontSize: 12, fontWeight: 600 }}>{Number(d.slice(8))}</span>}
              </motion.div>
              <span style={{ fontSize: 11, color: esHoy ? g.texto : g.tenue, fontWeight: esHoy ? 700 : 500 }}>{letras[i]}</span>
            </div>
          );
        })}
      </div>
    </Tarjeta>
  );
}

// ── EN VIVO ─────────────────────────────────────────────────────────────────
function EnVivoSocio({ negocio, aforo }) {
  const { datos: calor } = useRpc('gym_calor', { p_negocio: negocio.id });
  if (!aforo) return <Cargando />;
  const nivel = nivelAforo(aforo.adentro, aforo.capacidad, aforo.alerta_pct);
  const usual = aforo.promedio.find((x) => x.h === aforo.hora)?.personas ?? 0;
  const mejor = mejorHora(aforo);
  const dif = aforo.adentro - usual;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Titulo chico="Ahora mismo" accion={<EnVivo />}>¿Qué tan lleno está?</Titulo>
      <Tarjeta brillo>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: '6px 0 4px' }}>
          <Anillo valor={aforo.adentro / aforo.capacidad} tamano={232} grosor={16} interior={{ valor: usual / aforo.capacidad }}>
            <span style={{ fontSize: 12.5, color: g.suave }}>personas adentro</span>
            <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05 }}><NumeroVivo valor={aforo.adentro} /></span>
            <Chip color={nivel.color}>{nivel.texto} · {nivel.pct}%</Chip>
          </Anillo>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: g.suave }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 9, background: g.grad }} /> Ahora</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 9, background: 'var(--g-pri2)', opacity: 0.8 }} /> Lo usual a esta hora</span>
          </div>
        </div>
      </Tarjeta>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Tarjeta pad={16}>
          <IconoCirculo icono={Users} />
          <div style={{ fontSize: 12.5, color: g.suave, marginTop: 12 }}>Lo usual a esta hora</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{usual}</div>
          <div style={{ fontSize: 11.5, color: dif > 0 ? g.ambar : g.verde }}>{dif === 0 ? 'Igual que siempre' : dif > 0 ? `${dif} más que lo usual` : `${-dif} menos que lo usual`}</div>
        </Tarjeta>
        <Tarjeta pad={16}>
          <IconoCirculo icono={Clock} />
          <div style={{ fontSize: 12.5, color: g.suave, marginTop: 12 }}>Mejor hora hoy</div>
          <div style={{ fontSize: 24, fontWeight: 700, ...degradadoTexto }}>{mejor ? `${mejor.h}:00` : '—'}</div>
          <div style={{ fontSize: 11.5, color: g.suave }}>{mejor ? `~${mejor.personas} personas` : 'Ya casi cerramos'}</div>
        </Tarjeta>
      </div>
      <Tarjeta titulo="Hoy contra lo usual" accion={<span style={{ fontSize: 11.5, color: g.tenue }}>— — promedio</span>}>
        <Onda aforo={aforo} alto={200} />
      </Tarjeta>
      <Tarjeta titulo="Horas tranquilas" accion={<span style={{ fontSize: 11.5, color: g.tenue }}>últimas 4 semanas</span>}>
        {calor ? <MapaCalor celdas={calor} capacidad={aforo.capacidad} diaHoy={diaSemanaMx()} horaHoy={horaMx()} /> : <div style={{ height: 180 }} />}
      </Tarjeta>
    </div>
  );
}

// ── VISITAS ─────────────────────────────────────────────────────────────────
function Visitas({ visitas, adentro }) {
  const hoy = diaMx(Date.now());
  const mes = hoy.slice(0, 7);
  const delMes = visitas.filter((v) => diaMx(v.entra).startsWith(mes));
  const ultimas4 = visitas.filter((v) => Date.now() - new Date(v.entra) < 28 * 86400000).length;
  const conDur = visitas.filter((v) => v.min != null);
  const promedio = conDur.length ? Math.round(conDur.reduce((a, v) => a + v.min, 0) / conDur.length) : 0;
  const vino = new Set(visitas.map((v) => diaMx(v.entra)));

  const [a, m] = mes.split('-').map(Number);
  const diasMes = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7;
  const nombreMes = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('es-MX', { month: 'long', timeZone: 'UTC' });

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Titulo chico="Tu progreso">Tus visitas</Titulo>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { e: 'Este mes', v: <NumeroVivo valor={delMes.length} degradado />, i: Flame },
          { e: 'Por semana', v: (ultimas4 / 4).toFixed(1), i: CalendarDays },
          { e: 'Promedio', v: promedio ? duracion(promedio) : '—', i: Timer },
        ].map((x) => (
          <Tarjeta key={x.e} pad={14}>
            <x.i size={18} color="var(--g-pri)" />
            <div style={{ fontSize: 21, fontWeight: 700, marginTop: 8, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{x.v}</div>
            <div style={{ fontSize: 11.5, color: g.suave }}>{x.e}</div>
          </Tarjeta>
        ))}
      </div>

      <Tarjeta titulo={<span style={{ textTransform: 'capitalize' }}>{nombreMes}</span>} accion={<Chip>{delMes.length} visitas</Chip>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center' }}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} style={{ fontSize: 11, color: g.tenue, fontWeight: 600 }}>{d}</span>)}
          {Array.from({ length: offset }, (_, i) => <span key={`v${i}`} />)}
          {Array.from({ length: diasMes }, (_, i) => {
            const dia = `${mes}-${String(i + 1).padStart(2, '0')}`;
            const si = vino.has(dia);
            const esHoy = dia === hoy;
            return (
              <motion.div key={dia} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.012 }}
                style={{
                  aspectRatio: '1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: si ? 700 : 500,
                  background: si ? g.grad : 'transparent', color: si ? '#fff' : dia > hoy ? 'rgba(255,255,255,0.18)' : g.suave,
                  boxShadow: si ? '0 4px 14px color-mix(in srgb, var(--g-pri) 40%, transparent)' : esHoy ? 'inset 0 0 0 2px var(--g-pri)' : undefined,
                }}>{i + 1}</motion.div>
            );
          })}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Historial">
        {!visitas.length && <Vacio icono={CalendarDays}>Aún no tienes visitas. ¡Hoy es buen día!</Vacio>}
        <div style={{ display: 'grid' }}>
          {visitas.slice(0, 12).map((v, i) => {
            const ahora = adentro && !v.sale && i === 0;
            return (
              <div key={v.entra} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i ? `1px solid ${g.linea}` : 'none' }}>
                <IconoCirculo icono={ahora ? Activity : CheckCircle2} color={ahora ? 'var(--g-verde)' : 'var(--g-pri)'} tamano={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{diaRelativo(v.entra)}</div>
                  <div style={{ fontSize: 12, color: g.suave }}>{hora(v.entra)}{v.sale ? ` → ${hora(v.sale)}` : ''}</div>
                </div>
                {ahora ? <Chip color={g.verde} punto>Entrenando</Chip> : v.min != null && <span style={{ fontSize: 13, fontWeight: 600, color: g.suave }}>{duracion(v.min)}</span>}
              </div>
            );
          })}
        </div>
      </Tarjeta>
    </div>
  );
}

// ── MEMBRESÍA ───────────────────────────────────────────────────────────────
function Membresia({ negocio, socio: s }) {
  const [planes, setPlanes] = useState([]);
  const { pagos } = usePagos(negocio.id, { limite: 20 });
  useEffect(() => {
    supabase.from('gym_planes').select('id, nombre, precio, dias, hora_desde, hora_hasta').eq('negocio', negocio.id).order('orden')
      .then(({ data }) => setPlanes(data || []));
  }, [negocio.id]);
  const plan = planes.find((p) => p.id === s.plan_id);
  const estado = ESTADOS[s.estado];
  const info = negocio.info || {};

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Titulo chico="Tu membresía">{s.plan}</Titulo>
      <Tarjeta brillo>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Anillo valor={plan ? Math.max(0, s.dias) / plan.dias : 0} tamano={128} grosor={12}>
            <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{Math.max(0, s.dias)}</span>
            <span style={{ fontSize: 11, color: g.suave }}>días</span>
          </Anillo>
          <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
            <Chip color={estado.color} style={{ justifySelf: 'start' }}>● {estado.texto}</Chip>
            <Dato etiqueta="Vence" valor={fechaCorta(s.vence)} />
            <Dato etiqueta="Horario" valor={s.horario} />
            <Dato etiqueta="Socio" valor={`#${s.numero}`} />
          </div>
        </div>
      </Tarjeta>
      <AvisoMembresia socio={s} />

      <Tarjeta titulo="Planes" accion={<span style={{ fontSize: 11.5, color: g.tenue }}>Cámbiate en recepción</span>}>
        <div style={{ display: 'grid', gap: 8 }}>
          {planes.map((p) => {
            const tuyo = p.id === s.plan_id;
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 18,
                background: tuyo ? 'color-mix(in srgb, var(--g-pri) 12%, var(--g-sup2))' : g.sup2,
                border: tuyo ? '1px solid color-mix(in srgb, var(--g-pri) 45%, transparent)' : `1px solid ${g.linea}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{p.nombre} {tuyo && <Chip style={{ marginLeft: 4 }}>Tu plan</Chip>}</div>
                  <div style={{ fontSize: 12, color: g.suave }}>{p.dias} días · {p.hora_desde == null ? 'Horario libre' : `${p.hora_desde}:00 a ${p.hora_hasta}:00`}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 17, ...(tuyo ? degradadoTexto : {}) }}>{pesos(p.precio)}</div>
              </div>
            );
          })}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Tus pagos">
        {pagos && !pagos.length && <Vacio icono={Receipt}>Todavía no hay pagos registrados.</Vacio>}
        {(pagos || []).slice(0, 6).map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? `1px solid ${g.linea}` : 'none' }}>
            <IconoCirculo icono={Receipt} tamano={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.concepto}</div>
              <div style={{ fontSize: 12, color: g.suave }}>{diaRelativo(p.creado)}</div>
            </div>
            <b style={{ fontSize: 14.5 }}>{pesos(p.monto)}</b>
          </div>
        ))}
      </Tarjeta>

      <Tarjeta titulo={negocio.nombre}>
        <div style={{ display: 'grid', gap: 12, fontSize: 13.5 }}>
          {info.direccion && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <MapPin size={17} color="var(--g-pri)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{info.direccion}<br /><span style={{ color: g.suave }}>{info.ciudad}</span></span>
            </div>
          )}
          {info.instagram && (
            <a href={`https://instagram.com/${info.instagram}`} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 10, alignItems: 'center', color: g.texto, textDecoration: 'none' }}>
              <AtSign size={17} color="var(--g-pri)" /> {info.instagram}
            </a>
          )}
        </div>
      </Tarjeta>
    </div>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'baseline' }}>
      <span style={{ color: g.tenue, width: 58, flexShrink: 0 }}>{etiqueta}</span>
      <b style={{ fontWeight: 600 }}>{valor}</b>
    </div>
  );
}

// ── EL PASE EN GRANDE ───────────────────────────────────────────────────────
function PaseGrande({ pase }) {
  const s = pase.socio;
  const restan = useRestan(pase);
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 14, textAlign: 'center', paddingBottom: 6 }}>
      <Anillo valor={restan / pase.segundos} tamano={300} grosor={8}>
        <QrBlanco token={pase.token} tamano={176} radio={22} pad={11} />
      </Anillo>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.nombre}</div>
        <div style={{ color: g.suave, fontSize: 13.5, marginTop: 2 }}>Socio #{s.numero} · {s.plan}</div>
      </div>
      <ChipEstado pase={pase} />
      <div style={{ display: 'grid', gap: 8, width: '100%', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 16, background: g.sup2, fontSize: 13, textAlign: 'left' }}>
          <ShieldCheck size={18} color="var(--g-pri)" /> <span>Cambia en <b>{restan} s</b>. Una captura de pantalla no le sirve a nadie más.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 16, background: g.sup2, fontSize: 13, textAlign: 'left' }}>
          <Sun size={18} color="var(--g-pri)" /> <span>{pase.adentro_desde ? 'Escanéalo también al salir.' : 'Sube el brillo y muéstralo en recepción o en el torniquete.'}</span>
        </div>
      </div>
    </div>
  );
}

// ── BIENVENIDA (cuando recepción escanea su pase) ───────────────────────────
function Bienvenida({ aviso, nombre, aforo }) {
  const ok = aviso.permitido;
  const entrada = aviso.tipo === 'entrada';
  const color = !ok ? 'var(--g-rojo)' : entrada ? 'var(--g-verde)' : g.azul;
  const estuvo = !entrada && aviso.entroA ? minutosDesde(aviso.entroA, new Date(aviso.creado).getTime()) : null;
  const Icono = !ok ? XCircle : entrada ? CheckCircle2 : LogOut;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        background: `radial-gradient(circle at 50% 42%, color-mix(in srgb, ${color} 55%, black), #050506 75%)`, fontFamily: g.fuente,
      }}>
      <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 17 }}
        style={{ textAlign: 'center', color: '#fff', maxWidth: 380, display: 'grid', justifyItems: 'center' }}>
        <div style={{ position: 'relative', width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[0, 1].map((i) => (
            <motion.span key={i} initial={{ scale: 0.6, opacity: 0.7 }} animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
              style={{ position: 'absolute', inset: 20, borderRadius: '50%', border: `3px solid ${color}` }} />
          ))}
          <div style={{ width: 120, height: 120, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 60px ${color}` }}>
            <Icono size={64} strokeWidth={2.2} color="#fff" />
          </div>
        </div>
        <div style={{ fontWeight: 800, fontSize: 34, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '26px 0 10px' }}>
          {!ok ? 'Acceso negado' : entrada ? `¡Bienvenido, ${nombre}!` : '¡Buen entrenamiento!'}
        </div>
        <div style={{ fontSize: 16, opacity: 0.9 }}>
          {!ok ? aviso.motivo
            : entrada ? `Entrada ${hora(aviso.creado)}${aforo ? ` · hay ${aforo.adentro + 1} personas` : ''}`
              : `Salida ${hora(aviso.creado)}${estuvo != null ? ` · entrenaste ${duracion(estuvo)}` : ''}`}
        </div>
      </motion.div>
    </motion.div>
  );
}
