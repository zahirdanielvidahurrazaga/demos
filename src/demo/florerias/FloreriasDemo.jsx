import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutDashboard, MessageCircle, RotateCcw, Scissors, Smartphone, Truck } from 'lucide-react';
import BarraDemo from '../kaizen/BarraDemo';
import { KAIZEN } from '../kaizen/marca';
import { NEGOCIO, reiniciarDemo, simular, soyLider } from './datos';
import Sitio from './Sitio';
import Taller from './Taller';
import Reparto from './Reparto';
import Dueno from './Dueno';
import { AvisoListo, usePantallaCompleta } from './comun';
import './florerias.css';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE FLORERÍA — /florerias/dalia (28-oct-2026)
//
// Genérica ("Dalia · casa floral", Puebla) para enseñarla a cualquier florería
// y luego pintarla con la marca de cada prospecto. Sin base de datos
// (localStorage), como Autocinema, Sorteos y KADE. `?rol=` abre directo.
// ─────────────────────────────────────────────────────────────────────────────

const ROLES = [
  { id: 'cliente', etiqueta: 'Cliente', Icon: Smartphone },
  { id: 'taller', etiqueta: 'Taller', Icon: Scissors },
  { id: 'reparto', etiqueta: 'Reparto', Icon: Truck },
  { id: 'dueno', etiqueta: 'Dueño', Icon: LayoutDashboard },
];

const GUIA = {
  cliente: [
    'Arriba: "¿A dónde lo mandamos?". Elige la colonia y te dice si llega hoy, cuánto falta para la hora de corte y cuánto cuesta el envío.',
    'Entra por ocasión (Cumpleaños, Amor, Condolencias…) o al catálogo con filtros por flor y precio.',
    'En la ficha elige el tamaño y agrega chocolates, globo, osito o vino; el precio cambia al momento y la página toma el color del ramo.',
    'Arma tu ramo: suma tallos uno por uno y míralo armarse en pantalla, con papel a elegir. Prueba las ideas "Romántico" o "Alegre".',
    'Al pagar: direcciones guardadas, día y franja (las que ya no alcanzan se apagan solas), exprés en 2 h, tarjeta con ideas por ocasión o anónima. La tarjeta de prueba ya viene llena.',
    'El seguimiento avanza solo: armando → foto real del ramo → en camino con hora aproximada → foto de la entrega y quién lo recibió.',
    '"Volver a pedirlo" y "Recordarme esta fecha": en Mis fechas te avisamos 5 días antes. Así la florería vende más a los mismos clientes.',
    'Pantalla completa (botón de arriba) = se ve como la app instalada, sin la barra de KaiZen.',
  ],
  taller: [
    'Los pedidos llegan solos y se ordenan por el que sale primero; los que están por vencer se marcan.',
    'Cada tarjeta trae la receta en tallos y el papel. "Empezar" descuenta esos tallos del cuarto frío.',
    '"Tarjeta" abre el mensaje listo para imprimir (y avisa si va anónimo).',
    '"Tomar foto" manda la foto del ramo terminado al cliente: ábrelo en otra pestaña como Cliente y míralo llegar.',
    'Inventario: lo que baja de 20 se marca; en 0 se apaga en "Arma tu ramo". El botón + simula que llegó el proveedor.',
  ],
  reparto: [
    'Elige repartidor (Toño o Gaby). "Para recoger" son los ramos listos en el taller.',
    '"Salir" lo pone en camino: el cliente ve quién lo lleva y la hora aproximada.',
    'La ruta se ordena por lo que vence primero, con llamar y abrir en Maps.',
    '"Entregué" pide quién lo recibió y la foto; las dos le llegan al cliente.',
  ],
  dueno: [
    'Ventas y pedidos de hoy contra el día promedio, ticket promedio y entregas a tiempo.',
    'La gráfica de 30 días: pasa el cursor por cada barra.',
    'De qué colonias piden y qué ramos se venden más, para planear compras y zonas de envío.',
    'Fechas fuertes que vienen (Guadalupe, 14 de febrero, 10 de mayo) con cuánto se vende más.',
    'Catálogo: sube o baja $50 o márcalo agotado y míralo cambiar en el sitio al instante.',
  ],
};

export default function FloreriasDemo() {
  const [rol, setRol] = useState(() => {
    const r = new URLSearchParams(window.location.search).get('rol');
    return ROLES.some((x) => x.id === r) ? r : 'cliente';
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

  useEffect(() => {
    document.title = `${NEGOCIO.completo} · Demo`;
    if (document.getElementById('fuentes-florerias')) return;
    const link = document.createElement('link');
    link.id = 'fuentes-florerias'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const antes = document.body.style.background;
    document.body.style.background = '#FBF9F4';
    return () => { document.body.style.background = antes; };
  }, []);

  // los demás clientes: pedidos nuevos y pedidos que avanzan
  useEffect(() => {
    let id;
    const paso = () => {
      if (!document.hidden && soyLider()) simular();
      id = setTimeout(paso, 7000 + Math.random() * 7000);
    };
    id = setTimeout(paso, 4000);
    return () => clearTimeout(id);
  }, []);

  const mensaje = 'Hola KaiZen, vi la demo de la florería y me interesa.';

  return (
    <div className={`fl ${app ? 'fl-app' : ''}`} style={{ '--fl-barra': `${app ? 0 : alto}px` }}>
      <div ref={encabezado} className="fl-barra-demo">
        <BarraDemo roles={ROLES} rol={rol} alCambiar={(r) => { setRol(r); window.scrollTo({ top: 0 }); }}
          guiaAbierta={guia} alGuia={() => setGuia((x) => !x)}
          aviso="Demostración · florería y pedidos de ejemplo · por KaiZen" />
      </div>

      {guia && (
        <aside className="fl-guia" style={{ top: alto + 4, maxHeight: `calc(100vh - ${alto + 24}px)`, fontFamily: KAIZEN.texto }}>
          <p className="fl-guia-rol">Guía · {ROLES.find((r) => r.id === rol).etiqueta}</p>
          <p className="fl-guia-titulo" style={{ fontFamily: KAIZEN.display }}>Qué probar <em>aquí</em></p>
          <ol>{GUIA[rol].map((p, i) => <li key={p}><span>{String(i + 1).padStart(2, '0')}</span>{p}</li>)}</ol>
          <p className="fl-guia-nota">Todo funciona de verdad en este navegador. Abre Cliente y Taller en dos pestañas y se mueven juntos.</p>
          <a className="fl-guia-boton" href={`https://wa.me/${KAIZEN.whatsapp}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={17} /> Quiero esto para mi florería
          </a>
          <button type="button" className="fl-guia-boton claro" onClick={() => { reiniciarDemo(); window.location.reload(); }}>
            <RotateCcw size={16} /> Reiniciar la demo
          </button>
        </aside>
      )}

      {/* el sitio se queda montado: al regresar del equipo sigue donde estaba */}
      <div hidden={rol !== 'cliente'}><Sitio /></div>
      {rol === 'taller' && <Taller />}
      {rol === 'reparto' && <Reparto />}
      {rol === 'dueno' && <Dueno />}
      <AvisoListo />
    </div>
  );
}
