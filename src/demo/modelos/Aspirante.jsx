import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, Plus, X } from 'lucide-react';
import { AGENCIA, HORA, useAgencia, modeloPorId, postularse, fechaLarga, fechaCorta, hora, estaturaTxt } from './datos';
import { Campo, Foto, miniatura } from './comun';
import { Folio, Imagen, Rasgado, useRevela } from './kade';

// ─────────────────────────────────────────────────────────────────────────────
// SCOUTING EN LÍNEA — "Quiero ser modelo". La página de reclutamiento.
// Portada con la foto del casting · "así empezaron" (las New faces, antes y hoy) ·
// cómo funciona en 4 pasos · formulario POR PASOS en hoja de papel (tú →
// medidas con regla → fotos con silueta guía → revisa tu mini composite) ·
// preguntas frecuentes. Después de mandar: sello "Recibida", línea de tiempo,
// consejos y el pase con QR cuando la invitan al casting. La booker la mueve
// desde su panel (Scouting); si la firma, entra al book como New face.
// ─────────────────────────────────────────────────────────────────────────────

const LLAVE = 'demo_modelos_mi_postulacion';
const leerMia = () => { try { return localStorage.getItem(LLAVE); } catch { return null; } };
const MINIMO = { mujeres: 170, hombres: 180 };

export default function Aspirante({ alVolver }) {
  const e = useAgencia();
  const [bajo, setBajo] = useState(false);
  useEffect(() => {
    const alBajar = () => setBajo(window.scrollY > 40);
    alBajar();
    window.addEventListener('scroll', alBajar, { passive: true });
    return () => window.removeEventListener('scroll', alBajar);
  }, []);
  const [mia, setMia] = useState(leerMia);
  const a = e.aspirantes.find((x) => x.id === mia);
  const guardar = (id) => { try { localStorage.setItem(LLAVE, id); } catch { /* */ } setMia(id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const otra = () => { try { localStorage.removeItem(LLAVE); } catch { /* */ } setMia(null); };
  return (
    <div className="kd kd-sitio kd-aspirante">
      <header className={`kd-cab ${bajo ? 'bajo' : ''}`}>
        <button type="button" className="kd-logo" onClick={alVolver} aria-label="Volver al sitio">{AGENCIA.nombre}</button>
        <p className="kd-cab-giro">Scouting 2027<br />{AGENCIA.ciudad}</p>
        <span />
        <div className="kd-cab-der"><button type="button" onClick={alVolver}>← Volver al sitio</button></div>
      </header>
      {a ? <Estado e={e} a={a} otra={otra} /> : <Reclutamiento e={e} alListo={guardar} />}
      <footer className="kd-pie">
        <div className="kd-pie-legal">
          <span>© 2026 {AGENCIA.completo}</span>
          <span>Nunca cobramos por postularte ni por representarte.</span>
          <span>{AGENCIA.correo}</span>
        </div>
      </footer>
    </div>
  );
}

// ── la página antes de postularse ───────────────────────────────────────────
const NUEVAS = ['sofia', 'lia', 'elena', 'noa'];

function Reclutamiento({ e, alListo }) {
  const form = useRef(null);
  const revela = useRevela();
  const nuevas = NUEVAS.map((id) => modeloPorId(e, id)).filter(Boolean);
  const ir = () => form.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div ref={revela}>
      <section className="kd-reclu-portada">
        <Imagen nombre="casting-1" sizes="100vw" prioridad posicion="50% 35%" />
        <div className="kd-reclu-txt">
          <Folio n={1}>Scouting en línea · {AGENCIA.ciudad}</Folio>
          <h1 className="kd-titulo">Quiero<br /><span>ser modelo</span></h1>
          <p className="kd-reclu-lema">No necesitas book ni experiencia. Dos fotos con tu celular y cinco minutos.</p>
          <button type="button" className="kd-boton kd-boton-claro" onClick={ir}>Postularme →</button>
        </div>
      </section>

      <section className="kd-claro kd-talento">
        <div className="kd-sec-cab">
          <Folio n={2}>Así empezaron</Folio>
          <h2 className="kd-titulo kd-revela">Con dos fotos<br /><span>del celular</span></h2>
          <p className="kd-mono-chico">New faces 2026</p>
        </div>
        <p className="kd-reclu-intro kd-revela">Ellas se postularon aquí mismo. Hoy están en el board de {AGENCIA.nombre} y ya hicieron castings con marcas como Norte Denim y Casa Ámbar.</p>
        <div className="kd-rejilla kd-rejilla-4">
          {nuevas.map((m, k) => (
            <article key={m.id} className="kd-carta kd-revela" style={{ '--k': k }}>
              <div className="kd-carta-foto"><Rasgado nombre={m.fotos[0]} sizes="(max-width: 760px) 46vw, 24vw" semilla={k + 21} /><span className="kd-sello">New face</span></div>
              <div className="kd-carta-pie"><h3>{m.nombre} {m.apellido}</h3><p>Firmada en 2026 · {m.ciudad}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="kd-oscuro kd-eventos-inicio">
        <div className="kd-sec-cab">
          <Folio n={3}>Cómo funciona</Folio>
          <h2 className="kd-titulo kd-revela">Cuatro<br /><span>pasos</span></h2>
          <p className="kd-mono-chico">Respuesta en 48 h</p>
        </div>
        <ol className="kd-reclu-pasos">
          {[
            ['Mandas tus fotos', 'Dos fotos con luz de día: de frente y de perfil. Sin maquillaje ni filtros.'],
            ['Te revisamos', 'Una booker ve cada postulación. Te contestamos en menos de 48 horas.'],
            ['Casting abierto', 'Si nos interesas te llega tu pase. Vienes, te conocemos y te tomamos polaroids.'],
            ['Firmas', 'Entras al board como New face y empiezas a hacer castings con marcas.'],
          ].map(([t, d], k) => (
            <li key={t} className="kd-revela" style={{ '--k': k }}><b>{String(k + 1).padStart(2, '0')}</b><h3>{t}</h3><p>{d}</p></li>
          ))}
        </ol>
      </section>

      <section ref={form} className="kd-claro kd-reclu-form" style={{ scrollMarginTop: 'var(--kd-arriba)' }}>
        <Formulario alListo={alListo} />
      </section>

      <section className="kd-claro kd-reclu-faq">
        <div className="kd-sec-cab">
          <Folio n={5}>Preguntas</Folio>
          <h2 className="kd-titulo kd-revela">Lo que<br /><span>nos preguntan</span></h2>
          <span />
        </div>
        <div className="kd-faq">
          {[
            ['¿Cuesta algo postularme o estar en la agencia?', `No. ${AGENCIA.nombre} nunca cobra por representarte, por el casting ni por tus fotos. Ganamos una comisión solo cuando tú ganas por un trabajo.`],
            ['Soy menor de edad, ¿puedo?', 'Sí, desde los 16 años. Tu mamá, papá o tutor tiene que acompañarte al casting y firmar contigo.'],
            ['No tengo experiencia ni book', 'No hace falta. Si te firmamos, nosotros armamos tu primer book con fotógrafos de la agencia.'],
            ['¿Qué pasa con mis fotos?', 'Solo las ve el equipo de scouting para evaluar tu postulación. Si no avanzas, se borran a los seis meses.'],
            ['No llego a la estatura, ¿vale la pena?', 'Para comercial, fitness y belleza la estatura importa menos. Postúlate igual: lo vemos caso por caso.'],
          ].map(([p, r]) => (
            <details key={p}><summary>{p}<Plus size={20} /></summary><p>{r}</p></details>
          ))}
        </div>
      </section>

      <section className="kd-reclu-cierre">
        <Imagen nombre="estudio-luz" sizes="100vw" posicion="50% 40%" />
        <div>
          <h2 className="kd-titulo">Cinco minutos.<br /><span>Dos fotos.</span></h2>
          <button type="button" className="kd-boton kd-boton-claro" onClick={ir}>Postularme →</button>
        </div>
      </section>
    </div>
  );
}

// ── el formulario por pasos ─────────────────────────────────────────────────
function SubirFoto({ etiqueta, perfil, valor, alCambiar }) {
  const ref = useRef(null);
  return (
    <button type="button" onClick={() => ref.current?.click()} className={`kd-subir ${valor ? 'lleno' : ''}`}>
      <input ref={ref} type="file" accept="image/*" hidden onChange={async (ev) => {
        const f = ev.target.files?.[0]; ev.target.value = '';
        if (f) alCambiar(await miniatura(f, 420));
      }} />
      {valor ? <Foto src={valor} /> : (
        <span className="kd-subir-vacio">
          <Silueta perfil={perfil} />
          <span><Camera size={16} /> Toca para subir</span>
        </span>
      )}
      <span className="kd-subir-pie">{etiqueta}{valor && <Check size={14} />}</span>
    </button>
  );
}

// silueta guía (de frente o de perfil), dibujada a línea
function Silueta({ perfil }) {
  return perfil ? (
    <svg viewBox="0 0 100 125" aria-hidden="true"><path d="M52 14c8 0 12 7 11 15-1 6-4 9-4 12 0 2 4 3 4 6 0 2-3 2-3 4v4c6 2 11 8 12 18l2 52H40l1-40c-4-2-6-9-5-18 1-12 6-17 12-19v-4c-5-1-8-7-7-15 1-9 5-15 11-15z" /></svg>
  ) : (
    <svg viewBox="0 0 100 125" aria-hidden="true"><path d="M50 12c8 0 13 6 13 15s-5 16-13 16-13-7-13-16 5-15 13-15zM38 46c-8 2-14 8-15 18l-3 30h9l3-24 2 55h12l3-40 3 40h12l2-55 3 24h9l-3-30c-1-10-7-16-15-18z" /></svg>
  );
}

const PASOS = ['Tú', 'Medidas', 'Fotos', 'Revisa'];
// qué le falta a cada paso para poder seguir
const FALTA = [
  (f) => `Te falta: ${[!f.nombre.trim() && 'nombre', !f.edad && 'edad', !f.ciudad.trim() && 'ciudad', !f.telefono.trim() && 'WhatsApp'].filter(Boolean).join(', ')}.`,
  () => '',
  (f) => (f.fotos[0] || f.fotos[1] ? 'Te falta una foto.' : 'Sube tus dos fotos (o usa las de ejemplo).'),
  () => 'Acepta el aviso de privacidad para mandarla.',
];

// fotos de ejemplo para enseñar la demo sin tener que subir nada
const EJEMPLO = { mujeres: ['valeria-1', 'valeria-2'], hombres: ['andres-1', 'andres-2'] };

function Formulario({ alListo }) {
  const [paso, setPaso] = useState(0);
  // al cambiar de paso la hoja sube a su inicio (si no, el paso nuevo
  // aparece a media pantalla, con el título debajo del encabezado)
  const hoja = useRef(null);
  // solo cuando el paso CAMBIA (en modo estricto el efecto corre dos veces al
  // montar y con una bandera de "primera vez" la página brincaba al formulario)
  const anterior = useRef(paso);
  useEffect(() => {
    if (anterior.current === paso) return;
    anterior.current = paso;
    hoja.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [paso]);
  const [f, setF] = useState({ nombre: '', edad: '', ciudad: '', ig: '', telefono: '', board: 'mujeres', estatura: 172, cabello: '', ojos: '', fotos: [null, null], acepto: false, b: '', c: '', h: '' });
  const pon = (k) => (ev) => setF({ ...f, [k]: ev.target.value });
  const menor = f.edad && Number(f.edad) < 18;
  const cumple = f.estatura >= MINIMO[f.board];
  const listo = [
    f.nombre.trim() && f.edad && f.ciudad.trim() && f.telefono.trim(),
    f.estatura > 0,
    f.fotos[0] && f.fotos[1],
    f.acepto,
  ];
  const mandar = () => {
    const n = postularse({ nombre: f.nombre.trim(), edad: Number(f.edad), estatura: Number(f.estatura), ciudad: f.ciudad.trim(), ig: f.ig || '—', telefono: f.telefono, board: f.board, cabello: f.cabello, ojos: f.ojos, fotos: f.fotos, medidas: [Number(f.b) || 0, Number(f.c) || 0, Number(f.h) || 0] });
    alListo(n.id);
  };
  return (
    <div ref={hoja} className="kd-asistente" style={{ scrollMarginTop: 'calc(var(--kd-arriba) + 90px)' }}>
      <div className="kd-asistente-cab">
        <Folio n={4}>Tu postulación · paso {paso + 1} de {PASOS.length}</Folio>
        <h2 className="kd-titulo">{['Cuéntanos', 'Tus', 'Tus dos', 'Así te'][paso]}<br /><span>{['de ti', 'medidas', 'fotos', 'vamos a ver'][paso]}</span></h2>
        <ol className="kd-pasos" style={{ '--p': paso }}>
          {PASOS.map((p, k) => <li key={p} className={k <= paso ? 'hecho' : ''}><i />{p}</li>)}
        </ol>
      </div>

      <div key={paso} className="kd-asistente-cuerpo kd-form">
        {paso === 0 && (
          <>
            <div className="kd-pestanas" role="group" aria-label="Board">
              {[['mujeres', 'Mujer'], ['hombres', 'Hombre']].map(([v, t]) => <button key={v} type="button" aria-pressed={f.board === v} onClick={() => setF({ ...f, board: v, estatura: v === 'hombres' ? 182 : 172 })}>{t}</button>)}
            </div>
            <Campo etiqueta="Nombre completo"><input value={f.nombre} onChange={pon('nombre')} autoComplete="name" /></Campo>
            <div className="mo-dos">
              <Campo etiqueta="Edad"><input type="number" inputMode="numeric" min="14" max="40" value={f.edad} onChange={pon('edad')} /></Campo>
              <Campo etiqueta="Ciudad"><input value={f.ciudad} onChange={pon('ciudad')} /></Campo>
              <Campo etiqueta="WhatsApp"><input type="tel" inputMode="tel" value={f.telefono} onChange={pon('telefono')} autoComplete="tel" /></Campo>
              <Campo etiqueta="Instagram (opcional)"><input value={f.ig} onChange={pon('ig')} placeholder="@" /></Campo>
            </div>
            {menor && <p className="kd-v-aviso">Eres menor de edad: tu mamá, papá o tutor tendrá que acompañarte al casting y firmar contigo.</p>}
          </>
        )}

        {paso === 1 && (
          <>
            <div className="kd-estatura">
              <div>
                <p className="kd-mono-chico">Estatura</p>
                <p className="kd-estatura-num">{estaturaTxt(f.estatura)}</p>
                <p className={cumple ? 'kd-ok' : 'kd-v-nota'}>
                  {cumple ? `✓ Cumples para pasarela y editorial (desde ${estaturaTxt(MINIMO[f.board])})` : `Para pasarela pedimos desde ${estaturaTxt(MINIMO[f.board])}; para comercial y belleza, postúlate igual.`}
                </p>
              </div>
              <div className="kd-regla-cm" aria-hidden="true">
                {Array.from({ length: 41 }, (_, k) => 150 + k).map((cm) => <i key={cm} className={`${cm % 5 ? '' : 'larga'} ${cm <= f.estatura ? 'on' : ''}`} />)}
              </div>
            </div>
            <input className="kd-deslizador" type="range" min="150" max="200" value={f.estatura} onChange={(ev) => setF({ ...f, estatura: Number(ev.target.value) })} aria-label="Estatura en centímetros" />
            <div className="mo-tres">
              <Campo etiqueta={f.board === 'hombres' ? 'Pecho (cm, opcional)' : 'Busto (cm, opcional)'}><input type="number" inputMode="numeric" value={f.b} onChange={pon('b')} placeholder={f.board === 'hombres' ? 'Ej. 98' : 'Ej. 84'} /></Campo>
              <Campo etiqueta="Cintura (cm, opcional)"><input type="number" inputMode="numeric" value={f.c} onChange={pon('c')} placeholder={f.board === 'hombres' ? 'Ej. 78' : 'Ej. 61'} /></Campo>
              <Campo etiqueta={f.board === 'hombres' ? 'Talla de traje (opcional)' : 'Cadera (cm, opcional)'}><input type="number" inputMode="numeric" value={f.h} onChange={pon('h')} placeholder={f.board === 'hombres' ? 'Ej. 40' : 'Ej. 89'} /></Campo>
            </div>
            <div className="mo-dos">
              <Campo etiqueta="Color de cabello"><input value={f.cabello} onChange={pon('cabello')} placeholder="Ej. castaño oscuro" /></Campo>
              <Campo etiqueta="Color de ojos"><input value={f.ojos} onChange={pon('ojos')} placeholder="Ej. café" /></Campo>
            </div>
          </>
        )}

        {paso === 2 && (
          <>
            <div className="kd-subir-dos">
              <SubirFoto etiqueta="De frente" valor={f.fotos[0]} alCambiar={(v) => setF((x) => ({ ...x, fotos: [v, x.fotos[1]] }))} />
              <SubirFoto etiqueta="De perfil" perfil valor={f.fotos[1]} alCambiar={(v) => setF((x) => ({ ...x, fotos: [x.fotos[0], v] }))} />
            </div>
            <div className="kd-asi">
              <div><b className="kd-ok"><Check size={14} /> Así sí</b><p>Luz de día, pared lisa, ropa ajustada y sencilla, cabello suelto o recogido, sin maquillaje.</p></div>
              <div><b className="kd-rojo"><X size={14} /> Así no</b><p>Selfies, filtros, lentes de sol, fotos en grupo o con poca luz.</p></div>
            </div>
            <div className="kd-v-acciones">
              <button type="button" className="kd-enlace" onClick={() => setF((x) => ({ ...x, fotos: EJEMPLO[x.board].map((n) => `/modelos/kade/${n}-1200.webp`) }))}>
                [ <ImagePlus size={14} style={{ verticalAlign: -2 }} /> Usar fotos de ejemplo ]
              </button>
              <p className="kd-v-nota">Solo en la demo: también sirve cualquier imagen tuya.</p>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <div className="kd-mini-composite">
              <Foto src={f.fotos[0]} />
              <div>
                <Foto src={f.fotos[1]} />
                <div>
                  <p className="kd-mono-chico">Aspirante · {f.board === 'hombres' ? 'Hombres' : 'Mujeres'}</p>
                  <p className="kd-mini-composite-nombre">{f.nombre || 'Tu nombre'}</p>
                  <p className="kd-mono-chico" style={{ color: 'inherit' }}>{f.edad || '—'} años · {estaturaTxt(f.estatura)} · {f.ciudad || '—'}</p>
                  {(f.cabello || f.ojos) && <p className="kd-mono-chico">{[f.cabello && `Cabello ${f.cabello}`, f.ojos && `ojos ${f.ojos}`].filter(Boolean).join(' · ')}</p>}
                </div>
              </div>
            </div>
            <label className="kd-acepto">
              <input type="checkbox" checked={f.acepto} onChange={(ev) => setF({ ...f, acepto: ev.target.checked })} />
              <span>Acepto que {AGENCIA.nombre} guarde mis fotos y datos solo para evaluar mi postulación (aviso de privacidad).</span>
            </label>
          </>
        )}
      </div>

      <div className="kd-asistente-pie">
        {paso > 0 ? <button type="button" className="kd-enlace" onClick={() => setPaso(paso - 1)}>[ ← Atrás ]</button> : <span />}
        {paso < PASOS.length - 1
          ? <button type="button" className="kd-boton" disabled={!listo[paso]} onClick={() => setPaso(paso + 1)}>Siguiente →</button>
          : <button type="button" className="kd-boton" disabled={!listo.every(Boolean)} onClick={mandar}>Mandar mi postulación →</button>}
      </div>
      {!listo[paso] && (paso > 0 || f.nombre || f.edad || f.ciudad || f.telefono) && <p className="kd-v-falta" style={{ textAlign: 'right' }}>{FALTA[paso](f)}</p>}
    </div>
  );
}

// ── después de postularse ───────────────────────────────────────────────────
const TITULOS = {
  nueva: <>La estamos<br /><span>revisando</span></>,
  casting: <>Te queremos<br /><span>conocer</span></>,
  firmada: <>Bienvenida<br /><span>a {AGENCIA.nombre}</span></>,
  descartada: <>Gracias<br /><span>por postularte</span></>,
};
const SELLO = { nueva: 'Recibida', casting: 'Invitada', firmada: 'Firmada', descartada: 'Cerrada' };

function Estado({ e, a, otra }) {
  const casting = e.eventos.find((x) => x.tipo === 'Casting abierto');
  const pase = casting?.invitados.find((p) => p.aspirante === a.id);
  const orden = ['nueva', 'casting', 'firmada'];
  const i = a.estado === 'descartada' ? 0 : orden.indexOf(a.estado);
  const linea = [
    ['Recibimos tu postulación', fechaCorta(a.creada), true],
    ['Una booker la revisa', i >= 1 ? 'listo' : `antes del ${fechaCorta(a.creada + 48 * HORA)}`, i >= 1],
    ['Casting abierto', casting ? `${fechaCorta(casting.fecha)} · ${hora(casting.fecha)}` : '—', i >= 1],
    ['Firmas con la agencia', i >= 2 ? 'listo' : 'después del casting', i >= 2],
  ];
  return (
    <>
      <section className="kd-claro kd-estado">
        <div>
          <Folio n={1}>Tu postulación · {a.nombre}</Folio>
          <h1 className="kd-titulo">{TITULOS[a.estado]}</h1>
          <p className="kd-v-texto">
            {a.estado === 'nueva' && 'Te avisamos por WhatsApp y aquí ves el estado en vivo. (En la demo: ábrela desde "Booker → Scouting" y mándala al casting.)'}
            {a.estado === 'casting' && 'Tu pase para el casting abierto está listo. Ven sin maquillaje, con jeans y blusa negra, y trae una identificación.'}
            {a.estado === 'firmada' && 'Ya estás en el board como New face. Tu booker te llama para tu primera sesión de fotos.'}
            {a.estado === 'descartada' && 'Por ahora no tenemos un lugar para tu perfil. Puedes volver a postularte en seis meses.'}
          </p>
          {a.estado !== 'descartada' && (
            <ol className="kd-linea">
              {linea.map(([t, d, hecho]) => <li key={t} className={hecho ? 'hecho' : ''}><i /><b>{t}</b><span>{d}</span></li>)}
            </ol>
          )}
          <button type="button" className="kd-enlace" style={{ marginTop: 30 }} onClick={otra}>[ Hacer otra postulación ]</button>
        </div>

        <div className="kd-estado-der">
          {a.estado === 'casting' && pase && casting ? (
            <div className="kd-pase kd-pase-vertical">
              <div className="kd-pase-fecha">
                <small>Pase · casting abierto</small>
                <b>{new Date(casting.fecha).getDate()}</b>
                <small>{fechaLarga(casting.fecha)} · {hora(casting.fecha)}</small>
              </div>
              <div className="kd-pase-cuerpo">
                <small>{casting.lugar}</small>
                <b>{a.nombre}</b>
                <code>{pase.codigo}</code>
              </div>
              <div className="kd-pase-qr"><QRCodeSVG value={pase.codigo} size={150} bgColor="#F1EEE8" fgColor="#121211" /></div>
            </div>
          ) : (
            <div className="kd-estado-fotos">
              {a.fotos.map((src, j) => <div key={j} className="kd-estado-foto"><Foto src={src} /><small>{j ? 'Perfil' : 'Frente'}</small></div>)}
              <span key={a.estado} className={`kd-estado-sello ${a.estado}`}>{SELLO[a.estado]}</span>
            </div>
          )}
        </div>
      </section>

      {a.estado !== 'descartada' && a.estado !== 'firmada' && (
        <section className="kd-oscuro kd-eventos-inicio">
          <div className="kd-sec-cab">
            <Folio n={2}>Mientras tanto</Folio>
            <h2 className="kd-titulo">Prepárate<br /><span>para el casting</span></h2>
            <span />
          </div>
          <ol className="kd-reclu-pasos">
            {[
              ['Practica tu caminata', 'Tacones de 8 cm, en línea recta, mirando al frente. Diez minutos al día.'],
              ['Cuida tu piel y descansa', 'La cámara nota el desvelo. Duerme bien la semana del casting.'],
              ['Ve sin maquillaje', 'Queremos ver tu cara real. Cabello limpio y suelto, uñas sin color.'],
              ['Lleva lo básico', 'Jeans ajustados, blusa negra sencilla, tacones en la bolsa y tu INE.'],
            ].map(([t, d], k) => (
              <li key={t}><b>{String(k + 1).padStart(2, '0')}</b><h3>{t}</h3><p>{d}</p></li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
