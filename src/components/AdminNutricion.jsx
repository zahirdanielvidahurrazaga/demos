import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil, Utensils, CalendarDays, ImagePlus, Loader2, Camera, X, Search, ChevronLeft, ChevronRight, Flame, Clock, Check, Save, Salad } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cafeImage';
import { hasMealPlanAccess } from '../lib/plans';

const PRIMARY = '#FF914D';
const INK = '#1A1C1E';
const MEAL_TIMES = ['Desayuno', 'Snack AM', 'Comida', 'Snack PM', 'Cena'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const input = { width: '100%', padding: '11px 13px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'white', fontSize: '0.92rem', boxSizing: 'border-box', fontFamily: 'inherit' };
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const buildCells = (year, month) => {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  return cells;
};

function Pill({ active, onClick, children }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.95 }}
      style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 15px', borderRadius: '999px', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', whiteSpace: 'nowrap', flexShrink: 0,
        border: active ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.55)',
        background: active ? 'linear-gradient(135deg, #FF914D, #E68245)' : 'rgba(255,255,255,0.55)', color: active ? '#fff' : 'var(--on-surface-variant)',
        backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: active ? '0 8px 20px rgba(255,145,77,0.35)' : '0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)' }}>
      {children}
    </motion.button>
  );
}

function PhotoButton({ url, onUploaded, size = 84 }) {
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    setBusy(true);
    const { url: u, error } = await uploadImage(f, { bucket: 'cafe-products', folder: 'recetas' });
    setBusy(false);
    if (error) { alert('No se pudo subir la imagen.'); return; }
    onUploaded(u);
  };
  return (
    <label style={{ position: 'relative', width: size, height: size, borderRadius: '16px', flexShrink: 0, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: url ? '#F0E6DC' : 'rgba(255,145,77,0.1)', border: url ? '1px solid rgba(0,0,0,0.08)' : '1.5px dashed rgba(255,145,77,0.5)' }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImagePlus size={24} color={PRIMARY} />}
      <input type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
      {url && !busy && <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', padding: '3px 0' }}><Camera size={13} color="#fff" /></span>}
      {busy && <span style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={22} color={PRIMARY} /></motion.span></span>}
    </label>
  );
}

// Editor de lista (ingredientes / pasos): filas con campo + botón quitar, y un
// botón "Agregar" — intuitivo y rápido, sin depender de Enter (Enter es atajo).
function ListEditor({ label, addLabel, items, onChange, numbered, placeholder }) {
  const set = (i, v) => onChange(items.map((x, idx) => (idx === i ? v : x)));
  const add = () => onChange([...items, '']);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {numbered
              ? <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,145,77,0.14)', color: PRIMARY, fontWeight: 800, fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
              : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: PRIMARY, flexShrink: 0, marginLeft: '9px' }} />}
            <input value={it} onChange={e => set(i, e.target.value)} placeholder={placeholder}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} style={input} />
            <button onClick={() => remove(i)} aria-label="Quitar" style={{ border: 'none', background: 'none', color: '#ba1a1a', cursor: 'pointer', display: 'flex', flexShrink: 0, padding: '4px' }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      <button onClick={add} style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,145,77,0.12)', color: PRIMARY, border: 'none', borderRadius: '10px', padding: '8px 13px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}><Plus size={15} /> Agregar {addLabel}</button>
    </div>
  );
}

// "2 huevos" -> {qty:'2', name:'huevos'}; "Aceite de oliva" -> {qty:'', name:'Aceite de oliva'}
const parseIng = (s) => {
  const str = (s || '').trim();
  const sp = str.indexOf(' ');
  if (sp > 0 && /\d/.test(str.slice(0, sp))) return { qty: str.slice(0, sp), name: str.slice(sp + 1).trim() };
  return { qty: '', name: str };
};
const combineIng = ({ qty, name }) => `${(qty || '').trim()} ${(name || '').trim()}`.trim();

// Editor de ingredientes: cantidad + nombre con autocompletado del catálogo.
// El nombre se va guardando en la tabla `ingredients` para reusarlo en otras recetas.
function IngredientEditor({ items, onChange, catalog }) {
  const [openIdx, setOpenIdx] = useState(-1);
  const set = (i, patch) => onChange(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const add = () => onChange([...items, { qty: '', name: '' }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Ingredientes</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((it, i) => {
          const q = (it.name || '').trim().toLowerCase();
          const sugg = q.length >= 1 ? catalog.filter(c => c.toLowerCase().includes(q) && c.toLowerCase() !== q).slice(0, 6) : [];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: PRIMARY, flexShrink: 0, marginLeft: '4px' }} />
              <input value={it.qty} onChange={e => set(i, { qty: e.target.value })} placeholder="Cant." style={{ ...input, flex: '0 0 84px' }} />
              <div style={{ position: 'relative', flex: 1 }}>
                <input value={it.name} onChange={e => set(i, { name: e.target.value })}
                  onFocus={() => setOpenIdx(i)} onBlur={() => setTimeout(() => setOpenIdx(o => (o === i ? -1 : o)), 150)}
                  placeholder="Ingrediente (ej. huevo)" style={{ ...input, width: '100%' }} />
                {openIdx === i && sugg.length > 0 && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.08)', zIndex: 50, overflow: 'hidden', maxHeight: '210px', overflowY: 'auto' }}>
                    {sugg.map(s => (
                      <button key={s} type="button" onMouseDown={(e) => { e.preventDefault(); set(i, { name: s }); setOpenIdx(-1); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 13px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.88rem', color: INK }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => remove(i)} aria-label="Quitar" style={{ border: 'none', background: 'none', color: '#ba1a1a', cursor: 'pointer', display: 'flex', flexShrink: 0, padding: '4px' }}><Trash2 size={15} /></button>
            </div>
          );
        })}
      </div>
      <button onClick={add} style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,145,77,0.12)', color: PRIMARY, border: 'none', borderRadius: '10px', padding: '8px 13px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}><Plus size={15} /> Agregar ingrediente</button>
    </div>
  );
}

// ============ RECETAS ============
function Recetas() {
  const [recipes, setRecipes] = useState([]);
  const [form, setForm] = useState(null); // null | {id?, time, title, kcal, time_prep, img, ingredients:[{qty,name}], steps}
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState([]); // nombres de ingredientes guardados

  const load = async () => {
    const { data } = await supabase.from('recipes').select('*').order('created_at', { ascending: false });
    setRecipes(data || []);
  };
  const loadCatalog = async () => {
    const { data } = await supabase.from('ingredients').select('name').order('name', { ascending: true });
    setCatalog((data || []).map(d => d.name));
  };
  useEffect(() => { load(); loadCatalog(); }, []);

  const blank = { time: 'Desayuno', title: '', kcal: '', time_prep: '', img: '', ingredients: [{ qty: '', name: '' }], steps: [''] };
  const startAdd = () => setForm({ ...blank, ingredients: [{ qty: '', name: '' }], steps: [''] });
  const startEdit = (r) => setForm({ id: r.id, time: r.time || 'Desayuno', title: r.title || '', kcal: r.kcal || '', time_prep: r.time_prep || '', img: r.img || '', ingredients: (r.ingredients || []).length ? r.ingredients.map(parseIng) : [{ qty: '', name: '' }], steps: (r.steps || []).length ? [...r.steps] : [''] });

  const save = async () => {
    if (!form.title.trim()) { alert('Falta el título.'); return; }
    setSaving(true);
    const ingObjs = form.ingredients.filter(i => (i.name || '').trim());
    const payload = {
      time: form.time, title: form.title.trim(), kcal: String(form.kcal || ''), time_prep: form.time_prep || '',
      img: form.img || null,
      ingredients: ingObjs.map(combineIng),
      steps: form.steps.map(s => s.trim()).filter(Boolean),
    };
    if (form.id) await supabase.from('recipes').update(payload).eq('id', form.id);
    else await supabase.from('recipes').insert(payload);
    // Guardar ingredientes nuevos en el catálogo (para reusarlos en otras recetas)
    try {
      const existing = new Set(catalog.map(c => c.toLowerCase()));
      const fresh = [...new Set(ingObjs.map(i => i.name.trim()).filter(n => n && n.length <= 40 && !/^\d+$/.test(n)))]
        .filter(n => !existing.has(n.toLowerCase()));
      if (fresh.length) { await supabase.from('ingredients').insert(fresh.map(name => ({ name }))); loadCatalog(); }
    } catch (e) { /* duplicado u otro: ignorar, no bloquea el guardado de la receta */ }
    setSaving(false); setForm(null); load();
  };
  const del = async (r) => { if (confirm(`¿Eliminar "${r.title}"?`)) { await supabase.from('recipes').delete().eq('id', r.id); load(); } };

  return (
    <div>
      {!form && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
          <button onClick={startAdd} style={{ background: PRIMARY, color: 'white', border: 'none', padding: '9px 15px', borderRadius: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><Plus size={16} /> Nueva receta</button>
        </div>
      )}

      <AnimatePresence>
        {form && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: INK }}>{form.id ? 'Editar receta' : 'Nueva receta'}</h3>
                <button onClick={() => setForm(null)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', gap: '14px', marginBottom: '12px' }}>
                <PhotoButton url={form.img} onUploaded={(u) => setForm(f => ({ ...f, img: u }))} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input placeholder="Título (ej. Bowl de pollo)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={input} />
                  <select value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={{ ...input, WebkitAppearance: 'none' }}>
                    {MEAL_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <input placeholder="Kcal (ej. 450)" value={form.kcal} onChange={e => setForm({ ...form, kcal: e.target.value })} style={input} />
                <input placeholder="Tiempo (ej. 15 min)" value={form.time_prep} onChange={e => setForm({ ...form, time_prep: e.target.value })} style={input} />
              </div>
              <IngredientEditor items={form.ingredients} onChange={(v) => setForm(f => ({ ...f, ingredients: v }))} catalog={catalog} />
              <ListEditor label="Pasos" addLabel="paso" numbered items={form.steps} onChange={(v) => setForm(f => ({ ...f, steps: v }))} placeholder="Describe el paso…" />
              <button onClick={save} disabled={saving} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: PRIMARY, color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                <Save size={16} /> {saving ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Crear receta')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {recipes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '46px', color: 'var(--on-surface-variant)' }}><Utensils size={34} style={{ opacity: 0.3, marginBottom: '12px' }} /><p style={{ margin: 0, fontWeight: 700, color: INK }}>Sin recetas todavía</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {recipes.map(r => (
            <div key={r.id} style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', padding: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              {r.img ? <img src={r.img} alt="" style={{ width: '58px', height: '58px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: '58px', height: '58px', borderRadius: '12px', background: 'rgba(255,145,77,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Utensils size={22} color={PRIMARY} /></div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.66rem', color: PRIMARY, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.time}</div>
                <div style={{ fontWeight: 800, color: INK, fontSize: '0.92rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}>{r.kcal} kcal · {r.time_prep}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                <button onClick={() => startEdit(r)} style={{ width: '32px', height: '32px', borderRadius: '9px', border: 'none', background: 'rgba(255,145,77,0.12)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Pencil size={15} /></button>
                <button onClick={() => del(r)} style={{ width: '32px', height: '32px', borderRadius: '9px', border: 'none', background: 'rgba(186,26,26,0.08)', color: '#ba1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ PLANES (calendario mensual por persona) ============
function DayEditor({ date, userId, initial, recipes, onClose, onSaved }) {
  const [meals, setMeals] = useState(initial?.meals || []);
  const [time, setTime] = useState('Desayuno');
  const [title, setTitle] = useState('');
  const [kcal, setKcal] = useState('');
  const [saving, setSaving] = useState(false);

  const add = () => { if (!title.trim()) return; setMeals(m => [...m, { time, title: title.trim(), kcal: kcal || '' }]); setTitle(''); setKcal(''); };
  const remove = (i) => setMeals(m => m.filter((_, idx) => idx !== i));
  const pickRecipe = (r) => setMeals(m => [...m, { time, title: r.title, kcal: r.kcal || '', recipe_id: r.id }]);

  const save = async () => {
    setSaving(true);
    if (meals.length === 0) await supabase.from('meal_plan_days').delete().eq('user_id', userId).eq('date', date);
    else await supabase.from('meal_plan_days').upsert({ user_id: userId, date, meals, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' });
    setSaving(false); onSaved(date, meals); onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div onClick={e => e.stopPropagation()} initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        style={{ width: 'min(560px, 100%)', maxHeight: '88vh', background: '#FDFBF7', borderTopLeftRadius: '26px', borderTopRightRadius: '26px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 12px' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: INK }}>{new Date(date + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 20px 20px', flex: 1 }}>
          {/* Comidas del día */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {meals.length === 0 && <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.86rem', margin: '6px 0' }}>Sin comidas asignadas. Agrega abajo.</p>}
            {meals.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', padding: '10px 12px' }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 800, color: PRIMARY, textTransform: 'uppercase', background: 'rgba(255,145,77,0.12)', padding: '3px 8px', borderRadius: '7px', flexShrink: 0 }}>{m.time}</span>
                <span style={{ flex: 1, fontWeight: 600, color: INK, fontSize: '0.9rem' }}>{m.title}{m.kcal ? <span style={{ color: 'var(--on-surface-variant)', fontWeight: 500 }}> · {m.kcal} kcal</span> : ''}</span>
                <button onClick={() => remove(i)} style={{ border: 'none', background: 'none', color: '#ba1a1a', cursor: 'pointer', display: 'flex' }}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          {/* Agregar comida manual */}
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', padding: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <select value={time} onChange={e => setTime(e.target.value)} style={{ ...input, WebkitAppearance: 'none', flex: '0 0 130px' }}>{MEAL_TIMES.map(t => <option key={t}>{t}</option>)}</select>
              <input placeholder="Kcal" value={kcal} onChange={e => setKcal(e.target.value)} style={{ ...input, flex: '0 0 80px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input placeholder="Comida (ej. Avena con fruta)" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} style={input} />
              <button onClick={add} style={{ background: 'rgba(255,145,77,0.14)', color: PRIMARY, border: 'none', borderRadius: '11px', padding: '0 14px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}><Plus size={16} /></button>
            </div>
          </div>
          {/* Desde recetas */}
          {recipes.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Agregar desde recetas</div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {recipes.slice(0, 20).map(r => (
                  <button key={r.id} onClick={() => pickRecipe(r)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '7px 11px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: INK }}>
                    {r.img && <img src={r.img} alt="" style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'cover' }} />}{r.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '12px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button onClick={save} disabled={saving} style={{ width: '100%', padding: '13px', borderRadius: '14px', background: PRIMARY, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer' }}>{saving ? 'Guardando…' : 'Guardar día'}</button>
        </div>
      </motion.div>
    </div>
  );
}

function Planes() {
  const { allUsers } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [q, setQ] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [cal, setCal] = useState(new Date());
  const [daysMap, setDaysMap] = useState({}); // 'YYYY-MM-DD' -> meals[]
  const [plan, setPlan] = useState(null); // {id?, plan_name, calories}
  const [editDay, setEditDay] = useState(null);

  useEffect(() => { supabase.from('recipes').select('id, title, img, kcal').then(({ data }) => setRecipes(data || [])); }, []);

  const plans = useMemo(() => {
    const s = new Set();
    (allUsers || []).forEach(u => { if (u.membership_status === 'ACTIVE' && u.membership_plan && hasMealPlanAccess(u.membership_plan)) s.add(u.membership_plan); });
    return [...s];
  }, [allUsers]);

  const clients = useMemo(() => {
    // Solo Fit/Premium reciben plan alimenticio personalizado.
    let arr = (allUsers || []).filter(u => u.role === 'CLIENT' && hasMealPlanAccess(u.membership_plan));
    if (planFilter !== 'all') arr = arr.filter(u => (u.membership_plan || '') === planFilter);
    const s = q.trim().toLowerCase();
    if (s) arr = arr.filter(u => (u.full_name || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s));
    return arr;
  }, [allUsers, planFilter, q]);

  // Cargar plan + comidas del mes al elegir clienta o cambiar mes
  useEffect(() => {
    if (!selected) return;
    (async () => {
      const y = cal.getFullYear(), m = cal.getMonth();
      const first = ymd(new Date(y, m, 1)), last = ymd(new Date(y, m + 1, 0));
      const { data: days } = await supabase.from('meal_plan_days').select('date, meals').eq('user_id', selected.id).gte('date', first).lte('date', last);
      const map = {}; (days || []).forEach(d => { map[d.date] = d.meals || []; }); setDaysMap(map);
    })();
  }, [selected, cal]);

  useEffect(() => {
    if (!selected) { setPlan(null); return; }
    supabase.from('nutrition_plans').select('*').eq('user_id', selected.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setPlan(data ? { id: data.id, plan_name: data.plan_name || '', calories: data.calories || '' } : { plan_name: '', calories: '' }));
  }, [selected]);

  const savePlan = async () => {
    const payload = { user_id: selected.id, plan_name: plan.plan_name.trim() || null, calories: plan.calories ? parseInt(plan.calories, 10) : null, is_active: true };
    if (plan.id) await supabase.from('nutrition_plans').update(payload).eq('id', plan.id);
    else { const { data } = await supabase.from('nutrition_plans').insert(payload).select('id').single(); if (data) setPlan(p => ({ ...p, id: data.id })); }
    alert('Plan guardado.');
  };

  const y = cal.getFullYear(), m = cal.getMonth();
  const cells = buildCells(y, m);
  const today = new Date();

  if (!selected) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(255,145,77,0.08)', border: '1px solid rgba(255,145,77,0.2)', borderRadius: '14px', padding: '11px 14px', marginBottom: '14px', fontSize: '0.82rem', color: 'var(--on-surface-variant)', lineHeight: 1.45 }}>
          <Salad size={16} color={PRIMARY} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>Solo las clientas con plan <strong style={{ color: INK }}>Fit</strong> o <strong style={{ color: INK }}>Premium</strong> reciben plan alimenticio personalizado. Las de Inicial y Básico ven solo el recetario.</span>
        </div>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar clienta por nombre o correo…" style={{ ...input, paddingLeft: '42px' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '18px' }}>
          <Pill active={planFilter === 'all'} onClick={() => setPlanFilter('all')}>Todas</Pill>
          {plans.map(p => <Pill key={p} active={planFilter === p} onClick={() => setPlanFilter(p)}>{p}</Pill>)}
        </div>
        {clients.length === 0 ? <div style={{ textAlign: 'center', padding: '46px', color: 'var(--on-surface-variant)' }}>No hay clientas con plan Fit o Premium.</div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {clients.map(u => (
              <button key={u.id} onClick={() => setSelected(u)} style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', padding: '12px' }}>
                {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,145,77,0.14)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{(u.full_name || '?').charAt(0)}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: INK, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || 'Sin nombre'}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}>{u.membership_status === 'ACTIVE' ? (u.membership_plan || 'Activa') : 'Sin plan'}</div>
                </div>
                <ChevronRight size={18} color="#C9BDB0" />
              </button>
            ))}
          </div>}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.86rem', marginBottom: '14px', padding: 0 }}><ChevronLeft size={16} /> Todas las clientas</button>

      {/* Cabecera clienta + plan */}
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', padding: '16px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          {selected.avatar_url ? <img src={selected.avatar_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,145,77,0.14)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{(selected.full_name || '?').charAt(0)}</div>}
          <div>
            <div style={{ fontWeight: 800, color: INK, fontSize: '1.05rem' }}>{selected.full_name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>{selected.membership_plan || 'Sin plan'}</div>
          </div>
        </div>
        {plan && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="Nombre del plan (ej. Definición)" value={plan.plan_name} onChange={e => setPlan({ ...plan, plan_name: e.target.value })} style={{ ...input, flex: '1 1 180px' }} />
            <input placeholder="Kcal objetivo" value={plan.calories} onChange={e => setPlan({ ...plan, calories: e.target.value })} style={{ ...input, flex: '0 0 130px' }} />
            <button onClick={savePlan} style={{ background: PRIMARY, color: 'white', border: 'none', borderRadius: '11px', padding: '11px 16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={15} /> Guardar</button>
          </div>
        )}
      </div>

      {/* Calendario mensual */}
      <div style={{ background: '#fff', borderRadius: '22px', border: '1px solid rgba(0,0,0,0.05)', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <button onClick={() => setCal(new Date(y, m - 1, 1))} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.08)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={18} /></button>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800, color: INK }}>{MESES[m]} {y}</div>
          <button onClick={() => setCal(new Date(y, m + 1, 1))} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.08)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '6px' }}>
          {WEEKDAYS.map((w, i) => <span key={i} style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>{w}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {cells.map((d, i) => {
            if (d === null) return <span key={i} />;
            const key = ymd(new Date(y, m, d));
            const meals = daysMap[key];
            const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
            return (
              <button key={i} onClick={() => setEditDay(key)} style={{ minHeight: '54px', borderRadius: '12px', padding: '4px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '3px', cursor: 'pointer',
                background: meals?.length ? 'rgba(255,145,77,0.1)' : 'rgba(0,0,0,0.015)', border: isToday ? `1.5px solid ${PRIMARY}` : '1.5px solid transparent' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: meals?.length ? 800 : 500, color: meals?.length ? PRIMARY : 'var(--on-surface)' }}>{d}</span>
                {meals?.length > 0 && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: PRIMARY, background: 'white', borderRadius: '6px', padding: '1px 5px' }}>{meals.length} 🍽</span>}
              </button>
            );
          })}
        </div>
      </div>

      {editDay && (
        <DayEditor date={editDay} userId={selected.id} initial={{ meals: daysMap[editDay] || [] }} recipes={recipes}
          onClose={() => setEditDay(null)} onSaved={(date, meals) => setDaysMap(prev => { const n = { ...prev }; if (meals.length) n[date] = meals; else delete n[date]; return n; })} />
      )}
    </div>
  );
}

export default function AdminNutricion() {
  const [tab, setTab] = useState('recetas');
  return (
    <section>
      <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '14px', color: INK }}>Nutrición</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px' }}>
        <Pill active={tab === 'recetas'} onClick={() => setTab('recetas')}><Utensils size={15} /> Recetas</Pill>
        <Pill active={tab === 'planes'} onClick={() => setTab('planes')}><CalendarDays size={15} /> Planes</Pill>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {tab === 'recetas' ? <Recetas /> : <Planes />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
