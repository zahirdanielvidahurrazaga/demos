// Acceso a la base DEMOS —y solo a ella— con la Management API de Supabase.
// Lo usan sql.mjs y accesos.mjs.
//
// Token (Personal Access Token): variable SUPABASE_DEMOS_TOKEN, el archivo
// ~/.supabase-demos-token o, en Mac, el llavero ("Supabase DEMOS"). Nunca en el repo.
//
// ⚠️ Esa cuenta de Supabase también tiene la base del POS. El ref va FIJO aquí
// y antes de correr nada se comprueba que el proyecto se llame "Demos".
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REF = 'qwqrbckivrkmeykiukug';
const API = 'https://api.supabase.com/v1';

function leerToken() {
  if (process.env.SUPABASE_DEMOS_TOKEN) return process.env.SUPABASE_DEMOS_TOKEN.trim();
  const archivo = path.join(os.homedir(), '.supabase-demos-token');
  if (fs.existsSync(archivo)) return fs.readFileSync(archivo, 'utf8').replace(/^﻿/, '').trim();
  if (process.platform === 'darwin') {
    try {
      return execFileSync('security', ['find-generic-password', '-s', 'Supabase DEMOS', '-w'], { encoding: 'utf8' }).trim();
    } catch { /* no está en el llavero */ }
  }
  console.error(`Falta el token: define SUPABASE_DEMOS_TOKEN o crea ${archivo}`);
  process.exit(1);
}

let cabeceras = null;

// Corre SQL y devuelve las filas (arreglo). Sale del proceso si algo falla.
export async function consultar(sql) {
  if (!cabeceras) {
    cabeceras = { Authorization: `Bearer ${leerToken()}`, 'Content-Type': 'application/json' };
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
  return JSON.parse(texto);
}
