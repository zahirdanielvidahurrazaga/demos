import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Mail, Lock, ArrowRight, ChevronLeft, CheckCircle2, Eye, EyeOff, Cake, Ruler, MailCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import { signupRedirect } from '../lib/authRedirect';
import { ESTUDIO } from '../config/estudio';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sentTo, setSentTo] = useState(null); // email al que se mandó confirmación
  const [resendMsg, setResendMsg] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const purchasedPlan = location.state?.purchasedPlan;
  const isNative = Capacitor.isNativePlatform();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!acceptTerms) {
      setError("Debes aceptar los Términos y la Política de Privacidad para continuar.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setLoading(false);
      return;
    }
    
    // Opcional: Validación más estricta (letras y números)
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) {
      setError("La contraseña debe contener al menos una mayúscula, una minúscula y un número.");
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: signupRedirect(),
        // Cumpleaños/estatura van en user_metadata: con verificación de correo
        // el signUp NO deja sesión, así que no se puede escribir en `users` aún.
        // AuthContext los copia al perfil en el primer login (backfill).
        data: {
          full_name: name,
          birth_date: birthDate || null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Si NO hay sesión, la cuenta requiere confirmación por correo. Guardamos el
    // plan pendiente (si compró antes de registrarse) para activarlo al confirmar.
    if (!data.session) {
      if (purchasedPlan) {
        try { localStorage.setItem('befit_pending_plan', JSON.stringify(purchasedPlan)); } catch (e) {}
      }
      setSentTo(cleanEmail);
      setLoading(false);
      return;
    }

    {
      // Guardar cumpleaños + estatura en el perfil (reintenta por si el trigger
      // que crea la fila de users aún no termina).
      if (data.user && (birthDate || heightCm)) {
        const extras = { birth_date: birthDate || null, height_cm: heightCm ? parseFloat(heightCm) : null };
        for (let i = 0; i < 4; i++) {
          const { data: rows } = await supabase.from('users').update(extras).eq('id', data.user.id).select('id');
          if (rows && rows.length) break;
          await new Promise(r => setTimeout(r, 600));
        }
      }
      if (purchasedPlan && data.user) {
        // El usuario eligió un plan antes de registrarse. ⚠️ NO activamos aquí:
        // activar sin pago daba acceso gratis. Lo mandamos a /planes con el plan
        // preseleccionado para que COMPLETE EL PAGO (el webhook activa al cobrar).
        navigate('/planes', { state: { selectedPlan: purchasedPlan } });
      } else {
        // Si venían de la cafetería a comprar, regresarlos ahí con su carrito intacto
        const dest = localStorage.getItem('befit_redirect_after_auth');
        if (dest) {
          localStorage.removeItem('befit_redirect_after_auth');
          navigate(dest, { state: { registered: true } });
        } else {
          // Registro normal (sin pago previo), enviar a landing o a planes si es app nativa
          navigate(isNative ? '/planes' : '/', { state: { registered: true } });
        }
      }
    }
  };

  const handleResend = async () => {
    setResendMsg('Enviando…');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: sentTo,
      options: { emailRedirectTo: signupRedirect() },
    });
    setResendMsg(error ? (error.message || 'No se pudo reenviar.') : 'Correo reenviado. Revisa tu bandeja.');
  };

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
          
          {sentTo ? (
            /* PANTALLA: REVISA TU CORREO */
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,145,77,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <MailCheck size={36} color="var(--primary)" />
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', color: '#1A1C1E', marginBottom: '0.6rem', lineHeight: 1.15 }}>Revisa tu correo</h1>
              <p style={{ color: '#374151', fontWeight: 500, lineHeight: 1.5 }}>
                Te enviamos un enlace de confirmación a<br />
                <strong style={{ color: '#1A1C1E' }}>{sentTo}</strong>
              </p>
              <p style={{ color: '#4B5563', fontSize: '0.85rem', marginTop: '10px', lineHeight: 1.5 }}>
                Ábrelo para activar tu cuenta y entrar. Revisa también la carpeta de spam.
              </p>

              <button onClick={handleResend} className="glass-button-dark" style={{ width: '100%', marginTop: '1.6rem' }}>
                Reenviar correo
              </button>
              {resendMsg && <p style={{ color: '#374151', fontSize: '0.82rem', marginTop: '10px' }}>{resendMsg}</p>}

              <div style={{ textAlign: 'center', marginTop: '1.4rem', color: '#4B5563', fontSize: '0.9rem' }}>
                ¿Ya confirmaste? <span onClick={() => navigate('/login')} style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>Inicia Sesión</span>
              </div>
            </div>
          ) : (
          <>
          {/* FORMULARIO DE REGISTRO */}
          <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
            {purchasedPlan ? (
               <>
                 <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(238,186,137,0.2)', color: 'var(--accent)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>
                   Pago Exitoso
                 </div>
                 <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#1A1C1E', marginBottom: '0.5rem', lineHeight: 1.1 }}>Crea tu cuenta para disfrutar tu {purchasedPlan.title}</h1>
               </>
            ) : (
               <>
                 <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: '#1A1C1E', marginBottom: '0.5rem' }}>Crea tu Cuenta</h1>
                 <p style={{ color: '#4B5563', fontWeight: 500 }}>El primer paso hacia tu transformación.</p>
               </>
            )}
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="premium-input-group">
              <label>Nombre Completo</label>
              <User size={20} className="premium-input-icon" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. María Sánchez"
                className="premium-input"
                required
              />
            </div>

            <div className="premium-input-group">
              <label>Correo Electrónico</label>
              <Mail size={20} className="premium-input-icon" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="premium-input"
                autoComplete="email"
                required
              />
            </div>

            <div className="premium-input-group">
              <label>Contraseña Segura</label>
              <Lock size={20} className="premium-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="premium-input"
                style={{ paddingRight: '3rem' }}
                autoComplete="new-password"
                required
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

            <div className="premium-input-group">
              <label>Confirmar Contraseña</label>
              <Lock size={20} className="premium-input-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="premium-input"
                style={{ paddingRight: '3rem' }}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(v => !v)}
                style={{ position: 'absolute', right: '1rem', bottom: '13px', zIndex: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', opacity: 0.7, padding: 0, display: 'flex', alignItems: 'center' }}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* DATOS PARA TU SEGUIMIENTO (opcional) */}
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--on-surface-variant)', margin: '0.5rem 0 0.25rem', letterSpacing: '0.02em' }}>Para tu seguimiento <span style={{ fontWeight: 500, opacity: 0.8 }}>(opcional, puedes ponerlo después)</span></p>

            <div className="premium-input-group">
              <label>Cumpleaños</label>
              <Cake size={20} className="premium-input-icon" />
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="premium-input"
                style={{ WebkitAppearance: 'none', appearance: 'none', minHeight: '3.1rem' }}
              />
            </div>

            <div className="premium-input-group">
              <label>Estatura (cm)</label>
              <Ruler size={20} className="premium-input-icon" />
              <input
                type="number"
                inputMode="decimal"
                min="120"
                max="220"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="Ej. 165"
                className="premium-input"
              />
            </div>

            {/* CONSENTIMIENTO LEGAL */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '1.5rem', cursor: 'pointer', fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.5 }}>
              <input 
                type="checkbox" 
                checked={acceptTerms} 
                onChange={(e) => setAcceptTerms(e.target.checked)} 
                style={{ marginTop: '3px', accentColor: 'var(--primary)', width: '18px', height: '18px', flexShrink: 0 }}
              />
              <span>
                Acepto los <Link to="/terminos" target="_blank" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>Términos y Condiciones</Link> y la <Link to="/privacidad" target="_blank" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>Política de Privacidad</Link> de {ESTUDIO.nombre}.
              </span>
            </label>

            <button type="submit" className="glass-button-dark" style={{ width: '100%', marginTop: '1.5rem', opacity: acceptTerms ? 1 : 0.85, cursor: acceptTerms ? 'pointer' : 'not-allowed' }} disabled={loading || !acceptTerms}>
              {loading ? 'Creando cuenta...' : 'Completar Registro'} <ArrowRight size={20} />
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', color: '#4B5563', fontSize: '0.9rem' }}>
            ¿Ya tienes una cuenta? <span onClick={() => navigate('/login')} style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>Inicia Sesión</span>
          </div>
          </>
          )}

        </div>
      </motion.div>
    </div>
  );
}

export default Register;
