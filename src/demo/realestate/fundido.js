// Cuánto del cuadro siguiente se encima. Dos cuadros encimados a la mitad se
// ven DOBLES (la cámara avanza bastante entre uno y otro a 12 por segundo y
// scrolleando lento se notaba, 1-nov), así que solo se funden en la franja
// de en medio del paso y, quieto, se ve el más cercano completo.
export function fundido(f, quieto) {
  if (quieto) return f >= 0.5 ? 1 : 0;
  return Math.min(1, Math.max(0, (f - 0.4) / 0.2));
}
