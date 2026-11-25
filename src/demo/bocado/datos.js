// ─────────────────────────────────────────────────────────────────────────────
// EL BUEN BOCADO — datos de la maqueta (13-nov-2026)
//
// Proyecto de la uni de Zahir (Emprendimiento): comida saludable para recoger,
// para oficinistas con poco tiempo. Sin base de datos: la app guarda todo en
// localStorage (`CLAVE`) y se vuelve a sembrar cada día.
// ─────────────────────────────────────────────────────────────────────────────

export const IMG = '/bocado';
export const CLAVE = 'demo_bocado_v3';
export const CLAVE_PERFIL = 'demo_bocado_perfil_v3';   // sobrevive al resembrado diario

export const NEGOCIO = {
  nombre: 'el buen bocado',
  lema: 'Comer bien, a tu hora.',
  direccion: 'Av. San Claudio 1612, local 3 · San Manuel, Puebla',
  horario: 'Lunes a viernes · 8:00 a 17:00',
  recoger: { desde: 12 * 60, hasta: 16 * 60, cada: 15, cupo: 18 },   // minutos del día
  aviso: 30,   // minutos antes de tu hora entra a cocina
  envio: 25,   // costo de envío a domicilio (gratis con plan)
  entrega: '25–35 min',
  radio: '3 km a la redonda',
};

// Recorrido de bienvenida: lo que se pregunta la primera vez.
export const OBJETIVOS = ['Comer más sano', 'Más proteína', 'Bajar de peso', 'Vegetariano'];
export const EVITA = ['Lácteos', 'Gluten', 'Nueces', 'Mariscos', 'Cebolla'];
export const DIRECCION_DEMO = { nombre: 'Oficina', linea: 'Circuito Juan Pablo II 2107, piso 4', detalle: 'Col. San Manuel · a 1.2 km' };

export const CATEGORIAS = [
  ['bowls', 'Bowls'],
  ['wraps', 'Wraps'],
  ['bebidas', 'Bebidas'],
];

export const PLATILLOS = [
  { id: 'mediterraneo', cat: 'bowls', nombre: 'Bowl mediterráneo', precio: 125, kcal: 520, prot: 24,
    desc: 'Quinoa, garbanzo rostizado, pepino, jitomate cherry, aceitunas y aderezo de yogur con limón.',
    etiquetas: ['Vegetariano'], quitar: ['Aceitunas', 'Cebolla morada', 'Aderezo'], tiene: ['Lácteos', 'Cebolla'] },
  { id: 'pollo-limon', cat: 'bowls', nombre: 'Pollo al limón', precio: 135, kcal: 560, prot: 42,
    desc: 'Pollo a la plancha marinado en limón y hierbas, arroz integral, brócoli y calabacita.',
    etiquetas: ['Alto en proteína'], quitar: ['Brócoli', 'Calabacita', 'Salsa'], tiene: [] },
  { id: 'lentejas', cat: 'bowls', nombre: 'Lentejas tibias', precio: 115, kcal: 480, prot: 26,
    desc: 'Lentejas con verduras asadas, espinaca y huevo pochado. Reconfortante y ligero.',
    etiquetas: ['Vegetariano', 'Alto en fibra'], quitar: ['Huevo', 'Espinaca'], tiene: ['Cebolla'] },
  { id: 'poke-atun', cat: 'bowls', nombre: 'Poke de atún', precio: 145, kcal: 540, prot: 34,
    desc: 'Atún fresco, arroz de sushi, edamame, mango, pepino y ajonjolí con salsa ponzu.',
    etiquetas: ['Alto en proteína'], quitar: ['Mango', 'Ajonjolí', 'Ponzu'], tiene: ['Mariscos', 'Gluten'] },
  { id: 'wrap', cat: 'wraps', nombre: 'Wrap de pollo', precio: 105, kcal: 450, prot: 32,
    desc: 'Tortilla integral, pollo, lechuga, jitomate, aguacate y aderezo de chipotle ligero. Con ensalada.',
    etiquetas: ['Para llevar'], quitar: ['Aguacate', 'Chipotle'], tiene: ['Gluten', 'Lácteos'] },
  { id: 'agua-pepino', cat: 'bebidas', nombre: 'Agua de pepino con limón', precio: 30, kcal: 40, prot: 0,
    desc: 'Natural, sin azúcar añadida. 500 ml en botella de vidrio retornable.',
    etiquetas: ['Sin azúcar'], quitar: [], tiene: [] },
];

export const EXTRAS = [
  { id: 'aguacate', nombre: 'Extra aguacate', precio: 18 },
  { id: 'proteina', nombre: 'Doble proteína', precio: 30 },
  { id: 'agua', nombre: 'Agua de pepino', precio: 25 },
];

export const platillo = (id) => PLATILLOS.find((p) => p.id === id);
export const foto = (id) => `${IMG}/p-${id}.webp`;

// Menú de la semana: el plato del día de lunes a viernes (lo demás siempre está).
export const DEL_DIA = ['pollo-limon', 'lentejas', 'mediterraneo', 'poke-atun', 'wrap'];

// Planes (la cifra que importa: cuánto ahorras y que no piensas qué comer).
export const PLANES = [
  { id: 'suelto', nombre: 'Por pedido', precio: null, detalle: 'Pides cuando quieras, desde $105.', puntos: ['Programa con hasta 7 días', 'Recoges sin fila o pides a domicilio'] },
  { id: 'semana', nombre: 'Plan semana', precio: 629, comidas: 5, detalle: '5 comidas de lunes a viernes.', puntos: ['Ahorras ~16%', 'Agua de pepino incluida', 'Envío gratis a tu oficina', 'Cambia el platillo hasta las 10 am'], destacado: true },
  { id: 'mes', nombre: 'Plan mes', precio: 2390, comidas: 20, detalle: '20 comidas para el mes.', puntos: ['Ahorras ~20%', 'Agua y envío incluidos', 'Pausa cuando salgas de viaje'] },
];

// Membresía (propuesta 13-nov, Zahir la revisa) y recompensas de lealtad.
export const MEMBRESIA = {
  nombre: 'Bocado+', precio: 149,
  beneficios: ['Envío gratis ilimitado', '10% en todo el menú', 'Doble de bocados', 'Bebida gratis los viernes'],
  descuento: 0.10,
};
export const RECOMPENSAS = [
  { id: 'agua', nombre: 'Agua de pepino', costo: 120, img: 'agua-pepino' },
  { id: 'aguacate', nombre: 'Extra aguacate', costo: 150, img: 'mediterraneo' },
  { id: 'envio', nombre: 'Envío gratis', costo: 200, img: 'wrap' },
  { id: 'bowl', nombre: 'Un bowl gratis', costo: 1200, img: 'pollo-limon' },
];
export const EMPAQUE = 'Empaque 100% biodegradable';

// ── fechas ──────────────────────────────────────────────────────────────────
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const hoyISO = () => iso(new Date());
export function iso(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function deISO(s) { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); }
export const diaCorto = (s) => DIAS[deISO(s).getDay()];
export const diaLargo = (s) => DIAS_LARGO[deISO(s).getDay()];
export const numDia = (s) => deISO(s).getDate();

// Días hábiles desde hoy (si hoy es fin de semana, desde el lunes).
export function diasHabiles(n = 5) {
  const out = []; const d = new Date();
  while (out.length < n) {
    if (d.getDay() >= 1 && d.getDay() <= 5) out.push(iso(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
export const delDia = (s) => DEL_DIA[(deISO(s).getDay() + 4) % 5];

export const hhmm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
export const ahoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const dinero = (n) => `$${n.toLocaleString('es-MX')}`;

// Horarios para recoger con cupo (ocupación de ejemplo, fija por día).
export function horarios(dia, pedidos = []) {
  const { desde, hasta, cada, cupo } = NEGOCIO.recoger;
  const semilla = deISO(dia).getDate();
  const out = [];
  for (let m = desde; m <= hasta; m += cada) {
    const pico = Math.max(0, 1 - Math.abs(m - 13.75 * 60) / 110);   // la 1:30-2 pm se llena
    const base = Math.round(cupo * (0.25 + 0.7 * pico) + ((semilla * 7 + m) % 4));
    const mios = pedidos.filter((p) => p.dia === dia && p.hora === m && p.estado !== 'cancelado').length;
    const usados = Math.min(cupo, base + mios);
    const pasado = dia === hoyISO() && m - NEGOCIO.aviso < ahoraMin();
    out.push({ m, libres: cupo - usados, lleno: usados >= cupo, pasado });
  }
  return out;
}

// ── pedidos ─────────────────────────────────────────────────────────────────
// estados: programado → cocina → listo → recogido
// recoger:   programado → cocina → listo (casilla) → recogido
// domicilio: programado → cocina → camino → entregado
export const ESTADOS = {
  programado: { txt: 'Programado', paso: 0 },
  cocina: { txt: 'En cocina', paso: 1 },
  listo: { txt: 'En tu casilla', paso: 2 },
  camino: { txt: 'En camino', paso: 2 },
  recogido: { txt: 'Recogido', paso: 3 },
  entregado: { txt: 'Entregado', paso: 3 },
  cancelado: { txt: 'Cancelado', paso: -1 },
};
export const PASOS = {
  recoger: ['Programado', 'En cocina', 'En tu casilla'],
  domicilio: ['Programado', 'En cocina', 'En camino'],
};
export const terminado = (p) => ['recogido', 'entregado', 'cancelado'].includes(p.estado);

export function totalLinea(l) {
  const p = platillo(l.id);
  const ex = (l.extras || []).reduce((s, e) => s + (EXTRAS.find((x) => x.id === e)?.precio || 0), 0);
  return (p.precio + ex) * (l.cant || 1);
}
export const totalPedido = (p) => Math.max(0, Math.round(p.lineas.reduce((s, l) => s + totalLinea(l), 0) * (1 - (p.descuento || 0))) - (p.rebaja || 0)) + (p.envio || 0);

// `n` = cuántos pedidos hay ya (el folio sigue la cuenta aunque se recargue).
export function nuevoPedido({ dia, hora, lineas, plan = null, descuento = 0, n = 0, modo = 'recoger', envio = 0 }) {
  const folio = 1041 + n;
  const casilla = String(((folio * 7) % 12) + 1).padStart(2, '0');
  return { id: `BB-${folio}-${Math.random().toString(36).slice(2, 5)}`, folio: `BB-${folio}`, dia, hora, lineas, plan, descuento, casilla, modo, envio, estado: 'programado', creado: Date.now() };
}

// Estado guardado. Se siembra con un pedido de ayer (para "Repetir") y nada
// pendiente: lo bonito es que la prospecta programe el suyo.
export function sembrar() {
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  while (ayer.getDay() === 0 || ayer.getDay() === 6) ayer.setDate(ayer.getDate() - 1);   // el último día hábil (no abre fines de semana)
  const p = nuevoPedido({ dia: iso(ayer), hora: 13 * 60, lineas: [{ id: 'pollo-limon', quitar: ['Brócoli'], extras: ['agua'], cant: 1 }] });
  p.estado = 'recogido';
  return { dia: hoyISO(), pedidos: [p], plan: null, puntos: 340, carrito: [], cupones: [] };
}
// `clave`: la app del recorrido de la Expo guarda APARTE (sufijo _expo) para no pisar la de "Pruébala tú".
export function leer(clave = CLAVE) {
  try {
    const e = JSON.parse(localStorage.getItem(clave));
    if (e && e.dia === hoyISO()) return e;
  } catch { /* sin almacenamiento: se siembra */ }
  return sembrar();
}
export const PERFIL_VACIO = { listo: false, nombre: '', correo: '', telefono: '', objetivo: 'Comer más sano', evita: [], modo: 'recoger', direccion: DIRECCION_DEMO, avisos: false, miembro: false, desde: null };
export function leerPerfil(clave = CLAVE_PERFIL) {
  try { return { ...PERFIL_VACIO, ...JSON.parse(localStorage.getItem(clave)) }; } catch { return { ...PERFIL_VACIO }; }
}
export function guardarPerfil(p, clave = CLAVE_PERFIL) {
  try { localStorage.setItem(clave, JSON.stringify(p)); } catch { /* modo privado */ }
}
export function guardar(e, clave = CLAVE) {
  try { localStorage.setItem(clave, JSON.stringify(e)); } catch { /* modo privado */ }
}
