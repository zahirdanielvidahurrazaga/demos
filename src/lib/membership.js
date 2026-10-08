// Helpers de vigencia de membresía (fecha de pago / vencimiento).
// Regla del negocio: todos los planes vencen 1 mes después del pago.
// El sellado de fechas es automático (al activar/renovar); estos helpers solo
// formatean y comparan para mostrar/bloquear en la UI. El bloqueo REAL al
// reservar vive en el RPC `book_class_secure` (server-side).

// ¿La membresía está vencida? NULL = sin fecha sellada → NO se considera
// vencida (por seguridad: nadie sin fecha queda bloqueado de golpe).
export function isPlanExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

// Días que faltan para vencer (negativo si ya venció, null si no hay fecha).
export function daysUntilExpiry(expiresAt) {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

// "24 de junio de 2026" (formato corto opcional → "24 jun 2026").
export function formatPlanDate(d, short = false) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: short ? 'short' : 'long',
    year: 'numeric',
  });
}
