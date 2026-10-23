import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Heart } from 'lucide-react';
import { GIROS, alternarFavorito, estaturaTxt, medidasTxt, fotoDe } from './datos';

// ─────────────────────────────────────────────────────────────────────────────
// VISTA "GIRO" del book — idea tomada de un TikTok que pasó Zahir (22-oct; solo
// la idea): primero TODAS en fila, chiquitas y de cuerpo entero, en un estudio
// claro. Al tocar una, crece al centro y las demás se van atrás, a la niebla;
// la elegida gira sola despacio y se puede girar arrastrando (no sigue al
// cursor: Zahir lo pidió así). "Todas" regresa a la fila.
//
// No es 3D: es un video de la modelo girando (Gemini/Veo) partido en cuadros
// con el fondo recortado (Vision de macOS) → public/modelos/mira/giro/<id>/NN.webp
// (scripts/giro/hacer-giro.sh). Dos tipos (GIROS en datos.js): número = medio
// giro, del perfil (00) al frente (último), y el otro lado es el mismo cuadro en
// espejo; { n, vuelta: true } = vuelta completa de 360° empezando de frente
// (00), sin tope. Sin video todavía, sale su foto de book recortada.
// ─────────────────────────────────────────────────────────────────────────────

const recorteDe = (m) => (GIROS[m.id] || m.foto ? null : `/modelos/mira/recorte/${m.id}.webp`);
const cuadro = (id, i) => `/modelos/mira/giro/${id}/${String(i).padStart(2, '0')}.webp`;
const datosGiro = (id) => { const g = GIROS[id]; return !g ? null : typeof g === 'number' ? { n: g, vuelta: false } : g; };
// el cuadro de frente: el último en medio giro, el primero en vuelta completa
const deFrente = (id) => { const g = datosGiro(id); return g.vuelta ? 0 : g.n - 1; };

export default function Giro({ e, modelos, abrir }) {
  const [sel, setSel] = useState(0);
  const [foco, setFoco] = useState(false);         // false = todas en fila; true = una al frente
  const m = modelos[Math.min(sel, modelos.length - 1)];
  const ids = modelos.map((x) => x.id);
  const mover = (d) => setSel((s) => (s + d + modelos.length) % modelos.length);

  useEffect(() => {
    const tecla = (ev) => {
      if (ev.target.closest?.('input, select, textarea')) return;
      if (ev.key === 'ArrowRight') { setFoco(true); mover(1); }
      if (ev.key === 'ArrowLeft') { setFoco(true); mover(-1); }
      if (ev.key === 'Escape') setFoco(false);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [modelos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const enPackage = e.favoritos.includes(m.id);
  return (
    <section className={`mo-giro mo-claro ${foco ? 'foco' : 'fila'}`} style={{ '--n': modelos.length }} aria-label="Board en giro">
      <div className="mo-giro-escena">
        {modelos.map((x, i) => {
          const d = i - sel;
          const lejos = Math.abs(d);
          const alFrente = foco && d === 0;
          return (
            <button key={x.id} type="button" className={`mo-giro-fig ${alFrente ? 'al-frente' : ''} ${foco && lejos > 2 ? 'oculta' : ''}`}
              tabIndex={alFrente || !foco ? 0 : -1}
              style={{ '--d': d, '--l': lejos, '--f': i - (modelos.length - 1) / 2, zIndex: foco ? 20 - lejos : 1 }}
              onClick={() => { if (!alFrente) { setSel(i); setFoco(true); } }} aria-label={alFrente ? `${x.nombre}, arrastra para girarla` : `Ver a ${x.nombre}`}>
              {alFrente && GIROS[x.id] ? <Girar id={x.id} {...datosGiro(x.id)} /> : <Quieta m={x} />}
              {!foco && <span className="mo-giro-num">{x.num}</span>}
            </button>
          );
        })}
        <div className="mo-giro-niebla" aria-hidden="true" />
      </div>

      {!foco && <p className="mo-giro-invita">Toca a una para verla de cerca</p>}

      {foco && (
        <div key={m.id} className="mo-giro-info">
          <button type="button" className="mo-giro-volver" onClick={() => setFoco(false)}><ArrowLeft size={14} /> Todas</button>
          <p className="mo-eti">Nº {m.num} · {m.categorias.join(' · ')}</p>
          <h3 className="mo-gigante">{m.nombre}<br /><em>{m.apellido}</em></h3>
          <p className="mo-mono mo-giro-datos">{estaturaTxt(m.estatura)} · {medidasTxt(m)}<br />{m.ojos} · {m.cabello} · {m.ciudad}</p>
          <div className="mo-giro-acciones">
            <button type="button" className="mo-boton mo-boton-chico" onClick={() => abrir(m.id, ids)}>Ver portada <ArrowRight size={14} /></button>
            <button type="button" className="mo-boton mo-boton-claro mo-boton-chico" aria-pressed={enPackage} onClick={() => alternarFavorito(m.id)}>
              <Heart size={14} fill={enPackage ? 'currentColor' : 'none'} /> {enPackage ? 'En tu package' : 'Al package'}
            </button>
          </div>
        </div>
      )}

      {foco && (
        <div className="mo-giro-pie">
          <button type="button" className="mo-giro-flecha" onClick={() => mover(-1)} aria-label="Anterior"><ArrowLeft size={18} /></button>
          <div className="mo-giro-fila" role="group" aria-label="Elegir modelo">
            {modelos.map((x, i) => (
              <button key={x.id} type="button" aria-pressed={i === sel} onClick={() => setSel(i)} aria-label={x.nombre}>
                <img src={recorteDe(x) || (GIROS[x.id] ? cuadro(x.id, deFrente(x.id)) : fotoDe(x, 'book'))} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          <button type="button" className="mo-giro-flecha" onClick={() => mover(1)} aria-label="Siguiente"><ArrowRight size={18} /></button>
          <p className="mo-giro-ayuda">{GIROS[m.id] ? 'Arrastra para girarla · ← → otra modelo' : '← → para pasar de modelo'}</p>
        </div>
      )}
    </section>
  );
}

// La que gira: los cuadros precargados se pintan en un canvas (cambiar el src de
// un <img> parpadea). Gira sola despacio (el medio giro se mece) y se gira
// arrastrando con el mouse o el dedo; al soltar sigue sola desde ahí.
function Girar({ id, n, vuelta }) {
  const lienzo = useRef(null);
  useEffect(() => {
    const cv = lienzo.current;
    const ctx = cv.getContext('2d');
    const imgs = Array.from({ length: n }, (_, i) => { const im = new Image(); im.src = cuadro(id, i); return im; });
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let meta = 0, actual = 0, ultimo = -1, raf = 0, tocado = 0, arrastre = null;
    const pintar = () => {
      // vuelta completa: a = vueltas (0 frente, .5 espalda, 1 frente otra vez, sin tope)
      // medio giro: a = -1 (perfil a un lado) · 0 (frente) · 1 (perfil al otro lado)
      const i = vuelta
        ? ((Math.round(actual * n) % n) + n) % n
        : Math.round((1 - Math.min(1, Math.abs(actual))) * (n - 1));
      const espejo = !vuelta && actual < 0;
      const clave = i * 2 + (espejo ? 1 : 0);
      const im = imgs[i];
      if (clave === ultimo || !im.complete || !im.naturalWidth) return;
      if (cv.width !== im.naturalWidth) { cv.width = im.naturalWidth; cv.height = im.naturalHeight; }
      ctx.setTransform(espejo ? -1 : 1, 0, 0, 1, espejo ? cv.width : 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(im, 0, 0);
      ultimo = clave;
    };
    const animar = (t) => {
      raf = requestAnimationFrame(animar);
      // sin tocarla: la vuelta completa gira sola despacio; el medio giro se mece
      if (!quieto && Date.now() - tocado > 1600 && !arrastre) meta = vuelta ? meta + 0.0016 : Math.sin(t / 1400) * 0.55;
      actual += (meta - actual) * 0.12;
      pintar();
    };
    // arrastrar (mouse o dedo) la gira; al soltar sigue sola desde donde quedó
    const alMover = (ev) => {
      if (!arrastre) return;
      tocado = Date.now();
      const a = arrastre.a + (ev.clientX - arrastre.x) / (vuelta ? 420 : 180);
      meta = vuelta ? a : Math.max(-1, Math.min(1, a));
    };
    const alBajar = (ev) => { arrastre = { x: ev.clientX, a: meta }; tocado = Date.now(); cv.setPointerCapture?.(ev.pointerId); };
    const alSoltar = () => { arrastre = null; };
    cv.addEventListener('pointermove', alMover);
    cv.addEventListener('pointerdown', alBajar);
    window.addEventListener('pointerup', alSoltar);
    // en celular, deslizar hacia arriba/abajo sobre ella cancela el arrastre
    // (touch-action: pan-y deja bajar por la página): también hay que soltarlo
    window.addEventListener('pointercancel', alSoltar);
    imgs[vuelta ? 0 : n - 1].onload = pintar;
    raf = requestAnimationFrame(animar);
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener('pointermove', alMover);
      cv.removeEventListener('pointerdown', alBajar);
      window.removeEventListener('pointerup', alSoltar);
      window.removeEventListener('pointercancel', alSoltar);
    };
  }, [id, n, vuelta]);
  return <canvas ref={lienzo} className="mo-giro-cuerpo mo-giro-canvas" aria-hidden="true" />;
}

// La que no gira (en la fila, atrás, o sin video todavía): su cuadro de frente
// o su foto recortada.
function Quieta({ m }) {
  const src = GIROS[m.id] ? cuadro(m.id, deFrente(m.id)) : recorteDe(m);
  return src
    ? <img src={src} alt="" className={`mo-giro-cuerpo ${GIROS[m.id] ? '' : 'medio'}`} draggable="false" />
    : <img src={fotoDe(m, 'book')} alt="" className="mo-giro-cuerpo medio foto" draggable="false" />;
}
