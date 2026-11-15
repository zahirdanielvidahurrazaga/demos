import { useState } from 'react';
import { Banknote, Check, Clock, Download, LayoutDashboard, Megaphone, MessageCircle, Receipt, Search, ShieldCheck, Ticket, Trophy, Unlock, X } from 'lucide-react';
import {
  NEGOCIO, SORTEOS, aprobar, armarNumero, cobrosPorDia, contactosPromos, dineroDe, dineroGeneral, duenoDe, fmtJuego, fmtNum, liberar, oportunidadesDe, partirCifras, pesos, rechazar, resumen, setAuto, useSorteos,
} from './datos';
import { ESTADO_TXT, Progreso, Restante, fechaLarga, hora, wa } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// PANEL DEL VERIFICADOR (el dueño y su equipo): resumen en vivo, comprobantes
// por aprobar, apartados que vencen, buscador de boletos y el ganador.
// ─────────────────────────────────────────────────────────────────────────────

const SECCIONES = [
  { id: 'resumen', t: 'Resumen', Icon: LayoutDashboard },
  { id: 'dinero', t: 'Dinero', Icon: Banknote },
  { id: 'comprobantes', t: 'Comprobantes', Icon: Receipt },
  { id: 'apartados', t: 'Apartados', Icon: Clock },
  { id: 'boletos', t: 'Boletos', Icon: Ticket },
  { id: 'ganador', t: 'Ganador', Icon: Trophy },
];

export default function Panel() {
  const [sec, setSec] = useState('resumen');
  const e = useSorteos();
  const pendientes = Object.values(e.pedidos).filter((p) => p.estado === 'revision').length;

  return (
    <div className="so-panel">
      <nav className="so-panel-menu" aria-label="Secciones del panel">
        <p className="so-panel-marca"><b>FORTUNA</b><small>Panel</small></p>
        {SECCIONES.map(({ id, t, Icon }) => (
          <button key={id} aria-current={sec === id} onClick={() => setSec(id)}>
            <Icon size={18} /> <span>{t}</span>
            {id === 'comprobantes' && pendientes > 0 && <i>{pendientes}</i>}
          </button>
        ))}
      </nav>
      <main className="so-panel-cuerpo">
        {sec === 'resumen' && <Resumen ir={setSec} />}
        {sec === 'dinero' && <Dinero />}
        {sec === 'comprobantes' && <Comprobantes />}
        {sec === 'apartados' && <Apartados />}
        {sec === 'boletos' && <Boletos />}
        {sec === 'ganador' && <Ganador />}
      </main>
    </div>
  );
}

// Cada número lleva una línea que dice QUÉ es y qué hacer con él: el dueño no
// tiene por qué saber qué es un "apartado" o qué hace Banxico aquí.
function Kpi({ t, v, nota, alerta, onClick }) {
  const C = onClick ? 'button' : 'div';
  return (
    <C className={`so-kpi ${alerta ? 'so-kpi-alerta' : ''}`} onClick={onClick}>
      <span>{t}</span><b>{v}</b>{nota && <small>{nota}</small>}
    </C>
  );
}

function Resumen({ ir }) {
  const e = useSorteos();
  const totales = SORTEOS.map((s) => resumen(e, s));
  const g = dineroGeneral(e);
  const porCobrar = Object.values(e.pedidos).filter((p) => p.estado === 'apartado').reduce((t, p) => t + p.total, 0);
  const revisar = Object.values(e.pedidos).filter((p) => p.estado === 'revision').length;
  return (
    <>
      <h1 className="so-panel-h1">Hoy en {NEGOCIO.nombre}</h1>
      <div className="so-kpis">
        <Kpi t="Cobrado hoy" v={pesos(g.hoy)} nota={`Pagos confirmados hoy. En total llevas ${pesos(g.cobrado)} → ver Dinero`} onClick={() => ir('dinero')} />
        <Kpi t="Apartado sin pagar" v={pesos(porCobrar)} nota="Gente que eligió números pero no ha pagado. Si vence, los números se liberan." onClick={() => ir('apartados')} />
        <Kpi t="Comprobantes por revisar" v={revisar} alerta={revisar > 0}
          nota={revisar ? 'Pagos que el sistema no pudo confirmar solo. Necesitan tus ojos.' : 'Nada pendiente.'} onClick={() => ir('comprobantes')} />
        <Kpi t="Pagos que se confirmaron solos" v={e.autoHoy || 0} nota="Hoy. El sistema revisó la transferencia con Banxico y la aprobó sin que nadie la viera." />
      </div>
      <div className="so-panel-sorteos">
        {SORTEOS.map((s, i) => {
          const r = totales[i];
          return (
            <article key={s.id} className="so-panel-sorteo">
              <img src={s.foto} alt="" />
              <div>
                <h2>{s.titulo}</h2>
                <p className="so-dato-chico">Se juega {fechaLarga(s.fecha)} · {s.total.toLocaleString('es-MX')} boletos en total</p>
                <Progreso pct={r.pct} />
                <dl>
                  <div><dt>Pagados</dt><dd>{r.pagados.toLocaleString('es-MX')}</dd><small>ya juegan</small></div>
                  <div><dt>Apartados</dt><dd>{r.apartados.toLocaleString('es-MX')}</dd><small>esperan pago</small></div>
                  <div><dt>Libres</dt><dd>{r.libres.toLocaleString('es-MX')}</dd><small>se pueden vender</small></div>
                  <div><dt>Cobrado</dt><dd>{pesos(r.dinero)}</dd><small>ya en tu cuenta</small></div>
                </dl>
              </div>
            </article>
          );
        })}
      </div>
      <h2 className="so-panel-h2">En vivo</h2>
      <ul className="so-feed">
        {e.eventos.slice(0, 12).map((x) => (
          <li key={x.id} className={`so-feed-${x.tipo}`}><span>{hora(x.t)}</span>{x.texto}</li>
        ))}
        {e.eventos.length === 0 && <li>Esperando movimientos… (los compradores simulados aparecen en unos segundos)</li>}
      </ul>
    </>
  );
}

// ── DINERO ──────────────────────────────────────────────────────────────────
// Lo que un dueño de rifas pregunta: ¿cuánto llevo?, ¿ya cubrí el premio?,
// ¿cuánto me queda si vendo todo?, ¿a qué cuenta entró?
function Dinero() {
  const e = useSorteos();
  const g = dineroGeneral(e);
  const dias = cobrosPorDia(e, 7);
  const tope = Math.max(...dias.map((d) => d.total), 1);
  const porConfirmar = Object.values(e.pedidos).filter((p) => p.estado === 'revision').reduce((t, p) => t + p.total, 0);
  const nombreDia = (t) => new Date(t).toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');
  return (
    <>
      <h1 className="so-panel-h1">Dinero</h1>
      <p className="so-entrada">Lo cobrado es dinero que ya llegó a tus cuentas. Lo demás todavía puede cambiar.</p>
      <div className="so-kpis">
        <Kpi t="Cobrado en total" v={pesos(g.cobrado)} nota={`De ${g.compras.toLocaleString('es-MX')} compras · ${pesos(g.hoy)} hoy`} />
        <Kpi t="Por confirmar" v={pesos(porConfirmar)} nota="Ya mandaron comprobante; falta revisarlo. Casi seguro entra." />
        <Kpi t="Compra promedio" v={pesos(g.promedio)} nota="Lo que gasta una persona cada vez que compra. Los paquetes lo suben." />
      </div>

      <h2 className="so-panel-h2">¿Ya cubriste cada premio?</h2>
      <div className="so-dinero-sorteos">
        {SORTEOS.map((s) => {
          const d = dineroDe(e, s);
          const cubierto = d.cobrado >= s.costo;
          const pct = Math.min(1, d.cobrado / s.costo);
          return (
            <article key={s.id} className="so-dinero-sorteo">
              <header>
                <img src={s.foto} alt="" />
                <div><h3>{s.titulo}</h3><p className="so-dato-chico">El premio te cuesta {pesos(s.costo)}</p></div>
              </header>
              <div className={`so-cubre ${cubierto ? 'si' : ''}`}>
                <div className="so-cubre-barra"><i style={{ width: `${pct * 100}%` }} /></div>
                <p>{cubierto
                  ? <><Check size={16} /> Premio cubierto. Ya llevas <b>{pesos(d.ganancia)}</b> de ganancia.</>
                  : <>Te faltan <b>{pesos(d.faltaCubrir)}</b> para pagar el premio ({Math.round(pct * 100)}% cubierto).</>}</p>
              </div>
              <dl className="so-dinero-dl">
                <div><dt>Cobrado</dt><dd>{pesos(d.cobrado)}</dd><small>ya en tu cuenta</small></div>
                <div><dt>Por confirmar</dt><dd>{pesos(d.porConfirmar)}</dd><small>comprobante subido</small></div>
                <div><dt>Apartado</dt><dd>{pesos(d.apartado)}</dd><small>aún no pagan</small></div>
                <div><dt>Falta vender</dt><dd>{pesos(d.porVender)}</dd><small>boletos libres, aprox.</small></div>
              </dl>
              <p className={`so-final ${d.gananciaFinal >= 0 ? 'si' : 'no'}`}>
                Si vendes todos los boletos: entran <b>{pesos(d.siSeVendeTodo)}</b> → {d.gananciaFinal >= 0
                  ? <>ganancia aprox. de <b>{pesos(d.gananciaFinal)}</b></>
                  : <>te faltarían <b>{pesos(-d.gananciaFinal)}</b>: sube el precio o baja el premio</>}.
                <small>Cada boleto vendido te deja {pesos(d.porBoleto)} en promedio (con descuentos de paquete).</small>
              </p>
            </article>
          );
        })}
      </div>

      <div className="so-dinero-dos">
        <section>
          <h2 className="so-panel-h2">Cobrado por día</h2>
          <div className="so-dias" role="img" aria-label="Cobrado en los últimos 7 días">
            {dias.map((d, i) => (
              <div key={d.dia} className={i === dias.length - 1 ? 'hoy' : ''}>
                <small>{d.total ? pesos(d.total / 1000) + 'k' : '—'}</small>
                <i style={{ height: `${(d.total / tope) * 100}%` }} />
                <span>{i === dias.length - 1 ? 'hoy' : nombreDia(d.dia)}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="so-panel-h2">¿A dónde entró?</h2>
          <ul className="so-cuentas-lista">
            {NEGOCIO.cuentas.map((c, i) => (
              <li key={c.banco}><span><b>{c.banco}</b><small>CLABE …{c.clabe.replace(/\s/g, '').slice(-4)}</small></span><b>{pesos(g.porCuenta[i])}</b></li>
            ))}
          </ul>
          <h2 className="so-panel-h2">¿Cómo se confirmó?</h2>
          <ul className="so-cuentas-lista">
            <li><span><b>Solo, con Banxico</b><small>nadie tuvo que revisarlo</small></span><b>{pesos(g.solo)}</b></li>
            <li><span><b>A mano</b><small>lo aprobó alguien del equipo</small></span><b>{pesos(g.aMano)}</b></li>
          </ul>
        </section>
      </div>
      <p className="so-dato-chico">Costos de los premios de ejemplo. En el sistema real tú los capturas al crear el sorteo.</p>
    </>
  );
}

function Comprobantes() {
  const e = useSorteos();
  const [avisar, setAvisar] = useState(null);
  const lista = Object.values(e.pedidos).filter((p) => p.estado === 'revision').sort((a, b) => (b.simulado ? 0 : 1) - (a.simulado ? 0 : 1) || a.subido - b.subido);
  return (
    <>
      <h1 className="so-panel-h1">Comprobantes por revisar</h1>
      <label className="so-interruptor">
        <input type="checkbox" checked={!!e.auto} onChange={(ev) => setAuto(ev.target.checked)} />
        <span><b><ShieldCheck size={18} /> Comprobación automática con Banxico</b>
          <small>{e.auto ? `Encendida: las transferencias que cuadran se aprueban solas (${e.autoHoy || 0} hoy). Aquí solo llega lo que necesita ojos.` : 'Apagada: todos los comprobantes se revisan a mano.'}</small></span>
      </label>
      {avisar && (
        <div className="so-avisar">
          <p><Check size={18} /> Folio {avisar.folio} pagado. ¿Le avisas a {avisar.nombre}?</p>
          <a className="so-boton so-boton-verde so-boton-chico" target="_blank" rel="noreferrer"
            href={wa(avisar.tel, `¡Hola ${avisar.nombre}! Tu pago del folio ${avisar.folio} quedó confirmado. Tus boletos: ${avisar.numeros.map((n) => fmtNum(SORTEOS.find((s) => s.id === avisar.sorteo), n)).join(', ')}. ¡Mucha suerte! — ${NEGOCIO.nombre}`)}>
            <MessageCircle size={16} /> Avisar por WhatsApp
          </a>
          <button className="so-icono" onClick={() => setAvisar(null)} aria-label="Cerrar"><X size={18} /></button>
        </div>
      )}
      {lista.length === 0 && <p className="so-vacio">No hay comprobantes pendientes. Cuando un comprador suba el suyo, aparece aquí.</p>}
      <div className="so-comprobantes">
        {lista.map((p) => {
          const s = SORTEOS.find((x) => x.id === p.sorteo);
          return (
            <article key={p.folio} className="so-comp">
              <div className="so-comp-img">
                {p.comprobante?.img ? <img src={p.comprobante.img} alt={`Comprobante del folio ${p.folio}`} /> : <ComprobanteFalso p={p} />}
              </div>
              <div className="so-comp-datos">
                <p className="so-sello">{s.titulo} · Folio {p.folio}{!p.simulado && <em> · tuyo</em>}</p>
                <h3>{p.nombre} {p.apellidos}</h3>
                <p>{p.lugar} · WhatsApp {p.tel}</p>
                {p.motivo && <p className="so-motivo">Revisión manual: {p.motivo}</p>}
                <p className="so-comp-total">{pesos(p.total)} <span>{p.numeros.length} boleto{p.numeros.length > 1 ? 's' : ''}</span></p>
                <p className="so-comp-nums">{p.numeros.slice(0, 12).map((n) => fmtNum(s, n)).join(' · ')}{p.numeros.length > 12 ? ' …' : ''}</p>
                <div className="so-comp-acciones">
                  <button className="so-boton so-boton-verde" onClick={() => { aprobar(p.folio); setAvisar(p); }}><Check size={18} /> Aprobar</button>
                  <button className="so-boton so-boton-claro" onClick={() => rechazar(p.folio)}><X size={18} /> Rechazar</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

// comprobante dibujado para los compradores simulados
function ComprobanteFalso({ p }) {
  return (
    <div className="so-comp-falso">
      <b>Transferencia SPEI</b>
      <span>Enviada</span>
      <strong>{pesos(p.total)}</strong>
      <small>Concepto: {p.folio}</small>
      <small>Clave de rastreo: MBAN01{String(p.creado).slice(-10)}</small>
    </div>
  );
}

function Apartados() {
  const e = useSorteos();
  const lista = Object.values(e.pedidos).filter((p) => p.estado === 'apartado').sort((a, b) => a.vence - b.vence);
  return (
    <>
      <h1 className="so-panel-h1">Apartados sin pagar</h1>
      <p className="so-entrada">Se liberan solos al vencer. Antes, un recordatorio por WhatsApp suele cerrar la venta.</p>
      <div className="so-tabla-envoltura">
        <table className="so-tabla">
          <thead><tr><th>Folio</th><th>Cliente</th><th>Sorteo</th><th>Boletos</th><th>Total</th><th>Vence en</th><th /></tr></thead>
          <tbody>
            {lista.slice(0, 60).map((p) => {
              const s = SORTEOS.find((x) => x.id === p.sorteo);
              return (
                <tr key={p.folio}>
                  <td>{p.folio}</td>
                  <td><b>{p.nombre} {p.apellidos}</b><small>{p.tel}</small></td>
                  <td>{s.titulo}</td>
                  <td>{p.numeros.length}</td>
                  <td>{pesos(p.total)}</td>
                  <td><Restante hasta={p.vence} /></td>
                  <td className="so-tabla-acciones">
                    <a className="so-icono" title="Recordar por WhatsApp" target="_blank" rel="noreferrer"
                      href={wa(p.tel, `Hola ${p.nombre}, te recordamos que tu folio ${p.folio} (${p.numeros.length} boletos, ${pesos(p.total)}) sigue apartado. Sube tu comprobante antes de que se liberen. — ${NEGOCIO.nombre}`)}>
                      <MessageCircle size={17} />
                    </a>
                    <button className="so-icono" title="Liberar ahora" onClick={() => liberar(p.folio)}><Unlock size={17} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {lista.length > 60 && <p className="so-dato-chico">y {lista.length - 60} más…</p>}
    </>
  );
}

// Excel ejecuta como fórmula lo que empieza con = + - @: se antepone ' (revisión de Codex)
function descargar(nombre, filas) {
  const celda = (c) => { const t = String(c); return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t; };
  const csv = filas.map((r) => r.map((c) => `"${celda(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }));
  a.download = nombre;
  a.click();
}

function Boletos() {
  const e = useSorteos();
  const [sorteo, setSorteo] = useState(SORTEOS[0].id);
  const [q, setQ] = useState('');
  const s = SORTEOS.find((x) => x.id === sorteo);
  const n = q === '' ? null : Number(q);
  const folio = n == null ? null : e.boletos[sorteo][n];
  const p = folio ? e.pedidos[folio] : null;

  const exportar = () => {
    const filas = [['folio', 'numero', 'oportunidades', 'nombre', 'apellidos', 'whatsapp', 'estado', 'acepta promociones']];
    Object.entries(e.boletos[sorteo]).forEach(([num, f]) => {
      const x = e.pedidos[f];
      if (x.estado === 'pagado') filas.push([f, fmtNum(s, num), oportunidadesDe(s, Number(num)).join(' '), x.nombre, x.apellidos, x.tel, x.lugar, x.promos ? 'sí' : 'no']);
    });
    descargar(`boletos-pagados-${s.id}.csv`, filas);
  };

  const promos = contactosPromos(e);
  const exportarPromos = () => descargar(`contactos-promociones.csv`,
    [['nombre', 'apellidos', 'whatsapp', 'estado'], ...promos.map((x) => [x.nombre, x.apellidos, x.tel, x.lugar])]);

  return (
    <>
      <h1 className="so-panel-h1">Buscar un boleto</h1>
      <div className="so-verificar-campos">
        <select value={sorteo} onChange={(ev) => setSorteo(ev.target.value)}>{SORTEOS.map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}</select>
        <input inputMode="numeric" placeholder="Número" value={q} onChange={(ev) => setQ(ev.target.value.replace(/\D/g, '').slice(0, String(s.total - 1).length))} />
      </div>
      {n != null && n < s.total && (
        <div className="so-caja so-boleto-ficha">
          <p className="so-num-grande">{fmtNum(s, n)}</p>
          {p ? (
            <>
              <p><span className={`so-estado so-e-${p.estado}`}>{ESTADO_TXT[p.estado]}</span> · Folio {p.folio}</p>
              <p><b>{p.nombre} {p.apellidos}</b> · {p.lugar} · {p.tel}</p>
            </>
          ) : <p>Disponible</p>}
        </div>
      )}
      <button className="so-boton so-boton-claro" onClick={exportar}><Download size={17} /> Descargar lista de pagados (Excel)</button>
      <p className="so-dato-chico">La lista con números, oportunidades y nombres para la transmisión en vivo.</p>

      <h2 className="so-panel-h2">Contactos para promociones</h2>
      <div className="so-caja so-promos">
        <p><Megaphone size={20} /> <b>{promos.length.toLocaleString('es-MX')}</b> personas aceptaron que les mandes nuevos sorteos y promociones por WhatsApp.</p>
        <button className="so-boton so-boton-claro" onClick={exportarPromos}><Download size={17} /> Descargar contactos (Excel)</button>
        <p className="so-dato-chico">Solo salen quienes palomearon la casilla al apartar. A los demás no se les manda publicidad.</p>
      </div>
    </>
  );
}

function Ganador() {
  const e = useSorteos();
  const [sorteo, setSorteo] = useState(SORTEOS[0].id);
  const [segundo, setSegundo] = useState('');
  const [mayor, setMayor] = useState('');
  const s = SORTEOS.find((x) => x.id === sorteo);
  const listo = segundo.length >= 3 && mayor.length >= 3;
  // el mismo cálculo que la pantalla de transmisión (datos.js)
  const armado = listo ? armarNumero(s, segundo, mayor) : null;
  const dueno = armado ? duenoDe(e, s, armado.n) : null;
  const p = dueno?.pedido;
  const como = dueno?.via === 'oportunidad' ? `con la oportunidad extra de su boleto ${fmtNum(s, dueno.boleto)}` : dueno ? `boleto ${fmtNum(s, dueno.boleto)}` : '';
  const { a, b } = partirCifras(s);

  return (
    <>
      <h1 className="so-panel-h1">Sacar al ganador</h1>
      <p className="so-entrada">Escribe los resultados de la Lotería Nacional. El número se arma con las últimas {a} cifras del segundo lugar y las últimas {b} del premio mayor{s.oportunidades > 0 ? '; puede caer en un boleto o en una oportunidad extra' : ''}.</p>
      <div className="so-ganador-campos">
        <label>Sorteo<select value={sorteo} onChange={(ev) => setSorteo(ev.target.value)}>{SORTEOS.map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}</select></label>
        <label>Segundo lugar<input inputMode="numeric" value={segundo} onChange={(ev) => setSegundo(ev.target.value.replace(/\D/g, ''))} placeholder="Ej. 48271" /></label>
        <label>Premio mayor<input inputMode="numeric" value={mayor} onChange={(ev) => setMayor(ev.target.value.replace(/\D/g, ''))} placeholder="Ej. 07941" /></label>
      </div>
      {armado && (
        <div className={`so-caja so-ganador-res ${p?.estado === 'pagado' ? 'so-ganador-si' : ''}`}>
          <p className="so-sello">Número ganador</p>
          <p className="so-num-grande">{fmtJuego(s, armado.n)}</p>
          {p?.estado === 'pagado' ? (
            <>
              <p><Trophy size={20} /> <b>{p.nombre} {p.apellidos}</b> · {p.lugar} · {como}</p>
              <a className="so-boton so-boton-verde" target="_blank" rel="noreferrer"
                href={wa(p.tel, `¡${p.nombre}, ganaste ${s.titulo} ${como}! Comunícate con nosotros para entregarte tu premio. — ${NEGOCIO.nombre}`)}>
                <MessageCircle size={17} /> Avisarle al ganador
              </a>
            </>
          ) : p ? (
            <p>Ese número ({como}) estaba <b>apartado sin pagar</b>: según tus reglas, se vuelve a jugar o pasa al siguiente.</p>
          ) : (
            <p>Ese número <b>no se vendió</b>. Según tus reglas: se vuelve a jugar con el siguiente sorteo de la Lotería.</p>
          )}
        </div>
      )}
      <p className="so-dato-chico"><Search size={14} /> Prueba con cualquier par de números de 5 cifras.</p>
    </>
  );
}
