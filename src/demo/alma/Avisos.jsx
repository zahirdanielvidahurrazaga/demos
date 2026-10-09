import { useEffect } from 'react';
import { Bell, CalendarDays, Clock, CreditCard, Megaphone, PartyPopper, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { a, vidrio } from './estilo';
import { Boton, Hoja } from './ui';

// Centro de avisos (la campana) e insignia recién ganada. Mismos datos que
// Be Fit: notification_logs vía useAuth (notifications, markNotificationsRead)
// y la cola badgeQueue que llena AuthContext al ganar una insignia.

const ICONOS = {
  badge_unlocked: Trophy, class_reminder: CalendarDays, reservation: CalendarDays, payment: CreditCard,
  admin: Megaphone, waitlist_promoted: PartyPopper, waitlist_confirmed: PartyPopper,
  waitlist_offer: Clock, waitlist_expired: Clock,
};

function cuando(iso) {
  const d = new Date(iso);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  return dias === 1 ? 'ayer' : dias < 7 ? `hace ${dias} días` : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function BotonAvisos({ alAbrir }) {
  const { unreadCount } = useAuth();
  return (
    <button type="button" onClick={alAbrir} aria-label={unreadCount ? `Avisos, ${unreadCount} sin leer` : 'Avisos'} style={{
      position: 'relative', width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'transparent', color: a.tinta,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Bell size={20} />
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute', top: 4, right: 3, minWidth: 17, height: 17, padding: '0 4px', boxSizing: 'border-box', borderRadius: 999,
          background: a.tinta, color: a.sobreTinta, fontSize: '0.62rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
      )}
    </button>
  );
}

export function HojaAvisos({ abierta, alCerrar }) {
  const { notifications, markNotificationsRead } = useAuth();
  // Al abrir se marcan como leídas (con una pausa para que se alcance a ver cuáles eran nuevas).
  useEffect(() => {
    if (!abierta) return undefined;
    const t = setTimeout(() => markNotificationsRead?.(), 900);
    return () => clearTimeout(t);
  }, [abierta]); // eslint-disable-line react-hooks/exhaustive-deps
  const lista = notifications || [];
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Avisos">
      <div style={{ padding: '34px 20px 26px' }}>
        <div style={{ fontSize: '1.7rem', letterSpacing: '-0.03em', marginBottom: 14 }}>
          <span style={{ fontWeight: 300 }}>Tus </span><strong style={{ fontWeight: 700 }}>avisos</strong>
        </div>
        {!lista.length && (
          <div style={{ ...vidrio, borderRadius: 24, padding: 26, textAlign: 'center', color: a.suave }}>
            <Bell size={24} style={{ opacity: 0.6 }} />
            <div style={{ marginTop: 8 }}>Aquí te avisamos de tus clases, tu lista de espera y tus pagos.</div>
          </div>
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          {lista.map((n) => {
            const Icono = ICONOS[n.type] || Bell;
            const nueva = !n.read_at;
            return (
              <div key={n.id} style={{ ...vidrio, display: 'flex', gap: 12, padding: 14, borderRadius: 22, ...(nueva ? { border: '1.5px solid var(--a-tinta)' } : {}) }}>
                <span style={{ width: 38, height: 38, borderRadius: '50%', background: nueva ? a.tinta : a.solido, color: nueva ? a.sobreTinta : a.tinta, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icono size={17} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.94rem', flex: 1 }}>{n.title}</span>
                    <span style={{ fontSize: '0.72rem', color: a.suave, whiteSpace: 'nowrap' }}>{cuando(n.sent_at || n.created_at)}</span>
                  </div>
                  <div style={{ fontSize: '0.86rem', color: a.suave, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Hoja>
  );
}

// La insignia que se acaba de ganar, a pantalla completa con brillo.
export function InsigniaNueva() {
  const { badgeQueue, dismissBadge } = useAuth();
  const b = badgeQueue?.[0];
  if (!b) return null;
  return (
    <div role="dialog" aria-label="Nueva insignia" onClick={dismissBadge} style={{
      position: 'fixed', inset: 0, zIndex: 9600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      background: 'var(--a-velo)', WebkitBackdropFilter: 'blur(16px)', backdropFilter: 'blur(16px)', animation: 'alma-velo .3s ease both',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...vidrio, background: 'var(--a-hoja)', width: 'min(360px, 100%)', borderRadius: 34, padding: '34px 24px 24px', textAlign: 'center', color: a.tinta, position: 'relative', overflow: 'hidden' }}>
        <span aria-hidden="true" style={{ position: 'absolute', top: '-30%', left: 0, width: '40%', height: '160%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)', animation: 'alma-brillo 1.6s .4s ease-out both' }} />
        <div style={{ fontSize: '0.74rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: a.suave, fontWeight: 600 }}>Nueva insignia</div>
        <div style={{ ...vidrio, width: 110, height: 110, borderRadius: '50%', margin: '18px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.4rem', animation: 'alma-insignia .7s cubic-bezier(.3,1.4,.5,1) both' }}>
          {b.icon || '★'}
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{b.label}</div>
        <p style={{ color: a.suave, margin: '6px 0 20px', lineHeight: 1.5 }}>{b.description || '¡Sigue así!'}</p>
        <Boton onClick={dismissBadge} style={{ width: '100%' }}>¡Qué bien!</Boton>
      </div>
    </div>
  );
}
