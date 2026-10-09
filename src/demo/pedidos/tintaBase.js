// Fichas del estilo "Tinta" (ver tinta.jsx): colores, letras, dibujos y animaciones.

export const k = {
  pri: 'var(--p-pri)', priOsc: 'var(--p-pri-osc)', fondo: 'var(--p-fondo)', sup: 'var(--p-sup)',
  texto: 'var(--p-texto)', suave: 'var(--p-suave)',
  linea: 'var(--p-pri-22)',
  tenue: 'var(--p-pri-8)',
  mano: "'Caveat Brush', 'Caveat', 'Marker Felt', cursive",
  sans: "'Instrument Sans', 'Avenir Next', system-ui, sans-serif",
};

// Dibujo de un platillo a partir de su foto: .../hoja/chilaquiles.jpg → /pedidos/hoja/dibujos/chilaquiles.png
export function dibujoDe(p) {
  const archivo = (p?.foto || '').split('/').pop().replace(/\.\w+$/, '');
  return archivo ? `/pedidos/hoja/dibujos/${archivo}.png` : null;
}

// "Chilaquiles verdes horneados" → "Chilaquiles verdes" + horneados (a mano).
export function partirNombre(nombre = '') {
  if (nombre.includes(' · ')) {
    const [a, ...b] = nombre.split(' · ');
    return [a, b.join(' · ')];
  }
  const palabras = nombre.trim().split(/\s+/);
  if (palabras.length < 2) return ['', nombre];
  return [palabras.slice(0, -1).join(' '), palabras.at(-1)];
}

export const estilosTinta = `
@keyframes tinta-trazo { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes tinta-entra { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes tinta-salpica { from { opacity: 0; transform: translate(30px, 40px) rotate(14deg) scale(.9); } to { opacity: 1; transform: rotate(0) scale(1); } }
@keyframes tinta-flota { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-6px) rotate(-1.5deg); } }
@keyframes tinta-pulso { 0% { box-shadow: 0 0 0 0 var(--p-pri-45); } 100% { box-shadow: 0 0 0 12px transparent; } }
.tinta-carrusel { scrollbar-width: none; }
.tinta-carrusel::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: reduce) { .tinta-anima, .tinta-anima * { animation: none !important; } }
`;
