import { createContext, useContext } from 'react';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// CANDADO DE LAS DEMOS
//
// Cada prospecto entra con un link personal /d/<CÓDIGO> (o tecleando el código).
// El código se guarda en este navegador y se vuelve a validar en la base cada
// vez que cambia la ruta: si lo apagas o vence, se le cierra al instante.
// Tabla, función y administración: supabase/demos/40_accesos.sql y accesos.mjs.
//
// Es un candado de PUERTA, no de bóveda: quien sepa leer el JS publicado puede
// ver las pantallas. Lo que protege es que un curioso (o alguien que vio la URL
// en un video) no recorra ni ensucie las demos, y te dice quién entró y cuándo.
// ─────────────────────────────────────────────────────────────────────────────

const LLAVE = 'kaizen_acceso';
// Respaldo en memoria por si el navegador bloquea el almacenamiento: así el
// link personal sirve al menos mientras la pestaña siga abierta.
let enMemoria = '';

export const normalizarCodigo = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
export const codigoBonito = (c) => (c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c);

export function leerCodigo() {
  try { return localStorage.getItem(LLAVE) || enMemoria; } catch { return enMemoria; }
}
export function guardarCodigo(codigo) {
  enMemoria = codigo;
  try { localStorage.setItem(LLAVE, codigo); } catch { /* sin almacenamiento: vale esta pestaña */ }
}
// Solo si sigue siendo ese: una respuesta vieja no borra un código recién puesto.
export function olvidarCodigo(codigo) {
  if (leerCodigo() !== codigo) return;
  enMemoria = '';
  try { localStorage.removeItem(LLAVE); } catch { /* vacío */ }
}

// Una visita por ruta y pestaña: revalidar al navegar no llena la bitácora.
function primeraVez(codigo, ruta) {
  const marca = `kaizen_visto:${codigo}:${ruta}`;
  try {
    if (sessionStorage.getItem(marca)) return false;
    sessionStorage.setItem(marca, '1');
  } catch { /* sin almacenamiento */ }
  return true;
}

// → { ok:true, codigo, prospecto, demos, vence } | { ok:false, motivo }
//   motivo: 'invalido' · 'vencido' · 'espera' · 'red'
export async function verificar(codigo, ruta) {
  const limpio = normalizarCodigo(codigo);
  if (limpio.length !== 8) return { ok: false, motivo: 'invalido' };
  const { data, error } = await supabase.rpc('demo_entrar', {
    p_codigo: limpio, p_ruta: ruta, p_registrar: primeraVez(limpio, ruta),
  });
  if (error || !data) return { ok: false, motivo: 'red' };
  return data;
}

// 'gimnasio/manhattan' para '/gimnasio/manhattan/…'; '' para el índice.
export function demoDeRuta(ruta) {
  const [a, b] = String(ruta || '').split('?')[0].split('/').filter(Boolean);
  return a && b ? `${a}/${b}` : '';
}

// ¿El acceso abre esta ruta? demos = null → todas. El índice lo ve cualquiera
// con código válido (solo con las demos que le tocan).
// Links que son la misma demo (el gimnasio se volvió genérico el 20-oct-2026:
// `gimnasio/atlas` es por dentro `gimnasio/manhattan`). Un código que abre uno
// abre el otro, y el índice lo enseña con cualquiera de los dos.
const MISMA_DEMO = { 'gimnasio/manhattan': 'gimnasio/atlas' };
export const canonica = (demo) => MISMA_DEMO[demo] || demo;

export function permite(acceso, ruta) {
  if (!acceso) return false;
  const demo = demoDeRuta(ruta);
  if (!demo) return true;
  return !acceso.demos || acceso.demos.map(canonica).includes(canonica(demo));
}

// A dónde mandar a alguien que acaba de entrar con su link.
export function destinoInicial(acceso) {
  return acceso?.demos?.length === 1 ? `/${acceso.demos[0]}` : '/';
}

export const AccesoContexto = createContext(null);
export const useAcceso = () => useContext(AccesoContexto);
