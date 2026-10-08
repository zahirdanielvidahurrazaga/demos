import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mexicoTodayStr, mexicoClassStart } from '../lib/dates';

// Etiqueta amable del rol del personal (para el registro de entrada de staff).
const roleLabel = (r) => ({ COACH: 'Coach', BARISTA: 'Barista', RECEPCION: 'Recepción', ADMIN: 'Admin' }[r] || 'Personal');

// Avatar redondo: foto si existe, si no las iniciales.
const Avatar = ({ name, avatar, size = 52, success = true }) => {
  const initials = (name || '??').substring(0, 2).toUpperCase();
  if (avatar) {
    return <img src={avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: success ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255,77,77,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size > 45 ? '1.1rem' : '0.85rem', fontWeight: 900,
      color: success ? 'white' : '#dc2626',
    }}>{initials}</div>
  );
};

// Lector de QR compartido (Mostrador admin + Recepción). El lector físico teclea
// el id en el input oculto y enfocado. La tarjeta de la última alumna y la lista
// del día PERSISTEN (no se auto-borran) para control en recepción.
export default function QrCheckIn({ sideContent = null }) {
  const { checkInClient, checkInReservation, globalClasses } = useAuth();
  const qrInputRef = useRef(null);
  // Input NO controlado: el lector teclea el código y lo leemos de una sola vez
  // al Enter. Así NO hay un re-render por carácter (eso ralentizaba/perdía lecturas).
  const clearQR = () => { if (qrInputRef.current) qrInputRef.current.value = ''; };

  // El log del día PERSISTE en localStorage (sobrevive cambios de pestaña y
  // recargas) con clave por fecha → se reinicia solo al día siguiente.
  const logKey = `befit_scanlog_${mexicoTodayStr()}`;
  const readLog = () => { try { return JSON.parse(localStorage.getItem(logKey)) || []; } catch { return []; } };
  const [scanLog, setScanLog] = useState(readLog);
  const [scannedClient, setScannedClient] = useState(() => readLog()[0] || null);
  const [qrMessage, setQrMessage] = useState(() => readLog()[0]?.message || '');
  const [toast, setToast] = useState(null);
  // Selector de clase cuando la alumna reservó VARIAS clases traslapadas y no se
  // puede decidir sola cuál marcar → recepción toca la correcta (no se adivina).
  const [selection, setSelection] = useState(null); // { clientInfo, candidates, code }

  useEffect(() => {
    try { localStorage.setItem(logKey, JSON.stringify(scanLog)); } catch { /* noop */ }
  }, [scanLog, logKey]);

  // Mantener el input enfocado para que el lector siempre escriba ahí.
  useEffect(() => { qrInputRef.current?.focus(); }, []);

  // Reloj en vivo (1s) para el contador de la ventana de check-in.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Ventana de check-in por clase: abre 15 min ANTES y cierra 10 min DESPUÉS
  // de la hora de inicio. Estados: 'open' (abierto, cuenta al cierre),
  // 'standby' (en espera, cuenta a la apertura de la siguiente), 'closed'.
  //
  // Clases CONSECUTIVAS: dos horarios seguidos (ej. 8:00 y 8:10) tienen sus
  // ventanas traslapadas, así que a las 8:05 AMBAS están abiertas. Por eso ya
  // NO elegimos una sola clase: exponemos TODAS las abiertas (openClassIds,
  // ordenadas por hora) y el check-in marca la reserva de la que corresponda a
  // cada alumna. El encabezado muestra la más próxima + cuántas más hay.
  const checkin = useMemo(() => {
    const todayStr = mexicoTodayStr();
    const dow = new Date(todayStr + 'T12:00:00').getDay();
    const todays = (globalClasses || []).filter(c =>
      c.date === todayStr || (!c.date && (c.day === dow || c.day === String(dow)))
    );
    const withDt = todays
      .map(c => ({ c, start: mexicoClassStart(todayStr, c.time)?.getTime() }))
      .filter(x => x.start)
      .sort((a, b) => a.start - b.start);
    if (!withDt.length) return null;

    const OPEN_BEFORE = 15 * 60 * 1000;
    const CLOSE_AFTER = 10 * 60 * 1000;

    // TODAS las clases con la ventana abierta ahora (para clases traslapadas).
    const openList = withDt.filter(x => now >= x.start - OPEN_BEFORE && now <= x.start + CLOSE_AFTER);
    if (openList.length) {
      return {
        mode: 'open',
        cls: openList[0].c,                          // primaria (la más próxima a cerrar/empezar)
        openClasses: openList.map(x => x.c),         // todas las abiertas (por hora)
        openClassIds: openList.map(x => x.c.id),     // ids ordenados → el check-in elige la de la alumna
        target: Math.min(...openList.map(x => x.start + CLOSE_AFTER)), // cierre más próximo
      };
    }

    // En espera: la siguiente cuya ventana aún no abre.
    const next = withDt.find(x => now < x.start - OPEN_BEFORE);
    if (next) return { cls: next.c, mode: 'standby', openClasses: [], openClassIds: [], target: next.start - OPEN_BEFORE };

    // Todas las ventanas del día ya cerraron.
    return { cls: withDt[withDt.length - 1].c, mode: 'closed', openClasses: [], openClassIds: [], target: null };
  }, [globalClasses, now]);

  const remaining = checkin?.target ? Math.max(0, checkin.target - now) : 0;
  const fmtRemaining = (ms) => {
    const s = Math.floor(ms / 1000);
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Pinta la tarjeta + agrega al log del día un resultado de check-in.
  const recordResult = (result) => {
    setQrMessage(result.message);
    setScannedClient(result.clientInfo);
    if (result.clientInfo) {
      setScanLog(prev => [{
        ...result.clientInfo,
        message: result.message,
        success: result.success,
        scannedAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      }, ...prev]);
      if (result.outsideWindow) showToast('Registrada fuera del horario de la clase.', 'success');
    } else {
      showToast(result.message || 'Alumna no encontrada.', 'error');
    }
  };

  const handleQRScan = async (e) => {
    e.preventDefault();
    const code = (qrInputRef.current?.value || '').trim();
    if (code === '') return;

    // Cooldown corto (90s) SOLO para evitar el doble-escaneo accidental del mismo
    // código. Antes era 1 HORA y bloqueaba a las clientas con 2 clases seguidas
    // al registrar la 2ª ("Ya se registró hace poco"). El backend ya es
    // idempotente por reserva y maneja "ya asististe" + el selector de traslapes,
    // así que 90s bastan para el rebote accidental sin estorbar la 2ª clase.
    const lastScanStr = localStorage.getItem(`last_checkin_${code}`);
    if (lastScanStr && (Date.now() - parseInt(lastScanStr)) < 1000 * 90) {
      showToast('Ya se registró hace poco.', 'error');
      clearQR();
      qrInputRef.current?.focus();
      return;
    }

    // Pasamos las clases con ventana abierta ahora (solo para el camino rápido /
    // desempate). La ventana es SUAVE: nunca bloquea, siempre resuelve a la persona.
    const openClassIds = checkin?.openClassIds || [];
    const result = await checkInClient(code, { openClassIds });
    clearQR();

    // Lectura ilegible/truncada → pedir reintento (NO es "usuaria desconocida").
    if (result.unreadable) {
      showToast(result.message, 'error');
      qrInputRef.current?.focus();
      return;
    }

    // Reservó varias clases traslapadas → recepción elige cuál marcar.
    if (result.needsSelection) {
      setSelection({ ...result, code });
      return; // el modal toma el control; se re-enfoca al cerrar
    }

    if (result.success) {
      localStorage.setItem(`last_checkin_${code}`, Date.now().toString());
    }
    recordResult(result);

    // Re-enfocar para el siguiente escaneo SIN borrar la tarjeta (persiste).
    qrInputRef.current?.focus();
  };

  // Recepción tocó una de las clases traslapadas → marcar esa reserva.
  const pickCandidate = async (cand) => {
    const sel = selection;
    setSelection(null);
    const result = await checkInReservation(cand.reservationId, sel.clientInfo);
    if (result.success && sel.code) {
      localStorage.setItem(`last_checkin_${sel.code}`, Date.now().toString());
    }
    recordResult({ ...result, className: cand.title, classTime: cand.time });
    qrInputRef.current?.focus();
  };

  return (
    <div>
      {/* CLASE EN CHECK-IN + ventana (contador a la derecha) */}
      {checkin && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '18px',
          background: checkin.mode === 'open' ? 'linear-gradient(135deg, var(--primary), var(--accent))' : '#564F49',
          color: 'white', borderRadius: '20px', padding: '16px 20px',
          boxShadow: checkin.mode === 'open' ? '0 10px 26px rgba(255,145,77,0.28)' : '0 10px 26px rgba(0,0,0,0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={22} color="white" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, opacity: 0.85 }}>
                {checkin.mode === 'open'
                  ? (checkin.openClasses?.length > 1 ? `Check-in abierto · ${checkin.openClasses.length} clases` : 'Check-in abierto')
                  : checkin.mode === 'standby' ? 'Próxima clase' : 'Check-in cerrado'}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'var(--font-display)', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {checkin.cls.title}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, opacity: 0.92, marginTop: '2px' }}>
                {checkin.cls.time}{checkin.cls.instructor ? ` · ${checkin.cls.instructor}` : ''}
              </div>
              {checkin.mode === 'open' && checkin.openClasses?.length > 1 && (
                <div style={{ fontSize: '0.72rem', fontWeight: 600, opacity: 0.85, marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  También en check-in: {checkin.openClasses.slice(1).map(c => `${c.time} ${c.title}`).join(' · ')}
                </div>
              )}
            </div>
          </div>

          {/* CONTADOR */}
          <div style={{
            flexShrink: 0, textAlign: 'center', borderRadius: '14px', padding: '8px 14px', minWidth: '92px',
            background: checkin.mode === 'open' ? 'white' : 'rgba(255,255,255,0.16)',
            color: checkin.mode === 'open' ? 'var(--primary)' : 'white'
          }}>
            <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, opacity: checkin.mode === 'open' ? 0.7 : 0.85 }}>
              {checkin.mode === 'open' ? 'Cierra en' : checkin.mode === 'standby' ? 'Abre en' : 'En espera'}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'var(--font-display)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
              {checkin.mode === 'closed' ? '—' : fmtRemaining(remaining)}
            </div>
          </div>
        </div>
      )}

      <div className="admin-double-column">

        {/* LECTOR QR — siempre visible */}
        <section style={{ width: '100%' }}>
          <div className="wallet-card" style={{
            background: 'linear-gradient(135deg, #1A1C1E, #2C302E)',
            padding: '40px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '24px', cursor: 'pointer'
          }} onClick={() => qrInputRef.current?.focus()}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'var(--accent)', opacity: 0.5, boxShadow: '0 0 15px var(--accent)', animation: 'scanLine 3s infinite linear' }} />
            <div style={{ width: '80px', height: '80px', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '20px', height: '20px', borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)', borderTopLeftRadius: '24px' }} />
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '20px', height: '20px', borderTop: '2px solid var(--accent)', borderRight: '2px solid var(--accent)', borderTopRightRadius: '24px' }} />
              <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '20px', height: '20px', borderBottom: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)', borderBottomLeftRadius: '24px' }} />
              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)', borderBottomRightRadius: '24px' }} />
              <QrCode size={35} color="white" opacity={0.8} />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: 'white', fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '0.05em' }}>Escanear QR</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '8px 0 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Aproximar código de alumna</p>
            <form onSubmit={handleQRScan} style={{ position: 'absolute', top: '-1000px', left: '-1000px' }}>
              {/* No controlado (sin onChange) → cero re-renders por carácter; el lector
                  teclea el código completo y se procesa al Enter. onBlur re-enfoca para
                  no perder lecturas, salvo que se toque otro control a propósito. */}
              <input
                ref={qrInputRef} type="text" autoFocus autoComplete="off"
                inputMode="none" enterKeyHint="done"
                onBlur={() => setTimeout(() => {
                  const a = document.activeElement;
                  if (!a || !['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'].includes(a.tagName)) qrInputRef.current?.focus();
                }, 0)}
              />
            </form>
          </div>
        </section>

        {/* COLUMNA DERECHA: última alumna (persistente, con foto) + extra */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
          <AnimatePresence mode="wait">
            {scannedClient && (
              <motion.div
                key={scannedClient.id + scanLog.length}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  background: 'white', borderRadius: '24px',
                  boxShadow: '0 10px 30px rgba(34,197,94,0.12)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  padding: '20px', display: 'flex', alignItems: 'center', gap: '16px'
                }}
              >
                <Avatar name={scannedClient.name} avatar={scannedClient.avatar} size={56} success={scannedClient.isStaff || scannedClient.status === 'ACTIVE'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--black)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {scannedClient.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600, marginTop: '2px' }}>
                    {scannedClient.isStaff
                      ? `Personal · ${roleLabel(scannedClient.role)}`
                      : `${scannedClient.plan} · ${scannedClient.classesRemaining >= 9000 ? '∞' : scannedClient.classesRemaining} clases restantes`}
                  </div>
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: (scannedClient.isStaff || scannedClient.status === 'ACTIVE') ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                    {(scannedClient.isStaff || scannedClient.status === 'ACTIVE') ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {qrMessage}
                  </div>
                </div>
                <div style={{
                  flexShrink: 0, padding: '5px 10px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 800,
                  background: scannedClient.isStaff ? 'rgba(255,145,77,0.12)' : (scannedClient.status === 'ACTIVE' ? 'rgba(34,197,94,0.1)' : 'rgba(255,77,77,0.1)'),
                  color: scannedClient.isStaff ? 'var(--primary)' : (scannedClient.status === 'ACTIVE' ? '#16a34a' : '#dc2626'),
                  textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                  {scannedClient.isStaff ? 'Personal' : (scannedClient.status === 'ACTIVE' ? 'Activa' : 'Inactiva')}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {sideContent}
        </section>
      </div>

      {/* LISTA / LOG DE ASISTENCIA DEL DÍA (persistente, con foto) */}
      {scanLog.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', margin: 0 }}>Asistencia de hoy</h2>
            <div style={{ background: 'rgba(255,145,77,0.1)', color: 'var(--primary)', borderRadius: '10px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 800 }}>
              {scanLog.length} {scanLog.length === 1 ? 'alumna' : 'alumnas'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {scanLog.map((entry, i) => (
              <div key={i} style={{
                background: 'white', borderRadius: '18px', padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: '14px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)'
              }}>
                <Avatar name={entry.name} avatar={entry.avatar} size={42} success={entry.success} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.name || 'Desconocido'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontWeight: 600, marginTop: '2px' }}>
                    {entry.isStaff
                      ? `Personal · ${roleLabel(entry.role)}`
                      : `${entry.plan || 'Sin plan'} · ${entry.classesRemaining == null ? '—' : (entry.classesRemaining >= 9000 ? '∞' : entry.classesRemaining)} clases restantes`}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{entry.scannedAt}</div>
                  <div style={{
                    marginTop: '4px', fontSize: '0.65rem', fontWeight: 800,
                    padding: '3px 8px', borderRadius: '8px', textTransform: 'uppercase',
                    background: entry.success ? 'rgba(34,197,94,0.1)' : 'rgba(255,77,77,0.1)',
                    color: entry.success ? '#16a34a' : '#dc2626'
                  }}>
                    {entry.success ? 'Check-in ✓' : 'Sin reserva'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
              background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white',
              padding: '12px 22px', borderRadius: '14px', fontWeight: 700, fontSize: '0.85rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 9999, maxWidth: '90vw', textAlign: 'center'
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SELECTOR de clase (varias reservas traslapadas) — recepción elige cuál */}
      <AnimatePresence>
        {selection && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setSelection(null); qrInputRef.current?.focus(); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'white', borderRadius: '24px', padding: '22px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <Avatar name={selection.clientInfo?.name} avatar={selection.clientInfo?.avatar} size={44} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--black)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selection.clientInfo?.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                    Reservó varias clases hoy
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', margin: '10px 0 14px', fontWeight: 600 }}>
                ¿A cuál clase entra ahora?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selection.candidates?.map((cand) => (
                  <button
                    key={cand.reservationId}
                    onClick={() => pickCandidate(cand)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                      textAlign: 'left', padding: '14px 16px', borderRadius: '16px', cursor: 'pointer',
                      border: cand.inWindow ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.1)',
                      background: cand.inWindow ? 'rgba(255,145,77,0.08)' : 'white',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cand.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', fontWeight: 600, marginTop: '2px' }}>
                        {cand.time}
                      </div>
                    </div>
                    {cand.inWindow && (
                      <span style={{ flexShrink: 0, fontSize: '0.62rem', fontWeight: 800, color: 'var(--primary)', background: 'white', border: '1px solid var(--primary)', borderRadius: '8px', padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Ahora
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setSelection(null); qrInputRef.current?.focus(); }}
                style={{ width: '100%', marginTop: '14px', padding: '12px', borderRadius: '14px', border: 'none', background: 'rgba(0,0,0,0.06)', color: 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
