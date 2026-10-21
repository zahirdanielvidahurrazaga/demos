import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Dices, Search, ShieldCheck, Ticket, Trophy, Upload, X } from 'lucide-react';
import {
  ESTADOS, GANADORES, HORAS_APARTADO, NEGOCIO, SORTEOS,
  apartar, buscarPorTelefono, claveRastreo, fmtNum, fmtOp, oportunidadesDe, pesos, precioDe, resumen, subirComprobante, useSorteos, verificarAuto,
} from './datos';
import { CuentaRegresiva, ESTADO_TXT, Progreso, Restante, fechaLarga, hora, miniatura } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// EL SITIO PÚBLICO (rol Comprador). Navegación interna por estado: inicio,
// sorteo, pago de un folio, verificar boleto, mis boletos, preguntas.
// ─────────────────────────────────────────────────────────────────────────────

export default function Sitio() {
  const [vista, setVista] = useState({ v: 'inicio' });
  const ir = (v) => { setVista(v); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const e = useSorteos();

  return (
    <div className="so-sitio">
      <header className="so-cabecera">
        <button className="so-logo" onClick={() => ir({ v: 'inicio' })}>
          <span className="so-logo-trebol">★</span>
          <span><b>FORTUNA</b><small>sorteos</small></span>
        </button>
        <nav className="so-nav">
          <button onClick={() => ir({ v: 'inicio' })} aria-current={vista.v === 'inicio'}>Sorteos</button>
          <button onClick={() => ir({ v: 'verificar' })} aria-current={vista.v === 'verificar'}>Verificar boleto</button>
          <button onClick={() => ir({ v: 'faq' })} aria-current={vista.v === 'faq'}>Preguntas</button>
        </nav>
        <button className="so-mis" onClick={() => ir({ v: 'mis' })}>
          <Ticket size={17} /> <span>Mis boletos</span>
          {e.misFolios.length > 0 && <i>{e.misFolios.length}</i>}
        </button>
      </header>

      {vista.v === 'inicio' && <Inicio ir={ir} />}
      {vista.v === 'sorteo' && <Sorteo id={vista.id} ir={ir} />}
      {vista.v === 'pago' && <Pago folio={vista.folio} ir={ir} />}
      {vista.v === 'verificar' && <Verificar ir={ir} />}
      {vista.v === 'mis' && <Mis ir={ir} />}
      {vista.v === 'faq' && <Preguntas />}

      <Ticker />
      <footer className="so-pie">
        <p><b>{NEGOCIO.nombre}</b> · {NEGOCIO.lema}</p>
        <p>{NEGOCIO.permiso} · Los sorteos se juegan con los resultados de la Lotería Nacional.</p>
        <p className="so-pie-chico">Aviso de privacidad · Términos y condiciones</p>
      </footer>
    </div>
  );
}

// ── Inicio ──────────────────────────────────────────────────────────────────
function Inicio({ ir }) {
  const e = useSorteos();
  const [destacado, ...otros] = SORTEOS;
  const r = resumen(e, destacado);
  return (
    <main>
      <section className="so-hero">
        <img src={destacado.foto} alt={destacado.titulo} />
        <div className="so-hero-velo" />
        <div className="so-hero-texto">
          <p className="so-sello">Sorteo destacado · {fechaLarga(destacado.fecha)}</p>
          <h1>{destacado.titulo}</h1>
          <p className="so-hero-sub">{destacado.subtitulo} · Boleto a {pesos(destacado.precio)}</p>
          <CuentaRegresiva hasta={destacado.fecha} />
          <Progreso pct={r.pct} />
          <button className="so-boton so-boton-oro" onClick={() => ir({ v: 'sorteo', id: destacado.id })}>
            <Ticket size={19} /> Elegir mis boletos
          </button>
        </div>
      </section>

      <section className="so-seccion">
        <h2 className="so-h2">Sorteos activos</h2>
        <div className="so-tarjetas">
          {SORTEOS.map((s) => <TarjetaSorteo key={s.id} s={s} ir={ir} />)}
        </div>
      </section>

      <section className="so-seccion">
        <h2 className="so-h2">Así de fácil</h2>
        <ol className="so-pasos">
          <li><b>1</b><strong>Elige tus números</strong><span>Tú escoges o deja que la maquinita escoja por ti.</span></li>
          <li><b>2</b><strong>Apártalos</strong><span>Con tu WhatsApp. Te los guardamos {HORAS_APARTADO} horas.</span></li>
          <li><b>3</b><strong>Paga y sube tu comprobante</strong><span>Transferencia o depósito; subes la foto aquí mismo.</span></li>
          <li><b>4</b><strong>Listo, ya participas</strong><span>Verificamos tu pago y tu boleto queda pagado. Lo checas cuando quieras.</span></li>
        </ol>
      </section>

      <section className="so-seccion">
        <h2 className="so-h2"><Trophy size={26} /> Últimos ganadores</h2>
        <div className="so-ganadores">
          {GANADORES.map((g) => (
            <article key={g.numero} className="so-ganador">
              <img src={g.foto} alt="" />
              <div>
                <p className="so-ganador-premio">{g.premio}</p>
                <p><b>{g.nombre}</b> · {g.lugar}</p>
                <p>Boleto <b className="so-num-oro">{g.numero}</b> · {fechaLarga(g.fecha)}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="so-confianza"><ShieldCheck size={18} /> Todos los sorteos se juegan con la Lotería Nacional y se transmiten en vivo por Facebook.</p>
      </section>
      {otros.length === 0 && null}
    </main>
  );
}

function TarjetaSorteo({ s, ir }) {
  const e = useSorteos();
  const r = resumen(e, s);
  return (
    <article className="so-tarjeta">
      <button className="so-tarjeta-foto" onClick={() => ir({ v: 'sorteo', id: s.id })}>
        <img src={s.foto} alt={s.titulo} loading="lazy" />
        <span className="so-chip-fecha">{fechaLarga(s.fecha)}</span>
      </button>
      <div className="so-tarjeta-cuerpo">
        <h3>{s.titulo}</h3>
        <p>{s.subtitulo}</p>
        <Progreso pct={r.pct} />
        <div className="so-tarjeta-acciones">
          <span className="so-precio">{pesos(s.precio)} <small>por boleto</small></span>
          <button className="so-boton so-boton-oro so-boton-chico" onClick={() => ir({ v: 'sorteo', id: s.id })}>Ver boletos</button>
        </div>
      </div>
    </article>
  );
}

// ── Página del sorteo: elegir números ───────────────────────────────────────
const BLOQUE = 500;

function Sorteo({ id, ir }) {
  const s = SORTEOS.find((x) => x.id === id);
  const e = useSorteos();
  const ocupados = e.boletos[s.id];
  const r = resumen(e, s);
  const [sel, setSel] = useState([]);
  const [bloque, setBloque] = useState(0);
  const [soloLibres, setSoloLibres] = useState(false);
  const [modo, setModo] = useState('termina');
  const [busca, setBusca] = useState('');
  const [maquina, setMaquina] = useState(null);
  const [apartando, setApartando] = useState(false);
  const bloques = Math.ceil(s.total / BLOQUE);

  // si alguien más aparta uno de mis seleccionados, se quita solo
  useEffect(() => { setSel((x) => x.filter((n) => ocupados[n] == null)); }, [ocupados]);

  const alternar = (n) => setSel((x) => (x.includes(n) ? x.filter((y) => y !== n) : [...x, n]));

  const visibles = useMemo(() => {
    const q = busca.replace(/\D/g, '');
    let lista;
    if (q) {
      lista = [];
      for (let n = 0; n < s.total && lista.length < 300; n++) {
        const t = fmtNum(s, n);
        if (modo === 'termina' ? t.endsWith(q) : modo === 'empieza' ? t.startsWith(q) : modo === 'igual' ? t === q.padStart(t.length, '0') : t.includes(q)) lista.push(n);
      }
    } else {
      lista = Array.from({ length: Math.min(BLOQUE, s.total - bloque * BLOQUE) }, (_, i) => bloque * BLOQUE + i);
    }
    return soloLibres ? lista.filter((n) => ocupados[n] == null) : lista;
  }, [busca, modo, bloque, soloLibres, ocupados, s]);

  const total = precioDe(s, sel.length);
  const sinPaquete = sel.length * s.precio;

  return (
    <main className="so-sorteo">
      <section className="so-sorteo-cabeza">
        <img src={s.foto} alt={s.titulo} />
        <div>
          <button className="so-volver" onClick={() => ir({ v: 'inicio' })}>← Todos los sorteos</button>
          <h1>{s.titulo}</h1>
          <p className="so-hero-sub">{s.subtitulo}</p>
          <p className="so-sello">Se juega el {fechaLarga(s.fecha)} · {hora(s.fecha)}</p>
          <CuentaRegresiva hasta={s.fecha} chica />
          <Progreso pct={r.pct} />
          <p className="so-dato-chico">{r.libres.toLocaleString('es-MX')} boletos disponibles de {s.total.toLocaleString('es-MX')}</p>
        </div>
      </section>

      <section className="so-sorteo-info">
        <div className="so-caja">
          <h2 className="so-h3">Precios</h2>
          <ul className="so-paquetes">
            {s.paquetes.map(([c, p]) => (
              <li key={c}><b>{c} boleto{c > 1 ? 's' : ''}</b><span>{pesos(p)}</span>{c > 1 && p < c * s.precio && <em>ahorras {pesos(c * s.precio - p)}</em>}</li>
            ))}
          </ul>
        </div>
        <div className="so-caja">
          <h2 className="so-h3">Cómo se juega</h2>
          <p>Con la <b>Lotería Nacional</b> del {fechaLarga(s.fecha)}: las últimas cifras del segundo lugar y del premio mayor forman el número ganador.</p>
          {s.oportunidades > 0 && <p>Cada boleto trae <b>{s.oportunidades} oportunidad{s.oportunidades > 1 ? 'es' : ''} extra</b>: más números jugando por el mismo precio.</p>}
          {s.bonos.map((b) => <p key={b.titulo} className="so-bono"><b>{b.titulo}:</b> {b.detalle}</p>)}
        </div>
      </section>

      <section className="so-elegir">
        <h2 className="so-h2">Elige tus números</h2>
        <div className="so-herramientas">
          <div className="so-buscador">
            <select value={modo} onChange={(ev) => setModo(ev.target.value)} aria-label="Cómo buscar">
              <option value="termina">Termina con</option>
              <option value="empieza">Empieza con</option>
              <option value="contiene">Contiene</option>
              <option value="igual">Igual a</option>
            </select>
            <input inputMode="numeric" placeholder="Tu número de la suerte" value={busca} onChange={(ev) => setBusca(ev.target.value.replace(/\D/g, '').slice(0, String(s.total).length))} />
            {busca ? <button onClick={() => setBusca('')} aria-label="Borrar búsqueda"><X size={18} /></button> : <Search size={18} />}
          </div>
          <button className="so-boton so-boton-maquina" onClick={() => setMaquina(true)}><Dices size={19} /> Maquinita de la suerte</button>
          <label className="so-check"><input type="checkbox" checked={soloLibres} onChange={(ev) => setSoloLibres(ev.target.checked)} /> Solo disponibles</label>
        </div>

        {!busca && (
          <div className="so-bloques" role="tablist" aria-label="Bloques de números">
            {Array.from({ length: bloques }, (_, b) => (
              <button key={b} role="tab" aria-selected={bloque === b} onClick={() => setBloque(b)}>
                {fmtNum(s, b * BLOQUE)}–{fmtNum(s, Math.min(s.total - 1, (b + 1) * BLOQUE - 1))}
              </button>
            ))}
          </div>
        )}

        <div className="so-leyenda">
          <span><i className="so-l-libre" /> Disponible</span>
          <span><i className="so-l-apartado" /> Apartado</span>
          <span><i className="so-l-pagado" /> Vendido</span>
          <span><i className="so-l-mio" /> Tu selección</span>
        </div>

        <div className="so-cuadricula">
          {visibles.map((n) => {
            const folio = ocupados[n];
            const est = folio == null ? 'libre' : e.pedidos[folio]?.estado === 'pagado' ? 'pagado' : 'apartado';
            const mio = sel.includes(n);
            return (
              <button key={n} className={`so-boleto so-b-${mio ? 'mio' : est}`} disabled={est !== 'libre'} onClick={() => alternar(n)} aria-pressed={mio}>
                {fmtNum(s, n)}
              </button>
            );
          })}
          {visibles.length === 0 && <p className="so-vacio">No hay números con esa búsqueda.</p>}
        </div>
      </section>

      {sel.length > 0 && (
        <div className="so-carrito">
          <div className="so-carrito-nums">
            {sel.slice(0, 40).map((n) => (
              <button key={n} onClick={() => alternar(n)} aria-label={`Quitar ${fmtNum(s, n)}`}>{fmtNum(s, n)} <X size={12} /></button>
            ))}
            {sel.length > 40 && <span>+{sel.length - 40}</span>}
          </div>
          {s.oportunidades > 0 && (
            <p className="so-carrito-op">+{sel.length * s.oportunidades} oportunidades extra: {oportunidadesDe(s, sel[0]).map((o) => fmtOp(s, o)).join(', ')}{sel.length > 1 ? '…' : ''}</p>
          )}
          <div className="so-carrito-total">
            <div>
              <b>{sel.length} boleto{sel.length > 1 ? 's' : ''}</b>
              <span>{pesos(total)}{total < sinPaquete && <s>{pesos(sinPaquete)}</s>}</span>
            </div>
            <button className="so-boton so-boton-oro" onClick={() => setApartando(true)}>Apartar</button>
          </div>
        </div>
      )}

      {maquina && (
        <Maquinita s={s} ocupados={ocupados} yaElegidos={sel}
          alCerrar={() => setMaquina(null)}
          alElegir={(nums) => { setSel((x) => [...new Set([...x, ...nums])]); setMaquina(null); }} />
      )}
      {apartando && (
        <Apartar s={s} numeros={sel} total={total} alCerrar={() => setApartando(false)}
          alListo={(folio) => { setApartando(false); setSel([]); ir({ v: 'pago', folio }); }} />
      )}
    </main>
  );
}

// ── Maquinita de la suerte ──────────────────────────────────────────────────
function Maquinita({ s, ocupados, yaElegidos, alCerrar, alElegir }) {
  const [cant, setCant] = useState(5);
  const [rodando, setRodando] = useState(false);
  const [vista, setVista] = useState([]);
  const [listos, setListos] = useState(null);

  const libresAlAzar = (k) => {
    const out = new Set();
    for (let i = 0; i < k * 40 && out.size < k; i++) {
      const n = Math.floor(Math.random() * s.total);
      if (ocupados[n] == null && !yaElegidos.includes(n)) out.add(n);
    }
    return [...out];
  };

  const girar = () => {
    setRodando(true); setListos(null);
    let vueltas = 0;
    const id = setInterval(() => {
      setVista(Array.from({ length: Math.min(cant, 10) }, () => Math.floor(Math.random() * s.total)));
      if (++vueltas > 16) {
        clearInterval(id);
        const final = libresAlAzar(cant);
        setVista(final.slice(0, 10)); setListos(final); setRodando(false);
      }
    }, 80);
  };

  return (
    <div className="so-modal-fondo" onClick={alCerrar}>
      <div className="so-modal so-maquina" onClick={(ev) => ev.stopPropagation()}>
        <button className="so-modal-x" onClick={alCerrar} aria-label="Cerrar"><X size={20} /></button>
        <p className="so-sello">Maquinita de la suerte</p>
        <h2>¿Cuántos boletos quieres?</h2>
        <div className="so-cantidades">
          {[1, 3, 5, 10, 20, 50].map((c) => (
            <button key={c} aria-pressed={cant === c} onClick={() => setCant(c)}>{c}</button>
          ))}
        </div>
        <div className={`so-rodillos ${rodando ? 'so-rodando' : ''}`}>
          {(vista.length ? vista : Array.from({ length: Math.min(cant, 10) }, () => null)).map((n, i) => (
            <span key={i}>{n == null ? '?'.repeat(String(s.total - 1).length) : fmtNum(s, n)}</span>
          ))}
          {listos && listos.length > 10 && <span className="so-rodillo-mas">+{listos.length - 10}</span>}
        </div>
        {listos ? (
          <div className="so-maquina-acciones">
            <button className="so-boton so-boton-claro" onClick={girar}>Otra vez</button>
            <button className="so-boton so-boton-oro" onClick={() => alElegir(listos)}><Check size={18} /> Quiero estos</button>
          </div>
        ) : (
          <button className="so-boton so-boton-oro so-boton-ancho" disabled={rodando} onClick={girar}><Dices size={19} /> {rodando ? 'Girando…' : '¡Girar!'}</button>
        )}
      </div>
    </div>
  );
}

// ── Apartar ─────────────────────────────────────────────────────────────────
function Apartar({ s, numeros, total, alCerrar, alListo }) {
  const [d, setD] = useState({ tel: '', nombre: '', apellidos: '', lugar: 'Puebla' });
  const [error, setError] = useState('');
  const poner = (k) => (ev) => setD((x) => ({ ...x, [k]: ev.target.value }));
  const enviar = (ev) => {
    ev.preventDefault();
    const tel = d.tel.replace(/\D/g, '');
    if (tel.length !== 10) return setError('El WhatsApp debe tener 10 dígitos.');
    if (!d.nombre.trim() || !d.apellidos.trim()) return setError('Escribe tu nombre y apellidos.');
    const folio = apartar(s.id, numeros, { ...d, tel, nombre: d.nombre.trim(), apellidos: d.apellidos.trim() });
    if (!folio) return setError('Alguien más acaba de apartar esos números. Elige otros.');
    alListo(folio);
  };
  return (
    <div className="so-modal-fondo" onClick={alCerrar}>
      <form className="so-modal" onClick={(ev) => ev.stopPropagation()} onSubmit={enviar}>
        <button type="button" className="so-modal-x" onClick={alCerrar} aria-label="Cerrar"><X size={20} /></button>
        <p className="so-sello">{s.titulo}</p>
        <h2>Aparta tus {numeros.length} boleto{numeros.length > 1 ? 's' : ''}</h2>
        <p className="so-modal-total">{pesos(total)}</p>
        <label>WhatsApp (10 dígitos)<input inputMode="tel" autoComplete="tel" value={d.tel} onChange={poner('tel')} placeholder="222 123 4567" /></label>
        <div className="so-dos">
          <label>Nombre(s)<input autoComplete="given-name" value={d.nombre} onChange={poner('nombre')} /></label>
          <label>Apellidos<input autoComplete="family-name" value={d.apellidos} onChange={poner('apellidos')} /></label>
        </div>
        <label>Estado<select value={d.lugar} onChange={poner('lugar')}>{ESTADOS.map((x) => <option key={x}>{x}</option>)}</select></label>
        {error && <p className="so-error">{error}</p>}
        <button className="so-boton so-boton-oro so-boton-ancho">Apartar mis boletos</button>
        <p className="so-modal-nota">Te los guardamos {HORAS_APARTADO} horas. Después de apartar subes aquí tu comprobante de pago.</p>
      </form>
    </div>
  );
}

// ── Pago de un folio ────────────────────────────────────────────────────────
function Pago({ folio, ir }) {
  const e = useSorteos();
  const p = e.pedidos[folio];
  const [copiado, setCopiado] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [verificando, setVerificando] = useState(false);
  if (!p) return <main className="so-seccion"><p>No encontramos ese folio.</p></main>;
  const s = SORTEOS.find((x) => x.id === p.sorteo);

  const copiar = (t) => { navigator.clipboard?.writeText(t.replace(/\s/g, '')); setCopiado(t); setTimeout(() => setCopiado(''), 1500); };
  const subir = async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    setSubiendo(true); setError('');
    try {
      subirComprobante(folio, { img: await miniatura(f), nombre: f.name });
      if (e.auto) setVerificando(true);
    } catch { setError('No pudimos leer esa imagen. Intenta con otra foto.'); }
    setSubiendo(false);
  };

  const pasos = [['apartado', 'Apartado'], ['revision', 'Comprobante enviado'], ['pagado', 'Pagado']];
  const nivel = { apartado: 0, revision: 1, pagado: 2, liberado: -1 }[p.estado];

  return (
    <main className="so-seccion so-pago">
      {p.estado === 'pagado' && <div className="so-confeti" aria-hidden="true">{Array.from({ length: 30 }, (_, i) => <i key={i} />)}</div>}
      <p className="so-sello">Folio {p.folio} · {s.titulo}</p>
      <h1 className="so-h1">{p.estado === 'pagado' ? '¡Ya estás participando!' : p.estado === 'liberado' ? 'Este apartado venció' : '¡Boletos apartados!'}</h1>

      <ol className="so-linea">
        {pasos.map(([k, t], i) => <li key={k} className={i <= nivel ? 'so-hecho' : ''}><i>{i < nivel || p.estado === 'pagado' ? <Check size={14} /> : i + 1}</i>{t}</li>)}
      </ol>

      <div className="so-pago-rejilla">
        <BoletoDigital p={p} s={s} />

        <div className="so-pago-lado">
          {p.estado === 'apartado' && (
            <>
              <div className="so-caja so-caja-alerta">
                <p>Tienes <b><Restante hasta={p.vence} /></b> para pagar <b>{pesos(p.total)}</b>. Si no, los boletos se liberan solos.</p>
                {p.rechazado && <p className="so-error">Tu comprobante anterior no se pudo validar. Sube uno nuevo, por favor.</p>}
              </div>
              <div className="so-caja">
                <h2 className="so-h3">Transfiere o deposita a</h2>
                {NEGOCIO.cuentas.map((c) => (
                  <div key={c.banco} className="so-cuenta-banco">
                    <b>{c.banco}</b><span>{c.titular}</span>
                    <button onClick={() => copiar(c.clabe)}>CLABE {c.clabe} {copiado === c.clabe ? <Check size={14} /> : <Copy size={14} />}</button>
                    <button onClick={() => copiar(c.tarjeta)}>Tarjeta {c.tarjeta} {copiado === c.tarjeta ? <Check size={14} /> : <Copy size={14} />}</button>
                  </div>
                ))}
                <p className="so-dato-chico">En el concepto escribe tu folio: <b>{p.folio}</b></p>
              </div>
              <label className="so-subir">
                <input type="file" accept="image/*" onChange={subir} disabled={subiendo} />
                <Upload size={22} />
                <b>{subiendo ? 'Subiendo…' : 'Subir mi comprobante'}</b>
                <span>Foto o captura de la transferencia</span>
              </label>
              {error && <p className="so-error">{error}</p>}
            </>
          )}
          {p.estado === 'revision' && verificando && (
            <Verificando p={p} alTerminar={() => { verificarAuto(p.folio); setVerificando(false); }} />
          )}
          {p.estado === 'revision' && !verificando && (
            <div className="so-caja">
              <h2 className="so-h3">Estamos revisando tu pago</h2>
              {p.comprobante?.img && <img className="so-comprobante" src={p.comprobante.img} alt="Tu comprobante" />}
              <p>En cuanto el verificador lo apruebe, esta pantalla cambia sola y te llega la confirmación por WhatsApp.</p>
              <p className="so-dato-chico">Tip de la demo: abre "Verificador" en otra pestaña y apruébalo.</p>
            </div>
          )}
          {p.estado === 'pagado' && (
            <div className="so-caja">
              <h2 className="so-h3">Pago confirmado</h2>
              {p.auto && <p className="so-auto-ok"><ShieldCheck size={17} /> Confirmado automáticamente con Banxico · clave {p.auto.clave}</p>}
              <p>Tus boletos ya están pagados. Guarda tu boleto digital o búscalo cuando quieras con tu teléfono en "Verificar boleto".</p>
              <p>El sorteo se juega el <b>{fechaLarga(s.fecha)}</b> en vivo. ¡Mucha suerte!</p>
              <button className="so-boton so-boton-oro" onClick={() => ir({ v: 'sorteo', id: s.id })}>Comprar más boletos</button>
            </div>
          )}
          {p.estado === 'liberado' && (
            <div className="so-caja"><p>No llegó el pago a tiempo y los números se liberaron. Puedes volver a elegirlos si siguen disponibles.</p>
              <button className="so-boton so-boton-oro" onClick={() => ir({ v: 'sorteo', id: s.id })}>Volver a elegir</button></div>
          )}
        </div>
      </div>
    </main>
  );
}

// La comprobación automática, paso a paso (en la demo, simulada).
function Verificando({ p, alTerminar }) {
  const [paso, setPaso] = useState(0);
  const cuenta = NEGOCIO.cuentas[0];
  const pasos = [
    'Leyendo tu comprobante',
    `Monto: ${pesos(p.total)}`,
    `Clave de rastreo: ${claveRastreo(p)}`,
    `Cuenta destino: ${cuenta.banco} ••• ${cuenta.clabe.replace(/\D/g, '').slice(-4)}`,
    'Consultando el comprobante oficial en Banxico (CEP)',
  ];
  useEffect(() => {
    if (paso >= pasos.length) { const id = setTimeout(alTerminar, 700); return () => clearTimeout(id); }
    const id = setTimeout(() => setPaso((x) => x + 1), paso === pasos.length - 1 ? 1600 : 750);
    return () => clearTimeout(id);
  }, [paso]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="so-caja so-verificando">
      <h2 className="so-h3"><ShieldCheck size={19} /> Comprobando tu pago</h2>
      <ol>
        {pasos.map((t, i) => (
          <li key={t} className={i < paso ? 'so-v-ok' : i === paso ? 'so-v-ahora' : ''}>
            <i>{i < paso ? <Check size={13} /> : ''}</i>{t}
          </li>
        ))}
      </ol>
      <p className="so-dato-chico">Si todo cuadra, tus boletos quedan pagados en segundos, sin esperar a nadie.</p>
    </div>
  );
}

function BoletoDigital({ p, s }) {
  return (
    <article className={`so-boleto-digital so-bd-${p.estado}`}>
      <header>
        <span><b>FORTUNA</b> sorteos</span>
        <span className={`so-estado so-e-${p.estado}`}>{ESTADO_TXT[p.estado]}</span>
      </header>
      <h3>{s.titulo}</h3>
      <p className="so-dato-chico">{fechaLarga(s.fecha)} · Folio {p.folio}</p>
      <p className="so-bd-nombre">{p.nombre} {p.apellidos.charAt(0)}. · {p.lugar}</p>
      <div className="so-bd-nums">
        {p.numeros.map((n) => (
          <div key={n}>
            <b>{fmtNum(s, n)}</b>
            {s.oportunidades > 0 && <small>{oportunidadesDe(s, n).map((o) => fmtOp(s, o)).join(' · ')}</small>}
          </div>
        ))}
      </div>
      <footer>
        <QRCodeSVG value={`https://sorteosfortuna.mx/v/${p.folio}`} size={74} bgColor="transparent" fgColor="currentColor" />
        <div><b>{pesos(p.total)}</b><span>{p.numeros.length} boleto{p.numeros.length > 1 ? 's' : ''}</span></div>
      </footer>
    </article>
  );
}

// ── Verificar boleto ────────────────────────────────────────────────────────
function Verificar({ ir }) {
  const e = useSorteos();
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('tel');
  const [sorteo, setSorteo] = useState(SORTEOS[0].id);
  const s = SORTEOS.find((x) => x.id === sorteo);
  const limpio = q.replace(/\D/g, '');

  let resultados = [];
  if (tipo === 'tel') resultados = buscarPorTelefono(e, limpio);
  else if (limpio) {
    const folio = e.boletos[sorteo][Number(limpio)];
    if (folio) resultados = [e.pedidos[folio]];
  }

  return (
    <main className="so-seccion so-verificar">
      <h1 className="so-h1">Verifica tu boleto</h1>
      <p className="so-entrada">Búscalo con tu número de WhatsApp o con el número del boleto.</p>
      <div className="so-segmento">
        <button aria-pressed={tipo === 'tel'} onClick={() => setTipo('tel')}>Por teléfono</button>
        <button aria-pressed={tipo === 'num'} onClick={() => setTipo('num')}>Por número</button>
      </div>
      <div className="so-verificar-campos">
        {tipo === 'num' && (
          <select value={sorteo} onChange={(ev) => setSorteo(ev.target.value)}>
            {SORTEOS.map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}
          </select>
        )}
        <input inputMode="numeric" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder={tipo === 'tel' ? 'Tu WhatsApp' : `Número (${fmtNum(s, 0)}–${fmtNum(s, s.total - 1)})`} />
      </div>
      {e.misFolios[0] && tipo === 'tel' && !q && (
        <button className="so-enlace" onClick={() => setQ(e.pedidos[e.misFolios[0]].tel)}>Usar el teléfono de mi último apartado</button>
      )}

      <div className="so-resultados">
        {resultados.map((p) => (
          <button key={p.folio} className="so-resultado" onClick={() => ir({ v: 'pago', folio: p.folio })}>
            <BoletoDigital p={p} s={SORTEOS.find((x) => x.id === p.sorteo)} />
          </button>
        ))}
        {limpio.length >= 4 && resultados.length === 0 && (
          <p className="so-vacio">{tipo === 'num' ? 'Ese número sigue disponible. ¡Apártalo!' : 'No encontramos boletos con ese teléfono.'}</p>
        )}
      </div>
    </main>
  );
}

function Mis({ ir }) {
  const e = useSorteos();
  const mios = e.misFolios.map((f) => e.pedidos[f]).filter(Boolean);
  return (
    <main className="so-seccion">
      <h1 className="so-h1">Mis boletos</h1>
      {mios.length === 0 && (
        <div className="so-caja"><p>Todavía no apartas boletos en este celular.</p>
          <button className="so-boton so-boton-oro" onClick={() => ir({ v: 'inicio' })}>Ver sorteos</button></div>
      )}
      <div className="so-resultados">
        {mios.map((p) => (
          <button key={p.folio} className="so-resultado" onClick={() => ir({ v: 'pago', folio: p.folio })}>
            <BoletoDigital p={p} s={SORTEOS.find((x) => x.id === p.sorteo)} />
          </button>
        ))}
      </div>
    </main>
  );
}

function Preguntas() {
  const q = [
    ['¿Cómo sé quién ganó?', 'Cada sorteo se juega con el resultado de la Lotería Nacional del día del evento y se transmite en vivo. Las últimas cifras del segundo lugar y del premio mayor forman el número ganador.'],
    ['¿Cuánto tiempo tengo para pagar?', `${HORAS_APARTADO} horas desde que apartas. Si no llega tu comprobante, los números se liberan solos para alguien más.`],
    ['¿Cómo pago?', 'Por transferencia o depósito a las cuentas que aparecen al apartar. Subes la foto de tu comprobante en la misma página; no hace falta mandarlo por WhatsApp.'],
    ['¿Qué son las oportunidades?', 'Números extra que acompañan a tu boleto sin costo. Si cualquiera de ellos sale, ganas.'],
    ['¿Cómo recibo mi premio?', 'Te contactamos al WhatsApp con el que apartaste. Los premios se entregan en persona o se envían, según el sorteo.'],
    ['¿Es seguro?', `${NEGOCIO.permiso}. Puedes verificar tu boleto en cualquier momento con tu teléfono.`],
  ];
  return (
    <main className="so-seccion so-faq">
      <h1 className="so-h1">Preguntas frecuentes</h1>
      {q.map(([p, r]) => <details key={p}><summary>{p}</summary><p>{r}</p></details>)}
    </main>
  );
}

// avisos de lo que pasa en vivo (otros compradores)
function Ticker() {
  const e = useSorteos();
  const ultimo = e.eventos.find((x) => x.tipo === 'info');
  const [visible, setVisible] = useState(null);
  useEffect(() => {
    if (!ultimo) return;
    setVisible(ultimo);
    const id = setTimeout(() => setVisible(null), 4500);
    return () => clearTimeout(id);
  }, [ultimo?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!visible) return null;
  return <div className="so-ticker" key={visible.id}><Ticket size={16} /> {visible.texto}</div>;
}
