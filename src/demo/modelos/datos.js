import { useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE AGENCIA DE MODELOS — datos y lógica (sin base de datos)
//
// Igual que Sorteos: todo vive en el navegador (localStorage) y las pestañas se
// ven en vivo por el evento `storage`. El ciclo que enseña:
//
//   cliente arma su package → pide casting o booking
//   → la booker manda OPCIÓN a cada modelo → la modelo acepta o rechaza
//   → la booker cotiza → el cliente acepta → trabajo CONFIRMADO
//   → se hace → se cobra al cliente → se liquida a la modelo (menos comisión)
//
// Más: scouting (aspirantes que se postulan con fotos y pueden volverse "new
// face" del book) y eventos (pasarela, casting abierto, campaña) con
// convocatoria de modelos y registro de invitados.
// ─────────────────────────────────────────────────────────────────────────────

export const AGENCIA = {
  nombre: 'MIRA',
  completo: 'MIRA Model Management',
  ciudad: 'Ciudad de México · Puebla',
  correo: 'booking@mira.mx',
  whatsapp: '522220000000',
  comision: 0.2,   // lo que se queda la agencia de cada trabajo
  iva: 0.16,
};

export const CATEGORIAS = ['Editorial', 'Comercial', 'Pasarela', 'Fitness', 'New faces'];
export const FOTO = (id, tipo = 'book') => `/modelos/mira/${id}-${tipo}.webp`;

// medidas en cm; hombres: pecho / cintura / traje
export const MODELOS = [
  { id: 'valeria', nombre: 'Valeria', apellido: 'Ruiz', num: '014', board: 'mujeres', estatura: 178, medidas: [84, 61, 89], calzado: 25, ojos: 'Café', cabello: 'Castaño oscuro', ciudad: 'CDMX', categorias: ['Editorial', 'Pasarela'], idiomas: 'Español · Inglés', ig: '48.2k', tarifa: 18000, bio: 'Portadas y lookbooks. Fashion Week México 2025 y 2026.' },
  { id: 'camila', nombre: 'Camila', apellido: 'Ortega', num: '021', board: 'mujeres', estatura: 175, medidas: [86, 63, 91], calzado: 24.5, ojos: 'Miel', cabello: 'Castaño claro', ciudad: 'Puebla', categorias: ['Comercial'], idiomas: 'Español · Inglés', ig: '31.5k', tarifa: 12000, bio: 'La cara de campañas de belleza y retail. Muy natural a cámara.' },
  { id: 'renata', nombre: 'Renata', apellido: 'Salas', num: '008', board: 'mujeres', estatura: 180, medidas: [82, 60, 88], calzado: 25.5, ojos: 'Negro', cabello: 'Negro', ciudad: 'CDMX', categorias: ['Pasarela', 'Editorial'], idiomas: 'Español · Inglés · Francés', ig: '62.0k', tarifa: 22000, bio: 'Pasarela internacional. Temporadas en París y Madrid.' },
  { id: 'ximena', nombre: 'Ximena', apellido: 'Lara', num: '033', board: 'mujeres', estatura: 172, medidas: [85, 62, 92], calzado: 24, ojos: 'Café', cabello: 'Negro', ciudad: 'Puebla', categorias: ['Fitness', 'Comercial'], idiomas: 'Español', ig: '27.8k', tarifa: 11000, bio: 'Deportiva de verdad: corre, nada y hace pilates. Ropa activa y bebidas.' },
  { id: 'sofia', nombre: 'Sofía', apellido: 'Méndez', num: '041', board: 'mujeres', estatura: 176, medidas: [80, 59, 87], calzado: 24.5, ojos: 'Verde', cabello: 'Cobrizo', ciudad: 'CDMX', categorias: ['New faces', 'Editorial'], idiomas: 'Español · Inglés', ig: '6.4k', tarifa: 8000, bio: 'Recién firmada. Pecas, cobrizo y una cara que no se olvida.' },
  { id: 'ana', nombre: 'Ana Paula', apellido: 'Ríos', num: '017', board: 'mujeres', estatura: 177, medidas: [83, 62, 90], calzado: 25, ojos: 'Café oscuro', cabello: 'Rizado negro', ciudad: 'CDMX', categorias: ['Editorial', 'Comercial'], idiomas: 'Español · Inglés · Portugués', ig: '39.1k', tarifa: 16000, bio: 'Editorial de moda y belleza. Rizo natural, piel impecable.' },
  { id: 'diego', nombre: 'Diego', apellido: 'Navarro', num: '105', board: 'hombres', estatura: 188, medidas: [98, 78, 40], calzado: 28, ojos: 'Café', cabello: 'Negro', ciudad: 'CDMX', categorias: ['Pasarela', 'Editorial'], idiomas: 'Español · Inglés', ig: '35.7k', tarifa: 17000, bio: 'Sastrería y pasarela. Abrió el desfile de cierre de la última temporada.' },
  { id: 'mateo', nombre: 'Mateo', apellido: 'Cruz', num: '112', board: 'hombres', estatura: 185, medidas: [100, 80, 40], calzado: 27.5, ojos: 'Avellana', cabello: 'Castaño', ciudad: 'Puebla', categorias: ['Comercial'], idiomas: 'Español · Inglés', ig: '22.3k', tarifa: 11000, bio: 'Comerciales de tele, autos y bancos. El papá joven que todos quieren.' },
  { id: 'emilio', nombre: 'Emilio', apellido: 'Vargas', num: '118', board: 'hombres', estatura: 187, medidas: [104, 79, 42], calzado: 28.5, ojos: 'Café', cabello: 'Rapado', ciudad: 'Puebla', categorias: ['Fitness', 'Comercial'], idiomas: 'Español', ig: '44.9k', tarifa: 12000, bio: 'Crossfit y nutrición deportiva. Suplementos, gimnasios y ropa activa.' },
  { id: 'andres', nombre: 'Andrés', apellido: 'Kim', num: '109', board: 'hombres', estatura: 184, medidas: [96, 76, 38], calzado: 27, ojos: 'Negro', cabello: 'Negro', ciudad: 'CDMX', categorias: ['Editorial', 'New faces'], idiomas: 'Español · Inglés · Coreano', ig: '12.6k', tarifa: 9000, bio: 'Editorial y belleza masculina. Firmado en marzo.' },
];

// la portada-collage de cada modelo: una palabra grande y una línea
export const PORTADAS = {
  valeria: ['Actitud', 'Lo simple, dicho fuerte.'],
  camila: ['Luz propia', 'Una sonrisa que vende sola.'],
  renata: ['Pasarela', 'Tres temporadas en París.'],
  ximena: ['Sin pausa', 'Fuerza que se ve real.'],
  sofia: ['Cara nueva', 'Pecas, cobre y calma.'],
  ana: ['Volumen', 'El rizo como firma.'],
  diego: ['Sastrería', 'Hecho para el corte.'],
  mateo: ['Cercano', 'El que todos reconocen.'],
  emilio: ['Disciplina', 'Cuerpo de atleta, mirada de cine.'],
  andres: ['Silencio', 'Editorial en voz baja.'],
};
export const FOTOS_PORTADA = ['book', 'pose', 'bn', 'cerca', 'polaroid'];

// la cuenta "Modelo" de la demo
export const YO_MODELO = 'valeria';

export const TIPOS_TRABAJO = ['Casting', 'Fitting', 'Sesión', 'Campaña', 'Pasarela', 'Comercial de TV'];
export const USOS = ['Solo redes · 6 meses', 'Redes + web · 1 año', 'Campaña completa · 1 año', 'Editorial (sin uso comercial)', 'Por definir con la agencia'];

const HORA = 3600000;
const DIA = 86400000;
const enDias = (d, h = 10, m = 0) => { const f = new Date(); f.setDate(f.getDate() + d); f.setHours(h, m, 0, 0); return f.getTime(); };
const id = () => Math.random().toString(36).slice(2, 9);

// ── la siembra: un mes de historia y tres semanas de agenda ─────────────────
function sembrar() {
  const t = (modeloId, marca, proyecto, tipo, dias, hora, horas, lugar, tarifa, extra = {}) => ({
    id: id(), modeloId, marca, proyecto, tipo, fecha: enDias(dias, hora), horas, lugar, tarifa,
    estado: 'confirmado', cobrado: dias < -10, liquidado: dias < -18, solicitud: null, nota: '', ...extra,
  });
  const trabajos = [
    // pasado (cobrado / por cobrar / por liquidar)
    t('valeria', 'Casa Ámbar', 'Joyería · colección otoño', 'Campaña', -26, 9, 8, 'Estudio Roma Norte, CDMX', 24000),
    t('valeria', 'Norte Denim', 'Lookbook invierno', 'Sesión', -12, 10, 6, 'Foro Juárez, CDMX', 18000),
    t('valeria', 'Revista Plana', 'Editorial de portada', 'Sesión', -5, 11, 5, 'Estudio Condesa, CDMX', 9000, { cobrado: false }),
    t('renata', 'Atelier Ruiz', 'Desfile primavera', 'Pasarela', -20, 19, 4, 'Museo de Arte, Puebla', 26000),
    t('camila', 'Farmacia Sol', 'Campaña protector solar', 'Campaña', -15, 8, 9, 'Playa / locación, Acapulco', 28000),
    t('diego', 'Sastrería Gil', 'Catálogo trajes', 'Sesión', -9, 10, 6, 'Estudio Roma Norte, CDMX', 17000, { cobrado: false }),
    t('emilio', 'Volt Supplements', 'Redes · lanzamiento', 'Sesión', -7, 7, 5, 'Gimnasio Atlas, Puebla', 12000, { cobrado: true }),
    t('mateo', 'Banco Azul', 'Comercial "primera casa"', 'Comercial de TV', -22, 7, 10, 'Casa locación, Cholula', 32000),
    t('ana', 'Lumbre Cosmetics', 'Belleza · labiales', 'Campaña', -3, 9, 7, 'Estudio Condesa, CDMX', 20000, { cobrado: false }),
    // seis meses de historia de Valeria (para sus gráficas de pagos)
    ...[
      ['Casa Ámbar', 'Joyería · navidad', 'Campaña', -170, 22000], ['Revista Plana', 'Editorial moda', 'Sesión', -155, 9000],
      ['Atelier Ruiz', 'Desfile otoño', 'Pasarela', -140, 15000], ['Norte Denim', 'Redes · básicos', 'Sesión', -118, 12000],
      ['Lumbre Cosmetics', 'Belleza · base', 'Campaña', -101, 20000], ['Hotel Cielo', 'Web del hotel', 'Sesión', -86, 14000],
      ['Sastrería Gil', 'Lookbook mujer', 'Sesión', -72, 11000], ['Fashion Week MX', 'Desfile de clausura', 'Pasarela', -60, 18000],
      ['Café Lumbre', 'Temporada de invierno', 'Sesión', -44, 8000], ['Joyería Plata Fina', 'Catálogo anillos', 'Sesión', -35, 10000],
    ].map(([marca, proyecto, tipo, d, tarifa]) => t('valeria', marca, proyecto, tipo, d, 10, 6, 'Estudio Roma Norte, CDMX', tarifa, { cobrado: true, liquidado: true })),
    // castings pasados con lo que dijo el cliente
    t('valeria', 'Lumbre Cosmetics', 'Casting belleza rímel', 'Casting', -16, 12, 1, 'Agencia MIRA, CDMX', 0, { resultado: 'quedo', feedback: 'Les encantó la mirada y la piel. Te quieren para la campaña.' }),
    t('valeria', 'Tenis Ruta', 'Casting lanzamiento', 'Casting', -11, 16, 1, 'Agencia MIRA, CDMX', 0, { resultado: 'no', feedback: 'Buscaban un perfil más deportivo. Muy buena actitud en el casting.' }),
    t('valeria', 'Atelier Ruiz', 'Prueba de vestuario', 'Casting', -4, 13, 1, 'Atelier Ruiz, Puebla centro', 0, { resultado: 'espera', feedback: 'Deciden el viernes; les gustó tu caminata.' }),
    // futuro de Valeria (la cuenta de la demo)
    t('valeria', 'Norte Denim', 'Fitting campaña primavera', 'Fitting', 2, 12, 2, 'Showroom Norte, Polanco', 3000),
    t('valeria', 'Norte Denim', 'Campaña primavera', 'Campaña', 4, 8, 9, 'Desierto de los Leones, CDMX', 26000),
    t('valeria', 'Atelier Ruiz', 'Casting desfile', 'Casting', 1, 16, 1, 'Atelier Ruiz, Puebla centro', 0),
    t('valeria', 'Lumbre Cosmetics', 'Belleza · rímel', 'Sesión', 9, 10, 6, 'Estudio Condesa, CDMX', 18000, { estado: 'opcion' }),
    // futuro del resto
    t('renata', 'Atelier Ruiz', 'Desfile de invierno', 'Pasarela', 6, 19, 4, 'Museo de Arte, Puebla', 26000),
    t('diego', 'Atelier Ruiz', 'Desfile de invierno', 'Pasarela', 6, 19, 4, 'Museo de Arte, Puebla', 22000),
    t('camila', 'Café Lumbre', 'Menú de temporada', 'Sesión', 3, 9, 4, 'Café Lumbre, Puebla', 10000),
    t('ximena', 'Volt Supplements', 'Campaña "sin pretextos"', 'Campaña', 5, 6, 8, 'Gimnasio Atlas, Puebla', 14000),
    t('emilio', 'Volt Supplements', 'Campaña "sin pretextos"', 'Campaña', 5, 6, 8, 'Gimnasio Atlas, Puebla', 14000),
    t('mateo', 'Autos Cholula', 'Casting comercial', 'Casting', 2, 11, 1, 'Agencia MIRA, Puebla', 0),
    t('ana', 'Revista Plana', 'Editorial belleza', 'Sesión', 8, 10, 5, 'Estudio Condesa, CDMX', 9000),
    t('sofia', 'Norte Denim', 'Casting campaña', 'Casting', 1, 13, 1, 'Agencia MIRA, CDMX', 0),
    t('andres', 'Sastrería Gil', 'Lookbook', 'Sesión', 11, 10, 5, 'Estudio Roma Norte, CDMX', 9000, { estado: 'opcion' }),
  ];

  const solicitudes = [
    {
      id: id(), folio: 'SOL-0142', marca: 'Hotel Cielo', contacto: 'Mariana Torres', correo: 'mariana@hotelcielo.mx', telefono: '2221234567',
      proyecto: 'Fotos para web y redes del hotel', tipo: 'booking', trabajo: 'Sesión', fecha: enDias(12, 9), horas: 6,
      lugar: 'Hotel Cielo, Valle de Bravo', uso: 'Redes + web · 1 año', modelos: ['camila', 'mateo'], nota: 'Buscamos pareja de 28-35 que se vea de vacaciones, nada de pose.',
      estado: 'nueva', creada: Date.now() - 2 * HORA, mia: false, cotizacion: null,
    },
    {
      id: id(), folio: 'SOL-0141', marca: 'Norte Denim', contacto: 'Iván Paredes', correo: 'ivan@nortedenim.mx', telefono: '5512345678',
      proyecto: 'Casting campaña verano', tipo: 'casting', trabajo: 'Casting', fecha: enDias(7, 12), horas: 2,
      lugar: 'Agencia MIRA, CDMX', uso: 'Campaña completa · 1 año', modelos: ['valeria', 'sofia', 'ana', 'andres'], nota: '',
      estado: 'nueva', creada: Date.now() - 20 * HORA, mia: false, cotizacion: null,
    },
  ];

  const eventos = [
    {
      id: 'pasarela', titulo: 'Desfile de invierno · Atelier Ruiz', tipo: 'Pasarela', fecha: enDias(6, 19), lugar: 'Museo de Arte, Puebla',
      foto: '/modelos/mira/evento-pasarela.webp', publico: true, cupo: 180,
      descripcion: '22 looks de la colección de invierno. Coctel al terminar.',
      convocadas: { renata: 'confirmada', diego: 'confirmada', valeria: 'pendiente', ana: 'confirmada', andres: 'pendiente' },
      invitados: invitadosEjemplo(64),
    },
    {
      id: 'casting', titulo: 'Casting abierto · New faces 2027', tipo: 'Casting abierto', fecha: enDias(10, 11), lugar: 'Agencia MIRA, Puebla',
      foto: '/modelos/mira/evento-casting.webp', publico: true, cupo: 60,
      descripcion: 'Buscamos caras nuevas de 16 a 25 años. Ven sin maquillaje, con jeans y blusa negra. Trae una identificación.',
      convocadas: {}, invitados: invitadosEjemplo(23, true),
    },
    {
      id: 'campana', titulo: 'Campaña "sin pretextos" · Volt', tipo: 'Campaña', fecha: enDias(5, 6), lugar: 'Gimnasio Atlas, Puebla',
      foto: '/modelos/mira/evento-campana.webp', publico: false, cupo: 0,
      descripcion: 'Producción privada. Call time 6:00, desayuno en set.',
      convocadas: { ximena: 'confirmada', emilio: 'confirmada' }, invitados: [],
    },
  ];

  const aspirantes = [
    aspiranteEjemplo('Daniela Herrera', 19, 176, 'Puebla', '@dani.herrera', 'nueva', 3),
    aspiranteEjemplo('Luis Ángel Pérez', 21, 186, 'Tlaxcala', '@luisangelp', 'nueva', 9, 'hombres'),
    aspiranteEjemplo('Fernanda Gil', 18, 179, 'Cholula', '@fer.gil', 'casting', 30),
    aspiranteEjemplo('Brenda Castillo', 24, 165, 'Atlixco', '@brendac', 'descartada', 52),
  ];

  return {
    v: 3, trabajos, solicitudes, eventos, aspirantes,
    favoritos: [], nuevas: [], polaroids: {}, misRegistros: [],
    avisos: [
      ['booker', 'Hotel Cielo pidió un booking (2 modelos)', 2, { tipo: 'solicitud' }],
      ['booker', 'Renata confirmó Desfile de invierno · Atelier Ruiz', 3, { tipo: 'evento', mid: 'renata' }],
      ['booker', 'Lumbre Cosmetics pagó la factura de Ana Paula', 5, { tipo: 'dinero', mid: 'ana' }],
      ['booker', 'Nueva postulación: Daniela Herrera, 176 cm, Puebla', 3.2, { tipo: 'scouting' }],
      ['booker', 'Ximena aceptó Volt Supplements · Campaña', 7, { tipo: 'modelo', mid: 'ximena' }],
      ['booker', 'Norte Denim pidió un casting (4 modelos)', 20, { tipo: 'solicitud' }],
      ['booker', 'Diego aceptó Atelier Ruiz · Pasarela', 26, { tipo: 'modelo', mid: 'diego' }],
      ['valeria', 'Confirmado: Norte Denim · Campaña primavera', 6, {}],
      ['valeria', 'Te depositamos $8,000 por Café Lumbre', 30, {}],
      ['valeria', 'Lumbre Cosmetics: ¡quedaste en el casting!', 50, {}],
    ].sort((a, b) => a[2] - b[2]).map(([para, texto, horas, extra]) => ({ id: id(), para, texto, t: Date.now() - horas * HORA, leido: horas > 10, ...extra })),
    folio: 143,
    principal: {},   // foto que la modelo eligió como portada del board
    perfil: {},      // medidas actualizadas por la modelo
    bloqueos: { valeria: [enDias(13, 12), enDias(14, 12)] },   // días que la modelo no está disponible
    vistas: Object.fromEntries(MODELOS.map((m, i) => [m.id, Array.from({ length: 7 }, (_, d) => 4 + ((i * 7 + d * 5) % 13) + (m.id === 'valeria' ? 12 : 0))])),
  };
}

const NOMBRES = ['Lucía Ramos', 'Jorge Medina', 'Paola Núñez', 'Ricardo Soto', 'Andrea Flores', 'Carlos Ibarra', 'Mónica Vela', 'Santiago Rey', 'Elena Cano', 'Héctor Ponce', 'Gabriela León', 'Tomás Aguilar', 'Isabel Mora', 'Raúl Peña', 'Natalia Cruz', 'Fernando Ortiz'];
const EMPRESAS = ['Revista Plana', 'Norte Denim', 'Casa Ámbar', 'Lumbre Cosmetics', 'Prensa', 'Invitada', 'Hotel Cielo', 'Atelier Ruiz', 'Café Lumbre'];
function invitadosEjemplo(n, aspirantes = false) {
  return Array.from({ length: n }, (_, i) => ({
    id: id(), nombre: NOMBRES[i % NOMBRES.length], empresa: aspirantes ? 'Aspirante' : EMPRESAS[i % EMPRESAS.length],
    codigo: codigoPase(), estado: 'registrado', creada: Date.now() - (n - i) * 3 * HORA, mio: false,
  }));
}
function aspiranteEjemplo(nombre, edad, estatura, ciudad, ig, estado, horas, board = 'mujeres') {
  return { id: id(), nombre, board, edad, estatura, ciudad, ig, telefono: '222' + String(Math.floor(1e6 + Math.random() * 9e6)), fotos: [], estado, nota: '', creada: Date.now() - horas * HORA, mia: false };
}
function codigoPase() { return 'MIRA-' + Math.random().toString(36).slice(2, 6).toUpperCase(); }

// ── almacén ─────────────────────────────────────────────────────────────────
const LLAVE = 'demo_modelos_v3';
let estado = null;
const oyentes = new Set();

function leerFresco() {
  try { const t = localStorage.getItem(LLAVE); if (t) { const e = JSON.parse(t); if (e.v === 3) return e; } } catch { /* sin almacenamiento */ }
  return null;
}
function guardar() { try { localStorage.setItem(LLAVE, JSON.stringify(estado)); } catch { /* lleno o bloqueado */ } }
function avisar() { oyentes.forEach((f) => f()); }
function obtener() { if (!estado) { estado = leerFresco() || sembrar(); guardar(); } return estado; }
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === LLAVE && e.newValue) { try { estado = JSON.parse(e.newValue); avisar(); } catch { /* */ } } });
}
// cada cambio parte de lo que hay en localStorage AHORA, para no pisar a otra pestaña.
// Las acciones mutan la copia y no devuelven nada: se guarda la COPIA (antes
// se caía al original con `|| e` y todo cambio se perdía en silencio).
function cambiar(fn) { const e = leerFresco() || obtener(); const copia = structuredClone(e); estado = fn(copia) || copia; guardar(); avisar(); }

export const useAgencia = () => useSyncExternalStore((f) => { oyentes.add(f); return () => oyentes.delete(f); }, obtener);
export function reiniciarDemo() { estado = sembrar(); guardar(); avisar(); }

const YO = Math.random().toString(36).slice(2);
export function soyLider() {
  try {
    const l = JSON.parse(localStorage.getItem('demo_modelos_lider') || 'null');
    if (l && l.id !== YO && Date.now() - l.t < 15000) return false;
    localStorage.setItem('demo_modelos_lider', JSON.stringify({ id: YO, t: Date.now() }));
  } catch { /* esta pestaña simula sola */ }
  return true;
}

// tipo: solicitud | modelo | scouting | evento | dinero (el panel le pone ícono); mid: foto de la modelo
function aviso(e, para, texto, extra = {}) {
  e.avisos = [{ id: id(), para, texto, t: Date.now(), leido: false, ...extra }, ...e.avisos].slice(0, 40);
}

// ── consultas ───────────────────────────────────────────────────────────────
// la modelo con lo que ella misma actualizó (medidas, foto principal)
const conPerfil = (e, m) => ({
  ...m, ...(e.perfil?.[m.id] || {}), principal: e.principal?.[m.id] || 'book',
  // la polaroid que la modelo subió y la booker aprobó reemplaza a la de su book
  polaroidNueva: (e.polaroids?.[m.id] || []).find((p) => p.aprobada)?.src || null,
});
export const todasLasModelos = (e) => [...MODELOS, ...e.nuevas].map((m) => conPerfil(e, m));
export const modeloPorId = (e, mid) => todasLasModelos(e).find((m) => m.id === mid);
// las modelos que entraron por scouting solo tienen sus dos fotos
export const fotoDe = (m, tipo = 'book') => {
  if (tipo === 'polaroid' && m?.polaroidNueva) return m.polaroidNueva;
  return m?.foto ? (m.foto[tipo] || m.foto.book) : FOTO(m?.id, tipo);
};
export const bloqueado = (e, mid, fecha) => (e.bloqueos?.[mid] || []).some((d) => mismoDia(d, fecha));
export const nombreDe = (m) => (m ? `${m.nombre} ${m.apellido}` : '—');
export const neto = (tarifa) => Math.round(tarifa * (1 - AGENCIA.comision));
export const realizado = (t) => t.estado === 'confirmado' && t.fecha + t.horas * HORA < Date.now();

const mismoDia = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
// trabajos que chocan con una fecha (mismo día, no rechazados ni liberados)
export function choques(e, modeloId, fecha, salvo) {
  return e.trabajos.filter((t) => t.modeloId === modeloId && t.id !== salvo && mismoDia(t.fecha, fecha) && !['rechazado', 'liberado'].includes(t.estado));
}

// ── cliente ─────────────────────────────────────────────────────────────────
export function alternarFavorito(mid) {
  cambiar((e) => { e.favoritos = e.favoritos.includes(mid) ? e.favoritos.filter((x) => x !== mid) : [...e.favoritos, mid]; });
}
export function vaciarPackage() { cambiar((e) => { e.favoritos = []; }); }

export function enviarSolicitud(datos, { mia = true } = {}) {
  let folio;
  cambiar((e) => {
    folio = `SOL-0${e.folio++}`;
    e.solicitudes.unshift({ id: id(), folio, ...datos, lugar: datos.lugar?.trim() || 'Lugar por confirmar', estado: 'nueva', creada: Date.now(), mia, cotizacion: null });
    if (mia) e.favoritos = [];
    aviso(e, 'booker', `${datos.marca} pidió ${datos.tipo === 'casting' ? 'un casting' : 'un booking'} (${datos.modelos.length} modelos)`, { tipo: 'solicitud' });
  });
  return folio;
}

// el cliente acepta la cotización → todo confirmado
export function aceptarCotizacion(sid) {
  cambiar((e) => {
    const s = e.solicitudes.find((x) => x.id === sid);
    if (!s || s.estado !== 'cotizada') return;
    s.estado = 'confirmada';
    // solo quien entró en la cotización que el cliente aceptó (revisión de
    // Codex, 22-oct): si otra modelo aceptó después, se libera, no se cuela
    const cotizadas = new Set((s.cotizacion?.lineas || []).map((l) => l.modeloId));
    e.trabajos.forEach((t) => {
      if (t.solicitud !== sid) return;
      if (t.estado === 'aceptado' && cotizadas.has(t.modeloId)) { t.estado = 'confirmado'; aviso(e, t.modeloId, `Confirmado: ${s.marca} · ${t.tipo} el ${fechaCorta(t.fecha)}`); }
      else if (['opcion', 'rechazado', 'aceptado'].includes(t.estado)) {
        if (t.estado === 'aceptado') aviso(e, t.modeloId, `Se liberó la opción de ${s.marca}: el cliente cerró con otra modelo`);
        t.estado = 'liberado';
      }
    });
    aviso(e, 'booker', `${s.marca} aceptó la cotización ${s.folio}`, { tipo: 'dinero' });
  });
}
export function rechazarCotizacion(sid) {
  cambiar((e) => {
    const s = e.solicitudes.find((x) => x.id === sid);
    if (!s) return;
    s.estado = 'cancelada';
    e.trabajos.forEach((t) => { if (t.solicitud === sid && !['rechazado'].includes(t.estado)) { t.estado = 'liberado'; aviso(e, t.modeloId, `Se liberó la opción de ${s.marca}`); } });
    aviso(e, 'booker', `${s.marca} no aceptó la cotización ${s.folio}`, { tipo: 'solicitud' });
  });
}

// ── booker ──────────────────────────────────────────────────────────────────
// manda la opción a cada modelo (crea un trabajo "opcion" por modelo)
export function mandarOpciones(sid, tarifas) {
  cambiar((e) => {
    const s = e.solicitudes.find((x) => x.id === sid);
    if (!s || s.estado !== 'nueva') return;
    s.estado = 'en_opcion';
    s.modelos.forEach((mid) => {
      const tarifa = s.tipo === 'casting' ? 0 : Number(tarifas?.[mid] ?? modeloPorId(e, mid)?.tarifa ?? 0);
      e.trabajos.push({
        id: id(), modeloId: mid, marca: s.marca, proyecto: s.proyecto, tipo: s.trabajo, fecha: s.fecha, horas: s.horas,
        lugar: s.lugar, tarifa, estado: 'opcion', cobrado: false, liquidado: false, solicitud: sid, nota: '',
      });
      aviso(e, mid, `Nueva opción: ${s.marca} · ${s.trabajo} el ${fechaCorta(s.fecha)}`);
    });
  });
}

// casting: no hay cotización, la booker lo confirma con quienes aceptaron
export function confirmarCasting(sid) {
  cambiar((e) => {
    const s = e.solicitudes.find((x) => x.id === sid);
    if (!s) return;
    s.estado = 'confirmada';
    e.trabajos.forEach((t) => {
      if (t.solicitud !== sid) return;
      if (t.estado === 'aceptado') { t.estado = 'confirmado'; aviso(e, t.modeloId, `Casting confirmado: ${s.marca} el ${fechaCorta(t.fecha)}`); }
      else if (t.estado === 'opcion') t.estado = 'liberado';
    });
  });
}

export function cotizar(sid) {
  cambiar((e) => {
    const s = e.solicitudes.find((x) => x.id === sid);
    if (!s) return;
    const lineas = e.trabajos.filter((t) => t.solicitud === sid && t.estado === 'aceptado')
      .map((t) => ({ modeloId: t.modeloId, tarifa: t.tarifa }));
    if (!lineas.length) return;
    const subtotal = lineas.reduce((a, l) => a + l.tarifa, 0);
    s.cotizacion = { lineas, subtotal, iva: Math.round(subtotal * AGENCIA.iva), total: Math.round(subtotal * (1 + AGENCIA.iva)), t: Date.now() };
    s.estado = 'cotizada';
    if (!s.mia) {
      // el cliente simulado contesta solo en unos segundos
      s.autoAceptar = Date.now() + 9000;
    }
  });
}
export function descartarSolicitud(sid) {
  cambiar((e) => {
    const s = e.solicitudes.find((x) => x.id === sid);
    if (!s) return;
    s.estado = 'cancelada';
    e.trabajos.forEach((t) => { if (t.solicitud === sid && ['opcion', 'aceptado'].includes(t.estado)) t.estado = 'liberado'; });
  });
}

export function marcarCobrado(tid) { cambiar((e) => { const t = e.trabajos.find((x) => x.id === tid); if (t) t.cobrado = true; }); }
export function liquidar(tid) {
  cambiar((e) => {
    const t = e.trabajos.find((x) => x.id === tid);
    if (!t || !t.cobrado) return;
    t.liquidado = true;
    aviso(e, t.modeloId, `Te depositamos ${dinero(neto(t.tarifa))} por ${t.marca}`);
  });
}

// ── modelo ──────────────────────────────────────────────────────────────────
export function responderOpcion(tid, acepta, nota = '') {
  cambiar((e) => {
    const t = e.trabajos.find((x) => x.id === tid);
    if (!t || t.estado !== 'opcion') return;
    // opción sembrada sin solicitud: aceptarla la confirma directo
    t.estado = acepta ? (t.solicitud ? 'aceptado' : 'confirmado') : 'rechazado';
    t.nota = nota;
    const m = modeloPorId(e, t.modeloId);
    aviso(e, 'booker', `${m?.nombre || 'Modelo'} ${acepta ? 'aceptó' : 'rechazó'} ${t.marca} · ${t.tipo}${nota ? ` ("${nota}")` : ''}`, { tipo: 'modelo', mid: t.modeloId });
  });
}
export function subirPolaroid(mid, dataUrl) {
  cambiar((e) => { e.polaroids[mid] = [{ id: id(), src: dataUrl, t: Date.now(), aprobada: false }, ...(e.polaroids[mid] || [])].slice(0, 6); aviso(e, 'booker', `${modeloPorId(e, mid)?.nombre} subió polaroids nuevas`, { tipo: 'modelo', mid }); });
}
export function aprobarPolaroid(mid, pid) {
  cambiar((e) => { const p = (e.polaroids[mid] || []).find((x) => x.id === pid); if (p) { p.aprobada = true; aviso(e, mid, 'La agencia aprobó tu polaroid: ya está en tu book'); } });
}
export function elegirPrincipal(mid, tipo) { cambiar((e) => { e.principal[mid] = tipo; }); }
export function actualizarPerfil(mid, cambios) {
  cambiar((e) => { e.perfil[mid] = { ...(e.perfil[mid] || {}), ...cambios }; aviso(e, 'booker', `${modeloPorId(e, mid)?.nombre} actualizó sus medidas`, { tipo: 'modelo', mid }); });
}
export function alternarBloqueo(mid, fecha) {
  cambiar((e) => {
    const l = e.bloqueos[mid] || [];
    e.bloqueos[mid] = l.some((d) => mismoDia(d, fecha)) ? l.filter((d) => !mismoDia(d, fecha)) : [...l, fecha];
  });
}
export function registrarVista(mid) {
  cambiar((e) => { const v = e.vistas[mid]; if (v) v[v.length - 1] += 1; });
}
export function marcarLeidos(para) { cambiar((e) => { e.avisos.forEach((a) => { if (a.para === para) a.leido = true; }); }); }

// ── eventos ─────────────────────────────────────────────────────────────────
export function registrarseEvento(eid, datos, { mio = true } = {}) {
  let pase;
  cambiar((e) => {
    const ev = e.eventos.find((x) => x.id === eid);
    if (!ev) return;
    pase = { id: id(), ...datos, codigo: codigoPase(), estado: 'registrado', creada: Date.now(), mio };
    ev.invitados.unshift(pase);
    if (mio) e.misRegistros.push({ evento: eid, pase: pase.id });
  });
  return pase;
}
export function marcarLlegada(eid, pid) {
  cambiar((e) => { const p = e.eventos.find((x) => x.id === eid)?.invitados.find((x) => x.id === pid); if (p) p.estado = p.estado === 'llegó' ? 'registrado' : 'llegó'; });
}
// busca un pase por código (lo que teclea el lector USB en la puerta)
export function llegadaPorCodigo(eid, codigo) {
  let hallado = null;
  cambiar((e) => {
    const p = e.eventos.find((x) => x.id === eid)?.invitados.find((x) => x.codigo === codigo.trim().toUpperCase());
    if (p) { hallado = { ...p, yaEstaba: p.estado === 'llegó' }; p.estado = 'llegó'; }
  });
  return hallado;
}
export function convocar(eid, mid) {
  cambiar((e) => {
    const ev = e.eventos.find((x) => x.id === eid);
    if (!ev) return;
    if (ev.convocadas[mid]) delete ev.convocadas[mid];
    else { ev.convocadas[mid] = 'pendiente'; aviso(e, mid, `Te convocaron a ${ev.titulo}`); }
  });
}
export function responderConvocatoria(eid, mid, si) {
  cambiar((e) => {
    const ev = e.eventos.find((x) => x.id === eid);
    if (!ev || !ev.convocadas[mid]) return;
    ev.convocadas[mid] = si ? 'confirmada' : 'no';
    aviso(e, 'booker', `${modeloPorId(e, mid)?.nombre} ${si ? 'confirmó' : 'no puede ir a'} ${ev.titulo}`, { tipo: 'evento', mid });
  });
}
export function crearEvento(datos) {
  cambiar((e) => {
    e.eventos.push({ id: id(), foto: '/modelos/mira/evento-campana.webp', convocadas: {}, invitados: [], ...datos });
  });
}

// ── scouting ────────────────────────────────────────────────────────────────
export function postularse(datos) {
  let nueva;
  cambiar((e) => {
    nueva = { id: id(), ...datos, estado: 'nueva', nota: '', creada: Date.now(), mia: true };
    e.aspirantes.unshift(nueva);
    aviso(e, 'booker', `Nueva postulación: ${datos.nombre}, ${datos.estatura} cm, ${datos.ciudad}`, { tipo: 'scouting' });
  });
  return nueva;
}
export function moverAspirante(aid, estadoNuevo, nota = '') {
  cambiar((e) => {
    const a = e.aspirantes.find((x) => x.id === aid);
    if (!a) return;
    a.estado = estadoNuevo; a.nota = nota;
    if (estadoNuevo === 'casting') {
      const ev = e.eventos.find((x) => x.tipo === 'Casting abierto');
      if (ev && !ev.invitados.some((p) => p.aspirante === aid)) {
        ev.invitados.unshift({ id: id(), nombre: a.nombre, empresa: 'Aspirante', codigo: codigoPase(), estado: 'registrado', creada: Date.now(), mio: a.mia, aspirante: aid });
      }
    }
    if (estadoNuevo === 'firmada' && !e.nuevas.some((m) => m.id === `n-${aid}`)) {
      const [nombre, ...resto] = a.nombre.split(' ');
      e.nuevas.push({
        id: `n-${aid}`, nombre, apellido: resto.join(' '), num: String(200 + e.nuevas.length), board: a.board || 'mujeres',
        estatura: a.estatura, medidas: a.medidas || [0, 0, 0], calzado: a.calzado || '—', ojos: a.ojos || '—', cabello: a.cabello || '—',
        ciudad: a.ciudad, categorias: ['New faces'], idiomas: 'Español', ig: a.ig, tarifa: 6000,
        bio: 'Recién firmada desde el scouting en línea.', foto: a.fotos?.[0] ? { book: a.fotos[0], polaroid: a.fotos[1] || a.fotos[0] } : null,
      });
    }
  });
}

// ── simulación: el negocio se mueve solo mientras lo enseñas ────────────────
const MARCAS_SIM = [
  ['Joyería Plata Fina', 'Catálogo de anillos', 'Sesión', 'booking'],
  ['Tenis Ruta', 'Redes · lanzamiento', 'Sesión', 'booking'],
  ['Clínica Derma', 'Antes y después · piel', 'Campaña', 'booking'],
  ['Tequila Sereno', 'Casting comercial', 'Casting', 'casting'],
];
const ASPIRANTES_SIM = [['Regina Paz', 20, 177, 'Puebla', '@reginapaz'], ['Óscar Molina', 22, 187, 'CDMX', '@oscarmolina', 'hombres'], ['Valentina Rojo', 18, 175, 'Cholula', '@vale.rojo'], ['Karla Ibáñez', 23, 174, 'Tehuacán', '@karlaib']];
let paso = 0;
export function simular() {
  const e0 = obtener();
  // los clientes simulados aceptan su cotización solos
  const pendiente = e0.solicitudes.find((s) => s.estado === 'cotizada' && !s.mia && s.autoAceptar && s.autoAceptar < Date.now());
  if (pendiente) { aceptarCotizacion(pendiente.id); return; }
  // las otras modelos contestan sus opciones solas (Valeria la contestas tú)
  const opcion = e0.trabajos.find((t) => t.estado === 'opcion' && t.modeloId !== YO_MODELO && t.solicitud);
  if (opcion && Math.random() < 0.7) { responderOpcion(opcion.id, Math.random() < 0.85); return; }

  paso += 1;
  if (paso % 3 === 0) {
    const [nombre, edad, estatura, ciudad, ig, board] = ASPIRANTES_SIM[(paso / 3) % ASPIRANTES_SIM.length | 0];
    if (!e0.aspirantes.some((a) => a.nombre === nombre)) {
      cambiar((e) => { e.aspirantes.unshift({ ...aspiranteEjemplo(nombre, edad, estatura, ciudad, ig, 'nueva', 0, board), creada: Date.now() }); aviso(e, 'booker', `Nueva postulación: ${nombre}, ${estatura} cm`, { tipo: 'scouting' }); });
      return;
    }
  }
  if (paso % 5 === 0 && e0.solicitudes.filter((s) => s.estado === 'nueva').length < 3) {
    const [marca, proyecto, trabajo, tipo] = MARCAS_SIM[(paso / 5) % MARCAS_SIM.length | 0];
    const pool = MODELOS.filter((m) => m.id !== YO_MODELO).map((m) => m.id).sort(() => Math.random() - 0.5).slice(0, 2);
    enviarSolicitud({
      marca, contacto: 'Contacto de ejemplo', correo: 'contacto@ejemplo.mx', telefono: '2220000000', proyecto, tipo, trabajo,
      fecha: enDias(5 + (paso % 9), 10), horas: tipo === 'casting' ? 2 : 6, lugar: 'Estudio Roma Norte, CDMX', uso: USOS[1], modelos: pool, nota: '',
    }, { mia: false });
    return;
  }
  const ev = e0.eventos.find((x) => x.publico && x.fecha > Date.now());
  if (ev && Math.random() < 0.5) {
    registrarseEvento(ev.id, { nombre: NOMBRES[(paso * 7) % NOMBRES.length], empresa: EMPRESAS[paso % EMPRESAS.length], correo: '' }, { mio: false });
  }
}

// ── formato ─────────────────────────────────────────────────────────────────
export const dinero = (n) => `$${Math.round(n).toLocaleString('es-MX')}`;
export const fechaCorta = (t) => new Date(t).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
export const fechaLarga = (t) => new Date(t).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
export const hora = (t) => new Date(t).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
export const hace = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
};
export const medidasTxt = (m) => (m.board === 'hombres'
  ? `Pecho ${m.medidas[0]} · Cintura ${m.medidas[1]} · Traje ${m.medidas[2]}`
  : `${m.medidas[0]} · ${m.medidas[1]} · ${m.medidas[2]}`);
export const estaturaTxt = (cm) => `${(cm / 100).toFixed(2)} m`;
export { DIA, HORA, mismoDia };
