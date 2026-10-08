// ─────────────────────────────────────────────────────────────────────────────
// CUENTAS DE LA MAQUETA
//
// Una cuenta real por rol en la base de DEMOSTRACIONES (proyecto Supabase
// "Demos", nunca la de Be Fit Lab). La barra de la maqueta inicia sesión con la
// del rol elegido: un clic y se ve la app exactamente como la ve esa persona.
//
// La contraseña va aquí a propósito: son cuentas de prueba sobre datos
// inventados, y la base se restablece sola cada noche (demo_reset). Las crea
// supabase/demos/01_cuentas.sql.
// ─────────────────────────────────────────────────────────────────────────────

export const CONTRASENA_DEMO = 'StudioAlma-Demo-2026';

export const CUENTAS_DEMO = {
  clienta: { correo: 'maria@demo.studioalma.mx', rol: 'CLIENT' },
  recepcion: { correo: 'mostrador@demo.studioalma.mx', rol: 'RECEPCION' },
  coach: { correo: 'alejandra@demo.studioalma.mx', rol: 'COACH' },
  barista: { correo: 'barra@demo.studioalma.mx', rol: 'BARISTA' },
  admin: { correo: 'direccion@demo.studioalma.mx', rol: 'ADMIN' },
};
