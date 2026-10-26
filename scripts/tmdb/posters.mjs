// Busca en TMDB el póster de cada película de la cartelera real del autocinema
// y escribe en posters.json la RUTA del póster (no la imagen): la demo lo carga
// de image.tmdb.org. Usa el póster original en inglés más votado: los de TMDB
// "en español" suelen ser de España (Bitelchus, Expediente Warren…) y chocan
// con los títulos de México que usa la cartelera.
//
// Uso (Mac):  node scripts/tmdb/posters.mjs
// La llave (API Read Access Token) se lee del llavero, servicio "TMDB"; nunca
// va en el repo ni en el navegador.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const token = process.env.TMDB_TOKEN || execSync('security find-generic-password -s TMDB -w', { encoding: 'utf8' }).trim();
const api = async (ruta) => {
  const r = await fetch(`https://api.themoviedb.org/3${ruta}`, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} en ${ruta}`);
  return r.json();
};

// [clave en datos.js, título original para buscar, año]
const PELIS = [
  ['lightsout', 'Lights Out', 2016], ['pesadilla', 'A Nightmare on Elm Street', 1984], ['monsterhouse', 'Monster House', 2006],
  ['weapons', 'Weapons', 2025], ['scream6', 'Scream VI', 2023], ['beetlejuice', 'Beetlejuice', 1988], ['sinners', 'Sinners', 2025],
  ['halloween', 'Halloween', 1978], ['siniestro', 'Sinister', 2012], ['coraline', 'Coraline', 2009], ['conjuro', 'The Conjuring', 2013],
  ['cadaver', 'Corpse Bride', 2005], ['hereditary', 'Hereditary', 2018], ['coco', 'Coco', 2017],
];

const salida = {};
for (const [clave, titulo, año] of PELIS) {
  const busca = await api(`/search/movie?query=${encodeURIComponent(titulo)}&year=${año}&include_adult=false`);
  const peli = busca.results.find((x) => (x.release_date || '').startsWith(String(año))) || busca.results[0];
  if (!peli) { console.log(`✗ ${clave}: sin resultados`); continue; }
  const img = await api(`/movie/${peli.id}/images?include_image_language=en,null`);
  const en = img.posters.filter((p) => p.iso_639_1 === 'en').sort((a, b) => b.vote_average - a.vote_average || b.width - a.width)[0];
  const ruta = en?.file_path || peli.poster_path;
  salida[clave] = { tmdb: peli.id, titulo: peli.title, ruta, ancho: en?.width || null };
  console.log(`✓ ${clave.padEnd(13)} ${peli.title} (${año}) · ${en?.width || '?'} px · ${ruta}`);
}
writeFileSync(new URL('./posters.json', import.meta.url), JSON.stringify(salida, null, 2) + '\n');
