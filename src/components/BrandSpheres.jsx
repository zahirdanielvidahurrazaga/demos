import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Esferas de color de la marca flotando de fondo (radial-gradient + blur en loop).
// Se usa en la sección de eventos del sitio y en la página pública del evento.
// En móvil se quedan quietas a propósito: el blur animado castiga la batería.
// OJO: en framer-motion los % de x/y son relativos al ANCHO DE LA PROPIA esfera,
// no de la pantalla. Con valores chicos (±10%) el recorrido queda en ~40px y con
// este nivel de blur no se percibe nada. De ahí que las amplitudes sean altas.
function Esfera({ color, size, top, left, right, delay = 0, dur = 18, quieta, xs, ys }) {
  return (
    <motion.div
      aria-hidden="true"
      animate={quieta ? undefined : { x: xs, y: ys, scale: [1, 1.28, 1] }}
      transition={quieta ? undefined : { duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute', top, left, right, width: size, height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 38% 34%, ${color} 0%, ${color.replace(/[\d.]+\)$/, '0.28)')} 46%, transparent 66%)`,
        filter: quieta ? 'blur(38px)' : 'blur(62px)',
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  );
}

export default function BrandSpheres() {
  const [movil, setMovil] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const set = () => setMovil(mq.matches);
    set(); mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, []);

  return (
    <>
      {/* Cada una con duración y RECORRIDO distintos: si comparten trayectoria se
          mueven en bloque y el ojo lo lee como un fondo quieto. */}
      <Esfera color="rgba(255,145,77,0.62)" size="34vw" top="-10%" left="-4%" dur={11} quieta={movil}
        xs={['-25%', '45%', '-25%']} ys={['-20%', '30%', '-20%']} />
      <Esfera color="rgba(224,122,156,0.55)" size="30vw" top="18%" right="-6%" dur={14} delay={1} quieta={movil}
        xs={['30%', '-40%', '30%']} ys={['25%', '-25%', '25%']} />
      <Esfera color="rgba(255,190,120,0.58)" size="22vw" top="62%" left="14%" dur={17} delay={2} quieta={movil}
        xs={['-40%', '35%', '-40%']} ys={['20%', '-30%', '20%']} />
      <Esfera color="rgba(226,146,196,0.42)" size="17vw" top="70%" right="12%" dur={13} delay={1.5} quieta={movil}
        xs={['35%', '-30%', '35%']} ys={['-30%', '25%', '-30%']} />
    </>
  );
}
