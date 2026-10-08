import { createClient, processLock } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { App as CapApp } from '@capacitor/app'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validación estricta para evitar que la App se ponga en blanco si olvidaron poner la URL real
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('http');
const finalUrl = isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co';
const finalKey = supabaseAnonKey && supabaseAnonKey.length > 20 ? supabaseAnonKey : 'placeholder';

if (!isValidUrl) {
  console.warn("⚠️ Las variables de Supabase están vacías o son inválidas. Usando MODO SEGURO (Offline).")
}

const isNative = Capacitor.isNativePlatform();

// En app nativa, los tokens de sesión se guardan con @capacitor/preferences
// (almacenamiento NATIVO persistente). El localStorage del WebView puede ser
// purgado por iOS/Android al cerrar la app, lo que cerraba la sesión al reabrir.
// getItem migra automáticamente la sesión de usuarios que vienen de la versión
// anterior (que guardaba en localStorage), para que NO tengan que volver a entrar.
const nativeStorage = {
  getItem: async (key) => {
    const { value } = await Preferences.get({ key });
    if (value !== null && value !== undefined) return value;
    const legacy = window.localStorage.getItem(key);
    if (legacy != null) {
      await Preferences.set({ key, value: legacy });
      return legacy;
    }
    return null;
  },
  // Doble escritura: Preferences (fuente de verdad) + localStorage (respaldo).
  // Con la rotación de refresh tokens, un respaldo DESACTUALIZADO es peor que
  // ninguno: si Preferences se pierde y el fallback devuelve un token viejo,
  // Supabase lo rechaza ("Refresh Token Not Found") y cierra la sesión. Al
  // escribir ambos en cada rotación, el respaldo siempre tiene el token vigente.
  setItem: async (key, value) => {
    await Preferences.set({ key, value });
    try { window.localStorage.setItem(key, value); } catch (e) {}
  },
  removeItem: async (key) => {
    await Preferences.remove({ key });
    try { window.localStorage.removeItem(key); } catch (e) {}
  },
};

// En el WebView nativo, el Web Locks API (navigator.locks) por defecto de
// supabase-js se colgaba (getSession tomaba el lock y no lo soltaba → login
// atascado en "Validando..."). Antes se usó un lock NO-OP, pero ese NO serializa
// las operaciones de auth: con la ROTACIÓN de refresh token activada, varias
// renovaciones simultáneas (timer de auto-refresh + getSession al volver del
// fondo + onAuthStateChange) usaban el MISMO refresh token → una lo rota y la
// otra queda inválida → "Invalid/Already Used Refresh Token" → SIGNED_OUT →
// se cerraba la sesión sola. `processLock` es el lock EN MEMORIA que Supabase
// recomienda para móvil: serializa las operaciones en una cola de promesas
// (sin navigator.locks, así no se cuelga). En web mantenemos el lock por defecto.
// Despliegue de maquetas (--mode demos): cada pestaña lleva SU sesión. Con
// localStorage compartido, abrir "clienta" en una pestaña y "barra" en otra
// hacía que cada una volviera a entrar con su cuenta al cambiar la otra, en
// ciclo. La llave única también aísla el BroadcastChannel de supabase-js, que
// se nombra igual que la llave.
// La sesión vive SOLO en memoria y la llave es nueva en cada carga: guardarla
// en sessionStorage no basta, porque "duplicar pestaña" copia sessionStorage y
// las dos pestañas volvían a compartir canal. Recargar no cuesta nada: la
// maqueta entra sola con la cuenta del rol. En el build de Be Fit esto no se compila.
const esDemos = import.meta.env.VITE_DEMOS === 'true';
const memoriaDemo = new Map();
const almacenDemo = {
  getItem: (k) => memoriaDemo.get(k) ?? null,
  setItem: (k, v) => { memoriaDemo.set(k, v); },
  removeItem: (k) => { memoriaDemo.delete(k); },
};

const clienteReal = createClient(finalUrl, finalKey, {
  auth: {
    storage: isNative ? nativeStorage : (esDemos ? almacenDemo : window.localStorage),
    ...(esDemos ? { storageKey: `sb-demo-${crypto.randomUUID()}` } : {}),
    persistSession: true,
    autoRefreshToken: true,
    // En nativo no hay redirect con sesión en la URL; evitarlo previene falsos
    // negativos al arrancar. En web se mantiene por compatibilidad.
    detectSessionInUrl: !isNative,
    ...(isNative ? { lock: processLock } : {}),
  },
})

// ── Modo demo ────────────────────────────────────────────────────────────────
// Las maquetas de venta (/demo/...) no deben tocar la base real: Cafetería hace
// 19 consultas directas y Eventos 14, y varias de esas tablas tienen lectura
// pública, así que una prospecta acabaría viendo el MENÚ Y LOS PRECIOS de Be Fit
// Lab. Se intercepta el cliente solo para `from`, `rpc` y realtime.
//
// 🔴 `auth` y `storage` NO se interceptan a propósito: si quien enseña la demo
// tiene su sesión abierta, desviar auth se la rompería.
let clienteDemo = null;
// `functions` SÍ se intercepta: Cafetería y Eventos invocan cobros de Stripe y
// avisos push, y una maqueta no debe poder disparar nada de eso de verdad.
const INTERCEPTADO = ['from', 'rpc', 'channel', 'removeChannel', 'removeAllChannels', 'functions'];

export function activarSupabaseDemo(stub) { clienteDemo = stub; }
export function desactivarSupabaseDemo() { clienteDemo = null; }

export const supabase = new Proxy(clienteReal, {
  get(destino, prop) {
    const fuente = (clienteDemo && INTERCEPTADO.includes(prop)) ? clienteDemo : destino;
    const valor = fuente[prop];
    return typeof valor === 'function' ? valor.bind(fuente) : valor;
  },
});

// Patrón recomendado por Supabase para móvil: pausar el auto-refresh del token
// cuando la app pasa a SEGUNDO PLANO y reanudarlo al VOLVER. Si un refresh queda
// en vuelo justo cuando iOS/Android suspende la app, el servidor rota el token
// pero la respuesta nunca se procesa → el token guardado queda inválido y la
// PRÓXIMA apertura cierra la sesión ("Already Used"/"Not Found"). supabase-js
// intenta cubrirlo con visibilitychange, pero ese evento no siempre alcanza a
// correr en el WebView; appStateChange es la señal NATIVA y sí da tiempo.
// startAutoRefresh() además dispara un tick inmediato al volver, así el token
// expirado se renueva al instante (serializado por processLock).
if (isNative) {
  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) clienteReal.auth.startAutoRefresh();
    else clienteReal.auth.stopAutoRefresh();
  });
}

// Los errores de las edge functions viajan en el CUERPO de la respuesta, pero
// supabase-js solo expone un genérico en `error.message` ("Edge Function returned
// a non-2xx status code"). Sin leer el cuerpo, la clienta ve ESE texto en pantalla
// en lugar de "Máximo 4 boletos por compra" o "¡Se agotaron los lugares!", y las
// ramas que buscan códigos como EVENT_FULL nunca llegan a activarse.
export async function errorDeFuncion(error, data, respaldo = 'No pudimos completar la operación. Intenta de nuevo.') {
  if (data?.error) return String(data.error);
  if (!error) return '';
  try {
    const cuerpo = await error.context?.json?.();
    if (cuerpo?.error) return String(cuerpo.error);
  } catch { /* la respuesta no traía JSON legible */ }
  return respaldo;
}
