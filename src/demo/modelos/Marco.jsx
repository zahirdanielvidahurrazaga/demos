import { useEffect, useRef, useState } from 'react';
import { Bell, CalendarCheck, Coins, Inbox, PartyPopper, Search, Sparkles, UserRound } from 'lucide-react';
import { AGENCIA, useAgencia, modeloPorId, marcarLeidos, fechaLarga, hace } from './datos';
import { FotoModelo } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// MARCO DE LOS PANELES (booker y modelo) — la misma empresa que el sitio:
// menú lateral en negro con la marca, contenido en papel claro, barra de arriba
// con fecha, buscador y campana de avisos. Cada sección entra con transición.
// ─────────────────────────────────────────────────────────────────────────────

export const ICONO_AVISO = { solicitud: Inbox, modelo: UserRound, scouting: Sparkles, evento: PartyPopper, dinero: Coins };

// Una línea del feed: foto de la modelo si la hay, si no un ícono por tipo.
export function LineaAviso({ e, a }) {
  const m = a.mid && modeloPorId(e, a.mid);
  const Icon = ICONO_AVISO[a.tipo] || CalendarCheck;
  return (
    <div className="mo-aviso-linea">
      {m ? <FotoModelo m={m} className="mo-mini-redonda" style={{ width: 34, height: 34 }} /> : <span className={`mo-aviso-icono t-${a.tipo || 'otro'}`}><Icon size={15} /></span>}
      <span style={{ flex: 1, minWidth: 0 }}>{!a.leido && <i className="mo-aviso-punto" />}{a.texto}</span>
      <span className="mo-tenue" style={{ fontSize: '.72rem', whiteSpace: 'nowrap' }}>{hace(a.t)}</span>
    </div>
  );
}

// resultados: [{ k, titulo, detalle, m?, alElegir }]
function Buscador({ buscar, pista }) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  const input = useRef(null);
  const res = q.trim().length > 1 ? buscar(q.trim().toLowerCase()).slice(0, 7) : [];
  useEffect(() => {
    const tecla = (ev) => { if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); input.current?.focus(); } };
    const fuera = (ev) => { if (!ref.current?.contains(ev.target)) setAbierto(false); };
    window.addEventListener('keydown', tecla);
    document.addEventListener('mousedown', fuera);
    return () => { window.removeEventListener('keydown', tecla); document.removeEventListener('mousedown', fuera); };
  }, []);
  return (
    <div ref={ref} className="mo-buscador">
      <Search size={15} />
      <input ref={input} value={q} onChange={(ev) => { setQ(ev.target.value); setAbierto(true); }} onFocus={() => setAbierto(true)}
        onKeyDown={(ev) => { if (ev.key === 'Escape') { setAbierto(false); ev.currentTarget.blur(); } if (ev.key === 'Enter' && res[0]) { res[0].alElegir(); setQ(''); setAbierto(false); } }}
        placeholder={pista || 'Buscar modelo, marca o folio'} aria-label="Buscar" />
      <kbd>⌘K</kbd>
      {abierto && q.trim().length > 1 && (
        <div className="mo-desplegable">
          {res.map((r) => (
            <button key={r.k} type="button" className="mo-desplegable-fila" onClick={() => { r.alElegir(); setQ(''); setAbierto(false); }}>
              {r.m ? <FotoModelo m={r.m} className="mo-mini-redonda" style={{ width: 30, height: 30 }} /> : <span className="mo-aviso-icono t-solicitud"><Inbox size={14} /></span>}
              <span style={{ flex: 1, minWidth: 0 }}><b>{r.titulo}</b><small>{r.detalle}</small></span>
            </button>
          ))}
          {!res.length && <p className="mo-tenue" style={{ padding: '12px 14px', fontSize: '.84rem' }}>Nada con “{q}”.</p>}
        </div>
      )}
    </div>
  );
}

function Campana({ para }) {
  const e = useAgencia();
  const [abierta, setAbierta] = useState(false);
  const ref = useRef(null);
  const mios = e.avisos.filter((a) => a.para === para);
  const sinLeer = mios.filter((a) => !a.leido).length;
  useEffect(() => {
    const fuera = (ev) => { if (!ref.current?.contains(ev.target)) setAbierta(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="mo-campana" onClick={() => setAbierta(!abierta)} aria-label={`Avisos${sinLeer ? `, ${sinLeer} sin leer` : ''}`} aria-expanded={abierta}>
        <Bell size={17} />{sinLeer > 0 && <em>{sinLeer}</em>}
      </button>
      {abierta && (
        <div className="mo-desplegable mo-desplegable-der">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px 6px' }}>
            <span className="mo-eti">Avisos</span>
            {sinLeer > 0 && <button type="button" className="mo-tenue" style={{ fontSize: '.74rem' }} onClick={() => marcarLeidos(para)}>Marcar leídos</button>}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto', padding: '0 14px 8px' }}>
            {mios.slice(0, 12).map((a) => <LineaAviso key={a.id} e={e} a={a} />)}
            {!mios.length && <p className="mo-tenue" style={{ padding: '10px 0', fontSize: '.84rem' }}>Sin avisos.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Marco({ cabeza, secciones, sec, ir, pie, para, buscar, pista, quien, children }) {
  return (
    <div className="mo-panel mo-panel2">
      <aside className="mo-lado mo-lado-noche" aria-label="Secciones">
        <div className="mo-lado-pie" style={{ padding: '6px 12px 22px' }}>{cabeza}</div>
        {secciones.map(([id, t, Icon, n]) => (
          <button key={id} type="button" aria-current={sec === id ? 'page' : undefined} onClick={() => ir(id)}>
            <Icon size={17} /> {t} {n > 0 && <em>{n}</em>}
          </button>
        ))}
        <div className="mo-lado-pie" style={{ marginTop: 'auto', padding: 12, fontSize: '.76rem' }}>{pie}</div>
      </aside>
      <main className="mo-cuerpo">
        <div className="mo-arriba">
          <span className="mo-eti">{fechaLarga(Date.now())} · {AGENCIA.nombre}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Buscador buscar={buscar} pista={pista} />
            <Campana para={para} />
            {quien}
          </div>
        </div>
        <div key={sec} className="mo-entra">{children}</div>
      </main>
    </div>
  );
}
