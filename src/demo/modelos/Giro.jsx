import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Heart } from 'lucide-react';
import { GIROS, alternarFavorito, estaturaTxt, fotoDe } from './datos';

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
const cuadro = (id, i, ligero) => `/modelos/mira/giro/${id}/${ligero ? 'ligero/' : ''}${String(i).padStart(2, '0')}.webp`;
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
  // en celular la fila se desliza con el dedo; al pasar a una sola modelo,
  // la escena regresa a su inicio para que el acomodo del frente cuadre
  const escena = useRef(null);
  useEffect(() => { if (foco && escena.current) escena.current.scrollLeft = 0; }, [foco]);
  return (
    <section className={`mo-giro mo-claro ${foco ? 'foco' : 'fila'}`} style={{ '--n': modelos.length }} aria-label="Board en giro">
      <div ref={escena} className="mo-giro-escena">
        {modelos.map((x, i) => {
          const d = i - sel;
          const lejos = Math.abs(d);
          const alFrente = foco && d === 0;
          return (
            <button key={x.id} type="button" className={`mo-giro-fig ${alFrente ? 'al-frente' : ''} ${foco && lejos > 2 ? 'oculta' : ''}`}
              tabIndex={alFrente || !foco ? 0 : -1}
              style={{
                '--d': d, '--l': lejos, '--f': i - (modelos.length - 1) / 2, '--i': i,
                zIndex: foco ? 20 - lejos : 1,
              }}
              onClick={() => { if (!alFrente) { setSel(i); setFoco(true); } }} aria-label={alFrente ? `${x.nombre}, arrastra para girarla` : `Ver a ${x.nombre}`}>
              {/* las que tienen video giran desde la fila (cada una en otro punto
                  de su vuelta); al frente además se gira arrastrando */}
              {GIROS[x.id] && (alFrente || !foco)
                ? <Girar id={x.id} {...datosGiro(x.id)} interactivo={alFrente} fase={i * 0.17} />
                : <Quieta m={x} />}
              {!foco && <span className="mo-giro-num">{x.num}</span>}
            </button>
          );
        })}
        <div className="mo-giro-niebla" aria-hidden="true" />
      </div>

      {/* al frente: lo mínimo — nombre, estatura y dos enlaces; abajo, solo las flechas */}
      {foco && (
        <div key={m.id} className="mo-giro-info">
          <button type="button" className="mo-giro-volver" onClick={() => setFoco(false)}><ArrowLeft size={13} /> Todas</button>
          <h3 className="mo-gigante">{m.nombre} <em>{m.apellido}</em></h3>
          <p className="mo-mono mo-giro-datos">Nº {m.num} · {estaturaTxt(m.estatura)}</p>
          <div className="mo-giro-acciones">
            <button type="button" onClick={() => abrir(m.id, ids)}>Ver portada</button>
            <button type="button" aria-pressed={enPackage} onClick={() => alternarFavorito(m.id)} aria-label={enPackage ? 'Quitar del package' : 'Agregar al package'}>
              <Heart size={13} fill={enPackage ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      )}

      {foco && (
        <div className="mo-giro-pie">
          <button type="button" onClick={() => mover(-1)} aria-label="Anterior"><ArrowLeft size={15} /></button>
          <button type="button" onClick={() => mover(1)} aria-label="Siguiente"><ArrowRight size={15} /></button>
        </div>
      )}
    </section>
  );
}

// La que gira: los cuadros precargados se pintan en un canvas (cambiar el src de
// un <img> parpadea). En la fila usa la versión LIGERA; al frente, la completa,
// y mientras ésta carga pinta el cuadro ligero equivalente (ya está en caché). Gira sola despacio (el medio giro se mece) y se gira
// arrastrando con el mouse o el dedo; al soltar sigue sola desde ahí.
function Girar({ id, n: nCompleto, ligero: nLigero, vuelta, interactivo = true, fase = 0 }) {
  const lienzo = useRef(null);
  useEffect(() => {
    const cv = lienzo.current;
    const ctx = cv.getContext('2d');
    const cargar = (cuantos, chico) => Array.from({ length: cuantos }, (_, i) => { const im = new Image(); im.decoding = 'async'; im.src = cuadro(id, i, chico); return im; });
    // en la fila, solo la ligera; al frente, la completa con la ligera de respaldo
    const usarLigero = !interactivo && nLigero;
    const n = usarLigero ? nLigero : nCompleto;
    const imgs = cargar(n, usarLigero);
    const respaldo = !usarLigero && nLigero ? cargar(nLigero, true) : null;
    const deRespaldo = (i) => respaldo?.[Math.min(nLigero - 1, Math.round(i * nLigero / n))];
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let meta = vuelta ? fase : 0, actual = meta, ultimo = -1, raf = 0, tocado = 0, arrastre = null;
    const listo = (im) => im.complete && im.naturalWidth;
    const pintar = () => {
      // vuelta completa: a = vueltas (0 frente, .5 espalda, 1 frente otra vez, sin tope)
      // medio giro: a = -1 (perfil a un lado) · 0 (frente) · 1 (perfil al otro lado)
      const pos = vuelta ? actual * n : (1 - Math.min(1, Math.abs(actual))) * (n - 1);
      const base = Math.floor(pos);
      const i = vuelta ? ((base % n) + n) % n : Math.min(base, n - 1);
      const j = vuelta ? (i + 1) % n : Math.min(i + 1, n - 1);
      // entre dos cuadros se funden (8 pasos): la vuelta se ve continua y no a saltos
      const mezcla = Math.round((pos - base) * 8) / 8;
      const espejo = !vuelta && actual < 0;
      const clave = `${i}·${mezcla}·${espejo}`;
      let a = imgs[i], b = imgs[j], provisional = false;
      // el completo todavía no llega: el ligero equivalente, estirado al mismo lienzo
      if (!listo(a) && listo(deRespaldo(i) || {})) { a = deRespaldo(i); b = deRespaldo(j); provisional = true; }
      if ((clave === ultimo && !provisional) || !listo(a)) return;
      if (!cv.width || (!provisional && cv.width !== a.naturalWidth)) { cv.width = a.naturalWidth; cv.height = a.naturalHeight; }
      ctx.setTransform(espejo ? -1 : 1, 0, 0, 1, espejo ? cv.width : 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.globalAlpha = 1;
      ctx.drawImage(a, 0, 0, cv.width, cv.height);
      if (mezcla > 0 && j !== i && b && listo(b)) { ctx.globalAlpha = mezcla; ctx.drawImage(b, 0, 0, cv.width, cv.height); ctx.globalAlpha = 1; }
      ultimo = provisional ? null : clave;
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
    if (interactivo) {
      cv.addEventListener('pointermove', alMover);
      cv.addEventListener('pointerdown', alBajar);
    }
    window.addEventListener('pointerup', alSoltar);
    // en celular, deslizar hacia arriba/abajo sobre ella cancela el arrastre
    // (touch-action: pan-y deja bajar por la página): también hay que soltarlo
    window.addEventListener('pointercancel', alSoltar);
    imgs[vuelta ? 0 : n - 1].onload = pintar;
    if (respaldo) respaldo[vuelta ? 0 : nLigero - 1].onload = pintar;
    raf = requestAnimationFrame(animar);
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener('pointermove', alMover);
      cv.removeEventListener('pointerdown', alBajar);
      window.removeEventListener('pointerup', alSoltar);
      window.removeEventListener('pointercancel', alSoltar);
    };
  }, [id, nCompleto, nLigero, vuelta, interactivo]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={lienzo} className={`mo-giro-cuerpo mo-giro-canvas ${interactivo ? 'se-arrastra' : ''}`} aria-hidden="true" />;
}

// La que no gira (en la fila, atrás, o sin video todavía): su cuadro de frente
// o su foto recortada.
function Quieta({ m }) {
  const src = GIROS[m.id] ? cuadro(m.id, deFrente(m.id)) : recorteDe(m);
  return src
    ? <img src={src} alt="" className={`mo-giro-cuerpo ${GIROS[m.id] ? '' : 'medio'}`} draggable="false" />
    : <img src={fotoDe(m, 'book')} alt="" className="mo-giro-cuerpo medio foto" draggable="false" />;
}
