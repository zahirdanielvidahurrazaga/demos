import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Check, Dumbbell, ImagePlus, Loader2, ChevronDown, Camera, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage } from '../lib/cafeImage';

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  border: '1px solid rgba(0,0,0,0.1)', background: 'white',
  fontSize: '0.9rem', boxSizing: 'border-box',
};

// Botón para subir/cambiar la foto de una disciplina (bucket "disciplines").
function PhotoButton({ imageUrl, onUploaded, size = 64, round = '14px' }) {
  const [busy, setBusy] = useState(false);
  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    const { url, error } = await uploadImage(file, { bucket: 'disciplines' });
    setBusy(false);
    if (error) {
      console.error('[disciplines] upload error:', error);
      const msg = error?.message || error?.error || (typeof error === 'string' ? error : 'Error desconocido');
      alert('No se pudo subir la imagen.\n\nMotivo: ' + msg);
      return;
    }
    onUploaded(url);
  };
  return (
    <label style={{ position: 'relative', width: size, height: size, borderRadius: round, flexShrink: 0, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: imageUrl ? '#F0E6DC' : 'rgba(255,145,77,0.1)', border: imageUrl ? '1px solid rgba(0,0,0,0.08)' : '1.5px dashed rgba(255,145,77,0.5)' }}>
      {imageUrl
        ? <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <ImagePlus size={22} color="var(--primary)" />}
      <input type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
      {imageUrl && !busy && (
        <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', padding: '2px 0' }}><Camera size={13} color="#fff" /></span>
      )}
      {busy && (
        <span style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={20} color="var(--primary)" /></motion.span>
        </span>
      )}
    </label>
  );
}

// Tarjeta de disciplina: foto + nombre + frase corta inline; expander con la
// descripción larga. Toggle "Mostrar en web" = featured.
function DisciplineCard({ d, onPatch, onToggleFeatured, onDelete }) {
  const [draft, setDraft] = useState({ name: d.name, short_desc: d.short_desc || '' });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft({ name: d.name, short_desc: d.short_desc || '' }); }, [d.name, d.short_desc]);

  const dirty = draft.name !== d.name || draft.short_desc !== (d.short_desc || '');
  const save = async () => {
    if (!draft.name.trim()) { alert('El nombre es obligatorio.'); return; }
    setSaving(true);
    await onPatch(d.id, { name: draft.name.trim(), short_desc: draft.short_desc.trim() || null });
    setSaving(false);
  };

  return (
    <div className="ios-glass-card" style={{ padding: '12px', background: 'white', opacity: d.featured ? 1 : 0.72 }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <PhotoButton imageUrl={d.image_url} onUploaded={(url) => onPatch(d.id, { image_url: url })} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Nombre de la clase" style={{ ...inputStyle, fontWeight: 700 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input value={draft.short_desc} onChange={e => setDraft({ ...draft, short_desc: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') save(); }} placeholder="Frase corta (para tarjetas)" style={{ ...inputStyle, flex: 1 }} />
            <AnimatePresence>
              {dirty && (
                <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={save} disabled={saving}
                  style={{ background: '#22C55E', color: 'white', border: 'none', padding: '9px 12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Check size={15} /> {saving ? '...' : 'Guardar'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
        <button onClick={() => onToggleFeatured(d)} style={{ background: d.featured ? 'rgba(255,145,77,0.14)' : 'rgba(0,0,0,0.06)', color: d.featured ? 'var(--primary)' : 'var(--on-surface-variant)', border: 'none', padding: '8px 12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Globe size={14} /> {d.featured ? 'En la web' : 'Oculta en web'}
        </button>
        <button onClick={() => setOpen(o => !o)} style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--on-surface-variant)', border: 'none', padding: '8px 12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
          Descripción <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: 'flex' }}><ChevronDown size={15} /></motion.span>
        </button>
        <button onClick={() => onDelete(d)} aria-label="Eliminar" style={{ marginLeft: 'auto', background: 'rgba(186,26,26,0.1)', color: '#ba1a1a', border: 'none', padding: '9px', borderRadius: '10px', cursor: 'pointer', display: 'flex' }}>
          <Trash2 size={16} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingTop: '12px', marginTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <textarea defaultValue={d.description || ''} placeholder="Descripción completa de la clase" rows={4} onBlur={e => { const v = e.target.value.trim() || null; if (v !== (d.description || null)) onPatch(d.id, { description: v }); }} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminDisciplinas() {
  const { disciplines, addDiscipline, updateDiscipline, deleteDiscipline } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [nd, setNd] = useState({ name: '', short_desc: '', description: '', image_url: '', featured: false });

  const patchRow = (id, patch) => updateDiscipline(id, patch);
  const toggleFeatured = (d) => updateDiscipline(d.id, { featured: !d.featured });
  const removeDiscipline = (d) => { if (confirm(`¿Eliminar la clase "${d.name}" del catálogo?`)) deleteDiscipline(d.id); };

  const handleAdd = async () => {
    if (!nd.name.trim()) { alert('Escribe el nombre de la clase.'); return; }
    const payload = {
      name: nd.name.trim(),
      short_desc: nd.short_desc.trim() || null,
      description: nd.description.trim() || null,
      image_url: nd.image_url || null,
      featured: nd.featured,
      sort_order: (disciplines || []).length + 1,
    };
    const { success } = await addDiscipline(payload);
    if (success) { setNd({ name: '', short_desc: '', description: '', image_url: '', featured: false }); setShowAdd(false); }
  };

  const featuredCount = (disciplines || []).filter(d => d.featured).length;

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', margin: '0 8px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Dumbbell size={20} color="var(--primary)" /> Clases
        </h2>
        <button onClick={() => setShowAdd(s => !s)} style={{ marginLeft: 'auto', background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <Plus size={16} /> Nueva clase
        </button>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 16px' }}>
        Catálogo de clases del estudio. Marca <b>“En la web”</b> para que aparezcan en la sección de disciplinas del sitio ({featuredCount} {featuredCount === 1 ? 'visible' : 'visibles'}).
      </p>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '20px' }}>
            <div className="ios-glass-card" style={{ padding: '16px', background: 'white' }}>
              <div style={{ display: 'flex', gap: '14px', marginBottom: '12px' }}>
                <PhotoButton imageUrl={nd.image_url} onUploaded={(url) => setNd({ ...nd, image_url: url })} size={72} round="16px" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input placeholder="Nombre (ej. Pilates Power)" value={nd.name} onChange={e => setNd({ ...nd, name: e.target.value })} style={inputStyle} />
                  <input placeholder="Frase corta para tarjetas" value={nd.short_desc} onChange={e => setNd({ ...nd, short_desc: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <textarea placeholder="Descripción completa (opcional)" value={nd.description} onChange={e => setNd({ ...nd, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', marginBottom: '12px' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'var(--on-surface)' }}>
                <input type="checkbox" checked={nd.featured} onChange={e => setNd({ ...nd, featured: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                Mostrar en el sitio web
              </label>
              <button onClick={handleAdd} style={{ width: '100%', padding: '11px', borderRadius: '10px', background: 'var(--primary)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Agregar clase</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(disciplines || []).map(d => (
          <DisciplineCard key={d.id} d={d} onPatch={patchRow} onToggleFeatured={toggleFeatured} onDelete={removeDiscipline} />
        ))}
        {(disciplines || []).length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>
            Aún no hay clases. Corre el script <code>supabase/disciplines_setup.sql</code> para precargarlas, o agrega una con “Nueva clase”.
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminDisciplinas;
