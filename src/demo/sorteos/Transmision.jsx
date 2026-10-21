import { useRef, useState } from 'react';
import { Maximize2, Play, Shuffle, Trophy } from 'lucide-react';
import {
  SORTEOS, armarNumero, cifrasJuego, duenoDe, fmtJuego, fmtNum, oportunidadesDe, partirCifras, resultadosPara, resumen, useSorteos,
} from './datos';
import { fechaLarga } from './comun';
import { Rodillos } from './Maquina';

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA DE TRANSMISIÓN: lo que el dueño pone en su live de Facebook. Se
// escriben los resultados de la Lotería Nacional (o "ensayo" de práctica), los
// rodillos se revelan uno por uno, despacio, y aparece el ganador. 16:9, con
// botón de pantalla completa para capturarla en OBS o compartir pantalla.
// El número sale de `armarNumero` y el dueño de `duenoDe` (datos.js): lo mismo
// que usa el panel. Lo que se ve armado es exactamente lo que juega.
// ─────────────────────────────────────────────────────────────────────────────

// Cómo se arma el número, a la vista de quien ve el live: las cifras que
// cuentan de cada resultado de la Lotería van resaltadas en oro.
function Armado({ s, armado, ensayo }) {
  return (
    <div className="tx-armado">
      {ensayo && <span className="tx-armado-ensayo">Resultados de práctica</span>}
      <div className="tx-fuente"><span>Segundo lugar</span><b>{armado.a1}<em>{armado.a2}</em></b></div>
      <span className="tx-mas">+</span>
      <div className="tx-fuente"><span>Premio mayor</span><b>{armado.b1}<em>{armado.b2}</em></b></div>
      <span className="tx-mas">=</span>
      <div className="tx-fuente tx-fuente-total"><span>Número ganador</span><b><em>{fmtJuego(s, armado.n)}</em></b></div>
    </div>
  );
}

export default function Transmision() {
  const e = useSorteos();
  const [sorteo, setSorteo] = useState(SORTEOS[0].id);
  const [segundo, setSegundo] = useState('');
  const [mayor, setMayor] = useState('');
  const [fase, setFase] = useState('espera'); // espera · girando · ganador
  const [armado, setArmado] = useState(null); // { a1, a2, b1, b2, n, ensayo }
  const rodillos = useRef(null);
  const escenario = useRef(null);
  const s = SORTEOS.find((x) => x.id === sorteo);
  const r = resumen(e, s);
  const { a: cifrasA, b: cifrasB } = partirCifras(s);

  const revelar = async (res, ensayo = false) => {
    if (fase === 'girando') return;
    setArmado({ ...res, ensayo }); setFase('girando');
    await rodillos.current.girar(res.n, { lento: true });
    setFase('ganador');
  };
  const conLoteria = () => {
    if (segundo.length < 3 || mayor.length < 3) return;
    revelar(armarNumero(s, segundo, mayor));
  };
  // El ensayo hace lo mismo que el sorteo real: inventa resultados de lotería
  // de práctica que caen en un boleto pagado (a veces en su oportunidad extra)
  // y los arma igual, pero toda la pantalla dice "ensayo".
  const ensayo = () => {
    const pagados = Object.entries(e.boletos[sorteo]).filter(([, f]) => e.pedidos[f].estado === 'pagado');
    const boleto = Number(pagados[Math.floor(Math.random() * pagados.length)][0]);
    const ops = oportunidadesDe(s, boleto);
    const n = ops.length && Math.random() < 0.35 ? ops[Math.floor(Math.random() * ops.length)] : boleto;
    const { segundo: sg, mayor: my } = resultadosPara(s, n);
    revelar(armarNumero(s, sg, my), true);
  };

  const esEnsayo = !!armado?.ensayo;
  const dueno = armado ? duenoDe(e, s, armado.n) : null;
  const p = dueno?.pedido;
  const gano = p?.estado === 'pagado';

  return (
    <div className="tx-envoltura">
      <div className="tx-controles">
        <label className="tx-campo">Sorteo
          <select value={sorteo} onChange={(ev) => { setSorteo(ev.target.value); setFase('espera'); setArmado(null); }} disabled={fase === 'girando'}>
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
        <p className="tx-ayuda">
          Escribe los resultados oficiales de la Lotería Nacional de hoy. El número ganador se arma con las últimas {cifrasA} cifras del segundo lugar y las últimas {cifrasB} del premio mayor
          {s.oportunidades > 0 ? ', y puede caer en un boleto o en la oportunidad extra de alguien.' : '.'}
        </p>
      </div>

      <div className={`tx tx-fase-${fase} ${esEnsayo ? 'tx-es-ensayo' : ''}`} ref={escenario}>
        <div className="tx-fondo" aria-hidden="true"><img src={s.foto} alt="" /></div>
        <header className="tx-cabeza">
          <span className="tx-marca"><i>★</i> FORTUNA</span>
          {esEnsayo
            ? <span className="tx-vivo tx-vivo-ensayo"><i /> ENSAYO</span>
            : <span className="tx-vivo"><i /> EN VIVO</span>}
        </header>

        <div className="tx-centro">
          <p className="tx-sorteo">{s.titulo}</p>
          <p className="tx-fecha">Lotería Nacional · {fechaLarga(s.fecha)}</p>
          {armado && <Armado s={s} armado={armado} ensayo={esEnsayo} />}
          <div className="tx-rodillos">
            <Rodillos key={s.id} ref={rodillos} cifras={cifrasJuego(s)} grande />
          </div>
          <div className="tx-ganador" aria-live="polite">
            {fase === 'ganador' && (gano ? (
              <>
                <p className="tx-gano"><Trophy size={30} /> {esEnsayo ? 'GANADOR DE ENSAYO' : '¡TENEMOS GANADOR!'}</p>
                <p className="tx-nombre">{p.nombre} {p.apellidos.charAt(0)}.</p>
                <p className="tx-datos">
                  {p.lugar} · {dueno.via === 'oportunidad'
                    ? `con la oportunidad extra de su boleto ${fmtNum(s, dueno.boleto)}`
                    : `boleto ${fmtNum(s, dueno.boleto)}`} · folio {p.folio}
                </p>
                {esEnsayo && <p className="tx-ensayo">Práctica: este resultado no cuenta</p>}
              </>
            ) : (
              <>
                <p className="tx-gano tx-gano-no">Número {fmtJuego(s, armado.n)}</p>
                <p className="tx-datos">{p ? 'Estaba apartado sin pagar' : 'No se vendió'}: se juega de nuevo con el siguiente resultado.</p>
              </>
            ))}
          </div>
        </div>

        <footer className="tx-pie">
          <span>{r.pagados.toLocaleString('es-MX')} boletos participando</span>
          <span>sorteosfortuna.mx · verifica tu boleto</span>
        </footer>
        {fase === 'ganador' && gano && <div className="so-confeti tx-confeti" aria-hidden="true">{Array.from({ length: 40 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.13}s` }} />)}</div>}
      </div>
    </div>
  );
}
