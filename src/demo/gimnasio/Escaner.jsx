import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, CameraOff, ScanLine, Usb } from 'lucide-react';
import { Boton, g } from './ui';

// Lector de QR de recepción. Dos entradas:
//   · Cámara (celular, tablet o laptop) con qr-scanner (sirve también en iPhone).
//   · Lector USB/Bluetooth: "teclea" el código muy rápido y termina con Enter.
//     Se detecta por la velocidad de tecleo, así no hace falta un input
//     enfocado y no estorba al buscador de socios.
// La misma lectura no se manda dos veces en 4 s (la cámara lee en ráfaga).

export default function Escaner({ alLeer }) {
  const video = useRef(null);
  const lector = useRef(null);
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
      preferredCamera: 'environment', highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 8,
    });
    lector.current = escaner;
    escaner.start().catch(() => {
      setError('No se pudo abrir la cámara. Revisa el permiso del navegador.');
      setCamara(false);
    });
    return () => { escaner.stop(); escaner.destroy(); lector.current = null; };
  }, [camara]);

  return (
    <div>
      <div style={{
        position: 'relative', aspectRatio: '4 / 3', borderRadius: 20, overflow: 'hidden', background: '#050506',
        border: `1px solid ${g.linea}`,
      }}>
        <video ref={video} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: camara ? 'block' : 'none' }} />
        {!camara && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 120, height: 120 }}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} style={{
                  position: 'absolute', width: 30, height: 30, borderColor: 'var(--g-pri)', borderStyle: 'solid', borderWidth: 0,
                  ...(i < 2 ? { top: 0 } : { bottom: 0 }), ...(i % 2 ? { right: 0 } : { left: 0 }),
                  [`border${i < 2 ? 'Top' : 'Bottom'}Width`]: 4, [`border${i % 2 ? 'Right' : 'Left'}Width`]: 4,
                  borderRadius: 6,
                }} />
              ))}
              <ScanLine size={46} color="var(--g-suave)" style={{ position: 'absolute', inset: 0, margin: 'auto' }} />
            </div>
            <div style={{ color: g.suave, fontSize: '0.86rem', maxWidth: 260 }}>
              Activa la cámara y apunta al pase del socio, o usa un lector USB.
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Boton variante={camara ? 'suave' : 'primario'} onClick={() => setCamara((c) => !c)}>
          {camara ? <><CameraOff size={17} /> Apagar cámara</> : <><Camera size={17} /> Activar cámara</>}
        </Boton>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: g.suave }}>
          <Usb size={15} /> Lector USB listo
        </span>
      </div>
      {error && <div style={{ color: '#FCA5A5', fontSize: '0.84rem', marginTop: 8 }}>{error}</div>}
    </div>
  );
}
