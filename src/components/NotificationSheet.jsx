import React, { useState, useMemo, useEffect } from 'react';
import { Bell, X, Send, Megaphone, CheckCheck, Trophy, Calendar, CreditCard, Info, PartyPopper, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

const iconForType = (type) => {
  switch (type) {
    case 'badge_unlocked': return Trophy;
    case 'class_reminder':
    case 'reservation': return Calendar;
    case 'payment': return CreditCard;
    case 'admin': return Megaphone;
    case 'waitlist_promoted':
    case 'waitlist_confirmed': return PartyPopper;
    case 'waitlist_offer':
    case 'waitlist_expired': return Clock;
    default: return Info;
  }
};

// Panel de notificaciones (bottom-sheet). Se abre desde el menú de perfil
// mediante el estado `notifOpen` del AuthContext. Para ADMIN incluye el
// compositor para enviar notificaciones a clientas/coaches.
function NotificationSheet() {
  const {
    user, role, notifications, markNotificationsRead,
    sendNotification, allUsers, coaches, notifOpen, setNotifOpen,
  } = useAuth();

  const [composing, setComposing] = useState(false);
  const [recipient, setRecipient] = useState('ALL_CLIENTS');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isAdmin = role === 'ADMIN';

  // Al abrir el panel, marcar como leídas (con un pequeño delay para que se
  // alcance a ver el badge antes de desaparecer).
  useEffect(() => {
    if (!notifOpen) return;
    const t = setTimeout(() => markNotificationsRead(), 600);
    return () => clearTimeout(t);
  }, [notifOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const recipientOptions = useMemo(() => {
    const opts = [
      { value: 'ALL_CLIENTS', label: '📣 Todas las clientas' },
      { value: 'ALL_COACHES', label: '📣 Todos los coaches' },
    ];
    (coaches || []).forEach(c => opts.push({ value: c.id, label: `🧑‍🏫 ${c.full_name || c.email}` }));
    (allUsers || []).forEach(u => opts.push({ value: u.id, label: `👤 ${u.full_name || u.email}` }));
    return opts;
  }, [allUsers, coaches]);

  const closePanel = () => {
    setNotifOpen(false);
    setComposing(false);
    setFeedback(null);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim() || sending) return;
    setSending(true);
    setFeedback(null);

    let userIds;
    if (recipient === 'ALL_CLIENTS') userIds = (allUsers || []).map(u => u.id);
    else if (recipient === 'ALL_COACHES') userIds = (coaches || []).map(c => c.id);
    else userIds = [recipient];

    const res = await sendNotification({ userIds, title: title.trim(), body: body.trim(), type: 'admin' });
    setSending(false);

    if (res.success) {
      setFeedback({ ok: true, msg: `Enviada a ${res.sent} de ${res.total} 🎉` });
      setTitle('');
      setBody('');
      setTimeout(() => { setComposing(false); setFeedback(null); }, 1800);
    } else {
      setFeedback({ ok: false, msg: 'No se pudo enviar. Revisa los datos.' });
    }
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {notifOpen && (
        <>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2500,
              background: 'var(--app-bg)',
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
              overflow: 'hidden',
            }}
          >
            {/* Header del panel */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 22px 14px',
            }}>
              <h2 style={{
                margin: 0, fontSize: '1.35rem', fontFamily: 'var(--font-display)',
                fontWeight: 700, color: 'var(--on-surface)',
              }}>
                {composing ? 'Enviar notificación' : 'Notificaciones'}
              </h2>
              <button onClick={closePanel} aria-label="Cerrar" style={{
                width: '34px', height: '34px', borderRadius: '50%', border: 'none',
                background: 'var(--surface)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
              }}>
                <X size={18} color="var(--on-surface)" />
              </button>
            </div>

            {/* Acción admin */}
            {isAdmin && (
              <div style={{ padding: '0 22px 8px' }}>
                <button
                  onClick={() => { setComposing(c => !c); setFeedback(null); }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '14px', border: 'none',
                    background: composing ? 'var(--surface)' : 'var(--primary)',
                    color: composing ? 'var(--on-surface)' : '#fff',
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {composing ? <><Bell size={16} /> Ver notificaciones</> : <><Send size={16} /> Enviar notificación</>}
                </button>
              </div>
            )}

            {/* Contenido scrolleable */}
            <div style={{ overflowY: 'auto', padding: '8px 18px 8px', flex: 1 }}>
              {composing && isAdmin ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '6px 4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                    Destinatario
                    <select
                      value={recipient}
                      onChange={e => setRecipient(e.target.value)}
                      style={{
                        width: '100%', marginTop: '6px', padding: '12px', borderRadius: '12px',
                        border: '1px solid var(--surface)', background: 'var(--surface-lowest)',
                        color: 'var(--on-surface)', fontSize: '0.95rem',
                      }}
                    >
                      {recipientOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>

                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                    Título
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      maxLength={60}
                      placeholder="Ej. ¡Nueva clase disponible!"
                      style={{
                        width: '100%', marginTop: '6px', padding: '12px', borderRadius: '12px',
                        border: '1px solid var(--surface)', background: 'var(--surface-lowest)',
                        color: 'var(--on-surface)', fontSize: '0.95rem',
                      }}
                    />
                  </label>

                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                    Mensaje
                    <textarea
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      maxLength={180}
                      rows={3}
                      placeholder="Escribe el mensaje…"
                      style={{
                        width: '100%', marginTop: '6px', padding: '12px', borderRadius: '12px',
                        border: '1px solid var(--surface)', background: 'var(--surface-lowest)',
                        color: 'var(--on-surface)', fontSize: '0.95rem', resize: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>

                  {feedback && (
                    <p style={{
                      margin: 0, fontSize: '0.85rem', fontWeight: 600,
                      color: feedback.ok ? '#2E7D32' : '#C62828',
                    }}>{feedback.msg}</p>
                  )}

                  <button
                    onClick={handleSend}
                    disabled={sending || !title.trim() || !body.trim()}
                    style={{
                      padding: '14px', borderRadius: '14px', border: 'none',
                      background: (!title.trim() || !body.trim()) ? 'var(--surface)' : 'var(--primary)',
                      color: (!title.trim() || !body.trim()) ? 'var(--on-surface-variant)' : '#fff',
                      fontWeight: 700, fontSize: '1rem',
                      cursor: sending ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                  >
                    <Send size={18} /> {sending ? 'Enviando…' : 'Enviar'}
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--on-surface-variant)' }}>
                  <Bell size={42} color="var(--on-surface-variant)" style={{ opacity: 0.4, marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Sin notificaciones</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', opacity: 0.8 }}>
                    Aquí verás tus avisos y recordatorios.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {notifications.map((n) => {
                    const Icon = iconForType(n.type);
                    const unread = !n.read_at;
                    return (
                      <div key={n.id} style={{
                        display: 'flex', gap: '12px', padding: '14px',
                        borderRadius: '16px',
                        background: unread ? 'var(--surface-lowest)' : 'transparent',
                        border: unread ? '1px solid rgba(255,145,77,0.25)' : '1px solid transparent',
                        alignItems: 'flex-start',
                      }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0,
                          background: 'rgba(255,145,77,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon size={18} color="var(--primary)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                            <p style={{
                              margin: 0, fontWeight: 700, fontSize: '0.92rem', color: 'var(--on-surface)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{n.title || 'Notificación'}</p>
                            <span style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', flexShrink: 0 }}>
                              {timeAgo(n.sent_at)}
                            </span>
                          </div>
                          {n.body && (
                            <p style={{
                              margin: '3px 0 0', fontSize: '0.85rem', lineHeight: 1.35,
                              color: 'var(--on-surface-variant)',
                            }}>{n.body}</p>
                          )}
                        </div>
                        {unread && (
                          <span style={{
                            width: '9px', height: '9px', borderRadius: '50%',
                            background: 'var(--primary)', flexShrink: 0, marginTop: '6px',
                          }} />
                        )}
                      </div>
                    );
                  })}
                  {notifications.some(n => !n.read_at) && (
                    <button
                      onClick={markNotificationsRead}
                      style={{
                        margin: '6px auto 2px', padding: '8px 16px', borderRadius: '12px',
                        border: 'none', background: 'var(--surface)', color: 'var(--on-surface)',
                        fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      <CheckCheck size={15} /> Marcar todas como leídas
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default NotificationSheet;
