import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Salad, ChevronLeft, ChevronRight, Flame, CheckCircle2, Circle, Utensils } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ESTUDIO } from '../config/estudio';

const PRIMARY = '#FF914D';
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const buildCells = (year, month) => {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  return cells;
};

export default function ClientMealPlan({ userId, onOpenRecipe }) {
  const { todayLog, logFood, removeFoodLog, recipes } = useAuth();
  // Resolver la receta completa de una comida del plan (por recipe_id, o por título
  // como fallback si el admin la escribió a mano). Permite abrir el detalle al tocar.
  const resolveRecipe = (meal) => meal.recipe_id
    ? (recipes || []).find(r => r.id === meal.recipe_id)
    : (recipes || []).find(r => r.title === meal.title);
  const [plan, setPlan] = useState(null);
  const [cal, setCal] = useState(new Date());
  const [daysMap, setDaysMap] = useState({});
  const [selDay, setSelDay] = useState(ymd(new Date()));

  // Marcar comidas del plan como consumidas — solo para el día de hoy.
  const isPlanMealEaten = (meal) => todayLog.some(r => r.source === 'plan' && r.meal_time === meal.time && r.title === meal.title);
  const togglePlanMeal = (meal) => {
    const existing = todayLog.find(r => r.source === 'plan' && r.meal_time === meal.time && r.title === meal.title);
    if (existing) removeFoodLog(existing.id);
    else logFood({ title: meal.title, kcal: meal.kcal, source: 'plan', meal_time: meal.time });
  };

  useEffect(() => {
    if (!userId) return;
    supabase.from('nutrition_plans').select('plan_name, calories').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setPlan(data || null));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const y = cal.getFullYear(), m = cal.getMonth();
    const first = ymd(new Date(y, m, 1)), last = ymd(new Date(y, m + 1, 0));
    supabase.from('meal_plan_days').select('date, meals').eq('user_id', userId).gte('date', first).lte('date', last)
      .then(({ data }) => { const map = {}; (data || []).forEach(d => { map[d.date] = d.meals || []; }); setDaysMap(map); });
  }, [userId, cal]);

  const y = cal.getFullYear(), m = cal.getMonth();
  const cells = buildCells(y, m);
  const today = new Date();
  const hasAnyMeals = useMemo(() => Object.values(daysMap).some(v => v?.length), [daysMap]);
  const selMeals = daysMap[selDay] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header del plan (real, estilo premium oscuro) */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ padding: '24px', borderRadius: '28px', backgroundColor: '#2A1B12', color: 'white', position: 'relative', overflow: 'hidden', minHeight: '150px', boxShadow: '0 18px 38px rgba(58,33,24,0.28)' }}>
        <img src={ESTUDIO.portadas.nutricion} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(40,26,18,0.92) 0%, rgba(40,26,18,0.66) 50%, rgba(58,33,24,0.32) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Salad size={14} color={PRIMARY} />
            <span style={{ fontSize: '0.64rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Tu plan nutricional</span>
          </div>
          <h2 style={{ fontSize: '1.8rem', color: 'white', margin: '0 0 4px', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            {plan?.plan_name || 'Plan personalizado'}
          </h2>
          {plan?.calories
            ? <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Objetivo: <span style={{ color: PRIMARY, fontWeight: 800 }}>{plan.calories} kcal</span> / día</div>
            : <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Tu coach diseñará tu plan a la medida.</div>}
        </div>
      </motion.div>

      {/* Calendario mensual de comidas */}
      <div style={{ background: 'var(--app-surface-solid, #fff)', borderRadius: '24px', border: '1px solid var(--border-subtle)', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <button onClick={() => setCal(new Date(y, m - 1, 1))} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface)' }}><ChevronLeft size={17} /></button>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 800, color: 'var(--on-surface)' }}>{MESES[m]} {y}</div>
          <button onClick={() => setCal(new Date(y, m + 1, 1))} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface)' }}><ChevronRight size={17} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', textAlign: 'center', marginBottom: '5px' }}>
          {WEEKDAYS.map((w, i) => <span key={i} style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>{w}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {cells.map((d, i) => {
            if (d === null) return <span key={i} />;
            const key = ymd(new Date(y, m, d));
            const meals = daysMap[key];
            const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
            const isSel = key === selDay;
            return (
              <button key={i} onClick={() => setSelDay(key)} style={{ minHeight: '46px', borderRadius: '11px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer',
                background: isSel ? 'rgba(255,145,77,0.16)' : meals?.length ? 'rgba(255,145,77,0.07)' : 'transparent', border: isToday ? `1.5px solid ${PRIMARY}` : '1.5px solid transparent' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: meals?.length ? 800 : 500, color: meals?.length ? PRIMARY : 'var(--on-surface)' }}>{d}</span>
                {meals?.length > 0 && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: PRIMARY }} />}
              </button>
            );
          })}
        </div>

        {/* Comidas del día seleccionado */}
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--divider)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginBottom: '10px' }}>
            {new Date(selDay + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={selDay} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selMeals.length === 0
                ? <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.86rem', margin: '4px 0' }}>{hasAnyMeals ? 'Sin comidas para este día.' : 'Aún no tienes comidas asignadas este mes.'}</p>
                : selMeals.map((meal, i) => {
                  const selIsToday = selDay === ymd(today);
                  const eaten = selIsToday && isPlanMealEaten(meal);
                  const recipe = resolveRecipe(meal);
                  const openable = !!recipe && !!onOpenRecipe;
                  return (
                  <motion.div key={i} whileTap={openable ? { scale: 0.985 } : undefined}
                    onClick={openable ? () => onOpenRecipe(recipe) : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface-low)', border: `1px solid ${eaten ? 'rgba(46,160,67,0.25)' : 'var(--border-subtle)'}`, borderRadius: '16px', padding: '10px', transition: 'border-color 0.2s', cursor: openable ? 'pointer' : 'default' }}>
                    {/* Miniatura de la receta (o placeholder) */}
                    <div style={{ width: '52px', height: '52px', borderRadius: '13px', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,145,77,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {recipe?.img
                        ? <img src={recipe.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Utensils size={20} color={PRIMARY} />}
                    </div>
                    {/* Centro: tipo de comida + título + kcal */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, color: PRIMARY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>{meal.time}</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--on-surface)', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.title}</span>
                        {openable && <ChevronRight size={14} style={{ color: 'var(--on-surface-muted)', flexShrink: 0 }} />}
                      </div>
                      {meal.kcal ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontWeight: 600, marginTop: '3px' }}><Flame size={11} color={PRIMARY} /> {meal.kcal} kcal</div> : null}
                    </div>
                    {/* Check de consumido (solo hoy) */}
                    {selIsToday && (
                      <button onClick={(e) => { e.stopPropagation(); togglePlanMeal(meal); }} aria-label={eaten ? 'Marcar como no consumida' : 'Marcar como consumida'}
                        style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0, color: eaten ? '#2EA043' : 'var(--on-surface-muted)' }}>
                        {eaten ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </button>
                    )}
                  </motion.div>
                  );
                })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
