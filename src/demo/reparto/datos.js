import { useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE REPARTO DE CERVEZA — /reparto/malta (22-nov-2026)
//
// Prospecto: el hermano de Carlos, reparte cerveza a restaurantes con
// repartidores y recibe TODOS los pedidos por WhatsApp normal (no Business, y no
// lo quiere cambiar → no hay API: el pedido se PEGA o se COMPARTE al sistema y
// `leerMensaje` lo convierte en pedido). Pidió: arrancar cada semana con un
// stock, que se descuente al entregar, y alertas (sobre todo restaurantes que
// dejaron de pedir). Sin barril: todo es por caja.
//
// Igual que Florería/Autocinema: todo en localStorage, pestañas en vivo por el
// evento `storage`, solo la pestaña líder simula. Se vuelve a sembrar cada
// semana (lunes).
// ─────────────────────────────────────────────────────────────────────────────

const DIA = 86400000;
export const inicioDia = (n = 0, base = Date.now()) => { const d = new Date(base); d.setHours(0, 0, 0, 0); return d.getTime() + n * DIA; };
export function lunes(base = Date.now()) { const d = new Date(base); const dow = (d.getDay() + 6) % 7; return inicioDia(-dow, base); }

export const NEGOCIO = { nombre: 'Malta', completo: 'Malta · reparto de cerveza', ciudad: 'Puebla' };

// precios por caja de EJEMPLO
export const PRODUCTOS = [
  { id: 'corona', nombre: 'Corona', detalle: '355 ml · caja de 24', precio: 520, alias: ['corona', 'coronas', 'coronita', 'coronitas', 'extra'] },
  { id: 'familiar', nombre: 'Corona Familiar', detalle: '940 ml · caja de 12', precio: 480, alias: ['familiar', 'familiares', 'corona familiar', 'coronas familiares'] },
  { id: 'victoria', nombre: 'Victoria', detalle: '355 ml · caja de 24', precio: 500, alias: ['victoria', 'victorias', 'vicky', 'vickys', 'vickies'] },
  { id: 'modelo', nombre: 'Modelo Especial', detalle: 'lata · caja de 24', precio: 540, alias: ['modelo', 'modelos', 'especial', 'modelo especial'] },
  { id: 'negra', nombre: 'Negra Modelo', detalle: '355 ml · caja de 24', precio: 560, alias: ['negra', 'negras', 'negra modelo', 'modelo negra'] },
  { id: 'pacifico', nombre: 'Pacífico', detalle: '355 ml · caja de 24', precio: 520, alias: ['pacifico', 'pacificos'] },
  { id: 'indio', nombre: 'Indio', detalle: 'lata · caja de 24', precio: 470, alias: ['indio', 'indios'] },
  { id: 'tecate', nombre: 'Tecate Light', detalle: 'lata · caja de 24', precio: 450, alias: ['tecate', 'tecates', 'light'] },
  { id: 'ultra', nombre: 'Michelob Ultra', detalle: 'lata · caja de 24', precio: 600, alias: ['michelob', 'michelobs', 'ultra', 'ultras'] },
];
export const producto = (id) => PRODUCTOS.find((p) => p.id === id);
export const BAJO = 8; // cajas: de aquí para abajo se avisa

export const REPARTIDORES = [
  { id: 'tono', nombre: 'Toño', unidad: 'NP300 blanca' },
  { id: 'memo', nombre: 'Memo', unidad: 'Ram 700 roja' },
];
export const repartidor = (id) => REPARTIDORES.find((r) => r.id === id);

// `contacto` = como aparece en el WhatsApp del dueño; `cada` = cada cuántos días pide normalmente
export const RESTAURANTES = [
  { id: 'fogon', nombre: 'El Fogón de Beto', contacto: 'Don Beto Fogón', persona: 'Don Beto', zona: 'Centro', direccion: 'Av. Reforma 512, Centro', tel: '222 145 3301', cada: 3, tipico: { corona: 5, victoria: 3, negra: 2 }, rep: 'tono' },
  { id: 'ola', nombre: 'Mariscos La Ola', contacto: 'Lupita La Ola', persona: 'Lupita', zona: 'La Paz', direccion: 'Calle Teziutlán Norte 18, La Paz', tel: '222 302 8814', cada: 5, tipico: { pacifico: 8, familiar: 4, corona: 3 }, rep: 'memo', dejo: 17 },
  { id: 'bistro', nombre: 'Bistró Sur', contacto: 'Chef Rodrigo Bistró', persona: 'Rodrigo', zona: 'Angelópolis', direccion: 'Blvd. Atlixcáyotl 3240, local 4', tel: '222 618 0042', cada: 7, tipico: { ultra: 2, modelo: 2, negra: 2 }, rep: 'memo' },
  { id: 'guero', nombre: 'Tacos El Güero', contacto: 'Güero Tacos', persona: 'Güero', zona: 'Huexotitla', direccion: 'Calle 25 Sur 1308, Huexotitla', tel: '222 471 9920', cada: 2, tipico: { victoria: 4, tecate: 3 }, rep: 'tono' },
  { id: 'cantina', nombre: 'La Cantina de Mayo', contacto: 'Sergio Cantina Mayo', persona: 'Sergio', zona: 'Centro', direccion: '5 de Mayo 404, Centro', tel: '222 233 5610', cada: 4, tipico: { victoria: 6, corona: 6, indio: 4 }, rep: 'tono' },
  { id: 'terraza', nombre: 'Terraza 21', contacto: 'Ale Terraza 21', persona: 'Ale', zona: 'Cholula', direccion: 'Calle 14 Pte. 21, San Andrés Cholula', tel: '222 590 7731', cada: 4, tipico: { modelo: 5, ultra: 3, corona: 4 }, rep: 'memo' },
  { id: 'parrilla', nombre: 'Parrilla Los Compadres', contacto: 'Compadre Juan', persona: 'Juan', zona: 'Zavaleta', direccion: 'Camino Real a Cholula 7802', tel: '222 384 1168', cada: 6, tipico: { corona: 6, negra: 3, modelo: 3 }, rep: 'memo', dejo: 14 },
  { id: 'pozole', nombre: 'Pozolería Doña Chela', contacto: 'Doña Chela', persona: 'Doña Chela', zona: 'Analco', direccion: 'Calle 3 Sur 1102, Analco', tel: '222 246 5503', cada: 7, tipico: { victoria: 3, familiar: 3 }, rep: 'tono' },
  { id: 'alitas', nombre: 'Alitas Bros', contacto: 'Iván Alitas Bros', persona: 'Iván', zona: 'La Noria', direccion: 'Av. 31 Ote. 615, La Noria', tel: '222 447 2290', cada: 3, tipico: { tecate: 4, indio: 4, victoria: 2 }, rep: 'tono' },
  { id: 'jardin', nombre: 'Café Jardín', contacto: 'Majo Café Jardín', persona: 'Majo', zona: 'Cholula', direccion: 'Av. Morelos 6, Cholula', tel: '222 561 0874', cada: 10, tipico: { ultra: 2, corona: 2 }, rep: 'memo' },
];
export const restaurante = (id) => RESTAURANTES.find((r) => r.id === id);
// clientes dados de alta o editados en la demo viven en `e.clientes` y se mezclan aquí
const BASE = RESTAURANTES.map((r) => ({ ...r }));
function registrar(e) {
  const propios = e?.clientes || {};
  RESTAURANTES.splice(0, RESTAURANTES.length,
    ...BASE.map((r) => ({ ...r, ...(propios[r.id] || {}) })),
    ...Object.values(propios).filter((c) => !BASE.some((b) => b.id === c.id)));
}

// mensajes de ejemplo, tal como llegan a su WhatsApp
export const EJEMPLOS = [
  { de: 'Don Beto Fogón', texto: 'Buenas tardes jefe, me manda 5 cajas de corona y 3 de victoria porfa, y 2 de negra. Gracias' },
  { de: 'Lupita La Ola', texto: 'hola!! para mañana 10 pacifico y 4 familiares 🙏' },
  { de: 'Chef Rodrigo Bistró', texto: 'Qué tal, necesito 2 michelob, 2 modelo y una de indio para el viernes' },
  { de: 'Güero Tacos', texto: 'mándame dos cajas de vicky y tres de tecate, ahí te pago el lunes' },
];

// ── el lector de mensajes ───────────────────────────────────────────────────
const NUMEROS = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, cien: 100, ciento: 100,
};
const DECENAS = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const sinAcentos = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ALIAS = () => PRODUCTOS.flatMap((p) => p.alias.map((a) => ({ a: a.split(' '), id: p.id }))).sort((x, y) => y.a.length - x.a.length);

// texto → fichas en orden: {n} números (con "treinta y cinco"), {p} productos, {quita} "sin/quita"
function fichasDe(texto) {
  const t = sinAcentos(texto).match(/\d+|[a-zñ]+/g) || [];
  const al = ALIAS();
  const fichas = [];
  for (let i = 0; i < t.length; i++) {
    const w = t[i];
    if (/^\d+$/.test(w)) { fichas.push({ n: Number(w) }); continue; }
    if (DECENAS[w]) {
      let n = DECENAS[w];
      if (t[i + 1] === 'y' && NUMEROS[t[i + 2]] < 10) { n += NUMEROS[t[i + 2]]; i += 2; }
      fichas.push({ n }); continue;
    }
    if (NUMEROS[w]) { fichas.push({ n: NUMEROS[w] }); continue; }
    if (['sin', 'quita', 'quitale', 'cero', 'nada'].includes(w)) { fichas.push({ quita: true, cero: w === 'cero' || w === 'nada' }); continue; }
    const hit = al.find(({ a }) => a.every((x, k) => t[i + k] === x));
    if (hit) { fichas.push({ p: hit.id }); i += hit.a.length - 1; }
  }
  return fichas;
}
// empareja cada producto con su número: "5 corona" o "corona 5" (se decide por cómo empieza)
function emparejar(fichas) {
  const despues = fichas[0]?.p && (fichas[1]?.n != null || fichas[1]?.cero);
  const usado = new Set();
  const pares = [];
  fichas.forEach((f, i) => {
    if (!f.p) return;
    const antes = fichas[i - 1];
    if (antes?.quita && !antes.cero) { usado.add(i - 1); pares.push([f.p, 0]); return; }
    let n = null;
    const sig = fichas[i + 1];
    if (despues) { if (sig?.n != null) { n = sig.n; usado.add(i + 1); } else if (sig?.cero) { n = 0; usado.add(i + 1); } }
    else if (antes?.n != null && !usado.has(i - 1)) { n = antes.n; usado.add(i - 1); }
    else if (antes?.cero && !usado.has(i - 1)) { n = 0; usado.add(i - 1); }
    else if (sig?.n != null && !fichas[i + 2]?.p) { n = sig.n; usado.add(i + 1); }
    else if (sig?.cero) { n = 0; usado.add(i + 1); }
    pares.push([f.p, n]);
  });
  return pares;
}

// para conteos (bodega, llegadas): el último que se dice gana, así se corrige hablando
export function leerCantidades(texto) {
  const out = {};
  emparejar(fichasDe(texto)).forEach(([id, n]) => { if (n != null) out[id] = n; });
  return out;
}

export function leerMensaje(texto, deQuien = '') {
  const crudo = String(texto || '');
  // formato al copiar de WhatsApp: "[22/11/26, 9:41] Güero Tacos: mensaje"
  let de = deQuien;
  const cab = crudo.match(/\]\s*([^:\n]{2,40}):/);
  if (!de && cab) de = cab[1].trim();
  const cuerpo = crudo.replace(/\[[^\]]*\]\s*[^:\n]{2,40}:/g, ' ');

  const items = {};
  emparejar(fichasDe(cuerpo)).forEach(([id, n]) => {
    // si repite una cerveza gana la última ("5 corona… no, mejor 6 corona")
    if (n === 0) delete items[id]; else items[id] = n || 1;
  });

  // ¿de quién es? por el nombre del contacto o porque el texto nombra al restaurante
  const norm = sinAcentos(`${de} ${cuerpo}`);
  const rest = RESTAURANTES.find((r) => de && sinAcentos(r.contacto) === sinAcentos(de))
    || RESTAURANTES.find((r) => sinAcentos(r.nombre).split(' ').filter((w) => w.length > 3 && !['tacos', 'cafe', 'mariscos', 'parrilla'].includes(w)).some((w) => norm.includes(w)))
    || null;

  const s = sinAcentos(cuerpo);
  const cuando = /\bmanana\b/.test(s) ? 1 : 0;
  const debe = /te pago|fiado|a cuenta|luego te|el lunes|la otra semana/.test(s);
  return { items, restaurante: rest?.id || null, cuando, debe };
}

// ── siembra ─────────────────────────────────────────────────────────────────
function azar(semilla) { let s = semilla; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const totalDe = (items) => Object.entries(items).reduce((s, [id, n]) => s + (producto(id)?.precio || 0) * n, 0);
export const cajasDe = (items) => Object.values(items).reduce((s, n) => s + n, 0);
export const importe = totalDe;

function sembrar() {
  const ahora = Date.now();
  const hoy = inicioDia(0);
  const ini = lunes();
  const r = azar(Math.floor(ini / DIA));
  const entregas = [];
  let folio = 1000;
  for (const rest of RESTAURANTES) {
    const ultimo = rest.dejo ? hoy - rest.dejo * DIA : hoy - Math.floor(r() * rest.cada) * DIA;
    for (let d = ultimo; d > hoy - 42 * DIA; d -= (rest.cada + Math.round(r() * 2 - 1)) * DIA) {
      if (d === hoy) continue; // hoy van como pendientes
      const items = {};
      Object.entries(rest.tipico).forEach(([id, n]) => { const x = Math.max(1, n + Math.round(r() * 2 - 1)); items[id] = x; });
      const viejo = hoy - d > 14 * DIA;
      entregas.push({
        id: `E${folio++}`, rest: rest.id, rep: rest.rep, items, total: totalDe(items),
        creado: d + 9 * 3600000 + Math.floor(r() * 3 * 3600000), entregado: d + 13 * 3600000 + Math.floor(r() * 5 * 3600000),
        estado: 'entregada', pago: !viejo && r() < 0.18 ? 'debe' : (r() < 0.6 ? 'efectivo' : 'transferencia'),
        origen: 'whatsapp', para: d,
      });
    }
  }
  // pendientes de hoy
  const pend = [
    { rest: 'cantina', items: { victoria: 6, corona: 5, indio: 4 }, mensaje: 'Sergio: lo de siempre porfa, hoy tenemos partido 🍺' },
    { rest: 'alitas', items: { tecate: 4, indio: 3, victoria: 2 }, mensaje: 'Iván: 4 tecate 3 indio y 2 vicky' },
    { rest: 'terraza', items: { modelo: 5, ultra: 3 }, mensaje: 'Ale: 5 de modelo y 3 michelob, antes de las 6 si se puede' },
  ];
  pend.forEach((p, i) => entregas.push({
    id: `E${folio++}`, rest: p.rest, rep: restaurante(p.rest).rep, items: p.items, total: totalDe(p.items),
    creado: Math.min(ahora - 3600000 * (3 - i), hoy + 9 * 3600000 + i * 1800000), estado: 'pendiente', origen: 'whatsapp', mensaje: p.mensaje, para: hoy,
  }));

  // el stock del lunes = lo que ya salió esta semana + lo apartado + lo que queda
  const queda = { corona: 34, familiar: 12, victoria: 27, modelo: 19, negra: 7, pacifico: 22, indio: 14, tecate: 11, ultra: 3 };
  const inicial = {};
  PRODUCTOS.forEach((p) => {
    const salio = entregas.filter((e) => e.para >= ini).reduce((s, e) => s + (e.items[p.id] || 0), 0);
    const bruto = salio + queda[p.id];
    inicial[p.id] = Math.ceil(bruto / 5) * 5; // números redondos, como se cuenta en bodega
  });
  return { v: 1, semana: ini, inicial, llegadas: [], ajustes: [], entregas, folio, cerradas: [], clientes: {} };
}

// ── almacén ─────────────────────────────────────────────────────────────────
const LLAVE = 'demo_reparto_v1';
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
    if (!estadoActual || (estadoActual.semana < lunes() && !estadoActual.propia)) estadoActual = sembrar();
    registrar(estadoActual);
    guardar();
  }
  return estadoActual;
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (ev) => { if (ev.key === LLAVE && ev.newValue) { try { estadoActual = JSON.parse(ev.newValue); registrar(estadoActual); avisar(); } catch { /* */ } } });
}
function cambiar(fn) { const e = leerFresco() || obtener(); const copia = structuredClone(e); const r = fn(copia); estadoActual = copia; registrar(copia); guardar(); avisar(); return r; }

export const useReparto = () => useSyncExternalStore((f) => { oyentes.add(f); return () => oyentes.delete(f); }, obtener);
export function reiniciarDemo() { estadoActual = sembrar(); registrar(estadoActual); guardar(); avisar(); }

const YO = Math.random().toString(36).slice(2);
export function soyLider() {
  try {
    const l = JSON.parse(localStorage.getItem('demo_reparto_lider') || 'null');
    if (l && l.id !== YO && Date.now() - l.t < 15000) return false;
    localStorage.setItem('demo_reparto_lider', JSON.stringify({ id: YO, t: Date.now() }));
  } catch { /* esta pestaña simula sola */ }
  return true;
}

// ── consultas ───────────────────────────────────────────────────────────────
export const deSemana = (e) => e.entregas.filter((x) => x.para >= e.semana);
export const pendientes = (e) => e.entregas.filter((x) => x.estado === 'pendiente').sort((a, b) => a.para - b.para || a.creado - b.creado);

export function existencias(e) {
  const llego = {};
  e.llegadas.forEach((l) => Object.entries(l.items).forEach(([id, n]) => { llego[id] = (llego[id] || 0) + n; }));
  const ajuste = {};
  (e.ajustes || []).forEach((a) => Object.entries(a.items).forEach(([id, n]) => { ajuste[id] = (ajuste[id] || 0) + n; }));
  return PRODUCTOS.map((p) => {
    const inicial = (e.inicial[p.id] || 0) + (llego[p.id] || 0);
    const salio = deSemana(e).filter((x) => x.estado === 'entregada').reduce((s, x) => s + (x.items[p.id] || 0), 0);
    const apartado = e.entregas.filter((x) => x.estado === 'pendiente').reduce((s, x) => s + (x.items[p.id] || 0), 0);
    const ajustado = ajuste[p.id] || 0;
    const bodega = inicial - salio + ajustado;
    return { ...p, inicial, salio, apartado, ajustado, bodega, libre: bodega - apartado };
  });
}

export function ultimoPedido(e, rid) {
  const suyas = e.entregas.filter((x) => x.rest === rid && x.estado !== 'cancelada');
  return suyas.reduce((m, x) => Math.max(m, x.creado), 0) || null;
}
export function diasSin(e, rid, ahora = Date.now()) {
  const u = ultimoPedido(e, rid);
  return u ? Math.floor((inicioDia(0, ahora) - inicioDia(0, u)) / DIA) : 99;
}
export function deuda(e, rid) {
  return e.entregas.filter((x) => (!rid || x.rest === rid) && x.estado === 'entregada' && x.pago === 'debe');
}
export function estadoCliente(e, rest) {
  if (!ultimoPedido(e, rest.id)) return 'nuevo';
  const d = diasSin(e, rest.id);
  if (d >= Math.max(7, rest.cada * 2)) return 'perdido';
  if (d > rest.cada + 1) return 'tarde';
  return 'bien';
}

export function alertas(e) {
  const out = [];
  existencias(e).filter((p) => p.libre <= BAJO).sort((a, b) => a.libre - b.libre).forEach((p) => out.push({
    id: `s-${p.id}`, tipo: 'stock', grave: p.libre <= 3,
    titulo: p.libre <= 0 ? `Se acabó la ${p.nombre}` : `Te quedan ${p.libre} ${p.libre === 1 ? 'caja' : 'cajas'} de ${p.nombre}`,
    detalle: p.apartado ? `Ya contando las ${p.apartado} apartadas para hoy.` : 'Pide al proveedor antes de que te la pidan.',
    producto: p.id,
  }));
  RESTAURANTES.filter((r) => estadoCliente(e, r) === 'perdido').forEach((r) => out.push({
    id: `c-${r.id}`, tipo: 'cliente', grave: true,
    titulo: `${r.nombre} no te pide hace ${diasSin(e, r.id)} días`,
    detalle: `Normalmente pide cada ${r.cada} días. Escríbele a ${r.persona}.`,
    rest: r.id,
  }));
  const deb = deuda(e);
  if (deb.length) {
    const cuantos = new Set(deb.map((x) => x.rest)).size;
    out.push({ id: 'deuda', tipo: 'deuda', grave: false, titulo: `Te deben ${dinero(deb.reduce((s, x) => s + x.total, 0))}`, detalle: `${cuantos} ${cuantos === 1 ? 'restaurante' : 'restaurantes'} con entregas sin pagar.` });
  }
  return out;
}

// ── acciones ────────────────────────────────────────────────────────────────
export function crearPedido({ rest, items, rep, para = 0, mensaje = '', origen = 'whatsapp', debe = false }) {
  return cambiar((e) => {
    const limpio = Object.fromEntries(Object.entries(items).filter(([, n]) => n > 0));
    const id = `E${e.folio++}`;
    e.entregas.push({ id, rest, rep: rep || restaurante(rest).rep, items: limpio, total: totalDe(limpio), creado: Date.now(), estado: 'pendiente', origen, mensaje, para: inicioDia(para), debe, tuyo: true });
    return id;
  });
}
export function entregar(id, pago) {
  cambiar((e) => { const x = e.entregas.find((y) => y.id === id); if (x && x.estado === 'pendiente') { x.estado = 'entregada'; x.pago = pago; x.entregado = Date.now(); } });
}
export function cancelarPedido(id) {
  cambiar((e) => { const x = e.entregas.find((y) => y.id === id); if (x && x.estado === 'pendiente') x.estado = 'cancelada'; });
}
export function reasignar(id, rep) {
  cambiar((e) => { const x = e.entregas.find((y) => y.id === id); if (x && x.estado === 'pendiente') x.rep = rep; });
}
export function cobrar(rid) {
  cambiar((e) => { e.entregas.forEach((x) => { if (x.rest === rid && x.estado === 'entregada' && x.pago === 'debe') { x.pago = 'cobrado'; x.cobrado = Date.now(); } }); });
}
export function registrarLlegada(items) {
  cambiar((e) => { const limpio = Object.fromEntries(Object.entries(items).filter(([, n]) => n > 0)); if (cajasDe(limpio)) e.llegadas.push({ t: Date.now(), items: limpio }); });
}
// conteo físico: lo que se contó reemplaza a lo que dice el sistema; la diferencia queda anotada
export function ajustarConteo(contado) {
  return cambiar((e) => {
    const ex = existencias(e);
    const dif = {};
    Object.entries(contado).forEach(([id, n]) => { const p = ex.find((x) => x.id === id); if (p && n !== p.bodega) dif[id] = n - p.bodega; });
    if (Object.keys(dif).length) { e.ajustes = e.ajustes || []; e.ajustes.push({ t: Date.now(), items: dif }); }
    return dif;
  });
}
export function guardarCliente(datos) {
  return cambiar((e) => {
    e.clientes = e.clientes || {};
    let id = datos.id;
    if (!id) {
      const base = sinAcentos(datos.nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'cliente';
      id = base; let k = 2;
      while (RESTAURANTES.some((r) => r.id === id)) id = `${base}-${k++}`;
    }
    const limpio = Object.fromEntries(Object.entries(datos.tipico || {}).filter(([, n]) => n > 0));
    e.clientes[id] = { ...datos, id, tipico: limpio, contacto: datos.contacto || `${datos.persona} ${datos.nombre}`, alta: datos.alta || Date.now() };
    return id;
  });
}
// lo que conviene pedirle al proveedor: lo que vende en una semana normal menos lo que tiene libre
export function sugeridoProveedor(e) {
  const desde = e.semana - 28 * DIA;
  const vendido = {};
  e.entregas.filter((x) => x.estado === 'entregada' && x.para >= desde && x.para < e.semana)
    .forEach((x) => Object.entries(x.items).forEach(([id, n]) => { vendido[id] = (vendido[id] || 0) + n; }));
  return existencias(e).map((p) => {
    const semanal = Math.round((vendido[p.id] || 0) / 4);
    const pedir = Math.max(0, Math.ceil((semanal - p.libre) / 5) * 5);
    return { id: p.id, semanal, libre: p.libre, pedir };
  });
}
// cierra la semana: lo que sobró + lo que llegó = el stock con el que arranca la nueva
export function empezarSemana(llego) {
  cambiar((e) => {
    const ex = existencias(e);
    const vendido = deSemana(e).filter((x) => x.estado === 'entregada');
    e.cerradas.push({ semana: e.semana, cajas: vendido.reduce((s, x) => s + cajasDe(x.items), 0), total: vendido.reduce((s, x) => s + x.total, 0) });
    e.inicial = Object.fromEntries(ex.map((p) => [p.id, Math.max(0, p.bodega) + (llego[p.id] || 0)]));
    e.llegadas = [];
    e.ajustes = [];
    // en la demo la "semana nueva" empieza hoy
    e.semana = inicioDia(0);
    e.propia = true;
  });
}

// los repartidores entregan solos lo que lleva un rato pendiente
export function simular() {
  const e = leerFresco() || obtener();
  const viejos = pendientes(e).filter((x) => x.para <= inicioDia(0) && Date.now() - x.creado > 90000);
  if (pendientes(e).length < 2 || !viejos.length) return;
  const x = viejos[Math.floor(Math.random() * viejos.length)];
  entregar(x.id, x.debe ? 'debe' : (Math.random() < 0.6 ? 'efectivo' : 'transferencia'));
}

// ── formato ─────────────────────────────────────────────────────────────────
export const dinero = (n) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
export const horaDe = (t) => new Date(t).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
export function diaDe(t) {
  const d = Math.round((inicioDia(0, t) - inicioDia(0)) / DIA);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d === -1) return 'Ayer';
  const s = new Date(t).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const hace = (dias) => (dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`);
export const resumenItems = (items) => Object.entries(items).map(([id, n]) => `${n} ${producto(id)?.nombre}`).join(' · ');
export function waLink(texto) { return `https://wa.me/?text=${encodeURIComponent(texto)}`; }
