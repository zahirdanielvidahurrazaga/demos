import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, ClipboardCheck, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const PRIMARY = '#FF914D';
const INK = 'var(--black)';

// "7:00 AM" → minutos desde medianoche (para ordenar por horario).
const timeToMin = (t) => {
  if (!t) return 0;
  const m = String(t).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10); const min = parseInt(m[2], 10);
  const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
};

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const shiftDate = (dateStr, days) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const navBtn = { background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '14px', textAlign: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.03)' }}>
      <div style={{ fontSize: '1.7rem', fontWeight: 900, color: color || INK, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--on-surface-variant)', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
    </div>
  );
}

// Pase de lista / Asistencias: por día, muestra cada clase con su lista de
// alumnas que RESERVARON y marca quién hizo CHECK-IN con el QR (asistió).
export default function AdminAsistencias() {
  const { globalClasses } = useAuth();
  const [date, setDate] = useState(localToday());
  // Clases del día traídas a propósito cuando la fecha elegida cae fuera de la
  // ventana que carga el contexto. Sin esto, abrir una fecha vieja mostraba el
  // pase de lista VACÍO: el contexto solo trae ~60 días de historia para no
  // reventar el egress, y este selector no tiene tope hacia atrás.
  // Guarda la fecha junto con las filas: así nunca se pinta el día equivocado
  // si la respuesta llega tarde.
  const [clasesDelDia, setClasesDelDia] = useState(null);
  const [rosters, setRosters] = useState({}); // class_id -> [{ id, name, avatar, checkedIn }]
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [onlyAttended, setOnlyAttended] = useState(false);

  const dow = new Date(date + 'T12:00:00').getDay();

  const enContexto = useMemo(() => (globalClasses || [])
    .filter(c => c.date === date || (!c.date && c.day === dow)),
    [globalClasses, date, dow]);

  // Si el día elegido no aparece en lo que ya tiene el contexto, se piden esas
  // clases directamente. Es una consulta de un solo día, no pesa nada.
  useEffect(() => {
    if (enContexto.length > 0) return;   // el contexto ya lo tiene
    let vivo = true;
    supabase
      .from('classes')
      .select('id,title,instructor,time,level,spots,max_spots,color,date,day,category,category_color,coach_id,is_special,special_label,special_color')
      .eq('date', date)
      .then(({ data }) => { if (vivo) setClasesDelDia({ fecha: date, filas: data || [] }); });
    return () => { vivo = false; };
  }, [date, enContexto.length]);

  const dayClasses = useMemo(() => {
    const traidas = clasesDelDia?.fecha === date ? clasesDelDia.filas : [];
    return [...(enContexto.length > 0 ? enContexto : traidas)]
      .sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
  }, [enContexto, clasesDelDia, date]);

  // Reservas + check-in de las clases del día (con datos de la alumna).
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const ids = dayClasses.map(c => c.id);
    if (ids.length === 0) { setRosters({}); setLoading(false); return; }
    supabase.from('reservations')
      .select('id, class_id, checked_in, status, created_at, users:user_id(id, full_name, email, avatar_url)')
      .in('class_id', ids)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        const map = {};
        (data || []).forEach(r => {
          (map[r.class_id] ||= []).push({
            id: r.id,
            name: r.users?.full_name || r.users?.email?.split('@')[0] || 'Sin nombre',
            avatar: r.users?.avatar_url || null,
            checkedIn: !!r.checked_in,
            waitlisted: r.status === 'waitlist', // en espera: no ocupa lugar
          });
        });
        // Confirmadas primero (asistió arriba); la lista de espera conserva su
        // orden de llegada (created_at asc) para respetar la fila.
        Object.values(map).forEach(arr => arr.sort((a, b) => {
          if (a.waitlisted !== b.waitlisted) return a.waitlisted ? 1 : -1;
          if (a.waitlisted) return 0; // ya vienen en orden de llegada
          return (Number(b.checkedIn) - Number(a.checkedIn)) || a.name.localeCompare(b.name);
        }));
        setRosters(map);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [dayClasses]);

  const totals = useMemo(() => {
    let reservas = 0, asistieron = 0;
    // Solo cuentan las CONFIRMADAS (la lista de espera no ocupa lugar).
    Object.values(rosters).forEach(arr => {
      const conf = arr.filter(s => !s.waitlisted);
      reservas += conf.length;
      asistieron += conf.filter(s => s.checkedIn).length;
    });
    return { reservas, asistieron };
  }, [rosters]);

  const dateTitle = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const isToday = date === localToday();

  return (
    <motion.div key="asistencias" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <ClipboardCheck size={26} color={PRIMARY} />
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0, fontWeight: 800, color: INK }}>Pase de lista</h2>
      </div>

      {/* Navegador de día (◀ fecha ▶ · toca la fecha para abrir el calendario) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => setDate(shiftDate(date, -1))} style={navBtn} aria-label="Día anterior"><ChevronLeft size={18} color={INK} /></button>
        <div style={{ flex: 1, position: 'relative', textAlign: 'center', background: 'white', borderRadius: '12px', padding: '10px 8px', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 800, color: INK, fontSize: '0.95rem', textTransform: 'capitalize' }}>{dateTitle}{isToday ? ' · hoy' : ''}</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value || localToday())}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} aria-label="Elegir fecha" />
        </div>
        <button onClick={() => setDate(shiftDate(date, 1))} style={navBtn} aria-label="Día siguiente"><ChevronRight size={18} color={INK} /></button>
      </div>

      {/* Resumen del día */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <SummaryCard label="Clases" value={dayClasses.length} />
        <SummaryCard label="Reservas" value={totals.reservas} />
        <SummaryCard label="Asistieron" value={totals.asistieron} color="#16A34A" />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
        <input type="checkbox" checked={onlyAttended} onChange={(e) => setOnlyAttended(e.target.checked)} style={{ accentColor: PRIMARY, width: '16px', height: '16px' }} />
        Mostrar solo quien asistió (check-in con QR)
      </label>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--on-surface-variant)' }}>Cargando…</div>
      ) : dayClasses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--on-surface-variant)' }}>No hubo clases este día.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {dayClasses.map(c => {
            const all = rosters[c.id] || [];
            const roster = all.filter(s => !s.waitlisted); // confirmadas (con lugar)
            const wl = all.filter(s => s.waitlisted);       // lista de espera
            const attended = roster.filter(s => s.checkedIn).length;
            const shown = onlyAttended ? roster.filter(s => s.checkedIn) : roster;
            const open = expanded === c.id;
            return (
              <div key={c.id} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)', borderLeft: `4px solid ${c.category_color || PRIMARY}`, borderRadius: '16px', overflow: 'hidden' }}>
                <div onClick={() => setExpanded(open ? null : c.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: INK, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--on-surface-variant)', fontWeight: 600, marginTop: '2px' }}>
                      <Clock size={11} style={{ verticalAlign: '-1px' }} /> {c.time}{c.instructor ? ` · ${c.instructor}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#16A34A' }}>{attended} <span style={{ color: 'var(--on-surface-variant)', fontWeight: 600, fontSize: '0.72rem' }}>asist.</span></div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{roster.length} {roster.length === 1 ? 'reserva' : 'reservas'}</div>
                    {wl.length > 0 && <div style={{ fontSize: '0.7rem', color: '#9AA0A6', fontWeight: 700 }}>{wl.length} en espera</div>}
                  </div>
                  <ChevronRight size={18} color="var(--on-surface-variant)" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </div>
                {open && (
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '8px 12px 12px' }}>
                    {shown.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>{onlyAttended ? 'Nadie hizo check-in en esta clase.' : 'Sin reservas en esta clase.'}</div>
                    ) : shown.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 6px' }}>
                        {s.avatar
                          ? <img src={s.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,145,77,0.14)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>{s.name.charAt(0).toUpperCase()}</div>}
                        <span style={{ flex: 1, minWidth: 0, fontSize: '0.88rem', fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                        {s.checkedIn ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 800, color: '#16A34A', background: 'rgba(34,197,94,0.12)', padding: '4px 9px', borderRadius: '999px', flexShrink: 0 }}><Check size={13} /> Asistió</span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--on-surface-variant)', background: 'rgba(0,0,0,0.05)', padding: '4px 9px', borderRadius: '999px', flexShrink: 0 }}>Reservó</span>
                        )}
                      </div>
                    ))}
                    {wl.length > 0 && !onlyAttended && (
                      <div style={{ marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#9AA0A6', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 6px 6px' }}>
                          <Clock size={12} /> Lista de espera
                        </div>
                        {wl.map((s, i) => (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 6px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', color: '#9AA0A6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0 }}>{i + 1}</div>
                            <span style={{ flex: 1, minWidth: 0, fontSize: '0.86rem', fontWeight: 600, color: 'var(--on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
