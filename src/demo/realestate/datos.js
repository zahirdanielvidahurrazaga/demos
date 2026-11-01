// ─────────────────────────────────────────────────────────────────────────────
// THE HALDEN — datos de la landing de real estate (31-oct-2026).
//
// Desarrollo FICTICIO en el waterfront de Jersey City (Paulus Hook, NJ), con
// Manhattan enfrente. Es la demo que el primo de Zahir enseña en EE.UU.: va en
// inglés y SIN marca KaiZen (marca blanca). Precios, unidades y tiempos son de
// ejemplo.
// ─────────────────────────────────────────────────────────────────────────────

export const IMG = '/realestate/halden';

export const TORRE = {
  nombre: 'The Halden',
  barrio: 'Paulus Hook · Jersey City',
  direccion: '1 Halden Wharf, Jersey City, NJ 07302',
  pisos: 8,
  residencias: 19,
  desde: 865000,
  entrega: 'Fall 2027',
  telefono: '(201) 555-0148',
  correo: 'sales@thehalden.example',
};

// ── El recorrido ────────────────────────────────────────────────────────────
// UNA sola toma continua por un departamento (1-nov-2026): render de Blender
// (Cycles) de la escena "Modern Apartment" de Visthétique en Sketchfab
// (CC BY 4.0, crédito en el pie) con cielo de Poly Haven. Lo de Veo (fotos IA
// + videos por escenas) se descartó: solo se sentía inmersivo al inicio y el
// color cambiaba entre clips. Escena, cámara y render en
// ~/Desktop/Recorrido NJ/blender/ (armar.py, render.py); los cuadros se
// convierten con scripts/realestate/recorrido.sh. Compu: r/ a 24 por
// segundo (791 cuadros: los 396 originales + intermedios renderizados aparte);
// celular: rm/ a 12 por segundo (396, para no duplicar el peso). Los tramos
// van en cuadros de la versión a 12 (0..395) y cada serie los escala.
// vh de la sección: la toma ocupa 1150 vh de scroll y los últimos 100 vh el
// último cuadro se queda quieto mientras sube encima la hoja de piedra.
export const ALTO_RECORRIDO = 1350;

// LA LLEGADA (1-nov): la toma empieza AFUERA. Foto de la entrada hecha por
// Codex a partir de un render de la torre (Sketchfab, zigurat, CC BY) →
// video de Gemini/Veo avanzando hacia el lobby (un solo movimiento, solo
// primer cuadro: lo que sí le sale) → fundido de las puertas al pasillo →
// el recorrido. Todo es UNA serie de cuadros (~/Desktop/Recorrido NJ/
// serie-llegada/): en compu 240 + 24 + 791 = 1055 (24 por s) y en celular la
// mitad, 120 + 12 + 396 = 528. Los tramos van en cuadros de la de celular.
export const LLEGADA = 132; // primer cuadro del pasillo (en cuadros de celular)

// Tramos del scroll: la cámara va del cuadro `de` al `a` mientras pasa `dur`
// del scroll (suman 1). Los que llevan `texto` avanzan despacio (pocos
// cuadros en mucho scroll) para que se lea, sin congelar la imagen.
const L = LLEGADA;
export const TRAMOS = [
  { de: 0, a: 4, dur: 0.05, texto: 'portada' },  // afuera, frente a la entrada
  { de: 4, a: 119, dur: 0.16 },                  // avanza hacia el lobby
  { de: 119, a: L, dur: 0.05 },                  // las puertas se funden con el pasillo
  { de: L, a: L + 200, dur: 0.25 },              // pasillo → se abre la sala
  { de: L + 200, a: L + 236, dur: 0.1, texto: 'sala' },
  { de: L + 236, a: L + 322, dur: 0.15 },        // gira hacia la cocina
  { de: L + 322, a: L + 350, dur: 0.09, texto: 'cocina' },
  { de: L + 350, a: L + 384, dur: 0.06 },
  { de: L + 384, a: L + 395, dur: 0.09, texto: 'cierre' },
];

// La recámara (1-nov): otra toma continua, aparte, de 144 cuadros a 24 por
// segundo (armar-recamara.py). Del pie de la cama hacia la ventana.
export const TRAMOS_RECAMARA = [
  { de: 0, a: 8, dur: 0.2, texto: 'recamara' },
  { de: 8, a: 118, dur: 0.55 },
  { de: 118, a: 143, dur: 0.25, texto: 'recamara2' },
];

// Cada toma: carpetas y cuadros en compu y celular, `base` = último cuadro en
// las unidades de sus tramos, alto de la sección en vh y si la tapa la hoja
// que sube (entonces su scroll termina una pantalla antes).
export const TOMAS = {
  recorrido: { id: 'recorrido', compu: 'r', n: 1055, movil: 'rm', nMovil: 528, base: L + 395, tramos: TRAMOS, alto: ALTO_RECORRIDO, tapa: true, etiqueta: 'Scroll tour of a residence at The Halden' },
  recamara: { id: 'recamara', compu: 'c', n: 144, movil: 'cm', nMovil: 144, base: 143, tramos: TRAMOS_RECAMARA, alto: 460, tapa: false, etiqueta: 'Scroll tour of a primary bedroom' },
};

export const TEXTOS = {
  sala: { titulo: 'Light that', em: 'stays late', texto: 'West-facing living rooms catch the last hour of sun, with warm oak, marble and ten-foot ceilings.' },
  cocina: { titulo: 'A kitchen', em: 'at the window', texto: 'Induction cooking under the city view, walnut millwork and integrated appliances, all included.' },
  recamara: { titulo: 'The primary', em: 'suite', texto: 'Oak-paneled walls, a floating headboard and sheers that soften the morning light.' },
  recamara2: { titulo: 'Morning light,', em: 'by design', texto: 'Every primary suite opens to its own window wall, so the day starts with the city.' },
  cierre: { titulo: 'Make it', em: 'your home', texto: `Residences from $865,000. Occupancy Fall 2027.`, cta: true },
};

// ── Residencias ─────────────────────────────────────────────────────────────
// Planos esquemáticos en una cuadrícula de 100 × 64. `curva` = la esquina
// redondeada de cristal (la firma del edificio) en la sala.
export const TIPOS = [
  {
    id: 'studio', nombre: 'Studio', recamaras: 0, banos: 1, ft: [520, 560], desde: 865000,
    nota: 'A full-glass studio with a sleeping alcove and Manhattan views.',
    cuartos: [
      { x: 0, y: 0, w: 62, h: 64, t: 'Living / Sleeping', curva: true },
      { x: 62, y: 0, w: 38, h: 26, t: 'Kitchen' },
      { x: 62, y: 26, w: 38, h: 20, t: 'Bath' },
      { x: 62, y: 46, w: 38, h: 18, t: 'Entry' },
    ],
  },
  {
    id: '1br', nombre: 'One Bedroom', recamaras: 1, banos: 1, ft: [740, 810], desde: 1095000,
    nota: 'Corner living room, a bedroom that faces the river and a walk-in closet.',
    cuartos: [
      { x: 0, y: 0, w: 56, h: 38, t: 'Living', curva: true },
      { x: 0, y: 38, w: 56, h: 26, t: 'Kitchen' },
      { x: 56, y: 0, w: 44, h: 36, t: 'Bedroom' },
      { x: 56, y: 36, w: 24, h: 28, t: 'Bath' },
      { x: 80, y: 36, w: 20, h: 28, t: 'W/C' },
    ],
  },
  {
    id: '2br', nombre: 'Two Bedroom', recamaras: 2, banos: 2, ft: [1120, 1240], desde: 1585000,
    nota: 'Split bedrooms, an island kitchen and a private terrace on the corner.',
    cuartos: [
      { x: 0, y: 0, w: 50, h: 40, t: 'Living', curva: true },
      { x: 0, y: 40, w: 30, h: 24, t: 'Kitchen' },
      { x: 30, y: 40, w: 20, h: 24, t: 'Dining' },
      { x: 50, y: 0, w: 30, h: 32, t: 'Primary' },
      { x: 80, y: 0, w: 20, h: 32, t: 'Bath' },
      { x: 50, y: 32, w: 30, h: 32, t: 'Bedroom 2' },
      { x: 80, y: 32, w: 20, h: 32, t: 'Bath 2' },
    ],
  },
  {
    id: '3br', nombre: 'Three Bedroom', recamaras: 3, banos: 3, ft: [1610, 1780], desde: 2450000,
    nota: 'Two exposures, a family room and a primary suite with a soaking tub.',
    cuartos: [
      { x: 0, y: 0, w: 42, h: 38, t: 'Living', curva: true },
      { x: 0, y: 38, w: 26, h: 26, t: 'Kitchen' },
      { x: 26, y: 38, w: 16, h: 26, t: 'Dining' },
      { x: 42, y: 0, w: 30, h: 30, t: 'Primary' },
      { x: 72, y: 0, w: 28, h: 30, t: 'Primary bath' },
      { x: 42, y: 30, w: 22, h: 34, t: 'Bedroom 2' },
      { x: 64, y: 30, w: 18, h: 34, t: 'Bedroom 3' },
      { x: 82, y: 30, w: 18, h: 34, t: 'Baths' },
    ],
  },
  {
    id: 'ph', nombre: 'Penthouse', recamaras: 4, banos: 4.5, ft: [2900, 3400], desde: 5900000,
    nota: 'Full-floor living under 12-foot ceilings, with a wraparound terrace.',
    cuartos: [
      { x: 0, y: 0, w: 46, h: 40, t: 'Great room', curva: true },
      { x: 0, y: 40, w: 28, h: 24, t: 'Kitchen' },
      { x: 28, y: 40, w: 18, h: 24, t: 'Library' },
      { x: 46, y: 0, w: 32, h: 30, t: 'Primary suite' },
      { x: 78, y: 0, w: 22, h: 30, t: 'Spa bath' },
      { x: 46, y: 30, w: 18, h: 34, t: 'Bedroom 2' },
      { x: 64, y: 30, w: 18, h: 34, t: 'Bedroom 3' },
      { x: 82, y: 30, w: 18, h: 34, t: 'Bedroom 4' },
    ],
  },
];

export const tipo = (id) => TIPOS.find((t) => t.id === id);

// ── Disponibilidad ──────────────────────────────────────────────────────────
// Edificio BOUTIQUE de 8 pisos (1-nov: es lo que se ve en la foto; antes era
// una torre de 48): planta baja con el lobby, pisos 2 a 7 con tres
// residencias (A izquierda, B centro, C derecha, la de los balcones hacia
// Manhattan) y el 8 entero es el penthouse. Dónde cae cada una en la foto de
// frente: fachada.js. El estado sale de una semilla fija: mismo edificio en
// cada visita.
const COLUMNAS = [
  { u: 'A', tipo: (p) => (p < 5 ? '1br' : '2br'), vista: 'River · west' },
  { u: 'B', tipo: (p) => (p < 5 ? 'studio' : '1br'), vista: 'Courtyard · south' },
  { u: 'C', tipo: (p) => (p < 5 ? '2br' : '3br'), vista: 'Manhattan · east' },
];

function semilla(n) {
  let s = n;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

export const UNIDADES = (() => {
  const r = semilla(48);
  const lista = [{ id: 'PH', piso: 8, u: 'PH', tipo: 'ph', vista: '360° · wraparound terrace', estado: 'disponible', precio: 5900000, ft: 3150 }];
  for (let piso = 7; piso >= 2; piso--) {
    for (const c of COLUMNAS) {
      const t = tipo(c.tipo(piso));
      const x = r();
      // más vendido abajo y en la esquina
      const presion = (c.u === 'C' ? 0.12 : 0) + (piso < 5 ? 0.1 : 0);
      const estado = x < 0.38 + presion ? 'vendida' : x < 0.5 + presion ? 'apartada' : 'disponible';
      const premium = 1 + (piso - 2) * 0.03 + (c.u === 'C' ? 0.06 : 0);
      lista.push({
        id: `${piso}${c.u}`, piso, u: c.u, tipo: t.id, vista: c.vista, estado,
        precio: Math.round((t.desde * premium) / 5000) * 5000,
        ft: Math.round(t.ft[0] + (t.ft[1] - t.ft[0]) * r()),
      });
    }
  }
  return lista;
})();

export const ESTADOS = {
  disponible: 'Available',
  apartada: 'Reserved',
  vendida: 'Sold',
};

// ── Amenidades ──────────────────────────────────────────────────────────────
export const AMENIDADES = [
// Fotos de Codex con los materiales del edificio y del departamento como
// referencia (1-nov), en amenidades/; el lobby es la entrada del edificio.
  { lugar: 'Rooftop', foto: 'amenidades/rooftop', nombre: 'The Rooftop', texto: 'Heated pool, cabanas and a sunset bar facing the Manhattan skyline.' },
  { lugar: 'Rooftop', foto: 'amenidades/lounge', nombre: 'Residents’ lounge', texto: 'Private dining room with a chef’s kitchen and a wine wall.' },
  { lugar: 'Lower level', foto: 'amenidades/wellness', nombre: 'Wellness', texto: 'Fitness studio, Pilates, cold plunge, sauna and steam.' },
  { lugar: 'Ground floor', foto: 'amenidades/patio', nombre: 'Garden courtyard', texto: 'Landscaped courtyard with grills, a fire pit and a dog run.' },
  { lugar: 'Mezzanine', foto: 'amenidades/work', nombre: 'Work lounge', texto: 'Library, phone booths and a bookable meeting room.' },
  { lugar: 'Ground floor', foto: 'edificio-entrada', nombre: 'Lobby', texto: '24-hour doorman, concierge, package room and valet.' },
];

// ── El barrio (tiempos aproximados) ─────────────────────────────────────────
export const TRAYECTOS = [
  { modo: 'PATH', a: 'World Trade Center', min: 5, nota: 'from Exchange Place, a 3-minute walk' },
  { modo: 'Ferry', a: 'Brookfield Place', min: 8, nota: 'from the Paulus Hook pier, next door' },
  { modo: 'Ferry', a: 'Pier 11 / Wall Street', min: 10, nota: 'same pier' },
  { modo: 'Drive', a: 'Holland Tunnel', min: 6, nota: 'to SoHo and Tribeca' },
  { modo: 'Walk', a: 'Liberty State Park', min: 15, nota: 'along the waterfront walkway' },
  { modo: 'Train', a: 'Newark Airport', min: 30, nota: 'via PATH and NJ Transit' },
];

// ── Visitas ─────────────────────────────────────────────────────────────────
export const HORAS = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM', '5:30 PM'];

// Días de visita: los próximos 12 (sin domingos), con horarios ya tomados de
// ejemplo para que el calendario no se vea vacío.
export function diasDeVisita(hoy = new Date()) {
  const r = semilla(hoy.getDate() + 7);
  const dias = [];
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  while (dias.length < 12) {
    if (d.getDay() !== 0) {
      const tomadas = HORAS.filter(() => r() < 0.35);
      dias.push({ fecha: new Date(d), tomadas });
    }
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

export const dinero = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const dineroCorto = (n) => (n >= 1000000 ? `$${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 2).replace(/0$/, '')}M` : `$${Math.round(n / 1000)}K`);

// Archivo .ics para "Add to calendar" (hora local de Nueva York).
export function archivoVisita({ fecha, hora, nombre }) {
  const [hm, ap] = hora.split(' ');
  let [h, m] = hm.split(':').map(Number);
  if (ap === 'PM' && h !== 12) h += 12;
  const p = (x) => String(x).padStart(2, '0');
  const dia = `${fecha.getFullYear()}${p(fecha.getMonth() + 1)}${p(fecha.getDate())}`;
  const ini = `${dia}T${p(h)}${p(m)}00`;
  const fin = `${dia}T${p(h + 1)}${p(m)}00`;
  const texto = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Halden//Tours//EN', 'BEGIN:VEVENT',
    `UID:${ini}-${Math.random().toString(36).slice(2)}@thehalden`,
    `DTSTART;TZID=America/New_York:${ini}`, `DTEND;TZID=America/New_York:${fin}`,
    `SUMMARY:Private tour · ${TORRE.nombre}`,
    `LOCATION:${TORRE.direccion.replace(/,/g, '\\,')}`,
    `DESCRIPTION:Sales gallery visit for ${nombre}. Bring a photo ID.`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return URL.createObjectURL(new Blob([texto], { type: 'text/calendar' }));
}
