// Busca en TMDB el AVANCE (tráiler) de cada película de la cartelera real y
// escribe en avances.json la clave de YouTube (no el video): la demo lo
// reproduce con el reproductor de youtube-nocookie.com.
// Prioridad: tráiler de México → tráiler oficial en inglés → España (ver abajo).
//
// Uso (Mac):  node scripts/tmdb/avances.mjs   (antes: posters.mjs, de ahí salen los ids)
// La llave se lee del llavero, servicio "TMDB"; nunca va en el repo ni en el navegador.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const token = process.env.TMDB_TOKEN || execSync('security find-generic-password -s TMDB -w', { encoding: 'utf8' }).trim();
const api = async (ruta) => {
  const r = await fetch(`https://api.themoviedb.org/3${ruta}`, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} en ${ruta}`);
  return r.json();
};
async function seVeIncrustado(key) {
  const html = await (await fetch(`https://www.youtube.com/watch?v=${key}&hl=es`, { headers: { 'accept-language': 'es-MX' } })).text();
  const ok = /"playabilityStatus":\{"status":"OK"/.test(html);
  const incrustable = /"playableInEmbed":true/.test(html);
  const paraTodos = !/"isFamilySafe":false/.test(html) && !/AGE_VERIFICATION|AGE_CHECK|ageRestricted/i.test(html.match(/"playabilityStatus":\{[^}]*\}/)?.[0] || '');
  return ok && incrustable && paraTodos;
}
const posters = JSON.parse(readFileSync(new URL('./posters.json', import.meta.url), 'utf8'));

const salida = {};
for (const [clave, { tmdb, titulo }] of Object.entries(posters)) {
  const pedir = async (idioma) => (await api(`/movie/${tmdb}/videos?language=${idioma}`)).results
    .filter((v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
  // Puntaje: tráiler de México > tráiler oficial en inglés (subtitulable) > España
  // (los de España dicen "Bitelchus", "Expediente Warren": chocan con los
  // títulos de México, igual que pasó con los pósters). Escenas, spots y
  // anuncios cortos ("Consigue tus boletos") no cuentan como avance.
  const IDIOMAS = { 'es-MX': 0, 'en-US': 10, 'es-ES': 20 };
  const esTrailer = (v) => v.type === 'Trailer' && /tr[aá]iler/i.test(v.name) && !/escena|clip|spot|tv/i.test(v.name);
  const candidatos = [];
  for (const idioma of Object.keys(IDIOMAS)) {
    for (const v of await pedir(idioma)) if (esTrailer(v)) candidatos.push({ ...v, idioma, puntaje: IDIOMAS[idioma] + (v.official ? 0 : 3) + (/oficial|official/i.test(v.name) ? 0 : 1) });
  }
  candidatos.sort((a, b) => a.puntaje - b.puntaje || b.size - a.size);
  // El primero que de verdad se puede ver DENTRO de la demo: hay tráileres
  // privados, que piden iniciar sesión, con restricción de edad (muchos de
  // terror) o que el estudio no deja incrustar → en la demo salía "acceso
  // restringido". Se revisa la página de YouTube de cada candidato.
  let elegido = null;
  for (const v of candidatos) {
    if (await seVeIncrustado(v.key)) { elegido = v; break; }
    console.log(`   · ${clave}: ${v.key} no se puede incrustar, sigue el siguiente`);
  }
  if (!elegido) { console.log(`✗ ${clave}: sin avance`); continue; }
  salida[clave] = { youtube: elegido.key, nombre: elegido.name, idioma: elegido.idioma };
  console.log(`✓ ${clave.padEnd(13)} ${titulo} · ${elegido.idioma} · ${elegido.name} · ${elegido.key}`);
}
writeFileSync(new URL('./avances.json', import.meta.url), JSON.stringify(salida, null, 2) + '\n');
