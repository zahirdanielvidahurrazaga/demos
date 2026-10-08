import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, ChevronRight, User, TrendingUp, Play, Utensils, CheckCircle2, QrCode, CalendarPlus, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { useScrollDetect } from '../hooks/useScrollDetect';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { addToAppleWallet, addToGoogleWallet, getWalletPlatform } from '../hooks/useWallet';
import { addClassToCalendar } from '../hooks/useCalendar';
import { classDateTime } from '../hooks/useLocalNotifications';
import { supabase } from '../lib/supabase';
import { ScheduleCalendar } from '../components/ScheduleCalendar';
import ProfileMenu from '../components/ProfileMenu';
import { hasNutritionAccess } from '../lib/plans';
import { NextClassTicket } from '../components/NextClassTicket';
import { ClassListSkeleton } from '../components/Skeleton';
import ClassmatesList from '../components/ClassmatesList';
import { ESTUDIO } from '../config/estudio';
import { crearIrA } from '../demo/navegacionDemo';
import { registrarIntentoBloqueado } from '../lib/telemetria';

function Agenda() {
  const isNative = Capacitor.isNativePlatform();
  const navigate = useNavigate();
  const { user, plan, classesRemaining, bookClass, globalClasses, updateReservationCalendarId, avatarUrl, coaches, badgeConfigs, myReservations, classesLoaded, planExpiresAt, esDemo } = useAuth();
  // Dentro de la maqueta, navegar a una ruta real sacaría a la prospecta.
  const irA = crearIrA(navigate, esDemo);
  
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false); // la reserva quedó en lista de espera
  // Decisión que se toma AL FORMARSE (no cuando se libera el lugar, que es
  // cuando el aviso puede no llegar). true = entro solita y se me cobra.
  // Arranca en FALSE: la dueña reportó que se apartaba y cobraba sin preguntar,
  // y un cobro sorpresa es peor que un lugar perdido. El automático se elige.
  const [autoClaim, setAutoClaim] = useState(false);
  const [addedToCalendar, setAddedToCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState(null);
  const [showCoachDetail, setShowCoachDetail] = useState(false);
  // Candado anti doble toque. El 3-sep-2026 tres clientas tocaron "Reservar"
  // dos veces (0-3 s entre toques, sin spinner que dijera "ya voy"): la primera
  // llamada reservó y la segunda regresó "Ya tienes una reserva" → la app cerró
  // el modal y avisó "No se pudo reservar" aunque SÍ quedó. El ref frena el
  // segundo toque en el mismo tick (el estado de React no alcanza a re-render);
  // el estado deshabilita el botón y muestra "Reservando…".
  const reservandoRef = useRef(false);
  const [reservando, setReservando] = useState(false);
  // La hoja de detalle se arrastra SOLO desde la barrita de arriba. Antes el
  // arrastre vivía en toda la hoja (framer pone touch-action:none) y la hoja
  // tenía max-height sin scroll: con una descripción larga (la de "Pilates con
  // aro" tiene 540 caracteres) el botón Reservar quedaba abajo de la pantalla
  // y no había forma de llegar a él. 4-sep-2026: "no carga completo y no les
  // da el botón de reservar" (Zabdy, Isabel, María José, Angélica).
  const dragControls = useDragControls();
  const [descExpandida, setDescExpandida] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const walletPlatform = getWalletPlatform();
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletAdded, setWalletAdded] = useState(() => !!localStorage.getItem('befit_wallet_added'));
  const [walletError, setWalletError] = useState(null);
  const isScrolled = useScrollDetect(30);

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

  // Abrir el detalle de la clase. Se abre para CUALQUIER clase no pasada
  // (incl. reservadas o llenas) para poder ver el detalle/compañeras. Las
  // validaciones para reservar se hacen al tocar "Reservar".
  const handleReserveClick = (classObj, dateStr) => {
    if (!user) {
      irA(isNative ? '/login' : '/planes');
      return;
    }
    const dt = classDateTime(dateStr, classObj?.time);
    if (dt && dt < new Date()) {
      registrarIntentoBloqueado({ userId: user.id, accion: 'reservar', motivo: 'clase_pasada', classId: classObj?.id, detalle: `${dateStr} ${classObj?.time} · reloj del aparato: ${new Date().toString()}`, saldoApp: classesRemaining, venceApp: planExpiresAt });
      alert("Esta clase ya terminó.");
      return;
    }
    setModalData(classObj);
    setShowModal(true);
    setIsSuccess(false);
    setDescExpandida(false);
    setWaitlisted(false);
    setAutoClaim(true);
    setCalendarError(null);
    setShowCoachDetail(false);
  };

  const confirmReservation = async () => {
    // Un toque a la vez: si ya hay una reserva en vuelo, el segundo se ignora.
    if (reservandoRef.current) return;
    // Validaciones (el servidor también las re-verifica de forma autoritativa).
    // Nota: ya NO se bloquea por clase llena — si está llena, el servidor mete
    // a la clienta a LISTA DE ESPERA (se exige saldo para poder promoverla luego).
    if (classesRemaining <= 0) {
      registrarIntentoBloqueado({ userId: user?.id, accion: 'reservar', motivo: 'sin_saldo', classId: modalData?.id, saldoApp: classesRemaining, venceApp: planExpiresAt });
      alert("No te quedan clases disponibles. Renueva tu paquete.");
      return;
    }
    if (planExpiresAt && new Date(planExpiresAt) < new Date()) {
      registrarIntentoBloqueado({ userId: user?.id, accion: 'reservar', motivo: 'membresia_vencida', classId: modalData?.id, saldoApp: classesRemaining, venceApp: planExpiresAt });
      alert("Tu membresía venció. Renueva tu plan para reservar clases.");
      irA('/planes');
      return;
    }
    reservandoRef.current = true;
    setReservando(true);
    try {
      const result = await bookClass(modalData, autoClaim);
      if (result === 'confirmed' || result === 'waitlist') {
        setWaitlisted(result === 'waitlist');
        setIsSuccess(true);
        setAddedToCalendar(false);
      } else {
        // Reserva no realizada (sin clases, membresía vencida, o error de red).
        setShowModal(false);
        alert("No se pudo reservar. Actualiza e inténtalo de nuevo.");
      }
    } finally {
      reservandoRef.current = false;
      setReservando(false);
    }
  };

  const handleAddToCalendar = async () => {
    if (!modalData) return;
    const eventId = await addClassToCalendar(modalData, modalData.date);

    if (!eventId) {
      setCalendarError('No se pudo agregar. Otorga el permiso de calendario en Configuración.');
      return;
    }

    if (user?.id) {
      await supabase
        .from('reservations')
        .update({ calendar_event_id: eventId })
        .eq('user_id', user.id)
        .eq('class_id', modalData.id);
      updateReservationCalendarId(modalData.id, eventId);
    }

    setAddedToCalendar(true);
    setTimeout(() => {
      setShowModal(false);
      setIsSuccess(false);
      setAddedToCalendar(false);
    }, 1500);
  };

  // days array removed

  return (
    <div className="mobile-app-container" style={{ background: 'var(--app-bg)' }}>
      {/* HEADER UNIFICADO */}
      <header className="ios-header" style={{ paddingBottom: '5px', background: 'transparent' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 2px', fontWeight: 600 }}>Tus clases</p>
            <h1 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1, color: 'var(--black)' }}>Reservas</h1>
          </div>
          <ProfileMenu />
        </div>
      </header>

      <motion.main className="dashboard-main" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
        
        <div className="dashboard-sidebar">
          {/* Boarding pass — Tu próxima clase (datos reales) */}
          {user ? (
            <NextClassTicket
              myReservations={myReservations}
              globalClasses={globalClasses}
              coaches={coaches}
              classesRemaining={classesRemaining}
              userId={user.id}
              onShowQR={() => setShowQR(true)}
            />
          ) : (
            <section style={{ marginBottom: '25px' }}>
              <div style={{ 
                borderRadius: '32px', overflow: 'hidden', position: 'relative', 
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)', height: '200px' 
              }}>
                <img src={ESTUDIO.portadas.agenda} alt={ESTUDIO.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
                <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px' }}>
                   {isNative ? (
                     <>
                       <h3 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '10px' }}>Exclusivo para Socias</h3>
                       <button onClick={() => irA('/login')} className="btn-primary" style={{ width: '100%', padding: '12px' }}>Inicia Sesión</button>
                     </>
                   ) : (
                     <>
                       <h3 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '10px' }}>Inicia tu transformación</h3>
                       <button onClick={() => irA('/planes')} className="btn-primary" style={{ width: '100%', padding: '12px' }}>Ver Planes</button>
                     </>
                   )}
                </div>
              </div>
            </section>
          )}

          {/* Calendario Estilo Apple */}
          <section style={{ marginBottom: '10px' }}>
            {!classesLoaded && globalClasses.length === 0 ? (
              <ClassListSkeleton />
            ) : (
              <ScheduleCalendar
                globalClasses={globalClasses}
                coaches={coaches}
                badgeConfigs={badgeConfigs}
                myReservations={myReservations}
                onReserve={handleReserveClick}
              />
            )}
          </section>
        </div>

      </motion.main>

      {/* BOTTOM SHEET — DETALLE DE CLASE + RESERVA */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="qr-sheet-overlay"
              onClick={() => { setShowModal(false); setIsSuccess(false); setCalendarError(null); }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              drag="y"
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) {
                  setShowModal(false);
                  setIsSuccess(false);
                  setCalendarError(null);
                }
              }}
              className="qr-bottom-sheet"
              style={{ padding: '0 24px calc(36px + env(safe-area-inset-bottom, 0px))', background: 'var(--surface)', maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
              {/* Zona de arrastre: solo aquí se jala la hoja; el resto hace scroll. */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                style={{ position: 'sticky', top: 0, zIndex: 2, padding: '12px 0 6px', margin: '0 -24px', background: 'var(--surface)', touchAction: 'none', cursor: 'grab' }}
              >
                <div className="sheet-handle" style={{ margin: '0 auto' }} />
              </div>

              {isSuccess ? (
                <div style={{ textAlign: 'center', paddingTop: '10px' }}>
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    style={{ width: '64px', height: '64px', borderRadius: '50%', background: waitlisted ? 'rgba(120,120,130,0.12)' : 'rgba(255,139,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}
                  >
                    {waitlisted ? <Clock size={33} color="var(--on-surface-variant)" /> : addedToCalendar ? <CalendarPlus size={32} color="var(--primary)" /> : <CheckCircle2 size={35} color="var(--primary)" />}
                  </motion.div>
                  <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '6px' }}>
                    {waitlisted ? '¡Estás en lista de espera!' : addedToCalendar ? '¡Agregada al calendario!' : '¡Reserva Exitosa!'}
                  </h2>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', marginBottom: (addedToCalendar || waitlisted) ? '24px' : '24px' }}>
                    {waitlisted
                      ? (autoClaim
                          ? 'Todavía NO tienes lugar. Si se libera uno entrarás automáticamente, te avisamos y ahí se descuenta tu clase. Por ahora no se te ha descontado nada.'
                          : 'Todavía NO tienes lugar. Si se libera uno te avisamos y tendrás un plazo para confirmarlo. Por ahora no se te ha descontado nada.')
                      : addedToCalendar ? 'Recibirás un recordatorio antes de tu clase.' : 'Se ha descontado 1 clase de tu membresía.'}
                  </p>
                  {!addedToCalendar && !waitlisted && isNative && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button
                        onClick={handleAddToCalendar}
                        style={{
                          width: '100%', padding: '14px', borderRadius: '9999px', border: 'none',
                          background: 'var(--primary)', color: 'white',
                          fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-body)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          boxShadow: '0 8px 20px rgba(255,139,66,0.3)'
                        }}
                      >
                        <CalendarPlus size={18} /> Agregar a mi calendario
                      </button>
                      <button
                        onClick={() => { setShowModal(false); setIsSuccess(false); setCalendarError(null); }}
                        style={{
                          width: '100%', padding: '12px', borderRadius: '9999px',
                          background: 'transparent', color: 'var(--on-surface-variant)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                          cursor: 'pointer'
                        }}
                      >
                        Ahora no
                      </button>
                    </div>
                  )}
                  {(!isNative || addedToCalendar || waitlisted) && (
                    <button
                      onClick={() => { setShowModal(false); setIsSuccess(false); setCalendarError(null); }}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '9999px', border: 'none',
                        background: 'var(--primary)', color: 'white',
                        fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-body)',
                        cursor: 'pointer', boxShadow: '0 8px 20px rgba(255,139,66,0.3)'
                      }}
                    >
                      Listo
                    </button>
                  )}
                  {calendarError && (
                    <p style={{ color: '#EF4444', fontSize: '0.85rem', marginTop: '15px' }}>{calendarError}</p>
                  )}
                </div>
              ) : (
                <div>
                  {/* Hora + Título */}
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'inline-block', padding: '5px 12px', background: 'rgba(255,145,77,0.1)', color: 'var(--primary)', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '8px' }}>
                      {modalData?.time}
                    </div>
                    {modalData?.is_special && (
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 13px', borderRadius: '999px', background: modalData.special_color || 'linear-gradient(135deg, #FF914D, #E07A9C)', color: '#fff', fontSize: '0.64rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 4px 12px rgba(224,122,156,0.4)' }}>
                          {(modalData.special_label && modalData.special_label.trim()) || 'Especial'}
                        </span>
                      </div>
                    )}
                    <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', margin: '0 0 4px' }}>{modalData?.title}</h2>
                    {modalData?.level && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>{modalData.level}</span>
                    )}
                  </div>

                  {/* Descripción de la clase */}
                  {modalData?.description && (() => {
                    const larga = modalData.description.length > 180;
                    const recortada = larga && !descExpandida;
                    return (
                      <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'var(--fill-subtle)', borderRadius: '16px', border: '1px solid var(--divider)' }}>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, ...(recortada ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}) }}>{modalData.description}</p>
                        {larga && (
                          <button onClick={() => setDescExpandida(v => !v)} style={{ marginTop: '8px', padding: 0, border: 'none', background: 'transparent', color: 'var(--primary)', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>
                            {descExpandida ? 'Ver menos' : 'Ver más'}
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Mini-perfil del coach — expandible */}
                  {(() => {
                    const coachInfo = coaches?.find(c => (modalData?.coach_id && c.id === modalData.coach_id) || c.full_name === modalData?.instructor || c.email === modalData?.instructor);
                    if (!coachInfo) return null;
                    const hasBio = coachInfo.bio || coachInfo.experience;
                    return (
                      <div style={{ marginBottom: '20px', borderRadius: '16px', border: '1px solid var(--divider)', overflow: 'hidden' }}>
                        {/* Fila siempre visible — avatar + nombre + botón */}
                        <button
                          onClick={() => hasBio && setShowCoachDetail(v => !v)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '13px 14px', background: 'var(--fill-subtle)',
                            border: 'none', cursor: hasBio ? 'pointer' : 'default', textAlign: 'left'
                          }}
                        >
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface)', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--app-surface-solid)', boxShadow: '0 3px 8px rgba(0,0,0,0.08)' }}>
                            {coachInfo.avatar_url
                              ? <img src={coachInfo.avatar_url} alt="Coach" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold', fontSize: '1rem' }}>{(coachInfo.full_name || 'C').charAt(0).toUpperCase()}</div>
                            }
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--on-surface-variant)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Imparte</p>
                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{coachInfo.full_name || 'Coach'}</p>
                          </div>
                          {hasBio && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
                              {showCoachDetail ? 'Ocultar' : 'Conoce a tu coach'}
                              <ChevronRight size={14} style={{ transform: showCoachDetail ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.25s' }} />
                            </div>
                          )}
                        </button>

                        {/* Detalle expandible */}
                        <AnimatePresence initial={false}>
                          {showCoachDetail && hasBio && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div style={{ padding: '0 14px 14px' }}>
                                {coachInfo.bio && (
                                  <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontStyle: 'italic', lineHeight: 1.5 }}>"{coachInfo.bio}"</p>
                                )}
                                {coachInfo.experience && (
                                  <div style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(255,139,66,0.1)', color: 'var(--primary)', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 }}>
                                    {coachInfo.experience}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}

                  {/* Compañeras de clase (solo si ya estás inscrita; la función
                      segura no expone rosters de clases en las que no estás) */}
                  {myReservations?.some(r => r.classId === modalData?.id) && (
                    <ClassmatesList classId={modalData?.id} />
                  )}

                  {(() => {
                    const myRes = myReservations?.find(r => r.classId === modalData?.id);
                    const isReservedClass = !!myRes;
                    const isWaitlisted = myRes?.status === 'waitlist';
                    const isFull = (modalData?.spots ?? 0) <= 0;
                    if (isReservedClass) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {isWaitlisted ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '14px', background: 'rgba(120,120,130,0.12)', color: 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.9rem' }}>
                              <Clock size={18} /> En lista de espera
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '14px', background: 'rgba(34,197,94,0.1)', color: '#16A34A', fontWeight: 700, fontSize: '0.9rem' }}>
                              <CheckCircle2 size={18} /> Ya estás inscrita
                            </div>
                          )}
                          <button onClick={() => { setShowModal(false); setCalendarError(null); }} className="btn-outline" style={{ width: '100%', padding: '13px' }}>Cerrar</button>
                        </div>
                      );
                    }
                    return (
                      <>
                      {/* Clase llena → la clienta decide AQUÍ qué pasa cuando se
                          libere un lugar. Antes se le preguntaba después, por push,
                          y quien no lo recibía perdía el lugar sin enterarse. */}
                      {isFull && (
                        <div style={{ marginBottom: '14px', padding: '14px', borderRadius: '16px', background: 'var(--fill-subtle)' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--on-surface)', marginBottom: '10px' }}>
                            Si se libera un lugar…
                          </div>
                          {[
                            { v: false, t: 'Pregúntame antes', s: 'Te avisamos y tienes un plazo para confirmar. No se te descuenta nada hasta que aceptes.' },
                            { v: true,  t: 'Apártamelo sin preguntarme', s: 'Quedas inscrita al momento y se descuenta 1 clase. Si ya no puedes, cancelas y te la devolvemos.' },
                          ].map(o => (
                            <button
                              key={String(o.v)}
                              onClick={() => setAutoClaim(o.v)}
                              style={{
                                display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%',
                                textAlign: 'left', padding: '10px', marginBottom: o.v === false ? '6px' : 0,
                                border: `1.5px solid ${autoClaim === o.v ? 'var(--primary)' : 'transparent'}`,
                                background: autoClaim === o.v ? 'rgba(255,145,77,0.08)' : 'transparent',
                                borderRadius: '12px', cursor: 'pointer',
                              }}
                            >
                              <span style={{
                                width: 17, height: 17, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                                border: `2px solid ${autoClaim === o.v ? 'var(--primary)' : 'var(--on-surface-variant)'}`,
                                background: autoClaim === o.v ? 'var(--primary)' : 'transparent',
                                boxShadow: autoClaim === o.v ? 'inset 0 0 0 2.5px var(--app-surface-solid)' : 'none',
                              }} />
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--on-surface)' }}>{o.t}</span>
                                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--on-surface-variant)', marginTop: 2, lineHeight: 1.35 }}>{o.s}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { setShowModal(false); setCalendarError(null); }} className="btn-outline" style={{ flex: 1, padding: '13px' }} disabled={reservando}>Cancelar</button>
                        <button onClick={confirmReservation} className="btn-primary" disabled={reservando} style={{ flex: 1.4, padding: '13px', justifyContent: 'center', fontSize: isFull ? '0.82rem' : undefined, opacity: reservando ? 0.7 : 1, cursor: reservando ? 'wait' : 'pointer' }}>
                          {reservando ? 'Reservando…' : isFull ? 'Unirme a lista de espera' : 'Reservar'}
                        </button>
                      </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* QR BOTTOM SHEET CON DISEÑO BLACK CARD */}
      <AnimatePresence>
        {showQR && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="qr-sheet-overlay" 
              onClick={() => setShowQR(false)} 
            />
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
      </AnimatePresence>

      {/* FLOATING BOTTOM NAV — INSTAGRAM STYLE */}
      {user && (
        <nav className={`ios-bottom-nav ${isScrolled ? 'scrolled' : ''}`}>
          <Link to="/portal" className="nav-item">
            {avatarUrl ? (
              <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--on-surface-variant)', flexShrink: 0 }}>
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
          {hasNutritionAccess(plan) && (
            <Link to="/nutricion" className="nav-item">
              <Utensils size={22} strokeWidth={2.5} />
              <span>Comida</span>
            </Link>
          )}
          <Link to="/agenda" className="nav-item active">
            <CalendarIcon size={22} strokeWidth={2.5} />
            <span>Clases</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
export default Agenda;
