import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Lista de compañeras de una clase: foto + nombre de pila (privacidad).
// Usa la función segura get_class_attendees, que SOLO devuelve datos si la
// persona pertenece a esa clase (o es personal) → no expone rosters ajenos.
export default function ClassmatesList({ classId }) {
  const [list, setList] = useState(null); // null = cargando

  useEffect(() => {
    let alive = true;
    if (!classId) { setList([]); return; }
    setList(null);
    supabase.rpc('get_class_attendees', { p_class_id: classId }).then(({ data, error }) => {
      if (!alive) return;
      setList(error ? [] : (data || []));
    });
    return () => { alive = false; };
  }, [classId]);

  if (list === null) {
    return <div style={{ padding: '14px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>Cargando compañeras…</div>;
  }

  return (
    <div style={{ marginBottom: '18px', borderRadius: '16px', border: '1px solid var(--divider)', overflow: 'hidden', background: 'var(--fill-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px 8px' }}>
        <Users size={16} color="var(--primary)" />
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {list.length === 0 ? 'Quién va' : `Van contigo · ${list.length}`}
        </span>
      </div>

      {list.length === 0 ? (
        <p style={{ margin: 0, padding: '0 14px 14px', fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
          Aún nadie más. ¡Sé la primera! 💪
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '4px 14px 14px' }}>
          {list.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', width: '58px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: m.checked_in ? '2px solid #16A34A' : '2px solid var(--app-surface-solid)', boxShadow: '0 3px 8px rgba(0,0,0,0.08)' }}>
                {m.avatar_url
                  ? <img src={m.avatar_url} alt={m.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,145,77,0.14)', color: 'var(--primary)', fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>{(m.first_name || '?').charAt(0).toUpperCase()}</div>}
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--on-surface)', maxWidth: '58px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                {m.first_name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
