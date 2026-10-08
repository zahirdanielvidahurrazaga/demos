import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { motion } from 'framer-motion';
import { Camera, CameraOff, ScanLine, Usb } from 'lucide-react';
import { Boton, Chip, g } from './ui';

// Lector de QR de recepción. Dos entradas:
//   · Cámara (celular, tablet o laptop) con qr-scanner (sirve también en iPhone).
//   · Lector USB/Bluetooth: "teclea" el código muy rápido y termina con Enter.
//     Se detecta por la velocidad de tecleo, así no hace falta un input
//     enfocado y no estorba al buscador de socios.
// La misma lectura no se manda dos veces en 4 s (la cámara lee en ráfaga).

export default function Escaner({ alLeer }) {
  const video = useRef(null);
  const ultimo = useRef({ texto: '', t: 0 });
  const enviar = useRef(alLeer);
  useLayoutEffect(() => { enviar.current = alLeer; });
  const [camara, setCamara] = useState(false);
  const [error, setError] = useState('');

  const leer = (texto, metodo) => {
    const ahora = Date.now();
    if (texto === ultimo.current.texto && ahora - ultimo.current.t < 4000) return;
    ultimo.current = { texto, t: ahora };
    enviar.current(texto, metodo);
  };

  // Lector USB (modo teclado).
  useEffect(() => {
    let buffer = '';
    let ultimaTecla = 0;
    const alTeclear = (e) => {
      const ahora = Date.now();
      if (ahora - ultimaTecla > 60) buffer = '';
      ultimaTecla = ahora;
      if (e.key === 'Enter') {
        if (buffer.length >= 8) { e.preventDefault(); leer(buffer, 'lector'); }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    window.addEventListener('keydown', alTeclear, true);
    return () => window.removeEventListener('keydown', alTeclear, true);
  }, []);

  useEffect(() => {
    if (!camara || !video.current) return undefined;
    setError('');
    const escaner = new QrScanner(video.current, (r) => leer(r.data, 'qr'), {
      preferredCamera: 'environment', highlightScanRegion: false, highlightCodeOutline: true, maxScansPerSecond: 8,
    });
    escaner.start().catch(() => {
      setError('No se pudo abrir la cámara. Revisa el permiso del navegador.');
      setCamara(false);
    });
    return () => { escaner.stop(); escaner.destroy(); };
  }, [camara]);

  const esquina = (i) => ({
    position: 'absolute', width: 38, height: 38, borderColor: '#fff', borderStyle: 'solid', borderWidth: 0,
    ...(i < 2 ? { top: 0 } : { bottom: 0 }), ...(i % 2 ? { right: 0 } : { left: 0 }),
    [`border${i < 2 ? 'Top' : 'Bottom'}Width`]: 4, [`border${i % 2 ? 'Right' : 'Left'}Width`]: 4,
    [`border${i < 2 ? 'Top' : 'Bottom'}${i % 2 ? 'Right' : 'Left'}Radius`]: 14,
    filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--g-pri) 90%, transparent))', borderImage: 'none',
  });

  return (
    <div>
      <div style={{
        position: 'relative', aspectRatio: '4 / 3', borderRadius: 24, overflow: 'hidden', background: 'radial-gradient(circle at 50% 40%, #1A1A1E, #070708)',
        border: `1px solid ${g.linea}`,
      }}>
        <video ref={video} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: camara ? 'block' : 'none' }} />
        {/* Mira: esquinas que brillan y una línea que barre */}
        <div style={{ position: 'absolute', inset: '14% 22%', pointerEvents: 'none' }}>
          {[0, 1, 2, 3].map((i) => <span key={i} style={{ ...esquina(i), borderColor: 'var(--g-pri)' }} />)}
          <div style={{ position: 'absolute', inset: 8, overflow: 'hidden', borderRadius: 10 }}>
            <div style={{
              position: 'absolute', left: 0, right: 0, height: '50%', animation: 'g-barrido 2.2s ease-in-out infinite alternate',
              background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--g-pri) 28%, transparent) 85%, var(--g-pri2))',
              opacity: camara ? 0.9 : 0.35,
            }} />
          </div>
        </div>
        {!camara && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, textAlign: 'center' }}>
            <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2.4, repeat: Infinity }}><ScanLine size={44} color="var(--g-suave)" /></motion.div>
            <div style={{ color: g.suave, fontSize: 13, maxWidth: 230, lineHeight: 1.45 }}>Activa la cámara y apunta al pase del socio, o usa un lector USB.</div>
          </div>
        )}
        {camara && <div style={{ position: 'absolute', top: 12, left: 12 }}><Chip color="#fff" punto style={{ background: 'rgba(0,0,0,0.5)' }}>Cámara activa</Chip></div>}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Boton variante={camara ? 'suave' : 'primario'} onClick={() => setCamara((c) => !c)}>
          {camara ? <><CameraOff size={17} /> Apagar cámara</> : <><Camera size={17} /> Activar cámara</>}
        </Boton>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: g.suave }}>
          <Usb size={15} /> Lector USB listo
        </span>
      </div>
      {error && <div style={{ color: g.rojo, fontSize: 13, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
