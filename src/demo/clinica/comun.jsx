import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Maximize, Minimize, X } from 'lucide-react';
import { ESTADO_CITA, NEGOCIO, especialidad, doctor } from './datos';

// Piezas compartidas por la app de la paciente y los paneles. Prefijo `cl-`.

export function Logo({ claro }) {
  return (
    <span className={`cl-logo ${claro ? 'claro' : ''}`}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M12 3c0 5-4 6-4 10a4 4 0 0 0 8 0c0-4-4-5-4-10Z" fill="currentColor" opacity=".9" />
        <path d="M12 14v7M9 19l3 2 3-2" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
      <span>{NEGOCIO.nombre}</span>
    </span>
  );
}

export function enRaiz(nodo) {
  const raiz = typeof document !== 'undefined' ? document.querySelector('.cl') : null;
  return raiz ? createPortal(nodo, raiz) : nodo;
}

// Ventana: hoja que sube en celular, caja centrada en compu.
export function Ventana({ titulo, sub, alCerrar, children, ancho = 520, className = '' }) {
  const caja = useRef(null);
  const cerrar = useRef(alCerrar);
  useLayoutEffect(() => { cerrar.current = alCerrar; });
  useEffect(() => {
    const antes = document.activeElement;
    const f = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); cerrar.current?.(); } };
    document.addEventListener('keydown', f);
    const ov = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!caja.current?.contains(document.activeElement)) caja.current?.focus();
    return () => { document.removeEventListener('keydown', f); document.body.style.overflow = ov; antes?.focus?.(); };
  }, []);
  return enRaiz(
    <div className="cl-velo" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) alCerrar?.(); }}>
      <div ref={caja} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo} className={`cl-ventana ${className}`} style={{ '--ancho': `${ancho}px` }}>
        <div className="cl-ventana-cab">
          <div><h3>{titulo}</h3>{sub && <p>{sub}</p>}</div>
          {alCerrar && <button type="button" className="cl-icono" onClick={alCerrar} aria-label="Cerrar"><X size={18} /></button>}
        </div>
        {children}
      </div>
    </div>,
  );
}

export function usePantallaCompleta() {
  const [activa, setActiva] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const f = () => setActiva(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  const posible = !!document.documentElement.requestFullscreen;
  const alternar = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  return { activa, posible, alternar };
}
export function BotonPantalla() {
  const pc = usePantallaCompleta();
  if (!pc.posible) return null;
  return (
    <button type="button" className="cl-icono" onClick={pc.alternar} aria-label={pc.activa ? 'Salir de pantalla completa' : 'Pantalla completa'} title={pc.activa ? 'Salir de pantalla completa' : 'Ver como app (pantalla completa)'}>
      {pc.activa ? <Minimize size={17} /> : <Maximize size={17} />}
    </button>
  );
}

let mostrar = () => {};
export function avisarListo(texto) { mostrar(texto); }
export function AvisoListo() {
  const [texto, setTexto] = useState(null);
  useEffect(() => {
    let t;
    mostrar = (x) => { setTexto(x); clearTimeout(t); t = setTimeout(() => setTexto(null), 2800); };
    return () => { mostrar = () => {}; clearTimeout(t); };
  }, []);
  if (!texto) return null;
  return <div className="cl-aviso" role="status"><CheckCircle2 size={18} /> {texto}</div>;
}

export function useAhora(cada = 1000) {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setT(Date.now()), cada); return () => clearInterval(i); }, [cada]);
  return t;
}
export function useAncho(min) {
  const q = `(min-width: ${min}px)`;
  const [si, setSi] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setSi(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, [q]);
  return si;
}

export function Pestanas({ opciones, valor, alCambiar, className = '' }) {
  return (
    <div className={`cl-pestanas ${className}`} role="tablist">
      {opciones.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={valor === o.id} className={valor === o.id ? 'activa' : ''} onClick={() => alCambiar(o.id)}>
          {o.Icon && <o.Icon size={15} />}{o.etiqueta}{o.n > 0 && <span className="cl-n">{o.n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ nombre, size = 36, color }) {
  const ini = nombre.replace(/^(Nut\.|Dr\.|Dra\.)\s*/, '').split(' ').map((x) => x[0]).slice(0, 2).join('');
  return <span className="cl-avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: color }}>{ini}</span>;
}

export function ChipEsp({ esp }) {
  const x = especialidad(esp);
  return <span className="cl-chip-esp" style={{ color: x.color, background: x.suave }}>{x.corto}</span>;
}
export function ChipEstado({ estado }) {
  const x = ESTADO_CITA[estado];
  return <span className={`cl-estado ${x.tono}`}>{x.nombre}</span>;
}
export const colorDoc = (docId) => especialidad(doctor(docId).esp).color;

// Línea de evolución (SVG a mano: recharts no carga con Vite 8)
export function Linea({ puntos, unidad = '', alto = 120, color = 'var(--cl-acento)', etiquetas }) {
  if (puntos.length < 2) return null;
  const W = 320, H = alto, pad = 18;
  const min = Math.min(...puntos), max = Math.max(...puntos);
  const rango = max - min || 1;
  const x = (i) => pad + (i / (puntos.length - 1)) * (W - pad * 2);
  const y = (v) => pad + (1 - (v - min) / rango) * (H - pad * 2);
  const d = puntos.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  return (
    <svg className="cl-linea" viewBox={`0 0 ${W} ${H + 14}`} role="img" aria-label={`Evolución: de ${puntos[0]} a ${puntos[puntos.length - 1]} ${unidad}`}>
      <path d={`${d} L${x(puntos.length - 1)},${H} L${x(0)},${H} Z`} fill={color} opacity=".08" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {puntos.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r={i === puntos.length - 1 ? 4.5 : 3} fill={i === puntos.length - 1 ? color : '#fff'} stroke={color} strokeWidth="2" />
          {(i === 0 || i === puntos.length - 1) && <text x={x(i)} y={y(v) - 9} textAnchor={i ? 'end' : 'start'} className="cl-linea-txt">{v}{unidad}</text>}
          {etiquetas && <text x={x(i)} y={H + 12} textAnchor="middle" className="cl-linea-eje">{etiquetas[i]}</text>}
        </g>
      ))}
    </svg>
  );
}

// Anillo de progreso
export function Anillo({ valor, max, tam = 92, grosor = 9, color = 'var(--cl-acento)', children }) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, valor / max));
  return (
    <span className="cl-anillo" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} aria-hidden="true">
        <circle cx={tam / 2} cy={tam / 2} r={r} stroke="var(--cl-linea)" strokeWidth={grosor} fill="none" />
        <circle cx={tam / 2} cy={tam / 2} r={r} stroke={color} strokeWidth={grosor} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform={`rotate(-90 ${tam / 2} ${tam / 2})`} style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <span className="cl-anillo-centro">{children}</span>
    </span>
  );
}

// tarjeta de prueba para cobros en línea
export function PagoPrueba({ monto, alPagar, texto = 'Pagar', disabled }) {
  const [tarjeta, setTarjeta] = useState('4242 4242 4242 4242');
  const [proceso, setProceso] = useState(false);
  const [error, setError] = useState(null);
  const pagar = () => {
    setError(null); setProceso(true);
    setTimeout(() => {
      setProceso(false);
      if (tarjeta.replace(/\s/g, '') === '4000000000000002') { setError('Tu banco rechazó la tarjeta. Prueba con otra.'); return; }
      alPagar();
    }, 1200);
  };
  return (
    <div className="cl-pago">
      <label className="cl-campo"><span>Tarjeta (de prueba)</span><input value={tarjeta} onChange={(ev) => setTarjeta(ev.target.value)} inputMode="numeric" className="mono" /></label>
      <div className="cl-dos"><label className="cl-campo"><span>Vence</span><input defaultValue="12/29" /></label><label className="cl-campo"><span>CVC</span><input defaultValue="123" /></label></div>
      {error && <p className="cl-error">{error}</p>}
      <button type="button" className="cl-boton grande" disabled={disabled || proceso} onClick={pagar}>{proceso ? 'Procesando…' : `${texto} ${monto != null ? `$${Math.round(monto).toLocaleString('es-MX')}` : ''}`}</button>
      <p className="cl-nota centro">Pago de prueba. 4000 0000 0000 0002 se rechaza.</p>
    </div>
  );
}
