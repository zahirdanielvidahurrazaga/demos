import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import { Capacitor } from '@capacitor/core';
import { ESTUDIO } from '../config/estudio';

const isNative = () => Capacitor.isNativePlatform();

const STUDIO_LOCATION = `${ESTUDIO.nombre} — ${ESTUDIO.giro}`;
const CLASS_DURATION_MS = 60 * 60 * 1000; // 1 hora

export async function requestCalendarPermission() {
  if (!isNative()) return false;
  try {
    const { result } = await CapacitorCalendar.requestFullCalendarAccess();
    return result === 'granted';
  } catch (err) {
    console.error('Error pidiendo permisos de calendario:', err);
    return false;
  }
}

// Agrega la clase al calendario del dispositivo y devuelve el eventId
export async function addClassToCalendar(reservation, classDate) {
  if (!isNative()) return null;

  try {
    const granted = await requestCalendarPermission();
    if (!granted) return null;

    const startDate = buildStartDate(reservation, classDate);
    if (!startDate) return null;

    const endDate = new Date(startDate.getTime() + CLASS_DURATION_MS);

    const { id } = await CapacitorCalendar.createEvent({
      title: `${reservation.title} — ${ESTUDIO.nombre}`,
      location: STUDIO_LOCATION,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      isAllDay: false,
      notes: `Instructor: ${reservation.instructor || ESTUDIO.nombre}\nLleva calcetines antiderrapantes. Tu código QR está listo en la app.`,
      alerts: [-60], // alerta 60 min antes (en minutos — el plugin multiplica x60 internamente)
    });

    return id;
  } catch (err) {
    console.error('Error agregando al calendario:', err);
    return null;
  }
}

// Elimina el evento del calendario cuando se cancela una reserva
export async function removeClassFromCalendar(eventId) {
  if (!isNative() || !eventId) return;
  try {
    await CapacitorCalendar.deleteEventsById({ ids: [eventId] });
  } catch (err) {
    console.error('Error eliminando evento del calendario:', err);
  }
}

function buildStartDate(reservation, classDate) {
  if (!reservation?.time) return null;

  const date = classDate instanceof Date ? new Date(classDate) : new Date();
  const timeStr = reservation.time.trim();

  const [rawHour, rawMin] = timeStr.replace(/AM|PM/gi, '').trim().split(':');
  let hour = parseInt(rawHour, 10);
  const min = parseInt(rawMin || '0', 10);

  if (/PM/i.test(timeStr) && hour !== 12) hour += 12;
  if (/AM/i.test(timeStr) && hour === 12) hour = 0;

  date.setHours(hour, min, 0, 0);
  return date;
}
