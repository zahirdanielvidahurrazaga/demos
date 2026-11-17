import { useId, useState } from 'react';
import { foto } from './datos';

// El símbolo: plato visto desde arriba con la mordida arriba a la derecha.
// `aro` = color del plato, `centro` = color del centro (normalmente el fondo).
export function Isotipo({ size = 40, aro = 'var(--bb-tomate)', centro = 'var(--bb-albahaca)', className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          <circle cx="88" cy="22" r="13" fill="#000" /><circle cx="96" cy="38" r="11" fill="#000" /><circle cx="76" cy="10" r="11" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#m${id})`}>
        <circle cx="50" cy="50" r="44" fill={aro} />
        <circle cx="50" cy="50" r="22" fill={centro} />
      </g>
    </svg>
  );
}

export function Logo({ size = 40, aro, centro, className = '' }) {
  return (
    <span className={`bb-logo ${className}`}>
      <Isotipo size={size} aro={aro} centro={centro} />
      <span className="bb-wm" style={{ fontSize: size * 0.62 }}><span className="el">el buen</span>bocado</span>
    </span>
  );
}

// Foto de platillo con respaldo (si la imagen no existe, un plato dibujado).
export function FotoPlato({ id, className = '' }) {
  const [mal, setMal] = useState(false);
  if (mal) {
    return (
      <div className={`bb-foto-falta ${className}`}>
        <Isotipo size={48} aro="var(--bb-pepino)" centro="var(--bb-masa)" />
      </div>
    );
  }
  return <img className={className} src={foto(id)} alt="" onError={() => setMal(true)} draggable={false} decoding="async" />;
}

export function Escena({ nombre, className = '', alt = '' }) {
  const [mal, setMal] = useState(false);
  if (mal) return <div className={`bb-escena-falta ${className}`} />;
  return <img className={className} src={`/bocado/${nombre}.webp`} alt={alt} onError={() => setMal(true)} draggable={false} decoding="async" />;
}
