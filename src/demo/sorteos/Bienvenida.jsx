import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { NEGOCIO, SORTEOS, pesos, resumen, useSorteos } from './datos';
import { CuentaRegresiva, useDialogo } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// Lo primero que ve el comprador: la pantalla de carga (como la de la
// cafetería: la marca se dibuja sola y el porcentaje sube) y luego el anuncio
// de la promoción, al estilo de los sitios de sorteos grandes. Las dos salen
// una vez por visita (sessionStorage); "Reiniciar la demo" las vuelve a sacar.
// El anuncio se arma con los datos del sorteo destacado: si cambian precio,
// paquetes o fecha, cambia solo.
// ─────────────────────────────────────────────────────────────────────────────

const LLAVE = 'demo_sorteos_bienvenida';
export const yaSeVio = () => { try { return sessionStorage.getItem(LLAVE) === '1'; } catch { return false; } };
const marcarVisto = () => { try { sessionStorage.setItem(LLAVE, '1'); } catch { /* sin almacenamiento */ } };
export const olvidarBienvenida = () => { try { sessionStorage.removeItem(LLAVE); } catch { /* */ } };

export function Carga({ alTerminar }) {
  const [n, setN] = useState(0);
  const [saliendo, setSaliendo] = useState(false);
  const fin = useRef(alTerminar);
  useEffect(() => { fin.current = alTerminar; }, [alTerminar]);
  useEffect(() => {
    const dura = 1900;
    const inicio = performance.now();
    let cuadro, espera;
    const paso = (ahora) => {
      const avance = Math.min(1, (ahora - inicio) / dura);
      setN(Math.round(100 * (1 - (1 - avance) ** 2)));
      if (avance < 1) cuadro = requestAnimationFrame(paso);
      else { setSaliendo(true); espera = setTimeout(() => fin.current(), 420); }
    };
    cuadro = requestAnimationFrame(paso);
    return () => { cancelAnimationFrame(cuadro); clearTimeout(espera); };
  }, []);
  return (
    <div className={`bv-carga ${saliendo ? 'bv-sale' : ''}`} role="status" aria-label={`Cargando ${n}%`}>
      <svg className="bv-estrella" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="44" pathLength="1" />
        <path d="M50 18 L59 40 L83 41 L64 56 L71 80 L50 66 L29 80 L36 56 L17 41 L41 40 Z" pathLength="1" />
      </svg>
      <p className="bv-marca">FORTUNA</p>
      <p className="bv-sub">sorteos</p>
      <div className="bv-barra"><i style={{ width: `${n}%` }} /></div>
      <p className="bv-pct">{n}%</p>
    </div>
  );
}

export function Promo({ alCerrar, alVer }) {
  const e = useSorteos();
  const s = SORTEOS[0];
  const r = resumen(e, s);
  const caja = useRef(null);
  useDialogo(caja, alCerrar);
  // el paquete que más ahorra
  const [cant, precio] = [...s.paquetes].sort((a, b) => (b[0] * s.precio - b[1]) - (a[0] * s.precio - a[1]))[0];
  const ahorro = cant * s.precio - precio;
  const dia = new Date(s.fecha).toLocaleDateString('es-MX', { weekday: 'long' });
  const ultimos = r.pct > 0.3;

  return (
    <div className="so-modal-fondo bv-fondo" onClick={alCerrar}>
      <div ref={caja} className="bv-promo" role="dialog" aria-modal="true" aria-label="Promoción" onClick={(ev) => ev.stopPropagation()}>
        <button className="bv-x" onClick={alCerrar} aria-label="Cerrar promoción"><X size={18} /></button>

        <div className="bv-foto">
          <img src={s.foto} alt={s.titulo} />
          {ultimos && (
            <div className="bv-sello" aria-label="Últimos boletos">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <defs><path id="bv-aro" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" /></defs>
                <text textLength="222" lengthAdjust="spacing"><textPath href="#bv-aro" textLength="222" lengthAdjust="spacing">ÚLTIMOS BOLETOS ★ ÚLTIMOS BOLETOS ★</textPath></text>
              </svg>
              <b>{Math.round(r.pct * 100)}%<small>vendido</small></b>
            </div>
          )}
        </div>

        <div className="bv-texto">
          <p className="bv-cuando">¡Este {dia} se juega!</p>
          <p className="bv-premio">{s.titulo}</p>
          <div className="bv-oferta">
            <span className="bv-cant">{cant} boletos</span>
            <span className="bv-por">por</span>
            <span className="bv-precio">{pesos(precio)}</span>
          </div>
          <p className="bv-ahorro">Ahorras {pesos(ahorro)} · boleto suelto a {pesos(s.precio)}</p>
          {s.bonos[0] && <p className="bv-bono">+ {s.bonos[0].detalle}</p>}
          <CuentaRegresiva hasta={s.fecha} chica />
          <button className="so-boton so-boton-oro bv-cta" onClick={alVer}>Aprovechar <ArrowRight size={18} /></button>
          <p className="bv-legal">Válido hasta agotar boletos. Se juega con la Lotería Nacional. {NEGOCIO.permiso}.</p>
        </div>
      </div>
    </div>
  );
}

// La secuencia completa: carga → promoción → sitio.
export function useBienvenida() {
  const [fase, setFase] = useState(() => (yaSeVio() ? null : 'carga'));
  return {
    fase,
    aPromo: () => setFase('promo'),
    cerrar: () => { marcarVisto(); setFase(null); },
  };
}
