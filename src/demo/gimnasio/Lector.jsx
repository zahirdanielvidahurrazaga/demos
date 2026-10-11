import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Usb } from 'lucide-react';
import { g } from './ui';

// Lector físico de recepción (USB o Bluetooth en modo teclado). No hay cámara:
// en todos los proyectos los QR se leen con lector. El lector "teclea" el
// código muy rápido y termina con Enter; se detecta por la velocidad de tecleo,
// así no hace falta un input enfocado y no estorba al buscador de socios.
// La misma lectura no se manda dos veces en 4 s.
//
// `atajos` (demo): las teclas 1…n simulan pasar ese pase de prueba por el
// lector. Se espera un instante para no confundirlas con un código que empieza.

export function useLector(alLeer, { atajos } = {}) {
  const ultimo = useRef({ texto: '', t: 0 });
  const enviar = useRef(alLeer);
  const atajo = useRef(atajos);
  useLayoutEffect(() => { enviar.current = alLeer; atajo.current = atajos; });
  const [leyendo, setLeyendo] = useState(0);

  useEffect(() => {
    let buffer = '';
    let ultimaTecla = 0;
    let espera = null;
    const leer = (texto, metodo) => {
      const ahora = Date.now();
      if (texto === ultimo.current.texto && ahora - ultimo.current.t < 4000) return;
      ultimo.current = { texto, t: ahora };
      setLeyendo(ahora);
      enviar.current(texto, metodo);
    };
    const alTeclear = (e) => {
      const ahora = Date.now();
      const rapido = ahora - ultimaTecla <= 60;
      if (!rapido) buffer = '';
      ultimaTecla = ahora;
      clearTimeout(espera);
      if (e.key === 'Enter') {
        if (buffer.length >= 8) { e.preventDefault(); leer(buffer, 'lector'); }
        buffer = '';
        return;
      }
      if (e.key.length !== 1) return;
      buffer += e.key;
      const enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '');
      const n = Number(e.key);
      if (!rapido && !enCampo && atajo.current && n >= 1 && n <= atajo.current.length) {
        espera = setTimeout(() => { const t = atajo.current?.[n - 1]; if (t) leer(t, 'lector'); }, 90);
      }
    };
    window.addEventListener('keydown', alTeclear, true);
    return () => { clearTimeout(espera); window.removeEventListener('keydown', alTeclear, true); };
  }, []);

  return leyendo;
}

// Indicador del lector para el pie del menú o la cabecera.
export function EstadoLector({ puesto = 'Torniquete 1' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 18, background: g.tarjeta, border: `1px solid ${g.linea}` }}>
      <span style={{ position: 'relative', width: 34, height: 34, borderRadius: '50%', background: g.sup2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Usb size={16} />
        <span style={{ position: 'absolute', top: 0, right: 0, width: 9, height: 9, borderRadius: 9, background: g.pri, color: g.pri, animation: 'g-latido 1.8s infinite', border: '2px solid var(--g-sup)' }} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Lector USB</div>
        <div style={{ fontSize: 12, color: g.suave }}>Conectado · {puesto}</div>
      </div>
    </div>
  );
}
