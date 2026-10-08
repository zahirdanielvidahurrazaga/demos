import React, { useState } from 'react';
import { ChevronRight, Users, Activity, QrCode, User, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { todayLocalStr } from '../lib/dates';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollDetect } from '../hooks/useScrollDetect';
import { QRCodeCanvas } from 'qrcode.react';
import ScheduleStoryExport from '../components/ScheduleStoryExport';
import { resolveCatColor } from '../lib/categories';
import { supabase } from '../lib/supabase';
import { ESTUDIO } from '../config/estudio';

function Coach() {
  const { user, logout, globalClasses, avatarUrl, coaches, profileName } = useAuth();
  const navigate = useNavigate();
  const scrolled = useScrollDetect(30);

  const todayStr = todayLocalStr();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  // ── Calendar state (compartido entre tabs) ──────────────────────────
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const currentMonth = currentMonthDate.getMonth();
  const currentYear = currentMonthDate.getFullYear();
  const [calendarView, setCalendarView] = useState('month'); // 'month' | 'day'
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  // ── Nav state ───────────────────────────────────────────────────────
  const [showQR, setShowQR] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // ── Roster (alumnas inscritas en una clase) ─────────────────────────
  const [rosterClass, setRosterClass] = useState(null);   // clase abierta
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState(null);   // 'ajena' | 'error'

  const openRoster = async (c) => {
    setRosterClass(c);
    setRoster([]);
    setRosterError(null);
    // La lista de alumnas es de las clases de una: la BD solo deja leer las
    // reservas de las clases donde la coach está asignada. Decirlo aquí evita
    // la mentira de "no hay alumnas inscritas" en la clase de una compañera.
    if (!isMyClass(c)) { setRosterError('ajena'); return; }
    setRosterLoading(true);
    const { data, error } = await supabase
      .from('reservations')
      .select('id, checked_in, status, users:user_id(id, full_name, email, avatar_url)')
      .eq('class_id', c.id)
      // Inscritas + las que tienen un lugar APARTADO pendiente de confirmar.
      // Antes solo traía 'confirmed' y una clienta con lugar ofertado quedaba
      // INVISIBLE aquí mientras su app se lo pintaba como reservado: la dueña
      // reportó exactamente eso el 29-jul ("aparece reservada y no está en la
      // lista"). Mejor mostrarla marcada que no mostrarla.
      .in('status', ['confirmed', 'offered']);
    if (error) { setRosterError('error'); setRosterLoading(false); return; }
    const list = (data || []).map(r => ({
      id: r.id,
      name: r.users?.full_name || r.users?.email?.split('@')[0] || 'Sin nombre',
      avatar: r.users?.avatar_url || null,
      checkedIn: !!r.checked_in,
      pendiente: r.status === 'offered',
    })).sort((a, b) => (Number(a.pendiente) - Number(b.pendiente))
      || (Number(b.checkedIn) - Number(a.checkedIn)) || a.name.localeCompare(b.name));
    setRoster(list);
    setRosterLoading(false);
  };

  const handleLogout = () => { logout(); navigate('/'); };

  // ── Calendar helpers ────────────────────────────────────────────────
  const nextMonth = () => setCurrentMonthDate(new Date(currentYear, currentMonth + 1, 1));
  const prevMonth = () => setCurrentMonthDate(new Date(currentYear, currentMonth - 1, 1));
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const getWeekDays = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      return {
        dateStr: cur.toISOString().split('T')[0],
        dayNum: cur.getDate(),
        dayName: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]
      };
    });
  };

  const getDayOfWeek = (dateStr) => new Date(dateStr + 'T12:00:00').getDay();

  // ── "¿Esta clase es mía?" ───────────────────────────────────────────
  // El único dato estable es `coach_id`: lo pone el formulario de clases y no
  // cambia. El texto `instructor` lo escribe la dueña a mano y se le va
  // moviendo — a Pilar le puso "MARIA DEL PILAR MENDEZ CALDERON" hasta agosto y
  // "Pili" desde septiembre —, así que compararlo contra el nombre de la sesión
  // dejaba a la coach con 0 clases y 0 alumnas en su panel aunque sí tuviera
  // clase ese día (reporte de la dueña del 7-sep: "ya van 3 de ellas").
  const normalizar = (s) => (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // sin acentos
    .trim().toLowerCase().replace(/\s+/g, ' ');
  const misNombres = [user?.user_metadata?.full_name, profileName, user?.email?.split('@')[0]]
    .map(normalizar).filter(Boolean);
  // Respaldo solo para clases viejas que se cargaron sin coach_id: nombre
  // completo IGUAL, nunca "contiene" — con substring una coach llamada "Pao"
  // se adueñaba de las clases de "Nallely Paola".
  const isMyClass = (c) => {
    if (!c) return false;
    if (c.coach_id) return c.coach_id === user?.id;
    return misNombres.includes(normalizar(c.instructor));
  };

  const getMyClassesForDate = (dateStr) => {
    if (!dateStr) return [];
    const dow = getDayOfWeek(dateStr);
    return globalClasses.filter(c =>
      isMyClass(c) && (c.date === dateStr || (c.date === null && c.day === dow)));
  };

  const getTodasClasesForDate = (dateStr) => {
    if (!dateStr) return [];
    const dow = getDayOfWeek(dateStr);
    return globalClasses.filter(c => c.date === dateStr || (c.date === null && c.day === dow));
  };

  const myClasses = getMyClassesForDate(selectedDateStr);
  const todasClases = getTodasClasesForDate(selectedDateStr);
  const totalAlumnasHoy = myClasses.reduce((acc, c) => acc + ((c.max_spots || 10) - c.spots), 0);

  // ── Shared calendar renderer ────────────────────────────────────────
  // getDotsForDate(dateStr) => { mine: number, others: number }
  const renderCalendar = (getDotsForDate, onDaySelect) => {
    const handleDaySelect = (dateStr) => {
      setSelectedDateStr(dateStr);
      setCalendarView('day');
      if (onDaySelect) onDaySelect(dateStr);
    };

    if (calendarView === 'month') {
      return (
        <motion.div key="month-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="ios-glass-card" style={{ padding: '20px', background: 'white', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <button onClick={prevMonth} style={{ background: 'rgba(0,0,0,0.04)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronRight size={20} color="var(--black)" style={{ transform: 'rotate(180deg)' }} />
              </button>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', margin: 0, textTransform: 'capitalize' }}>
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <button onClick={nextMonth} style={{ background: 'rgba(0,0,0,0.04)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronRight size={20} color="var(--black)" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '10px', textAlign: 'center' }}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <div key={i} style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} style={{ aspectRatio: '1' }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                const { mine, others } = getDotsForDate(dateStr);
                const hasAny = mine > 0 || others > 0;

                return (
                  <motion.button
                    key={dayNum}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDaySelect(dateStr)}
                    style={{
                      aspectRatio: '1', borderRadius: '12px', border: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative',
                      background: isToday ? 'var(--primary)' : (hasAny ? 'rgba(0,0,0,0.03)' : 'transparent'),
                      color: isToday ? 'white' : 'var(--black)',
                      fontWeight: isToday ? 800 : (hasAny ? 700 : 500)
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>{dayNum}</span>
                    {hasAny && (
                      <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '6px' }}>
                        {mine > 0 && Array.from({ length: Math.min(mine, 2) }).map((_, idx) => (
                          <div key={`m${idx}`} style={{ width: '4px', height: '4px', borderRadius: '50%', background: isToday ? 'white' : 'var(--primary)' }} />
                        ))}
                        {others > 0 && Array.from({ length: Math.min(others, 2) }).map((_, idx) => (
                          <div key={`o${idx}`} style={{ width: '4px', height: '4px', borderRadius: '50%', background: isToday ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)' }} />
                        ))}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      );
    }

    // Day view — week strip + back button
    return (
      <motion.div key="day-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <button
            onClick={() => setCalendarView('month')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', padding: 0 }}
          >
            <ChevronRight size={22} style={{ transform: 'rotate(180deg)' }} />
            {monthNames[new Date(selectedDateStr + 'T12:00:00').getMonth()]}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '25px', background: 'white', padding: '15px 10px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          {getWeekDays(selectedDateStr).map((d, i) => {
            const isSelected = d.dateStr === selectedDateStr;
            const { mine, others } = getDotsForDate(d.dateStr);
            const hasAny = mine > 0 || others > 0;
            return (
              <div key={i} onClick={() => setSelectedDateStr(d.dateStr)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{d.dayName}</span>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isSelected ? 'var(--primary)' : 'transparent',
                  color: isSelected ? 'white' : 'var(--black)',
                  fontWeight: isSelected ? 800 : 600, fontSize: '1.1rem'
                }}>
                  {d.dayNum}
                </div>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: hasAny ? (isSelected ? 'white' : (mine > 0 ? 'var(--primary)' : 'rgba(0,0,0,0.2)')) : 'transparent', marginTop: '-2px' }} />
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  // ── Tab: Agenda (mis clases) ────────────────────────────────────────
  const renderAgenda = () => {
    const getDotsForDate = (dateStr) => {
      const mine = getMyClassesForDate(dateStr).length;
      const total = getTodasClasesForDate(dateStr).length;
      return { mine, others: total - mine };
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Hero del día — estilo premium con foto (mismo lenguaje que Portal) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{
            padding: '24px', borderRadius: '32px',
            backgroundImage: `linear-gradient(145deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.66) 100%), url('${ESTUDIO.portadas.coach}')`,
            backgroundSize: 'cover', backgroundPosition: 'center 40%',
            boxShadow: '0 20px 40px rgba(230, 114, 43, 0.25)',
            position: 'relative', overflow: 'hidden', minHeight: '180px'
          }}
        >
          {/* Brillo suave superior tipo glass */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Panel de hoy</span>
            <h2 style={{ fontSize: '1.9rem', color: '#fff', margin: '6px 0 18px', fontFamily: 'var(--font-display)', lineHeight: 1.05, textShadow: '0 2px 10px rgba(0,0,0,0.2)', textTransform: 'capitalize' }}>
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>

            {/* Pills glass con las métricas del día */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {[{ icon: <Users size={18} color="#fff" />, n: totalAlumnasHoy, l: 'Alumnas hoy' },
                { icon: <Activity size={18} color="#fff" />, n: myClasses.length, l: 'Clases hoy' }].map(s => (
                <div key={s.l} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '12px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,145,77,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: 'var(--font-display)' }}>{s.n}</div>
                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.75)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px' }}>{s.l}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Compartir horarios a Instagram */}
        <ScheduleStoryExport classes={globalClasses} coaches={coaches} selectedDateStr={selectedDateStr} />

        {/* Calendario */}
        <section>{renderCalendar(getDotsForDate)}</section>

        {/* Lista de clases del día — todas, con las tuyas destacadas */}
        {calendarView === 'day' && (
          <section>
            <h4 style={{ fontSize: '1.1rem', margin: '0 0 6px 0', color: 'var(--black)', fontFamily: 'var(--font-display)', textTransform: 'capitalize' }}>
              {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h4>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem', margin: '0 0 15px' }}>
              Todas las clases del estudio.{' '}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} /> Tuya
              </span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todasClases.length > 0 ? todasClases.map(c => {
                const esMia = isMyClass(c);
                const ocupacion = (c.max_spots || 10) - c.spots;
                const porcentaje = Math.round((ocupacion / (c.max_spots || 10)) * 100);
                return (
                  <motion.div key={c.id} whileTap={{ scale: 0.985 }} onClick={() => openRoster(c)} className="ios-glass-card" style={{ padding: '16px 20px', background: resolveCatColor(c.category, c.category_color), display: 'flex', alignItems: 'center', cursor: 'pointer', border: esMia ? '1.5px solid var(--primary)' : '1px solid rgba(0,0,0,0.05)', borderLeft: esMia ? '4px solid var(--primary)' : '1px solid rgba(0,0,0,0.05)', transition: 'all 0.2s' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: '14px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: esMia ? 'var(--primary)' : 'var(--black)' }}>{c.time.split(' ')[0]}</span>
                      <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{c.time.split(' ')[1] || 'AM'}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <h3 style={{ fontSize: '1rem', margin: 0, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</h3>
                        {esMia && <span style={{ flexShrink: 0, fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(255,139,66,0.1)', padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mía</span>}
                        {c.is_special && <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', fontSize: '0.55rem', fontWeight: 900, color: '#fff', background: c.special_color || 'linear-gradient(135deg, #FF914D, #E07A9C)', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{(c.special_label && c.special_label.trim()) || 'Especial'}</span>}
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: esMia ? 'var(--primary)' : 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.instructor}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <Users size={13} color="var(--on-surface-variant)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--on-surface-variant)', flexShrink: 0 }}>{ocupacion}/{c.max_spots || 10} inscritas</span>
                        <div style={{ flex: 1, height: '3px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px' }}>
                          <div style={{ width: `${porcentaje}%`, height: '100%', background: esMia ? 'var(--primary)' : 'rgba(0,0,0,0.2)', borderRadius: '2px', transition: 'width 0.3s' }} />
                        </div>
                        {esMia && <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>Ver lista <ChevronRight size={13} /></span>}
                      </div>
                    </div>
                  </motion.div>
                );
              }) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.9rem', fontStyle: 'italic', background: 'rgba(55,61,59,0.03)', borderRadius: '16px' }}>
                  No hay clases programadas para este día.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="mobile-app-container" style={{ background: 'var(--app-bg)' }}>
      <header className="ios-header" style={{ paddingBottom: '5px', background: 'transparent' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 2px', fontWeight: 600 }}>{greeting}</p>
            <h1 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1, color: 'var(--black)' }}>{user?.user_metadata?.full_name || 'Coach'}</h1>
          </motion.div>
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                width: '42px', height: '42px', borderRadius: '50%',
                background: avatarUrl ? 'transparent' : 'rgba(255,139,66,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden',
                border: avatarUrl ? '2px solid #FF8B42' : 'none',
                boxShadow: avatarUrl ? '0 4px 12px rgba(255,139,66,0.3)' : 'none'
              }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <User size={20} color="var(--primary)" />
              }
            </div>
            {showProfileMenu && (
              <div className="profile-dropdown">
                <div style={{ padding: '10px 15px', borderBottom: '1px solid rgba(55,61,59,0.05)', marginBottom: '5px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{user?.user_metadata?.full_name || 'Coach'}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>Coach Activo</div>
                </div>
                <div className="profile-dropdown-item" onClick={() => { navigate('/mi-cuenta'); setShowProfileMenu(false); }}>Mi Cuenta</div>
                <div className="profile-dropdown-item" onClick={() => { navigate('/ajustes'); setShowProfileMenu(false); }}>Ajustes</div>
                <div className="profile-dropdown-item danger" onClick={handleLogout}>Cerrar Sesión</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-main" style={{ display: 'block', maxWidth: '600px', margin: '0 auto', width: '100%', paddingBottom: '100px' }}>
        <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          {renderAgenda()}
        </div>
      </main>

      {/* Nav — solo el QR del coach (un único calendario, sin pestañas) */}
      <nav className={`ios-bottom-nav ${scrolled ? 'scrolled' : ''}`} style={{ justifyContent: 'center' }}>
        <button className="nav-qr-button" onClick={() => setShowQR(true)}>
          <QrCode size={24} strokeWidth={2.5} />
        </button>
      </nav>


      {/* QR Bottom Sheet */}
      <AnimatePresence>
        {showQR && (
          <>
            <div className="qr-sheet-overlay" onClick={() => setShowQR(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) setShowQR(false); }}
              className="qr-bottom-sheet"
              style={{ padding: '12px 24px 20px', background: 'var(--surface)' }}
            >
              <div className="sheet-handle" />
              <button onClick={() => setShowQR(false)} aria-label="Cerrar" style={{ position: 'absolute', top: '14px', right: '16px', width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', color: 'var(--on-surface)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}>✕</button>
              <div className="wallet-card" style={{ background: 'var(--surface-low)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-subtle)', position: 'relative', overflow: 'hidden', margin: '0 auto 10px', width: '100%', borderRadius: '30px' }}>
                <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', transform: 'skewX(-20deg)' }} />
                <div className="wallet-header" style={{ borderBottom: 'none', paddingBottom: 0, paddingTop: '20px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(255,139,66,0.18)' }}><img src={ESTUDIO.marca.logo} alt={ESTUDIO.nombre} style={{ height: '24px', width: 'auto', objectFit: 'contain', display: 'block' }} /></div>
                  </div>
                  <QrCode size={20} color="var(--primary)" opacity={0.8} />
                </div>
                <div className="wallet-body" style={{ padding: '25px 20px', textAlign: 'center' }}>
                  <div style={{ background: 'white', padding: '12px', borderRadius: '20px', display: 'inline-block', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                    <QRCodeCanvas value={user?.id || 'befit-coach-id'} size={160} level="H" includeMargin={false} fgColor="#000000" />
                  </div>
                </div>
                <div className="wallet-footer" style={{ borderTop: '1px dashed rgba(0,0,0,0.05)', paddingTop: '20px', paddingBottom: '20px', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>ESTADO</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--black)', fontFamily: 'var(--font-display)' }}>COACH <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--primary)' }}>activo</span></div>
                  </div>
                </div>
              </div>
              <div className="sheet-user-info" style={{ marginTop: '10px' }}>
                <div className="user-name">{user?.user_metadata?.full_name || `Coach ${ESTUDIO.nombre}`}</div>
                <div>{user?.email}</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Roster — alumnas inscritas en la clase tocada */}
      <AnimatePresence>
        {rosterClass && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRosterClass(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 6001, maxHeight: '85vh', background: 'var(--surface, #fff)', borderTopLeftRadius: 28, borderTopRightRadius: 28, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* header */}
              <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: 'var(--black)' }}>{rosterClass.title}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>{rosterClass.time} · {rosterClass.instructor}</p>
                  </div>
                  <button onClick={() => setRosterClass(null)} aria-label="Cerrar" style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', color: 'var(--on-surface)', cursor: 'pointer', flexShrink: 0, fontSize: '1rem' }}>✕</button>
                </div>
                <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,145,77,0.12)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '0.8rem' }}>
                  <Users size={15} /> {rosterError
                    ? `${(rosterClass.max_spots || 10) - rosterClass.spots} inscritas`
                    : `${roster.length} ${roster.length === 1 ? 'alumna inscrita' : 'alumnas inscritas'}`}
                </div>
              </div>
              {/* lista */}
              <div style={{ overflowY: 'auto', padding: '12px 18px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}>
                {rosterLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--on-surface-variant)' }}>Cargando…</div>
                ) : rosterError ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--on-surface-variant)' }}>
                    <Users size={34} color="rgba(0,0,0,0.18)" />
                    {rosterError === 'ajena' ? (
                      <>
                        <p style={{ margin: '12px 0 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--black)' }}>Esta clase es de {rosterClass.instructor}.</p>
                        <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>Solo puedes ver la lista de tus clases. Si vas a cubrirla, pide que te la asignen.</p>
                      </>
                    ) : (
                      <p style={{ margin: '12px 0 0', fontSize: '0.9rem' }}>No se pudo cargar la lista. Revisa tu conexión e inténtalo de nuevo.</p>
                    )}
                  </div>
                ) : roster.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--on-surface-variant)' }}>
                    <Users size={34} color="rgba(0,0,0,0.18)" />
                    <p style={{ margin: '12px 0 0', fontSize: '0.9rem' }}>Aún no hay alumnas inscritas en esta clase.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {roster.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--surface-low, #f6f6f6)', borderRadius: '16px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg,#FF914D,#E07A9C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {a.avatar ? <img src={a.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontWeight: 800 }}>{a.name.charAt(0).toUpperCase()}</span>}
                        </div>
                        <span style={{ flex: 1, minWidth: 0, fontWeight: 700, color: 'var(--black)', fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                        {a.pendiente
                          ? <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b45309', background: 'rgba(255,145,77,0.16)', padding: '4px 9px', borderRadius: '20px', flexShrink: 0 }}>Por confirmar</span>
                          : a.checkedIn
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 800, color: '#1a9e5f', background: 'rgba(26,158,95,0.12)', padding: '4px 9px', borderRadius: '20px', flexShrink: 0 }}><Check size={13} /> Asistió</span>
                          : <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--on-surface-variant)', background: 'rgba(0,0,0,0.05)', padding: '4px 9px', borderRadius: '20px', flexShrink: 0 }}>Reservó</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Coach;
