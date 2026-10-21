import { useEffect, useState } from 'react';

// Piezas compartidas por el sitio y el panel.

export function useAhora(cada = 1000) {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setT(Date.now()), cada); return () => clearInterval(id); }, [cada]);
  return t;
}

export function partes(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const dos = (n) => String(n).padStart(2, '0');

export function CuentaRegresiva({ hasta, chica }) {
  const ahora = useAhora();
  const p = partes(hasta - ahora);
  const celdas = [['Días', p.d], ['Horas', p.h], ['Min', p.m], ['Seg', p.s]];
  return (
    <div className={`so-cuenta ${chica ? 'so-cuenta-chica' : ''}`} role="timer" aria-label={`Faltan ${p.d} días ${p.h} horas ${p.m} minutos`}>
      {celdas.map(([e, v]) => (
        <div key={e}><b>{dos(v)}</b><span>{e}</span></div>
      ))}
    </div>
  );
}

export function Restante({ hasta }) {
  const ahora = useAhora();
  const p = partes(hasta - ahora);
  if (hasta <= ahora) return <span>vencido</span>;
  return <span>{p.h + p.d * 24}:{dos(p.m)}:{dos(p.s)}</span>;
}

export function Progreso({ pct, etiqueta = true }) {
  return (
    <div className="so-progreso">
      <div className="so-progreso-barra"><i style={{ width: `${Math.max(2, pct * 100)}%` }} /></div>
      {etiqueta && <span>{Math.round(pct * 100)}% vendido</span>}
    </div>
  );
}

export const fechaLarga = (t) => new Date(t).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
export const hora = (t) => new Date(t).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });

export const ESTADO_TXT = { apartado: 'Apartado', revision: 'En revisión', pagado: 'Pagado', liberado: 'Liberado' };

export const wa = (tel, texto) => `https://wa.me/52${String(tel).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(texto)}`;

// Reduce la foto del comprobante para guardarla en la demo (localStorage).
export function miniatura(archivo, ancho = 420) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, ancho / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}
