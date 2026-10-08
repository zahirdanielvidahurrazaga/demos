import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, ChevronRight, Clock, Gift } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CafeOrderTracking from './CafeOrderTracking';

const STATUS = {
  paid:      { label: 'Confirmado',  color: '#FF914D', tint: 'rgba(255,145,77,0.12)' },
  preparing: { label: 'Preparando', color: '#3B82F6', tint: 'rgba(59,130,246,0.12)' },
  ready:     { label: 'Listo',      color: '#16A34A', tint: 'rgba(22,163,74,0.12)' },
  completed: { label: 'Entregado',  color: '#6B5B50', tint: 'rgba(107,91,80,0.1)' },
  cancelled: { label: 'Cancelado',  color: '#9CA3AF', tint: 'rgba(156,163,175,0.12)' },
};
const ACTIVE = ['paid', 'preparing', 'ready'];

const fmtDate = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? `Hoy · ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function CafeOrderHistory({ userId }) {
  const [orders, setOrders] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  useEffect(() => {
    if (!userId) { setOrders([]); return; }
    let active = true;
    setOrders(null);

    (async () => {
      const { data, error } = await supabase.from('cafe_orders')
        .select('id,status,items,total,created_at,is_gift,pickup_time')
        .eq('user_id', userId).neq('status', 'pending_payment')
        .order('created_at', { ascending: false }).limit(50);
      if (!active) return;
      if (error) {
        console.error('Historial cafetería:', error);
        alert('Error cargando historial: ' + error.message);
      }
      setOrders(data || []);
    })();

    // Suscripción Realtime para reflejar los cambios de estado (Barista -> Cliente)
    const ch = supabase.channel(`history:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_orders', filter: `user_id=eq.${userId}` }, (payload) => {
        setOrders(prev => {
          if (!prev) return prev;
          if (payload.eventType === 'INSERT') {
            if (payload.new.status === 'pending_payment') return prev;
            // Evitar duplicados si el fetch inicial lo trajo
            if (prev.some(o => o.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          }
          if (payload.eventType === 'UPDATE') {
            if (payload.new.status === 'pending_payment') return prev.filter(o => o.id !== payload.new.id);
            // Si el pedido ya existe, lo actualizamos, si no, lo insertamos arriba
            if (prev.some(o => o.id === payload.new.id)) {
              return prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o);
            }
            return [payload.new, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          }
          if (payload.eventType === 'DELETE') {
            return prev.filter(o => o.id !== payload.old.id);
          }
          return prev;
        });
      })
      .subscribe();

    return () => { 
      active = false; 
      supabase.removeChannel(ch); 
    };
  }, [userId]);

  return (
    <>
      <div style={{ padding: 'calc(env(safe-area-inset-top, 44px) + 30px) 24px 120px', flex: 1, background: '#FAF8F5', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 800, color: '#2B211C', margin: '0' }}>Mis Pedidos</h2>
        </div>

        {orders === null ? (
            <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0', fontSize: '1.05rem', fontWeight: 600 }}>Cargando tus pedidos…</p>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
              <Receipt size={54} strokeWidth={1.5} style={{ opacity: 0.35, marginBottom: '20px' }} />
              <p style={{ margin: 0, fontWeight: 700, color: '#6B5B50', fontSize: '1.2rem' }}>Aún no tienes pedidos</p>
              <p style={{ margin: '8px 0 0', fontSize: '0.95rem', opacity: 0.8 }}>Tus compras de la cafetería aparecerán aquí.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orders.map(o => {
                const st = STATUS[o.status] || STATUS.completed;
                const isActive = ACTIVE.includes(o.status);
                const clickable = o.status !== 'cancelled';
                const summary = (o.items || []).map(i => `${i.qty}× ${i.name}`).join(', ');
                const Tag = clickable ? motion.button : motion.div;
                
                return (
                  <Tag 
                    key={o.id} 
                    onClick={clickable ? () => setTrackingOrderId(o.id) : undefined}
                    whileTap={clickable ? { scale: 0.98 } : {}}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ 
                      textAlign: 'left', 
                      width: '100%', 
                      cursor: clickable ? 'pointer' : 'default', 
                      opacity: clickable ? 1 : 0.7, 
                      display: 'flex', 
                      gap: '14px', 
                      alignItems: 'center', 
                      padding: '20px', 
                      background: '#fff', 
                      borderRadius: '24px', 
                      border: isActive ? `1.5px solid ${st.color}55` : '1px solid rgba(0,0,0,0.04)',
                      boxShadow: isActive ? `0 12px 30px ${st.color}15` : '0 8px 24px rgba(43,33,28,0.04)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', color: st.color, background: st.tint, padding: '4px 10px', borderRadius: '8px' }}>
                          {st.label}
                        </span>
                        {isActive && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: st.color, boxShadow: `0 0 0 0 ${st.color}`, animation: 'cafePulse 1.6s infinite' }} />}
                        {o.is_gift && <Gift size={14} color="#C2456E" />}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1A1C1E', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '6px' }}>
                        {summary || 'Pedido'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#A89A8E', fontWeight: 500 }}>
                        <Clock size={12} strokeWidth={2.5} /> {fmtDate(o.created_at)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '6px' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1A1C1E', fontFamily: 'var(--font-display)' }}>
                        ${o.total}
                      </div>
                      {clickable && <ChevronRight size={20} strokeWidth={2.5} color="#DCD4C7" />}
                    </div>
                  </Tag>
                );
              })}
            </div>
          )}
      </div>

      {/* MODAL DE SEGUIMIENTO */}
      <AnimatePresence>
        {trackingOrderId && (
          <CafeOrderTracking orderId={trackingOrderId} onClose={() => setTrackingOrderId(null)} />
        )}
      </AnimatePresence>

      <style>{`@keyframes cafePulse {0%{box-shadow:0 0 0 0 currentColor;opacity:1}70%{box-shadow:0 0 0 6px transparent;opacity:.6}100%{box-shadow:0 0 0 0 transparent;opacity:1}}`}</style>
    </>
  );
}
