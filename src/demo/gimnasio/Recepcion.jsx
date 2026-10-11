import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, CheckCircle2, Hand, Keyboard, ScanLine, Search, Smartphone, UserPlus, Users, Usb,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  ESTADOS, duracion, errorLegible, fechaCorta, hora, minutosDesde, nivelAforo, pesos, saludo, sonar, useAccesos, useAhora, useRpc,
} from './datos';
import { EstadoLector, useLector } from './Lector';
import {
  Anillo, Avatar, Barra, Boton, Chip, EnVivo, Hoja, IconoCirculo, Logo, NumeroVivo, Segmentado, Tarjeta, Titulo, Vacio, fotoSocio, g, titular, useAncho,
} from './ui';
import { AppMarco, Notificaciones } from './marco';
import { FichaSocio, FormSocio, estadoDe } from './admin';

// ─────────────────────────────────────────────────────────────────────────────
// Recepción: Acceso (lo que lee el lector físico, el resultado en grande y lo
// que se puede hacer ahí mismo), En vivo (la bitácora que se mueve sola) y
// Socios (buscar, ver su ficha y registrarlo a mano). Sin cámara: el QR se lee
// con lector USB; en la demo, las teclas 1–5 pasan los pases de prueba.
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

const PESTANAS = [
  { id: 'escanear', etiqueta: 'Acceso', icono: ScanLine },
  { id: 'vivo', etiqueta: 'En vivo', icono: Activity },
  { id: 'socios', etiqueta: 'Socios', icono: Users },
];

export default function Recepcion({ negocio, arriba }) {
  const compu = useAncho(1000);
  const [tab, setTab] = useState('escanear');
  const [modo, setModo] = useState('auto');
  const [resultado, setResultado] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [ficha, setFicha] = useState(null);
  const [alta, setAlta] = useState(false);
  const [pases, setPases] = useState({});
  const { accesos } = useAccesos(negocio.id, { limite: 60 });
  const { datos: tablero } = useRpc('gym_tablero', { p_negocio: negocio.id }, { enVivo: true, cada: 60000 });
  const aforo = tablero?.aforo;

  const mostrar = (data, extra = {}) => {
    if (data?.resultado === 'repetido') return;
    const r = { ...data, ...extra, t: Date.now() };
    setResultado(r);
    sonar(r.resultado === 'ok');
    setTab('escanear');
  };

  const registrarCodigo = async (codigo, metodo = 'lector') => {
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

  // Pases de prueba: tokens vigentes de los socios 1001…1005 (se renuevan solos).
  useEffect(() => {
    let vivo = true;
    let reintento = null;
    const cargar = async () => {
      const r = await Promise.all(PRUEBAS.map((x) => supabase.rpc('gym_pase_prueba', { p_negocio: negocio.id, p_numero: x.numero })));
      if (!vivo) return;
      const nuevo = {};
      r.forEach(({ data }, i) => { if (data) nuevo[PRUEBAS[i].numero] = data; });
      setPases(nuevo);
      if (r.some((x) => x.error)) reintento = setTimeout(cargar, 3000);
    };
    cargar();
    const t = setInterval(cargar, 15000);
    return () => { vivo = false; clearInterval(t); clearTimeout(reintento); };
  }, [negocio.id]);

  useLector(registrarCodigo, { atajos: PRUEBAS.map((x) => pases[x.numero]?.token) });

  return (
    <>
      <AppMarco lateral arriba={arriba} pestanas={PESTANAS} activa={tab} alCambiar={setTab}
        logo={<Logo nombre={negocio.nombre} sub="Recepción" />} pie={<EstadoLector />}>
        {!compu && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '4px 2px 14px' }}>
            <Logo nombre={negocio.nombre} compacto />
            {aforo && <PildoraAforo aforo={aforo} />}
          </div>
        )}
        {tab === 'escanear' && (
          <Escanear compu={compu} negocio={negocio} modo={modo} setModo={setModo} resultado={resultado} ocupado={ocupado} error={error}
            accesos={accesos} aforo={aforo} pases={pases} arriba={arriba} alLeer={registrarCodigo} alRegularizar={regularizar}
            alForzar={(id) => registrarManual(id, { forzar: true, tipo: 'entrada' })} alVerFicha={setFicha} alIr={setTab} />
        )}
        {tab === 'vivo' && <Bitacora accesos={accesos} tablero={tablero} alVerFicha={setFicha} />}
        {tab === 'socios' && <Socios negocio={negocio} adentro={tablero?.adentro || []} alVerFicha={setFicha} alNuevo={() => setAlta(true)} />}
      </AppMarco>

      <Notificaciones accesos={tab === 'vivo' ? null : accesos} arriba={arriba} ignorar={resultado?.socio && { id: resultado.socio.id, t: resultado.t }} />

      <Hoja abierta={!!ficha} alCerrar={() => setFicha(null)} titulo="Ficha del socio">
        {ficha && (
          <FichaSocio negocio={negocio} id={ficha} ocupado={ocupado}
            alRegistrar={(tipo) => { setFicha(null); registrarManual(ficha, { tipo }); }}
            alRegularizar={() => { setFicha(null); regularizar(ficha); }} />
        )}
      </Hoja>

      <Hoja abierta={alta} alCerrar={() => setAlta(false)} titulo="Nuevo socio">
        {alta && <FormSocio negocio={negocio} alListo={(s) => { setAlta(false); setFicha(s.id); }} />}
      </Hoja>
    </>
  );
}

function PildoraAforo({ aforo }) {
  const n = nivelAforo(aforo.adentro, aforo.capacidad, aforo.alerta_pct);
  return <Chip punto>{aforo.adentro}/{aforo.capacidad} · {n.texto}</Chip>;
}

// ── ACCESO ──────────────────────────────────────────────────────────────────
function Escanear({ compu, negocio, modo, setModo, resultado, ocupado, error, accesos, aforo, pases, arriba, alLeer, alRegularizar, alForzar, alVerFicha, alIr }) {
  const ahora = useAhora(30000);
  const fecha = new Date(ahora).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'America/Mexico_City' }).replace('.', '');
  const res = <Resultado resultado={resultado} ocupado={ocupado} error={error} alRegularizar={alRegularizar} alForzar={alForzar} alVerFicha={alVerFicha} compu={compu} />;
  const pruebas = <PasesPrueba pases={pases} alLeer={(token) => alLeer(token, 'lector')} compu={compu} />;
  const movimientos = (
    <Tarjeta titulo="Últimos movimientos" pad={compu ? 18 : 14} style={compu ? { flex: 1, minHeight: 0 } : undefined}
      accion={<button type="button" onClick={() => alIr('vivo')} style={{ border: 'none', background: 'none', color: g.suave, fontSize: 12.5, cursor: 'pointer' }}>Ver todo</button>}>
      <ListaAccesos accesos={accesos.slice(0, compu ? 6 : 5)} alVerFicha={alVerFicha} />
    </Tarjeta>
  );
  const cabeza = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      <div>
        <div style={{ color: g.suave, fontSize: 13, marginBottom: 6, textTransform: 'capitalize' }}>{fecha} · {saludo().toLowerCase()}</div>
        <h2 style={{ margin: 0, ...titular, fontSize: 44 }}>Acceso</h2>
      </div>
      <div style={{ minWidth: compu ? 330 : '100%' }}><Segmentado id="modo" opciones={MODOS} valor={modo} alCambiar={setModo} /></div>
    </div>
  );

  if (!compu) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
        {cabeza}{res}{pruebas}<ProbarCelular negocio={negocio} />{movimientos}
      </div>
    );
  }
  return (
    <>
      {cabeza}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16, minHeight: `calc(100vh - ${arriba + 150}px)` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ flex: 1, display: 'flex', minHeight: 420 }}>{res}</div>
          {pruebas}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {aforo && <AforoTarjeta aforo={aforo} />}
          {movimientos}
          <ProbarCelular negocio={negocio} />
        </div>
      </div>
    </>
  );
}

function AforoTarjeta({ aforo }) {
  const n = nivelAforo(aforo.adentro, aforo.capacidad, aforo.alerta_pct);
  const usual = aforo.promedio.find((x) => x.h === aforo.hora)?.personas ?? 0;
  return (
    <Tarjeta titulo="Adentro ahora" accion={<EnVivo />}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: -4 }}>
        <span style={{ ...titular, fontSize: 92 }}><NumeroVivo valor={aforo.adentro} /></span>
        <span style={{ ...titular, fontSize: 32, color: g.suave }}>/ {aforo.capacidad}</span>
      </div>
      <Barra valor={aforo.adentro / aforo.capacidad} alto={10} style={{ marginTop: 14 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: g.suave, marginTop: 8 }}>
        <span>{n.texto}</span><span>Lo usual a esta hora: {usual}</span>
      </div>
    </Tarjeta>
  );
}

// El resultado de la lectura, en grande: blanco = pasa, acento = no pasa,
// gris = salida. Se ve desde el otro lado del mostrador.
function Resultado({ resultado: r, ocupado, error, alRegularizar, alForzar, alVerFicha, compu }) {
  const base = { borderRadius: 28, padding: compu ? 34 : 22, width: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden', minHeight: compu ? 420 : 300 };
  if (error) return <div style={{ ...base, background: g.tarjeta, border: `1px solid ${g.linea}`, color: g.rojo, display: 'flex', alignItems: 'center' }}>{error}</div>;
  if (!r) {
    return (
      <div style={{ ...base, background: g.tarjeta, border: `1px solid ${g.linea}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 116, height: 116, borderRadius: '50%', border: '1px solid #3A3A38', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26 }}>
          {[0, 1].map((i) => <span key={i} style={{ position: 'absolute', inset: -18, borderRadius: '50%', border: `1px solid ${g.linea}`, animation: `g-onda 2.4s ${i * 1.2}s infinite` }} />)}
          <ScanLine size={42} color="var(--g-pri)" strokeWidth={1.6} />
        </div>
        <div style={{ ...titular, fontSize: compu ? 64 : 44 }}>Esperando pase</div>
        <div style={{ color: g.suave, fontSize: 14.5, marginTop: 10, maxWidth: 360, lineHeight: 1.5 }}>
          El socio pasa su QR por el lector y aquí sale el resultado.{compu ? ' En la demo, presiona 1–5.' : ''}
        </div>
      </div>
    );
  }
  const ok = r.resultado === 'ok';
  const salida = ok && r.tipo === 'salida';
  const s = r.socio;
  const fondo = !ok ? 'var(--g-rojo)' : salida ? g.sup2 : '#F3F3EE';
  const tinta = !ok ? '#FFFFFF' : salida ? g.texto : '#0A0A0A';
  const titulo = !ok ? (r.resultado === 'invalido' ? 'QR inválido' : s?.estado === 'congelada' ? 'Congelada' : 'No pasa')
    : salida ? 'Hasta luego' : r.forzado ? 'Pasa' : 'Adelante';
  const linea = !ok ? r.motivo
    : salida ? (r.desde ? `Entró a las ${hora(r.desde)} · entrenó ${duracion(minutosDesde(r.desde))}` : 'Salida registrada')
      : r.forzado ? 'Entrada autorizada por recepción' : s ? `Bienvenido, ${s.nombre.split(' ')[0]}` : 'Entrada registrada';
  const foto = s && fotoSocio(s.numero);

  let accion = null;
  if (!ok && s && r.resultado === 'denegado') {
    if (s.estado === 'vencida') accion = { texto: `Renovar ${s.plan} · ${pesos(Number(s.precio) + Number(s.adeudo))} y dejar pasar`, fn: () => alRegularizar(s.id) };
    else if (s.estado === 'adeudo') accion = { texto: `Cobrar ${pesos(s.adeudo)} y dejar pasar`, fn: () => alRegularizar(s.id) };
    else if (s.estado === 'congelada') accion = { texto: 'Reactivar y dejar pasar', fn: () => alRegularizar(s.id) };
  }

  return (
    <motion.section key={r.t}
      initial={{ opacity: 0, scale: 0.97 }} animate={ok ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, x: [0, -10, 9, -6, 4, 0] }}
      transition={{ type: 'spring', stiffness: 320, damping: 26, x: { duration: 0.45 } }}
      style={{ ...base, background: fondo, color: tinta, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {s && (
        <button type="button" onClick={() => alVerFicha(s.id)} aria-label="Ver ficha" style={{
          position: 'absolute', top: compu ? 34 : 22, right: compu ? 34 : 22, width: compu ? 150 : 92, height: compu ? 150 : 92, borderRadius: compu ? 26 : 20,
          border: 'none', cursor: 'pointer', padding: 0, overflow: 'hidden',
          background: foto ? `#222 url(${foto}) center/cover` : 'rgba(0,0,0,0.14)', color: tinta,
          display: 'flex', alignItems: 'center', justifyContent: 'center', ...titular, fontSize: compu ? 56 : 36,
        }}>{!foto && s.nombre.split(' ').slice(0, 2).map((x) => x[0]).join('')}</button>
      )}
      <div style={{ fontSize: 15, fontWeight: 600, opacity: 0.72, paddingRight: s ? (compu ? 170 : 100) : 0 }}>
        {s ? `${s.nombre} · #${s.numero}` : 'Lectura del lector'}
      </div>
      <motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 22 }}
        style={{ ...titular, fontWeight: 700, fontSize: compu ? (titulo.length > 9 ? 120 : 168) : (titulo.length > 9 ? 60 : 84), marginTop: 6 }}>{titulo}</motion.div>
      {linea && <div style={{ fontSize: compu ? 22 : 17, fontWeight: 500, marginTop: 8 }}>{linea}</div>}
      {s && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
          {[s.plan, s.horario, s.dias >= 0 ? `Vence ${fechaCorta(s.vence)}` : `Venció ${fechaCorta(s.vence)}`, ESTADOS[s.estado]?.texto]
            .filter(Boolean).map((x) => (
              <span key={x} style={{ padding: '8px 14px', borderRadius: 99, background: 'rgba(0,0,0,0.1)', fontSize: 13.5, fontWeight: 600 }}>{x}</span>
            ))}
        </div>
      )}
      {r.cobro && (
        <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 8, marginTop: 14, padding: '10px 14px', borderRadius: 14, background: 'rgba(0,0,0,0.1)', fontWeight: 600, fontSize: 14 }}>
          <CheckCircle2 size={18} /> {r.cobro.monto > 0 ? `Cobrado ${pesos(r.cobro.monto)} · ` : ''}{r.cobro.concepto}
        </div>
      )}
      {!ok && s && r.resultado === 'denegado' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
          {accion && <Boton variante="blanco" disabled={ocupado} onClick={accion.fn}>{accion.texto}</Boton>}
          {!accion && <Boton variante="blanco" disabled={ocupado} onClick={() => alForzar(s.id)}><Hand size={16} /> Dejar pasar de todos modos</Boton>}
        </div>
      )}
    </motion.section>
  );
}

// Los 5 socios de ejemplo; tocarlos (o presionar su número) es como pasarlos
// por el lector.
function PasesPrueba({ pases, alLeer, compu }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10, gap: 10 }}>
        <span>Pases de prueba</span>
        <span style={{ color: g.suave }}>{compu ? 'Toca uno o presiona 1–5 · simula el lector' : 'Toca uno · simula el lector'}</span>
      </div>
      <div className="g-sin-barra" style={compu
        ? { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }
        : { display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 4px' }}>
        {PRUEBAS.map((x, i) => {
          const pase = pases[x.numero];
          return (
            <motion.button key={x.numero} type="button" disabled={!pase} whileTap={{ scale: 0.96 }} onClick={() => alLeer(pase.token)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 18, border: `1px solid ${g.linea}`,
              background: g.tarjeta, color: g.texto, cursor: pase ? 'pointer' : 'default', textAlign: 'left', flexShrink: 0, width: compu ? 'auto' : 150, minWidth: 0,
            }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, border: '1px solid #3A3A38', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>{i + 1}</span>
              <span style={{ minWidth: 0, width: '100%' }}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pase?.socio?.nombre || '…'}</span>
                <span style={{ display: 'block', fontSize: 12, color: g.suave, marginTop: 2 }}>{x.caso}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// Para probar con un celular de verdad: abre el pase del socio y pásalo por el lector.
function ProbarCelular({ negocio }) {
  const enlace = `${window.location.origin}/gimnasio/${negocio.id}?rol=socio`;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderRadius: 18, background: g.tarjeta, border: `1px solid ${g.linea}` }}>
      <div style={{ background: '#fff', padding: 5, borderRadius: 10, lineHeight: 0, flexShrink: 0 }}><QRCodeSVG value={enlace} size={58} level="L" /></div>
      <div style={{ fontSize: 12.5, lineHeight: 1.45, minWidth: 0 }}>
        <b style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}><Smartphone size={15} color="var(--g-pri)" /> Pruébalo con tu celular</b>
        <span style={{ color: g.suave }}>Abre aquí el pase del socio y acércalo a un lector USB.</span>
      </div>
    </div>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      <Titulo chico="Hoy" accion={<EnVivo />}>En vivo</Titulo>
      {tablero && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <Tarjeta pad={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Anillo valor={a.adentro / a.capacidad} tamano={46} grosor={6}><span /></Anillo>
              <div><div style={{ ...titular, fontSize: 32 }}><NumeroVivo valor={a.adentro} /></div><div style={{ fontSize: 11.5, color: g.suave }}>adentro</div></div>
            </div>
          </Tarjeta>
          <Tarjeta pad={14}>
            <div style={{ ...titular, fontSize: 32, marginTop: 4 }}><NumeroVivo valor={tablero.hoy.entradas} /></div>
            <div style={{ fontSize: 11.5, color: g.suave }}>entradas hoy</div>
          </Tarjeta>
          <Tarjeta pad={14}>
            <div style={{ ...titular, fontSize: 32, marginTop: 4, color: tablero.hoy.denegados ? g.rojo : g.texto }}><NumeroVivo valor={tablero.hoy.denegados} /></div>
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
        {accesos.map((a) => {
          const MetodoIcono = a.metodo === 'manual' ? Keyboard : Usb;
          return (
            <motion.button key={a.id} type="button" layout initial={{ opacity: 0, x: -14, backgroundColor: 'color-mix(in srgb, var(--g-pri) 16%, transparent)' }}
              animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(255,255,255,0)' }} transition={{ duration: 0.9 }}
              onClick={() => a.socio_id && alVerFicha(a.socio_id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 8px', border: 'none', borderRadius: 14,
                color: g.texto, textAlign: 'left', cursor: a.socio_id ? 'pointer' : 'default', width: '100%',
              }}>
              <Avatar nombre={a.gym_socios?.nombre || '?'} foto={fotoSocio(a.gym_socios?.numero)} tamano={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.gym_socios?.nombre || 'QR desconocido'}</div>
                <div style={{ fontSize: 12, color: a.permitido ? g.suave : g.rojo, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.permitido ? (a.tipo === 'entrada' ? 'Entró' : 'Salió') : a.motivo}
                </div>
              </div>
              <MetodoIcono size={13} color="var(--g-tenue)" />
              <span style={{ fontSize: 12, color: g.suave, fontVariantNumeric: 'tabular-nums', width: 38, textAlign: 'right' }}>{hora(a.creado)}</span>
              <span style={{ width: 8, height: 8, borderRadius: 9, flexShrink: 0, background: !a.permitido ? 'var(--g-rojo)' : a.tipo === 'entrada' ? g.texto : '#5E5E5A' }} />
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ── SOCIOS ──────────────────────────────────────────────────────────────────
function Socios({ negocio, adentro, alVerFicha, alNuevo }) {
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
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      <Titulo chico="Busca, registra a mano o da de alta" accion={<Boton onClick={alNuevo}><UserPlus size={16} /> Nuevo socio</Boton>}>Socios</Titulo>
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
