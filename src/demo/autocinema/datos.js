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

// Casa del Terror por separado (sin película): por persona y por turno.
// Precios de ejemplo (su sitio solo la vende incluida en el boleto de cine).
export const CASA = {
  tipos: [
    { id: 'general', nombre: 'General', precio: 150, detalle: 'Recorrido de 15 minutos con actores en vivo' },
    { id: 'rapido', nombre: 'Acceso rápido', precio: 230, detalle: 'Entras sin hacer fila, a cualquier hora de tu turno', destacado: true },
  ],
  cupo: 40,
  turnos: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'],
};
export const turnoT = (dia, hhmm) => { const [h, m] = hhmm.split(':').map(Number); return dia + h * HORA + m * MIN; };

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

// ── Tú eliges la próxima (votación) ────────────────────────────────────────
export const PROPUESTAS = MODO === 'real' ? [
  { id: 'hocus', titulo: 'Abracadabra (Hocus Pocus)', año: 1993, poster: TMDB + '/by4D4Q9NlUjFSEUA1yrxq6ksXmk.jpg' },
  { id: 'gremlins', titulo: 'Gremlins', año: 1984, poster: TMDB + '/72Y1X9pMSjXQ7mKB6pBEoMhL0OQ.jpg' },
  { id: 'cazafantasmas', titulo: 'Los Cazafantasmas', año: 1984, poster: TMDB + '/xdpWriBfVcYUX0RDCqLvtMQdHIQ.jpg' },
  { id: 'extrano', titulo: 'El Extraño Mundo de Jack', año: 1993, poster: TMDB + '/oQffRNjK8e19rF7xVYEN8ew0j7b.jpg' },
] : [
  { id: 'galaxia', titulo: 'Órbita', año: 2025, poster: 'p-galaxia' },
  { id: 'baile', titulo: 'Noche Disco', año: 2023, poster: 'p-baile' },
  { id: 'amor', titulo: 'Atardecer en la Costa', año: 2024, poster: 'p-amor' },
  { id: 'casona', titulo: 'La Casona de la Colina', año: 2022, poster: 'p-casona' },
];

// ── ayuda en tu lugar ──────────────────────────────────────────────────────
export const AYUDAS = [
  { id: 'perdido', nombre: 'No encuentro mi lugar', detalle: 'Un acomodador va por ti con linterna' },
  { id: 'bateria', nombre: 'Se descargó mi batería', detalle: 'Te llevamos cables para pasar corriente' },
  { id: 'audio', nombre: 'No escucho la película', detalle: 'Te ayudamos a sintonizar la frecuencia' },
  { id: 'otro', nombre: 'Otra cosa', detalle: 'Alguien del equipo se acerca a tu auto' },
];

// ── eventos privados (cotizador) ───────────────────────────────────────────
// Precios de EJEMPLO para enseñar el cotizador; el autocinema pone los suyos.
export const EVENTO = {
  tipos: ['Cumpleaños', 'Empresa', 'Pedida de mano', 'Graduación', 'Otro'],
  base: 18000, incluye: 20, porAuto: 350,
  extras: [
    { id: 'comida', nombre: 'Combo de comida por auto', precio: 250, porAuto: true },
    { id: 'pantalla', nombre: 'Mensaje o video tuyo en la pantalla', precio: 800 },
    { id: 'decoracion', nombre: 'Decoración y luces', precio: 3500 },
    { id: 'terror', nombre: 'Casa del Terror privada', precio: 4000 },
    { id: 'foto', nombre: 'Fotógrafo (2 horas)', precio: 2800 },
  ],
};
export function cotizar({ autos, extras }) {
  const lineas = [['Renta del autocinema (hasta ' + EVENTO.incluye + ' autos)', EVENTO.base]];
  if (autos > EVENTO.incluye) lineas.push([`${autos - EVENTO.incluye} autos extra`, (autos - EVENTO.incluye) * EVENTO.porAuto]);
  EVENTO.extras.filter((x) => extras.includes(x.id)).forEach((x) => lineas.push([x.porAuto ? `${x.nombre} × ${autos}` : x.nombre, x.porAuto ? x.precio * autos : x.precio]));
  return { lineas, total: lineas.reduce((n, [, v]) => n + v, 0) };
}

// ── inventario de la fuente de sodas ────────────────────────────────────────
// Cada pedido descuenta sus insumos (RECETAS); si un insumo no alcanza, el
// platillo sale "agotado" en el menú del cliente.
export const INSUMOS = [
  { id: 'pan-hd', nombre: 'Pan para hot dog', unidad: 'pzas', max: 240, minimo: 40 },
  { id: 'salchicha', nombre: 'Salchicha', unidad: 'pzas', max: 240, minimo: 40 },
  { id: 'pan-ham', nombre: 'Pan brioche', unidad: 'pzas', max: 120, minimo: 20 },
  { id: 'carne', nombre: 'Carne para hamburguesa', unidad: 'pzas', max: 240, minimo: 40 },
  { id: 'alitas', nombre: 'Alitas', unidad: 'kg', max: 30, minimo: 5 },
  { id: 'pizza', nombre: 'Base de pizza', unidad: 'pzas', max: 60, minimo: 10 },
  { id: 'nachos', nombre: 'Totopos', unidad: 'kg', max: 20, minimo: 4 },
  { id: 'queso', nombre: 'Queso para nachos', unidad: 'kg', max: 15, minimo: 3 },
  { id: 'maiz', nombre: 'Maíz palomero', unidad: 'kg', max: 40, minimo: 8 },
  { id: 'helado', nombre: 'Helado para malteada', unidad: 'L', max: 20, minimo: 4 },
  { id: 'refresco', nombre: 'Jarabe de refresco', unidad: 'L', max: 60, minimo: 10 },
  { id: 'vasos', nombre: 'Vasos grandes', unidad: 'pzas', max: 600, minimo: 100 },
];
export const RECETAS = {
  hotdog: [['pan-hd', 1], ['salchicha', 1]],
  hamburguesa: [['pan-ham', 1], ['carne', 2]],
  alitas: [['alitas', 0.5]],
  pizza: [['pizza', 1]],
  nachos: [['nachos', 0.2], ['queso', 0.15]],
  palomitas: [['maiz', 0.25]],
  malteada: [['helado', 0.3], ['vasos', 1]],
  refresco: [['refresco', 0.4], ['vasos', 1]],
  combo: [['pan-hd', 2], ['salchicha', 2], ['maiz', 0.25], ['refresco', 0.8], ['vasos', 2]],
  'combo-familia': [['pizza', 2], ['nachos', 0.2], ['queso', 0.15], ['maiz', 0.25], ['refresco', 1.6], ['vasos', 4]],
};
function descontar(e, items) {
  items.forEach(([pid, q]) => (RECETAS[pid] || []).forEach(([ins, n]) => { e.inventario[ins] = Math.max(0, +(e.inventario[ins] - n * q).toFixed(2)); }));
}
export const disponible = (e, pid) => (RECETAS[pid] || []).every(([ins, n]) => (e.inventario?.[ins] ?? 999) >= n);
// el pedido completo (varios platillos comparten insumos): ¿alcanza todo junto?
export function alcanza(e, items) {
  const falta = {};
  items.forEach(([pid, q]) => (RECETAS[pid] || []).forEach(([ins, n]) => { falta[ins] = (falta[ins] || 0) + n * q; }));
  return Object.entries(falta).every(([ins, n]) => (e.inventario?.[ins] ?? 999) >= n - 1e-9);
}
function reponer(e, items) {
  items.forEach(([pid, q]) => (RECETAS[pid] || []).forEach(([ins, n]) => { const i = INSUMOS.find((x) => x.id === ins); e.inventario[ins] = Math.min(i.max, +(e.inventario[ins] + n * q).toFixed(2)); }));
}

// ── trivia antes de la película ─────────────────────────────────────────────
// 5 preguntas: 2 de la película de tu función (año y director, sacados de los
// datos, así siempre son correctas) + 3 de cine y autocinema. 20 Cocopuntos por
// acierto; el ranking de la noche se proyecta en la pantalla.
export const TRIVIA_SEGUNDOS = 15;
export const TRIVIA_PUNTOS = 20;
const TRIVIA_GENERAL = [
  { p: '¿En qué país abrió el primer autocinema del mundo, en 1933?', o: ['Estados Unidos', 'México', 'Francia', 'Japón'] },
  { p: '¿Cómo se escucha la película en un autocinema?', o: ['En la radio de tu auto', 'Con audífonos', 'Con bocinas en cada fila', 'Por una app'] },
  { p: '¿Qué villano usa un guante con navajas?', o: ['Freddy Krueger', 'Jason Voorhees', 'Michael Myers', 'Chucky'] },
  { p: '¿Cómo se llama el asesino enmascarado de Halloween?', o: ['Michael Myers', 'Freddy Krueger', 'Ghostface', 'Leatherface'] },
  { p: 'En Coco, ¿cómo se llama el perro de Miguel?', o: ['Dante', 'Pepita', 'Héctor', 'Ernesto'] },
  { p: '¿Cuántas veces hay que decir su nombre para invocar a Beetlejuice?', o: ['Tres', 'Dos', 'Cinco', 'Siete'] },
  { p: 'En Coraline, ¿qué tienen los "otros" padres en lugar de ojos?', o: ['Botones', 'Canicas', 'Espejos', 'Monedas'] },
  { p: '¿Qué investigadores de lo paranormal protagonizan El Conjuro?', o: ['Ed y Lorraine Warren', 'Mulder y Scully', 'Los Winchester', 'Los Addams'] },
  { p: '¿En qué saga aparece Ghostface?', o: ['Scream', 'Halloween', 'Viernes 13', 'El Conjuro'] },
  { p: '¿Qué días se celebra el Día de Muertos en México?', o: ['1 y 2 de noviembre', '31 de octubre', '15 y 16 de septiembre', '24 y 25 de diciembre'] },
];
const revolver = (a, sem) => { const r = [...a]; let x = sem; for (let i = r.length - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; const j = Math.floor((x / 233280) * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
// Preguntas de una función: siempre las mismas para todos los autos de esa función.
export function preguntasDe(f) {
  const p = PELICULAS[f.peli];
  const sem = [...f.id].reduce((n, c) => n + c.charCodeAt(0), 0);
  const otras = Object.values(PELICULAS).filter((x) => x !== p);
  const qs = [];
  if (typeof p.año === 'number') qs.push({ p: `¿En qué año se estrenó ${p.titulo}?`, o: [p.año, p.año - 2, p.año - 5, p.año - 9].map(String) });
  const directores = [...new Set(otras.map((x) => x.director).filter((d) => d && d !== p.director))];
  if (p.director && p.director !== 'El Diablo' && directores.length >= 3) qs.push({ p: `¿Quién dirigió ${p.titulo}?`, o: [p.director, ...revolver(directores, sem).slice(0, 3)] });
  else qs.push({ p: `¿De qué género es ${p.titulo}?`, o: [p.genero, ...revolver([...new Set(otras.map((x) => x.genero))].filter((g) => g !== p.genero), sem).slice(0, 3)] });
  qs.push(...revolver(TRIVIA_GENERAL, sem).slice(0, 5 - qs.length));
  // la buena siempre es la opción 0 en los datos; se revuelven para mostrarlas
  return qs.map((q, k) => { const orden = revolver([0, 1, 2, 3], sem + k * 7); return { pregunta: q.p, opciones: orden.map((i) => q.o[i]), buena: orden.indexOf(0) }; });
}

// ── clima y lluvia ──────────────────────────────────────────────────────────
export const climaDe = (e, t) => e.clima?.[new Date(t).setHours(0, 0, 0, 0)] || { lluvia: 0 };

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
  const e = { v: 9, modo: MODO, dia: inicioDia(0), funciones: [], ventas: [], ordenes: [], avisos: [], historial: [] };
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
  // inventario: la mayoría a buen nivel, algunos ya bajos para que se vea la alerta
  e.inventario = Object.fromEntries(INSUMOS.map((i) => [i.id, +(i.max * ({ salchicha: 0.18, helado: 0.22, queso: 0.3 }[i.id] || (0.55 + Math.random() * 0.4))).toFixed(1)]));
  // reacciones de quienes ya vieron cada película (más o menos según la película)
  e.reacciones = Object.fromEntries(Object.keys(PELICULAS).map((k) => { const n = 80 + Math.floor(Math.random() * 300), gusto = 0.62 + Math.random() * 0.3; return [k, { encanta: Math.round(n * gusto), bien: Math.round(n * (1 - gusto) * 0.7), no: Math.round(n * (1 - gusto) * 0.3) }]; }));
  e.misReacciones = {};
  e.votos = Object.fromEntries(PROPUESTAS.map((x, k) => [x.id, [312, 198, 245, 176][k] || 100]));
  e.miVoto = null;
  e.sugerencias = [{ id: id(), texto: 'Hocus Pocus 2', nombre: 'Daniela H.', t: Date.now() - 5 * HORA }, { id: id(), texto: 'Volver al Futuro', nombre: 'Jorge L.', t: Date.now() - 26 * HORA }];
  e.ayuda = [];
  // pronóstico: mañana con buena probabilidad de lluvia para enseñar el flujo
  e.clima = {};
  for (let d = -1; d < 8; d++) e.clima[inicioDia(d)] = { lluvia: d === 1 ? 70 : d === 0 ? 20 : [10, 5, 30, 15, 0, 40][(d + 6) % 6], desde: d === 1 ? '21:00' : '22:00' };
  e.trivia = {};
  e.cotizaciones = [
    { id: id(), nombre: 'Laura Méndez', tipo: 'Cumpleaños', fecha: inicioDia(12), autos: 25, extras: ['comida', 'pantalla'], total: cotizar({ autos: 25, extras: ['comida', 'pantalla'] }).total, t: Date.now() - 20 * HORA, estado: 'nueva', mio: false },
    { id: id(), nombre: 'Grupo Andrade (RH)', tipo: 'Empresa', fecha: inicioDia(19), autos: 60, extras: ['comida', 'decoracion', 'foto'], total: cotizar({ autos: 60, extras: ['comida', 'decoracion', 'foto'] }).total, t: Date.now() - 50 * HORA, estado: 'enviada', mio: false },
  ];

  // Casa del Terror: los turnos de la noche se llenan más (y el fin de semana)
  e.casa = [];
  for (let d = 0; d < 7; d++) {
    const dia = inicioDia(d), finde = [5, 6].includes(new Date(dia).getDay());
    CASA.turnos.forEach((h, k) => {
      let gente = Math.round(CASA.cupo * Math.min(0.95, (finde ? 0.55 : 0.3) + (k > 3 && k < 9 ? 0.25 : 0) - d * 0.04 + Math.random() * 0.2));
      while (gente > 0) {
        const n = Math.min(gente, 1 + Math.floor(Math.random() * 4));
        e.casa.push({ codigo: 'CT' + codigo().slice(2), t: turnoT(dia, h), personas: n, tipo: Math.random() < 0.3 ? 'rapido' : 'general', nombre: azar(NOMBRES), total: 0, mio: false, entro: null });
        gente -= n;
      }
    });
  }

  // trivia: algunos autos de las funciones de hoy ya jugaron
  funcionesDelDia(e, 0).forEach((f) => ventasDe(e, f.id).forEach((v) => {
    if (Math.random() < 0.45) { const a = Math.floor(Math.random() * 6); e.trivia[v.codigo] = { aciertos: a, puntaje: a * 100 + Math.floor(Math.random() * 60) * a, nombre: v.nombre, lugar: v.lugar, funcion: f.id, t: Date.now() - Math.random() * 2 * HORA }; }
  }));

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
const LLAVE = `demo_autocinema_v9_${MODO}`;
let estado = null;
const oyentes = new Set();
function leerFresco() {
  try { const t = localStorage.getItem(LLAVE); if (t) { const e = JSON.parse(t); if (e.v === 9) return e; } } catch { /* sin almacenamiento */ }
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
export const casaOcupados = (e, t) => (e.casa || []).filter((c) => c.t === t).reduce((n, c) => n + c.personas, 0);
export const misCasa = (e) => (e.casa || []).filter((c) => c.mio).sort((a, b) => a.t - b.t);
export const funcionesDelDia = (e, d) => e.funciones.filter((f) => f.t >= inicioDia(d) && f.t < inicioDia(d + 1));
export const avisosDe = (e, fid) => e.avisos.filter((a) => a.funcion === fid);
export { inicioDia };

// ── acciones ────────────────────────────────────────────────────────────────
export function comprar({ funcion, tipo, lugar, nombre, telefono, combo, cupon }) {
  return cambiar((e) => {
    if (ocupados(e, funcion).has(lugar)) return { ok: false, motivo: 'ocupado' };
    if (funcionPorId(e, funcion)?.cancelada) return { ok: false, motivo: 'cancelada' };
    const c = cupon && e.puntos.cupones.find((x) => x.id === cupon && !x.usado);
    const gratis = c && tipo === 'auto';
    const total = (gratis ? 0 : boleto(tipo).precio) + (combo ? platillo('combo').precio : 0);
    const v = { codigo: codigo(), funcion, tipo, lugar, nombre, telefono, total, t: Date.now(), mio: true, entro: null, cupon: gratis ? c.id : null };
    e.ventas.push(v);
    if (gratis) c.usado = Date.now();
    // el combo pagado por adelantado entra a cocina como orden programada
    if (combo) { e.ordenes.push({ ...orden(v, [['combo', 1]], 'programado', Date.now(), true), programada: true, para: 'llegada', enBoleto: true }); descontar(e, [['combo', 1]]); }
    const pts = sumarPuntos(e, total, `Boleto ${boleto(tipo).nombre}`);
    revisarRetos(e);
    return { ok: true, codigo: v.codigo, puntos: pts };
  });
}

// cuando: 'ahora' · 'llegada' (se prepara cuando la entrada lee tu boleto) ·
// 'HH:MM' de la noche de tu función (se prepara a esa hora)
export function pedir(codigoPase, items, cuando = 'ahora') {
  return cambiar((e) => {
    const v = pasePorCodigo(e, codigoPase);
    if (!v) return null;
    if (!alcanza(e, items)) return { ok: false, motivo: 'agotado' };
    const o = orden(v, items, 'recibido', Date.now(), true);
    if (cuando !== 'ahora' && !(cuando === 'llegada' && v.entro)) {
      o.estado = 'programado'; o.programada = true;
      o.para = cuando === 'llegada' ? 'llegada' : turnoT(new Date(funcionPorId(e, v.funcion).t).setHours(0, 0, 0, 0), cuando);
    }
    descontar(e, items);
    e.ordenes.push(o);
    o.puntos = sumarPuntos(e, o.total, `Pedido #${o.numero}`);
    revisarRetos(e);
    return { ok: true, id: o.id, puntos: o.puntos };
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
export function comprarCasa({ t, personas, tipo, nombre }) {
  return cambiar((e) => {
    e.casa = e.casa || [];
    if (casaOcupados(e, t) + personas > CASA.cupo) return { ok: false, motivo: 'lleno' };
    const tp = CASA.tipos.find((x) => x.id === tipo);
    const c = { codigo: 'CT' + codigo().slice(2), t, personas, tipo, nombre, total: tp.precio * personas, mio: true, entro: null, comprado: Date.now() };
    e.casa.push(c);
    const pts = sumarPuntos(e, c.total, `Casa del Terror · ${personas} ${personas === 1 ? 'persona' : 'personas'}`);
    return { ok: true, codigo: c.codigo, puntos: pts };
  });
}

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
  if (c.startsWith('CT')) {
    return cambiar((e) => {
      const v = (e.casa || []).find((x) => x.codigo === c);
      if (!v) return { resultado: 'no-existe', codigo: c };
      if (new Date(v.t).setHours(0, 0, 0, 0) !== inicioDia(0)) return { resultado: 'casa-otro-dia', casa: { ...v } };
      if (v.entro) return { resultado: 'casa-ya', casa: { ...v } };
      v.entro = Date.now();
      return { resultado: 'casa', casa: { ...v } };
    });
  }
  return cambiar((e) => {
    const v = pasePorCodigo(e, c);
    if (!v) return { resultado: 'no-existe', codigo: c };
    const f = funcionPorId(e, v.funcion);
    if (v.reembolso) return { resultado: 'reembolsado', venta: { ...v }, funcion: f };
    if (f.cancelada) return { resultado: 'cancelada', venta: { ...v }, funcion: f };
    if (v.funcion !== funcionActual) return { resultado: 'otra-funcion', venta: { ...v }, funcion: f };
    if (v.entro) return { resultado: 'ya-entro', venta: { ...v }, funcion: f };
    v.entro = Date.now();
    if (v.mio) movimiento(e, 50, 'Visita al autocinema');
    // lo que pidió "para cuando llegue" entra a cocina en este momento
    e.ordenes.forEach((o) => { if (o.codigo === v.codigo && o.estado === 'programado' && o.para === 'llegada') { o.estado = 'recibido'; o.cambio = Date.now(); o.llego = true; } });
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
      descontar(e, [[r.platillo, 1]]);
      e.ordenes.push(o);
    } else {
      e.puntos.cupones.push({ id: id(), recompensa: r.id, nombre: r.nombre, t: Date.now(), usado: null });
    }
    movimiento(e, -r.costo, `Canje: ${r.nombre}`);
    return { ok: true, tipo: r.tipo };
  });
}

export function pedirAyuda(codigoPase, tipo) {
  return cambiar((e) => {
    const v = pasePorCodigo(e, codigoPase);
    if (!v) return null;
    const a = { id: id(), codigo: v.codigo, lugar: v.lugar, nombre: v.nombre, tipo, t: Date.now(), estado: 'pendiente', mio: true };
    e.ayuda.unshift(a);
    return a.id;
  });
}
export function atenderAyuda(aid) {
  cambiar((e) => { const a = e.ayuda.find((x) => x.id === aid); if (a) { a.estado = a.estado === 'pendiente' ? 'camino' : 'resuelta'; a.cambio = Date.now(); } });
}
export function reaccionar(peli, tipo) {
  cambiar((e) => {
    const antes = e.misReacciones[peli];
    if (antes) e.reacciones[peli][antes] -= 1;
    if (antes === tipo) { delete e.misReacciones[peli]; return; }
    e.reacciones[peli][tipo] += 1; e.misReacciones[peli] = tipo;
  });
}
export function votar(pid) {
  cambiar((e) => { if (e.miVoto) e.votos[e.miVoto] -= 1; e.votos[pid] += 1; e.miVoto = pid; });
}
export function sugerir(texto) {
  cambiar((e) => { e.sugerencias.unshift({ id: id(), texto, nombre: CLIENTE.nombre, t: Date.now(), mia: true }); });
}
export function pedirCotizacion(datos) {
  return cambiar((e) => {
    const c = { id: id(), ...datos, total: cotizar(datos).total, t: Date.now(), estado: 'nueva', mio: true };
    e.cotizaciones.unshift(c);
    return c.id;
  });
}
export function marcarCotizacion(cid, estado) {
  cambiar((e) => { const c = e.cotizaciones.find((x) => x.id === cid); if (c) c.estado = estado; });
}
export function surtir(ins) {
  cambiar((e) => { const i = INSUMOS.find((x) => x.id === ins); if (i) e.inventario[ins] = i.max; });
}

export function terminarTrivia(codigoPase, aciertos, puntaje) {
  return cambiar((e) => {
    const v = pasePorCodigo(e, codigoPase);
    if (!v || e.trivia[v.codigo]) return null;
    e.trivia[v.codigo] = { aciertos, puntaje, nombre: v.nombre, lugar: v.lugar, funcion: v.funcion, t: Date.now(), mio: true };
    if (aciertos) movimiento(e, aciertos * TRIVIA_PUNTOS, `Trivia de ${PELICULAS[funcionPorId(e, v.funcion).peli].titulo} · ${aciertos} de 5`);
    return rankingTrivia(e, v.funcion).findIndex((r) => r.codigo === v.codigo) + 1;
  });
}
export const rankingTrivia = (e, fid) => Object.entries(e.trivia || {}).filter(([, r]) => r.funcion === fid).map(([codigo, r]) => ({ codigo, ...r })).sort((a, b) => b.puntaje - a.puntaje || a.t - b.t);

// Lluvia: el dueño cancela una función; todos sus boletos quedan "por
// reprogramar" y les llega el aviso. El cliente cambia de fecha (mismo tipo de
// boleto, lugar en la misma zona, +100 Cocopuntos) o pide su reembolso.
export function cancelarPorLluvia(fid) {
  cambiar((e) => {
    const f = funcionPorId(e, fid); if (!f || f.cancelada) return;
    f.cancelada = { motivo: 'lluvia', t: Date.now() };
    ventasDe(e, fid).forEach((v) => { v.pendiente = 'lluvia'; });
    e.avisos.unshift({ id: id(), funcion: fid, texto: `Por lluvia cancelamos la función de ${PELICULAS[f.peli].titulo} de las ${hora(f.t)}. Cambia tu fecha sin costo o pide tu reembolso desde tu boleto.`, t: Date.now(), lluvia: true });
  });
}
export function reanudarFuncion(fid) {
  cambiar((e) => {
    const f = funcionPorId(e, fid); if (!f) return;
    delete f.cancelada;
    ventasDe(e, fid).forEach((v) => { delete v.pendiente; });
    e.avisos = e.avisos.filter((a) => !(a.funcion === fid && a.lluvia));
  });
}
// lugar libre en la nueva función: el mismo si está libre; si no, el más
// parecido de la misma zona (misma fila primero)
export function lugarParecido(e, fid, lugar, tipo) {
  const libre = libres(e, fid, boleto(tipo).zona);
  if (libre.includes(lugar)) return lugar;
  const [fila, n] = lugar.split('-');
  return libre.sort((a, b) => { const [fa, na] = a.split('-'), [fb, nb] = b.split('-'); return (fa !== fila) - (fb !== fila) || Math.abs(na - n) - Math.abs(nb - n); })[0] || null;
}
export function cambiarFecha(codigoPase, fid) {
  return cambiar((e) => {
    const v = pasePorCodigo(e, codigoPase);
    // solo boletos que siguen cancelados (evita el doble regalo desde otra pestaña)
    if (!v || v.pendiente !== 'lluvia') return { ok: false, motivo: 'ya-cambiado' };
    const lugar = lugarParecido(e, fid, v.lugar, v.tipo);
    if (!lugar) return { ok: false, motivo: 'lleno' };
    const de = v.funcion;
    v.funcion = fid; v.lugar = lugar; delete v.pendiente; v.reprogramado = { de, t: Date.now() };
    v.entro = null;   // si ya había entrado a la función cancelada, en la nueva todavía no
    delete e.trivia[v.codigo];   // otra película, otra trivia (los puntos ya ganados se quedan)
    // la comida programada se va con el boleto; la que era a una hora, a esa hora del nuevo día
    const corrimiento = new Date(funcionPorId(e, fid).t).setHours(0, 0, 0, 0) - new Date(funcionPorId(e, de).t).setHours(0, 0, 0, 0);
    e.ordenes.forEach((o) => { if (o.codigo === v.codigo && o.estado === 'programado') { o.funcion = fid; o.lugar = lugar; if (typeof o.para === 'number') o.para += corrimiento; } });
    if (v.mio) movimiento(e, 100, 'Regalo por cambio de fecha (lluvia)');
    return { ok: true, lugar };
  });
}
export function pedirReembolso(codigoPase) {
  cambiar((e) => {
    const v = pasePorCodigo(e, codigoPase);
    if (!v || v.pendiente !== 'lluvia') return;
    let comida = 0;
    // el combo comprado con el boleto ya viene en v.total; lo pedido aparte se suma
    e.ordenes.forEach((o) => { if (o.codigo === v.codigo && o.estado === 'programado') { o.estado = 'cancelado'; o.cambio = Date.now(); reponer(e, o.items); if (!o.enBoleto) comida += o.total; } });
    v.pendiente = null; v.reembolso = { t: Date.now(), total: v.total + comida };
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
  const casaHoy = (e.casa || []).filter((c) => !c.entro && new Date(c.t).setHours(0, 0, 0, 0) === inicioDia(0)).sort((a, b) => b.mio - a.mio)[0];
  return [
    pendiente && { etiqueta: mio ? 'Tu boleto' : 'Boleto de auto', codigo: pendiente.codigo },
    terror && { etiqueta: 'Auto Terrorífico', codigo: terror.codigo },
    yaEntro && { etiqueta: 'Ya entró', codigo: yaEntro.codigo },
    otra && { etiqueta: 'Otra función', codigo: otra.codigo },
    casaHoy && { etiqueta: 'Solo Casa del Terror', codigo: casaHoy.codigo },
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
        const items = [[azar(['combo', 'hamburguesa', 'hotdog', 'alitas', 'nachos', 'pizza']), 1 + (Math.random() < 0.3)], [azar(['refresco', 'malteada', 'palomitas']), 1 + Math.floor(Math.random() * 3)]].filter(([pid]) => disponible(e, pid));
        if (items.length) { e.ordenes.push(orden(azar(adentro), items)); descontar(e, items); }
      }
      // de vez en cuando alguien pide ayuda en su lugar
      if (adentro.length && Math.random() < 0.08 && e.ayuda.filter((a) => a.estado !== 'resuelta').length < 4) {
        const v = azar(adentro);
        e.ayuda.unshift({ id: id(), codigo: v.codigo, lugar: v.lugar, nombre: v.nombre, tipo: azar(['perdido', 'bateria', 'audio', 'perdido']), t: Date.now(), estado: 'pendiente', mio: false });
      }
    }
    // tras una cancelación por lluvia, los demás van cambiando su fecha solos
    e.ventas.forEach((v) => {
      if (v.pendiente !== 'lluvia' || v.mio || Math.random() > 0.08) return;
      const f = funcionPorId(e, v.funcion);
      const otra = e.funciones.find((x) => x.t > f.t && !x.cancelada && x.peli === f.peli) || e.funciones.find((x) => x.t > f.t && !x.cancelada);
      const lugar = otra && lugarParecido(e, otra.id, v.lugar, v.tipo);
      if (lugar) { v.reprogramado = { de: v.funcion, t: Date.now() }; v.funcion = otra.id; v.lugar = lugar; delete v.pendiente; }
    });
    // los programados a una hora entran a cocina a su hora
    e.ordenes.forEach((o) => {
      if (o.estado !== 'programado' || typeof o.para !== 'number' || o.para > Date.now()) return;
      if (pasePorCodigo(e, o.codigo)?.pendiente) return;   // su función se canceló: espera a que la reprogramen
      o.estado = 'recibido'; o.cambio = Date.now();
    });
    // la cocina avanza sola los pedidos de los demás (los tuyos los mueves tú desde Cocina)
    e.ordenes.forEach((o) => {
      if (o.mio || o.estado === 'entregado' || o.estado === 'programado') return;
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
