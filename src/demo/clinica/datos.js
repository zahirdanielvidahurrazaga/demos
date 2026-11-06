import { useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE CLÍNICA — datos y lógica (sin base de datos) · 29-oct-2026
//
// Clínica genérica "Raíz · clínica integral" (Puebla) con tres especialidades:
// nutrición (la protagonista: plan interactivo, comer fuera, súper con
// presupuesto, check-in, radar y copiloto), medicina general (signos, nota y
// receta) y odontología (odontograma, plan de tratamiento y abonos).
// Roles: Paciente (Sofía), Recepción, Doctor (los tres) y Dueño.
//
// Igual que Florería y POS: todo vive en localStorage, las pestañas se ven en
// vivo por el evento `storage` y solo la pestaña líder simula a los demás.
// La "IA" es simulada con reglas: en la demo no se llama a ningún modelo.
// ─────────────────────────────────────────────────────────────────────────────

export const NEGOCIO = {
  nombre: 'Raíz',
  completo: 'Raíz · clínica integral',
  lema: 'clínica integral',
  direccion: 'Calle 25 Sur 3302, Huexotitla, Puebla',
  telefono: '222 409 2716',
  whatsapp: '222 409 2716',
  anticipo: 200,          // lo que se paga al agendar en línea
};

const DIA = 86400000;
const MIN = 60000;
export const inicioDia = (d = 0) => { const h = new Date(); h.setHours(0, 0, 0, 0); return h.getTime() + d * DIA; };
export const horaDe = (t) => new Date(t).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
export const fechaCorta = (t) => new Date(t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
export const fechaLarga = (t = Date.now()) => new Date(t).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
export const diaSemana = (t) => new Date(t).toLocaleDateString('es-MX', { weekday: 'long' });
export const peso = (n) => `$${Math.round(n || 0).toLocaleString('es-MX')}`;
export const r1 = (n) => Math.round(n * 10) / 10;
export const diasEntre = (a, b = Date.now()) => Math.round((inicioDiaDe(b) - inicioDiaDe(a)) / DIA);
export const inicioDiaDe = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export function cuandoTexto(t) {
  const d = Math.round((inicioDiaDe(t) - inicioDia(0)) / DIA);
  const dia = d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : d === -1 ? 'Ayer' : new Date(t).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${horaDe(t)}`;
}

// ── especialidades, doctores y servicios ────────────────────────────────────
export const ESPECIALIDADES = [
  { id: 'nut', nombre: 'Nutrición', corto: 'Nutrición', color: '#2F7D5B', suave: '#E3F1E9' },
  { id: 'med', nombre: 'Medicina general', corto: 'Médico', color: '#2F62A8', suave: '#E3ECF8' },
  { id: 'den', nombre: 'Odontología', corto: 'Dentista', color: '#7A4FB0', suave: '#EFE7F8' },
];
export const especialidad = (id) => ESPECIALIDADES.find((x) => x.id === id);

export const DOCTORES = [
  { id: 'andrea', esp: 'nut', nombre: 'Nut. Andrea Solís', corto: 'Andrea', titulo: 'Nutrióloga clínica y deportiva', cedula: '10458231', consultorio: 'Consultorio 1', iniciales: 'AS' },
  { id: 'emilio', esp: 'med', nombre: 'Dr. Emilio Navarro', corto: 'Dr. Navarro', titulo: 'Médico general', cedula: '8823140', consultorio: 'Consultorio 2', iniciales: 'EN' },
  { id: 'paula', esp: 'den', nombre: 'Dra. Paula Ríos', corto: 'Dra. Ríos', titulo: 'Cirujana dentista', cedula: '9910347', consultorio: 'Consultorio 3 · dental', iniciales: 'PR' },
];
export const doctor = (id) => DOCTORES.find((x) => x.id === id);
export const doctorDe = (esp) => DOCTORES.find((x) => x.esp === esp);

export const SERVICIOS = [
  { id: 'nut-1', esp: 'nut', nombre: 'Primera consulta de nutrición', min: 60, precio: 850, nota: 'Historia clínica, medición de composición corporal y tu plan' },
  { id: 'nut-s', esp: 'nut', nombre: 'Consulta de seguimiento', min: 45, precio: 650, nota: 'Medición, revisión de avances y ajuste del plan' },
  { id: 'nut-v', esp: 'nut', nombre: 'Seguimiento en línea', min: 30, precio: 550, nota: 'Por videollamada, desde donde estés', virtual: true },
  { id: 'med-c', esp: 'med', nombre: 'Consulta médica', min: 30, precio: 600, nota: 'Valoración, diagnóstico y receta' },
  { id: 'med-e', esp: 'med', nombre: 'Revisión de estudios', min: 20, precio: 400, nota: 'Interpretación de análisis de laboratorio' },
  { id: 'med-k', esp: 'med', nombre: 'Certificado médico', min: 20, precio: 350, nota: 'Escolar, laboral o deportivo' },
  { id: 'den-v', esp: 'den', nombre: 'Valoración dental', min: 30, precio: 400, nota: 'Revisión, odontograma y presupuesto' },
  { id: 'den-l', esp: 'den', nombre: 'Limpieza dental', min: 45, precio: 850, nota: 'Profilaxis con ultrasonido y pulido' },
  { id: 'den-t', esp: 'den', nombre: 'Cita de tratamiento', min: 60, precio: 0, nota: 'Continúa tu plan de tratamiento (se cobra por procedimiento)' },
];
export const servicio = (id) => SERVICIOS.find((x) => x.id === id);

export const PAQUETES = [
  { id: 'p4', nombre: 'Paquete 4 consultas', consultas: 4, precio: 2300, ahorro: 300 },
  { id: 'p8', nombre: 'Paquete 8 consultas', consultas: 8, precio: 4400, ahorro: 800 },
  { id: 'mem', nombre: 'Membresía de acompañamiento', consultas: 2, precio: 1290, ahorro: 0, mensual: true, nota: '2 consultas al mes + ajustes del plan por chat' },
];

// horario: lunes a viernes 9–14 y 16–19; sábado 9–14
export function bloquesDelDia(dia) {
  const dow = new Date(dia).getDay();
  if (dow === 0) return [];
  return dow === 6 ? [[9, 14]] : [[9, 14], [16, 19]];
}
// espacios libres de un doctor un día, cada `paso` minutos
export function espacios(e, docId, dia, min = 45, paso = 15) {
  const ocupadas = e.citas.filter((c) => c.doc === docId && c.estado !== 'cancelada' && inicioDiaDe(c.inicio) === dia);
  const libres = [];
  bloquesDelDia(dia).forEach(([a, b]) => {
    for (let t = dia + a * 3600000; t + min * MIN <= dia + b * 3600000; t += paso * MIN) {
      if (t < Date.now() + 30 * MIN) continue;
      const choca = ocupadas.some((c) => t < c.inicio + c.min * MIN && c.inicio < t + min * MIN);
      if (!choca) libres.push(t);
    }
  });
  return libres;
}

// ── alimentos y recetas (plan de nutrición) ─────────────────────────────────
export const TIEMPOS = [
  { id: 'des', nombre: 'Desayuno', hora: '8:00' },
  { id: 'col1', nombre: 'Colación', hora: '11:00' },
  { id: 'com', nombre: 'Comida', hora: '14:30' },
  { id: 'col2', nombre: 'Colación', hora: '17:30' },
  { id: 'cen', nombre: 'Cena', hora: '20:30' },
];
export const tiempo = (id) => TIEMPOS.find((x) => x.id === id);
export const PASILLOS = ['Frutas y verduras', 'Carnes y pescados', 'Huevo y lácteos', 'Abarrotes', 'Tortillería y panadería'];

// ingrediente: [nombre, cantidad, unidad, pasillo, precio estimado de esa cantidad]
const I = (n, c, u, p, $) => ({ n, c, u, p, $ });
export const RECETAS = [
  { id: 'huevo-nopal', nombre: 'Huevos a la mexicana con nopales', tiempos: ['des'], kcal: 390, p: 24, min: 15, color: '#E9B44C', tags: ['rápida'],
    ing: [I('Huevo', 2, 'pza', 'Huevo y lácteos', 8), I('Nopal', 1, 'taza', 'Frutas y verduras', 6), I('Jitomate', 0.5, 'pza', 'Frutas y verduras', 3), I('Tortilla de maíz', 2, 'pza', 'Tortillería y panadería', 3), I('Aguacate', 0.25, 'pza', 'Frutas y verduras', 6)],
    pasos: ['Asa los nopales en comal y córtalos en tiras.', 'Sofríe jitomate, cebolla y chile con una cucharadita de aceite.', 'Agrega el huevo y los nopales; mueve hasta que cuaje.', 'Sirve con 2 tortillas y aguacate.'] },
  { id: 'avena-manzana', nombre: 'Avena con manzana y canela (con bebida de almendra)', tiempos: ['des'], kcal: 360, p: 14, min: 10, color: '#C98B5B', tags: ['rápida', 'económica', 'sin lactosa'],
    ing: [I('Avena', 0.5, 'taza', 'Abarrotes', 4), I('Bebida de almendra', 1, 'taza', 'Huevo y lácteos', 9), I('Manzana', 1, 'pza', 'Frutas y verduras', 7), I('Nuez', 10, 'g', 'Abarrotes', 6)],
    pasos: ['Cuece la avena con la bebida de almendra 5 minutos.', 'Agrega manzana picada y canela.', 'Termina con la nuez picada.'] },
  { id: 'chilaquiles', nombre: 'Chilaquiles horneados con pollo', tiempos: ['des', 'com'], kcal: 430, p: 28, min: 25, color: '#C44536', tags: ['fin de semana'],
    ing: [I('Tortilla de maíz', 4, 'pza', 'Tortillería y panadería', 6), I('Pechuga de pollo', 80, 'g', 'Carnes y pescados', 14), I('Salsa verde', 0.5, 'taza', 'Frutas y verduras', 6), I('Cebolla', 0.25, 'pza', 'Frutas y verduras', 2), I('Aguacate', 0.25, 'pza', 'Frutas y verduras', 6)],
    pasos: ['Corta las tortillas y hornéalas hasta que doren (sin freír).', 'Calienta la salsa verde y mezcla los totopos.', 'Sirve con pollo deshebrado, cebolla y aguacate.'] },
  { id: 'molletes', nombre: 'Molletes integrales con frijol y pico de gallo', tiempos: ['des'], kcal: 380, p: 17, min: 12, color: '#8C5A3C', tags: ['económica'],
    ing: [I('Pan integral', 2, 'reb', 'Tortillería y panadería', 6), I('Frijoles', 0.5, 'taza', 'Abarrotes', 5), I('Jitomate', 1, 'pza', 'Frutas y verduras', 5), I('Queso panela sin lactosa', 30, 'g', 'Huevo y lácteos', 9)],
    pasos: ['Unta los frijoles en el pan.', 'Agrega el queso y gratina 5 minutos.', 'Sirve con pico de gallo.'] },
  { id: 'yogurt-fruta', nombre: 'Yogurt de coco con fresas y chía', tiempos: ['col1', 'col2'], kcal: 160, p: 5, min: 2, color: '#E06C8A', tags: ['sin cocinar', 'para llevar', 'sin lactosa'],
    ing: [I('Yogurt de coco', 0.5, 'taza', 'Huevo y lácteos', 14), I('Fresas', 0.5, 'taza', 'Frutas y verduras', 8), I('Chía', 1, 'cda', 'Abarrotes', 3)],
    pasos: ['Sirve el yogurt, agrega las fresas y la chía.'] },
  { id: 'jicama', nombre: 'Jícama, pepino y pepitas con limón', tiempos: ['col1', 'col2'], kcal: 140, p: 6, min: 5, color: '#9CBF5A', tags: ['sin cocinar', 'para llevar', 'económica'],
    ing: [I('Jícama', 1, 'taza', 'Frutas y verduras', 6), I('Pepino', 1, 'pza', 'Frutas y verduras', 4), I('Pepitas', 15, 'g', 'Abarrotes', 5)],
    pasos: ['Corta en bastones, agrega limón, chile en polvo y las pepitas.'] },
  { id: 'manzana-crema', nombre: 'Manzana con crema de cacahuate', tiempos: ['col1', 'col2'], kcal: 180, p: 5, min: 2, color: '#D2643B', tags: ['sin cocinar', 'para llevar', 'económica'],
    ing: [I('Manzana', 1, 'pza', 'Frutas y verduras', 7), I('Crema de cacahuate', 1, 'cda', 'Abarrotes', 5)],
    pasos: ['Rebana la manzana y acompaña con la crema de cacahuate.'] },
  { id: 'pollo-verduras', nombre: 'Pollo a la plancha con verduras y arroz integral', tiempos: ['com', 'cen'], kcal: 520, p: 38, min: 30, color: '#D99A2B', tags: ['preparar el domingo'],
    ing: [I('Pechuga de pollo', 140, 'g', 'Carnes y pescados', 24), I('Calabacita', 1, 'pza', 'Frutas y verduras', 4), I('Zanahoria', 1, 'pza', 'Frutas y verduras', 3), I('Arroz integral', 0.5, 'taza', 'Abarrotes', 4), I('Aceite de oliva', 1, 'cdita', 'Abarrotes', 2)],
    pasos: ['Sazona el pollo con limón, ajo y pimienta; ásalo 6 min por lado.', 'Saltea las verduras con una cucharadita de aceite.', 'Sirve con media taza de arroz integral.'] },
  { id: 'tinga', nombre: 'Tostadas horneadas de tinga de pollo', tiempos: ['com', 'cen'], kcal: 480, p: 32, min: 25, color: '#B5492F', tags: ['mexicana'],
    ing: [I('Pechuga de pollo', 110, 'g', 'Carnes y pescados', 19), I('Jitomate', 2, 'pza', 'Frutas y verduras', 10), I('Chipotle', 1, 'pza', 'Abarrotes', 2), I('Tostadas horneadas', 3, 'pza', 'Tortillería y panadería', 6), I('Lechuga', 1, 'taza', 'Frutas y verduras', 4)],
    pasos: ['Cuece y deshebra el pollo.', 'Licua jitomate con chipotle, guisa con cebolla y agrega el pollo.', 'Sirve sobre tostadas horneadas con lechuga.'] },
  { id: 'pescado', nombre: 'Filete de pescado al ajillo con ensalada', tiempos: ['com', 'cen'], kcal: 450, p: 36, min: 20, color: '#4E8FB5', tags: ['rápida'],
    ing: [I('Filete de tilapia', 150, 'g', 'Carnes y pescados', 30), I('Ajo', 2, 'dientes', 'Frutas y verduras', 2), I('Lechuga', 2, 'taza', 'Frutas y verduras', 8), I('Jitomate', 1, 'pza', 'Frutas y verduras', 5), I('Papa', 1, 'pza', 'Frutas y verduras', 4)],
    pasos: ['Dora el ajo en una cucharadita de aceite.', 'Cocina el pescado 3 min por lado.', 'Sirve con ensalada y una papa cocida.'] },
  { id: 'lentejas', nombre: 'Lentejas guisadas con verduras', tiempos: ['com'], kcal: 470, p: 24, min: 35, color: '#9A6B3E', tags: ['económica', 'preparar el domingo'],
    ing: [I('Lentejas', 0.75, 'taza', 'Abarrotes', 9), I('Zanahoria', 1, 'pza', 'Frutas y verduras', 3), I('Calabacita', 1, 'pza', 'Frutas y verduras', 4), I('Jitomate', 1, 'pza', 'Frutas y verduras', 5), I('Tortilla de maíz', 2, 'pza', 'Tortillería y panadería', 3)],
    pasos: ['Cuece las lentejas con ajo y cebolla.', 'Agrega jitomate licuado y las verduras en cubos.', 'Deja 10 minutos más y sirve con 2 tortillas.'] },
  { id: 'bowl-atun', nombre: 'Bowl de atún, arroz y pepino', tiempos: ['com', 'cen'], kcal: 440, p: 33, min: 10, color: '#5C8C7A', tags: ['rápida', 'para llevar', 'económica'],
    ing: [I('Atún en agua', 1, 'lata', 'Abarrotes', 18), I('Arroz integral', 0.5, 'taza', 'Abarrotes', 4), I('Pepino', 1, 'pza', 'Frutas y verduras', 4), I('Aguacate', 0.25, 'pza', 'Frutas y verduras', 6)],
    pasos: ['Mezcla el atún escurrido con limón.', 'Sirve sobre arroz con pepino y aguacate.'] },
  { id: 'sopa-verduras', nombre: 'Crema de calabacita (sin lácteos) y quesadilla', tiempos: ['cen'], kcal: 380, p: 18, min: 20, color: '#8FB84E', tags: ['sin lactosa'],
    ing: [I('Calabacita', 2, 'pza', 'Frutas y verduras', 8), I('Caldo de pollo', 1, 'taza', 'Abarrotes', 5), I('Tortilla de maíz', 2, 'pza', 'Tortillería y panadería', 3), I('Queso panela sin lactosa', 40, 'g', 'Huevo y lácteos', 12)],
    pasos: ['Cuece la calabacita en el caldo y lícuala.', 'Calienta la quesadilla en comal sin aceite.'] },
  { id: 'tacos-lechuga', nombre: 'Tacos de lechuga con carne molida y pico', tiempos: ['cen'], kcal: 360, p: 30, min: 15, color: '#6E9E3A', tags: ['rápida', 'bajo en carbohidratos'],
    ing: [I('Carne molida de res 90/10', 110, 'g', 'Carnes y pescados', 20), I('Lechuga orejona', 6, 'hojas', 'Frutas y verduras', 6), I('Jitomate', 1, 'pza', 'Frutas y verduras', 5), I('Aguacate', 0.25, 'pza', 'Frutas y verduras', 6)],
    pasos: ['Guisa la carne con cebolla y especias.', 'Sirve en hojas de lechuga con pico de gallo y aguacate.'] },
  { id: 'licuado', nombre: 'Licuado de plátano, avena y proteína', tiempos: ['des', 'col2'], kcal: 310, p: 26, min: 3, color: '#E8C15A', tags: ['rápida', 'para llevar', 'sin lactosa'],
    ing: [I('Plátano', 1, 'pza', 'Frutas y verduras', 3), I('Avena', 0.25, 'taza', 'Abarrotes', 2), I('Proteína vegetal', 1, 'scoop', 'Abarrotes', 14), I('Bebida de almendra', 1, 'taza', 'Huevo y lácteos', 9)],
    pasos: ['Licua todo con hielo.'] },
];
export const receta = (id) => RECETAS.find((x) => x.id === id);

// ── comer fuera: restaurantes y cómo leer un menú ───────────────────────────
// La "IA" de la demo: clasifica platillos con reglas sencillas sobre el plan
// de la paciente (sin lactosa, bajar grasa). En el sistema real lo haría un
// modelo de lenguaje con las indicaciones que aprobó la nutrióloga.
export const LUGARES = [
  { id: 'tacos', nombre: 'Taquería', platillos: ['Tacos de bistec en tortilla de maíz', 'Tacos al pastor', 'Gringas de pastor', 'Tacos de suadero', 'Quesadilla de queso', 'Cebollitas asadas', 'Frijoles charros'] },
  { id: 'fonda', nombre: 'Fonda / comida corrida', platillos: ['Caldo de pollo con verduras', 'Arroz rojo', 'Milanesa empanizada con papas', 'Pollo en mole', 'Pechuga asada con ensalada', 'Agua de jamaica', 'Flan'] },
  { id: 'mariscos', nombre: 'Mariscos', platillos: ['Ceviche de pescado', 'Coctel de camarón', 'Filete empanizado', 'Pescado a la talla', 'Camarones al mojo de ajo', 'Tostada de atún', 'Chilpachole'] },
  { id: 'italiana', nombre: 'Italiana', platillos: ['Ensalada caprese', 'Fettuccine Alfredo', 'Pasta pomodoro', 'Pizza margarita', 'Pollo a la parrilla con vegetales', 'Lasaña', 'Minestrone'] },
  { id: 'sushi', nombre: 'Sushi', platillos: ['Sashimi de salmón', 'Rollo empanizado con queso crema', 'Rollo California', 'Sopa miso', 'Yakimeshi', 'Ensalada de pepino con ajonjolí', 'Teriyaki de pollo'] },
  { id: 'cafe', nombre: 'Cafetería', platillos: ['Americano', 'Latte con leche entera', 'Latte con bebida de almendra', 'Chilaquiles con crema y queso', 'Omelette de claras con espinaca', 'Panqué de elote', 'Bowl de fruta'] },
];
const REGLAS = [
  { re: /empaniz|capeado|frit|gringa|alfredo|crema|queso crema|lasaña|pizza|flan|panqu|pastel|charros|suadero/i, nivel: 'evitar' },
  { re: /queso|latte con leche|leche entera|crema|quesadilla|caprese/i, nivel: 'lactosa' },
  { re: /arroz|yakimeshi|pasta|pan|mole|pastor|teriyaki|rollo|tostada/i, nivel: 'moderado' },
  { re: /asad|plancha|parrilla|talla|ceviche|sashimi|caldo|sopa|ensalada|minestrone|coctel|mojo|bistec|claras|fruta|americano|almendra|jamaica|cebollitas|chilpachole|pescado|pollo/i, nivel: 'si' },
];
export function evaluarPlatillo(nombre) {
  const n = nombre.trim();
  if (!n) return null;
  const nivel = (REGLAS.find((r) => r.re.test(n)) || { nivel: 'moderado' }).nivel;
  const POR = {
    si: { nivel: 'si', texto: 'Va con tu plan', ajuste: /tortilla|taco|bistec/i.test(n) ? 'Hasta 3 tacos, sin queso; agrega cebollitas o nopales.' : 'Pide la porción normal; aderezos y salsas aparte.' },
    moderado: { nivel: 'moderado', texto: 'Con ajustes', ajuste: 'Media porción del arroz, pasta o pan y acompaña con verduras o ensalada.' },
    lactosa: { nivel: 'lactosa', texto: 'Ojo: lleva lácteos', ajuste: 'Tienes intolerancia a la lactosa: pídelo sin queso o crema, o con bebida vegetal.' },
    evitar: { nivel: 'evitar', texto: 'Mejor otra opción', ajuste: 'Es frito, empanizado o muy cremoso. Si se antoja, compártelo y pide algo asado para ti.' },
  };
  return { nombre: n, ...POR[nivel] };
}

// ── odontograma ─────────────────────────────────────────────────────────────
export const DIENTES = {
  arriba: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  abajo: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
};
export const ESTADOS_DIENTE = [
  { id: 'sano', nombre: 'Sano', color: '#FFFFFF' },
  { id: 'caries', nombre: 'Caries', color: '#E5484D' },
  { id: 'resina', nombre: 'Resina', color: '#3E8BD9' },
  { id: 'endo', nombre: 'Endodoncia', color: '#F0A33B' },
  { id: 'corona', nombre: 'Corona', color: '#C9A227' },
  { id: 'extraer', nombre: 'Por extraer', color: '#8E2F2F' },
  { id: 'ausente', nombre: 'Ausente', color: '#D7D2CB' },
];
export const estadoDiente = (id) => ESTADOS_DIENTE.find((x) => x.id === id) || ESTADOS_DIENTE[0];
export const PROCEDIMIENTOS = [
  { id: 'resina', nombre: 'Resina', precio: 1100, deja: 'resina', para: ['caries'] },
  { id: 'endo', nombre: 'Endodoncia', precio: 4800, deja: 'endo', para: ['caries'] },
  { id: 'corona', nombre: 'Corona de zirconia', precio: 6500, deja: 'corona', para: ['endo', 'caries'] },
  { id: 'extraccion', nombre: 'Extracción', precio: 1200, deja: 'ausente', para: ['extraer'] },
  { id: 'limpieza', nombre: 'Limpieza dental', precio: 850, deja: null, para: [] },
];
export const procedimiento = (id) => PROCEDIMIENTOS.find((x) => x.id === id);

// ── medicina general ────────────────────────────────────────────────────────
export const DIAGNOSTICOS = [
  ['J00', 'Rinofaringitis aguda (resfriado común)'], ['J02.9', 'Faringitis aguda'], ['K29.7', 'Gastritis'],
  ['E66.9', 'Obesidad'], ['E78.5', 'Dislipidemia'], ['I10', 'Hipertensión arterial'], ['E11.9', 'Diabetes tipo 2'],
  ['R51', 'Cefalea'], ['N39.0', 'Infección de vías urinarias'], ['Z00.0', 'Revisión general de salud'],
];
export const MEDICAMENTOS = [
  'Paracetamol 500 mg tabletas', 'Ibuprofeno 400 mg tabletas', 'Loratadina 10 mg tabletas', 'Omeprazol 20 mg cápsulas',
  'Amoxicilina 500 mg cápsulas', 'Metformina 850 mg tabletas', 'Losartán 50 mg tabletas', 'Butilhioscina 10 mg grageas',
];

// ── utilidades del azar ─────────────────────────────────────────────────────
const azar = (a) => a[Math.floor(Math.random() * a.length)];
const entre = (a, b) => a + Math.random() * (b - a);
export const id = () => Math.random().toString(36).slice(2, 10);
const NOMBRES = ['Mariana López', 'Jorge Castillo', 'Daniela Ruiz', 'Ricardo Salas', 'Fernanda Ortiz', 'Luis Hernández', 'Paola Méndez', 'Héctor Morales', 'Valeria Cruz', 'Emilio Torres', 'Andrea Vega', 'Raúl Pineda', 'Camila Rosas', 'Diego Aguilar', 'Lucía Romero', 'Sergio Lara', 'Natalia Flores', 'Manuel Ibarra', 'Regina Soto', 'Alejandro Ponce', 'Ximena Duarte', 'Óscar Medina', 'Carolina Ríos', 'Javier Bautista', 'Renata Campos', 'Arturo Zamora', 'Montserrat Gil', 'Iván Cabrera', 'Pamela Núñez', 'Gerardo Vidal', 'Elena Paredes', 'Tomás Serrano', 'Ana Paula Ochoa', 'Mauricio León', 'Itzel Robles', 'Rodrigo Fuentes', 'Brenda Quiroz', 'Hugo Esquivel', 'Diana Carrillo', 'Pablo Treviño'];

// ── sembrar ─────────────────────────────────────────────────────────────────
// Sofía Martínez es la paciente de la demo: lleva 10 semanas en nutrición,
// fue al médico hace 3 semanas y tiene un tratamiento dental a medias.
export const SOFIA = 'sofia';

function planSemana() {
  // día de la semana (0 = domingo) → receta por tiempo
  const D = [
    { des: 'chilaquiles', col1: 'jicama', com: 'lentejas', col2: 'yogurt-fruta', cen: 'tacos-lechuga' },
    { des: 'huevo-nopal', col1: 'yogurt-fruta', com: 'pollo-verduras', col2: 'manzana-crema', cen: 'sopa-verduras' },
    { des: 'avena-manzana', col1: 'jicama', com: 'tinga', col2: 'yogurt-fruta', cen: 'tacos-lechuga' },
    { des: 'huevo-nopal', col1: 'manzana-crema', com: 'pescado', col2: 'jicama', cen: 'sopa-verduras' },
    { des: 'molletes', col1: 'yogurt-fruta', com: 'pollo-verduras', col2: 'manzana-crema', cen: 'tacos-lechuga' },
    { des: 'avena-manzana', col1: 'jicama', com: 'bowl-atun', col2: 'licuado', cen: 'sopa-verduras' },
    { des: 'licuado', col1: 'manzana-crema', com: 'tinga', col2: 'jicama', cen: 'tacos-lechuga' },
  ];
  // alternativas que autorizó la nutrióloga (equivalentes) por tiempo
  const alternativas = {
    des: ['huevo-nopal', 'avena-manzana', 'molletes', 'licuado', 'chilaquiles'],
    col1: ['yogurt-fruta', 'jicama', 'manzana-crema'],
    com: ['pollo-verduras', 'tinga', 'pescado', 'lentejas', 'bowl-atun'],
    col2: ['yogurt-fruta', 'jicama', 'manzana-crema', 'licuado'],
    cen: ['tacos-lechuga', 'sopa-verduras', 'bowl-atun', 'pescado'],
  };
  return { semana: D, alternativas };
}

function sembrar() {
  const ahora = Date.now();
  const e = {
    v: 1, dia: inicioDia(0),
    pacientes: [], citas: [], espera: [], avisos: [], pagos: [], notas: [],
    folios: { cita: 3200, receta: 880, recibo: 5100 },
  };

  // pacientes
  e.pacientes.push({
    id: SOFIA, nombre: 'Sofía Martínez', tel: '222 318 4420', correo: 'sofia.mtz@gmail.com', nacimiento: '1994-03-12', sexo: 'F',
    alta: ahora - 74 * DIA, esp: ['nut', 'med', 'den'], paquete: { id: 'p8', usadas: 5, total: 8 },
    antecedentes: { alergias: ['Intolerancia a la lactosa'], enfermedades: ['Resistencia a la insulina (en control)'], medicamentos: ['Metformina 850 mg (1 al día)'], cirugias: [], familiares: 'Madre con diabetes tipo 2', estilo: 'Trabajo de oficina, entrena pilates 2 veces por semana' },
  });
  NOMBRES.forEach((n, i) => {
    const esp = i % 7 === 0 ? ['nut', 'den'] : [ESPECIALIDADES[i % 3].id];
    e.pacientes.push({
      id: `p${i}`, nombre: n, tel: `222 ${String(300 + i * 7).padStart(3, '0')} ${String(1000 + i * 113).slice(-4)}`, correo: `${n.split(' ')[0].toLowerCase()}@correo.com`,
      alta: ahora - Math.round(entre(5, 400)) * DIA, esp, nuevo: i > 33,
      // estado de seguimiento para el radar de la nutrióloga
      seg: esp.includes('nut') ? { adherencia: Math.round(entre(35, 95)), sinRegistro: Math.round(entre(0, 12)), animo: Math.round(entre(2, 5)), peso: r1(entre(-6, 1)) } : null,
    });
  });

  // citas: 60 días atrás (para comparar mes contra mes) y 14 adelante
  const pacDe = (esp) => e.pacientes.filter((p) => p.id !== SOFIA && p.esp.includes(esp));
  for (let d = -60; d <= 14; d += 1) {
    const dia = inicioDia(d);
    bloquesDelDia(dia).forEach(([a, b]) => {
      DOCTORES.forEach((doc) => {
        let t = dia + a * 3600000;
        const fin = dia + b * 3600000;
        while (t < fin) {
          const opciones = SERVICIOS.filter((s) => s.esp === doc.esp && (doc.esp !== 'nut' || !s.virtual || Math.random() < 0.3));
          const sv = doc.esp === 'nut' ? (Math.random() < 0.2 ? opciones[0] : azar(opciones.slice(1))) : doc.esp === 'den' ? azar(opciones) : (Math.random() < 0.75 ? opciones[0] : azar(opciones));
          if (t + sv.min * MIN > fin) break;
          const lleno = d < 0 ? 0.74 : d === 0 ? 0.8 : Math.max(0.2, 0.72 - d * 0.04);
          if (Math.random() < lleno) {
            const p = azar(pacDe(doc.esp));
            const fut = t > ahora;
            let estado = 'atendida';
            if (fut) estado = d <= 2 && Math.random() < 0.55 ? 'confirmada' : 'agendada';
            else {
              const x = Math.random();
              estado = x < 0.07 ? 'no-asistio' : x < 0.12 ? 'cancelada' : 'atendida';
            }
            const precio = sv.precio || azar([1100, 1100, 1100, 1200, 850, 850, 4800]);
            e.citas.push({
              id: id(), folio: (e.folios.cita += 1), pac: p.id, doc: doc.id, serv: sv.id, inicio: t, min: sv.min, estado,
              origen: Math.random() < 0.45 ? 'web' : Math.random() < 0.6 ? 'whatsapp' : 'recepcion',
              precio, pagado: estado === 'atendida' ? precio : 0, anticipo: 0, metodo: estado === 'atendida' ? azar(['efectivo', 'tarjeta', 'tarjeta', 'transferencia']) : null,
            });
          }
          t += (sv.min + (Math.random() < 0.3 ? 15 : 0)) * MIN;
        }
      });
    });
  }
  // algunas del mes ya se habían recuperado de la lista de espera
  e.citas.filter((c) => c.estado === 'atendida' && c.inicio > ahora - 28 * DIA && c.doc !== 'emilio').slice(0, 40).filter((_, i) => i % 9 === 0)
    .forEach((c) => { c.origen = 'espera'; c.recuperada = true; });
  // hoy: lo que ya pasó, atendido; lo que viene pronto, con algunos ya en sala
  e.citas.filter((c) => inicioDiaDe(c.inicio) === inicioDia(0)).forEach((c) => {
    if (c.inicio + c.min * MIN < ahora) { c.estado = Math.random() < 0.92 ? 'atendida' : 'no-asistio'; c.pagado = c.estado === 'atendida' ? c.precio : 0; c.metodo = c.pagado ? azar(['efectivo', 'tarjeta']) : null; }
    else if (c.inicio <= ahora) { c.estado = 'en-consulta'; c.llego = c.inicio - 6 * MIN; c.pagado = c.precio; c.metodo = 'tarjeta'; }
    else if (c.inicio - ahora < 25 * MIN && Math.random() < 0.6) { c.estado = 'llego'; c.llego = ahora - Math.round(entre(2, 12)) * MIN; }
    else c.estado = Math.random() < 0.7 ? 'confirmada' : 'agendada';
  });

  // Sofía: historial y próximas citas
  const sCita = (doc, serv, t, estado, extra = {}) => {
    const sv = servicio(serv);
    // quita lo que chocara en ese horario
    e.citas = e.citas.filter((c) => !(c.doc === doc && c.inicio < t + sv.min * MIN && t < c.inicio + c.min * MIN));
    const c = { id: id(), folio: (e.folios.cita += 1), pac: SOFIA, doc, serv, inicio: t, min: sv.min, estado, origen: 'web', precio: sv.precio, pagado: estado === 'atendida' ? sv.precio : 0, anticipo: 0, metodo: estado === 'atendida' ? 'paquete' : null, ...extra };
    e.citas.push(c);
    return c;
  };
  const diaHabil = (d) => { let x = d; while (bloquesDelDia(inicioDia(x)).length === 0) x += 1; return inicioDia(x); };
  [-70, -56, -42, -28, -14].forEach((d, i) => sCita('andrea', i ? 'nut-s' : 'nut-1', diaHabil(d) + 10 * 3600000, 'atendida', i ? {} : { metodo: 'tarjeta' }));
  sCita('emilio', 'med-c', diaHabil(-21) + 17 * 3600000, 'atendida', { metodo: 'tarjeta' });
  sCita('paula', 'den-v', diaHabil(-35) + 12 * 3600000, 'atendida', { metodo: 'efectivo' });
  sCita('paula', 'den-l', diaHabil(-18) + 12 * 3600000, 'atendida', { metodo: 'tarjeta', precio: 850 });
  sCita('andrea', 'nut-s', diaHabil(3) + 10 * 3600000, 'agendada', { metodo: null, anticipo: 0, paquete: true });
  sCita('paula', 'den-t', diaHabil(8) + 17 * 3600000, 'agendada', { precio: 0 });

  // lista de espera (para recuperar citas canceladas)
  e.espera = [
    { id: id(), pac: 'p3', doc: 'andrea', pref: 'mañanas', desde: ahora - 3 * DIA },
    { id: id(), pac: 'p12', doc: 'paula', pref: 'cualquier', desde: ahora - 5 * DIA },
    { id: id(), pac: 'p18', doc: 'andrea', pref: 'cualquier', desde: ahora - 1 * DIA },
  ];

  // nutrición de Sofía
  const { semana, alternativas } = planSemana();
  e.nutri = {
    objetivo: 'Bajar grasa conservando músculo y mejorar la energía de la tarde',
    kcal: 1650, macros: { p: 30, c: 40, g: 30 }, agua: 8, pasos: 8000,
    restricciones: ['Sin lactosa', 'No le gusta el hígado'], presupuesto: 700,
    semana, alternativas,
    // registro de los últimos 7 días + hoy
    registro: {}, habitos: {},
    mediciones: [74.8, 73.9, 72.9, 72.4, 71.6].map((peso_, i) => ({
      t: diaHabil([-70, -56, -42, -28, -14][i]) + 10.5 * 3600000, peso: peso_, grasa: r1(34.2 - i * 0.9 - Math.random() * 0.3), musculo: r1(26.1 + i * 0.15), cintura: r1(86 - i * 1.2), cadera: r1(104 - i * 0.6),
    })),
    estatura: 162,
    checkins: [
      { t: ahora - 15 * DIA, facilidad: 3, hambre: 3, animo: 4, dificil: 'Los fines de semana con la familia.' },
      { t: ahora - 8 * DIA, facilidad: 4, hambre: 2, animo: 4, dificil: 'Nada en especial, ya me organizo mejor.' },
    ],
    solicitudes: [],
    resumenes: [{ t: diaHabil(-14) + 11 * 3600000, texto: 'Bajaste 0.8 kg y 0.9% de grasa en dos semanas. Acordamos: preparar comidas el domingo, agregar colación a las 5:30 pm para no llegar con hambre a la cena y caminar 20 minutos después de comer.', compartido: true }],
    estudios: [{ id: 'lab1', t: ahora - 24 * DIA, nombre: 'Química sanguínea y perfil de lípidos', subio: 'paciente', valores: [['Glucosa en ayuno', '98 mg/dL', 'normal'], ['Insulina', '14 µUI/mL', 'alto'], ['Colesterol total', '192 mg/dL', 'normal'], ['Triglicéridos', '168 mg/dL', 'alto'], ['HDL', '48 mg/dL', 'normal']] }],
    favoritas: ['pollo-verduras', 'yogurt-fruta'],
    fuera: [],
  };
  for (let d = -6; d <= 0; d += 1) {
    const dia = inicioDia(d);
    const plan = semana[new Date(dia).getDay()];
    const reg = {};
    TIEMPOS.forEach((tm) => {
      const hora = Number(tm.hora.split(':')[0]) + Number(tm.hora.split(':')[1]) / 60;
      if (d === 0 && dia + hora * 3600000 > ahora) return;
      if (d === 0 && tm.id !== 'des') return;   // hoy solo el desayuno marcado
      const x = Math.random();
      reg[tm.id] = x < 0.72 ? { estado: 'hecho', receta: plan[tm.id] } : x < 0.9 ? { estado: 'cambiado', receta: azar(alternativas[tm.id]), motivo: azar(['No tuve tiempo', 'Comí fuera', 'No tenía ingredientes']) } : { estado: 'saltado' };
    });
    e.nutri.registro[dia] = reg;
    e.nutri.habitos[dia] = d === 0 ? { agua: 2, pasos: 2140, sueno: 7, energia: 4 } : { agua: Math.round(entre(5, 9)), pasos: Math.round(entre(5200, 11000)), sueno: r1(entre(5.5, 8)), energia: Math.round(entre(2, 5)) };
  }

  // médico de Sofía
  e.medico = {
    [SOFIA]: [{
      t: diaHabil(-21) + 17.4 * 3600000, doc: 'emilio', signos: { ta: '118/76', fc: 72, temp: 36.6, spo2: 98, peso: 72.6 },
      motivo: 'Cansancio por las tardes y control de resistencia a la insulina.', exploracion: 'Sin datos de alarma. Acantosis leve en cuello.',
      dx: ['E78.5'], plan: 'Continuar metformina. Estudios de control en 3 meses. Seguimiento con nutrición.',
      receta: { folio: 879, meds: [{ m: 'Metformina 850 mg tabletas', dosis: '1 tableta', frec: 'cada 24 h con la cena', dias: 90 }] },
    }],
  };

  // dental de Sofía (y de otros)
  const dientes = {};
  [...DIENTES.arriba, ...DIENTES.abajo].forEach((n) => { dientes[n] = 'sano'; });
  Object.assign(dientes, { 16: 'resina', 26: 'caries', 36: 'caries', 47: 'endo', 18: 'ausente', 28: 'ausente' });
  e.dental = {
    [SOFIA]: {
      dientes,
      plan: [
        { id: id(), diente: 26, proc: 'resina', precio: 1100, estado: 'pendiente' },
        { id: id(), diente: 36, proc: 'resina', precio: 1100, estado: 'pendiente' },
        { id: id(), diente: 47, proc: 'corona', precio: 6500, estado: 'pendiente' },
        { id: id(), diente: null, proc: 'limpieza', precio: 850, estado: 'hecho', t: diaHabil(-18) + 12.5 * 3600000 },
      ],
      abonos: [{ t: diaHabil(-35) + 12.6 * 3600000, monto: 1500, metodo: 'efectivo' }],
      notas: 'Bruxismo leve: valorar guarda nocturna.',
    },
  };

  // avisos a la paciente (centro de notificaciones)
  e.avisos = [
    { id: id(), t: ahora - 2 * 3600000, para: SOFIA, texto: 'Tu nutrióloga actualizó tus cenas de esta semana.', tipo: 'plan' },
    { id: id(), t: ahora - DIA, para: SOFIA, texto: 'Recordatorio: tu consulta de seguimiento es en 4 días.', tipo: 'cita' },
  ];
  return e;
}

// ── almacén ─────────────────────────────────────────────────────────────────
const LLAVE = 'demo_clinica_v1';
let estadoActual = null;
const oyentes = new Set();
function leerFresco() {
  try { const t = localStorage.getItem(LLAVE); if (t) { const e = JSON.parse(t); if (e.v === 1) return e; } } catch { /* sin almacenamiento */ }
  return null;
}
function guardar() { try { localStorage.setItem(LLAVE, JSON.stringify(estadoActual)); } catch { /* lleno o bloqueado */ } }
function avisar() { oyentes.forEach((f) => f()); }
function obtener() {
  if (!estadoActual) {
    estadoActual = leerFresco();
    if (!estadoActual || estadoActual.dia !== inicioDia(0)) estadoActual = sembrar();
    guardar();
  }
  return estadoActual;
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (ev) => { if (ev.key === LLAVE && ev.newValue) { try { estadoActual = JSON.parse(ev.newValue); avisar(); } catch { /* */ } } });
}
// cada cambio parte de lo que hay en localStorage AHORA (no pisa a otra pestaña)
function cambiar(fn) { const e = leerFresco() || obtener(); const copia = structuredClone(e); const r = fn(copia); estadoActual = copia; guardar(); avisar(); return r; }

export const useClinica = () => useSyncExternalStore((f) => { oyentes.add(f); return () => oyentes.delete(f); }, obtener);
export function reiniciarDemo() { estadoActual = sembrar(); guardar(); avisar(); }

const PESTANA = Math.random().toString(36).slice(2);
export function soyLider() {
  try {
    const l = JSON.parse(localStorage.getItem('demo_clinica_lider') || 'null');
    if (l && l.id !== PESTANA && Date.now() - l.t < 15000) return false;
    localStorage.setItem('demo_clinica_lider', JSON.stringify({ id: PESTANA, t: Date.now() }));
  } catch { /* esta pestaña simula sola */ }
  return true;
}

// ── consultas ───────────────────────────────────────────────────────────────
export const paciente = (e, pid) => e.pacientes.find((p) => p.id === pid);
export const citasDe = (e, pid) => e.citas.filter((c) => c.pac === pid).sort((a, b) => a.inicio - b.inicio);
export const proximaCita = (e, pid, esp) => citasDe(e, pid).find((c) => c.inicio > Date.now() - 30 * MIN && ['agendada', 'confirmada', 'llego', 'en-consulta'].includes(c.estado) && (!esp || doctor(c.doc).esp === esp));
export const delDia = (e, d = 0, docId) => e.citas.filter((c) => inicioDiaDe(c.inicio) === inicioDia(d) && (!docId || c.doc === docId)).sort((a, b) => a.inicio - b.inicio);
export const ACTIVAS = ['agendada', 'confirmada', 'llego', 'en-consulta'];
export const ESTADO_CITA = {
  agendada: { nombre: 'Por confirmar', tono: 'ambar' },
  confirmada: { nombre: 'Confirmada', tono: 'azul' },
  llego: { nombre: 'En sala', tono: 'verde' },
  'en-consulta': { nombre: 'En consulta', tono: 'morado' },
  atendida: { nombre: 'Atendida', tono: 'gris' },
  'no-asistio': { nombre: 'No asistió', tono: 'rojo' },
  cancelada: { nombre: 'Cancelada', tono: 'rojo' },
};
// plan del día para Sofía (receta por tiempo, con lo que ella cambió)
export function planDelDia(e, dia = inicioDia(0)) {
  const base = e.nutri.semana[new Date(dia).getDay()];
  const reg = e.nutri.registro[dia] || {};
  const eleg = e.nutri.elegidas?.[dia] || {};
  return TIEMPOS.map((tm) => ({ tm, base: base[tm.id], receta: reg[tm.id]?.receta || eleg[tm.id] || base[tm.id], reg: reg[tm.id] || null, elegida: !!eleg[tm.id] }));
}
export function adherencia(e, dias = 7) {
  let hechos = 0; let total = 0;
  for (let d = -(dias - 1); d <= 0; d += 1) {
    const reg = e.nutri.registro[inicioDia(d)] || {};
    Object.values(reg).forEach((r) => { total += 1; if (r.estado !== 'saltado') hechos += 1; });
  }
  return total ? Math.round((hechos / total) * 100) : 0;
}
// lista del súper: ingredientes de los próximos `dias` días, sumados por pasillo
export function listaSuper(e, dias = 7, cambios = {}) {
  const items = {};
  for (let d = 0; d < dias; d += 1) {
    const dia = inicioDia(d);
    const plan = e.nutri.semana[new Date(dia).getDay()];
    TIEMPOS.forEach((tm) => {
      const rid = cambios[`${d}-${tm.id}`] || e.nutri.registro[dia]?.[tm.id]?.receta || e.nutri.elegidas?.[dia]?.[tm.id] || plan[tm.id];
      receta(rid).ing.forEach((g) => {
        const k = `${g.n}|${g.u}`;
        const x = items[k] || (items[k] = { n: g.n, u: g.u, p: g.p, c: 0, $: 0 });
        x.c += g.c; x.$ += g.$;
      });
    });
  }
  return Object.values(items).map((x) => ({ ...x, c: r1(x.c), $: Math.round(x.$) })).sort((a, b) => PASILLOS.indexOf(a.p) - PASILLOS.indexOf(b.p) || b.$ - a.$);
}
export const costoReceta = (rid) => receta(rid).ing.reduce((n, g) => n + g.$, 0);
// para el presupuesto: cambia por la alternativa autorizada más barata hasta
// que la semana quepa (o ya no haya qué cambiar)
export function ajustarAPresupuesto(e, presupuesto, dias = 7) {
  const cambios = {};
  const total = () => listaSuper(e, dias, cambios).reduce((n, x) => n + x.$, 0);
  const antes = total();
  const candidatos = [];
  for (let d = 0; d < dias; d += 1) {
    const dia = inicioDia(d);
    const plan = Object.fromEntries(TIEMPOS.map((tm) => [tm.id, e.nutri.registro[dia]?.[tm.id]?.receta || e.nutri.elegidas?.[dia]?.[tm.id] || e.nutri.semana[new Date(dia).getDay()][tm.id]]));
    TIEMPOS.forEach((tm) => {
      if (d === 0 && e.nutri.registro[dia]?.[tm.id]) return;   // lo de hoy que ya comió no cambia
      const barata = [...e.nutri.alternativas[tm.id]].sort((a, b) => costoReceta(a) - costoReceta(b))[0];
      const ahorro = costoReceta(plan[tm.id]) - costoReceta(barata);
      if (ahorro > 0) candidatos.push({ k: `${d}-${tm.id}`, d, tm: tm.id, de: plan[tm.id], a: barata, ahorro });
    });
  }
  candidatos.sort((a, b) => b.ahorro - a.ahorro);
  const hechos = [];
  for (const c of candidatos) {
    if (total() <= presupuesto) break;
    cambios[c.k] = c.a;
    hechos.push(c);
  }
  return { antes, despues: total(), cambios, hechos };
}
// radar: a quién debe atender primero la nutrióloga
export function radar(e) {
  const filas = [];
  const sofia = paciente(e, SOFIA);
  const pend = e.nutri.solicitudes.filter((s) => s.estado === 'pendiente');
  const ultimo = e.nutri.checkins[e.nutri.checkins.length - 1];
  const prox = proximaCita(e, SOFIA, 'nut');
  const motivosS = [];
  if (pend.length) motivosS.push({ k: 'ajuste', texto: `Pidió un ajuste: "${pend[pend.length - 1].texto}"`, peso: 3 });
  if (ultimo && Date.now() - ultimo.t < 2 * DIA && (ultimo.facilidad <= 2 || ultimo.hambre >= 4)) motivosS.push({ k: 'checkin', texto: `Check-in difícil: "${ultimo.dificil}"`, peso: 3 });
  if (prox && prox.estado === 'agendada' && prox.inicio - Date.now() < 6 * DIA) motivosS.push({ k: 'cita', texto: `Su consulta del ${fechaCorta(prox.inicio)} no está confirmada`, peso: 1 });
  if (motivosS.length) filas.push({ p: sofia, motivos: motivosS, adherencia: adherencia(e), demo: true });
  e.pacientes.filter((p) => p.seg).forEach((p) => {
    const m = [];
    if (p.seg.sinRegistro >= 6) m.push({ k: 'silencio', texto: `${p.seg.sinRegistro} días sin registrar sus comidas`, peso: 2 });
    if (p.seg.adherencia < 50) m.push({ k: 'adherencia', texto: `Sigue su plan ${p.seg.adherencia}% de la semana`, peso: 2 });
    if (p.seg.animo <= 2) m.push({ k: 'animo', texto: 'Reportó ánimo bajo en su check-in', peso: 2 });
    if (p.seg.peso > 0.5) m.push({ k: 'peso', texto: `Subió ${p.seg.peso} kg desde su última consulta`, peso: 1 });
    if (m.length) filas.push({ p, motivos: m, adherencia: p.seg.adherencia });
  });
  return filas.sort((a, b) => (b.demo ? 1 : 0) - (a.demo ? 1 : 0) || b.motivos.reduce((n, x) => n + x.peso, 0) - a.motivos.reduce((n, x) => n + x.peso, 0)).slice(0, 8);
}
export function saldoDental(e, pid) {
  const d = e.dental[pid];
  if (!d) return { total: 0, abonado: 0, saldo: 0, hecho: 0 };
  const total = d.plan.reduce((n, x) => n + x.precio, 0);
  const hecho = d.plan.filter((x) => x.estado === 'hecho').reduce((n, x) => n + x.precio, 0);
  const abonado = d.abonos.reduce((n, x) => n + x.monto, 0);
  return { total, hecho, abonado, saldo: total - abonado };
}
export const imc = (pesoKg, cm) => r1(pesoKg / ((cm / 100) ** 2));

// ── acciones: citas ─────────────────────────────────────────────────────────
// agendar (paciente en línea o recepción). Regresa la cita o { error }.
export function agendar({ pac, doc, serv, inicio, origen = 'web', anticipo = 0, metodo = null, paquete = false, nombreNuevo, telNuevo }) {
  return cambiar((e) => {
    const sv = servicio(serv);
    const choca = e.citas.some((c) => c.doc === doc && c.estado !== 'cancelada' && inicio < c.inicio + c.min * MIN && c.inicio < inicio + sv.min * MIN);
    if (choca) return { error: 'ocupado' };
    let pid = pac;
    if (!pid && nombreNuevo) {
      pid = id();
      e.pacientes.push({ id: pid, nombre: nombreNuevo, tel: telNuevo || '', correo: '', alta: Date.now(), esp: [doctor(doc).esp], nuevo: true, seg: null });
    }
    const p = paciente(e, pid);
    if (p && !p.esp.includes(doctor(doc).esp)) p.esp.push(doctor(doc).esp);
    const c = { id: id(), folio: (e.folios.cita += 1), pac: pid, doc, serv, inicio, min: sv.min, estado: 'agendada', origen, precio: sv.precio, pagado: anticipo, anticipo, metodo: anticipo ? metodo : null, paquete, creada: Date.now(), nueva: true };
    if (paquete && p?.paquete) p.paquete.usadas += 1;
    e.citas.push(c);
    if (pid === SOFIA) e.avisos.push({ id: id(), t: Date.now(), para: SOFIA, texto: `Agendaste ${servicio(serv).nombre.toLowerCase()} · ${cuandoTexto(inicio)}.`, tipo: 'cita' });
    return c;
  });
}
// cancelar libera el espacio y se le ofrece a la lista de espera
export function cancelarCita(cid, por = 'paciente') {
  return cambiar((e) => {
    const c = e.citas.find((x) => x.id === cid);
    if (!c || !ACTIVAS.includes(c.estado)) return null;
    c.estado = 'cancelada'; c.canceladaPor = por; c.cancelada = Date.now();
    if (c.paquete) { const p = paciente(e, c.pac); if (p?.paquete) p.paquete.usadas = Math.max(0, p.paquete.usadas - 1); }
    const quien = e.espera.find((w) => w.doc === c.doc && !w.ofrecida && (w.pref === 'cualquier' || (w.pref === 'mañanas') === (new Date(c.inicio).getHours() < 14)));
    if (quien && c.inicio > Date.now() + 2 * 3600000) {
      quien.ofrecida = { cita: c.id, inicio: c.inicio, serv: c.serv, t: Date.now() };
      c.ofrecidaA = quien.pac;
    }
    return { c, ofrecida: quien ? paciente(e, quien.pac)?.nombre : null };
  });
}
export const reprogramar = (cid, inicio) => cambiar((e) => {
  const c = e.citas.find((x) => x.id === cid);
  if (!c) return { error: 'cita' };
  const choca = e.citas.some((x) => x.id !== cid && x.doc === c.doc && x.estado !== 'cancelada' && inicio < x.inicio + x.min * MIN && x.inicio < inicio + c.min * MIN);
  if (choca) return { error: 'ocupado' };
  c.inicio = inicio; c.estado = 'agendada'; c.reprogramada = Date.now();
  return c;
});
export const confirmar = (cid) => cambiar((e) => { const c = e.citas.find((x) => x.id === cid); if (c && c.estado === 'agendada') { c.estado = 'confirmada'; c.confirmo = Date.now(); } });
export const recordatoriosManana = () => cambiar((e) => {
  let n = 0;
  e.citas.filter((c) => inicioDiaDe(c.inicio) === inicioDia(1) && c.estado === 'agendada' && !c.recordatorio).forEach((c) => { c.recordatorio = Date.now(); n += 1; });
  return n;
});
export const llego = (cid) => cambiar((e) => { const c = e.citas.find((x) => x.id === cid); if (c && ['agendada', 'confirmada'].includes(c.estado)) { c.estado = 'llego'; c.llego = Date.now(); } });
export const noAsistio = (cid) => cambiar((e) => { const c = e.citas.find((x) => x.id === cid); if (c && ACTIVAS.includes(c.estado)) c.estado = 'no-asistio'; });
export const pasarAConsulta = (cid) => cambiar((e) => { const c = e.citas.find((x) => x.id === cid); if (c && ['llego', 'confirmada', 'agendada'].includes(c.estado)) { c.estado = 'en-consulta'; c.entro = Date.now(); } });
export const terminarConsulta = (cid) => cambiar((e) => { const c = e.citas.find((x) => x.id === cid); if (c && c.estado === 'en-consulta') { c.estado = 'atendida'; c.termino = Date.now(); } });
export function cobrarCita(cid, { monto, metodo, concepto }) {
  return cambiar((e) => {
    const c = e.citas.find((x) => x.id === cid);
    if (!c) return null;
    c.pagado = (c.pagado || 0) + monto;
    c.metodo = metodo;
    e.folios.recibo += 1;
    const pago = { id: id(), folio: e.folios.recibo, t: Date.now(), pac: c.pac, doc: c.doc, monto, metodo, concepto: concepto || servicio(c.serv).nombre, tipo: 'cita' };
    e.pagos.push(pago);
    return pago;
  });
}
// la consulta entra dentro del paquete (no se cobra aparte)
export const cubrirConPaquete = (cid) => cambiar((e) => {
  const c = e.citas.find((x) => x.id === cid);
  const p = c && paciente(e, c.pac);
  if (!c || !p?.paquete || c.paquete) return;
  c.paquete = true; p.paquete.usadas += 1;
});
// lo que entró de dinero: lo cobrado en citas + paquetes y abonos dentales
export function ingresos(e, desde, hasta = Infinity, docId) {
  const enCitas = e.citas.filter((c) => c.inicio >= desde && c.inicio < hasta && (!docId || c.doc === docId)).reduce((n, c) => n + (c.pagado || 0), 0);
  const otros = e.pagos.filter((x) => x.tipo !== 'cita' && x.t >= desde && x.t < hasta && (!docId || x.doc === docId)).reduce((n, x) => n + x.monto, 0);
  return enCitas + otros;
}
export function venderPaquete(pid, paqId, metodo) {
  return cambiar((e) => {
    const p = paciente(e, pid);
    const pq = PAQUETES.find((x) => x.id === paqId);
    if (!p || !pq) return null;
    p.paquete = { id: pq.id, usadas: 0, total: pq.consultas, desde: Date.now() };
    e.folios.recibo += 1;
    const pago = { id: id(), folio: e.folios.recibo, t: Date.now(), pac: pid, doc: 'andrea', monto: pq.precio, metodo, concepto: pq.nombre, tipo: 'paquete' };
    e.pagos.push(pago);
    return pago;
  });
}

// ── acciones: paciente (nutrición) ──────────────────────────────────────────
export const marcarComida = (tid, estado, extra = {}) => cambiar((e) => {
  const dia = inicioDia(0);
  const reg = e.nutri.registro[dia] || (e.nutri.registro[dia] = {});
  if (reg[tid]?.estado === estado && !extra.receta) delete reg[tid];
  else reg[tid] = { estado, receta: extra.receta || reg[tid]?.receta || e.nutri.semana[new Date(dia).getDay()][tid], ...extra, t: Date.now() };
});
export const sumarAgua = (n) => cambiar((e) => {
  const h = e.nutri.habitos[inicioDia(0)] || (e.nutri.habitos[inicioDia(0)] = { agua: 0, pasos: 0, sueno: 7, energia: 3 });
  h.agua = Math.max(0, Math.min(14, h.agua + n));
});
export const ponerHabito = (k, v) => cambiar((e) => { const h = e.nutri.habitos[inicioDia(0)]; if (h) h[k] = v; });
export const pedirAjuste = (texto, tid) => cambiar((e) => {
  e.nutri.solicitudes.push({ id: id(), t: Date.now(), texto, tiempo: tid || null, estado: 'pendiente' });
});
// la paciente elige una alternativa autorizada para un día que viene
export const elegirParaDia = (dia, tid, rid) => cambiar((e) => {
  const el = e.nutri.elegidas || (e.nutri.elegidas = {});
  (el[dia] = el[dia] || {})[tid] = rid;
});
export const aplicarCambiosSuper = (cambios) => cambiar((e) => {
  const el = e.nutri.elegidas || (e.nutri.elegidas = {});
  Object.entries(cambios).forEach(([k, rid]) => { const [d, tid] = k.split('-'); const dia = inicioDia(Number(d)); (el[dia] = el[dia] || {})[tid] = rid; });
});
export const enviarCheckin = (c) => cambiar((e) => { e.nutri.checkins.push({ ...c, t: Date.now() }); });
export const alternarFavorita = (rid) => cambiar((e) => {
  const f = e.nutri.favoritas;
  e.nutri.favoritas = f.includes(rid) ? f.filter((x) => x !== rid) : [...f, rid];
});
export const guardarFuera = (platillo) => cambiar((e) => { if (!e.nutri.fuera.some((x) => x.nombre === platillo.nombre)) e.nutri.fuera.unshift({ ...platillo, t: Date.now() }); });
export const subirEstudio = (nombre) => cambiar((e) => {
  e.nutri.estudios.unshift({ id: id(), t: Date.now(), nombre, subio: 'paciente', valores: [['Glucosa en ayuno', '94 mg/dL', 'normal'], ['Triglicéridos', '142 mg/dL', 'normal'], ['Hemoglobina glucosilada', '5.6 %', 'normal']], nuevo: true });
});

// ── acciones: nutrióloga ────────────────────────────────────────────────────
export const responderSolicitud = (sid, respuesta, cambio) => cambiar((e) => {
  const s = e.nutri.solicitudes.find((x) => x.id === sid);
  if (!s) return;
  s.estado = 'resuelta'; s.respuesta = respuesta; s.resuelta = Date.now();
  if (cambio) e.nutri.alternativas[cambio.tiempo] = [...new Set([...e.nutri.alternativas[cambio.tiempo], cambio.receta])];
  e.avisos.push({ id: id(), t: Date.now(), para: SOFIA, texto: `Andrea respondió: ${respuesta}`, tipo: 'plan' });
});
export const guardarMedicion = (m) => cambiar((e) => { e.nutri.mediciones.push({ ...m, t: Date.now() }); });
export const aplicarPlan = (semana, nota) => cambiar((e) => {
  e.nutri.semana = semana;
  e.avisos.push({ id: id(), t: Date.now(), para: SOFIA, texto: nota || 'Tu nutrióloga actualizó tu plan de esta semana.', tipo: 'plan' });
});
export const ponerEnPlan = (dow, tid, rid) => cambiar((e) => { e.nutri.semana[dow][tid] = rid; });
export const compartirResumen = (texto) => cambiar((e) => {
  e.nutri.resumenes.push({ t: Date.now(), texto, compartido: true });
  e.avisos.push({ id: id(), t: Date.now(), para: SOFIA, texto: 'Ya está el resumen de tu consulta.', tipo: 'plan' });
});
// copiloto: arma un borrador de semana con las recetas que respetan las
// restricciones, rotando para no repetir y ajustado a las calorías meta
export function borradorCopiloto({ kcal, sinLactosa, rapidas, economicas }) {
  const ok = (r) => (!sinLactosa || !r.ing.some((g) => /queso(?! panela sin lactosa)|leche entera|yogurt(?! de coco)/i.test(g.n)))
    && (!rapidas || r.min <= 20) && (!economicas || costoReceta(r.id) <= 40);
  const porTiempo = Object.fromEntries(TIEMPOS.map((tm) => [tm.id, RECETAS.filter((r) => r.tiempos.includes(tm.id) && ok(r))]));
  const semana = Array.from({ length: 7 }, (_, d) => Object.fromEntries(TIEMPOS.map((tm) => {
    const lista = porTiempo[tm.id].length ? porTiempo[tm.id] : RECETAS.filter((r) => r.tiempos.includes(tm.id));
    return [tm.id, lista[(d * 2 + tm.id.length) % lista.length].id];
  })));
  const prom = Math.round(semana.reduce((n, dia) => n + Object.values(dia).reduce((m, rid) => m + receta(rid).kcal, 0), 0) / 7);
  return { semana, prom, porcion: r1(kcal / prom) };
}

// ── acciones: médico y dentista ─────────────────────────────────────────────
export function guardarConsultaMedica(pid, datos) {
  return cambiar((e) => {
    e.folios.receta += 1;
    const reg = { ...datos, t: Date.now(), doc: 'emilio', receta: datos.meds?.length ? { folio: e.folios.receta, meds: datos.meds } : null };
    (e.medico[pid] = e.medico[pid] || []).push(reg);
    if (pid === SOFIA && reg.receta) e.avisos.push({ id: id(), t: Date.now(), para: SOFIA, texto: 'El Dr. Navarro te mandó tu receta.', tipo: 'receta' });
    return reg;
  });
}
const dentalDe = (e, pid) => e.dental[pid] || (e.dental[pid] = { dientes: {}, plan: [], abonos: [], notas: '' });
export const marcarDiente = (pid, n, estado) => cambiar((e) => {
  const d = dentalDe(e, pid);
  d.dientes[n] = estado;
});
export const agregarAlPlan = (pid, diente, proc) => cambiar((e) => {
  const d = dentalDe(e, pid);
  d.plan.push({ id: id(), diente, proc, precio: procedimiento(proc).precio, estado: 'pendiente' });
});
export const quitarDelPlan = (pid, iid) => cambiar((e) => { const d = dentalDe(e, pid); d.plan = d.plan.filter((x) => x.id !== iid || x.estado === 'hecho'); });
export const hacerProcedimiento = (pid, iid) => cambiar((e) => {
  const d = dentalDe(e, pid);
  const it = d.plan.find((x) => x.id === iid);
  if (!it || it.estado === 'hecho') return;
  it.estado = 'hecho'; it.t = Date.now();
  const deja = procedimiento(it.proc).deja;
  if (it.diente && deja) d.dientes[it.diente] = deja;
});
export const abonarDental = (pid, monto, metodo) => cambiar((e) => {
  dentalDe(e, pid).abonos.push({ t: Date.now(), monto, metodo });
  e.folios.recibo += 1;
  e.pagos.push({ id: id(), folio: e.folios.recibo, t: Date.now(), pac: pid, doc: 'paula', monto, metodo, concepto: 'Abono a tratamiento dental', tipo: 'abono' });
});
export const aceptarPresupuesto = (pid) => cambiar((e) => { dentalDe(e, pid).aceptado = Date.now(); });

// ── la gente simulada ───────────────────────────────────────────────────────
// Cada 8–15 s la pestaña líder: llegan pacientes a sala, entran a consulta y
// salen; a veces alguien agenda en línea o confirma por WhatsApp; la lista de
// espera acepta las citas que se le ofrecieron.
export function simular() {
  cambiar((e) => {
    const ahora = Date.now();
    const hoy = delDia(e, 0);
    hoy.forEach((c) => {
      if (c.pac === SOFIA) return;
      if (['agendada', 'confirmada'].includes(c.estado) && c.inicio - ahora < 12 * MIN && c.inicio - ahora > -10 * MIN && Math.random() < 0.5) { c.estado = 'llego'; c.llego = ahora; }
      else if (c.estado === 'llego' && ahora >= c.inicio && Math.random() < 0.5) { c.estado = 'en-consulta'; c.entro = ahora; if (!c.pagado) { c.pagado = c.precio; c.metodo = azar(['efectivo', 'tarjeta']); } }
      else if (c.estado === 'en-consulta' && ahora > c.inicio + c.min * MIN) { c.estado = 'atendida'; c.termino = ahora; }
      else if (['agendada', 'confirmada'].includes(c.estado) && ahora > c.inicio + 20 * MIN) c.estado = 'no-asistio';
    });
    // confirmaciones por WhatsApp de los recordatorios
    const porConfirmar = e.citas.filter((c) => c.estado === 'agendada' && c.pac !== SOFIA && c.inicio > ahora && c.inicio - ahora < 2 * DIA);
    if (porConfirmar.length && Math.random() < 0.35) { const c = azar(porConfirmar); c.estado = 'confirmada'; c.confirmo = ahora; c.porWhats = true; }
    // la lista de espera acepta lo que se le ofreció (a los ~25 s)
    e.espera.filter((w) => w.ofrecida && ahora - w.ofrecida.t > 25000).forEach((w) => {
      const sv = servicio(w.ofrecida.serv);
      const libre = !e.citas.some((c) => c.doc === w.doc && c.estado !== 'cancelada' && w.ofrecida.inicio < c.inicio + c.min * MIN && c.inicio < w.ofrecida.inicio + sv.min * MIN);
      if (libre) {
        e.citas.push({ id: id(), folio: (e.folios.cita += 1), pac: w.pac, doc: w.doc, serv: w.ofrecida.serv, inicio: w.ofrecida.inicio, min: sv.min, estado: 'confirmada', origen: 'espera', precio: sv.precio || 600, pagado: 0, anticipo: 0, metodo: null, recuperada: true, creada: ahora, nueva: true });
      }
      e.espera = e.espera.filter((x) => x.id !== w.id);
    });
    // alguien agenda en línea (pocas veces)
    if (Math.random() < 0.12 && e.citas.filter((c) => c.nueva && c.pac !== SOFIA && ahora - c.creada < 3600000).length < 6) {
      const doc = azar(DOCTORES);
      const d = Math.ceil(entre(1, 6));
      const libres = espacios(e, doc.id, inicioDia(d), 45);
      if (libres.length) {
        const sv = SERVICIOS.find((s) => s.esp === doc.esp && s.precio);
        const p = azar(e.pacientes.filter((x) => x.id !== SOFIA && x.esp.includes(doc.esp)));
        e.citas.push({ id: id(), folio: (e.folios.cita += 1), pac: p.id, doc: doc.id, serv: sv.id, inicio: azar(libres), min: sv.min, estado: 'agendada', origen: 'web', precio: sv.precio, pagado: NEGOCIO.anticipo, anticipo: NEGOCIO.anticipo, metodo: 'tarjeta', creada: ahora, nueva: true });
      }
    }
  });
}
