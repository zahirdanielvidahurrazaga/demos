// Corre SQL contra la base DEMOS —y solo contra ella— con la Management API de
// Supabase. Sirve en Windows y en Mac (consulta.sh necesita el llavero de macOS).
//
//   node supabase/demos/sql.mjs supabase/demos/20_gimnasio.sql
//   node supabase/demos/sql.mjs -e "select count(*) from gym_socios"
//
// Token (Personal Access Token): variable SUPABASE_DEMOS_TOKEN o el archivo
// ~/.supabase-demos-token. Nunca en el repo.
//
// ⚠️ Esa cuenta de Supabase también tiene la base del POS. El ref va FIJO aquí
// y antes de correr nada se comprueba que el proyecto se llame "Demos".
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REF = 'qwqrbckivrkmeykiukug';
const API = 'https://api.supabase.com/v1';

function leerToken() {
  if (process.env.SUPABASE_DEMOS_TOKEN) return process.env.SUPABASE_DEMOS_TOKEN.trim();
  const archivo = path.join(os.homedir(), '.supabase-demos-token');
  if (fs.existsSync(archivo)) return fs.readFileSync(archivo, 'utf8').replace(/^﻿/, '').trim();
  console.error(`Falta el token: define SUPABASE_DEMOS_TOKEN o crea ${archivo}`);
  process.exit(1);
}

const [, , modo, ...resto] = process.argv;
if (!modo) {
  console.error('uso: node supabase/demos/sql.mjs <archivo.sql> | -e "<sql>"');
  process.exit(1);
}
const sql = modo === '-e' ? resto.join(' ') : fs.readFileSync(modo, 'utf8');
const token = leerToken();
const cabeceras = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const proyecto = await fetch(`${API}/projects/${REF}`, { headers: cabeceras });
if (!proyecto.ok) {
  console.error(`No pude leer el proyecto ${REF} (${proyecto.status}): ${await proyecto.text()}`);
  process.exit(1);
}
const { name } = await proyecto.json();
if (!/demo/i.test(name || '')) {
  console.error(`El proyecto ${REF} se llama "${name}", no "Demos". No corro nada.`);
  process.exit(1);
}

const res = await fetch(`${API}/projects/${REF}/database/query`, {
  method: 'POST',
  headers: cabeceras,
  body: JSON.stringify({ query: sql }),
});
const texto = await res.text();
if (!res.ok) {
  console.error(`Error ${res.status}: ${texto}`);
  process.exit(1);
}
console.log(texto);
