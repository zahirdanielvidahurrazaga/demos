import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_PLANS } from '../lib/plans';
import { useAuth } from '../context/AuthContext';

export function PricingCarousel({ onSelectPlan }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  // Planes editables desde admin (BD). Fallback a los defaults para no quedar vacío.
  const { plans: ctxPlans } = useAuth();
  const PLANS = (ctxPlans && ctxPlans.length) ? ctxPlans : DEFAULT_PLANS;

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const next = () => setActiveIndex((prev) => (prev + 1) % PLANS.length);
  const prev = () => setActiveIndex((prev) => (prev - 1 + PLANS.length) % PLANS.length);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '1000px', margin: '0 auto', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Flechas de navegación */}
      <button onClick={prev} style={{ position: 'absolute', left: isMobile ? '5px' : '10px', zIndex: 20, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)', borderRadius: '50%', width: isMobile ? '40px' : '56px', height: isMobile ? '40px' : '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', transition: 'all 0.2s' }}>
        <ChevronLeft size={isMobile ? 24 : 28} color="var(--primary)" />
      </button>
      
      <button onClick={next} style={{ position: 'absolute', right: isMobile ? '5px' : '10px', zIndex: 20, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)', borderRadius: '50%', width: isMobile ? '40px' : '56px', height: isMobile ? '40px' : '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', transition: 'all 0.2s' }}>
        <ChevronRight size={isMobile ? 24 : 28} color="var(--primary)" />
      </button>

      <div style={{ position: 'relative', width: isMobile ? '320px' : '360px', height: '100%', perspective: isMobile ? 'none' : '1200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {PLANS.map((plan, index) => {
          let offset = (index - activeIndex) % PLANS.length;
          if (offset < -1) offset += PLANS.length;
          if (offset > 1) offset -= PLANS.length;
          
          if (Math.abs(offset) > 1) return null;

          const isActive = offset === 0;
          const x = offset * (isMobile ? 350 : 220); 
          const scale = isActive ? 1 : (isMobile ? 0.95 : 0.85);
          const zIndex = isActive ? 10 : 5;
          const opacity = isActive ? 1 : (isMobile ? 0 : 0.7);
          
          return (
            <motion.div
              key={plan.title}
              animate={{ x, scale, zIndex, opacity }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: '100%',
                height: '560px',
                background: isActive ? 'var(--app-surface-solid)' : 'var(--surface-low)',
                borderRadius: '32px',
                boxShadow: isActive ? '0 40px 80px rgba(255, 122, 0, 0.15), inset 0 1px 0 rgba(255,255,255,0.8)' : '0 10px 30px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                cursor: isActive ? 'default' : 'pointer',
                border: '1px solid rgba(255,255,255,0.8)',
                pointerEvents: 'auto',
                WebkitFontSmoothing: 'antialiased'
              }}
              onClick={() => {
                if (!isActive) {
                   if (offset === 1) next();
                   if (offset === -1) prev();
                }
              }}
            >
              {/* Header de la Tarjeta */}
              <div style={{ 
                height: '140px', 
                background: isActive ? 'linear-gradient(135deg, var(--primary), #FFB085)' : 'linear-gradient(135deg, #e0e0e0, #f5f5f5)', 
                padding: '24px 24px 40px',
                position: 'relative'
              }}>
                {/* Opcional: fondo estrellado o decorativo para el activo */}
                {isActive && <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, background:'url(/assets/noise.png)', opacity:0.2, mixBlendMode:'overlay' }} />}
                
                <h3 style={{ color: isActive ? 'white' : 'var(--black)', fontSize: '1.8rem', margin: 0, fontWeight: 800, position:'relative', zIndex:2 }}>Plan {plan.title}</h3>
                <span style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--on-surface-variant)', fontSize: '0.9rem', position:'relative', zIndex:2 }}>{plan.subtitle}</span>
              </div>

              {/* Contenido Principal (Caja Blanca Solapada) */}
              <div style={{ 
                background: isActive ? 'var(--app-surface-solid)' : 'var(--surface-low)',
                margin: '-24px 0 0 0',
                borderRadius: '24px 24px 0 0', 
                padding: '24px', 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                zIndex: 5,
                boxShadow: '0 -10px 20px rgba(0,0,0,0.05)'
              }}>
                {/* Caja de Precio */}
                <div style={{ 
                  background: isActive ? 'var(--surface-low)' : 'transparent',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: isActive ? '0 10px 30px rgba(0,0,0,0.05)' : 'none',
                  border: isActive ? '1px solid var(--border-subtle, rgba(0,0,0,0.05))' : '1px solid transparent',
                  marginBottom: '20px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--black)', letterSpacing: '-0.04em', lineHeight: 1 }}>{plan.price}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>/ mes</span>
                  </div>
                  <motion.button 
                    whileHover={isActive ? { scale: 1.02 } : {}} 
                    whileTap={isActive ? { scale: 0.98 } : {}}
                    onClick={(e) => {
                      e.stopPropagation();
                      if(isActive) {
                        if (onSelectPlan) {
                          onSelectPlan(plan);
                        } else if (plan.paymentUrl && plan.paymentUrl !== '#') {
                          window.location.href = plan.paymentUrl;
                        } else {
                          alert('¡Próximamente! Esperando enlace de pago...');
                        }
                      }
                    }}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '100px', border: 'none',
                      background: isActive ? 'var(--primary)' : '#e5e5e5',
                      color: isActive ? 'white' : 'var(--on-surface-variant)',
                      fontWeight: 800, fontSize: '0.95rem', cursor: isActive ? 'pointer' : 'default', transition: 'all 0.2s'
                    }}>
                    {isActive ? 'Elegir Plan' : 'Plan Actual'}
                  </motion.button>
                </div>

                {/* Lista de Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', paddingBottom:'10px' }}>
                  {plan.features.map((feat, j) => (
                    <li key={j} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '0.85rem', color: 'var(--black)', lineHeight: 1.4, fontWeight: 600 }}>
                      <CheckCircle2 size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
