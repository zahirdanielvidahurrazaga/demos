import { useMemo } from 'react';
import { ChevronRight, Hourglass, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { classDateTime } from '../../hooks/useLocalNotifications';
import { a, vidrio } from './estilo';
import { TarjetaTinta } from './ui';
import Cuenta from './Cuenta';
import FotoPerfil from './FotoPerfil';
import { cuandoTexto, diaTexto, diasHasta, fechaLarga, hora, ilimitado, reservasProximas } from './datos';

// Pestaña Yo: membresía, cómo va el mes y sus reservas.
export default function Yo({ cfg, alAbrirClase, alPlanes, tema, alTema }) {
  const { profileName, plan, classesRemaining, planExpiresAt, myReservations, globalClasses } = useAuth();
  const proximas = reservasProximas(myReservations, globalClasses);

  // Clases tomadas: este mes y semanas seguidas con al menos una.
  const { mes, racha } = useMemo(() => {
    const ahora = new Date();
    const tomadas = (myReservations || [])
      .filter((r) => r.checkedIn === true && r.date && r.time)
      .map((r) => classDateTime(r.date, r.time))
      .filter((d) => d && d < ahora);
    const enMes = tomadas.filter((d) => d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear()).length;
    const semana = (d) => Math.floor((d - new Date(2024, 0, 1)) / (7 * 86400000));
    const semanas = new Set(tomadas.map(semana));
    // La racha cuenta desde esta semana, o desde la pasada si esta aún no va.
    let s = semana(ahora);
    if (!semanas.has(s)) s -= 1;
    let n = 0;
    while (semanas.has(s)) { n += 1; s -= 1; }
    return { mes: enMes, racha: n };
  }, [myReservations]);

  const diasRestantes = diasHasta(planExpiresAt);

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '26px 20px 140px', maxWidth: 640, margin: '0 auto', fontFamily: a.letra, color: a.tinta }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <FotoPerfil tam={64} />
        <div>
          <h1 style={{ margin: 0, fontWeight: 700, fontSize: '1.9rem', letterSpacing: '-0.03em', lineHeight: 1.05 }}>{profileName}</h1>
          <div style={{ color: a.suave, fontSize: '0.88rem', marginTop: 4 }}>Clienta de {cfg.nombre}</div>
        </div>
      </div>

      {/* Membresía */}
      <TarjetaTinta radio={30} style={{ marginTop: 22 }}>
        <div style={{ padding: '22px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85 }}>Tu membresía</div>
              <div style={{ fontWeight: 300, fontSize: '1.7rem', lineHeight: 1.05 }}>{plan && plan !== 'none' ? plan : 'Sin plan activo'}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.88 }}>{planExpiresAt ? `Vence el ${fechaLarga(planExpiresAt)}` : 'Actívala en recepción'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 300, fontSize: '2.8rem', lineHeight: 0.9 }}>{ilimitado(classesRemaining) ? '∞' : classesRemaining}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>clases</div>
            </div>
          </div>
          {diasRestantes !== null && (
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.25)', marginTop: 12, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (diasRestantes / 30) * 100)}%`, height: '100%', background: '#fff', borderRadius: 2 }} />
            </div>
          )}
          <button type="button" onClick={alPlanes} style={{
            marginTop: 16, width: '100%', padding: '12px 16px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            background: 'rgba(255,255,255,.14)', color: '#fff', border: '1px solid rgba(255,255,255,.3)',
            WebkitBackdropFilter: 'blur(10px)', backdropFilter: 'blur(10px)',
          }}>{plan && plan !== 'none' ? 'Renovar o cambiar de plan' : 'Elegir un plan'}</button>
        </div>
      </TarjetaTinta>

      {/* Números */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>
        {[[mes, 'clases este mes'], [racha, racha === 1 ? 'semana seguida' : 'semanas seguidas'], [proximas.length, 'por venir']].map(([n, t]) => (
          <div key={t} style={{ ...vidrio, borderRadius: 24, padding: '14px 12px' }}>
            <div style={{ fontWeight: 300, fontSize: '2.3rem', lineHeight: 0.9, color: a.tinta }}>{n}</div>
            <div style={{ fontSize: '0.74rem', color: a.suave, marginTop: 4 }}>{t}</div>
          </div>
        ))}
      </div>

      {/* Reservas */}
      <h2 style={{ margin: '30px 0 12px', fontWeight: 600, fontSize: '1.15rem' }}>Tus reservas</h2>
      {!proximas.length && (
        <div style={{ ...vidrio, borderRadius: 24, padding: 20, color: a.suave, textAlign: 'center' }}>No tienes clases por venir.</div>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {proximas.map((r) => {
          const h = hora(r.time ?? r.clase?.time);
          const espera = r.status === 'waitlist';
          const oferta = r.status === 'offered';
          return (
            <button key={`${r.classId}-${r.id}`} type="button" onClick={() => r.clase && alAbrirClase(r.clase, r.fecha)} style={{
              ...vidrio, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 24, cursor: 'pointer',
              textAlign: 'left', color: a.tinta, fontFamily: a.letra, width: '100%',
            }}>
              <div style={{ width: 72, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '0.7rem', color: a.suave, fontWeight: 600, whiteSpace: 'nowrap' }}>{diaTexto(r.inicio)}</div>
                <div style={{ fontWeight: 300, fontSize: '1.6rem', lineHeight: 1, color: a.tinta }}>{h.texto}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{r.title ?? r.clase?.title}</div>
                <div style={{ fontSize: '0.8rem', color: a.suave, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {oferta ? <><Sparkles size={12} /> Se liberó un lugar: confírmalo</> : espera ? <><Hourglass size={12} /> En lista de espera</> : cuandoTexto(r.inicio)}
                </div>
              </div>
              <ChevronRight size={18} color="var(--a-suave)" />
            </button>
          );
        })}
      </div>

      <Cuenta cfg={cfg} tema={tema} alTema={alTema} />
    </div>
  );
}
