import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, CalendarPlus, LayoutTemplate } from 'lucide-react';
import { todayLocalStr } from '../lib/dates';

const todayStr = () => todayLocalStr();

// Captura las clases de la semana que contiene refDate como items reutilizables (por día de la semana)
function buildWeekItems(classes, refDate) {
  const ref = new Date(refDate + 'T12:00:00');
  const offset = ref.getDay() === 0 ? 6 : ref.getDay() - 1;
  const monday = new Date(ref); monday.setDate(ref.getDate() - offset);
  const items = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const jsDow = d.getDay();
    (classes || []).filter(c => c.date === dateStr || (c.date == null && c.day === jsDow)).forEach(c => {
      items.push({ day: jsDow, time: c.time, title: c.title, instructor: c.instructor, coach_id: c.coach_id, category: c.category, category_color: c.category_color, level: c.level, spots: c.spots });
    });
  }
  return items;
}

export default function AdminWeekTemplates({ open, onClose, templates, classes, refDate, onSave, onDelete, onApply, showToast }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [start, setStart] = useState(todayStr());
  const [end, setEnd] = useState(todayStr());

  const weekItems = buildWeekItems(classes, refDate || todayStr());

  const save = async () => {
    if (!name.trim()) return showToast?.('Ponle un nombre a la plantilla', 'error');
    if (weekItems.length === 0) return showToast?.('Esta semana no tiene clases para guardar', 'error');
    setBusy(true);
    const r = await onSave(name, weekItems);
    setBusy(false);
    if (!r?.success) showToast?.('Error: ' + (r?.error?.message || 'no se pudo'), 'error');
    else { showToast?.(`Plantilla guardada (${weekItems.length} clases)`); setName(''); }
  };

  const apply = async (tpl) => {
    if (new Date(start) > new Date(end)) return showToast?.('El rango de fechas es inválido', 'error');
    setBusy(true);
    const r = await onApply(tpl.items, start, end);
    setBusy(false);
    if (!r?.success) showToast?.('Error: ' + (r?.error?.message || 'no se pudo'), 'error');
    else { showToast?.('¡Plantilla aplicada!'); setApplyingId(null); onClose(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 6000 }} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 6001, maxHeight: '90vh', background: 'var(--app-surface-solid, #fff)', borderTopLeftRadius: 28, borderTopRightRadius: 28, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}>Plantillas de semana</span>
              <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
              {/* Guardar semana actual */}
              <div style={{ background: 'var(--surface-low, #f7f7f8)', borderRadius: '18px', border: '1px solid var(--border-subtle, rgba(0,0,0,0.05))', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--on-surface)', marginBottom: '4px', fontFamily: 'var(--font-display)' }}>Guardar la semana actual</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginBottom: '12px' }}>
                  Captura {weekItems.length} clase{weekItems.length === 1 ? '' : 's'} de esta semana como plantilla reutilizable.
                </div>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre (ej. Semana base)"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-body)', marginBottom: '10px' }} />
                <button onClick={save} disabled={busy} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Save size={17} /> Guardar plantilla
                </button>
              </div>

              {/* Lista de plantillas */}
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Mis plantillas</div>
              {(!templates || templates.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--on-surface-variant)', fontSize: '0.88rem', fontStyle: 'italic' }}>
                  <LayoutTemplate size={28} style={{ opacity: 0.4, marginBottom: '8px' }} /><br />Aún no tienes plantillas guardadas.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {templates.map(tpl => (
                    <div key={tpl.id} style={{ background: 'var(--surface-low, #f7f7f8)', borderRadius: '16px', border: '1px solid var(--border-subtle, rgba(0,0,0,0.05))', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--on-surface)' }}>{tpl.name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}>{(tpl.items || []).length} clases</div>
                        </div>
                        <button onClick={() => setApplyingId(applyingId === tpl.id ? null : tpl.id)} style={{ background: 'rgba(255,145,77,0.12)', border: 'none', borderRadius: '10px', padding: '9px 14px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '5px' }}><CalendarPlus size={15} /> Aplicar</button>
                        <button onClick={async () => { if (window.confirm(`¿Eliminar la plantilla "${tpl.name}"?`)) { const r = await onDelete(tpl.id); if (r?.success) showToast?.('Plantilla eliminada'); } }} style={{ background: '#FF4D4D12', border: 'none', borderRadius: '10px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FF4D4D' }}><Trash2 size={15} /></button>
                      </div>
                      {applyingId === tpl.id && (
                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.05))' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', margin: '12px 0 8px' }}>Crea las clases de esta plantilla en el rango:</div>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: '0.7rem', color: '#666' }}>Desde</span>
                              <input type="date" value={start} onChange={e => setStart(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '11px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: '0.7rem', color: '#666' }}>Hasta</span>
                              <input type="date" value={end} onChange={e => setEnd(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '11px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }} />
                            </div>
                          </div>
                          <button onClick={() => apply(tpl)} disabled={busy} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                            {busy ? 'Aplicando…' : 'Crear clases en el rango'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
