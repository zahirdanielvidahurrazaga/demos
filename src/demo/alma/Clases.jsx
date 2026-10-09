import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toLocalDateStr } from '../../lib/dates';
import { a } from './estilo';
import { ListaDia, TiraDias } from './Horario';
import { ilimitado } from './datos';

// Pestaña Clases: dos semanas para reservar.
export default function Clases({ alAbrirClase }) {
  const { classesRemaining } = useAuth();
  const [fecha, setFecha] = useState(() => toLocalDateStr());
  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '24px 20px 140px', maxWidth: 640, margin: '0 auto', fontFamily: a.letra, color: a.tinta }}>
      <h1 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
        <span style={{ fontWeight: 300 }}>Reserva tu </span><span style={{ fontWeight: 700 }}>lugar</span>
      </h1>
      <div style={{ fontSize: '0.86rem', color: a.suave, margin: '6px 0 16px' }}>
        {ilimitado(classesRemaining) ? 'Tu plan es ilimitado' : `Te quedan ${classesRemaining} clases · cancela hasta 5 h antes`}
      </div>
      <TiraDias fecha={fecha} alElegir={setFecha} dias={14} />
      <div style={{ marginTop: 10 }}><ListaDia fecha={fecha} alAbrir={alAbrirClase} /></div>
    </div>
  );
}
