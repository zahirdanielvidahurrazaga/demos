// ─────────────────────────────────────────────────────────────────────────────
// TMDB para la demo del autocinema (Dueño → Nueva película).
//
// La llave de TMDB vive SOLO aquí, como secreto de la función (TMDB_TOKEN = API
// Read Access Token). El navegador nunca la ve: manda el título y recibe datos.
//   { q: "coco" }   → hasta 8 resultados para elegir (id, título, año, miniatura)
//   { id: 354912 }  → la ficha lista para la cartelera
//
// Mismos criterios que scripts/tmdb/*.mjs, para que las películas nuevas se vean
// igual que las de la cartelera:
//   · póster ORIGINAL en inglés más votado (los "en español" de TMDB suelen ser
//     de España y chocan con los títulos de México), w780
//   · título y sinopsis de México (si faltan: España, luego inglés)
//   · tráiler de México > oficial en inglés > España, el primero que YouTube
//     deje reproducir incrustado (hay privados, con restricción de edad o que
//     el estudio no deja incrustar)
// ─────────────────────────────────────────────────────────────────────────────

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const IMG = 'https://image.tmdb.org/t/p';

async function api(ruta: string) {
  const r = await fetch(`https://api.themoviedb.org/3${ruta}`, {
    headers: { Authorization: `Bearer ${Deno.env.get('TMDB_TOKEN')}`, accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

// Clasificación de México (TMDB la trae por país en release_dates)
const CLAS_MX = ['AA', 'A', 'B', 'B15', 'C', 'D'];

// true = se ve incrustado · false = seguro que NO (privado, edad, el estudio no
// deja incrustar) · null = no se pudo saber (a los servidores YouTube a veces
// les contesta "confirma que no eres un robot")
async function seVeIncrustado(key: string) {
  try {
    const html = await (await fetch(`https://www.youtube.com/watch?v=${key}&hl=es`, {
      headers: { 'accept-language': 'es-MX' }, signal: AbortSignal.timeout(4000),
    })).text();
    const estado = html.match(/"playabilityStatus":\{[^}]*\}/)?.[0];
    if (!estado) return null;
    if (/"status":"OK"/.test(estado)) {
      if (/"playableInEmbed":false/.test(html) || /"isFamilySafe":false/.test(html)) return false;
      return /"playableInEmbed":true/.test(html) ? true : null;
    }
    if (/robot|bot|confirm/i.test(estado)) return null;
    return false; // privado, eliminado, restricción de edad…
  } catch {
    return null;
  }
}

async function avance(id: number) {
  const IDIOMAS: Record<string, number> = { 'es-MX': 0, 'en-US': 10, 'es-ES': 20 };
  const esTrailer = (v: any) => v.site === 'YouTube' && v.type === 'Trailer' && /tr[aá]iler/i.test(v.name) && !/escena|clip|spot|tv/i.test(v.name);
  const candidatos: any[] = [];
  const listas = await Promise.all(Object.keys(IDIOMAS).map((l) => api(`/movie/${id}/videos?language=${l}`).then((r) => [l, r.results] as const)));
  for (const [idioma, vs] of listas) {
    for (const v of vs) if (esTrailer(v) && !candidatos.some((c) => c.key === v.key)) {
      candidatos.push({ ...v, puntaje: IDIOMAS[idioma] + (v.official ? 0 : 3) + (/oficial|official/i.test(v.name) ? 0 : 1) });
    }
  }
  candidatos.sort((a, b) => a.puntaje - b.puntaje || b.size - a.size);
  let sinRevisar: string | null = null;
  for (const v of candidatos.slice(0, 6)) {
    const ok = await seVeIncrustado(v.key);
    if (ok) return v.key;
    if (ok === null && !sinRevisar) sinRevisar = v.key;
  }
  // si YouTube no dejó revisar ninguno, el mejor candidato (el dueño lo puede cambiar)
  return sinRevisar || null;
}

async function ficha(id: number) {
  const [mx, es, en, imgs, creditos, fechas] = await Promise.all([
    api(`/movie/${id}?language=es-MX`), api(`/movie/${id}?language=es-ES`), api(`/movie/${id}?language=en-US`),
    api(`/movie/${id}/images?include_image_language=en,null`), api(`/movie/${id}/credits`), api(`/movie/${id}/release_dates`),
  ]);
  const poster = imgs.posters.filter((p: any) => p.iso_639_1 === 'en')
    .sort((a: any, b: any) => b.vote_average - a.vote_average || b.width - a.width)[0]?.file_path || mx.poster_path;
  const clas = (fechas.results.find((r: any) => r.iso_3166_1 === 'MX')?.release_dates || [])
    .map((r: any) => String(r.certification || '').toUpperCase().replace(/\s/g, '')).find((c: string) => CLAS_MX.includes(c)) || '';
  return {
    tmdb: id,
    titulo: mx.title || es.title || en.title,
    original: en.original_title,
    año: (mx.release_date || '').slice(0, 4),
    min: mx.runtime || null,
    genero: (mx.genres?.[0]?.name || '').replace(/^./, (c: string) => c.toUpperCase()),
    director: creditos.crew.find((c: any) => c.job === 'Director')?.name || '',
    sinopsis: mx.overview || es.overview || en.overview || '',
    clas,
    poster: poster ? `${IMG}/w780${poster}` : null,
    avance: await avance(id),
  };
}

// ── candado ────────────────────────────────────────────────────────────────
// La llave pública de Supabase va en el JavaScript de las demos, así que sola
// no protege nada: la función exige el MISMO código de acceso que abre la demo
// (demo_entrar, sin registrar visita) y frena a quien la llame en bucle.
const PERMITIDA = 'autocinema/cocodrilo';
const validos = new Map<string, number>();   // código → hasta cuándo vale (5 min)
async function codigoValido(codigo: string) {
  const c = String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length !== 8) return false;
  if ((validos.get(c) || 0) > Date.now()) return true;
  const llave = Deno.env.get('SUPABASE_ANON_KEY')!;
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/demo_entrar`, {
    method: 'POST', headers: { apikey: llave, Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_codigo: c, p_ruta: '/autocinema/cocodrilo', p_registrar: false }),
  });
  const d = r.ok ? await r.json() : null;
  const ok = !!d?.ok && (!d.demos || d.demos.includes(PERMITIDA));
  if (ok) validos.set(c, Date.now() + 5 * 60000);
  return ok;
}
const consultas = new Map<string, number[]>();   // ip → momentos (ventana de 10 min)
function demasiadas(ip: string) {
  const ahora = Date.now();
  const lista = (consultas.get(ip) || []).filter((t) => ahora - t < 10 * 60000);
  lista.push(ahora);
  consultas.set(ip, lista);
  return lista.length > 60;
}
const fichas = new Map<number, unknown>();   // la misma película no se vuelve a pedir a TMDB

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (!Deno.env.get('TMDB_TOKEN')) return Response.json({ error: 'Falta configurar TMDB' }, { status: 500, headers: cors });
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'sin-ip';
    if (demasiadas(ip)) return Response.json({ error: 'Demasiadas búsquedas, espera unos minutos' }, { status: 429, headers: cors });
    const { q, id, codigo } = await req.json();
    if (!(await codigoValido(codigo))) return Response.json({ error: 'Sin acceso a la demo' }, { status: 403, headers: cors });
    if (id) {
      const n = Number(id);
      if (!Number.isInteger(n) || n <= 0) return Response.json({ error: 'id inválido' }, { status: 400, headers: cors });
      if (!fichas.has(n)) fichas.set(n, await ficha(n));
      return Response.json(fichas.get(n), { headers: cors });
    }
    const texto = String(q || '').trim().slice(0, 80);
    if (texto.length < 2) return Response.json({ resultados: [] }, { headers: cors });
    const r = await api(`/search/movie?query=${encodeURIComponent(texto)}&language=es-MX&region=MX&include_adult=false`);
    const resultados = r.results.slice(0, 8).map((m: any) => ({
      id: m.id, titulo: m.title, original: m.original_title, año: (m.release_date || '').slice(0, 4),
      miniatura: m.poster_path ? `${IMG}/w154${m.poster_path}` : null,
    }));
    return Response.json({ resultados }, { headers: cors });
  } catch (e) {
    return Response.json({ error: String((e as Error).message || e) }, { status: 502, headers: cors });
  }
});
