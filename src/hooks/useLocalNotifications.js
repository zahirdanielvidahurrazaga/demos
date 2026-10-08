import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { ESTUDIO } from '../config/estudio';

const isNative = () => Capacitor.isNativePlatform();

export async function requestNotificationPermission() {
  if (!isNative()) return false;
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

// Calcula la próxima fecha concreta en que ocurre una clase
// Parsea "07:00" / "7:00 AM" / "7 PM" → { hour, min } en formato 24h.
export function parseTimeStr(timeStr) {
  const [rawHour, rawMin] = String(timeStr || '').replace(/AM|PM/gi, '').trim().split(':');
  let hour = parseInt(rawHour, 10) || 0;
  const min = parseInt(rawMin || '0', 10) || 0;
  if (/PM/i.test(timeStr) && hour !== 12) hour += 12;
  if (/AM/i.test(timeStr) && hour === 12) hour = 0;
  return { hour, min };
}

// Fecha+hora concreta de una clase en una fecha dada ('YYYY-MM-DD' + timeStr).
export function classDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const { hour, min } = parseTimeStr(timeStr);
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(hour, min, 0, 0);
  return d;
}

export function getNextClassOccurrence(dayOfWeek, timeStr) {
  const now = new Date();

  const { hour, min } = parseTimeStr(timeStr);

  const candidate = new Date(now);
  const daysUntil = (dayOfWeek - now.getDay() + 7) % 7;
  candidate.setDate(now.getDate() + daysUntil);
  candidate.setHours(hour, min, 0, 0);

  // Si el resultado ya pasó, saltar a la semana siguiente
  if (candidate <= now) candidate.setDate(candidate.getDate() + 7);

  return candidate;
}

// Recordatorio 1 hora antes de la clase
export async function scheduleClassReminder(reservation, dayOfWeek) {
  if (!isNative()) return;

  const savedPref = localStorage.getItem('befit_notifications');
  if (savedPref === 'false') return;

  try {
    // Preferir getNextClassOccurrence cuando tenemos el día de semana
    const classDate = (dayOfWeek !== undefined && reservation?.time)
      ? getNextClassOccurrence(dayOfWeek, reservation.time)
      : buildClassDate(reservation);
    if (!classDate) return;

    const reminderTime = new Date(classDate.getTime() - 60 * 60 * 1000);
    if (reminderTime <= new Date()) return;

    await LocalNotifications.schedule({
      notifications: [{
        id: buildNotificationId(reservation.classId),
        title: 'Tu clase es en 1 hora',
        body: `${reservation.title} con ${reservation.instructor || ESTUDIO.nombre} — ¡Prepárate!`,
        schedule: { at: reminderTime, allowWhileIdle: true },
        sound: 'default',
        iconColor: '#FF8B42',
        extra: { classId: reservation.classId },
      }],
    });
  } catch (err) {
    console.error('Error programando recordatorio:', err);
  }
}

// Notificación 5 horas antes — última oportunidad de cancelar
export async function scheduleCancelDeadlineReminder(reservation, dayOfWeek) {
  if (!isNative()) return;

  const savedPref = localStorage.getItem('befit_notifications');
  if (savedPref === 'false') return;

  try {
    if (dayOfWeek === undefined || !reservation?.time) return;

    const classDate = getNextClassOccurrence(dayOfWeek, reservation.time);
    const deadlineTime = new Date(classDate.getTime() - 5 * 60 * 60 * 1000);
    if (deadlineTime <= new Date()) return;

    await LocalNotifications.schedule({
      notifications: [{
        id: buildCancelDeadlineId(reservation.classId),
        title: '⏰ Última oportunidad para cancelar',
        body: `Tu clase de ${reservation.title} empieza en 5 horas. Después ya no podrás cancelar.`,
        schedule: { at: deadlineTime, allowWhileIdle: true },
        sound: 'default',
        iconColor: '#FF8B42',
        extra: { classId: reservation.classId },
      }],
    });
  } catch (err) {
    console.error('Error programando recordatorio de cancelación:', err);
  }
}

// Cancela ambos recordatorios al cancelar la reserva
export async function cancelClassReminder(classId) {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [
        { id: buildNotificationId(classId) },
        { id: buildCancelDeadlineId(classId) },
      ],
    });
  } catch (err) {
    console.error('Error cancelando recordatorio:', err);
  }
}

// Notificación inmediata de confirmación de reserva
export async function notifyReservationConfirmed(reservation) {
  if (!isNative()) return;

  const savedPref = localStorage.getItem('befit_notifications');
  if (savedPref === 'false') return;

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: buildNotificationId(reservation.classId + '_confirm'),
        title: '¡Clase reservada!',
        body: `${reservation.title} confirmada. Te avisamos 1 hora antes y cuando ya no puedas cancelar.`,
        schedule: { at: new Date(Date.now() + 500) },
        sound: 'default',
        iconColor: '#FF8B42',
      }],
    });
  } catch (err) {
    console.error('Error enviando notificación de confirmación:', err);
  }
}

// ───────── Recordatorio de fotos de progreso (cada 6 semanas) ─────────
// ID fijo: reprogramar siempre reemplaza el anterior (no se acumulan).
const PROGRESS_PHOTO_REMINDER_ID = 1900000001;
const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000;

// Programa (o reprograma) el aviso a las 6 semanas desde `fromTime`.
// Se llama al guardar una sesión de fotos y al cargar (idempotente por el ID fijo).
export async function scheduleProgressPhotoReminder(fromTime = Date.now()) {
  if (!isNative()) return;

  const savedPref = localStorage.getItem('befit_notifications');
  if (savedPref === 'false') return;

  try {
    const at = new Date(fromTime + SIX_WEEKS_MS);
    if (at <= new Date()) return; // ya vencido → no agendar en el pasado

    await LocalNotifications.schedule({
      notifications: [{
        id: PROGRESS_PHOTO_REMINDER_ID,
        title: '📸 ¡Hora de tus fotos de progreso!',
        body: 'Han pasado 6 semanas. Toma tus 3 fotos (frente y perfiles) y mira cuánto has avanzado 💪',
        schedule: { at, allowWhileIdle: true },
        sound: 'default',
        iconColor: '#FF8B42',
        extra: { kind: 'progress_photo_reminder' },
      }],
    });
  } catch (err) {
    console.error('Error programando recordatorio de fotos:', err);
  }
}

export async function cancelProgressPhotoReminder() {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: PROGRESS_PHOTO_REMINDER_ID }] });
  } catch (err) {
    console.error('Error cancelando recordatorio de fotos:', err);
  }
}

function buildClassDate(reservation) {
  if (!reservation?.time) return null;

  const timeStr = reservation.time.trim();
  const now = new Date();
  const date = new Date(now);

  if (reservation.date) {
    date.setTime(new Date(reservation.date).getTime());
  }

  const [rawHour, rawMin] = timeStr.replace(/AM|PM/gi, '').trim().split(':');
  let hour = parseInt(rawHour, 10);
  const min = parseInt(rawMin || '0', 10);

  if (/PM/i.test(timeStr) && hour !== 12) hour += 12;
  if (/AM/i.test(timeStr) && hour === 12) hour = 0;

  date.setHours(hour, min, 0, 0);
  return date;
}

function buildNotificationId(classId) {
  let hash = 0;
  for (let i = 0; i < classId.length; i++) {
    hash = (hash << 5) - hash + classId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

// ID distinto al de 1h para evitar colisión
function buildCancelDeadlineId(classId) {
  return (buildNotificationId(classId) + 1073741823) % 2147483647;
}

export function useLocalNotifications() {
  useEffect(() => {
    if (!isNative()) return;

    requestNotificationPermission();

    const listener = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    });

    return () => listener.then(l => l.remove());
  }, []);
}
