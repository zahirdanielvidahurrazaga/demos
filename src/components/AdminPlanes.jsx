import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, CheckCircle2, X, Infinity as InfinityIcon, Eye, EyeOff, AlertTriangle, GripVertical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Quita acentos y deja un slug seguro para el lookup_key de Stripe.
const slugify = (s) => (s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const emptyDraft = () => ({
  id: null, name: '', title: '', subtitle: '',
  price_mxn: 0, classes: 0, unlimited: false, nutrition: false, meal_plan: false,
  features: [], stripe_lookup_base: '', active: true, sort_order: 0,
});

const label = { fontSize: '0.74rem', fontWeight: 800, color: 'var(--on-surface-variant)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' };
const input = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: '13px', border: '1px solid rgba(55,61,59,0.12)', background: 'var(--surface-lowest)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none' };

export default function AdminPlanes() {
  const { allPlans, createPlan, updatePlan, deletePlan } = useAuth();
  const [draft, setDraft] = useState(null);     // plan en edición/creación o null
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);         // { type, text }

  const isNew = draft && !draft.id;
  const toast = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3200); };

  const startEdit = (p) => setDraft({
    id: p.id, name: p.name, title: p.title, subtitle: p.subtitle || '',
    price_mxn: p.amount ?? 0, classes: p.classes ?? 0, unlimited: !!p.unlimited,
    nutrition: !!p.nutrition, meal_plan: !!p.mealPlan, features: [...(p.features || [])],
    stripe_lookup_base: p.lookupKey || '', active: p.active !== false, sort_order: p.sort_order ?? 0,
  });

  const startNew = () => {
    const maxOrder = Math.max(0, ...(allPlans || []).map(p => p.sort_order || 0));
    setDraft({ ...emptyDraft(), sort_order: maxOrder + 1 });
  };

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const save = async () => {
    const title = (draft.title || '').trim();
    if (!title) return toast('error', 'Falta el nombre del plan (título).');
    if (draft.price_mxn === '' || isNaN(Number(draft.price_mxn)) || Number(draft.price_mxn) < 0)
      return toast('error', 'El precio debe ser un número válido (en pesos).');

    const features = (Array.isArray(draft.features) ? draft.features : [])
      .map(f => (f || '').trim()).filter(Boolean);

    const common = {
      title,
      subtitle: (draft.subtitle || '').trim() || null,
      price_mxn: Math.round(Number(draft.price_mxn)),
      classes: draft.unlimited ? 9999 : (Math.max(0, parseInt(draft.classes) || 0)),
      unlimited: !!draft.unlimited,
      nutrition: !!draft.nutrition,
      meal_plan: !!draft.meal_plan,
      features,
      active: !!draft.active,
      sort_order: parseInt(draft.sort_order) || 0,
    };

    setBusy(true);
    let res;
    if (isNew) {
      // Derivar la clave canónica y la base de Stripe a partir del título.
      const slug = slugify(title);
      if (!slug) { setBusy(false); return toast('error', 'El título debe tener letras o números.'); }
      const name = `Plan ${title}`;
      if ((allPlans || []).some(p => p.name.toLowerCase() === name.toLowerCase()))
        { setBusy(false); return toast('error', `Ya existe un plan llamado "${name}".`); }
      res = await createPlan({ ...common, name, stripe_lookup_base: `befit_plan_${slug}_monthly` });
    } else {
      res = await updatePlan(draft.id, common);
    }
    setBusy(false);
    if (res?.success) { toast('success', isNew ? 'Plan creado.' : 'Plan actualizado.'); setDraft(null); }
    else toast('error', 'No se pudo guardar: ' + (res?.error?.message || 'error desconocido'));
  };

  const remove = async (p) => {
    if (!confirm(`¿Eliminar el plan "${p.title}"?\n\nSi alguna clienta lo tiene asignado, en su lugar se ARCHIVARÁ (se oculta del sitio pero se conserva su historial). Las suscripciones activas en Stripe no se cancelan.`)) return;
    setBusy(true);
    const res = await deletePlan(p);
    setBusy(false);
    if (res?.success) toast('success', res.archived ? `Plan archivado (${res.count} clienta(s) lo tienen).` : 'Plan eliminado.');
    else toast('error', 'No se pudo eliminar: ' + (res?.error?.message || 'error'));
  };

  const toggleActive = async (p) => {
    setBusy(true);
    const res = await updatePlan(p.id, { active: !(p.active !== false) });
    setBusy(false);
    if (!res?.success) toast('error', 'No se pudo cambiar la visibilidad.');
  };

  return (
    <div style={{ maxWidth: '760px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0, fontWeight: 800 }}>Membresías</h2>
        {!draft && (
          <button onClick={startNew} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', boxShadow: '0 6px 16px rgba(255,145,77,0.3)' }}>
            <Plus size={18} /> Nuevo plan
          </button>
        )}
      </div>

      {/* Aviso de impacto */}
      <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,145,77,0.08)', border: '1px solid rgba(255,145,77,0.25)', borderRadius: '14px', padding: '12px 14px', marginBottom: '18px' }}>
        <AlertTriangle size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '1px' }} />
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--on-surface)', lineHeight: 1.5 }}>
          Lo que edites aquí cambia <strong>lo que cobra Stripe</strong> y <strong>lo que ve el sitio web y la app</strong>, al instante.
          Subir/bajar un precio aplica a <strong>clientas nuevas</strong>; las que ya tienen suscripción conservan su precio.
        </p>
      </div>

      {/* Mensaje */}
      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', borderRadius: '12px', marginBottom: '14px', fontWeight: 700, fontSize: '0.85rem',
              background: msg.type === 'error' ? 'rgba(255,77,77,0.1)' : 'rgba(34,197,94,0.12)', color: msg.type === 'error' ? '#c81e1e' : '#16A34A' }}>
            {msg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />} {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDITOR */}
      <AnimatePresence>
        {draft && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>{isNew ? 'Nuevo plan' : `Editar: ${draft.title}`}</h3>
                <button onClick={() => setDraft(null)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={17} /></button>
              </div>

              <div style={{ marginBottom: '13px' }}>
                <label style={label}>Nombre del plan</label>
                <input style={input} value={draft.title} onChange={e => set('title', e.target.value)} placeholder="Ej. Fit" />
                {isNew
                  ? <p style={{ margin: '6px 2px 0', fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>Se registrará como <strong>«Plan {draft.title || '…'}»</strong> (clave interna, no se podrá renombrar después).</p>
                  : <p style={{ margin: '6px 2px 0', fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>Clave interna: <strong>{draft.name}</strong> (fija).</p>}
              </div>

              <div style={{ marginBottom: '13px' }}>
                <label style={label}>Subtítulo (frase corta del sitio)</label>
                <input style={input} value={draft.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="Ej. Constancia que transforma" />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '13px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={label}>Precio (MXN / mes)</label>
                  <input style={input} type="number" min="0" inputMode="numeric" value={draft.price_mxn} onChange={e => set('price_mxn', e.target.value)} placeholder="1300" />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={label}>Clases por mes</label>
                  <input style={{ ...input, opacity: draft.unlimited ? 0.45 : 1 }} type="number" min="0" inputMode="numeric" disabled={draft.unlimited}
                    value={draft.unlimited ? '' : draft.classes} onChange={e => set('classes', e.target.value)} placeholder={draft.unlimited ? 'Ilimitadas' : '20'} />
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                <Toggle on={draft.unlimited} onClick={() => set('unlimited', !draft.unlimited)} icon={<InfinityIcon size={16} />} title="Clases ilimitadas" sub="Sin tope mensual de reservas" />
                <Toggle on={draft.nutrition} onClick={() => set('nutrition', !draft.nutrition)} title="Acceso a Nutrición" sub="Recetario y apartado de comida" />
                <Toggle on={draft.meal_plan} onClick={() => set('meal_plan', !draft.meal_plan)} title="Plan alimenticio personalizado" sub="Plan de comidas hecho por el coach" />
                <Toggle on={draft.active} onClick={() => set('active', !draft.active)} icon={draft.active ? <Eye size={16} /> : <EyeOff size={16} />} title="Visible en el sitio" sub="Aparece en las tarjetas de precios y para inscribir" />
              </div>

              <div style={{ marginBottom: '13px' }}>
                <label style={label}>Beneficios (uno por línea)</label>
                <textarea style={{ ...input, minHeight: '120px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                  value={(draft.features || []).join('\n')}
                  onChange={e => set('features', e.target.value.split('\n'))}
                  placeholder={'Acceso a 20 clases\n+100 ideas de recetas\nRegistro de métricas'} />
              </div>

              <div style={{ marginBottom: '18px', maxWidth: '160px' }}>
                <label style={label}>Orden en el sitio</label>
                <input style={input} type="number" inputMode="numeric" value={draft.sort_order} onChange={e => set('sort_order', e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setDraft(null)} style={{ flex: 1, padding: '14px', borderRadius: '13px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--surface-lowest)', fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={save} disabled={busy} style={{ flex: 2, padding: '14px', borderRadius: '13px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Guardando…' : (isNew ? 'Crear plan' : 'Guardar cambios')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(allPlans || []).map(p => {
          const archived = p.active === false;
          return (
            <div key={p.id || p.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'var(--app-surface-solid, #fff)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', opacity: archived ? 0.62 : 1 }}>
              <GripVertical size={16} color="var(--on-surface-variant)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1rem', fontFamily: 'var(--font-display)' }}>{p.title}</strong>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>{p.price}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>· {p.unlimited ? 'ilimitadas' : `${p.classes} clases`}</span>
                  {archived && <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#c81e1e', background: 'rgba(255,77,77,0.12)', padding: '2px 8px', borderRadius: '20px' }}>ARCHIVADO</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
                  {p.nutrition && <Tag>Nutrición</Tag>}
                  {p.mealPlan && <Tag>Plan alimenticio</Tag>}
                </div>
              </div>
              <button title={archived ? 'Mostrar' : 'Ocultar'} onClick={() => toggleActive(p)} disabled={busy} style={iconBtn}>
                {archived ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button title="Editar" onClick={() => startEdit(p)} style={iconBtn}><Pencil size={16} /></button>
              <button title="Eliminar" onClick={() => remove(p)} disabled={busy} style={{ ...iconBtn, color: '#c81e1e', background: 'rgba(255,77,77,0.1)' }}><Trash2 size={16} /></button>
            </div>
          );
        })}
        {(!allPlans || allPlans.length === 0) && (
          <p style={{ textAlign: 'center', color: 'var(--on-surface-variant)', fontStyle: 'italic', padding: '24px' }}>No hay planes. Crea el primero.</p>
        )}
      </div>
    </div>
  );
}

const iconBtn = { flexShrink: 0, width: '36px', height: '36px', borderRadius: '11px', border: 'none', background: 'rgba(0,0,0,0.05)', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };

function Tag({ children }) {
  return <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--on-surface-variant)', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '20px' }}>{children}</span>;
}

function Toggle({ on, onClick, icon, title, sub }) {
  return (
    <button onClick={onClick} type="button" style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 13px', borderRadius: '13px', border: '1px solid', borderColor: on ? 'var(--primary)' : 'rgba(0,0,0,0.08)', background: on ? 'rgba(255,145,77,0.08)' : 'var(--surface-lowest)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
      <span style={{ width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--primary)' : 'rgba(0,0,0,0.06)', color: on ? '#fff' : 'var(--on-surface-variant)' }}>{icon || (on ? <CheckCircle2 size={16} /> : <X size={16} />)}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', color: 'var(--on-surface)' }}>{title}</span>
        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>{sub}</span>
      </span>
      <span style={{ width: '42px', height: '24px', borderRadius: '20px', background: on ? 'var(--primary)' : 'rgba(0,0,0,0.15)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: '2px', left: on ? '20px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
      </span>
    </button>
  );
}
