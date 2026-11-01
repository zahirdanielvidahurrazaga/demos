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
  pisos: 48,
  residencias: 212,
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
// convierten con scripts/realestate/recorrido.sh → r/NNNN.webp (1920, q85) y
// rm/ (1280, celular). 12 cuadros por segundo; el lienzo funde cada uno con
// el siguiente.
export const CUADROS = 396;
// vh de la sección: la toma ocupa 900 vh de scroll y los últimos 100 vh el
// último cuadro se queda quieto mientras sube encima la hoja de piedra.
export const ALTO_RECORRIDO = 1100;

// Tramos del scroll: la cámara va del cuadro `de` al `a` mientras pasa `dur`
// del scroll (suman 1). Los que llevan `texto` avanzan despacio (pocos
// cuadros en mucho scroll) para que se lea, sin congelar la imagen.
export const TRAMOS = [
  { de: 0, a: 10, dur: 0.08, texto: 'portada' },
  { de: 10, a: 200, dur: 0.3 },              // pasillo → se abre la sala
  { de: 200, a: 236, dur: 0.13, texto: 'sala' },
  { de: 236, a: 322, dur: 0.2 },             // gira hacia la cocina
  { de: 322, a: 350, dur: 0.12, texto: 'cocina' },
  { de: 350, a: 384, dur: 0.07 },
  { de: 384, a: 395, dur: 0.1, texto: 'cierre' },
];

export const TEXTOS = {
  sala: { titulo: 'Light that', em: 'stays late', texto: 'West-facing living rooms catch the last hour of sun, with warm oak, marble and ten-foot ceilings.' },
  cocina: { titulo: 'A kitchen', em: 'at the window', texto: 'Induction cooking under the city view, walnut millwork and integrated appliances, all included.' },
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
// Pisos 6 a 47 (1-5 son el podio de piedra, 48 la corona). Seis unidades por
// piso; las A y B miran a Manhattan. Del 44 al 47 una sola unidad: penthouse.
// El estado sale de una semilla fija: mismo edificio en cada visita.
const COLUMNAS = [
  { u: 'A', tipo: '2br', vista: 'Manhattan · corner' },
  { u: 'B', tipo: '1br', vista: 'Manhattan' },
  { u: 'C', tipo: 'studio', vista: 'Hudson River' },
  { u: 'D', tipo: '3br', vista: 'River & Statue of Liberty · corner' },
  { u: 'E', tipo: 'studio', vista: 'Paulus Hook' },
  { u: 'F', tipo: '1br', vista: 'Jersey City skyline' },
];

function semilla(n) {
  let s = n;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

export const UNIDADES = (() => {
  const r = semilla(48);
  const lista = [];
  for (let piso = 47; piso >= 6; piso--) {
    if (piso >= 44) {
      const x = r();
      lista.push({ id: `PH${piso - 43}`, piso, u: 'PH', tipo: 'ph', vista: '360° · wraparound terrace', estado: x < 0.5 ? 'vendida' : x < 0.7 ? 'apartada' : 'disponible', precio: Math.round((5900000 + (piso - 44) * 650000) / 5000) * 5000, ft: 2900 + (piso - 44) * 160 });
      continue;
    }
    for (const c of COLUMNAS) {
      const t = tipo(c.tipo);
      const x = r();
      // más vendido abajo y en las esquinas a Manhattan
      const presion = (c.u === 'A' || c.u === 'D' ? 0.15 : 0) + (piso < 20 ? 0.12 : 0);
      const estado = x < 0.42 + presion ? 'vendida' : x < 0.52 + presion ? 'apartada' : 'disponible';
      const premium = 1 + (piso - 6) * 0.011 + (c.u === 'A' || c.u === 'B' ? 0.06 : 0);
      lista.push({
        id: `${piso}${c.u}`, piso, u: c.u, tipo: c.tipo, vista: c.vista, estado,
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
  { piso: '48', foto: 'k4-rooftop', nombre: 'The Crown', texto: '75-ft infinity pool, cabanas and a sunset bar under glass.' },
  { piso: '47', foto: 'k5-noche', nombre: 'Sky Lounge', texto: 'Private dining room with a chef’s kitchen and a wine wall.' },
  { piso: '7', nombre: 'Wellness', texto: 'Fitness studio, Pilates, cold plunge, sauna and steam.' },
  { piso: '6', nombre: 'Garden terrace', texto: 'Landscaped deck with grills, fire pits and a dog run.' },
  { piso: '2', nombre: 'Work lounge', texto: 'Library, phone booths and bookable meeting rooms.' },
  { piso: '1', foto: 's-lobby', nombre: 'Lobby', texto: '24-hour doorman, concierge, package room and valet.' },
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
