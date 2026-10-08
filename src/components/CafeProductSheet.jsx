import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Flame, ShoppingCart, Check } from 'lucide-react';

// Los assets locales del catálogo (PNG/WebP con fondo blanco) usan multiply para
// fundir el fondo; las fotos subidas por Admin (JPEG) van normales con sombra.
const needsMultiply = (url) => /^\/cafeteria\//.test(url || '') || /\.png(\?|$)/i.test(url || '');

// Total tipo "ticker": el número se desliza/funde al cambiar (sensación premium).
function AnimatedTotal({ value, prefix = '$' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', minWidth: '1ch', justifyContent: 'center', overflow: 'hidden' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value}
          initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{ display: 'inline-block' }}>
          {prefix}{value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// Ficha de producto estilo Uber Eats: info + personalización + cantidad + notas.
export default function CafeProductSheet({ product, groups, onClose, onAdd }) {
  // Grupos que aplican a la categoría del producto
  const applicable = useMemo(
    () => (groups || [])
      .filter(g => !g.applies_to || g.applies_to.length === 0 || g.applies_to.includes(product.category))
      .map(g => ({ ...g, options: (g.cafe_options || g.options || []).filter(o => o.available !== false).sort((a, b) => a.sort_order - b.sort_order) }))
      .filter(g => g.options.length > 0)
      .sort((a, b) => a.sort_order - b.sort_order),
    [groups, product]
  );

  // selección: { [groupId]: optionId | optionId[] }
  const [sel, setSel] = useState(() => {
    const init = {};
    applicable.forEach(g => {
      if (g.selection_type === 'single' && g.required) init[g.id] = g.options[0]?.id;
      if (g.selection_type === 'multi') init[g.id] = [];
    });
    return init;
  });
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');

  const pickSingle = (gid, oid) => setSel(s => ({ ...s, [gid]: s[gid] === oid ? undefined : oid }));
  const toggleMulti = (gid, oid) => setSel(s => {
    const arr = s[gid] || [];
    return { ...s, [gid]: arr.includes(oid) ? arr.filter(x => x !== oid) : [...arr, oid] };
  });

  const { optionIds, display, unit } = useMemo(() => {
    const ids = [];
    const disp = [];
    let extra = 0;
    applicable.forEach(g => {
      const v = sel[g.id];
      const chosen = Array.isArray(v) ? v : (v ? [v] : []);
      chosen.forEach(oid => {
        const o = g.options.find(x => x.id === oid);
        if (o) { ids.push(o.id); disp.push({ group: g.name, name: o.name, delta: o.price_delta || 0 }); extra += (o.price_delta || 0); }
      });
    });
    return { optionIds: ids, display: disp, unit: product.price + extra };
  }, [sel, applicable, product]);

  const lineTotal = unit * qty;

  const add = () => {
    onAdd({
      lineId: (crypto?.randomUUID?.() || String(Date.now() + Math.random())),
      product_id: product.id,
      name: product.name,
      image_url: product.image_url,
      qty,
      option_ids: optionIds,
      optionsDisplay: display,
      notes: notes.trim(),
      unitPrice: unit,
      lineTotal,
    });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 4000 }} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 4001, maxHeight: '90vh', background: '#FDFBF7', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -10px 40px rgba(0,0,0,0.25)' }}>
        {/* Header con imagen (flota suavemente) */}
        <div style={{ position: 'relative' }}>
          {product.image_url ? (
            <div style={{ height: '200px', background: 'radial-gradient(120% 90% at 50% 18%, #F6EDE3 0%, #FDFBF7 75%)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <motion.img src={product.image_url} alt={product.name}
                initial={{ scale: 0.82, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: [0, -8, 0] }}
                transition={{ scale: { type: 'spring', stiffness: 180, damping: 18 }, opacity: { duration: 0.4 }, y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 } }}
                style={{ maxHeight: '180px', maxWidth: '80%', objectFit: 'contain', mixBlendMode: needsMultiply(product.image_url) ? 'multiply' : 'normal', filter: needsMultiply(product.image_url) ? 'none' : 'drop-shadow(0 18px 24px rgba(80,50,30,0.22))' }} />
            </div>
          ) : <div style={{ height: '64px' }} />}
          <button onClick={onClose} aria-label="Cerrar" style={{ position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <X size={18} color="#1A1C1E" />
          </button>
        </div>

        <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '20px 22px 0', flex: 1 }}>
          <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#1A1C1E' }}>{product.name}</motion.h2>
          {product.description && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ margin: '0 0 12px', color: '#6B7280', fontSize: '0.92rem', lineHeight: 1.5 }}>{product.description}</motion.p>}
          {(product.cals || product.protein) && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              {product.cals != null && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.04)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}><Flame size={14} color="#EF4444" /> {product.cals} cals</span>}
              {product.protein != null && <span style={{ background: 'rgba(255,145,77,0.12)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#D97706' }}>{product.protein}g proteína</span>}
            </div>
          )}

          {/* Grupos de personalización (entrada escalonada) */}
          {applicable.map((g, gi) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + gi * 0.07, type: 'spring', stiffness: 120, damping: 18 }} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1A1C1E' }}>{g.name}</h3>
                {g.required && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)' }}>Requerido</span>}
                <span style={{ fontSize: '0.72rem', color: '#9CA3AF', marginLeft: 'auto' }}>{g.selection_type === 'multi' ? 'Elige las que quieras' : 'Elige 1'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {g.options.map(o => {
                  const multi = g.selection_type === 'multi';
                  const selected = multi ? (sel[g.id] || []).includes(o.id) : sel[g.id] === o.id;
                  return (
                    <motion.button key={o.id} onClick={() => multi ? toggleMulti(g.id, o.id) : pickSingle(g.id, o.id)}
                      whileTap={{ scale: 0.975 }} animate={{ borderColor: selected ? 'var(--primary)' : 'rgba(0,0,0,0.08)', backgroundColor: selected ? 'rgba(255,145,77,0.10)' : 'rgba(255,255,255,1)' }} transition={{ duration: 0.18 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', border: '1.5px solid rgba(0,0,0,0.08)', background: '#fff' }}>
                      <span style={{ position: 'relative', width: '22px', height: '22px', borderRadius: multi ? '7px' : '50%', border: `2px solid ${selected ? 'var(--primary)' : '#CBD5E1'}`, background: selected ? 'var(--primary)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .18s, background .18s' }}>
                        <AnimatePresence>
                          {selected && (
                            <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 22 }} style={{ display: 'flex' }}>
                              <Check size={13} color="#fff" strokeWidth={3.5} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '0.92rem', color: '#1A1C1E' }}>{o.name}</span>
                      {o.price_delta > 0 && (
                        <motion.span animate={{ color: selected ? 'var(--primary)' : '#6B7280', fontWeight: selected ? 800 : 700 }} style={{ fontSize: '0.85rem' }}>+${o.price_delta}</motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* Notas */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 800, color: '#1A1C1E' }}>Notas (opcional)</h3>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={200} rows={2} placeholder="Ej. sin crema, extra caliente…"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '0.92rem', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Footer: cantidad + agregar */}
        <div style={{ padding: '14px 22px', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#FDFBF7', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#fff', borderRadius: '16px', padding: '8px 12px', border: '1.5px solid rgba(0,0,0,0.08)' }}>
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => setQty(q => Math.max(1, q - 1))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}><Minus size={18} color="var(--primary)" /></motion.button>
            <span style={{ fontWeight: 800, minWidth: '18px', textAlign: 'center' }}>
              <AnimatedTotal value={qty} prefix="" />
            </span>
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => setQty(q => q + 1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}><Plus size={18} color="var(--primary)" /></motion.button>
          </div>
          <motion.button onClick={add} whileTap={{ scale: 0.97 }}
            style={{ flex: 1, padding: '15px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #FF914D, #E68245)', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 24px rgba(255,145,77,0.4)' }}>
            <ShoppingCart size={18} /> Agregar · <AnimatedTotal value={lineTotal} />
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
