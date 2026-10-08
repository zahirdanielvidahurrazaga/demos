import { useLayoutEffect, useRef, useState } from 'react';
import { g } from './ui';

// Gráficas del gimnasio en SVG a mano. (recharts no carga con Vite 8: su
// dependencia es-toolkit choca con el empaquetador. Y estas dos son sencillas.)

function useAncho(ref) {
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setAncho(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return ancho;
}

// Barras por hora (app del socio): hoy hasta ahora, la hora actual resaltada y lo usual después.
export function BarrasHora({ datos, alto = 120 }) {
  const max = Math.max(1, ...datos.map((d) => d.personas));
  const colores = { ahora: 'var(--g-pri)', hoy: 'color-mix(in srgb, var(--g-pri) 45%, transparent)', usual: 'rgba(255,255,255,0.14)' };
  return (
    <div>
      <div style={{ height: alto, display: 'flex', alignItems: 'flex-end', gap: 3 }}>
        {datos.map((d) => (
          <div key={d.h} title={`${d.h}:00 · ${d.personas} personas`} style={{
            flex: 1, height: `${Math.max(2, (d.personas / max) * 100)}%`, borderRadius: '4px 4px 1px 1px',
            background: colores[d.tipo], transition: 'height .6s ease',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
        {datos.map((d) => (
          <span key={d.h} style={{ flex: 1, fontSize: '0.62rem', color: g.suave, textAlign: 'center', whiteSpace: 'nowrap' }}>
            {d.h % 3 === 0 ? `${d.h}h` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

// Personas adentro por hora (tablero del dueño): hoy (área) contra el promedio
// (línea), con el aforo máximo y la alerta.
export function CurvaHoras({ aforo, alto = 260 }) {
  const caja = useRef(null);
  const ancho = useAncho(caja);
  const [foco, setFoco] = useState(null);

  const hoy = new Map(aforo.hoy.map((x) => [x.h, x.personas]));
  const puntos = aforo.promedio.map((x) => ({
    h: x.h, promedio: x.personas, hoy: x.h === aforo.hora ? aforo.adentro : hoy.get(x.h),
  }));
  const alerta = Math.round((aforo.capacidad * aforo.alerta_pct) / 100);
  const maxY = Math.max(aforo.capacidad, ...puntos.map((p) => Math.max(p.promedio, p.hoy ?? 0))) * 1.08;
  const izq = 34;
  const der = 10;
  const arr = 12;
  const abajo = 24;
  const w = Math.max(0, ancho - izq - der);
  const h = alto - arr - abajo;
  const x = (i) => izq + (puntos.length > 1 ? (i / (puntos.length - 1)) * w : 0);
  const y = (v) => arr + h - (v / maxY) * h;
  const linea = (lista) => lista.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

  const prom = puntos.map((p, i) => [x(i), y(p.promedio)]);
  const conHoy = puntos.map((p, i) => [i, p.hoy]).filter(([, v]) => v != null);
  const hoyLinea = conHoy.map(([i, v]) => [x(i), y(v)]);
  const hoyArea = hoyLinea.length > 1
    ? `${linea(hoyLinea)} L${hoyLinea[hoyLinea.length - 1][0].toFixed(1)} ${y(0)} L${hoyLinea[0][0].toFixed(1)} ${y(0)} Z` : '';
  const f = foco != null ? puntos[foco] : null;

  return (
    <div ref={caja} style={{ position: 'relative', height: alto }}>
      {ancho > 0 && (
        <svg width={ancho} height={alto} style={{ display: 'block', overflow: 'visible' }} onMouseLeave={() => setFoco(null)}>
          <defs>
            <linearGradient id="gym-hoy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFC531" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#FFC531" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, Math.round(aforo.capacidad / 2), aforo.capacidad].map((v) => (
            <g key={v}>
              <line x1={izq} x2={izq + w} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
              <text x={izq - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#9CA3AF">{v}</text>
            </g>
          ))}
          <line x1={izq} x2={izq + w} y1={y(aforo.capacidad)} y2={y(aforo.capacidad)} stroke="#EF4444" strokeDasharray="5 5" />
          <text x={izq + w} y={y(aforo.capacidad) - 6} textAnchor="end" fontSize="11" fill="#EF4444">Aforo máx. {aforo.capacidad}</text>
          <line x1={izq} x2={izq + w} y1={y(alerta)} y2={y(alerta)} stroke="#F59E0B" strokeDasharray="2 6" />
          <path d={linea(prom)} fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="2" strokeLinejoin="round" />
          {hoyArea && <path d={hoyArea} fill="url(#gym-hoy)" />}
          {hoyLinea.length > 1 && <path d={linea(hoyLinea)} fill="none" stroke="#FFC531" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
          {hoyLinea.length > 0 && (
            <circle cx={hoyLinea[hoyLinea.length - 1][0]} cy={hoyLinea[hoyLinea.length - 1][1]} r="5" fill="#FFC531" stroke="#0B0C0E" strokeWidth="2" />
          )}
          {puntos.map((p, i) => (p.h % 3 === 0 ? (
            <text key={p.h} x={x(i)} y={alto - 6} textAnchor="middle" fontSize="11" fill="#9CA3AF">{p.h}:00</text>
          ) : null))}
          {f && <line x1={x(foco)} x2={x(foco)} y1={arr} y2={arr + h} stroke="rgba(255,255,255,0.25)" />}
          {puntos.map((p, i) => (
            <rect key={p.h} x={x(i) - w / (puntos.length - 1) / 2} y={arr} width={w / (puntos.length - 1)} height={h}
              fill="transparent" onMouseEnter={() => setFoco(i)} onTouchStart={() => setFoco(i)} />
          ))}
        </svg>
      )}
      {f && (
        <div style={{
          position: 'absolute', top: 0, left: Math.min(Math.max(0, x(foco) - 70), ancho - 140), width: 140, pointerEvents: 'none',
          background: g.sup2, border: `1px solid ${g.linea}`, borderRadius: 12, padding: '8px 10px', fontSize: '0.8rem',
        }}>
          <b>{f.h}:30</b>
          <div style={{ color: '#FFC531' }}>Hoy: {f.hoy ?? '—'}</div>
          <div style={{ color: g.suave }}>Promedio: {f.promedio}</div>
        </div>
      )}
    </div>
  );
}
