import { useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE SORTEOS — datos y lógica (sin base de datos)
//
// Toda la demo vive en el navegador (localStorage): el comprador en una pestaña
// y el verificador en otra se ven en vivo por el evento `storage`. Otros
// "compradores" simulados apartan y pagan solos para que la cuadrícula se mueva.
// Referencia funcional: elchato.com.mx (apartar → subir comprobante → el
// verificador aprueba → boleto pagado; maquinita de la suerte; oportunidades).
// ─────────────────────────────────────────────────────────────────────────────

export const NEGOCIO = {
  nombre: 'Sorteos Fortuna',
  lema: 'La suerte se arma aquí',
  whatsapp: '522220000000',
  ciudad: 'Puebla',
  permiso: 'Permiso SEGOB en trámite', // el cliente pone el suyo
  cuentas: [
    { banco: 'BBVA', titular: 'Sorteos Fortuna', clabe: '012 650 01234567890 1', tarjeta: '4152 3138 0000 0000' },
    { banco: 'Banorte', titular: 'Sorteos Fortuna', clabe: '072 650 00987654321 0', tarjeta: '5204 1600 0000 0000' },
  ],
};

export const HORAS_APARTADO = 12;
const DIA = 86400000;
const hoy = new Date();
const enDias = (d, h = 21) => { const f = new Date(hoy); f.setDate(f.getDate() + d); f.setHours(h, 0, 0, 0); return f.getTime(); };

export const SORTEOS = [
  {
    id: 'pickup',
    titulo: 'Pickup 0 KM',
    subtitulo: 'Doble cabina · lista para entregar',
    foto: '/sorteos/premio-camioneta.webp',
    fecha: enDias(6),
    total: 10000,
    precio: 99,
    paquetes: [[1, 99], [3, 270], [5, 430], [10, 800], [20, 1500], [50, 3500]],
    oportunidades: 2,
    bonos: [
      { titulo: 'Bono pronto pago', detalle: '$5,000 extra si pagas en los primeros 15 minutos' },
      { titulo: 'Bono 10+', detalle: '$10,000 extra comprando 10 boletos o más' },
    ],
    vendido: 0.38,
  },
  {
    id: 'efectivo',
    titulo: '$100,000 en efectivo',
    subtitulo: 'Transferencia directa a tu cuenta',
    foto: '/sorteos/premio-dinero.webp',
    fecha: enDias(2),
    total: 5000,
    precio: 60,
    paquetes: [[1, 60], [5, 280], [10, 520], [25, 1200]],
    oportunidades: 1,
    bonos: [{ titulo: 'Bono pronto pago', detalle: '$2,000 extra si pagas en los primeros 15 minutos' }],
    vendido: 0.71,
  },
  {
    id: 'moto',
    titulo: 'Moto deportiva',
    subtitulo: '0 km, con placas y tenencia pagada',
    foto: '/sorteos/premio-moto.webp',
    fecha: enDias(11),
    total: 3000,
    precio: 50,
    paquetes: [[1, 50], [5, 230], [10, 450]],
    oportunidades: 0,
    bonos: [],
    vendido: 0.16,
  },
];

// Sorteo ya jugado: da confianza enseñar ganadores reales.
export const GANADORES = [
  { premio: 'Celular de gama alta', foto: '/sorteos/premio-iphone.webp', numero: '0472', nombre: 'Mariana G.', lugar: 'Puebla', fecha: hoy.getTime() - 9 * DIA },
  { premio: '$50,000 en efectivo', foto: '/sorteos/premio-dinero.webp', numero: '3318', nombre: 'José Luis R.', lugar: 'Tlaxcala', fecha: hoy.getTime() - 23 * DIA },
];

export const ESTADOS = ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'];

// ── utilidades ──────────────────────────────────────────────────────────────
export const digitos = (s) => String(s.total - 1).length;
export const fmtNum = (s, n) => String(n).padStart(digitos(s), '0');
export const pesos = (n) => '$' + Math.round(n).toLocaleString('es-MX');

// precio con paquetes: el mejor paquete que quepa, luego sueltos
export function precioDe(s, n) {
  let resto = n, total = 0;
  const pk = [...s.paquetes].sort((a, b) => b[0] - a[0]);
  for (const [c, p] of pk) { while (c > 1 && resto >= c) { total += p; resto -= c; } }
  return total + resto * s.precio;
}

// Las oportunidades extra de cada boleto: números del rango alto, fijos por
// boleto (una permutación determinista), para que siempre salgan los mismos.
export function oportunidadesDe(s, n) {
  const out = [];
  for (let k = 1; k <= s.oportunidades; k++) {
    const v = (n * 7919 + k * 104729) % s.total;
    out.push(s.total * k + v);
  }
  return out;
}
export const fmtOp = (s, n) => String(n).padStart(digitos(s) + 1, '0');

function azar(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const NOMBRES = ['Juan', 'María', 'José', 'Guadalupe', 'Luis', 'Ana', 'Carlos', 'Fernanda', 'Miguel', 'Daniela', 'Jorge', 'Sofía', 'Ricardo', 'Valeria', 'Alejandro', 'Paola', 'Fernando', 'Karla', 'Roberto', 'Lupita', 'Eduardo', 'Brenda', 'Óscar', 'Diana'];
const APELLIDOS = ['Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Morales', 'Vázquez', 'Reyes', 'Torres', 'Juárez'];
const ESTADOS_CERCA = ['Puebla', 'Puebla', 'Puebla', 'Tlaxcala', 'Veracruz', 'Estado de México', 'Ciudad de México', 'Oaxaca', 'Hidalgo'];

function persona(r) {
  const tel = '22' + String(Math.floor(r() * 1e8)).padStart(8, '0');
  return { nombre: NOMBRES[Math.floor(r() * NOMBRES.length)], apellidos: APELLIDOS[Math.floor(r() * APELLIDOS.length)], lugar: ESTADOS_CERCA[Math.floor(r() * ESTADOS_CERCA.length)], tel };
}

// ── estado inicial ──────────────────────────────────────────────────────────
// boletos[sorteo] = { [numero]: folio } ; pedidos[folio] = { ... }
function sembrar() {
  const r = azar(2026);
  const boletos = {}, pedidos = {};
  let f = 1000;
  const ahora = Date.now();
  for (const s of SORTEOS) {
    boletos[s.id] = {};
    const meta = Math.floor(s.total * s.vendido);
    let puestos = 0;
    while (puestos < meta) {
      const cant = [1, 1, 2, 3, 3, 5, 5, 10, 20][Math.floor(r() * 9)];
      const nums = [];
      for (let i = 0; i < cant * 3 && nums.length < cant; i++) {
        const n = Math.floor(r() * s.total);
        if (boletos[s.id][n] == null && !nums.includes(n)) nums.push(n);
      }
      const folio = `F${f++}`;
      const p = persona(r);
      const x = r();
      const estado = x < 0.88 ? 'pagado' : x < 0.992 ? 'apartado' : 'revision';
      pedidos[folio] = {
        folio, sorteo: s.id, numeros: nums, ...p, estado,
        creado: ahora - Math.floor(r() * 5 * DIA),
        vence: ahora + Math.floor((0.1 + r() * 0.9) * HORAS_APARTADO * 3600000),
        total: precioDe(s, nums.length), simulado: true,
        ...(estado === 'revision' ? { motivo: MOTIVOS_REVISION[Math.floor(r() * MOTIVOS_REVISION.length)] } : {}),
      };
      nums.forEach((n) => { boletos[s.id][n] = folio; });
      puestos += nums.length;
    }
  }
  return { v: 1, boletos, pedidos, sig: f, eventos: [], misFolios: [], auto: true, autoHoy: 0 };
}

// ── almacén (localStorage + evento storage entre pestañas) ─────────────────
const LLAVE = 'demo_sorteos_v3';
let estado = null;
const oyentes = new Set();
function leer() {
  try { const t = localStorage.getItem(LLAVE); if (t) { const e = JSON.parse(t); if (e.v === 1) return e; } localStorage.removeItem('demo_sorteos_v1'); localStorage.removeItem('demo_sorteos_v2'); } catch { /* sin almacenamiento */ }
  return sembrar();
}
function guardar() { try { localStorage.setItem(LLAVE, JSON.stringify(estado)); } catch { /* lleno o bloqueado */ } }
function avisar() { oyentes.forEach((f) => f()); }
function obtener() { if (!estado) { estado = leer(); guardar(); } return estado; }
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === LLAVE && e.newValue) { try { estado = JSON.parse(e.newValue); avisar(); } catch { /* */ } } });
}
function cambiar(fn) { const e = obtener(); estado = fn(structuredClone(e)) || e; guardar(); avisar(); }
export const useSorteos = () => useSyncExternalStore((f) => { oyentes.add(f); return () => oyentes.delete(f); }, obtener);
export function reiniciarDemo() { estado = sembrar(); guardar(); avisar(); }

// ── acciones ────────────────────────────────────────────────────────────────
function evento(e, texto, tipo = 'info') {
  e.eventos = [{ id: Date.now() + Math.random(), t: Date.now(), texto, tipo }, ...e.eventos].slice(0, 30);
}

export function apartar(sorteoId, numeros, datos, { mio = true } = {}) {
  let folio = null;
  cambiar((e) => {
    const s = SORTEOS.find((x) => x.id === sorteoId);
    const libres = numeros.filter((n) => e.boletos[sorteoId][n] == null);
    if (!libres.length) return e;
    folio = `F${e.sig++}`;
    const ahora = Date.now();
    e.pedidos[folio] = {
      folio, sorteo: sorteoId, numeros: libres, ...datos, estado: 'apartado',
      creado: ahora, vence: ahora + HORAS_APARTADO * 3600000, total: precioDe(s, libres.length), simulado: !mio,
    };
    libres.forEach((n) => { e.boletos[sorteoId][n] = folio; });
    if (mio) e.misFolios = [folio, ...e.misFolios];
    evento(e, `${datos.nombre} de ${datos.lugar} apartó ${libres.length} boleto${libres.length > 1 ? 's' : ''} de ${s.titulo}`, mio ? 'mio' : 'info');
    return e;
  });
  return folio;
}

export function subirComprobante(folio, comprobante) {
  cambiar((e) => {
    const p = e.pedidos[folio];
    if (!p || p.estado === 'pagado') return e;
    p.estado = 'revision'; p.comprobante = comprobante; p.subido = Date.now();
    evento(e, `Llegó comprobante del folio ${folio} (${p.nombre})`, 'revision');
    return e;
  });
}

// ── comprobación automática (simulada en la demo) ───────────────────────────
// En el sistema real: una IA lee del comprobante monto, fecha, banco y clave de
// rastreo, y se consulta el CEP de Banxico. Si el pago existe, llegó a la
// cuenta del negocio, es del monto exacto y la clave no se usó antes, se
// aprueba solo; si no, pasa a revisión manual con el motivo.
export const MOTIVOS_REVISION = [
  'Depósito en efectivo: se revisa a mano',
  'El monto no coincide con el folio',
  'Banxico todavía no tiene el comprobante (reintentando)',
  'Esa clave de rastreo ya se usó en otro folio',
];
export function claveRastreo(p) { return `MBAN01${String(p.creado).slice(-6)}${p.folio.slice(1)}`; }
export function setAuto(v) { cambiar((e) => { e.auto = v; return e; }); }
export function verificarAuto(folio) {
  cambiar((e) => {
    const p = e.pedidos[folio]; if (!p || p.estado !== 'revision') return e;
    p.estado = 'pagado'; p.aprobado = Date.now(); p.auto = { clave: claveRastreo(p) };
    e.autoHoy = (e.autoHoy || 0) + 1;
    evento(e, `Folio ${folio} pagado solo: ${pesos(p.total)} confirmado con Banxico`, 'pagado');
    return e;
  });
}
export function mandarARevision(folio, motivo) {
  cambiar((e) => {
    const p = e.pedidos[folio]; if (!p) return e;
    p.motivo = motivo;
    evento(e, `Folio ${folio} a revisión: ${motivo.toLowerCase()}`, 'revision');
    return e;
  });
}

export function aprobar(folio) {
  cambiar((e) => {
    const p = e.pedidos[folio]; if (!p) return e;
    p.estado = 'pagado'; p.aprobado = Date.now();
    evento(e, `Folio ${folio} pagado: ${p.numeros.length} boleto${p.numeros.length > 1 ? 's' : ''} de ${p.nombre}`, 'pagado');
    return e;
  });
}

export function rechazar(folio) {
  cambiar((e) => {
    const p = e.pedidos[folio]; if (!p) return e;
    p.estado = 'apartado'; p.rechazado = Date.now(); delete p.comprobante;
    evento(e, `Comprobante del folio ${folio} rechazado`, 'rechazo');
    return e;
  });
}

export function liberar(folio) {
  cambiar((e) => {
    const p = e.pedidos[folio]; if (!p || p.estado === 'pagado') return e;
    p.numeros.forEach((n) => { if (e.boletos[p.sorteo][n] === folio) delete e.boletos[p.sorteo][n]; });
    p.estado = 'liberado';
    evento(e, `Se liberaron ${p.numeros.length} boletos del folio ${folio}`, 'liberado');
    return e;
  });
}

// los apartados vencidos se liberan solos
export function liberarVencidos() {
  const e = obtener();
  const ahora = Date.now();
  Object.values(e.pedidos).filter((p) => p.estado === 'apartado' && p.vence < ahora).forEach((p) => liberar(p.folio));
}

// ── la "gente" simulada ────────────────────────────────────────────────────
export function simularCompradores() {
  const r = Math.random;
  const e = obtener();
  if (r() < 0.65) {
    const s = SORTEOS[Math.floor(r() * SORTEOS.length)];
    const ocupados = e.boletos[s.id];
    const cant = [1, 1, 2, 3, 5, 10][Math.floor(r() * 6)];
    const nums = [];
    for (let i = 0; i < 50 && nums.length < cant; i++) { const n = Math.floor(r() * s.total); if (ocupados[n] == null && !nums.includes(n)) nums.push(n); }
    if (nums.length) apartar(s.id, nums, persona(r), { mio: false });
  } else {
    const pend = Object.values(e.pedidos).filter((p) => p.simulado && p.estado === 'apartado');
    const p = pend[Math.floor(r() * pend.length)];
    if (p) {
      subirComprobante(p.folio, { simulado: true });
      if (obtener().auto) {
        if (r() < 0.8) setTimeout(() => verificarAuto(p.folio), 2500);
        else mandarARevision(p.folio, MOTIVOS_REVISION[Math.floor(r() * MOTIVOS_REVISION.length)]);
      }
    }
  }
}

// ── consultas ───────────────────────────────────────────────────────────────
export function resumen(e, s) {
  let pagados = 0, apartados = 0, dinero = 0;
  const vistos = new Set();
  for (const folio of Object.values(e.boletos[s.id])) {
    const p = e.pedidos[folio];
    if (p.estado === 'pagado') pagados++; else apartados++;
    if (p.estado === 'pagado' && !vistos.has(folio)) { vistos.add(folio); dinero += p.total; }
  }
  return { pagados, apartados, libres: s.total - pagados - apartados, dinero, pct: (pagados + apartados) / s.total };
}

export function buscarPorTelefono(e, tel) {
  const t = tel.replace(/\D/g, '');
  if (t.length < 4) return [];
  return Object.values(e.pedidos).filter((p) => p.tel.endsWith(t) && p.estado !== 'liberado').sort((a, b) => b.creado - a.creado);
}

// número ganador con la dinámica de Lotería Nacional: últimas cifras del
// segundo lugar + últimas del premio mayor, de izquierda a derecha.
export function numeroGanador(s, segundo, mayor) {
  const d = digitos(s);
  const mitad = Math.ceil(d / 2);
  const a = String(segundo).replace(/\D/g, '').slice(-(d - mitad)).padStart(d - mitad, '0');
  const b = String(mayor).replace(/\D/g, '').slice(-mitad).padStart(mitad, '0');
  return Number(a + b) % s.total;
}
