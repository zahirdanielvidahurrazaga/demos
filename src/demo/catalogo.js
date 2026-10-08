// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE DEMOSTRACIONES
//
// Lo que anuncia el índice (la raíz del dominio de demos). Es distinto de
// `estudiosDemo.js`, que es el registro de lo que la ruta /demo/ sabe pintar:
//
//   · estudiosDemo.js  → maquetas que viven EN ESTE repo (hoy, pilates).
//   · catalogo.js      → todo lo que quieres enseñar, venga de donde venga.
//
// Una demo de punto de venta o de la escuela necesita el código de SU proyecto,
// así que no se puede renderizar desde aquí. Se despliega desde su propio repo
// y se lista con `url`. Por eso hay dos tipos de entrada:
//
//   tipo: 'interna' → `clave` apunta a un bloque de estudiosDemo.js
//   tipo: 'pedidos' → `clave` es un negocio de la demo de pedidos en línea
//                     (tabla pedidos_negocios, ruta /pedidos/<clave>)
//   tipo: 'gimnasio' → `clave` es un gimnasio de la demo de control de acceso
//                     (tabla gym_negocios, ruta /gimnasio/<clave>)
//   tipo: 'externa' → `url` a una demo desplegada aparte
//
// Para agregar una: un bloque más aquí. Nada más se toca.
// ─────────────────────────────────────────────────────────────────────────────

export const SECTORES = [
  {
    id: 'fitness',
    titulo: 'Estudios y gimnasios',
    descripcion: 'Reservas, lista de espera automática, check-in con QR y cobros.',
    demos: [
      // GYM Fitness Manhattan (/gimnasio/manhattan) NO se lista: es un
      // gimnasio real al que se le está vendiendo y la demo va por link directo.
      // Si se vuelve cliente y da permiso, se agrega aquí con tipo: 'gimnasio'.
      {
        tipo: 'interna',
        clave: 'alma',
        nombre: 'Studio Alma',
        detalle: 'Pilates Reformer · Puebla',
        nota: 'estudio de ejemplo',
      },
    ],
  },
  {
    id: 'comida',
    titulo: 'Cafeterías y restaurantes',
    descripcion: 'Pedidos en línea para llevar, en mesa con QR y a domicilio, con tablero de cocina y reparto.',
    demos: [
      {
        tipo: 'pedidos',
        clave: 'hoja',
        nombre: 'Hoja · cocina fit',
        detalle: 'Cafetería saludable · Puebla',
        nota: 'negocio de ejemplo',
      },
    ],
  },

  // ── Plantillas para cuando existan. Se dejan comentadas a propósito: un
  // ── catálogo con enlaces muertos vende peor que uno corto.
  //
  // {
  //   id: 'comercio',
  //   titulo: 'Comercio y punto de venta',
  //   descripcion: 'Ventas, inventario, mayoreo, corte de caja y multi-sucursal.',
  //   demos: [
  //     { tipo: 'externa', url: 'https://demo-pos.tudominio.com',
  //       nombre: 'Jarciería de ejemplo', detalle: 'Mayoreo y menudeo · 2 sucursales' },
  //   ],
  // },
  // {
  //   id: 'educacion',
  //   titulo: 'Escuelas',
  //   descripcion: 'Comunicación con padres, pagos de colegiatura y asistencia.',
  //   demos: [...],
  // },
  // {
  //   id: 'residencial',
  //   titulo: 'Privadas y fraccionamientos',
  //   descripcion: 'Acceso con QR, reservas de amenidades y estados de cuenta.',
  //   demos: [...],
  // },
];

// Cuántas demos hay en total (el índice cambia de tono si solo hay una).
export const TOTAL_DEMOS = SECTORES.reduce((n, s) => n + s.demos.length, 0);

// A dónde lleva cada tarjeta.
export function destinoDe(demo) {
  if (demo.tipo === 'externa') return demo.url;
  if (demo.tipo === 'pedidos') return `/pedidos/${demo.clave}`;
  if (demo.tipo === 'gimnasio') return `/gimnasio/${demo.clave}`;
  return `/demo/${demo.clave}`;
}
