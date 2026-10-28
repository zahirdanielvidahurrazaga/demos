import { useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE FLORERÍA — datos y lógica (sin base de datos) · 28-oct-2026
//
// Florería genérica "Dalia · casa floral" (Puebla) para enseñarla a cualquier
// florería; después se pinta con la marca de cada prospecto. Sitio + app:
// catálogo por ocasión, ficha con tamaño y complementos, "Arma tu ramo" tallo
// por tallo, entrega a domicilio por colonia con hora de corte, tarjeta con
// mensaje (o anónima), pago de prueba y seguimiento con foto del arreglo y de
// la entrega. Equipo: Taller (florista), Reparto y Dueño.
//
// Igual que Autocinema, Sorteos y KADE: todo vive en localStorage, las
// pestañas se ven en vivo por el evento `storage` y solo la pestaña líder
// simula a los demás clientes. Fotos hechas con Codex (public/florerias).
// ─────────────────────────────────────────────────────────────────────────────

export const NEGOCIO = {
  nombre: 'Dalia',
  completo: 'Dalia · casa floral',
  lema: 'casa floral',
  direccion: 'Av. Juárez 2915, La Paz, Puebla',
  telefono: '222 123 4567',
  horario: [['Lun a sáb', '9:00 am – 8:00 pm'], ['Domingo', '10:00 am – 3:00 pm']],
  corte: 17,          // hora límite para que llegue el mismo día
  instagram: '@dalia.casafloral',
};

export const IMG = (n) => `/florerias/${n}.webp`;

export const peso = (n) => `$${Math.round(n).toLocaleString('es-MX')}`;

// ── ocasiones ───────────────────────────────────────────────────────────────
export const OCASIONES = [
  { id: 'cumpleanos', nombre: 'Cumpleaños', foto: 'fondo-girasoles' },
  { id: 'amor', nombre: 'Amor', foto: 'fondo-rosas' },
  { id: 'aniversario', nombre: 'Aniversario', foto: 'fondo-caja' },
  { id: 'porque', nombre: 'Porque sí', foto: 'fondo-tulipanes' },
  { id: 'recuperate', nombre: 'Recupérate', foto: 'fondo-lisianthus' },
  { id: 'nacimiento', nombre: 'Nacimiento', foto: 'fondo-peonias' },
  { id: 'condolencias', nombre: 'Condolencias', foto: 'fondo-blanco' },
];
export const ocasion = (id) => OCASIONES.find((o) => o.id === id);

// ── tallos (inventario del taller y "Arma tu ramo") ─────────────────────────
export const TALLOS = [
  { id: 'rosa', nombre: 'Rosa roja', precio: 45, foto: 'corte-rosa', color: '#9E1B2B' },
  { id: 'dalia', nombre: 'Dalia vino', precio: 65, foto: 'corte-dalia', color: '#6E1F2E' },
  { id: 'tulipan', nombre: 'Tulipán loro', precio: 55, foto: 'corte-tulipan', color: '#E0672A' },
  { id: 'peonia', nombre: 'Peonía', precio: 95, foto: 'corte-peonia', color: '#E7A9B4' },
  { id: 'ranunculo', nombre: 'Ranúnculo', precio: 60, foto: 'corte-ranunculo', color: '#F0A88A' },
  { id: 'girasol', nombre: 'Girasol', precio: 50, foto: 'corte-girasol', color: '#E8B425' },
  { id: 'alcatraz', nombre: 'Alcatraz', precio: 55, foto: 'corte-alcatraz', color: '#ECE6D8' },
  { id: 'eucalipto', nombre: 'Eucalipto', precio: 25, foto: 'corte-eucalipto', color: '#8DA394' },
];
export const tallo = (id) => TALLOS.find((t) => t.id === id);
export const MIN_TALLOS = 5;
export const MAX_TALLOS = 30;

export const PAPELES = [
  { id: 'kraft', nombre: 'Kraft', color: '#C9A47A', borde: '#A9845C' },
  { id: 'vino', nombre: 'Vino', color: '#6E1F2E', borde: '#4F1420' },
  { id: 'rosa', nombre: 'Rosa palo', color: '#E9C6C2', borde: '#CFA19C' },
  { id: 'salvia', nombre: 'Salvia', color: '#A9B59C', borde: '#87957A' },
  { id: 'negro', nombre: 'Negro mate', color: '#2A2422', borde: '#141110' },
];
export const papel = (id) => PAPELES.find((p) => p.id === id) || PAPELES[0];
export const ARMADO_BASE = 120;   // papel, listón, hidratación y mano de obra

// ── catálogo ────────────────────────────────────────────────────────────────
// `tam`: tallos y precio de cada tamaño. `receta`: tallos que gasta el tamaño M
// (los otros escalan) — así el taller descuenta inventario al empezarlo.
export const PRODUCTOS = [
  { id: 'dalia', nombre: 'Dalia de autor', foto: 'fondo-dalias', ocasiones: ['aniversario', 'amor', 'porque'], flores: ['dalia', 'ranunculo'],
    etiqueta: 'De la casa', descripcion: 'El ramo que nos dio nombre: dalias vino y coral con ranúnculos durazno, follaje oscuro y ramas sueltas. Cada uno sale distinto, como debe ser.',
    tam: { S: [10, 1490], M: [18, 2190], L: [28, 2890] }, receta: { dalia: 10, ranunculo: 6, eucalipto: 2 }, papel: 'vino' },
  { id: 'pasion', nombre: 'Pasión', foto: 'fondo-rosas', ocasiones: ['amor', 'aniversario'], flores: ['rosa'],
    etiqueta: 'Más pedido', descripcion: 'Rosas rojas de tallo largo con eucalipto, envueltas en kraft con listón de seda vino. El clásico que nunca falla.',
    tam: { S: [12, 890], M: [24, 1490], L: [36, 2090] }, receta: { rosa: 24, eucalipto: 4 }, papel: 'kraft' },
  { id: 'mandarina', nombre: 'Mandarina', foto: 'fondo-tulipanes', ocasiones: ['cumpleanos', 'porque'], flores: ['tulipan'],
    descripcion: 'Tulipanes naranjas y durazno, sueltos y naturales, en papel de seda arena. Alegre sin ser escandaloso.',
    tam: { S: [10, 790], M: [20, 1190], L: [30, 1590] }, receta: { tulipan: 20 }, papel: 'kraft' },
  { id: 'nube', nombre: 'Nube rosa', foto: 'fondo-peonias', ocasiones: ['amor', 'nacimiento', 'cumpleanos'], flores: ['peonia', 'rosa'],
    descripcion: 'Peonías rosa palo y rosas de jardín en papel de seda rosa. Suave, abundante y con un perfume que llena el cuarto.',
    tam: { S: [8, 1290], M: [14, 1890], L: [20, 2490] }, receta: { peonia: 8, rosa: 6 }, papel: 'rosa' },
  { id: 'sol', nombre: 'Sol de mediodía', foto: 'fondo-girasoles', ocasiones: ['cumpleanos', 'porque', 'recuperate'], flores: ['girasol'],
    etiqueta: 'Favorito en cumpleaños', descripcion: 'Girasoles con margaritas y espigas, en kraft con listón mostaza. Para alegrarle el día a quien sea.',
    tam: { S: [6, 690], M: [12, 990], L: [18, 1390] }, receta: { girasol: 12 }, papel: 'kraft' },
  { id: 'joyero', nombre: 'Joyero', foto: 'fondo-caja', ocasiones: ['aniversario', 'amor'], flores: ['rosa'],
    descripcion: 'Caja sombrerera negra con rosas rosas y blancas en domo. Se queda en su lugar: no necesita florero.',
    tam: { S: [16, 1190], M: [25, 1690], L: [40, 2290] }, receta: { rosa: 25 }, papel: 'negro', caja: true },
  { id: 'campo', nombre: 'Campo abierto', foto: 'fondo-silvestre', ocasiones: ['porque', 'cumpleanos', 'recuperate'], flores: ['eucalipto'],
    descripcion: 'Lisianthus lavanda, alstroemerias, nube y cardos azules con hierbas. Como recién cortado del campo.',
    tam: { S: [12, 590], M: [20, 890], L: [30, 1190] }, receta: { eucalipto: 6 }, papel: 'kraft' },
  { id: 'paz', nombre: 'En paz', foto: 'fondo-blanco', ocasiones: ['condolencias'], flores: ['alcatraz', 'rosa'],
    descripcion: 'Lilis, rosas blancas y alcatraces con follaje verde oscuro, en papel salvia. Sobrio y sereno, para acompañar.',
    tam: { S: [10, 990], M: [18, 1490], L: [28, 2190] }, receta: { alcatraz: 6, rosa: 8, eucalipto: 4 }, papel: 'salvia' },
  { id: 'orquidea', nombre: 'Orquídea blanca', foto: 'fondo-orquidea', ocasiones: ['recuperate', 'condolencias', 'nacimiento'], flores: [],
    descripcion: 'Phalaenopsis blanca en maceta de barro. Dura semanas con un riego a la semana; la planta se queda para siempre.',
    tam: { S: [1, 790], M: [2, 1090] }, receta: {}, maceta: true },
  { id: 'lavanda', nombre: 'Lavanda', foto: 'fondo-lisianthus', ocasiones: ['recuperate', 'nacimiento', 'porque'], flores: ['eucalipto'],
    descripcion: 'Lisianthus lavanda y blanco con eucalipto en papel de seda lila. Tranquilo, fresco y muy duradero.',
    tam: { S: [10, 690], M: [16, 990], L: [24, 1290] }, receta: { eucalipto: 6 }, papel: 'rosa' },
];
export const producto = (id) => PRODUCTOS.find((p) => p.id === id);
export const TAMANOS = { S: 'Chico', M: 'Mediano', L: 'Grande' };
export const unidad = (p, n) => (p.maceta ? (n === 1 ? 'vara' : 'varas') : 'tallos');

export const EXTRAS = [
  { id: 'chocolates', nombre: 'Chocolates artesanales', corto: 'Chocolates', precio: 290, foto: 'extra-chocolates' },
  { id: 'globo', nombre: 'Globo corazón', corto: 'Globo', precio: 190, foto: 'extra-globo' },
  { id: 'peluche', nombre: 'Osito de peluche', corto: 'Osito', precio: 350, foto: 'extra-peluche' },
  { id: 'vino', nombre: 'Vino tinto mexicano', corto: 'Vino', precio: 590, foto: 'extra-vino' },
];
export const extra = (id) => EXTRAS.find((x) => x.id === id);

// ── entrega ─────────────────────────────────────────────────────────────────
export const ZONAS = [
  { id: 'lapaz', nombre: 'La Paz', costo: 69, min: 25 },
  { id: 'centro', nombre: 'Centro Histórico', costo: 79, min: 30 },
  { id: 'huexotitla', nombre: 'Huexotitla', costo: 69, min: 25 },
  { id: 'zavaleta', nombre: 'Zavaleta', costo: 89, min: 35 },
  { id: 'angelopolis', nombre: 'Angelópolis', costo: 99, min: 40 },
  { id: 'lomas', nombre: 'Lomas de Angelópolis', costo: 119, min: 45 },
  { id: 'cholula', nombre: 'San Andrés Cholula', costo: 109, min: 40 },
  { id: 'cuautlancingo', nombre: 'Cuautlancingo', costo: 129, min: 50 },
];
export const zona = (id) => ZONAS.find((z) => z.id === id) || ZONAS[0];

// franjas de entrega: [inicio, fin] en horas
export const FRANJAS = [[9, 13], [13, 17], [17, 21]];
export const textoFranja = ([a, b]) => `${a > 12 ? a - 12 : a}:00 – ${b > 12 ? b - 12 : b}:00 ${b >= 12 ? 'pm' : 'am'}`;
export const EXPRES = 120;   // "en 2 horas"

const DIA = 86400000;
export const inicioDia = (d = 0) => { const h = new Date(); h.setHours(0, 0, 0, 0); return h.getTime() + d * DIA; };
export const nombreDia = (d) => {
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  return new Date(inicioDia(d)).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
};
export const fechaLarga = (d) => new Date(inicioDia(d)).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

// ¿Qué franjas quedan para el día `d`? Hoy solo las que empiezan después de
// ahora + 1 h y antes del corte; el exprés vale hasta el corte.
export function franjasDe(d, ahora = Date.now()) {
  if (d > 0) return FRANJAS.map((f, i) => ({ i, f, libre: true }));
  const h = new Date(ahora).getHours() + new Date(ahora).getMinutes() / 60;
  return FRANJAS.map((f, i) => ({ i, f, libre: h < NEGOCIO.corte && f[1] - 1 > h + 1 }));
}
export const llegaHoy = (ahora = Date.now()) => franjasDe(0, ahora).some((x) => x.libre);
export const expresPosible = (ahora = Date.now()) => new Date(ahora).getHours() < NEGOCIO.corte && new Date(ahora).getHours() >= 9;
export function faltaCorte(ahora = Date.now()) {
  const c = new Date(ahora); c.setHours(NEGOCIO.corte, 0, 0, 0);
  return c.getTime() - ahora;
}
export const duracion = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
};

// ── la tarjeta ──────────────────────────────────────────────────────────────
export const MENSAJES = {
  cumpleanos: ['¡Feliz cumpleaños! Que este año te traiga tantas alegrías como pétalos.', 'Hoy celebramos que existes. ¡Felicidades!'],
  amor: ['Porque cada día contigo florece algo nuevo.', 'Te quiero más que ayer y menos que mañana.'],
  aniversario: ['Un año más eligiéndote. Feliz aniversario.', 'Gracias por cada día de esta historia juntos.'],
  porque: ['Nada más porque me acordé de ti.', 'Para alegrarte el día, porque sí.'],
  recuperate: ['Que te recuperes pronto. Aquí estamos para lo que necesites.', 'Mucha fuerza. Te mando un abrazo enorme.'],
  nacimiento: ['¡Bienvenido al mundo! Felicidades a la familia.', 'Que esta nueva vida llene su casa de amor.'],
  condolencias: ['Con todo nuestro cariño, acompañándolos en este momento.', 'Nuestro más sentido pésame. Los tenemos presentes.'],
};

// ── estados del pedido ──────────────────────────────────────────────────────
export const ESTADOS = [
  { id: 'recibido', nombre: 'Pedido recibido', corto: 'Recibido', cliente: 'Ya lo tenemos', texto: 'Tu pedido llegó al taller. En un momento empiezan a armarlo.' },
  { id: 'armando', nombre: 'Armando tu ramo', corto: 'Armando', cliente: 'Lo estamos armando', texto: 'Una florista está eligiendo cada tallo a mano.' },
  { id: 'listo', nombre: 'Listo para salir', corto: 'Listo', cliente: 'Así quedó', texto: 'Esta foto la tomó la florista antes de envolverlo para el viaje.' },
  { id: 'camino', nombre: 'En camino', corto: 'En camino', cliente: 'Va en camino', texto: 'Tu ramo ya salió y va directo a la puerta.' },
  { id: 'entregado', nombre: 'Entregado', corto: 'Entregado', cliente: 'Entregado', texto: 'Llegó perfecto. Aquí está la foto de la entrega.' },
];
export const estado = (id) => ESTADOS.find((s) => s.id === id);
export const pasoDe = (id) => ESTADOS.findIndex((s) => s.id === id);
export const REPARTIDORES = ['Toño', 'Gaby'];

export const CLIENTE = { nombre: 'Karime Pérez', iniciales: 'KP', telefono: '222 555 0142' };

// ── precios ─────────────────────────────────────────────────────────────────
export function precioProducto(e, p, tam) {
  const base = p.tam[tam]?.[1] ?? 0;
  return base + (e?.catalogo?.[p.id]?.ajuste || 0);
}
export const precioArmado = (tallos) => ARMADO_BASE + Object.entries(tallos).reduce((n, [id, q]) => n + tallo(id).precio * q, 0);
export const cuantosTallos = (tallos) => Object.values(tallos).reduce((n, q) => n + q, 0);
export const precioItem = (e, it) => {
  const flores = it.tipo === 'armado' ? precioArmado(it.tallos) : precioProducto(e, producto(it.id), it.tam);
  return flores + (it.extras || []).reduce((n, x) => n + extra(x).precio, 0);
};
export const subtotal = (e, items) => items.reduce((n, it) => n + precioItem(e, it), 0);
export const nombreItem = (it) => (it.tipo === 'armado' ? 'Ramo a tu gusto' : producto(it.id).nombre);
export const fotoItem = (it) => (it.tipo === 'armado' ? 'escena-taller' : producto(it.id).foto);
export function detalleItem(it) {
  if (it.tipo === 'armado') {
    return `${cuantosTallos(it.tallos)} tallos · papel ${papel(it.papel).nombre.toLowerCase()}`;
  }
  const p = producto(it.id);
  return `${TAMANOS[it.tam]} · ${p.tam[it.tam][0]} ${unidad(p, p.tam[it.tam][0])}`;
}
// tallos que gasta un renglón (para el inventario del taller)
export function tallosDe(it) {
  if (it.tipo === 'armado') return it.tallos;
  const p = producto(it.id);
  const f = p.tam[it.tam][0] / (p.tam.M?.[0] || 1);
  return Object.fromEntries(Object.entries(p.receta).map(([k, v]) => [k, Math.max(1, Math.round(v * f))]));
}

// ── sembrar ─────────────────────────────────────────────────────────────────
const NOMBRES = ['Andrea Ruiz', 'Luis Hernández', 'Paola Méndez', 'Jorge Castillo', 'Fernanda Ortiz', 'Ricardo Salas', 'Mónica Aguilar', 'Daniel Rosas', 'Sofía Lara', 'Héctor Morales', 'Valeria Cruz', 'Emilio Torres'];
const RECIBEN = ['Lucía Ramírez', 'Mamá', 'Ana Sofía', 'Mariana Flores', 'Familia Gutiérrez', 'Dra. Patricia León', 'Carmen Vega', 'Isabel Romero', 'Abuela Rosa', 'Daniela Soto'];
const CALLES = ['Calle 23 Sur 1904', 'Av. 31 Poniente 2502', 'Blvd. Atlixcáyotl 5208', 'Calle 5 de Mayo 412', 'Privada Las Ánimas 18', 'Av. Zavaleta 3110', 'Calle 14 Oriente 207', 'Circuito Juan Pablo II 1580', 'Calle Morelos 33', 'Av. Kepler 2143'];
const azar = (a) => a[Math.floor(Math.random() * a.length)];
const id = () => Math.random().toString(36).slice(2, 9);
let folio = 2400;

function pedidoAzar(estadoId, t = Date.now(), dia = 0) {
  const p = azar(PRODUCTOS.filter((x) => x.id !== 'campo' || Math.random() < 0.5));
  const tams = Object.keys(p.tam);
  const it = { tipo: 'producto', id: p.id, tam: azar(tams), extras: Math.random() < 0.35 ? [azar(EXTRAS).id] : [] };
  const z = azar(ZONAS);
  const oc = azar(p.ocasiones);
  const fr = dia === 0 ? franjasDe(0, t).filter((x) => x.libre).map((x) => x.i) : [0, 1, 2];
  const pe = {
    id: id(), folio: ++folio, t, mio: false, cliente: azar(NOMBRES), recibe: azar(RECIBEN), tel: `222 ${100 + Math.floor(Math.random() * 899)} ${1000 + Math.floor(Math.random() * 8999)}`,
    zona: z.id, direccion: azar(CALLES), referencia: '', dia: inicioDia(dia), franja: fr.length ? azar(fr) : 2, expres: false,
    items: [it], ocasion: oc, mensaje: azar(MENSAJES[oc]), firma: Math.random() < 0.2 ? '' : azar(NOMBRES).split(' ')[0], anonimo: Math.random() < 0.15,
    envio: z.costo, estado: estadoId, historial: { recibido: t }, repartidor: null, recibio: null,
  };
  pe.total = precioItem(null, it) + pe.envio;
  return pe;
}

function sembrar() {
  const ahora = Date.now();
  folio = 2400 + Math.floor(Math.random() * 30);
  const pedidos = [];
  const avanzar = (pe, hasta, cada) => {
    let t = pe.t;
    for (let i = 1; i <= pasoDe(hasta); i++) { t += cada; pe.historial[ESTADOS[i].id] = Math.min(t, ahora - 60000); }
    pe.estado = hasta;
    if (pasoDe(hasta) >= 2) pe.fotoArreglo = producto(pe.items[0].id)?.foto;
    if (pasoDe(hasta) >= 3) pe.repartidor = azar(REPARTIDORES);
    if (hasta === 'entregado') { pe.recibio = pe.recibe; pe.fotoEntrega = 'escena-entrega'; }
  };
  // la mañana de hoy: unos entregados, otros en proceso
  const plan = ['entregado', 'entregado', 'entregado', 'entregado', 'camino', 'listo', 'armando', 'recibido', 'recibido'];
  plan.forEach((s, i) => {
    const t = ahora - (plan.length - i) * 38 * 60000;
    const pe = pedidoAzar('recibido', t, 0);
    avanzar(pe, s, 22 * 60000);
    pedidos.push(pe);
  });
  // para mañana, programados
  for (let i = 0; i < 4; i++) pedidos.push(pedidoAzar('recibido', ahora - (i + 1) * 3600000, 1));

  // uno mío de hace dos semanas, entregado (para "repetir" y para la fecha)
  const viejo = pedidoAzar('recibido', ahora - 13 * DIA, 0);
  Object.assign(viejo, {
    mio: true, cliente: CLIENTE.nombre, recibe: 'Lucía Ramírez', zona: 'huexotitla', direccion: 'Calle 23 Sur 1904, int. 3', referencia: 'Portón verde',
    dia: inicioDia(-13), franja: 1, items: [{ tipo: 'producto', id: 'mandarina', tam: 'M', extras: ['chocolates'] }], ocasion: 'cumpleanos',
    mensaje: '¡Feliz cumpleaños, Lu! Que este año te traiga tantas alegrías como pétalos.', firma: 'Karime', anonimo: false, envio: 69,
  });
  viejo.total = precioItem(null, viejo.items[0]) + viejo.envio;
  avanzar(viejo, 'entregado', 30 * 60000);
  viejo.recibio = 'Lucía Ramírez';
  pedidos.push(viejo);

  // ventas de los últimos 30 días (para el tablero del dueño)
  const historia = [];
  for (let d = 30; d >= 1; d--) {
    const dia = new Date(inicioDia(-d));
    const finde = dia.getDay() === 6 || dia.getDay() === 5;
    const n = Math.round((finde ? 17 : 11) + Math.random() * 6);
    historia.push({ dia: inicioDia(-d), pedidos: n, ventas: n * Math.round(1150 + Math.random() * 260) });
  }

  return {
    v: 2,
    dia: inicioDia(0),
    pedidos,
    historia,
    inventario: { rosa: 210, dalia: 64, tulipan: 90, peonia: 22, ranunculo: 48, girasol: 55, alcatraz: 40, eucalipto: 120 },
    catalogo: {},           // { [id]: { agotado, ajuste } }
    carrito: [],
    zonaElegida: null,
    fechas: [
      { id: 'f1', quien: 'Mamá', motivo: 'Cumpleaños', dia: diaDe(18), mes: mesDe(18) },
      { id: 'f2', quien: 'Lucía', motivo: 'Cumpleaños', dia: diaDe(-13 + 365), mes: mesDe(-13 + 365) },
      { id: 'f3', quien: 'Aniversario con Dani', motivo: 'Aniversario', dia: diaDe(47), mes: mesDe(47) },
    ],
    direcciones: [
      { id: 'd1', etiqueta: 'Mamá', recibe: 'Carmen Pérez', tel: '222 318 4420', zona: 'lapaz', direccion: 'Calle Teziutlán Sur 31', referencia: 'Casa blanca con buganvilia' },
      { id: 'd2', etiqueta: 'Lucía', recibe: 'Lucía Ramírez', tel: '222 401 7786', zona: 'huexotitla', direccion: 'Calle 23 Sur 1904, int. 3', referencia: 'Portón verde' },
    ],
  };
}
function diaDe(d) { return new Date(inicioDia(d)).getDate(); }
function mesDe(d) { return new Date(inicioDia(d)).getMonth(); }

// ── almacén ─────────────────────────────────────────────────────────────────
const LLAVE = 'demo_florerias_v2';
let estadoActual = null;
const oyentes = new Set();
function leerFresco() {
  try { const t = localStorage.getItem(LLAVE); if (t) { const e = JSON.parse(t); if (e.v === 2) return e; } } catch { /* sin almacenamiento */ }
  return null;
}
function guardar() { try { localStorage.setItem(LLAVE, JSON.stringify(estadoActual)); } catch { /* lleno o bloqueado */ } }
function avisar() { oyentes.forEach((f) => f()); }
function obtener() {
  if (!estadoActual) {
    estadoActual = leerFresco();
    // los pedidos son "de hoy": si cambió el día, se vuelve a sembrar
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

export const useFlores = () => useSyncExternalStore((f) => { oyentes.add(f); return () => oyentes.delete(f); }, obtener);
export function reiniciarDemo() { estadoActual = sembrar(); guardar(); avisar(); }

const YO = Math.random().toString(36).slice(2);
export function soyLider() {
  try {
    const l = JSON.parse(localStorage.getItem('demo_florerias_lider') || 'null');
    if (l && l.id !== YO && Date.now() - l.t < 15000) return false;
    localStorage.setItem('demo_florerias_lider', JSON.stringify({ id: YO, t: Date.now() }));
  } catch { /* esta pestaña simula sola */ }
  return true;
}

// ── consultas ───────────────────────────────────────────────────────────────
export const agotado = (e, pid) => !!e.catalogo?.[pid]?.agotado;
export const misPedidos = (e) => e.pedidos.filter((p) => p.mio).sort((a, b) => b.t - a.t);
export const pedidoPorId = (e, pid) => e.pedidos.find((p) => p.id === pid);
export const deHoy = (e) => e.pedidos.filter((p) => p.dia === inicioDia(0));
export const activos = (e) => e.pedidos.filter((p) => p.estado !== 'entregado' && p.dia <= inicioDia(0));
export const horaDe = (t) => new Date(t).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
// minutos que faltan para que cierre la franja de entrega (negativo = tarde)
export function margen(p, ahora = Date.now()) {
  const fin = p.expres ? p.t + 2 * 3600000 : p.dia + FRANJAS[p.franja][1] * 3600000;
  return Math.round((fin - ahora) / 60000);
}
export const textoEntrega = (p) => (p.expres ? `Exprés · antes de las ${horaDe(p.t + 2 * 3600000)}` : `${nombreDia(Math.round((p.dia - inicioDia(0)) / DIA))} · ${textoFranja(FRANJAS[p.franja])}`);

export function proximaFecha(f) {
  const hoy = new Date(inicioDia(0));
  let d = new Date(hoy.getFullYear(), f.mes, f.dia);
  if (d.getTime() < hoy.getTime()) d = new Date(hoy.getFullYear() + 1, f.mes, f.dia);
  return { t: d.getTime(), dias: Math.round((d.getTime() - inicioDia(0)) / DIA) };
}

// ── acciones del cliente ────────────────────────────────────────────────────
export const elegirZona = (z) => cambiar((e) => { e.zonaElegida = z; });
export const agregarAlCarrito = (it) => cambiar((e) => { e.carrito.push({ ...it, key: id() }); });
export const quitarDelCarrito = (key) => cambiar((e) => { e.carrito = e.carrito.filter((x) => x.key !== key); });
export const vaciarCarrito = () => cambiar((e) => { e.carrito = []; });

// ¿Se puede entregar así? (la franja o el exprés pudieron vencer mientras
// llenaba los pasos: se revisa otra vez al pagar)
export function entregaValida(datos, ahora = Date.now()) {
  if (datos.expres) return datos.dia === 0 && expresPosible(ahora);
  return !!franjasDe(datos.dia, ahora)[datos.franja]?.libre;
}
export const conAgotados = (e, items) => items.filter((it) => it.tipo === 'producto' && agotado(e, it.id));

// Regresa el id del pedido, o { error } si ya no se puede (carrito vacío —otra
// pestaña ya pagó—, algo se agotó o la hora de entrega ya no alcanza).
export function pagarPedido(datos) {
  return cambiar((e) => {
    if (!e.carrito.length) return { error: 'vacio' };
    if (conAgotados(e, e.carrito).length) return { error: 'agotado' };
    if (!entregaValida(datos)) return { error: 'horario' };
    const z = zona(datos.zona);
    const items = e.carrito.map((it) => { const { key: _k, ...resto } = it; return resto; });
    const pe = {
      id: id(), folio: Math.max(2400, ...e.pedidos.map((p) => p.folio)) + 1, t: Date.now(), mio: true, cliente: CLIENTE.nombre,
      recibe: datos.recibe, tel: datos.tel, zona: z.id, direccion: datos.direccion, referencia: datos.referencia || '',
      dia: inicioDia(datos.dia), franja: datos.franja, expres: !!datos.expres, items, ocasion: datos.ocasion,
      mensaje: datos.mensaje, firma: datos.firma, anonimo: datos.anonimo,
      envio: z.costo + (datos.expres ? EXPRES : 0), estado: 'recibido', historial: { recibido: Date.now() }, repartidor: null, recibio: null,
    };
    pe.total = subtotal(e, items) + pe.envio;
    e.pedidos.push(pe);
    e.carrito = [];
    e.zonaElegida = z.id;
    if (datos.guardarDireccion && !e.direcciones.some((d) => d.direccion === datos.direccion)) {
      e.direcciones.push({ id: id(), etiqueta: datos.recibe.split(' ')[0], recibe: datos.recibe, tel: datos.tel, zona: z.id, direccion: datos.direccion, referencia: datos.referencia || '' });
    }
    return pe.id;
  });
}
export const repetirPedido = (pid) => cambiar((e) => {
  const p = pedidoPorId(e, pid);
  p?.items.filter((it) => !(it.tipo === 'producto' && agotado(e, it.id))).forEach((it) => e.carrito.push({ ...it, key: id() }));
});
export const agregarFecha = (f) => cambiar((e) => { e.fechas.push({ ...f, id: id() }); });
export const quitarFecha = (fid) => cambiar((e) => { e.fechas = e.fechas.filter((f) => f.id !== fid); });

// ── acciones del equipo ─────────────────────────────────────────────────────
function moverA(p, s, extra = {}) {
  p.estado = s;
  p.historial[s] = Date.now();
  Object.assign(p, extra);
}
export const empezarPedido = (pid) => cambiar((e) => {
  const p = pedidoPorId(e, pid);
  if (!p || p.estado !== 'recibido') return;
  p.items.forEach((it) => Object.entries(tallosDe(it)).forEach(([k, q]) => { e.inventario[k] = Math.max(0, (e.inventario[k] || 0) - q); }));
  moverA(p, 'armando');
});
export const terminarPedido = (pid) => cambiar((e) => {
  const p = pedidoPorId(e, pid);
  if (!p || p.estado !== 'armando') return;
  moverA(p, 'listo', { fotoArreglo: fotoItem(p.items[0]) });
});
export const salirPedido = (pid, quien) => cambiar((e) => {
  const p = pedidoPorId(e, pid);
  if (!p || p.estado !== 'listo') return;
  moverA(p, 'camino', { repartidor: quien });
});
export const entregarPedido = (pid, recibio) => cambiar((e) => {
  const p = pedidoPorId(e, pid);
  if (!p || p.estado !== 'camino') return;
  moverA(p, 'entregado', { recibio: recibio || p.recibe, fotoEntrega: 'escena-entrega' });
});
export const surtir = (tid, n) => cambiar((e) => { e.inventario[tid] = (e.inventario[tid] || 0) + n; });
export const alternarAgotado = (pid) => cambiar((e) => { const c = e.catalogo[pid] || {}; e.catalogo[pid] = { ...c, agotado: !c.agotado }; });
export const ajustarPrecio = (pid, d) => cambiar((e) => {
  const c = e.catalogo[pid] || {};
  const piso = -Math.floor(producto(pid).tam.S[1] / 2);   // nunca menos de la mitad del chico
  e.catalogo[pid] = { ...c, ajuste: Math.max(piso, (c.ajuste || 0) + d) };
});

// ── la gente simulada ───────────────────────────────────────────────────────
// Cada 7–14 s la pestaña líder: a veces entra un pedido nuevo de otro cliente
// y a veces avanza uno. Los de la clienta de la demo también avanzan solos
// (más despacio) para que el seguimiento se vea sin abrir otra pestaña; desde
// Taller y Reparto se pueden adelantar a mano.
export function simular() {
  cambiar((e) => {
    const ahora = Date.now();
    // el proveedor resurte solo lo que se está acabando (en una presentación no
    // debe salir agotada la flor estrella; a mano se ve con el + del Taller)
    Object.keys(e.inventario).forEach((k) => { if (e.inventario[k] < 12 && Math.random() < 0.35) e.inventario[k] += 60; });
    const vivos = e.pedidos.filter((p) => p.estado !== 'entregado' && p.dia <= inicioDia(0));
    // tope de un día real (~20): con la pestaña abierta horas, la gráfica del dueño dejaba de ser creíble
    const hoyN = e.pedidos.filter((p) => !p.mio && p.t >= inicioDia(0)).length;
    if (Math.random() < 0.3 && vivos.filter((p) => !p.mio).length < 9 && hoyN < 20 && llegaHoy(ahora)) {
      const pe = pedidoAzar('recibido', ahora, 0);
      pe.folio = Math.max(...e.pedidos.map((p) => p.folio)) + 1;
      e.pedidos.push(pe);
    }
    const listos = vivos.filter((p) => ahora - (p.historial[p.estado] || p.t) > (p.mio ? 35000 : 70000));
    const mios = listos.filter((p) => p.mio);
    const p = mios[0] || (Math.random() < 0.6 ? azar(listos) : null);
    if (!p) return;
    const sig = ESTADOS[pasoDe(p.estado) + 1]?.id;
    if (sig === 'armando') {
      p.items.forEach((it) => Object.entries(tallosDe(it)).forEach(([k, q]) => { e.inventario[k] = Math.max(0, (e.inventario[k] || 0) - q); }));
      moverA(p, 'armando');
    } else if (sig === 'listo') moverA(p, 'listo', { fotoArreglo: fotoItem(p.items[0]) });
    else if (sig === 'camino') moverA(p, 'camino', { repartidor: azar(REPARTIDORES) });
    else if (sig === 'entregado') moverA(p, 'entregado', { recibio: p.recibe, fotoEntrega: 'escena-entrega' });
  });
}
