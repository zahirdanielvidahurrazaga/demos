import { useEffect, useRef } from 'react';
import { montarBolsita } from './montarBolsita';

// La bolsita viva (three.js). Se carga con lazy() porque three pesa.
export default function Bolsita3D({ className = '', girar = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    const b = montarBolsita(ref.current, { girar });
    return () => b.quitar();
  }, [girar]);
  return <div ref={ref} className={className} aria-label="La bolsita de el buen bocado, en 3D. Arrástrala para girarla o tócala." role="img" />;
}
