// Corre SQL contra la base DEMOS —y solo contra ella—. Sirve en Windows y en
// Mac (consulta.sh necesita el llavero de macOS). Token y candados: api.mjs.
//
//   node supabase/demos/sql.mjs supabase/demos/20_gimnasio.sql
//   node supabase/demos/sql.mjs -e "select count(*) from gym_socios"
import fs from 'node:fs';
import { consultar } from './api.mjs';

const [, , modo, ...resto] = process.argv;
if (!modo) {
  console.error('uso: node supabase/demos/sql.mjs <archivo.sql> | -e "<sql>"');
  process.exit(1);
}
const sql = modo === '-e' ? resto.join(' ') : fs.readFileSync(modo, 'utf8');
console.log(JSON.stringify(await consultar(sql)));
