import { useMemo } from 'react';
import { Check, ChevronRight, Hourglass, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { a, vidrio } from './estilo';
import { clasesDelDia, estadoDeClase, hora, nombreCoach, proximosDias } from './datos';

// Cápsulas de vidrio con el día; la elegida sale en relieve.
export function TiraDias({ fecha, alElegir, dias = 7 }) {
  const { globalClasses, myReservations } = useAuth();
  const lista = useMemo(() => proximosDias(dias), [dias]);
  const mias = useMemo(() => new Set((myReservations || []).map((r) => r.date).filter(Boolean)), [myReservations]);
  return (
    <div className="alma-tira" role="tablist" aria-label="Día" style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '6px 20px 10px', margin: '0 -20px' }}>
      {lista.map((d) => {
        const on = d.fecha === fecha;
        const hay = clasesDelDia(globalClasses, d.fecha).length > 0;
        return (
          <button key={d.fecha} type="button" role="tab" aria-selected={on} onClick={() => alElegir(d.fecha)} style={{
            ...vidrio, flexShrink: 0, width: 50, padding: '9px 0 5px', borderRadius: 999, cursor: 'pointer', fontFamily: a.letra,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: a.tinta, opacity: hay || on ? 1 : 0.45,
            ...(on ? {
              background: 'linear-gradient(170deg, rgba(185,168,140,.5), var(--a-solido-suave))',
              boxShadow: 'inset 0 1px 0 var(--a-vidrio-luz), 0 12px 24px var(--a-sombra)',
              transform: 'translateY(-3px)',
            } : {}),
            transition: 'transform .25s ease, background .25s ease',
          }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 500 }}>{d.i === 0 ? 'Hoy' : d.dia}</span>
            <span style={{
              width: 38, height: 38, borderRadius: '50%', background: a.solido, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: '0.92rem', position: 'relative', boxShadow: '0 2px 6px rgba(52,44,30,.08)',
            }}>
              {d.num}
              {mias.has(d.fecha) && <span style={{ position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: '50%', background: a.tinta }} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Etiqueta({ estado, c }) {
  return {
    mia: <><Check size={12} /> Reservada</>,
    espera: <><Hourglass size={12} /> En espera</>,
    oferta: <><Sparkles size={12} /> Lugar libre</>,
    llena: 'Llena',
    paso: 'Ya pasó',
    libre: c.spots === 1 ? 'Queda 1' : c.spots <= 3 ? `Quedan ${c.spots}` : `${c.spots} lugares`,
  }[estado.tipo];
}

// Lista vertical de las clases de un día (pestaña Clases).
export function ListaDia({ fecha, alAbrir }) {
  const { globalClasses, myReservations, coaches, classesLoaded } = useAuth();
  const clases = clasesDelDia(globalClasses, fecha);
  if (!classesLoaded) return <div style={{ padding: 30, textAlign: 'center', color: a.suave }}>Cargando el horario…</div>;
  if (!clases.length) {
    return (
      <div style={{ ...vidrio, borderRadius: 28, padding: '30px 20px', textAlign: 'center', color: a.suave }}>
        <div style={{ fontWeight: 600, color: a.tinta, fontSize: '1.05rem' }}>Día de descanso</div>
        No hay clases este día.
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {clases.map((c, i) => {
        const estado = estadoDeClase(c, myReservations, fecha);
        const h = hora(c.time);
        const mia = ['mia', 'oferta'].includes(estado.tipo);
        return (
          <button key={c.id} type="button" onClick={() => alAbrir(c, fecha)} style={{
            ...vidrio, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px 10px 6px', borderRadius: 26, cursor: 'pointer',
            textAlign: 'left', fontFamily: a.letra, color: a.tinta, width: '100%', opacity: estado.tipo === 'paso' ? 0.5 : 1,
            animation: `alma-entra .45s ${i * 0.04}s both ease`,
          }}>
            <div style={{ width: 70, flexShrink: 0, textAlign: 'center', padding: '10px 0', borderRight: `1px solid ${a.linea}` }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.03em' }}>{h.texto}</div>
              <div style={{ fontSize: '0.7rem', color: a.suave, marginTop: 3 }}>{h.sufijo}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
              <div style={{ fontSize: '0.8rem', color: a.suave, marginTop: 3 }}>con {nombreCoach(c, coaches)}{c.level ? ` · ${c.level}` : ''}</div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7, padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                background: mia ? a.tinta : a.solidoSuave, color: mia ? a.sobreTinta : a.tinta,
              }}><Etiqueta estado={estado} c={c} /></span>
            </div>
            <ChevronRight size={18} color="var(--a-suave)" style={{ flexShrink: 0 }} />
          </button>
        );
      })}
    </div>
  );
}
