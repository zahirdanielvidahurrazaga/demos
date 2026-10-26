import { createPortal } from 'react-dom';

// Las ventanas (trivia, ayuda, pagos…) se pintan en la raíz `.ac` y no dentro
// de su página: las portadas con fondo desenfocado usan `isolation: isolate`
// y atrapaban a sus ventanas DEBAJO del encabezado. Dentro de `.ac` siguen
// tomando los colores del tema.
export function enRaiz(nodo) {
  const raiz = typeof document !== 'undefined' ? document.querySelector('.ac') : null;
  return raiz ? createPortal(nodo, raiz) : nodo;
}
