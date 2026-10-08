import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock, Mail, ArrowRight, ChevronLeft, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import { recoveryRedirect } from '../lib/authRedirect';
import { ESTUDIO } from '../config/estudio';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  // Forzar light en Login/Welcome
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  // ==============================
  // RATE LIMITING (Anti-Fuerza Bruta)
  // ==============================
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);

  const isLockedOut = () => {
    if (!lockoutUntil) return false;
    if (Date.now() < lockoutUntil) return true;
    // Expiró el bloqueo
    setLockoutUntil(null);
    setLoginAttempts(0);
    return false;
  };

  const getRemainingLockoutTime = () => {
    if (!lockoutUntil) return 0;
    return Math.ceil((lockoutUntil - Date.now()) / 60000);
  };

  // ==============================
  // OLVIDÉ MI CONTRASEÑA
  // ==============================
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState(null);
  // Hora del último envío y espera para reenviar. Pedir un enlace nuevo INVALIDA
  // el anterior al instante (Supabase solo deja vivo el último), y esa era la
  // causa real de "le doy a restablecer y el link no me da acceso": la clienta
  // no veía el correo, pedía otro, y luego abría el primero que encontraba
  // —el viejo— y le salía "Enlace no válido". Por eso aquí se frena el reenvío,
  // se avisa qué pasa al reenviar y se sella la hora para distinguir los correos.
  const [resetSentAt, setResetSentAt] = useState(null);
  const [resendIn, setResendIn] = useState(0);
  const RESEND_WAIT_S = 60; // igual al mínimo que impone el servidor entre correos

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // /login?recuperar=1 → abrir directo el formulario. Lo usa el botón "Pedir un
  // enlace nuevo" de la pantalla de enlace vencido, para que no tenga que volver
  // a buscar "¿Olvidaste tu contraseña?" justo cuando ya se está frustrando.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('recuperar') === '1') {
      setShowForgotPassword(true);
    }
  }, []);

  const enviarEnlace = async () => {
    setResetLoading(true);
    setResetError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {
      redirectTo: recoveryRedirect(),
    });

    if (error) {
      setResetError(error.message);
    } else {
      setResetSuccess(true);
      setResetSentAt(new Date());
      setResendIn(RESEND_WAIT_S);
    }
    setResetLoading(false);
  };

  const handleResetPassword = (e) => { e.preventDefault(); enviarEnlace(); };

  // ==============================
  // LOGIN
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Verificar bloqueo
    if (isLockedOut()) {
      setError(`Demasiados intentos. Intenta de nuevo en ${getRemainingLockoutTime()} minutos.`);
      return;
    }

    setLoading(true);
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    const { data, error: authError } = await login(cleanEmail, password);
    
    if (authError) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
        setError(`Cuenta bloqueada temporalmente por seguridad. Intenta de nuevo en 15 minutos.`);
      } else {
        setError(`Error (${authError.message}). ${MAX_LOGIN_ATTEMPTS - newAttempts} intentos restantes.`);
      }
      setLoading(false);
    } else {
      setLoginAttempts(0);
      // Persistencia de sesión
      if (isNative || rememberMe) {
        localStorage.setItem('befit_remember_me', '1');
        sessionStorage.removeItem('befit_session_active');
      } else {
        localStorage.removeItem('befit_remember_me');
        sessionStorage.setItem('befit_session_active', '1');
      }
      // Si venían de la cafetería (u otra pantalla), regresarlos ahí
      const dest = localStorage.getItem('befit_redirect_after_auth');
      if (dest) { localStorage.removeItem('befit_redirect_after_auth'); navigate(dest); }
      else navigate('/portal');
    }
  };

  // ==============================
  // UI: RECUPERAR CONTRASEÑA
  // ==============================
  if (showForgotPassword) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'url("/hero_bg.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', zIndex: 0 }}></div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', zIndex: 1 }}>
          <div style={{ 
            width: '100%', maxWidth: '450px', 
            background: 'rgba(255, 255, 255, 0.65)', 
            backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
            padding: '3rem', borderRadius: '30px',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>

            {resetSuccess ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <CheckCircle2 size={32} color="#22C55E" />
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#1A1C1E', marginBottom: '0.5rem' }}>Te enviamos el enlace</h2>
                <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                  Si existe una cuenta con ese correo, ahí llegará tu enlace para crear una contraseña nueva. Revisa también la carpeta de spam.
                </p>

                {/* El aviso que evita el problema: solo el ÚLTIMO correo funciona. */}
                <div style={{ background: 'rgba(255,145,77,0.12)', border: '1px solid rgba(255,145,77,0.35)', borderRadius: '12px', padding: '0.9rem 1rem', marginBottom: '1.2rem', textAlign: 'left' }}>
                  <p style={{ color: '#8A4A16', fontSize: '0.86rem', lineHeight: 1.55, margin: 0, fontWeight: 600 }}>
                    Abre el correo más reciente.
                  </p>
                  <p style={{ color: '#8A4A16', fontSize: '0.84rem', lineHeight: 1.55, margin: '4px 0 0' }}>
                    Si pides el enlace otra vez, los anteriores dejan de servir. Por eso, si tienes
                    varios correos nuestros, usa <strong>solo el último</strong>{resetSentAt ? <> (el de las {resetSentAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })})</> : null}.
                  </p>
                </div>

                <button onClick={() => { setShowForgotPassword(false); setResetSuccess(false); setResetEmail(''); setResetSentAt(null); setResendIn(0); }} className="glass-button-dark" style={{ width: '100%' }}>
                  Volver al Login <ArrowRight size={20} />
                </button>

                <div style={{ marginTop: '1.1rem' }}>
                  {resendIn > 0 ? (
                    <p style={{ color: '#6B7280', fontSize: '0.82rem', margin: 0 }}>
                      ¿No te llegó? Podrás pedir otro en {resendIn}s
                    </p>
                  ) : (
                    <button
                      onClick={enviarEnlace}
                      disabled={resetLoading}
                      style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary)', fontWeight: 600, fontSize: '0.86rem', cursor: resetLoading ? 'default' : 'pointer', textDecoration: 'underline' }}
                    >
                      {resetLoading ? 'Enviando…' : 'Enviarme otro enlace'}
                    </button>
                  )}
                  {resetError && (
                    <p style={{ color: '#EF4444', fontSize: '0.82rem', marginTop: '0.6rem' }}>{resetError}</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#1A1C1E', marginBottom: '0.5rem' }}>Recuperar contraseña</h1>
                  <p style={{ color: '#4B5563', fontWeight: 500, fontSize: '0.9rem' }}>Ingresa tu correo y te enviaremos un enlace de recuperación.</p>
                </div>

                {resetError && (
                  <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
                    {resetError}
                  </div>
                )}

                <form onSubmit={handleResetPassword}>
                  <div className="premium-input-group">
                    <label>Correo Electrónico</label>
                    <Mail size={20} className="premium-input-icon" />
                    <input 
                      type="email" 
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="premium-input"
                      required
                    />
                  </div>

                  <button type="submit" className="glass-button-dark" style={{ width: '100%', marginTop: '1.5rem' }} disabled={resetLoading}>
                    {resetLoading ? 'Enviando...' : 'Enviar enlace de recuperación'} <ArrowRight size={20} />
                  </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <span onClick={() => { setShowForgotPassword(false); setResetError(null); }} style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                    Volver al inicio de sesión
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==============================
  // UI: LOGIN PRINCIPAL
  // ==============================
  return (
    <div style={{ position: 'relative', width: '100%', overflowX: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'url("/fotos-hero/_DSC0444.jpg")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      
      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.85) 100%)', backdropFilter: 'blur(8px)', zIndex: 0 }}></div>

      {/* BOTÓN VOLVER */}
      <div 
        onClick={() => navigate('/')} 
        style={{ 
          position: 'absolute', top: 'calc(env(safe-area-inset-top, 20px) + 15px)', left: '20px', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '10px 18px', borderRadius: '50px',
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)',
          color: 'white', fontSize: '0.85rem', fontWeight: 600,
          cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)',
          transition: 'all 0.3s ease'
        }}>
        <ChevronLeft size={18} />
        {isNative ? 'Atrás' : 'Volver al sitio'}
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isNative ? '20px 16px' : '40px 20px', zIndex: 1 }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '380px', 
          background: 'rgba(255, 255, 255, 0.65)', 
          backdropFilter: 'blur(30px)', 
          WebkitBackdropFilter: 'blur(30px)',
          padding: isNative ? '1.8rem 1.2rem' : '2.2rem 1.8rem', 
          borderRadius: '28px',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          boxSizing: 'border-box'
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: '#1A1C1E', marginBottom: '0.5rem' }}>Bienvenida de nuevo</h1>
            <p style={{ color: '#4B5563', fontWeight: 500 }}>Ingresa tus credenciales para acceder a tu portal.</p>
          </div>

          {error && (
            <div style={{ 
              background: isLockedOut() ? '#FEF3C7' : '#FEE2E2', 
              color: isLockedOut() ? '#92400E' : '#EF4444', 
              padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', 
              fontSize: '0.85rem', textAlign: 'center',
              display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center',
              border: isLockedOut() ? '1px solid rgba(146,64,14,0.2)' : '1px solid rgba(239,68,68,0.2)'
            }}>
              {isLockedOut() && <AlertTriangle size={18} />}
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="premium-input-group">
              <label>Correo Electrónico</label>
              <Mail size={20} className="premium-input-icon" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="premium-input"
                required
                disabled={isLockedOut()}
              />
            </div>

            <div className="premium-input-group">
              <label>Contraseña</label>
              <Lock size={20} className="premium-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="premium-input"
                style={{ paddingRight: '3rem' }}
                required
                disabled={isLockedOut()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: '1rem', bottom: '13px', zIndex: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', opacity: 0.7, padding: 0, display: 'flex', alignItems: 'center' }}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* OLVIDÉ MI CONTRASEÑA */}
            <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '16px' }}>
              <span
                onClick={() => setShowForgotPassword(true)}
                style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                ¿Olvidaste tu contraseña?
              </span>
            </div>

            {/* MANTENER SESIÓN (solo web/PWA) */}
            {!isNative && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', cursor: 'pointer', fontSize: '0.85rem', color: '#4B5563', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', flexShrink: 0 }}
                />
                Mantener sesión iniciada
              </label>
            )}

            <button type="submit" className="glass-button-dark" style={{ width: '100%' }} disabled={loading || isLockedOut()}>
              {loading ? 'Validando...' : isLockedOut() ? `Bloqueado (${getRemainingLockoutTime()} min)` : 'Iniciar Sesión'} <ArrowRight size={20} />
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', color: '#4B5563', fontSize: '0.9rem' }}>
            ¿No tienes una cuenta? <span onClick={() => navigate('/registro')} style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>Regístrate aquí</span>
          </div>
          
          {!isNative && (
            <div style={{ marginTop: '1.8rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lleva tu entrenamiento a otro nivel</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  href={ESTUDIO.tiendas.appStore}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Descargar ${ESTUDIO.nombre} en App Store`}
                >
                  <img
                    src="/assets/appstore.svg"
                    alt="Download on the App Store"
                    style={{ height: '36px', width: '120px', objectFit: 'contain', cursor: 'pointer', transition: 'transform 0.2s ease', display: 'block' }}
                    onMouseOver={(e) => e.currentTarget.style.transform='scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform='scale(1)'}
                  />
                </a>
                <a
                  href={ESTUDIO.tiendas.playStore}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Descargar ${ESTUDIO.nombre} en Google Play`}
                >
                  <img
                    src="/assets/googleplay.svg"
                    alt="Disponible en Google Play"
                    style={{ height: '36px', width: '120px', objectFit: 'contain', cursor: 'pointer', transition: 'transform 0.2s ease', display: 'block' }}
                    onMouseOver={(e) => e.currentTarget.style.transform='scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform='scale(1)'}
                  />
                </a>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}

export default Login;
