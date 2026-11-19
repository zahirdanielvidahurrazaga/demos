import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Heart } from 'lucide-react';
import {
  PORTADAS, DIA, useAgencia, modeloPorId, fotoDe, bloqueado, alternarFavorito, registrarVista,
  estaturaTxt, mismoDia,
} from './datos';
import { Foto } from './comun';
import { Folio, Imagen } from './kade';

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA DE CADA MODELO (rediseño 18-nov-2026): la foto a sangre ocupa media
// pantalla y se queda fija mientras a la derecha corren su nombre enorme, la
// ficha en máquina de escribir, la disponibilidad de 14 días y las acciones.
// Si tiene más fotos, van abajo a todo lo ancho. Al final, la siguiente.
// ← → del teclado pasan de modelo. La usa también la app de la modelo
// ("Ver mi portada", con soloVer).
// ─────────────────────────────────────────────────────────────────────────────

// Letra por letra, para que el nombre "entre" al cambiar de modelo.
export function Letras({ texto, retraso = 0 }) {
  return (
    <span className="mo-letras" aria-label={texto}>
      {[...texto].map((c, i) => <span key={i} aria-hidden="true" style={{ animationDelay: `${retraso + i * 45}ms` }}>{c === ' ' ? ' ' : c}</span>)}
    </span>
  );
}

export default function Portada({ id, lista, alCambiar, alCerrar, alComposite, alPedir, soloVer }) {
  const e = useAgencia();
  const m = modeloPorId(e, id);
  const i = Math.max(0, lista.indexOf(id));
  const [palabra, linea] = PORTADAS[m.id] || ['New face', 'Recién firmada desde el scouting.'];
  const fav = e.favoritos.includes(m.id);
  const fotos = m.fotos || [];
  const [cual, setCual] = useState(m.principal === 'pose' && fotos[1] ? 1 : 0);

  useEffect(() => { window.scrollTo({ top: 0 }); if (!soloVer) registrarVista(id); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const tecla = (ev) => {
      if (ev.target.closest?.('input, textarea, select')) return;
      if (ev.key === 'ArrowRight') alCambiar(lista[(i + 1) % lista.length]);
      if (ev.key === 'ArrowLeft') alCambiar(lista[(i - 1 + lista.length) % lista.length]);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [i, lista, alCambiar]);

  const hechos = e.trabajos.filter((t) => t.modeloId === m.id && t.estado === 'confirmado' && t.fecha < Date.now());
  const marcas = [...new Set(hechos.filter((t) => t.tipo !== 'Casting').map((t) => t.marca))];
  const siguiente = lista.length > 1 ? modeloPorId(e, lista[(i + 1) % lista.length]) : null;

  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  const dias = Array.from({ length: 14 }, (_, k) => hoy.getTime() + k * DIA);
  const estadoDia = (d) => {
    if (bloqueado(e, m.id, d)) return 'bloq';
    const ts = e.trabajos.filter((t) => t.modeloId === m.id && mismoDia(t.fecha, d) && !['rechazado', 'liberado'].includes(t.estado));
    if (ts.some((t) => t.estado === 'confirmado' && t.tipo !== 'Casting')) return 'ocupado';
    return ts.length ? 'opcion' : '';
  };
  const dos = (n) => String(n + 1).padStart(2, '0');
  const mujer = m.board === 'mujeres';
  const ficha = [
    ['Estatura', estaturaTxt(m.estatura)],
    [mujer ? 'Busto' : 'Pecho', `${m.medidas[0]} cm`],
    ['Cintura', `${m.medidas[1]} cm`],
    [mujer ? 'Cadera' : 'Traje', mujer ? `${m.medidas[2]} cm` : m.medidas[2]],
    ['Calzado', `${m.calzado} MX`],
    ['Ojos', m.ojos], ['Cabello', m.cabello], ['Ciudad', m.ciudad], ['Idiomas', m.idiomas],
  ];

  return (
    <article className="kd kd-ficha">
      <div className="kd-ficha-arriba">
        <div className="kd-ficha-foto">
          {fotos.length
            ? <Imagen key={fotos[cual]} nombre={fotos[cual]} sizes="(max-width: 900px) 100vw, 55vw" prioridad alt={`${m.nombre} ${m.apellido}`} />
            : <Foto src={fotoDe(m)} alt={m.nombre} iniciales={`${m.nombre[0]}${m.apellido[0] || ''}`} />}
          {fotos.length > 1 && (
            <div className="kd-ficha-miniaturas">
              {fotos.map((f, k) => (
                <button key={f} type="button" aria-pressed={k === cual} onClick={() => setCual(k)} aria-label={`Foto ${k + 1}`}>
                  <img src={`/modelos/kade/${f}-1200.webp`} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="kd-ficha-der">
          <nav className="kd-ficha-nav" aria-label="Navegación de modelos">
            <button type="button" onClick={alCerrar}><ArrowLeft size={14} /> {soloVer ? 'Cerrar' : 'Board'}</button>
            <span>
              <button type="button" onClick={() => alCambiar(lista[(i - 1 + lista.length) % lista.length])} aria-label="Modelo anterior"><ArrowLeft size={14} /></button>
              {dos(i)} / {dos(lista.length - 1)}
              <button type="button" onClick={() => alCambiar(lista[(i + 1) % lista.length])} aria-label="Modelo siguiente"><ArrowRight size={14} /></button>
            </span>
          </nav>

          <Folio n={Number(m.num)}>{m.categorias.join(' · ')}</Folio>
          <h1 className="kd-ficha-nombre"><Letras texto={m.nombre} retraso={150} /><br /><Letras texto={m.apellido} retraso={350} /></h1>
          <p className="kd-ficha-palabra"><b>{palabra}.</b> {linea}</p>
          <p className="kd-ficha-bio">{m.bio}</p>

          <dl className="kd-ficha-datos">
            {ficha.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>

          <div className="kd-ficha-dispo">
            <p className="kd-mono-chico">Disponibilidad · 14 días</p>
            <div className="kd-dispo">
              {dias.map((d) => {
                const est = estadoDia(d);
                return (
                  <div key={d} className={est} title={{ ocupado: 'Ocupada', opcion: 'Con opción o casting', bloq: 'No disponible' }[est] || 'Libre'}>
                    {new Date(d).toLocaleDateString('es-MX', { weekday: 'narrow' })}<b>{new Date(d).getDate()}</b>
                  </div>
                );
              })}
            </div>
            <p className="kd-dispo-leyenda"><i className="libre" /> Libre <i className="opcion" /> Con opción <i className="ocupado" /> Ocupada</p>
          </div>

          {!soloVer && (
            <div className="kd-ficha-acciones">
              <button type="button" className="kd-boton" onClick={() => alPedir(m.id)}>Pedir casting o booking</button>
              <button type="button" className="kd-enlace" onClick={() => alComposite(m.id)}>[ Composite ]</button>
              <button type="button" className="kd-enlace" aria-pressed={fav} onClick={() => alternarFavorito(m.id)}>
                [ <Heart size={13} fill={fav ? 'currentColor' : 'none'} style={{ verticalAlign: '-2px' }} /> {fav ? 'En tu package' : 'Al package'} ]
              </button>
            </div>
          )}

          {marcas.length > 0 && (
            <div className="kd-ficha-creditos">
              <p className="kd-mono-chico">Ha trabajado con · {hechos.filter((t) => t.tipo !== 'Casting').length} trabajos en seis meses</p>
              <ul>{marcas.map((mc) => <li key={mc}>{mc}</li>)}</ul>
            </div>
          )}
        </div>
      </div>

      {siguiente && (
        <button type="button" className="kd-siguiente" onClick={() => alCambiar(siguiente.id)}>
          {siguiente.fotos?.[0] && <Imagen nombre={siguiente.fotos[0]} sizes="100vw" className="kd-siguiente-foto" />}
          <span className="kd-mono-chico">Siguiente · Nº {siguiente.num}</span>
          <span className="kd-siguiente-nombre">{siguiente.nombre} {siguiente.apellido} <ArrowRight size={48} strokeWidth={1.2} /></span>
        </button>
      )}
    </article>
  );
}
