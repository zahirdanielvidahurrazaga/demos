import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, Clock, Flame, LogOut, ShieldCheck, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  ESTADOS, diaRelativo, duracion, errorLegible, fechaCorta, hora, minutosDesde, nivelAforo,
  useAccesos, useAhora, useAlCambiarAccesos, useRpc,
} from './datos';
import { Etiqueta, Logo, Tarjeta, g } from './ui';
import { BarrasHora } from './graficas';

// App del socio: su pase con QR que cambia cada 30 s, qué tan lleno está el
// gimnasio y sus visitas. Cuando recepción lo escanea, le llega el aviso al momento.

const diaMx = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

export default function Socio({ negocio }) {
  const [pase, setPase] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState(null);
  const ahora = useAhora(250);
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
  const { accesos, recargar } = useAccesos(negocio.id, { socio: socioId, limite: 80 });
  const { datos: aforo, recargar: recargarAforo } = useRpc('gym_aforo', { p_negocio: negocio.id }, { cada: 30000 });

  useAlCambiarAccesos(socioId ? negocio.id : null, (fila) => {
    setAviso({ ...fila, entroA: adentroAntes.current });
    pedirPase();
    recargar();
    recargarAforo();
  }, { socio: socioId });
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(null), 4500);
    return () => clearTimeout(t);
  }, [aviso]);

  const visitas = useMemo(() => accesos.filter((a) => a.permitido && a.tipo === 'entrada'), [accesos]);
  const mes = diaMx(Date.now()).slice(0, 7);
  const delMes = visitas.filter((a) => diaMx(a.creado).startsWith(mes)).length;
  const ultimas4 = visitas.filter((a) => Date.now() - new Date(a.creado) < 28 * 86400000).length;

  if (error && !pase) return <div style={{ padding: 40, textAlign: 'center', color: g.suave }}>{error}</div>;
  if (!pase) return <div style={{ padding: 40, textAlign: 'center', color: g.suave }}>Cargando tu pase…</div>;

  const s = pase.socio;
  const estado = ESTADOS[s.estado];
  const restan = Math.max(0, Math.ceil((pase.recibido + pase.restan_ms - ahora) / 1000));
  const nivel = aforo ? nivelAforo(aforo.adentro, aforo.capacidad, aforo.alerta_pct) : null;

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '8px 16px 48px', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 2px' }}>
        <Logo nombre={negocio.nombre} tamano={0.9} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.78rem', color: g.suave }}>Hola,</div>
          <div style={{ fontWeight: 700 }}>{s.nombre.split(' ')[0]}</div>
        </div>
      </div>

      {/* El pase */}
      <section style={{
        borderRadius: 28, overflow: 'hidden', background: g.sup, border: `1px solid ${g.linea}`,
        boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
      }}>
        <div style={{ height: 6, background: g.pri }} />
        <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.18em', color: g.suave, fontWeight: 600 }}>PASE DE ACCESO</div>
            <div style={{ fontFamily: g.display, fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.03em' }}>SOCIO #{s.numero}</div>
          </div>
          {pase.adentro_desde
            ? <Etiqueta color={g.verde}><CheckCircle2 size={14} /> Adentro desde {hora(pase.adentro_desde)}</Etiqueta>
            : <Etiqueta color={estado.color}>{estado.texto}</Etiqueta>}
        </div>

        <div style={{ padding: '18px 20px 8px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#fff', padding: 14, borderRadius: 22, boxShadow: '0 12px 30px rgba(0,0,0,0.35)' }}>
            <motion.div key={pase.token} initial={{ opacity: 0.2, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
              <QRCodeSVG value={pase.token} size={208} level="M" fgColor="#0B0C0E" />
            </motion.div>
          </div>
          <div style={{ margin: '14px auto 0', maxWidth: 236 }}>
            <div style={{ height: 4, borderRadius: 4, background: g.sup2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(restan / pase.segundos) * 100}%`, background: g.pri, transition: 'width .25s linear' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.78rem', color: g.suave }}>
              <ShieldCheck size={14} color="var(--g-pri)" /> Se renueva en {restan} s · las capturas no sirven
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: '0.88rem', color: g.texto }}>
            {pase.adentro_desde ? 'Escanéalo también al salir' : 'Muéstralo en recepción o en el torniquete'}
          </div>
        </div>

        <div style={{ borderTop: `1px dashed ${g.linea}`, margin: '14px 0 0', padding: '14px 20px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
          <Dato etiqueta="Plan" valor={s.plan} />
          <Dato etiqueta="Vence" valor={fechaCorta(s.vence)} color={s.dias <= 7 ? g.ambar : undefined} />
          <Dato etiqueta="Horario" valor={s.horario === 'Horario libre' ? 'Libre' : s.horario} />
        </div>
        {s.estado !== 'activa' && (
          <div style={{ padding: '12px 20px', background: `color-mix(in srgb, ${estado.color} 14%, transparent)`, color: estado.color, fontSize: '0.86rem', fontWeight: 600 }}>
            {s.estado === 'vencida' && `Tu membresía venció el ${fechaCorta(s.vence)}. Renuévala en recepción para entrar.`}
            {s.estado === 'adeudo' && `Tienes un adeudo de $${s.adeudo}. Pásalo a pagar en recepción.`}
            {s.estado === 'congelada' && 'Tu membresía está congelada. Avísanos en recepción para reactivarla.'}
          </div>
        )}
        {s.estado === 'activa' && s.dias <= 7 && (
          <div style={{ padding: '12px 20px', background: 'color-mix(in srgb, var(--g-ambar) 14%, transparent)', color: g.ambar, fontSize: '0.86rem', fontWeight: 600 }}>
            Tu membresía vence en {s.dias === 0 ? 'hoy' : `${s.dias} día${s.dias === 1 ? '' : 's'}`}. Renuévala para no perder tu acceso.
          </div>
        )}
      </section>

      {/* ¿Qué tan lleno está? */}
      {aforo && <Aforo aforo={aforo} nivel={nivel} />}

      {/* Visitas */}
      <Tarjeta titulo="Tus visitas">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <MiniDato icono={CalendarDays} valor={delMes} texto="este mes" />
          <MiniDato icono={Flame} valor={(ultimas4 / 4).toFixed(1)} texto="por semana" />
        </div>
        <div style={{ display: 'grid', gap: 2 }}>
          {accesos.slice(0, 8).map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderTop: `1px solid ${g.linea}`, fontSize: '0.88rem' }}>
              {a.permitido
                ? (a.tipo === 'entrada' ? <CheckCircle2 size={17} color="var(--g-verde)" /> : <LogOut size={17} color="var(--g-suave)" />)
                : <XCircle size={17} color="var(--g-rojo)" />}
              <span style={{ flex: 1 }}>{a.permitido ? (a.tipo === 'entrada' ? 'Entrada' : 'Salida') : 'Acceso negado'}</span>
              <span style={{ color: g.suave }}>{diaRelativo(a.creado)} · {hora(a.creado)}</span>
            </div>
          ))}
          {!accesos.length && <div style={{ color: g.suave, fontSize: '0.88rem' }}>Aún no tienes visitas.</div>}
        </div>
      </Tarjeta>

      <AnimatePresence>
        {aviso && <Aviso aviso={aviso} nombre={s.nombre.split(' ')[0]} aforo={aforo} />}
      </AnimatePresence>
    </div>
  );
}

function Dato({ etiqueta, valor, color }) {
  return (
    <div>
      <div style={{ fontSize: '0.64rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: g.suave, fontWeight: 600 }}>{etiqueta}</div>
      <div style={{ fontWeight: 700, fontSize: '0.92rem', marginTop: 3, color: color || g.texto }}>{valor}</div>
    </div>
  );
}

function MiniDato({ icono: Icono, valor, texto }) {
  return (
    <div style={{ background: g.sup2, borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icono size={20} color="var(--g-pri)" />
      <div>
        <div style={{ fontFamily: g.display, fontWeight: 800, fontSize: '1.6rem', lineHeight: 1 }}>{valor}</div>
        <div style={{ fontSize: '0.74rem', color: g.suave }}>{texto}</div>
      </div>
    </div>
  );
}

function Aforo({ aforo, nivel }) {
  const datos = useMemo(() => {
    const hoy = new Map(aforo.hoy.map((x) => [x.h, x.personas]));
    return aforo.promedio.map((x) => {
      const actual = x.h === aforo.hora;
      const pasada = x.h < aforo.hora;
      return {
        h: x.h,
        personas: actual ? aforo.adentro : pasada ? (hoy.get(x.h) ?? 0) : x.personas,
        tipo: actual ? 'ahora' : pasada ? 'hoy' : 'usual',
      };
    });
  }, [aforo]);
  const mejor = useMemo(() => {
    const resto = aforo.promedio.filter((x) => x.h > aforo.hora && x.h <= 21);
    return resto.length ? resto.reduce((a, b) => (b.personas < a.personas ? b : a)) : null;
  }, [aforo]);

  return (
    <Tarjeta titulo="¿Qué tan lleno está?" accion={<Etiqueta color={nivel.color}>{nivel.texto}</Etiqueta>}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: g.display, fontWeight: 800, fontSize: '3rem', lineHeight: 1, color: nivel.color }}>{aforo.adentro}</span>
        <span style={{ color: g.suave }}>personas ahora · de {aforo.capacidad}</span>
      </div>
      <div style={{ height: 8, borderRadius: 8, background: g.sup2, overflow: 'hidden', margin: '12px 0 4px' }}>
        <div style={{ width: `${Math.min(100, nivel.pct)}%`, height: '100%', background: nivel.color, transition: 'width .8s ease' }} />
      </div>
      <div style={{ marginTop: 14 }}><BarrasHora datos={datos} /></div>
      <div style={{ display: 'flex', gap: 14, fontSize: '0.74rem', color: g.suave, marginTop: 6 }}>
        <span>■ <span style={{ color: g.pri }}>Ahora</span></span>
        <span>■ Hoy</span>
        <span>■ Lo usual</span>
      </div>
      {mejor && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: g.sup2, borderRadius: 14, fontSize: '0.86rem', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Clock size={16} color="var(--g-pri)" />
          <span>Hoy a las <b>{mejor.h}:00</b> suele haber ~{mejor.personas} personas.</span>
        </div>
      )}
    </Tarjeta>
  );
}

function Aviso({ aviso, nombre, aforo }) {
  const ok = aviso.permitido;
  const entrada = aviso.tipo === 'entrada';
  const color = !ok ? 'var(--g-rojo)' : entrada ? 'var(--g-verde)' : '#3B82F6';
  const estuvo = !entrada && aviso.entroA ? minutosDesde(aviso.entroA, new Date(aviso.creado).getTime()) : null;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9400, background: `color-mix(in srgb, ${color} 92%, black)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        style={{ textAlign: 'center', color: '#fff', maxWidth: 380 }}>
        {ok ? (entrada ? <CheckCircle2 size={96} strokeWidth={1.8} /> : <LogOut size={90} strokeWidth={1.8} />) : <XCircle size={96} strokeWidth={1.8} />}
        <div style={{ fontFamily: g.display, fontWeight: 800, fontSize: '2.6rem', lineHeight: 1.05, margin: '16px 0 10px', textTransform: 'uppercase' }}>
          {!ok ? 'Acceso negado' : entrada ? `¡Bienvenido, ${nombre}!` : '¡Buen entrenamiento!'}
        </div>
        <div style={{ fontSize: '1.05rem', opacity: 0.92 }}>
          {!ok ? aviso.motivo
            : entrada ? `Entrada ${hora(aviso.creado)}${aforo ? ` · hay ${aforo.adentro + 1} personas` : ''}`
            : `Salida ${hora(aviso.creado)}${estuvo != null ? ` · entrenaste ${duracion(estuvo)}` : ''}`}
        </div>
      </motion.div>
    </motion.div>
  );
}
