import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, ArrowRight, Camera, Check, Plus, X } from 'lucide-react';
import { AGENCIA, HORA, useAgencia, modeloPorId, postularse, fechaLarga, fechaCorta, hora, estaturaTxt } from './datos';
import { Campo, Foto, FotoModelo, miniatura, useAltoCabeza } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// SCOUTING EN LÍNEA — "Quiero ser modelo". La página de reclutamiento.
// Portada con la foto del casting · "así empezaron ellas" (las New faces) ·
// cómo funciona en 4 pasos · formulario POR PASOS en hoja de papel (tú →
// medidas con regla → fotos con silueta guía → revisa tu mini composite) ·
// preguntas frecuentes. Después de mandar: sello "Recibida", línea de tiempo,
// consejos y el pase con QR cuando la invitan al casting. La booker la mueve
// desde su panel (Scouting); si la firma, entra al book como New face.
// ─────────────────────────────────────────────────────────────────────────────

const LLAVE = 'demo_modelos_mi_postulacion';
const leerMia = () => { try { return localStorage.getItem(LLAVE); } catch { return null; } };
const MINIMO = { mujeres: 170, hombres: 180 };

export default function Aspirante() {
  const e = useAgencia();
  const cabeza = useAltoCabeza();
  const [mia, setMia] = useState(leerMia);
  const a = e.aspirantes.find((x) => x.id === mia);
  const guardar = (id) => { try { localStorage.setItem(LLAVE, id); } catch { /* */ } setMia(id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const otra = () => { try { localStorage.removeItem(LLAVE); } catch { /* */ } setMia(null); };
  return (
    <div className="mo-sitio">
      <div ref={cabeza} className="mo-noche-cab">
        <header className="mo-cabeza">
          <div className="mo-logo">{AGENCIA.nombre}<small>MODEL MANAGEMENT</small></div>
          <span className="mo-eti">Scouting 2027</span>
        </header>
      </div>
      {a ? <Estado e={e} a={a} otra={otra} /> : <Reclutamiento e={e} alListo={guardar} />}
    </div>
  );
}

// ── la página antes de postularse ───────────────────────────────────────────
function Reclutamiento({ e, alListo }) {
  const form = useRef(null);
  const nuevas = ['sofia', 'andres'].map((id) => modeloPorId(e, id)).filter(Boolean);
  const ir = () => form.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <>
      <section className="mo-reclu-portada">
        <img src="/modelos/mira/evento-casting.webp" alt="" />
        <div className="mo-reclu-texto">
          <p className="mo-eti" style={{ color: 'rgba(255,255,255,.75)' }}>Scouting en línea · {AGENCIA.ciudad}</p>
          <h1 className="mo-gigante">Quiero<br /><em>ser modelo.</em></h1>
          <p className="mo-reclu-lema">No necesitas book ni experiencia. Dos fotos con tu celular y cinco minutos.</p>
          <button type="button" className="mo-boton mo-boton-blanco" onClick={ir}>Postularme <ArrowRight size={16} /></button>
        </div>
      </section>

      <section className="mo-seccion mo-reclu-dos">
        <div>
          <p className="mo-eti">Así empezaron ellas</p>
          <h2 className="mo-gigante" style={{ fontSize: 'clamp(2.4rem, 5vw, 4.2rem)', margin: '12px 0 16px' }}>Con dos fotos <em>del celular.</em></h2>
          <p className="mo-tenue" style={{ lineHeight: 1.65, maxWidth: 460 }}>
            Sofía y Andrés se postularon aquí mismo. Hoy están en el book de {AGENCIA.nombre} y ya trabajaron con marcas como Norte Denim y Sastrería Gil.
          </p>
        </div>
        <div className="mo-mesa mo-reclu-polaroids">
          {nuevas.map((m, k) => (
            <div key={m.id} className="mo-polaroid" style={{ width: 210, transform: `rotate(${k ? 3 : -3}deg)` }}>
              <FotoModelo m={m} tipo="polaroid" />
              <div className="mo-polaroid-pie"><span className="mo-lapiz" style={{ fontSize: '1.3rem' }}>{m.nombre}, antes</span><span className="mo-mono" style={{ fontSize: '.62rem', color: '#777' }}>Nº {m.num}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mo-seccion">
        <div className="mo-seccion-cab"><h2>Cómo <em>funciona</em></h2></div>
        <ol className="mo-pasos-grandes">
          {[
            ['Mandas tus fotos', 'Dos fotos con luz de día: de frente y de perfil. Sin maquillaje ni filtros.'],
            ['Te revisamos', 'Una booker ve cada postulación. Te contestamos en menos de 48 horas.'],
            ['Casting abierto', 'Si nos interesas te llega tu pase. Vienes, te conocemos y te tomamos polaroids.'],
            ['Firmas', 'Entras al book como New face y empiezas a hacer castings con marcas.'],
          ].map(([t, d], k) => (
            <li key={t}><span className="mo-gigante">{String(k + 1).padStart(2, '0')}</span><b>{t}</b><p className="mo-tenue">{d}</p></li>
          ))}
        </ol>
      </section>

      <section ref={form} className="mo-seccion" style={{ scrollMarginTop: 'calc(var(--mo-barra) + 80px)' }}>
        <Formulario alListo={alListo} />
      </section>

      <section className="mo-seccion">
        <div className="mo-seccion-cab"><h2>Preguntas <em>frecuentes</em></h2></div>
        <div className="mo-faq">
          {[
            ['¿Cuesta algo postularme o estar en la agencia?', `No. ${AGENCIA.nombre} nunca cobra por representarte, por el casting ni por tus fotos. Ganamos una comisión solo cuando tú ganas por un trabajo.`],
            ['Soy menor de edad, ¿puedo?', 'Sí, desde los 16 años. Tu mamá, papá o tutor tiene que acompañarte al casting y firmar contigo.'],
            ['No tengo experiencia ni book', 'No hace falta. Si te firmamos, nosotros armamos tu primer book con fotógrafos de la agencia.'],
            ['¿Qué pasa con mis fotos?', 'Solo las ve el equipo de scouting para evaluar tu postulación. Si no avanzas, se borran a los seis meses.'],
            ['No llego a la estatura, ¿vale la pena?', 'Para comercial, fitness y belleza la estatura importa menos. Postúlate igual: lo vemos caso por caso.'],
          ].map(([p, r]) => (
            <details key={p}><summary>{p}<Plus size={18} /></summary><p className="mo-tenue">{r}</p></details>
          ))}
        </div>
      </section>
    </>
  );
}

// ── el formulario por pasos ─────────────────────────────────────────────────
function SubirFoto({ etiqueta, perfil, valor, alCambiar }) {
  const ref = useRef(null);
  return (
    <button type="button" onClick={() => ref.current?.click()} className="mo-polaroid mo-subir" style={{ textAlign: 'left', width: '100%' }}>
      <input ref={ref} type="file" accept="image/*" hidden onChange={async (ev) => {
        const f = ev.target.files?.[0]; ev.target.value = '';
        if (f) alCambiar(await miniatura(f, 420));
      }} />
      {valor ? <Foto src={valor} /> : (
        <div className="mo-foto mo-silueta">
          <Silueta perfil={perfil} />
          <span><Camera size={18} /> Toca para subir</span>
        </div>
      )}
      <div className="mo-polaroid-pie"><span className="mo-lapiz" style={{ fontSize: '1.3rem' }}>{etiqueta}</span>{valor && <Check size={16} />}</div>
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

function Formulario({ alListo }) {
  const [paso, setPaso] = useState(0);
  const [f, setF] = useState({ nombre: '', edad: '', ciudad: '', ig: '', telefono: '', board: 'mujeres', estatura: 172, cabello: '', ojos: '', fotos: [null, null], acepto: false });
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
    const n = postularse({ nombre: f.nombre.trim(), edad: Number(f.edad), estatura: Number(f.estatura), ciudad: f.ciudad.trim(), ig: f.ig || '—', telefono: f.telefono, board: f.board, cabello: f.cabello, ojos: f.ojos, fotos: f.fotos });
    alListo(n.id);
  };
  return (
    <div className="mo-hoja mo-claro mo-asistente">
      <div className="mo-asistente-cab">
        <div>
          <p className="mo-eti">Tu postulación · paso {paso + 1} de {PASOS.length}</p>
          <h2 className="mo-gigante" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginTop: 8 }}>{['Cuéntanos de ti', 'Tus medidas', 'Tus dos fotos', 'Así te vamos a ver'][paso]}</h2>
        </div>
        <ol className="mo-asistente-pasos">
          {PASOS.map((p, k) => <li key={p} className={k < paso ? 'hecho' : k === paso ? 'ahora' : ''}><span>{k < paso ? <Check size={12} /> : k + 1}</span>{p}</li>)}
        </ol>
      </div>
      <div className="mo-avance"><i style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }} /></div>

      <div key={paso} className="mo-entra" style={{ display: 'grid', gap: 18, padding: '24px 0 6px' }}>
        {paso === 0 && (
          <>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['mujeres', 'Mujer'], ['hombres', 'Hombre']].map(([v, t]) => <button key={v} type="button" className="mo-chip" aria-pressed={f.board === v} onClick={() => setF({ ...f, board: v, estatura: v === 'hombres' ? 182 : 172 })}>{t}</button>)}
            </div>
            <Campo etiqueta="Nombre completo"><input value={f.nombre} onChange={pon('nombre')} autoComplete="name" /></Campo>
            <div className="mo-dos">
              <Campo etiqueta="Edad"><input type="number" inputMode="numeric" min="14" max="40" value={f.edad} onChange={pon('edad')} /></Campo>
              <Campo etiqueta="Ciudad"><input value={f.ciudad} onChange={pon('ciudad')} /></Campo>
              <Campo etiqueta="WhatsApp"><input type="tel" inputMode="tel" value={f.telefono} onChange={pon('telefono')} autoComplete="tel" /></Campo>
              <Campo etiqueta="Instagram (opcional)"><input value={f.ig} onChange={pon('ig')} placeholder="@" /></Campo>
            </div>
            {menor && <div className="mo-aviso">Eres menor de edad: tu mamá, papá o tutor tendrá que acompañarte al casting y firmar contigo.</div>}
          </>
        )}

        {paso === 1 && (
          <>
            <div className="mo-regla-caja">
              <div>
                <p className="mo-eti">Estatura</p>
                <p className="mo-gigante" style={{ fontSize: '4.4rem', marginTop: 6 }}>{estaturaTxt(f.estatura)}</p>
                <p className={cumple ? 'mo-ok-txt' : 'mo-tenue'} style={{ fontSize: '.86rem', marginTop: 10 }}>
                  {cumple ? `✓ Cumples para pasarela y editorial (desde ${estaturaTxt(MINIMO[f.board])})` : `Para pasarela pedimos desde ${estaturaTxt(MINIMO[f.board])}; para comercial y belleza, postúlate igual.`}
                </p>
              </div>
              <div className="mo-regla" aria-hidden="true">
                {Array.from({ length: 41 }, (_, k) => 150 + k).map((cm) => <i key={cm} className={`${cm % 5 ? '' : 'larga'} ${cm <= f.estatura ? 'on' : ''}`} />)}
              </div>
            </div>
            <input className="mo-deslizador" type="range" min="150" max="200" value={f.estatura} onChange={(ev) => setF({ ...f, estatura: Number(ev.target.value) })} aria-label="Estatura en centímetros" />
            <div className="mo-dos">
              <Campo etiqueta="Color de cabello"><input value={f.cabello} onChange={pon('cabello')} placeholder="Ej. castaño oscuro" /></Campo>
              <Campo etiqueta="Color de ojos"><input value={f.ojos} onChange={pon('ojos')} placeholder="Ej. café" /></Campo>
            </div>
          </>
        )}

        {paso === 2 && (
          <>
            <div className="mo-dos">
              <SubirFoto etiqueta="de frente" valor={f.fotos[0]} alCambiar={(v) => setF((x) => ({ ...x, fotos: [v, x.fotos[1]] }))} />
              <SubirFoto etiqueta="de perfil" perfil valor={f.fotos[1]} alCambiar={(v) => setF((x) => ({ ...x, fotos: [x.fotos[0], v] }))} />
            </div>
            <div className="mo-asi">
              <div><b className="mo-ok-txt"><Check size={14} /> Así sí</b><p className="mo-tenue">Luz de día, pared lisa, ropa ajustada y sencilla, cabello suelto o recogido, sin maquillaje.</p></div>
              <div><b style={{ color: 'var(--mo-rojo)' }}><X size={14} /> Así no</b><p className="mo-tenue">Selfies, filtros, lentes de sol, fotos en grupo o con poca luz.</p></div>
            </div>
            <p className="mo-tenue" style={{ fontSize: '.76rem' }}>En la demo sirve cualquier imagen.</p>
          </>
        )}

        {paso === 3 && (
          <>
            <div className="mo-mini-composite">
              <Foto src={f.fotos[0]} />
              <div style={{ display: 'grid', gap: 8, alignContent: 'space-between' }}>
                <Foto src={f.fotos[1]} style={{ aspectRatio: '4 / 5' }} />
                <div>
                  <p className="mo-eti">Aspirante · {f.board === 'hombres' ? 'Hombres' : 'Mujeres'}</p>
                  <p className="mo-gigante" style={{ fontSize: '1.9rem', marginTop: 6 }}>{f.nombre || 'Tu nombre'}</p>
                  <p style={{ fontSize: '.84rem', marginTop: 6 }}>{f.edad || '—'} años · {estaturaTxt(f.estatura)} · {f.ciudad || '—'}</p>
                  {(f.cabello || f.ojos) && <p className="mo-tenue" style={{ fontSize: '.8rem' }}>{[f.cabello && `Cabello ${f.cabello}`, f.ojos && `ojos ${f.ojos}`].filter(Boolean).join(' · ')}</p>}
                </div>
              </div>
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '.84rem', lineHeight: 1.45 }}>
              <input type="checkbox" checked={f.acepto} onChange={(ev) => setF({ ...f, acepto: ev.target.checked })} style={{ marginTop: 3 }} />
              <span className="mo-tenue">Acepto que {AGENCIA.nombre} guarde mis fotos y datos solo para evaluar mi postulación (aviso de privacidad).</span>
            </label>
          </>
        )}
      </div>

      <div className="mo-asistente-pie">
        {paso > 0 ? <button type="button" className="mo-boton mo-boton-claro" onClick={() => setPaso(paso - 1)}><ArrowLeft size={16} /> Atrás</button> : <span />}
        {paso < PASOS.length - 1
          ? <button type="button" className="mo-boton" disabled={!listo[paso]} onClick={() => setPaso(paso + 1)}>Siguiente <ArrowRight size={16} /></button>
          : <button type="button" className="mo-boton" disabled={!listo.every(Boolean)} onClick={mandar}>Mandar mi postulación <ArrowRight size={16} /></button>}
      </div>
    </div>
  );
}

// ── después de postularse ───────────────────────────────────────────────────
const TITULOS = {
  nueva: <>La estamos<br /><em>revisando.</em></>,
  casting: <>Te queremos<br /><em>conocer.</em></>,
  firmada: <>Bienvenida<br /><em>a {AGENCIA.nombre}.</em></>,
  descartada: <>Gracias<br /><em>por postularte.</em></>,
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
      <section className="mo-estado">
        <div>
          <p className="mo-eti">Tu postulación · {a.nombre}</p>
          <h1 className="mo-gigante" style={{ fontSize: 'clamp(3rem, 7vw, 6rem)', margin: '16px 0 18px' }}>{TITULOS[a.estado]}</h1>
          <p className="mo-tenue" style={{ lineHeight: 1.65, maxWidth: 440 }}>
            {a.estado === 'nueva' && 'Te avisamos por WhatsApp y aquí ves el estado en vivo. (En la demo: ábrela desde "Booker → Scouting" y mándala al casting.)'}
            {a.estado === 'casting' && 'Tu pase para el casting abierto está listo. Ven sin maquillaje, con jeans y blusa negra, y trae una identificación.'}
            {a.estado === 'firmada' && 'Ya estás en el book como New face. Tu booker te llama para tu primera sesión de fotos.'}
            {a.estado === 'descartada' && 'Por ahora no tenemos un lugar para tu perfil. Puedes volver a postularte en seis meses.'}
          </p>
          {a.estado !== 'descartada' && (
            <ol className="mo-linea-tiempo">
              {linea.map(([t, d, hecho]) => <li key={t} className={hecho ? 'hecho' : ''}><b>{t}</b><span>{d}</span></li>)}
            </ol>
          )}
          <button type="button" className="mo-boton mo-boton-claro mo-boton-chico" style={{ marginTop: 26 }} onClick={otra}>Hacer otra postulación</button>
        </div>

        <div className="mo-estado-der">
          {a.estado === 'casting' && pase && casting ? (
            <div className="mo-pase mo-claro mo-pase-grande">
              <span className="mo-sello mo-sello-ambar">Pase · casting abierto</span>
              <p className="mo-gigante" style={{ fontSize: '1.9rem' }}>{fechaLarga(casting.fecha)}</p>
              <p className="mo-tenue" style={{ fontSize: '.86rem' }}>{hora(casting.fecha)} · {casting.lugar}</p>
              <QRCodeSVG value={pase.codigo} size={170} bgColor="#FBF9F5" fgColor="#151413" />
              <b className="mo-mono" style={{ letterSpacing: '.14em' }}>{pase.codigo}</b>
              <p className="mo-tenue" style={{ fontSize: '.76rem' }}>Lo escanean en la puerta.</p>
            </div>
          ) : (
            <div className="mo-mesa" style={{ justifyContent: 'center', position: 'relative' }}>
              {a.fotos.map((src, j) => (
                <div key={j} className="mo-polaroid" style={{ width: 200, transform: `rotate(${j ? 3 : -3}deg)` }}>
                  <Foto src={src} />
                  <div className="mo-polaroid-pie"><span className="mo-lapiz">{j ? 'perfil' : a.nombre.split(' ')[0]}</span></div>
                </div>
              ))}
              <span key={a.estado} className={`mo-sello-grande ${a.estado}`}>{SELLO[a.estado]}</span>
            </div>
          )}
        </div>
      </section>

      {a.estado !== 'descartada' && a.estado !== 'firmada' && (
        <section className="mo-seccion">
          <div className="mo-seccion-cab"><h2>Mientras <em>tanto</em></h2></div>
          <div className="mo-consejos">
            {[
              ['Practica tu caminata', 'Tacones de 8 cm, en línea recta, mirando al frente. Diez minutos al día.'],
              ['Cuida tu piel y descansa', 'La cámara nota el desvelo. Duerme bien la semana del casting.'],
              ['Ve sin maquillaje', 'Queremos ver tu cara real. Cabello limpio y suelto, uñas sin color.'],
              ['Lleva lo básico', 'Jeans ajustados, blusa negra sencilla, tacones en la bolsa y tu INE.'],
            ].map(([t, d], k) => (
              <div key={t}><span className="mo-mono mo-tenue">{String(k + 1).padStart(2, '0')}</span><b>{t}</b><p className="mo-tenue">{d}</p></div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
