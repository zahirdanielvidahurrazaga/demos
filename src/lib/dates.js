// Fecha LOCAL en formato 'YYYY-MM-DD'.
//
// Por qué existe: `new Date().toISOString().split('T')[0]` devuelve la fecha en
// UTC. En zonas con offset negativo (México = UTC-6), de tarde/noche el UTC ya
// es el día siguiente → el calendario marcaba "mañana" como hoy (p. ej. viernes
// por la noche se veía como sábado). Esto siempre usa la fecha del dispositivo.
export function toLocalDateStr(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayLocalStr = () => toLocalDateStr(new Date());

// ── Zona horaria FIJA de México (Puebla, UTC-6, sin horario de verano) ──────
// El check-in de recepción usa estas para NO depender de la zona horaria ni del
// idioma configurados en la compu que escanea. Solo asume que la HORA (epoch)
// del equipo es correcta (la sincroniza el sistema por internet), no su zona.

// Fecha de HOY interpretada en México, sin importar la zona del dispositivo.
export const mexicoTodayStr = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

// Instante de inicio de una clase ('YYYY-MM-DD' + 'H:MM AM/PM') fijado a México
// (UTC-6). Robusto a la zona horaria del dispositivo. Devuelve null si no parsea.
export function mexicoClassStart(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(timeStr);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  const hh = String(h).padStart(2, '0');
  const mm = String(min).padStart(2, '0');
  const d = new Date(`${dateStr}T${hh}:${mm}:00-06:00`);
  return isNaN(d.getTime()) ? null : d;
}
