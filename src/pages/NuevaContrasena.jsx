import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { ESTUDIO } from '../config/estudio';

// Pantalla para fijar una nueva contraseña tras abrir el enlace de recuperación.
// La sesión de recovery la establece: en web detectSessionInUrl; en nativo el
// handler de deep link (AuthDeepLinkHandler) antes de navegar aquí.
export default function NuevaContrasena() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(null); // null = verificando

  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const qp = url.searchParams;
    const hp = new URLSearchParams(url.hash.replace(/^#/, ''));
    const tokenHash = qp.get('token_hash');
    const type = qp.get('type') || hp.get('type') || 'recovery';
    const errCode = qp.get('error_code') || hp.get('error_code') || qp.get('error') || hp.get('error');

    async function init() {
      // Si Supabase mandó un error en la URL (token ya usado/expirado), enlace inválido.
      if (errCode) { if (active) setHasSession(false); return; }

      // Flujo NUEVO (a prueba de Gmail): el correo trae ?token_hash=...&type=recovery.
      // La verificación es un POST por JS → el pre-escaneo de Gmail (que solo hace
      // GET y no ejecuta JS) ya NO consume el token de un solo uso.
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
        // Limpia el token de la barra de direcciones (no dejarlo expuesto/recargable).
        try { window.history.replaceState({}, '', url.pathname); } catch (e) { /* sin soporte de history: no pasa nada */ }
        if (!error) { if (active) setHasSession(true); return; }
        // verifyOtp falló: puede que el enlace ya se haya canjeado en una carga
        // previa (mismo navegador) y exista sesión → úsala en vez de marcar error.
        const { data } = await supabase.auth.getSession();
        if (active) setHasSession(!!data.session);
        return;
      }

      // Fallback: sesión ya establecida (flujo viejo con #access_token o deep link nativo).
      const { data } = await supabase.auth.getSession();
      if (active) setHasSession(!!data.session);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active && session) setHasSession(true);
    });
    return () => { active = false; subscription?.unsubscribe(); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) {
      setError('Debe incluir mayúscula, minúscula y número.'); return;
    }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    // No auto-entramos: el reset puede venir del navegador (Chrome/Safari) y la
    // clienta vuelve a la app a iniciar sesión. Mostramos un cierre claro con
    // botón a /login en vez de empujar a /portal (que rebotaría sin plan).
  };

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'url("/fotos-hero/_DSC0444.jpg")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.85) 100%)', backdropFilter: 'blur(8px)', zIndex: 0 }} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: '380px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', padding: '2rem 1.6rem', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <CheckCircle2 size={34} color="#16a34a" />
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: '#1A1C1E' }}>¡Contraseña actualizada!</h1>
              <p style={{ color: '#4B5563', marginTop: '6px', lineHeight: 1.5 }}>Ya puedes iniciar sesión con tu nueva contraseña. Si lo hiciste desde el navegador, vuelve a la app {ESTUDIO.nombre}.</p>
              <button onClick={() => navigate('/login')} className="glass-button-dark" style={{ width: '100%', marginTop: '1.4rem' }}>Iniciar sesión</button>
            </div>
          ) : hasSession === false ? (
            // La causa #1 de llegar aquí no es que el enlace expire por tiempo (dura
            // 1 h), sino que la clienta pidió OTRO enlace: Supabase invalida el
            // anterior al instante. Antes el texto no lo decía y ella creía que la
            // app estaba rota; ahora se le explica y se le da la salida en un paso.
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: '#1A1C1E', marginBottom: '0.5rem' }}>Este enlace ya no sirve</h1>
              <p style={{ color: '#4B5563', lineHeight: 1.55 }}>
                Casi siempre pasa por una razón sencilla: <strong>pediste el enlace más de una vez</strong>,
                y al llegar el nuevo el anterior dejó de funcionar.
              </p>
              <div style={{ background: 'rgba(255,145,77,0.12)', border: '1px solid rgba(255,145,77,0.35)', borderRadius: '12px', padding: '0.9rem 1rem', margin: '1rem 0 0', textAlign: 'left' }}>
                <p style={{ color: '#8A4A16', fontSize: '0.88rem', lineHeight: 1.55, margin: 0 }}>
                  Revisa tu correo y abre el <strong>más reciente</strong> que te mandamos.
                  Si ya no lo tienes, pide uno nuevo aquí abajo y usa solo ese.
                </p>
              </div>
              <p style={{ color: '#6B7280', fontSize: '0.82rem', lineHeight: 1.5, marginTop: '0.9rem' }}>
                También caduca si pasó más de una hora desde que lo pediste.
              </p>
              <button onClick={() => navigate('/login?recuperar=1')} className="glass-button-dark" style={{ width: '100%', marginTop: '1.2rem' }}>
                Pedir un enlace nuevo
              </button>
              <button onClick={() => navigate('/login')} style={{ width: '100%', marginTop: '0.7rem', background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', padding: '0.4rem' }}>
                Volver a iniciar sesión
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#1A1C1E', marginBottom: '0.4rem' }}>Nueva contraseña</h1>
                <p style={{ color: '#4B5563', fontWeight: 500 }}>Crea una contraseña segura para tu cuenta.</p>
              </div>

              {error && (
                <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '0.9rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.88rem', textAlign: 'center' }}>{error}</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="premium-input-group">
                  <label>Nueva contraseña</label>
                  <Lock size={20} className="premium-input-icon" />
                  <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="premium-input" style={{ paddingRight: '3rem' }} autoComplete="new-password" required />
                  <button type="button" onClick={() => setShow(v => !v)} style={{ position: 'absolute', right: '1rem', bottom: '13px', zIndex: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', opacity: 0.7, padding: 0, display: 'flex', alignItems: 'center' }} tabIndex={-1} aria-label="Mostrar contraseña">
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <div className="premium-input-group">
                  <label>Confirmar contraseña</label>
                  <Lock size={20} className="premium-input-icon" />
                  <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="premium-input" autoComplete="new-password" required />
                </div>

                <button type="submit" className="glass-button-dark" style={{ width: '100%', marginTop: '1.4rem' }} disabled={loading}>
                  {loading ? 'Guardando…' : 'Guardar contraseña'} <ArrowRight size={20} />
                </button>
              </form>
            </>
          )}

        </div>
      </motion.div>
    </div>
  );
}
