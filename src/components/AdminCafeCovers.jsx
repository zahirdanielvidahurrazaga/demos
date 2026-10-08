import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ImagePlus, Loader2, Eye, EyeOff, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cafeImage';

// ============================================================================
// ADMIN → CAFETERÍA → PORTADAS
// La tarjeta grande de "Novedades" que abre la cafetería. Antes estaba
// hardcodeada en Cafeteria.jsx (imagen y textos), así que cambiarla exigía
// recompilar y publicar la app. Ahora vive en la tabla `cafe_covers` y la
// imagen en Storage → la dueña la cambia sola y se ve al instante, también en
// las apps ya instaladas.
// ============================================================================

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  border: '1px solid rgba(0,0,0,0.1)', background: 'white',
  fontSize: '0.9rem', boxSizing: 'border-box',
};

// Sube al bucket público de cafetería, en su propia carpeta.
function CoverPhoto({ imageUrl, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    const { url, error } = await uploadImage(file, { bucket: 'cafe-products', folder: 'portadas', maxSize: 1400 });
    setBusy(false);
    if (error) {
      const msg = error?.message || error?.error || 'Error desconocido';
      alert('No se pudo subir la imagen.\n\nMotivo: ' + msg);
      return;
    }
    onUploaded(url);
  };
  return (
    <label style={{ position: 'relative', width: '100%', aspectRatio: '4/5', borderRadius: '16px', cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', background: imageUrl ? '#F0E6DC' : 'rgba(255,145,77,0.08)', border: imageUrl ? '1px solid rgba(0,0,0,0.08)' : '1.5px dashed rgba(255,145,77,0.5)' }}>
      {imageUrl
        ? <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <><ImagePlus size={24} color="var(--primary)" /><span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>Subir imagen</span></>}
      <input type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
      {busy && (
        <span style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={22} color="var(--primary)" /></motion.span>
        </span>
      )}
    </label>
  );
}

// Campo de texto que guarda al salir (blur), no en cada tecla: escribir un
// título dispararía un UPDATE por carácter.
function TextField({ value, placeholder, rows, bold, onCommit }) {
  const [draft, setDraft] = useState(value || '');
  useEffect(() => { setDraft(value || ''); }, [value]);
  const commit = () => { if ((draft || '') !== (value || '')) onCommit(draft.trim() || null); };
  const style = { ...inputStyle, ...(bold ? { fontWeight: 700 } : null), ...(rows ? { resize: 'vertical', fontFamily: 'inherit' } : null) };
  return rows
    ? <textarea value={draft} placeholder={placeholder} rows={rows} onChange={e => setDraft(e.target.value)} onBlur={commit} style={style} />
    : <input value={draft} placeholder={placeholder} onChange={e => setDraft(e.target.value)} onBlur={commit} style={style} />;
}

export default function AdminCafeCovers() {
  const [covers, setCovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [nc, setNc] = useState({ image_url: '', eyebrow: '', title: '', cta: 'Pedir Ahora' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('cafe_covers').select('*').order('sort_order', { ascending: true });
    setCovers(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const patch = async (id, updates) => {
    setCovers(cs => cs.map(c => c.id === id ? { ...c, ...updates } : c));   // optimista
    const { error } = await supabase.from('cafe_covers').update(updates).eq('id', id);
    if (error) { alert('No se pudo guardar: ' + error.message); load(); }
  };

  const add = async () => {
    if (!nc.image_url) { alert('Sube primero la imagen de la portada.'); return; }
    const { error } = await supabase.from('cafe_covers').insert({
      ...nc,
      eyebrow: nc.eyebrow.trim() || null,
      title: nc.title.trim() || null,
      sort_order: covers.length,
    });
    if (error) { alert('No se pudo agregar: ' + error.message); return; }
    setNc({ image_url: '', eyebrow: '', title: '', cta: 'Pedir Ahora' });
    setShowAdd(false);
    load();
  };

  const remove = async (c) => {
    if (!confirm('¿Quitar esta portada?')) return;
    const { error } = await supabase.from('cafe_covers').delete().eq('id', c.id);
    if (error) { alert('No se pudo eliminar: ' + error.message); return; }
    load();
  };

  // Mover en el orden: intercambia sort_order con el vecino.
  const move = async (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= covers.length) return;
    const a = covers[idx], b = covers[j];
    await Promise.all([
      supabase.from('cafe_covers').update({ sort_order: j }).eq('id', a.id),
      supabase.from('cafe_covers').update({ sort_order: idx }).eq('id', b.id),
    ]);
    load();
  };

  const activas = covers.filter(c => c.active).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,145,77,0.08)', border: '1px solid rgba(255,145,77,0.2)', marginBottom: '16px' }}>
        <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
        <span style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', lineHeight: 1.45 }}>
          Es la imagen grande que abre la cafetería. Los cambios se ven <strong>al instante</strong>, sin actualizar la app.
          {activas > 1 && ' Con varias portadas activas, van rotando solas cada 5 segundos.'}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
        <button onClick={() => setShowAdd(s => !s)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <Plus size={16} /> Nueva portada
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '20px' }}>
            <div className="ios-glass-card" style={{ padding: '16px', background: 'white' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '14px', alignItems: 'start' }}>
                <CoverPhoto imageUrl={nc.image_url} onUploaded={(url) => setNc({ ...nc, image_url: url })} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input placeholder="Etiqueta pequeña (ej. Temporada)" value={nc.eyebrow} onChange={e => setNc({ ...nc, eyebrow: e.target.value })} style={inputStyle} />
                  <textarea placeholder={'Título grande\n(ej. Recién hecho\npara ti)'} value={nc.title} onChange={e => setNc({ ...nc, title: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                  <input placeholder="Texto del botón" value={nc.cta} onChange={e => setNc({ ...nc, cta: e.target.value })} style={inputStyle} />
                  <button onClick={add} style={{ padding: '11px', borderRadius: '10px', background: 'var(--primary)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Agregar portada</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>Cargando…</div>
      ) : covers.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', borderRadius: '14px', border: '1px dashed rgba(0,0,0,0.12)', color: 'var(--on-surface-variant)' }}>
          Sin portadas. Mientras no haya ninguna, la cafetería muestra la imagen original.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {covers.map((c, idx) => (
            <div key={c.id} className="ios-glass-card" style={{ padding: '12px', background: 'white', opacity: c.active ? 1 : 0.55 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '12px', alignItems: 'start' }}>
                <CoverPhoto imageUrl={c.image_url} onUploaded={(url) => patch(c.id, { image_url: url })} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                  <TextField value={c.eyebrow} placeholder="Etiqueta pequeña" onCommit={v => patch(c.id, { eyebrow: v })} />
                  <TextField value={c.title} placeholder="Título grande" rows={2} bold onCommit={v => patch(c.id, { title: v })} />
                  <TextField value={c.cta} placeholder="Texto del botón" onCommit={v => patch(c.id, { cta: v })} />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button onClick={() => patch(c.id, { active: !c.active })} title={c.active ? 'Ocultar' : 'Mostrar'}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 11px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: c.active ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.06)', color: c.active ? '#16A34A' : 'var(--on-surface-variant)' }}>
                      {c.active ? <><Eye size={14} /> Visible</> : <><EyeOff size={14} /> Oculta</>}
                    </button>
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} title="Subir"
                      style={{ padding: '7px 9px', borderRadius: '9px', border: 'none', background: 'rgba(0,0,0,0.05)', color: 'var(--on-surface-variant)', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}><ArrowUp size={14} /></button>
                    <button onClick={() => move(idx, 1)} disabled={idx === covers.length - 1} title="Bajar"
                      style={{ padding: '7px 9px', borderRadius: '9px', border: 'none', background: 'rgba(0,0,0,0.05)', color: 'var(--on-surface-variant)', cursor: idx === covers.length - 1 ? 'default' : 'pointer', opacity: idx === covers.length - 1 ? 0.4 : 1 }}><ArrowDown size={14} /></button>
                    <button onClick={() => remove(c)} title="Eliminar"
                      style={{ padding: '7px 9px', borderRadius: '9px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#EF4444', cursor: 'pointer', marginLeft: 'auto' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
