// ─────────────────────────────────────────────────────────────────────────────
// Sonidos de la maquinita, sintetizados con Web Audio (sin archivos): palanca,
// tic-tac de los rodillos, golpe de cada rodillo al parar, premio y fichas.
// El contexto se crea al primer gesto del usuario (los navegadores lo exigen).
// Silenciable; la preferencia se recuerda en este navegador.
// ─────────────────────────────────────────────────────────────────────────────

let ctx = null;
let maestro = null;
const LLAVE = 'demo_sorteos_silencio';

export function silenciado() { try { return localStorage.getItem(LLAVE) === '1'; } catch { return false; } }
export function setSilencio(v) { try { localStorage.setItem(LLAVE, v ? '1' : '0'); } catch { /* sin almacenamiento */ } }

function audio() {
  if (silenciado()) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      maestro = ctx.createGain();
      maestro.gain.value = 0.55;
      maestro.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

function tono({ f = 440, f2 = null, tipo = 'sine', t = 0, dur = 0.15, vol = 0.3, ataque = 0.005 }) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(); const g = a.createGain();
  const ini = a.currentTime + t;
  o.type = tipo; o.frequency.setValueAtTime(f, ini);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, ini + dur);
  g.gain.setValueAtTime(0.0001, ini);
  g.gain.exponentialRampToValueAtTime(vol, ini + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
  o.connect(g).connect(maestro);
  o.start(ini); o.stop(ini + dur + 0.02);
}

function ruido({ t = 0, dur = 0.08, vol = 0.25, corte = 1800, tipo = 'lowpass' }) {
  const a = audio(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource(); src.buffer = buf;
  const fil = a.createBiquadFilter(); fil.type = tipo; fil.frequency.value = corte;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(fil).connect(g).connect(maestro);
  src.start(a.currentTime + t);
}

export const sonidos = {
  // ficha sobre la mesa
  ficha() { tono({ f: 1800, f2: 1200, tipo: 'triangle', dur: 0.06, vol: 0.12 }); ruido({ dur: 0.03, vol: 0.08, corte: 5000, tipo: 'highpass' }); },
  // palanca: trinquete metálico + golpe seco
  palanca() {
    for (let i = 0; i < 5; i++) ruido({ t: i * 0.035, dur: 0.025, vol: 0.18, corte: 3500, tipo: 'bandpass' });
    tono({ f: 140, f2: 55, tipo: 'sine', t: 0.18, dur: 0.22, vol: 0.5 });
    ruido({ t: 0.18, dur: 0.06, vol: 0.2, corte: 900 });
  },
  // un tic del giro
  tic() { tono({ f: 2400, tipo: 'square', dur: 0.018, vol: 0.035 }); },
  // un rodillo que se detiene
  para() { tono({ f: 220, f2: 70, tipo: 'sine', dur: 0.16, vol: 0.45 }); ruido({ dur: 0.05, vol: 0.18, corte: 1200 }); },
  // premio: arpegio brillante + campanitas de monedas
  premio() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tono({ f, tipo: 'triangle', t: i * 0.09, dur: 0.35, vol: 0.22 }));
    tono({ f: 1568, tipo: 'sine', t: 0.5, dur: 0.6, vol: 0.18 });
    for (let i = 0; i < 10; i++) tono({ f: 2600 + Math.random() * 1600, tipo: 'sine', t: 0.55 + i * 0.07, dur: 0.12, vol: 0.07 });
  },
};

// tic-tac mientras giran: devuelve una función para pararlo
export function tictac() {
  if (silenciado()) return () => {};
  let vivo = true, espera = 55;
  const paso = () => { if (!vivo) return; sonidos.tic(); espera = Math.min(140, espera * 1.025); setTimeout(paso, espera); };
  paso();
  return () => { vivo = false; };
}
