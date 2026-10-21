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
// Cada cambio parte de lo que hay en localStorage AHORA (no de la copia en
// memoria): si otra pestaña escribió hace un instante y su evento `storage`
// todavía no llega, no se pisa su cambio (revisión de Codex, 20-oct).
function leerFresco() {
  try { const t = localStorage.getItem(LLAVE); if (t) { const e = JSON.parse(t); if (e.v === 1) return e; } } catch { /* sin almacenamiento */ }
  return null;
}
function cambiar(fn) { const e = leerFresco() || obtener(); estado = fn(structuredClone(e)) || e; guardar(); avisar(); }

// Solo UNA pestaña mueve a la gente simulada: con comprador y verificador
// abiertos, las dos escribían a la vez cada pocos segundos.
const YO = Math.random().toString(36).slice(2);
export function soyLider() {
  try {
    const l = JSON.parse(localStorage.getItem('demo_sorteos_lider') || 'null');
    if (l && l.id !== YO && Date.now() - l.t < 15000) return false;
    localStorage.setItem('demo_sorteos_lider', JSON.stringify({ id: YO, t: Date.now() }));
  } catch { /* sin almacenamiento: esta pestaña simula sola */ }
  return true;
}
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

// ¿El folio sigue siendo dueño de todos sus números? (un apartado liberado o
// vencido pudo pasar a otra persona mientras se subía la foto)
const vigente = (e, p) => p && (p.estado === 'apartado' || p.estado === 'revision')
  && p.numeros.every((n) => e.boletos[p.sorteo][n] === p.folio);

export function subirComprobante(folio, comprobante) {
  let ok = false;
  cambiar((e) => {
    const p = e.pedidos[folio];
    if (!vigente(e, p) || (p.estado === 'apartado' && p.vence < Date.now())) return e;
    ok = true;
    p.estado = 'revision'; p.comprobante = comprobante; p.subido = Date.now();
    evento(e, `Llegó comprobante del folio ${folio} (${p.nombre})`, 'revision');
    return e;
  });
  return ok;
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
    const p = e.pedidos[folio]; if (!vigente(e, p) || p.estado !== 'revision') return e;
    p.estado = 'pagado'; p.aprobado = Date.now(); p.auto = { clave: claveRastreo(p) }; delete p.autoListo;
    e.autoHoy = (e.autoHoy || 0) + 1;
    evento(e, `Folio ${folio} pagado solo: ${pesos(p.total)} confirmado con Banxico`, 'pagado');
    return e;
  });
}
// La comprobación queda AGENDADA en el almacén (no en un temporizador de la
// pantalla): si el comprador se va del pago, igual se termina.
export const SEGUNDOS_AUTO = 5;
export function programarAuto(folio, segundos = SEGUNDOS_AUTO) {
  cambiar((e) => { const p = e.pedidos[folio]; if (p && p.estado === 'revision') p.autoListo = Date.now() + segundos * 1000; return e; });
}
export function procesarAutos() {
  const ahora = Date.now();
  Object.values(obtener().pedidos).filter((p) => p.estado === 'revision' && p.autoListo && p.autoListo <= ahora)
    .forEach((p) => verificarAuto(p.folio));
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
    const p = e.pedidos[folio]; if (!vigente(e, p)) return e;
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
      if (subirComprobante(p.folio, { simulado: true }) && obtener().auto) {
        if (r() < 0.8) programarAuto(p.folio, 3);
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

// ── el ganador (dinámica de Lotería Nacional) ───────────────────────────────
// Últimas cifras del segundo lugar + últimas del premio mayor, de izquierda a
// derecha, SIN ajustes: el número que se ve armado es el que juega. Si el
// sorteo da oportunidades, el número se arma con las cifras de la oportunidad
// más alta (boletos 0000–9999 se leen como 00000–09999) y puede caer en un
// boleto o en la oportunidad extra de alguien. Panel y transmisión usan ESTO.
export const rangoJuego = (s) => s.total * (1 + s.oportunidades);
export const cifrasJuego = (s) => String(rangoJuego(s) - 1).length;
export function partirCifras(s) { const d = cifrasJuego(s); const b = Math.ceil(d / 2); return { a: d - b, b }; }

export function armarNumero(s, segundo, mayor) {
  const { a, b } = partirCifras(s);
  const sa = String(segundo).replace(/\D/g, '').padStart(a, '0');
  const sb = String(mayor).replace(/\D/g, '').padStart(b, '0');
  return { a1: sa.slice(0, -a), a2: sa.slice(-a), b1: sb.slice(0, -b), b2: sb.slice(-b), n: Number(sa.slice(-a) + sb.slice(-b)) };
}

export const fmtJuego = (s, n) => String(n).padStart(cifrasJuego(s), '0');

// ¿De quién es el número n? → { boleto, via: 'boleto' | 'oportunidad', pedido } o null
export function duenoDe(e, s, n) {
  if (n >= rangoJuego(s)) return null;
  let boleto = n, via = 'boleto';
  if (n >= s.total) {
    via = 'oportunidad';
    boleto = null;
    for (let x = 0; x < s.total; x++) if (oportunidadesDe(s, x).includes(n)) { boleto = x; break; }
    if (boleto == null) return null;
  }
  const folio = e.boletos[s.id][boleto];
  return { boleto, via, pedido: folio ? e.pedidos[folio] : null };
}

// Para el ensayo: resultados de lotería de práctica que arman el número n.
export function resultadosPara(s, n) {
  const { a, b } = partirCifras(s);
  const t = fmtJuego(s, n);
  const relleno = (k) => String(Math.floor(Math.random() * 10 ** k)).padStart(k, '0');
  return { segundo: relleno(5 - a > 0 ? 5 - a : 1) + t.slice(0, a), mayor: relleno(5 - b > 0 ? 5 - b : 1) + t.slice(a) };
}
