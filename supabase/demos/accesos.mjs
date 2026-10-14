// Códigos de acceso a las demos (el candado). Tabla y función: 40_accesos.sql.
//
//   node supabase/demos/accesos.mjs nuevo "GYM Manhattan" gimnasio/manhattan
//   node supabase/demos/accesos.mjs nuevo "Zahir (ventas)" --dias 365       ← sin demos = todas + índice
//   node supabase/demos/accesos.mjs lista            (vigentes; --todos incluye vencidos y apagados)
//   node supabase/demos/accesos.mjs ver CODIGO       (sus visitas)
//   node supabase/demos/accesos.mjs extender CODIGO [dias=7]
//   node supabase/demos/accesos.mjs apagar CODIGO  |  prender CODIGO
//
// Demos válidas: las rutas sin la diagonal inicial (demo/alma, pedidos/hoja,
// gimnasio/manhattan…).
import { randomInt } from 'node:crypto';
import { consultar } from './api.mjs';

const SITIO = 'https://demos-zahirv.pages.dev';
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0/O, 1/I/L
const DIAS = 7;

const lit = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const normalizar = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const bonito = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;
const fecha = (f) => (f ? new Date(f).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' }) : '—');

function opciones(args) {
  const libres = [];
  const op = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const nombre = args[i].slice(2);
      const siguiente = args[i + 1];
      if (siguiente === undefined || siguiente.startsWith('--')) op[nombre] = true;
      else { op[nombre] = siguiente; i++; }
    } else libres.push(args[i]);
  }
  return { libres, op };
}

function dias(valor, porDefecto) {
  const n = valor === undefined ? porDefecto : Number(valor);
  if (!Number.isInteger(n) || n < 1 || n > 3650) { console.error('--dias debe ser un número entero de 1 a 3650'); process.exit(1); }
  return n;
}

function pedirCodigo(c) {
  const codigo = normalizar(c);
  if (codigo.length !== 8) { console.error('Falta el código (8 caracteres, con o sin guion).'); process.exit(1); }
  return codigo;
}

async function nuevo(args) {
  const { libres: [prospecto, ...demos], op } = opciones(args);
  if (!prospecto) { console.error('uso: nuevo "<prospecto>" [demo/ruta …] [--dias 7] [--nota "…"]'); process.exit(1); }
  for (const d of demos) {
    if (!/^(demo|pedidos|gimnasio)\/[a-z0-9-]+$/.test(d)) { console.error(`Demo no válida: ${d} (ej. gimnasio/manhattan)`); process.exit(1); }
  }
  const n = dias(op.dias, DIAS);
  const codigo = Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
  const arreglo = demos.length ? `array[${demos.map(lit).join(',')}]::text[]` : 'null';
  const [fila] = await consultar(`
    insert into demo_accesos (codigo, prospecto, demos, vence, nota)
    values (${lit(codigo)}, ${lit(prospecto)}, ${arreglo}, now() + interval '${n} days', ${lit(op.nota === true ? null : op.nota)})
    returning codigo, vence`);
  const link = `${SITIO}/d/${fila.codigo}`;
  console.log(`\n  ${prospecto}`);
  console.log(`  Código:  ${bonito(fila.codigo)}`);
  console.log(`  Link:    ${link}`);
  console.log(`  Abre:    ${demos.length ? demos.join(', ') : 'todas las demos + índice'}`);
  console.log(`  Vence:   ${fecha(fila.vence)}\n`);
  console.log('  Mensaje para mandar:\n');
  console.log(`  Te dejo la demo para que la pruebes con calma: ${link}\n  Es personal y está activa ${n} días. Si te pide código: ${bonito(fila.codigo)}\n`);
}

async function lista(args) {
  const { op } = opciones(args);
  const filas = await consultar(`
    select a.codigo, a.prospecto, a.demos, a.vence, a.activo,
           count(v.id) filter (where v.ok) as visitas,
           max(v.creado) filter (where v.ok) as ultima
    from demo_accesos a left join demo_visitas v on v.codigo = a.codigo
    ${op.todos ? '' : 'where a.activo and a.vence > now()'}
    group by a.codigo order by a.creado desc`);
  if (!filas.length) { console.log('No hay códigos' + (op.todos ? '.' : ' vigentes (usa --todos para ver todos).')); return; }
  for (const f of filas) {
    const estado = !f.activo ? 'APAGADO' : new Date(f.vence) < new Date() ? 'VENCIDO' : `vence ${fecha(f.vence)}`;
    console.log(`${bonito(f.codigo)}  ${f.prospecto}  ·  ${f.demos ? f.demos.join(', ') : 'todas'}  ·  ${estado}  ·  ${f.visitas} visitas${f.ultima ? ` (última ${fecha(f.ultima)})` : ''}`);
  }
}

async function ver([c]) {
  const codigo = pedirCodigo(c);
  const filas = await consultar(`
    select a.prospecto, a.vence, a.activo, a.nota, v.ruta, v.ok, v.creado
    from demo_accesos a left join demo_visitas v on v.codigo = a.codigo
    where a.codigo = ${lit(codigo)} order by v.creado desc nulls last limit 100`);
  if (!filas.length) { console.log('Ese código no existe.'); return; }
  const a = filas[0];
  console.log(`${bonito(codigo)}  ${a.prospecto}  ·  ${a.activo ? 'activo' : 'APAGADO'}  ·  vence ${fecha(a.vence)}${a.nota ? `  ·  ${a.nota}` : ''}`);
  for (const v of filas) if (v.creado) console.log(`  ${fecha(v.creado)}  ${v.ok ? '✓' : '✗ vencido'}  ${v.ruta || ''}`);
}

async function extender([c, n]) {
  const codigo = pedirCodigo(c);
  const d = dias(n, DIAS);
  const filas = await consultar(`
    update demo_accesos set vence = greatest(vence, now()) + interval '${d} days', activo = true
    where codigo = ${lit(codigo)} returning vence`);
  console.log(filas.length ? `${bonito(codigo)} ahora vence ${fecha(filas[0].vence)}` : 'Ese código no existe.');
}

async function encender([c], activo) {
  const codigo = pedirCodigo(c);
  const filas = await consultar(`update demo_accesos set activo = ${activo} where codigo = ${lit(codigo)} returning codigo`);
  console.log(filas.length ? `${bonito(codigo)} ${activo ? 'prendido' : 'apagado'}` : 'Ese código no existe.');
}

const [, , orden, ...args] = process.argv;
const ordenes = {
  nuevo, lista, ver, extender,
  apagar: (a) => encender(a, false),
  prender: (a) => encender(a, true),
};
if (!ordenes[orden]) {
  console.error('uso: node supabase/demos/accesos.mjs <nuevo|lista|ver|extender|apagar|prender> …');
  process.exit(1);
}
await ordenes[orden](args);
