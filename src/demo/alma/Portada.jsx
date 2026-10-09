import { useState } from 'react';
import { a } from './estilo';
import { Boton, Chip, Foto } from './ui';

// Portada de entrada: foto a pantalla completa, frase y "Entrar". Sale una
// vez por pestaña (la vuelve a mostrar "Reiniciar la demostración").
export default function Portada({ cfg, foto, alto, alEntrar }) {
  const [saliendo, setSaliendo] = useState(false);
  const entrar = () => { setSaliendo(true); setTimeout(alEntrar, 380); };
  const entra = (s) => ({ animation: `alma-entra .8s ${s}s both cubic-bezier(.2,.8,.2,1)` });
  return (
    <div style={{ position: 'relative', zIndex: 2, height: alto, padding: 10, boxSizing: 'border-box', animation: saliendo ? 'alma-sale .38s ease forwards' : 'none' }}>
      <Foto src={foto} radio={38} oscura={0.45} style={{ height: '100%' }}>
        <div style={{ height: '100%', boxSizing: 'border-box', padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: a.letra }}>
          {cfg.marca?.logo && <img src={cfg.marca.logo} alt={cfg.nombre} style={{ height: 40, alignSelf: 'flex-start', filter: 'brightness(0) invert(1)', ...entra(0) }} />}
          <h1 style={{ margin: '34px 0 0', fontSize: 'clamp(2.1rem, 9vw, 3.2rem)', lineHeight: 1.08, letterSpacing: '-0.035em', fontWeight: 300, maxWidth: 520, ...entra(0.1) }}>
            Conviértete en la <strong style={{ fontWeight: 700 }}>mejor versión</strong> de ti.
          </h1>
          <p style={{ margin: '14px 0 0', fontSize: '0.95rem', lineHeight: 1.5, opacity: 0.85, maxWidth: 380, ...entra(0.2) }}>
            Reserva tu clase, guarda tu lugar en la lista de espera y entra con tu pase. Todo {cfg.nombre}, en tu bolsillo.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 22, flexWrap: 'wrap', ...entra(0.3) }}>
            <Chip>{cfg.giro || 'Pilates'}</Chip>
            <Chip>{cfg.ciudad}</Chip>
          </div>
          <Boton tipo="blanco" onClick={entrar} style={{ marginTop: 'auto', width: '100%', padding: '18px 22px', fontSize: '1rem', ...entra(0.4) }}>
            Entrar al estudio
          </Boton>
        </div>
      </Foto>
    </div>
  );
}
