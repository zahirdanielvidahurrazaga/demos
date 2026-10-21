import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Check, Volume2, VolumeX, X } from 'lucide-react';
import { digitos, fmtNum } from './datos';
import { useDialogo } from './comun';
import { setSilencio, silenciado, sonidos, tictac } from './sonido';

// ─────────────────────────────────────────────────────────────────────────────
// Rodillos de tragamonedas: un rodillo por dígito. Cada uno es una tira con el
// 0–9 repetido; para "caer" en un dígito se desliza a la vuelta 5 de la tira y
// se queda ahí. La siguiente tirada arranca desde la vuelta 0 (se ve igual,
// porque la tira se repite) sin animación, y vuelve a girar. Mientras gira, el
// rodillo va desenfocado (como en una máquina de verdad) y avisa al parar.
// La usan la maquinita de la suerte y la pantalla de transmisión.
// ─────────────────────────────────────────────────────────────────────────────

const VUELTAS = 6;
const TIRA = Array.from({ length: VUELTAS * 10 }, (_, i) => i % 10);

export const Rodillos = forwardRef(function Rodillos({ cifras, grande = false }, ref) {
  const [estado, setEstado] = useState(() => Array.from({ length: cifras }, () => ({ pos: 0, t: 'none', gira: false })));
  const quieto = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useImperativeHandle(ref, () => ({
    // gira y cae en `numero`; avisa cada rodillo que para y resuelve al final
    girar(numero, { lento = false, alParar } = {}) {
      const ds = String(numero).padStart(cifras, '0').split('').map(Number);
      const base = lento ? 2.6 : 1.5;
      const paso = lento ? 0.9 : 0.42;
      const dura = (i) => (quieto ? 0.05 : base + i * paso);
      setEstado((x) => x.map((r) => ({ pos: r.pos % 10, t: 'none', gira: false })));
      return new Promise((listo) => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          setEstado(ds.map((d, i) => ({
            pos: (VUELTAS - 1) * 10 + d,
            t: quieto ? 'none' : `transform ${dura(i)}s cubic-bezier(.12,.8,.18,1)`,
            gira: !quieto,
          })));
          ds.forEach((_, i) => setTimeout(() => {
            setEstado((x) => x.map((r, k) => (k === i ? { ...r, gira: false } : r)));
            alParar?.(i);
          }, dura(i) * 1000 - (quieto ? 0 : 120)));
          setTimeout(listo, dura(cifras - 1) * 1000 + 150);
        }));
      });
    },
  }), [cifras, quieto]);

  return (
    <div className={`ro ${grande ? 'ro-grande' : ''}`} aria-hidden="true">
      {estado.map((r, i) => (
        <div key={i} className={`ro-ventana ${r.gira ? 'ro-gira' : ''}`}>
          <div className="ro-tira" style={{ transform: `translateY(calc(${-r.pos} * var(--ro-alto)))`, transition: r.t }}>
            {TIRA.map((d, k) => <span key={k}>{d}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
});

// ── La maquinita de la suerte: tragamonedas de casino ──────────────────────
const FICHAS = [
  { n: 1, color: '#e9e4d8' },
  { n: 3, color: '#d83a3a' },
  { n: 5, color: '#2f7be0' },
  { n: 10, color: '#1fa463' },
  { n: 20, color: '#1c1c22' },
];

export function MaquinaCasino({ s, ocupados, yaElegidos, alCerrar, alElegir }) {
  const [cant, setCant] = useState(1);
  const [fase, setFase] = useState('lista'); // lista · girando · premio
  const [listos, setListos] = useState(null);
  const [jalon, setJalon] = useState(0); // 0–1, qué tanto está jalada la palanca
  const [mudo, setMudo] = useState(silenciado);
  const rodillos = useRef(null);
  const caja = useRef(null);
  const arrastre = useRef(null);
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
    if (fase === 'girando') return;
    setFase('girando'); setListos(null);
    sonidos.palanca();
    setJalon(1);
    setTimeout(() => setJalon(0), 380);
    const nums = libresAlAzar(cant);
    await new Promise((r) => setTimeout(r, 260));
    const parar = tictac();
    await rodillos.current.girar(nums[0], {
      alParar: (i) => { sonidos.para(); if (i === digitos(s) - 1) parar(); },
    });
    parar();
    sonidos.premio();
    setListos(nums);
    setFase('premio');
  };

  // la palanca se puede arrastrar hacia abajo (o solo tocar)
  const bajar = (ev) => {
    if (fase === 'girando') return;
    arrastre.current = { y: ev.clientY, movio: false };
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
  };
  const mover = (ev) => {
    const a = arrastre.current; if (!a) return;
    const dy = Math.max(0, ev.clientY - a.y);
    if (dy > 4) a.movio = true;
    setJalon(Math.min(1, dy / 120));
  };
  const soltar = () => {
    const a = arrastre.current; arrastre.current = null;
    if (!a) return;
    if (!a.movio || jalon > 0.5) jalar(); else setJalon(0);
  };

  const elegirFicha = (n) => { if (fase === 'girando') return; sonidos.ficha(); setCant(n); };
  const alternarSonido = () => { const v = !mudo; setMudo(v); setSilencio(v); if (!v) sonidos.ficha(); };

  const led = fase === 'girando' ? 'GIRANDO…' : listos ? (listos.length > 1 ? `¡SALIERON ${listos.length}!` : `¡SALIÓ EL ${fmtNum(s, listos[0])}!`) : `${cant} BOLETO${cant > 1 ? 'S' : ''} · JALA`;

  return (
    <div className="so-modal-fondo mq-fondo" onClick={alCerrar}>
      <div ref={caja} className={`mq mq-${fase}`} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Maquinita de la suerte">
        <div className="mq-herramientas">
          <button className="mq-redondo" onClick={alternarSonido} aria-label={mudo ? 'Activar sonido' : 'Silenciar'}>
            {mudo ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <button className="mq-redondo" onClick={alCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="mq-maquina">
          <div className="mq-corona">
            <span className="mq-focos mq-focos-arco" aria-hidden="true">
              {/* repartidos sobre el óvalo de la corona (posiciones en %) */}
              {Array.from({ length: 22 }, (_, i) => {
                const t = Math.PI - (i / 21) * Math.PI;
                return <i key={i} style={{ '--i': i, left: `${50 + 45 * Math.cos(t)}%`, top: `${94 - 80 * Math.sin(t)}%` }} />;
              })}
            </span>
            <p className="mq-titulo"><b>LA MAQUINITA</b><small>★ de la suerte ★</small></p>
          </div>

          <div className="mq-cuerpo">
            <span className="mq-columna" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</span>

            <div className="mq-centro">
              <div className="mq-ventana">
                <span className="mq-flecha mq-flecha-izq" aria-hidden="true" />
                <Rodillos ref={rodillos} cifras={digitos(s)} />
                <span className="mq-flecha mq-flecha-der" aria-hidden="true" />
                <span className="mq-pago" aria-hidden="true" />
                <span className="mq-vidrio" aria-hidden="true" />
              </div>

              <p className="mq-led" aria-live="polite"><span>{led}</span></p>

              <div className="mq-fichas" role="group" aria-label="Cuántos boletos">
                {FICHAS.map((f) => (
                  <button key={f.n} className="mq-ficha" style={{ '--ficha': f.color }} aria-pressed={cant === f.n} onClick={() => elegirFicha(f.n)} disabled={fase === 'girando'}>
                    <span>{f.n}</span>
                  </button>
                ))}
              </div>

              <button className="mq-girar" onClick={jalar} disabled={fase === 'girando'}>
                <span>{fase === 'girando' ? '···' : 'GIRAR'}</span>
              </button>
            </div>

            <span className="mq-columna" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ '--i': i + 3 }} />)}</span>
          </div>

          <div className="mq-base">
            <span className="mq-ranura" aria-hidden="true" />
          </div>

          <div className="mq-palanca-caja" aria-hidden="true">
            <button
              type="button" tabIndex={-1}
              className="mq-palanca" style={{ '--jalon': jalon }}
              onPointerDown={bajar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}
            >
              <i className="mq-vara" /><span className="mq-bola" />
            </button>
            <span className="mq-eje" />
          </div>

          {fase === 'premio' && (
            <div className="mq-monedas" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--x': `${(i * 53) % 100}%`, '--d': `${(i % 6) * 0.08}s`, '--r': `${(i * 47) % 360}deg` }} />)}
            </div>
          )}
        </div>

        {listos && (
          <div className="mq-boleto">
            <p className="mq-boleto-cabeza">TUS NÚMEROS · {s.titulo.toUpperCase()}</p>
            {listos.length === 1 ? (
              <p className="mq-boleto-principal"><b>{fmtNum(s, listos[0])}</b></p>
            ) : (
              <div className="mq-boleto-nums">
                {listos.slice(0, 30).map((n, i) => <b key={n} style={{ animationDelay: `${0.25 + i * 0.03}s` }}>{fmtNum(s, n)}</b>)}
                {listos.length > 30 && <b>+{listos.length - 30}</b>}
              </div>
            )}
            <div className="mq-acciones">
              <button className="so-boton so-boton-vidrio" onClick={jalar}>Otra vez</button>
              <button className="so-boton so-boton-oro" onClick={() => alElegir(listos)}><Check size={18} /> Quiero {listos.length > 1 ? 'estos' : 'este'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
