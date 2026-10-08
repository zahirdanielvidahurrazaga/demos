import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil, Sparkles, ImagePlus, Loader2, Camera, X, Save, MapPin, CalendarDays, Ticket, Bell, Users, ChevronDown, Tag, CheckCircle2, AlertTriangle, Send, QrCode, ScanLine, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cafeImage';
import AdminEventoBoletos from './AdminEventoBoletos';
import { ESTUDIO } from '../config/estudio';

const PRIMARY = '#FF914D';
const INK = '#1A1C1E';
const input = { width: '100%', padding: '11px 13px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'white', fontSize: '0.92rem', boxSizing: 'border-box', fontFamily: 'inherit' };
// ISO <-> input datetime-local (hora local)
const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

function PhotoButton({ url, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    setBusy(true);
    const { url: u, error } = await uploadImage(f, { bucket: 'cafe-products', folder: 'eventos' });
    setBusy(false);
    if (error) { alert('No se pudo subir la imagen.'); return; }
    onUploaded(u);
  };
  return (
    <label style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '16px', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: url ? '#F0E6DC' : 'rgba(255,145,77,0.1)', border: url ? '1px solid rgba(0,0,0,0.08)' : '1.5px dashed rgba(255,145,77,0.5)' }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: PRIMARY, fontWeight: 700, fontSize: '0.85rem' }}><ImagePlus size={26} /> Imagen del evento</span>}
      <input type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
      {url && !busy && <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', padding: '4px 0' }}><Camera size={14} color="#fff" /></span>}
      {busy && <span style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={24} color={PRIMARY} /></motion.span></span>}
    </label>
  );
}

export default function AdminEventos() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState({});
  const [regView, setRegView] = useState({}); // eventId -> array de inscritas (o undefined)

  // ── Check-in del evento (lector QR, igual que el mostrador de clases) ──────
  const [ci, setCi] = useState(null); // { ev, list, feedback }
  const [ciScan, setCiScan] = useState('');
  const ciInputRef = useRef(null);

  const [ciBuscar, setCiBuscar] = useState('');
  const [boletosEv, setBoletosEv] = useState(null); // evento abierto en el panel de control

  // Nombre a mostrar: socia con cuenta o invitado sin cuenta.
  const nombreDe = (r) => r.guest_name || r.users?.full_name || r.users?.email || 'Invitada';

  const openCheckin = async (ev) => {
    setCi({ ev, list: null, feedback: null });
    setCiBuscar('');
    const { data } = await supabase.from('event_registrations')
      .select('id, user_id, guest_name, ticket_code, invited_by, checked_in, checked_in_at, users!event_registrations_user_id_fkey(full_name, email, avatar_url)')
      .eq('event_id', ev.id).order('created_at', { ascending: true });
    setCi(c => c && c.ev.id === ev.id ? { ...c, list: data || [] } : c);
  };
  useEffect(() => { if (ci && ci.list) setTimeout(() => ciInputRef.current?.focus(), 50); }, [ci?.ev?.id, ci?.list]);

  // Marca asistencia por FILA (sirve igual para socias e invitados).
  const markAttendance = async (regId) => {
    if (!ci) return;
    const reg = (ci.list || []).find(r => r.id === regId);
    if (!reg) { setCi(c => ({ ...c, feedback: { type: 'err', msg: 'No está inscrita en este evento' } })); return; }
    const name = nombreDe(reg);
    if (reg.checked_in) { setCi(c => ({ ...c, feedback: { type: 'dup', name, msg: 'Ya tenía asistencia registrada' } })); return; }
    const { error } = await supabase.from('event_registrations')
      .update({ checked_in: true, checked_in_at: new Date().toISOString() })
      .eq('id', regId);
    if (error) { setCi(c => ({ ...c, feedback: { type: 'err', msg: 'No se pudo registrar' } })); return; }
    setCi(c => ({
      ...c,
      list: (c.list || []).map(r => r.id === regId ? { ...r, checked_in: true, checked_in_at: new Date().toISOString() } : r),
      feedback: { type: 'ok', name, msg: '¡Asistencia registrada!' },
    }));
  };

  // El lector recibe dos cosas distintas: el QR de una socia (UUID de su cuenta)
  // o el código del boleto de un invitado (6 caracteres). Se resuelven los dos.
  const handleEventScan = (e) => {
    e.preventDefault();
    const raw = ciScan.trim();
    setCiScan('');
    if (!raw) return;
    const uuid = (raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [])[0];
    const lista = ci?.list || [];
    const reg = uuid
      ? lista.find(r => r.user_id === uuid)
      : lista.find(r => (r.ticket_code || '').toUpperCase() === raw.toUpperCase());
    if (!reg) {
      setCi(c => ({ ...c, feedback: { type: 'err', msg: uuid ? 'Esa persona no está inscrita en este evento' : `Boleto "${raw.toUpperCase()}" no encontrado en este evento` } }));
      return;
    }
    markAttendance(reg.id);
  };

  const load = async () => {
    const { data } = await supabase.from('events').select('*').order('event_date', { ascending: false, nullsFirst: false });
    setEvents(data || []);
    const { data: regs } = await supabase.from('event_registrations').select('event_id');
    const c = {}; (regs || []).forEach(r => { c[r.event_id] = (c[r.event_id] || 0) + 1; });
    setCounts(c);
  };
  useEffect(() => { load(); }, []);

  const viewRegs = async (id) => {
    if (regView[id]) { setRegView(v => ({ ...v, [id]: undefined })); return; }
    const { data } = await supabase.from('event_registrations').select('user_id, guest_name, ticket_code, users!event_registrations_user_id_fkey(full_name, email)').eq('event_id', id).order('created_at', { ascending: true });
    setRegView(v => ({ ...v, [id]: data || [] }));
  };
  const [nm, setNm] = useState(null); // modal de aviso { ev, stage, result, error, recipients, loadingRec }
  const avisar = (ev) => setNm({ ev, stage: 'confirm' });
  const doNotify = async () => {
    const ev = nm.ev;
    setNm(m => ({ ...m, stage: 'sending' }));
    const { data, error } = await notifyClients(ev);
    if (error || data?.error) setNm(m => ({ ...m, stage: 'error', error: error?.message || data?.error || 'error' }));
    else setNm(m => ({ ...m, stage: 'done', result: data }));
  };
  const viewRecipients = async () => {
    setNm(m => ({ ...m, loadingRec: true }));
    const { data } = await supabase.from('users').select('full_name, email, avatar_url').eq('role', 'CLIENT').order('full_name', { ascending: true });
    setNm(m => ({ ...m, recipients: data || [], loadingRec: false }));
  };

  const blank = { title: '', description: '', event_date: '', location: '', image_url: '', price: '', capacity: '', registration_open: false, notify: true, slug: '' };
  const startEdit = (e) => setForm({ id: e.id, title: e.title || '', description: e.description || '', event_date: toLocalInput(e.event_date), location: e.location || '', image_url: e.image_url || '', slug: e.slug || '', price: e.price ?? '', capacity: e.capacity ?? '', registration_open: !!e.registration_open, notify: false });

  const notifyClients = (ev) => supabase.functions.invoke('notify-event', { body: {
    title: '✨ Nuevo evento: ' + ev.title,
    body: ev.event_date ? `${new Date(ev.event_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} · ¡Entérate de los detalles en la app!` : '¡Entérate de los detalles en la app!',
    type: 'general',
  } });

  const save = async () => {
    if (!form.title.trim()) { alert('Falta el título.'); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(), description: form.description.trim() || null,
      event_date: form.event_date ? new Date(form.event_date).toISOString() : null,
      location: form.location.trim() || null, image_url: form.image_url || null,
      slug: form.slug.trim() || null,
      price: form.price === '' ? null : (parseInt(form.price, 10) || 0),
      capacity: form.capacity === '' ? null : (parseInt(form.capacity, 10) || null),
      registration_open: !!form.registration_open,
    };
    if (form.id) await supabase.from('events').update(payload).eq('id', form.id);
    else await supabase.from('events').insert(payload);
    const willNotify = form.notify;
    setSaving(false); setForm(null); load();
    if (willNotify) {
      setNm({ ev: payload, stage: 'sending' });
      const { data, error } = await notifyClients(payload);
      if (error || data?.error) setNm({ ev: payload, stage: 'error', error: error?.message || data?.error || 'error' });
      else setNm({ ev: payload, stage: 'done', result: data });
    }
  };
  const del = async (e) => { if (confirm(`¿Eliminar el evento "${e.title}"?`)) { await supabase.from('events').delete().eq('id', e.id); load(); } };

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0, color: INK, display: 'flex', alignItems: 'center', gap: '8px' }}><Sparkles size={20} color={PRIMARY} /> Eventos</h2>
        {!form && <button onClick={() => setForm({ ...blank })} style={{ background: PRIMARY, color: 'white', border: 'none', padding: '9px 15px', borderRadius: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><Plus size={16} /> Nuevo evento</button>}
      </div>

      <AnimatePresence>
        {form && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: INK }}>{form.id ? 'Editar evento' : 'Nuevo evento'}</h3>
                <button onClick={() => setForm(null)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <div style={{ marginBottom: '12px' }}><PhotoButton url={form.image_url} onUploaded={(u) => setForm(f => ({ ...f, image_url: u }))} /></div>
              <input placeholder="Título del evento" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ ...input, marginBottom: '8px' }} />
              {/* Link corto para Instagram: <dominio del estudio>/evento/<esto> */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '9px 12px', borderRadius: '12px', background: 'rgba(255,145,77,0.08)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>{ESTUDIO.enlaces.dominio}/evento/</span>
                <input placeholder="rodeo" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                  style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', fontWeight: 700, color: PRIMARY, fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <input type="datetime-local" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} style={{ ...input, flex: '1 1 200px' }} />
                <input placeholder="Lugar (ej. El estudio)" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={{ ...input, flex: '1 1 160px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <input type="number" placeholder="Precio $ (vacío = gratis)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ ...input, flex: '1 1 130px' }} />
                <input type="number" placeholder="Cupo (vacío = sin límite)" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} style={{ ...input, flex: '1 1 130px' }} />
              </div>
              <button type="button" onClick={() => setForm({ ...form, registration_open: !form.registration_open })} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', marginBottom: '12px', background: form.registration_open ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.05)', color: form.registration_open ? '#16A34A' : 'var(--on-surface-variant)' }}>
                <Ticket size={15} /> {form.registration_open ? 'Inscripción ABIERTA' : 'Inscripción cerrada'}
              </button>
              <textarea placeholder="Descripción" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...input, marginBottom: '12px', resize: 'vertical' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                <input type="checkbox" checked={form.notify} onChange={e => setForm({ ...form, notify: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: PRIMARY }} />
                <Bell size={15} color={PRIMARY} /> Avisar a las clientas (push + notificación)
              </label>
              <button onClick={save} disabled={saving} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: PRIMARY, color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}><Save size={16} /> {saving ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Crear evento')}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '46px', color: 'var(--on-surface-variant)' }}><Sparkles size={34} style={{ opacity: 0.3, marginBottom: '12px' }} /><p style={{ margin: 0, fontWeight: 700, color: INK }}>Sin eventos todavía</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {events.map(e => (
            <div key={e.id} style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', padding: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {e.image_url ? <img src={e.image_url} alt="" style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'rgba(255,145,77,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Sparkles size={24} color={PRIMARY} /></div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: INK, fontSize: '0.95rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    {e.event_date && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}><CalendarDays size={12} /> {new Date(e.event_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                    {e.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}><MapPin size={12} /> {e.location}</span>}
                    {e.price != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: PRIMARY, fontWeight: 700 }}><Tag size={12} /> {e.price === 0 ? 'Gratis' : `$${e.price}`}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => startEdit(e)} style={{ width: '32px', height: '32px', borderRadius: '9px', border: 'none', background: 'rgba(255,145,77,0.12)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Pencil size={15} /></button>
                  <button onClick={() => del(e)} style={{ width: '32px', height: '32px', borderRadius: '9px', border: 'none', background: 'rgba(186,26,26,0.08)', color: '#ba1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={15} /></button>
                </div>
              </div>
              {/* Acciones inferiores */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                {e.registration_open && (
                  <button onClick={() => viewRegs(e.id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(34,197,94,0.1)', color: '#16A34A', border: 'none', borderRadius: '9px', padding: '7px 11px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                    <Users size={13} /> {e.registered_count ?? counts[e.id] ?? 0}{e.capacity ? `/${e.capacity}` : ''} inscritas <ChevronDown size={12} />
                  </button>
                )}
                <button onClick={() => avisar(e)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,145,77,0.12)', color: PRIMARY, border: 'none', borderRadius: '9px', padding: '7px 11px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                  <Bell size={13} /> Avisar
                </button>
                <button onClick={() => setBoletosEv(e)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(224,122,156,0.14)', color: '#C2456E', border: 'none', borderRadius: '9px', padding: '7px 11px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                  <Ticket size={13} /> Boletos
                </button>
                {(e.registration_open || (e.registered_count ?? counts[e.id] ?? 0) > 0) && (
                  <button onClick={() => openCheckin(e)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: INK, color: '#fff', border: 'none', borderRadius: '9px', padding: '7px 11px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                    <QrCode size={13} /> Check-in
                  </button>
                )}
              </div>
              {regView[e.id] && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {regView[e.id].length === 0 ? <span style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>Aún no hay inscritas.</span>
                    : regView[e.id].map((r, i) => <div key={i} style={{ fontSize: '0.84rem', color: INK, display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: r.guest_name ? '#E07A9C' : PRIMARY }} />{r.guest_name || r.users?.full_name || r.users?.email || 'Clienta'}{r.guest_name && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#E07A9C' }}>· invitado</span>}</div>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Panel de control del evento: boletos, dinero, contacto y asistencia */}
      <AnimatePresence>
        {boletosEv && (
          <AdminEventoBoletos
            ev={(events.find(x => x.id === boletosEv.id)) || boletosEv}
            onClose={() => setBoletosEv(null)}
            onChange={load}
          />
        )}
      </AnimatePresence>

      {/* Modal de aviso (bonito, reemplaza confirm/alert) */}
      <AnimatePresence>
        {nm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => nm.stage !== 'sending' && setNm(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0, y: 18 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 240 }}
              style={{ width: 'min(420px, 100%)', maxHeight: '85vh', background: '#fff', borderRadius: '26px', padding: '28px 24px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', textAlign: 'center' }}>

              {nm.stage === 'confirm' && (
                <>
                  <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #FF914D, #E68245)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 10px 24px rgba(255,145,77,0.4)' }}><Bell size={30} color="#fff" /></div>
                  <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '1.45rem', color: INK }}>Enviar aviso</h2>
                  <p style={{ margin: '0 0 22px', color: 'var(--on-surface-variant)', fontSize: '0.95rem', lineHeight: 1.5 }}>Se notificará a <strong style={{ color: INK }}>todas las clientas</strong> (in-app + push) sobre el evento <strong style={{ color: PRIMARY }}>{nm.ev.title}</strong>.</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setNm(null)} style={{ flex: 1, padding: '13px', borderRadius: '14px', border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', color: INK, fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={doNotify} style={{ flex: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '13px', borderRadius: '14px', border: 'none', background: PRIMARY, color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', boxShadow: '0 10px 24px rgba(255,145,77,0.35)' }}><Send size={16} /> Enviar aviso</button>
                  </div>
                </>
              )}

              {nm.stage === 'sending' && (
                <div style={{ padding: '24px 0' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '4px solid rgba(255,145,77,0.25)', borderTopColor: PRIMARY, margin: '0 auto 16px' }} />
                  <p style={{ margin: 0, fontWeight: 700, color: INK }}>Enviando aviso…</p>
                </div>
              )}

              {nm.stage === 'error' && (
                <>
                  <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(186,26,26,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><AlertTriangle size={30} color="#ba1a1a" /></div>
                  <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: INK }}>No se pudo enviar</h2>
                  <p style={{ margin: '0 0 22px', color: 'var(--on-surface-variant)', fontSize: '0.9rem', lineHeight: 1.5 }}>{nm.error}</p>
                  <button onClick={() => setNm(null)} style={{ width: '100%', padding: '13px', borderRadius: '14px', border: 'none', background: 'rgba(0,0,0,0.06)', color: INK, fontWeight: 700, cursor: 'pointer' }}>Cerrar</button>
                </>
              )}

              {nm.stage === 'done' && (
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.05 }}
                    style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #22C55E, #16A34A)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 10px 24px rgba(34,197,94,0.4)', flexShrink: 0 }}><CheckCircle2 size={36} color="#fff" strokeWidth={2.5} /></motion.div>
                  <h2 style={{ margin: '0 0 14px', fontFamily: 'var(--font-display)', fontSize: '1.45rem', color: INK, flexShrink: 0 }}>¡Aviso enviado!</h2>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexShrink: 0 }}>
                    <div style={{ flex: 1, background: 'rgba(255,145,77,0.1)', borderRadius: '16px', padding: '12px' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: PRIMARY, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{nm.result?.sent ?? 0}</div>
                      <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>Clientas</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(34,197,94,0.1)', borderRadius: '16px', padding: '12px' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16A34A', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{nm.result?.pushed ?? 0}</div>
                      <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>Con push</div>
                    </div>
                  </div>

                  {!nm.recipients ? (
                    <button onClick={viewRecipients} disabled={nm.loadingRec} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px', borderRadius: '13px', border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', color: INK, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', marginBottom: '10px', flexShrink: 0 }}>
                      {nm.loadingRec ? 'Cargando…' : <><Users size={15} color={PRIMARY} /> Ver a quiénes llegó</>}
                    </button>
                  ) : (
                    <div style={{ overflowY: 'auto', textAlign: 'left', background: 'rgba(0,0,0,0.02)', borderRadius: '14px', padding: '8px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {nm.recipients.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px' }}>
                          {r.avatar_url ? <img src={r.avatar_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,145,77,0.14)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.74rem', flexShrink: 0 }}>{(r.full_name || r.email || '?').charAt(0).toUpperCase()}</div>}
                          <span style={{ fontSize: '0.86rem', color: INK, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.full_name || r.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setNm(null)} style={{ width: '100%', padding: '13px', borderRadius: '14px', border: 'none', background: PRIMARY, color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', flexShrink: 0 }}>Listo</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de CHECK-IN del evento (lector QR + lista de inscritas) */}
      <AnimatePresence>
        {ci && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCi(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <motion.div onClick={e => e.stopPropagation()} initial={{ scale: 0.92, opacity: 0, y: 18 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 240 }}
              style={{ width: 'min(460px, 100%)', maxHeight: '88vh', background: '#fff', borderRadius: '26px', padding: '22px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexShrink: 0 }}>
                <div>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: INK }}>Check-in</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{ci.ev.title}</p>
                </div>
                <button onClick={() => setCi(null)} style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><X size={17} /></button>
              </div>

              {/* Lector QR (oscuro, igual que el mostrador). El lector escribe el código y envía. */}
              <div onClick={() => ciInputRef.current?.focus()} style={{ flexShrink: 0, background: 'linear-gradient(135deg, #1A1C1E, #2C302E)', borderRadius: '18px', padding: '22px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', marginBottom: '12px' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'var(--accent)', opacity: 0.5, boxShadow: '0 0 15px var(--accent)', animation: 'scanLine 3s infinite linear' }} />
                <ScanLine size={30} color="#fff" style={{ opacity: 0.85, marginBottom: '8px' }} />
                <h3 style={{ fontSize: '1.1rem', color: '#fff', fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '0.04em' }}>Escanear QR de la clienta</h3>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.74rem', margin: '6px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Aproximar el código</p>
                <form onSubmit={handleEventScan} style={{ position: 'absolute', top: '-1000px', left: '-1000px' }}>
                  <input ref={ciInputRef} type="text" value={ciScan} onChange={(e) => setCiScan(e.target.value)} autoFocus autoComplete="off" />
                </form>
              </div>

              {/* Feedback del último scan */}
              <AnimatePresence mode="wait">
                {ci.feedback && (
                  <motion.div key={ci.feedback.name + ci.feedback.msg} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '14px', marginBottom: '12px',
                      background: ci.feedback.type === 'ok' ? 'rgba(34,197,94,0.12)' : ci.feedback.type === 'dup' ? 'rgba(255,145,77,0.12)' : 'rgba(186,26,26,0.1)' }}>
                    {ci.feedback.type === 'ok' ? <CheckCircle2 size={20} color="#16A34A" /> : ci.feedback.type === 'dup' ? <UserCheck size={20} color={PRIMARY} /> : <AlertTriangle size={20} color="#ba1a1a" />}
                    <div style={{ minWidth: 0 }}>
                      {ci.feedback.name && <div style={{ fontWeight: 800, fontSize: '0.92rem', color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ci.feedback.name}</div>}
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: ci.feedback.type === 'ok' ? '#16A34A' : ci.feedback.type === 'dup' ? PRIMARY : '#ba1a1a' }}>{ci.feedback.msg}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buscador: en la puerta muchas llegan sin el QR a la mano */}
              <input value={ciBuscar} onChange={(e) => setCiBuscar(e.target.value)}
                placeholder="Buscar por nombre o código de boleto…"
                style={{ flexShrink: 0, width: '100%', padding: '11px 13px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: INK, fontSize: '0.88rem', marginBottom: '10px', outline: 'none' }} />

              {/* Lista de inscritas (socias e invitados) + marca manual de respaldo */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: INK }}>Lista de acceso</span>
                {ci.list && <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>{ci.list.filter(r => r.checked_in).length}/{ci.list.length} asistieron</span>}
              </div>
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!ci.list ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--on-surface-variant)' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : ci.list.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', padding: '12px 0' }}>Aún no hay inscritas en este evento.</span>
                ) : (() => {
                  const q = ciBuscar.trim().toLowerCase();
                  const filtrada = q
                    ? ci.list.filter(r => nombreDe(r).toLowerCase().includes(q) || (r.ticket_code || '').toLowerCase().includes(q))
                    : ci.list;
                  if (!filtrada.length) return <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', padding: '12px 0' }}>Nadie coincide con “{ciBuscar}”.</span>;
                  return filtrada.map((r) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 11px', borderRadius: '13px', background: r.checked_in ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.03)' }}>
                    {r.users?.avatar_url ? <img src={r.users.avatar_url} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: r.guest_name ? 'rgba(224,122,156,0.16)' : 'rgba(255,145,77,0.14)', color: r.guest_name ? '#E07A9C' : PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem', flexShrink: 0 }}>{nombreDe(r).charAt(0).toUpperCase()}</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreDe(r)}</div>
                      {r.guest_name && (
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#E07A9C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Invitado <span style={{ fontFamily: 'monospace', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>{r.ticket_code}</span>
                        </div>
                      )}
                    </div>
                    {r.checked_in ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', fontWeight: 800, color: '#16A34A', flexShrink: 0 }}><CheckCircle2 size={15} /> Asistió</span>
                    ) : (
                      <button onClick={() => markAttendance(r.id)} style={{ flexShrink: 0, fontSize: '0.76rem', fontWeight: 700, color: INK, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '9px', padding: '6px 10px', cursor: 'pointer' }}>Marcar</button>
                    )}
                  </div>
                  ));
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
