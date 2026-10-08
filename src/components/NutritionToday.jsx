import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Plus, Minus, Utensils } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PRIMARY = '#FF914D';
const WATER = '#33A7E0';
const GOAL = 8; // vasos (~2L)
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Tarjetas reales de "hoy": rastreador de agua (funcional, localStorage) + resumen de comidas del plan
export default function NutritionToday({ userId, showMeals = true }) {
  const day = todayKey();
  const wKey = `befit_water_${userId || 'anon'}_${day}`;
  const [glasses, setGlasses] = useState(() => parseInt(localStorage.getItem(wKey) || '0', 10) || 0);
  const [meals, setMeals] = useState([]);

  useEffect(() => { try { localStorage.setItem(wKey, String(glasses)); } catch {} }, [glasses, wKey]);

  useEffect(() => {
    if (!userId || !showMeals) return;
    supabase.from('meal_plan_days').select('meals').eq('user_id', userId).eq('date', day).maybeSingle()
      .then(({ data }) => setMeals(data?.meals || []));
  }, [userId, day, showMeals]);

  const totalKcal = useMemo(() => meals.reduce((s, m) => s + (parseInt(m.kcal, 10) || 0), 0), [meals]);
  const pct = Math.min(100, Math.round((glasses / GOAL) * 100));

  const card = { padding: '18px', borderRadius: '22px', background: 'var(--app-surface-solid, #fff)', border: '1px solid var(--border-subtle, rgba(0,0,0,0.05))' };

  return (
    <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: showMeals ? '1fr 1fr' : '1fr', gap: '12px' }}>
      {/* Agua (funcional) */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: `${WATER}1A`, color: WATER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Droplets size={17} /></div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setGlasses(g => Math.max(0, g - 1))} aria-label="Quitar vaso" style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', background: 'var(--fill-subtle)', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={14} /></button>
            <button onClick={() => setGlasses(g => g + 1)} aria-label="Agregar vaso" style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', background: WATER, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={14} /></button>
          </div>
        </div>
        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--on-surface)', lineHeight: 1 }}>{(glasses * 0.25).toFixed(2).replace(/\.00$/, '')}<span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', marginLeft: '4px', fontWeight: 700 }}>L</span></div>
        <div style={{ height: '6px', background: 'var(--divider)', borderRadius: '4px', overflow: 'hidden', margin: '8px 0 5px' }}>
          <motion.div animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ height: '100%', background: WATER, borderRadius: '4px' }} />
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{glasses}/{GOAL} vasos hoy</div>
      </div>

      {/* Comidas de hoy (del plan) — solo planes con plan personalizado */}
      {showMeals && (
      <div style={card}>
        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,145,77,0.12)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}><Utensils size={17} /></div>
        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--on-surface)', lineHeight: 1 }}>{meals.length}<span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', marginLeft: '4px', fontWeight: 700 }}>{meals.length === 1 ? 'comida' : 'comidas'}</span></div>
        <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 600, marginTop: '11px' }}>
          {meals.length === 0 ? 'Sin plan para hoy' : (totalKcal > 0 ? `${totalKcal.toLocaleString('es-MX')} kcal planeadas` : 'En tu calendario')}
        </div>
      </div>
      )}
    </div>
  );
}
