import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Datos de la maqueta de gimnasio. Todo sale de funciones de la base Demos
// (20_gimnasio.sql); aquí solo se piden, se refrescan en vivo y se formatean.

const ZONA = 'America/Mexico_City';

export const pesos = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
export const hora = (iso) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: ZONA });
export const minutosDesde = (iso, ahora = Date.now()) => Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000));
export const duracion = (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`);
export const iniciales = (nombre = '') => nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

// 'YYYY-MM-DD' → '15 oct' (sin pasar por la zona horaria del navegador)
export function fechaCorta(ymd) {
  if (!ymd) return '';
  const [a, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '');
}

export function diaRelativo(iso) {
  const f = (d) => d.toLocaleDateString('en-CA', { timeZone: ZONA });
  const dia = f(new Date(iso));
  if (dia === f(new Date())) return 'Hoy';
  if (dia === f(new Date(Date.now() - 86400000))) return 'Ayer';
  const t = new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: ZONA }).replace(/[.,]/g, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function errorLegible(error) {
  const m = error?.message || String(error || '');
  return m.replace(/^.*?ERROR:\s*/, '') || 'Algo salió mal. Intenta de nuevo.';
}

// Qué tan lleno está, en palabras y color.
export function nivelAforo(adentro = 0, capacidad = 1, alertaPct = 85) {
  const pct = Math.round((adentro / Math.max(1, capacidad)) * 100);
  if (pct >= 100) return { pct, texto: 'Lleno', color: 'var(--g-rojo)' };
  if (pct >= alertaPct) return { pct, texto: 'Casi lleno', color: 'var(--g-rojo)' };
  if (pct >= 50) return { pct, texto: 'Moderado', color: 'var(--g-ambar)' };
  return { pct, texto: 'Tranquilo', color: 'var(--g-verde)' };
}

export const ESTADOS = {
  activa: { texto: 'Activa', color: 'var(--g-verde)' },
  vencida: { texto: 'Vencida', color: 'var(--g-rojo)' },
  adeudo: { texto: 'Con adeudo', color: 'var(--g-ambar)' },
  congelada: { texto: 'Congelada', color: '#60A5FA' },
};

export function useAhora(ms = 1000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return ahora;
}

// Se suscribe a los accesos nuevos del negocio (o de un socio) y avisa,
// agrupando ráfagas: la simulación mete varias entradas de golpe cada minuto.
export function useAlCambiarAccesos(negocio, alCambiar, { socio, espera = 1200 } = {}) {
  const ref = useRef(alCambiar);
  useLayoutEffect(() => { ref.current = alCambiar; });
  useEffect(() => {
    if (!negocio) return undefined;
    let t = null;
    const filtro = socio ? `socio_id=eq.${socio}` : `negocio=eq.${negocio}`;
    const canal = supabase.channel(`gym-accesos-${negocio}-${socio || 'todos'}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gym_accesos', filter: filtro }, (p) => {
        if (socio) { ref.current(p.new); return; }
        clearTimeout(t);
        t = setTimeout(() => ref.current(p.new), espera);
      })
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(canal); };
  }, [negocio, socio, espera]);
}

// Una función de la base que se vuelve a pedir cada `cada` ms y cuando hay accesos nuevos.
export function useRpc(nombre, args, { cada = 0, enVivo = false, activo = true } = {}) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const clave = JSON.stringify(args);
  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.rpc(nombre, JSON.parse(clave));
    if (e) { setError(errorLegible(e)); return; }
    setError('');
    setDatos(data);
  }, [nombre, clave]);
  useEffect(() => {
    if (!activo) return undefined;
    cargar();
    if (!cada) return undefined;
    const t = setInterval(cargar, cada);
    return () => clearInterval(t);
  }, [cargar, cada, activo]);
  useAlCambiarAccesos(enVivo && activo ? JSON.parse(clave).p_negocio : null, cargar);
  return { datos, error, recargar: cargar };
}

// Últimos accesos con el nombre del socio (recepción y el socio mismo; la RLS
// decide qué filas ve cada quien).
export function useAccesos(negocio, { socio, limite = 40 } = {}) {
  const [accesos, setAccesos] = useState([]);
  const cargar = useCallback(async () => {
    let q = supabase.from('gym_accesos')
      .select('id, tipo, permitido, motivo, metodo, creado, socio_id, gym_socios(nombre, numero)')
      .eq('negocio', negocio).order('creado', { ascending: false }).limit(limite);
    if (socio) q = q.eq('socio_id', socio);
    const { data, error } = await q;
    if (!error) setAccesos(data || []);
  }, [negocio, socio, limite]);
  useEffect(() => { cargar(); }, [cargar]);
  useAlCambiarAccesos(negocio, cargar, { espera: 600 });
  return { accesos, recargar: cargar };
}

// Cobros (dueño: todos los del rango; socio: la RLS le deja ver solo los suyos).
export function usePagos(negocio, { desde, limite = 500 } = {}) {
  const [pagos, setPagos] = useState(null);
  const cargar = useCallback(async () => {
    let q = supabase.from('gym_pagos').select('id, monto, concepto, creado, socio_id, gym_socios(nombre, numero)')
      .eq('negocio', negocio).order('creado', { ascending: false }).limit(limite);
    if (desde) q = q.gte('creado', desde);
    const { data, error } = await q;
    if (!error) setPagos(data || []);
  }, [negocio, desde, limite]);
  useEffect(() => { cargar(); }, [cargar]);
  useAlCambiarAccesos(negocio, cargar, { espera: 900 });
  return { pagos, recargar: cargar };
}

// ── Fechas en hora de México ────────────────────────────────────────────────
export const diaMx = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: ZONA });
export const horaMx = (d = Date.now()) => Number(new Date(d).toLocaleString('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: ZONA }));
// 1 = lunes … 7 = domingo
export function diaSemanaMx(d = Date.now()) {
  const n = new Date(`${diaMx(d)}T12:00:00Z`).getUTCDay();
  return n === 0 ? 7 : n;
}
export function saludo() {
  const h = horaMx();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}
// Inicio del día / del mes de hoy en México, como ISO (para filtrar en la base).
export function inicioMx(tipo = 'dia') {
  const [a, m, d] = diaMx(Date.now()).split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, tipo === 'mes' ? 1 : d, 6)).toISOString(); // México = UTC-6 todo el año
}

// Visitas (entrada permitida → su salida) con lo que duraron, la más reciente primero.
export function visitasDe(accesos) {
  const orden = accesos.filter((a) => a.permitido).sort((a, b) => new Date(a.creado) - new Date(b.creado));
  const lista = [];
  let abierta = null;
  for (const a of orden) {
    if (a.tipo === 'entrada') {
      if (abierta) lista.push(abierta);
      abierta = { entra: a.creado, sale: null };
    } else if (abierta) {
      abierta.sale = a.creado;
      lista.push(abierta);
      abierta = null;
    }
  }
  if (abierta) lista.push(abierta);
  return lista.reverse().map((v) => ({ ...v, min: v.sale ? minutosDesde(v.entra, new Date(v.sale).getTime()) : null }));
}

// La hora con menos gente que queda hoy (según el promedio), hasta las 21 h.
export function mejorHora(aforo) {
  const resto = (aforo?.promedio || []).filter((x) => x.h > aforo.hora && x.h <= 21);
  return resto.length ? resto.reduce((a, b) => (b.personas < a.personas ? b : a)) : null;
}

// Pitido de recepción (Web Audio, sin archivos): agudo si pasa, grave si no.
let audio = null;
export function sonar(ok) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const notas = ok ? [[880, 0], [1320, 0.09]] : [[220, 0], [180, 0.16]];
    notas.forEach(([f, t0]) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = ok ? 'sine' : 'square';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, audio.currentTime + t0);
      g.gain.exponentialRampToValueAtTime(ok ? 0.18 : 0.08, audio.currentTime + t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t0 + (ok ? 0.16 : 0.28));
      o.connect(g).connect(audio.destination);
      o.start(audio.currentTime + t0);
      o.stop(audio.currentTime + t0 + 0.3);
    });
  } catch { /* sin audio */ }
}
