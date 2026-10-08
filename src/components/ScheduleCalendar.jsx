import React, { useState } from 'react';
import { ChevronRight, Lock, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { resolveCatColor, categoryLabel } from '../lib/categories';
import { classDateTime, parseTimeStr } from '../hooks/useLocalNotifications';
import { toLocalDateStr } from '../lib/dates';

// ── Helpers de color: derivan el humo/pill/tarjeta del color elegido para la clase especial ──
const _hexRgb = (hex) => {
  const h = (hex || '').replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const int = parseInt(n || '0', 16) || 0;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
};
const _rgba = (hex, a) => { const { r, g, b } = _hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };
const _mixWhite = (hex, amt) => { const { r, g, b } = _hexRgb(hex); const m = (c) => Math.round(c + (255 - c) * amt); return `rgb(${m(r)},${m(g)},${m(b)})`; };
const _darken = (hex, amt) => { const { r, g, b } = _hexRgb(hex); const m = (c) => Math.round(c * (1 - amt)); return `rgb(${m(r)},${m(g)},${m(b)})`; };

// Leyenda de categorías presentes (barra glass bajo el calendario)
function CategoryLegendBar({ globalClasses }) {
  const cats = (() => {
    const map = new Map();
    (globalClasses || []).forEach(c => { if (c.category && !map.has(c.category)) map.set(c.category, { name: c.category, color: resolveCatColor(c.category, c.category_color) }); });
    return [...map.values()];
  })();
  if (!cats.length) return null;
  return (
    <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '10px 18px', padding: '14px 20px', borderRadius: '20px', background: 'var(--glass-bg, rgba(255,255,255,0.55))', border: '1px solid var(--glass-border, rgba(255,255,255,0.7))', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', boxShadow: '0 8px 28px rgba(0,0,0,0.06)' }}>
        {cats.map(cat => (
          <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '18px', height: '18px', borderRadius: '6px', background: cat.color, border: '1px solid rgba(0,0,0,0.12)' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--on-surface)' }}>{categoryLabel(cat.name)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScheduleCalendar({ globalClasses, coaches, badgeConfigs, myReservations, onReserve }) {
  const reservedIds = new Set((myReservations || []).map(r => r.classId));
  const waitlistIds = new Set((myReservations || []).filter(r => r.status === 'waitlist').map(r => r.classId));
  const todayStr = toLocalDateStr();
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const currentMonth = currentMonthDate.getMonth();
  const currentYear = currentMonthDate.getFullYear();
  const [calendarView, setCalendarView] = useState('month'); // 'month' | 'day'
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  const nextMonth = () => setCurrentMonthDate(new Date(currentYear, currentMonth + 1, 1));
  const prevMonth = () => setCurrentMonthDate(new Date(currentYear, currentMonth - 1, 1));
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Lunes = 0

  const getWeekDays = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);
    
    return Array.from({length: 7}, (_, i) => {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      return {
        dateStr: toLocalDateStr(current),
        dayNum: current.getDate(),
        dayName: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]
      };
    });
  };

  const getDayOfWeekFromDateStr = (dateStr) => {
    return new Date(dateStr + "T12:00:00").getDay();
  };

  // Minutos desde medianoche para ordenar por horario real. El campo `time` se
  // guarda en AM/PM ("7:00 AM" / "6:30 PM"), así que un sort de texto saldría mal;
  // parseTimeStr lo normaliza a 24h.
  const timeToMinutes = (t) => {
    const { hour, min } = parseTimeStr(t);
    return hour * 60 + min;
  };

  const getClassesForDate = (dateStr) => {
    if (!dateStr || !globalClasses) return [];
    const dayOfWeek = getDayOfWeekFromDateStr(dateStr);
    return globalClasses
      .filter(c => c.date === dateStr || (c.date === null && c.day === dayOfWeek))
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      {calendarView === 'month' ? (
        <motion.div key="month-view" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} transition={{duration:0.2}}>
          <div className="ios-glass-card" style={{ padding: '20px', background: 'var(--app-surface-solid)', margin: 0, borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <button onClick={prevMonth} style={{ background: 'var(--fill-subtle)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronRight size={20} color="var(--black)" style={{ transform: 'rotate(180deg)' }} />
              </button>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', margin: 0, textTransform: 'capitalize', color: 'var(--black)' }}>
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <button onClick={nextMonth} style={{ background: 'var(--fill-subtle)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronRight size={20} color="var(--black)" />
              </button>
            </div>

            {/* Días de la semana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '10px', textAlign: 'center' }}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <div key={i} style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{d}</div>
              ))}
            </div>

            {/* Cuadrícula de Días */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} style={{ aspectRatio: '1', borderRadius: '12px' }} />
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                const classesOnDay = getClassesForDate(dateStr);
                const hasClasses = classesOnDay.length > 0;
                const hasSpecial = classesOnDay.some(c => c.is_special);

                return (
                  <motion.button
                    className={hasClasses ? "tour-calendar-day" : ""}
                    key={dayNum}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setSelectedDateStr(dateStr);
                      setCalendarView('day');
                    }}
                    style={{
                      aspectRatio: '1', borderRadius: '12px', border: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative',
                      background: isToday ? 'var(--primary)' : (hasSpecial ? 'linear-gradient(135deg, rgba(255,145,77,0.16), rgba(224,122,156,0.16))' : (hasClasses ? 'rgba(0,0,0,0.03)' : 'transparent')),
                      boxShadow: hasSpecial && !isToday ? 'inset 0 0 0 1.5px rgba(224,122,156,0.55)' : 'none',
                      color: isToday ? 'white' : 'var(--black)',
                      fontWeight: isToday ? 800 : (hasClasses ? 700 : 500)
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>{dayNum}</span>
                    {hasClasses && (
                      <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '6px' }}>
                        {classesOnDay.slice(0, 3).map((c, idx) => (
                          <div key={idx} style={{ width: '4px', height: '4px', borderRadius: '50%', background: isToday ? 'white' : (c.is_special ? 'linear-gradient(135deg, #FF914D, #E07A9C)' : 'var(--primary)') }} />
                        ))}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div key="day-view" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} transition={{duration:0.2}} style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => setCalendarView('month')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', padding: 0 }}>
              <ChevronRight size={22} style={{ transform: 'rotate(180deg)' }} /> 
              {monthNames[new Date(selectedDateStr + "T12:00:00").getMonth()]}
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '25px', background: 'var(--app-surface-solid)', padding: '15px 10px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            {getWeekDays(selectedDateStr).map((d, i) => {
              const isSelected = d.dateStr === selectedDateStr;
              const classesOnDay = getClassesForDate(d.dateStr);
              const hasClasses = classesOnDay.length > 0;
              const hasSpecial = classesOnDay.some(c => c.is_special);

              return (
                <div 
                  className={hasClasses ? "tour-calendar-day" : ""}
                  key={i} 
                  onClick={() => setSelectedDateStr(d.dateStr)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{d.dayName}</span>
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '50%', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    color: isSelected ? 'white' : 'var(--black)',
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: '1.1rem'
                  }}>
                    {d.dayNum}
                  </div>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: hasClasses ? (isSelected ? 'white' : (hasSpecial ? 'linear-gradient(135deg, #FF914D, #E07A9C)' : 'var(--primary)')) : 'transparent', marginTop: '-2px' }} />
                </div>
              );
            })}
          </div>

          <h4 style={{ fontSize: '1.1rem', margin: '0 0 15px 0', color: 'var(--black)', fontFamily: 'var(--font-display)', textTransform: 'capitalize' }}>
            {new Date(selectedDateStr + "T12:00:00").toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {(() => {
              const classesToday = getClassesForDate(selectedDateStr);
              const now = new Date();
              return classesToday.length > 0 ? (
                classesToday.map(c => {
                  const dt = classDateTime(selectedDateStr, c.time);
                  const isPast = dt ? dt < now : false;
                  return (
                  <ClassItem
                    key={c.id}
                    classData={c}
                    full={(c.spots ?? 0) <= 0}
                    isPast={isPast}
                    isReserved={reservedIds.has(c.id)}
                    isWaitlisted={waitlistIds.has(c.id)}
                    onReserve={() => onReserve(c, selectedDateStr)}
                    coaches={coaches}
                    badgeConfigs={badgeConfigs}
                  />
                  );
                })
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.9rem', fontStyle: 'italic', background: 'var(--surface-low)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                  No hay clases programadas para este día.
                </div>
              );
            })()}
          </div>
        </motion.div>
      )}

      <CategoryLegendBar globalClasses={globalClasses} />
    </div>
  );
}

export function ClassItem({ classData, full, isPast, isReserved, isWaitlisted, onReserve, coaches, badgeConfigs }) {
  const { time, title, instructor, spots, category, category_color, coach_id, is_special, special_label, special_color } = classData;

  const bgColor = resolveCatColor(category, category_color);
  const specialText = (special_label && special_label.trim()) || 'Especial';
  // Color del resaltado especial (NULL/naranja = default cálido; otro = tinte derivado).
  const accent = special_color || '#FF914D';
  const smokeBg = (is_special && special_color) ? (a) => `radial-gradient(circle, ${_rgba(accent, a)} 0%, ${_rgba(accent, a * 0.4)} 52%, transparent 72%)` : null;
  const specialBg = special_color ? `linear-gradient(135deg, ${_mixWhite(accent, 0.90)} 0%, ${_mixWhite(accent, 0.94)} 100%)` : 'linear-gradient(135deg, #FFF4EC 0%, #FFEDE8 55%, #FCEBF0 100%)';
  const specialShadow = `0 14px 34px ${_rgba(accent, 0.22)}, 0 3px 10px rgba(0,0,0,0.04)`;
  const specialBorder = `1px solid ${_rgba(accent, 0.30)}`;
  const specialPill = special_color ? `linear-gradient(135deg, ${accent}, ${_darken(accent, 0.18)})` : 'linear-gradient(135deg, #FF914D, #E07A9C)';
  const disabled = full || isPast || isReserved; // no se puede (re)reservar
  // Las clases pasadas no se abren; las reservadas/llenas SÍ se pueden tocar
  // para ver el detalle (y las compañeras si ya estás inscrita).
  const tappable = !isPast;

  return (
    <motion.div
      className="tour-class-card"
      whileTap={tappable ? { scale: 0.98 } : undefined}
      onClick={() => { if (tappable && onReserve) onReserve(); }}
      style={{
        marginBottom: '16px', cursor: tappable ? 'pointer' : 'default'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', paddingLeft: '5px' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--black)', fontFamily: 'var(--font-display)' }}>{time}</span>
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)' }}></div>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>50 min</span>
      </div>

      <div style={{
        padding: '20px', display: 'flex', alignItems: 'center', gap: '20px',
        background: is_special ? specialBg : bgColor,
        boxShadow: is_special ? specialShadow : 'var(--card-shadow)',
        border: is_special ? specialBorder : '1px solid var(--border-subtle)',
        borderRadius: '28px', position: 'relative', overflow: 'hidden',
        opacity: isPast ? 0.5 : full ? 0.6 : 1, transition: 'all 0.3s ease'
      }}>
        {is_special && (
          <div aria-hidden="true" className="special-smoke-wrap">
            {/* humo en movimiento (glow viajero). Color: default naranja (CSS) o el elegido (inline). */}
            <div className="special-smoke special-smoke-a" style={smokeBg ? { background: smokeBg(0.72) } : undefined} />
            <div className="special-smoke special-smoke-b" style={smokeBg ? { background: smokeBg(0.60) } : undefined} />
            <div className="special-smoke special-smoke-c" style={smokeBg ? { background: smokeBg(0.50) } : undefined} />
          </div>
        )}
        <div style={{ position: 'relative', zIndex: 1, width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', background: '#FCF9F5', flexShrink: 0, border: '2px solid white', boxShadow: '0 5px 15px rgba(0,0,0,0.08)' }}>
           {(() => {
             // Foto SOLO de la coach real de esta clase (coach_id → nombre → email).
             // Sin fallbacks "adivinados": si no hay match o no tiene foto, se muestra
             // la inicial. (Antes había fallback a coaches[0] y a un badge global
             // COACH_PROFILE que ponía UNA misma foto en clases ajenas → la foto de una
             // cuenta demo salía en perfiles que no eran.)
             const coachInfo = (coaches || []).find(c => (coach_id && c.id === coach_id) || c.full_name === instructor || c.email === instructor);
             const photoUrl = coachInfo?.avatar_url;
             const displayInitial = (coachInfo?.full_name || instructor || 'C').charAt(0).toUpperCase();
             return photoUrl 
               ? <img src={photoUrl} alt={coachInfo?.full_name || instructor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>{displayInitial}</div>;
           })()}
        </div>
        
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          {is_special && (
            <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '999px', background: specialPill, color: '#fff', fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.13em', marginBottom: '9px', boxShadow: `0 4px 14px ${_rgba(accent, 0.42)}` }}>
              {specialText}
            </div>
          )}
          <h3 style={{ fontSize: is_special ? '1.22rem' : '1.15rem', color: '#2D2928', margin: '0 0 3px 0', fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1.18 }}>{title}</h3>
          {category && (
            <p style={{ margin: '0 0 4px 0', fontSize: '0.65rem', color: '#6F6157', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Entrenamiento de {category === 'Relajacion' ? 'Relajación' : category}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
             {(() => {
               const coachInfo = (coaches || []).find(c => (coach_id && c.id === coach_id) || c.full_name === instructor || c.email === instructor);
               const displayName = coachInfo?.full_name || instructor;
               return <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{displayName}</span>;
             })()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isPast ? '#8a7266' : isWaitlisted ? '#9AA0A6' : isReserved ? '#16A34A' : full ? '#FF4D4D' : '#22C55E' }}></div>
             <span style={{ fontSize: '0.75rem', color: isWaitlisted ? '#6b7280' : isReserved ? '#16A34A' : full && !isPast ? '#FF4D4D' : '#8a7266', fontWeight: 700 }}>
                {isPast ? 'Ya terminó' : isWaitlisted ? 'En lista de espera' : isReserved ? 'Ya reservada' : full ? 'Sin cupos · lista de espera' : `${Math.max(0, spots)} ${spots === 1 ? 'lugar disponible' : 'lugares disponibles'}`}
             </span>
          </div>
        </div>

        <div style={{
          position: 'relative', zIndex: 1,
          width: '40px', height: '40px', borderRadius: '15px',
          background: isReserved ? 'rgba(22,163,74,0.12)' : disabled ? 'rgba(0,0,0,0.03)' : 'rgba(255,139,66,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isReserved ? '#16A34A' : disabled ? '#8a7266' : 'var(--primary)'
        }}>
          {isPast ? <Lock size={17} /> : isReserved ? <Check size={20} /> : <ChevronRight size={20} />}
        </div>
      </div>
    </motion.div>
  );
}
