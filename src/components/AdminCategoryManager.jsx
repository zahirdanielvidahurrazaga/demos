import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { PASTEL_PALETTE, categoryLabel } from '../lib/categories';

// Sheet para gestionar categorías: renombrar, recolorear (actualiza todas sus clases), agregar y borrar.
export default function AdminCategoryManager({ open, onClose, categories, onAdd, onUpdate, onDelete, showToast }) {
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState(PASTEL_PALETTE[0]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const startEdit = (c) => { setAdding(false); setEditingId(c.id); setDraftName(c.name); setDraftColor(c.color); };
  const startAdd = () => { setEditingId(null); setAdding(true); setDraftName(''); setDraftColor(PASTEL_PALETTE[0]); };
  const reset = () => { setEditingId(null); setAdding(false); setDraftName(''); };

  const save = async () => {
    if (!draftName.trim()) return showToast?.('Escribe un nombre', 'error');
    setBusy(true);
    if (adding) {
      const r = await onAdd(draftName, draftColor);
      if (!r?.success) showToast?.('Error: ' + (r?.error?.message || 'no se pudo'), 'error'); else showToast?.('Categoría agregada');
    } else {
      const cat = categories.find(c => c.id === editingId);
      const r = await onUpdate(editingId, { name: draftName, color: draftColor, oldName: cat?.name });
      if (!r?.success) showToast?.('Error: ' + (r?.error?.message || 'no se pudo'), 'error'); else showToast?.('Categoría actualizada en todas sus clases');
    }
    setBusy(false);
    reset();
  };

  const remove = async (c) => {
    if (!window.confirm(`¿Eliminar la categoría "${categoryLabel(c.name)}"? Las clases que ya la usan conservan su color.`)) return;
    const r = await onDelete(c.id);
    if (!r?.success) showToast?.('Error al eliminar', 'error'); else showToast?.('Categoría eliminada');
  };

  const Palette = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
      {PASTEL_PALETTE.map(col => (
        <button key={col} type="button" onClick={() => setDraftColor(col)}
          style={{ width: '38px', height: '38px', borderRadius: '11px', background: col, cursor: 'pointer',
            border: draftColor === col ? '3px solid var(--primary)' : '1px solid rgba(0,0,0,0.1)',
            boxShadow: draftColor === col ? '0 4px 12px rgba(255,145,77,0.3)' : 'none' }} />
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 6000 }} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 6001, maxHeight: '90vh', background: 'var(--app-surface-solid, #fff)', borderTopLeftRadius: 28, borderTopRightRadius: 28, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}>Categorías</span>
              <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 14px' }}>
                Renombrar o cambiar el color actualiza <b>todas</b> las clases de esa categoría (cliente, coach e historias).
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categories.map(c => (
                  <div key={c.id} style={{ background: 'var(--surface-low, #f7f7f8)', borderRadius: '16px', border: '1px solid var(--border-subtle, rgba(0,0,0,0.05))', overflow: 'hidden' }}>
                    {editingId === c.id ? (
                      <div style={{ padding: '14px' }}>
                        <input autoFocus value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Nombre"
                          style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-body)' }} />
                        <Palette />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button onClick={save} disabled={busy} style={{ flex: 1, padding: '11px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Check size={16} /> Guardar</button>
                          <button onClick={reset} style={{ padding: '11px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'var(--on-surface)', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                        <span style={{ width: '28px', height: '28px', borderRadius: '9px', background: c.color, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontWeight: 700, fontSize: '0.92rem', color: 'var(--on-surface)' }}>{categoryLabel(c.name)}</span>
                        <button onClick={() => startEdit(c)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '10px', padding: '8px 12px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--on-surface)' }}>Editar</button>
                        <button onClick={() => remove(c)} style={{ background: '#FF4D4D12', border: 'none', borderRadius: '10px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FF4D4D' }}><Trash2 size={15} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Agregar nueva */}
              {adding ? (
                <div style={{ marginTop: '12px', background: 'var(--surface-low, #f7f7f8)', borderRadius: '16px', border: '1px solid var(--border-subtle, rgba(0,0,0,0.05))', padding: '14px' }}>
                  <input autoFocus value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Nombre de la categoría (ej. Cardio)"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-body)' }} />
                  <Palette />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={save} disabled={busy} style={{ flex: 1, padding: '11px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Agregar</button>
                    <button onClick={reset} style={{ padding: '11px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'var(--on-surface)', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={startAdd} style={{ marginTop: '14px', width: '100%', padding: '14px', borderRadius: '14px', border: '2px dashed rgba(255,145,77,0.4)', background: 'rgba(255,145,77,0.06)', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Plus size={18} /> Nueva categoría
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
