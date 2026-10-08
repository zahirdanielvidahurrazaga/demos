import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/*
  Galería "El Estudio" — carrusel infinito automático de dos filas que se
  deslizan en direcciones opuestas (sin secuestrar el scroll). Las fotos son las
  protagonistas: se elevan al pasar el cursor (solo desktop) y al hacer clic se
  abren en grande (lightbox); clic de nuevo o fuera para cerrar y el carrusel
  sigue girando. Secciones: Estudio · Cumpleaños · Eventos.

  Para cambiar/añadir fotos: edita PHOTOS (src en /public/galeria).
*/

const CAT = {
  estudio:    { tag: '#FF914D', label: 'Estudio'    },
  cumpleanos: { tag: '#E85A8C', label: 'Cumpleaños' },
  eventos:    { tag: '#4678C8', label: 'Eventos'    },
};

const PHOTOS = [
  { src: '/galeria/evento-1.webp',  cat: 'eventos',    cap: 'Comunidad'       },
  { src: '/galeria/cumple-1.webp',  cat: 'cumpleanos', cap: 'Feliz cumple'    },
  { src: '/galeria/estudio-1.webp', cat: 'estudio',    cap: 'Nuestro espacio' },
  { src: '/galeria/cumple-2.webp',  cat: 'cumpleanos', cap: 'Tu día'          },
  { src: '/galeria/evento-2.webp',  cat: 'eventos',    cap: 'Juntas'          },
  { src: '/galeria/cumple-3.webp',  cat: 'cumpleanos', cap: 'Celébralo aquí'  },
  { src: '/galeria/evento-3.webp',  cat: 'eventos',    cap: 'Eventos'         },
  { src: '/galeria/evento-4.webp',  cat: 'eventos',    cap: 'Momentos'        },
];

const ROW_A = PHOTOS;
const ROW_B = [...PHOTOS].reverse();

function Card({ photo, tilt, onOpen }) {
  const cat = CAT[photo.cat];
  return (
    <div className="bfl-gcard" style={{ '--tilt': `${tilt}deg` }} onClick={() => onOpen(photo)}>
      <img src={photo.src} alt={cat.label} loading="lazy" decoding="async" />
      <div className="bfl-gcard__shade" />
      <span className="bfl-gcard__tag" style={{ background: cat.tag }}>{cat.label}</span>
      <span className="bfl-gcard__cap">{photo.cap}</span>
    </div>
  );
}

function Row({ photos, dir, duration, onOpen }) {
  const loop = [...photos, ...photos]; // duplicado para loop perfecto (translateX -50%)
  return (
    <div className="bfl-grow">
      <div className="bfl-gtrack" style={{ animationName: dir === 'left' ? 'bflScrollL' : 'bflScrollR', animationDuration: `${duration}s` }}>
        {loop.map((p, i) => (
          <Card key={i} photo={p} tilt={i % 2 === 0 ? -1.5 : 2} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export default function PolaroidGallery() {
  const [active, setActive] = useState(null);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => { if (e.key === 'Escape') setActive(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  return (
    <section id="estudio" style={{ position: 'relative', padding: '7rem 0 8rem', background: 'var(--surface-lowest)', overflow: 'hidden' }}>
      <style>{GALLERY_CSS}</style>

      {/* Encabezado */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: 'center', padding: '0 5%', marginBottom: '3rem' }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Galería</span>
        <h2 style={{ fontSize: 'clamp(2.4rem,6vw,4.5rem)', margin: '0.7rem 0 0.6rem', color: 'var(--black)', letterSpacing: '-0.03em', lineHeight: 1.04 }}>
          Momentos que <span style={{ color: 'var(--primary)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 500 }}>nos definen.</span>
        </h2>
        <p style={{ fontSize: '1.05rem', color: 'var(--on-surface-variant)', maxWidth: '520px', margin: '0 auto 1.2rem', lineHeight: 1.6 }}>
          Entrenar, celebrar y crear comunidad. Así se vive dentro del estudio.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {Object.values(CAT).map(c => (
            <span key={c.label} style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.tag, background: 'var(--surface)', border: `1.5px solid ${c.tag}`, padding: '0.34rem 0.85rem', borderRadius: 999 }}>{c.label}</span>
          ))}
        </div>
      </motion.div>

      {/* Carrusel de dos filas */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.9 }}
        className="bfl-gallery"
      >
        <Row photos={ROW_A} dir="left" duration={46} onOpen={setActive} />
        <Row photos={ROW_B} dir="right" duration={56} onOpen={setActive} />
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="lb"
            className="bfl-lb"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => setActive(null)}
          >
            <motion.div
              className="bfl-lb__card"
              initial={{ scale: 0.7, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.72, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 130, damping: 20, mass: 1.1 }}
              onClick={() => setActive(null)}
            >
              <img src={active.src} alt={CAT[active.cat].label} />
              <span className="bfl-gcard__tag" style={{ background: CAT[active.cat].tag, top: 16, left: 16 }}>{CAT[active.cat].label}</span>
              <div className="bfl-lb__cap">{active.cap}</div>
            </motion.div>
            <button className="bfl-lb__x" aria-label="Cerrar" onClick={() => setActive(null)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

const GALLERY_CSS = `
.bfl-gallery { display: flex; flex-direction: column; gap: 4px; }
.bfl-grow { overflow: hidden; padding: 18px 0; }
.bfl-gtrack { display: flex; gap: 22px; width: max-content; animation-timing-function: linear; animation-iteration-count: infinite; will-change: transform; }
@keyframes bflScrollL { from { transform: translateX(0); }    to { transform: translateX(-50%); } }
@keyframes bflScrollR { from { transform: translateX(-50%); } to { transform: translateX(0); } }

.bfl-gcard { position: relative; flex: 0 0 auto; width: clamp(192px, 25vw, 300px); aspect-ratio: 4 / 5;
  border-radius: 22px; overflow: hidden; background: #2a201b; cursor: pointer;
  box-shadow: 0 14px 34px rgba(40,28,20,0.20); transform: rotate(var(--tilt));
  transition: transform .45s cubic-bezier(.16,1,.3,1), box-shadow .45s, filter .45s; filter: saturate(.93); }
.bfl-gcard img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bfl-gcard__shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.62) 100%); pointer-events: none; }
.bfl-gcard__tag { position: absolute; top: 12px; left: 12px; color: #fff; font-size: 0.62rem; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase; padding: 0.3rem 0.6rem; border-radius: 999px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
.bfl-gcard__cap { position: absolute; left: 16px; right: 16px; bottom: 14px; color: #fff;
  font-family: 'Playfair Display', serif; font-style: italic; font-weight: 500; font-size: 1.45rem;
  line-height: 1.1; text-shadow: 0 2px 12px rgba(0,0,0,0.55); pointer-events: none; }

/* Hover/lift solo en dispositivos con cursor (en táctil el tap abre el lightbox) */
@media (hover: hover) {
  .bfl-grow:hover .bfl-gtrack { animation-play-state: paused; }
  .bfl-gcard:hover { transform: rotate(0deg) translateY(-9px) scale(1.05); filter: saturate(1.12);
    box-shadow: 0 28px 60px rgba(40,28,20,0.34); z-index: 3; }
}

/* Lightbox */
.bfl-lb { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center;
  padding: 6vw; background: rgba(20,14,11,0.84); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); cursor: zoom-out; }
.bfl-lb__card { position: relative; max-width: min(92vw, 540px); max-height: 86vh; border-radius: 22px; overflow: hidden;
  background: #2a201b; box-shadow: 0 40px 90px rgba(0,0,0,0.5); cursor: zoom-out; }
.bfl-lb__card img { display: block; width: 100%; height: 100%; max-height: 86vh; object-fit: cover; }
.bfl-lb__cap { position: absolute; left: 22px; right: 22px; bottom: 18px; color: #fff;
  font-family: 'Playfair Display', serif; font-style: italic; font-weight: 500; font-size: 2rem; line-height: 1.1;
  text-shadow: 0 2px 14px rgba(0,0,0,0.6);
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.0)); pointer-events: none; }
.bfl-lb__x { position: absolute; top: 18px; right: 18px; width: 42px; height: 42px; border-radius: 999px; border: none;
  background: rgba(255,255,255,0.16); color: #fff; font-size: 1.1rem; cursor: pointer; backdrop-filter: blur(6px); }

@media (max-width: 720px) {
  .bfl-gallery { gap: 2px; }
  .bfl-grow { padding: 14px 0; }
  .bfl-gtrack { gap: 14px; }
  .bfl-gcard { width: clamp(172px, 62vw, 232px); border-radius: 18px; }
  .bfl-gcard__cap { font-size: 1.25rem; }
  .bfl-lb__cap { font-size: 1.6rem; }
}
`;
