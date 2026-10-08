import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Clock, Check, X, PartyPopper } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ESTUDIO } from '../config/estudio';

// ─────────────────────────────────────────────────────────────────────────────
// Overlay GLOBAL de "se liberó un lugar" (lista de espera → oferta con confirmación).
// Cuando el servidor pone una reserva en estado 'offered', esta capa muestra un
// modal PROMINENTE con cuenta regresiva y botones Confirmar / Ceder. Funciona en
// cualquier pantalla y también en web/PWA (no depende del push): la reserva llega
// por realtime a `myReservations`. Se monta junto a los overlays globales de App.
// ─────────────────────────────────────────────────────────────────────────────

function fmtMMSS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// "hoy 7:00 PM" / "mañana 7:00 PM" / "vie 25 · 7:00 PM"
function whenLabel(dateStr, timeStr) {
  if (!dateStr) return timeStr || '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const cd = new Date(y, (m || 1) - 1, d || 1);
  const diff = Math.round((cd - today) / 86400000);
  if (diff === 0) return `hoy ${timeStr || ''}`.trim();
  if (diff === 1) return `mañana ${timeStr || ''}`.trim();
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  return `${dias[cd.getDay()]} ${cd.getDate()} · ${timeStr || ''}`.trim();
}

export default function WaitlistOfferGate() {
  const { myReservations, coaches, acceptOffer, declineOffer } = useAuth();
  const [nowTs, setNowTs] = useState(Date.now());
  const [dismissed, setDismissed] = useState(() => new Set()); // ids ocultados esta sesión
  const [busy, setBusy] = useState(null);   // 'accept' | 'decline'
  const [error, setError] = useState('');
  const tickRef = useRef(null);

  // Ofertas vigentes (no vencidas, no descartadas manualmente esta sesión).
  const offers = useMemo(() => (myReservations || [])
    .filter(r => r.status === 'offered' && r.offerExpiresAt && !dismissed.has(r.id))
    .filter(r => new Date(r.offerExpiresAt).getTime() - nowTs > 0)
    .sort((a, b) => new Date(a.offerExpiresAt) - new Date(b.offerExpiresAt)),
    [myReservations, dismissed, nowTs]);

  const current = offers[0] || null;

  // Reloj de 1 s solo mientras hay una oferta abierta (para la cuenta regresiva).
  useEffect(() => {
    if (!current) { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } return; }
    tickRef.current = setInterval(() => setNowTs(Date.now()), 1000);
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  }, [current]);

  // Al volver del fondo, re-mostrar ofertas ocultadas (son urgentes).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listener;
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) { setDismissed(new Set()); setNowTs(Date.now()); }
    }).then(l => { listener = l; });
    return () => { if (listener) listener.remove(); };
  }, []);

  // Limpiar el error al cambiar de oferta.
  useEffect(() => { setError(''); setBusy(null); }, [current?.id]);

  if (!current) return null;

  const coach = coaches?.find(c => c.id === current.coachId);
  const coachName = coach?.full_name || current.instructor || ESTUDIO.nombre;
  const photo = coach?.avatar_url || null;
  const initial = (coachName || 'B').trim().charAt(0).toUpperCase();
  const remaining = new Date(current.offerExpiresAt).getTime() - nowTs;
  const urgent = remaining <= 5 * 60 * 1000; // ≤5 min

  const onAccept = async () => {
    setBusy('accept'); setError('');
    const res = await acceptOffer(current.classId);
    setBusy(null);
    if (res?.success) return; // la reserva pasa a 'confirmed' → el modal se cierra solo
    if (res?.reason === 'expired') setError('La oferta venció justo ahora. El lugar pasó a la siguiente persona.');
    else if (res?.reason === 'no_credits') setError('No te quedan clases en tu paquete para tomar este lugar.');
    else if (res?.reason === 'membership') setError('Tu membresía venció. Renuévala para tomar el lugar.');
    else if (res?.reason === 'gone') setError('Esta oferta ya no está disponible.');
    else setError('No se pudo confirmar. Intenta de nuevo.');
  };

  const onDecline = async () => {
    setBusy('decline'); setError('');
    await declineOffer(current.classId);
    setBusy(null);
    // declineOffer quita la reserva de la lista → el modal se cierra solo.
  };

  const dismiss = () => setDismissed(prev => new Set(prev).add(current.id));

  return (
    <AnimatePresence>
      <motion.div
        key="wl-offer-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          background: 'rgba(10,7,5,0.55)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom))',
        }}
        onClick={dismiss}
      >
        <motion.div
          key={`wl-offer-${current.id}`}
          initial={{ scale: 0.9, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 12, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 380, borderRadius: 24, overflow: 'hidden',
            background: 'var(--app-surface-solid, #fff)', color: 'var(--on-surface, #15110E)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)', position: 'relative',
          }}
        >
          {/* Cabecera con acento de marca */}
          <div style={{
            background: 'linear-gradient(135deg, #FF914D 0%, #E68245 100%)',
            padding: '22px 22px 18px', color: '#fff', position: 'relative',
          }}>
            <button onClick={dismiss} aria-label="Cerrar" style={{
              position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.2)',
              border: 'none', borderRadius: 999, width: 30, height: 30, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}><X size={16} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: '1.15rem' }}>
              <PartyPopper size={22} /> ¡Se liberó un lugar!
            </div>
            <div style={{ fontSize: '0.86rem', opacity: 0.92, marginTop: 4 }}>
              Estabas en lista de espera y ahora puedes entrar. Confírmalo antes de que pase a la siguiente.
            </div>
          </div>

          {/* Detalle de la clase */}
          <div style={{ padding: '20px 22px 8px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: 'var(--surface-low, #f1eae4)', border: '2px solid var(--app-surface-solid,#fff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {photo
                ? <img src={photo} alt={coachName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'var(--primary,#FF914D)', fontWeight: 800, fontSize: '1.3rem' }}>{initial}</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.15 }}>{current.title || 'Tu clase'}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant,#8a7f76)', fontWeight: 700, marginTop: 2 }}>
                {coachName} · {whenLabel(current.date, current.time)}
              </div>
            </div>
          </div>

          {/* Cuenta regresiva */}
          <div style={{ padding: '10px 22px 4px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: urgent ? 'rgba(220,38,38,0.10)' : 'var(--fill-subtle, #f5efe9)',
              color: urgent ? '#dc2626' : 'var(--on-surface,#15110E)',
              borderRadius: 14, padding: '10px 12px', fontWeight: 800,
            }}>
              <Clock size={16} />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                Se cierra en {fmtMMSS(remaining)}
              </span>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--on-surface-variant,#8a7f76)', marginTop: 6 }}>
              Al confirmar se descuenta 1 clase de tu paquete.
            </div>
          </div>

          {error && (
            <div style={{ margin: '8px 22px 0', color: '#dc2626', fontSize: '0.82rem', fontWeight: 700, textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Acciones */}
          <div style={{ padding: '14px 22px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={onAccept}
              disabled={!!busy}
              style={{
                width: '100%', border: 'none', borderRadius: 16, padding: '15px',
                background: 'linear-gradient(135deg, #FF914D 0%, #E68245 100%)', color: '#fff',
                fontSize: '1rem', fontWeight: 900, cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 10px 24px rgba(255,145,77,0.4)',
              }}
            >
              <Check size={18} /> {busy === 'accept' ? 'Confirmando…' : 'Confirmar mi lugar'}
            </button>
            <button
              onClick={onDecline}
              disabled={!!busy}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                color: 'var(--on-surface-variant,#8a7f76)', fontSize: '0.86rem', fontWeight: 700,
                cursor: busy ? 'default' : 'pointer', padding: '6px',
              }}
            >
              {busy === 'decline' ? 'Cediendo…' : 'Ceder el lugar a la siguiente'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
