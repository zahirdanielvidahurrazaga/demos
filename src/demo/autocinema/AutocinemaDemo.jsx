import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChefHat, LayoutDashboard, MessageCircle, RotateCcw, ScanLine, Smartphone } from 'lucide-react';
import BarraDemo from '../kaizen/BarraDemo';
import { KAIZEN } from '../kaizen/marca';
import { MODO, NEGOCIO, cambiarCartelera, reiniciarDemo, simular, soyLider } from './datos';
import Sitio from './Sitio';
import Taquilla from './Taquilla';
import Cocina from './Cocina';
import Dueno from './Dueno';
import { AvisoListo, TemaContexto, useTemaInicial } from './comun';
import './autocinema.css';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE AUTOCINEMA — /autocinema/cocodrilo (26-oct-2026)
//
// Prospecto real: Autocinema Cocodrilo (San Andrés Cholula). Modernización de
// su sitio: cartelera clara, boleto con lugar en el mapa, pase QR, pedir comida
// al auto desde el boleto, taquilla con lector, cocina por lugar y dueño.
// Sin base de datos (localStorage), como Sorteos y KADE.
// ─────────────────────────────────────────────────────────────────────────────

const ROLES = [
  { id: 'cliente', etiqueta: 'Cliente', Icon: Smartphone },
  { id: 'taquilla', etiqueta: 'Entrada', Icon: ScanLine },
  { id: 'cocina', etiqueta: 'Cocina', Icon: ChefHat },
  { id: 'dueno', etiqueta: 'Dueño', Icon: LayoutDashboard },
];

const GUIA = {
  cliente: [
    'Desliza el carrusel de la semana (el fondo toma el color de cada póster) o toca un horario en la cartelera por día: te lleva directo a esa función.',
    'Elige día, hora y boleto: los seis se comparan lado a lado, con lo que incluye cada uno y cuántos quedan.',
    'Elige tu lugar exacto en el mapa (la primera fila es del boleto Terrorífico) y paga con la tarjeta de prueba que ya viene llena.',
    'Tu pase llega con QR y lugar. Desde ahí pides comida y te la llevan a tu auto: ya no hay que escribir el código en comentarios.',
    'Mira el seguimiento del pedido mientras lo mueves desde Cocina en otra pestaña.',
    'En Perfil está tu QR de cliente (se enseña al pagar en el lugar para sumar puntos), tus Cocopuntos, los retos de la temporada y los canjes: las palomitas llegan a tu lugar y el boleto gratis se aplica solo en tu siguiente compra.',
  ],
  taquilla: [
    'El lector USB lee el QR del pase. Aquí lo simulan los pases de prueba (o las teclas 1 a 5).',
    'Si pasa, la pantalla dice en grande A QUÉ LUGAR mandar el auto; si ya entró, es de otra función o es falso, lo dice en rosa.',
    'El mapa se va llenando en vivo con los que llegan.',
    'El "QR de cliente (Karime)" es el de su perfil: la reconoce y le suma los Cocopuntos de lo que pagó en taquilla o en la fuente de sodas.',
  ],
  cocina: [
    'Cada pedido trae el lugar del auto en grande: sale del boleto.',
    'Los pedidos de otras personas avanzan solos; los tuyos los mueves con el botón y el cliente lo ve en su pase.',
    'El combo que se paga junto con el boleto llega marcado "Pagado con el boleto".',
  ],
  dueno: [
    'Boletos y fuente de sodas en un mismo tablero (hoy son dos sistemas distintos).',
    'Ocupación por función, qué boletos se venden más y lo más pedido.',
    '"Avisar" manda un mensaje a todos los de una función (lluvia, retraso) y aparece en su boleto.',
    '"Nueva función" la publica en la cartelera al instante.',
  ],
};

export default function AutocinemaDemo() {
  const [rol, setRol] = useState(() => {
    const r = new URLSearchParams(window.location.search).get('rol');
    return ROLES.some((x) => x.id === r) ? r : 'cliente';
  });
  const [guia, setGuia] = useState(false);
  const tema = useTemaInicial();
  // pantalla completa = modo app: sin la barra de KaiZen ni la guía, como la app sola
  // (también si se abrió desde la pantalla de inicio del celular: modo standalone)
  const instalada = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const [completa, setApp] = useState(() => !!document.fullscreenElement);
  const app = completa || instalada;
  useEffect(() => {
    const f = () => { setApp(!!document.fullscreenElement); if (document.fullscreenElement) setGuia(false); };
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  const encabezado = useRef(null);
  const [alto, setAlto] = useState(70);

  useLayoutEffect(() => {
    const el = encabezado.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAlto(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.title = `${NEGOCIO.nombre} · Demo`;
    if (document.getElementById('fuentes-autocinema')) return;
    const link = document.createElement('link');
    link.id = 'fuentes-autocinema'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const antes = document.body.style.background;
    document.body.style.background = tema.tema === 'claro' ? '#EEF1F6' : '#0A0E1A';
    return () => { document.body.style.background = antes; };
  }, [tema.tema]);

  // la gente simulada: compras, llegadas y pedidos
  useEffect(() => {
    let id;
    const paso = () => {
      if (!document.hidden && soyLider()) simular();
      id = setTimeout(paso, 5000 + Math.random() * 5000);
    };
    id = setTimeout(paso, 3000);
    return () => clearTimeout(id);
  }, []);

  const mensaje = 'Hola KaiZen, vi la demo del autocinema y me interesa.';

  return (
    <TemaContexto.Provider value={tema}>
    <div className={`ac ${app ? 'ac-app' : ''}`} data-tema={tema.tema} style={{ '--ac-barra': `${app ? 0 : alto}px` }}>
      <div ref={encabezado} className="ac-barra-demo">
        <BarraDemo roles={ROLES} rol={rol} alCambiar={(r) => { setRol(r); window.scrollTo({ top: 0 }); }}
          guiaAbierta={guia} alGuia={() => setGuia((x) => !x)}
          aviso="Demostración · películas y compradores de ejemplo · por KaiZen" />
      </div>

      {guia && (
        <aside className="ac-guia" style={{ top: alto + 4, maxHeight: `calc(100vh - ${alto + 24}px)`, fontFamily: KAIZEN.texto }}>
          <p className="ac-guia-rol">Guía · {ROLES.find((r) => r.id === rol).etiqueta}</p>
          <p className="ac-guia-titulo" style={{ fontFamily: KAIZEN.display }}>Qué probar <em>aquí</em></p>
          <ol>{GUIA[rol].map((p, i) => <li key={p}><span>{String(i + 1).padStart(2, '0')}</span>{p}</li>)}</ol>
          <div className="ac-guia-modo" role="group" aria-label="Películas de la demo">
            <span>Películas</span>
            <div>
              <button type="button" className={MODO === 'real' ? 'activo' : ''} onClick={() => MODO !== 'real' && cambiarCartelera('real')}>Su cartelera real</button>
              <button type="button" className={MODO === 'ejemplo' ? 'activo' : ''} onClick={() => MODO !== 'ejemplo' && cambiarCartelera('ejemplo')}>De ejemplo</button>
            </div>
          </div>
          <p className="ac-guia-nota">Todo funciona de verdad en este navegador. Abre el cliente y la cocina en dos pestañas y se mueven juntos.</p>
          <a className="ac-guia-boton" href={`https://wa.me/${KAIZEN.whatsapp}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={17} /> Quiero esto para mi autocinema
          </a>
          <button type="button" className="ac-guia-boton claro" onClick={() => { reiniciarDemo(); window.location.reload(); }}>
            <RotateCcw size={16} /> Reiniciar la demo
          </button>
        </aside>
      )}

      {/* el sitio se queda montado: al regresar del equipo sigue donde estaba */}
      <div hidden={rol !== 'cliente'}><Sitio /></div>
      {rol === 'taquilla' && <Taquilla />}
      {rol === 'cocina' && <Cocina />}
      {rol === 'dueno' && <Dueno />}
      <AvisoListo />
    </div>
    </TemaContexto.Provider>
  );
}
