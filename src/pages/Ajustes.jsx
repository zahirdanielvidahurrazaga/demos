import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, Bell, Moon, Lock, FileText, ShieldAlert, Trash2, ChevronRight, ChevronLeft, Check, AlertCircle, Home, TrendingUp, Utensils, CalendarDays, QrCode, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, errorDeFuncion } from '../lib/supabase';
import { useScrollDetect } from '../hooks/useScrollDetect';
import { motion, AnimatePresence } from 'framer-motion';
import { ESTUDIO } from '../config/estudio';

function Ajustes() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isScrolled = useScrollDetect(30);

  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Modals
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Load settings from localStorage (per-user dark mode)
  useEffect(() => {
    const savedNotif = localStorage.getItem('befit_notifications');
    if (savedNotif !== null) setNotifications(savedNotif === 'true');
    if (user?.id) {
      const savedDark = localStorage.getItem(`befit_darkmode_${user.id}`);
      if (savedDark === 'true') {
        setDarkMode(true);
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        setDarkMode(false);
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }, [user?.id]);

  const toggleNotifications = () => {
    const newVal = !notifications;
    setNotifications(newVal);
    localStorage.setItem('befit_notifications', String(newVal));
  };

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    if (user?.id) {
      localStorage.setItem(`befit_darkmode_${user.id}`, String(newVal));
    }
    document.documentElement.setAttribute('data-theme', newVal ? 'dark' : 'light');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordError(true);
      setPasswordMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(true);
      setPasswordMsg('Las contraseñas no coinciden.');
      return;
    }

    setChangingPassword(true);
    setPasswordError(false);
    setPasswordMsg('');

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(true);
      setPasswordMsg('Error: ' + error.message);
    } else {
      setPasswordError(false);
      setPasswordMsg('Contraseña actualizada correctamente.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordMsg('');
      }, 2000);
    }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }
    // Paso 2: eliminar de verdad.
    //
    // ⚠️ Antes esto hacía `delete()` directo sobre `reservations` y `users`. Con
    // RLS activo y SIN políticas DELETE, eso no da error: borra CERO filas y
    // devuelve éxito. Se cerraba la sesión y la clienta se iba creyendo que su
    // cuenta ya no existía, cuando seguía completa. Ahora lo hace la edge
    // function `delete-my-account`, que además cancela el cobro de Stripe antes
    // de borrar, y aquí SÍ se revisa el resultado.
    setDeleting(true);
    setDeleteError('');
    try {
      const { data, error } = await supabase.functions.invoke('delete-my-account');
      if (error || data?.error) {
        // errorDeFuncion es async: lee el motivo real del CUERPO de la respuesta.
        // Sin el await aquí se guardaría una promesa como texto del error.
        setDeleteError(await errorDeFuncion(error, data, 'No se pudo eliminar tu cuenta. Vuelve a intentarlo.'));
        setDeleting(false);
        return;
      }
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Error deleting account:', err);
      setDeleteError('No se pudo eliminar tu cuenta. Revisa tu conexión e inténtalo otra vez.');
      setDeleting(false);
    }
  };

  // Styles
  const cardStyle = {
    background: 'var(--glass-bg, rgba(255,255,255,0.65))',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '28px',
    padding: '6px 0',
    marginBottom: '24px',
    boxShadow: '0 8px 32px rgba(255,145,77,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
    overflow: 'hidden',
    border: '1px solid var(--glass-border, rgba(255,255,255,0.5))'
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  };

  const iconBoxStyle = {
    width: '40px', height: '40px', borderRadius: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)'
  };

  const inputStyle = {
    width: '100%',
    padding: '16px 18px',
    borderRadius: '16px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface, rgba(255,255,255,0.8))',
    fontSize: '1rem',
    fontWeight: 600,
    fontFamily: 'DM Sans, sans-serif',
    color: 'var(--on-surface)',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
  };

  const ToggleSwitch = ({ value, onToggle }) => (
    <div
      onClick={onToggle}
      style={{
        width: '56px', height: '32px', borderRadius: '16px',
        background: value ? 'linear-gradient(135deg, #FF8B42, #EEBA89)' : 'var(--surface-variant)',
        padding: '3px', cursor: 'pointer',
        transition: 'background 0.3s ease',
        display: 'flex', alignItems: 'center',
        boxShadow: value ? '0 4px 12px rgba(255,139,66,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{
        width: '26px', height: '26px', borderRadius: '50%',
        background: 'white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        transform: value ? 'translateX(24px)' : 'translateX(0)',
        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }} />
    </div>
  );

  // MODAL OVERLAY
  const ModalOverlay = ({ show, onClose, children }) => {
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                background: 'var(--glass-bg, rgba(255,255,255,0.8))', borderRadius: '32px',
                width: '100%', maxWidth: '380px',
                padding: '32px 24px',
                border: '1px solid var(--glass-border, rgba(255,255,255,0.5))',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.6)'
              }}
              onClick={e => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="mobile-app-container" style={{ background: 'var(--app-bg)' }}>
      {/* HEADER UNIFICADO */}
      <header className="ios-header" style={{ paddingBottom: '5px', background: 'transparent', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => navigate(-1)}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(255,139,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={20} color="var(--primary)" />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 2px', fontWeight: 600 }}>Configuración</p>
              <h1 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1, color: 'var(--black)' }}>Ajustes</h1>
            </div>
          </div>
          <div style={{ 
            width: '42px', height: '42px', borderRadius: '50%', 
            background: 'rgba(255,139,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Settings size={20} color="var(--primary)" />
          </div>
        </div>
      </header>

      <main className="dashboard-main" style={{ display: 'block', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <div className="dashboard-sidebar" style={{ width: '100%' }}>

          {/* PREFERENCIAS */}
          <p style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', margin: '0 0 12px', paddingLeft: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={16} /> Preferencias
          </p>
          <div style={cardStyle}>
            <div style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ ...iconBoxStyle, background: 'rgba(255,139,66,0.15)', border: '1px solid rgba(255,139,66,0.2)' }}>
                  <Bell size={20} color="var(--primary)" />
                </div>
                <div>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--on-surface)', margin: 0, fontFamily: 'DM Sans' }}>Notificaciones</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '2px 0 0', fontWeight: 600 }}>Recordatorio 1hr antes</p>
                </div>
              </div>
              <ToggleSwitch value={notifications} onToggle={toggleNotifications} />
            </div>

            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 20px' }} />

            <div style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ ...iconBoxStyle, background: 'rgba(140, 128, 121, 0.15)', border: '1px solid rgba(140, 128, 121, 0.2)' }}>
                  <Moon size={20} color="var(--on-surface)" />
                </div>
                <div>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--on-surface)', margin: 0, fontFamily: 'DM Sans' }}>Modo Oscuro</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '2px 0 0', fontWeight: 600 }}>Apariencia de la app</p>
                </div>
              </div>
              <ToggleSwitch value={darkMode} onToggle={toggleDarkMode} />
            </div>
          </div>

          {/* SEGURIDAD */}
          <p style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', margin: '8px 0 12px', paddingLeft: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} /> Seguridad
          </p>
          <div style={cardStyle}>
            <motion.div whileHover={{ backgroundColor: 'var(--surface-low)' }} whileTap={{ scale: 0.98 }} style={rowStyle} onClick={() => setShowChangePassword(true)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ ...iconBoxStyle, background: 'rgba(0,103,126,0.15)', border: '1px solid rgba(0,103,126,0.2)' }}>
                  <Lock size={20} color="#00A3C4" />
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--on-surface)', margin: 0, fontFamily: 'DM Sans' }}>Cambiar Contraseña</p>
              </div>
              <ChevronRight size={22} color="var(--on-surface-variant)" />
            </motion.div>
          </div>

          {/* LEGAL */}
          <p style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', margin: '8px 0 12px', paddingLeft: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} /> Legal
          </p>
          <div style={cardStyle}>
            <motion.div whileHover={{ backgroundColor: 'var(--surface-low)' }} whileTap={{ scale: 0.98 }} style={rowStyle} onClick={() => navigate('/privacidad')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ ...iconBoxStyle, background: 'rgba(126,86,46,0.15)', border: '1px solid rgba(126,86,46,0.2)' }}>
                  <FileText size={20} color="#A19289" />
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--on-surface)', margin: 0, fontFamily: 'DM Sans' }}>Política de Privacidad</p>
              </div>
              <ChevronRight size={22} color="var(--on-surface-variant)" />
            </motion.div>

            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 20px' }} />

            <motion.div whileHover={{ backgroundColor: 'var(--surface-low)' }} whileTap={{ scale: 0.98 }} style={rowStyle} onClick={() => navigate('/terminos')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ ...iconBoxStyle, background: 'rgba(126,86,46,0.15)', border: '1px solid rgba(126,86,46,0.2)' }}>
                  <ShieldAlert size={20} color="#A19289" />
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--on-surface)', margin: 0, fontFamily: 'DM Sans' }}>Términos y Condiciones</p>
              </div>
              <ChevronRight size={22} color="var(--on-surface-variant)" />
            </motion.div>
          </div>

          {/* DANGER ZONE */}
          <p style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ff4d4d', margin: '8px 0 12px', paddingLeft: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={16} /> Zona de Peligro
          </p>
          <div style={{ ...cardStyle, marginBottom: '24px' }}>
            <motion.div whileHover={{ backgroundColor: 'rgba(255,77,77,0.05)' }} whileTap={{ scale: 0.98 }} style={rowStyle} onClick={() => setShowDeleteConfirm(true)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ ...iconBoxStyle, background: 'rgba(255,77,77,0.15)', border: '1px solid rgba(255,77,77,0.2)' }}>
                  <Trash2 size={20} color="#ff4d4d" />
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 800, color: '#ff4d4d', margin: 0, fontFamily: 'DM Sans' }}>Eliminar Cuenta</p>
              </div>
              <ChevronRight size={22} color="#ff4d4d" />
            </motion.div>
          </div>

          {/* VERSION */}
          <div style={{ textAlign: 'center', marginBottom: '100px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', margin: 0, fontWeight: 500 }}>
              <Info size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              {ESTUDIO.nombreMayusculas} v1.0.0
            </p>
          </div>

        </div>
      </main>

      {/* CHANGE PASSWORD MODAL */}
      <ModalOverlay show={showChangePassword} onClose={() => { setShowChangePassword(false); setPasswordMsg(''); }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(0,103,126,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', border: '1px solid rgba(0,103,126,0.3)', boxShadow: '0 8px 16px rgba(0,103,126,0.2)'
          }}>
            <Lock size={28} color="#00677e" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}>Cambiar Contraseña</h2>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
            Nueva contraseña
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
            Confirmar contraseña
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
            style={inputStyle}
          />
        </div>

        {passwordMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '14px 18px', borderRadius: '16px',
            background: passwordError ? 'rgba(186,26,26,0.1)' : 'rgba(34,197,94,0.1)',
            color: passwordError ? '#ba1a1a' : '#22c55e',
            fontSize: '0.85rem', marginBottom: '20px', fontWeight: 700,
            border: `1px solid ${passwordError ? 'rgba(186,26,26,0.3)' : 'rgba(34,197,94,0.3)'}`
          }}>
            {passwordError ? <AlertCircle size={18} /> : <Check size={18} />} {passwordMsg}
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleChangePassword}
          disabled={changingPassword}
          style={{
            width: '100%', padding: '16px',
            borderRadius: '20px', border: 'none',
            background: changingPassword ? 'var(--surface-variant)' : '#00677e',
            color: 'white', fontSize: '1.05rem',
            fontWeight: 800, fontFamily: 'var(--font-display)',
            cursor: changingPassword ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 25px rgba(0,103,126,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
          }}
        >
          {changingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
        </motion.button>
      </ModalOverlay>


      {/* DELETE ACCOUNT MODAL */}
      <ModalOverlay show={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setDeleteStep(1); setDeleteError(''); }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(186,26,26,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', border: '1px solid rgba(186,26,26,0.3)', boxShadow: '0 8px 20px rgba(186,26,26,0.3)'
          }}>
            <Trash2 size={32} color="#ba1a1a" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 12px', fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}>
            {deleteStep === 1 ? '¿Eliminar tu cuenta?' : '¿Estás segura?'}
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--on-surface-variant)', marginBottom: '28px', lineHeight: 1.5, fontWeight: 500 }}>
            {deleteStep === 1
              ? 'Se eliminarán todos tus datos, reservaciones e historial, y se cancelará tu cobro automático si tienes uno. Esta acción no se puede deshacer.'
              : 'Esta es tu última oportunidad. Al confirmar, tu cuenta será eliminada permanentemente y perderás acceso a todo tu progreso.'}
          </p>

          {deleteError && (
            <p style={{ fontSize: '0.9rem', color: '#ba1a1a', fontWeight: 600, marginBottom: '16px', lineHeight: 1.45 }}>
              {deleteError}
            </p>
          )}

          <motion.button
            whileHover={deleting ? undefined : { scale: 1.02 }}
            whileTap={deleting ? undefined : { scale: 0.98 }}
            disabled={deleting}
            onClick={handleDeleteAccount}
            style={{
              width: '100%', padding: '16px',
              borderRadius: '20px', border: 'none',
              background: '#ba1a1a', color: 'white',
              fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-display)',
              cursor: deleting ? 'default' : 'pointer', marginBottom: '14px', opacity: deleting ? 0.7 : 1,
              boxShadow: '0 8px 25px rgba(186,26,26,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            {deleting ? 'Eliminando…' : (deleteStep === 1 ? 'Sí, eliminar mi cuenta' : 'Confirmar eliminación definitiva')}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setShowDeleteConfirm(false); setDeleteStep(1); }}
            style={{
              width: '100%', padding: '16px',
              borderRadius: '20px',
              border: '2px solid var(--border-subtle)', background: 'var(--surface, rgba(255,255,255,0.8))',
              fontSize: '1rem', fontWeight: 800, fontFamily: 'DM Sans',
              color: 'var(--on-surface)', cursor: 'pointer'
            }}
          >
            Cancelar
          </motion.button>
        </div>
      </ModalOverlay>


    </div>
  );
}

export default Ajustes;
