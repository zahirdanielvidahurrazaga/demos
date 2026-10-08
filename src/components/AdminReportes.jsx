import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, Users, Coffee, CalendarDays, Award, CreditCard, Gift, Activity, Crown, Receipt, BarChart3, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const money = (n) => `$${Math.round(n || 0).toLocaleString('es-MX')}`;
const PRIMARY = '#FF914D';
const INK = '#1A1C1E';

const SUBTABS = [
  ['resumen', 'Resumen', BarChart3],
  ['finanzas', 'Finanzas', CreditCard],
  ['clases', 'Clases', CalendarDays],
  ['coaches', 'Coaches', Award],
  ['cafeteria', 'Cafetería', Coffee],
];
const RANGES = [['7d', '7 días', 7], ['30d', '30 días', 30], ['90d', '90 días', 90], ['1y', '1 año', 365]];

// ---- Liquid glass pill ----
function Pill({ active, onClick, children }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.95 }}
      style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 15px', borderRadius: '999px', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', whiteSpace: 'nowrap', flexShrink: 0,
        border: active ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.55)',
        background: active ? 'linear-gradient(135deg, #FF914D, #E68245)' : 'rgba(255,255,255,0.55)',
        color: active ? '#fff' : 'var(--on-surface-variant)',
        backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: active ? '0 8px 20px rgba(255,145,77,0.35)' : '0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)' }}>
      {children}
    </motion.button>
  );
}

// ---- KPI minimalista ----
function Kpi({ label, value, sub, Icon }) {
  return (
    <div style={{ padding: '16px 18px', background: '#fff', borderRadius: '18px', border: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
        <Icon size={15} color={PRIMARY} />
        <span style={{ fontSize: '0.68rem', color: 'var(--on-surface-variant)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: INK, fontFamily: 'var(--font-display)', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)', marginTop: '6px', fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

// ---- Barras (naranja marca) ----
function MiniBars({ series, height = 72 }) {
  const max = Math.max(1, ...series.map(s => s.amount));
  return (
    <div style={{ height, display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
      {series.map((s, i) => (
        <div key={i} title={`${s.date}: ${money(s.amount)}`} style={{ flex: 1, height: `${Math.max(3, (s.amount / max) * 100)}%`, background: i === series.length - 1 ? PRIMARY : 'rgba(255,145,77,0.22)', borderRadius: '3px 3px 2px 2px', minWidth: '2px' }} />
      ))}
    </div>
  );
}

// ---- Fila de ranking (barra naranja) ----
function RankRow({ rank, title, sub, value, pct, avatar, top }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#fff', borderRadius: '16px', border: `1px solid ${top ? 'rgba(255,145,77,0.3)' : 'rgba(0,0,0,0.05)'}` }}>
      <div style={{ width: '22px', fontWeight: 800, color: top ? PRIMARY : 'var(--on-surface-variant)', fontFamily: 'var(--font-display)', fontSize: top ? '1.05rem' : '0.92rem', flexShrink: 0, textAlign: 'center' }}>{rank}</div>
      {avatar !== undefined && (
        avatar
          ? <img src={avatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,145,77,0.14)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{(title || '?').charAt(0)}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontWeight: 700, color: INK, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
          <span style={{ fontWeight: 800, color: INK, fontSize: '0.9rem', flexShrink: 0 }}>{value}</span>
        </div>
        <div style={{ height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 80, damping: 18 }} style={{ height: '100%', background: 'linear-gradient(90deg, #FF914D, #FFB37A)', borderRadius: '4px' }} />
        </div>
        {sub && <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', marginTop: '4px', fontWeight: 500 }}>{sub}</div>}
      </div>
    </div>
  );
}

const SectionTitle = ({ children }) => (
  <h3 style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)', margin: '4px 0 12px' }}>{children}</h3>
);

export default function AdminReportes() {
  const { allUsers, coaches } = useAuth();
  const [subtab, setSubtab] = useState('resumen');
  const [range, setRange] = useState(30); // días
  const [fin, setFin] = useState(null);
  const [finErr, setFinErr] = useState(false);
  const [finLoading, setFinLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [cafeOrders, setCafeOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Datos locales (una vez)
  useEffect(() => {
    (async () => {
      const { data: resv } = await supabase.from('reservations')
        .select('id, checked_in, status, created_at, classes(title, instructor, coach_id, category)')
        .order('created_at', { ascending: false }).limit(5000);
      setReservations(resv || []);
      const { data: orders } = await supabase.from('cafe_orders')
        .select('id, items, total, created_at, is_gift, status')
        .in('status', ['paid', 'preparing', 'ready', 'completed'])
        .order('created_at', { ascending: false }).limit(3000);
      setCafeOrders(orders || []);
      setLoading(false);
    })();
  }, []);

  // Finanzas (Stripe) — se re-consulta al cambiar el rango
  useEffect(() => {
    setFinLoading(true); setFinErr(false);
    supabase.functions.invoke('admin-analytics', { body: { days: range } })
      .then(({ data, error }) => { if (error || data?.error) setFinErr(true); else setFin(data); })
      .catch(() => setFinErr(true))
      .finally(() => setFinLoading(false));
  }, [range]);

  const since = useMemo(() => Date.now() - range * 86400000, [range]);
  const inRange = (iso) => iso && new Date(iso).getTime() >= since;

  const coachById = useMemo(() => { const m = new Map(); (coaches || []).forEach(c => m.set(c.id, c)); return m; }, [coaches]);

  const classRank = useMemo(() => {
    const m = new Map();
    reservations.filter(r => inRange(r.created_at)).forEach(r => {
      const t = r.classes?.title || 'Sin nombre';
      const e = m.get(t) || { reservas: 0, asistencias: 0 };
      e.reservas++; if (r.checked_in) e.asistencias++;
      m.set(t, e);
    });
    return [...m.entries()].map(([title, v]) => ({ title, ...v })).sort((a, b) => b.asistencias - a.asistencias || b.reservas - a.reservas);
  }, [reservations, since]); // eslint-disable-line

  const coachRank = useMemo(() => {
    const m = new Map();
    reservations.filter(r => inRange(r.created_at)).forEach(r => {
      const cid = r.classes?.coach_id;
      const coach = cid ? coachById.get(cid) : null;
      const name = coach?.full_name || r.classes?.instructor || 'Sin asignar';
      const key = cid || name;
      const e = m.get(key) || { name, avatar: coach?.avatar_url || null, reservas: 0, asistencias: 0 };
      e.reservas++; if (r.checked_in) e.asistencias++;
      m.set(key, e);
    });
    return [...m.values()].sort((a, b) => b.asistencias - a.asistencias || b.reservas - a.reservas);
  }, [reservations, coachById, since]); // eslint-disable-line

  const cafe = useMemo(() => {
    const prod = new Map(); let revenue = 0, gifts = 0; let n = 0;
    cafeOrders.filter(o => inRange(o.created_at)).forEach(o => {
      revenue += o.total || 0; n++; if (o.is_gift) gifts++;
      (o.items || []).forEach(it => {
        const e = prod.get(it.name) || { qty: 0, revenue: 0 };
        e.qty += it.qty || 1;
        e.revenue += (it.line_total != null ? it.line_total : (it.base_price || 0) * (it.qty || 1));
        prod.set(it.name, e);
      });
    });
    const ranking = [...prod.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.qty - a.qty);
    return { revenue, orders: n, gifts, ranking, avg: n ? Math.round(revenue / n) : 0 };
  }, [cafeOrders, since]); // eslint-disable-line

  const members = useMemo(() => {
    const clients = (allUsers || []).filter(u => u.role === 'CLIENT');
    const active = clients.filter(u => u.membership_status === 'ACTIVE');
    const nuevas = clients.filter(u => inRange(u.created_at)).length;
    return { total: clients.length, active: active.length, nuevas };
  }, [allUsers, since]); // eslint-disable-line

  const totalAsistencias = useMemo(() => reservations.filter(r => r.checked_in && inRange(r.created_at)).length, [reservations, since]); // eslint-disable-line
  const rangeLabel = (RANGES.find(r => r[2] === range) || [, ''])[1];

  return (
    <section>
      <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '14px', color: INK }}>Reportes & Analítica</h2>

      {/* Sub-pestañas (glass) */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '12px', WebkitOverflowScrolling: 'touch' }}>
        {SUBTABS.map(([id, label, Icon]) => (
          <Pill key={id} active={subtab === id} onClick={() => setSubtab(id)}><Icon size={15} /> {label}</Pill>
        ))}
      </div>

      {/* Filtro de fechas (glass) */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '22px' }}>
        {RANGES.map(([id, label, d]) => (
          <Pill key={id} active={range === d} onClick={() => setRange(d)}>{label}</Pill>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={subtab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>

          {/* ===== RESUMEN ===== */}
          {subtab === 'resumen' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '12px' }}>
                <Kpi label="Ingresos" value={fin ? money(fin.gross) : (finErr ? '—' : '…')} sub={fin?.mode === 'test' ? 'Stripe · prueba' : 'Stripe'} Icon={DollarSign} />
                <Kpi label="Socias activas" value={members.active} sub={`${members.nuevas} nuevas`} Icon={Users} />
                <Kpi label="Asistencias" value={totalAsistencias} sub="check-ins" Icon={Activity} />
                <Kpi label="Pedidos café" value={cafe.orders} sub={money(cafe.revenue)} Icon={Coffee} />
              </div>

              <div style={{ background: '#fff', borderRadius: '22px', border: '1px solid rgba(0,0,0,0.05)', padding: '22px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Ingresos · {rangeLabel}</div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: INK, fontFamily: 'var(--font-display)', lineHeight: 1, marginBottom: '18px' }}>{fin ? money(fin.gross) : (finErr ? 'Sin datos' : '…')}</div>
                {fin && <MiniBars series={fin.series} />}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                <div>
                  <SectionTitle>Clase más concurrida</SectionTitle>
                  {classRank[0] ? <RankRow rank={1} top title={classRank[0].title} value={`${classRank[0].asistencias}`} sub={`${classRank[0].reservas} reservas`} pct={100} /> : <Empty text="Sin asistencias en el periodo" />}
                </div>
                <div>
                  <SectionTitle>Coach más solicitada</SectionTitle>
                  {coachRank[0] ? <RankRow rank={1} top title={coachRank[0].name} value={`${coachRank[0].asistencias}`} sub={`${coachRank[0].reservas} reservas`} pct={100} avatar={coachRank[0].avatar} /> : <Empty text="Sin datos de coaches" />}
                </div>
              </div>
            </div>
          )}

          {/* ===== FINANZAS ===== */}
          {subtab === 'finanzas' && (
            finErr ? <Empty text="No se pudieron cargar las finanzas" sub="Revisa la conexión con Stripe." />
            : finLoading && !fin ? <Loading />
            : !fin ? <Loading />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: '#fff', borderRadius: '22px', border: '1px solid rgba(0,0,0,0.05)', padding: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ingresos brutos · {rangeLabel}</div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: fin.mode === 'live' ? '#16A34A' : PRIMARY, background: fin.mode === 'live' ? 'rgba(34,197,94,0.1)' : 'rgba(255,145,77,0.12)', padding: '3px 8px', borderRadius: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{fin.mode}</span>
                  </div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 800, color: INK, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{money(fin.gross)}</div>
                  <div style={{ margin: '18px 0' }}><MiniBars series={fin.series} height={64} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[['Neto', money(fin.net)], ['Comisiones', money(fin.fees)], ['Transacciones', fin.count]].map(([l, v]) => (
                      <div key={l} style={{ background: 'rgba(0,0,0,0.025)', borderRadius: '12px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--on-surface-variant)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: INK }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionTitle>Por tipo de venta</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(() => {
                      const tot = Math.max(1, fin.byType.membresia + fin.byType.cafeteria + (fin.byType.evento || 0) + (fin.byType.mostrador || 0));
                      return [
                        { name: 'Membresías (online)', v: fin.byType.membresia },
                        { name: 'Mostrador', v: fin.byType.mostrador || 0 },
                        { name: 'Cafetería', v: fin.byType.cafeteria },
                        { name: 'Eventos', v: fin.byType.evento || 0 },
                      ].sort((a, b) => b.v - a.v).map((x, i) => (
                        <RankRow key={x.name} rank={i + 1} top={i === 0} title={x.name} value={money(x.v)} sub={`${Math.round((x.v / tot) * 100)}% de los ingresos`} pct={(x.v / tot) * 100} />
                      ));
                    })()}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                    <Kpi label="Ticket promedio" value={money(fin.avgTicket)} Icon={Receipt} />
                    <Kpi label="Reembolsado" value={money(fin.refunded)} Icon={TrendingUp} />
                  </div>
                </div>

                <div>
                  <SectionTitle>Transacciones recientes</SectionTitle>
                  <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    {fin.recent.length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>Sin transacciones</div>
                    : fin.recent.map((t, i) => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderTop: i ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: t.type === 'cafeteria' ? 'rgba(255,145,77,0.12)' : t.type === 'evento' ? 'rgba(224,122,156,0.14)' : t.type === 'mostrador' ? 'rgba(34,197,94,0.12)' : 'rgba(26,28,30,0.06)', color: t.type === 'cafeteria' ? PRIMARY : t.type === 'evento' ? '#E07A9C' : t.type === 'mostrador' ? '#16A34A' : INK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {t.type === 'cafeteria' ? <Coffee size={16} /> : t.type === 'evento' ? <Sparkles size={16} /> : t.type === 'mostrador' ? <DollarSign size={16} /> : <Crown size={16} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: INK, textTransform: 'capitalize' }}>{t.type}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.email || 'Sin correo'} · {new Date(t.created * 1000).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</div>
                        </div>
                        <div style={{ fontWeight: 800, color: t.status === 'refunded' ? '#E17055' : INK, fontSize: '0.92rem' }}>{t.status === 'refunded' ? '-' : ''}{money(t.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
          )}

          {/* ===== CLASES ===== */}
          {subtab === 'clases' && (
            loading ? <Loading /> : classRank.length === 0 ? <Empty text="Sin asistencias en el periodo" sub="Los datos aparecen al hacer check-in en el mostrador." />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '12px' }}>
                  <Kpi label="Clase top" value={classRank[0].title} sub={`${classRank[0].asistencias} asistencias`} Icon={Crown} />
                  <Kpi label="Tipos de clase" value={classRank.length} Icon={CalendarDays} />
                  <Kpi label="Asistencias" value={totalAsistencias} sub="check-ins" Icon={Activity} />
                </div>
                <div>
                  <SectionTitle>Ranking por asistencia</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {classRank.slice(0, 12).map((c, i) => (
                      <RankRow key={c.title} rank={i + 1} top={i === 0} title={c.title} value={`${c.asistencias}`} sub={`${c.reservas} reservas · ${c.reservas ? Math.round((c.asistencias / c.reservas) * 100) : 0}% asistencia`} pct={(c.asistencias / Math.max(1, classRank[0].asistencias)) * 100} />
                    ))}
                  </div>
                </div>
              </div>
          )}

          {/* ===== COACHES ===== */}
          {subtab === 'coaches' && (
            loading ? <Loading /> : coachRank.length === 0 ? <Empty text="Sin datos de coaches" sub="Asigna coaches a las clases y registra asistencias." />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '12px' }}>
                  <Kpi label="Coach top" value={coachRank[0].name} sub={`${coachRank[0].asistencias} asistencias`} Icon={Crown} />
                  <Kpi label="Coaches activas" value={coachRank.length} Icon={Award} />
                </div>
                <div>
                  <SectionTitle>Ranking de coaches</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {coachRank.slice(0, 12).map((c, i) => (
                      <RankRow key={c.name + i} rank={i + 1} top={i === 0} title={c.name} value={`${c.asistencias}`} sub={`${c.reservas} reservas`} pct={(c.asistencias / Math.max(1, coachRank[0].asistencias)) * 100} avatar={c.avatar} />
                    ))}
                  </div>
                </div>
              </div>
          )}

          {/* ===== CAFETERÍA ===== */}
          {subtab === 'cafeteria' && (
            loading ? <Loading /> : cafe.orders === 0 ? <Empty text="Sin ventas de cafetería en el periodo" sub="Los pedidos pagados aparecerán aquí." />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '12px' }}>
                  <Kpi label="Ingresos café" value={money(cafe.revenue)} Icon={DollarSign} />
                  <Kpi label="Pedidos" value={cafe.orders} Icon={Coffee} />
                  <Kpi label="Ticket prom." value={money(cafe.avg)} Icon={Receipt} />
                  <Kpi label="Regalos" value={cafe.gifts} Icon={Gift} />
                </div>
                <div>
                  <SectionTitle>Productos más vendidos</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {cafe.ranking.slice(0, 12).map((p, i) => (
                      <RankRow key={p.name} rank={i + 1} top={i === 0} title={p.name} value={`${p.qty}`} sub={`${money(p.revenue)} · ${p.qty} unidades`} pct={(p.qty / Math.max(1, cafe.ranking[0].qty)) * 100} />
                    ))}
                  </div>
                </div>
              </div>
          )}

        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function Loading() {
  return <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--on-surface-variant)' }}>Cargando datos…</div>;
}
function Empty({ text, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '46px 20px', color: 'var(--on-surface-variant)' }}>
      <BarChart3 size={34} style={{ opacity: 0.3, marginBottom: '12px' }} />
      <p style={{ margin: 0, fontWeight: 700, color: INK }}>{text}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>{sub}</p>}
    </div>
  );
}
