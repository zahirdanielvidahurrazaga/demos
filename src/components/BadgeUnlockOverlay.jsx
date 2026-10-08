import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CONFETTI_COLORS = ['#FF914D', '#E07A9C', '#FFD194', '#22C55E', '#70E1F5', '#FFB7A8'];

function Confetti() {
  // Ráfaga de piezas que salen del centro hacia afuera (sin dependencias)
  const pieces = useMemo(() => Array.from({ length: 26 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.4;
    const dist = 120 + Math.random() * 160;
    return {
      id: i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      rot: Math.random() * 540 - 270,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 7 + Math.random() * 7,
      delay: 0.25 + Math.random() * 0.15,
      round: Math.random() > 0.5,
    };
  }), []);

  return (
    <div style={{ position: 'absolute', top: '38%', left: '50%', pointerEvents: 'none' }}>
      {pieces.map(p => (
        <motion.div key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rot, scale: 0.6 }}
          transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
          style={{ position: 'absolute', width: p.size, height: p.size, background: p.color, borderRadius: p.round ? '50%' : '2px' }}
        />
      ))}
    </div>
  );
}

export default function BadgeUnlockOverlay({ badge, onClose }) {
  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)',
            zIndex: 99999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <Confetti />
          <motion.div
            initial={{ scale: 0.4, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 14, stiffness: 120, delay: 0.15 }}
            style={{ textAlign: 'center', position: 'relative' }}
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ fontSize: '6rem', marginBottom: '20px', filter: 'drop-shadow(0 0 40px rgba(255,139,66,0.5))' }}
            >
              {badge.icon}
            </motion.div>
            <p style={{ color: 'var(--primary)', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '0.8rem', margin: '0 0 8px' }}>
              Insignia desbloqueada
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '2.2rem', margin: '0 0 10px', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              ¡Felicidades!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', maxWidth: '300px', margin: '0 auto 30px', lineHeight: 1.5 }}>
              Has desbloqueado la insignia <strong style={{ color: 'var(--primary)' }}>{badge.label}</strong>.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={onClose}
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                color: 'white', border: 'none', padding: '16px 40px', borderRadius: '20px',
                fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(255,139,66,0.4)', fontFamily: 'var(--font-body)',
              }}
            >
              ¡Genial!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
