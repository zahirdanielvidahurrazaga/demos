import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, CreditCard, UserCircle, Settings, LogOut, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// Avatar + menú de perfil reutilizable. Reemplaza el icono decorativo que
// tenían los headers de cada pestaña y centraliza: notificaciones (con badge),
// membresía, cuenta, ajustes y cerrar sesión.
function ProfileMenu() {
  const navigate = useNavigate();
  const { avatarUrl, profileName, role, membershipStatus, logout, unreadCount, setNotifOpen } = useAuth();
  const [open, setOpen] = useState(false);

  const statusLabel =
    role === 'ADMIN' ? 'Administradora'
    : role === 'COACH' ? 'Coach'
    : role === 'BARISTA' ? 'Barista'
    : role === 'RECEPCION' ? 'Recepción'
    : membershipStatus === 'ACTIVE' ? 'Socia Activa'
    : 'Socia';

  const go = (path) => { setOpen(false); navigate(path); };

  const items = [
    {
      icon: Bell, label: 'Notificaciones', badge: unreadCount,
      onClick: () => { setOpen(false); setNotifOpen(true); },
    },
    { icon: CreditCard, label: 'Mi Membresía', onClick: () => go('/planes') },
    { icon: UserCircle, label: 'Mi Cuenta', onClick: () => go('/mi-cuenta') },
    { icon: Settings, label: 'Ajustes', onClick: () => go('/ajustes') },
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* Avatar */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Perfil"
        style={{
          width: '42px', height: '42px', borderRadius: '50%', padding: 0,
          background: avatarUrl ? 'transparent' : 'rgba(255,139,66,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', overflow: 'hidden', position: 'relative',
          border: avatarUrl ? '2px solid #FF8B42' : 'none',
          boxShadow: avatarUrl ? '0 4px 12px rgba(255,139,66,0.3)' : 'none',
        }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <User size={20} color="var(--primary)" />}
      </button>

      {/* Badge de no leídas — fuera del botón para que NO lo recorte overflow:hidden */}
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute', top: '-4px', right: '-4px', pointerEvents: 'none',
          minWidth: '19px', height: '19px', padding: '0 5px', borderRadius: '10px',
          background: '#E53935', color: '#fff', fontSize: '0.7rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 2px var(--app-bg)',
        }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop para cerrar al tocar fuera */}
            <div
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 90 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              style={{
                position: 'absolute',
                top: '52px', right: 0,
                transformOrigin: 'top right',
                width: '230px',
                background: 'var(--surface-lowest)',
                borderRadius: '22px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                border: '1px solid var(--border-subtle)',
                padding: '8px',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              {/* Encabezado */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px 12px',
                borderBottom: '1px solid var(--divider)', marginBottom: '6px',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  overflow: 'hidden', border: '2px solid var(--primary)',
                  background: avatarUrl ? 'transparent' : 'rgba(255,139,66,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <User size={18} color="var(--primary)" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.92rem', fontWeight: 800, color: 'var(--on-surface)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{profileName || 'Mi perfil'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>{statusLabel}</div>
                </div>
              </div>

              {/* Items */}
              {items.map(({ icon: Icon, label, onClick, badge }) => (
                <button
                  key={label}
                  onClick={onClick}
                  style={{
                    width: '100%', border: 'none', background: 'transparent',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '11px 12px', borderRadius: '14px', cursor: 'pointer',
                    color: 'var(--on-surface)', fontSize: '0.9rem', fontWeight: 600,
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,145,77,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                    background: 'rgba(255,145,77,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={17} color="var(--primary)" />
                  </span>
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge > 0 && (
                    <span style={{
                      minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '10px',
                      background: '#E53935', color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{badge > 9 ? '9+' : badge}</span>
                  )}
                </button>
              ))}

              {/* Cerrar sesión */}
              <button
                onClick={() => { setOpen(false); logout(); navigate('/login', { replace: true }); }}
                style={{
                  width: '100%', border: 'none', background: 'transparent',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '11px 12px', borderRadius: '14px', cursor: 'pointer',
                  color: '#ba1a1a', fontSize: '0.9rem', fontWeight: 700, textAlign: 'left',
                  marginTop: '4px', borderTop: '1px solid var(--divider)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(186,26,26,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                  background: 'rgba(186,26,26,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <LogOut size={17} color="#ba1a1a" />
                </span>
                <span style={{ flex: 1 }}>Cerrar Sesión</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProfileMenu;
