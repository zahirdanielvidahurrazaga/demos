import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, Gift, Clock, Leaf, ShoppingBag, CreditCard, Banknote, ChevronRight, SmartphoneNfc } from 'lucide-react';

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function CafeCartSheet({ cart, products, onUpdateQty, onRemove, onOpenProduct, onCheckout }) {
  const [noStraw, setNoStraw] = useState(false);
  const [isGift, setIsGift] = useState(false);
  const [giftName, setGiftName] = useState('');
  const [giftMsg, setGiftMsg] = useState('');
  const [schedule, setSchedule] = useState(false);
  const [pickup, setPickup] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');

  const subtotal = cart.reduce((s, i) => s + i.lineTotal, 0);
  const inCart = new Set(cart.map(i => i.product_id));
  const complementos = (products || []).filter(p => p.available !== false && !inCart.has(p.id)).slice(0, 6);

  const finalize = () => {
    onCheckout({
      noStraw,
      gift: isGift ? { is_gift: true, recipient_name: giftName.trim() || null, message: giftMsg.trim() || null, recipient_user_id: null } : null,
      pickupTime: schedule && pickup ? new Date(pickup).toISOString() : null,
      paymentMethod
    });
  };

  const nowLocal = (() => { const d = new Date(Date.now() + 15 * 60000); d.setSeconds(0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: 'var(--font-body)' }}>
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 800, color: '#2B211C', margin: '0' }}>Tu Carrito</h2>
      </div>

      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#A89A8E' }}>
          <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#7D7068' }}>Aún no hay nada aquí</p>
          <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>Agrega tus bebidas favoritas desde el menú.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cart.map(item => (
            <div key={item.lineId} style={{ display: 'flex', flexDirection: 'column', padding: '18px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1, paddingRight: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#2B211C', lineHeight: 1.2 }}>{item.name}</div>
                  {item.optionsDisplay?.length > 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#A89A8E', marginTop: '6px', lineHeight: 1.3 }}>{item.optionsDisplay.map(o => o.name).join(' · ')}</div>
                  )}
                  {item.notes && <div style={{ fontSize: '0.85rem', color: '#FF914D', marginTop: '6px', fontStyle: 'italic' }}>“{item.notes}”</div>}
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#2B211C' }}>${item.lineTotal}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#FAF8F5', borderRadius: '14px', padding: '6px', width: 'fit-content' }}>
                <button onClick={() => item.qty > 1 ? onUpdateQty(item.lineId, -1) : onRemove(item.lineId)} style={{ border: 'none', background: '#fff', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  {item.qty > 1 ? <Minus size={16} color="#2B211C" /> : <Trash2 size={16} color="#EF4444" />}
                </button>
                <span style={{ fontWeight: 700, fontSize: '1rem', width: '36px', textAlign: 'center', color: '#2B211C' }}>{item.qty}</span>
                <button onClick={() => onUpdateQty(item.lineId, 1)} style={{ border: 'none', background: '#fff', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <Plus size={16} color="#2B211C" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complementos */}
      {complementos.length > 0 && cart.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 16px', color: '#2B211C', fontFamily: 'var(--font-display)' }}>¿Algo más?</h3>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'scroll', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingBottom: '12px', margin: '0 -24px', paddingLeft: '24px', paddingRight: '24px' }}>
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
            {complementos.map(p => (
              <button key={p.id} onClick={() => onOpenProduct(p)} style={{ flex: '0 0 auto', width: '150px', minHeight: '95px', textAlign: 'left', background: '#fff', border: 'none', borderRadius: '20px', padding: '16px', paddingRight: '60px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2B211C', lineHeight: 1.3, whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textShadow: '0 0 10px rgba(255,255,255,0.9), 0 0 5px rgba(255,255,255,0.9)' }}>{p.name}</div>
                  <div style={{ fontSize: '0.9rem', color: '#FF914D', fontWeight: 800, marginTop: '4px' }}>+ ${p.price}</div>
                </div>
                {p.image_url && (
                  <img src={p.image_url} alt="" style={{ position: 'absolute', right: '-30px', top: '50%', transform: 'translateY(-50%)', width: '116px', height: '116px', objectFit: 'contain', zIndex: 1, mixBlendMode: 'multiply' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <>
          {/* Opciones - Estilo Lista iOS */}
          <div style={{ background: '#fff', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            
            {/* Sin popote */}
            <div onClick={() => setNoStraw(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: noStraw ? 'rgba(34,197,94,0.1)' : '#FAF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                <Leaf size={20} color={noStraw ? '#16A34A' : '#A89A8E'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#2B211C' }}>Sin popote</div>
                <div style={{ fontSize: '0.8rem', color: '#A89A8E', marginTop: '2px' }}>Cuida el planeta</div>
              </div>
              <div style={{ width: '50px', height: '30px', borderRadius: '30px', background: noStraw ? '#22C55E' : '#E5E0D8', position: 'relative', transition: 'all 0.3s ease' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: noStraw ? '22px' : '2px', transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
              </div>
            </div>

            {/* Regalo */}
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <div onClick={() => setIsGift(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: isGift ? 'rgba(255,145,77,0.1)' : '#FAF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  <Gift size={20} color={isGift ? '#FF914D' : '#A89A8E'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#2B211C' }}>Es un regalo</div>
                  <div style={{ fontSize: '0.8rem', color: '#A89A8E', marginTop: '2px' }}>Para alguien especial</div>
                </div>
                <div style={{ width: '50px', height: '30px', borderRadius: '30px', background: isGift ? '#FF914D' : '#E5E0D8', position: 'relative', transition: 'all 0.3s ease' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: isGift ? '22px' : '2px', transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                </div>
              </div>
              <AnimatePresence>
                {isGift && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input value={giftName} onChange={e => setGiftName(e.target.value)} placeholder="¿Para quién? (nombre)" style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.06)', fontSize: '0.95rem', background: '#FAF8F5', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      <textarea value={giftMsg} onChange={e => setGiftMsg(e.target.value)} maxLength={120} rows={2} placeholder="Mensaje (opcional)" style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.06)', fontSize: '0.95rem', resize: 'none', fontFamily: 'inherit', background: '#FAF8F5', boxSizing: 'border-box' }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hora de recogida */}
            <div>
              <div onClick={() => setSchedule(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: schedule ? 'rgba(255,145,77,0.1)' : '#FAF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  <Clock size={20} color={schedule ? '#FF914D' : '#A89A8E'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#2B211C' }}>{schedule ? 'Programar recogida' : 'Lo antes posible'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#A89A8E', marginTop: '2px' }}>{schedule && pickup ? fmtTime(new Date(pickup).toISOString()) : 'Toca para programar hora'}</div>
                </div>
                <div style={{ width: '50px', height: '30px', borderRadius: '30px', background: schedule ? '#FF914D' : '#E5E0D8', position: 'relative', transition: 'all 0.3s ease' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: schedule ? '22px' : '2px', transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                </div>
              </div>
              <AnimatePresence>
                {schedule && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '0 20px 20px' }}>
                      <input type="datetime-local" value={pickup} min={nowLocal} onChange={e => setPickup(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.06)', fontSize: '0.95rem', boxSizing: 'border-box', background: '#FAF8F5', fontFamily: 'inherit' }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer total + finalizar */}
          <div style={{ marginTop: '12px', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 12px', color: '#2B211C', fontFamily: 'var(--font-display)' }}>Método de pago</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <button onClick={() => setPaymentMethod('card')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '18px', border: `2px solid ${paymentMethod === 'card' ? '#FF914D' : 'rgba(0,0,0,0.04)'}`, background: paymentMethod === 'card' ? 'rgba(255,145,77,0.05)' : '#fff', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}>
                <CreditCard size={22} color={paymentMethod === 'card' ? '#FF914D' : '#A89A8E'} />
                <span style={{ flex: 1, color: paymentMethod === 'card' ? '#2B211C' : '#7D7068', fontWeight: paymentMethod === 'card' ? 700 : 500, fontSize: '0.95rem' }}>Pago con tarjeta</span>
                {paymentMethod === 'card' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF914D' }} />}
              </button>
              <button onClick={() => setPaymentMethod('cash')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '18px', border: `2px solid ${paymentMethod === 'cash' ? '#FF914D' : 'rgba(0,0,0,0.04)'}`, background: paymentMethod === 'cash' ? 'rgba(255,145,77,0.05)' : '#fff', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}>
                <Banknote size={22} color={paymentMethod === 'cash' ? '#FF914D' : '#A89A8E'} />
                <span style={{ flex: 1, color: paymentMethod === 'cash' ? '#2B211C' : '#7D7068', fontWeight: paymentMethod === 'cash' ? 700 : 500, fontSize: '0.95rem' }}>Efectivo al recoger</span>
                {paymentMethod === 'cash' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF914D' }} />}
              </button>
            </div>
            
            <div style={{ background: '#fff', padding: '24px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', color: '#7D7068', fontWeight: 600 }}>Total a pagar</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2B211C', fontFamily: 'var(--font-display)' }}>${subtotal}</span>
              </div>
              <button onClick={finalize} style={{ width: '100%', padding: '18px', borderRadius: '100px', border: 'none', background: '#FF914D', color: '#fff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(255,145,77,0.3)', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-body)' }} onMouseEnter={e => e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                {paymentMethod === 'card' ? 'Pagar ahora' : 'Confirmar pedido'}
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
