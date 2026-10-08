import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, Clock, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PRIMARY = '#FF914D';
const roleLabel = (r) => ({ COACH: 'Coach', BARISTA: 'Barista', RECEPCION: 'Recepción', ADMIN: 'Admin' }[r] || 'Personal');

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const shiftDate = (s, days) => {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const navBtn = { background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };

// Avatar redondo (foto o iniciales).
const Avatar = ({ name, avatar, size = 42 }) => {
  if (avatar) return <img src={avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '0.85rem' }}>
      {(name || '??').substring(0, 2).toUpperCase()}
    </div>
  );
};

// Registro de entrada del PERSONAL (coaches/staff) por QR. Lo ven Admin y
// Recepción dentro del Mostrador. Navegable por día. Lee staff_attendance.
export default function StaffAttendance({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [date, setDate] = useState(localToday());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    const start = new Date(date + 'T00:00:00').toISOString();
    const end = new Date(date + 'T23:59:59.999').toISOString();
    supabase
      .from('staff_attendance')
      .select('id, checked_in_at, users:user_id(full_name, role, avatar_url)')
      .gte('checked_in_at', start)
      .lte('checked_in_at', end)
      .order('checked_in_at', { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        setRows(data || []);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [date, open]);

  const uniqueStaff = new Set(rows.map(r => r.users?.full_name)).size;
  const dateTitle = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const isToday = date === localToday();

  return (
    <section style={{ marginTop: '24px', background: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      {/* Cabecera colapsable */}
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 20px', cursor: 'pointer' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,145,77,0.1)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <UserCheck size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--black)', fontFamily: 'var(--font-display)' }}>Registro de personal</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>Entradas del staff por QR (coaches, barista…)</div>
        </div>
        <ChevronDown size={20} color="var(--on-surface-variant)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 20px 20px' }}>
              {/* Navegador de día */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <button onClick={() => setDate(shiftDate(date, -1))} style={navBtn} aria-label="Día anterior"><ChevronLeft size={18} color="var(--black)" /></button>
                <div style={{ flex: 1, position: 'relative', textAlign: 'center', background: 'var(--surface-low, #f6f6f6)', borderRadius: '12px', padding: '10px 8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontWeight: 800, color: 'var(--black)', fontSize: '0.92rem', textTransform: 'capitalize' }}>{dateTitle}{isToday ? ' · hoy' : ''}</div>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value || localToday())}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} aria-label="Elegir fecha" />
                </div>
                <button onClick={() => setDate(shiftDate(date, 1))} style={navBtn} aria-label="Día siguiente"><ChevronRight size={18} color="var(--black)" /></button>
              </div>

              {/* Resumen */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <div style={{ flex: 1, background: 'var(--surface-low, #f6f6f6)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: PRIMARY, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{rows.length}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Entradas</div>
                </div>
                <div style={{ flex: 1, background: 'var(--surface-low, #f6f6f6)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--black)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{uniqueStaff}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Personas</div>
                </div>
              </div>

              {/* Lista */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>Cargando…</div>
              ) : rows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--on-surface-variant)', fontSize: '0.88rem' }}>
                  Sin entradas de personal este día.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rows.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--surface-low, #f6f6f6)', borderRadius: '14px' }}>
                      <Avatar name={r.users?.full_name} avatar={r.users?.avatar_url} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--black)', fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.users?.full_name || 'Sin nombre'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{roleLabel(r.users?.role)}</div>
                      </div>
                      <div style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 800, color: PRIMARY, background: 'rgba(255,145,77,0.1)', padding: '6px 11px', borderRadius: '12px', fontVariantNumeric: 'tabular-nums' }}>
                        <Clock size={13} />
                        {new Date(r.checked_in_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
