import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Hand, Keyboard, LogIn, LogOut, ScanLine, Search, Smartphone, UserRound, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ESTADOS, errorLegible, fechaCorta, hora, nivelAforo, pesos, sonar, useAccesos, useRpc } from './datos';
import Escaner from './Escaner';
import { Avatar, Boton, Etiqueta, Logo, Segmentado, Tarjeta, g, useAncho } from './ui';

// Recepción / torniquete: escanea el pase (cámara o lector USB), dice al
// instante si pasa o no y por qué, y resuelve ahí mismo (renovar, cobrar,
// dejar pasar). Abajo, la bitácora en vivo de entradas y salidas.

const MODOS = [
  { id: 'auto', etiqueta: 'Entrada y salida' },
  { id: 'entrada', etiqueta: 'Solo entrada' },
  { id: 'salida', etiqueta: 'Solo salida' },
];

// Socios de ejemplo de la maqueta (21_gimnasio_manhattan.sql).
const PRUEBAS = [
  { numero: 1001, caso: 'Al corriente' },
  { numero: 1002, caso: 'Vencida' },
  { numero: 1003, caso: 'Con adeudo' },
  { numero: 1004, caso: 'Plan matutino' },
  { numero: 1005, caso: 'Congelada' },
];

export default function Recepcion({ negocio }) {
  const ancho = useAncho(980);
  const [modo, setModo] = useState('auto');
  const [resultado, setResultado] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const { accesos } = useAccesos(negocio.id, { limite: 30 });
  const { datos: aforo } = useRpc('gym_aforo', { p_negocio: negocio.id }, { enVivo: true, cada: 60000 });

  const mostrar = (data, extra = {}) => {
    if (data?.resultado === 'repetido') return;
    setResultado({ ...data, ...extra, t: Date.now() });
    sonar(data?.resultado === 'ok');
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

  const columnaIzq = (
    <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
      <Tarjeta titulo="Escáner" accion={aforo && <PildoraAforo aforo={aforo} />}>
        <div style={{ marginBottom: 12 }}><Segmentado opciones={MODOS} valor={modo} alCambiar={setModo} /></div>
        <Escaner alLeer={registrarCodigo} />
      </Tarjeta>
      <PasesPrueba negocio={negocio} alEscanear={(token) => registrarCodigo(token, 'qr')} />
    </div>
  );

  const columnaDer = (
    <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
      <Resultado resultado={resultado} ocupado={ocupado} error={error}
        alRegularizar={regularizar} alForzar={(id) => registrarManual(id, { forzar: true, tipo: 'entrada' })} />
      <Buscar negocio={negocio} alRegistrar={(id) => registrarManual(id)} modo={modo} />
      <Bitacora accesos={accesos} />
    </div>
  );

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '8px 16px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '4px 2px 16px' }}>
        <Logo nombre={negocio.nombre} tamano={ancho ? 1 : 0.85} />
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.2em', color: g.suave, fontWeight: 600 }}>RECEPCIÓN</div>
      </div>
      {ancho ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 440px) minmax(0, 1fr)', gap: 18 }}>{columnaIzq}{columnaDer}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
          <Tarjeta titulo="Escáner" accion={aforo && <PildoraAforo aforo={aforo} />}>
            <div style={{ marginBottom: 12 }}><Segmentado opciones={MODOS} valor={modo} alCambiar={setModo} /></div>
            <Escaner alLeer={registrarCodigo} />
          </Tarjeta>
          <Resultado resultado={resultado} ocupado={ocupado} error={error}
            alRegularizar={regularizar} alForzar={(id) => registrarManual(id, { forzar: true, tipo: 'entrada' })} />
          <PasesPrueba negocio={negocio} alEscanear={(token) => registrarCodigo(token, 'qr')} />
          <Buscar negocio={negocio} alRegistrar={(id) => registrarManual(id)} modo={modo} />
          <Bitacora accesos={accesos} />
        </div>
      )}
    </div>
  );
}

function PildoraAforo({ aforo }) {
  const n = nivelAforo(aforo.adentro, aforo.capacidad, aforo.alerta_pct);
  return <Etiqueta color={n.color}>{aforo.adentro}/{aforo.capacidad} adentro · {n.texto}</Etiqueta>;
}

function Resultado({ resultado: r, ocupado, error, alRegularizar, alForzar }) {
  if (error) {
    return <Tarjeta><div style={{ color: '#FCA5A5' }}>{error}</div></Tarjeta>;
  }
  if (!r) {
    return (
      <Tarjeta style={{ minHeight: 210, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10 }}>
        <ScanLine size={40} color="var(--g-suave)" />
        <div style={{ fontFamily: g.display, fontWeight: 700, fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Listo para escanear</div>
        <div style={{ color: g.suave, fontSize: '0.9rem', maxWidth: 360 }}>
          Escanea un pase, usa un <b>pase de prueba</b> o busca al socio por nombre.
        </div>
      </Tarjeta>
    );
  }
  const ok = r.resultado === 'ok';
  const salida = ok && r.tipo === 'salida';
  const color = !ok ? 'var(--g-rojo)' : salida ? '#3B82F6' : 'var(--g-verde)';
  const s = r.socio;
  const estado = s ? ESTADOS[s.estado] : null;
  const titulo = !ok ? (r.resultado === 'invalido' ? 'QR inválido' : 'Acceso negado')
    : salida ? 'Salida registrada' : r.forzado ? 'Pasa (autorizado)' : 'Acceso permitido';

  let accion = null;
  if (!ok && s && r.resultado === 'denegado') {
    if (s.estado === 'vencida') accion = { texto: `Renovar ${s.plan} · ${pesos(Number(s.precio) + Number(s.adeudo))} y dejar pasar`, fn: () => alRegularizar(s.id) };
    else if (s.estado === 'adeudo') accion = { texto: `Cobrar ${pesos(s.adeudo)} y dejar pasar`, fn: () => alRegularizar(s.id) };
    else if (s.estado === 'congelada') accion = { texto: 'Reactivar y dejar pasar', fn: () => alRegularizar(s.id) };
  }

  return (
    <AnimatePresence mode="popLayout">
      <motion.section key={r.t}
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.22 }}
        style={{ borderRadius: 22, overflow: 'hidden', border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`, background: g.sup }}>
        <div style={{ background: `color-mix(in srgb, ${color} 88%, black)`, color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          {!ok ? <XCircle size={44} /> : salida ? <LogOut size={42} /> : <CheckCircle2 size={44} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: g.display, fontWeight: 800, fontSize: '2rem', lineHeight: 1, textTransform: 'uppercase' }}>{titulo}</div>
            {(r.motivo || (salida && r.desde)) && (
              <div style={{ marginTop: 6, fontSize: '0.95rem', opacity: 0.95 }}>
                {salida && r.desde ? `Entró a las ${hora(r.desde)}` : r.motivo}
              </div>
            )}
          </div>
          {r.aforo && <div style={{ textAlign: 'right', fontSize: '0.8rem', opacity: 0.9 }}>Adentro<br /><b style={{ fontSize: '1.3rem', fontFamily: g.display }}>{r.aforo.adentro}/{r.aforo.capacidad}</b></div>}
        </div>
        {s && (
          <div style={{ padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <Avatar nombre={s.nombre} tamano={58} color={color} />
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{s.nombre}</div>
              <div style={{ color: g.suave, fontSize: '0.86rem' }}>Socio #{s.numero} · {s.plan} · {s.horario}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Etiqueta color={estado.color}>{estado.texto}</Etiqueta>
              <div style={{ color: g.suave, fontSize: '0.8rem', marginTop: 6 }}>
                {s.dias >= 0 ? `Vence ${fechaCorta(s.vence)} · ${s.dias} días` : `Venció ${fechaCorta(s.vence)}`}
              </div>
            </div>
          </div>
        )}
        {r.cobro && (
          <div style={{ margin: '0 20px 16px', padding: '10px 14px', borderRadius: 14, background: 'color-mix(in srgb, var(--g-verde) 14%, transparent)', color: g.verde, fontWeight: 600, fontSize: '0.9rem' }}>
            {r.cobro.monto > 0 ? `Cobrado ${pesos(r.cobro.monto)} · ` : ''}{r.cobro.concepto}
          </div>
        )}
        {!ok && s && r.resultado === 'denegado' && (
          <div style={{ padding: '0 20px 18px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {accion && <Boton variante="verde" disabled={ocupado} onClick={accion.fn}>{accion.texto}</Boton>}
            {!accion && <Boton variante="suave" disabled={ocupado} onClick={() => alForzar(s.id)}><Hand size={16} /> Dejar pasar de todos modos</Boton>}
          </div>
        )}
      </motion.section>
    </AnimatePresence>
  );
}

function PasesPrueba({ negocio, alEscanear }) {
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
    <Tarjeta titulo="Pases de prueba">
      <div style={{ fontSize: '0.84rem', color: g.suave, marginTop: -6, marginBottom: 12 }}>
        Socios de ejemplo para ver cada caso. Toca uno para "escanearlo", o escanéalo con la cámara de otro dispositivo.
      </div>
      {falla && <div style={{ color: '#FCA5A5', fontSize: '0.84rem', marginBottom: 10 }}>No se pudieron cargar los pases: {falla}</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {PRUEBAS.map((p) => {
          const pase = pases[p.numero];
          const s = pase?.socio;
          return (
            <button key={p.numero} type="button" disabled={!pase} onClick={() => alEscanear(pase.token)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderRadius: 14, border: `1px solid ${g.linea}`,
              background: g.sup2, color: g.texto, cursor: pase ? 'pointer' : 'default', textAlign: 'left', fontFamily: g.texto2,
            }}>
              <div style={{ background: '#fff', padding: 4, borderRadius: 8, lineHeight: 0, flexShrink: 0 }}>
                {pase ? <QRCodeSVG value={pase.token} size={52} level="L" /> : <div style={{ width: 52, height: 52 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{s?.nombre || '…'}</div>
                <div style={{ fontSize: '0.78rem', color: g.suave }}>#{p.numero} · {s?.plan}</div>
              </div>
              {s && <Etiqueta color={ESTADOS[s.estado].color}>{p.caso}</Etiqueta>}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14, padding: 12, borderRadius: 16, background: 'color-mix(in srgb, var(--g-pri) 10%, transparent)' }}>
        <div style={{ background: '#fff', padding: 5, borderRadius: 8, lineHeight: 0 }}><QRCodeSVG value={enlace} size={64} level="L" /></div>
        <div style={{ fontSize: '0.84rem' }}>
          <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Smartphone size={15} /> Pruébalo con tu celular</b>
          <span style={{ color: g.suave }}>Escanea este código: se abre el pase del socio. Luego escanéalo aquí con la cámara.</span>
        </div>
      </div>
    </Tarjeta>
  );
}

function Buscar({ negocio, alRegistrar, modo }) {
  const [q, setQ] = useState('');
  const [lista, setLista] = useState([]);
  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) { setLista([]); return undefined; }
    const t = setTimeout(async () => {
      let consulta = supabase.from('gym_socios').select('id, nombre, numero, vence, adeudo, congelada').eq('negocio', negocio.id).limit(6);
      consulta = /^\d+$/.test(texto) ? consulta.eq('numero', Number(texto)) : consulta.ilike('nombre', `%${texto}%`);
      const { data } = await consulta.order('nombre');
      setLista(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, negocio.id]);

  const verbo = modo === 'salida' ? 'Salida' : modo === 'entrada' ? 'Entrada' : 'Registrar';
  return (
    <Tarjeta titulo="¿Olvidó su celular?">
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: g.sup2, borderRadius: 14 }}>
        <Search size={17} color="var(--g-suave)" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o número de socio"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: g.texto, fontSize: '0.95rem', fontFamily: g.texto2 }} />
      </label>
      {lista.length > 0 && (
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {lista.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px' }}>
              <Avatar nombre={s.nombre} tamano={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{s.nombre}</div>
                <div style={{ fontSize: '0.76rem', color: g.suave }}>#{s.numero} · vence {fechaCorta(s.vence)}</div>
              </div>
              <Boton variante="suave" style={{ padding: '8px 12px', fontSize: '0.82rem' }} onClick={() => { alRegistrar(s.id); setQ(''); }}>
                <Keyboard size={15} /> {verbo}
              </Boton>
            </div>
          ))}
        </div>
      )}
    </Tarjeta>
  );
}

function Bitacora({ accesos }) {
  return (
    <Tarjeta titulo="Bitácora en vivo" accion={<Etiqueta color={g.verde}><span style={{ width: 7, height: 7, borderRadius: 9, background: 'var(--g-verde)' }} /> En vivo</Etiqueta>}>
      <div style={{ display: 'grid' }}>
        <AnimatePresence initial={false}>
          {accesos.map((a) => (
            <motion.div key={a.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderTop: `1px solid ${g.linea}`, fontSize: '0.88rem' }}>
              <span style={{ width: 46, color: g.suave, fontVariantNumeric: 'tabular-nums' }}>{hora(a.creado)}</span>
              {!a.permitido ? <XCircle size={17} color="var(--g-rojo)" />
                : a.tipo === 'entrada' ? <LogIn size={17} color="var(--g-verde)" /> : <LogOut size={17} color="var(--g-suave)" />}
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <b style={{ fontWeight: 600 }}>{a.gym_socios?.nombre || 'Desconocido'}</b>
                <span style={{ color: a.permitido ? g.suave : '#FCA5A5' }}> · {a.permitido ? (a.tipo === 'entrada' ? 'entró' : 'salió') : a.motivo}</span>
              </span>
              {a.metodo === 'manual' && <UserRound size={14} color="var(--g-suave)" aria-label="Registro manual" />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Tarjeta>
  );
}
