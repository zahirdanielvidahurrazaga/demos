// ─────────────────────────────────────────────────────────────────────────────
// APP DE LA CLIENTA DE STUDIO ALMA — datos derivados.
//
// Todo sale de useAuth() (la misma sesión y funciones que usa Be Fit: clases,
// reservas, reservar, cancelar, lista de espera). Aquí solo se ordena y se
// calcula lo que muestran las pantallas; ninguna regla de negocio nueva.
// ─────────────────────────────────────────────────────────────────────────────

import { classDateTime, parseTimeStr, getNextClassOccurrence } from '../../hooks/useLocalNotifications';
import { toLocalDateStr } from '../../lib/dates';

export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const minutosDelDia = (t) => { const { hour, min } = parseTimeStr(t); return hour * 60 + min; };

// "7:00 AM" → "7:00"; la tarde se distingue con "pm" chiquito en la vista.
export function hora(t) {
  const { hour, min } = parseTimeStr(t);
  const h12 = hour % 12 || 12;
  return { texto: `${h12}:${String(min).padStart(2, '0')}`, sufijo: hour < 12 ? 'am' : 'pm' };
}

// Los próximos `n` días desde hoy, como los usa la tira de días.
export function proximosDias(n = 14) {
  const hoy = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
    return { fecha: toLocalDateStr(d), num: d.getDate(), dia: DIAS_CORTOS[d.getDay()], mes: MESES[d.getMonth()], i };
  });
}

// Igual que ScheduleCalendar: las clases con fecha de ese día, más las
// plantillas recurrentes (sin fecha) de ese día de la semana.
export function clasesDelDia(clases, fecha) {
  if (!clases || !fecha) return [];
  const dow = new Date(`${fecha}T12:00:00`).getDay();
  return clases
    .filter((c) => c.date === fecha || (c.date == null && c.day === dow))
    .sort((a, b) => minutosDelDia(a.time) - minutosDelDia(b.time));
}

export function inicioDeClase(c, fecha) {
  const f = fecha || c.date;
  if (f) return classDateTime(f, c.time);
  return c.day !== undefined && c.day !== null ? getNextClassOccurrence(c.day, c.time) : null;
}

// Reservas que aún no pasan, con su fecha resuelta (las recién hechas no traen
// fecha en la reserva: se toma de la clase).
export function reservasProximas(reservas, clases) {
  const ahora = Date.now();
  return (reservas || [])
    .map((r) => {
      const c = (clases || []).find((x) => x.id === r.classId);
      const fecha = r.date ?? c?.date ?? null;
      const inicio = fecha ? classDateTime(fecha, r.time ?? c?.time) : (c ? inicioDeClase(c) : null);
      return { ...r, clase: c, fecha, inicio };
    })
    .filter((r) => r.inicio && r.inicio.getTime() > ahora - 50 * 60000)
    .sort((a, b) => a.inicio - b.inicio);
}

export function cuandoTexto(inicio, ahora = Date.now()) {
  if (!inicio) return '';
  const min = Math.round((inicio.getTime() - ahora) / 60000);
  if (min <= 0) return 'empezando';
  if (min < 60) return `en ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `en ${h} h ${min % 60 ? `${min % 60} min` : ''}`.trim();
  const d = Math.round(h / 24);
  return d === 1 ? 'mañana' : `en ${d} días`;
}

export function diaTexto(inicio) {
  if (!inicio) return '';
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dia = new Date(inicio); dia.setHours(0, 0, 0, 0);
  const dif = Math.round((dia - hoy) / 86400000);
  if (dif === 0) return 'Hoy';
  if (dif === 1) return 'Mañana';
  return `${DIAS_CORTOS[inicio.getDay()]} ${inicio.getDate()} ${MESES[inicio.getMonth()]}`;
}

export function fechaLarga(f) {
  if (!f) return '';
  const d = new Date(f);
  return `${d.getDate()} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][d.getMonth()]}`;
}

export const coachDe = (c, coaches) => (coaches || []).find((x) => (c?.coach_id && x.id === c.coach_id) || x.full_name === c?.instructor) || null;
export const nombreCoach = (c, coaches) => coachDe(c, coaches)?.full_name?.split(' ')[0] || (c?.instructor || '').split(' ')[0] || 'Coach';

export const ilimitado = (n) => n >= 9000;

export const diasHasta = (f) => (f ? Math.max(0, Math.ceil((new Date(f) - Date.now()) / 86400000)) : null);

// Qué puede hacer la clienta con una clase, según su reserva y los lugares.
export function estadoDeClase(c, reservas, fecha) {
  const r = (reservas || []).find((x) => x.classId === c.id);
  const inicio = inicioDeClase(c, fecha);
  if (inicio && inicio.getTime() < Date.now()) return { tipo: 'paso', r };
  if (r?.status === 'offered') return { tipo: 'oferta', r };
  if (r?.status === 'waitlist') return { tipo: 'espera', r };
  if (r) return { tipo: 'mia', r };
  if ((c.spots ?? 0) <= 0) return { tipo: 'llena' };
  return { tipo: 'libre' };
}

export const MOTIVOS_CANCELAR = {
  too_late: 'Faltan menos de 5 horas: ya no se puede cancelar esta clase.',
  past: 'Esta clase ya pasó.',
  attended: 'Ya registraste tu asistencia a esta clase.',
  unknown_class: 'No encontramos la fecha de esta clase. Actualiza e intenta de nuevo.',
};

// La misma clase siempre con la misma foto (según su nombre).
export function fotoDeClase(c, fotos) {
  if (!fotos?.length) return null;
  const n = [...String(c?.title || '')].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return fotos[n % fotos.length];
}

// Evento de calendario (.ics) para la web: el iPhone lo abre en Calendario y
// Android en Google Calendar. En la app instalada se usa el calendario nativo.
export function descargarIcs({ titulo, inicio, minutos = 50, lugar = '', notas = '' }) {
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const fin = new Date(inicio.getTime() + minutos * 60000);
  const esc = (t) => String(t).replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KaiZen//Alma//ES', 'BEGIN:VEVENT',
    `UID:${f(inicio)}-${Math.random().toString(36).slice(2)}@alma`, `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(inicio)}`, `DTEND:${f(fin)}`, `SUMMARY:${esc(titulo)}`, `LOCATION:${esc(lugar)}`, `DESCRIPTION:${esc(notas)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT60M', 'ACTION:DISPLAY', 'DESCRIPTION:Tu clase es en 1 hora', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${titulo.replace(/[^\w\s-]/g, '').trim() || 'clase'}.ics`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
