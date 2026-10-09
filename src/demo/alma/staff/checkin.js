import { useEffect, useMemo, useState } from 'react';
import { mexicoClassStart, mexicoTodayStr } from '../../../lib/dates';

// Ventana de check-in del mostrador, igual que QrCheckIn.jsx de Be Fit: abre
// 15 min ANTES de la clase y cierra 10 min DESPUÉS. Con clases seguidas puede
// haber varias abiertas a la vez (openClassIds va a checkInClient, que elige
// la de cada alumna). La ventana es suave: nunca bloquea el registro.
const ANTES = 15 * 60 * 1000;
const DESPUES = 10 * 60 * 1000;

export function clasesDeHoy(clases) {
  const hoy = mexicoTodayStr();
  const dow = new Date(`${hoy}T12:00:00`).getDay();
  return (clases || [])
    .filter((c) => c.date === hoy || (!c.date && (c.day === dow || c.day === String(dow))))
    .map((c) => ({ c, inicio: mexicoClassStart(hoy, c.time)?.getTime() }))
    .filter((x) => x.inicio)
    .sort((x, y) => x.inicio - y.inicio);
}

export function useVentana(clases) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ventana = useMemo(() => {
    const hoy = clasesDeHoy(clases);
    if (!hoy.length) return null;
    const abiertas = hoy.filter((x) => ahora >= x.inicio - ANTES && ahora <= x.inicio + DESPUES);
    if (abiertas.length) {
      return {
        modo: 'abierto', clase: abiertas[0].c, abiertas: abiertas.map((x) => x.c), ids: abiertas.map((x) => x.c.id),
        meta: Math.min(...abiertas.map((x) => x.inicio + DESPUES)),
      };
    }
    const sig = hoy.find((x) => ahora < x.inicio - ANTES);
    if (sig) return { modo: 'espera', clase: sig.c, abiertas: [], ids: [], meta: sig.inicio - ANTES };
    return { modo: 'cerrado', clase: hoy[hoy.length - 1].c, abiertas: [], ids: [], meta: null };
  }, [clases, ahora]);
  const restante = ventana?.meta ? Math.max(0, ventana.meta - ahora) : 0;
  return { ventana, restante };
}

export function reloj(ms) {
  const s = Math.floor(ms / 1000);
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
