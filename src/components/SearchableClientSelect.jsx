import { useState, useRef, useMemo, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

/**
 * Selector de clienta con buscador (autocompletar).
 * Reemplaza a los <select> gigantes con 146+ alumnas.
 *
 * props:
 *  - clients: [{ id, name, email, plan?, status? }]
 *  - value:   id seleccionado ('' = ninguno)
 *  - onChange(id)
 *  - placeholder
 */
export default function SearchableClientSelect({ clients = [], value, onChange, placeholder = 'Buscar clienta por nombre o correo…' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(() => clients.find(c => c.id === value) || null, [clients, value]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const arr = s
      ? clients.filter(c => (c.name || '').toLowerCase().includes(s) || (c.email || '').toLowerCase().includes(s))
      : clients;
    return { list: arr.slice(0, 60), total: arr.length };
  }, [clients, q]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Autofocus al abrir
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  const pick = (c) => { onChange(c.id); setOpen(false); setQ(''); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setQ(''); };

  const boxStyle = {
    width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '10px',
    padding: '13px 14px', borderRadius: '14px', cursor: 'pointer',
    border: '1px solid rgba(55,61,59,0.08)', background: 'var(--surface-lowest)',
    fontFamily: 'var(--font-body)', fontSize: '0.9rem', transition: 'border 0.2s',
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {!open ? (
        // ----- Estado cerrado: muestra la selección o el placeholder -----
        <div onClick={() => setOpen(true)} style={boxStyle}>
          <Search size={18} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />
          {selected ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.email}</div>
            </div>
          ) : (
            <span style={{ flex: 1, color: 'var(--on-surface-variant)' }}>{placeholder}</span>
          )}
          {selected ? (
            <button type="button" onClick={clear} aria-label="Quitar selección"
              style={{ background: 'rgba(0,0,0,0.05)', border: 'none', width: '26px', height: '26px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <X size={15} color="var(--on-surface-variant)" />
            </button>
          ) : (
            <ChevronDown size={18} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />
          )}
        </div>
      ) : (
        // ----- Estado abierto: input de búsqueda -----
        <div style={{ ...boxStyle, cursor: 'text', border: '1px solid var(--primary)' }}>
          <Search size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter' && results.list.length === 1) pick(results.list[0]); }}
            placeholder="Escribe un nombre o correo…"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface)' }}
          />
          <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"
            style={{ background: 'rgba(0,0,0,0.05)', border: 'none', width: '26px', height: '26px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={15} color="var(--on-surface-variant)" />
          </button>
        </div>
      )}

      {/* ----- Dropdown de resultados ----- */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 60,
          background: 'var(--app-surface-solid, #fff)', borderRadius: '14px',
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))',
          boxShadow: '0 14px 36px rgba(0,0,0,0.16)', overflow: 'hidden',
          maxHeight: '300px', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        }}>
          {results.list.length === 0 ? (
            <div style={{ padding: '18px 16px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              Sin resultados para "{q.trim()}"
            </div>
          ) : (
            <>
              {results.list.map(c => {
                const isSel = c.id === value;
                return (
                  <button key={c.id} type="button" onClick={() => pick(c)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                      padding: '11px 14px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                      background: isSel ? 'rgba(255,145,77,0.10)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.05))',
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(0,0,0,0.035)'; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.email}{c.plan && c.plan !== 'Sin Plan' ? ` · ${c.plan}` : ''}
                      </div>
                    </div>
                    {isSel && <Check size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                  </button>
                );
              })}
              {results.total > results.list.length && (
                <div style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>
                  Mostrando {results.list.length} de {results.total} — escribe para acotar
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
