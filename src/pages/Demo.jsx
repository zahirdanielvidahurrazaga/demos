import { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Smartphone, ScanLine, Dumbbell, Coffee, LayoutDashboard, Loader2 } from 'lucide-react';
import BarraDemo from '../demo/kaizen/BarraDemo';
import { estudioDemo } from '../demo/estudiosDemo';
import { activarEstudioDemo, restaurarEstudio } from '../config/estudio';
import { AuthContext, useAuth } from '../context/AuthContext';
import { CUENTAS_DEMO, CONTRASENA_DEMO } from '../demo/cuentasDemo';
import GuiaDemo from '../demo/GuiaDemo';
import PasarelaPrueba from '../demo/PasarelaPrueba';
import Portal from './Portal';
import Agenda from './Agenda';
import Evolucion from './Evolucion';
import Nutricion from './Nutricion';
import Cafeteria from './Cafeteria';
import Eventos from './Eventos';
import Cumpleanos from './Cumpleanos';
import Coach from './Coach';
import Recepcion from './Recepcion';
import Barista from './Barista';
import Admin from './Admin';
import { supabase } from '../lib/supabase';
import { EVENTO_NAVEGAR } from '../demo/navegacionDemo';
import { recolorearDemo } from '../demo/recolorearDemo';

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETA DE VENTA
//
// /demo/<estudio> pinta la app REAL con la marca de ese estudio, contra la base
// de DEMOSTRACIONES (proyecto Supabase "Demos", nunca la de Be Fit Lab). Cada
// rol de la barra es una cuenta de prueba: un clic y se entra con ella. Todo
// funciona como en producción y la base se restablece sola cada noche.
//
// 🔴 POR QUÉ SE INTERCEPTAN LOS CLICS:
// Portal y Agenda tienen una docena de <Link to="/..."> a rutas reales
// (/planes, /nutricion, /evolucion, /cafeteria…). Dentro de la demo, picarle a
// la barra de navegación sacaba a la prospecta de la maqueta y la dejaba en el
// sitio REAL de Be Fit Lab — o sea, en la marca de su competencia.
//
// Parchar enlace por enlace deja agujeros y el próximo cambio los reabre, y
// anidar un MemoryRouter no se puede (React Router 7 lo prohíbe expresamente).
// Así que se atrapan los clics en captura sobre el contenedor: cualquier enlace
// interno se traduce a un cambio de vista aquí adentro, y lo que no tenga vista
// simplemente no hace nada. Los enlaces externos (App Store, Google Play) sí
// pasan, porque no sacan de la demo: abren otra pestaña.
// ─────────────────────────────────────────────────────────────────────────────

// La barra cambia de ROL, no de pantalla: antes repetía la navegación que la
// app ya tiene abajo. Así una dueña ve su panel, el mostrador, la vista de la
// coach y la de la barista sin salir de la maqueta ni necesitar cuentas.
const ROLES = [
  { id: 'clienta',   etiqueta: 'Tu clienta',  Icon: Smartphone },
  { id: 'recepcion', etiqueta: 'Mostrador',   Icon: ScanLine },
  { id: 'coach',     etiqueta: 'Coach',       Icon: Dumbbell },
  { id: 'barista',   etiqueta: 'Barra',       Icon: Coffee },
  { id: 'admin',     etiqueta: 'Dirección',   Icon: LayoutDashboard },
];

// Qué ruta interna abre cada vista. Se usa al atrapar los clics de la barra de
// navegación, para traducirlos en vez de dejar que saquen de la maqueta.
// Qué pantalla de la clienta abre cada ruta interna.
const RUTAS = {
  '/portal': 'portal',
  '/agenda': 'agenda',
  '/evolucion': 'evolucion',
  '/nutricion': 'nutricion',
  '/cafeteria': 'cafeteria',
  '/eventos': 'eventos',
  '/cumpleanos': 'cumpleanos',
};

export default function Demo() {
  const { estudio } = useParams();
  const cfg = useMemo(() => estudioDemo(estudio), [estudio]);
  const [rol, setRol] = useState('clienta');
  // Solo aplica dentro del rol de clienta: la barra de abajo de la app cambia
  // esto, y ya no se duplica arriba.
  const [vista, setVista] = useState('portal');
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  // Pedido de la cafetería que regresa a pagar en la pasarela de prueba
  // (/pago-prueba → /demo/<estudio>?pago=<id>). Ver src/demo/PasarelaPrueba.jsx.
  const [pagoOrden] = useState(() => new URLSearchParams(window.location.search).get('pago'));
  const [pagoAbierto, setPagoAbierto] = useState(Boolean(pagoOrden));

  // El sello se parte en 2 o 3 renglones en pantallas angostas, así que la
  // altura del encabezado NO se puede adivinar con un número fijo: se mide.
  const encabezadoRef = useRef(null);
  const [altoEncabezado, setAltoEncabezado] = useState(56);

  // Se reemplaza la identidad activa DURANTE el render, no en un efecto: los
  // efectos corren después de que los hijos ya se pintaron, y Portal alcanzaría
  // a dibujarse una vez con el nombre y los colores de Be Fit Lab.
  useMemo(() => {
    if (!cfg) return;
    activarEstudioDemo(cfg);
  }, [cfg]);

  // La pasarela de prueba regresa por /pago-prueba, que no sabe de qué maqueta
  // venía la compra: se le deja dicho aquí.
  useEffect(() => {
    try { sessionStorage.setItem('demo_actual', estudio); } catch { /* sin almacenamiento */ }
  }, [estudio]);

  // De vuelta a la cafetería. NO se usa su ?payment=success (el regreso de
  // Stripe): en Cafeteria.jsx ese camino bloquea el scroll para un seguimiento
  // que ya no se pinta (bug de Be Fit, sin tocar aquí). La pasarela confirma el
  // pago ella misma y el pedido se ve en "Pedidos". Pagado → carrito vacío;
  // cancelado → el carrito se queda para reintentar.
  const terminarPago = (resultado) => {
    if (resultado === 'pagado') {
      try { localStorage.setItem('befit_cafe_cart', '[]'); } catch { /* sin almacenamiento */ }
    }
    setPagoAbierto(false);
    window.history.replaceState({}, '', `/demo/${estudio}`);
    setVista('cafeteria');
  };

  useEffect(() => {
    if (!cfg) return;

    // Se reactiva aquí además del useMemo de arriba: en desarrollo StrictMode
    // monta, limpia y vuelve a montar, y la limpieza restaura la marca de casa.
    activarEstudioDemo(cfg);

    // ⚠️ La demo NO modifica archivos de Be Fit Lab: si algo de la app se ve
    // mal dentro de la maqueta, se corrige aquí, solo mientras la demo está
    // abierta. La barra flotante de abajo (.ios-bottom-nav, z 2000) tapaba la
    // hoja "¿A dónde se fueron mis clases?" (z 1401); aquí se baja debajo de ella.
    const ajustes = document.createElement('style');
    ajustes.textContent = '.ios-bottom-nav{z-index:1399 !important}';
    // Cumpleaños: la tarjeta de la cuenta regresiva es un collage de papel kraft
    // escrito en Cumpleanos.jsx (archivo de Be Fit). Si el estudio trae foto, se
    // cambia aquí: foto de fondo, sin recortes encima y el contador abajo para no
    // tapar a las personas.
    const fotoCumple = cfg.portadas?.cumpleTarjeta;
    if (fotoCumple) {
      const tarjeta = 'div[style*="/cumple/kraft.jpg"]';
      ajustes.textContent += `
        ${tarjeta}{background-image:url("${fotoCumple}") !important}
        ${tarjeta}::before{content:"";position:absolute;inset:0;pointer-events:none;
          background:linear-gradient(180deg,rgba(0,0,0,0) 55%,rgba(30,20,12,0.45) 100%)}
        ${tarjeta}>img,${tarjeta}>svg{display:none !important}
        ${tarjeta}>div{top:auto !important;bottom:16px;transform:none !important}`;
    }
    // Texto en el color del logo en vez de negro: --on-surface no es token de
    // marca en Be Fit (estudio.js), así que se pisa aquí. La demo va siempre
    // en claro, por eso solo el tema claro.
    const { texto, textoSuave } = cfg.colores || {};
    if (texto) {
      ajustes.textContent += `
        :root:not([data-theme='dark']){--on-surface:${texto};--app-on-surface:${texto}${
          textoSuave ? `;--on-surface-muted:${textoSuave}` : ''}}`;
    }
    // Letras pintadas con el color principal (114 lugares en Be Fit): el
    // naranja de fábrica es claro y aguanta, pero un primario medio sobre
    // fondo claro se lee mal, así que solo el TEXTO toma un tono más oscuro.
    // El espacio antes de "color" deja fuera a background-color y border-color.
    const textoPrimario = cfg.colores?.textoPrimario;
    if (textoPrimario) {
      const sel = (v) => `[style^="color: ${v}"],[style*=" color: ${v}"]`;
      ajustes.textContent += `
        ${['var(--primary)', 'var(--primary-dim)', cfg.colores.primarioRgb]
          .filter(Boolean).map(sel).join(',')}{color:${textoPrimario} !important}`;
    }
    // Be Fit pinta botones y la tarjeta de "check-in abierto" con un degradado
    // del primario al acento con letra blanca: con su naranja→durazno se lee,
    // pero si el acento del estudio es claro (Tan) la mitad del botón se lava.
    // En la maqueta el degradado termina en el primario vivo.
    if (cfg.degradadoOscuro) {
      ajustes.textContent += `
        .midnight-gradient-btn,.app-gradient-btn,.qr-client-avatar,
        [style*="gradient(135deg, var(--primary), var(--accent))"]{
          background:linear-gradient(135deg,var(--primary),var(--primary-strong)) !important}`;
    }
    // Panel de Dirección: el menú lateral (index.css) es carbón con letra
    // blanca; con panelClaro va en el fondo del estudio con letra de marca.
    // Las dos tarjetas del mostrador QR (QrCheckIn.jsx) sí se quedan con color
    // para que contrasten con el panel: el primario en degradado, con la letra
    // blanca de fábrica. La del lector se reconoce por su degradado (original
    // o ya recoloreado) y la de "Próxima clase" por su gris #564F49.
    if (cfg.panelClaro) {
      const c = cfg.colores;
      const tinta = c.texto;
      const tarjetas = [
        '.wallet-card[style*="rgb(26, 28, 30), rgb(44, 48, 46)"]',
        '.wallet-card[style*="rgb(53, 64, 36), rgb(69, 81, 47)"]',
        '[style*="background: rgb(86, 79, 73)"]',
      ].join(',');
      ajustes.textContent += `
        .admin-desktop-sidebar{background:${c.fondo} !important;color:${tinta};
          border-right:1px solid rgba(0,0,0,0.06) !important}
        .sidebar-title{color:${tinta} !important}
        .sidebar-subtitle{color:${c.textoPrimario} !important}
        .sidebar-nav-item{color:${tinta};opacity:.72}
        .sidebar-nav-item:hover{opacity:1;background:rgba(0,0,0,0.05) !important}
        .sidebar-nav-item.active{opacity:1;color:#fff !important;background:${c.primario} !important;
          box-shadow:0 8px 20px rgba(0,0,0,0.12) !important}
        .sidebar-nav::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15) !important}
        ${tarjetas}{background:linear-gradient(135deg,${c.primario},${c.primarioTenue}) !important;
          box-shadow:0 14px 30px rgba(0,0,0,0.12) !important}`;
    }
    document.head.appendChild(ajustes);
    const quitarRecolor = recolorearDemo(cfg.reemplazos);

    // La demo se ve siempre en claro: es como se enseña en una junta.
    document.documentElement.setAttribute('data-theme', 'light');
    // El fondo va en el body, no en el contenedor: ver el comentario del
    // minHeight más abajo.
    const fondoPrevio = document.body.style.background;
    document.body.style.background = 'var(--app-bg)';
    document.title = `${cfg.nombre} — demostración`;

    // Una maqueta con el nombre de un negocio real no debe indexarse nunca.
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);

    // Las etiquetas de index.html son de Be Fit Lab. Si el link de la maqueta se
    // comparte por WhatsApp —que es justo como se va a mandar— la vista previa
    // saldría con el nombre, la descripción y la foto de la competencia.
    const previos = [];
    const ponerMeta = (selector, valor) => {
      const nodo = document.head.querySelector(selector);
      if (!nodo) return;
      previos.push([nodo, nodo.getAttribute('content')]);
      nodo.setAttribute('content', valor);
    };
    const resumen = `Demostración de la app de ${cfg.nombre}, preparada por KaiZen.`;
    ponerMeta('meta[name="description"]', resumen);
    ponerMeta('meta[property="og:title"]', `${cfg.nombre} — demostración`);
    ponerMeta('meta[property="og:description"]', resumen);
    ponerMeta('meta[property="og:image"]', cfg.marca?.logo || '');
    ponerMeta('meta[name="twitter:title"]', `${cfg.nombre} — demostración`);
    ponerMeta('meta[name="twitter:description"]', resumen);
    ponerMeta('meta[name="twitter:image"]', cfg.marca?.logo || '');
    ponerMeta('meta[name="keywords"]', '');
    ponerMeta('meta[property="og:site_name"]', cfg.nombre);

    // index.html trae datos estructurados que declaran a Be Fit Lab como
    // negocio local, con su dirección y teléfono. En una maqueta de otro
    // estudio eso no debe existir: se desactiva mientras está abierta.
    const datosNegocio = [...document.head.querySelectorAll('script[type="application/ld+json"]')];
    datosNegocio.forEach((n) => { n.type = 'application/ld+json-demo-desactivado'; });

    return () => {
      quitarRecolor();
      document.head.removeChild(ajustes);
      document.head.removeChild(meta);
      previos.forEach(([nodo, valor]) => nodo.setAttribute('content', valor ?? ''));
      datosNegocio.forEach((n) => { n.type = 'application/ld+json'; });
      document.body.style.background = fondoPrevio;
      restaurarEstudio();
    };
  }, [cfg]);

  // ── Sesión real por rol ─────────────────────────────────────────────────────
  // La maqueta corre contra la base de DEMOSTRACIONES con la app de verdad.
  // Cada rol es una cuenta: si la sesión abierta no es la del rol elegido, se
  // entra con la correcta. Mientras llega su perfil, se enseña un aviso.
  const auth = useAuth();
  const cuenta = CUENTAS_DEMO[rol];
  const [errorSesion, setErrorSesion] = useState(null);
  const [reiniciando, setReiniciando] = useState(false);
  const esSuCuenta = auth.user?.email === cuenta.correo;
  const listo = esSuCuenta && auth.role === cuenta.rol;

  useEffect(() => {
    if (!cfg || auth.loading || esSuCuenta) return;
    let vivo = true;
    // La app cierra en web cualquier sesión que no diga "mantener sesión";
    // sin estas marcas, al recargar la maqueta se saldría sola.
    try {
      sessionStorage.setItem('befit_session_active', '1');
      localStorage.setItem('befit_remember_me', '1');
    } catch { /* sin almacenamiento: solo dura la pestaña */ }
    supabase.auth.signInWithPassword({ email: cuenta.correo, password: CONTRASENA_DEMO })
      .then(({ error }) => { if (vivo) setErrorSesion(error ? error.message : null); });
    return () => { vivo = false; };
  }, [cfg, auth.loading, esSuCuenta, cuenta.correo]);

  // Lo mismo que da la sesión real, más la marca de maqueta: las pantallas la
  // usan para navegar por dentro (crearIrA) y Reportes para enseñar su clave.
  const authDemo = useMemo(() => ({ ...auth, esDemo: true }), [auth]);

  // Atrapa en CAPTURA cualquier clic en un enlace interno antes de que React
  // Router lo procese, y lo traduce a un cambio de vista de la maqueta.
  const atraparNavegacion = (e) => {
    const enlace = e.target.closest?.('a[href]');
    if (!enlace) return;
    const destino = enlace.getAttribute('href') || '';
    // Los externos (App Store, Google Play, mapas) se dejan pasar: abren otra
    // pestaña y no sacan a nadie de la demo.
    if (!destino.startsWith('/')) return;
    e.preventDefault();
    e.stopPropagation();
    const vistaDestino = Object.entries(RUTAS)
      .find(([ruta]) => destino.startsWith(ruta))?.[1];
    // Lo que no tiene vista en la maqueta (planes, cafetería, términos…) se
    // ignora en vez de sacar a la prospecta al sitio real.
    if (vistaDestino) setVista(vistaDestino);
  };

  // Las pantallas que navegan por código (cerrar la cafetería, volver desde
  // eventos) avisan por aquí en vez de salirse de la maqueta.
  useEffect(() => {
    const alNavegar = (e) => {
      const destino = String(e.detail ?? '');
      const vistaDestino = Object.entries(RUTAS)
        .find(([ruta]) => destino.startsWith(ruta))?.[1];
      // navigate(-1), /registro, /planes y demás: se regresa al inicio, que es
      // lo que espera quien le picó a "cerrar".
      setVista(vistaDestino || 'portal');
    };
    window.addEventListener(EVENTO_NAVEGAR, alNavegar);
    return () => window.removeEventListener(EVENTO_NAVEGAR, alNavegar);
  }, []);

  // La guía lleva a una pantalla del recorrido de la clienta.
  const irA = (destino) => setVista(destino);

  // Regresa la base de demostraciones a Studio Alma recién abierto (la misma
  // función que corre cada noche) y recarga para leer todo de nuevo.
  const reiniciar = async () => {
    setReiniciando(true);
    const { error } = await supabase.rpc('demo_reset');
    if (error) {
      setReiniciando(false);
      alert('No se pudo reiniciar la demostración: ' + error.message);
      return;
    }
    window.location.reload();
  };

  useLayoutEffect(() => {
    const medir = () => setAltoEncabezado(encabezadoRef.current?.offsetHeight ?? 56);
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [cfg]);

  if (!cfg) return <Navigate to="/" replace />;

  const contenido = (
    <>
      {rol === 'clienta' && (
        <>
          {vista === 'portal' && <Portal />}
          {vista === 'agenda' && <Agenda />}
          {vista === 'evolucion' && <Evolucion />}
          {vista === 'nutricion' && <Nutricion />}
          {vista === 'cafeteria' && <Cafeteria />}
          {vista === 'eventos' && <Eventos />}
          {vista === 'cumpleanos' && <Cumpleanos />}
        </>
      )}
      {rol === 'recepcion' && <Recepcion />}
      {rol === 'coach' && <Coach />}
      {rol === 'barista' && <Barista />}
      {rol === 'admin' && <Admin />}
    </>
  );

  return (
    <AuthContext.Provider value={authDemo}>
      {/* Sello e interruptor viven juntos en un bloque fijo, y el contenido se
          baja exactamente lo que ese bloque mide. */}
      <div
        ref={encabezadoRef}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9500,
          // Transparente A PROPÓSITO: si aquí va un color sólido, el cristal de
          // la barra queda sobre negro y se ve como un bloque, no como cristal.
          background: 'transparent', pointerEvents: 'none',
        }}
      >
        {/* Barra de KaiZen, igual en todas las demos (src/demo/kaizen/BarraDemo.jsx). */}
        <BarraDemo
          roles={ROLES}
          rol={rol}
          alCambiar={(r) => { setRol(r); setVista('portal'); }}
          guiaAbierta={guiaAbierta}
          alGuia={() => setGuiaAbierta((a) => !a)}
          aviso={cfg.esReal
            ? `Maqueta preparada para ${cfg.nombre} por KaiZen · datos de ejemplo`
            : `Demostración con datos de ejemplo · ${cfg.nombre} es un estudio inventado · por KaiZen`}
        />
      </div>

      {pagoAbierto && listo && rol === 'clienta' && (
        <PasarelaPrueba ordenId={pagoOrden} cfg={cfg} alTerminar={terminarPago} />
      )}

      {guiaAbierta && (
        <GuiaDemo
          cfg={cfg} rol={rol} vista={vista} irA={irA}
          alReiniciar={() => { reiniciar(); setGuiaAbierta(false); }}
          alCerrar={() => setGuiaAbierta(false)}
          style={{
            position: 'fixed', zIndex: 9600, right: '12px', top: `${altoEncabezado + 8}px`,
            width: 'min(360px, calc(100vw - 24px))', boxSizing: 'border-box',
            maxHeight: `calc(100vh - ${altoEncabezado + 24}px)`, overflowY: 'auto',
          }}
        />
      )}

      <div
        onClickCapture={atraparNavegacion}
        style={{
          // ⚠️ SIN minHeight: 100vh. El panel de administración arma su propio
          // alto de pantalla, y al sumarle este contenedor el área de contenido
          // COLAPSABA: el sidebar marcaba la pestaña pero no se veía nada. El
          // fondo lo pinta el <body> (más abajo), no este div.
          paddingTop: `${altoEncabezado}px`,
        }}
      >
        {listo && !reiniciando ? contenido : (
          <div style={{
            minHeight: `calc(100vh - ${altoEncabezado}px)`, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px',
            color: 'var(--on-surface-variant)', fontSize: '0.9rem', textAlign: 'center',
          }}>
            {errorSesion ? (
              <span>No se pudo entrar a la demostración: {errorSesion}</span>
            ) : (
              <>
                <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
                {reiniciando ? 'Reiniciando la demostración…'
                  : `Entrando como ${ROLES.find((r) => r.id === rol)?.etiqueta.toLowerCase()}…`}
              </>
            )}
          </div>
        )}
      </div>

    </AuthContext.Provider>
  );
}
