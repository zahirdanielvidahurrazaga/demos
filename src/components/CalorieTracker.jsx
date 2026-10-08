import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X, Target, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PRIMARY = '#FF914D';

// Tarjeta "Calorías de hoy": anillo consumidas/meta + lista de lo registrado hoy.
// Disponible para TODAS las clientas. La meta sale del plan del admin (Fit/Premium)
// o de la meta propia que la clienta fija. Sin meta → solo muestra el total.
export default function CalorieTracker() {
  const { todayLog, todayConsumed, calorieGoal, removeFoodLog, updateCalorieGoal, planCalories } = useAuth();
  const [editing, setEditing] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const hasGoal = Number.isFinite(calorieGoal) && calorieGoal > 0;
  const pct = hasGoal ? Math.min(1, todayConsumed / calorieGoal) : 0;
  const remaining = hasGoal ? calorieGoal - todayConsumed : 0;
  const over = hasGoal && todayConsumed > calorieGoal;
  // La meta la pone el admin solo en Fit/Premium; ahí la clienta no la edita.
  const goalIsFromPlan = Number.isFinite(planCalories) && planCalories > 0;

  // Anillo SVG
  const R = 52, STROKE = 12, C = 2 * Math.PI * R;
  const ringColor = over ? '#E8643C' : PRIMARY;

  const saveGoal = () => {
    updateCalorieGoal(goalInput);
    setEditing(false);
    setGoalInput('');
  };

  return (
    <div style={{
      background: 'var(--app-surface-solid, #fff)', borderRadius: '24px',
      border: '1px solid var(--border-subtle)', padding: '20px', boxShadow: 'var(--card-shadow)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,145,77,0.12)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Flame size={17} /></div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}>Calorías de hoy</h3>
        </div>
        {hasGoal && !goalIsFromPlan && (
          <button onClick={() => { setGoalInput(String(calorieGoal)); setEditing(true); }} style={chipBtn}>
            <Target size={12} /> Editar meta
          </button>
        )}
      </div>

      {/* Anillo + cifras, o estado "sin meta" */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{ position: 'relative', width: `${(R + STROKE) * 2}px`, height: `${(R + STROKE) * 2}px`, flexShrink: 0 }}>
          <svg width={(R + STROKE) * 2} height={(R + STROKE) * 2} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={R + STROKE} cy={R + STROKE} r={R} fill="none" stroke="var(--divider)" strokeWidth={STROKE} />
            <motion.circle
              cx={R + STROKE} cy={R + STROKE} r={R} fill="none" stroke={ringColor} strokeWidth={STROKE}
              strokeLinecap="round" strokeDasharray={C}
              initial={false}
              animate={{ strokeDashoffset: C * (1 - pct) }}
              transition={{ type: 'spring', stiffness: 110, damping: 20 }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--on-surface)', lineHeight: 1, fontFamily: 'var(--font-display)' }}>{todayConsumed.toLocaleString('es-MX')}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginTop: '2px' }}>kcal</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {(hasGoal && !editing) ? (
            <>
              <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: '4px' }}>
                Meta: <span style={{ color: 'var(--on-surface)', fontWeight: 800 }}>{calorieGoal.toLocaleString('es-MX')} kcal</span>
                {goalIsFromPlan && <span style={{ fontSize: '0.66rem', color: PRIMARY, fontWeight: 700, marginLeft: '6px' }}>· de tu plan</span>}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: over ? '#E8643C' : PRIMARY, lineHeight: 1.2 }}>
                {over
                  ? `${Math.abs(remaining).toLocaleString('es-MX')} kcal sobre tu meta`
                  : `Te quedan ${remaining.toLocaleString('es-MX')} kcal`}
              </div>
            </>
          ) : editing ? (
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: '8px' }}>¿Cuál es tu meta diaria?</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number" inputMode="numeric" autoFocus value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
                  placeholder="1800"
                  style={{ width: '90px', padding: '9px 12px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--surface-low)', color: 'var(--on-surface)', fontSize: '0.95rem', fontWeight: 700, outline: 'none' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>kcal</span>
                <button onClick={saveGoal} aria-label="Guardar meta" style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Check size={18} /></button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', fontWeight: 600, lineHeight: 1.45, marginBottom: '10px' }}>
                Fija una meta diaria para ver tu progreso en el anillo.
              </div>
              <button onClick={() => setEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '12px', border: 'none', background: PRIMARY, color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 8px 18px rgba(255,145,77,0.3)' }}>
                <Target size={14} /> Fija tu meta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista "Hoy comí" */}
      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--divider)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)', marginBottom: '10px' }}>Hoy comí</div>
        {todayLog.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>
            Aún no registras nada. Marca lo que comas con <strong style={{ color: PRIMARY }}>"Me lo comí"</strong> en las recetas o tu plan.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <AnimatePresence initial={false}>
              {todayLog.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface-low)', borderRadius: '12px', padding: '9px 12px' }}
                >
                  {item.meal_time && <span style={{ fontSize: '0.58rem', fontWeight: 800, color: PRIMARY, textTransform: 'uppercase', background: 'rgba(255,145,77,0.14)', padding: '3px 7px', borderRadius: '6px', flexShrink: 0 }}>{item.meal_time}</span>}
                  <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: 600, color: 'var(--on-surface)', lineHeight: 1.25 }}>{item.title}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--on-surface-variant)', flexShrink: 0 }}>{(item.kcal || 0).toLocaleString('es-MX')} kcal</span>
                  <button onClick={() => removeFoodLog(item.id)} aria-label="Quitar" style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', background: 'var(--fill-subtle)', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><X size={14} /></button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

const chipBtn = {
  display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 11px',
  borderRadius: '99px', border: '1px solid var(--border-subtle)', background: 'transparent',
  color: 'var(--on-surface-variant)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
};
