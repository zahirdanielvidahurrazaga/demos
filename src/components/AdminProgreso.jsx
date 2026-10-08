import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Camera, Upload, X, Trash2, ChevronLeft, ImageIcon, CalendarClock, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { compressCafeImage } from '../lib/cafeImage';

// ============================================================================
// ADMIN → PROGRESO: ver y subir las fotos de progreso de las clientas.
// Pedido de las dueñas (2026-08-01). La lectura ya estaba permitida por RLS
// (`pp_staff_read` / `pp_st_staff`); la escritura se abrió solo a ADMIN en
// `supabase/sql/progress_photos_admin_upload.sql`.
//
// El bucket `progress-photos` es PRIVADO: nada se ve sin URL firmada, que aquí
// se pide bajo demanda y dura 1 h.
// ============================================================================

// Mismos 3 ángulos y columnas que la vista de la clienta (ProgressPhotos.jsx).
const ANGLES = [
  { key: 'front', col: 'front_path', label: 'Frente' },
  { key: 'left', col: 'side_path', label: 'Perfil' },
  { key: 'back', col: 'back_path', label: 'Espaldas' },
];

const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

export default function AdminProgreso() {
  const [clients, setClients] = useState([]);
  const [counts, setCounts] = useState({});      // user_id -> nº de sesiones
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null); // clienta abierta
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Clientas + cuántas sesiones tiene cada una, para ordenar por actividad.
      const [{ data: users }, { data: photos }] = await Promise.all([
        supabase.from('users')
          .select('id, full_name, email, avatar_url, membership_status')
          .eq('role', 'CLIENT')
          .order('full_name', { ascending: true }),
        supabase.from('progress_photos').select('user_id'),
      ]);
      const c = {};
      (photos || []).forEach(p => { c[p.user_id] = (c[p.user_id] || 0) + 1; });
      setCounts(c);
      setClients(users || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? clients.filter(u => (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
      : clients;
    // Primero las que ya tienen fotos: es lo que la dueña viene a revisar.
    return [...list].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
  }, [clients, query, counts]);

  const conFotos = useMemo(() => Object.keys(counts).length, [counts]);

  if (selected) {
    return <ClientePhotos
      client={selected}
      onBack={() => setSelected(null)}
      onCountChange={(id, n) => setCounts(c => ({ ...c, [id]: n }))}
    />;
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--on-surface)', margin: '0 0 6px' }}>Fotos de progreso</h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', margin: 0 }}>
          {conFotos === 0
            ? 'Todavía ninguna clienta ha registrado fotos.'
            : `${conFotos} clienta${conFotos === 1 ? '' : 's'} con fotos registradas.`} Puedes tomárselas tú desde aquí.
        </p>
      </div>

      {/* Aviso de privacidad: son fotos corporales en un bucket privado. */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 14px', borderRadius: '12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', marginBottom: '18px' }}>
        <Info size={16} style={{ color: '#2563EB', flexShrink: 0, marginTop: '2px' }} />
        <span style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', lineHeight: 1.45 }}>
          Estas fotos son privadas de cada socia y se guardan cifradas. Avísale antes de tomárselas y sube solo las que ella autorice.
        </span>
      </div>

      <div style={{ position: 'relative', marginBottom: '18px' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar clienta por nombre o correo…"
          style={{ width: '100%', padding: '13px 14px 13px 42px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--surface-lowest)', color: 'var(--on-surface)', fontSize: '0.95rem', outline: 'none' }}
        />
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>Cargando…</div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {filtered.map(u => (
            <motion.div key={u.id} whileTap={{ scale: 0.995 }} onClick={() => setSelected(u)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-lowest)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontWeight: 800, color: 'var(--on-surface-variant)' }}>{(u.full_name || u.email || '?')[0].toUpperCase()}</span>}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.full_name || '(sin nombre)'}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
              </div>
              {counts[u.id] ? (
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '5px 10px', borderRadius: '20px', background: 'rgba(255,145,77,0.12)', color: '#FF914D', flexShrink: 0 }}>
                  {counts[u.id]} sesi{counts[u.id] === 1 ? 'ón' : 'ones'}
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--on-surface-variant)', flexShrink: 0 }}>sin fotos</span>
              )}
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>Ninguna clienta coincide con “{query}”.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────── Detalle de una clienta ─────────────────────
function ClientePhotos({ client, onBack, onCountChange }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploader, setUploader] = useState(false);
  const [zoom, setZoom] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('progress_photos')
      .select('*').eq('user_id', client.id).order('taken_at', { ascending: false });

    const sign = async (p) => p ? (await supabase.storage.from('progress-photos').createSignedUrl(p, 3600)).data?.signedUrl : null;
    const withUrls = await Promise.all((data || []).map(async (s) => {
      const [front, left, back] = await Promise.all([sign(s.front_path), sign(s.side_path), sign(s.back_path)]);
      return { ...s, urls: { front, left, back } };
    }));
    setSessions(withUrls);
    onCountChange?.(client.id, withUrls.length);
    setLoading(false);
  };
  useEffect(() => { load(); }, [client.id]);

  const deleteSession = async (s) => {
    if (!confirm(`¿Borrar la sesión del ${fmtDate(s.taken_at)} de ${client.full_name}?\n\nSe eliminan las fotos para siempre.`)) return;
    const paths = [s.front_path, s.side_path, s.back_path].filter(Boolean);
    if (paths.length) await supabase.storage.from('progress-photos').remove(paths);
    await supabase.from('progress_photos').delete().eq('id', s.id);
    load();
  };

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', padding: '4px 0', marginBottom: '14px' }}>
        <ChevronLeft size={18} /> Todas las clientas
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {client.avatar_url
            ? <img src={client.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--on-surface-variant)' }}>{(client.full_name || '?')[0].toUpperCase()}</span>}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--on-surface)' }}>{client.full_name || '(sin nombre)'}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>{sessions.length} sesión{sessions.length === 1 ? '' : 'es'} registrada{sessions.length === 1 ? '' : 's'}</div>
        </div>
        <button onClick={() => setUploader(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '12px', border: 'none', background: '#FF914D', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 6px 18px rgba(255,145,77,0.25)' }}>
          <Camera size={17} /> Nueva sesión
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>Cargando fotos…</div>
      ) : sessions.length === 0 ? (
        <div style={{ padding: '50px 20px', textAlign: 'center', borderRadius: '16px', border: '1px dashed var(--border-subtle)', color: 'var(--on-surface-variant)' }}>
          <ImageIcon size={30} style={{ opacity: 0.4, marginBottom: '10px' }} />
          <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--on-surface)' }}>Sin fotos todavía</div>
          <div style={{ fontSize: '0.86rem' }}>Toca “Nueva sesión” para tomarle sus primeras fotos.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '18px' }}>
          {sessions.map(s => (
            <div key={s.id} style={{ borderRadius: '16px', border: '1px solid var(--border-subtle)', background: 'var(--surface-lowest)', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                  <CalendarClock size={15} style={{ color: 'var(--on-surface-variant)' }} /> {fmtDate(s.taken_at)}
                </div>
                <button onClick={() => deleteSession(s)} title="Borrar sesión"
                  style={{ width: '32px', height: '32px', borderRadius: '9px', border: 'none', background: 'rgba(239,68,68,0.08)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Trash2 size={15} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {ANGLES.map(a => (
                  <div key={a.key}>
                    <div onClick={() => s.urls[a.key] && setZoom({ url: s.urls[a.key], label: a.label, date: s.taken_at })}
                      style={{ aspectRatio: '2 / 3', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: s.urls[a.key] ? 'zoom-in' : 'default' }}>
                      {s.urls[a.key]
                        ? <img src={s.urls[a.key]} alt={a.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>—</span>}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginTop: '5px' }}>{a.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {uploader && <Uploader client={client} onClose={() => setUploader(false)} onDone={() => { setUploader(false); load(); }} />}
      </AnimatePresence>

      <AnimatePresence>
        {zoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', cursor: 'zoom-out' }}>
            <img src={zoom.url} alt="" style={{ maxWidth: '100%', maxHeight: '82vh', objectFit: 'contain', borderRadius: '12px' }} />
            <div style={{ color: '#fff', fontWeight: 700, marginTop: '14px' }}>{zoom.label} · {fmtDate(zoom.date)}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────── Subir una sesión nueva ─────────────────────
function Uploader({ client, onClose, onDone }) {
  const [shots, setShots] = useState({});       // key -> { blob, url }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef({});

  const pick = (key) => (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setShots(s => ({ ...s, [key]: { blob: f, url: URL.createObjectURL(f) } }));
    e.target.value = '';   // permite volver a elegir el mismo archivo
  };

  const total = Object.keys(shots).length;

  const save = async () => {
    if (total === 0) return;
    setBusy(true); setError('');
    try {
      const ts = Date.now();
      const row = { user_id: client.id, taken_at: new Date().toISOString() };
      for (const a of ANGLES) {
        if (!shots[a.key]) continue;
        const blob = await compressCafeImage(shots[a.key].blob, 1280, 0.82);
        const path = `${client.id}/${ts}/${a.key}.jpg`;
        const { error: upErr } = await supabase.storage.from('progress-photos')
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (upErr) throw upErr;
        row[a.col] = path;
      }
      const { error: insErr } = await supabase.from('progress_photos').insert(row);
      if (insErr) throw insErr;
      onDone();
    } catch (e) {
      setError(e.message || 'No se pudo guardar la sesión.');
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: '22px', padding: '24px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--on-surface)', margin: 0 }}>Nueva sesión</h3>
          <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'var(--surface-container)', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={17} /></button>
        </div>
        <p style={{ fontSize: '0.86rem', color: 'var(--on-surface-variant)', margin: '0 0 18px' }}>
          Para <strong style={{ color: 'var(--on-surface)' }}>{client.full_name}</strong>. Puedes subir los tres ángulos o solo los que tengas.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {ANGLES.map(a => (
            <div key={a.key}>
              <input ref={el => inputs.current[a.key] = el} type="file" accept="image/*" capture="environment" onChange={pick(a.key)} style={{ display: 'none' }} />
              <div onClick={() => inputs.current[a.key]?.click()}
                style={{ aspectRatio: '2 / 3', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface-container)', border: shots[a.key] ? '2px solid #FF914D' : '1px dashed var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '6px' }}>
                {shots[a.key]
                  ? <img src={shots[a.key].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <><Upload size={18} style={{ color: 'var(--on-surface-variant)' }} /><span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>Subir</span></>}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginTop: '5px' }}>{a.label}</div>
            </div>
          ))}
        </div>

        {error && <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.82rem', marginBottom: '14px' }}>{error}</div>}

        <button onClick={save} disabled={busy || total === 0}
          style={{ width: '100%', padding: '15px', borderRadius: '13px', border: 'none', background: total === 0 ? 'var(--surface-container)' : '#FF914D', color: total === 0 ? 'var(--on-surface-variant)' : '#fff', fontWeight: 800, fontSize: '1rem', cursor: total === 0 || busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Guardando…' : total === 0 ? 'Elige al menos una foto' : `Guardar ${total} foto${total === 1 ? '' : 's'}`}
        </button>
      </motion.div>
    </motion.div>
  );
}
