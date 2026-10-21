import { useRef, useState } from 'react';
import { Maximize2, Play, Shuffle, Trophy } from 'lucide-react';
import { SORTEOS, digitos, fmtNum, numeroGanador, resumen, useSorteos } from './datos';
import { fechaLarga } from './comun';
import { Rodillos } from './Maquina';

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA DE TRANSMISIÓN: lo que el dueño pone en su live de Facebook. Se
// escriben los resultados de la Lotería Nacional (o "ensayo" al azar), los
// rodillos se revelan uno por uno, despacio, y aparece el ganador. 16:9, con
// botón de pantalla completa para capturarla en OBS o compartir pantalla.
// ─────────────────────────────────────────────────────────────────────────────

// Cómo se arma el número, a la vista de quien ve el live: las cifras que
// cuentan de cada resultado de la Lotería van resaltadas en oro.
function Armado({ s, fuente }) {
  const d = digitos(s);
  const mitad = Math.ceil(d / 2);
  const corta = (txt, k) => { const t = String(txt).padStart(k, '0'); return [t.slice(0, -k), t.slice(-k)]; };
  const [a1, a2] = corta(fuente.segundo, d - mitad);
  const [b1, b2] = corta(fuente.mayor, mitad);
  return (
    <div className="tx-armado">
      <div className="tx-fuente"><span>Segundo lugar</span><b>{a1}<em>{a2}</em></b></div>
      <span className="tx-mas">+</span>
      <div className="tx-fuente"><span>Premio mayor</span><b>{b1}<em>{b2}</em></b></div>
      <span className="tx-mas">=</span>
      <div className="tx-fuente tx-fuente-total"><span>Número ganador</span><b><em>{a2}{b2}</em></b></div>
    </div>
  );
}

export default function Transmision() {
  const e = useSorteos();
  const [sorteo, setSorteo] = useState(SORTEOS[0].id);
  const [segundo, setSegundo] = useState('');
  const [mayor, setMayor] = useState('');
  const [fase, setFase] = useState('espera'); // espera · girando · ganador
  const [n, setN] = useState(null);
  const [fuente, setFuente] = useState(null); // los números de la Lotería con que se armó
  const rodillos = useRef(null);
  const escenario = useRef(null);
  const s = SORTEOS.find((x) => x.id === sorteo);
  const r = resumen(e, s);

  const revelar = async (num, de = null) => {
    if (fase === 'girando') return;
    setN(num); setFuente(de); setFase('girando');
    await rodillos.current.girar(num, { lento: true });
    setFase('ganador');
  };
  const conLoteria = () => {
    if (segundo.length < 3 || mayor.length < 3) return;
    revelar(numeroGanador(s, segundo, mayor), { segundo, mayor });
  };
  const ensayo = () => {
    // en el ensayo cae en un boleto pagado, para ver al ganador
    const pagados = Object.entries(e.boletos[sorteo]).filter(([, f]) => e.pedidos[f].estado === 'pagado');
    revelar(Number(pagados[Math.floor(Math.random() * pagados.length)][0]));
  };

  const folio = n != null ? e.boletos[sorteo][n] : null;
  const p = folio ? e.pedidos[folio] : null;
  const gano = p?.estado === 'pagado';

  return (
    <div className="tx-envoltura">
      <div className="tx-controles">
        <label className="tx-campo">Sorteo
          <select value={sorteo} onChange={(ev) => { setSorteo(ev.target.value); setFase('espera'); setN(null); setFuente(null); }} disabled={fase === 'girando'}>
            {SORTEOS.map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}
          </select>
        </label>
        <label className="tx-campo">Segundo lugar
          <input inputMode="numeric" placeholder="Ej. 48271" value={segundo} onChange={(ev) => setSegundo(ev.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="tx-campo">Premio mayor
          <input inputMode="numeric" placeholder="Ej. 07941" value={mayor} onChange={(ev) => setMayor(ev.target.value.replace(/\D/g, ''))} />
        </label>
        <button className="so-boton so-boton-oro so-boton-chico" onClick={conLoteria} disabled={fase === 'girando' || segundo.length < 3 || mayor.length < 3}><Play size={16} /> Revelar</button>
        <button className="so-boton so-boton-vidrio so-boton-chico" onClick={ensayo} disabled={fase === 'girando'}><Shuffle size={16} /> Ensayo</button>
        <button className="so-boton so-boton-vidrio so-boton-chico" onClick={() => escenario.current?.requestFullscreen?.()} aria-label="Pantalla completa"><Maximize2 size={16} /></button>
        <p className="tx-ayuda">Escribe los resultados oficiales de la Lotería Nacional de hoy. El número ganador se arma con las últimas {digitos(s) - Math.ceil(digitos(s) / 2)} cifras del segundo lugar y las últimas {Math.ceil(digitos(s) / 2)} del premio mayor.</p>
      </div>

      <div className={`tx tx-fase-${fase}`} ref={escenario}>
        <div className="tx-fondo" aria-hidden="true"><img src={s.foto} alt="" /></div>
        <header className="tx-cabeza">
          <span className="tx-marca"><i>★</i> FORTUNA</span>
          <span className="tx-vivo"><i /> EN VIVO</span>
        </header>

        <div className="tx-centro">
          <p className="tx-sorteo">{s.titulo}</p>
          <p className="tx-fecha">Lotería Nacional · {fechaLarga(s.fecha)}</p>
          {fuente && <Armado s={s} fuente={fuente} />}
          {!fuente && n != null && <p className="tx-ensayo">Ensayo · número al azar</p>}
          <div className="tx-rodillos">
            <Rodillos ref={rodillos} cifras={digitos(s)} grande />
          </div>
          <div className="tx-ganador" aria-live="polite">
            {fase === 'ganador' && (gano ? (
              <>
                <p className="tx-gano"><Trophy size={30} /> ¡TENEMOS GANADOR!</p>
                <p className="tx-nombre">{p.nombre} {p.apellidos.charAt(0)}.</p>
                <p className="tx-datos">{p.lugar} · boleto {fmtNum(s, n)} · folio {p.folio}</p>
              </>
            ) : (
              <>
                <p className="tx-gano tx-gano-no">Número {fmtNum(s, n)}</p>
                <p className="tx-datos">{p ? 'Estaba apartado sin pagar' : 'No se vendió'}: se juega de nuevo con el siguiente resultado.</p>
              </>
            ))}
          </div>
        </div>

        <footer className="tx-pie">
          <span>{r.pagados.toLocaleString('es-MX')} boletos participando</span>
          <span>sorteosfortuna.mx · verifica tu boleto</span>
        </footer>
        {fase === 'ganador' && gano && <div className="so-confeti tx-confeti" aria-hidden="true">{Array.from({ length: 40 }, (_, i) => <i key={i} />)}</div>}
      </div>
    </div>
  );
}
