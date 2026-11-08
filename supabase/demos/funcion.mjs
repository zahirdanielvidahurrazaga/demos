// Despliega una edge function a la base DEMOS (y solo a ella) por la Management
// API (el CLI viejo rechaza los tokens sbp_v0_).
//
//   node supabase/demos/funcion.mjs <nombre>          → sube functions/<nombre>/index.ts
//   node supabase/demos/funcion.mjs --secreto-tmdb    → guarda TMDB_TOKEN (del llavero "TMDB")
//                                                       como secreto de las funciones
// Token como sql.mjs (api.mjs). Antes de tocar nada comprueba que el proyecto se llame "Demos".
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { API, REF, leerToken } from './api.mjs';

const cab = { Authorization: `Bearer ${leerToken()}` };
const proyecto = await (await fetch(`${API}/projects/${REF}`, { headers: cab })).json();
if (!/demo/i.test(proyecto.name || '')) { console.error(`El proyecto ${REF} se llama "${proyecto.name}", no "Demos". No hago nada.`); process.exit(1); }

const arg = process.argv[2];
if (arg === '--secreto-tmdb') {
  const valor = process.env.TMDB_TOKEN || execFileSync('security', ['find-generic-password', '-s', 'TMDB', '-w'], { encoding: 'utf8' }).trim();
  const r = await fetch(`${API}/projects/${REF}/secrets`, { method: 'POST', headers: { ...cab, 'Content-Type': 'application/json' }, body: JSON.stringify([{ name: 'TMDB_TOKEN', value: valor }]) });
  console.log(r.ok ? '✓ TMDB_TOKEN guardado como secreto de las funciones de Demos' : `✗ ${r.status} ${await r.text()}`);
  process.exit(r.ok ? 0 : 1);
}
if (!arg) { console.error('Uso: node supabase/demos/funcion.mjs <nombre> | --secreto-tmdb'); process.exit(1); }

const archivo = path.join(path.dirname(new URL(import.meta.url).pathname), 'functions', arg, 'index.ts');
const form = new FormData();
form.append('metadata', JSON.stringify({ name: arg, entrypoint_path: 'index.ts', verify_jwt: true }));
form.append('file', new Blob([fs.readFileSync(archivo)], { type: 'application/typescript' }), 'index.ts');
const r = await fetch(`${API}/projects/${REF}/functions/deploy?slug=${arg}`, { method: 'POST', headers: cab, body: form });
console.log(r.ok ? `✓ ${arg} desplegada en Demos` : `✗ ${r.status} ${await r.text()}`);
