import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Heart } from 'lucide-react';
import {
  PORTADAS, DIA, useAgencia, modeloPorId, fotoDe, bloqueado, alternarFavorito, registrarVista,
  estaturaTxt, mismoDia,
} from './datos';
import { Foto } from './comun';

// ─────────────────────────────────────────────────────────────────────────────
// PORTADA DE CADA MODELO — su página en el sitio, armada como portada de
// revista: los ojos en una franja enorme con el nombre encima, el número
// vertical en contorno, la pose con su palabra, el book al centro (o su video)
// y la tira de negativos para cambiar de foto. Abajo: medidas en grande,
// disponibilidad y lo que el cliente puede hacer.
// ─────────────────────────────────────────────────────────────────────────────

// Letra por letra, para que el nombre "entre" al cambiar de modelo.
export function Letras({ texto, retraso = 0 }) {
  return (
    <span className="mo-letras" aria-label={texto}>
      {[...texto].map((c, i) => <span key={i} aria-hidden="true" style={{ animationDelay: `${retraso + i * 45}ms` }}>{c === ' ' ? ' ' : c}</span>)}
    </span>
  );
}

// El video de la modelo si existe (lo hizo Gemini); si no, su foto.
function BookOVideo({ m, tipo }) {
  const [sinVideo, setSinVideo] = useState(false);
  if (tipo === 'book' && !m.foto && !sinVideo) {
    return (
      <video key={m.id} src={`/modelos/mira/video/${m.id}.mp4`} poster={fotoDe(m, 'book')} autoPlay muted loop playsInline
        onError={() => setSinVideo(true)} aria-label={`Video de ${m.nombre}`} />
    );
  }
  return <Foto src={fotoDe(m, tipo)} alt={m.nombre} iniciales={`${m.nombre[0]}${m.apellido[0] || ''}`} />;
}

export default function Portada({ id, lista, alCambiar, alCerrar, alComposite, alPedir, soloVer }) {
  const e = useAgencia();
  const m = modeloPorId(e, id);
  const [vista, setVista] = useState('book');
  const i = lista.indexOf(id);
  const [palabra, linea] = PORTADAS[m.id] || ['New face', 'Recién firmada desde el scouting.'];
  const fav = e.favoritos.includes(m.id);

  // el padre la monta con key={id}: cada modelo empieza de cero
  useEffect(() => { window.scrollTo({ top: 0 }); if (!soloVer) registrarVista(id); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  // flechas del teclado para pasar de modelo
  useEffect(() => {
    const tecla = (ev) => {
      if (ev.target.closest?.('input, textarea, select')) return;
      if (ev.key === 'ArrowRight') alCambiar(lista[(i + 1) % lista.length]);
      if (ev.key === 'ArrowLeft') alCambiar(lista[(i - 1 + lista.length) % lista.length]);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [i, lista, alCambiar]);

  // capas al bajar: cada pieza del collage corre a su velocidad (CSS lee --sy)
  const capa = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0;
    const alBajar = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = capa.current?.getBoundingClientRect();
        if (r) capa.current.style.setProperty('--sy', Math.max(0, -r.top + 200).toFixed(1));
      });
    };
    alBajar();
    window.addEventListener('scroll', alBajar, { passive: true });
    return () => { window.removeEventListener('scroll', alBajar); cancelAnimationFrame(raf); };
  }, []);

  const hechos = e.trabajos.filter((t) => t.modeloId === m.id && t.estado === 'confirmado' && t.fecha < Date.now());
  const marcas = [...new Set(hechos.filter((t) => t.tipo !== 'Casting').map((t) => t.marca))];
  const siguiente = modeloPorId(e, lista[(i + 1) % lista.length]);

  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  const dias = Array.from({ length: 14 }, (_, k) => hoy.getTime() + k * DIA);
  const estadoDia = (d) => {
    if (bloqueado(e, m.id, d)) return 'bloq';
    const ts = e.trabajos.filter((t) => t.modeloId === m.id && mismoDia(t.fecha, d) && !['rechazado', 'liberado'].includes(t.estado));
    if (ts.some((t) => t.estado === 'confirmado' && t.tipo !== 'Casting')) return 'ocupado';
    return ts.length ? 'opcion' : '';
  };
  const cinta = ['book', 'pose', 'bn', 'polaroid'].filter((t) => !m.foto || m.foto[t]);
  const dos = (n) => String(n + 1).padStart(2, '0');

  return (
    <article className="mo-portada" ref={capa}>
      <nav className="mo-portada-nav" aria-label="Navegación de modelos">
        <button type="button" onClick={alCerrar}><ArrowLeft size={14} /> {soloVer ? 'Cerrar' : 'Board'}</button>
        <div className="mo-contador">
          <button type="button" onClick={() => alCambiar(lista[(i - 1 + lista.length) % lista.length])} aria-label="Modelo anterior"><ArrowLeft size={14} /></button>
          {dos(i)} <i /> {dos(lista.length - 1)}
          <button type="button" onClick={() => alCambiar(lista[(i + 1) % lista.length])} aria-label="Modelo siguiente"><ArrowRight size={14} /></button>
        </div>
        <span className="mo-tenue">Nº {m.num}</span>
      </nav>

      <div className="mo-collage">
        <div className="mo-col-cerca mo-revela">
          <Foto src={fotoDe(m, 'cerca')} alt="" iniciales="" />
          <h1 className="mo-col-nombre mo-gigante"><Letras texto={m.nombre} retraso={250} /></h1>
        </div>
        <div className="mo-col-num" aria-hidden="true">{m.num}</div>

        <div className="mo-col-pose mo-revela" style={{ animationDelay: '.15s' }}>
          <Foto src={fotoDe(m, 'pose')} alt="" />
          <div className="mo-col-frase">
            <b>{palabra}</b>
            <em>{linea}</em>
          </div>
        </div>

        <div className="mo-col-book mo-revela" style={{ animationDelay: '.3s' }}>
          <BookOVideo key={vista} m={m} tipo={vista} />
        </div>

        <div className="mo-col-cinta" aria-label="Fotos">
          <div className="mo-col-cinta-cuadros">
          {cinta.map((t, k) => (
            <button key={t} type="button" aria-pressed={vista === t} onClick={() => setVista(t)} aria-label={`Ver foto ${t}`}>
              <img src={fotoDe(m, t)} alt="" loading="lazy" onError={(ev) => { ev.currentTarget.style.visibility = 'hidden'; }} />
              <small>{m.num}·{k + 1}A ▸</small>
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* debajo del collage, lo mínimo (23-oct): nombre, medidas en una línea,
          disponibilidad y tres enlaces — la portada de arriba es la protagonista */}
      <section className="mo-portada-info mo-portada-min">
        <div>
          <h2 className="mo-gigante">{m.nombre} <em>{m.apellido}</em></h2>
          <p className="mo-mono mo-portada-medidas">
            {estaturaTxt(m.estatura)} · {m.medidas.join(' · ')} · Calzado {m.calzado}
          </p>
        </div>
        <div style={{ display: 'grid', gap: 22, alignContent: 'start' }}>
          <div>
            <p className="mo-eti" style={{ marginBottom: 10 }}>Disponibilidad · 14 días</p>
            <div className="mo-dispo">
              {dias.map((d) => {
                const est = estadoDia(d);
                return (
                  <div key={d} className={est} title={{ ocupado: 'Ocupada', opcion: 'Con opción o casting', bloq: 'No disponible' }[est] || 'Libre'}>
                    {new Date(d).toLocaleDateString('es-MX', { weekday: 'narrow' })}<b>{new Date(d).getDate()}</b>
                  </div>
                );
              })}
            </div>
          </div>
          {!soloVer && (
            <div className="mo-giro-acciones">
              <button type="button" onClick={() => alPedir(m.id)}>Pedir casting</button>
              <button type="button" onClick={() => alComposite(m.id)}>Composite</button>
              <button type="button" aria-pressed={fav} onClick={() => alternarFavorito(m.id)} aria-label={fav ? 'Quitar del package' : 'Agregar al package'}>
                <Heart size={14} fill={fav ? 'currentColor' : 'none'} />
              </button>
            </div>
          )}
        </div>
      </section>

      {marcas.length > 0 && (
        <section className="mo-creditos">
          <div className="mo-creditos-cab">
            <p className="mo-eti">Ha trabajado con</p>
            <p className="mo-mono mo-tenue" style={{ fontSize: '.72rem' }}>{hechos.filter((t) => t.tipo !== 'Casting').length} trabajos · {hechos.filter((t) => t.tipo === 'Casting').length} castings en seis meses</p>
          </div>
          <ul>
            {marcas.map((mc, k) => <li key={mc} style={{ animationDelay: `${k * 60}ms` }}>{mc}<sup className="mo-mono">{String(k + 1).padStart(2, '0')}</sup></li>)}
          </ul>
        </section>
      )}

      {lista.length > 1 && siguiente && (
        <button type="button" className="mo-siguiente" onClick={() => alCambiar(siguiente.id)}>
          <span className="mo-eti">Siguiente · Nº {siguiente.num}</span>
          <span className="mo-gigante mo-siguiente-nombre">{siguiente.nombre}<ArrowRight className="mo-siguiente-flecha" size={56} strokeWidth={1} /></span>
          <span className="mo-siguiente-foto"><img src={fotoDe(siguiente, 'cerca')} alt="" loading="lazy" /></span>
        </button>
      )}
    </article>
  );
}
