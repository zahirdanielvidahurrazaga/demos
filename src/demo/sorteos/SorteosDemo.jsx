import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutDashboard, MessageCircle, RotateCcw, Smartphone, Tv } from 'lucide-react';
import BarraDemo from '../kaizen/BarraDemo';
import { KAIZEN } from '../kaizen/marca';
import { NEGOCIO, liberarVencidos, procesarAutos, reiniciarDemo, simularCompradores, soyLider } from './datos';
import Sitio from './Sitio';
import Panel from './Panel';
import Transmision from './Transmision';
import { olvidarBienvenida } from './Bienvenida';
import './sorteos.css';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE SORTEOS — /sorteos/fortuna
//
// Sitio de rifas con boletos: elegir números (cuadrícula, buscador, maquinita
// de la suerte), apartar con WhatsApp, subir comprobante y que el verificador
// lo apruebe. Dos roles: el comprador (el sitio público) y el verificador (el
// panel del dueño). Corre SIN base de datos: todo vive en localStorage y las
// dos pestañas se ven en vivo. Prospecto: el hermano de Carlos (el del POS),
// con la referencia elchato.com.mx.
// ─────────────────────────────────────────────────────────────────────────────

const ROLES = [
  { id: 'comprador', etiqueta: 'Comprador', Icon: Smartphone },
  { id: 'panel', etiqueta: 'Verificador', Icon: LayoutDashboard },
  { id: 'vivo', etiqueta: 'En vivo', Icon: Tv },
];

const GUIA = {
  vivo: [
    'Es la pantalla que el dueño pone en su live de Facebook: se captura en OBS o compartiendo pantalla (botón de pantalla completa).',
    'Escribe el segundo lugar y el premio mayor de la Lotería Nacional y dale "Revelar": los rodillos paran uno por uno, con suspenso, y aparece el ganador.',
    '"Ensayo" cae en un boleto pagado al azar, para practicar antes del sorteo.',
  ],
  comprador: [
    'Entra a la camioneta y elige tus números: por bloques, con el buscador ("termina con 7") o con la maquinita de la suerte.',
    'Cada boleto trae sus oportunidades extra y el precio baja solo con los paquetes.',
    'Aparta con tu WhatsApp: quedan apartados 12 horas, con la cuenta para transferir y el botón para subir tu comprobante.',
    'Sube cualquier foto como comprobante: el sistema la "lee" y la confirma con Banxico, y tu boleto queda pagado solo en segundos. "Verificar boleto" lo busca por teléfono.',
  ],
  panel: [
    'Con la comprobación automática encendida, las transferencias que cuadran con Banxico se aprueban solas. A "Comprobantes" solo llega lo raro (efectivo, monto distinto, clave repetida), con el motivo.',
    'Lo que sí revisas lo apruebas o rechazas en un toque y le avisas al cliente por WhatsApp con el mensaje ya escrito. Apaga la comprobación automática para verlo todo a mano.',
    'Los apartados que no pagan se liberan solos al vencer; también puedes liberarlos a mano.',
    '"Resumen" se mueve solo: hay compradores simulados apartando y pagando mientras lo ves.',
    '"Ganador" arma el número con los resultados de Lotería Nacional y te dice de quién es el boleto.',
  ],
};

export default function SorteosDemo() {
  const [rol, setRol] = useState(() => {
    const r = new URLSearchParams(window.location.search).get('rol');
    return ROLES.some((x) => x.id === r) ? r : 'comprador';
  });
  const [guia, setGuia] = useState(false);
  const encabezado = useRef(null);
  const [alto, setAlto] = useState(80);

  useLayoutEffect(() => {
    const el = encabezado.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAlto(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.title = `${NEGOCIO.nombre} · Demo`;
    if (document.getElementById('fuentes-sorteos')) return;
    const link = document.createElement('link');
    link.id = 'fuentes-sorteos'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&family=VT323&display=swap';
    document.head.appendChild(link);
  }, []);

  // la gente simulada y la liberación de apartados vencidos
  useEffect(() => {
    let id;
    const paso = () => {
      if (!document.hidden && soyLider()) { simularCompradores(); liberarVencidos(); }
      id = setTimeout(paso, 6000 + Math.random() * 6000);
    };
    id = setTimeout(paso, 4000);
    return () => clearTimeout(id);
  }, []);

  // las comprobaciones automáticas agendadas se terminan aquí, en cualquier
  // pantalla (antes dependían de que el comprador se quedara en el pago)
  useEffect(() => { const id = setInterval(procesarAutos, 1000); return () => clearInterval(id); }, []);

  const mensaje = 'Hola KaiZen, vi la demo de sitio de sorteos y me interesa para mi negocio.';

  return (
    <div className="so" style={{ '--so-barra': `${alto}px` }}>
      <div ref={encabezado} className="so-barra-demo">
        <BarraDemo roles={ROLES} rol={rol} alCambiar={setRol}
          guiaAbierta={guia} alGuia={() => setGuia((x) => !x)}
          aviso="Demostración · sorteos, boletos y compradores de ejemplo · por KaiZen" />
      </div>

      {guia && (
        <aside className="so-guia" style={{ top: alto + 4, maxHeight: `calc(100vh - ${alto + 24}px)`, fontFamily: KAIZEN.texto }}>
          <p className="so-guia-rol">Guía · {ROLES.find((r) => r.id === rol).etiqueta}</p>
          <p className="so-guia-titulo" style={{ fontFamily: KAIZEN.display }}>Qué probar <em>aquí</em></p>
          <ol>
            {GUIA[rol].map((p, i) => (
              <li key={p}><span>{String(i + 1).padStart(2, '0')}</span>{p}</li>
            ))}
          </ol>
          <p className="so-guia-nota">Todo funciona de verdad en este navegador. Abre el comprador y el verificador en dos pestañas y se mueven juntos.</p>
          <a className="so-guia-boton" href={`https://wa.me/${KAIZEN.whatsapp}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={17} /> Quiero esto para mis sorteos
          </a>
          <button type="button" className="so-guia-boton so-guia-boton-claro" onClick={() => { reiniciarDemo(); olvidarBienvenida(); window.location.reload(); }}>
            <RotateCcw size={16} /> Reiniciar la demo
          </button>
        </aside>
      )}

      {/* el sitio se queda montado: al regresar del verificador sigue donde estaba */}
      <div hidden={rol !== 'comprador'}><Sitio /></div>
      {rol === 'panel' && <Panel />}
      {rol === 'vivo' && <Transmision />}
    </div>
  );
}
