import React, { useState, useEffect } from 'react';
import { Activity, Flame, User, Calendar, Utensils, TrendingUp, Award, Target, ChevronRight, QrCode, Zap, Droplets, Scale, RefreshCw, Heart, Clock, Wallet, X, Check, Lock, Bluetooth } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import { useScrollDetect } from '../hooks/useScrollDetect';
import { useHealth } from '../hooks/useHealth';
import { supabase } from '../lib/supabase';
import { monthlyGoalCap, PLAN_BY_NAME, hasNutritionAccess } from '../lib/plans';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { addToAppleWallet, addToGoogleWallet, getWalletPlatform } from '../hooks/useWallet';
import ProfileMenu from '../components/ProfileMenu';
import ProgressPhotos from '../components/ProgressPhotos';
import RecordatorioProgreso from '../components/RecordatorioProgreso';
import BasculaBLE from '../components/BasculaBLE';
import { ESTUDIO } from '../config/estudio';
import { crearIrA } from '../demo/navegacionDemo';

const isNative = Capacitor.isNativePlatform();

// Animaciones de las insignias (entrada escalonada tipo "pop")
const badgeGrid = { hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const badgeItem = { hidden: { opacity: 0, y: 18, scale: 0.8 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 18 } } };

function Evolucion() {
  const navigate = useNavigate();
  const { user, plan, classesRemaining, avatarUrl, customBadges, badgeConfigs, profileName, monthlyGoal, updateMonthlyGoal, esDemo} = useAuth();
  // Dentro de la maqueta, navegar a una ruta real sacaría a la prospecta.
  const irA = crearIrA(navigate, esDemo);
  const [showQR, setShowQR] = useState(false);
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

  const [latestMeasurement, setLatestMeasurement] = useState(null);
  const [previousMeasurement, setPreviousMeasurement] = useState(null);
  const [loadingMeasurements, setLoadingMeasurements] = useState(true);
  const [showBle, setShowBle] = useState(false);
  const [subtab, setSubtab] = useState('resumen'); // resumen | fotos | insignias
  const isScrolled = useScrollDetect(30);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const { healthData, healthPermission, healthLoading, requestPermissions, fetchTodayData } = useHealth();

  const [classHistory, setClassHistory] = useState([]);
  const [badges, setBadges] = useState([{ icon: '🔒', label: 'Cargando...' }]);
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  // La meta vive en la BD (users.target_monthly_classes) vía AuthContext: siempre
  // fresca (sin el race condition del initial useState con user_metadata).
  const targetMonthlyClasses = monthlyGoal || 0;

  // Tope de la meta = clases que da el plan al mes (fuente única en src/lib/plans).
  const goalLimit = monthlyGoalCap(plan);
  const planInfo = PLAN_BY_NAME[plan];
  const planLimited = !!planInfo && !planInfo.unlimited; // plan con tope real (no ilimitado)

  // Calcular score basado en historial de últimos 30 días vs meta
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!targetMonthlyClasses) {
      setScore(0);
      return;
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const classesLast30Days = classHistory.filter(h => new Date(h.created_at) >= thirtyDaysAgo).length;
    const calcScore = Math.min(100, Math.round((classesLast30Days / targetMonthlyClasses) * 100));
    setScore(calcScore);
  }, [classHistory, targetMonthlyClasses]);

  const circumference = 2 * Math.PI * 70;
  const dashOffset = targetMonthlyClasses === 0 ? circumference : circumference - (score / 100) * circumference;

  const handleSaveGoal = async () => {
    let newGoal = parseInt(goalInput, 10);
    if (!newGoal || newGoal < 1) return;
    newGoal = Math.min(newGoal, goalLimit); // no exceder lo que da su plan
    // Guardar en la BD (users.target_monthly_classes) vía AuthContext
    await updateMonthlyGoal(newGoal);
    setShowGoalModal(false);
  };

  // Cargar las últimas dos mediciones para calcular tendencias
  useEffect(() => {
    if (!user) return;
    fetchMeasurements();
    fetchClassHistory();
  }, [user]);

  const calculateBadges = (history) => {
    let calculated = [];

    // Evaluar reglas dinámicas del Admin
    if (badgeConfigs) {
      badgeConfigs.forEach(rule => {
        let isEarned = false;
        
        // Si el usuario la tiene asignada manualmente, automáticamente la gana
        if (customBadges?.some(cb => cb.label === rule.label)) {
          isEarned = true;
        } else {
          switch(rule.rule_type) {
            case 'TOTAL_CLASSES':
              isEarned = (history?.length || 0) >= rule.rule_value;
              break;
            case 'DIFFERENT_COACHES':
              const coaches = new Set((history || []).map(h => h.classes?.instructor).filter(Boolean));
              isEarned = coaches.size >= rule.rule_value;
              break;
            case 'PROFILE_COMPLETE':
              isEarned = !!(profileName && profileName.trim() !== '' && avatarUrl);
              break;
            case 'WEEKLY_CLASSES':
              const weekCounts = {};
              (history || []).forEach(h => {
                 const d = new Date(h.created_at);
                 // Aproximación: agrupación por semana (1000*60*60*24*7)
                 const weekKey = `${d.getFullYear()}-${Math.floor(d.getTime() / (1000*60*60*24*7))}`;
                 weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
              });
              const maxWeekly = Math.max(0, ...Object.values(weekCounts));
              isEarned = maxWeekly >= rule.rule_value;
              break;
            case 'MANUAL':
              // Se cubre con el chequeo previo de customBadges
              break;
          }
        }

        calculated.push({
          ...rule,
          locked: !isEarned
        });
      });
    }

    // Añadir insignias manuales extra que no estén en las reglas
    if (customBadges) {
      customBadges.forEach(cb => {
        // Ignorar los objetos que son solo marcadores internos del sistema (sin label ni icon)
        if (!cb.label && cb._internal_notified_id) return;
        if (!cb.label && !cb.icon) return;

        if (!calculated.some(c => c.label === cb.label)) {
          calculated.push({ ...cb, locked: false });
        }
      });
    }

    setBadges(calculated);
  };

  const calculateWeeklyActivity = (history) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const activity = [];
    const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      const classesOnDay = history.filter(item => {
        const itemDate = new Date(item.created_at);
        itemDate.setHours(0,0,0,0);
        return itemDate.getTime() === d.getTime();
      }).length;
      
      let height = classesOnDay * 50; 
      if (height > 100) height = 100;
      
      activity.push({
        label: dayNames[d.getDay()],
        height: height,
        isToday: i === 0,
        count: classesOnDay
      });
    }
    setWeeklyActivity(activity);
  };

  const fetchClassHistory = async () => {
    try {
      const { data } = await supabase
        .from('reservations')
        .select('*, classes(title, time, day, instructor)')
        .eq('user_id', user.id)
        .eq('checked_in', true)
        .order('created_at', { ascending: false });
        
      if (data) {
        setClassHistory(data);
        calculateWeeklyActivity(data);
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  };

  useEffect(() => {
    calculateBadges(classHistory);
  }, [classHistory, customBadges, badgeConfigs, profileName, avatarUrl]);

  const fetchMeasurements = async () => {
    setLoadingMeasurements(true);
    try {
      const { data } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false })
        .limit(2);

      if (data?.length >= 1) setLatestMeasurement(data[0]);
      if (data?.length >= 2) setPreviousMeasurement(data[1]);
    } catch (err) {
      console.error('Error cargando mediciones:', err);
    } finally {
      setLoadingMeasurements(false);
    }
  };


  const calcTrend = (key, unit = '') => {
    if (!latestMeasurement || !previousMeasurement) return null;
    const curr = latestMeasurement[key];
    const prev = previousMeasurement[key];
    if (curr == null || prev == null) return null;
    const diff = (curr - prev).toFixed(1);
    return diff >= 0 ? `+${diff}` : `${diff}`;
  };

  const hasData = !!latestMeasurement;

  return (
    <div className="mobile-app-container">
      {/* HEADER */}
      <header className="ios-header" style={{ paddingBottom: '5px', background: 'transparent' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 2px', fontWeight: 600 }}>Tu progreso</p>
            <h1 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1, color: 'var(--black)' }}>Evolución</h1>
          </div>
          <ProfileMenu />
        </div>
      </header>

      {/* SUB-PESTAÑAS (glass) */}
      <div style={{ display: 'flex', gap: '8px', padding: '6px 16px 2px', maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {[['resumen', 'Resumen'], ['fotos', 'Fotos'], ['insignias', 'Insignias']].map(([id, label]) => {
          const on = subtab === id;
          return (
            <motion.button key={id} className={`tour-subtab-${id}`} onClick={() => setSubtab(id)} whileTap={{ scale: 0.95 }}
              style={{ padding: '9px 18px', borderRadius: '999px', cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem', whiteSpace: 'nowrap',
                border: on ? '1px solid rgba(255,255,255,0.5)' : '1px solid var(--glass-border, rgba(255,255,255,0.55))',
                background: on ? 'linear-gradient(135deg, #FF914D, #E68245)' : 'var(--glass-bg, rgba(255,255,255,0.55))', color: on ? '#fff' : 'var(--on-surface-variant)',
                backdropFilter: 'blur(18px) saturate(180%)', WebkitBackdropFilter: 'blur(18px) saturate(180%)',
                boxShadow: on ? '0 8px 20px rgba(255,145,77,0.35)' : '0 2px 10px rgba(0,0,0,0.04)' }}>
              {label}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {subtab === 'fotos' && (
          <motion.main key="fotos" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="dashboard-main" style={{ paddingTop: '10px' }}>
          <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto', padding: '0 16px' }}>
            <ProgressPhotos userId={user?.id} />
          </div>
          </motion.main>
        )}

        {subtab === 'insignias' && (
          <motion.main key="insignias" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="dashboard-main" style={{ paddingTop: '10px' }}>
          <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto', padding: '0 16px' }}>
            <motion.section className="tour-badges-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              {/* Hero con foto del estudio */}
              <div style={{ position: 'relative', borderRadius: '26px', overflow: 'hidden', marginBottom: '20px', minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px', backgroundColor: '#2a1d16', boxShadow: '0 20px 44px rgba(58,33,24,0.26)' }}>
                <img src={ESTUDIO.portadas.evolucion} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(40,26,18,0.30) 0%, rgba(40,26,18,0.55) 50%, rgba(26,17,12,0.92) 100%)' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 900, margin: '0 0 4px', fontFamily: 'var(--font-display)', color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>Tus insignias</h2>
                  <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.5, textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                    Gánalas con tu constancia. Toca cualquiera para ver cómo conseguirla.
                  </p>
                </div>
              </div>
              {badges.length > 0 ? (
                <motion.div variants={badgeGrid} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: '20px 12px', justifyItems: 'center' }}>
                  {badges.map((b, i) => (
                    <BadgeIcon key={i} icon={b.icon} label={b.label} locked={b.locked} onClick={() => setSelectedBadge(b)} />
                  ))}
                </motion.div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--on-surface-variant)' }}>
                  <Award size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                  <p style={{ fontSize: '0.9rem', margin: 0 }}>No hay insignias configuradas aún.</p>
                </div>
              )}
            </motion.section>
          </div>
          </motion.main>
        )}

        {subtab === 'resumen' && (
        <motion.main key="resumen" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="dashboard-main" style={{ paddingTop: '10px' }}>
        <div className="dashboard-sidebar">

          {/* Recordatorio de fotos de progreso. Vive aquí, en Resumen, porque la
              invitación que ya existía estaba dentro de la pestaña Fotos: sólo la
              veía quien ya había decidido entrar. */}
          <RecordatorioProgreso userId={user?.id} onIrAFotos={() => setSubtab('fotos')} />

          {/* PROGRESS RING */}
          <motion.section initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
            <div
              className="tour-score-section"
              onClick={() => setShowGoalModal(true)}
              style={{
                position: 'relative', borderRadius: '32px', overflow: 'hidden', cursor: 'pointer',
                padding: '34px 20px 30px', textAlign: 'center', backgroundColor: '#2a1d16',
                boxShadow: '0 24px 50px rgba(58,33,24,0.30)', border: '1px solid rgba(255,255,255,0.10)'
              }}
            >
              {/* Foto aspiracional del estudio + overlay cálido para legibilidad */}
              <img src={ESTUDIO.portadas.meta} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 28%', transform: 'scale(1.12)', transformOrigin: 'center bottom' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(40,26,18,0.42) 0%, rgba(40,26,18,0.58) 45%, rgba(26,17,12,0.88) 100%)' }} />
              <div style={{ position: 'relative', zIndex: 1, fontSize: '0.66rem', fontWeight: 800, color: 'rgba(255,255,255,0.78)', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '14px' }}>Tu meta del mes</div>
              <div style={{ position: 'relative', zIndex: 1, width: '180px', height: '180px', margin: '0 auto 18px' }}>
                <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="90" cy="90" r="70" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="11" />
                  <circle cx="90" cy="90" r="70" fill="none" stroke="url(#progressGradient)" strokeWidth="11" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', filter: 'drop-shadow(0 2px 8px rgba(255,145,77,0.55))' }} />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFB37A" />
                      <stop offset="100%" stopColor="#FF914D" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: targetMonthlyClasses === 0 ? '1.8rem' : '2.9rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#fff', lineHeight: 1, textShadow: '0 2px 14px rgba(0,0,0,0.45)' }}>
                    {targetMonthlyClasses === 0 ? '0' : score}
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Score</div>
                </div>
              </div>
              <div style={{ position: 'relative', zIndex: 1, fontSize: '0.86rem', color: 'rgba(255,255,255,0.92)', fontWeight: 600, marginBottom: '12px', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
                {targetMonthlyClasses === 0 ? (
                  <span style={{ color: '#FFC79E', fontWeight: 800 }}>Toca aquí para definir tu meta</span>
                ) : (
                  <>Has superado el <span style={{ fontWeight: 800, color: '#FFC79E' }}>{score}%</span> de tus objetivos</>
                )}
              </div>
              {targetMonthlyClasses > 0 && (
                <div style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: '14px', fontSize: '0.7rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <Award size={14} /> Meta: {targetMonthlyClasses} clases/mes
                </div>
              )}
            </div>
          </motion.section>
        </div>

        <div className="dashboard-content">
          {/* COMPOSICIÓN CORPORAL */}
          <motion.section className="tour-body-composition" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>Composición</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {hasData && latestMeasurement?.measured_at && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
                    {new Date(latestMeasurement.measured_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                <button onClick={fetchMeasurements} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {!hasData && !loadingMeasurements ? (
              /* Estado vacío — conectar báscula vía Salud */
              <div style={{
                background: 'var(--app-surface-solid)', borderRadius: '24px', padding: '28px 20px',
                boxShadow: 'var(--card-shadow)', border: '1px dashed var(--border-subtle)',
                textAlign: 'center'
              }}>
                <Scale size={36} color="var(--primary)" style={{ opacity: 0.6, marginBottom: '12px' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--on-surface)', margin: '0 0 4px' }}>Pésate en el estudio</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Conéctate a la báscula del estudio por Bluetooth y registra tu peso en segundos.
                </p>
                <button onClick={() => setShowBle(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '14px', padding: '12px 22px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 10px 24px rgba(255,145,77,0.35)' }}>
                  <Bluetooth size={16} /> Pesarme con la báscula
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <MetricRow
                  label="Peso"
                  value={latestMeasurement?.weight_kg?.toFixed(1) ?? '—'}
                  unit="kg"
                  trend={calcTrend('weight_kg')}
                  icon={<Scale size={18} />}
                  positiveIsDown
                />
                <MetricRow
                  label="Grasa corporal"
                  value={latestMeasurement?.body_fat_pct?.toFixed(1) ?? '—'}
                  unit="%"
                  trend={calcTrend('body_fat_pct')}
                  icon={<Flame size={18} />}
                  positiveIsDown
                />
                <MetricRow
                  label="Masa muscular"
                  value={latestMeasurement?.skeletal_muscle_pct?.toFixed(1) ?? '—'}
                  unit="%"
                  trend={calcTrend('skeletal_muscle_pct')}
                  icon={<Zap size={18} />}
                  positive
                />
                <MetricRow
                  label="Agua"
                  value={latestMeasurement?.body_water_pct?.toFixed(1) ?? '—'}
                  unit="%"
                  trend={calcTrend('body_water_pct')}
                  icon={<Droplets size={18} />}
                  positive
                />
                {latestMeasurement?.visceral_fat != null && (
                  <MetricRow
                    label="Grasa visceral"
                    value={String(latestMeasurement.visceral_fat)}
                    unit=""
                    trend={calcTrend('visceral_fat')}
                    icon={<Activity size={18} />}
                    positiveIsDown
                  />
                )}
                <MetricRow
                  label="Masa ósea"
                  value={latestMeasurement?.bone_mass_kg?.toFixed(2) ?? '—'}
                  unit="kg"
                  trend={calcTrend('bone_mass_kg')}
                  icon={<Activity size={18} />}
                  positive
                />
                {latestMeasurement?.bmi && (
                  <MetricRow
                    label="IMC"
                    value={latestMeasurement.bmi.toFixed(1)}
                    unit=""
                    trend={calcTrend('bmi')}
                    icon={<Target size={18} />}
                    positiveIsDown
                  />
                )}
              </div>
            )}
          </motion.section>

          {/* BOTÓN PESARME (Bluetooth) */}
          {hasData && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }} style={{ marginTop: '16px' }}>
              <button onClick={() => setShowBle(true)} style={{
                width: '100%', padding: '15px', borderRadius: '20px',
                background: 'var(--primary)', boxShadow: '0 10px 24px rgba(255,145,77,0.32)',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                color: '#fff', fontWeight: 800, fontSize: '0.92rem',
                fontFamily: 'var(--font-body)', cursor: 'pointer'
              }}>
                <Bluetooth size={18} /> Pesarme con la báscula
              </button>
            </motion.section>
          )}

          {/* ACTIVIDAD SEMANAL */}
          <motion.section className="tour-weekly-activity" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} style={{ marginTop: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>Actividad semanal</h2>
              <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, background: 'rgba(255,139,66,0.08)', padding: '4px 10px', borderRadius: '8px' }}>
                {classHistory.length} clases totales
              </div>
            </div>
            <div style={{ background: 'var(--app-surface-solid)', borderRadius: '24px', padding: '20px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px' }}>
                {weeklyActivity.length > 0 ? weeklyActivity.map((dayData, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '100%', maxWidth: '28px', margin: '0 auto', height: `${Math.max(dayData.height, 5)}%`,
                      background: dayData.isToday ? 'linear-gradient(to top, var(--primary), var(--accent))' : (dayData.height > 0 ? '#EEBA89' : 'var(--border-subtle)'),
                      borderRadius: '8px', boxShadow: dayData.isToday ? '0 4px 12px rgba(255,139,66,0.3)' : 'none',
                      opacity: dayData.height === 0 && !dayData.isToday ? 0.4 : 1
                    }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: dayData.isToday ? 'var(--primary)' : 'var(--on-surface-variant)' }}>
                      {dayData.label}
                    </span>
                  </div>
                )) : (
                  [40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '100%', maxWidth: '28px', margin: '0 auto', height: `${h}%`,
                        background: i === 6 ? 'linear-gradient(to top, var(--primary), var(--accent))' : 'var(--border-subtle)',
                        borderRadius: '8px', boxShadow: i === 6 ? '0 4px 12px rgba(255,139,66,0.3)' : 'none'
                      }} />
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: i === 6 ? 'var(--primary)' : 'var(--on-surface-variant)' }}>
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.section>

          {/* SALUD HOY — HealthKit / Health Connect */}
          {isNative && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }} style={{ marginTop: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--black)' }}>Salud hoy</h2>
                {healthPermission && (
                  <button onClick={fetchTodayData} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                    <RefreshCw size={15} />
                  </button>
                )}
              </div>

              {!healthPermission ? (
                <div
                  onClick={requestPermissions}
                  style={{
                    background: 'var(--app-surface-solid)', borderRadius: '24px', padding: '28px 20px',
                    boxShadow: 'var(--card-shadow)', border: '1px dashed var(--primary)',
                    textAlign: 'center', cursor: 'pointer'
                  }}
                >
                  <Heart size={36} color="var(--primary)" style={{ opacity: 0.6, marginBottom: '12px' }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--on-surface)', margin: '0 0 4px' }}>
                    {Capacitor.getPlatform() === 'android' ? 'Conecta Health Connect' : 'Conecta Apple Health'}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: 0 }}>
                    Toca para ver tus pasos y calorías del día
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <MetricRow
                    label="Pasos"
                    value={healthLoading ? '—' : (healthData.steps != null ? healthData.steps.toLocaleString('es-MX') : '—')}
                    unit=""
                    icon={<Activity size={18} />}
                    positive
                  />
                  <MetricRow
                    label="Calorías"
                    value={healthLoading ? '—' : (healthData.calories ?? '—')}
                    unit="kcal"
                    icon={<Flame size={18} />}
                    positive
                  />
                </div>
              )}
            </motion.section>
          )}
        </div>
        </motion.main>
        )}
      </AnimatePresence>

      {/* QR SHEET */}
      {showQR && (
        <>
          <div className="qr-sheet-overlay" onClick={() => setShowQR(false)} />
          <div className="qr-bottom-sheet" style={{ padding: '12px 24px 20px', background: 'var(--surface)' }}>
            <div className="sheet-handle" />
            <button onClick={() => setShowQR(false)} aria-label="Cerrar" style={{ position: 'absolute', top: '14px', right: '16px', width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'var(--fill-subtle)', color: 'var(--on-surface)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}>✕</button>
            <div className="wallet-card" style={{ background: 'var(--surface-low)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-subtle)', position: 'relative', overflow: 'hidden', margin: '0 auto 10px', width: '100%', borderRadius: '30px' }}>
              <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', transform: 'skewX(-20deg)' }} />
              <div className="wallet-header" style={{ borderBottom: 'none', paddingBottom: 0, paddingTop: '20px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(255,139,66,0.18)' }}><img src={ESTUDIO.marca.logo} alt={ESTUDIO.nombre} style={{ height: '24px', width: 'auto', objectFit: 'contain', display: 'block' }} /></div>
                </div>
                <QrCode size={20} color="var(--primary)" opacity={0.8} />
              </div>
              <div className="wallet-body" style={{ padding: '25px 20px', textAlign: 'center' }}>
                <div style={{ background: 'white', padding: '12px', borderRadius: '20px', display: 'inline-block', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.02)' }}>
                  <QRCodeCanvas value={user?.id || 'befit-client-id'} size={160} level="H" includeMargin={false} fgColor="#2D2928" />
                </div>
              </div>
              <div className="wallet-footer" style={{ borderTop: '1px dashed var(--divider)', paddingTop: '20px', paddingBottom: '20px', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Clases Disponibles</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--black)', fontFamily: 'var(--font-display)' }}>{classesRemaining >= 9000 ? '∞' : classesRemaining} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--primary)' }}>{classesRemaining >= 9000 ? 'ilimitadas' : 'sesiones'}</span></div>
                </div>
              </div>
            </div>
            <div className="sheet-user-info" style={{ marginTop: '10px', textAlign: 'center' }}>
              <div className="user-name" style={{ fontWeight: 800 }}>{user?.user_metadata?.full_name || `Miembro ${ESTUDIO.nombre}`}</div>
              <div style={{ color: 'var(--on-surface-variant)' }}>{user?.email}</div>
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
          </div>
        </>
      )}

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
        <Link to="/evolucion" className="nav-item active"><TrendingUp size={22} strokeWidth={2.5} /><span>Metas</span></Link>
        <button className="nav-qr-button" onClick={() => setShowQR(true)}><QrCode size={24} strokeWidth={2.5} /></button>
        {hasNutritionAccess(plan) && <Link to="/nutricion" className="nav-item"><Utensils size={22} strokeWidth={2.5} /><span>Comida</span></Link>}
        <Link to="/agenda" className="nav-item"><Calendar size={22} strokeWidth={2.5} /><span>Clases</span></Link>
      </nav>

      {/* BADGE MODAL */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            className="badge-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBadge(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
              zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--app-surface-solid)', borderRadius: '32px', padding: '40px 30px',
                width: '100%', maxWidth: '340px', textAlign: 'center', position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
              }}
            >
              <button 
                onClick={() => setSelectedBadge(null)}
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--surface-low)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} color="var(--on-surface)" />
              </button>

              <div style={{
                width: '100px', height: '100px', margin: '0 auto 20px', borderRadius: '50%',
                background: selectedBadge.locked ? 'var(--surface)' : 'rgba(255,139,66,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem',
                border: '2px solid', borderColor: selectedBadge.locked ? 'var(--border-subtle)' : 'var(--primary)',
                filter: selectedBadge.locked ? 'grayscale(100%)' : 'none', opacity: selectedBadge.locked ? 0.6 : 1,
                boxShadow: selectedBadge.locked ? 'none' : '0 10px 25px rgba(255,139,66,0.2)'
              }}>
                {selectedBadge.icon}
              </div>

              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', margin: '0 0 10px', color: 'var(--black)' }}>
                {selectedBadge.label}
              </h3>
              
              {selectedBadge.locked ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--surface)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', marginBottom: '15px' }}>
                  🔒 INSIGNIA BLOQUEADA
                </div>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34,197,94,0.1)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, color: '#22C55E', marginBottom: '15px' }}>
                  <Check size={14} /> ¡DESBLOQUEADA!
                </div>
              )}

              <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, margin: 0 }}>
                {selectedBadge.description || (() => {
                  switch(selectedBadge.rule_type) {
                    case 'TOTAL_CLASSES': return `Asiste a ${selectedBadge.rule_value} clase${selectedBadge.rule_value > 1 ? 's' : ''} en total.`;
                    case 'DIFFERENT_COACHES': return `Entrena con ${selectedBadge.rule_value} coaches diferentes.`;
                    case 'WEEKLY_CLASSES': return `Asiste a ${selectedBadge.rule_value} clases en una sola semana.`;
                    case 'PROFILE_COMPLETE': return `Completa tu perfil agregando tu nombre y foto.`;
                    case 'MANUAL': return `Insignia especial otorgada por el equipo de ${ESTUDIO.nombre}.`;
                    default: return `Participa en la comunidad de ${ESTUDIO.nombre}.`;
                  }
                })()}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GOAL MODAL */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowGoalModal(false)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
              zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}
          >
            <motion.div
              className="goal-modal"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--app-surface-solid)', borderRadius: '32px', padding: '40px 30px',
                width: '100%', maxWidth: '340px', textAlign: 'center', position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
              }}
            >
              <button onClick={() => setShowGoalModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--surface-low)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={18} color="var(--on-surface)" />
              </button>
              
              <div style={{ width: '80px', height: '80px', margin: '0 auto 20px', borderRadius: '50%', background: 'rgba(255,139,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Target size={40} />
              </div>
              
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', margin: '0 0 10px', color: 'var(--black)' }}>Define tu Meta</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, margin: '0 0 20px' }}>
                ¿Cuántas clases quieres tomar al mes? Esto nos ayudará a calcular tu Score.
              </p>

              <input
                type="number"
                min={1}
                max={goalLimit}
                value={goalInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') { setGoalInput(''); return; }
                  const n = parseInt(raw, 10);
                  if (isNaN(n)) return;
                  setGoalInput(String(Math.min(Math.max(n, 0), goalLimit)));
                }}
                placeholder="Ej. 12"
                style={{
                  width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-subtle)',
                  background: 'var(--surface)', fontSize: '1.2rem', textAlign: 'center', fontWeight: 800,
                  color: 'var(--black)', outline: 'none', marginBottom: '10px'
                }}
              />

              <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0 0 20px' }}>
                {planLimited
                  ? <>Tu plan <strong style={{ color: 'var(--primary)' }}>{plan}</strong> incluye hasta <strong>{goalLimit}</strong> clases al mes.</>
                  : <>Máximo <strong>{goalLimit}</strong> clases al mes.</>}
              </p>
              
              <button 
                onClick={handleSaveGoal}
                style={{
                  width: '100%', padding: '16px', borderRadius: '20px', border: 'none',
                  background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
                  boxShadow: '0 10px 20px rgba(255,139,66,0.3)'
                }}
              >
                Guardar Meta
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Pesarme (báscula ESF24 por Bluetooth) */}
      <AnimatePresence>
        {showBle && (
          <BasculaBLE user={user} onClose={() => setShowBle(false)} onSaved={fetchMeasurements} />
        )}
      </AnimatePresence>
    </div>
  );
}

function BadgeIcon({ icon, label, locked, onClick }) {
  return (
    <motion.div
      variants={badgeItem}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      whileHover={{ y: -3 }}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '9px', position: 'relative' }}
    >
      <div style={{
        position: 'relative', width: '74px', height: '74px', borderRadius: '22px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        background: locked
          ? 'var(--glass-bg, rgba(255,255,255,0.5))'
          : 'linear-gradient(150deg, rgba(255,234,214,0.62) 0%, rgba(255,180,120,0.40) 100%)',
        backdropFilter: 'blur(18px) saturate(180%)', WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        border: locked ? '1px solid var(--glass-border, rgba(255,255,255,0.5))' : '1px solid rgba(255,255,255,0.55)',
        boxShadow: locked
          ? 'inset 0 1px 0 rgba(255,255,255,0.4)'
          : '0 10px 26px rgba(255,145,77,0.26), inset 0 1px 0 rgba(255,255,255,0.65)'
      }}>
        {/* halo brillante "respirando" para las desbloqueadas */}
        {!locked && (
          <motion.div aria-hidden
            animate={{ opacity: [0.45, 0.85, 0.45], scale: [1, 1.12, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: '-30%', background: 'radial-gradient(circle at 50% 38%, rgba(255,177,118,0.6) 0%, transparent 60%)', pointerEvents: 'none' }}
          />
        )}
        <span style={{ position: 'relative', fontSize: '2rem', lineHeight: 1, filter: locked ? 'grayscale(100%)' : 'none', opacity: locked ? 0.5 : 1 }}>{icon}</span>
        {locked && (
          <div style={{ position: 'absolute', bottom: '5px', right: '5px', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--app-surface-solid)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
            <Lock size={11} color="var(--on-surface-variant)" />
          </div>
        )}
      </div>
      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: locked ? 'var(--on-surface-variant)' : 'var(--on-surface)', maxWidth: '84px', textAlign: 'center', lineHeight: 1.15 }}>{label}</span>
    </motion.div>
  );
}

function MetricRow({ label, value, unit, trend, icon, positive, positiveIsDown }) {
  const isUp = trend?.startsWith('+');
  const isGood = positive ? isUp : positiveIsDown ? !isUp : isUp;
  const goodColor = '#22C55E';
  const badColor = 'var(--primary)';

  return (
    <div style={{ background: 'var(--app-surface-solid)', borderRadius: '20px', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: positive ? 'rgba(255,139,66,0.08)' : 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: positive ? 'var(--primary)' : 'var(--on-surface-variant)' }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--black)', lineHeight: 1 }}>{value}</span>
            {unit && <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{unit}</span>}
          </div>
        </div>
      </div>
      {trend && (
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: isGood ? goodColor : badColor, background: isGood ? 'rgba(34,197,94,0.08)' : 'rgba(255,139,66,0.08)', padding: '5px 10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          {isUp ? '↑' : '↓'} {trend.replace('+', '').replace('-', '')}{unit}
        </div>
      )}
    </div>
  );
}

export default Evolucion;
