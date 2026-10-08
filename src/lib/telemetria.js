// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO DE INTENTOS FRENADOS (reservar / cancelar)
//
// La app detiene una reserva en varios puntos SIN llamar al servidor (sin
// saldo, membresía vencida, clase ya pasada) y, cuando sí llama, la petición
// puede morir en la red o ser rechazada. Nada de eso dejaba rastro: el
// 4-sep-2026 cuatro clientas reportaron "no me deja reservar" y desde el
// servidor solo se vio que su app no mandó nada. Aquí se guarda el motivo con
// lo que la app creía en ese momento (saldo, vencimiento, versión).
//
// Sin red no se pierde: se encola en localStorage y se manda al siguiente
// arranque (fetchUserData llama a vaciarColaIntentos). Solo se envían las
// filas de la cuenta activa; las de otra cuenta se descartan (RLS las
// rechazaría de todos modos).
// ─────────────────────────────────────────────────────────────────────────────
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { supabase } from './supabase';

const COLA = 'befit_intentos_pendientes';
const MAX_COLA = 30;
let etiqueta = null;

async function etiquetaApp() {
  if (etiqueta) return etiqueta;
  try {
    if (Capacitor.isNativePlatform()) {
      const info = await CapApp.getInfo();
      etiqueta = `${Capacitor.getPlatform()} ${info?.version || ''}`.trim();
    } else {
      etiqueta = 'web';
    }
  } catch {
    etiqueta = Capacitor.getPlatform();
  }
  return etiqueta;
}

function leerCola() {
  try { return JSON.parse(localStorage.getItem(COLA) || '[]'); } catch { return []; }
}
function guardarCola(items) {
  try { localStorage.setItem(COLA, JSON.stringify(items.slice(-MAX_COLA))); } catch { /* sin storage */ }
}

// ¿La petición no llegó (red) o el servidor sí contestó y la rechazó?
// postgrest-js NO lanza en fallas de red: devuelve { error } con code vacío y
// message tipo "TypeError: Failed to fetch" (Chrome) / "Load failed" (Safari).
export function esErrorDeRed(err) {
  if (!err) return false;
  if (err.code) return false; // PGRST…, P0001, 42501… = el servidor contestó
  const m = String(err.message || err).toLowerCase();
  return /failed to fetch|load failed|network|connection|timed? ?out|aborted/.test(m);
}

export async function registrarIntentoBloqueado({ userId, accion, motivo, classId = null, detalle = null, saldoApp = null, venceApp = null }) {
  if (!userId || !accion || !motivo) return;
  const fila = {
    user_id: userId,
    accion,
    motivo,
    class_id: classId || null,
    detalle: detalle ? String(detalle).slice(0, 300) : null,
    app: await etiquetaApp(),
    saldo_app: Number.isFinite(saldoApp) ? saldoApp : null,
    vence_app: venceApp || null,
    ocurrio_en: new Date().toISOString(),
  };
  const cola = leerCola();
  cola.push(fila);
  guardarCola(cola);
  await vaciarColaIntentos(userId);
}

export async function vaciarColaIntentos(userId) {
  const cola = leerCola();
  if (!cola.length) return;
  const mias = userId ? cola.filter(f => f.user_id === userId) : [];
  if (!mias.length) { guardarCola([]); return; }
  try {
    const { error } = await supabase.from('intentos_bloqueados').insert(mias);
    if (error && esErrorDeRed(error)) return; // sin red: se queda para la próxima
    // Con respuesta del servidor (bien o rechazo) se vacía: reintentar un
    // rechazo no lo arregla.
    guardarCola([]);
    if (error) console.warn('intentos_bloqueados:', error.message);
  } catch {
    // Sin red o storage raro: se queda en cola.
  }
}
