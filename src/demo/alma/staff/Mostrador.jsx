import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import {
  Camera, CameraOff, Check, CheckCircle2, ChevronDown, Clock, Loader2, ScanLine, Usb, Users, XCircle,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { mexicoTodayStr } from '../../../lib/dates';
import { a, vidrio } from '../estilo';
import { Avatar, Boton, Chip, Hoja, TarjetaTinta } from '../ui';
import { hora } from '../datos';
import { Encabezado } from './Panel';
import { clasesDeHoy, reloj, useVentana } from './checkin';

// ─────────────────────────────────────────────────────────────────────────────
// MOSTRADOR — Studio Alma. Mismas reglas que QrCheckIn de Be Fit:
// checkInClient(código, { openClassIds }) resuelve a la persona y su reserva
// de hoy; si tiene varias clases seguidas, recepción elige cuál
// (checkInReservation). Doble escaneo del mismo código < 90 s se ignora.
// El registro del día vive en localStorage con la misma clave que Be Fit.
// ─────────────────────────────────────────────────────────────────────────────

const ahoraMs = () => Date.now();

// Reservas de una clase con el estado de la RESERVA (confirmada, en espera u
// ofrecida). fetchClassReservations de AuthContext devuelve en `status` el de
// la MEMBRESÍA, y con eso una clienta en espera parecía inscrita.
async function reservasDeClase(claseId) {
  const { data, error } = await supabase.from('reservations')
    .select('id, user_id, checked_in, status, users:user_id(id, full_name, email, phone, avatar_url, membership_plan, classes_remaining, membership_status)')
    .eq('class_id', claseId);
  if (error) return [];
  return (data || []).map((r) => ({
    reservationId: r.id, userId: r.user_id, checkedIn: Boolean(r.checked_in), reserva: r.status || 'confirmed',
    name: r.users?.full_name || r.users?.email?.split('@')[0] || 'Sin nombre', email: r.users?.email || '', phone: r.users?.phone || '',
    avatar: r.users?.avatar_url || null, plan: r.users?.membership_plan || 'Sin plan', classesRemaining: r.users?.classes_remaining || 0,
    status: r.users?.membership_status || 'INACTIVE',
  }));
}

export default function Mostrador({ seccion }) {
  return seccion === 'clases' ? <ClasesHoy /> : <Escanear />;
}

function Escanear() {
  const { checkInClient, checkInReservation, globalClasses } = useAuth();
  const { ventana, restante } = useVentana(globalClasses);
  const claveLog = `befit_scanlog_${mexicoTodayStr()}`;
  const [registro, setRegistro] = useState(() => { try { return JSON.parse(localStorage.getItem(claveLog)) || []; } catch { return []; } });
  const [ultimo, setUltimo] = useState(() => registro[0] || null);
  const [aviso, setAviso] = useState(null);
  const [eleccion, setEleccion] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [pruebas, setPruebas] = useState([]);

  useEffect(() => { try { localStorage.setItem(claveLog, JSON.stringify(registro.slice(0, 80))); } catch { /* sin almacenamiento */ } }, [registro, claveLog]);
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(null), 3200);
    return () => clearTimeout(t);
  }, [aviso]);

  // Pases de prueba: quién tiene lugar en la(s) clase(s) del check-in, para
  // simular el escaneo en una demo en vivo sin teléfono ni lector.
  const idsPrueba = (ventana?.abiertas.length ? ventana.abiertas : ventana?.clase ? [ventana.clase] : []).map((c) => c.id).join();
  useEffect(() => {
    if (!idsPrueba) return undefined;
    let vivo = true;
    Promise.all(idsPrueba.split(',').map((id) => reservasDeClase(id))).then((listas) => {
      if (!vivo) return;
      const vistos = new Set();
      setPruebas(listas.flat().filter((r) => r.reserva === 'confirmed').filter((r) => !vistos.has(r.userId) && vistos.add(r.userId)).slice(0, 8));
    });
    return () => { vivo = false; };
  }, [idsPrueba]);

  const anotar = (r) => {
    if (!r.clientInfo) { setAviso({ ok: false, texto: r.message || 'No encontramos a esa persona.' }); return; }
    const fila = {
      ...r.clientInfo, message: r.message, success: r.success, clase: r.className, horaClase: r.classTime,
      scannedAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    };
    setUltimo(fila);
    setRegistro((prev) => [fila, ...prev]);
    if (r.outsideWindow) setAviso({ ok: true, texto: 'Registrada fuera del horario de la clase.' });
  };

  const leer = async (codigo) => {
    const texto = String(codigo || '').trim();
    if (!texto || procesando) return;
    const previo = Number(localStorage.getItem(`last_checkin_${texto}`) || 0);
    if (Date.now() - previo < 90000) { setAviso({ ok: false, texto: 'Ya se registró hace poco.' }); return; }
    setProcesando(true);
    const r = await checkInClient(texto, { openClassIds: ventana?.ids || [] });
    setProcesando(false);
    if (r.unreadable) { setAviso({ ok: false, texto: r.message }); return; }
    if (r.needsSelection) { setEleccion({ ...r, codigo: texto }); return; }
    if (r.success) localStorage.setItem(`last_checkin_${texto}`, String(Date.now()));
    anotar(r);
  };

  const elegir = async (cand) => {
    const sel = eleccion;
    setEleccion(null);
    const r = await checkInReservation(cand.reservationId, sel.clientInfo);
    if (r.success && sel.codigo) localStorage.setItem(`last_checkin_${sel.codigo}`, String(ahoraMs()));
    anotar({ ...r, className: cand.title, classTime: cand.time });
  };

  const entraron = registro.filter((x) => x.success).length;

  return (
    <>
      <Encabezado ligero="Control de" fuerte="acceso" sub="Escanea el pase de la clienta al llegar." />

      {/* Clase en check-in */}
      {ventana && (
        <TarjetaTinta radio={30}>
          <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 8 }}>
                {ventana.modo === 'abierto' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#B8D99B', boxShadow: '0 0 0 4px rgba(184,217,155,.25)' }} />}
                {ventana.modo === 'abierto' ? (ventana.abiertas.length > 1 ? `Check-in abierto · ${ventana.abiertas.length} clases` : 'Check-in abierto') : ventana.modo === 'espera' ? 'Siguiente clase' : 'Clases de hoy terminadas'}
              </div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6 }}>{ventana.clase.title}</div>
              <div style={{ fontSize: '0.88rem', opacity: 0.85, marginTop: 2 }}>
                {hora(ventana.clase.time).texto} {hora(ventana.clase.time).sufijo}{ventana.clase.instructor ? ` · ${ventana.clase.instructor}` : ''}
                {ventana.abiertas.length > 1 ? ` · también ${ventana.abiertas.slice(1).map((c) => c.title).join(', ')}` : ''}
              </div>
            </div>
            {ventana.meta && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>{ventana.modo === 'abierto' ? 'Cierra en' : 'Abre en'}</div>
                <div style={{ fontSize: '2.4rem', fontWeight: 300, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{reloj(restante)}</div>
              </div>
            )}
          </div>
        </TarjetaTinta>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 16 }}>
        <div>
          <Lector alLeer={leer} procesando={procesando} />
          {pruebas.length > 0 && (
            <div style={{ ...vidrio, borderRadius: 26, padding: 16, marginTop: 12 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: a.suave }}>Pases de prueba</div>
              <div style={{ fontSize: '0.76rem', color: a.suave, margin: '2px 0 10px' }}>Para la demostración: toca a una clienta como si escanearas su QR.</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {pruebas.map((p) => (
                  <button key={p.userId} type="button" onClick={() => leer(p.userId)} disabled={procesando} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px', borderRadius: 999, cursor: 'pointer',
                    border: '1px solid var(--a-linea)', background: a.solidoSuave, color: a.tinta, fontSize: '0.82rem', fontWeight: 600,
                  }}>
                    <Avatar nombre={p.name} tam={26} borde="transparent" />
                    {p.name.split(' ')[0]}{p.checkedIn && <Check size={13} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <Resultado fila={ultimo} />
          <div style={{ ...vidrio, borderRadius: 26, padding: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700 }}>Hoy en el estudio</span>
              <span style={{ fontSize: '0.8rem', color: a.suave }}>{entraron} {entraron === 1 ? 'entrada' : 'entradas'}</span>
            </div>
            {!registro.length && <div style={{ fontSize: '0.86rem', color: a.suave, padding: '10px 0' }}>Aquí aparece cada persona que escanees.</div>}
            <div style={{ display: 'grid', gap: 2, maxHeight: 320, overflowY: 'auto' }}>
              {registro.map((x, i) => (
                <div key={`${x.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderTop: i ? '1px solid var(--a-linea)' : 'none' }}>
                  <Avatar src={x.avatar} nombre={x.name} tam={32} borde="transparent" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</div>
                    <div style={{ fontSize: '0.74rem', color: a.suave, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.clase || x.message}</div>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: a.suave }}>{x.scannedAt}</span>
                  {x.success ? <CheckCircle2 size={17} /> : <XCircle size={17} color="var(--a-peligro)" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {aviso && (
        <div role="status" style={{ position: 'fixed', left: 0, right: 0, bottom: 96, zIndex: 9500, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ ...vidrio, background: aviso.ok ? 'var(--a-hoja)' : 'rgba(142,42,30,.92)', color: aviso.ok ? a.tinta : '#fff', padding: '12px 20px', borderRadius: 999, fontWeight: 600, fontSize: '0.9rem', animation: 'alma-entra .3s ease both' }}>{aviso.texto}</div>
        </div>
      )}

      <Hoja abierta={Boolean(eleccion)} alCerrar={() => setEleccion(null)} titulo="Elige la clase">
        {eleccion && (
          <div style={{ padding: '34px 22px 26px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{eleccion.clientInfo?.name}</div>
            <div style={{ color: a.suave, margin: '4px 0 16px', fontSize: '0.9rem' }}>Tiene varias clases seguidas hoy. ¿A cuál está entrando?</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {eleccion.candidates.map((cand) => (
                <button key={cand.reservationId} type="button" onClick={() => elegir(cand)} style={{
                  ...vidrio, display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, cursor: 'pointer', textAlign: 'left', color: a.tinta,
                  ...(cand.inWindow ? { border: '1.5px solid var(--a-tinta)' } : {}),
                }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 300, minWidth: 92 }}>{hora(cand.time).texto}<span style={{ fontSize: '0.78rem', fontWeight: 500, marginLeft: 3, color: 'var(--a-suave)' }}>{hora(cand.time).sufijo}</span></span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{cand.title}</span>
                  {cand.inWindow && <Chip claro>En check-in</Chip>}
                </button>
              ))}
            </div>
          </div>
        )}
      </Hoja>
    </>
  );
}

function Resultado({ fila }) {
  if (!fila) {
    return (
      <div style={{ ...vidrio, borderRadius: 30, padding: 26, minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: a.suave }}>
        <ScanLine size={30} />
        <div style={{ marginTop: 10, fontSize: '0.92rem' }}>Esperando el primer pase del día.</div>
      </div>
    );
  }
  const ok = fila.success;
  return (
    <div key={`${fila.id}-${fila.scannedAt}`} style={{
      ...vidrio, borderRadius: 30, padding: 22, animation: 'alma-entra .4s ease both',
      border: `1.5px solid ${ok ? 'var(--a-tinta)' : 'var(--a-peligro)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar src={fila.avatar} nombre={fila.name} tam={72} borde="var(--a-solido)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: ok ? a.tinta : a.peligro }}>
            {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />} {ok ? 'Bienvenida' : 'Revisar'}
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{fila.name}</div>
          <div style={{ fontSize: '0.88rem', color: a.suave, marginTop: 2 }}>{fila.message}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
        {[
          ['Plan', fila.plan],
          ['Le quedan', fila.classesRemaining >= 9000 ? '∞' : fila.classesRemaining],
          ['Clase', fila.clase ? `${hora(fila.horaClase).texto} ${hora(fila.horaClase).sufijo} · ${fila.clase}` : '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ padding: '10px 12px', borderRadius: 18, background: a.tenue, minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', color: a.suave }}>{k}</div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cámara (qr-scanner, sirve en iPhone) o lector USB, que "teclea" el código
// muy rápido y termina con Enter: se reconoce por la velocidad, sin input.
function Lector({ alLeer, procesando }) {
  const video = useRef(null);
  const enviar = useRef(alLeer);
  useLayoutEffect(() => { enviar.current = alLeer; });
  const [camara, setCamara] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let buffer = '';
    let ultimaTecla = 0;
    const alTeclear = (e) => {
      const ahora = Date.now();
      if (ahora - ultimaTecla > 60) buffer = '';
      ultimaTecla = ahora;
      if (e.key === 'Enter') {
        if (buffer.length >= 8) { e.preventDefault(); enviar.current(buffer); }
        buffer = '';
      } else if (e.key.length === 1) buffer += e.key;
    };
    window.addEventListener('keydown', alTeclear, true);
    return () => window.removeEventListener('keydown', alTeclear, true);
  }, []);

  // UNA sola instancia del escáner por lector: prender y apagar solo hace
  // start()/stop(). Crear una nueva en cada cambio dejaba la cámara sin señal
  // si se apagaba y prendía rápido (qr-scanner suelta el stream tarde).
  const escaner = useRef(null);
  useEffect(() => {
    if (!video.current) return undefined;
    let ultimo = { t: '', ms: 0 };
    escaner.current = new QrScanner(video.current, (r) => {
      const ahora = Date.now();
      if (r.data === ultimo.t && ahora - ultimo.ms < 4000) return;
      ultimo = { t: r.data, ms: ahora };
      enviar.current(r.data);
    }, { preferredCamera: 'environment', highlightScanRegion: false, highlightCodeOutline: false, maxScansPerSecond: 6 });
    return () => { escaner.current?.destroy(); escaner.current = null; };
  }, []);
  useEffect(() => {
    const e = escaner.current;
    if (!e) return;
    if (camara) e.start().catch(() => { setError('No se pudo abrir la cámara. Revisa el permiso del navegador.'); setCamara(false); });
    else e.stop();
  }, [camara]);

  const esquina = (i) => ({
    position: 'absolute', width: 34, height: 34, borderColor: 'rgba(255,255,255,.95)', borderStyle: 'solid', borderWidth: 0,
    ...(i < 2 ? { top: 0 } : { bottom: 0 }), ...(i % 2 ? { right: 0 } : { left: 0 }),
    [`border${i < 2 ? 'Top' : 'Bottom'}Width`]: 3, [`border${i % 2 ? 'Right' : 'Left'}Width`]: 3,
    [`border${i < 2 ? 'Top' : 'Bottom'}${i % 2 ? 'Right' : 'Left'}Radius`]: 14,
  });

  return (
    <div style={{ ...vidrio, borderRadius: 30, padding: 10 }}>
      <div style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: 22, overflow: 'hidden', background: 'radial-gradient(circle at 50% 40%, #3B4231, #1A1D15)' }}>
        <video ref={video} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: camara ? 'block' : 'none' }} />
        <div style={{ position: 'absolute', inset: '16% 24%', pointerEvents: 'none' }}>
          {[0, 1, 2, 3].map((i) => <span key={i} style={esquina(i)} />)}
        </div>
        {!camara && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,.8)', textAlign: 'center', padding: 20 }}>
            {procesando ? <Loader2 size={34} style={{ animation: 'spin 1s linear infinite' }} /> : <ScanLine size={34} />}
            <div style={{ fontSize: '0.86rem', maxWidth: 240, lineHeight: 1.45 }}>Activa la cámara y apunta al pase, o usa el lector USB.</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px 4px', flexWrap: 'wrap' }}>
        <Boton tipo={camara ? 'vidrio' : 'tinta'} onClick={() => setCamara((c) => !c)} style={{ padding: '11px 18px', fontSize: '0.88rem' }}>
          {camara ? <><CameraOff size={17} /> Apagar cámara</> : <><Camera size={17} /> Activar cámara</>}
        </Boton>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: a.suave }}><Usb size={15} /> Lector USB listo</span>
      </div>
      {error && <div style={{ color: a.peligro, fontSize: '0.84rem', padding: '0 6px 6px' }}>{error}</div>}
    </div>
  );
}

// Clases de hoy: ocupación y lista de cada clase, con pase de lista a mano.
function ClasesHoy() {
  const { globalClasses, checkInReservation } = useAuth();
  const hoy = useMemo(() => clasesDeHoy(globalClasses), [globalClasses]);
  const [abierta, setAbierta] = useState(null);
  const [listas, setListas] = useState({});
  const [marcando, setMarcando] = useState(null);
  const [ahora] = useState(ahoraMs);

  const cargar = async (id) => {
    const r = await reservasDeClase(id);
    setListas((l) => ({ ...l, [id]: r }));
  };
  // Se vuelve a leer en cada apertura: llegadas y cancelaciones cambian todo el día.
  const alternar = (id) => {
    const abrir = abierta !== id;
    setAbierta(abrir ? id : null);
    if (abrir) cargar(id);
  };
  const marcar = async (claseId, r) => {
    setMarcando(r.reservationId);
    await checkInReservation(r.reservationId, { id: r.userId, name: r.name, email: r.email, phone: r.phone, plan: r.plan, classesRemaining: r.classesRemaining, status: r.status });
    await cargar(claseId);
    setMarcando(null);
  };

  return (
    <>
      <Encabezado ligero="Clases de" fuerte="hoy" sub={`${hoy.length} ${hoy.length === 1 ? 'clase' : 'clases'} · toca una para ver quién va y pasar lista.`} />
      <div style={{ display: 'grid', gap: 10 }}>
        {hoy.map(({ c, inicio }) => {
          const total = c.max_spots ?? 0;
          const ocupados = Math.max(0, total - (c.spots ?? 0));
          const pct = total ? ocupados / total : 0;
          const lista = listas[c.id];
          const confirmadas = (lista || []).filter((r) => r.reserva !== 'waitlist');
          const presentes = confirmadas.filter((r) => r.checkedIn).length;
          const paso = inicio < ahora - 60 * 60000;
          const h = hora(c.time);
          return (
            <div key={c.id} style={{ ...vidrio, borderRadius: 26, overflow: 'hidden', opacity: paso ? 0.6 : 1 }}>
              <button type="button" onClick={() => alternar(c.id)} aria-expanded={abierta === c.id} style={{
                display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '14px 18px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: a.tinta,
              }}>
                <div style={{ width: 64 }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 300, lineHeight: 1 }}>{h.texto}</div>
                  <div style={{ fontSize: '0.7rem', color: a.suave }}>{h.sufijo}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{c.title}</div>
                  <div style={{ fontSize: '0.8rem', color: a.suave }}>{c.instructor}{lista ? ` · ${presentes} de ${confirmadas.length} llegaron` : ''}</div>
                  <div style={{ height: 5, borderRadius: 3, background: a.linea, marginTop: 8, overflow: 'hidden', maxWidth: 260 }}>
                    <div style={{ width: `${pct * 100}%`, height: '100%', background: a.tinta, borderRadius: 3 }} />
                  </div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', fontWeight: 600 }}><Users size={15} /> {ocupados}/{total}</span>
                <ChevronDown size={18} style={{ transform: abierta === c.id ? 'rotate(180deg)' : 'none', transition: 'transform .25s ease' }} />
              </button>
              {abierta === c.id && (
                <div style={{ padding: '0 18px 16px', animation: 'alma-entra .3s ease both' }}>
                  {!lista && <div style={{ color: a.suave, fontSize: '0.86rem', padding: 8 }}>Cargando…</div>}
                  {lista && !lista.length && <div style={{ color: a.suave, fontSize: '0.86rem', padding: 8 }}>Nadie ha reservado esta clase.</div>}
                  {(lista || []).map((r) => (
                    <div key={r.reservationId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid var(--a-linea)' }}>
                      <Avatar src={r.avatar} nombre={r.name} tam={34} borde="transparent" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</div>
                        <div style={{ fontSize: '0.74rem', color: a.suave }}>{r.plan} · {r.classesRemaining >= 9000 ? 'ilimitado' : `${r.classesRemaining} clases`}</div>
                      </div>
                      {r.checkedIn ? (
                        <Chip claro><Check size={13} /> Llegó</Chip>
                      ) : r.reserva !== 'confirmed' ? (
                        <Chip claro>{r.reserva === 'offered' ? 'Lugar ofrecido' : 'En espera'}</Chip>
                      ) : (
                        <Boton tipo="vidrio" onClick={() => marcar(c.id, r)} disabled={marcando === r.reservationId} style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                          {marcando === r.reservationId ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Clock size={14} />} Marcar llegada
                        </Boton>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!hoy.length && <div style={{ ...vidrio, borderRadius: 26, padding: 24, textAlign: 'center', color: a.suave }}>Hoy no hay clases.</div>}
      </div>
    </>
  );
}
