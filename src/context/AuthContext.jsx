import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { registerPushToken, unregisterPushToken } from '../hooks/usePushNotifications';
import { scheduleClassReminder, cancelClassReminder, notifyReservationConfirmed, scheduleCancelDeadlineReminder, getNextClassOccurrence, classDateTime } from '../hooks/useLocalNotifications';
import { removeClassFromCalendar } from '../hooks/useCalendar';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { DEFAULT_PLANS, dbRowToPlan, setPlans as hydratePlansRegistry } from '../lib/plans';
import { mexicoTodayStr, mexicoClassStart } from '../lib/dates';
import { registrarIntentoBloqueado, vaciarColaIntentos, esErrorDeRed } from '../lib/telemetria';

// El flag del tour se guarda en almacenamiento NATIVO (Preferences) porque el
// localStorage del WebView lo purga iOS entre lanzamientos → el tour reaparecía.
const hasSeenTour = async (userId) => {
  const key = `befit_tour_seen_${userId}`;
  const { value } = await Preferences.get({ key });
  if (value) return true;
  if (localStorage.getItem(key)) { await Preferences.set({ key, value: 'true' }); return true; } // migración
  return false;
};

// Se exporta para que el modo demo (src/demo/DemoProvider.jsx) pueda servir la
// misma forma con datos en memoria, sin que Portal ni Agenda se enteren.
export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [role, setRole] = useState(null);
  const [plan, setPlan] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState('INACTIVE');
  const [planStartedAt, setPlanStartedAt] = useState(null);   // fecha de pago
  const [planExpiresAt, setPlanExpiresAt] = useState(null);   // vence (pago + 1 mes)
  const [membershipRenewal, setMembershipRenewal] = useState('active'); // active | paused | canceling
  const [hasSubscription, setHasSubscription] = useState(false);        // tiene suscripción Stripe (cobro automático)
  const [loading, setLoading] = useState(true);
  const [customBadges, setCustomBadges] = useState([]);
  const [badgeQueue, setBadgeQueue] = useState([]); // cola de insignias por animar
  const dismissBadge = () => setBadgeQueue(q => q.slice(1));
  const [showTour, setShowTour] = useState(false);

  // ESTADO GLOBAL DE RESERVAS (Supabase)
  const [badgeConfigs, setBadgeConfigs] = useState([]);
  const [classesRemaining, setClassesRemaining] = useState(0);
  const [globalClasses, setGlobalClasses] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [cafeProducts, setCafeProducts] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  // Flags de "ya hizo la 1ª carga" → para distinguir "cargando" de "vacío real"
  // y mostrar skeletons hasta que el dataset trajo respuesta del servidor.
  const [classesLoaded, setClassesLoaded] = useState(false);
  const [recipesLoaded, setRecipesLoaded] = useState(false);
  const [cafeProductsLoaded, setCafeProductsLoaded] = useState(false);
  const [disciplinesLoaded, setDisciplinesLoaded] = useState(false);
  const [myReservations, setMyReservations] = useState([]);
  // ¿El canal de realtime está conectado? Si lo está, no hace falta sondear.
  const realtimeVivoRef = useRef(false);
  // Cuánta historia de clases necesita quien está usando la app ahora mismo.
  const alcanceRef = useRef('publico');
  const [waitlistPositions, setWaitlistPositions] = useState({}); // { classId: posición }
  const [allUsers, setAllUsers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [classTemplates, setClassTemplates] = useState([]);
  // Membresías (tabla membership_plans). `plans` = lista para mostrar (activos,
  // ordenados); `allPlans` = todo (incl. archivados) para resolver por nombre.
  // Arranca con los defaults para que el sitio nunca quede vacío antes de la BD.
  const [plans, setPlansState] = useState(() => DEFAULT_PLANS.filter(p => p.active !== false));
  const [allPlans, setAllPlans] = useState(DEFAULT_PLANS);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [monthlyGoal, setMonthlyGoal] = useState(0); // meta de clases/mes (users.target_monthly_classes)

  // Nutrición — favoritos persistentes + tracker de calorías consumidas (food_log)
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState(() => new Set()); // recipe_favorites
  const [todayLog, setTodayLog] = useState([]);              // food_log del día de hoy
  const [selfCalorieGoal, setSelfCalorieGoal] = useState(null); // users.calorie_goal (meta propia)
  const [planCalories, setPlanCalories] = useState(null);       // nutrition_plans.calories (objetivo Fit/Premium)

  // Centro de notificaciones in-app (tabla notification_logs en tiempo real)
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter(n => !n.read_at).length;
  // Panel de notificaciones abierto desde el menú de perfil
  const [notifOpen, setNotifOpen] = useState(false);

  // Flag para evitar que onAuthStateChange sobreescriba un plan recién activado
  const planJustActivatedRef = useRef(false);
  // Garantiza que la recarga de datos compartidos (clases, recetas, cafetería, etc.)
  // corra UNA vez por login, ya con la auth lista (evita el "no cargó hasta reabrir").
  const sharedLoadedForRef = useRef(null);
  // Id del usuario para el que ya se cargó la sesión. Evita que cada evento de auth
  // (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED…) rehaga todo el trabajo y haga
  // "parpadear" la app al abrir por deep link en nativo.
  const loadedAuthUserIdRef = useRef(null);

  // Función para limpiar sesión fantasma por completo
  const forceCleanSession = async () => {
    try { await supabase.auth.signOut(); } catch(e) {}
    // Limpiar manualmente tokens de Supabase del localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
    setUser(null);
    setRole(null);
    setPlan(null);
    setMembershipStatus('INACTIVE');
    setPlanStartedAt(null);
    setPlanExpiresAt(null);
    setClassesRemaining(0);
    setMonthlyGoal(0);
    setMyReservations([]);
    setCustomBadges([]);
    setBadgeConfigs([]);
    setLoading(false);
  };

  // Calcula TODAS las insignias ganadas leyendo datos frescos de la BD
  // (historial con check-in + perfil + insignias manuales). Cubre todos los
  // tipos, incluido PROFILE_COMPLETE.
  const computeEarnedBadges = async (userId) => {
    const [{ data: history }, { data: profile }] = await Promise.all([
      supabase.from('reservations').select('created_at, classes(instructor)').eq('user_id', userId).eq('checked_in', true),
      supabase.from('users').select('full_name, avatar_url, custom_badges').eq('id', userId).single(),
    ]);
    const count = history?.length || 0;
    const coachesSet = new Set((history || []).map(h => h.classes?.instructor).filter(Boolean));
    const weekCounts = {};
    (history || []).forEach(h => {
      const d = new Date(h.created_at);
      const weekKey = `${d.getFullYear()}-${Math.floor(d.getTime() / (1000 * 60 * 60 * 24 * 7))}`;
      weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
    });
    const maxWeekly = Math.max(0, ...Object.values(weekCounts));
    const profileComplete = !!(profile?.full_name && profile.full_name.trim() !== '' && profile?.avatar_url);
    const customLabels = (profile?.custom_badges || []).map(cb => cb.label).filter(Boolean);

    return (badgeConfigs || []).filter(rule => {
      if (customLabels.includes(rule.label)) return true;
      switch (rule.rule_type) {
        case 'TOTAL_CLASSES': return count >= rule.rule_value;
        case 'DIFFERENT_COACHES': return coachesSet.size >= rule.rule_value;
        case 'WEEKLY_CLASSES': return maxWeekly >= rule.rule_value;
        case 'PROFILE_COMPLETE': return profileComplete;
        default: return false; // MANUAL solo por customLabels
      }
    });
  };

  // Evalúa y encola para animar las insignias NUEVAS. La primera vez (sin
  // registro local) SIEMBRA en silencio para no animar insignias ya obtenidas
  // (p.ej. en un dispositivo nuevo).
  const evaluateBadgesForUnlock = async (userId) => {
    if (!userId || !badgeConfigs || badgeConfigs.length === 0) return;
    const earned = await computeEarnedBadges(userId);
    const key = `befit_earned_badges_${userId}`;
    const raw = localStorage.getItem(key);

    if (raw === null) {
      localStorage.setItem(key, JSON.stringify(earned.map(b => b.id)));
      return; // siembra silenciosa
    }

    const storedArr = JSON.parse(raw);
    const newBadges = earned.filter(b => !storedArr.includes(b.id));
    if (newBadges.length > 0) {
      setBadgeQueue(q => [...q, ...newBadges]);
      localStorage.setItem(key, JSON.stringify([...storedArr, ...newBadges.map(b => b.id)]));
    }
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`public:reservations:user_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations', filter: `user_id=eq.${user.id}` }, (payload) => {
        // Cualquier cambio en mis reservas (reserva, cancelación, check-in del admin)
        // refresca mi lista y mis clases restantes sin necesidad de recargar.
        fetchUserData(user);
        // Insignias al hacer check-in
        if (payload.eventType === 'UPDATE' && payload.new?.checked_in && !payload.old?.checked_in) {
           evaluateBadgesForUnlock(user.id);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, badgeConfigs]);

  // Posición en la lista de espera para cada reserva 'waitlist' (RPC del server,
  // ordena por enqueued_at). Se recalcula cuando cambian mis reservas en espera.
  const waitlistKey = myReservations
    .filter(r => r.status === 'waitlist')
    .map(r => r.classId)
    .sort()
    .join(',');
  useEffect(() => {
    if (!user || !waitlistKey) { setWaitlistPositions({}); return; }
    let cancelled = false;
    (async () => {
      const ids = waitlistKey.split(',');
      const entries = await Promise.all(ids.map(async (classId) => {
        try {
          const { data } = await supabase.rpc('waitlist_position', { p_class_id: classId, p_user_id: user.id });
          return [classId, data];
        } catch { return [classId, null]; }
      }));
      if (!cancelled) setWaitlistPositions(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [user, waitlistKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Evalúa insignias cuando cambian perfil/insignias (dispara "Listos para
  // Arrancar" al completar el perfil) y SIEMBRA en silencio en el primer arranque.
  useEffect(() => {
    if (!user || !badgeConfigs || badgeConfigs.length === 0) return;
    evaluateBadgesForUnlock(user.id);
  }, [user, badgeConfigs, profileName, avatarUrl, customBadges]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mi registro de usuario en tiempo real: plan, clases restantes y estatus
  // se actualizan cuando el admin los modifica, sin recargar la app.
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`public:users:self_${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, () => {
        // No pisar un plan recién activado localmente (race con activatePlan)
        if (planJustActivatedRef.current) return;
        fetchUserData(user);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Centro de notificaciones en tiempo real
  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    fetchNotifications(user.id);
    const channel = supabase.channel(`public:notifs:user_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_logs', filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notification_logs', filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresca sesión y datos cuando la app vuelve al frente (nativa + PWA)
  useEffect(() => {
    let lastRefresh = 0;
    const THROTTLE_MS = 10_000; // máximo una vez cada 10 s para evitar ráfagas

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefresh < THROTTLE_MS) return;
      lastRefresh = now;

      // 1. Re-cargar las clases SIEMPRE, incluso sin sesión, para que el
      // calendario del sitio se actualice al volver a la pestaña aunque
      // realtime se haya caído. Las recetas ya no: solo las ve quien entra.
      fetchGlobalClasses(alcanceRef.current);

      // 2. Leer la sesión vigente. autoRefreshToken renueva el token si expiró.
      // NO cerramos sesión aquí ante una sesión ausente/errores transitorios
      // (p.ej. reabrir la app sin red): eso provocaba logouts indebidos.
      // La expiración real la maneja onAuthStateChange (evento SIGNED_OUT).
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 3. Re-cargar datos del usuario si sigue logueado
      if (session.user) {
        fetchUserData(session.user);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Suscripción global en tiempo real a los cambios en clases
  useEffect(() => {
    const channel = supabase.channel('public:classes:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
        fetchGlobalClasses(alcanceRef.current);
      })
      .subscribe((status) => {
        // Al (re)conectar el socket sincronizamos clases. Cubre el arranque en
        // frío y las reconexiones tras perder red / volver del fondo, que antes
        // dejaban el calendario vacío hasta recargar la página.
        realtimeVivoRef.current = status === 'SUBSCRIBED';
        if (status === 'SUBSCRIBED') {
          fetchGlobalClasses(alcanceRef.current);
        }
      });
    return () => supabase.removeChannel(channel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Respaldo anti "calendario vacío": si realtime se cae o un evento no llega,
  // refrescamos las clases para que el sitio se auto-sane sin recargar.
  //
  // 🔴 ESTO COSTABA CASI TODO EL EGRESS. Antes corría CADA 60 SEGUNDOS y sin
  // filtro: 319 KB por minuto y por pestaña abierta, o sea ~19 MB por hora y
  // por persona con la app abierta. Con eso solo se iba el presupuesto entero
  // del plan gratuito.
  //
  // Ahora el respaldo tiene dos velocidades:
  //   · Canal caído  → cada 5 min, que es cuando de verdad hace falta.
  //   · Canal arriba → cada 20 min de todos modos. Un canal puede reportarse
  //     SUBSCRIBED y aun así dejar de entregar eventos; si el respaldo
  //     dependiera solo del estado del canal, ese caso no se corregiría nunca.
  //
  // Costo: antes eran 319 KB cada minuto (~19 MB/hora por pestaña). Ahora, en
  // el caso normal, 65 KB cada 20 min ≈ 195 KB/hora. Un 1% de lo anterior,
  // conservando la red de seguridad.
  useEffect(() => {
    let ultimo = 0;
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const espera = realtimeVivoRef.current ? 20 * 60_000 : 5 * 60_000;
      if (Date.now() - ultimo < espera) return;
      ultimo = Date.now();
      fetchGlobalClasses(alcanceRef.current);
    }, 60_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Menú de cafetería en tiempo real (el admin cambia precios → se refleja ya)
  useEffect(() => {
    const channel = supabase.channel('public:cafe_products:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_products' }, () => {
        fetchCafeProducts();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') fetchCafeProducts();
      });
    return () => supabase.removeChannel(channel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Catálogo de disciplinas/clases en tiempo real (admin edita → web/app se refleja)
  useEffect(() => {
    const channel = supabase.channel('public:disciplines:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disciplines' }, () => {
        fetchDisciplines();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') fetchDisciplines();
      });
    return () => supabase.removeChannel(channel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Admin / Coach: la lista de clientes se mantiene en vivo
  useEffect(() => {
    if (!user || (role !== 'ADMIN' && role !== 'COACH')) return;
    const channel = supabase.channel('public:users:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchAllUsers();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, role]); // eslint-disable-line react-hooks/exhaustive-deps

  // fetchCoaches moved to run after auth

  // Aplica el usuario de una sesión SIN trabajo redundante. Mantiene la referencia
  // de `user` estable cuando es el mismo id (así los efectos realtime con dep [user]
  // NO se resuscriben en cada evento) y solo recarga datos pesados en un inicio de
  // sesión real (cambio de usuario), no en TOKEN_REFRESHED ni re-emisiones.
  const applySessionUser = (sessionUser, { force = false } = {}) => {
    setUser(prev => (prev && prev.id === sessionUser.id ? prev : sessionUser));
    if (loadedAuthUserIdRef.current === sessionUser.id && !force) return;
    loadedAuthUserIdRef.current = sessionUser.id;
    registerPushToken(sessionUser.id);
    if (!planJustActivatedRef.current) fetchUserData(sessionUser);
    fetchAllUsers();
    fetchCoaches();
    if (Capacitor.isNativePlatform()) {
      hasSeenTour(sessionUser.id).then(seen => { if (!seen) setTimeout(() => setShowTour(true), 1500); });
    }
  };

  useEffect(() => {
    // Verificar sesión activa inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const isNative = Capacitor.isNativePlatform();
      // En nativo siempre garantizar el flag para que futuras aperturas funcionen
      if (isNative && session?.user) {
        localStorage.setItem('befit_remember_me', '1');
      }
      // Si volvemos de un pago web (redirect a Stripe y de regreso), el sessionStorage
      // del tab pudo perderse en el viaje. Restaurar el flag para NO cerrar la sesión.
      if (!isNative && session?.user) {
        const payReturn = localStorage.getItem('befit_payment_return');
        if (payReturn && (Date.now() - Number(payReturn) < 15 * 60 * 1000)) {
          sessionStorage.setItem('befit_session_active', '1');
        }
        localStorage.removeItem('befit_payment_return');
      }
      // En web: auto-signout si el usuario no marcó "mantener sesión" y no hay sesión de tab activa
      if (!isNative && session?.user && !localStorage.getItem('befit_remember_me') && !sessionStorage.getItem('befit_session_active')) {
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      if (session?.user) {
        applySessionUser(session.user);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios (login, logout) reales
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // applySessionUser ya evita el trabajo redundante: solo recarga cuando el
        // usuario cambia de verdad, no en cada TOKEN_REFRESHED / re-emisión.
        applySessionUser(session.user);
      } else {
        setRole(null);
        setPlan(null);
        setMembershipStatus('INACTIVE');
        setPlanStartedAt(null);
        setPlanExpiresAt(null);
        setUser(null);
        sharedLoadedForRef.current = null;
        loadedAuthUserIdRef.current = null;
        setGlobalClasses([]);
        setRecipes([]);
        setMyReservations([]);
        setClassesRemaining(0);
        setLoading(false);
      }
    });

    // Datos que el SITIO PÚBLICO sí usa (Landing lee clases, coaches,
    // insignias y planes). Lo demás se pedía también sin sesión y nadie lo
    // miraba: recetas y menú de cafetería son de clienta con sesión, y las
    // plantillas y categorías son del panel de administración.
    fetchGlobalClasses('publico');
    fetchBadgeConfigs();
    fetchCoaches();
    fetchPlans();

    return () => subscription.unsubscribe();
  }, []);

  const fetchBadgeConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('badges_config')
        .select('*')
        .order('created_at', { ascending: true });
      if (data) setBadgeConfigs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'CLIENT')
        .order('full_name', { ascending: true });
        
      if (data) {
        setAllUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCoaches = async () => {
    try {
      // Vista `coach_directory` (SIN PII): ya trae a las cuentas COACH Y a quien
      // imparte clases aunque su cuenta sea CLIENT (la dueña como socia). Se lee
      // por la vista para NO exponer correo/teléfono/stripe de nadie: la lectura
      // directa de `users` quedó cerrada a clientas (solo su fila + staff).
      const { data } = await supabase
        .from('coach_directory')
        .select('id, full_name, avatar_url, bio, experience, role')
        .order('full_name', { ascending: true });
      setCoaches(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Membresías: lee la tabla, hidrata el registro vivo (lib/plans) y el estado.
  // Resiliente: si la BD falla, conserva lo que haya (defaults) y no rompe el sitio.
  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (Array.isArray(data) && data.length) {
        const mapped = data.map(dbRowToPlan);
        hydratePlansRegistry(mapped);          // PLANS/PLAN_BY_NAME vivos (todos)
        setAllPlans(mapped);
        setPlansState(mapped.filter(p => p.active !== false));
      }
    } catch (err) {
      console.error('fetchPlans error (se conservan los planes por defecto):', err);
    }
  };

  const createPlan = async (payload) => {
    try {
      const { error } = await supabase.from('membership_plans').insert(payload);
      if (error) throw error;
      await fetchPlans();
      return { success: true };
    } catch (err) {
      console.error('createPlan error:', err);
      return { success: false, error: err };
    }
  };

  // `name` y `stripe_lookup_base` NO se actualizan (claves estables de Stripe/usuarios).
  const updatePlan = async (id, fields) => {
    try {
      const { name, stripe_lookup_base, id: _omit, created_at, updated_at, ...safe } = fields || {};
      const { error } = await supabase.from('membership_plans').update(safe).eq('id', id);
      if (error) throw error;
      await fetchPlans();
      return { success: true };
    } catch (err) {
      console.error('updatePlan error:', err);
      return { success: false, error: err };
    }
  };

  // Borrado real solo si ninguna clienta lo tiene asignado; si no, se archiva
  // (active=false) para conservar la resolución por nombre del historial.
  const deletePlan = async (plan) => {
    try {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('membership_plan', plan.name);
      if (count && count > 0) {
        const { error } = await supabase.from('membership_plans').update({ active: false }).eq('id', plan.id);
        if (error) throw error;
        await fetchPlans();
        return { success: true, archived: true, count };
      }
      const { error } = await supabase.from('membership_plans').delete().eq('id', plan.id);
      if (error) throw error;
      await fetchPlans();
      return { success: true, archived: false };
    } catch (err) {
      console.error('deletePlan error:', err);
      return { success: false, error: err };
    }
  };

  // Columnas que la app usa de verdad. `class_date` y `day_of_week` no se leen
  // en ningún lado y `created_at` tampoco: pedirlas era peso muerto en cada
  // carga. `select('*')` traía las 20.
  const COLUMNAS_CLASE = 'id,title,instructor,day,time,level,spots,max_spots,color,'
    + 'date,category,description,coach_id,category_color,is_special,special_label,special_color';

  // Cuántos días hacia atrás necesita cada quien. Una visitante anónima del
  // sitio solo va a reservar clases futuras; una clienta necesita unos días de
  // historia para su resumen; el staff toma lista de fechas pasadas.
  const DIAS_ATRAS = { publico: 0, cliente: 10, staff: 60 };

  const fetchGlobalClasses = async (alcance = 'publico') => {
    try {
      const dias = DIAS_ATRAS[alcance] ?? 0;
      const desde = new Date();
      desde.setDate(desde.getDate() - dias);
      const desdeISO = desde.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('classes')
        .select(COLUMNAS_CLASE)
        // Las clases sin fecha son plantillas recurrentes: van siempre.
        .or(`date.is.null,date.gte.${desdeISO}`)
        .order('date', { ascending: true, nullsFirst: false })
        .order('day', { ascending: true })
        .order('time', { ascending: true });

      if (data) {
        setGlobalClasses(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClassesLoaded(true);
    }
  };

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: true });

      if (data) {
        setRecipes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecipesLoaded(true);
    }
  };

  // ============================================
  // NUEVA: Obtener alumnas reales inscritas en una clase
  // ============================================
  const fetchClassReservations = async (classId) => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, users:user_id(id, full_name, email, phone, membership_plan, classes_remaining, membership_status)')
        .eq('class_id', classId);

      if (error) {
        console.error('Error fetching class reservations:', error);
        return [];
      }

      if (data) {
        return data.map(r => ({
          reservationId: r.id,
          userId: r.user_id,
          checkedIn: r.checked_in,
          name: r.users?.full_name || r.users?.email?.split('@')[0] || 'Sin nombre',
          email: r.users?.email || '',
          phone: r.users?.phone || '',
          plan: r.users?.membership_plan || 'Sin Plan',
          classesRemaining: r.users?.classes_remaining || 0,
          status: r.users?.membership_status || 'INACTIVE'
        }));
      }
      return [];
    } catch (err) {
      console.error('Error fetching class reservations:', err);
      return [];
    }
  };

  // ============================================
  // NUEVA: Obtener clases por día de la semana (0-6)
  // ============================================
  const fetchClassesByDayOfWeek = async (dayOfWeek) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('day', dayOfWeek)
        .order('time', { ascending: true });

      if (error) {
        console.error('Error fetching classes by day:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  // ============================================
  // ADMIN CRUD OPERATIONS
  // ============================================
  const addClass = async (classData) => {
    try {
      const { data, error } = await supabase.from('classes').insert(classData).select().single();
      if (!error && data) setGlobalClasses(prev => [...prev, data].sort((a,b) => (a.date > b.date ? 1 : -1)));
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const addMultipleClasses = async (classesArray) => {
    try {
      const { data, error } = await supabase.from('classes').insert(classesArray).select();
      if (!error && data) {
        setGlobalClasses(prev => [...prev, ...data].sort((a,b) => (a.date > b.date ? 1 : -1)));
      }
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteClass = async (classId) => {
    try {
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (!error) setGlobalClasses(prev => prev.filter(c => c.id !== classId));
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const updateClass = async (classId, fields) => {
    try {
      const { data, error } = await supabase.from('classes').update(fields).eq('id', classId).select().single();
      if (!error && data) setGlobalClasses(prev => prev.map(c => c.id === classId ? data : c));
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  // ============================================
  // CATEGORÍAS DE CLASE (catálogo gestionable)
  // ============================================
  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('class_categories').select('*').order('name', { ascending: true });
      if (data) setCategories(data);
    } catch (err) { console.error(err); }
  };

  const addCategory = async (name, color) => {
    try {
      const { data, error } = await supabase.from('class_categories').insert({ name: name.trim(), color }).select().single();
      if (!error && data) setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return { success: !error, error };
    } catch (err) { return { success: false, error: err }; }
  };

  // Renombra y/o recolorea una categoría y actualiza TODAS sus clases de golpe
  const updateCategory = async (id, { name, color, oldName }) => {
    try {
      const { error } = await supabase.from('class_categories').update({ name: name.trim(), color }).eq('id', id);
      if (error) return { success: false, error };
      await supabase.from('classes').update({ category: name.trim(), category_color: color }).eq('category', oldName);
      await Promise.all([fetchCategories(), fetchGlobalClasses(alcanceRef.current)]);
      return { success: true };
    } catch (err) { return { success: false, error: err }; }
  };

  const deleteCategory = async (id) => {
    try {
      const { error } = await supabase.from('class_categories').delete().eq('id', id);
      if (!error) setCategories(prev => prev.filter(c => c.id !== id));
      return { success: !error, error };
    } catch (err) { return { success: false, error: err }; }
  };

  // ============================================
  // PLANTILLAS DE SEMANA
  // ============================================
  const fetchTemplates = async () => {
    try {
      const { data } = await supabase.from('class_templates').select('*').order('created_at', { ascending: false });
      if (data) setClassTemplates(data);
    } catch (err) { console.error(err); }
  };

  const saveTemplate = async (name, items) => {
    try {
      const { data, error } = await supabase.from('class_templates').insert({ name: name.trim(), items }).select().single();
      if (!error && data) setClassTemplates(prev => [data, ...prev]);
      return { success: !error, error };
    } catch (err) { return { success: false, error: err }; }
  };

  const deleteTemplate = async (id) => {
    try {
      const { error } = await supabase.from('class_templates').delete().eq('id', id);
      if (!error) setClassTemplates(prev => prev.filter(t => t.id !== id));
      return { success: !error, error };
    } catch (err) { return { success: false, error: err }; }
  };

  // Aplica una plantilla creando clases en cada día coincidente del rango
  const applyTemplate = async (items, startDateStr, endDateStr) => {
    try {
      const start = new Date(startDateStr + 'T12:00:00');
      const end = new Date(endDateStr + 'T12:00:00');
      const toCreate = [];
      let cur = new Date(start);
      while (cur <= end) {
        (items || []).forEach(it => {
          if (it.day === cur.getDay()) {
            toCreate.push({
              title: it.title, time: it.time, instructor: it.instructor || '', coach_id: it.coach_id || null,
              category: it.category || null, category_color: it.category_color || null,
              description: it.description || null, date: cur.toISOString().split('T')[0],
              day: cur.getDay(), spots: it.spots || 10, level: it.level || 'Todos los niveles',
            });
          }
        });
        cur.setDate(cur.getDate() + 1);
      }
      if (toCreate.length === 0) return { success: false, error: { message: 'No hay días coincidentes en el rango.' } };
      return await addMultipleClasses(toCreate);
    } catch (err) { return { success: false, error: err }; }
  };

  const addRecipe = async (recipeData) => {
    try {
      const { data, error } = await supabase.from('recipes').insert(recipeData).select().single();
      if (!error && data) setRecipes(prev => [...prev, data]);
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteRecipe = async (recipeId) => {
    try {
      const { error } = await supabase.from('recipes').delete().eq('id', recipeId);
      if (!error) setRecipes(prev => prev.filter(r => r.id !== recipeId));
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  // ============================================
  // CAFETERÍA (catálogo en BD — precios server-side)
  // ============================================
  const fetchCafeProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('cafe_products')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });
      if (!error && data) setCafeProducts(data);
    } catch (err) {
      console.error('Error cargando productos de cafetería:', err);
    } finally {
      setCafeProductsLoaded(true);
    }
  };

  const addCafeProduct = async (product) => {
    try {
      const { data, error } = await supabase.from('cafe_products').insert(product).select().single();
      if (!error && data) setCafeProducts(prev => [...prev, data]);
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const updateCafeProduct = async (id, updates) => {
    try {
      const { data, error } = await supabase.from('cafe_products').update(updates).eq('id', id).select().single();
      if (!error && data) setCafeProducts(prev => prev.map(p => p.id === id ? data : p));
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteCafeProduct = async (id) => {
    try {
      const { error } = await supabase.from('cafe_products').delete().eq('id', id);
      if (!error) setCafeProducts(prev => prev.filter(p => p.id !== id));
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  // ============================================
  // DISCIPLINAS / CLASES (catálogo en BD — web + admin)
  // ============================================
  const fetchDisciplines = async () => {
    try {
      const { data, error } = await supabase
        .from('disciplines')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!error && data) setDisciplines(data);
    } catch (err) {
      console.error('Error cargando disciplinas:', err);
    } finally {
      setDisciplinesLoaded(true);
    }
  };

  const addDiscipline = async (discipline) => {
    try {
      const { data, error } = await supabase.from('disciplines').insert(discipline).select().single();
      if (!error && data) setDisciplines(prev => [...prev, data]);
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const updateDiscipline = async (id, updates) => {
    try {
      const { data, error } = await supabase.from('disciplines').update(updates).eq('id', id).select().single();
      if (!error && data) setDisciplines(prev => prev.map(d => d.id === id ? data : d));
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteDiscipline = async (id) => {
    try {
      const { error } = await supabase.from('disciplines').delete().eq('id', id);
      if (!error) setDisciplines(prev => prev.filter(d => d.id !== id));
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const createBadgeConfig = async (configData) => {
    try {
      const { data, error } = await supabase.from('badges_config').insert(configData).select().single();
      if (!error && data) setBadgeConfigs(prev => [...prev, data]);
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const updateBadgeConfig = async (badgeId, configData) => {
    try {
      const { data, error } = await supabase.from('badges_config').update(configData).eq('id', badgeId).select().single();
      if (!error && data) {
        setBadgeConfigs(prev => prev.map(b => b.id === badgeId ? data : b));
      }
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteBadgeConfig = async (badgeId) => {
    try {
      const { error } = await supabase.from('badges_config').delete().eq('id', badgeId);
      if (!error) setBadgeConfigs(prev => prev.filter(b => b.id !== badgeId));
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const assignCustomBadge = async (userId, newBadge) => {
    try {
      const userObj = allUsers.find(u => u.id === userId);
      const currentBadges = userObj?.custom_badges || [];
      const updatedBadges = [...currentBadges, newBadge];
      
      const { error } = await supabase
        .from('users')
        .update({ custom_badges: updatedBadges })
        .eq('id', userId);
        
      if (!error) {
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, custom_badges: updatedBadges } : u));
      }
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const removeCustomBadge = async (userId, badgeLabelToRemove) => {
    try {
      const userObj = allUsers.find(u => u.id === userId);
      const currentBadges = userObj?.custom_badges || [];
      const updatedBadges = currentBadges.filter(b => b.label !== badgeLabelToRemove);
      
      const { error } = await supabase
        .from('users')
        .update({ custom_badges: updatedBadges })
        .eq('id', userId);
        
      if (!error) {
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, custom_badges: updatedBadges } : u));
      }
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  // Meta de clases por mes — vive en users (no en auth metadata) para que se
  // cargue fresca con el resto del perfil y el staff pueda verla.
  const updateMonthlyGoal = async (newGoal) => {
    const goal = parseInt(newGoal, 10);
    if (!user?.id || !goal || goal < 1) return { success: false };
    const { error } = await supabase.from('users').update({ target_monthly_classes: goal }).eq('id', user.id);
    if (!error) setMonthlyGoal(goal);
    return { success: !error, error };
  };

  const fetchUserData = async (currentUser) => {
    try {
      // 1. Obtener rol y clases restantes
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, classes_remaining, membership_plan, membership_status, plan_started_at, plan_expires_at, membership_renewal, stripe_subscription_id, full_name, custom_badges, avatar_url, target_monthly_classes, calorie_goal')
        .eq('id', currentUser.id)
        .single();
        
      if (userError && userError.code === 'PGRST116') {
        // La fila no existe (posible error del trigger o usuario antiguo). La creamos ahora mismo.
        const newRow = {
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.user_metadata?.full_name || '',
          role: 'CLIENT',
          membership_status: 'INACTIVE',
          classes_remaining: 0
        };
        await supabase.from('users').insert(newRow);
        
        setRole('CLIENT');
        setPlan('none');
        setMembershipStatus('INACTIVE');
        setClassesRemaining(0);
      } else if (userData) {
        const rol = (userData.role || 'CLIENT').toUpperCase();
        setRole(rol);
        // El staff toma lista de fechas pasadas; una clienta solo necesita unos
        // días de historia. Se recarga una vez, al saber quién es.
        const alcance = ['ADMIN', 'COACH', 'RECEPCION', 'BARISTA'].includes(rol) ? 'staff' : 'cliente';
        if (alcanceRef.current !== alcance) {
          alcanceRef.current = alcance;
          fetchGlobalClasses(alcance);
        }
        setPlan(userData.membership_plan);
        setMembershipStatus(userData.membership_status || 'INACTIVE');
        setPlanStartedAt(userData.plan_started_at || null);
        setPlanExpiresAt(userData.plan_expires_at || null);
        setMembershipRenewal(userData.membership_renewal || 'active');
        setHasSubscription(!!userData.stripe_subscription_id);
        setClassesRemaining(userData.classes_remaining || 0);
        setMonthlyGoal(userData.target_monthly_classes || 0);
        setSelfCalorieGoal(userData.calorie_goal ?? null);
        setProfileName(userData.full_name || '');
        setCustomBadges(userData.custom_badges || []);

        // Avatar: la BD es la fuente de verdad. Se carga aquí (en TODAS las rutas
        // de auth: arranque, login, refresh, realtime), no solo en el getSession
        // inicial — eso causaba que "a veces cargara y a veces no".
        if (userData.avatar_url) {
          setAvatarUrl(userData.avatar_url);
          try { localStorage.setItem(`avatar_${currentUser.id}`, userData.avatar_url); } catch (e) {}
        } else {
          // BD sin avatar pero hay uno cacheado localmente → subirlo para que
          // otros perfiles (coach en reservas, etc.) también lo vean.
          const cached = localStorage.getItem(`avatar_${currentUser.id}`);
          if (cached) {
            setAvatarUrl(cached);
            supabase.from('users').update({ avatar_url: cached }).eq('id', currentUser.id);
          }
        }
      } else {
        setRole('CLIENT');
        setPlan('none');
        setMembershipStatus('INACTIVE');
      }

      // Cargar favoritos + diario + objetivo aquí garantiza auth lista (el query a
      // users ya pasó RLS) → evita que queden vacíos por carrera en arranque nativo.
      loadNutritionTracking(currentUser.id);
      // Recargar TODOS los datos compartidos (clases, recetas, cafetería, etc.) una
      // sola vez por login, ya con la auth lista. Soluciona de forma general el
      // "no cargó hasta reabrir" para todo lo que depende de realtime / RLS.
      if (sharedLoadedForRef.current !== currentUser.id) {
        sharedLoadedForRef.current = currentUser.id;
        loadSharedData();

        // Backfill de datos del registro: con verificación de correo activa, el
        // signUp no deja sesión, así que cumpleaños/estatura se guardaron en
        // user_metadata y se copian al perfil aquí (primer login ya autenticado).
        // También aplica un plan comprado antes de registrarse (aplazado).
        (async () => {
          try {
            const md = currentUser.user_metadata || {};
            if (md.birth_date || md.height_cm != null) {
              const { data: cur } = await supabase.from('users').select('birth_date, height_cm').eq('id', currentUser.id).single();
              const patch = {};
              if (md.birth_date && !cur?.birth_date) patch.birth_date = md.birth_date;
              if (md.height_cm != null && cur?.height_cm == null) patch.height_cm = parseFloat(md.height_cm);
              if (Object.keys(patch).length) await supabase.from('users').update(patch).eq('id', currentUser.id);
            }
            // ⚠️ SEGURIDAD: NO activar la membresía aquí por una bandera de
            // localStorage. Antes se hacía `activatePlan(...)` si había
            // `befit_pending_plan`, lo que DABA ACCESO SIN COBRO cuando el pago
            // de Stripe quedaba incompleto/abandonado. La membresía SOLO se
            // activa con pago confirmado: el webhook (`checkout.session.completed`
            // con payment_status='paid' / `invoice.payment_succeeded`) o
            // `stripe-membership-notify` (verifica el PaymentIntent/suscripción).
            // La bandera se conserva solo para que /planes re-muestre el plan
            // elegido al volver de Stripe (no activa nada).
          } catch (e) { console.error('Backfill registro:', e); }
        })();
      }

      // 2. Obtener mis reservas
      const { data: resData, error: resError } = await supabase
        .from('reservations')
        .select('*, classes(*)')
        .eq('user_id', currentUser.id);

      if (resData) {
        // Formatear al estilo esperado por el frontend
        const formattedReservations = resData.map(r => ({
          id: r.id,
          classId: r.class_id,
          title: r.classes?.title,
          time: r.classes?.time,
          date: r.classes?.date ?? null,
          instructor: r.classes?.instructor,
          coachId: r.classes?.coach_id ?? null,
          color: r.classes?.color,
          checkedIn: r.checked_in,
          status: r.status || 'confirmed', // 'confirmed' | 'waitlist' | 'offered'
          offerExpiresAt: r.offer_expires_at ?? null, // deadline para confirmar (status 'offered')
          autoClaim: r.auto_claim === true,           // en espera: ¿entro solita al liberarse?
          promotedAt: r.promoted_at ?? null,          // el sistema le dio el lugar (no lo eligió ella)
          calendarEventId: r.calendar_event_id ?? null
        }));
        setMyReservations(formattedReservations);
      }
      // Intentos frenados que quedaron en cola sin red → se mandan ahora.
      vaciarColaIntentos(currentUser?.id);
    } catch (err) {
      console.error("Error obteniendo datos del usuario:", err);
      setRole('CLIENT');
      setPlan('none');
      setMembershipStatus('INACTIVE');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Nutrición: favoritos persistentes + diario de calorías consumidas (food_log)
  // ──────────────────────────────────────────────────────────────────────────
  const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ── SOLUCIÓN GENERAL al "no cargó hasta reabrir" ──────────────────────────
  // Recarga TODOS los datos compartidos/realtime con la auth ya lista. El fetch
  // del montaje puede correr sin sesión (varias tablas tienen RLS → vuelven
  // vacías) y el socket de realtime tarda/falla en conectar en arranque nativo,
  // así que no es fiable como única fuente. Esto se dispara una vez por login
  // desde fetchUserData (después de que el query a `users` ya pasó RLS).
  const loadSharedData = () => {
    fetchGlobalClasses(alcanceRef.current);
    fetchRecipes();
    fetchCafeProducts();
    fetchBadgeConfigs();
    fetchCoaches();
    fetchCategories();
    fetchTemplates();
  };

  // Carga favoritos + registro del día + objetivo del plan. Se llama desde
  // fetchUserData (auth ya garantizada por el query previo a users) Y desde el
  // efecto de user.id, para que NUNCA se queden vacíos por una carrera en el
  // arranque nativo (la sesión se restaura async y un query temprano daba RLS vacío).
  const loadNutritionTracking = async (uid) => {
    if (!uid) return;
    const [{ data: favs }, { data: log }, { data: np }] = await Promise.all([
      supabase.from('recipe_favorites').select('recipe_id').eq('user_id', uid),
      supabase.from('food_log').select('*').eq('user_id', uid).eq('log_date', localToday()).order('created_at', { ascending: true }),
      supabase.from('nutrition_plans').select('calories').eq('user_id', uid).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setFavoriteRecipeIds(new Set((favs || []).map(f => f.recipe_id)));
    setTodayLog(log || []);
    setPlanCalories(np?.calories ?? null);
  };

  useEffect(() => {
    const uid = user?.id;
    if (!uid) {
      setFavoriteRecipeIds(new Set());
      setTodayLog([]);
      setPlanCalories(null);
      return;
    }
    loadNutritionTracking(uid);
  }, [user?.id]);

  // Marca/desmarca una receta como favorita (optimista + persistente).
  const toggleRecipeFavorite = async (recipeId) => {
    if (!user?.id || !recipeId) return;
    const isFav = favoriteRecipeIds.has(recipeId);
    setFavoriteRecipeIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(recipeId); else next.add(recipeId);
      return next;
    });
    try {
      if (isFav) {
        await supabase.from('recipe_favorites').delete().eq('user_id', user.id).eq('recipe_id', recipeId);
      } else {
        await supabase.from('recipe_favorites').insert({ user_id: user.id, recipe_id: recipeId });
      }
    } catch (e) {
      // revertir si falla la persistencia
      setFavoriteRecipeIds(prev => {
        const next = new Set(prev);
        if (isFav) next.add(recipeId); else next.delete(recipeId);
        return next;
      });
    }
  };

  // Registra una comida consumida hoy en el diario (food_log). Devuelve la fila creada.
  const logFood = async ({ title, kcal = 0, source = 'recipe', recipe_id = null, meal_time = null }) => {
    if (!user?.id || !title) return null;
    const row = {
      user_id: user.id,
      log_date: localToday(),
      title,
      kcal: parseInt(kcal, 10) || 0,
      source,
      recipe_id,
      meal_time,
    };
    const { data, error } = await supabase.from('food_log').insert(row).select().single();
    if (!error && data) {
      setTodayLog(prev => [...prev, data]);
      return data;
    }
    return null;
  };

  // Quita un ítem del diario de hoy.
  const removeFoodLog = async (id) => {
    if (!id) return;
    setTodayLog(prev => prev.filter(r => r.id !== id));
    try { await supabase.from('food_log').delete().eq('id', id); } catch (e) {}
  };

  // Fija la meta de calorías propia (clientas sin plan personalizado).
  const updateCalorieGoal = async (n) => {
    if (!user?.id) return;
    const val = parseInt(n, 10);
    const goal = Number.isFinite(val) && val > 0 ? val : null;
    setSelfCalorieGoal(goal);
    try { await supabase.from('users').update({ calorie_goal: goal }).eq('id', user.id); } catch (e) {}
  };

  const todayConsumed = todayLog.reduce((s, r) => s + (r.kcal || 0), 0);
  const calorieGoal = planCalories ?? selfCalorieGoal ?? null; // objetivo efectivo del día

  // Devuelve 'confirmed' | 'waitlist' si se anotó, o false si no se pudo.
  // Si la clase está llena, el RPC la mete a LISTA DE ESPERA (sin descontar
  // clase). `autoClaim` es la decisión que toma la clienta AL FORMARSE, no
  // después: false (default) = se le ofrece con plazo para confirmar;
  // true = al liberarse un lugar queda inscrita directo y se le cobra.
  //
  // Se pregunta aquí, y no al liberarse el lugar, porque el aviso posterior
  // viaja por un canal que falla: el 29-jul una clienta perdió su lugar dos
  // veces seguidas porque no tiene dispositivo registrado para push.
  //
  // El default es FALSE desde el 27-ago: la dueña reportó que el sistema
  // apartaba y cobraba antes de preguntar. El servidor además IGNORA el
  // p_auto_claim que manda el RPC (las apps viejas siguen mandando true), así
  // que el automático se prende aparte, con set_waitlist_auto_claim.
  const bookClass = async (classObj, autoClaim = false) => {
    if (!user) return false;
    // Se exige saldo incluso para entrar a la espera (así al promoverla siempre
    // habrá una clase que descontar). El servidor lo re-valida de forma autoritativa.
    if (classesRemaining <= 0) {
      registrarIntentoBloqueado({ userId: user.id, accion: 'reservar', motivo: 'sin_saldo', classId: classObj?.id, saldoApp: classesRemaining, venceApp: planExpiresAt });
      return false;
    }

    try {
      // DB Updates via secure RPC — el servidor decide confirmada vs. espera.
      const { data: bookStatus, error: rpcError } = await supabase.rpc('book_class_secure', {
        p_class_id: classObj.id,
        p_auto_claim: autoClaim === true,
      });
      if (rpcError) throw rpcError;

      const waitlisted = bookStatus === 'waitlist';

      // El servidor siempre la forma en modo "pregúntame". Si ELLA eligió el
      // automático, se prende aquí con un acto explícito. Si esto falla, se
      // queda en el modo seguro (le preguntan) y no pasa nada grave.
      if (waitlisted && autoClaim === true) {
        try {
          await supabase.rpc('set_waitlist_auto_claim', { p_class_id: classObj.id, p_auto: true });
        } catch (e) { console.warn('No se pudo prender el automático de espera:', e); }
      }

      // Optimistic UI Update según el resultado real del servidor.
      // La lista de espera NO descuenta clase ni ocupa lugar.
      if (!waitlisted) {
        if (classesRemaining < 9000) setClassesRemaining(prev => prev - 1); // ilimitado (≥9000) no descuenta
        setGlobalClasses(prev => prev.map(c =>
          c.id === classObj.id ? { ...c, spots: Math.max(0, (c.spots ?? 0) - 1) } : c
        ));
      }
      setMyReservations(prev => [...prev, {
        id: Date.now(), // temporary id
        classId: classObj.id,
        title: classObj.title,
        time: classObj.time,
        instructor: classObj.instructor,
        color: classObj.color,
        checkedIn: false,
        status: waitlisted ? 'waitlist' : 'confirmed',
        autoClaim: autoClaim === true,
        promotedAt: null,
        calendarEventId: null,
      }]);

      // Recordatorios/notificaciones locales solo para reservas CONFIRMADAS.
      if (!waitlisted) {
        const reservationForNotif = { classId: classObj.id, title: classObj.title, time: classObj.time, instructor: classObj.instructor };
        notifyReservationConfirmed(reservationForNotif);
        scheduleClassReminder(reservationForNotif, classObj.day);
        scheduleCancelDeadlineReminder(reservationForNotif, classObj.day);
      }

      return waitlisted ? 'waitlist' : 'confirmed';
    } catch (err) {
      console.error("Error reservando clase:", err);
      // Queda registrado si la petición murió en la red (no llegó al servidor)
      // o si el servidor la rechazó y con qué texto. Ver src/lib/telemetria.js.
      registrarIntentoBloqueado({
        userId: user.id, accion: 'reservar',
        motivo: esErrorDeRed(err) ? 'error_red' : 'rechazo_servidor',
        classId: classObj?.id, detalle: err?.message || String(err),
        saldoApp: classesRemaining, venceApp: planExpiresAt,
      });
      // Rollback
      fetchGlobalClasses(alcanceRef.current);
      fetchUserData(user);
      return false;
    }
  };

  const cancelClassInterno = async (classId) => {
    if (!user) return { success: false, reason: 'no_user' };

    const classObj = globalClasses.find(c => c.id === classId);
    const reservation = myReservations.find(r => r.classId === classId);
    // Ni la lista de espera ni una oferta pendiente ocupan un lugar cobrado →
    // se sale en cualquier momento sin reembolso ni bloqueo de 5 h.
    const isWaitlist = reservation?.status === 'waitlist' || reservation?.status === 'offered';

    // Bloquear cancelación si faltan 5 horas o menos para la clase — SOLO para
    // reservas CONFIRMADAS. De la lista de espera se puede salir en cualquier
    // momento (no hay lugar que proteger ni clase cobrada).
    // Usa la FECHA REAL de la clase (columna `date`); solo cae a la ocurrencia
    // por día de semana si la clase no tuviera fecha fija (recurrentes viejas).
    // GRACIA: si fue el SISTEMA quien la inscribió desde la lista de espera,
    // ella no eligió el momento — puede soltarlo durante 1 h aunque falten
    // menos de 5 h. Sin esto, auto-apartar podría dejarla atrapada con una
    // clase que ya no puede tomar.
    const promoted = reservation?.promotedAt ? new Date(reservation.promotedAt) : null;
    const enGracia = promoted && (Date.now() - promoted.getTime()) < 60 * 60 * 1000;

    // La fecha y la hora viajan EN LA RESERVA (fetchUserData une classes(*)).
    // globalClasses es solo respaldo: para una clienta trae 10 días atrás, así
    // que una reserva más vieja NO está ahí. 🔴 Antes se buscaba solo ahí y, sin
    // clase, se saltaba TODA validación: se cancelaban clases ya tomadas y se
    // devolvían al paquete (2-sep-2026: 84 clases a 9 clientas; Jessica 42 en
    // 3 min). Ahora sin fecha no se cancela, y la BD lo rechaza igual.
    const date = reservation?.date ?? classObj?.date ?? null;
    const time = reservation?.time ?? classObj?.time ?? null;
    const classStart = (date && time)
      ? classDateTime(date, time)
      : (classObj?.day !== undefined && time ? getNextClassOccurrence(classObj.day, time) : null);

    if (!isWaitlist) {
      if (!classStart) return { success: false, reason: 'unknown_class' };
      if (classStart.getTime() <= Date.now()) return { success: false, reason: 'past' };
      if (reservation?.checkedIn) return { success: false, reason: 'attended' };
      if (!enGracia) {
        const fiveHoursBefore = new Date(classStart.getTime() - 5 * 60 * 60 * 1000);
        if (new Date() >= fiveHoursBefore) {
          return { success: false, reason: 'too_late' };
        }
      }
    }

    if (reservation?.calendarEventId) {
      removeClassFromCalendar(reservation.calendarEventId);
    }

    try {
      // Optimistic UI Update. La lista de espera NO cobró clase ni ocupa cupo →
      // no se reembolsa ni se suma lugar (el servidor hace lo mismo por status).
      if (!isWaitlist && classesRemaining < 9000) setClassesRemaining(prev => prev + 1);
      setMyReservations(prev => prev.filter(res => res.classId !== classId));
      if (!isWaitlist && classObj) {
        setGlobalClasses(prev => prev.map(c =>
          c.id === classId ? { ...c, spots: c.spots + 1 } : c
        ));
      }

      // DB Updates via secure RPC
      const { error } = await supabase.rpc('cancel_class_secure', { p_class_id: classId });

      if (error) throw error;

      // Cancelar el recordatorio programado
      cancelClassReminder(classId);

      return { success: true };
    } catch (err) {
      console.error("Error cancelando reserva:", err);
      // Deshacer el optimismo: la BD manda. cancel_class_secure rechaza clases
      // ya pasadas, con check-in o a menos de 5 h aunque la app crea otra cosa.
      fetchGlobalClasses(alcanceRef.current);
      fetchUserData(user);
      const msg = String(err?.message || '');
      const reason = msg.includes('CLASE_YA_PASADA') ? 'past'
        : msg.includes('YA_ASISTISTE') ? 'attended'
        : msg.includes('DEMASIADO_TARDE') ? 'too_late'
        : msg.includes('CLASE_SIN_HORARIO') ? 'unknown_class'
        : 'error';
      return { success: false, reason, detail: msg, red: esErrorDeRed(err) };
    }
  };

  // Envoltura: cualquier cancelación FRENADA (en pantalla o por el servidor)
  // queda registrada con su motivo. La lógica vive en cancelClassInterno.
  const cancelClass = async (classId) => {
    const r = await cancelClassInterno(classId);
    if (r && !r.success && user && r.reason !== 'no_user') {
      registrarIntentoBloqueado({
        userId: user.id, accion: 'cancelar',
        motivo: r.red ? 'error_red' : r.reason,
        classId, detalle: r.detail || null,
        saldoApp: classesRemaining, venceApp: planExpiresAt,
      });
    }
    return r;
  };

  // Cambiar la preferencia sin salirse de la fila: "apártamelo" ⇄ "pregúntame".
  const setWaitlistAutoClaim = async (classId, auto) => {
    if (!user) return { success: false };
    setMyReservations(prev => prev.map(r =>
      r.classId === classId ? { ...r, autoClaim: !!auto } : r)); // optimista
    try {
      const { error } = await supabase.rpc('set_waitlist_auto_claim', { p_class_id: classId, p_auto: !!auto });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error cambiando la preferencia de espera:', err);
      fetchUserData(user);
      return { success: false };
    }
  };

  // Aceptar una oferta de lugar (status 'offered' → 'confirmed', cobra 1 clase).
  // Devuelve { success } o { success:false, reason }.
  const acceptOffer = async (classId) => {
    if (!user) return { success: false, reason: 'no_user' };
    try {
      const { error } = await supabase.rpc('accept_waitlist_offer', { p_class_id: classId });
      if (error) throw error;
      // Optimista: la reserva pasa a confirmada y se descuenta la clase.
      setMyReservations(prev => prev.map(r =>
        r.classId === classId ? { ...r, status: 'confirmed', offerExpiresAt: null } : r));
      if (classesRemaining < 9000) setClassesRemaining(prev => Math.max(0, prev - 1));
      fetchUserData(user);
      return { success: true };
    } catch (err) {
      const msg = err?.message || '';
      fetchUserData(user); // re-sincroniza el estado real (quizá ya venció / cascó)
      if (/OFERTA_VENCIDA/.test(msg)) return { success: false, reason: 'expired' };
      if (/SIN_OFERTA/.test(msg)) return { success: false, reason: 'gone' };
      if (/SIN_CLASES/.test(msg)) return { success: false, reason: 'no_credits' };
      if (/MEMBRESIA_VENCIDA/.test(msg)) return { success: false, reason: 'membership' };
      console.error('Error aceptando oferta:', err);
      return { success: false, reason: 'error' };
    }
  };

  // Declinar/ceder una oferta de lugar: sale de la fila y el lugar cascada a la
  // siguiente (lo hace el servidor). No cobra ni reembolsa (nunca se cobró).
  const declineOffer = async (classId) => {
    if (!user) return { success: false };
    try {
      setMyReservations(prev => prev.filter(r => r.classId !== classId)); // optimista
      const { error } = await supabase.rpc('decline_waitlist_offer', { p_class_id: classId });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error declinando oferta:', err);
      fetchUserData(user);
      return { success: false };
    }
  };

  const updateReservationCalendarId = (classId, eventId) => {
    setMyReservations(prev => prev.map(r =>
      r.classId === classId ? { ...r, calendarEventId: eventId } : r
    ));
  };

  // El parámetro es la CAPACIDAD (max_spots). 'spots' (restantes) lo deriva el
  // trigger de la BD = max_spots - reservas reales. Optimista: ajustamos ambos
  // localmente (restantes = capacidad - reservadas previas) y refrescamos.
  const updateClassSpots = async (id, newCapacity) => {
    setGlobalClasses(prev => prev.map(c => {
      if (c.id !== id) return c;
      const reservadas = Math.max(0, (c.max_spots ?? c.spots ?? 0) - (c.spots ?? 0));
      return { ...c, max_spots: newCapacity, spots: Math.max(0, newCapacity - reservadas) };
    }));
    await supabase.from('classes').update({ max_spots: newCapacity }).eq('id', id);
  };

  // ============================================
  // CHECK-IN (lector QR): resolver persona → mostrar/elegir (no adivinar)
  // ============================================
  // Tarjeta uniforme de la clienta a partir de la fila de `users`.
  const buildClientInfo = (u) => ({
    id: u.id,
    name: u.full_name || u.email?.split('@')[0] || 'Sin nombre',
    email: u.email || '',
    phone: u.phone || 'N/A',
    plan: u.membership_plan || 'Sin Plan',
    classesRemaining: u.classes_remaining || 0,
    status: u.membership_status || 'INACTIVE',
    avatar: u.avatar_url || null,
  });

  // Extrae y valida el UUID que el lector tecleó. Tolera espacios/saltos de
  // línea y lecturas PEGADAS (dos escaneos juntos) o con basura alrededor:
  // toma el PRIMER UUID válido del texto. Si no hay ninguno, el código vino
  // ilegible/truncado → se pide reintentar (NO se marca "usuaria desconocida").
  const extractUserId = (raw) => {
    const m = String(raw || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return m ? m[0] : null;
  };

  // "7:00 AM" → minutos desde medianoche (para ordenar clases traslapadas).
  const timeToMin = (t) => {
    const m = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(t || '');
    if (!m) return 0;
    let h = parseInt(m[1], 10); const min = parseInt(m[2], 10); const ap = (m[3] || '').toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };

  // Marca UNA reserva como asistida (idempotente) y evalúa insignias/push.
  // Reutilizada por el camino automático y por la selección manual (traslape).
  const finalizeReservationCheckIn = async (reservationId, clientInfo, qrData, userObj) => {
    const { error: updateError } = await supabase
      .from('reservations')
      .update({ checked_in: true })
      .eq('id', reservationId)
      .eq('checked_in', false); // idempotente: si ya estaba, no re-marca ni infla

    if (updateError) throw updateError;

    // --- LÓGICA DE INSIGNIAS Y PUSH NOTIFICATION ---
    try {
      const { data: history } = await supabase
        .from('reservations')
        .select('*, classes(instructor)')
        .eq('user_id', qrData)
        .eq('checked_in', true);

      const currentCustom = userObj?.custom_badges || [];
      const notifiedIds = currentCustom.filter(b => b._internal_notified_id).map(b => b._internal_notified_id);

      let newlyUnlocked = null;
      for (const rule of badgeConfigs) {
        if (notifiedIds.includes(rule.id) || rule.rule_type === 'MANUAL' || rule.rule_type === 'PROFILE_COMPLETE') continue;

        let isEarned = false;
        if (rule.rule_type === 'TOTAL_CLASSES') {
          isEarned = (history?.length || 0) >= rule.rule_value;
        } else if (rule.rule_type === 'DIFFERENT_COACHES') {
          const coaches = new Set((history || []).map(h => h.classes?.instructor).filter(Boolean));
          isEarned = coaches.size >= rule.rule_value;
        } else if (rule.rule_type === 'WEEKLY_CLASSES') {
          const weekCounts = {};
          (history || []).forEach(h => {
             const d = new Date(h.created_at);
             const weekKey = `${d.getFullYear()}-${Math.floor(d.getTime() / (1000*60*60*24*7))}`;
             weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
          });
          const maxWeekly = Math.max(0, ...Object.values(weekCounts));
          isEarned = maxWeekly >= rule.rule_value;
        }

        if (isEarned) { newlyUnlocked = rule; break; } // Solo notificar 1 a la vez
      }

      if (newlyUnlocked) {
         const updatedCustom = [...currentCustom, { _internal_notified_id: newlyUnlocked.id }];
         await supabase.from('users').update({ custom_badges: updatedCustom }).eq('id', qrData);

         await supabase.functions.invoke('send-push', {
           body: {
             userId: qrData,
             title: `¡Insignia Desbloqueada! ${newlyUnlocked.icon}`,
             body: `¡Felicidades ${clientInfo.name}! Acabas de ganar la insignia: ${newlyUnlocked.label}.`,
             type: 'badge_unlocked'
           }
         });
      }
    } catch (badgeErr) {
      console.error("Error al evaluar insignias tras check-in:", badgeErr);
    }
    // ------------------------------------

    return { success: true, message: `Asistencia de ${clientInfo.name} registrada.`, clientInfo };
  };

  // Escaneo del lector QR. FILOSOFÍA: primero resolver SIEMPRE a la persona
  // (nunca "desconocida" si existe), luego mostrar/elegir en vez de adivinar.
  // La ventana de tiempo es SUAVE: sirve para el camino rápido, no bloquea.
  const checkInClient = async (qrData, opts = {}) => {
    const userId = extractUserId(qrData);
    if (!userId) {
      // Lectura ilegible/parcial (código truncado o pegado) → reintentar.
      return { success: false, unreadable: true, message: 'Código no legible. Vuelve a escanear.', clientInfo: null };
    }

    try {
      // 1. Resolver a la persona: caché → BD FRESCA como respaldo (clienta nueva
      //    o cambiada tras cargar el caché). `maybeSingle` no lanza si hay 0 filas.
      let userObj = allUsers.find(u => u.id === userId);
      if (!userObj) {
        const { data: directUser } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
        userObj = directUser || null;
      }
      if (!userObj) {
        return { success: false, message: 'Esta clienta no está registrada en el sistema.', clientInfo: null };
      }

      const userRole = userObj.role || 'CLIENT';
      const clientInfo = buildClientInfo(userObj);

      // 1.b PERSONAL (coach/barista/recepción/admin): registra ENTRADA, no reserva.
      if (userRole !== 'CLIENT') {
        const staffInfo = { ...clientInfo, isStaff: true, role: userRole };
        const { error: saErr } = await supabase.from('staff_attendance').insert({ user_id: userId });
        if (saErr) {
          console.error('Error registrando entrada de personal:', saErr);
          return { success: false, message: 'No se pudo registrar la entrada del personal.', clientInfo: staffInfo };
        }
        return { success: true, message: `Entrada de ${clientInfo.name} registrada.`, clientInfo: staffInfo };
      }

      // 2. Reservas de HOY de la clienta (con datos de la clase para mostrarlas).
      // "Hoy" se calcula en la zona horaria de MÉXICO (no la del dispositivo), así
      // la compu de recepción puede tener cualquier zona/idioma y no falla.
      const todayStr = mexicoTodayStr();
      const nowMs = Date.now();
      const { data: resRows, error: resError } = await supabase
        .from('reservations')
        .select('id, class_id, checked_in, status, classes(title, time, date)')
        .eq('user_id', userId);
      if (resError) throw resError;

      // Una reserva cuenta como "de hoy" si su clase es del día (México), O si su
      // hora de inicio cae dentro de ±3 h de AHORA. Ese respaldo cubre cualquier
      // desfase de reloj → nunca esconde una clase que está ocurriendo en este
      // momento (era la causa del falso "no tiene reserva").
      const todays = (resRows || []).filter(r => {
        const d = r.classes?.date, t = r.classes?.time;
        if (d === todayStr) return true;
        if (!d || !t) return false;
        const start = mexicoClassStart(d, t);
        return start && Math.abs(start.getTime() - nowMs) <= 3 * 60 * 60 * 1000;
      });

      // Solo las reservas CONFIRMADAS son asistencia; las de lista de espera NO
      // ocupan lugar → no se les marca check-in (se avisa aparte).
      const confirmedToday = todays.filter(r => r.status !== 'waitlist');
      const pending = confirmedToday.filter(r => !r.checked_in);
      const already = confirmedToday.filter(r => r.checked_in);
      const waitlistToday = todays.filter(r => r.status === 'waitlist');

      // Sin reserva CONFIRMADA pendiente hoy → SOLO informar (no se inscribe al vuelo).
      if (pending.length === 0) {
        if (already.length > 0) {
          return { success: true, alreadyIn: true, message: 'Ya tenía asistencia registrada hoy.', clientInfo };
        }
        if (waitlistToday.length > 0) {
          return { success: false, message: 'Está en LISTA DE ESPERA hoy (sin lugar confirmado).', clientInfo };
        }
        return { success: false, message: 'No tiene reserva para hoy.', clientInfo };
      }

      // IDs de clases con ventana ABIERTA ahora (las calcula el lector). Solo se
      // usan para el camino rápido / desempate; la ventana NO bloquea.
      const openIds = (opts.openClassIds && opts.openClassIds.length)
        ? opts.openClassIds
        : (opts.classId ? [opts.classId] : []);

      // Camino rápido (99%): una sola reserva pendiente → marcar directo.
      if (pending.length === 1) {
        const info = await finalizeReservationCheckIn(pending[0].id, clientInfo, userId, userObj);
        return { ...info, outsideWindow: !openIds.includes(pending[0].class_id),
                 className: pending[0].classes?.title, classTime: pending[0].classes?.time };
      }

      // Varias reservas pendientes (clases traslapadas). Si EXACTAMENTE una está
      // en ventana abierta → esa. Si no, que recepción TOQUE cuál (no adivinar).
      const inWindow = pending.filter(r => openIds.includes(r.class_id));
      if (inWindow.length === 1) {
        const info = await finalizeReservationCheckIn(inWindow[0].id, clientInfo, userId, userObj);
        return { ...info, className: inWindow[0].classes?.title, classTime: inWindow[0].classes?.time };
      }

      return {
        success: false,
        needsSelection: true,
        clientInfo,
        candidates: pending
          .slice()
          .sort((a, b) => timeToMin(a.classes?.time) - timeToMin(b.classes?.time))
          .map(r => ({ reservationId: r.id, classId: r.class_id, title: r.classes?.title || 'Clase', time: r.classes?.time || '', inWindow: openIds.includes(r.class_id) })),
      };
    } catch (err) {
      console.error("Error al registrar asistencia:", err);
      return { success: false, message: "Error en la base de datos.", clientInfo: null };
    }
  };

  // Marca la reserva ELEGIDA a mano (cuando había varias traslapadas).
  const checkInReservation = async (reservationId, clientInfo) => {
    if (!reservationId || !clientInfo) return { success: false, message: 'Selección inválida.', clientInfo };
    try {
      const userObj = allUsers.find(u => u.id === clientInfo.id) || null;
      return await finalizeReservationCheckIn(reservationId, clientInfo, clientInfo.id, userObj);
    } catch (err) {
      console.error('Error en check-in manual:', err);
      return { success: false, message: 'No se pudo registrar la asistencia.', clientInfo };
    }
  };

  // ============================================
  // CENTRO DE NOTIFICACIONES
  // ============================================
  const fetchNotifications = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(100);
      if (!error && data) setNotifications(data);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    }
  };

  // Marca como leídas todas mis notificaciones (optimista + persiste)
  const markNotificationsRead = async () => {
    if (!user) return;
    const hasUnread = notifications.some(n => !n.read_at);
    if (!hasUnread) return;
    const now = new Date().toISOString();
    setNotifications(prev => prev.map(n => n.read_at ? n : { ...n, read_at: now }));
    try {
      await supabase
        .from('notification_logs')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null);
    } catch (err) {
      console.error('Error marcando notificaciones como leídas:', err);
    }
  };

  // Envía una notificación push (+ log in-app) a uno o varios usuarios.
  // Uso del admin: notificar a un cliente/coach concreto o a un grupo.
  const sendNotification = async ({ userIds, title, body, type = 'admin' }) => {
    const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
    if (ids.length === 0 || !title || !body) {
      return { success: false, sent: 0, total: 0, reason: 'datos_incompletos' };
    }
    const results = await Promise.allSettled(
      ids.map(id => supabase.functions.invoke('send-push', {
        body: { userId: id, title, body, type },
      }))
    );
    const sent = results.filter(r => r.status === 'fulfilled' && !r.value?.error).length;
    return { success: sent > 0, sent, total: ids.length };
  };

  const login = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  // Función para refrescar datos del usuario desde la BD
  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  // Activar plan: actualiza estado local INMEDIATAMENTE + intenta persistir en BD
  // Patrón Santuario: la UI se actualiza sin depender de que la BD responda
  const activatePlan = async (planTitle, classCount, specificUserId = null) => {
    // Bloquear re-fetch automático por 10 segundos para evitar race condition
    planJustActivatedRef.current = true;
    setTimeout(() => { planJustActivatedRef.current = false; }, 10000);

    // Fechas: pago = ahora, vence = +1 mes (regla del negocio, automática).
    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // 1. Actualizar estado local de inmediato (la UI cambia al instante)
    setPlan(planTitle);
    setMembershipStatus('ACTIVE');
    setClassesRemaining(classCount);
    // Solo refleja localmente las fechas si el plan es para el usuario en sesión.
    if (!specificUserId || specificUserId === user?.id) {
      setPlanStartedAt(startedAt.toISOString());
      setPlanExpiresAt(expiresAt.toISOString());
      setMembershipRenewal('active');
    }

    // 2. Intentar persistir en la BD de forma segura
    const { data: { session } } = await supabase.auth.getSession();
    const targetId = specificUserId || session?.user?.id || user?.id;

    if (targetId) {
      const { error } = await supabase.from('users').update({
        membership_plan: planTitle,
        membership_status: 'ACTIVE',
        classes_remaining: classCount,
        plan_started_at: startedAt.toISOString(),
        plan_expires_at: expiresAt.toISOString(),
        membership_renewal: 'active'
      }).eq('id', targetId);
      
      if (error) {
        console.error('Error guardando plan en BD:', error);
      }
      
      // Refrescar lista de usuarios para reflejar el cambio
      fetchAllUsers();
    }
  };

  // Manejar el Modo Oscuro por usuario de forma global
  useEffect(() => {
    if (user && role === 'CLIENT') {
      const savedDark = localStorage.getItem(`befit_darkmode_${user.id}`);
      if (savedDark === 'true') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } else {
      // Si no hay usuario, o el rol no es CLIENT, siempre forzar light mode
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [user, role]);

  const logout = async () => {
    // 1) Limpiar el estado local PRIMERO. Así la UI redirige al login de inmediato
    //    aunque cualquier paso posterior (push token, signOut) falle o se cuelgue.
    sharedLoadedForRef.current = null;
    setUser(null);
    setRole(null);
    setPlan(null);
    setMembershipStatus('INACTIVE');
    setPlanStartedAt(null);
    setPlanExpiresAt(null);
    setClassesRemaining(0);
    setGlobalClasses([]);
    setMyReservations([]);
    setAllUsers([]);
    setBadgeConfigs([]);
    setNotifications([]);
    localStorage.removeItem('befit_remember_me');
    sessionStorage.removeItem('befit_session_active');
    document.documentElement.setAttribute('data-theme', 'light');

    // 2) Desregistrar push (best-effort; nunca debe romper el logout).
    try { if (user) unregisterPushToken(user.id); } catch (e) {}

    // 3) Cerrar sesión SIN red (`scope: 'local'`): solo borra la sesión guardada,
    //    instantáneo y sin el cuelgue de Web Locks/red que dejaba la sesión viva
    //    (de ahí el "no me cierra sesión hasta refrescar"). Best-effort.
    try { await supabase.auth.signOut({ scope: 'local' }); } catch (e) {}

    // 4) Respaldo: borrar a mano cualquier token persistido por si signOut no alcanzó.
    try { Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k); }); } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{
      user, role, plan, membershipStatus, planStartedAt, planExpiresAt, loading, profileName,
      membershipRenewal, hasSubscription,
      classesRemaining, myReservations, waitlistPositions, globalClasses, recipes, allUsers,
      classesLoaded, recipesLoaded, cafeProductsLoaded,
      avatarUrl, setAvatarUrl, customBadges, badgeConfigs,
      monthlyGoal, updateMonthlyGoal,
      favoriteRecipeIds, toggleRecipeFavorite,
      todayLog, todayConsumed, calorieGoal, planCalories, logFood, removeFoodLog, updateCalorieGoal,
      login, logout, forceCleanSession, fetchAllUsers, refreshUserData,
      bookClass, cancelClass, acceptOffer, declineOffer, setWaitlistAutoClaim, checkInClient, checkInReservation, updateClassSpots, updateReservationCalendarId,
      activatePlan, addClass, deleteClass, addRecipe, deleteRecipe,
      fetchClassReservations, fetchClassesByDayOfWeek, fetchGlobalClasses,
      assignCustomBadge, removeCustomBadge, createBadgeConfig, updateBadgeConfig, deleteBadgeConfig,
      badgeQueue, dismissBadge,
      showTour, setShowTour,
      coaches, addMultipleClasses,
      notifications, unreadCount, fetchNotifications, markNotificationsRead, sendNotification,
      notifOpen, setNotifOpen,
      cafeProducts, fetchCafeProducts, addCafeProduct, updateCafeProduct, deleteCafeProduct,
      disciplines, disciplinesLoaded, fetchDisciplines, addDiscipline, updateDiscipline, deleteDiscipline,
      updateClass,
      categories, fetchCategories, addCategory, updateCategory, deleteCategory,
      classTemplates, fetchTemplates, saveTemplate, deleteTemplate, applyTemplate,
      plans, allPlans, fetchPlans, createPlan, updatePlan, deletePlan
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
