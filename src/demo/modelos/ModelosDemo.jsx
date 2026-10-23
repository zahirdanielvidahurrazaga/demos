import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Briefcase, Camera, Maximize2, MessageCircle, Minimize2, RotateCcw, Smartphone, Sparkles } from 'lucide-react';
import BarraDemo from '../kaizen/BarraDemo';
import { KAIZEN } from '../kaizen/marca';
import { AGENCIA, reiniciarDemo, simular, soyLider } from './datos';
import Sitio from './Sitio';
import Modelo from './Modelo';
import Booker from './Booker';
import Aspirante from './Aspirante';
import Carga, { yaCargo, olvidarCarga } from './Carga';
import { AvisoListo } from './comun';
import './modelos.css';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE AGENCIA DE MODELOS — /modelos/kade
//
// Cuatro roles sobre el mismo almacén del navegador (sin base de datos, como
// Sorteos): Cliente (el sitio con el book), Aspirante (scouting en línea),
// Modelo (la app de Valeria) y Booker (el panel de la agencia). Abiertos en dos
// pestañas se mueven juntos. Estilo "Editorial + Casting" (21-oct-2026).
// ─────────────────────────────────────────────────────────────────────────────

const ROLES = [
  { id: 'cliente', etiqueta: 'Cliente', Icon: Briefcase },
  { id: 'aspirante', etiqueta: 'Aspirante', Icon: Sparkles },
  { id: 'modelo', etiqueta: 'Modelo', Icon: Smartphone },
  { id: 'booker', etiqueta: 'Booker', Icon: Camera },
];

const GUIA = {
  cliente: [
    'Es el sitio de la agencia para marcas y fotógrafos. Abre con video y debajo el board en tiras: pasa el cursor para abrirlas y entra a una.',
    'Cada modelo tiene su portada tipo revista: los ojos en grande, su número, su pose y una tira de negativos para cambiar de foto. Pasa de una a otra con ← →.',
    'Abajo: medidas, disponibilidad de 14 días y su composite card lista para imprimir o guardar en PDF. En Mujeres u Hombres filtras por estatura, categoría o cabello, en cuadrícula o en tiras.',
    'Toca el corazón en 2 o 3 modelos (incluye a Valeria) y abre tu Package: pide un casting o un booking para todas en una sola solicitud.',
    'Sigue tu solicitud en "Mis solicitudes": verás a cada modelo contestar y, cuando la booker cotice, la aceptas aquí.',
    'En Eventos te registras al desfile o al casting y te llevas tu pase digital.',
  ],
  aspirante: [
    'El scouting en línea: cualquiera se postula con dos fotos del celular (para la demo sirve cualquier imagen).',
    'Después de mandarla, ve a Booker → Scouting: tu postulación aparece marcada "tú". Mándala al casting y regresa aquí: ya tienes tu pase.',
    'Si la booker te firma, entras al book del sitio como New face, con tus propias fotos.',
  ],
  modelo: [
    'El portal de Valeria Ruiz, modelo de la agencia. "Inicio": cuántas marcas vieron su ficha, en cuántos packages está, lo que gana este mes y su próximo trabajo.',
    '"Agenda" es su mes completo. Toca un día libre y márcalo como no disponible: sale tachado en su ficha del sitio y en el calendario de la booker.',
    '"Opciones": la agencia le aparta fechas y ella acepta o dice que no (con el motivo). A un lado, lo que dijo cada cliente después de sus castings.',
    '"Pagos": gráfica de seis meses, cuánto cobra la agencia, su parte y un recibo por cada depósito.',
    '"Mi book": elige su foto principal (cambia en el board y en las tiras del sitio al instante), sube polaroids y actualiza sus medidas. "Ver mi portada" enseña cómo la ven las marcas.',
  ],
  booker: [
    '"Hoy" se mueve solo: llegan solicitudes de marcas, postulaciones y registros a eventos mientras lo enseñas.',
    'En Solicitudes abre una, ajusta la tarifa de cada modelo y "Manda opción": le llega a cada una a su app. Las demás contestan solas; a Valeria la contestas tú en "Modelo".',
    'Con las respuestas, manda la cotización al cliente. Cuando la acepta, todo queda confirmado en el Calendario y en la agenda de cada modelo.',
    'Scouting es un tablero: al casting, firmar o descartar. Eventos: convoca modelos y en la puerta escanea pases con el lector (o con los "pases de prueba").',
    'Dinero: lo que deben los clientes, lo que se les paga a las modelos y la comisión de la agencia.',
  ],
};

export default function ModelosDemo() {
  const [rol, setRol] = useState(() => {
    const r = new URLSearchParams(window.location.search).get('rol');
    return ROLES.some((x) => x.id === r) ? r : 'cliente';
  });
  const [guia, setGuia] = useState(false);
  // pantalla de carga al entrar al sitio (una vez por visita)
  const [cargando, setCargando] = useState(() => rol === 'cliente' && !yaCargo());
  // "como sitio": sin la barra de KaiZen y con el navegador a pantalla completa
  const [completa, setCompleta] = useState(false);
  const encabezado = useRef(null);
  const [alto, setAlto] = useState(80);

  useLayoutEffect(() => {
    const el = encabezado.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setAlto(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.title = `${AGENCIA.completo} · Demo`;
    if (document.getElementById('fuentes-modelos')) return;
    const link = document.createElement('link');
    link.id = 'fuentes-modelos'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&family=Nanum+Pen+Script&display=swap';
    document.head.appendChild(link);
  }, []);

  // el negocio se mueve solo (una sola pestaña simula)
  useEffect(() => {
    let id;
    const paso = () => {
      if (!document.hidden && soyLider()) simular();
      id = setTimeout(paso, 7000 + Math.random() * 6000);
    };
    id = setTimeout(paso, 5000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const alCambiar = () => { if (!document.fullscreenElement) setCompleta(false); };
    document.addEventListener('fullscreenchange', alCambiar);
    return () => document.removeEventListener('fullscreenchange', alCambiar);
  }, []);
  const alternarCompleta = () => {
    if (completa) {
      setCompleta(false);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } else {
      setCompleta(true); setGuia(false);
      // en iPhone no hay pantalla completa para páginas: igual se quita la barra
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  const cambiarRol = (r) => { setRol(r); setGuia(false); window.scrollTo({ top: 0 }); };
  const mensaje = 'Hola KaiZen, vi la demo de agencia de modelos y me interesa para mi agencia.';

  return (
    <div className={`mo ${['cliente', 'aspirante'].includes(rol) ? 'mo-oscuro' : ''}`} style={{ '--mo-barra': `${completa ? 0 : alto}px` }}>
      <div ref={encabezado} className="mo-barra-demo" hidden={completa}>
        <BarraDemo roles={ROLES} rol={rol} alCambiar={cambiarRol}
          guiaAbierta={guia} alGuia={() => setGuia((x) => !x)}
          aviso="Demostración · agencia, modelos y clientes de ejemplo · por KaiZen" />
      </div>

      {guia && (
        <aside className="mo-guia" style={{ top: alto + 4, maxHeight: `calc(100vh - ${alto + 24}px)`, fontFamily: KAIZEN.texto }}>
          <p className="mo-guia-rol">Guía · {ROLES.find((r) => r.id === rol).etiqueta}</p>
          <p className="mo-guia-titulo" style={{ fontFamily: KAIZEN.display }}>Qué probar <em>aquí</em></p>
          <ol>
            {GUIA[rol].map((p, i) => <li key={p}><span>{String(i + 1).padStart(2, '0')}</span>{p}</li>)}
          </ol>
          <p className="mo-guia-nota">Todo funciona de verdad en este navegador. Abre Cliente y Booker en dos pestañas y se mueven juntos.</p>
          <a className="mo-guia-boton" href={`https://wa.me/${KAIZEN.whatsapp}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={17} /> Quiero esto para mi agencia
          </a>
          <button type="button" className="mo-guia-boton mo-guia-boton-claro" onClick={() => { reiniciarDemo(); olvidarCarga(); try { localStorage.removeItem('demo_modelos_mi_postulacion'); } catch { /* */ } window.location.reload(); }}>
            <RotateCcw size={16} /> Reiniciar la demo
          </button>
        </aside>
      )}

      <button type="button" className="mo-completa" onClick={alternarCompleta} aria-pressed={completa}
        title={completa ? 'Salir de pantalla completa (Esc)' : 'Ver como sitio, a pantalla completa'}>
        {completa ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        <span>{completa ? 'Salir' : 'Pantalla completa'}</span>
      </button>

      {cargando && <Carga alTerminar={() => setCargando(false)} />}

      {/* el sitio se queda montado: al regresar sigue donde estaba */}
      <div hidden={rol !== 'cliente'}><Sitio alPostularse={() => cambiarRol('aspirante')} /></div>
      {rol === 'aspirante' && <Aspirante />}
      {rol === 'modelo' && <Modelo />}
      {rol === 'booker' && <Booker />}
      <AvisoListo />
    </div>
  );
}
