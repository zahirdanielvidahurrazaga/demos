// Zonas del local 3D: a dónde vuela la cámara y qué se explica. Aparte de
// Local3D.jsx para que la página las lea sin bajar three.js.
export const ZONAS = [
  { id: 'corte', n: '00', titulo: 'Todo el local', texto: 'Vista en corte: 12 × 9 m. De la puerta a tu casilla y de regreso en 2 minutos, sin filas ni tickets.', pos: [8.6, 15.5, 11.5], mira: [0, 0.4, -0.3], abre: 1 },
  { id: 'fachada', n: '01', titulo: 'La entrada', texto: 'Fachada olivo con el nombre en la marquesina y un ventanal grande: desde la calle se ve la cocina.', pos: [0, 2.4, 15.5], mira: [0, 2, 4.5], abre: 0 },
  { id: 'casillas', n: '02', titulo: 'Pared de casillas', texto: '12 casillas numeradas. Cuando tu pedido está listo, la app te dice el número; la tuya se ilumina y la tomas.', pos: [1.0, 1.9, 4.2], mira: [0.8, 1.7, 0], abre: 1, casilla: true },
  { id: 'mostrador', n: '03', titulo: 'Mostrador', texto: 'Una persona para dudas, pedidos sin app y pago en efectivo. No hay caja registradora ni fila.', pos: [1.6, 2.6, 5.4], mira: [4.3, 1.1, 1.2], abre: 1 },
  { id: 'cocina', n: '04', titulo: 'Cocina a la vista', texto: 'Línea de armado detrás de vidrio: frío, caliente y empaque. Ver cómo se prepara tu comida da confianza.', pos: [0.8, 4.7, 0.7], mira: [0.8, 1.15, -3.4], abre: 1 }, // por ENCIMA de las casillas (antes la cámara quedaba dentro de ellas)
  { id: 'barra', n: '05', titulo: 'Barra para comer', texto: 'Bancos frente al ventanal para quien prefiere quedarse. La mayoría se lo lleva en su bolsa biodegradable.', pos: [-1.2, 2.3, 4.6], mira: [-5.2, 1, 1.2], abre: 1 },
];
