import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { digitos, fmtNum } from './datos';
import { useDialogo } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// Rodillos de tragamonedas: un rodillo por dígito. Cada uno es una tira con el
// 0–9 repetido; para "caer" en un dígito se desliza a la vuelta 5 de la tira y
// se queda ahí. La siguiente tirada arranca desde la vuelta 0 (se ve igual,
// porque la tira se repite) sin animación, y vuelve a girar.
// La usan la maquinita de la suerte y la pantalla de transmisión.
// ─────────────────────────────────────────────────────────────────────────────

const VUELTAS = 6;
const TIRA = Array.from({ length: VUELTAS * 10 }, (_, i) => i % 10);

export const Rodillos = forwardRef(function Rodillos({ cifras, grande = false }, ref) {
  const [estado, setEstado] = useState(() => Array.from({ length: cifras }, () => ({ pos: 0, t: 'none' })));
  const quieto = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useImperativeHandle(ref, () => ({
    // gira y cae en `numero`; resuelve cuando para el último rodillo
    girar(numero, { lento = false } = {}) {
      const ds = String(numero).padStart(cifras, '0').split('').map(Number);
      const base = lento ? 2.6 : 1.3;
      const paso = lento ? 0.9 : 0.32;
      setEstado((x) => x.map((r) => ({ pos: r.pos % 10, t: 'none' })));
      return new Promise((listo) => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          setEstado(ds.map((d, i) => ({
            pos: (VUELTAS - 1) * 10 + d,
            t: quieto ? 'none' : `transform ${base + i * paso}s cubic-bezier(.12,.8,.18,1)`,
          })));
          setTimeout(listo, quieto ? 50 : (base + (cifras - 1) * paso) * 1000 + 150);
        }));
      });
    },
  }), [cifras, quieto]);

  return (
    <div className={`ro ${grande ? 'ro-grande' : ''}`} aria-hidden="true">
      {estado.map((r, i) => (
        <div key={i} className="ro-ventana">
          <div className="ro-tira" style={{ transform: `translateY(calc(${-r.pos} * var(--ro-alto)))`, transition: r.t }}>
            {TIRA.map((d, k) => <span key={k}>{d}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
});

// ── La maquinita de la suerte: tragamonedas con palanca ────────────────────
export function MaquinaCasino({ s, ocupados, yaElegidos, alCerrar, alElegir }) {
  const [cant, setCant] = useState(1);
  const [girando, setGirando] = useState(false);
  const [listos, setListos] = useState(null);
  const [palanca, setPalanca] = useState(false);
  const rodillos = useRef(null);
  const caja = useRef(null);
  useDialogo(caja, alCerrar);

  const libresAlAzar = (k) => {
    const out = new Set();
    for (let i = 0; i < k * 60 && out.size < k; i++) {
      const n = Math.floor(Math.random() * s.total);
      if (ocupados[n] == null && !yaElegidos.includes(n)) out.add(n);
    }
    return [...out];
  };

  const jalar = async () => {
    if (girando) return;
    setGirando(true); setListos(null); setPalanca(true);
    setTimeout(() => setPalanca(false), 450);
    const nums = libresAlAzar(cant);
    await rodillos.current.girar(nums[0]);
    setListos(nums);
    setGirando(false);
  };

  return (
    <div className="so-modal-fondo" onClick={alCerrar}>
      <div ref={caja} className="mq" onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Maquinita de la suerte">
        <button className="mq-x" onClick={alCerrar} aria-label="Cerrar"><X size={18} /></button>

        <div className="mq-gabinete">
          <div className={`mq-marquesina ${girando ? 'mq-girando' : ''} ${listos ? 'mq-premio' : ''}`}>
            <span className="mq-focos" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} />)}</span>
            <b>LA MAQUINITA</b>
            <small>de la suerte</small>
          </div>

          <div className="mq-pantalla">
            <Rodillos ref={rodillos} cifras={digitos(s)} />
            <div className="mq-linea" aria-hidden="true" />
          </div>

          <div className="mq-resultado" aria-live="polite">
            {listos
              ? <>¡Salió el <b>{fmtNum(s, listos[0])}</b>!{listos.length > 1 && <span> y {listos.length - 1} más</span>}</>
              : girando ? 'Girando…' : 'Jala la palanca'}
          </div>

          <button className={`mq-palanca ${palanca ? 'mq-jalada' : ''}`} onClick={jalar} disabled={girando} aria-label="Jalar la palanca">
            <i /><span />
          </button>
        </div>

        {listos && listos.length > 1 && (
          <div className="mq-extras">
            {listos.slice(1, 30).map((n, i) => <span key={n} style={{ animationDelay: `${i * 40}ms` }}>{fmtNum(s, n)}</span>)}
            {listos.length > 30 && <span>+{listos.length - 30}</span>}
          </div>
        )}

        <div className="mq-controles">
          <div className="mq-cantidad" role="group" aria-label="Cuántos boletos">
            {[1, 3, 5, 10, 20].map((c) => (
              <button key={c} aria-pressed={cant === c} onClick={() => setCant(c)} disabled={girando}>{c}</button>
            ))}
          </div>
          {listos ? (
            <div className="mq-acciones">
              <button className="so-boton so-boton-vidrio" onClick={jalar}>Otra vez</button>
              <button className="so-boton so-boton-oro" onClick={() => alElegir(listos)}><Check size={18} /> Quiero {listos.length > 1 ? 'estos' : 'este'}</button>
            </div>
          ) : (
            <button className="so-boton so-boton-oro so-boton-ancho" onClick={jalar} disabled={girando}>{girando ? 'Girando…' : 'Jalar la palanca'}</button>
          )}
        </div>
      </div>
    </div>
  );
}
