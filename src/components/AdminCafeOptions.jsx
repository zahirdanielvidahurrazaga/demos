import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Check, Sliders } from 'lucide-react';
import { supabase } from '../lib/supabase';

const inputStyle = { padding: '9px 11px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', background: 'white', fontSize: '0.9rem', boxSizing: 'border-box' };
const CATS = [['coffee', 'Cafés'], ['smoothie', 'Smoothies'], ['temporada', 'Temporada']];

// Gestión de la PERSONALIZACIÓN de la cafetería (grupos + opciones con precio extra).
export default function AdminCafeOptions() {
  const [groups, setGroups] = useState([]);
  const [drafts, setDrafts] = useState({});       // optionId -> {name, price}
  const [newOpt, setNewOpt] = useState({});       // groupId -> {name, price}
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', selection_type: 'single' });

  const load = async () => {
    const { data } = await supabase.from('cafe_option_groups').select('*, cafe_options(*)').order('sort_order');
    const g = (data || []).map(x => ({ ...x, cafe_options: (x.cafe_options || []).sort((a, b) => a.sort_order - b.sort_order) }));
    setGroups(g);
    const d = {};
    g.forEach(gr => gr.cafe_options.forEach(o => { d[o.id] = { name: o.name, price: String(o.price_delta) }; }));
    setDrafts(d);
  };
  useEffect(() => { load(); }, []);

  const saveOption = async (o) => {
    const d = drafts[o.id]; if (!d) return;
    const price = parseInt(d.price, 10) || 0;
    await supabase.from('cafe_options').update({ name: d.name.trim(), price_delta: price }).eq('id', o.id);
    load();
  };
  const toggleOption = async (o) => { await supabase.from('cafe_options').update({ available: !o.available }).eq('id', o.id); load(); };
  const deleteOption = async (o) => { if (confirm(`¿Eliminar "${o.name}"?`)) { await supabase.from('cafe_options').delete().eq('id', o.id); load(); } };

  const addOption = async (group) => {
    const n = newOpt[group.id];
    if (!n?.name?.trim()) return;
    await supabase.from('cafe_options').insert({ group_id: group.id, name: n.name.trim(), price_delta: parseInt(n.price, 10) || 0, sort_order: (group.cafe_options?.length || 0) + 1 });
    setNewOpt({ ...newOpt, [group.id]: { name: '', price: '' } });
    load();
  };

  const toggleCat = async (group, cat) => {
    const cur = group.applies_to || [];
    const next = cur.includes(cat) ? cur.filter(c => c !== cat) : [...cur, cat];
    await supabase.from('cafe_option_groups').update({ applies_to: next }).eq('id', group.id);
    load();
  };
  const deleteGroup = async (group) => { if (confirm(`¿Eliminar el grupo "${group.name}" y sus opciones?`)) { await supabase.from('cafe_option_groups').delete().eq('id', group.id); load(); } };

  const addGroup = async () => {
    if (!newGroup.name.trim()) return;
    await supabase.from('cafe_option_groups').insert({ name: newGroup.name.trim(), selection_type: newGroup.selection_type, applies_to: ['coffee', 'smoothie', 'temporada'], sort_order: groups.length + 1 });
    setNewGroup({ name: '', selection_type: 'single' });
    setShowNewGroup(false);
    load();
  };

  return (
    <section style={{ marginTop: '36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={20} color="var(--primary)" /> Personalización
        </h2>
        <button onClick={() => setShowNewGroup(s => !s)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
          <Plus size={16} /> Grupo
        </button>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', margin: '0 0 16px' }}>Leches, endulzantes, extras… El precio se suma al producto (0 = gratis).</p>

      {showNewGroup && (
        <div className="ios-glass-card" style={{ padding: '15px', marginBottom: '18px', background: 'white', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input placeholder="Nombre del grupo (ej. Tipo de leche)" value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} style={{ ...inputStyle, flex: '1 1 200px' }} />
          <select value={newGroup.selection_type} onChange={e => setNewGroup({ ...newGroup, selection_type: e.target.value })} style={{ ...inputStyle, WebkitAppearance: 'none' }}>
            <option value="single">Elegir 1</option>
            <option value="multi">Varias</option>
          </select>
          <button onClick={addGroup} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '9px 16px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Crear</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {groups.map(group => (
          <div key={group.id} className="ios-glass-card" style={{ padding: '16px', background: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '1.02rem', color: 'var(--on-surface)' }}>{group.name}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(255,145,77,0.12)', padding: '3px 9px', borderRadius: '8px' }}>{group.selection_type === 'multi' ? 'Varias' : 'Elegir 1'}</span>
              <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
                {CATS.map(([c, lbl]) => {
                  const on = (group.applies_to || []).includes(c);
                  return <button key={c} onClick={() => toggleCat(group, c)} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 9px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: on ? 'rgba(34,197,94,0.14)' : 'rgba(0,0,0,0.05)', color: on ? '#16A34A' : 'var(--on-surface-variant)' }}>{lbl}</button>;
                })}
                <button onClick={() => deleteGroup(group)} aria-label="Eliminar grupo" style={{ background: 'rgba(186,26,26,0.1)', color: '#ba1a1a', border: 'none', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {group.cafe_options.map(o => {
                const d = drafts[o.id] || { name: o.name, price: String(o.price_delta) };
                const dirty = d.name !== o.name || String(d.price) !== String(o.price_delta);
                return (
                  <div key={o.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', opacity: o.available ? 1 : 0.5 }}>
                    <input value={d.name} onChange={e => setDrafts({ ...drafts, [o.id]: { ...d, name: e.target.value } })} style={{ ...inputStyle, flex: '1 1 120px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ color: 'var(--on-surface-variant)', fontWeight: 700 }}>+$</span>
                      <input type="number" value={d.price} onChange={e => setDrafts({ ...drafts, [o.id]: { ...d, price: e.target.value } })} onKeyDown={e => { if (e.key === 'Enter') saveOption(o); }} style={{ ...inputStyle, width: '70px' }} />
                    </div>
                    {dirty && <button onClick={() => saveOption(o)} style={{ background: '#22C55E', color: 'white', border: 'none', padding: '8px 10px', borderRadius: '9px', fontWeight: 700, cursor: 'pointer', display: 'flex', gap: '4px' }}><Check size={14} /></button>}
                    <button onClick={() => toggleOption(o)} style={{ background: o.available ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.06)', color: o.available ? '#16A34A' : 'var(--on-surface-variant)', border: 'none', padding: '8px 10px', borderRadius: '9px', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}>{o.available ? 'Visible' : 'Oculto'}</button>
                    <button onClick={() => deleteOption(o)} aria-label="Eliminar" style={{ background: 'rgba(186,26,26,0.1)', color: '#ba1a1a', border: 'none', padding: '8px', borderRadius: '9px', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>

            {/* Agregar opción */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <input placeholder="Nueva opción" value={newOpt[group.id]?.name || ''} onChange={e => setNewOpt({ ...newOpt, [group.id]: { ...newOpt[group.id], name: e.target.value } })} style={{ ...inputStyle, flex: '1 1 120px' }} />
              <input type="number" placeholder="+$" value={newOpt[group.id]?.price || ''} onChange={e => setNewOpt({ ...newOpt, [group.id]: { ...newOpt[group.id], price: e.target.value } })} style={{ ...inputStyle, width: '70px' }} />
              <button onClick={() => addOption(group)} style={{ background: 'rgba(255,145,77,0.14)', color: 'var(--primary)', border: 'none', padding: '9px 12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><Plus size={15} /> Agregar</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
