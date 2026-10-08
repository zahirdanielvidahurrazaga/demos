import { Capacitor } from '@capacitor/core';
import { ESTUDIO } from '../config/estudio';

// URLs de retorno para los correos de Supabase Auth.
// - Registro: deep link befitlab:// en nativo → queremos que la confirmación
//   ABRA la app (lo captura appUrlOpen y procesa la sesión).
// - Recuperación: SIEMPRE página web https. El esquema befitlab:// solo funciona
//   en Safari; en Chrome / webviews de correo queda en blanco. La página web
//   https://befitlab.app/nueva-contrasena carga en cualquier navegador.
// El deep link y los dominios web deben estar en la allow-list de Redirect URLs.

// Dominio web de producción. En nativo, window.location.origin es
// capacitor://localhost (no sirve como destino del correo), así que lo fijamos.
const WEB_ORIGIN = ESTUDIO.enlaces.sitio;

// En web usamos el origin actual (sirve para befitlab.app y *.pages.dev);
// en nativo, el dominio de producción.
function webBase() {
  return Capacitor.isNativePlatform() ? WEB_ORIGIN : window.location.origin;
}

export function signupRedirect() {
  return Capacitor.isNativePlatform()
    ? 'befitlab://auth-callback?flow=signup'
    : `${window.location.origin}/portal`;
}

export function recoveryRedirect() {
  // Página web en TODAS las plataformas → funciona en cualquier navegador.
  return `${webBase()}/nueva-contrasena`;
}
