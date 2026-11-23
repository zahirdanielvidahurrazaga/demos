import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutDashboard, MessageCircle, RotateCcw, Truck } from 'lucide-react';
import BarraDemo from '../kaizen/BarraDemo';
import { KAIZEN } from '../kaizen/marca';
import { NEGOCIO, reiniciarDemo, simular, soyLider } from './datos';
import Dueno from './Dueno';
import Repartidor from './Repartidor';
import { AvisoListo, usePantallaCompleta } from './comun';
import './reparto.css';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE REPARTO DE CERVEZA — /reparto/malta (22-nov-2026)
// Prospecto: el hermano de Carlos. Ver el encabezado de datos.js.
// ─────────────────────────────────────────────────────────────────────────────

const ROLES = [
  { id: 'dueno', etiqueta: 'Dueño', Icon: LayoutDashboard },
  { id: 'repartidor', etiqueta: 'Repartidor', Icon: Truck },
];

const GUIA = {
  dueno: [
    'Hoy: cuántas cajas tienes en bodega, qué falta por entregar y lo que necesita tu atención.',
    'Atención: cerveza que se está acabando y restaurantes que dejaron de pedirte (en rojo). Toca uno para escribirle por WhatsApp o mandarle lo de siempre.',
    'El botón + : pega el mensaje del restaurante tal como llegó a tu WhatsApp. El sistema entiende "5 de corona y 3 de vicky" y sabe de qué restaurante es. Prueba con los mensajes de ejemplo.',
    'Al guardar, las cajas se apartan de tu bodega y el repartidor lo ve en su celular. Puedes confirmarle al cliente por WhatsApp con un toque.',
    'Bodega: cuánto te queda de cada cerveza. "Llegó mercancía" suma lo que te dejó el proveedor.',
    'Clientes: cada restaurante con cuándo pidió, cada cuánto suele pedir y cuánto te debe.',
    'Semana: lo que vendiste, con cuánto arrancó cada cerveza y cuánto queda. "Empezar otra" arranca la semana con lo que sobró más lo que llegó.',
  ],
  repartidor: [
    'Cada repartidor (Toño o Memo) ve solo sus entregas, en orden.',
    'Cada tarjeta dice a dónde va, qué cajas lleva y cuánto cobrar. Llamar y Cómo llegar abren el teléfono y Maps.',
    '"Entregado" pregunta cómo pagó (efectivo, transferencia o a cuenta) y se descuenta de la bodega al instante.',
    'Arriba lleva la cuenta del efectivo que trae, para cuadrar con el dueño al regresar.',
    'Abre Dueño en otra pestaña: lo que entregas aquí se mueve allá en vivo.',
  ],
};

export default function RepartoDemo() {
  const [rol, setRol] = useState(() => {
    const r = new URLSearchParams(window.location.search).get('rol');
    return ROLES.some((x) => x.id === r) ? r : 'dueno';
  });
  const [guia, setGuia] = useState(false);
  const pc = usePantallaCompleta();
  const instalada = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const app = pc.activa || instalada;
  const encabezado = useRef(null);
  const [alto, setAlto] = useState(70);

  useLayoutEffect(() => {
    const el = encabezado.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setAlto(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { if (app) setGuia(false); }, [app]);
  // las ventanas y avisos van por portal: necesitan saber cuánto mide la barra de arriba
  useEffect(() => {
    document.documentElement.style.setProperty('--rp-barra', `${app ? 0 : alto}px`);
    return () => document.documentElement.style.removeProperty('--rp-barra');
  }, [app, alto]);

  useEffect(() => {
    document.title = `${NEGOCIO.completo} · Demo`;
    if (document.getElementById('fuentes-reparto')) return;
    const link = document.createElement('link');
    link.id = 'fuentes-reparto'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);
  useEffect(() => {
    const antes = document.body.style.background;
    document.body.style.background = '#F4F3EF';
    return () => { document.body.style.background = antes; };
  }, []);

  // los repartidores van entregando solos
  useEffect(() => {
    let id;
    const paso = () => {
      if (!document.hidden && soyLider()) simular();
      id = setTimeout(paso, 25000 + Math.random() * 20000);
    };
    id = setTimeout(paso, 20000);
    return () => clearTimeout(id);
  }, []);

  const mensaje = 'Hola KaiZen, vi la demo del control de reparto y me interesa.';

  return (
    <div className={`rp ${app ? 'rp-modo-app' : ''}`} style={{ '--rp-barra': `${app ? 0 : alto}px` }}>
      <div ref={encabezado} className="rp-barra-demo">
        <BarraDemo roles={ROLES} rol={rol} alCambiar={(r) => { setRol(r); window.scrollTo({ top: 0 }); }}
          guiaAbierta={guia} alGuia={() => setGuia((x) => !x)}
          aviso="Demostración · restaurantes y pedidos de ejemplo · por KaiZen" />
      </div>

      {guia && (
        <aside className="rp-guia" style={{ top: alto + 4, maxHeight: `calc(100vh - ${alto + 24}px)`, fontFamily: KAIZEN.texto }}>
          <p className="rp-guia-rol">Guía · {ROLES.find((r) => r.id === rol).etiqueta}</p>
          <p className="rp-guia-titulo" style={{ fontFamily: KAIZEN.display }}>Qué probar aquí</p>
          <ol>{GUIA[rol].map((p, i) => <li key={p}><span>{String(i + 1).padStart(2, '0')}</span>{p}</li>)}</ol>
          <p className="rp-guia-nota">Sigues usando tu WhatsApp de siempre: solo copias el mensaje y lo pegas. En Android también se puede mandar directo con "Compartir".</p>
          <a className="rp-btn lleno ancho" href={`https://wa.me/${KAIZEN.whatsapp}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={17} /> Lo quiero para mi negocio
          </a>
          <button type="button" className="rp-btn ancho" onClick={() => { reiniciarDemo(); window.location.reload(); }}>
            <RotateCcw size={16} /> Reiniciar la demo
          </button>
        </aside>
      )}

      {rol === 'dueno' ? <Dueno /> : <Repartidor />}
      <AvisoListo />
    </div>
  );
}
