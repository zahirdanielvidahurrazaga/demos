import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { QrCode, CalendarPlus, Check, Sparkles } from 'lucide-react';
import { addClassToCalendar } from '../hooks/useCalendar';
import { supabase } from '../lib/supabase';
import { ESTUDIO } from '../config/estudio';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
// Se lee DENTRO del componente, no aquí arriba: una constante de módulo se
// evalúa al importar, antes de que el modo demo reemplace la identidad activa,
// y el pase se quedaba con la foto de Be Fit Lab.
const ticketPhoto = () => ESTUDIO.portadas.pase;

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// Convierte "HH:MM" (con o sin AM/PM) a {hour, min} en 24h
function parseTime(time) {
  const raw = String(time || '').trim();
  const [h, m] = raw.replace(/AM|PM/gi, '').trim().split(':');
  let hour = parseInt(h, 10) || 0;
  const min = parseInt(m || '0', 10) || 0;
  if (/PM/i.test(raw) && hour !== 12) hour += 12;
  if (/AM/i.test(raw) && hour === 12) hour = 0;
  return { hour, min };
}

// De todas mis reservas, calcula la PRÓXIMA clase real (fecha específica o día recurrente)
function computeNext(myReservations, globalClasses) {
  const now = new Date();
  let best = null;
  for (const res of (myReservations || [])) {
    const cls = (globalClasses || []).find(c => c.id === res.classId) || {};
    // La reserva trae su propia fecha/hora; globalClasses (10 días atrás para
    // una clienta) es solo respaldo.
    const time = res.time || cls.time;
    const date = res.date || cls.date;
    if (!time) continue;
    const { hour, min } = parseTime(time);
    let dt;
    if (date) {
      dt = new Date(date + 'T00:00:00');
      dt.setHours(hour, min, 0, 0);
    } else if (cls.day != null) {
      dt = new Date(now);
      dt.setHours(hour, min, 0, 0);
      let add = (cls.day - now.getDay() + 7) % 7;
      if (add === 0 && dt.getTime() < now.getTime() - 3600000) add = 7;
      dt.setDate(now.getDate() + add);
    } else {
      continue;
    }
    if (dt.getTime() < now.getTime() - 3600000) continue; // ya pasó (>1h)
    if (!best || dt.getTime() < best.dt.getTime()) best = { res, cls, dt, time };
  }
  return best;
}

function countdownLabel(dt) {
  const diff = Math.round((startOfDay(dt) - startOfDay(new Date())) / 86400000);
  if (diff <= 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff < 7) return `En ${diff} días`;
  return 'Próximamente';
}

const PHOTO_H = 150;

// Cabecera con foto + degradado cálido (estilo boarding pass girly premium)
function TicketPhoto({ children }) {
  return (
    <div style={{
      height: PHOTO_H,
      backgroundImage: `linear-gradient(150deg, rgba(58,32,22,0.30) 0%, rgba(38,22,16,0.78) 100%), url('${ticketPhoto()}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center 15%',
      borderRadius: '28px 28px 0 0',
      padding: '18px 22px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
    }}>
      {children}
    </div>
  );
}

// Línea de perforación con muescas laterales (recortes color del fondo de página)
function Perforation() {
  return (
    <div style={{ position: 'relative', height: 0 }}>
      <div style={{ position: 'absolute', left: -11, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', background: 'var(--app-bg)' }} />
      <div style={{ position: 'absolute', right: -11, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', background: 'var(--app-bg)' }} />
      <div style={{ position: 'absolute', left: 16, right: 16, top: '50%', transform: 'translateY(-50%)', borderTop: '2px dashed var(--border-subtle)' }} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--black)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</div>
    </div>
  );
}

export function NextClassTicket({ myReservations, globalClasses, coaches, classesRemaining, userId, onShowQR }) {
  const isNative = Capacitor.isNativePlatform();
  const [calState, setCalState] = useState('idle'); // idle | adding | added | error
  const next = useMemo(() => computeNext(myReservations, globalClasses), [myReservations, globalClasses]);

  const coach = next && (coaches || []).find(c =>
    (next.cls.coach_id && c.id === next.cls.coach_id) ||
    c.full_name === next.res.instructor ||
    c.email === next.res.instructor
  );
  const coachName = coach?.full_name || next?.res?.instructor || ESTUDIO.nombre;
  const title = next?.res?.title || next?.cls?.title || 'Tu clase';
  const dispChip = classesRemaining >= 9000 ? '∞ disponibles' : `${classesRemaining} disponibles`;

  const handleCal = async () => {
    if (!next || calState === 'adding' || calState === 'added') return;
    setCalState('adding');
    const id = await addClassToCalendar({ time: next.time, title, instructor: coachName }, next.dt);
    if (!id) { setCalState('error'); return; }
    if (userId) {
      try {
        await supabase.from('reservations').update({ calendar_event_id: id })
          .eq('user_id', userId).eq('class_id', next.res.classId);
      } catch (e) { /* no bloquear la UI si falla el guardado */ }
    }
    setCalState('added');
  };

  const cardShell = {
    borderRadius: 28,
    background: 'var(--app-surface-solid)',
    boxShadow: 'var(--card-shadow)',
    border: '1px solid var(--border-subtle)',
    position: 'relative',
  };

  // ── Estado vacío: sin clases reservadas ──────────────────────────────
  if (!next) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ ...cardShell, marginBottom: 25 }}>
        <TicketPhoto>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.18em', textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>{ESTUDIO.nombreMayusculas}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '5px 11px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em' }}>
              PASE DE CLASE
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--font-display)', fontSize: '1.15rem', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>Tu próxima clase te espera ✦</span>
        </TicketPhoto>
        <Perforation />
        <div style={{ padding: '20px 22px 22px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>Aún no tienes clases reservadas</p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
            Elige una en el calendario de abajo 👇 · tienes <b style={{ color: 'var(--primary)' }}>{dispChip}</b>
          </p>
        </div>
      </motion.div>
    );
  }

  // ── Próxima clase real ───────────────────────────────────────────────
  const dateStr = `${DAYS[next.dt.getDay()]} ${next.dt.getDate()} ${MONTHS[next.dt.getMonth()]}`;
  const timeStr = `${String(next.dt.getHours()).padStart(2, '0')}:${String(next.dt.getMinutes()).padStart(2, '0')}`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ ...cardShell, marginBottom: 25 }}>
      <TicketPhoto>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.18em', textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>{ESTUDIO.nombreMayusculas}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '5px 11px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em' }}>
            <Sparkles size={12} /> PASE DE CLASE
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2 }}>Tu próxima clase</div>
            <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>{countdownLabel(next.dt)}</div>
          </div>
          <span style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '4px 10px', borderRadius: 16, fontSize: '0.62rem', fontWeight: 800 }}>{dispChip}</span>
        </div>
      </TicketPhoto>

      <Perforation />

      <div style={{ padding: '18px 22px 20px' }}>
        <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 2 }}>Clase</div>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.45rem', fontFamily: 'var(--font-display)', color: 'var(--black)', lineHeight: 1.1 }}>{title}</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 12, alignItems: 'center', marginBottom: 18 }}>
          <Field label="Fecha">{dateStr}</Field>
          <Field label="Hora">{timeStr}</Field>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--fill-subtle)', border: '1.5px solid var(--app-surface-solid)', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {coach?.avatar_url
                ? <img src={coach.avatar_url} alt="Coach" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.8rem' }}>{(coachName || 'C').charAt(0).toUpperCase()}</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: 2 }}>Coach</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--black)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{coachName}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onShowQR}
            style={{ flex: 1, padding: '12px', borderRadius: 9999, border: 'none', cursor: 'pointer', background: 'var(--primary)', color: '#fff', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 20px rgba(255,139,66,0.3)' }}
          >
            <QrCode size={17} /> Check-in
          </button>
          {isNative && (
            <button
              onClick={handleCal}
              disabled={calState === 'added' || calState === 'adding'}
              style={{ flex: 1, padding: '12px', borderRadius: 9999, cursor: calState === 'added' ? 'default' : 'pointer', background: 'transparent', color: calState === 'added' ? '#16A34A' : 'var(--on-surface)', border: `1px solid ${calState === 'added' ? 'rgba(22,163,74,0.4)' : 'var(--border-subtle)'}`, fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {calState === 'added'
                ? <><Check size={17} /> Agregada</>
                : <><CalendarPlus size={17} /> {calState === 'adding' ? '...' : 'Calendario'}</>}
            </button>
          )}
        </div>
        {calState === 'error' && (
          <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: '#EF4444', textAlign: 'center' }}>
            No se pudo agregar. Otorga el permiso de calendario en Configuración.
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default NextClassTicket;
