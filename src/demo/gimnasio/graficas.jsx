import { useId, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { g } from './ui';

// Gráficas del gimnasio en SVG a mano. (recharts no carga con Vite 8: su
// dependencia es-toolkit choca con el empaquetador.)

function useAnchoDe(ref) {
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

// Curva suave que pasa por todos los puntos.
const suave = (pts) => pts.map((p, i) => {
  if (!i) return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const a = pts[i - 1];
  const cx = (a[0] + p[0]) / 2;
  return `C${cx.toFixed(1)} ${a[1].toFixed(1)} ${cx.toFixed(1)} ${p[1].toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
}).join('');

// Personas adentro por hora: hoy (línea que brilla, con relleno) contra el
// promedio del mismo día de las últimas 4 semanas (punteada). `compacto` = sin
// ejes, para la app del socio; completa = ejes, aforo máximo, alerta y tooltip.
export function Onda({ aforo, alto = 110, compacto = false }) {
  const caja = useRef(null);
  const ancho = useAnchoDe(caja);
  const id = useId().replace(/:/g, '');
  const [foco, setFoco] = useState(null);

  const hoy = new Map(aforo.hoy.map((x) => [x.h, x.personas]));
  const puntos = aforo.promedio.filter((x) => x.h >= 6 && x.h <= 22).map((x) => ({
    h: x.h, promedio: x.personas, hoy: x.h === aforo.hora ? aforo.adentro : x.h < aforo.hora ? (hoy.get(x.h) ?? 0) : null,
  }));
  const maxDatos = Math.max(1, ...puntos.map((p) => Math.max(p.promedio, p.hoy ?? 0)));
  const maxY = (compacto ? maxDatos : Math.max(aforo.capacidad, maxDatos)) * 1.12;
  const izq = compacto ? 4 : 32;
  const der = compacto ? 4 : 8;
  const arr = compacto ? 26 : 14;
  const abajo = compacto ? 4 : 24;
  const w = Math.max(10, ancho - izq - der);
  const h = alto - arr - abajo;
  const x = (i) => izq + (i / (puntos.length - 1)) * w;
  const y = (v) => arr + h - (v / maxY) * h;

  const prom = puntos.map((p, i) => [x(i), y(p.promedio)]);
  const linea = puntos.map((p, i) => (p.hoy == null ? null : [x(i), y(p.hoy)])).filter(Boolean);
  const ult = linea[linea.length - 1];
  const f = foco != null ? puntos[foco] : null;
  const alerta = Math.round((aforo.capacidad * aforo.alerta_pct) / 100);

  return (
    <div ref={caja} style={{ position: 'relative', height: alto }}>
      {ancho > 0 && (
        <svg width={ancho} height={alto} style={{ display: 'block', overflow: 'visible' }} onMouseLeave={() => setFoco(null)}>
          <defs>
            <linearGradient id={`r${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--g-pri)' }} stopOpacity="0.28" />
              <stop offset="1" style={{ stopColor: 'var(--g-pri)' }} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`l${id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={{ stopColor: 'var(--g-pri)' }} />
              <stop offset="1" style={{ stopColor: 'var(--g-pri2)' }} />
            </linearGradient>
          </defs>
          {!compacto && [0, Math.round(aforo.capacidad / 2), aforo.capacidad].map((v) => (
            <g key={v}>
              <line x1={izq} x2={izq + w} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.05)" />
              <text x={izq - 8} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill="var(--g-tenue)">{v}</text>
            </g>
          ))}
          {!compacto && (
            <>
              <line x1={izq} x2={izq + w} y1={y(aforo.capacidad)} y2={y(aforo.capacidad)} stroke="rgba(255,255,255,0.32)" strokeDasharray="5 5" />
              <text x={izq + w} y={y(aforo.capacidad) - 6} textAnchor="end" fontSize="10.5" fill="var(--g-suave)">Aforo máx. {aforo.capacidad}</text>
              <line x1={izq} x2={izq + w} y1={y(alerta)} y2={y(alerta)} stroke="var(--g-ambar)" strokeOpacity="0.55" strokeDasharray="2 6" />
            </>
          )}
          <path d={suave(prom)} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" strokeDasharray="4 5" />
          {linea.length > 1 && (
            <>
              <motion.path d={`${suave(linea)}L${ult[0]} ${arr + h}L${linea[0][0]} ${arr + h}Z`} fill={`url(#r${id})`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
              <motion.path d={suave(linea)} fill="none" stroke={`url(#l${id})`} strokeWidth="3.5" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
            </>
          )}
          {ult && (
            <g>
              <circle cx={ult[0]} cy={ult[1]} r="10" style={{ fill: 'var(--g-pri)' }} opacity="0.25">
                <animate attributeName="r" values="6;13;6" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.45;0;0.45" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={ult[0]} cy={ult[1]} r="5.5" style={{ fill: 'var(--g-pri2)', stroke: 'var(--g-fondo)' }} strokeWidth="2.5" />
              <g transform={`translate(${Math.min(ult[0], izq + w - 17) - 17} ${ult[1] - 31})`}>
                <rect width="34" height="20" rx="7" style={{ fill: 'var(--g-pri)' }} />
                <text x="17" y="14" fontSize="11" fontWeight="700" style={{ fill: 'var(--g-pri-texto)' }} textAnchor="middle">{aforo.adentro}</text>
              </g>
            </g>
          )}
          {!compacto && puntos.map((p, i) => (p.h % 3 === 0 ? (
            <text key={p.h} x={x(i)} y={alto - 6} textAnchor="middle" fontSize="10.5" fill="var(--g-tenue)">{p.h}:00</text>
          ) : null))}
          {!compacto && f && <line x1={x(foco)} x2={x(foco)} y1={arr} y2={arr + h} stroke="rgba(255,255,255,0.2)" />}
          {!compacto && puntos.map((p, i) => (
            <rect key={p.h} x={x(i) - w / (puntos.length - 1) / 2} y={arr} width={w / (puntos.length - 1)} height={h}
              fill="transparent" onMouseEnter={() => setFoco(i)} onTouchStart={() => setFoco(i)} />
          ))}
        </svg>
      )}
      {!compacto && f && (
        <div style={{
          position: 'absolute', top: 0, left: Math.min(Math.max(0, x(foco) - 70), ancho - 140), width: 140, pointerEvents: 'none',
          background: '#fff', color: '#0A0A0A', borderRadius: 14, padding: '8px 11px', fontSize: 12.5,
        }}>
          <b>{f.h}:30</b>
          {f.hoy != null && <div style={{ fontWeight: 600 }}>Hoy: {f.hoy}</div>}
          <div style={{ color: '#6B6B66' }}>Promedio: {f.promedio}</div>
        </div>
      )}
    </div>
  );
}

export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Mapa de calor (día de la semana × hora) de las últimas 4 semanas. La celda
// de ahora lleva borde.
export function MapaCalor({ celdas, capacidad, desde = 6, hasta = 22, diaHoy, horaHoy }) {
  const mapa = new Map(celdas.map((c) => [`${c.dia}-${c.h}`, c.personas]));
  const horas = Array.from({ length: hasta - desde + 1 }, (_, i) => i + desde);
  return (
    <div className="g-sin-barra" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `30px repeat(${horas.length}, minmax(14px, 1fr))`, gap: 3, minWidth: 330 }}>
        <span />
        {horas.map((h) => <span key={h} style={{ fontSize: 10, color: g.tenue, textAlign: 'center' }}>{h % 3 === 0 ? h : ''}</span>)}
        {DIAS.map((d, i) => [
          <span key={d} style={{ fontSize: 11, color: i + 1 === diaHoy ? g.texto : g.suave, fontWeight: i + 1 === diaHoy ? 700 : 400, alignSelf: 'center' }}>{d}</span>,
          ...horas.map((h) => {
            const p = mapa.get(`${i + 1}-${h}`) ?? 0;
            const x = Math.min(1, p / (capacidad * 0.8));
            const ahora = i + 1 === diaHoy && h === horaHoy;
            return (
              <motion.span key={`${d}-${h}`} title={`${d} ${h}:30 · ~${p} personas`}
                initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (i * horas.length + (h - desde)) * 0.003 }}
                style={{
                  aspectRatio: '1 / 1.15', borderRadius: 5,
                  background: x < 0.06 ? 'rgba(255,255,255,0.04)' : `color-mix(in srgb, color-mix(in srgb, var(--g-pri), var(--g-pri2) ${Math.round(x * 60)}%) ${Math.round(14 + x * 86)}%, transparent)`,
                  boxShadow: ahora ? '0 0 0 2px #fff' : undefined,
                }} />
            );
          }),
        ])}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 11, color: g.tenue }}>
        Vacío <span style={{ width: 80, height: 6, borderRadius: 6, background: 'linear-gradient(90deg, color-mix(in srgb, var(--g-pri) 14%, transparent), var(--g-pri), var(--g-pri2))' }} /> Lleno
      </div>
    </div>
  );
}

// Barritas verticales finas (visitas por día, cobros por día…).
export function Barritas({ valores, alto = 70, resaltar, etiquetas }) {
  const max = Math.max(1, ...valores);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, height: alto }}>
        {valores.map((v, i) => (
          <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${Math.max(4, (v / max) * 100)}%` }}
            transition={{ duration: 0.7, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
            style={{
              flex: '1 1 0', maxWidth: 14, borderRadius: 99, minWidth: 3,
              background: i === resaltar ? g.pri : v ? '#5E5E5A' : 'rgba(255,255,255,0.06)',
            }} />
        ))}
      </div>
      {etiquetas && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginTop: 6 }}>
          {etiquetas.map((e, i) => <span key={i} style={{ flex: '1 1 0', maxWidth: 14, fontSize: 10, color: g.tenue, textAlign: 'center', overflow: 'visible', whiteSpace: 'nowrap' }}>{e}</span>)}
        </div>
      )}
    </div>
  );
}

// Personas adentro por hora en barras: lo usual de fondo (gris oscuro), hoy en
// gris y la hora actual en el acento con su globo. Las horas que faltan solo
// muestran lo usual.
export function BarrasHora({ aforo, alto = 260, desde = 6, hasta = 22 }) {
  const hoy = new Map(aforo.hoy.map((x) => [x.h, x.personas]));
  const horas = aforo.promedio.filter((x) => x.h >= desde && x.h <= hasta).map((x) => ({
    h: x.h, usual: x.personas, hoy: x.h === aforo.hora ? aforo.adentro : x.h < aforo.hora ? (hoy.get(x.h) ?? 0) : null,
  }));
  const max = Math.max(1, ...horas.map((x) => Math.max(x.usual, x.hoy ?? 0))) * 1.12;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${horas.length}, minmax(0, 1fr))`, gap: 6, alignItems: 'end', height: alto }}>
        {horas.map((x, i) => {
          const ahora = x.h === aforo.hora;
          return (
            <div key={x.h} title={`${x.h}:00 · hoy ${x.hoy ?? '—'} · lo usual ${x.usual}`} style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', zIndex: ahora ? 2 : 1 }}>
              <motion.div initial={{ height: 0 }} animate={{ height: `${(x.usual / max) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 8, background: '#202020' }} />
              {x.hoy != null && (
                <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(1.5, (x.hoy / max) * 100)}%` }} transition={{ duration: 0.9, delay: 0.1 + i * 0.02, ease: [0.16, 1, 0.3, 1] }}
                  style={{ position: 'relative', width: '100%', borderRadius: 8, background: ahora ? 'var(--g-pri)' : '#5E5E5A' }}>
                  {ahora && (
                    <span style={{ position: 'absolute', left: '50%', bottom: 'calc(100% + 8px)', transform: 'translateX(-50%)', background: '#fff', color: '#0A0A0A', fontSize: 12, fontWeight: 700, padding: '4px 9px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                      {aforo.adentro} ahora
                    </span>
                  )}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${horas.length}, minmax(0, 1fr))`, gap: 6, marginTop: 8 }}>
        {horas.map((x) => <span key={x.h} style={{ fontSize: 11, color: x.h === aforo.hora ? g.texto : g.suave, textAlign: 'center' }}>{x.h}h</span>)}
      </div>
    </div>
  );
}
