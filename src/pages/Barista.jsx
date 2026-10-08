import React, { useEffect, useState, useMemo } from 'react';
import { Coffee, LogOut, Gift, Clock, Leaf, CheckCircle2, RefreshCw, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ESTUDIO } from '../config/estudio';

const COLUMNS = [
  { key: 'paid', label: 'Nuevos', color: '#FF914D', tint: 'rgba(255,145,77,0.10)', next: 'preparing', action: 'Preparar' },
  { key: 'preparing', label: 'Preparando', color: '#3B82F6', tint: 'rgba(59,130,246,0.10)', next: 'ready', action: 'Marcar listo' },
  { key: 'ready', label: 'Listos', color: '#16A34A', tint: 'rgba(22,163,74,0.10)', next: 'completed', action: 'Entregado' },
];
const META = Object.fromEntries(COLUMNS.map(c => [c.key, c]));

const timeAgo = (iso) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h`;
};
const fmtPickup = (iso) => new Date(iso).toLocaleString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

function OrderCard({ order, onAdvance }) {
  const st = META[order.status];
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      style={{ background: '#fff', borderRadius: '20px', padding: '16px', boxShadow: '0 4px 16px rgba(43,33,28,0.06)', border: '1px solid rgba(43,33,28,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontWeight: 800, fontSize: '1.02rem', color: '#2B211C', fontFamily: 'var(--font-display)' }}>{order.buyer?.full_name || 'Clienta'}</div>
        <div style={{ fontSize: '0.72rem', color: '#A89A8E', fontWeight: 600 }}>{timeAgo(order.created_at)} · #{order.id.slice(0, 4)}</div>
      </div>

      {(order.pickup_time || order.no_straw || order.is_gift) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {order.pickup_time && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.12)', padding: '4px 9px', borderRadius: '8px' }}><Clock size={12} /> {fmtPickup(order.pickup_time)}</span>}
          {order.no_straw && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#16A34A', background: 'rgba(22,163,74,0.12)', padding: '4px 9px', borderRadius: '8px' }}><Leaf size={12} /> Sin popote</span>}
          {order.is_gift && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#C2456E', background: 'rgba(224,122,156,0.12)', padding: '4px 9px', borderRadius: '8px' }}><Gift size={12} /> Regalo{order.gift_recipient_name ? ` · ${order.gift_recipient_name}` : ''}</span>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        {(order.items || []).map((it, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '10px' }}>
            <span style={{ flexShrink: 0, minWidth: '26px', height: '26px', borderRadius: '8px', background: 'rgba(43,33,28,0.06)', color: '#2B211C', fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.qty}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#2B211C', lineHeight: 1.25 }}>{it.name}</div>
              {it.options?.length > 0 && <div style={{ fontSize: '0.8rem', color: '#8a7266' }}>{it.options.map(o => o.name).join(' · ')}</div>}
              {it.notes && <div style={{ fontSize: '0.78rem', color: '#A89A8E', fontStyle: 'italic' }}>“{it.notes}”</div>}
            </div>
          </div>
        ))}
      </div>

      {order.gift_message && <div style={{ fontSize: '0.82rem', color: '#C2456E', background: 'rgba(224,122,156,0.08)', borderRadius: '10px', padding: '8px 10px', marginBottom: '12px' }}>“{order.gift_message}”</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(43,33,28,0.06)', paddingTop: '12px' }}>
        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#2B211C' }}>${order.total}</span>
        {st && (
          <button onClick={() => onAdvance(order)} style={{ border: 'none', cursor: 'pointer', background: st.color, color: '#fff', fontWeight: 800, fontSize: '0.88rem', padding: '11px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 6px 16px ${st.color}55` }}>
            {order.status === 'ready' ? <CheckCircle2 size={16} /> : null}{st.action}<ChevronRight size={15} style={{ opacity: 0.7 }} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function Barista() {
  const { logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const { data } = await supabase.from('cafe_orders').select('*, buyer:user_id(full_name)')
      .neq('status', 'pending_payment').order('created_at', { ascending: false }).limit(120);
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel('barista:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_orders' }, () => fetchOrders())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const advance = async (order) => {
    const next = META[order.status]?.next;
    if (!next) return;
    setOrders(os => os.map(o => o.id === order.id ? { ...o, status: next } : o));
    const { error: upErr } = await supabase.from('cafe_orders').update({ status: next }).eq('id', order.id);
    if (upErr) { console.error('No se pudo actualizar el pedido:', upErr); fetchOrders(); return; }
    // Avisar a la clienta cuando su pedido está listo (push + notificación in-app).
    // El destinatario es quien recoge: en un regalo, la persona regalada (si tiene cuenta); si no, quien compró.
    if (next === 'ready') {
      const recipientId = order.gift_recipient_user_id || order.user_id;
      if (recipientId) {
        const { data, error } = await supabase.functions.invoke('send-push', {
          body: { userId: recipientId, title: '¡Tu pedido está listo!', body: 'Pásalo a recoger en el mostrador.', type: 'payment' },
        });
        if (error) console.error('send-push (pedido listo) falló:', error);
        else console.log('send-push (pedido listo) ok:', data);
      }
    }
  };

  const byStatus = useMemo(() => {
    const g = { paid: [], preparing: [], ready: [] };
    orders.forEach(o => { if (g[o.status]) g[o.status].push(o); });
    return g;
  }, [orders]);
  const history = useMemo(() => orders.filter(o => o.status === 'completed' || o.status === 'cancelled'), [orders]);
  const activeCount = byStatus.paid.length + byStatus.preparing.length + byStatus.ready.length;

  return (
    <div style={{ minHeight: '100vh', background: '#F4EFE9', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
      {/* HEADER */}
      <header style={{ background: '#fff', borderBottom: '1px solid rgba(43,33,28,0.07)', padding: 'calc(env(safe-area-inset-top,0px) + 16px) 20px 0', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg,#FF914D,#E07A9C)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(255,145,77,0.35)' }}>
            <Coffee size={24} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A89A8E', fontWeight: 700 }}>{ESTUDIO.nombre} · Cafetería</p>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: '#2B211C' }}>Mostrador</h1>
          </div>
          <button onClick={fetchOrders} aria-label="Refrescar" style={{ width: '42px', height: '42px', borderRadius: '50%', border: '1px solid rgba(43,33,28,0.1)', background: '#fff', color: '#2B211C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><RefreshCw size={18} /></button>
          <button onClick={logout} aria-label="Salir" style={{ width: '42px', height: '42px', borderRadius: '50%', border: 'none', background: 'rgba(186,26,26,0.08)', color: '#ba1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><LogOut size={18} /></button>
        </div>
        {/* Tabs */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '24px', marginTop: '14px' }}>
          {[['active', `Activos (${activeCount})`], ['history', 'Historial']].map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 12px', fontWeight: 800, fontSize: '0.95rem', color: tab === k ? '#2B211C' : '#A89A8E', borderBottom: `3px solid ${tab === k ? 'var(--primary)' : 'transparent'}` }}>{lbl}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 16px 40px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#8a7266', marginTop: '40px' }}>Cargando…</p>
        ) : tab === 'history' ? (
          history.length === 0
            ? <Empty text="Sin historial todavía" />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '460px', margin: '0 auto' }}>{history.map(o => <OrderCard key={o.id} order={o} onAdvance={advance} />)}</div>
        ) : tab === 'loyalty' ? (
          <BaristaLoyaltySearch />
        ) : activeCount === 0 ? (
          <Empty text="Sin pedidos activos" sub="Los pedidos nuevos aparecen aquí al instante." />
        ) : (
          // Tablero por estado (responsivo: columnas en ancho, apilado en móvil)
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px', alignItems: 'start' }}>
            {COLUMNS.map(col => (
              <div key={col.key} style={{ background: col.tint, borderRadius: '22px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px 12px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.color }} />
                  <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#2B211C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col.label}</h2>
                  <span style={{ marginLeft: 'auto', fontWeight: 800, color: col.color, fontSize: '0.9rem' }}>{byStatus[col.key].length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <AnimatePresence initial={false}>
                    {byStatus[col.key].length === 0
                      ? <div style={{ textAlign: 'center', color: '#B8A99C', fontSize: '0.82rem', padding: '20px 0' }}>—</div>
                      : byStatus[col.key].map(o => <OrderCard key={o.id} order={o} onAdvance={advance} />)}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Empty({ text, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '70px 20px', color: '#8a7266' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 6px 18px rgba(43,33,28,0.06)' }}>
        <Coffee size={32} color="#D6C7B8" />
      </div>
      <p style={{ margin: 0, fontWeight: 700, color: '#2B211C' }}>{text}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>{sub}</p>}
    </div>
  );
}

function BaristaLoyaltySearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const { data } = await supabase.from('users').select('id, full_name, email').ilike('full_name', `%${query}%`).limit(10);
    if (data) {
      const ids = data.map(u => u.id);
      const { data: loy } = await supabase.from('cafe_loyalty').select('*').in('user_id', ids);
      const map = new Map((loy || []).map(l => [l.user_id, l]));
      setResults(data.map(u => ({ ...u, loyalty: map.get(u.id) || { stamps: 0, gifts_available: 0 } })));
    }
    setLoading(false);
  };

  const redeem = async (userId) => {
    if (!window.confirm('¿Seguro que quieres canjear un regalo sorpresa para esta clienta?')) return;
    const { error } = await supabase.rpc('redeem_cafe_gift', { p_user_id: userId });
    // El canje lo resuelve la BD en una sola operación atómica. Antes había aquí
    // un respaldo que descontaba desde el navegador: RLS se lo bloqueaba a las
    // baristas, nadie revisaba el error y aun así se anunciaba "¡canjeado!",
    // así que el regalo nunca se consumía. Si falla, hay que decirlo.
    if (error) {
      alert(error.message || 'No se pudo canjear el regalo.');
      return;
    }
    alert('¡Regalo canjeado con éxito!');
    search();
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', margin: '0 0 16px', color: '#1A1C1E' }}>Buscar Clienta</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Nombre de la clienta..." style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '1rem' }} />
        <button onClick={search} disabled={loading} style={{ padding: '12px 24px', borderRadius: '12px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>{loading ? '...' : 'Buscar'}</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {results.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.06)', background: u.loyalty.gifts_available > 0 ? 'rgba(255,145,77,0.05)' : '#FDFBF7' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1A1C1E' }}>{u.full_name}</div>
              <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>Sellos: {u.loyalty.stamps}/12 | Regalos: {u.loyalty.gifts_available}</div>
            </div>
            {u.loyalty.gifts_available > 0 ? (
              <button onClick={() => redeem(u.id)} style={{ padding: '10px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, #FF914D, #E07A9C)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(255,145,77,0.3)' }}><Gift size={16} /> Canjear Regalo</button>
            ) : (
              <span style={{ fontSize: '0.85rem', color: '#9CA3AF', fontWeight: 600 }}>Sin regalos</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Barista;
