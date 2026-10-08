import React, { useState, useEffect, useRef } from 'react';
import { todayLocalStr } from '../lib/dates';
import { LogOut, Users, Activity, QrCode, CheckCircle2, Plus, Minus, Calendar, CalendarPlus, ChevronRight, BarChart3, Phone, Mail, TrendingUp, DollarSign, Utensils, Award, Pencil, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollDetect } from '../hooks/useScrollDetect';
import { supabase } from '../lib/supabase';
import AdminCafeteria from '../components/AdminCafeteria';
import AdminProgreso from '../components/AdminProgreso';
import AdminDisciplinas from '../components/AdminDisciplinas';
import AdminReportes from '../components/AdminReportes';
import ReportesLock from '../components/ReportesLock';
import AdminClientas from '../components/AdminClientas';
import AdminAsistencias from '../components/AdminAsistencias';
import StaffAttendance from '../components/StaffAttendance';
import AdminPlanes from '../components/AdminPlanes';
import AdminNutricion from '../components/AdminNutricion';
import AdminEventos from '../components/AdminEventos';
import AdminCumpleanos from '../components/AdminCumpleanos';
import AdminControlSaldos from '../components/AdminControlSaldos';
import QrCheckIn from '../components/QrCheckIn';
import ScheduleStoryExport from '../components/ScheduleStoryExport';
import AdminCategoryManager from '../components/AdminCategoryManager';
import AdminWeekTemplates from '../components/AdminWeekTemplates';
import SearchableClientSelect from '../components/SearchableClientSelect';
import { DEFAULT_CATEGORIES, PASTEL_PALETTE, resolveCatColor, categoryLabel } from '../lib/categories';
import { Coffee, Bell, UserCog, Sparkles, Copy, Trash2, Tag, LayoutTemplate, MoreHorizontal, Dumbbell, CreditCard, ClipboardCheck, Cake, Scale, Camera } from 'lucide-react';
import { ESTUDIO, moduloActivo } from '../config/estudio';
import { cobrarPlanAClienta } from '../lib/cobrarPlan';

const daysOfWeek = [
  { num: 1, label: 'Lunes' },
  { num: 2, label: 'Martes' },
  { num: 3, label: 'Miércoles' },
  { num: 4, label: 'Jueves' },
  { num: 5, label: 'Viernes' },
  { num: 6, label: 'Sábado' },
  { num: 0, label: 'Domingo' }
];

// Colores para el resaltado de clases especiales (humo + pill). El 1º (naranja) es el default.
const SPECIAL_COLORS = ['#FF914D', '#E0679C', '#9B7BEA', '#4AA6E8', '#33BFA6', '#E0A83F'];

// `recepcion` = modo mostrador: reutiliza esta misma pantalla pero limitada a
// las pestañas que el personal de recepción necesita (QR, Clases y Ventas).
// Oculta el resto de la navegación y rebranda el header. Ver /recepcion.
function Admin({ recepcion = false }) {
  const { user, logout, globalClasses, recipes, updateClassSpots, checkInClient, addClass, deleteClass, updateClass, addRecipe, deleteRecipe, allUsers, coaches, activatePlan, fetchAllUsers, fetchClassesByDayOfWeek, fetchGlobalClasses, assignCustomBadge, removeCustomBadge, badgeConfigs, createBadgeConfig, updateBadgeConfig, deleteBadgeConfig, addMultipleClasses, setNotifOpen,
    categories, addCategory, updateCategory, deleteCategory,
    classTemplates, saveTemplate, deleteTemplate, applyTemplate,
    disciplines, plans, allPlans, createPlan, updatePlan, deletePlan } = useAuth();
  const isScrolled = useScrollDetect(30);
  const navigate = useNavigate();
  // Membresías editables (BD). PLAN_BY_NAME resuelve también planes archivados
  // (para cobrar a una clienta cuyo plan se ocultó). Listas usan `plans` (activos).
  const PLANS = plans || [];
  const PLAN_BY_NAME = Object.fromEntries((allPlans || []).map(p => [p.name, p]));
  const [activeTab, setActiveTab] = useState('mostrador');
  const [showTopMenu, setShowTopMenu] = useState(false);
  
  // Gestión de días
  const currentDay = new Date().getDay(); // 0 = Dom, 1 = Lun, ... 6 = Sab
  const [selectedDay, setSelectedDay] = useState(currentDay);
  
  // Inscribir
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showInscribirSuccess, setShowInscribirSuccess] = useState(false);
  // Inscripción real desde recepción (todo en uno)
  const [newBirth, setNewBirth] = useState('');
  const [newInscPlan, setNewInscPlan] = useState(''); // '' = sin plan
  const [newPayMethod, setNewPayMethod] = useState('efectivo');
  const [tempPass, setTempPass] = useState(() => ESTUDIO.prefijoContrasena + Math.floor(1000 + Math.random() * 9000));
  const [inscribiendo, setInscribiendo] = useState(false);
  const [inscDone, setInscDone] = useState(null); // { email, password }

  // Pagos
  const [selectedPayMethod, setSelectedPayMethod] = useState('efectivo');
  const [showPaySuccess, setShowPaySuccess] = useState(false);

  // Formularios de Creación
  const [showAddClass, setShowAddClass] = useState(false);
  const [classMode, setClassMode] = useState('single');
  const [addingCategory, setAddingCategory] = useState(false); // form de categoría nueva
  const [addingLevel, setAddingLevel] = useState(false);       // form de nivel nuevo
  const [editingClassId, setEditingClassId] = useState(null);  // edición de clase existente
  const [showCatManager, setShowCatManager] = useState(false); // sheet gestor de categorías
  const [showTemplates, setShowTemplates] = useState(false);   // sheet plantillas de semana
  const [showClassMenu, setShowClassMenu] = useState(false);   // menú ⋯ del calendario
  const [newClass, setNewClass] = useState({
    title: '', time: '', instructor: '', coach_id: '', spots: 10, level: 'Todos los niveles', category: 'Fuerza', category_color: '#FFE4E1',
    description: '',
    is_special: false, special_label: '', special_color: '',
    date: todayLocalStr(),
    startDate: todayLocalStr(),
    endDate: todayLocalStr(),
    daysOfWeek: []
  });
  
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [newRecipe, setNewRecipe] = useState({ title: '', time: 'Desayuno', kcal: '', time_prep: '', img: '', ingredients: '', steps: '' });

  // Insignias
  const [selectedBadgeUser, setSelectedBadgeUser] = useState('');
  const [newCustomBadge, setNewCustomBadge] = useState({ icon: '🏆', label: '' });
  const [newRuleBadge, setNewRuleBadge] = useState({ icon: '🔥', label: '', description: '', rule_type: 'TOTAL_CLASSES', rule_value: 1 });
  const [editingBadgeId, setEditingBadgeId] = useState(null);

  const handleLogout = () => { logout(); navigate('/'); };

  // Estado del Calendario Interactivo
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null); // 'YYYY-MM-DD' o null
  const [calendarView, setCalendarView] = useState('month'); // 'month' | 'day'
  
  // Helpers del Calendario
  const currentYear = currentMonthDate.getFullYear();
  const currentMonth = currentMonthDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Ajuste para que empiece en Lunes
  
  const nextMonth = () => setCurrentMonthDate(new Date(currentYear, currentMonth + 1, 1));
  const prevMonth = () => setCurrentMonthDate(new Date(currentYear, currentMonth - 1, 1));
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const getWeekDays = (dateStr) => {
    if (!dateStr || dateStr === 'bulk') return [];
    const selectedDate = new Date(dateStr + "T12:00:00");
    const day = selectedDate.getDay();
    const diffToMonday = selectedDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), diffToMonday);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDays.push({
        dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        dayNum: d.getDate(),
        dayName: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()]
      });
    }
    return weekDays;
  };

  const getDayOfWeekFromDateStr = (dateStr) => {
    return new Date(dateStr + "T12:00:00").getDay();
  };

  const getClassesForDate = (dateStr) => {
    if (!dateStr || dateStr === 'bulk') return [];
    const dayOfWeek = getDayOfWeekFromDateStr(dateStr);
    return globalClasses.filter(c => 
      c.date === dateStr || 
      (!c.date && (c.day === dayOfWeek || c.day === String(dayOfWeek)))
    );
  };

  const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  
  // Clases para el día seleccionado en el modal
  const selectedDayClasses = getClassesForDate(selectedCalendarDay);
  
  // Métricas del día de hoy (para dashboard)
  const todayStr = todayLocalStr();
  const todayClasses = getClassesForDate(todayStr);
  
  const totalAlumnasHoy = todayClasses.reduce((acc, c) => acc + ((c.max_spots || 10) - c.spots), 0);
  const totalMaxSpots = todayClasses.reduce((acc, c) => acc + (c.max_spots || 10), 0);
  const avgOccupancy = totalMaxSpots > 0 ? Math.round((totalAlumnasHoy / totalMaxSpots) * 100) : 0;

  // Alumnas reales de DB
  const alumnas = allUsers.map(u => ({
    id: u.id,
    name: u.full_name || u.email.split('@')[0],
    plan: u.membership_plan || 'Sin Plan',
    classes: u.classes_remaining || 0,
    phone: u.phone || 'N/A',
    email: u.email,
    status: u.membership_status?.toLowerCase() || 'inactive'
  }));

  const [selectedAlumnaId, setSelectedAlumnaId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Plan Fit');
  const [charging, setCharging] = useState(false); // candado anti doble-cobro

  const handleInscribir = async () => {
    const nombre = newName.trim(), correo = newEmail.trim();
    if (!nombre || !correo) { alert('Falta el nombre o el correo.'); return; }
    if (!tempPass || tempPass.length < 6) { alert('La contraseña temporal debe tener al menos 6 caracteres.'); return; }
    setInscribiendo(true);
    const planInfo = newInscPlan ? PLAN_BY_NAME[newInscPlan] : null;
    const { data, error } = await supabase.functions.invoke('admin-create-client', {
      body: {
        name: nombre, email: correo, password: tempPass, phone: newPhone.trim(),
        birthDate: newBirth || null,
        planName: planInfo?.name || null,
        classCount: planInfo?.classes ?? null,
        amount: planInfo?.amount ?? null,
        method: planInfo ? newPayMethod : null,
      },
    });
    setInscribiendo(false);
    if (error || data?.error) {
      // Cuando la edge function responde 4xx/5xx, supabase-js lanza un
      // FunctionsHttpError con un mensaje genérico ("non-2xx status code") y
      // deja data en null. El motivo real (ej. "Ya existe una cuenta con ese
      // correo") viene en el cuerpo JSON de la respuesta → leerlo de error.context.
      let motivo = data?.error;
      if (!motivo && error?.context && typeof error.context.json === 'function') {
        try { motivo = (await error.context.json())?.error; } catch (_) { /* cuerpo no-JSON */ }
      }
      // Mensaje claro y accionable para el caso más común: correo ya usado.
      if (motivo && /ya existe|already|registrad|exists/i.test(motivo)) {
        motivo = `El correo "${correo}" ya está registrado. Usa uno diferente o búscala en la lista de clientas.`;
      }
      alert(motivo || error?.message || 'No se pudo inscribir.');
      return;
    }
    setInscDone({ email: correo, password: tempPass });
    fetchAllUsers?.();
    // Limpiar el formulario y preparar una nueva contraseña
    setNewName(''); setNewEmail(''); setNewPhone(''); setNewBirth(''); setNewInscPlan('');
    setTempPass(ESTUDIO.prefijoContrasena + Math.floor(1000 + Math.random() * 9000));
  };

  const handlePago = async () => {
    if (!selectedAlumnaId || charging) return; // candado: un cobro a la vez
    const planDetails = PLAN_BY_NAME[selectedPlan];
    if (!planDetails) return;

    setCharging(true);
    try {
      // Toda la lógica (confirmaciones, aviso de saldo que se pisa, candado
      // anti-duplicado y registro de la venta) vive en src/lib/cobrarPlan.js,
      // porque desde el 27-ago también se cobra desde la ficha de la clienta y
      // tener dos copias sería pedir que una pierda los candados.
      const { ok } = await cobrarPlanAClienta({
        clienta: (allUsers || []).find(u => u.id === selectedAlumnaId),
        plan: planDetails,
        metodo: selectedPayMethod,
        vendedorId: user.id,
        activatePlan,
      });
      if (!ok) { setCharging(false); return; }

      setShowPaySuccess(true);
      setTimeout(() => {
        setShowPaySuccess(false);
        setSelectedAlumnaId('');
      }, 2500);
    } finally {
      setCharging(false);
    }
  };

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    
    if (!newClass.title || !newClass.time || !newClass.instructor) {
      showToast("Llena todos los campos: Título, Hora e Instructor.", "error");
      return;
    }

    let result;
    if (classMode === 'single') {
      if (!newClass.date) return showToast("Selecciona una fecha.", "error");
      const d = new Date(newClass.date + "T12:00:00");
      const payload = {
        title: newClass.title,
        time: newClass.time,
        instructor: newClass.instructor,
        coach_id: newClass.coach_id || null,
        category: newClass.category,
        description: newClass.description || null,
        date: newClass.date,
        day: d.getDay(),
        max_spots: parseInt(newClass.spots), // capacidad fija; el trigger deriva 'spots' (restantes)
        level: newClass.level,
        category_color: newClass.category_color || null,
        is_special: !!newClass.is_special,
        special_label: newClass.is_special ? (newClass.special_label?.trim() || null) : null,
        special_color: newClass.is_special ? (newClass.special_color || null) : null
      };
      result = editingClassId ? await updateClass(editingClassId, payload) : await addClass(payload);
    } else {
      if (!newClass.startDate || !newClass.endDate || newClass.daysOfWeek.length === 0) {
        return showToast("Selecciona el rango de fechas y los días.", "error");
      }
      const start = new Date(newClass.startDate + "T12:00:00");
      const end = new Date(newClass.endDate + "T12:00:00");
      const classesToCreate = [];
      let current = new Date(start);
      while (current <= end) {
        if (newClass.daysOfWeek.includes(current.getDay())) {
          classesToCreate.push({
            title: newClass.title,
            time: newClass.time,
            instructor: newClass.instructor,
            coach_id: newClass.coach_id || null,
            category: newClass.category,
            description: newClass.description || null,
            date: current.toISOString().split('T')[0],
            day: current.getDay(),
            max_spots: parseInt(newClass.spots), // capacidad fija; el trigger deriva 'spots' (restantes)
            level: newClass.level,
            category_color: newClass.category_color || null,
            is_special: !!newClass.is_special,
            special_label: newClass.is_special ? (newClass.special_label?.trim() || null) : null,
            special_color: newClass.is_special ? (newClass.special_color || null) : null
          });
        }
        current.setDate(current.getDate() + 1);
      }
      if (classesToCreate.length === 0) return showToast("No hay días coincidentes en el rango.", "error");
      result = await addMultipleClasses(classesToCreate);
    }
    
    if (result && !result.success) {
      showToast("Error: " + (result.error?.message || "No se pudo guardar"), "error");
      console.error("Error detallado al agregar clase:", result.error);
      return;
    }

    showToast(editingClassId ? "¡Clase actualizada!" : "¡Clase(s) creadas con éxito!");
    setEditingClassId(null);
    setAddingCategory(false); setAddingLevel(false);
    setShowAddClass(false);
    // Conserva el día que está editando (vista de calendario) para que al agregar
    // varias clases seguidas TODAS caigan en ese día. Si no, el reset volvía la
    // fecha a HOY (invisible en el form) y la 2ª, 3ª… clase saltaban a la fecha de hoy.
    const keepDate = (selectedCalendarDay && selectedCalendarDay !== 'bulk') ? selectedCalendarDay : todayLocalStr();
    setNewClass({
      title: '', time: '', instructor: '', coach_id: '', spots: 10, level: 'Todos los niveles', category: 'Fuerza', category_color: '#FFE4E1',
      description: '',
      is_special: false, special_label: '', special_color: '',
      date: keepDate,
      startDate: keepDate,
      endDate: keepDate,
      daysOfWeek: []
    });
    fetchGlobalClasses(); // Refresh
  };

  // Prellenar el form con una clase existente (para editar o duplicar).
  // Al DUPLICAR (resetSpots) los lugares arrancan en el máximo (10) — la copia
  // nace vacía; copiar c.spots arrastraría reservas de la clase original.
  const prefillFromClass = (c, { resetSpots = false } = {}) => {
    setClassMode('single');
    setAddingCategory(false); setAddingLevel(false);
    setNewClass({
      title: c.title || '', time: c.time || '', instructor: c.instructor || '', coach_id: c.coach_id || '',
      spots: resetSpots ? 10 : (c.max_spots ?? c.spots ?? 10), level: c.level || 'Todos los niveles',
      category: c.category || 'Fuerza', category_color: resolveCatColor(c.category, c.category_color),
      description: c.description || '',
      is_special: !!c.is_special, special_label: c.special_label || '', special_color: c.special_color || '',
      date: c.date || todayStr, startDate: c.date || todayStr, endDate: c.date || todayStr, daysOfWeek: []
    });
  };
  const openEditClass = (c) => { prefillFromClass(c); setEditingClassId(c.id); };
  const duplicateClass = (c) => { prefillFromClass(c, { resetSpots: true }); setEditingClassId(null); showToast('Clase copiada — ajusta fecha/hora/cupo y guarda', 'success'); };
  const cancelEdit = () => { setEditingClassId(null); setAddingCategory(false); setAddingLevel(false);
    setNewClass({ title: '', time: '', instructor: '', coach_id: '', spots: 10, level: 'Todos los niveles', category: 'Fuerza', category_color: '#FFE4E1', description: '', is_special: false, special_label: '', special_color: '', date: todayStr, startDate: todayStr, endDate: todayStr, daysOfWeek: [] }); };

  const handleCreateRecipe = async (e) => {
    e.preventDefault();
    const ingredientsArr = newRecipe.ingredients.split(',').map(s => s.trim()).filter(s => s);
    const stepsArr = newRecipe.steps.split('.').map(s => s.trim()).filter(s => s);
    await addRecipe({ ...newRecipe, ingredients: ingredientsArr, steps: stepsArr });
    setShowAddRecipe(false);
    setNewRecipe({ title: '', time: 'Desayuno', kcal: '', time_prep: '', img: '', ingredients: '', steps: '' });
  };

  const handleAssignBadge = async () => {
    if (!selectedBadgeUser || !newCustomBadge.label) {
      showToast("Selecciona alumna y escribe el nombre de la insignia", "error");
      return;
    }
    const res = await assignCustomBadge(selectedBadgeUser, newCustomBadge);
    if (res.success) {
      showToast("Insignia asignada con éxito");
      setNewCustomBadge({ icon: '🏆', label: '' });
    } else {
      showToast("Error al asignar insignia", "error");
    }
  };

  const handleRemoveBadge = async (label) => {
    const res = await removeCustomBadge(selectedBadgeUser, label);
    if (res.success) showToast("Insignia removida");
  };

  const handleSaveRuleBadge = async () => {
    if (!newRuleBadge.label) {
      showToast("Escribe el nombre de la insignia", "error");
      return;
    }
    const payload = {
      icon: newRuleBadge.icon,
      label: newRuleBadge.label,
      description: newRuleBadge.description,
      rule_type: newRuleBadge.rule_type,
      rule_value: newRuleBadge.rule_value,
      is_active: true
    };
    
    let res;
    if (editingBadgeId) {
      res = await updateBadgeConfig(editingBadgeId, payload);
    } else {
      res = await createBadgeConfig(payload);
    }
    
    if (res.success) {
      showToast(editingBadgeId ? "Regla actualizada con éxito" : "Regla creada con éxito");
      setNewRuleBadge({ icon: '🔥', label: '', description: '', rule_type: 'TOTAL_CLASSES', rule_value: 1 });
      setEditingBadgeId(null);
    } else {
      showToast("Error al guardar regla", "error");
    }
  };

  const cancelEditBadge = () => {
    setEditingBadgeId(null);
    setNewRuleBadge({ icon: '🔥', label: '', description: '', rule_type: 'TOTAL_CLASSES', rule_value: 1 });
  };
  
  const handleEditRuleBadge = (badge) => {
    setEditingBadgeId(badge.id);
    setNewRuleBadge(badge);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteRuleBadge = async (id) => {
    const res = await deleteBadgeConfig(id);
    if (res.success) showToast("Regla eliminada");
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(55,61,59,0.08)', background: 'var(--surface-lowest)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none', transition: 'border 0.2s' };

  // ── Hora: selector nativo (24h) ⇄ formato guardado "h:mm AM/PM" ──────
  const to24h = (ampm) => {
    const m = (ampm || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return '';
    let h = +m[1]; const min = m[2]; const ap = (m[3] || '').toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  };
  const toAmPm = (h24) => {
    if (!h24) return '';
    const [hh, mm] = h24.split(':').map(Number);
    const ap = hh >= 12 ? 'PM' : 'AM';
    let h = hh % 12; if (h === 0) h = 12;
    return `${h}:${String(mm).padStart(2, '0')} ${ap}`;
  };

  // Categorías disponibles: el catálogo gestionable (class_categories); si está vacío, defaults + las que existan en clases
  const allCategories = (() => {
    if (categories?.length) return categories.map(c => ({ name: c.name, label: categoryLabel(c.name), color: c.color }));
    const map = new Map();
    DEFAULT_CATEGORIES.forEach(c => map.set(c.name, { name: c.name, label: c.label, color: c.color }));
    (globalClasses || []).forEach(c => { if (c.category && !map.has(c.category)) map.set(c.category, { name: c.category, label: c.category, color: resolveCatColor(c.category, c.category_color) }); });
    return [...map.values()];
  })();
  const allLevels = (() => {
    const base = ['Todos los niveles', 'Principiante', 'Intermedio', 'Avanzado'];
    const set = new Set(base);
    (globalClasses || []).forEach(c => { if (c.level) set.add(c.level); });
    return [...set];
  })();

  const stepBtn = { width: '32px', height: '32px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
  const actionBtn = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '9px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.04)', color: 'var(--on-surface)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-body)' };
  const menuItem = { width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, color: 'var(--on-surface)', textAlign: 'left', fontFamily: 'var(--font-body)' };
  const labelStyle = { fontSize: '0.78rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' };

  const getRuleDescription = (type, value) => {
    switch (type) {
      case 'TOTAL_CLASSES': return `Meta: Asistir a ${value} clases en total`;
      case 'WEEKLY_CLASSES': return `Meta: Asistir a ${value} clases en una misma semana`;
      case 'DIFFERENT_COACHES': return `Meta: Tomar clase con ${value} coaches diferentes`;
      case 'PROFILE_COMPLETE': return 'Meta: Completar perfil (Foto y datos)';
      case 'MANUAL': return 'Otorgamiento manual (Eventos/Retos)';
      default: return `Meta: ${value} (${type})`;
    }
  };

  // coaches are now fetched directly from useAuth

  const daysOfWeek = [
    { num: 1, label: 'LUN' },
    { num: 2, label: 'MAR' },
    { num: 3, label: 'MIE' },
    { num: 4, label: 'JUE' },
    { num: 5, label: 'VIE' },
    { num: 6, label: 'SAB' },
    { num: 0, label: 'DOM' }
  ];

  return (
    <div className="admin-app-container">
      {/* HEADER PREMIUM (MOBILE ONLY) */}
      <header className="ios-header mobile-only-header" style={{ background: 'var(--surface-lowest)', paddingBottom: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)', position: 'relative', zIndex: 50 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', margin: 0, lineHeight: 1.1, color: 'var(--black)' }}>{recepcion ? ESTUDIO.nombre : ESTUDIO.nombrePanel}</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--primary)', margin: '4px 0 0', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{recepcion ? 'RECEPCIÓN' : 'CONTROL CENTER'}</p>
          </div>
          
          <div style={{ position: 'relative' }}>
            <div onClick={() => setShowTopMenu(!showTopMenu)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: showTopMenu ? 'var(--primary)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Menu size={20} color={showTopMenu ? 'white' : 'var(--black)'} />
            </div>
            
            <AnimatePresence>
              {showTopMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                  transition={{ duration: 0.2 }}
                  style={{ position: 'absolute', top: '50px', right: 0, background: 'white', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', padding: '8px', width: '200px', border: '1px solid rgba(0,0,0,0.05)', zIndex: 100 }}
                >
                  {!recepcion && (<>
                  <div onClick={() => { setActiveTab('reportes'); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <BarChart3 size={18} color="var(--primary)" /> Reportes
                  </div>
                  <div onClick={() => { setActiveTab('clientas'); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <UserCog size={18} color="var(--primary)" /> Clientas
                  </div>
                  <div onClick={() => { setActiveTab('asistencias'); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <ClipboardCheck size={18} color="var(--primary)" /> Pase de lista
                  </div>
                  {moduloActivo('insignias') && (
                  <div onClick={() => { setActiveTab('insignias'); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <Award size={18} color="var(--primary)" /> Insignias
                  </div>
                  )}
                  {moduloActivo('cumpleanos') && (
                  <div onClick={() => { setActiveTab('cumpleanos'); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <Cake size={18} color="var(--primary)" /> Cumpleaños
                  </div>
                  )}
                  <div onClick={() => { setActiveTab('auditoria'); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <Scale size={18} color="var(--primary)" /> Auditoría
                  </div>
                  {moduloActivo('nutricion') && (
                  <div onClick={() => { setActiveTab('nutricion'); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <Utensils size={18} color="var(--primary)" /> Comida
                  </div>
                  )}
                  {moduloActivo('fotosProgreso') && (
                  <div onClick={() => { setActiveTab('progreso'); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <Camera size={18} color="var(--primary)" /> Progreso
                  </div>
                  )}
                  {moduloActivo('cafeteria') && (
                  <div onClick={() => { setActiveTab('cafeteria'); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <Coffee size={18} color="var(--primary)" /> Cafetería
                  </div>
                  )}
                  <div onClick={() => { setActiveTab('disciplinas'); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <Dumbbell size={18} color="var(--primary)" /> Disciplinas
                  </div>
                  {moduloActivo('eventos') && (
                  <div onClick={() => { setActiveTab('eventos'); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <Sparkles size={18} color="var(--primary)" /> Eventos
                  </div>
                  )}
                  <div onClick={() => { setActiveTab('membresias'); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <CreditCard size={18} color="var(--primary)" /> Membresías
                  </div>
                  <div onClick={() => { setNotifOpen(true); setShowTopMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: 'var(--black)', fontWeight: 600 }}>
                    <Bell size={18} color="var(--primary)" /> Enviar aviso
                  </div>
                  <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '8px' }} />
                  </>)}
                  <div onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '10px', color: '#ff3b30', fontWeight: 600 }}>
                    <LogOut size={18} /> Cerrar Sesión
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* DESKTOP SIDEBAR PANEL */}
      <aside className="admin-desktop-sidebar">
        <div className="sidebar-brand">
          <h1 className="sidebar-title">{recepcion ? ESTUDIO.nombre : ESTUDIO.nombrePanel}</h1>
          <p className="sidebar-subtitle">{recepcion ? 'RECEPCIÓN' : 'CONTROL CENTER'}</p>
        </div>
        <nav className="sidebar-nav">
          <div onClick={() => setActiveTab('mostrador')} className={`sidebar-nav-item ${activeTab === 'mostrador' ? 'active' : ''}`}>
            <QrCode size={20} />
            <span>Mostrador QR</span>
          </div>
          <div onClick={() => setActiveTab('clases')} className={`sidebar-nav-item ${activeTab === 'clases' ? 'active' : ''}`}>
            <Calendar size={20} />
            <span>Clases</span>
          </div>
          <div onClick={() => setActiveTab('ventas')} className={`sidebar-nav-item ${activeTab === 'ventas' ? 'active' : ''}`}>
            <DollarSign size={20} />
            <span>Ventas</span>
          </div>
          {!recepcion && (<>
          <div onClick={() => setActiveTab('reportes')} className={`sidebar-nav-item ${activeTab === 'reportes' ? 'active' : ''}`}>
            <BarChart3 size={20} />
            <span>Reportes</span>
          </div>
          <div onClick={() => setActiveTab('clientas')} className={`sidebar-nav-item ${activeTab === 'clientas' ? 'active' : ''}`}>
            <UserCog size={20} />
            <span>Clientas</span>
          </div>
          <div onClick={() => setActiveTab('asistencias')} className={`sidebar-nav-item ${activeTab === 'asistencias' ? 'active' : ''}`}>
            <ClipboardCheck size={20} />
            <span>Pase de lista</span>
          </div>
          {moduloActivo('nutricion') && (
          <div onClick={() => setActiveTab('nutricion')} className={`sidebar-nav-item ${activeTab === 'nutricion' ? 'active' : ''}`}>
            <Utensils size={20} />
            <span>Nutrición</span>
          </div>
          )}
          {moduloActivo('fotosProgreso') && (
          <div onClick={() => setActiveTab('progreso')} className={`sidebar-nav-item ${activeTab === 'progreso' ? 'active' : ''}`}>
            <Camera size={20} />
            <span>Progreso</span>
          </div>
          )}
          {moduloActivo('cafeteria') && (
          <div onClick={() => setActiveTab('cafeteria')} className={`sidebar-nav-item ${activeTab === 'cafeteria' ? 'active' : ''}`}>
            <Coffee size={20} />
            <span>Cafetería</span>
          </div>
          )}
          <div onClick={() => setActiveTab('disciplinas')} className={`sidebar-nav-item ${activeTab === 'disciplinas' ? 'active' : ''}`}>
            <Dumbbell size={20} />
            <span>Disciplinas</span>
          </div>
          {moduloActivo('eventos') && (
          <div onClick={() => setActiveTab('eventos')} className={`sidebar-nav-item ${activeTab === 'eventos' ? 'active' : ''}`}>
            <Sparkles size={20} />
            <span>Eventos</span>
          </div>
          )}
          <div onClick={() => setActiveTab('membresias')} className={`sidebar-nav-item ${activeTab === 'membresias' ? 'active' : ''}`}>
            <CreditCard size={20} />
            <span>Membresías</span>
          </div>
          <div onClick={() => setNotifOpen(true)} className="sidebar-nav-item">
            <Bell size={20} />
            <span>Enviar aviso</span>
          </div>
          {moduloActivo('insignias') && (
          <div onClick={() => setActiveTab('insignias')} className={`sidebar-nav-item ${activeTab === 'insignias' ? 'active' : ''}`}>
            <Award size={20} />
            <span>Insignias</span>
          </div>
          )}
          {moduloActivo('cumpleanos') && (
          <div onClick={() => setActiveTab('cumpleanos')} className={`sidebar-nav-item ${activeTab === 'cumpleanos' ? 'active' : ''}`}>
            <Cake size={20} />
            <span>Cumpleaños</span>
          </div>
          )}
          <div onClick={() => setActiveTab('auditoria')} className={`sidebar-nav-item ${activeTab === 'auditoria' ? 'active' : ''}`}>
            <Scale size={20} />
            <span>Auditoría</span>
          </div>
          </>)}
        </nav>
        
        <div className="sidebar-footer" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="admin-main-content">
        <div className="admin-content-area">
          <AnimatePresence mode="wait">
            
            {/* ============ TAB: MOSTRADOR (QR + métricas + log) ============ */}
            {activeTab === 'mostrador' && (
              <motion.div key="mostrador" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <QrCheckIn sideContent={
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div style={{ padding: '20px', background: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)' }}>
                      <div style={{ color: 'var(--primary)', marginBottom: '12px', background: 'rgba(255,145,77,0.1)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} /></div>
                      <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--black)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{totalAlumnasHoy}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 700, marginTop: '5px' }}>Reservas ({daysOfWeek.find(d=>d.num===selectedDay)?.label})</div>
                    </div>
                    <div style={{ padding: '20px', background: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)' }}>
                      <div style={{ color: 'var(--accent)', marginBottom: '12px', background: 'rgba(238,186,137,0.2)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity size={20} /></div>
                      <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--black)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{avgOccupancy}<span style={{fontSize: '1.2rem', color: 'var(--on-surface-variant)'}}>%</span></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 700, marginTop: '5px' }}>Ocupación Prom.</div>
                    </div>
                  </div>
                } />
                {/* Registro de entrada del personal (coaches/staff) por QR.
                    Visible en Mostrador → lo ven Admin y Recepción. */}
                <StaffAttendance />
              </motion.div>
            )}

            {/* ============ TAB: CLASES (Calendario Interactivo) ============ */}
            {activeTab === 'clases' && (
              <motion.div key="clases" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <section>
                  {calendarView === 'month' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '10px', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0, fontWeight: 800 }}>Calendario</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <ScheduleStoryExport
                            classes={globalClasses}
                            coaches={coaches}
                            selectedDateStr={todayStr}
                            buttonLabel="Horarios"
                            buttonStyle={{ background: 'rgba(255,145,77,0.12)', color: 'var(--primary)', border: '1px solid rgba(255,145,77,0.3)', padding: '8px 14px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}
                          />
                          <button
                            onClick={() => {
                              setNewClass(prev => ({...prev, date: todayStr, startDate: todayStr, endDate: todayStr}));
                              setClassMode('range');
                              setSelectedCalendarDay('bulk');
                              setCalendarView('day');
                            }}
                            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,139,66,0.3)' }}
                          >
                            <CalendarPlus size={18} /> Carga Masiva
                          </button>
                          {!recepcion && (
                          <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowClassMenu(v => !v)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', padding: '8px 11px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <MoreHorizontal size={18} color="var(--black)" />
                            </button>
                            {showClassMenu && (
                              <>
                                <div onClick={() => setShowClassMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                                <div style={{ position: 'absolute', right: 0, top: '46px', zIndex: 41, background: 'white', borderRadius: '14px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)', border: '1px solid var(--border-subtle)', overflow: 'hidden', minWidth: '210px' }}>
                                  <button onClick={() => { setShowClassMenu(false); setShowCatManager(true); }} style={menuItem}><Tag size={16} color="var(--primary)" /> Gestionar categorías</button>
                                  <div style={{ height: '1px', background: 'var(--border-subtle, rgba(0,0,0,0.05))' }} />
                                  <button onClick={() => { setShowClassMenu(false); setShowTemplates(true); }} style={menuItem}><LayoutTemplate size={16} color="var(--primary)" /> Plantillas de semana</button>
                                </div>
                              </>
                            )}
                          </div>
                          )}
                        </div>
                      </div>
      
                      {/* Navegación del Calendario */}
                      <div className="ios-glass-card" style={{ padding: '20px', background: 'white', margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <button onClick={prevMonth} style={{ background: 'rgba(0,0,0,0.04)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <ChevronRight size={20} color="var(--black)" style={{ transform: 'rotate(180deg)' }} />
                          </button>
                          <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', margin: 0, textTransform: 'capitalize' }}>
                            {monthNames[currentMonth]} {currentYear}
                          </h3>
                          <button onClick={nextMonth} style={{ background: 'rgba(0,0,0,0.04)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <ChevronRight size={20} color="var(--black)" />
                          </button>
                        </div>

                        {/* Días de la semana */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '10px', textAlign: 'center' }}>
                          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                            <div key={i} style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{d}</div>
                          ))}
                        </div>

                        {/* Cuadrícula de Días */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                          {Array.from({ length: startDay }).map((_, i) => (
                            <div key={`empty-${i}`} style={{ aspectRatio: '1', borderRadius: '12px' }} />
                          ))}
                          
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                            const isToday = dateStr === todayStr;
                            const classesOnDay = getClassesForDate(dateStr);
                            const hasClasses = classesOnDay.length > 0;
                            
                            return (
                              <motion.button
                                key={dayNum}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                  setNewClass(prev => ({...prev, date: dateStr}));
                                  setClassMode('single');
                                  setSelectedCalendarDay(dateStr);
                                  setCalendarView('day');
                                }}
                                style={{ 
                                  aspectRatio: '1', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative',
                                  background: isToday ? 'var(--primary)' : (hasClasses ? 'rgba(0,0,0,0.03)' : 'transparent'),
                                  color: isToday ? 'white' : 'var(--black)',
                                  fontWeight: isToday ? 800 : (hasClasses ? 700 : 500)
                                }}
                              >
                                <span style={{ fontSize: '1rem' }}>{dayNum}</span>
                                {hasClasses && (
                                  <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '6px' }}>
                                    {classesOnDay.slice(0, 3).map((_, idx) => (
                                      <div key={idx} style={{ width: '4px', height: '4px', borderRadius: '50%', background: isToday ? 'white' : 'var(--primary)' }} />
                                    ))}
                                  </div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} transition={{duration:0.2}}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <button onClick={() => setCalendarView('month')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', padding: 0 }}>
                          <ChevronRight size={22} style={{ transform: 'rotate(180deg)' }} /> 
                          {selectedCalendarDay !== 'bulk' ? monthNames[new Date(selectedCalendarDay + "T12:00:00").getMonth()] : 'Atrás'}
                        </button>
                      </div>
                      
                      {selectedCalendarDay !== 'bulk' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '25px', background: 'white', padding: '15px 10px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                          {getWeekDays(selectedCalendarDay).map((d, i) => {
                            const isSelected = d.dateStr === selectedCalendarDay;
                            const classesOnDay = getClassesForDate(d.dateStr);
                            const hasClasses = classesOnDay.length > 0;
                            
                            return (
                              <div 
                                key={i} 
                                onClick={() => {
                                  setSelectedCalendarDay(d.dateStr);
                                  setNewClass(prev => ({...prev, date: d.dateStr}));
                                }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                              >
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{d.dayName}</span>
                                <div style={{ 
                                  width: '36px', height: '36px', borderRadius: '50%', 
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: isSelected ? 'var(--primary)' : 'transparent',
                                  color: isSelected ? 'white' : 'var(--black)',
                                  fontWeight: isSelected ? 800 : 600,
                                  fontSize: '1.1rem'
                                }}>
                                  {d.dayNum}
                                </div>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: hasClasses ? (isSelected ? 'white' : 'var(--primary)') : 'transparent', marginTop: '-2px' }} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Lista de clases del día */}
                      {selectedCalendarDay !== 'bulk' && (
                        <div style={{ marginBottom: '25px' }}>
                          <h4 style={{ fontSize: '1.1rem', margin: '0 0 15px 0', color: 'var(--black)', fontFamily: 'var(--font-display)', textTransform: 'capitalize' }}>
                            {new Date(selectedCalendarDay + "T12:00:00").toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {selectedDayClasses.length > 0 ? selectedDayClasses.map((c) => (
                              <div key={c.id} style={{ padding: '14px 16px', background: 'white', borderRadius: '16px', border: '1px solid var(--border-subtle)', borderLeft: `5px solid ${resolveCatColor(c.category, c.category_color)}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                                      {c.title}
                                      {c.is_special && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: '999px', background: c.special_color || 'linear-gradient(135deg, #FF914D, #E07A9C)', color: '#fff', fontSize: '0.58rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                          {(c.special_label && c.special_label.trim()) || 'Especial'}
                                        </span>
                                      )}
                                    </h3>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: 0, fontWeight: 600 }}>{c.time} • {c.instructor || 'Sin coach'}</p>
                                  </div>
                                  {(() => {
                                    const cap = c.max_spots ?? c.spots ?? 0;
                                    const reservadas = Math.max(0, cap - (c.spots ?? 0)); // no bajar el cupo bajo lo ya reservado
                                    return (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        <button onClick={() => updateClassSpots(c.id, Math.max(reservadas, cap - 1))} style={stepBtn}><Minus size={14} color="var(--black)" /></button>
                                        <div style={{ textAlign: 'center', minWidth: '38px' }}>
                                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: c.spots === 0 ? '#FF4D4D' : 'var(--primary)', lineHeight: 1 }}>{cap}</div>
                                          <div style={{ fontSize: '0.58rem', fontWeight: 700, color: c.spots === 0 ? '#FF4D4D' : 'var(--on-surface-variant)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                            {c.spots === 0 ? 'lleno' : `${c.spots} libre${c.spots === 1 ? '' : 's'}`}
                                          </div>
                                        </div>
                                        <button onClick={() => updateClassSpots(c.id, cap + 1)} style={stepBtn}><Plus size={14} color="var(--black)" /></button>
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                  <button onClick={() => openEditClass(c)} style={actionBtn}><Pencil size={14} /> Editar</button>
                                  <button onClick={() => duplicateClass(c)} style={actionBtn}><Copy size={14} /> Duplicar</button>
                                  <button onClick={async () => {
                                    // La BD decide qué pasa al borrar (trigger guard_class_delete):
                                    // clase futura → devuelve la clase a cada reserva y avisa;
                                    // clase pasada con asistencias → no se puede (es historial).
                                    const ocupados = Math.max(0, (c.max_spots ?? c.spots ?? 0) - (c.spots ?? 0));
                                    const msg = ocupados > 0
                                      ? `Esta clase tiene ${ocupados} reserva${ocupados === 1 ? '' : 's'}. Al eliminarla se les devolverá la clase a su paquete y se les avisará. ¿Eliminar?`
                                      : '¿Eliminar esta clase?';
                                    if (!window.confirm(msg)) return;
                                    const r = await deleteClass(c.id);
                                    if (!r?.success) {
                                      const m = String(r?.error?.message || '');
                                      alert(m.includes('CLASE_CON_ASISTENCIAS')
                                        ? 'Esta clase ya ocurrió y tiene asistencias registradas: es historial y no se puede eliminar.'
                                        : 'No se pudo eliminar la clase. Inténtalo de nuevo.');
                                    }
                                  }} style={{...actionBtn, color: '#FF4D4D', background: '#FF4D4D12'}}><Trash2 size={14} /> Eliminar</button>
                                </div>
                              </div>
                            )) : (
                              <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: '0.9rem', padding: '20px' }}>Sin clases programadas.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Formulario: inline al AÑADIR; modal centrado al EDITAR (mejor UX en PC).
                          El wrapper usa display:contents cuando NO edita → no afecta el layout inline;
                          al editar se vuelve backdrop + tarjeta centrada, reutilizando el mismo formulario. */}
                      <div
                        onClick={editingClassId ? cancelEdit : undefined}
                        style={editingClassId
                          ? { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top))', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }
                          : { display: 'contents' }}
                      >
                      <motion.div
                        key={editingClassId ? 'class-form-modal' : 'class-form-inline'}
                        initial={editingClassId ? { opacity: 0, scale: 0.96, y: 8 } : false}
                        animate={editingClassId ? { opacity: 1, scale: 1, y: 0 } : undefined}
                        transition={{ duration: 0.18 }}
                        onClick={editingClassId ? (e => e.stopPropagation()) : undefined}
                        style={editingClassId
                          ? { width: '100%', maxWidth: '480px', maxHeight: '88vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 24px 60px rgba(0,0,0,0.28)' }
                          : { background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid var(--border-subtle)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h4 style={{ fontSize: '1rem', margin: 0, color: editingClassId ? 'var(--primary)' : 'var(--black)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                            {editingClassId && <Pencil size={16} />}
                            {editingClassId ? 'Editar clase' : (selectedCalendarDay === 'bulk' ? 'Configurar Rango Masivo' : 'Añadir clase a este día')}
                          </h4>
                          {editingClassId && (
                            <button onClick={cancelEdit} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Cancelar</button>
                          )}
                        </div>

                        {classMode === 'range' && (
                          <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Rango de Fechas</label>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                              <div style={{flex: 1, minWidth: 0}}>
                                <span style={{fontSize: '0.7rem', color: '#666'}}>Desde</span>
                                <input type="date" value={newClass.startDate} onChange={e => setNewClass({...newClass, startDate: e.target.value})} style={inputStyle} />
                              </div>
                              <div style={{flex: 1, minWidth: 0}}>
                                <span style={{fontSize: '0.7rem', color: '#666'}}>Hasta</span>
                                <input type="date" value={newClass.endDate} onChange={e => setNewClass({...newClass, endDate: e.target.value})} style={inputStyle} />
                              </div>
                            </div>
                            <label style={labelStyle}>Días a repetir</label>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              {daysOfWeek.map(d => (
                                <button 
                                  key={d.num}
                                  onClick={() => setNewClass(prev => ({
                                    ...prev,
                                    daysOfWeek: prev.daysOfWeek.includes(d.num) ? prev.daysOfWeek.filter(n => n !== d.num) : [...prev.daysOfWeek, d.num]
                                  }))}
                                  style={{ 
                                    padding: '6px 12px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold',
                                    borderColor: newClass.daysOfWeek.includes(d.num) ? 'var(--primary)' : 'var(--border-subtle)',
                                    background: newClass.daysOfWeek.includes(d.num) ? 'var(--primary)' : 'white',
                                    color: newClass.daysOfWeek.includes(d.num) ? 'white' : '#666',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {d.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {(disciplines || []).length > 0 && (
                          <select
                            value=""
                            onChange={e => {
                              const d = (disciplines || []).find(x => x.id === e.target.value);
                              if (d) setNewClass({ ...newClass, title: d.name, description: d.description || d.short_desc || '' });
                            }}
                            style={{...inputStyle, WebkitAppearance: 'none', marginBottom: '10px', fontWeight: 600, color: 'var(--primary)'}}
                          >
                            <option value="">Elegir clase del catálogo…</option>
                            {(disciplines || []).map(d => <option key={d.id} value={d.id} style={{ color: 'var(--on-surface)', fontWeight: 500 }}>{d.name}</option>)}
                          </select>
                        )}
                        <input placeholder="Título (ej. Full Body)" value={newClass.title} onChange={e => setNewClass({...newClass, title: e.target.value})} style={{...inputStyle, marginBottom: '10px'}} />
                        <textarea
                          placeholder="Descripción (ej. Clase de reformer para trabajar core y glúteos...)"
                          value={newClass.description}
                          onChange={e => setNewClass({...newClass, description: e.target.value})}
                          rows={2}
                          style={{...inputStyle, resize: 'none', fontFamily: 'inherit', marginBottom: '10px'}}
                        />
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginLeft: '4px' }}>Hora</label>
                            <input type="time" value={to24h(newClass.time)} onChange={e => setNewClass({...newClass, time: toAmPm(e.target.value)})} style={{...inputStyle, WebkitAppearance: 'none', appearance: 'none', marginTop: '4px'}} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginLeft: '4px' }}>Coach</label>
                            <select value={newClass.coach_id} onChange={e => {
                              const c = coaches.find(x => x.id === e.target.value);
                              setNewClass({...newClass, coach_id: e.target.value, instructor: c ? (c.full_name || c.email) : ''});
                            }} style={{...inputStyle, WebkitAppearance: 'none', marginTop: '4px'}}>
                              <option value="">Coach...</option>
                              {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: addingLevel ? '10px' : '15px' }}>
                          <input type="number" placeholder="Cupos" value={newClass.spots} onChange={e => setNewClass({...newClass, spots: e.target.value})} style={inputStyle} />
                          <select value={addingLevel ? '__new__' : newClass.level} onChange={e => {
                            if (e.target.value === '__new__') { setAddingLevel(true); setNewClass({...newClass, level: ''}); }
                            else { setAddingLevel(false); setNewClass({...newClass, level: e.target.value}); }
                          }} style={{...inputStyle, WebkitAppearance: 'none'}}>
                            {allLevels.map(l => <option key={l} value={l}>{l}</option>)}
                            <option value="__new__">+ Nuevo nivel…</option>
                          </select>
                        </div>
                        {addingLevel && (
                          <input autoFocus placeholder="Nombre del nivel (ej. Avanzado+)" value={newClass.level} onChange={e => setNewClass({...newClass, level: e.target.value})} style={{...inputStyle, marginBottom: '15px'}} />
                        )}

                        <div style={{ marginBottom: '15px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginLeft: '4px' }}>Categoría</label>
                          <select value={addingCategory ? '__new__' : newClass.category} onChange={e => {
                            if (e.target.value === '__new__') { setAddingCategory(true); setNewClass({...newClass, category: '', category_color: PASTEL_PALETTE[0]}); }
                            else { setAddingCategory(false); const cat = allCategories.find(c => c.name === e.target.value); setNewClass({...newClass, category: e.target.value, category_color: cat ? cat.color : null}); }
                          }} style={{...inputStyle, WebkitAppearance: 'none', marginTop: '4px'}}>
                            {allCategories.map(c => <option key={c.name} value={c.name}>{c.label}</option>)}
                            <option value="__new__">+ Nueva categoría…</option>
                          </select>

                          {addingCategory && (
                            <div style={{ marginTop: '10px' }}>
                              <input autoFocus placeholder="Nombre de la categoría (ej. Cardio)" value={newClass.category} onChange={e => setNewClass({...newClass, category: e.target.value})} style={{...inputStyle, marginBottom: '10px'}} />
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Elige un color pastel</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {PASTEL_PALETTE.map(col => (
                                  <button key={col} type="button" onClick={() => setNewClass({...newClass, category_color: col})}
                                    style={{ width: '40px', height: '40px', borderRadius: '12px', background: col, cursor: 'pointer',
                                      border: newClass.category_color === col ? '3px solid var(--primary)' : '1px solid rgba(0,0,0,0.1)',
                                      boxShadow: newClass.category_color === col ? '0 4px 12px rgba(255,145,77,0.3)' : 'none' }} />
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                            <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: newClass.category_color || '#ECECEC', border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}>Este color lo verán clientas, coaches y las historias</span>
                          </div>
                        </div>
                        
                        {/* Clase especial: la resalta en toda la agenda (sigue siendo clase normal) */}
                        <div style={{ marginBottom: '15px', padding: '14px', borderRadius: '14px', border: `1.5px solid ${newClass.is_special ? 'var(--primary)' : 'var(--border-subtle)'}`, background: newClass.is_special ? 'rgba(255,145,77,0.06)' : 'transparent', transition: 'all 0.2s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: newClass.is_special ? 'linear-gradient(135deg, #FF914D, #E07A9C)' : 'rgba(0,0,0,0.05)' }}>
                              <Sparkles size={17} color={newClass.is_special ? '#fff' : 'var(--on-surface-variant)'} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--on-surface)' }}>Clase especial</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>La resalta en la agenda (masterclass, evento…)</div>
                            </div>
                            <button type="button" role="switch" aria-checked={newClass.is_special}
                              onClick={() => setNewClass({ ...newClass, is_special: !newClass.is_special })}
                              style={{ width: '46px', height: '28px', borderRadius: '999px', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, position: 'relative', background: newClass.is_special ? 'var(--primary)' : 'rgba(0,0,0,0.18)', transition: 'background 0.2s' }}>
                              <span style={{ position: 'absolute', top: '3px', left: newClass.is_special ? '21px' : '3px', width: '22px', height: '22px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s' }} />
                            </button>
                          </div>
                          {newClass.is_special && (
                            <>
                              <input
                                placeholder="Etiqueta: Masterclass, Taller, Evento… (opcional)"
                                value={newClass.special_label}
                                onChange={e => setNewClass({ ...newClass, special_label: e.target.value })}
                                maxLength={22}
                                style={{ ...inputStyle, marginTop: '12px' }}
                              />
                              <div style={{ marginTop: '14px' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: '9px' }}>Color del resaltado</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '11px' }}>
                                  {SPECIAL_COLORS.map(col => {
                                    const selected = (newClass.special_color || SPECIAL_COLORS[0]) === col;
                                    return (
                                      <button key={col} type="button" onClick={() => setNewClass({ ...newClass, special_color: col })}
                                        aria-label={`Color ${col}`}
                                        style={{ width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', background: col, padding: 0,
                                          border: selected ? '3px solid var(--on-surface)' : '2px solid #fff',
                                          boxShadow: selected ? `0 0 0 2px ${col}` : '0 2px 7px rgba(0,0,0,0.18)', transition: 'all 0.15s' }} />
                                    );
                                  })}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', marginTop: '9px' }}>Así se verán el humo y la etiqueta de la clase.</div>
                              </div>
                            </>
                          )}
                        </div>

                        <button onClick={async (e) => {
                          await handleCreateClass(e);
                          if (classMode === 'range') setCalendarView('month');
                        }} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                          {editingClassId ? 'Guardar cambios' : (classMode === 'single' ? 'Guardar Clase' : 'Generar Clases Múltiples')}
                        </button>
                      </motion.div>
                      </div>
                    </motion.div>
                  )}
                </section>
              </motion.div>
            )}
  
            {/* ============ TAB: VENTAS (Inscribir + Cobros) ============ */}
            {activeTab === 'ventas' && (
              <motion.div key="ventas" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <div className="admin-double-column">
                  {/* SECCIÓN INSCRIBIR CLIENTA NUEVA (todo en uno: cuenta + plan + cobro) */}
                  <section style={{ width: '100%' }}>
                    <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', marginBottom: '20px' }}>Inscribir clienta</h2>
                    {inscDone ? (
                      <div className="ios-glass-card" style={{ background: 'var(--surface)', border: 'none', padding: '22px', margin: 0, textAlign: 'center' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><CheckCircle2 size={30} color="#16A34A" /></div>
                        <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>¡Clienta inscrita!</h3>
                        <p style={{ margin: '0 0 16px', color: 'var(--on-surface-variant)', fontSize: '0.88rem' }}>Comparte estos datos de acceso con la clienta:</p>
                        <div style={{ textAlign: 'left', background: 'var(--surface-lowest)', borderRadius: '14px', padding: '14px', marginBottom: '14px' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>Correo</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', wordBreak: 'break-all' }}>{inscDone.email}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>Contraseña temporal</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{inscDone.password}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => navigator.clipboard?.writeText(`Acceso ${ESTUDIO.nombre}\nCorreo: ${inscDone.email}\nContraseña: ${inscDone.password}`)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--surface)', fontWeight: 700, cursor: 'pointer' }}>Copiar</button>
                          <button onClick={() => setInscDone(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Inscribir otra</button>
                        </div>
                        <p style={{ margin: '12px 0 0', color: 'var(--on-surface-variant)', fontSize: '0.74rem' }}>La clienta puede cambiar su contraseña luego desde su perfil.</p>
                      </div>
                    ) : (
                      <div className="ios-glass-card" style={{ background: 'var(--surface)', border: 'none', padding: '22px', margin: 0 }}>
                        <div style={{ marginBottom: '14px' }}>
                          <label style={labelStyle}>Nombre Completo</label>
                          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej. Ana Pérez" style={inputStyle} />
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                          <label style={labelStyle}>Correo Electrónico</label>
                          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="ana@ejemplo.com" style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={labelStyle}>WhatsApp</label>
                            <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="10 dígitos" style={inputStyle} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Cumpleaños (opcional)</label>
                            <input type="date" value={newBirth} onChange={(e) => setNewBirth(e.target.value)} style={inputStyle} />
                          </div>
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                          <label style={labelStyle}>Membresía</label>
                          <select value={newInscPlan} onChange={(e) => setNewInscPlan(e.target.value)} style={{ ...inputStyle, WebkitAppearance: 'none' }}>
                            <option value="">Sin plan (solo registrar)</option>
                            {PLANS.map(p => <option key={p.name} value={p.name}>{p.title} — {p.unlimited ? 'ilimitadas' : p.classes + ' clases'} ({p.price})</option>)}
                          </select>
                        </div>
                        {newInscPlan && (
                          <div style={{ marginBottom: '14px' }}>
                            <label style={labelStyle}>Método de pago</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                              {['efectivo', 'tarjeta', 'transferencia'].map(m => (
                                <div key={m} onClick={() => setNewPayMethod(m)} style={{ padding: '12px 8px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', background: newPayMethod === m ? 'var(--primary)' : 'var(--surface-lowest)', color: newPayMethod === m ? 'white' : 'var(--on-surface-variant)', border: newPayMethod === m ? '1px solid var(--primary)' : '1px solid rgba(55,61,59,0.08)' }}>{m.toUpperCase()}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ marginBottom: '20px' }}>
                          <label style={labelStyle}>Contraseña temporal</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="text" value={tempPass} onChange={(e) => setTempPass(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                            <button type="button" onClick={() => setTempPass(ESTUDIO.prefijoContrasena + Math.floor(1000 + Math.random() * 9000))} style={{ padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Generar</button>
                          </div>
                        </div>
                        <button onClick={handleInscribir} disabled={inscribiendo} style={{ width: '100%', padding: '15px', borderRadius: '14px', background: 'var(--primary)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.95rem', opacity: inscribiendo ? 0.7 : 1 }}>
                          {inscribiendo ? 'Inscribiendo…' : 'Inscribir clienta'}
                        </button>
                      </div>
                    )}
                  </section>
  
                  {/* SECCIÓN COBROS */}
                  <section style={{ width: '100%' }}>
                    <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', marginBottom: '20px' }}>Cobro de Membresía</h2>
                    {showPaySuccess ? (
                      <SuccessCard message="Pago confirmado y clases asignadas." />
                    ) : (
                      <div className="ios-glass-card" style={{ background: 'var(--surface)', border: 'none', padding: '22px', margin: 0 }}>
                        <div style={{ marginBottom: '16px' }}>
                          <label style={labelStyle}>Alumna</label>
                          <SearchableClientSelect clients={alumnas} value={selectedAlumnaId} onChange={setSelectedAlumnaId} placeholder="Buscar alumna por nombre o correo…" />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                          <label style={labelStyle}>Membresía</label>
                          <select value={selectedPlan} onChange={(e)=>setSelectedPlan(e.target.value)} style={{ ...inputStyle, WebkitAppearance: 'none' }}>
                            {PLANS.map(p => <option key={p.name} value={p.name}>{p.title} — {p.unlimited ? 'ilimitadas' : p.classes + ' clases'} ({p.price})</option>)}
                          </select>
                        </div>
                        <div style={{ marginBottom: '22px' }}>
                          <label style={labelStyle}>Método</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            {['efectivo', 'tarjeta', 'transferencia'].map(m => (
                              <div key={m} onClick={() => setSelectedPayMethod(m)} style={{ 
                                padding: '12px 8px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem',
                                background: selectedPayMethod === m ? 'var(--primary)' : 'var(--surface-lowest)',
                                color: selectedPayMethod === m ? 'white' : 'var(--on-surface-variant)',
                                border: selectedPayMethod === m ? '1px solid var(--primary)' : '1px solid rgba(55,61,59,0.08)'
                              }}>{m.toUpperCase()}</div>
                            ))}
                          </div>
                        </div>
                        <button onClick={handlePago} disabled={charging} style={{ width: '100%', padding: '15px', borderRadius: '14px', background: 'var(--primary)', color: 'white', fontWeight: 700, border: 'none', cursor: charging ? 'wait' : 'pointer', fontSize: '0.95rem', opacity: charging ? 0.6 : 1 }}>
                          {charging ? 'Procesando…' : 'Confirmar Transacción'}
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              </motion.div>
            )}
  
            {/* ============ TAB: NUTRICION ============ */}
            {activeTab === 'nutricion' && (
              <motion.div key="nutricion" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <AdminNutricion />
              </motion.div>
            )}

            {/* ============ TAB: PROGRESO (fotos de las clientas) ============ */}
            {activeTab === 'progreso' && (
              <motion.div key="progreso" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <AdminProgreso />
              </motion.div>
            )}

            {/* ============ TAB: CAFETERÍA ============ */}
            {activeTab === 'cafeteria' && (
              <motion.div key="cafeteria" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <AdminCafeteria />
              </motion.div>
            )}

            {/* ============ TAB: DISCIPLINAS ============ */}
            {activeTab === 'disciplinas' && (
              <motion.div key="disciplinas" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <AdminDisciplinas />
              </motion.div>
            )}

            {activeTab === 'eventos' && (
              <motion.div key="eventos" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <AdminEventos />
              </motion.div>
            )}

            {/* ============ TAB: INSIGNIAS ============ */}
            {activeTab === 'insignias' && (
              <motion.div key="insignias" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <div className="admin-double-column">
                  
                  {/* Columna Izquierda: Reglas Automáticas */}
                  <section>
                    <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', marginBottom: '20px' }}>Creador de Insignias Automáticas</h2>
                    <div className="ios-glass-card" style={{ background: 'var(--surface)', border: 'none', padding: '22px', margin: 0, marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ width: '80px' }}>
                          <label style={labelStyle}>Icono</label>
                          <input type="text" value={newRuleBadge.icon} onChange={e => setNewRuleBadge({...newRuleBadge, icon: e.target.value})} style={{...inputStyle, textAlign: 'center', fontSize: '1.5rem'}} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>Nombre (Ej. Fuego Continuo)</label>
                          <input type="text" value={newRuleBadge.label} onChange={e => setNewRuleBadge({...newRuleBadge, label: e.target.value})} style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Descripción Corta</label>
                        <input type="text" placeholder="Asiste a 3 clases en una semana" value={newRuleBadge.description} onChange={e => setNewRuleBadge({...newRuleBadge, description: e.target.value})} style={inputStyle} />
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>¿Qué se debe cumplir?</label>
                        <select value={newRuleBadge.rule_type} onChange={e => setNewRuleBadge({...newRuleBadge, rule_type: e.target.value})} style={{...inputStyle, WebkitAppearance: 'none'}}>
                          <option value="TOTAL_CLASSES">Total de clases asistidas</option>
                          <option value="WEEKLY_CLASSES">Clases en una misma semana</option>
                          <option value="DIFFERENT_COACHES">Coaches diferentes tomados</option>
                          <option value="PROFILE_COMPLETE">Completar el perfil (Foto y datos)</option>
                          <option value="MANUAL">Otorgamiento Manual (Eventos/Retos)</option>
                        </select>
                      </div>
                      {newRuleBadge.rule_type !== 'PROFILE_COMPLETE' && newRuleBadge.rule_type !== 'MANUAL' && (
                        <div style={{ marginBottom: '16px' }}>
                          <label style={labelStyle}>Valor Objetivo (Ej. 3, 10, 100)</label>
                          <input type="number" min="1" value={newRuleBadge.rule_value} onChange={e => setNewRuleBadge({...newRuleBadge, rule_value: parseInt(e.target.value)})} style={inputStyle} />
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleSaveRuleBadge} style={{ flex: 1, padding: '15px', borderRadius: '14px', background: 'var(--primary)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}>
                          {editingBadgeId ? 'Guardar Cambios' : 'Crear Insignia'}
                        </button>
                        {editingBadgeId && (
                          <button onClick={cancelEditBadge} style={{ padding: '15px 25px', borderRadius: '14px', background: 'var(--surface-lowest)', color: 'var(--on-surface)', border: '1px solid var(--border-subtle)', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>

                    <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', marginBottom: '15px' }}>Reglas Activas</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {badgeConfigs.map(badge => (
                        <div key={badge.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '15px', borderRadius: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '1.8rem' }}>{badge.icon}</span>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--black)', fontSize: '0.95rem' }}>{badge.label}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                                {getRuleDescription(badge.rule_type, badge.rule_value)}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleEditRuleBadge(badge)} style={{ background: 'rgba(255,139,66,0.1)', color: 'var(--primary)', border: 'none', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDeleteRuleBadge(badge.id)} style={{ background: '#FF4D4D15', color: '#FF4D4D', border: 'none', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <Minus size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {badgeConfigs.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>No hay reglas configuradas.</p>}
                    </div>
                  </section>

                  {/* Columna Derecha: Asignación Manual */}
                  <section>
                    <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', marginBottom: '20px' }}>Otorgamiento Manual</h2>
                    <div className="ios-glass-card" style={{ background: 'var(--surface)', border: 'none', padding: '22px', margin: 0 }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginBottom: '15px' }}>
                        Asigna insignias configuradas como "Manual" o insignias personalizadas temporales a alumnas específicas.
                      </p>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Seleccionar Alumna</label>
                        <SearchableClientSelect clients={alumnas} value={selectedBadgeUser} onChange={setSelectedBadgeUser} placeholder="Buscar alumna por nombre o correo…" />
                      </div>

                      {selectedBadgeUser && (
                        <>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '80px' }}>
                              <label style={labelStyle}>Icono</label>
                              <input type="text" value={newCustomBadge.icon} onChange={e => setNewCustomBadge({...newCustomBadge, icon: e.target.value})} style={{...inputStyle, textAlign: 'center', fontSize: '1.5rem'}} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={labelStyle}>Nombre de Insignia</label>
                              <input type="text" placeholder="Ej. Reto Verano 2026" value={newCustomBadge.label} onChange={e => setNewCustomBadge({...newCustomBadge, label: e.target.value})} style={inputStyle} />
                            </div>
                          </div>
                          <button onClick={handleAssignBadge} style={{ width: '100%', padding: '15px', borderRadius: '14px', background: 'var(--primary)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.95rem', marginBottom: '20px' }}>
                            Otorgar a Alumna
                          </button>

                          <h3 style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tiene actualmente:</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {allUsers.find(u => u.id === selectedBadgeUser)?.custom_badges?.filter(b => !b._internal_notified_id)?.length > 0 ? (
                              allUsers.find(u => u.id === selectedBadgeUser).custom_badges.filter(b => !b._internal_notified_id).map((badge, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-lowest)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.5rem' }}>{badge.icon}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--black)' }}>{badge.label}</span>
                                  </div>
                                  <button onClick={() => handleRemoveBadge(badge.label)} style={{ background: '#FF4D4D15', color: '#FF4D4D', border: 'none', width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <Minus size={14} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontStyle: 'italic', margin: 0 }}>Ninguna insignia manual.</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {/* ============ TAB: REPORTES (Métricas de Negocio) PREMIUM ============ */}
            {activeTab === 'reportes' && (
              <motion.div key="reportes" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <ReportesLock>
                  <AdminReportes />
                </ReportesLock>
              </motion.div>
            )}

            {activeTab === 'clientas' && (
              <motion.div key="clientas" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <AdminClientas />
              </motion.div>
            )}

            {activeTab === 'asistencias' && (
              <motion.div key="asistencias" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <AdminAsistencias />
              </motion.div>
            )}

            {activeTab === 'membresias' && (
              <motion.div key="membresias" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <AdminPlanes />
              </motion.div>
            )}

            {activeTab === 'cumpleanos' && (
              <motion.div key="cumpleanos" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <AdminCumpleanos />
              </motion.div>
            )}

            {activeTab === 'auditoria' && (
              <motion.div key="auditoria" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} transition={{duration:0.3}}>
                <AdminControlSaldos />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ====== BOTTOM NAV PREMIUM — INSTAGRAM STYLE ====== */}
      <nav className={`ios-bottom-nav mobile-only-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div onClick={() => setActiveTab('clases')} className={`nav-item ${activeTab === 'clases' ? 'active' : ''}`}>
          <Calendar size={22} strokeWidth={2.5} />
          <span>Clases</span>
        </div>
        
        <button 
          className="nav-qr-button" 
          onClick={() => setActiveTab('mostrador')}
          style={activeTab === 'mostrador' ? {
            background: 'linear-gradient(135deg, #FF914D, #FF6B00)',
            boxShadow: '0 0 25px rgba(255, 145, 77, 0.8), 0 0 0 4px rgba(255, 255, 255, 1)'
          } : {}}
        >
          <QrCode size={24} strokeWidth={2.5} />
        </button>

        <div onClick={() => setActiveTab('ventas')} className={`nav-item ${activeTab === 'ventas' ? 'active' : ''}`}>
          <DollarSign size={22} strokeWidth={2.5} />
          <span>Ventas</span>
        </div>
      </nav>

      {/* PREMIUM TOAST NOTIFICATION */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, animation: 'fadeIn 0.3s ease',
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 24px', borderRadius: '16px',
          background: toast.type === 'error' 
            ? 'linear-gradient(135deg, #FF4D4D, #FF6B6B)' 
            : 'linear-gradient(135deg, #22C55E, #4ADE80)',
          color: 'white', fontWeight: 700, fontSize: '0.9rem',
          boxShadow: toast.type === 'error' 
            ? '0 15px 40px rgba(255,77,77,0.35)' 
            : '0 15px 40px rgba(34,197,94,0.35)',
          backdropFilter: 'blur(20px)',
          fontFamily: 'var(--font-body)',
          minWidth: '280px', maxWidth: '90vw',
        }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '50%', 
            background: 'rgba(255,255,255,0.25)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', flexShrink: 0 
          }}>
            <CheckCircle2 size={18} />
          </div>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Gestor de categorías */}
      <AdminCategoryManager
        open={showCatManager}
        onClose={() => setShowCatManager(false)}
        categories={categories || []}
        onAdd={addCategory}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
        showToast={showToast}
      />

      {/* Plantillas de semana */}
      <AdminWeekTemplates
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        templates={classTemplates || []}
        classes={globalClasses}
        refDate={selectedCalendarDay && selectedCalendarDay !== 'bulk' ? selectedCalendarDay : todayStr}
        onSave={saveTemplate}
        onDelete={deleteTemplate}
        onApply={applyTemplate}
        showToast={showToast}
      />
    </div>
  );
}

function SuccessCard({ message }) {
  return (
    <div className="ios-glass-card" style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--surface)', border: 'none' }}>
      <div style={{ width: '60px', height: '60px', background: 'rgba(34,197,94,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
        <CheckCircle2 size={30} color="#22C55E" />
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '5px' }}>¡Éxito!</h3>
      <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem' }}>{message}</p>
    </div>
  );
}

export default Admin;
