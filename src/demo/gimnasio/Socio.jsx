import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, AtSign, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Home, Scale, TrendingUp, LogOut, MapPin, QrCode, Receipt, Sun, UserRound, XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  ESTADOS, diaMx, diaRelativo, diaSemanaMx, duracion, errorLegible, fechaCorta, hora, horaMx, mejorHora, minutosDesde,
  nivelAforo, pesos, saludo, useAccesos, useAhora, useAlCambiarAccesos, usePagos, useRpc, visitasDe,
} from './datos';
import {
  Avatar, Barra, Boton, Hoja, Logo, Segmentado, Cargando, Chip, EnVivo, Flecha, Foto, FOTOS, Grande, IconoCirculo, NumeroVivo, Tarjeta, Titulo, Vacio,
  fotoClase, fotoSocio, g, titular, useAncho,
} from './ui';
import { BarrasHora, MapaCalor } from './graficas';
import { AforoMini, AppMarco } from './marco';
import { Actividad, Cuerpo, Pesarme, useMediciones } from './cuerpo';

// ─────────────────────────────────────────────────────────────────────────────
// App del socio. Portada (foto + entrar, una vez por pestaña), Inicio (su
// semana, qué tan lleno está, visitas y racha), Pase (el QR que cambia cada
// 30 s), En vivo (aforo y horas tranquilas), Visitas y Membresía. Cuando
// recepción lee su pase con el lector le llega la bienvenida al instante.
// ─────────────────────────────────────────────────────────────────────────────

const PESTANAS = [
  { id: 'inicio', etiqueta: 'Inicio', icono: Home },
  { id: 'pase', etiqueta: 'Pase', icono: QrCode },
  { id: 'vivo', etiqueta: 'En vivo', icono: Activity },
  { id: 'progreso', etiqueta: 'Progreso', icono: TrendingUp },
  { id: 'membresia', etiqueta: 'Cuenta', icono: UserRound },
];

const sumarDias = (ymd, n) => {
  const [a, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
};

const clavePortada = (negocio) => `gym_portada_${negocio}`;

export default function Socio({ negocio, arriba = 0 }) {
  const [tab, setTab] = useState('inicio');
  const [portada, setPortada] = useState(() => {
    try { return !sessionStorage.getItem(clavePortada(negocio.id)); } catch { return true; }
  });
  const [pase, setPase] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState(null);
  const [pesando, setPesando] = useState(false);
  const [vistaProgreso, setVistaProgreso] = useState('cuerpo');
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
  const { mediciones, recargar: recargarMediciones } = useMediciones(socioId);

  const entrar = (destino = 'inicio') => {
    try { sessionStorage.setItem(clavePortada(negocio.id), '1'); } catch { /* sin almacenamiento */ }
    setTab(destino);
    setPortada(false);
  };

  if (error && !pase) return <div style={{ padding: 40, textAlign: 'center', color: g.suave }}>{error}</div>;

  return (
    <>
      <AnimatePresence>{portada && <Portada negocio={negocio} aforo={aforo} arriba={arriba} alEntrar={entrar} />}</AnimatePresence>

      <AppMarco lateral anchoCel={460} arriba={arriba} pestanas={PESTANAS} activa={tab} alCambiar={setTab}
        logo={<Logo nombre={negocio.nombre} sub="Socios" />} pie={<AforoMini aforo={aforo} />}>
        {!pase ? <Cargando /> : (
          <>
            {tab === 'inicio' && <Inicio negocio={negocio} pase={pase} aforo={aforo} visitas={visitas} mediciones={mediciones} alIr={(t, sub) => { if (sub) setVistaProgreso(sub); setTab(t); }} alPesarme={() => setPesando(true)} />}
            {tab === 'pase' && <Pase pase={pase} />}
            {tab === 'vivo' && <EnVivoSocio negocio={negocio} aforo={aforo} />}
            {tab === 'progreso' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
                <Titulo chico="Tu cuerpo, tu actividad y tus visitas">Progreso</Titulo>
                <div style={{ maxWidth: 520 }}>
                  <Segmentado id="progreso" valor={vistaProgreso} alCambiar={setVistaProgreso}
                    opciones={[{ id: 'cuerpo', etiqueta: 'Cuerpo' }, { id: 'actividad', etiqueta: 'Actividad' }, { id: 'visitas', etiqueta: 'Visitas' }]} />
                </div>
                {vistaProgreso === 'cuerpo' && <Cuerpo mediciones={mediciones} alPesarme={() => setPesando(true)} />}
                {vistaProgreso === 'actividad' && <Actividad negocio={negocio} ultimoPeso={mediciones?.[0]} />}
                {vistaProgreso === 'visitas' && <Visitas visitas={visitas} adentro={pase.adentro_desde} sinTitulo />}
              </div>
            )}
            {tab === 'membresia' && <Membresia negocio={negocio} socio={pase.socio} />}
          </>
        )}
      </AppMarco>

      <Hoja abierta={pesando && !!pase} alCerrar={() => setPesando(false)} titulo="Pesarme" ancho={460}>
        {pase && <Pesarme negocio={negocio} socio={pase.socio} previa={mediciones?.[0]} alGuardar={() => { recargarMediciones(); setVistaProgreso('cuerpo'); }} />}
      </Hoja>

      <AnimatePresence>
        {aviso && pase && <Bienvenida aviso={aviso} nombre={pase.socio.nombre.split(' ')[0]} aforo={aforo} />}
      </AnimatePresence>
    </>
  );
}

// En la compu, dos columnas; en el celular, una debajo de otra.
function Columnas({ izq, der, proporcion = '1fr 1fr' }) {
  const compu = useAncho(1000);
  const col = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12, alignContent: 'start' };
  if (!compu) return <div style={col}>{izq}{der}</div>;
  const [a, b] = proporcion.split(' ');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `minmax(0, ${a}) minmax(0, ${b})`, gap: 16, alignItems: 'start' }}>
      <div style={col}>{izq}</div><div style={col}>{der}</div>
    </div>
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
        <QRCodeSVG value={token} size={tamano} level="M" fgColor="#0A0A0A" />
      </motion.div>
    </div>
  );
}

function ChipEstado({ pase }) {
  const s = pase.socio;
  if (pase.adentro_desde) return <Chip relleno punto>Adentro · {hora(pase.adentro_desde)}</Chip>;
  const e = ESTADOS[s.estado];
  return s.estado === 'activa' ? <Chip relleno>{e.texto}</Chip> : <Chip color={e.color}>{e.texto}</Chip>;
}

// ── PORTADA ─────────────────────────────────────────────────────────────────
function Portada({ negocio, aforo, arriba, alEntrar }) {
  const compu = useAncho(1000);
  return (
    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}
      style={{ position: 'fixed', top: arriba, left: 0, right: 0, bottom: 0, zIndex: 9250, background: '#050505', fontFamily: g.fuente, color: g.texto }}>
      <Foto src={FOTOS.hero} radio={0} posicion={compu ? 'center 30%' : 'center 22%'} style={{ position: 'absolute', inset: 0, ...(compu ? { right: '46%' } : {}) }} />
      <div style={{ position: 'absolute', inset: 0, ...(compu ? { left: '54%' } : {}), display: 'flex', alignItems: 'flex-end', justifyContent: compu ? 'flex-start' : 'center' }}>
        <div style={{ width: '100%', maxWidth: compu ? 520 : 460, boxSizing: 'border-box', padding: compu ? '0 56px 72px' : '0 24px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          {aforo && (
            <span style={{ alignSelf: 'flex-start' }}>
              <Chip punto style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                {aforo.adentro} {aforo.adentro === 1 ? 'persona entrenando' : 'personas entrenando'} ahora
              </Chip>
            </span>
          )}
          <motion.h1 initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 22 }}
            style={{ ...titular, fontSize: compu ? 112 : 'clamp(58px, 17vw, 76px)', margin: '16px 0 0' }}>
            Entra.<br />Entrena.<br /><span style={{ color: g.pri }}>Repite.</span>
          </motion.h1>
          <p style={{ color: '#B5B5B0', fontSize: 15, lineHeight: 1.5, margin: '14px 0 0' }}>
            Tu pase, tus visitas y qué tan lleno está {negocio.nombre}, en tu bolsillo.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
            <Boton grande onClick={() => alEntrar('inicio')}>Entrar</Boton>
            <Boton grande variante="suave" onClick={() => alEntrar('membresia')}>Ver planes</Boton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── INICIO ──────────────────────────────────────────────────────────────────
function Inicio({ negocio, pase, aforo, visitas, mediciones, alIr, alPesarme }) {
  const compu = useAncho(1000);
  const s = pase.socio;
  const restan = useRestan(pase);
  const nivel = aforo ? nivelAforo(aforo.adentro, aforo.capacidad, aforo.alerta_pct) : null;
  const mejor = mejorHora(aforo);
  const hoy = diaMx(Date.now());
  const mes = hoy.slice(0, 7);
  const delMes = visitas.filter((v) => diaMx(v.entra).startsWith(mes)).length;
  const racha = useMemo(() => rachaDe(visitas, hoy), [visitas, hoy]);

  // Visitas de las últimas 4 semanas (la más reciente a la derecha).
  const semanas = [3, 2, 1, 0].map((k) => {
    const fin = Date.now() - k * 7 * 86400000;
    return visitas.filter((v) => { const t = new Date(v.entra).getTime(); return t <= fin && t > fin - 7 * 86400000; }).length;
  });
  const maxSem = Math.max(1, ...semanas);

  const frase = !nivel ? ' '
    : pase.adentro_desde ? (minutosDesde(pase.adentro_desde) < 2 ? 'Acabas de llegar. A darle.' : `Llevas ${duracion(minutosDesde(pase.adentro_desde))} entrenando.`)
      : nivel.pct >= aforo.alerta_pct ? `Está a tope.${mejor ? ` Mejor ven a las ${mejor.h}:00.` : ''}`
        : nivel.pct >= 50 ? 'Hay movimiento, pero cabes.'
          : 'Buen momento para venir.';

  const cabeza = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 2px 4px' }}>
      <Avatar nombre={s.nombre} foto={fotoSocio(s.numero)} tamano={compu ? 54 : 46} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: g.suave, fontSize: 13 }}>{saludo()}</div>
        {compu ? <div style={{ ...titular, fontSize: 44, marginTop: 4 }}>{s.nombre.split(' ')[0]}</div> : <div style={{ fontSize: 17, fontWeight: 600 }}>{s.nombre.split(' ')[0]}</div>}
      </div>
      <ChipEstado pase={pase} />
    </div>
  );

  const gymAhora = (
    <motion.button type="button" whileTap={{ scale: 0.985 }} onClick={() => alIr('vivo')}
      style={{ border: 'none', padding: 0, background: 'none', cursor: 'pointer', textAlign: 'left', color: g.texto, display: 'block', width: '100%' }}>
      <Foto src={FOTOS.piso} radio={26} style={{ height: compu ? 380 : 214 }}>
        <div style={{ height: '100%', boxSizing: 'border-box', padding: compu ? 24 : 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Chip punto style={{ background: 'rgba(0,0,0,0.55)' }}>En vivo</Chip>
            {aforo && <Chip style={{ background: 'rgba(0,0,0,0.55)' }}>Cupo {aforo.capacidad}</Chip>}
          </div>
          <div>
            <div style={{ fontSize: compu ? 15 : 13, color: '#CFCFCA' }}>El gym ahora · {frase}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
              <Grande tamano={compu ? 96 : 48}>{nivel?.texto || '—'}</Grande>
              {aforo && <Grande tamano={compu ? 56 : 34}><NumeroVivo valor={aforo.adentro} /><span style={{ fontSize: compu ? 30 : 20, color: '#9A9A95' }}>/{aforo.capacidad}</span></Grande>}
            </div>
            {compu && aforo && <Barra valor={aforo.adentro / aforo.capacidad} style={{ marginTop: 16 }} />}
          </div>
        </div>
      </Foto>
    </motion.button>
  );

  const numeros = (
    <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 10 }}>
      <Tarjeta onClick={() => alIr('progreso', 'visitas')} pad={compu ? 18 : 15}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Visitas</span><span style={{ color: g.suave }}>este mes</span></div>
        <Grande tamano={compu ? 60 : 46} style={{ marginTop: 8 }}><NumeroVivo valor={delMes} formato={(n) => String(Math.round(n)).padStart(2, '0')} /></Grande>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 34, marginTop: 8 }}>
          {semanas.map((n, i) => (
            <motion.span key={i} initial={{ height: 0 }} animate={{ height: `${Math.max(12, (n / maxSem) * 100)}%` }} transition={{ delay: i * 0.06, duration: 0.6 }}
              style={{ flex: 1, borderRadius: 5, background: n ? g.pri : '#2C2C2C' }} />
          ))}
        </div>
      </Tarjeta>
      <Tarjeta acento pad={compu ? 18 : 15} onClick={() => alIr('progreso', 'visitas')}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Racha</div>
        <Grande tamano={compu ? 60 : 46} style={{ marginTop: 8 }}>{racha}</Grande>
        <div style={{ fontSize: 12.5, fontWeight: 500, marginTop: 10 }}>{racha === 1 ? 'día seguido' : 'días seguidos'}</div>
      </Tarjeta>
    </div>
  );

  const tuPase = (
    <Tarjeta onClick={() => alIr('pase')} pad={14}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <QrBlanco token={pase.token} tamano={58} radio={12} pad={6} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Tu pase · #{s.numero}</div>
          <div style={{ fontSize: 12.5, color: g.suave, marginTop: 2 }}>Cambia en {restan} s · ábrelo en la entrada</div>
        </div>
        <Flecha />
      </div>
    </Tarjeta>
  );

  const ultima = mediciones?.[0];
  const tuCuerpo = (
    <Tarjeta pad={14} onClick={ultima ? () => alIr('progreso', 'cuerpo') : alPesarme}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 58, height: 58, borderRadius: 16, background: g.sup2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Scale size={24} color="var(--g-pri)" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{ultima ? `${Number(ultima.peso).toFixed(1)} kg · ${ultima.grasa_pct ?? '—'}% grasa` : 'Pésate en la báscula del gym'}</div>
          <div style={{ fontSize: 12.5, color: g.suave, marginTop: 2 }}>{ultima ? `Última medición: ${diaRelativo(ultima.creado).toLowerCase()}` : 'Peso, grasa, músculo y más, directo a tu app'}</div>
        </div>
        <Flecha />
      </div>
    </Tarjeta>
  );

  const mejorHoy = mejor && (
    <Tarjeta pad={14}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <IconoCirculo icono={Clock} color="var(--g-pri)" />
        <div style={{ flex: 1, fontSize: 13.5 }}>
          <div style={{ color: g.suave, fontSize: 12.5 }}>Mejor hora hoy</div>
          <div><b>{mejor.h}:00</b> · ~{mejor.personas} personas</div>
        </div>
      </div>
    </Tarjeta>
  );

  const clases = negocio.info?.clases?.length > 0 && (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '10px 2px 10px' }}>
        <div style={{ ...titular, fontSize: 28 }}>Clases</div>
        <span style={{ fontSize: 12.5, color: g.suave }}>en {negocio.nombre.split(' ').pop()}</span>
      </div>
      <div className="g-sin-barra" style={compu
        ? { display: 'grid', gridTemplateColumns: `repeat(${negocio.info.clases.length}, minmax(0, 1fr))`, gap: 10 }
        : { display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 4px' }}>
        {negocio.info.clases.map((c) => {
          const foto = fotoClase(c);
          const caja = compu ? { height: 150 } : { width: 168, height: 128, flexShrink: 0 };
          const contenido = (
            <div style={{ height: '100%', boxSizing: 'border-box', padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <Grande tamano={30}>{c}</Grande>
            </div>
          );
          return foto
            ? <Foto key={c} src={foto} style={caja}>{contenido}</Foto>
            : <div key={c} style={{ ...caja, borderRadius: 22, background: g.tarjeta, border: `1px solid ${g.linea}` }}>{contenido}</div>;
        })}
      </div>
    </div>
  );

  // Compu: el gym ahora y las clases a la izquierda; semana, números y pase a la derecha.
  if (compu) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {cabeza}
        <AvisoMembresia socio={s} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>{gymAhora}{clases}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
            <Tarjeta pad={12}><TuSemana visitas={visitas} adentro={pase.adentro_desde} /></Tarjeta>
            {numeros}{tuPase}{tuCuerpo}{mejorHoy}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      {cabeza}
      <TuSemana visitas={visitas} adentro={pase.adentro_desde} />
      {gymAhora}
      <AvisoMembresia socio={s} />
      {numeros}{tuPase}{tuCuerpo}{mejorHoy}{clases}
    </div>
  );
}

// Días seguidos con visita, contando hasta hoy (o hasta ayer si hoy no ha venido).
function rachaDe(visitas, hoy) {
  const dias = new Set(visitas.map((v) => diaMx(v.entra)));
  let d = dias.has(hoy) ? hoy : sumarDias(hoy, -1);
  let n = 0;
  while (dias.has(d)) { n += 1; d = sumarDias(d, -1); }
  return n;
}

function AvisoMembresia({ socio: s }) {
  let texto = null;
  let fuerte = false;
  if (s.estado === 'vencida') { texto = `Tu membresía venció el ${fechaCorta(s.vence)}. Renuévala en recepción para entrar.`; fuerte = true; }
  else if (s.estado === 'adeudo') { texto = `Tienes un adeudo de ${pesos(s.adeudo)}. Pásalo a pagar en recepción.`; fuerte = true; }
  else if (s.estado === 'congelada') texto = 'Tu membresía está congelada. Avísanos en recepción para reactivarla.';
  else if (s.dias <= 7) texto = `Tu membresía vence ${s.dias === 0 ? 'hoy' : `en ${s.dias} día${s.dias === 1 ? '' : 's'}`}. Renuévala para no perder tu acceso.`;
  if (!texto) return null;
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 20, fontSize: 13.5, fontWeight: 500, lineHeight: 1.45,
      background: fuerte ? g.pri : g.tarjeta, color: fuerte ? g.priTexto : g.texto, border: fuerte ? 'none' : `1px solid ${g.linea}`,
    }}>{texto}</div>
  );
}

// Los 7 días de esta semana, con los que vino marcados (punto) y hoy en acento.
function TuSemana({ visitas, adentro }) {
  const hoy = diaMx(Date.now());
  const [semana, setSemana] = useState(0); // 0 = esta semana, -1 = la pasada…
  const [elegido, setElegido] = useState(hoy);
  const lunes = sumarDias(hoy, 1 - diaSemanaMx() + semana * 7);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const porDia = useMemo(() => {
    const m = new Map();
    visitas.forEach((v) => { const d = diaMx(v.entra); m.set(d, [...(m.get(d) || []), v]); });
    return m;
  }, [visitas]);
  const letras = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const delDia = (porDia.get(elegido) || []).slice().reverse();
  const mover = (n) => {
    const nueva = Math.min(0, Math.max(-4, semana + n));
    setSemana(nueva);
    const l = sumarDias(hoy, 1 - diaSemanaMx() + nueva * 7);
    setElegido(nueva === 0 ? hoy : l);
  };
  const flecha = (n, Icono, deshabilitada) => (
    <button type="button" onClick={() => mover(n)} disabled={deshabilitada} aria-label={n < 0 ? 'Semana anterior' : 'Semana siguiente'} style={{
      width: 32, height: 32, borderRadius: '50%', border: 'none', background: g.sup2, color: g.texto, cursor: deshabilitada ? 'default' : 'pointer',
      opacity: deshabilitada ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}><Icono size={16} /></button>
  );
  const fecha = new Date(`${elegido}T12:00:00Z`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 8px' }}>
        <span style={{ fontSize: 13, color: g.suave }}>{semana === 0 ? 'Esta semana' : semana === -1 ? 'Semana pasada' : `Hace ${-semana} semanas`}</span>
        <div style={{ display: 'flex', gap: 6 }}>{flecha(-1, ChevronLeft, semana <= -4)}{flecha(1, ChevronRight, semana >= 0)}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {dias.map((d, i) => {
          const sel = d === elegido;
          const futuro = d > hoy;
          const si = porDia.has(d);
          return (
            <motion.button key={d} type="button" disabled={futuro} onClick={() => setElegido(d)} whileTap={futuro ? undefined : { scale: 0.94 }}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              style={{
                textAlign: 'center', padding: '8px 0 9px', borderRadius: 16, fontSize: 12, border: 'none', cursor: futuro ? 'default' : 'pointer',
                background: sel ? g.pri : 'transparent', color: sel ? g.priTexto : g.suave,
                boxShadow: d === hoy && !sel ? 'inset 0 0 0 1.5px var(--g-tenue)' : undefined,
              }}>
              {letras[i]}
              <div style={{ fontSize: 16, fontWeight: sel ? 700 : 500, color: sel ? g.priTexto : futuro ? g.tenue : g.texto, marginTop: 4 }}>{Number(d.slice(8))}</div>
              <div style={{ width: 4, height: 4, borderRadius: 4, margin: '5px auto 0', background: si ? (sel ? g.priTexto : g.pri) : 'transparent' }} />
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={elegido} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          style={{ marginTop: 10, padding: '12px 14px', borderRadius: 18, background: g.sup2, fontSize: 13.5 }}>
          <div style={{ fontSize: 12, color: g.suave, textTransform: 'capitalize', marginBottom: delDia.length ? 8 : 4 }}>{elegido === hoy ? `Hoy · ${fecha}` : fecha}</div>
          {!delDia.length && <div>{elegido === hoy ? 'Aún no vienes hoy.' : 'Este día no viniste.'}</div>}
          {delDia.map((v) => {
            const ahora = adentro && !v.sale && elegido === hoy;
            return (
              <div key={v.entra} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '3px 0' }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: ahora ? g.pri : g.texto, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{hora(v.entra)}{v.sale ? ` → ${hora(v.sale)}` : ''}</span>
                <b style={{ fontWeight: 600 }}>{ahora ? 'Entrenando' : v.min != null ? duracion(v.min) : ''}</b>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── PASE ────────────────────────────────────────────────────────────────────
function Pase({ pase }) {
  const compu = useAncho(1000);
  const s = pase.socio;
  const restan = useRestan(pase);
  const qr = (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 16, padding: compu ? '34px 0' : '22px 0 8px', ...(compu ? { background: g.tarjeta, border: `1px solid ${g.linea}`, borderRadius: 26 } : {}) }}>
      <QrBlanco token={pase.token} tamano={compu ? 300 : 226} radio={30} pad={22} />
      <div style={{ width: compu ? 344 : 270 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: g.suave }}>Se renueva solo</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{restan} s</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: '#262626', marginTop: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(restan / pase.segundos) * 100}%`, background: g.pri, transition: 'width .25s linear' }} />
        </div>
      </div>
      <div style={{ color: g.suave, fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
        {pase.adentro_desde ? 'Pásalo también por el lector al salir.' : 'Acércalo al lector de la entrada.'}<br />Las capturas de pantalla no sirven.
      </div>
    </div>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 2px 0' }}>
        <div style={{ ...titular, fontSize: 44 }}>Tu pase</div>
        <ChipEstado pase={pase} />
      </div>
      <Columnas proporcion="1.2fr 1fr" izq={qr} der={<>
      <Tarjeta pad={16}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {[['Socio', `#${s.numero}`], ['Plan', s.plan], ['Vence', fechaCorta(s.vence)]].map(([e, v]) => (
            <div key={e} style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: g.suave }}>{e}</div>
              <div style={{ fontWeight: 600, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
            </div>
          ))}
        </div>
      </Tarjeta>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 18, background: g.tarjeta, border: `1px solid ${g.linea}`, fontSize: 13 }}>
        <Sun size={18} color="var(--g-pri)" /> Sube el brillo para que el lector lo lea a la primera.
      </div>
      {compu && (
        <Tarjeta titulo="Cómo entrar">
          <div style={{ display: 'grid', gap: 12, fontSize: 13.5, lineHeight: 1.45 }}>
            {['Abre tu pase en el celular al llegar.', 'Pásalo por el lector de la entrada: el torniquete se abre solo.', 'Al salir, pásalo otra vez para registrar tu salida.'].map((x, i) => (
              <div key={x} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: g.sup2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ paddingTop: 3 }}>{x}</span>
              </div>
            ))}
          </div>
        </Tarjeta>
      )}
      </>} />
    </div>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      <Titulo chico="Ahora mismo" accion={<EnVivo />}>¿Qué tan lleno?</Titulo>
      <Columnas proporcion="1fr 1fr" izq={<>
      <Foto src={FOTOS.piso} radio={26} style={{ height: 280 }}>
        <div style={{ height: '100%', boxSizing: 'border-box', padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 13, color: '#CFCFCA' }}>Personas adentro</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <Grande tamano={96}><NumeroVivo valor={aforo.adentro} /></Grande>
            <Grande tamano={32} style={{ color: '#9A9A95' }}>/ {aforo.capacidad}</Grande>
            <span style={{ marginLeft: 'auto' }}><Chip relleno>{nivel.texto} · {nivel.pct}%</Chip></span>
          </div>
          <Barra valor={aforo.adentro / aforo.capacidad} style={{ marginTop: 12 }} />
        </div>
      </Foto>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Tarjeta pad={15}>
          <div style={{ fontSize: 12.5, color: g.suave }}>Lo usual a esta hora</div>
          <Grande tamano={40} style={{ marginTop: 8 }}>{usual}</Grande>
          <div style={{ fontSize: 12, color: g.suave, marginTop: 6 }}>{dif === 0 ? 'Igual que siempre' : dif > 0 ? `${dif} más que lo usual` : `${-dif} menos que lo usual`}</div>
        </Tarjeta>
        <Tarjeta acento pad={15}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>Mejor hora hoy</div>
          <Grande tamano={40} style={{ marginTop: 8 }}>{mejor ? `${mejor.h}:00` : '—'}</Grande>
          <div style={{ fontSize: 12, fontWeight: 500, marginTop: 6 }}>{mejor ? `~${mejor.personas} personas` : 'Ya casi cerramos'}</div>
        </Tarjeta>
      </div>
      </>} der={<>
      <Tarjeta titulo="Hoy contra lo usual" accion={<span style={{ fontSize: 12, color: g.suave }}>por hora</span>}>
        <BarrasHora aforo={aforo} alto={170} desde={6} hasta={22} />
      </Tarjeta>
      <Tarjeta titulo="Horas tranquilas" accion={<span style={{ fontSize: 12, color: g.suave }}>últimas 4 semanas</span>}>
        {calor ? <MapaCalor celdas={calor} capacidad={aforo.capacidad} diaHoy={diaSemanaMx()} horaHoy={horaMx()} /> : <div style={{ height: 180 }} />}
      </Tarjeta>
      </>} />
    </div>
  );
}

// ── VISITAS ─────────────────────────────────────────────────────────────────
function Visitas({ visitas, adentro, sinTitulo = false }) {
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
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      {!sinTitulo && <Titulo chico="Tu progreso">Tus visitas</Titulo>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {[
          { e: 'Este mes', v: <NumeroVivo valor={delMes.length} />, acento: true },
          { e: 'Por semana', v: (ultimas4 / 4).toFixed(1) },
          { e: 'Promedio', v: promedio ? duracion(promedio) : '—' },
        ].map((x) => (
          <Tarjeta key={x.e} pad={14} acento={x.acento}>
            <div style={{ fontSize: 12, color: x.acento ? 'inherit' : g.suave }}>{x.e}</div>
            <Grande tamano={x.e === 'Promedio' ? 26 : 36} style={{ marginTop: 8, whiteSpace: 'nowrap' }}>{x.v}</Grande>
          </Tarjeta>
        ))}
      </div>

      <Columnas proporcion="1fr 1fr" izq={
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
                  background: si ? g.pri : 'transparent', color: si ? g.priTexto : dia > hoy ? 'rgba(255,255,255,0.18)' : g.suave,
                  boxShadow: esHoy && !si ? 'inset 0 0 0 1.5px var(--g-texto)' : undefined,
                }}>{i + 1}</motion.div>
            );
          })}
        </div>
      </Tarjeta>

      } der={
      <Tarjeta titulo="Historial">
        {!visitas.length && <Vacio icono={CalendarDays}>Aún no tienes visitas. Hoy es buen día.</Vacio>}
        <div style={{ display: 'grid' }}>
          {visitas.slice(0, 12).map((v, i) => {
            const ahora = adentro && !v.sale && i === 0;
            return (
              <div key={v.entra} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i ? `1px solid ${g.linea}` : 'none' }}>
                <IconoCirculo icono={ahora ? Activity : CheckCircle2} color={ahora ? 'var(--g-pri)' : g.texto} tamano={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{diaRelativo(v.entra)}</div>
                  <div style={{ fontSize: 12, color: g.suave }}>{hora(v.entra)}{v.sale ? ` → ${hora(v.sale)}` : ''}</div>
                </div>
                {ahora ? <Chip relleno punto>Entrenando</Chip> : v.min != null && <span style={{ fontSize: 13, fontWeight: 600, color: g.suave }}>{duracion(v.min)}</span>}
              </div>
            );
          })}
        </div>
      </Tarjeta>
      } />
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
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '6px 2px 4px' }}>
        <Avatar nombre={s.nombre} foto={fotoSocio(s.numero)} tamano={64} />
        <div style={{ minWidth: 0 }}>
          <div style={{ ...titular, fontSize: 34 }}>{s.nombre}</div>
          <div style={{ fontSize: 13, color: g.suave, marginTop: 4 }}>Socio #{s.numero}</div>
        </div>
      </div>
      <Columnas proporcion="1.2fr 1fr" izq={<>
      <Tarjeta>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: g.suave }}>Tu plan</span>
          {s.estado === 'activa' ? <Chip relleno>{estado.texto}</Chip> : <Chip color={estado.color}>{estado.texto}</Chip>}
        </div>
        <div style={{ ...titular, fontSize: 36, marginTop: 8 }}>{s.plan}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
          <Grande tamano={56}>{Math.max(0, s.dias)}</Grande>
          <span style={{ color: g.suave, fontSize: 14 }}>días restantes · vence {fechaCorta(s.vence)}</span>
        </div>
        <Barra valor={plan ? Math.max(0, s.dias) / plan.dias : 0} style={{ marginTop: 12 }} />
        <div style={{ fontSize: 12.5, color: g.suave, marginTop: 10 }}>Horario: {s.horario}</div>
      </Tarjeta>
      <AvisoMembresia socio={s} />

      <Tarjeta titulo="Planes" accion={<span style={{ fontSize: 12, color: g.suave }}>Cámbiate en recepción</span>}>
        <div style={{ display: 'grid', gap: 8 }}>
          {planes.map((p) => {
            const tuyo = p.id === s.plan_id;
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 18,
                background: tuyo ? g.pri : g.sup2, color: tuyo ? g.priTexto : g.texto,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{p.nombre}{tuyo && ' · tu plan'}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{p.dias} días · {p.hora_desde == null ? 'Horario libre' : `${p.hora_desde}:00 a ${p.hora_hasta}:00`}</div>
                </div>
                <Grande tamano={26}>{pesos(p.precio)}</Grande>
              </div>
            );
          })}
        </div>
      </Tarjeta>

      </>} der={<>
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
      </>} />
    </div>
  );
}

// ── BIENVENIDA (cuando recepción lee su pase) ───────────────────────────────
function Bienvenida({ aviso, nombre, aforo }) {
  const ok = aviso.permitido;
  const entrada = aviso.tipo === 'entrada';
  const estuvo = !entrada && aviso.entroA ? minutosDesde(aviso.entroA, new Date(aviso.creado).getTime()) : null;
  const Icono = !ok ? XCircle : entrada ? CheckCircle2 : LogOut;
  const fondo = !ok ? 'var(--g-rojo)' : entrada ? '#F3F3EE' : '#151515';
  const tinta = !ok ? '#FFFFFF' : entrada ? '#0A0A0A' : g.texto;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9600, display: 'flex', alignItems: 'flex-end', background: fondo, color: tinta, fontFamily: g.fuente }}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        style={{ width: '100%', maxWidth: 460, margin: '0 auto', padding: '0 26px 64px', boxSizing: 'border-box' }}>
        <Icono size={54} strokeWidth={1.8} />
        <div style={{ ...titular, fontWeight: 700, fontSize: 'clamp(64px, 20vw, 92px)', marginTop: 18 }}>
          {!ok ? 'No pasa' : entrada ? 'Adelante' : 'Hasta luego'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, marginTop: 10 }}>{!ok ? aviso.motivo : entrada ? `Bienvenido, ${nombre}` : `Buen entrenamiento, ${nombre}`}</div>
        <div style={{ fontSize: 15, opacity: 0.7, marginTop: 8 }}>
          {ok && (entrada ? `Entrada ${hora(aviso.creado)}${aforo ? ` · hay ${aforo.adentro + 1} personas` : ''}`
            : `Salida ${hora(aviso.creado)}${estuvo != null ? ` · entrenaste ${duracion(estuvo)}` : ''}`)}
        </div>
      </motion.div>
    </motion.div>
  );
}
