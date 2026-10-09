import { useEffect, useState } from 'react';
import { CalendarDays, House, QrCode, TrendingUp, UserRound } from 'lucide-react';
import { a, vidrio } from './estilo';

// Barra de Alma: círculos de vidrio sueltos dentro de una cápsula; el activo
// es un círculo de tinta sólida que se desliza entre ellos. El pase (QR) y el
// progreso abren lo suyo sin ser pestañas. Al bajar la página se encoge.
const BOTONES = [
  { id: 'portal', texto: 'Inicio', Icono: House },
  { id: 'agenda', texto: 'Clases', Icono: CalendarDays },
  { id: 'pase', texto: 'Mi pase', Icono: QrCode },
  { id: 'evolucion', texto: 'Progreso', Icono: TrendingUp },
  { id: 'yo', texto: 'Yo', Icono: UserRound },
];
const TAM = 48;
const SEP = 8;

export default function Barra({ vista, alIr, alPase }) {
  const activo = BOTONES.findIndex((b) => b.id === vista);
  const [chica, setChica] = useState(false);

  useEffect(() => {
    let ultimo = window.scrollY;
    const alMover = () => {
      const y = window.scrollY;
      if (Math.abs(y - ultimo) < 10) return;
      setChica(y > 140 && y > ultimo);
      ultimo = y;
    };
    window.addEventListener('scroll', alMover, { passive: true });
    return () => window.removeEventListener('scroll', alMover);
  }, []);

  const tocar = (b) => {
    if (b.id === 'pase') { alPase(); return; }
    if (b.id !== vista) { alIr(b.id); window.scrollTo({ top: 0 }); }
  };

  return (
    <nav aria-label="Navegación" style={{
      ...vidrio, position: 'fixed', zIndex: 1399, left: '50%', bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
      transform: `translateX(-50%) scale(${chica ? 0.88 : 1})`, transformOrigin: '50% 100%', transition: 'transform .45s cubic-bezier(.2,.8,.2,1)',
      display: 'flex', gap: SEP, padding: 7, borderRadius: 999, fontFamily: a.letra,
      boxShadow: 'inset 0 1px 0 #fff, 0 16px 36px rgba(52,44,30,.22)',
    }}>
      {activo >= 0 && (
        <span aria-hidden="true" style={{
          position: 'absolute', top: 7, left: 7, width: TAM, height: TAM, borderRadius: '50%', background: a.tinta,
          transform: `translateX(${activo * (TAM + SEP)}px)`, transition: 'transform .5s cubic-bezier(.3,1.35,.5,1)',
          boxShadow: '0 8px 18px var(--a-sombra), inset 0 1px 0 rgba(255,255,255,.25)',
        }} />
      )}
      {BOTONES.map((b, i) => {
        const on = i === activo;
        return (
          <button key={b.id} type="button" onClick={() => tocar(b)} aria-label={b.texto} aria-current={on ? 'page' : undefined} style={{
            position: 'relative', width: TAM, height: TAM, borderRadius: '50%', cursor: 'pointer',
            border: on ? '1px solid transparent' : '1px solid var(--a-vidrio-borde)',
            background: on ? 'transparent' : a.solidoSuave, color: on ? a.sobreTinta : a.tinta,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .25s ease, background .25s ease',
            boxShadow: on ? 'none' : 'inset 0 1px 0 var(--a-vidrio-luz)',
          }}>
            <b.Icono size={20} strokeWidth={1.8} />
          </button>
        );
      })}
    </nav>
  );
}
