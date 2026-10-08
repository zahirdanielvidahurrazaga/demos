import { useCallback, useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, CheckCircle2, Hand, Keyboard, LogIn, LogOut, QrCode, ScanLine, Search, Smartphone, UserRound, Users, Usb, XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  ESTADOS, diaRelativo, duracion, errorLegible, fechaCorta, hora, minutosDesde, nivelAforo, pesos, sonar, useAccesos, useAhora, useRpc,
} from './datos';
import Escaner from './Escaner';
import {
  Anillo, Avatar, Boton, Chip, EnVivo, Hoja, IconoCirculo, Logo, NumeroVivo, Segmentado, Tarjeta, Titulo, Vacio, g, useAncho,
} from './ui';
import { AforoMini, AppMarco, Notificaciones } from './marco';

// ─────────────────────────────────────────────────────────────────────────────
// Recepción: Escanear (cámara o lector USB, el resultado en grande y lo que se
// puede hacer ahí mismo), En vivo (la bitácora que se mueve sola) y Socios
// (buscar, ver su ficha y registrarlo a mano). En la compu, menú a la izquierda.
// ─────────────────────────────────────────────────────────────────────────────

const MODOS = [
  { id: 'auto', etiqueta: 'Automático' },
  { id: 'entrada', etiqueta: 'Solo entrada' },
  { id: 'salida', etiqueta: 'Solo salida' },
];

const PRUEBAS = [
  { numero: 1001, caso: 'Al corriente' },
  { numero: 1002, caso: 'Vencida' },
  { numero: 1003, caso: 'Adeudo' },
  { numero: 1004, caso: 'Plan matutino' },
  { numero: 1005, caso: 'Congelada' },
];

export default function Recepcion({ negocio, arriba }) {
  const compu = useAncho(1000);
  const [tab, setTab] = useState('escanear');
  const [modo, setModo] = useState('auto');
  const [resultado, setResultado] = useState(null);
  const [destello, setDestello] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [ficha, setFicha] = useState(null);
  const { accesos } = useAccesos(negocio.id, { limite: 60 });
  const { datos: tablero } = useRpc('gym_tablero', { p_negocio: negocio.id }, { enVivo: true, cada: 60000 });
  const aforo = tablero?.aforo;

  const mostrar = (data, extra = {}) => {
    if (data?.resultado === 'repetido') return;
    const r = { ...data, ...extra, t: Date.now() };
    setResultado(r);
    setDestello({ ok: r.resultado === 'ok', t: r.t });
    sonar(r.resultado === 'ok');
    setTab('escanear');
  };

  const registrarCodigo = async (codigo, metodo = 'qr') => {
    setError('');
    const { data, error: e } = await supabase.rpc('gym_registrar', { p_negocio: negocio.id, p_codigo: codigo, p_tipo: modo, p_metodo: metodo });
    if (e) { setError(errorLegible(e)); return; }
    mostrar(data);
  };

  const registrarManual = async (socio, { forzar = false, tipo = modo, extra } = {}) => {
    setError('');
    setOcupado(true);
    const { data, error: e } = await supabase.rpc('gym_registrar_manual', { p_negocio: negocio.id, p_socio: socio, p_tipo: tipo, p_forzar: forzar });
    setOcupado(false);
    if (e) { setError(errorLegible(e)); return; }
    mostrar(data, extra);
  };

  const regularizar = async (socio) => {
    setError('');
    setOcupado(true);
    const { data, error: e } = await supabase.rpc('gym_regularizar', { p_negocio: negocio.id, p_socio: socio });
    setOcupado(false);
    if (e) { setError(errorLegible(e)); return; }
    await registrarManual(socio, { tipo: 'entrada', extra: { cobro: data } });
  };

  const pestanas = [
    { id: 'vivo', etiqueta: 'En vivo', icono: Activity },
    { id: 'socios', etiqueta: 'Socios', icono: Users },
  ];

  return (
    <>
      <AppMarco lateral arriba={arriba} pestanas={compu ? [{ id: 'escanear', etiqueta: 'Escanear', icono: ScanLine }, ...pestanas] : pestanas}
        activa={tab} alCambiar={setTab}
        fab={compu ? null : { icono: ScanLine, etiqueta: 'Escanear', onClick: () => setTab('escanear') }}
        logo={<Logo nombre={negocio.nombre} />} pie={<AforoMini aforo={aforo} />}>
        {!compu && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '4px 2px 14px' }}>
            <Logo nombre={negocio.nombre} compacto />
            {aforo && <PildoraAforo aforo={aforo} />}
          </div>
        )}
        {tab === 'escanear' && (
          <Escanear compu={compu} negocio={negocio} modo={modo} setModo={setModo} resultado={resultado} ocupado={ocupado} error={error}
            accesos={accesos} alLeer={registrarCodigo} alRegularizar={regularizar}
            alForzar={(id) => registrarManual(id, { forzar: true, tipo: 'entrada' })} alVerFicha={setFicha} alIr={setTab} />
        )}
        {tab === 'vivo' && <Bitacora accesos={accesos} tablero={tablero} alVerFicha={setFicha} />}
        {tab === 'socios' && <Socios negocio={negocio} adentro={tablero?.adentro || []} alVerFicha={setFicha} />}
      </AppMarco>

      <Notificaciones accesos={tab === 'vivo' ? null : accesos} arriba={arriba} ignorar={resultado?.socio && { id: resultado.socio.id, t: resultado.t }} />

      <Hoja abierta={!!ficha} alCerrar={() => setFicha(null)} titulo="Ficha del socio">
        {ficha && (
          <Ficha negocio={negocio} id={ficha} ocupado={ocupado}
            alRegistrar={(tipo) => { setFicha(null); registrarManual(ficha, { tipo }); }}
            alRegularizar={() => { setFicha(null); regularizar(ficha); }} />
        )}
      </Hoja>

      {/* Destello de color en toda la pantalla, como el torniquete */}
      <AnimatePresence>
        {destello && (
          <motion.div key={destello.t} initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 1.1, ease: 'easeOut' }}
            onAnimationComplete={() => setDestello(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 9440, pointerEvents: 'none', boxShadow: `inset 0 0 160px 20px ${destello.ok ? 'var(--g-verde)' : 'var(--g-rojo)'}` }} />
        )}
      </AnimatePresence>
    </>
  );
}

function PildoraAforo({ aforo }) {
  const n = nivelAforo(aforo.adentro, aforo.capacidad, aforo.alerta_pct);
  return <Chip color={n.color} punto>{aforo.adentro}/{aforo.capacidad} · {n.texto}</Chip>;
}

// ── ESCANEAR ────────────────────────────────────────────────────────────────
function Escanear({ compu, negocio, modo, setModo, resultado, ocupado, error, accesos, alLeer, alRegularizar, alForzar, alVerFicha, alIr }) {
  const escaner = (
    <Tarjeta titulo="Escáner" accion={<span style={{ fontSize: 11.5, color: g.tenue, display: 'flex', alignItems: 'center', gap: 5 }}><QrCode size={13} /> Torniquete 1</span>}>
      <div style={{ marginBottom: 12 }}><Segmentado id="modo" opciones={MODOS} valor={modo} alCambiar={setModo} /></div>
      <Escaner alLeer={alLeer} />
    </Tarjeta>
  );
  const res = <Resultado resultado={resultado} ocupado={ocupado} error={error} alRegularizar={alRegularizar} alForzar={alForzar} alVerFicha={alVerFicha} />;
  const pruebas = <PasesPrueba negocio={negocio} alEscanear={(token) => alLeer(token, 'qr')} compu={compu} />;

  if (!compu) return <div style={{ display: 'grid', gap: 12 }}>{escaner}{res}{pruebas}</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 430px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 16 }}>{escaner}{pruebas}</div>
      <div style={{ display: 'grid', gap: 16 }}>
        {res}
        <Tarjeta titulo="Últimos movimientos" accion={<button type="button" onClick={() => alIr('vivo')} style={{ border: 'none', background: 'none', color: g.pri2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ver todo</button>}>
          <ListaAccesos accesos={accesos.slice(0, 7)} alVerFicha={alVerFicha} />
        </Tarjeta>
      </div>
    </div>
  );
}

function Resultado({ resultado: r, ocupado, error, alRegularizar, alForzar, alVerFicha }) {
  if (error) return <Tarjeta><div style={{ color: g.rojo }}>{error}</div></Tarjeta>;
  if (!r) {
    return (
      <Tarjeta style={{ minHeight: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {[0, 1].map((i) => (
              <motion.span key={i} initial={{ scale: 0.7, opacity: 0.5 }} animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 1.2, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '2px solid var(--g-pri)' }} />
            ))}
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: g.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px color-mix(in srgb, var(--g-pri) 45%, transparent)' }}>
              <ScanLine size={32} color="#fff" />
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>Listo para escanear</div>
          <div style={{ color: g.suave, fontSize: 13.5, maxWidth: 320, lineHeight: 1.5 }}>
            Escanea un pase, toca un <b style={{ color: g.texto }}>pase de prueba</b> o busca al socio en "Socios".
          </div>
        </div>
      </Tarjeta>
    );
  }
  const ok = r.resultado === 'ok';
  const salida = ok && r.tipo === 'salida';
  const color = !ok ? 'var(--g-rojo)' : salida ? g.azul : 'var(--g-verde)';
  const s = r.socio;
  const estado = s ? ESTADOS[s.estado] : null;
  const titulo = !ok ? (r.resultado === 'invalido' ? 'QR inválido' : 'Acceso negado')
    : salida ? 'Salida registrada' : r.forzado ? 'Pasa (autorizado)' : 'Acceso permitido';
  const Icono = !ok ? XCircle : salida ? LogOut : CheckCircle2;

  let accion = null;
  if (!ok && s && r.resultado === 'denegado') {
    if (s.estado === 'vencida') accion = { texto: `Renovar ${s.plan} · ${pesos(Number(s.precio) + Number(s.adeudo))} y dejar pasar`, fn: () => alRegularizar(s.id) };
    else if (s.estado === 'adeudo') accion = { texto: `Cobrar ${pesos(s.adeudo)} y dejar pasar`, fn: () => alRegularizar(s.id) };
    else if (s.estado === 'congelada') accion = { texto: 'Reactivar y dejar pasar', fn: () => alRegularizar(s.id) };
  }

  return (
    <motion.section key={r.t}
      initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={ok ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1, scale: 1, y: 0, x: [0, -10, 9, -6, 4, 0] }}
      transition={{ type: 'spring', stiffness: 320, damping: 24, x: { duration: 0.45 } }}
      style={{ borderRadius: 26, overflow: 'hidden', border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`, background: g.tarjeta, boxShadow: `0 20px 60px color-mix(in srgb, ${color} 18%, transparent)` }}>
      <div style={{ position: 'relative', padding: '22px 20px', display: 'flex', alignItems: 'center', gap: 16, background: `linear-gradient(135deg, color-mix(in srgb, ${color} 85%, black), color-mix(in srgb, ${color} 55%, black))`, color: '#fff', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.span initial={{ scale: 0.6, opacity: 0.8 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.9 }}
            style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #fff' }} />
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.05 }}>
            <Icono size={56} strokeWidth={2} />
          </motion.div>
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{titulo}</div>
          {(r.motivo || (salida && r.desde)) && (
            <div style={{ marginTop: 6, fontSize: 14, opacity: 0.92 }}>{salida && r.desde ? `Entró a las ${hora(r.desde)} · ${duracion(minutosDesde(r.desde))}` : r.motivo}</div>
          )}
        </div>
        {r.aforo && (
          <div style={{ position: 'relative', textAlign: 'right', fontSize: 11.5, opacity: 0.9 }}>Adentro<br />
            <b style={{ fontSize: 22, fontWeight: 800 }}><NumeroVivo valor={r.aforo.adentro} /></b><span style={{ opacity: 0.7 }}>/{r.aforo.capacidad}</span>
          </div>
        )}
      </div>
      {s && (
        <button type="button" onClick={() => alVerFicha(s.id)} style={{ width: '100%', border: 'none', background: 'transparent', color: g.texto, textAlign: 'left', cursor: 'pointer', padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar nombre={s.nombre} tamano={56} color={color} />
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>{s.nombre}</div>
            <div style={{ color: g.suave, fontSize: 13 }}>Socio #{s.numero} · {s.plan} · {s.horario}</div>
          </div>
          <div style={{ textAlign: 'right', display: 'grid', justifyItems: 'end', gap: 6 }}>
            <Chip color={estado.color}>● {estado.texto}</Chip>
            <div style={{ color: g.suave, fontSize: 12 }}>{s.dias >= 0 ? `Vence ${fechaCorta(s.vence)} · ${s.dias} días` : `Venció ${fechaCorta(s.vence)}`}</div>
          </div>
        </button>
      )}
      {r.cobro && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ margin: '0 20px 16px', padding: '12px 14px', borderRadius: 16, background: 'color-mix(in srgb, var(--g-verde) 13%, transparent)', color: g.verde, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} /> {r.cobro.monto > 0 ? `Cobrado ${pesos(r.cobro.monto)} · ` : ''}{r.cobro.concepto}
        </motion.div>
      )}
      {!ok && s && r.resultado === 'denegado' && (
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {accion && <Boton variante="verde" disabled={ocupado} onClick={accion.fn}>{accion.texto}</Boton>}
          {!accion && <Boton variante="suave" disabled={ocupado} onClick={() => alForzar(s.id)}><Hand size={16} /> Dejar pasar de todos modos</Boton>}
        </div>
      )}
    </motion.section>
  );
}

function PasesPrueba({ negocio, alEscanear, compu }) {
  const [pases, setPases] = useState({});
  const [falla, setFalla] = useState('');
  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      const r = await Promise.all(PRUEBAS.map((p) => supabase.rpc('gym_pase_prueba', { p_negocio: negocio.id, p_numero: p.numero })));
      if (!vivo) return;
      const nuevo = {};
      r.forEach(({ data }, i) => { if (data) nuevo[PRUEBAS[i].numero] = data; });
      setPases(nuevo);
      const e = r.find((x) => x.error)?.error;
      setFalla(e ? errorLegible(e) : '');
      if (e) setTimeout(() => { if (vivo) cargar(); }, 3000);
    };
    cargar();
    const t = setInterval(cargar, 15000);
    return () => { vivo = false; clearInterval(t); };
  }, [negocio.id]);

  const enlace = `${window.location.origin}/gimnasio/${negocio.id}?rol=socio`;
  return (
    <Tarjeta titulo="Pases de prueba" accion={<span style={{ fontSize: 11.5, color: g.tenue }}>Toca uno para escanearlo</span>}>
      {falla && <div style={{ color: g.rojo, fontSize: 13, marginBottom: 10 }}>No se pudieron cargar los pases: {falla}</div>}
      <div className="g-sin-barra" style={compu ? { display: 'grid', gap: 8 } : { display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -18px', padding: '0 18px 4px', scrollSnapType: 'x mandatory' }}>
        {PRUEBAS.map((p) => {
          const pase = pases[p.numero];
          const s = pase?.socio;
          const color = s ? ESTADOS[s.estado].color : g.tenue;
          return (
            <motion.button key={p.numero} type="button" disabled={!pase} whileTap={{ scale: 0.96 }} onClick={() => alEscanear(pase.token)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderRadius: 18, border: `1px solid ${g.linea}`, scrollSnapAlign: 'start',
              background: g.sup2, color: g.texto, cursor: pase ? 'pointer' : 'default', textAlign: 'left', flexShrink: 0, width: compu ? 'auto' : 250,
            }}>
              <div style={{ background: '#fff', padding: 4, borderRadius: 10, lineHeight: 0, flexShrink: 0 }}>
                {pase ? <QRCodeSVG value={pase.token} size={48} level="L" /> : <div style={{ width: 48, height: 48 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s?.nombre || '…'}</div>
                <div style={{ fontSize: 11.5, color: g.suave }}>#{p.numero} · {s?.plan}</div>
              </div>
              <Chip color={color}>{p.caso}</Chip>
            </motion.button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, padding: 12, borderRadius: 18, background: 'color-mix(in srgb, var(--g-pri) 10%, var(--g-sup2))', border: '1px solid color-mix(in srgb, var(--g-pri) 25%, transparent)' }}>
        <div style={{ background: '#fff', padding: 5, borderRadius: 10, lineHeight: 0 }}><QRCodeSVG value={enlace} size={60} level="L" /></div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
          <b style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}><Smartphone size={15} color="var(--g-pri)" /> Pruébalo con tu celular</b>
          <span style={{ color: g.suave }}>Escanea este código: se abre el pase del socio. Luego escanéalo aquí con la cámara.</span>
        </div>
      </div>
    </Tarjeta>
  );
}

// ── EN VIVO (bitácora) ──────────────────────────────────────────────────────
const FILTROS = [
  { id: 'todo', etiqueta: 'Todo' },
  { id: 'entrada', etiqueta: 'Entradas' },
  { id: 'salida', etiqueta: 'Salidas' },
  { id: 'negado', etiqueta: 'Negados' },
];

function Bitacora({ accesos, tablero, alVerFicha }) {
  const [filtro, setFiltro] = useState('todo');
  const lista = accesos.filter((a) => (filtro === 'todo' ? true : filtro === 'negado' ? !a.permitido : a.permitido && a.tipo === filtro));
  const a = tablero?.aforo;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Titulo chico="Hoy" accion={<EnVivo />}>Bitácora</Titulo>
      {tablero && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <Tarjeta pad={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Anillo valor={a.adentro / a.capacidad} tamano={46} grosor={6}><span /></Anillo>
              <div><div style={{ fontSize: 22, fontWeight: 700 }}><NumeroVivo valor={a.adentro} /></div><div style={{ fontSize: 11.5, color: g.suave }}>adentro</div></div>
            </div>
          </Tarjeta>
          <Tarjeta pad={14}>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}><NumeroVivo valor={tablero.hoy.entradas} degradado /></div>
            <div style={{ fontSize: 11.5, color: g.suave }}>entradas hoy</div>
          </Tarjeta>
          <Tarjeta pad={14}>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: tablero.hoy.denegados ? g.rojo : g.texto }}><NumeroVivo valor={tablero.hoy.denegados} /></div>
            <div style={{ fontSize: 11.5, color: g.suave }}>negados</div>
          </Tarjeta>
        </div>
      )}
      <Segmentado id="filtro" opciones={FILTROS} valor={filtro} alCambiar={setFiltro} />
      <Tarjeta pad={14}>
        {!lista.length ? <Vacio icono={Activity}>Nada por aquí todavía.</Vacio> : <ListaAccesos accesos={lista} alVerFicha={alVerFicha} />}
      </Tarjeta>
    </div>
  );
}

function ListaAccesos({ accesos, alVerFicha }) {
  return (
    <div style={{ display: 'grid' }}>
      <AnimatePresence initial={false}>
        {accesos.map((a, i) => {
          const color = !a.permitido ? 'var(--g-rojo)' : a.tipo === 'entrada' ? 'var(--g-verde)' : g.azul;
          const Icono = !a.permitido ? XCircle : a.tipo === 'entrada' ? LogIn : LogOut;
          const MetodoIcono = a.metodo === 'manual' ? Keyboard : a.metodo === 'lector' ? Usb : QrCode;
          return (
            <motion.button key={a.id} type="button" layout initial={{ opacity: 0, x: -14, backgroundColor: 'rgba(255,255,255,0.06)' }}
              animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(255,255,255,0)' }} transition={{ duration: 0.5 }}
              onClick={() => a.socio_id && alVerFicha(a.socio_id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 6px', border: 'none', borderTop: i ? `1px solid ${g.linea}` : 'none',
                color: g.texto, textAlign: 'left', cursor: a.socio_id ? 'pointer' : 'default', width: '100%', borderRadius: 0,
              }}>
              <div style={{ position: 'relative' }}>
                <Avatar nombre={a.gym_socios?.nombre || '?'} tamano={38} color={color} />
                <span style={{ position: 'absolute', right: -3, bottom: -3, width: 18, height: 18, borderRadius: '50%', background: 'var(--g-fondo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icono size={12} color={color} strokeWidth={2.6} />
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.gym_socios?.nombre || 'QR desconocido'}</div>
                <div style={{ fontSize: 12, color: a.permitido ? g.suave : g.rojo, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.permitido ? (a.tipo === 'entrada' ? 'Entró' : 'Salió') : a.motivo}
                </div>
              </div>
              <MetodoIcono size={14} color="var(--g-tenue)" />
              <span style={{ fontSize: 12.5, color: g.suave, fontVariantNumeric: 'tabular-nums', width: 40, textAlign: 'right' }}>{hora(a.creado)}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ── SOCIOS ──────────────────────────────────────────────────────────────────
function Socios({ negocio, adentro, alVerFicha }) {
  const [q, setQ] = useState('');
  const [lista, setLista] = useState([]);
  const ahora = useAhora(30000);
  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) { setLista([]); return undefined; }
    const t = setTimeout(async () => {
      let consulta = supabase.from('gym_socios').select('id, nombre, numero, vence, adeudo, congelada, plan').eq('negocio', negocio.id).limit(12);
      consulta = /^\d+$/.test(texto) ? consulta.eq('numero', Number(texto)) : consulta.ilike('nombre', `%${texto}%`);
      const { data } = await consulta.order('nombre');
      setLista(data || []);
    }, 220);
    return () => clearTimeout(t);
  }, [q, negocio.id]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Titulo chico="¿Olvidó su celular?">Socios</Titulo>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 18px', background: g.tarjeta, border: `1px solid ${g.linea}`, borderRadius: 22 }}>
        <Search size={19} color="var(--g-suave)" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o número de socio" autoFocus
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: g.texto, fontSize: 16, fontFamily: g.fuente }} />
      </label>
      {q.trim().length >= 2 ? (
        <Tarjeta pad={8}>
          {!lista.length && <Vacio icono={Search}>Nadie con "{q}".</Vacio>}
          {lista.map((s, i) => {
            const estado = estadoDe(s);
            return (
              <button key={s.id} type="button" onClick={() => alVerFicha(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px', border: 'none', borderTop: i ? `1px solid ${g.linea}` : 'none', background: 'transparent', color: g.texto, cursor: 'pointer', textAlign: 'left' }}>
                <Avatar nombre={s.nombre} tamano={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{s.nombre}</div>
                  <div style={{ fontSize: 12, color: g.suave }}>#{s.numero} · vence {fechaCorta(s.vence)}</div>
                </div>
                <Chip color={ESTADOS[estado].color}>{ESTADOS[estado].texto}</Chip>
              </button>
            );
          })}
        </Tarjeta>
      ) : (
        <Tarjeta titulo={`Adentro ahora · ${adentro.length}`} accion={<EnVivo />} pad={14}>
          {!adentro.length && <Vacio icono={Users}>No hay nadie adentro.</Vacio>}
          <div style={{ display: 'grid' }}>
            {adentro.slice(0, 40).map((s, i) => {
              const min = minutosDesde(s.desde, ahora);
              return (
                <button key={s.id} type="button" onClick={() => alVerFicha(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '9px 4px', border: 'none', borderTop: i ? `1px solid ${g.linea}` : 'none', background: 'transparent', color: g.texto, cursor: 'pointer', textAlign: 'left' }}>
                  <Avatar nombre={s.nombre} tamano={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.nombre}</div>
                    <div style={{ fontSize: 12, color: g.suave }}>#{s.numero} · desde {hora(s.desde)}</div>
                  </div>
                  <span style={{ fontSize: 12.5, color: min > 150 ? g.ambar : g.suave }}>{duracion(min)}</span>
                </button>
              );
            })}
          </div>
        </Tarjeta>
      )}
    </div>
  );
}

const hoyMx = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
function estadoDe(s) {
  if (s.congelada) return 'congelada';
  if (s.vence < hoyMx()) return 'vencida';
  if (Number(s.adeudo) > 0) return 'adeudo';
  return 'activa';
}

// Ficha de un socio: sus datos, sus últimas visitas y qué se puede hacer con él.
function Ficha({ negocio, id, ocupado, alRegistrar, alRegularizar }) {
  const [s, setS] = useState(null);
  const { accesos } = useAccesos(negocio.id, { socio: id, limite: 12 });
  const cargar = useCallback(async () => {
    const { data } = await supabase.from('gym_socios')
      .select('id, nombre, numero, vence, adeudo, congelada, alta, gym_planes(nombre, precio, dias, hora_desde, hora_hasta)')
      .eq('id', id).maybeSingle();
    setS(data);
  }, [id]);
  useEffect(() => { cargar(); }, [cargar]);
  const adentro = useMemo(() => {
    const ultimo = accesos.find((a) => a.permitido);
    return ultimo?.tipo === 'entrada' && Date.now() - new Date(ultimo.creado) < 3 * 3600000 ? ultimo.creado : null;
  }, [accesos]);

  if (!s) return <div style={{ height: 300 }} />;
  const estado = estadoDe(s);
  const plan = s.gym_planes;
  const [a, m, d] = s.vence.split('-').map(Number);
  const dias = Math.round((Date.UTC(a, m - 1, d) - new Date(`${hoyMx()}T00:00:00Z`).getTime()) / 86400000);
  const regularizar = estado === 'vencida' ? `Renovar ${plan.nombre} · ${pesos(Number(plan.precio) + Number(s.adeudo))}`
    : estado === 'adeudo' ? `Cobrar ${pesos(s.adeudo)}` : estado === 'congelada' ? 'Reactivar' : null;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Anillo valor={plan ? Math.max(0, dias) / plan.dias : 0} tamano={88} grosor={6}>
          <Avatar nombre={s.nombre} tamano={62} />
        </Anillo>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>{s.nombre}</div>
          <div style={{ fontSize: 13, color: g.suave }}>Socio #{s.numero} · {plan?.nombre}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <Chip color={ESTADOS[estado].color}>● {ESTADOS[estado].texto}</Chip>
            {adentro && <Chip color={g.verde} punto>Adentro desde {hora(adentro)}</Chip>}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          ['Vence', fechaCorta(s.vence)],
          ['Días', dias >= 0 ? dias : `−${-dias}`],
          ['Horario', plan?.hora_desde == null ? 'Libre' : `${plan.hora_desde}–${plan.hora_hasta} h`],
        ].map(([e, v]) => (
          <div key={e} style={{ padding: '12px 10px', borderRadius: 16, background: g.sup2, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: g.tenue }}>{e}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {regularizar && <Boton variante="verde" grande disabled={ocupado} onClick={alRegularizar}><CheckCircle2 size={18} /> {regularizar} y dejar pasar</Boton>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Boton variante={adentro ? 'suave' : 'primario'} disabled={ocupado} onClick={() => alRegistrar('entrada')}><LogIn size={17} /> Entrada</Boton>
          <Boton variante={adentro ? 'primario' : 'suave'} disabled={ocupado} onClick={() => alRegistrar('salida')}><LogOut size={17} /> Salida</Boton>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, color: g.suave, margin: '4px 2px 6px' }}>Últimos movimientos</div>
        {!accesos.length && <Vacio icono={UserRound}>Sin movimientos todavía.</Vacio>}
        {accesos.slice(0, 6).map((x, i) => (
          <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderTop: i ? `1px solid ${g.linea}` : 'none', fontSize: 13 }}>
            <IconoCirculo icono={!x.permitido ? XCircle : x.tipo === 'entrada' ? LogIn : LogOut} tamano={30}
              color={!x.permitido ? 'var(--g-rojo)' : x.tipo === 'entrada' ? 'var(--g-verde)' : g.azul} />
            <span style={{ flex: 1, minWidth: 0, color: x.permitido ? g.texto : g.rojo, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {x.permitido ? (x.tipo === 'entrada' ? 'Entrada' : 'Salida') : x.motivo}
            </span>
            <span style={{ color: g.suave }}>{diaRelativo(x.creado)} · {hora(x.creado)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
