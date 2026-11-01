import { Fragment } from 'react';

// Un titular partido en palabras, cada una en su máscara para que entre
// desde abajo (inmersion.js). El espacio va FUERA de la máscara: dentro de un
// inline-block se pierde y las palabras se pegan.
export function Palabras({ children }) {
  return String(children).split(' ').map((p, i) => (
    <Fragment key={i}>{i > 0 && ' '}<span className="re-pal"><span>{p}</span></span></Fragment>
  ));
}

// Una palabra gigante con las letras repartidas a todo lo ancho (sans ancha),
// el título de cada sección. `tipo` elige cómo entra (inmersion.js): 'sube',
// 'abre' (desde el centro), 'enfoca' (desenfocada → nítida), 'deriva' (cada
// letra a su velocidad). Es decorativo: el h2 de abajo lleva el título.
export function Rotulo({ children, tipo }) {
  return (
    <p className={`re-rotulo ${tipo}`} aria-hidden>
      {[...children].map((l, i) => <span key={i}><span>{l}</span></span>)}
    </p>
  );
}
