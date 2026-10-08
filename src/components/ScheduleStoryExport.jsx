import React, { useRef, useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, X, CalendarRange, CalendarDays, Moon, Sun } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Capacitor } from '@capacitor/core';
import { todayLocalStr } from '../lib/dates';
import { ESTUDIO } from '../config/estudio';

// ─────────────────────────────────────────────────────────────────────────────
// Generador de "Horarios" para Instagram Stories (formato 1080×1920).
// Reutilizable en Coach y Admin. Comparte vía Web Share API (menú nativo en
// celular) con descarga de PNG como fallback en escritorio.
// ─────────────────────────────────────────────────────────────────────────────

const DOW_LABELS = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB']; // index = getDay()
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const hexToRgba = (hex, a) => {
  const h = (hex || '#ECECEC').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// Tokens de tema (oscuro / claro). Glass "falso" (sin backdrop-filter, para que se capture en el PNG).
const THEMES = {
  dark: {
    bg: 'linear-gradient(165deg, #16181A 0%, #2D2928 100%)', text: '#fff', dim: 'rgba(255,255,255,0.55)', accent: '#FF914D', logoInvert: true, glow: 0.22,
    glassBg: 'rgba(255,255,255,0.06)', glassBorder: 'rgba(255,255,255,0.16)', glassHi: 'inset 0 1.5px 0 rgba(255,255,255,0.14)',
    divider: 'rgba(255,255,255,0.16)', rowLine: 'rgba(255,255,255,0.08)',
    tintHi: 0.30, tintLo: 0.12, chipTitle: 'rgba(255,255,255,0.72)',
  },
  light: {
    bg: 'linear-gradient(165deg, #FFF7F1 0%, #FDF1EA 100%)', text: '#1A1C1E', dim: 'rgba(0,0,0,0.45)', accent: '#E07A2B', logoInvert: false, glow: 0.16,
    glassBg: 'rgba(255,255,255,0.45)', glassBorder: 'rgba(255,255,255,0.9)', glassHi: 'inset 0 1.5px 0 rgba(255,255,255,0.8)',
    divider: 'rgba(0,0,0,0.13)', rowLine: 'rgba(0,0,0,0.06)',
    tintHi: 0.6, tintLo: 0.32, chipTitle: '#9A5B3E',
  },
};

// Avatar circular del coach (usa dataURL precargado o iniciales como respaldo)
const Avatar = ({ url, name, size, ring }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, #FF914D, #E07A9C)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${ring}` }}>
    {url
      ? <img src={url} crossOrigin="anonymous" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      : <span style={{ color: '#fff', fontWeight: 800, fontSize: size * 0.42, fontFamily: 'var(--font-display)' }}>{(name || '?').trim().charAt(0).toUpperCase()}</span>}
  </div>
);

const parseTime = (t) => {
  const m = (t || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = +m[1]; const min = +m[2]; const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
};

function buildWeek(classes, refDateStr) {
  const ref = new Date(refDateStr + 'T12:00:00');
  const offset = ref.getDay() === 0 ? 6 : ref.getDay() - 1; // semana inicia lunes
  const monday = new Date(ref); monday.setDate(ref.getDate() - offset);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const jsDow = d.getDay();
    const dayClasses = (classes || [])
      .filter(c => c.date === dateStr || (c.date == null && c.day === jsDow))
      .sort((a, b) => parseTime(a.time) - parseTime(b.time));
    return { dateStr, jsDow, label: DOW_LABELS[jsDow], dayNum: d.getDate(), classes: dayClasses };
  });
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  return { monday, sunday, days };
}

// Acota un texto a N líneas (evita que una celda crezca de más cuando la fila
// es corta). Compatible con la captura PNG (html-to-image respeta line-clamp).
const clampLines = (n) => ({ display: '-webkit-box', WebkitLineClamp: n, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere', wordBreak: 'break-word' });

// Estilo limpio (sin recuadro): puro texto sobre el fondo. La clase es la
// protagonista (grande, color de texto); la coach va pequeña en color de marca.
const ClassCell = ({ c, T }) => {
  if (!c) return <span style={{ color: T?.dim || 'rgba(128,128,128,0.4)', fontSize: 34, fontWeight: 700 }}>–</span>;
  return (
    <div style={{ width: '100%', minWidth: 0, padding: '2px 6px', textAlign: 'center', lineHeight: 1.0 }}>
      <div style={{ fontSize: 27, fontWeight: 900, color: T.text, fontFamily: 'var(--font-display)', ...clampLines(3) }}>{c.title}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 4, ...clampLines(2) }}>{c.instructor}</div>
    </div>
  );
};

// ── La tarjeta (1080×1920) que se captura ──────────────────────────────────
const StoryCard = React.forwardRef(({ mode, week, dayData, rangeLabel, theme = 'dark', avatarFor }, ref) => {
  const T = THEMES[theme] || THEMES.dark;

  // Ajuste a alto: si el horario es muy largo, se escala para que SIEMPRE quepa
  // completo en la "zona segura" de la historia (sin recortes arriba/abajo).
  const fitBoxRef = useRef(null);
  const fitWrapRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      const box = fitBoxRef.current, wrap = fitWrapRef.current;
      if (cancelled || !box || !wrap) return;
      // scrollHeight/clientHeight NO se ven afectados por el transform → medida estable
      const natural = wrap.scrollHeight;
      const avail = box.clientHeight;
      setFitScale(avail && natural > avail ? avail / natural : 1);
    };
    measure();
    // re-medir cuando las fuentes terminen de cargar (afectan el alto del texto)
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => { requestAnimationFrame(measure); });
    }
    return () => { cancelled = true; };
  }, [mode, week, dayData, theme]);
  // Una sola grilla con todos los días: Lun-Vie siempre; Sáb/Dom solo si tienen
  // clases (así el sábado va junto al viernes y no como bloque aparte).
  const shownDays = week.days.filter((d, i) => i < 5 || d.classes.length > 0);
  const allTimes = [...new Set(shownDays.flatMap(d => d.classes.map(c => c.time)))]
    .sort((a, b) => parseTime(a) - parseTime(b));

  const DayHeader = (d, i) => (
    <div key={d.dateStr} style={{
      textAlign: 'center', paddingBottom: 16, alignSelf: 'center',
      borderLeft: i > 0 ? `2px solid ${T.divider}` : 'none'
    }}>
      <div style={{ fontSize: 32, fontWeight: 900, color: T.accent, letterSpacing: '0.06em' }}>{d.label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: T.dim }}>{d.dayNum}</div>
    </div>
  );

  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: T.bg,
      // Padding superior/inferior amplio = "zona segura" de Instagram (no tapa logo ni título)
      padding: '78px 40px 94px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column'
    }}>
      {/* Glow de marca */}
      <div style={{ position: 'absolute', top: -200, right: -150, width: 700, height: 700, background: `radial-gradient(circle, rgba(255,145,77,${T.glow}) 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -250, left: -150, width: 650, height: 650, background: `radial-gradient(circle, rgba(224,122,156,${T.glow * 0.7}) 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ position: 'relative', textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 88, fontWeight: 900, color: T.text, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 0.9 }}>HORARIOS</div>
        <div style={{ fontSize: 31, fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 9 }}>{rangeLabel}</div>
      </div>

      {/* Contenido */}
      <div ref={fitBoxRef} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        <div ref={fitWrapRef} style={{ width: '100%', transform: `scale(${fitScale})`, transformOrigin: 'top center' }}>
        {mode === 'day' ? (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
            {dayData.classes.length > 0 ? dayData.classes.map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 28, padding: '20px 6px',
                borderTop: i > 0 ? `1.5px solid ${T.rowLine}` : 'none'
              }}>
                <div style={{ minWidth: 170, fontSize: 46, fontWeight: 900, color: T.text, fontFamily: 'var(--font-display)' }}>{c.time}</div>
                <Avatar url={avatarFor?.(c)} name={c.instructor} size={84} ring={T.accent} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 44, fontWeight: 900, color: T.text, fontFamily: 'var(--font-display)', ...clampLines(2) }}>{c.title}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4, ...clampLines(1) }}>{c.instructor}</div>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: 80, fontSize: 34, color: T.dim }}>No hay clases programadas este día.</div>
            )}
          </div>
        ) : (
          // UNA sola grilla con todos los días (Sáb junto al Vie). Filas de alto
          // natural (no se encinan los textos); el ajuste-a-alto encoge solo si
          // se pasa del marco.
          <div style={{
            display: 'grid',
            gridTemplateColumns: `132px repeat(${shownDays.length}, minmax(0, 1fr))`,
            columnGap: 8, rowGap: 8, alignItems: 'center'
          }}>
            <div />
            {shownDays.map(DayHeader)}
            {allTimes.map((time) => (
              <React.Fragment key={time}>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 900, color: T.text, fontFamily: 'var(--font-display)' }}>{time}</div>
                {shownDays.map(d => (
                  <div key={d.dateStr + time} style={{ display: 'flex', minWidth: 0, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <ClassCell c={d.classes.find(c => c.time === time)} T={T} />
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Footer con logo grande */}
      <div style={{ position: 'relative', textAlign: 'center', marginTop: 16 }}>
        <img src={ESTUDIO.marca.logo} alt="" crossOrigin="anonymous" style={{ height: 104, objectFit: 'contain', filter: T.logoInvert ? 'brightness(0) invert(1)' : 'none' }} />
        <div style={{ fontSize: 26, fontWeight: 700, color: T.accent, marginTop: 2 }}>{ESTUDIO.contacto.instagram}</div>
      </div>
    </div>
  );
});

export default function ScheduleStoryExport({ classes, coaches, selectedDateStr, buttonStyle, buttonLabel = 'Compartir horarios' }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('week'); // 'week' | 'day'
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [busy, setBusy] = useState(false);
  const cardRef = useRef(null);
  // Ancho del preview (la tarjeta real es 1080px; aquí se escala para caber en el sheet)
  const PREVIEW_W = Math.min(300, (typeof window !== 'undefined' ? window.innerWidth : 360) - 56);

  // Fecha de referencia seleccionable (en día = ese día; en semana = la semana que la contiene)
  const [refDate, setRefDate] = useState(selectedDateStr || todayLocalStr());
  const week = useMemo(() => buildWeek(classes, refDate), [classes, refDate]);
  const dayData = useMemo(() => week.days.find(d => d.dateStr === refDate) || week.days[0], [week, refDate]);

  // Mapa de coaches por id y por nombre, para resolver la foto de cada clase
  const coachById = useMemo(() => Object.fromEntries((coaches || []).map(co => [co.id, co])), [coaches]);
  const coachByName = useMemo(() => {
    const m = {};
    (coaches || []).forEach(co => { if (co.full_name) m[co.full_name.trim().toLowerCase()] = co; });
    return m;
  }, [coaches]);

  const getCoach = (c) => {
    if (!c) return null;
    if (c.coach_id && coachById[c.coach_id]) return coachById[c.coach_id];
    const inst = (c.instructor || '').trim().toLowerCase();
    if (!inst) return null;
    if (coachByName[inst]) return coachByName[inst];
    // coincidencia por primer nombre (ej. "ELENA R." ↔ "Elena Rodríguez")
    return (coaches || []).find(co => {
      const fn = (co.full_name || '').trim().toLowerCase();
      if (!fn) return false;
      const first = fn.split(' ')[0];
      return inst.includes(first) || fn.includes(inst.split(' ')[0]);
    }) || null;
  };

  // Precarga de fotos de coaches a dataURL (evita problemas de CORS al capturar el PNG)
  const [avatarData, setAvatarData] = useState({});
  useEffect(() => {
    if (!open || !coaches?.length) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all((coaches || []).filter(co => co.avatar_url).map(async co => {
        try {
          const res = await fetch(co.avatar_url, { mode: 'cors' });
          const blob = await res.blob();
          const dataUrl = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onloadend = () => resolve(fr.result);
            fr.onerror = reject;
            fr.readAsDataURL(blob);
          });
          return [co.id, dataUrl];
        } catch { return null; }
      }));
      if (!cancelled) setAvatarData(Object.fromEntries(entries.filter(Boolean)));
    })();
    return () => { cancelled = true; };
  }, [open, coaches]);

  // dataURL precargado (mejor para exportar) o, si no, la URL directa (siempre se ve en el preview)
  const avatarFor = (c) => { const co = getCoach(c); if (!co) return null; return avatarData[co.id] || co.avatar_url || null; };

  const rangeLabel = useMemo(() => {
    if (mode === 'day') {
      const d = new Date(refDate + 'T12:00:00');
      return `${DOW_LABELS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`.toUpperCase();
    }
    const m = week.monday, s = week.sunday;
    return m.getMonth() === s.getMonth()
      ? `DEL ${m.getDate()} AL ${s.getDate()} DE ${MONTHS[m.getMonth()]}`.toUpperCase()
      : `DEL ${m.getDate()} ${MONTHS[m.getMonth()].slice(0, 3)} AL ${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)}`.toUpperCase();
  }, [mode, refDate, week]);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 1, width: 1080, height: 1920 });
      const filename = `horarios-befitlab-${refDate}.png`;

      // ── App nativa (iOS/Android): escribir el PNG y abrir el share sheet del sistema ──
      if (Capacitor.isNativePlatform()) {
        try {
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const { Share } = await import('@capacitor/share');
          const base64 = dataUrl.split(',')[1];
          await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
          const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
          await Share.share({ title: `Horarios ${ESTUDIO.nombre}`, text: 'Horarios de la semana', files: [uri] });
          setBusy(false);
          return;
        } catch (e) {
          if (e?.message?.toLowerCase?.().includes('cancel')) { setBusy(false); return; }
          // si algo falla en nativo, caemos al flujo web de abajo
        }
      }

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: 'image/png' });

      // Menú nativo de compartir del navegador (celular/PWA) si lo soporta
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Horarios ${ESTUDIO.nombre}` });
          setBusy(false);
          return;
        } catch (e) {
          if (e?.name === 'AbortError') { setBusy(false); return; }
        }
      }
      // Fallback: descarga
      const a = document.createElement('a');
      a.href = dataUrl; a.download = filename; a.click();
    } catch (e) {
      alert('No se pudo generar la imagen: ' + (e?.message || e));
    }
    setBusy(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} style={buttonStyle || { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 10px 24px rgba(255,145,77,0.35)', fontFamily: 'var(--font-body)' }}>
        <Share2 size={18} /> {buttonLabel}
      </button>

      {open && createPortal(
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 6001, maxHeight: '92vh', background: 'var(--app-surface-solid, #fff)', borderTopLeftRadius: 28, borderTopRightRadius: 28, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* header del sheet */}
            <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.06))', flexShrink: 0 }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}>Compartir horarios</span>
              <button onClick={() => setOpen(false)} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} color="var(--on-surface)" /></button>
            </div>

            {/* toggle semana / día */}
            <div style={{ display: 'flex', gap: 8, padding: '14px 20px 6px', flexShrink: 0 }}>
              {[{ k: 'week', l: 'Semana', I: CalendarRange }, { k: 'day', l: 'Solo el día', I: CalendarDays }].map(({ k, l, I }) => (
                <button key={k} onClick={() => setMode(k)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', background: mode === k ? 'var(--primary)' : 'rgba(0,0,0,0.05)', color: mode === k ? '#fff' : 'var(--on-surface-variant)' }}>
                  <I size={16} /> {l}
                </button>
              ))}
            </div>

            {/* toggle claro / oscuro */}
            <div style={{ display: 'flex', gap: 8, padding: '0 20px 6px', flexShrink: 0 }}>
              {[{ k: 'dark', l: 'Oscuro', I: Moon }, { k: 'light', l: 'Claro', I: Sun }].map(({ k, l, I }) => (
                <button key={k} onClick={() => setTheme(k)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', background: theme === k ? 'var(--primary)' : 'rgba(0,0,0,0.05)', color: theme === k ? '#fff' : 'var(--on-surface-variant)' }}>
                  <I size={16} /> {l}
                </button>
              ))}
            </div>

            {/* selector de fecha */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 10px', flexShrink: 0 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>
                {mode === 'day' ? 'Día a publicar:' : 'Semana de:'}
              </span>
              <input type="date" value={refDate} onChange={(e) => e.target.value && setRefDate(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border-subtle, rgba(0,0,0,0.12))', background: 'var(--surface-low, #f4f4f5)', color: 'var(--on-surface)', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-body)', WebkitAppearance: 'none', outline: 'none' }} />
            </div>

            {/* preview (escalado dentro de una caja de tamaño fijo) */}
            <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
              <div style={{ width: PREVIEW_W, height: PREVIEW_W * (1920 / 1080), flexShrink: 0, position: 'relative', overflow: 'hidden', borderRadius: 18, boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1920, transform: `scale(${PREVIEW_W / 1080})`, transformOrigin: 'top left' }}>
                  <StoryCard ref={cardRef} mode={mode} week={week} dayData={dayData} rangeLabel={rangeLabel} theme={theme} avatarFor={avatarFor} />
                </div>
              </div>
            </div>

            {/* acción */}
            <div style={{ padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', flexShrink: 0, borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
              <button onClick={handleShare} disabled={busy} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px', borderRadius: 16, border: 'none', background: busy ? 'rgba(255,145,77,0.5)' : 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: busy ? 'default' : 'pointer', boxShadow: '0 10px 24px rgba(255,145,77,0.35)' }}>
                {busy ? 'Generando…' : <><Share2 size={18} /> Compartir / Descargar</>}
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--on-surface-variant)', margin: '10px 0 0' }}>En el celular se abre el menú para compartir directo a Instagram. En computadora se descarga la imagen.</p>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
