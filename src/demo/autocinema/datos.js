import { useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE AUTOCINEMA — datos y lógica (sin base de datos)
//
// Prospecto (26-oct-2026): Autocinema Cocodrilo, San Andrés Cholula. Su sitio
// actual es un WooCommerce donde cada función es un "producto" con 6 boletos en
// un desplegable, y la comida se pide en OTRO sitio escribiendo a mano el código
// del auto en "comentarios". La demo junta todo en una sola noche: cartelera →
// boleto con lugar en el mapa → pase QR → pedir comida al auto → taquilla con
// lector → cocina → dueño.
//
// Igual que Sorteos y KADE: todo vive en localStorage, las pestañas se ven en
// vivo por el evento `storage` y solo la pestaña líder simula a la demás gente.
// Las películas son INVENTADAS (los pósters reales tienen derechos).
// ─────────────────────────────────────────────────────────────────────────────

export const NEGOCIO = {
  nombre: 'Autocinema Cocodrilo',
  corto: 'Cocodrilo',
  direccion: 'Calle 5 Sur 101, Centro, San Andrés Cholula, Puebla',
  mapa: 'https://maps.google.com/?q=Autocinema+Cocodrilo+San+Andres+Cholula',
  whatsapp: '522211768004',
  horario: [['Mar a jue y dom', '5:00 pm – 11:00 pm'], ['Vie y sáb', '5:00 pm – 12:00 am']],
  temporada: 'Noches de Terror',
};

// `poster` es el nombre de una foto local (public/autocinema) o una URL completa.
export const IMG = (n) => (String(n).startsWith('http') ? n : `/autocinema/${n}.webp`);

// ── dos carteleras ──────────────────────────────────────────────────────────
// 'real'    → la de Autocinema Cocodrilo (Noches de Terror 26-oct → 2-nov-2026,
//             sacada de su sitio: fecha, hora, idioma y clasificación de cada
//             arte; año, duración y director de cada producto). Pósters
//             oficiales de TMDB (originales en inglés). NO se guardan en el
//             repo: es público.
// 'ejemplo' → películas inventadas con pósters de Codex, para enseñarla a
//             cualquier autocinema o en redes sin problemas de derechos.
// Se elige con ?cartelera=real|ejemplo o desde la guía (se recuerda).
const LLAVE_MODO = 'demo_autocinema_cartelera';
export const MODO = (() => {
  try {
    const q = new URLSearchParams(window.location.search).get('cartelera');
    if (q === 'real' || q === 'ejemplo') { localStorage.setItem(LLAVE_MODO, q); return q; }
    const m = localStorage.getItem(LLAVE_MODO);
    if (m === 'real' || m === 'ejemplo') return m;
  } catch { /* sin almacenamiento */ }
  return 'real';
})();
export function cambiarCartelera(m) {
  try { localStorage.setItem(LLAVE_MODO, m); } catch { /* */ }
  const u = new URL(window.location.href); u.searchParams.delete('cartelera');
  window.location.replace(u.toString());
}

// Pósters oficiales de TMDB (rutas sacadas con scripts/tmdb/posters.mjs, que
// usa la llave del llavero solo en la Mac; aquí no va ninguna llave). w780 se
// ve nítido en retina. Se cargan de image.tmdb.org, no se guardan en el repo.
const TMDB = 'https://image.tmdb.org/t/p/w780';

const REALES = {
  lightsout: { titulo: 'Lights Out', genero: 'Terror', clas: 'B15', min: 81, idioma: 'Subtitulada', año: 2016, director: 'David F. Sandberg', poster: TMDB + '/AjZXonSbqC3LdSr8xCUzMiQksrM.jpg',
    sinopsis: 'Cada vez que se apaga la luz, algo aparece en la oscuridad. Una joven descubre que el ente que aterrorizó su infancia ha vuelto por su familia.' },
  pesadilla: { titulo: 'Pesadilla en la Calle del Infierno', genero: 'Terror', clas: 'C', min: 101, idioma: 'Subtitulada', año: 1984, director: 'Wes Craven', poster: TMDB + '/wGTpGGRMZmyFCcrY2YoxVTIBlli.jpg',
    sinopsis: 'Un grupo de adolescentes comparte la misma pesadilla: un hombre con guante de navajas que los persigue en sueños. Si mueres soñando, mueres de verdad.' },
  monsterhouse: { titulo: 'Monster House', genero: 'Animada', clas: 'A', min: 87, idioma: 'Doblada', año: 2006, director: 'Gil Kenan', poster: TMDB + '/zCRPr4bkO3ae0U1134vJ39xZnAG.jpg',
    sinopsis: 'Tres amigos descubren que la casa de enfrente está viva y se traga todo lo que se acerca. La noche de Halloween tienen que detenerla.' },
  weapons: { titulo: 'La Hora de la Desaparición', genero: 'Terror', clas: 'C', min: 128, idioma: 'Subtitulada', año: 2025, director: 'Zach Cregger', poster: TMDB + '/f1IGYeQLHfKFdlzv448vVIBjwXY.jpg',
    sinopsis: 'A las 2:17 de la madrugada, todos los niños de un mismo salón salen de sus casas y desaparecen. Todos menos uno.' },
  scream6: { titulo: 'Scream VI', genero: 'Terror', clas: 'B15', min: 123, idioma: 'Doblada', año: 2023, director: 'Matt Bettinelli-Olpin', poster: TMDB + '/kKMvCIE91h4aBot6DDO19QTsVbF.jpg',
    sinopsis: 'Los sobrevivientes dejan Woodsboro para empezar de nuevo en Nueva York, pero Ghostface los sigue hasta la gran ciudad.' },
  sorpresa: { titulo: 'Función de Terror Sorpresa', genero: 'Sorpresa', clas: '¿?', min: null, idioma: '¿?', año: '¿?', director: 'El Diablo', poster: 'sorpresa',
    sinopsis: 'No te diremos nada… muajajaja. Llega, sintoniza y prepárate: la película se revela cuando se apagan las luces.' },
  beetlejuice: { titulo: 'Beetlejuice', genero: 'Comedia de terror', clas: 'B', min: 93, idioma: 'Doblada', año: 1988, director: 'Tim Burton', poster: TMDB + '/z8ykp9HugsetInG2zTbZT6spamT.jpg',
    sinopsis: 'Una pareja de fantasmas quiere sacar de su casa a la familia que se mudó. Para lograrlo contratan al bioexorcista más impredecible del más allá.' },
  sinners: { titulo: 'Sinners', genero: 'Terror', clas: 'B15', min: 137, idioma: 'Subtitulada', año: 2025, director: 'Ryan Coogler', poster: TMDB + '/e4irZZ34S6DcwDhkSyWSi6Xr5LQ.jpg',
    sinopsis: 'Dos gemelos vuelven a su pueblo en el Mississippi de 1932 para empezar de cero, y descubren que un mal mucho peor los espera.' },
  halloween: { titulo: 'Halloween (1978)', genero: 'Terror', clas: 'B', min: 93, idioma: 'Subtitulada', año: 1978, director: 'John Carpenter', poster: TMDB + '/cYKvU3RhWJIYteJU5PxJWZY4twt.jpg',
    sinopsis: 'Quince años después de su primer crimen, Michael Myers escapa y regresa a Haddonfield la noche de Halloween. El clásico que lo empezó todo.' },
  siniestro: { titulo: 'Siniestro', genero: 'Terror', clas: 'B', min: 110, idioma: 'Subtitulada', año: 2012, director: 'Scott Derrickson', poster: TMDB + '/t4GPxaNABn8ANt3kug6B0w8NA3A.jpg',
    sinopsis: 'Un escritor encuentra en el ático de su nueva casa unas cintas caseras que muestran crímenes. Mientras más las ve, más cerca está de lo que las grabó.' },
  coraline: { titulo: 'Coraline', genero: 'Animada', clas: 'A', min: 97, idioma: 'Doblada', año: 2009, director: 'Henry Selick', poster: TMDB + '/4jeFXQYytChdZYE9JYO7Un87IlW.jpg',
    sinopsis: 'Detrás de una puerta secreta, Coraline encuentra una casa igual a la suya con una familia perfecta… y botones en lugar de ojos.' },
  conjuro: { titulo: 'El Conjuro', genero: 'Terror', clas: 'B15', min: 112, idioma: 'Subtitulada', año: 2013, director: 'James Wan', poster: TMDB + '/tdSZGTBTm4EFNCMz3laZ96Ht8ao.jpg',
    sinopsis: 'Los investigadores Ed y Lorraine Warren ayudan a una familia aterrorizada por una presencia oscura en su granja. Basada en un caso real.' },
  cadaver: { titulo: 'El Cadáver de la Novia', genero: 'Animada', clas: 'A', min: 75, idioma: 'Doblada', año: 2005, director: 'Tim Burton', poster: TMDB + '/isb2Qow76GpqYmsSyfdMfsYAjts.jpg',
    sinopsis: 'Ensayando sus votos en el bosque, Víctor se casa por accidente con una novia que ya estaba muerta y termina en el mundo de los difuntos.' },
  hereditary: { titulo: 'Hereditary', genero: 'Terror', clas: 'B15', min: 126, idioma: 'Subtitulada', año: 2018, director: 'Ari Aster', poster: TMDB + '/4GFPuL14eXi66V96xBWY73Y9PfR.jpg',
    sinopsis: 'Tras la muerte de la abuela, una familia empieza a descubrir secretos cada vez más oscuros sobre su herencia.' },
  coco: { titulo: 'Coco', genero: 'Animada', clas: 'A', min: 109, idioma: 'Doblada', año: 2017, director: 'Lee Unkrich', poster: TMDB + '/6Ryitt95xrO8KXuqRGm1fUuNwqF.jpg',
    sinopsis: 'Miguel sueña con ser músico a pesar de la prohibición de su familia. En Día de Muertos cruza a la Tierra de los Muertos y descubre su verdadero legado.' },
};
// [día desde el 26-oct, película, hora]
const PROGRAMA_REAL = [
  [0, 'lightsout', '19:00'], [0, 'pesadilla', '22:00'],
  [1, 'monsterhouse', '19:00'], [1, 'weapons', '22:00'],
  [2, 'scream6', '19:00'], [2, 'sorpresa', '22:00'],
  [3, 'beetlejuice', '19:00'], [3, 'sinners', '22:00'],
  [4, 'halloween', '19:00'], [4, 'siniestro', '22:15'],
  [5, 'coraline', '18:00'], [5, 'conjuro', '21:30'],
  [6, 'cadaver', '18:00'], [6, 'hereditary', '21:30'],
  [7, 'coco', '19:00'],
];
const ARRANQUE_REAL = new Date(2026, 9, 26).getTime();

const EJEMPLO = {
  pantano: { titulo: 'El Cocodrilo del Pantano', genero: 'Aventura familiar', clas: 'A', min: 98, idioma: 'Doblada', poster: 'p-pantano', año: 2024,
    sinopsis: 'Cuatro amigos en bicicleta descubren que la leyenda del pantano es real… y que el cocodrilo gigante que todos temen solo quiere volver a casa.' },
  niebla: { titulo: 'La Niebla del Faro', genero: 'Terror', clas: 'B15', min: 104, idioma: 'Subtitulada', poster: 'p-niebla', año: 2023,
    sinopsis: 'Una guardiana de faro recibe cada noche la misma señal de auxilio desde un barco que se hundió hace cien años.' },
  carretera: { titulo: 'Kilómetro 13', genero: 'Suspenso', clas: 'B15', min: 111, idioma: 'Subtitulada', poster: 'p-carretera', año: 2025,
    sinopsis: 'Una pareja se queda sin gasolina en una carretera del desierto. El único motel abierto tiene una regla: nadie sale después de medianoche.' },
  calavera: { titulo: 'Flor de Cempasúchil', genero: 'Animada', clas: 'A', min: 95, idioma: 'Doblada', poster: 'p-calavera', año: 2024,
    sinopsis: 'La noche de Muertos, un niño sigue el camino de pétalos para devolverle a su bisabuela la canción que la familia olvidó.' },
  casona: { titulo: 'La Casona de la Colina', genero: 'Terror', clas: 'C', min: 118, idioma: 'Subtitulada', poster: 'p-casona', año: 2022,
    sinopsis: 'Tres hermanos heredan una casona victoriana. La escritura dice que la casa ya tiene dueño, y no piensa irse.' },
  galaxia: { titulo: 'Órbita', genero: 'Ciencia ficción', clas: 'B', min: 126, idioma: 'Subtitulada', poster: 'p-galaxia', año: 2025,
    sinopsis: 'La última astronauta de una estación abandonada tiene seis horas para decidir si vuelve a la Tierra o sigue la señal.' },
  baile: { titulo: 'Noche Disco', genero: 'Musical', clas: 'A', min: 102, idioma: 'Subtitulada', poster: 'p-baile', año: 2023,
    sinopsis: 'Puebla, 1979. Una costurera y un repartidor se inscriben al concurso de baile que puede salvar la pista más famosa de la ciudad.' },
  amor: { titulo: 'Atardecer en la Costa', genero: 'Romance', clas: 'B', min: 108, idioma: 'Doblada', poster: 'p-amor', año: 2024,
    sinopsis: 'Dos desconocidos comparten un convertible rentado por error y una semana para llegar a la boda que ninguno quiere.' },
};

// Boletos de temporada: los mismos seis del sitio actual, explicados lado a lado.
// `zona` decide en qué parte del mapa se elige el lugar.
export const PELICULAS = MODO === 'real' ? REALES : EJEMPLO;
export const duracion = (p) => (p.min ? `${Math.floor(p.min / 60)} h ${p.min % 60} min` : '¿?');

export const BOLETOS = [
  { id: 'auto', nombre: 'Auto', precio: 450, zona: 'auto', personas: 'Hasta 6 personas', incluye: ['Lugar para tu auto', 'Casa del Terror', 'Película con audio en tu radio'] },
  { id: 'auto-terror', nombre: 'Auto Terrorífico', precio: 750, zona: 'vip', personas: 'Hasta 6 personas', destacado: true,
    incluye: ['Primera fila', '2 accesos rápidos a la Casa del Terror', 'Pan de muerto grande', 'Atractor de monstruos (más sustos al auto)', 'Certificado de supervivencia'] },
  { id: 'pareja', nombre: 'Peatonal pareja', precio: 300, zona: 'peatonal', personas: '2 personas', incluye: ['Lugar al aire libre en zona peatonal', 'Casa del Terror', 'Película'] },
  { id: 'grupal', nombre: 'Peatonal grupal', precio: 450, zona: 'peatonal', personas: 'Hasta 5 personas', incluye: ['Lugar al aire libre en zona peatonal', 'Casa del Terror', 'Película'] },
  { id: 'grupal-terror', nombre: 'Grupal Terrorífico', precio: 700, zona: 'peatonal', personas: 'Hasta 5 personas', incluye: ['Lugar peatonal', '2 accesos rápidos', 'Pan de muerto grande', 'Atractor de monstruos'] },
  { id: 'campana', nombre: 'Casa de campaña', precio: 350, zona: 'campana', personas: '2 personas', incluye: ['Casa de campaña armada', 'Casa del Terror', 'Película'] },
];
export const boleto = (id) => BOLETOS.find((b) => b.id === id);

// Mapa del lugar: la pantalla arriba; fila A = primera fila (Terrorífico),
// B–F autos, al frente la zona peatonal y a un lado las casas de campaña.
export const ZONAS = {
  vip: { nombre: 'Primera fila', lugares: Array.from({ length: 8 }, (_, i) => `A-${i + 1}`) },
  auto: { nombre: 'Autos', lugares: ['B', 'C', 'D', 'E', 'F'].flatMap((f) => Array.from({ length: 10 }, (_, i) => `${f}-${i + 1}`)) },
  peatonal: { nombre: 'Zona peatonal', lugares: Array.from({ length: 12 }, (_, i) => `P-${i + 1}`) },
  campana: { nombre: 'Casas de campaña', lugares: Array.from({ length: 6 }, (_, i) => `T-${i + 1}`) },
};
export const CUPO_TOTAL = Object.values(ZONAS).reduce((n, z) => n + z.lugares.length, 0);

export function nombreLugar(l) {
  if (!l) return '—';
  const [f, n] = l.split('-');
  if (f === 'P') return `Peatonal ${n}`;
  if (f === 'T') return `Casa de campaña ${n}`;
  return `Fila ${f} · ${n}`;
}

export const MENU = [
  { id: 'combo', nombre: 'Combo Cocodrilo', precio: 299, foto: 'c-combo', cat: 'Combos', desc: '2 hot dogs, palomitas grandes y 2 refrescos', estrella: true },
  { id: 'combo-familia', nombre: 'Combo Familiar', precio: 549, foto: 'c-familiar', cat: 'Combos', desc: '2 pizzas individuales, nachos, palomitas y 4 refrescos' },
  { id: 'hamburguesa', nombre: 'Hamburguesa doble', precio: 165, foto: 'c-hamburguesa', cat: 'Cocina', desc: 'Doble carne, queso americano, papas' },
  { id: 'hotdog', nombre: 'Hot dog Cocodrilo', precio: 95, foto: 'c-hotdog', cat: 'Cocina', desc: 'Con tocino, cebolla asada y jalapeño' },
  { id: 'alitas', nombre: 'Alitas búfalo', precio: 155, foto: 'c-alitas', cat: 'Cocina', desc: '10 piezas con aderezo ranch' },
  { id: 'pizza', nombre: 'Pizza individual', precio: 140, foto: 'c-pizza', cat: 'Cocina', desc: 'Pepperoni, 8 pulgadas' },
  { id: 'nachos', nombre: 'Nachos con queso', precio: 110, foto: 'c-nachos', cat: 'Para compartir', desc: 'Queso fundido, jalapeño y pico de gallo' },
  { id: 'palomitas', nombre: 'Palomitas grandes', precio: 85, foto: 'c-palomitas', cat: 'Para compartir', desc: 'Con mantequilla, cubeta de 130 oz' },
  { id: 'malteada', nombre: 'Malteada', precio: 85, foto: 'c-malteada', cat: 'Bebidas', desc: 'Fresa, chocolate o vainilla' },
  { id: 'refresco', nombre: 'Refresco grande', precio: 45, foto: 'c-refresco', cat: 'Bebidas', desc: '32 oz con refill' },
];
export const platillo = (id) => MENU.find((m) => m.id === id);

export const ESTADOS_ORDEN = [
  ['recibido', 'Recibido'], ['preparando', 'En cocina'], ['camino', 'Va a tu auto'], ['entregado', 'Entregado'],
];

const MIN = 60000, HORA = 3600000, DIA = 86400000;
const NOMBRES = ['Fernanda R.', 'Luis M.', 'Ana P.', 'Diego S.', 'Valeria T.', 'Jorge L.', 'Sofía G.', 'Andrés C.', 'Paola N.', 'Ricardo V.',
  'Daniela H.', 'Emilio F.', 'Regina B.', 'Óscar D.', 'Camila Z.', 'Iván Q.', 'Ximena A.', 'Héctor O.', 'Natalia E.', 'Mauricio K.'];

// ── Cocopuntos (programa de recompensas) ──────────────────────────────────
// 1 punto por cada $10 en boletos y comida (más con nivel), +50 por visita
// cuando la entrada lee tu pase, y retos de temporada. Los puntos se canjean:
// la comida va a cocina directo a tu lugar; el boleto gratis queda como cupón.
export const NIVELES = [
  { id: 'copiloto', nombre: 'Copiloto', desde: 0, extra: 0, beneficio: '1 punto por cada $10' },
  { id: 'piloto', nombre: 'Piloto', desde: 600, extra: 0.05, beneficio: '5% más puntos en cada compra' },
  { id: 'primera', nombre: 'Primera fila', desde: 1500, extra: 0.1, beneficio: '10% más puntos y preventa 24 h antes' },
  { id: 'vip', nombre: 'VIP Cocodrilo', desde: 3000, extra: 0.2, beneficio: '20% más puntos y acceso rápido siempre' },
];
export const RECOMPENSAS = [
  { id: 'refresco', nombre: 'Refresco grande', costo: 250, foto: 'c-refresco', tipo: 'comida', platillo: 'refresco' },
  { id: 'palomitas', nombre: 'Palomitas grandes', costo: 400, foto: 'c-palomitas', tipo: 'comida', platillo: 'palomitas' },
  { id: 'malteada', nombre: 'Malteada', costo: 450, foto: 'c-malteada', tipo: 'comida', platillo: 'malteada' },
  { id: 'combo', nombre: 'Combo Cocodrilo', costo: 1200, foto: 'c-combo', tipo: 'comida', platillo: 'combo' },
  { id: 'auto-gratis', nombre: 'Boleto de auto gratis', costo: 2500, foto: 'fila-autos', tipo: 'boleto' },
];
export const RETOS = [
  { id: 'maraton', nombre: 'Maratón de Terror', detalle: 'Ve 3 funciones de la temporada', meta: 3, premio: 300, foto: 'casa-terror' },
  { id: 'sodas', nombre: 'Antojo en el auto', detalle: 'Pide desde tu boleto a la fuente de sodas', meta: 1, premio: 100, foto: 'fuente-sodas' },
  { id: 'grupo', nombre: 'Noche en grupo', detalle: 'Compra un boleto Peatonal grupal', meta: 1, premio: 150, foto: 'fila-autos' },
];
// La clienta de la demo. Su QR de cliente (`ACS1.<código>`) es el que se pasa
// por el lector en taquilla o en la fuente de sodas para sumar puntos de lo que
// compra en el lugar (no solo en línea).
export const CLIENTE = { nombre: 'Karime Pérez', codigo: 'CLI-4821', desde: 'septiembre 2026', iniciales: 'KP' };

export const nivelDe = (pts) => [...NIVELES].reverse().find((n) => pts >= n.desde);
export const siguienteNivel = (pts) => NIVELES.find((n) => n.desde > pts) || null;
// el nivel se mide con los puntos ganados en total (canjear no te baja de nivel)
export function progresoReto(e, r) {
  const mias = e.ventas.filter((v) => v.mio);
  if (r.id === 'maraton') return (e.puntos?.previas || 0) + mias.length;
  if (r.id === 'sodas') return e.ordenes.filter((o) => o.mio && !o.programada && !o.recompensa).length;
  if (r.id === 'grupo') return mias.filter((v) => v.tipo.startsWith('grupal')).length;
  return 0;
}
function sumarPuntos(e, pesos, texto) {
  const n = nivelDe(e.puntos.ganados);
  const pts = Math.floor((pesos / 10) * (1 + n.extra));
  if (pts > 0) movimiento(e, pts, texto);
  return pts;
}
function movimiento(e, pts, texto) {
  e.puntos.saldo += pts;
  if (pts > 0) e.puntos.ganados += pts;
  e.puntos.movs.unshift({ id: id(), t: Date.now(), pts, texto });
}
function revisarRetos(e) {
  RETOS.forEach((r) => {
    if (e.puntos.retos.includes(r.id) || progresoReto(e, r) < r.meta) return;
    e.puntos.retos.push(r.id);
    movimiento(e, r.premio, `Reto cumplido: ${r.nombre}`);
  });
}

// ── semilla ─────────────────────────────────────────────────────────────────
const id = () => Math.random().toString(36).slice(2, 9);
const azar = (a) => a[Math.floor(Math.random() * a.length)];
function codigo() {
  const L = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return 'CC' + Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join('');
}
const inicioDia = (d = 0) => { const f = new Date(); f.setHours(0, 0, 0, 0); f.setDate(f.getDate() + d); return f.getTime(); };

// cartelera de 7 noches, dos funciones por noche (las películas rotan)
const ROTACION = [
  ['pantano', 'niebla'], ['calavera', 'casona'], ['pantano', 'carretera'], ['baile', 'niebla'],
  ['calavera', 'casona'], ['galaxia', 'carretera'], ['amor', 'niebla'],
];

function tipoPara(zona) {
  if (zona === 'vip') return 'auto-terror';
  if (zona === 'auto') return 'auto';
  if (zona === 'campana') return 'campana';
  return azar(['pareja', 'pareja', 'grupal', 'grupal-terror']);
}

function venta(e, funcion, lugar, extra = {}) {
  const zona = Object.entries(ZONAS).find(([, z]) => z.lugares.includes(lugar))[0];
  const tipo = extra.tipo || tipoPara(zona);
  // ~6% se vendió hoy (antes de esta hora); el resto en los días anteriores
  const t = Math.random() < 0.06 ? inicioDia(0) + Math.random() * Math.max(1, Date.now() - inicioDia(0)) : inicioDia(0) - Math.random() * 6 * DIA;
  return { codigo: codigo(), funcion, tipo, lugar, nombre: azar(NOMBRES), total: boleto(tipo).precio, t, mio: false, entro: null, ...extra };
}

// Programa de la cartelera elegida como [inicio del día, película, k, horas, minutos].
// La real va en sus fechas; pasado el 2-nov se repite empezando hoy (así la
// demo nunca se queda sin funciones).
function programa() {
  if (MODO === 'real') {
    const base = Date.now() > ARRANQUE_REAL + 8 * DIA ? inicioDia(0) : ARRANQUE_REAL;
    return PROGRAMA_REAL.map(([d, peli, h], k) => {
      const [hh, mm] = h.split(':').map(Number);
      const dia = new Date(base); dia.setDate(dia.getDate() + d);
      return { peli, t: dia.getTime() + hh * HORA + mm * MIN, tarde: hh < 21 || k === PROGRAMA_REAL.length - 1 };
    });
  }
  return ROTACION.flatMap((par, d) => par.map((peli, k) => ({ peli, t: inicioDia(d) + (k ? 22 * HORA : 19 * HORA + 30 * MIN), tarde: !k })));
}

function sembrar() {
  const e = { v: 6, modo: MODO, dia: inicioDia(0), funciones: [], ventas: [], ordenes: [], avisos: [], historial: [] };
  // Karime ya vino 3 veces antes: llega con saldo para canjear algo y a medio
  // camino del siguiente nivel
  e.puntos = { saldo: 0, ganados: 0, previas: 1, retos: [], cupones: [], movs: [] };
  [[-38, 75, 'Boleto Auto · septiembre'], [-38, 52, 'Pedido a tu auto'], [-24, 75, 'Boleto Auto · octubre'], [-24, 50, 'Visita al autocinema'],
    [-10, 45, 'Boleto Auto Terrorífico'], [-10, 50, 'Visita al autocinema'], [-10, 60, 'Pedido a tu auto'], [-9, 300, 'Bienvenida a Cocopuntos'],
    [-3, 470, 'Reto cumplido: Primera temporada']].forEach(([d, pts, texto]) => {
    e.puntos.saldo += pts; e.puntos.ganados += pts;
    e.puntos.movs.unshift({ id: id(), t: inicioDia(d) + 20 * HORA, pts, texto });
  });
  programa().forEach(({ peli, t, tarde }) => {
    const f = { id: id(), peli, t };
    e.funciones.push(f);
    // ocupación: más llena hoy y en fin de semana, la tarde más que la noche;
    // las que ya pasaron quedan casi llenas
    const d = Math.max(0, Math.round((new Date(t).setHours(0, 0, 0, 0) - inicioDia(0)) / DIA));
    const finde = [5, 6].includes(new Date(t).getDay());
    const llenado = t < inicioDia(0) ? 0.9 : Math.min(0.93, (finde ? 0.82 : 0.6) - d * 0.06 + (tarde ? 0.05 : -0.08) + (d === 0 ? 0.12 : 0));
    Object.values(ZONAS).forEach((z) => z.lugares.forEach((l) => { if (Math.random() < llenado) e.ventas.push(venta(e, f.id, l)); }));
  });
  // la primera función de hoy ya está entrando: 35% llegaron
  const hoy1 = (funcionesDelDia(e, 0)[0] || e.funciones.find((f) => f.t > Date.now()) || e.funciones[0]).id;
  e.ventas.filter((v) => v.funcion === hoy1 && !v.mio).forEach((v) => { if (Math.random() < 0.35) v.entro = Date.now() - Math.random() * 40 * MIN; });
  // pedidos de esta noche en distintos estados
  const llegaron = e.ventas.filter((v) => v.funcion === hoy1 && v.entro);
  ['entregado', 'entregado', 'camino', 'preparando', 'preparando', 'recibido'].forEach((estado, i) => {
    const v = llegaron[i]; if (!v) return;
    e.ordenes.push(orden(v, [[azar(['combo', 'hamburguesa', 'nachos', 'hotdog']), 1], [azar(['refresco', 'malteada', 'palomitas']), 2]], estado, Date.now() - (30 - i * 4) * MIN));
  });
  // 14 días de ventas para la gráfica del dueño
  for (let d = 14; d >= 1; d--) {
    const dia = new Date(inicioDia(-d));
    const finde = [5, 6].includes(dia.getDay());
    const lunes = dia.getDay() === 1; // cerrado
    const boletos = lunes ? 0 : Math.round((finde ? 38000 : 21000) * (0.8 + Math.random() * 0.4));
    e.historial.push({ dia: dia.getTime(), boletos, comida: lunes ? 0 : Math.round(boletos * (0.32 + Math.random() * 0.12)) });
  }
  return e;
}

function orden(v, items, estado = 'recibido', t = Date.now(), mio = false) {
  const total = items.reduce((n, [pid, q]) => n + platillo(pid).precio * q, 0);
  return { id: id(), numero: 100 + Math.floor(Math.random() * 900), codigo: v.codigo, funcion: v.funcion, lugar: v.lugar, nombre: v.nombre, items, total, estado, t, cambio: t, mio };
}

// ── almacén ─────────────────────────────────────────────────────────────────
const LLAVE = `demo_autocinema_v6_${MODO}`;
let estado = null;
const oyentes = new Set();
function leerFresco() {
  try { const t = localStorage.getItem(LLAVE); if (t) { const e = JSON.parse(t); if (e.v === 6) return e; } } catch { /* sin almacenamiento */ }
  return null;
}
function guardar() { try { localStorage.setItem(LLAVE, JSON.stringify(estado)); } catch { /* lleno o bloqueado */ } }
function avisar() { oyentes.forEach((f) => f()); }
function obtener() {
  if (!estado) {
    estado = leerFresco();
    // la cartelera es de 7 noches desde el día en que se sembró: si ya pasó la
    // primera noche, se vuelve a sembrar para que "hoy" siempre tenga funciones
    if (!estado || estado.dia !== inicioDia(0)) estado = sembrar();
    guardar();
  }
  return estado;
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (ev) => { if (ev.key === LLAVE && ev.newValue) { try { estado = JSON.parse(ev.newValue); avisar(); } catch { /* */ } } });
}
// cada cambio parte de lo que hay en localStorage AHORA, para no pisar a otra pestaña;
// se guarda la COPIA (lección de KADE: con `|| e` los cambios se perdían).
function cambiar(fn) { const e = leerFresco() || obtener(); const copia = structuredClone(e); const r = fn(copia); estado = copia; guardar(); avisar(); return r; }

export const useCine = () => useSyncExternalStore((f) => { oyentes.add(f); return () => oyentes.delete(f); }, obtener);
export function reiniciarDemo() { estado = sembrar(); guardar(); avisar(); }

const YO = Math.random().toString(36).slice(2);
export function soyLider() {
  try {
    const l = JSON.parse(localStorage.getItem('demo_autocinema_lider') || 'null');
    if (l && l.id !== YO && Date.now() - l.t < 15000) return false;
    localStorage.setItem('demo_autocinema_lider', JSON.stringify({ id: YO, t: Date.now() }));
  } catch { /* esta pestaña simula sola */ }
  return true;
}

// ── consultas ───────────────────────────────────────────────────────────────
export const funcionPorId = (e, fid) => e.funciones.find((f) => f.id === fid);
export const ventasDe = (e, fid) => e.ventas.filter((v) => v.funcion === fid);
export const ocupados = (e, fid) => new Set(ventasDe(e, fid).map((v) => v.lugar));
export function libres(e, fid, zona) {
  const oc = ocupados(e, fid);
  return ZONAS[zona].lugares.filter((l) => !oc.has(l));
}
export const quedan = (e, fid, tipo) => libres(e, fid, boleto(tipo).zona).length;
export const ocupacion = (e, fid) => ventasDe(e, fid).length / CUPO_TOTAL;
export const misPases = (e) => e.ventas.filter((v) => v.mio).sort((a, b) => funcionPorId(e, a.funcion).t - funcionPorId(e, b.funcion).t);
export const pasePorCodigo = (e, c) => e.ventas.find((v) => v.codigo === c);
export const ordenesDe = (e, c) => e.ordenes.filter((o) => o.codigo === c).sort((a, b) => b.t - a.t);
export const funcionesDelDia = (e, d) => e.funciones.filter((f) => f.t >= inicioDia(d) && f.t < inicioDia(d + 1));
export const avisosDe = (e, fid) => e.avisos.filter((a) => a.funcion === fid);
export { inicioDia };

// ── acciones ────────────────────────────────────────────────────────────────
export function comprar({ funcion, tipo, lugar, nombre, telefono, combo, cupon }) {
  return cambiar((e) => {
    if (ocupados(e, funcion).has(lugar)) return { ok: false, motivo: 'ocupado' };
    const c = cupon && e.puntos.cupones.find((x) => x.id === cupon && !x.usado);
    const gratis = c && tipo === 'auto';
    const total = (gratis ? 0 : boleto(tipo).precio) + (combo ? platillo('combo').precio : 0);
    const v = { codigo: codigo(), funcion, tipo, lugar, nombre, telefono, total, t: Date.now(), mio: true, entro: null, cupon: gratis ? c.id : null };
    e.ventas.push(v);
    if (gratis) c.usado = Date.now();
    // el combo pagado por adelantado entra a cocina como orden programada
    if (combo) e.ordenes.push({ ...orden(v, [['combo', 1]], 'recibido', Date.now(), true), programada: true });
    const pts = sumarPuntos(e, total, `Boleto ${boleto(tipo).nombre}`);
    revisarRetos(e);
    return { ok: true, codigo: v.codigo, puntos: pts };
  });
}

export function pedir(codigoPase, items) {
  return cambiar((e) => {
    const v = pasePorCodigo(e, codigoPase);
    if (!v) return null;
    const o = orden(v, items, 'recibido', Date.now(), true);
    e.ordenes.push(o);
    o.puntos = sumarPuntos(e, o.total, `Pedido #${o.numero}`);
    revisarRetos(e);
    return { id: o.id, puntos: o.puntos };
  });
}

export function avanzarOrden(oid) {
  cambiar((e) => {
    const o = e.ordenes.find((x) => x.id === oid);
    if (!o) return;
    const i = ESTADOS_ORDEN.findIndex(([k]) => k === o.estado);
    if (i < ESTADOS_ORDEN.length - 1) { o.estado = ESTADOS_ORDEN[i + 1][0]; o.cambio = Date.now(); o.programada = false; }
  });
}

// Taquilla: lo que dice la pantalla cuando el lector pasa un pase.
// resultado: pasa · ya-entro · otra-funcion · no-existe
// Compra hecha en el lugar (taquilla o fuente de sodas) con el QR de cliente.
export function puntosEnLugar(pesos, donde) {
  return cambiar((e) => sumarPuntos(e, pesos, `Compra en ${donde} · ${dinero(pesos)}`));
}

export function leerPase(texto, funcionActual) {
  const crudo = String(texto).trim().toUpperCase();
  if (crudo.startsWith('ACS1.')) {
    const ok = crudo.slice(5) === CLIENTE.codigo;
    return { resultado: ok ? 'cliente' : 'no-existe', codigo: crudo.slice(5) };
  }
  const c = crudo.replace(/^ACC1\./, '');
  return cambiar((e) => {
    const v = pasePorCodigo(e, c);
    if (!v) return { resultado: 'no-existe', codigo: c };
    const f = funcionPorId(e, v.funcion);
    if (v.funcion !== funcionActual) return { resultado: 'otra-funcion', venta: { ...v }, funcion: f };
    if (v.entro) return { resultado: 'ya-entro', venta: { ...v }, funcion: f };
    v.entro = Date.now();
    if (v.mio) movimiento(e, 50, 'Visita al autocinema');
    return { resultado: 'pasa', venta: { ...v }, funcion: f };
  });
}

// Canjear: la comida sale a cocina como pedido de $0 a tu lugar; el boleto
// gratis queda como cupón para la siguiente compra de Auto.
export function canjear(rid, codigoPase) {
  return cambiar((e) => {
    const r = RECOMPENSAS.find((x) => x.id === rid);
    if (!r || e.puntos.saldo < r.costo) return { ok: false };
    if (r.tipo === 'comida') {
      const v = pasePorCodigo(e, codigoPase);
      if (!v) return { ok: false, motivo: 'sin-boleto' };
      const o = { ...orden(v, [[r.platillo, 1]], 'recibido', Date.now(), true), total: 0, recompensa: r.nombre };
      e.ordenes.push(o);
    } else {
      e.puntos.cupones.push({ id: id(), recompensa: r.id, nombre: r.nombre, t: Date.now(), usado: null });
    }
    movimiento(e, -r.costo, `Canje: ${r.nombre}`);
    return { ok: true, tipo: r.tipo };
  });
}

export function mandarAviso(funcion, texto) {
  cambiar((e) => { e.avisos.unshift({ id: id(), funcion, texto, t: Date.now() }); });
}

export function crearFuncion(peli, t) {
  cambiar((e) => { e.funciones.push({ id: id(), peli, t }); e.funciones.sort((a, b) => a.t - b.t); });
}

// Pases fijos para los botones de "pases de prueba" de la taquilla: se arman
// sobre la función que la taquilla tiene abierta.
export function pasesDePrueba(e, fid) {
  const de = ventasDe(e, fid);
  const mio = de.find((v) => v.mio && !v.entro);
  const pendiente = mio || de.find((v) => !v.entro && v.tipo === 'auto');
  const terror = de.find((v) => !v.entro && v.tipo === 'auto-terror' && v !== pendiente);
  const yaEntro = de.find((v) => v.entro);
  const otra = e.ventas.find((v) => v.funcion !== fid && funcionPorId(e, v.funcion).t > Date.now());
  return [
    pendiente && { etiqueta: mio ? 'Tu boleto' : 'Boleto de auto', codigo: pendiente.codigo },
    terror && { etiqueta: 'Auto Terrorífico', codigo: terror.codigo },
    yaEntro && { etiqueta: 'Ya entró', codigo: yaEntro.codigo },
    otra && { etiqueta: 'Otra función', codigo: otra.codigo },
    { etiqueta: `QR de cliente (${CLIENTE.nombre.split(' ')[0]})`, codigo: `ACS1.${CLIENTE.codigo}` },
    { etiqueta: 'Código falso', codigo: 'CCZZZZ' },
  ].filter(Boolean);
}

// ── simulación (solo la pestaña líder) ───────────────────────────────────────
export function simular() {
  cambiar((e) => {
    const futuras = e.funciones.filter((f) => f.t + 2 * HORA > Date.now());
    // alguien compra un boleto
    if (Math.random() < 0.6 && futuras.length) {
      const f = azar(futuras.slice(0, 6));
      const zona = azar(['auto', 'auto', 'auto', 'peatonal', 'vip', 'campana']);
      const libre = libres(e, f.id, zona);
      if (libre.length) e.ventas.push(venta(e, f.id, azar(libre), { t: Date.now() }));
    }
    // en la función de esta noche llegan autos y piden comida
    const hoy = funcionesDelDia(e, 0)[0];
    if (hoy) {
      // llegan de a poco y siempre quedan autos por llegar para probar la entrada
      const de = ventasDe(e, hoy.id);
      const faltan = de.filter((v) => !v.entro && !v.mio);
      if (faltan.length > de.length * 0.3 && Math.random() < 0.25) azar(faltan).entro = Date.now();
      const adentro = ventasDe(e, hoy.id).filter((v) => v.entro && !v.mio);
      if (adentro.length && Math.random() < 0.35) {
        e.ordenes.push(orden(azar(adentro), [[azar(['combo', 'hamburguesa', 'hotdog', 'alitas', 'nachos', 'pizza']), 1 + (Math.random() < 0.3)], [azar(['refresco', 'malteada', 'palomitas']), 1 + Math.floor(Math.random() * 3)]]));
      }
    }
    // la cocina avanza sola los pedidos de los demás (los tuyos los mueves tú desde Cocina)
    e.ordenes.forEach((o) => {
      if (o.mio || o.estado === 'entregado') return;
      const espera = { recibido: 1.2, preparando: 3, camino: 1.5 }[o.estado] * MIN;
      if (Date.now() - o.cambio > espera && Math.random() < 0.5) {
        const i = ESTADOS_ORDEN.findIndex(([k]) => k === o.estado);
        o.estado = ESTADOS_ORDEN[i + 1][0]; o.cambio = Date.now();
      }
    });
    e.ordenes = e.ordenes.slice(-80);
  });
}

export const dinero = (n) => `$${Math.round(n).toLocaleString('es-MX')}`;
export const hora = (t) => new Date(t).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
const may = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export const diaCorto = (t) => may(new Date(t).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''));
export const diaLargo = (t) => may(new Date(t).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }));
export function nombreDia(t) {
  const d = Math.round((inicioDia(0) - new Date(t).setHours(0, 0, 0, 0)) / -DIA);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  return may(new Date(t).toLocaleDateString('es-MX', { weekday: 'long' }));
}
