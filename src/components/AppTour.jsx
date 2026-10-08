import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { useAuth } from '../context/AuthContext';
import { hasNutritionAccess } from '../lib/plans';
import { User, Wallet, TrendingUp, Calendar, ChevronRight, ChevronLeft, Sparkles, Play, Utensils, Target, Award, Scale, Activity, QrCode, Coffee, Cake, Hand, Camera } from 'lucide-react';
import { ESTUDIO } from '../config/estudio';

// Marca el tour como visto en almacenamiento nativo (persiste entre lanzamientos)
const markTourSeen = (userId) => {
  if (!userId) return;
  const key = `befit_tour_seen_${userId}`;
  try { localStorage.setItem(key, 'true'); } catch (e) {}
  Preferences.set({ key, value: 'true' });
};

// Cada paso: si tiene `requireClick`, la usuaria debe tocar el elemento resaltado
// (aprender haciendo). Pero NUNCA se atasca: a los pocos segundos aparece un botón
// "Continuar" de rescate (ver `FALLBACK_MS`).
const TOUR_STEPS = [
  {
    icon: <img src="/favicon_peach.png" style={{ width: '65px', height: '65px', objectFit: 'contain' }} alt={ESTUDIO.nombre} />,
    title: '¡Te damos la bienvenida! 🎉',
    description: 'Te llevamos de la mano por tu nueva app. Vas a tocar tú misma cada cosa para que te quede clarísimo. ¿Listas?',
    selector: null,
  },
  {
    icon: <Wallet size={38} color="var(--primary)" />,
    title: 'Tu membresía',
    description: 'Aquí ves tu plan, cuántas clases te quedan y puedes renovar cuando quieras.',
    selector: '.dashboard-sidebar > div:first-child',
  },
  {
    icon: <Coffee size={38} color="var(--primary)" />,
    title: `${ESTUDIO.nombreCafeteria} ☕`,
    description: 'Pide café, smoothies y snacks desde la app y págalos con un toque. ¡Pásalos a recoger!',
    selector: '[data-tour="explora-cafeteria"]',
  },
  {
    icon: <Sparkles size={38} color="var(--primary)" />,
    title: 'Eventos',
    description: 'Entérate de nuestras próximas experiencias y reserva tu lugar.',
    selector: '[data-tour="explora-eventos"]',
  },
  {
    icon: <Cake size={38} color="var(--primary)" />,
    title: 'Cumpleaños 🎂',
    description: 'Tu cuenta regresiva de cumpleaños y el calendario de toda la tribu.',
    selector: '[data-tour="explora-cumpleanos"]',
  },
  {
    icon: <TrendingUp size={38} color="var(--primary)" />,
    title: 'Tu semana',
    description: 'Un resumen de tu actividad: clases de la semana, calorías y tus puntos (ganas 10 por clase).',
    selector: '#tour-tu-semana',
  },
  {
    icon: <Calendar size={38} color="var(--primary)" />,
    title: 'Reserva tu primera clase',
    description: 'Toca aquí para ir a la agenda y asegurar tu lugar.',
    selector: '#tour-proximas-clases',
    requireClick: true,
    targetSelector: '.tour-agendar-btn',
    advanceOnPath: '/agenda',
    position: 'top',
  },
  {
    icon: <Calendar size={38} color="var(--primary)" />,
    title: 'Elige un día',
    description: 'Toca cualquier día con clases disponibles (los que tienen punto naranja).',
    selector: '.tour-calendar-day',
    requireClick: true,
    advanceOnEvent: 'click',
    targetSelector: '.tour-calendar-day',
    position: 'top',
  },
  {
    icon: <Play size={38} color="var(--primary)" />,
    title: 'Reserva tu lugar',
    description: 'Toca una clase para ver sus detalles, a tu coach y confirmar.',
    selector: '.tour-class-card',
    requireClick: true,
    advanceOnEvent: 'click',
    targetSelector: '.tour-class-card',
    position: 'top',
  },
  {
    icon: <Sparkles size={38} color="var(--primary)" />,
    title: '¡Aquí confirmas!',
    description: 'Esta es la ficha de la clase. Por ahora toca "Volver" para cerrar y seguir el recorrido.',
    selector: '.qr-bottom-sheet .btn-outline',
    requireClick: true,
    targetSelector: '.qr-bottom-sheet .btn-outline',
    advanceSelector: '.qr-bottom-sheet .btn-outline',
    advanceOnEvent: 'click',
    position: 'top',
  },
  {
    nutrition: true,
    icon: <Utensils size={38} color="var(--primary)" />,
    title: 'Comida 🥗',
    description: 'Toca la pestaña "Comida" para ver tu recetario saludable.',
    selector: '.ios-bottom-nav a[href="/nutricion"]',
    requireClick: true,
    targetSelector: '.ios-bottom-nav a[href="/nutricion"]',
    advanceOnPath: '/nutricion',
  },
  {
    nutrition: true,
    icon: <Utensils size={38} color="var(--primary)" />,
    title: 'Tu recetario',
    description: 'Recetas seleccionadas para complementar tu entrenamiento. ¡Cocinar sano nunca fue tan fácil!',
    selector: '#tour-recetario',
  },
  {
    icon: <TrendingUp size={38} color="var(--primary)" />,
    title: 'Metas 📈',
    description: 'Toca la pestaña "Metas" para ver tu progreso, fotos e insignias.',
    selector: '.ios-bottom-nav a[href="/evolucion"]',
    requireClick: true,
    targetSelector: '.ios-bottom-nav a[href="/evolucion"]',
    advanceOnPath: '/evolucion',
  },
  {
    icon: <Target size={38} color="var(--primary)" />,
    title: 'Define tu meta',
    description: 'Toca el aro para elegir cuántas clases quieres tomar al mes. Tu Score se calcula con esta meta.',
    selector: '.tour-score-section',
    requireClick: true,
    advanceOnEvent: 'click',
    targetSelector: '.tour-score-section',
  },
  {
    icon: <Target size={38} color="var(--primary)" />,
    title: 'Guarda tu meta',
    description: 'Escribe el número de clases y dale a "Guardar".',
    selector: '.goal-modal',
    requireClick: true,
    targetSelector: '.goal-modal',
    advanceSelector: '.goal-modal button',
    advanceOnEvent: 'click',
    position: 'top',
  },
  {
    icon: <User size={38} color="var(--primary)" />,
    title: 'Tus fotos',
    description: 'Toca la pestaña "Fotos" para llevar el registro visual de tus cambios.',
    selector: '.tour-subtab-fotos',
    requireClick: true,
    advanceOnEvent: 'click',
    targetSelector: '.tour-subtab-fotos',
  },
  {
    icon: <Camera size={38} color="var(--primary)" />,
    title: 'Progreso visual',
    description: 'Aquí podrás tomarte fotos cada 6 semanas con nuestra guía inteligente.',
    selector: '.tour-progress-photos-btn',
    position: 'bottom',
  },
  {
    icon: <Award size={38} color="var(--primary)" />,
    title: 'Ve a tus insignias',
    description: 'Toca la pestaña "Insignias" aquí arriba para ver tus logros.',
    selector: '.tour-subtab-insignias',
    requireClick: true,
    advanceOnEvent: 'click',
    targetSelector: '.tour-subtab-insignias',
  },
  {
    icon: <Award size={38} color="var(--primary)" />,
    title: 'Tus insignias',
    description: 'Gánalas con tu constancia. ¡Colecciónalas todas!',
    selector: '.tour-badges-section',
  },
  {
    icon: <TrendingUp size={38} color="var(--primary)" />,
    title: 'Volver a Resumen',
    description: 'Toca la pestaña "Resumen" para ver tus métricas de salud.',
    selector: '.tour-subtab-resumen',
    requireClick: true,
    advanceOnEvent: 'click',
    targetSelector: '.tour-subtab-resumen',
  },
  {
    icon: <Scale size={38} color="var(--primary)" />,
    title: 'Tu composición',
    description: 'Con tu báscula inteligente verás aquí tu peso, % de grasa y músculo.',
    selector: '.tour-body-composition',
    position: 'top',
  },
  {
    icon: <Activity size={38} color="var(--primary)" />,
    title: 'Tu actividad',
    description: 'Aquí podrás ver cuántas clases has tomado durante la semana.',
    selector: '.tour-weekly-activity',
    position: 'top',
  },
  {
    icon: <QrCode size={38} color="var(--primary)" />,
    title: 'Tu pase QR',
    description: 'Toca el botón del centro para abrir tu código QR. Lo escaneas al llegar al estudio.',
    selector: '.nav-qr-button',
    requireClick: true,
    advanceOnEvent: 'click',
    targetSelector: '.nav-qr-button',
  },
  {
    icon: <QrCode size={38} color="var(--primary)" />,
    title: 'Ciérralo',
    description: 'Toca fuera de la tarjeta para cerrar tu pase.',
    selector: '.qr-sheet-overlay',
    requireClick: true,
    advanceOnEvent: 'click',
    targetSelector: '.qr-sheet-overlay',
    position: 'top',
  },
  {
    icon: <User size={38} color="var(--primary)" />,
    title: '¡Listo! 🎉',
    description: 'Eso es todo. En la pestaña "Yo" siempre tienes tu membresía, historial y ajustes. ¡Disfruta tu app!',
    selector: '.ios-bottom-nav a[href="/portal"]',
    requireClick: true,
    targetSelector: '.ios-bottom-nav a[href="/portal"]',
    advanceOnPath: '/portal',
  },
];

const FALLBACK_MS = 3500; // tras esto, en pasos de clic aparece "Continuar" (anti-atasco)

export function AppTour() {
  const { showTour, setShowTour, user, plan } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [showFallback, setShowFallback] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const fallbackTimer = useRef(null);

  // Los planes sin acceso a Nutrición no ven los pasos del recetario.
  const steps = hasNutritionAccess(plan) ? TOUR_STEPS : TOUR_STEPS.filter(s => !s.nutrition);

  const isInternalRoute = ['/portal', '/evolucion', '/agenda', '/nutricion', '/mi-cuenta'].includes(location.pathname);

  const stepData = steps[currentStep];

  // Posiciona el spotlight sobre el elemento del paso
  useEffect(() => {
    if (!showTour || !isInternalRoute) return;
    const step = steps[currentStep];
    if (!step || !step.selector) { setTargetRect(null); return; }

    const updateRect = () => {
      const el = document.querySelector(step.selector);
      setTargetRect(el ? el.getBoundingClientRect() : null);
    };
    const el = document.querySelector(step.selector);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateRect();
    const t1 = setTimeout(updateRect, 300);
    const t2 = setTimeout(updateRect, 700);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [currentStep, showTour, isInternalRoute, location.pathname]);

  // Anti-atasco: en pasos que requieren clic, muestra "Continuar" tras unos segundos
  useEffect(() => {
    setShowFallback(false);
    if (!showTour) return;
    const step = steps[currentStep];
    if (!step?.requireClick) return;
    clearTimeout(fallbackTimer.current);
    fallbackTimer.current = setTimeout(() => setShowFallback(true), FALLBACK_MS);
    return () => clearTimeout(fallbackTimer.current);
  }, [currentStep, showTour]);

  // Avance por cambio de ruta (pasos de navegación)
  useEffect(() => {
    if (!showTour) return;
    const step = steps[currentStep];
    if (step?.advanceOnPath && location.pathname === step.advanceOnPath) {
      setCurrentStep(prev => prev + 1);
    }
  }, [location.pathname, showTour, currentStep]);

  // Avance por clic en el elemento objetivo (y bloqueo de clics fuera)
  useEffect(() => {
    if (!showTour || !isInternalRoute) return;
    const step = steps[currentStep];
    if (!step) return;

    const handleClick = (e) => {
      if (e.target.closest('#tour-modal-card')) return; // dentro del modal: permitir

      if (step.requireClick && step.targetSelector) {
        const el = e.target.closest(step.targetSelector);
        if (el) {
          if (step.advanceOnEvent === 'click') {
            const advEl = step.advanceSelector ? e.target.closest(step.advanceSelector) : el;
            if (advEl) setTimeout(() => advance(), 150);
          }
          return; // deja pasar el clic
        }
      }
      e.stopPropagation();
      e.preventDefault();
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [currentStep, showTour, isInternalRoute, user, setShowTour]);

  if (!showTour || !isInternalRoute || !stepData) return null;

  const advance = () => {
    if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1);
    else handleClose();
  };

  // "Continuar" de rescate: si el paso navegaba a otra pestaña, navega también.
  // Si requería un clic para abrir un modal/pestaña, simulamos el clic para que la UI responda.
  const handleFallback = () => {
    if (stepData.advanceOnPath && location.pathname !== stepData.advanceOnPath) {
      navigate(stepData.advanceOnPath);
    } else if (stepData.requireClick && stepData.targetSelector) {
      const el = document.querySelector(stepData.targetSelector);
      if (el) {
        // Simulamos el clic para abrir el modal, bottom sheet o menú
        el.click();
      }
    }
    
    // Damos un pequeño respiro (250ms) para que el modal/animación empiece antes de avanzar el paso del tour
    setTimeout(() => {
      advance();
    }, 250);
  };

  const handleBack = () => { if (currentStep > 0) setCurrentStep(prev => prev - 1); };

  const handleClose = () => {
    setShowTour(false);
    setCurrentStep(0);
    markTourSeen(user?.id);
  };

  const isBottomHalf = targetRect && targetRect.top > window.innerHeight / 2;

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1, scale: 1, y: 0, x: '-50%', left: '50%',
      top: stepData?.position === 'top' ? '10%'
        : stepData?.position === 'bottom' ? '92%'
        : (targetRect ? (isBottomHalf ? targetRect.top - 20 : targetRect.bottom + 20) : '50%'),
      translateY: stepData?.position === 'top' ? '0%'
        : stepData?.position === 'bottom' ? '-100%'
        : (targetRect ? (isBottomHalf ? '-100%' : '0%') : '-50%'),
    },
    exit: { opacity: 0, scale: 0.9, y: 20 },
  };

  // "Toca aquí" flotante sobre el objetivo (en pasos de clic)
  const showHint = stepData.requireClick && targetRect;

  return (
    <AnimatePresence>
      {showTour && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999998, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', zIndex: 0 }} />

          {/* Spotlight (cutout) */}
          <motion.div
            initial={false}
            animate={{
              x: targetRect ? targetRect.left - 10 : window.innerWidth / 2,
              y: targetRect ? targetRect.top - 10 : window.innerHeight / 2,
              width: targetRect ? targetRect.width + 20 : 0,
              height: targetRect ? targetRect.height + 20 : 0,
              borderRadius: targetRect ? 24 : 0,
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ position: 'absolute', top: 0, left: 0, boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)', pointerEvents: 'none', zIndex: 1 }}
          />

          {/* Anillo pulsante alrededor del objetivo (pasos de clic) */}
          {showHint && (
            <motion.div
              initial={false}
              animate={{ left: targetRect.left - 6, top: targetRect.top - 6, width: targetRect.width + 12, height: targetRect.height + 12 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'absolute', borderRadius: 26, zIndex: 2, pointerEvents: 'none' }}
            >
              <motion.div
                animate={{ boxShadow: ['0 0 0 0 rgba(255,145,77,0.55)', '0 0 0 12px rgba(255,145,77,0)'] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0, borderRadius: 26, border: '2.5px solid var(--primary)' }}
              />
            </motion.div>
          )}

          {/* Badge "Toca aquí 👆" */}
          {showHint && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: [0, -5, 0] }}
              transition={{ y: { duration: 1.3, repeat: Infinity }, opacity: { duration: 0.3 } }}
              style={{
                position: 'absolute', zIndex: 5, pointerEvents: 'none',
                left: Math.min(Math.max(targetRect.left + targetRect.width / 2, 70), window.innerWidth - 70),
                top: isBottomHalf ? targetRect.top - 44 : targetRect.bottom + 12,
                transform: 'translateX(-50%)',
                background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: '0.8rem',
                padding: '7px 14px', borderRadius: '999px', boxShadow: '0 8px 20px rgba(255,145,77,0.45)',
                display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
              }}
            >
              <Hand size={15} /> Toca aquí
            </motion.div>
          )}

          {/* Tarjeta del tour */}
          <motion.div
            id="tour-modal-card" key="tour-card"
            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
            style={{
              position: 'absolute', zIndex: 4, pointerEvents: 'auto',
              background: 'rgba(255,255,255,0.97)', borderRadius: '32px', padding: '26px 22px 20px',
              width: '90%', maxWidth: '340px', textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,1)',
            }}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', delay: 0.1 }}
              style={{ width: '78px', height: '78px', margin: '0 auto 18px', borderRadius: '50%', background: 'rgba(255,139,66,0.1)', border: '2px solid rgba(255,139,66,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(255,139,66,0.2)' }}
            >
              {stepData.icon}
            </motion.div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', margin: '0 0 10px', color: 'var(--black)' }}>{stepData.title}</h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, margin: '0 0 22px' }}>{stepData.description}</p>

            {/* Botón principal: pasos informativos siempre; pasos de clic solo como rescate */}
            {(!stepData.requireClick || showFallback) && (
              <button
                onClick={stepData.requireClick ? handleFallback : advance}
                style={{ width: '100%', padding: '15px', borderRadius: '18px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(255,139,66,0.3)' }}
              >
                {stepData.requireClick ? 'Continuar sin hacerlo' : (currentStep === steps.length - 1 ? '¡Comenzar!' : 'Siguiente')}
                {(!stepData.requireClick && currentStep < steps.length - 1) && <ChevronRight size={20} />}
              </button>
            )}

            {/* Progreso */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '18px' }}>
              {steps.map((_, i) => (
                <div key={i} style={{ width: i === currentStep ? '18px' : '6px', height: '6px', borderRadius: '3px', background: i === currentStep ? 'var(--primary)' : 'rgba(0,0,0,0.1)', transition: 'all 0.3s ease' }} />
              ))}
            </div>

            {/* Atrás · Saltar (siempre disponibles para no atascarse) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', marginTop: '14px' }}>
              {currentStep > 0 && (
                <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <ChevronLeft size={16} /> Atrás
                </button>
              )}
              <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                Saltar tutorial
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
