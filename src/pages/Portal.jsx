import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Utensils, TrendingUp, User, QrCode, ChevronRight, Activity, Flame, Sparkles, Clock, MapPin, X, Lock, Wallet, Coffee, Cake, PartyPopper, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useHealth } from '../hooks/useHealth';
import { getNextClassOccurrence, classDateTime } from '../hooks/useLocalNotifications';
import { addToAppleWallet, addToGoogleWallet, getWalletPlatform } from '../hooks/useWallet';
import { QRCodeCanvas } from 'qrcode.react';
import { motion } from 'framer-motion';
import { useScrollDetect } from '../hooks/useScrollDetect';
import { Capacitor } from '@capacitor/core';
import ProfileMenu from '../components/ProfileMenu';
import MisClasesMovimientos from '../components/MisClasesMovimientos';
import { hasNutritionAccess } from '../lib/plans';
import { ESTUDIO, moduloActivo } from '../config/estudio';
import { crearIrA } from '../demo/navegacionDemo';

// Por qué no se pudo cancelar. Quien decide es la BD (cancel_class_secure);
// aquí solo se traduce el motivo para la clienta.
const CANCEL_ERROR_TEXT = {
  too_late: 'Ya no es posible cancelar esta clase — faltan menos de 5 horas para que inicie.',
  past: 'Esta clase ya ocurrió. No se puede cancelar ni se devuelve a tu paquete.',
  attended: 'Ya registraste tu asistencia a esta clase, así que no se puede cancelar.',
  unknown_class: 'No encontramos el horario de esta clase. Cierra la app, vuelve a abrirla e inténtalo de nuevo.',
  error: 'No se pudo cancelar la clase. Revisa tu conexión e inténtalo de nuevo.',
};

function Portal() {
  const isNative = Capacitor.isNativePlatform();
  const navigate = useNavigate();
  const { user, plan, logout, classesRemaining, myReservations, waitlistPositions, cancelClass, acceptOffer, profileName, globalClasses, avatarUrl, setShowTour, coaches, badgeConfigs, classesLoaded, demoHistorial, esDemo } = useAuth();
  // Dentro de la maqueta, navegar a una ruta real sacaría a la prospecta.
  const irA = crearIrA(navigate, esDemo);
  
  const walletPlatform = getWalletPlatform();
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletAdded, setWalletAdded] = useState(() => !!localStorage.getItem('befit_wallet_added'));
  const [walletError, setWalletError] = useState(null);

  const handleAddToWallet = async () => {
    if (!user?.id || walletLoading) return;
    setWalletLoading(true);
    setWalletError(null);
    const result = walletPlatform === 'google'
      ? await addToGoogleWallet(user.id)
      : await addToAppleWallet(user.id);
    setWalletLoading(false);
    if (result.success) {
      setWalletAdded(true);
      localStorage.setItem('befit_wallet_added', '1');
    } else {
      setWalletError(result.reason || 'Error desconocido');
    }
  };

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [cancelError, setCancelError] = useState(false);
  const [showAppBanner, setShowAppBanner] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  // Candado anti doble toque en "Cancelar Clase" (mismo motivo que el de
  // "Reservar" en Agenda): el ref frena el segundo toque en el mismo tick, el
  // estado deshabilita el botón y muestra "Cancelando…".
  const cancelandoRef = useRef(false);
  const [cancelando, setCancelando] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [verMovimientos, setVerMovimientos] = useState(false);
  // Filtro de "Próximas clases": 'hoy' (solo las de hoy) | 'todas'. Arranca en
  // "Hoy" si tienes clase hoy (para no confundirte con las de otros días).
  const [classFilter, setClassFilter] = useState('todas');
  const filterInitRef = useRef(false);
  const isScrolled = useScrollDetect(30);

  const handleCancelClick = (res) => {
    setSelectedReservation(res);
    setShowCancelModal(true);
  };

  const confirmCancellation = async () => {
    if (!selectedReservation) return;
    if (cancelandoRef.current) return; // ya hay una cancelación en vuelo
    cancelandoRef.current = true;
    setCancelando(true);
    try {
      const result = await cancelClass(selectedReservation.classId);
      if (!result?.success) {
        setCancelError(result?.reason || 'error');
        return; // Mantener el modal abierto con el motivo
      }
      setCancelError(false);
      setShowCancelModal(false);
    } finally {
      cancelandoRef.current = false;
      setCancelando(false);
    }
  };

  // Fecha+hora real de la clase de una reserva. La fecha y la hora viajan EN LA
  // RESERVA (fetchUserData une classes(*)); globalClasses es solo respaldo.
  // 🔴 Antes se buscaba SOLO en globalClasses, que para una clienta trae 10 días
  // atrás (arreglo de egress del 16-ago): toda reserva más vieja quedaba "sin
  // fecha", y sin fecha se pintaba como PRÓXIMA y cancelable. Eran clases a las
  // que YA FUE → "el sistema me reservó clases solas" → las cancelaban → +1 cada
  // una (2-sep-2026: 84 clases devueltas por error a 9 clientas).
  const reservationClassDate = (res) => {
    const c = globalClasses?.find(cl => cl.id === res.classId);
    const date = res.date ?? c?.date ?? null;
    const time = res.time ?? c?.time ?? null;
    if (date && time) return classDateTime(date, time);
    if (c && c.day !== undefined && time) return getNextClassOccurrence(c.day, time);
    return null;
  };

  // Se puede cancelar si faltan MÁS de 5 h para la clase. Usa la FECHA REAL de la
  // clase (reservationClassDate); antes calculaba por día de semana y bloqueaba
  // por error las clases de semanas futuras. De la LISTA DE ESPERA se puede salir
  // en cualquier momento (no hay lugar que proteger ni clase cobrada).
  const canCancelReservation = (res) => {
    // De la espera o de una oferta pendiente se sale en cualquier momento (no
    // hay lugar cobrado que proteger).
    if (res?.status === 'waitlist' || res?.status === 'offered') return true;
    const classStart = reservationClassDate(res);
    // Sin fecha conocida NO se cancela (antes era `true`: cualquier reserva cuya
    // clase no estuviera cargada se podía cancelar y devolver).
    if (!classStart) return false;
    const fiveHoursBefore = new Date(classStart.getTime() - 5 * 60 * 60 * 1000);
    return new Date() < fiveHoursBefore;
  };

  // ¿La reserva abierta en el modal es de lista de espera? (mensajería distinta).
  const cancellingWaitlist = selectedReservation?.status === 'waitlist' || selectedReservation?.status === 'offered';

  // "en 22 min" / "en 5 h" / "en 3 días"
  const formatCountdown = (date) => {
    if (!date) return null;
    const ms = date.getTime() - Date.now();
    if (ms <= 0) return 'Ahora';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `en ${mins} min`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `en ${hrs} h`;
    const days = Math.round(hrs / 24);
    return `en ${days} ${days === 1 ? 'día' : 'días'}`;
  };

  // Próximas clases: ocultar las que ya pasaron + ordenar por más cercana.
  const upcomingReservations = (myReservations || [])
    .map(res => ({ res, classObj: globalClasses?.find(c => c.id === res.classId), classDate: reservationClassDate(res) }))
    // Sin fecha conocida no es "próxima": se oculta en vez de inventarle futuro.
    .filter(({ classDate }) => classDate && classDate.getTime() >= Date.now())
    .sort((a, b) => (a.classDate?.getTime() || Infinity) - (b.classDate?.getTime() || Infinity));

  // ¿La clase es HOY? (mismo día local del dispositivo).
  const isTodayLocal = (d) => {
    if (!d) return false;
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  };
  const todaysUpcoming = upcomingReservations.filter(({ classDate }) => isTodayLocal(classDate));
  // Lista mostrada según el filtro; en "Hoy" solo las de hoy.
  const displayedReservations = classFilter === 'hoy' ? todaysUpcoming : upcomingReservations;

  // Al cargar las clases por primera vez, arranca en "Hoy" si hay clase hoy.
  useEffect(() => {
    if (filterInitRef.current || !classesLoaded) return;
    filterInitRef.current = true;
    setClassFilter(todaysUpcoming.length > 0 ? 'hoy' : 'todas');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classesLoaded]);

  // Etiqueta de fecha para cada ticket: "Hoy" / "Mañana" / "jue 16 jul".
  const dateChipLabel = (date) => {
    if (!date) return null;
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startClass = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startClass - startToday) / 86400000);
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Tarjetas de "Explora": solo las de módulos contratados. Se calculan aquí
  // para poder ocultar el encabezado también cuando no queda ninguna — si no,
  // queda un título "Explora" suelto sobre un hueco.
  const tarjetasExplora = [
    { modulo: 'cafeteria', to: '/cafeteria', img: ESTUDIO.portadas.cafeteria, Icon: Coffee, title: ESTUDIO.nombreCafeteria, sub: 'Café & smoothies', overlay: 'linear-gradient(160deg, rgba(60,30,15,0.18) 0%, rgba(35,18,8,0.74) 100%)' },
    { modulo: 'cumpleanos', to: '/cumpleanos', img: ESTUDIO.portadas.cumpleanos, Icon: Cake, title: 'Cumpleaños', sub: 'Tu cuenta regresiva', overlay: 'linear-gradient(160deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)' },
    { modulo: 'eventos', to: '/eventos', img: ESTUDIO.portadas.eventos, Icon: Sparkles, title: 'Eventos', sub: 'Próximas experiencias', overlay: 'linear-gradient(160deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)' },
  ].filter(c => moduloActivo(c.modulo));

  const rawName = profileName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Cliente';
  const userName = rawName.split(' ')[0]; // Solo el primer nombre para el saludo

  // ── Resumen "Tu semana" (datos reales) ──────────────────────────────────
  const { healthData, fetchTodayData } = useHealth();
  const [history, setHistory] = useState(null); // reservas con check-in (asistidas)
  // En modo demo el historial viene de la semilla. Se resuelve aquí y no con
  // un setState dentro del efecto, que dispararía renders en cascada.
  const historial = demoHistorial ?? history;
  useEffect(() => {
    if (!user) return;
    // Traemos la FECHA REAL de la clase (classes.date) — la barra debe reflejar
    // el día en que se ASISTIÓ, no el día en que se reservó (created_at).
    // En la maqueta de venta el historial ya viene sembrado en memoria, así que
    // no hay nada que pedir: pegarle a Supabase con un id inventado devolvería
    // vacío y la gráfica "Tu semana" saldría en ceros, que es justo lo que no se
    // quiere enseñar en una junta.
    if (demoHistorial) return;
    supabase.from('reservations').select('created_at, classes(date)').eq('user_id', user.id).eq('checked_in', true)
      .then(({ data }) => setHistory(data || []));
    fetchTodayData(); // salud de hoy si ya está conectada (no pide permiso)
  }, [user]);

  const weekStats = (() => {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // 0 = lunes
    const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(now.getDate() - dow);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 7); // exclusivo

    // Día real de la clase asistida: la fecha de la clase (classes.date). Si por
    // ser una clase recurrente vieja no tuviera fecha, cae a created_at.
    const attendedDate = (h) => {
      const cd = h.classes?.date;
      if (cd) { const d = new Date(cd + 'T00:00:00'); if (!isNaN(d.getTime())) return d; }
      return new Date(h.created_at);
    };
    // Lunes de la semana de una fecha (para la racha).
    const weekStart = (d) => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m.getTime(); };

    // Asistidas (check-in) por día de ESTA semana + set de semanas con asistencia.
    const attendedPerDay = [0, 0, 0, 0, 0, 0, 0];
    const attendedWeeks = new Set();
    (historial || []).forEach(h => {
      const d = attendedDate(h);
      attendedWeeks.add(weekStart(d));
      if (d >= monday && d < sunday) attendedPerDay[(d.getDay() + 6) % 7]++;
    });

    // Reservadas de ESTA semana aún NO asistidas (barra "fantasma"): solo clases
    // con fecha fija y no en lista de espera.
    const reservedPerDay = [0, 0, 0, 0, 0, 0, 0];
    (myReservations || []).forEach(r => {
      if (r.checkedIn || r.status === 'waitlist' || r.status === 'offered') return;
      const c = globalClasses?.find(cl => cl.id === r.classId);
      if (!c?.date) return;
      const d = new Date(c.date + 'T00:00:00');
      if (isNaN(d.getTime()) || d < monday || d >= sunday) return;
      reservedPerDay[(d.getDay() + 6) % 7]++;
    });

    const perDayTotal = attendedPerDay.map((a, i) => a + reservedPerDay[i]);
    const weekCount = attendedPerDay.reduce((a, b) => a + b, 0);     // asistidas esta semana
    const reservedCount = reservedPerDay.reduce((a, b) => a + b, 0); // reservadas próximas
    const total = (historial || []).length;                           // asistidas histórico

    // Racha: semanas consecutivas con ≥1 asistida, terminando en esta o la pasada
    // (no se rompe si la semana en curso aún no tiene clase).
    let racha = 0;
    const cursor = new Date(monday);
    if (!attendedWeeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
    while (attendedWeeks.has(cursor.getTime())) { racha++; cursor.setDate(cursor.getDate() - 7); }

    return {
      attendedPerDay, reservedPerDay, perDayTotal,
      weekCount, reservedCount, total, points: total * 10, racha,
      todayIdx: dow, maxDay: Math.max(1, ...perDayTotal),
    };
  })();
  const greeting = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="mobile-app-container" style={{ background: 'var(--app-bg)' }}>
      {/* HEADER UNIFICADO */}
      <header className="ios-header" style={{ paddingBottom: '5px', background: 'transparent' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 2px', fontWeight: 600 }}>{greeting}</p>
            <h1 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1, color: 'var(--black)' }}>{userName}</h1>
          </motion.div>
          <ProfileMenu />
        </div>
      </header>

      <main className="dashboard-main" style={{ paddingTop: '10px' }}>
        
        {/* APP DOWNLOAD BANNER */}
        {/* Sin app publicada no hay nada que descargar: el estudio todavía no
            tiene ficha en las tiendas y heredar la de fábrica mandaría a la
            clienta a bajar la app de otro negocio. */}
        {!isNative && showAppBanner && ESTUDIO.tiendas.appStore && (
          <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', borderRadius: '24px', padding: '20px', marginBottom: '20px', color: 'var(--black)', position: 'relative', boxShadow: '0 10px 25px rgba(238,186,137,0.3)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div onClick={() => setShowAppBanner(false)} style={{ position: 'absolute', top: '15px', right: '15px', cursor: 'pointer', background: 'rgba(0,0,0,0.1)', borderRadius: '50%', padding: '4px' }}>
              <X size={16} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 5px', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>La verdadera experiencia {ESTUDIO.nombre}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500, opacity: 0.9 }}>Descarga nuestra aplicación móvil exclusiva para socias. Reserva más rápido, usa tu código QR y sigue tu nutrición.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '5px' }}>
              <a
                href={ESTUDIO.tiendas.appStore}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Descargar ${ESTUDIO.nombre} en App Store`}
              >
                <img
                  src="/assets/appstore.svg"
                  alt="Download on the App Store"
                  style={{ height: '42px', cursor: 'pointer', transition: 'transform 0.2s ease', display: 'block' }}
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
                  style={{ height: '42px', cursor: 'pointer', transition: 'transform 0.2s ease', display: 'block' }}
                  onMouseOver={(e) => e.currentTarget.style.transform='scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform='scale(1)'}
                />
              </a>
            </div>
          </div>
        )}

        <div className="dashboard-sidebar">

          {/* MEMBERSHIP CARD - Premium App Aesthetic (Full Image Background) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ 
              padding: '24px', borderRadius: '32px', 
              backgroundImage: `linear-gradient(145deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%), url('${ESTUDIO.portadas.membresia}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: 'none',
              boxShadow: '0 20px 40px rgba(230, 114, 43, 0.25)',
              position: 'relative', overflow: 'hidden',
              minHeight: '175px',
              display: 'flex', alignItems: 'center'
            }}
          >
            {/* Brillo suave superior tipo Glass */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }}></div>
            
            <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Mi Membresía</span>
              </div>
              <h2 style={{ fontSize: '1.9rem', color: '#ffffff', margin: '0 0 6px', fontFamily: 'var(--font-display)', lineHeight: 1.05, textShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                {plan ? plan.replace('Plan ', '') : 'Sin Plan'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: plan ? '#4ADE80' : '#F87171', boxShadow: '0 0 10px rgba(0,0,0,0.15)' }}></div>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>{plan ? 'Suscripción Activa' : 'Inactiva'}</span>
              </div>
              
              {/* Pill oscura estilo Premium Glass */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '10px 16px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: 'var(--font-display)', textAlign: 'center' }}>
                    {classesRemaining >= 9000 ? '∞' : classesRemaining}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px', textAlign: 'center' }}>
                    {classesRemaining >= 9000 ? 'Ilimitadas' : 'Clases'}
                  </div>
                </div>
                <button 
                  onClick={() => irA('/planes')}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* La pregunta que más llega a recepción. Que se la conteste la app. */}
              {classesRemaining < 9000 && (
                <button
                  onClick={() => setVerMovimientos(true)}
                  style={{ display: 'block', marginTop: '12px', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                           fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                >
                  ¿A dónde se fueron mis clases?
                </button>
              )}
            </div>
          </motion.div>

          {/* STORIES-STYLE HORIZONTAL SCROLL */}
          {tarjetasExplora.length > 0 && (
          <motion.section
            initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.5, delay:0.15}}
            style={{ marginTop: '25px' }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '15px', fontFamily: 'var(--font-display)', color: 'var(--black)' }}>Explora</h2>
            <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '6px', marginLeft: '-5px', paddingLeft: '5px', paddingRight: '5px' }}>
              {tarjetasExplora.map(c => (
                <motion.div key={c.to} data-tour={`explora-${c.to.slice(1)}`} onClick={() => irA(c.to)} whileTap={{ scale: 0.97 }}
                  style={{ flex: '0 0 auto', width: '210px', height: '250px', borderRadius: '26px', cursor: 'pointer', position: 'relative', overflow: 'hidden', backgroundImage: `${c.overlay}, url('${c.img}')`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 14px 34px rgba(0,0,0,0.18)' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <c.Icon size={24} color="#fff" strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.18rem', fontFamily: 'var(--font-display)', lineHeight: 1.15, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>{c.title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.78rem', fontWeight: 600, marginTop: '4px', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>{c.sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
          )}
        </div>

        <div className="dashboard-content" style={{ zIndex: 1, position: 'relative' }}>

          {/* PRÓXIMA CLASE - TICKET STYLE */}
          <motion.section id="tour-proximas-clases" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.5, delay:0.25}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '13px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>Próximas clases</h2>
              <Link className="tour-agendar-btn" to="/agenda" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>Ver todo →</Link>
            </div>

            {/* Selector Hoy · Todas (para no confundir la clase de hoy con las de otros días) */}
            {upcomingReservations.length > 0 && (
              <div style={{ display: 'inline-flex', background: 'var(--fill-subtle)', borderRadius: '999px', padding: '4px', marginBottom: '15px', gap: '2px' }}>
                {[
                  { key: 'hoy', label: 'Hoy', count: todaysUpcoming.length },
                  { key: 'todas', label: 'Todas', count: upcomingReservations.length },
                ].map(seg => {
                  const active = classFilter === seg.key;
                  return (
                    <button
                      key={seg.key}
                      onClick={() => setClassFilter(seg.key)}
                      style={{
                        border: 'none', cursor: 'pointer', borderRadius: '999px', padding: '7px 16px',
                        fontSize: '0.8rem', fontWeight: 800, fontFamily: 'var(--font-display)',
                        display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease',
                        background: active ? 'var(--app-surface-solid)' : 'transparent',
                        color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
                        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {seg.label}
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 800, minWidth: '18px', textAlign: 'center',
                        borderRadius: '999px', padding: '1px 6px',
                        background: active ? 'rgba(255,145,77,0.14)' : 'var(--divider)',
                        color: active ? 'var(--primary)' : 'var(--on-surface-muted)',
                      }}>{seg.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {displayedReservations.length > 0 ? (
                displayedReservations.map(({ res, classObj, classDate }, index) => (
                  <TicketCard
                    key={res.id || index}
                    title={res.title}
                    time={res.time}
                    instructor={res.instructor}
                    coachId={classObj?.coach_id}
                    coaches={coaches}
                    badgeConfigs={badgeConfigs}
                    countdown={formatCountdown(classDate)}
                    dateLabel={dateChipLabel(classDate)}
                    status={res.status}
                    waitlistPosition={waitlistPositions?.[res.classId]}
                    autoClaim={res.autoClaim}
                    offerExpiresAt={res.offerExpiresAt}
                    onAccept={() => acceptOffer(res.classId)}
                    canCancel={canCancelReservation(res)}
                    onClick={() => handleCancelClick(res)}
                  />
                ))
              ) : classFilter === 'hoy' && upcomingReservations.length > 0 ? (
                /* Sin clases HOY, pero sí tiene próximas otros días */
                <div style={{
                  padding: '32px 20px', textAlign: 'center', color: 'var(--on-surface-variant)',
                  background: 'var(--app-surface-solid)', borderRadius: '24px', border: '1px dashed var(--border-subtle)'
                }}>
                  <Calendar size={32} color="var(--on-surface-variant)" style={{ opacity: 0.2, margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--on-surface)' }}>No tienes clases hoy</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>Tienes {upcomingReservations.length} {upcomingReservations.length === 1 ? 'clase próxima' : 'clases próximas'} otros días.</p>
                  <button onClick={() => setClassFilter('todas')} style={{
                    marginTop: '14px', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: 'var(--primary)', padding: '9px 22px', borderRadius: '14px', fontSize: '0.85rem',
                    boxShadow: '0 8px 20px rgba(255,139,66,0.3)'
                  }}>Ver todas</button>
                </div>
              ) : (
                <div style={{
                  padding: '40px 20px', textAlign: 'center', color: 'var(--on-surface-variant)',
                  background: 'var(--app-surface-solid)', borderRadius: '24px', border: '1px dashed var(--border-subtle)'
                }}>
                  <Calendar size={36} color="var(--on-surface-variant)" style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--on-surface)' }}>Sin clases agendadas</p>
                  <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>Reserva tu próxima sesión</p>
                  <Link className="tour-agendar-btn" to="/agenda" style={{
                    display: 'inline-block', marginTop: '15px', color: 'white', fontWeight: 700,
                    textDecoration: 'none', background: 'var(--primary)', padding: '10px 24px',
                    borderRadius: '14px', fontSize: '0.85rem',
                    boxShadow: '0 8px 20px rgba(255,139,66,0.3)'
                  }}>Agendar ahora</Link>
                </div>
              )}
            </div>
          </motion.section>

          {/* TU SEMANA — resumen interactivo (clases, salud, puntos) */}
          <motion.section id="tour-tu-semana" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.5, delay:0.35}} style={{ marginTop: '25px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>Tu semana</h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>
                {weekStats.weekCount} {weekStats.weekCount === 1 ? 'asistida' : 'asistidas'}
                {weekStats.reservedCount > 0 && ` · ${weekStats.reservedCount} reservada${weekStats.reservedCount === 1 ? '' : 's'}`}
              </span>
            </div>

            {/* Gráfica de barras: clases por día de la semana */}
            <motion.div onClick={() => irA('/evolucion')} whileTap={{ scale: 0.99 }} style={{ background: 'var(--app-surface-solid)', borderRadius: '22px', padding: '18px 16px 14px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-subtle)', cursor: 'pointer', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '7px' }}>
                {weekStats.perDayTotal.map((tot, i) => {
                  const isToday = i === weekStats.todayIdx;
                  const attended = weekStats.attendedPerDay[i];
                  const reserved = weekStats.reservedPerDay[i];
                  const fillPct = tot > 0 ? Math.max(18, (tot / weekStats.maxDay) * 100) : 7;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px' }}>
                      <div style={{ width: '100%', height: '72px', display: 'flex', alignItems: 'flex-end' }}>
                        <motion.div initial={{ height: 0 }} animate={{ height: `${fillPct}%` }} transition={{ delay: 0.1 + i * 0.05, type: 'spring', stiffness: 120, damping: 16 }}
                          style={{ width: '100%', maxWidth: '26px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden',
                            display: 'flex', flexDirection: 'column',
                            background: tot === 0 ? 'var(--border-subtle)' : undefined,
                            boxShadow: isToday && attended > 0 ? '0 4px 12px rgba(255,139,66,0.3)' : 'none',
                            opacity: tot === 0 ? 0.45 : 1 }}>
                          {/* Reservadas (fantasma) arriba */}
                          {reserved > 0 && (
                            <div style={{ height: `${(reserved / tot) * 100}%`, background: 'rgba(255,145,77,0.24)',
                              borderBottom: attended > 0 ? '1.5px solid var(--app-surface-solid)' : 'none' }} />
                          )}
                          {/* Asistidas (sólido) abajo */}
                          {attended > 0 && (
                            <div style={{ height: `${(attended / tot) * 100}%`,
                              background: isToday ? 'linear-gradient(to top, var(--primary), var(--accent))' : '#E8A56B' }} />
                          )}
                        </motion.div>
                      </div>
                      <span style={{ fontSize: '0.64rem', fontWeight: 800, color: isToday ? 'var(--primary)' : 'var(--on-surface-variant)' }}>{['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}</span>
                    </div>
                  );
                })}
              </div>

              {/* Leyenda asistida / reservada */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginTop: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.62rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#E8A56B' }} /> Asistida
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.62rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: 'rgba(255,145,77,0.24)', border: '1px solid rgba(255,145,77,0.55)' }} /> Reservada
                </span>
              </div>
            </motion.div>

            {/* 3 cards tappables con número animado */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <StatCard icon={<Activity size={16} />} value={weekStats.weekCount} label="clases" color="var(--primary)" onClick={() => irA('/agenda')} />
              {healthData.calories != null ? (
                <StatCard icon={<Flame size={16} />} value={healthData.calories} label="kcal hoy" color="#FF6B6B" onClick={() => irA('/evolucion')} />
              ) : (
                <StatCard icon={<Flame size={16} />} value={weekStats.racha} label="racha" color="#FF6B6B" onClick={() => irA('/evolucion')} />
              )}
              <StatCard icon={<Sparkles size={16} />} value={weekStats.points} label="puntos totales" color="var(--accent)" onClick={() => irA('/evolucion')} />
            </div>
            <p style={{ fontSize: '0.66rem', color: 'var(--on-surface-variant)', textAlign: 'center', margin: '9px 0 0', fontWeight: 600 }}>Ganas 10 puntos por cada clase ✦</p>
          </motion.section>
        </div>

      </main>

      {/* MODAL INTEGRADO PARA CANCELAR */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => { setShowCancelModal(false); setCancelError(false); }}>
          <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '15px' }}>Detalle de Reserva</h2>
            <div style={{ background: 'var(--fill-subtle)', padding: '15px', borderRadius: '16px', marginBottom: '16px', textAlign: 'left' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--on-surface)' }}>{selectedReservation?.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginTop: '5px' }}>{selectedReservation?.time}</div>
              {cancellingWaitlist && (
                <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 800, color: '#6b7280', background: 'var(--fill-subtle)', padding: '4px 9px', borderRadius: '8px' }}>
                  <Clock size={12} /> En lista de espera
                </div>
              )}
            </div>

            {cancelError ? (
              <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: '16px', padding: '14px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Lock size={16} color="#FF4D4D" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#FF4D4D', fontWeight: 600, lineHeight: 1.5 }}>
                  {CANCEL_ERROR_TEXT[cancelError] || CANCEL_ERROR_TEXT.error}
                </p>
              </div>
            ) : cancellingWaitlist ? (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.5 }}>
                ¿Salir de la lista de espera de esta clase? <strong>No se te cobró ninguna clase</strong>, así que no se descuenta ni se devuelve nada de tu paquete.
              </p>
            ) : (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.5 }}>
                ¿Deseas cancelar esta asistencia? La clase se devolverá a tu paquete. Solo puedes cancelar con <strong>más de 5 horas de anticipación</strong>.
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowCancelModal(false); setCancelError(false); }}
                className="btn-outline"
                style={{ flex: 1, padding: '12px', fontSize: '0.9rem' }}
                disabled={cancelando}
              >
                Volver
              </button>
              {!cancelError && (
                <button
                  onClick={confirmCancellation}
                  className="btn-primary"
                  disabled={cancelando}
                  style={{ flex: 1, padding: '12px', fontSize: '0.9rem', justifyContent: 'center', background: '#FF4D4D', boxShadow: '0 10px 25px rgba(255,77,77,0.3)', opacity: cancelando ? 0.7 : 1, cursor: cancelando ? 'wait' : 'pointer' }}
                >
                  {cancelando ? 'Cancelando…' : cancellingWaitlist ? 'Salir de lista de espera' : 'Cancelar Clase'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <MisClasesMovimientos
        abierto={verMovimientos}
        onCerrar={() => setVerMovimientos(false)}
        saldoActual={classesRemaining}
      />

      {/* QR BOTTOM SHEET */}
      {showQR && (
        <>
          <div className="qr-sheet-overlay" onClick={() => setShowQR(false)} />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                setShowQR(false);
              }
            }}
            className="qr-bottom-sheet" 
            style={{ padding: '12px 24px 20px', background: 'var(--surface)' }}
          >
            <div className="sheet-handle" />
            <button onClick={() => setShowQR(false)} aria-label="Cerrar" style={{ position: 'absolute', top: '14px', right: '16px', width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'var(--fill-subtle)', color: 'var(--on-surface)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}>✕</button>
            
            <div className="wallet-card" style={{ 
              background: 'var(--surface-low)', 
              boxShadow: 'var(--card-shadow)',
              border: '1px solid var(--border-subtle)',
              position: 'relative', overflow: 'hidden',
              margin: '0 auto 10px',
              width: '100%',
              borderRadius: '30px'
            }}>
              <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', transform: 'skewX(-20deg)' }}></div>

              <div className="wallet-header" style={{ borderBottom: 'none', paddingBottom: 0, paddingTop: '20px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(255,139,66,0.18)' }}><img src={ESTUDIO.marca.logo} alt={ESTUDIO.nombre} style={{ height: '24px', width: 'auto', objectFit: 'contain', display: 'block' }} /></div>
                </div>
                <QrCode size={20} color="var(--primary)" opacity={0.8} />
              </div>
              
              <div className="wallet-body" style={{ padding: '25px 20px', textAlign: 'center' }}>
                <div style={{ background: 'white', padding: '12px', borderRadius: '20px', display: 'inline-block', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', border: 'none' }}>
                  <QRCodeCanvas 
                    value={user?.id || 'befit-client-id'} 
                    size={160}
                    level={"H"}
                    includeMargin={false}
                    fgColor="#000000"
                  />
                </div>
              </div>
              
              <div className="wallet-footer" style={{ borderTop: '1px dashed var(--divider)', paddingTop: '20px', paddingBottom: '20px', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Clases Disponibles</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--black)', fontFamily: 'var(--font-display)' }}>{classesRemaining >= 9000 ? '∞' : classesRemaining} <span style={{fontSize: '0.9rem', fontWeight: 500, color: 'var(--primary)'}}>{classesRemaining >= 9000 ? 'ilimitadas' : 'sesiones'}</span></div>
                </div>
              </div>
            </div>

            <div className="sheet-user-info" style={{ marginTop: '10px' }}>
              <div className="user-name">{user?.user_metadata?.full_name || `Miembro ${ESTUDIO.nombre}`}</div>
              <div>{user?.email}</div>
            </div>

            {/* Botón Wallet */}
            {walletPlatform === 'apple' && (
              <>
                <button
                  onClick={handleAddToWallet}
                  disabled={walletLoading}
                  style={{
                    marginTop: '16px', width: '100%', padding: '14px',
                    borderRadius: '14px', border: 'none', cursor: walletLoading ? 'default' : 'pointer',
                    background: walletAdded ? '#1a1a1a' : '#000000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    transition: 'opacity 0.2s', opacity: walletLoading ? 0.7 : 1,
                  }}
                >
                  <Wallet size={18} color="white" />
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-body)' }}>
                    {walletLoading ? 'Generando…' : walletAdded ? 'Actualizar Wallet' : 'Agregar a Apple Wallet'}
                  </span>
                </button>
                {walletError && (
                  <p style={{ marginTop: '8px', fontSize: '0.78rem', color: '#EF4444', textAlign: 'center' }}>
                    {walletError}
                  </p>
                )}
              </>
            )}
            {walletPlatform === 'google' && (
              <>
                <button
                  onClick={handleAddToWallet}
                  disabled={walletLoading}
                  style={{
                    marginTop: '16px', width: '100%', padding: '14px',
                    borderRadius: '14px', border: 'none', cursor: walletLoading ? 'default' : 'pointer',
                    background: '#1a73e8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    transition: 'opacity 0.2s', opacity: walletLoading ? 0.7 : 1,
                  }}
                >
                  <Wallet size={18} color="white" />
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-body)' }}>
                    {walletLoading ? 'Generando…' : 'Agregar a Google Wallet'}
                  </span>
                </button>
                {walletError && (
                  <p style={{ marginTop: '8px', fontSize: '0.78rem', color: '#EF4444', textAlign: 'center' }}>
                    {walletError}
                  </p>
                )}
              </>
            )}
          </motion.div>
        </>
      )}

      {/* FLOATING BOTTOM NAV — INSTAGRAM STYLE */}
      <nav className={`ios-bottom-nav ${isScrolled ? 'scrolled' : ''}`}>
        <Link to="/portal" className="nav-item active">
          {avatarUrl ? (
            <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)', flexShrink: 0 }}>
              <img src={avatarUrl} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <User size={22} strokeWidth={2.5} />
          )}
          <span>Yo</span>
        </Link>
        <Link to="/evolucion" className="nav-item">
          <TrendingUp size={22} strokeWidth={2.5} />
          <span>Metas</span>
        </Link>
        <button className="nav-qr-button" onClick={() => setShowQR(true)}>
          <QrCode size={24} strokeWidth={2.5} />
        </button>
        {moduloActivo('nutricion') && hasNutritionAccess(plan) && (
          <Link to="/nutricion" className="nav-item">
            <Utensils size={22} strokeWidth={2.5} />
            <span>Comida</span>
          </Link>
        )}
        <Link to="/agenda" className="nav-item">
          <Calendar size={22} strokeWidth={2.5} />
          <span>Clases</span>
        </Link>
      </nav>
    </div>
  );
}

/* TICKET-STYLE CLASS CARD */
function TicketCard({ title, time, instructor, coachId, coaches, badgeConfigs, countdown, dateLabel, canCancel, status = 'confirmed', waitlistPosition, autoClaim = false, offerExpiresAt, onAccept, onClick }) {
  const isWaitlisted = status === 'waitlist';
  const isOffered = status === 'offered';
  // Foto real de la coach de esta clase (coach_id → nombre → email). Sin fallbacks
  // "adivinados": si no hay match o no tiene foto → inicial. (Antes caía a coaches[0]
  // y a un badge global COACH_PROFILE que ponía UNA foto en clases ajenas.)
  const coachInfo = (coaches || []).find(c => (coachId && c.id === coachId) || c.full_name === instructor || c.email === instructor);
  const photoUrl = coachInfo?.avatar_url;
  const coachName = coachInfo?.full_name || instructor;
  const initial = (coachName || 'C').charAt(0).toUpperCase();
  const STUB = 96; // ancho del talón

  // Cuenta regresiva "m:ss" para la oferta (si aplica).
  const [offerLeft, setOfferLeft] = useState(() => offerExpiresAt ? new Date(offerExpiresAt).getTime() - Date.now() : 0);
  useEffect(() => {
    if (!isOffered || !offerExpiresAt) return;
    const id = setInterval(() => setOfferLeft(new Date(offerExpiresAt).getTime() - Date.now()), 1000);
    setOfferLeft(new Date(offerExpiresAt).getTime() - Date.now());
    return () => clearInterval(id);
  }, [isOffered, offerExpiresAt]);
  const offerMMSS = (() => { const t = Math.max(0, Math.floor(offerLeft / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; })();

  return (
   <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '22px',
     boxShadow: isOffered ? '0 10px 30px rgba(255,145,77,0.28)' : 'var(--card-shadow)',
     border: isOffered ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)', overflow: 'hidden' }}>
    <div
      onClick={onClick}
      style={{
        position: 'relative', display: 'flex', background: 'var(--app-surface-solid)',
        cursor: 'pointer', opacity: (canCancel || isOffered) ? 1 : 0.85,
      }}
    >
      {/* Muescas del boleto (cortes del color del fondo sobre la perforación) */}
      <div style={{ position: 'absolute', top: -9, right: STUB - 9, width: 18, height: 18, borderRadius: '50%', background: 'var(--app-bg)' }} />
      <div style={{ position: 'absolute', bottom: -9, right: STUB - 9, width: 18, height: 18, borderRadius: '50%', background: 'var(--app-bg)' }} />

      {/* Sección principal */}
      <div style={{ flex: 1, minWidth: 0, padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '58px', height: '58px', borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-low)', flexShrink: 0, border: '2.5px solid var(--app-surface-solid)', boxShadow: '0 5px 14px rgba(0,0,0,0.1)' }}>
            {photoUrl
              ? <img src={photoUrl} alt={coachName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: '1.35rem', fontFamily: 'var(--font-display)' }}>{initial}</div>}
          </div>
          <div style={{ minWidth: 0 }}>
            <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-display)', lineHeight: 1.12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h4>
            <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', marginTop: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{coachName}</div>
            {isWaitlisted && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontSize: '0.66rem', fontWeight: 800, color: '#7c6f64', background: 'var(--fill-subtle)', padding: '4px 10px', borderRadius: '99px' }}>
                <Clock size={11} /> En espera{Number.isFinite(waitlistPosition) && waitlistPosition ? ` · Nº ${waitlistPosition}` : ''} · aún SIN lugar{autoClaim ? ' · entras sola' : ' · te preguntamos'}
              </span>
            )}
            {isOffered && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontSize: '0.66rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg,#FF914D,#E68245)', padding: '4px 10px', borderRadius: '99px' }}>
                <PartyPopper size={11} /> ¡Se liberó tu lugar!
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {dateLabel ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: 0,
              background: dateLabel === 'Hoy' ? 'rgba(255,145,77,0.12)' : 'var(--fill-subtle)',
              padding: '4px 10px', borderRadius: '999px', flexShrink: 0 }}>
              <Calendar size={12} color={dateLabel === 'Hoy' ? 'var(--primary)' : 'var(--on-surface-variant)'} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: dateLabel === 'Hoy' ? 'var(--primary)' : 'var(--on-surface-variant)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{dateLabel}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
              <MapPin size={13} color="var(--on-surface-variant)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{ESTUDIO.nombreMayusculas}</span>
            </div>
          )}
          {canCancel ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
              Gestionar <ChevronRight size={13} />
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.64rem', fontWeight: 700, color: 'var(--on-surface-variant)', background: 'var(--fill-subtle)', padding: '4px 9px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
              <Lock size={11} /> Sin cancelación
            </span>
          )}
        </div>
      </div>

      {/* Talón perforado */}
      <div style={{ width: `${STUB}px`, flexShrink: 0, background: 'var(--surface-low)', borderLeft: '2px dashed var(--divider)', padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '2px' }}>
        <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--on-surface-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Hora</span>
        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--on-surface)', fontFamily: 'var(--font-display)', lineHeight: 1.05 }}>{time}</span>
        {countdown && (
          <span style={{ marginTop: '4px', fontSize: '0.62rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(255,145,77,0.12)', padding: '3px 8px', borderRadius: '99px', whiteSpace: 'nowrap' }}>{countdown}</span>
        )}
        <span style={{ marginTop: '4px', fontSize: '0.5rem', fontWeight: 800, color: 'var(--on-surface-muted)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Clase</span>
      </div>
    </div>

    {/* Banda de confirmación cuando hay una OFERTA de lugar pendiente */}
    {isOffered && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px',
        background: 'rgba(255,145,77,0.10)', borderTop: '1px dashed var(--primary)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0,
          fontSize: '0.74rem', fontWeight: 800, color: 'var(--primary)' }}>
          <Clock size={13} /> Confirma en {offerMMSS}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onAccept?.(); }}
          style={{ border: 'none', borderRadius: '12px', padding: '9px 16px',
            background: 'linear-gradient(135deg,#FF914D,#E68245)', color: '#fff',
            fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          <Check size={15} /> Confirmar mi lugar
        </button>
      </div>
    )}
   </div>
  );
}

/* STAT PILL */
// Número que cuenta hacia arriba (ease-out) al montar / cambiar de valor.
function AnimatedNumber({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const to = Number(value) || 0;
    let raf; const start = performance.now(); const dur = 700;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toLocaleString('es-MX')}</>;
}

// Tarjeta de stat tappable con número animado (o "—" si no hay dato).
function StatCard({ icon, value, label, color, onClick }) {
  const hasValue = value !== null && value !== undefined;
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.95 }} style={{
      flex: 1, background: 'var(--app-surface-solid)', borderRadius: '20px', padding: '15px 8px',
      textAlign: 'center', border: '1px solid var(--border-subtle)', boxShadow: 'var(--card-shadow)', cursor: 'pointer'
    }}>
      <div style={{ color, marginBottom: '7px', display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--black)', lineHeight: 1 }}>
        {hasValue ? <AnimatedNumber value={value} /> : '—'}
      </div>
      <div style={{ fontSize: '0.62rem', color: 'var(--on-surface-variant)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>{label}</div>
    </motion.button>
  );
}

export default Portal;
