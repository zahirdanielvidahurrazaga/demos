import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ESTUDIO } from '../config/estudio';

function Welcome() {
  const navigate = useNavigate();
  const { user, membershipStatus, profileName } = useAuth();
  const [phase, setPhase] = useState('splash'); // 'splash' -> 'welcome' | 'ready' | 'exiting'

  // ¿Venimos de confirmar el correo (deep link)? La bandera la pone el handler
  // del deep link antes de mandarnos aquí. La leemos UNA vez y la limpiamos.
  const [justConfirmed] = useState(() => {
    try {
      const v = sessionStorage.getItem('befit_just_confirmed') === '1';
      if (v) sessionStorage.removeItem('befit_just_confirmed');
      return v;
    } catch (e) { return false; }
  });

  // Último estado de membresía sin re-armar el timer del splash en cada cambio.
  const statusRef = useRef(membershipStatus);
  useEffect(() => { statusRef.current = membershipStatus; }, [membershipStatus]);

  // Forzar modo claro
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  // Tras el splash (2.5s) decide a dónde ir:
  // - Sin sesión → bienvenida (crear cuenta / iniciar sesión).
  // - Con sesión y plan ACTIVO → entra directo al portal (UX de siempre).
  // - Con sesión SIN plan (recién registrada) → pantalla "lista" con un botón
  //   manual. Así NO la mandamos automáticamente a /planes durante la ventana
  //   volátil posterior al deep link de confirmación, que hacía "temblar" esa
  //   pantalla. Cuando ella toca "Entrar", la sesión ya está asentada.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        if (statusRef.current === 'ACTIVE') {
          setPhase('exiting');
          setTimeout(() => navigate('/portal', { replace: true }), 400);
        } else {
          setPhase('ready');
        }
      } else if (justConfirmed) {
        // Acabamos de confirmar el correo: aunque la sesión tarde un instante en
        // asentarse en nativo, mostramos la pantalla "lista" (NO los botones de
        // registro). Si por algo la sesión no llega, "Entrar" la manda a login.
        setPhase('ready');
      } else {
        setPhase('welcome');
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [user, justConfirmed, navigate]);

  // Respaldo: si el plan se activa mientras está en la pantalla "lista" (red
  // lenta / plan comprado antes de registrarse), entra sola para conservar la
  // UX fluida de las clientas con plan.
  useEffect(() => {
    if (phase !== 'ready' || membershipStatus !== 'ACTIVE') return;
    setPhase('exiting');
    const t = setTimeout(() => navigate('/portal', { replace: true }), 400);
    return () => clearTimeout(t);
  }, [phase, membershipStatus, navigate]);

  const handleStart = () => {
    setPhase('exiting');
    setTimeout(() => navigate('/login'), 500);
  };

  // Con sesión → su perfil. Si la sesión no alcanzó a asentarse (raro), a login;
  // el correo YA quedó confirmado, así que podrá entrar normalmente.
  const handleEnter = () => {
    setPhase('exiting');
    setTimeout(() => navigate(user ? '/portal' : '/login', { replace: true }), 500);
  };

  const firstName = (profileName || user?.user_metadata?.full_name || '').trim().split(' ')[0];

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100dvh', overflow: 'hidden', backgroundColor: '#050505' }}>

      {/* ===== FONDO: Imagen Ultra-HD (siempre presente, opacity controlada) ===== */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/fotos-hero/welcome.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 1,
        transform: phase === 'splash' ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 3.5s ease-out',
        zIndex: 1
      }}>
        {/* Gradiente oscuro sofisticado */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.85) 100%)',
          opacity: phase === 'splash' ? 0 : 1,
          transition: 'opacity 1.5s ease-in-out'
        }} />
      </div>

      {/* ===== SPLASH: Fondo negro + Logo oficial ===== */}
      <AnimatePresence>
        {phase === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(15px)' }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(30px) saturate(150%)',
              WebkitBackdropFilter: 'blur(30px) saturate(150%)',
              zIndex: 10
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ textAlign: 'center' }}
            >
              <img
                src={ESTUDIO.marca.logo}
                alt={ESTUDIO.nombre}
                style={{ width: '280px', height: 'auto', display: 'block', margin: '0 auto' }}
              />
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '50px', opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.6 }}
                style={{
                  height: '1.5px', margin: '20px auto 0',
                  background: 'linear-gradient(90deg, transparent, rgba(255,145,77,0.6), transparent)',
                  borderRadius: '2px'
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== WELCOME: Textos + botón glassmorphism ===== */}
      <AnimatePresence>
        {phase === 'welcome' && (
          <motion.div
            key="welcome-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '0 32px 50px',
              paddingBottom: 'max(50px, env(safe-area-inset-bottom, 50px))',
              zIndex: 5
            }}
          >
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              style={{
                fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.6)',
                letterSpacing: '5px', fontSize: '0.85rem', fontWeight: 400, margin: 0,
                textTransform: 'uppercase'
              }}
            >{ESTUDIO.nombreMayusculas}</motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{
                fontFamily: "'Playfair Display', serif", color: 'white',
                fontSize: '3.5rem', lineHeight: 1.05, margin: '10px 0', fontWeight: 400
              }}
            >
              Eleva tu<br/>
              <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>estándar.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{
                color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem',
                lineHeight: 1.6, margin: '8px 0 28px', fontWeight: 400
              }}
            >
              Comenzar es más de la mitad del camino.
            </motion.p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                onClick={() => { setPhase('exiting'); setTimeout(() => navigate('/registro'), 500); }}
                style={{
                  width: '100%', padding: '18px', borderRadius: '50px',
                  border: 'none',
                  background: '#FF8B42', color: 'white',
                  fontSize: '1rem', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.3s',
                  fontFamily: 'var(--font-body)',
                  boxShadow: '0 8px 20px rgba(255,139,66,0.4)',
                  letterSpacing: '0.5px'
                }}
              >
                Crear Cuenta
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                onClick={() => { setPhase('exiting'); setTimeout(() => navigate('/login'), 500); }}
                style={{
                  width: '100%', padding: '18px', borderRadius: '50px',
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.08)', color: 'white',
                  fontSize: '1rem', fontWeight: 600,
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  cursor: 'pointer', transition: 'all 0.3s',
                  fontFamily: 'var(--font-body)',
                  boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
                  letterSpacing: '0.5px'
                }}
              >
                Iniciar Sesión
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== READY: ya con sesión pero sin plan → entra manualmente ===== */}
      <AnimatePresence>
        {phase === 'ready' && (
          <motion.div
            key="ready-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '0 32px 50px',
              paddingBottom: 'max(50px, env(safe-area-inset-bottom, 50px))',
              zIndex: 5
            }}
          >
            {justConfirmed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: '7px', background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(74,222,128,0.5)', color: '#fff', padding: '7px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '14px', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
              >
                <Check size={15} color="#4ADE80" /> Correo confirmado
              </motion.div>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
              style={{ fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.6)', letterSpacing: '5px', fontSize: '0.85rem', fontWeight: 400, margin: 0, textTransform: 'uppercase' }}
            >{ESTUDIO.nombreMayusculas}</motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
              style={{ fontFamily: "'Playfair Display', serif", color: 'white', fontSize: '3rem', lineHeight: 1.05, margin: '10px 0', fontWeight: 400 }}
            >
              {firstName
                ? <>Hola,<br/><span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>{firstName}.</span></>
                : <>Tu cuenta<br/><span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>está lista.</span></>}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
              style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', lineHeight: 1.6, margin: '8px 0 28px', fontWeight: 400 }}
            >
              Tu cuenta ya está activa. Entra a tu perfil para elegir tu plan y empezar a reservar.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
              onClick={handleEnter}
              style={{
                width: '100%', padding: '18px', borderRadius: '50px',
                border: 'none', background: '#FF8B42', color: 'white',
                fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                boxShadow: '0 8px 20px rgba(255,139,66,0.4)', letterSpacing: '0.5px'
              }}
            >
              Entrar a mi perfil
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== EXIT: Fade suave cuando navega a login ===== */}
      <AnimatePresence>
        {phase === 'exiting' && (
          <motion.div
            key="exit-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45 }}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              zIndex: 20
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default Welcome;
