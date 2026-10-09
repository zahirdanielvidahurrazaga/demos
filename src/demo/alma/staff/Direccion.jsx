import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarClock, Users } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { mexicoTodayStr } from '../../../lib/dates';
import Admin from '../../../pages/Admin';
import { a, vidrio } from '../estilo';
import { Avatar, TarjetaTinta } from '../ui';
import { fechaLarga, hora } from '../datos';
import { Encabezado } from './Panel';
import { clasesDeHoy } from './checkin';
import { estilosAdmin, useVidrioAdmin } from './pielAdmin';

// ─────────────────────────────────────────────────────────────────────────────
// DIRECCIÓN — Studio Alma (modo mixto). "Hoy" es una pantalla propia; las demás
// secciones son las de Be Fit (pages/Admin.jsx incrustado, sin su menú) con la
// piel de Alma: misma letra, vidrio y colores (pielAdmin.js).
// ─────────────────────────────────────────────────────────────────────────────

export default function Direccion({ seccion, recepcion }) {
  if (seccion === 'hoy') return <Hoy />;
  return <SeccionBeFit seccion={seccion} recepcion={recepcion} />;
}

export function SeccionBeFit({ seccion, recepcion }) {
  const ref = useVidrioAdmin();
  return (
    <div ref={ref} className="alma-admin">
      <style>{estilosAdmin}</style>
      <Admin seccion={seccion} incrustado recepcion={recepcion} />
    </div>
  );
}

const saludoDelDia = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };
const pesos = (n) => `$${Number(n || 0).toLocaleString('es-MX')}`;

function Hoy() {
  const { globalClasses, profileName } = useAuth();
  const [datos, setDatos] = useState(null);
  const hoy = useMemo(() => clasesDeHoy(globalClasses), [globalClasses]);

  useEffect(() => {
    let vivo = true;
    const ahora = new Date();
    // Día y mes de MÉXICO (UTC-6, sin horario de verano), no de la zona de la compu.
    const hoyMx = mexicoTodayStr();
    const inicioDia = new Date(`${hoyMx}T00:00:00-06:00`).toISOString();
    const inicioMes = new Date(`${hoyMx.slice(0, 8)}01T00:00:00-06:00`).toISOString();
    const en7 = new Date(ahora.getTime() + 7 * 86400000).toISOString();
    Promise.all([
      supabase.from('sales').select('amount, plan_name, client_name, created_at, voided').gte('created_at', inicioMes).order('created_at', { ascending: false }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'CLIENT').eq('membership_status', 'ACTIVE'),
      supabase.from('users').select('id, full_name, avatar_url, membership_plan, plan_expires_at').eq('role', 'CLIENT').gte('plan_expires_at', ahora.toISOString()).lte('plan_expires_at', en7).order('plan_expires_at'),
      supabase.from('reservations').select('id, classes!inner(date)', { count: 'exact', head: true }).eq('checked_in', true).eq('classes.date', mexicoTodayStr()),
    ]).then(([ventas, activas, vencen, entradas]) => {
      if (!vivo) return;
      const validas = (ventas.data || []).filter((v) => !v.voided);
      setDatos({
        mes: validas.reduce((s, v) => s + Number(v.amount || 0), 0),
        ventasMes: validas.length,
        hoy: validas.filter((v) => new Date(v.created_at).getTime() >= new Date(inicioDia).getTime()).reduce((s, v) => s + Number(v.amount || 0), 0),
        ultimas: validas.slice(0, 5),
        activas: activas.count ?? 0,
        vencen: vencen.data || [],
        entradas: entradas.count ?? 0,
      });
    });
    return () => { vivo = false; };
  }, []);

  const cupo = hoy.reduce((s, x) => s + (x.c.max_spots ?? 0), 0);
  const ocupados = hoy.reduce((s, x) => s + Math.max(0, (x.c.max_spots ?? 0) - (x.c.spots ?? 0)), 0);
  const ocupacion = cupo ? Math.round((ocupados / cupo) * 100) : 0;
  const saludo = saludoDelDia();

  return (
    <>
      <Encabezado ligero={`${saludo},`} fuerte={(profileName || 'Dirección').split(' ')[0]} sub="Así va el estudio hoy." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <TarjetaTinta radio={28}>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: '0.74rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8 }}>Ventas del mes</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 300, letterSpacing: '-0.03em', marginTop: 6 }}>{datos ? pesos(datos.mes) : '—'}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: 4 }}>{datos ? `${datos.ventasMes} ventas · hoy ${pesos(datos.hoy)}` : 'Cargando…'}</div>
          </div>
        </TarjetaTinta>
        {[
          [datos?.activas ?? '—', 'clientas activas'],
          [`${ocupacion}%`, `ocupación de hoy · ${ocupados}/${cupo}`],
          [datos?.entradas ?? '—', 'entradas registradas hoy'],
        ].map(([n, t]) => (
          <div key={t} style={{ ...vidrio, borderRadius: 28, padding: 20 }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 300, letterSpacing: '-0.03em' }}>{n}</div>
            <div style={{ fontSize: '0.82rem', color: a.suave, marginTop: 4 }}>{t}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginTop: 12 }}>
        <section style={{ ...vidrio, borderRadius: 28, padding: 18 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 700 }}>Clases de hoy</h2>
          {!hoy.length && <div style={{ color: a.suave, fontSize: '0.88rem' }}>Hoy no hay clases.</div>}
          <div style={{ display: 'grid', gap: 10 }}>
            {hoy.map(({ c }) => {
              const total = c.max_spots ?? 0;
              const dentro = Math.max(0, total - (c.spots ?? 0));
              const h = hora(c.time);
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 62, fontSize: '1.15rem', fontWeight: 300 }}>{h.texto}<span style={{ fontSize: '0.7rem', color: a.suave, marginLeft: 2 }}>{h.sufijo}</span></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title} <span style={{ color: a.suave, fontWeight: 400 }}>· {c.instructor}</span></div>
                    <div style={{ height: 5, borderRadius: 3, background: a.linea, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${total ? (dentro / total) * 100 : 0}%`, height: '100%', background: a.tinta, borderRadius: 3 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Users size={13} />{dentro}/{total}</span>
                </div>
              );
            })}
          </div>
        </section>

        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <section style={{ ...vidrio, borderRadius: 28, padding: 18 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><CalendarClock size={17} /> Por vencer esta semana</h2>
            {datos && !datos.vencen.length && <div style={{ color: a.suave, fontSize: '0.88rem' }}>Nadie vence en los próximos 7 días.</div>}
            {(datos?.vencen || []).map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid var(--a-linea)' }}>
                <Avatar src={u.avatar_url} nombre={u.full_name} tam={32} borde="transparent" />
                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}>{u.full_name}</span>
                <span style={{ fontSize: '0.78rem', color: a.suave }}>{u.membership_plan} · {fechaLarga(u.plan_expires_at)}</span>
              </div>
            ))}
          </section>
          <section style={{ ...vidrio, borderRadius: 28, padding: 18 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><ArrowUpRight size={17} /> Últimas ventas</h2>
            {datos && !datos.ultimas.length && <div style={{ color: a.suave, fontSize: '0.88rem' }}>Sin ventas este mes.</div>}
            {(datos?.ultimas || []).map((v, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid var(--a-linea)' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem' }}>{v.client_name || 'Clienta'}</span>
                  <span style={{ fontSize: '0.76rem', color: a.suave }}>{v.plan_name} · {new Date(v.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 300 }}>{pesos(v.amount)}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
