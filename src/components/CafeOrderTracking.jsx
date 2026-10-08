import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Coffee, ShoppingBag, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const STEPS = [
  { key: 'paid', label: 'Confirmado', desc: 'Recibimos tu pedido', Icon: Check },
  { key: 'preparing', label: 'Preparando', desc: 'Lo estamos preparando con cariño', Icon: Coffee },
  { key: 'ready', label: '¡Listo!', desc: 'Pásalo a recoger en el mostrador', Icon: ShoppingBag },
];
const idxOf = (s) => (s === 'preparing' ? 1 : (s === 'ready' || s === 'completed') ? 2 : 0);
const CONFETTI = ['#FF914D', '#E07A9C', '#FFD194', '#22C55E', '#70E1F5'];

function Steam() {
  return (
    <div style={{ position: 'absolute', top: '-26px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px' }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          animate={{ y: [-2, -16, -2], opacity: [0, 0.7, 0], scaleY: [0.8, 1.3, 0.8] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
          style={{ width: '5px', height: '20px', borderRadius: '4px', background: 'rgba(255,255,255,0.8)' }} />
      ))}
    </div>
  );
}

function CoffeeBrewing({ phase }) {
  // phase: 0 confirmado · 1 preparando · 2 listo
  const fill = phase === 0 ? '24%' : phase === 2 ? '86%' : ['34%', '80%', '34%'];
  return (
    <div style={{ position: 'relative', width: '190px', height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', margin: '0 auto' }}>
      {/* glow dorado */}
      <div style={{ position: 'absolute', inset: '-10px', background: 'radial-gradient(circle at 50% 42%, rgba(201,163,91,0.28), transparent 62%)' }} />
      {/* vapor */}
      {phase >= 1 && (
        <div style={{ position: 'absolute', top: '6px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '11px' }}>
          {[0, 1, 2].map(i => (
            <motion.div key={i} animate={{ y: [0, -24], opacity: [0, 0.55, 0], scaleY: [0.7, 1.4, 0.7] }} transition={{ duration: 2.1, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
              style={{ width: '6px', height: '28px', borderRadius: '5px', background: 'rgba(255,255,255,0.8)', filter: 'blur(0.5px)' }} />
          ))}
        </div>
      )}
      {/* chorro al preparar */}
      {phase === 1 && (
        <motion.div animate={{ scaleY: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.18, 0.82, 1] }}
          style={{ position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)', transformOrigin: 'top', width: '5px', height: '44px', borderRadius: '3px', background: 'linear-gradient(#7A5740,#3B2A20)', zIndex: 2 }} />
      )}
      {/* taza */}
      <div style={{ position: 'relative', width: '118px', height: '104px', marginBottom: '16px' }}>
        <div style={{ position: 'absolute', right: '-20px', top: '26px', width: '34px', height: '40px', border: '8px solid #EFE3D5', borderLeft: 'none', borderRadius: '0 20px 20px 0' }} />
        <div style={{ position: 'absolute', inset: 0, background: '#FFFDFA', borderRadius: '16px 16px 52px 52px', border: '2px solid #EFE3D5', overflow: 'hidden', boxShadow: '0 16px 32px rgba(59,42,32,0.2)' }}>
          <motion.div animate={{ height: fill }} transition={{ duration: phase === 1 ? 2.5 : 0.9, repeat: phase === 1 ? Infinity : 0, ease: 'easeInOut' }}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(180deg,#7A5740,#3B2A20)' }}>
            <div style={{ position: 'absolute', top: '-3px', left: 0, right: 0, height: '7px', background: 'rgba(245,235,220,0.85)', borderRadius: '50%' }} />
          </motion.div>
        </div>
      </div>
      {/* plato */}
      <div style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', width: '152px', height: '14px', background: '#F1E7DA', borderRadius: '50%', boxShadow: '0 8px 18px rgba(59,42,32,0.14)' }} />
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 22 + Math.random() * 0.4, d = 110 + Math.random() * 130;
    return { id: i, x: Math.cos(a) * d, y: Math.sin(a) * d, c: CONFETTI[i % CONFETTI.length], s: 7 + Math.random() * 6, delay: Math.random() * 0.1, round: Math.random() > 0.5 };
  }), []);
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none' }}>
      {pieces.map(p => (
        <motion.div key={p.id} initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.5, rotate: Math.random() * 360 }}
          transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
          style={{ position: 'absolute', width: p.s, height: p.s, background: p.c, borderRadius: p.round ? '50%' : '2px' }} />
      ))}
    </div>
  );
}

export default function CafeOrderTracking({ orderId, onClose }) {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => { const { data } = await supabase.from('cafe_orders').select('*').eq('id', orderId).single(); if (active) setOrder(data); })();
    const ch = supabase.channel(`order:${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cafe_orders', filter: `id=eq.${orderId}` }, (p) => setOrder(p.new))
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [orderId]);

  const idx = idxOf(order?.status);
  const current = STEPS[idx];
  const ready = idx === 2;
  const ActiveIcon = current.Icon;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'linear-gradient(180deg, #FFF7F0 0%, #F4EFE9 100%)', display: 'flex', flexDirection: 'column', overflowY: 'auto', fontFamily: 'var(--font-body)' }}>
      {/* Cerrar */}
      <button onClick={onClose} aria-label="Cerrar" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top,0px) + 16px)', right: '18px', width: '38px', height: '38px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
        <X size={18} color="#2B211C" />
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'calc(env(safe-area-inset-top,0px) + 40px) 28px 40px', textAlign: 'center', maxWidth: '440px', margin: '0 auto', width: '100%' }}>
        <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--primary)', margin: '0 0 6px' }}>
          {ready ? 'Tu pedido está listo' : '¡Gracias por tu compra!'}
        </motion.p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#2B211C', margin: '0 0 30px' }}>{current.label}</h1>

        {/* Ilustración animada: café sirviéndose */}
        <div style={{ position: 'relative', marginBottom: '34px' }}>
          {ready && <Confetti />}
          <CoffeeBrewing phase={idx} />
        </div>

        <p style={{ fontSize: '1.05rem', color: '#6B5B50', margin: '0 0 36px', maxWidth: '300px', lineHeight: 1.5 }}>{current.desc}</p>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', maxWidth: '340px', position: 'relative' }}>
          {/* Línea base + progreso */}
          <div style={{ position: 'absolute', top: '22px', left: '40px', right: '40px', height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px' }}>
            <motion.div animate={{ width: `${(idx / (STEPS.length - 1)) * 100}%` }} transition={{ duration: 0.5 }} style={{ height: '100%', background: ready ? '#16A34A' : 'var(--primary)', borderRadius: '2px' }} />
          </div>
          {STEPS.map((s, i) => {
            const done = i < idx, active = i === idx;
            const S = s.Icon;
            return (
              <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '80px', position: 'relative', zIndex: 1 }}>
                <motion.div animate={active ? { scale: [1, 1.12, 1] } : { scale: 1 }} transition={{ duration: 1.2, repeat: active ? Infinity : 0 }}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: (done || active) ? (ready && i === 2 ? '#16A34A' : 'var(--primary)') : '#fff', border: (done || active) ? 'none' : '2px solid rgba(0,0,0,0.1)', boxShadow: active ? '0 6px 16px rgba(255,145,77,0.4)' : 'none' }}>
                  {done ? <Check size={20} color="#fff" /> : <S size={20} color={active ? '#fff' : '#B8A99C'} />}
                </motion.div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: (done || active) ? '#2B211C' : '#B8A99C', textAlign: 'center' }}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Hora programada */}
        {order?.pickup_time && (
          <div style={{ marginTop: '28px', background: 'rgba(245,158,11,0.1)', color: '#B45309', borderRadius: '14px', padding: '10px 16px', fontWeight: 700, fontSize: '0.9rem' }}>
            Recoger: {new Date(order.pickup_time).toLocaleString('es-MX', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {ready && (
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={onClose}
            style={{ marginTop: '34px', background: 'var(--primary)', color: '#fff', border: 'none', padding: '15px 44px', borderRadius: '16px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 24px rgba(255,145,77,0.35)' }}>
            ¡Genial!
          </motion.button>
        )}
        {!ready && (
          <p style={{ marginTop: '28px', fontSize: '0.82rem', color: '#A89A8E' }}>Te avisaremos cuando esté listo. Puedes cerrar esta pantalla.</p>
        )}
      </div>
    </motion.div>
  );
}
