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

export default function Transmision() {
  const e = useSorteos();
  const [sorteo, setSorteo] = useState(SORTEOS[0].id);
  const [segundo, setSegundo] = useState('');
  const [mayor, setMayor] = useState('');
  const [fase, setFase] = useState('espera'); // espera · girando · ganador
  const [n, setN] = useState(null);
  const rodillos = useRef(null);
  const escenario = useRef(null);
  const s = SORTEOS.find((x) => x.id === sorteo);
  const r = resumen(e, s);

  const revelar = async (num) => {
    if (fase === 'girando') return;
    setN(num); setFase('girando');
    await rodillos.current.girar(num, { lento: true });
    setFase('ganador');
  };
  const conLoteria = () => {
    if (segundo.length < 3 || mayor.length < 3) return;
    revelar(numeroGanador(s, segundo, mayor));
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
        <select value={sorteo} onChange={(ev) => { setSorteo(ev.target.value); setFase('espera'); setN(null); }} disabled={fase === 'girando'}>
          {SORTEOS.map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}
        </select>
        <input inputMode="numeric" placeholder="Segundo lugar" value={segundo} onChange={(ev) => setSegundo(ev.target.value.replace(/\D/g, ''))} />
        <input inputMode="numeric" placeholder="Premio mayor" value={mayor} onChange={(ev) => setMayor(ev.target.value.replace(/\D/g, ''))} />
        <button className="so-boton so-boton-oro so-boton-chico" onClick={conLoteria} disabled={fase === 'girando' || segundo.length < 3 || mayor.length < 3}><Play size={16} /> Revelar</button>
        <button className="so-boton so-boton-vidrio so-boton-chico" onClick={ensayo} disabled={fase === 'girando'}><Shuffle size={16} /> Ensayo</button>
        <button className="so-boton so-boton-vidrio so-boton-chico" onClick={() => escenario.current?.requestFullscreen?.()} aria-label="Pantalla completa"><Maximize2 size={16} /></button>
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
