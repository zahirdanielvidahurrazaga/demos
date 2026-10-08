// ── REGISTRO DE MEMBRESÍAS ──────────────────────────────────────────────────
// La FUENTE DE VERDAD ahora vive en la tabla `membership_plans` de Supabase y se
// edita desde el panel de admin. Este módulo es un REGISTRO VIVO: arranca con los
// valores por defecto (DEFAULT_PLANS, idénticos al seed) y `AuthContext` lo
// hidrata con los datos reales de la BD al cargar, vía `setPlans()`.
//
// `PLANS` y `PLAN_BY_NAME` son *live bindings*: al reasignarlos aquí, todo el que
// los importe ve el valor nuevo en su próximo render. Así los call sites de los
// helpers (gating) NO cambian. Si la BD falla, se quedan los DEFAULT_PLANS y el
// sitio nunca queda vacío.
//
// `name` = nombre canónico = users.membership_plan = clave en la metadata de
// Stripe. `amount` está en PESOS (para sales.amount); las edge functions de
// Stripe leen la BD aparte y derivan centavos.

export const DEFAULT_PLANS = [
  {
    name: 'Plan Principiante', title: 'Principiante', price: '$750', amount: 750, classes: 8, unlimited: false,
    lookupKey: 'befit_plan_principiante_monthly', subtitle: 'Tu primer paso',
    features: ['Acceso a 8 clases', 'Registro de métricas', 'Acceso a la app'],
    paymentUrl: '#', active: true, sort_order: 1,
  },
  {
    name: 'Plan Inicial', title: 'Inicial', price: '$850', amount: 850, classes: 10, unlimited: false,
    lookupKey: 'befit_plan_inicial_monthly', subtitle: 'Perfecto para probar',
    features: ['Acceso a 10 clases', 'Registro de métricas', 'Acceso a la app'],
    paymentUrl: '#', active: true, sort_order: 2,
  },
  {
    name: 'Plan Básico', title: 'Básico', price: '$1,050', amount: 1050, classes: 15, unlimited: false, nutrition: true,
    lookupKey: 'befit_plan_basico_monthly', subtitle: 'Para las que van en serio',
    features: ['Acceso a 15 clases', '+100 ideas de recetas', 'Registro de métricas', 'Acceso a la app'],
    paymentUrl: '#', active: true, sort_order: 3,
  },
  {
    name: 'Plan Fit', title: 'Fit', price: '$1,300', amount: 1300, classes: 20, unlimited: false, mealPlan: true, nutrition: true,
    lookupKey: 'befit_plan_fit_monthly', subtitle: 'Constancia que transforma',
    features: ['Acceso a 20 clases', 'Plan alimenticio personalizado', '+100 ideas de recetas', 'Registro de métricas', 'Acceso a la app'],
    paymentUrl: '#', active: true, sort_order: 4,
  },
  {
    name: 'Plan Premium', title: 'Premium', price: '$1,850', amount: 1850, classes: 9999, unlimited: true, mealPlan: true, nutrition: true,
    lookupKey: 'befit_plan_premium_monthly', subtitle: 'El más completo',
    features: ['Acceso clases ILIMITADAS', '3 invitadas al mes sin costo', 'Plan alimenticio personalizado', '+100 ideas de recetas', 'Registro de métricas', 'Acceso a la app', '10% desc. en cafetería'],
    paymentUrl: '#', active: true, sort_order: 5,
  },
];

// Live bindings: se reasignan en setPlans(). Importarlos da siempre el valor vigente.
export let PLANS = DEFAULT_PLANS;
export let PLAN_BY_NAME = Object.fromEntries(DEFAULT_PLANS.map(p => [p.name, p]));

// Convierte una fila de la tabla membership_plans al shape que usa el front.
export function dbRowToPlan(r) {
  return {
    name: r.name,
    title: r.title,
    subtitle: r.subtitle || '',
    price: '$' + Number(r.price_mxn || 0).toLocaleString('es-MX'),
    amount: Number(r.price_mxn || 0),
    classes: Number(r.classes || 0),
    unlimited: !!r.unlimited,
    nutrition: !!r.nutrition,
    mealPlan: !!r.meal_plan,
    features: Array.isArray(r.features) ? r.features : [],
    lookupKey: r.stripe_lookup_base,
    paymentUrl: '#',
    active: r.active !== false,
    sort_order: r.sort_order ?? 0,
  };
}

// Hidrata el registro con la lista COMPLETA de planes (activos + archivados),
// para que PLAN_BY_NAME y los helpers de gating resuelvan también el plan de una
// clienta cuyo plan fue archivado. Si llega vacío/nulo, conserva los defaults.
export function setPlans(arr) {
  const list = (Array.isArray(arr) && arr.length) ? arr : DEFAULT_PLANS;
  PLANS = list;
  PLAN_BY_NAME = Object.fromEntries(list.map(p => [p.name, p]));
}

// Tope de meta mensual: las clases que da el plan; ilimitado o desconocido → 31 (≈ 1/día)
export function monthlyGoalCap(planName) {
  const p = PLAN_BY_NAME[planName];
  if (!p) return 31;
  return p.unlimited ? 31 : p.classes;
}

// ¿El plan incluye plan alimenticio personalizado por mes? (Fit y Premium por defecto.)
export function hasMealPlanAccess(planName) {
  return !!PLAN_BY_NAME[planName]?.mealPlan;
}

// ¿El plan tiene acceso al apartado de Nutrición (recetario y, si aplica, plan
// alimenticio)? Los dos planes más económicos (Principiante e Inicial) NO por defecto.
export function hasNutritionAccess(planName) {
  return !!PLAN_BY_NAME[planName]?.nutrition;
}
