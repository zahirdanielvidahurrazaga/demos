import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Bell, Bike, CalendarDays, Check, ChevronRight, Clock, CreditCard, Gift, Heart, HelpCircle, House, Leaf, LogOut, MapPin, Minus, Plus,
  ShoppingBag, Store, UserRound, UtensilsCrossed, X,
} from 'lucide-react';
import {
  CATEGORIAS, CLAVE, CLAVE_PERFIL, DIRECCION_DEMO, EMPAQUE, ESTADOS, EVITA, EXTRAS, MEMBRESIA, NEGOCIO, OBJETIVOS, PASOS, PERFIL_VACIO,
  PLANES, PLATILLOS, RECOMPENSAS,
  delDia, diaCorto, diaLargo, diasHabiles, dinero, foto, guardar, guardarPerfil, hhmm, horarios, hoyISO,
  leer, leerPerfil, nuevoPedido, numDia, platillo, sembrar, terminado, totalLinea, totalPedido,
} from './datos';
import { Bolsita, Dibujo, Isotipo, OSonrisa, Sello } from './comun';
import './app.css';

// ─────────────────────────────────────────────────────────────────────────────
// La app del cliente — v3 (14-nov). Zahir: menos saturada, espacios bien,
// registro LITERAL de primera vez (celular + código), carga más larga que se
// luzca, "Yo" pulido (membresía y recompensas, pagos y direcciones,
// preferencias y cuenta), precios ~$125, empaques biodegradables.
//
//   Carga (3.2 s) → Registro la 1ª vez: bienvenida (3) · celular · código SMS ·
//   nombre y correo · objetivo y qué evitas · recoger/domicilio · avisos · regalo
//   → Inicio · Menú · Semana · Pedidos · Yo  + hojas de platillo, carrito y pedido.
// Sin backend: estado en localStorage (`CLAVE`, se resiembra cada día) y el
// perfil aparte (`CLAVE_PERFIL`). Los pedidos de HOY avanzan acelerados.
// Prefijo CSS `ba-` (app.css). Membresía Bocado+ = PROPUESTA (Zahir la revisa).
//
// v4 (16-nov, "mejora la interfaz"): en la maqueta la app se dibuja a 393 pt
// reales (Iphone `logico`), el "+" de las listas SÍ agrega (`Mas`), el menú abre
// en "Todo" por secciones, los horarios del carrito van en una fila que se
// desliza, la barra del carrito solo sale en Inicio y Menú (antes tapaba todo)
// y agregar ya no lanza un aviso encima: la barra da un golpecito.
// ─────────────────────────────────────────────────────────────────────────────

// Dónde guarda esta app. La del recorrido de la Expo usa claves APARTE (25-nov): sus
// pasos automáticos creaban un pedido "para recoger" y reiniciaban el perfil, y eso
// pisaba lo que la persona eligió en "Pruébala tú" (p. ej. a domicilio).
function useEstado(clave) {
  const [e, setE] = useState(() => leer(clave));
  useEffect(() => {
    const f = (ev) => { if (ev.key === clave) setE(leer(clave)); };
    window.addEventListener('storage', f);
    return () => window.removeEventListener('storage', f);
  }, []);
  const cambiar = useCallback((fn) => {
    setE((prev) => {
      const copia = structuredClone(prev);
      if (!copia.cupones) copia.cupones = [];
      const sig = fn(copia) || copia;
      guardar(sig, clave);
      return sig;
    });
  }, [clave]);
  return [e, cambiar];
}

function usePerfil(clave) {
  const [p, setP] = useState(() => leerPerfil(clave));
  useEffect(() => {
    const f = (ev) => { if (ev.key === clave) setP(leerPerfil(clave)); };
    window.addEventListener('storage', f);
    return () => window.removeEventListener('storage', f);
  }, []);
  const cambiar = useCallback((cambios) => {
    setP((prev) => { const sig = { ...prev, ...cambios }; guardarPerfil(sig, clave); return sig; });
  }, [clave]);
  return [p, cambiar];
}

// v7 (19-nov): los platillos son RECORTES de producto sobre el papel (como el vaso
// del video de referencia); si un recorte falta, cae a la foto de siempre.
const recorte = (id) => `/bocado/c-${id}.webp`;
function Img({ id, className = '', foto: conFoto = false }) {
  const [mal, setMal] = useState(false);
  const src = conFoto || mal ? foto(id) : recorte(id);
  return <img className={`${className} ${conFoto || mal ? '' : 'recorte'}`} src={src} alt="" draggable={false} decoding="async" onError={() => setMal(true)} />;
}
// "Háptica": un toque corto en Android (iOS web no vibra; ahí lo da la animación).
const toque = () => { try { navigator.vibrate?.(8); } catch { /* sin vibración */ } };
const TITULOS = { inicio: 'el buen bocado', menu: 'Menú', semana: 'Tu semana', pedidos: 'Pedidos', yo: 'Yo' };
const ordenar = (a, b) => (a.dia + String(a.hora).padStart(4, '0')).localeCompare(b.dia + String(b.hora).padStart(4, '0'));
const REBAJA = { agua: 25, aguacate: 18, bowl: 125, envio: 0 };

// Filtro SVG del vidrio líquido (17-nov): la barra y los avisos lo usan con
// `backdrop-filter: url(#ba-liquido)` para deformar lo que pasa por detrás.
// Va una sola vez en <body> para que sirva en cualquier pantalla.
function useFiltroLiquido() {
  useEffect(() => {
    if (document.getElementById('ba-liquido')) return;
    const div = document.createElement('div');
    div.setAttribute('aria-hidden', 'true');
    div.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    div.innerHTML = `<svg width="0" height="0"><filter id="ba-liquido" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.011 0.016" numOctaves="2" seed="7" result="ruido"/>
      <feGaussianBlur in="ruido" stdDeviation="2.2" result="suave"/>
      <feDisplacementMap in="SourceGraphic" in2="suave" scale="34" xChannelSelector="R" yChannelSelector="G"/>
    </filter></svg>`;
    document.body.appendChild(div);
  }, []);
}

// `aparte`: la app del recorrido de la Expo (guarda con sufijo _expo).
export default function App({ marco = false, comando = null, aparte = false }) {
  const claves = useMemo(() => (aparte ? { e: `${CLAVE}_expo`, perfil: `${CLAVE_PERFIL}_expo` } : { e: CLAVE, perfil: CLAVE_PERFIL }), [aparte]);
  useFiltroLiquido();
  const [e, cambiar] = useEstado(claves.e);
  const [perfil, cambiarPerfil] = usePerfil(claves.perfil);
  // carga: true (cargando) → 'sale' (el telón se cierra encima de la app, .65 s) → false
  const [carga, setCarga] = useState(true);
  const terminaCarga = useCallback(() => { setCarga('sale'); setTimeout(() => setCarga(false), 650); }, []);
  // Al cambiar de pestaña la pantalla entra del lado al que vas (como en iOS): `va`.
  const [{ tab, va }, setNav] = useState({ tab: 'inicio', va: 'der' });
  const setTab = useCallback((t) => setNav((n) => {
    if (t === n.tab) return n;
    const de = TABS.findIndex(([id]) => id === n.tab), a = TABS.findIndex(([id]) => id === t);
    return { tab: t, va: a >= de ? 'der' : 'izq' };
  }), []);
  const [menuCat, setMenuCat] = useState('todo');
  const [ver, setVer] = useState(null);
  const [carrito, setCarrito] = useState(null);       // null | { modo }
  const [pedidoAbierto, setPedidoAbierto] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [membresia, setMembresia] = useState(false);
  const [golpe, setGolpe] = useState(0);              // la barra del carrito brinca al agregar
  const cuerpo = useRef(null);
  const [arriba, setArriba] = useState(true);          // título grande (true) o compacto al bajar

  useEffect(() => { const t = setTimeout(terminaCarga, 3200); return () => clearTimeout(t); }, [terminaCarga]);
  const avisar = useCallback((txt, icono = 'bocado') => setAviso({ txt, icono, k: Date.now() }), []);
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(null), 3800);
    return () => clearTimeout(t);
  }, [aviso]);
  useEffect(() => { cuerpo.current?.scrollTo({ top: 0 }); }, [tab]);   // el scroll a 0 dispara onScroll y regresa el título grande

  // Simulación acelerada de los pedidos de hoy.
  useEffect(() => {
    const hay = e.pedidos.some((p) => p.dia === hoyISO() && ['programado', 'cocina', 'camino'].includes(p.estado));
    if (!hay) return undefined;
    const t = setInterval(() => {
      const ahora = Date.now();
      const avisos = [];
      cambiar((s) => {
        avisos.length = 0;
        s.pedidos.forEach((p) => {
          if (p.dia !== hoyISO()) return;
          const pasado = ahora - (p.confirmado || p.creado);
          if (p.estado === 'programado' && pasado > 7000) p.estado = 'cocina';
          else if (p.estado === 'cocina' && p.modo !== 'domicilio' && pasado > 17000) { p.estado = 'listo'; avisos.push([`Tu pedido ya está en la casilla ${p.casilla}`, 'bocado']); }
          else if (p.estado === 'cocina' && p.modo === 'domicilio' && pasado > 14000) { p.estado = 'camino'; p.salio = ahora; avisos.push(['Tu pedido va en camino · llega en 12 min', 'bici']); }
          else if (p.estado === 'camino' && ahora - (p.salio || ahora) > 20000) { p.estado = 'entregado'; avisos.push(['Entregado en tu oficina. ¡Buen provecho!', 'bocado']); }
        });
      });
      setTimeout(() => { if (avisos.length) avisar(...avisos[avisos.length - 1]); }, 0);
    }, 1000);
    return () => clearInterval(t);
  }, [e.pedidos, cambiar, avisar]);

  // Recorrido guiado desde el sitio: { tipo, k }.
  useEffect(() => {
    if (!comando) return;
    setVer(null); setCarrito(null); setPedidoAbierto(null);
    const demo = (modo, estado, extra = {}) => {
      const p = nuevoPedido({ dia: hoyISO(), hora: 13 * 60, lineas: [{ id: 'pollo-limon', quitar: [], extras: [], cant: 1 }], n: e.pedidos.length, modo, envio: 0 });
      Object.assign(p, { estado, confirmado: Date.now() - 30000, ...extra });
      cambiar((s) => { s.pedidos.forEach((x) => { if (x.dia === hoyISO() && !terminado(x)) x.estado = x.modo === 'domicilio' ? 'entregado' : 'recogido'; }); s.pedidos.push(p); });
      return p;
    };
    const conCarrito = () => { if (!e.carrito.length) cambiar((s) => { s.carrito.push({ id: 'mediterraneo', quitar: ['Aceitunas'], extras: ['aguacate'], cant: 1 }); }); };
    const t = comando.tipo;
    if (t === 'bienvenida') { cambiarPerfil({ listo: false }); setCarga(true); setTimeout(terminaCarga, 3200); return; }
    setCarga(false);
    if (!perfil.listo) cambiarPerfil({ ...PERFIL_VACIO, nombre: 'Ana Ramírez', correo: 'ana.ramirez@correo.com', telefono: '222 418 2290', listo: true, desde: hoyISO() });
    if (t === 'inicio') setTab('inicio');
    if (t === 'menu') setTab('menu');
    if (t === 'semana') setTab('semana');
    if (t === 'yo') setTab('yo');
    if (t === 'personaliza') { setTab('menu'); setTimeout(() => setVer('mediterraneo'), 250); }
    if (t === 'programa') { setTab('menu'); conCarrito(); setTimeout(() => setCarrito({ modo: 'recoger' }), 250); }
    if (t === 'domicilio') { setTab('menu'); conCarrito(); setTimeout(() => setCarrito({ modo: 'domicilio' }), 250); }
    if (t === 'aviso') { const p = demo('recoger', 'listo'); setTab('inicio'); setTimeout(() => avisar(`Tu pedido ya está en la casilla ${p.casilla}`), 300); }
    if (t === 'camino') { const p = demo('domicilio', 'camino', { salio: Date.now() - 4000 }); setTab('inicio'); setTimeout(() => { avisar('Tu pedido va en camino · llega en 12 min', 'bici'); setPedidoAbierto(p.id); }, 300); }
  }, [comando?.k]);   // eslint-disable-line react-hooks/exhaustive-deps

  const agregar = (linea) => {
    cambiar((s) => { s.carrito.push(linea); });
    setVer(null);
    setGolpe((g) => g + 1);
    toque();
  };
  // El "+" de las listas: lo agrega como viene (si ya está igual, suma uno).
  const agregarRapido = (id) => {
    cambiar((s) => {
      const igual = s.carrito.find((l) => l.id === id && !(l.quitar || []).length && !(l.extras || []).length);
      if (igual) igual.cant = Math.min(9, (igual.cant || 1) + 1);
      else s.carrito.push({ id, quitar: [], extras: [], cant: 1 });
    });
    setGolpe((g) => g + 1);
    toque();
  };
  const repetir = (p) => {
    cambiar((s) => { s.carrito = structuredClone(p.lineas); });
    setCarrito({ modo: p.modo || perfil.modo });
  };
  const confirmar = ({ dia, hora, modo, cupon, cuenta }) => {
    const nuevo = nuevoPedido({ dia, hora, lineas: structuredClone(e.carrito), n: e.pedidos.length, modo, envio: cuenta.envio });
    nuevo.confirmado = Date.now();
    nuevo.descuento = cuenta.descuento;
    nuevo.rebaja = cuenta.rebaja;
    const gana = Math.floor(totalPedido(nuevo) / 10) * (perfil.miembro ? 2 : 1);
    cambiar((s) => {
      s.pedidos.push(nuevo); s.carrito = []; s.puntos += gana;
      if (cupon) s.cupones = s.cupones.filter((c) => c.k !== cupon.k);
    });
    setCarrito(null);
    setTab('inicio');
    setPedidoAbierto(nuevo.id);
    setTimeout(() => avisar(`+${gana} bocados`), 600);
  };

  const vivos = e.pedidos.filter((p) => !terminado(p) && p.dia >= hoyISO()).sort(ordenar);
  const carritoTotal = e.carrito.reduce((s, l) => s + totalLinea(l), 0);
  const carritoN = e.carrito.reduce((s, l) => s + (l.cant || 1), 0);

  const conBarra = carritoN > 0 && ['inicio', 'menu'].includes(tab);
  const raiz = `ba ${marco ? 'en-marco' : ''} ${conBarra ? 'con-carrito' : ''} ${carga === 'sale' ? 'saliendo' : ''}`;
  if (carga === true) return <div className={raiz}><Carga /></div>;
  const telon = carga === 'sale' ? <div className="ba-telon" aria-hidden="true"><Carga fin /></div> : null;
  if (!perfil.listo) {
    return (
      <div className={raiz}>
        <Registro perfil={perfil} terminar={(p) => {
          cambiarPerfil({ ...p, listo: true, desde: hoyISO() });
          cambiar((s) => { s.puntos += 100; s.cupones.push({ k: Date.now(), id: 'envio', nombre: 'Envío gratis', regalo: true }); });
          setTab('inicio');
        }} />
        {telon}
      </div>
    );
  }

  return (
    <div className={raiz}>
      <div className={`ba-nav ${arriba ? '' : 'visible'}`} aria-hidden={arriba}><b>{TITULOS[tab]}</b></div>
      <div className={`ba-cuerpo va-${va}`} ref={cuerpo} onScroll={(ev) => { const a = ev.currentTarget.scrollTop < 44; if (a !== arriba) setArriba(a); }}>
        {tab === 'inicio' && <Inicio perfil={perfil} puntos={e.puntos} vivos={vivos} abrir={setVer} abrirPedido={setPedidoAbierto} irA={setTab} verCat={(c) => { setMenuCat(c); setTab('menu'); }} />}
        {tab === 'menu' && <Menu key={menuCat} catInicial={menuCat} abrir={setVer} agregar={agregarRapido} perfil={perfil} />}
        {tab === 'semana' && <Semana e={e} perfil={perfil} cambiar={cambiar} avisar={avisar} abrirPedido={setPedidoAbierto} />}
        {tab === 'pedidos' && <Pedidos e={e} vivos={vivos} abrirPedido={setPedidoAbierto} irA={setTab} repetir={repetir} />}
        {tab === 'yo' && <Yo claves={claves} e={e} perfil={perfil} cambiar={cambiar} cambiarPerfil={cambiarPerfil} avisar={avisar} abrirMembresia={() => setMembresia(true)} />}
      </div>

      {conBarra && !carrito && !ver && (
        <button key={golpe} className="ba-carrito-barra" onClick={() => setCarrito({ modo: perfil.modo })}>
          <span className="n">{carritoN}</span><span>Ver mi pedido</span><b>{dinero(carritoTotal)}</b>
        </button>
      )}
      <Barra tab={tab} irA={setTab} />

      {ver && <Platillo id={ver} perfil={perfil} cerrar={() => setVer(null)} agregar={agregar} />}
      {carrito && <HojaCarrito e={e} perfil={perfil} modoInicial={carrito.modo} cambiar={cambiar} cerrar={() => setCarrito(null)} confirmar={confirmar} />}
      {pedidoAbierto && <HojaPedido p={e.pedidos.find((p) => p.id === pedidoAbierto)} perfil={perfil} cerrar={() => setPedidoAbierto(null)} cambiar={cambiar} avisar={avisar} />}

      {telon}
      {membresia && <HojaMembresia cerrar={() => setMembresia(false)} unirme={() => { cambiarPerfil({ miembro: true }); setMembresia(false); avisar(`Ya eres parte de ${MEMBRESIA.nombre}`); }} />}

      {aviso && (
        <div key={aviso.k} className="ba-aviso">
          <span className="ic">{aviso.icono === 'bici' ? <Bike size={16} /> : <Isotipo size={24} />}</span>
          <div><small>el buen bocado · ahora</small><span>{aviso.txt}</span></div>
        </div>
      )}
    </div>
  );
}

// ── BARRA DE VIDRIO LÍQUIDO ─────────────────────────────────────────────────
const TABS = [
  ['inicio', 'Inicio', House], ['menu', 'Menú', UtensilsCrossed], ['semana', 'Semana', CalendarDays],
  ['pedidos', 'Pedidos', ShoppingBag], ['yo', 'Yo', UserRound],
];
function Barra({ tab, irA }) {
  const i = TABS.findIndex(([id]) => id === tab);
  return (
    <nav className="ba-tabs" aria-label="Navegación" style={{ '--i': i }}>
      {TABS.map(([id, txt, Ic]) => (
        <button key={id} className={tab === id ? 'on' : ''} onClick={() => { if (tab !== id) toque(); irA(id); }} aria-current={tab === id ? 'page' : undefined}>
          <Ic size={23} strokeWidth={tab === id ? 2.1 : 1.6} />
          <span>{txt}</span>
        </button>
      ))}
    </nav>
  );
}

// ── CARGA: la bolsita cae, le brota la hoja, saluda y entra el nombre ──────
// Barra con % movida por JS (25-nov): con "reducir movimiento" las animaciones de
// CSS no corren y la pantalla parecía trabada; la barra siempre avanza.
// v3 (25-nov, Zahir: "mejora mucho más la pantalla de carga"): LA BOLSITA SE LLENA.
// Caen cinco ingredientes dibujados en línea, ella los atrapa con un rebote, abajo
// dice qué está empacando y el %; al 100 da un brinco. Todo con rAF (no CSS).
const DURA_CARGA = 3100;
const LINEA = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const INGREDIENTES = [
  { n: 'Lechuga fresca', x: -46, giro: -40, svg: <><path d="M6 30C6 14 18 4 34 4c0 16-10 28-28 26z" {...LINEA} /><path d="M8 28 28 10M15 21l-2-7M21 16l5 1" {...LINEA} /></> },
  { n: 'Jitomate', x: 40, giro: 50, svg: <><circle cx="19" cy="19" r="13" {...LINEA} /><circle cx="19" cy="19" r="8" {...LINEA} /><path d="M19 11v16M11 19h16" {...LINEA} /></> },
  { n: 'Aguacate', x: -30, giro: 30, svg: <><path d="M19 4c6 0 9 8 11 14 3 9-2 16-11 16S5 27 8 18c2-6 5-14 11-14z" {...LINEA} /><circle cx="19" cy="23" r="5.5" {...LINEA} /></> },
  { n: 'Limón', x: 46, giro: -60, svg: <><circle cx="19" cy="19" r="13" {...LINEA} /><path d="M19 9v20M10.5 14l17 10M10.5 24l17-10" {...LINEA} /></> },
  { n: 'Garbanzo', x: -8, giro: 90, svg: <><circle cx="13" cy="21" r="7" {...LINEA} /><circle cx="25" cy="15" r="6" {...LINEA} /><circle cx="25" cy="27" r="5" {...LINEA} /></> },
];
const CAE = 0.15; // cuánto (de 0 a 1) dura la caída de cada uno
// Fondo (25-nov, "animaciones de elementos gráficos"): figuras en línea que flotan y giran
// despacio alrededor de la bolsa. [x %, y %, tamaño, figura, fase]
const FIGURAS = [
  [10, 14, 30, 'hoja', 0], [84, 10, 22, 'aro', 1.3], [90, 36, 18, 'cruz', 2.1], [6, 44, 16, 'punto', 0.6],
  [14, 74, 26, 'garabato', 2.8], [86, 70, 28, 'hoja', 1.9], [74, 88, 16, 'cruz', 0.9], [22, 92, 20, 'aro', 3.4],
  [50, 6, 14, 'punto', 1.1], [94, 54, 14, 'punto', 2.5],
];
const FIGURA = {
  hoja: <><path d="M5 27C5 13 15 4 29 4c0 14-9 25-24 23z" {...LINEA} /><path d="M7 25 24 9" {...LINEA} /></>,
  aro: <circle cx="16" cy="16" r="11" {...LINEA} />,
  cruz: <path d="M16 6v20M6 16h20" {...LINEA} />,
  punto: <><circle cx="10" cy="16" r="3" fill="currentColor" /><circle cx="22" cy="16" r="3" fill="currentColor" /></>,
  garabato: <path d="M3 18c4-8 8 8 12 0s8 8 12 0" {...LINEA} />,
};
function Carga({ fin = false }) {
  const [k, setK] = useState(fin ? 1 : 0); // avance de 0 a 1 (`fin` = ya llena, para el telón de salida)
  useEffect(() => {
    if (fin) return undefined;
    const t0 = performance.now(); let raf = 0;
    const paso = (ahora) => {
      const v = Math.min(1, (ahora - t0) / DURA_CARGA);
      setK(v);
      if (v < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [fin]);
  const pct = Math.round(100 * (1 - (1 - k) ** 1.6));
  const inicio = (i) => 0.1 + i * 0.15; // cada ingrediente empieza a caer aquí
  // ¿cuál cayó al último? → su nombre abajo y el rebote de la bolsa
  const caidos = INGREDIENTES.filter((_, i) => k >= inicio(i) + CAE).length;
  const desde = caidos ? k - (inicio(caidos - 1) + CAE) : 1;
  const rebote = caidos && desde < 0.09 ? Math.sin((desde / 0.09) * Math.PI) : 0;
  const brinco = k > 0.93 ? Math.sin(Math.min(1, (k - 0.93) / 0.07) * Math.PI) : 0;
  const texto = k >= 1 ? '¡Listo! Buen provecho' : caidos ? `Empacando ${INGREDIENTES[caidos - 1].n.toLowerCase()}` : 'Preparando tu bolsa';
  const t = k * DURA_CARGA / 1000; // segundos
  const onda = caidos && desde < 0.2 ? desde / 0.2 : null; // aro que sale de la bolsa al atrapar
  return (
    <div className="ba-carga v3">
      <div className="ba-carga-fondo" aria-hidden="true">
        {FIGURAS.map(([x, y, tam, fig, fase], i) => {
          const entra = Math.min(1, Math.max(0, (t - i * 0.08) / 0.5));
          return (
            <svg key={i} viewBox="0 0 32 32" width={tam} height={tam}
              style={{ left: `${x}%`, top: `${y}%`, opacity: entra * 0.42, transform: `translate(-50%, ${Math.sin(t * 1.4 + fase) * 7}px) rotate(${(i % 2 ? 1 : -1) * t * 22 + fase * 40}deg) scale(${0.6 + entra * 0.4})` }}>
              {FIGURA[fig]}
            </svg>
          );
        })}
      </div>
      <div className="ba-wm">
        <span>el buen</span>
        {'bocad'.split('').map((l, i) => <i key={i} style={{ animationDelay: `${0.15 + i * 0.06}s` }}>{l}</i>)}
        <i style={{ animationDelay: '.45s' }}><OSonrisa /></i>
      </div>
      <div className="ba-carga-escena" aria-hidden="true">
        {onda != null && <i className="onda" style={{ transform: `scale(${0.4 + onda * 1.2})`, opacity: (1 - onda) * 0.55 }} />}
        {INGREDIENTES.map((g, i) => {
          const f = (k - inicio(i)) / CAE; // 0 arriba → 1 dentro de la bolsa
          if (f <= 0 || f >= 1.05) return null;
          const c = Math.min(1, f) ** 2; // cae acelerando
          return (
            <svg key={g.n} className="ing" viewBox="0 0 38 38" width="38" height="38"
              style={{ transform: `translate(${g.x * (1 - c)}px, ${-112 + c * 112}px) rotate(${g.giro * (1 - c)}deg) scale(${1 - c * 0.45})`, opacity: f > 0.85 ? Math.max(0, 1 - (f - 0.85) / 0.2) : Math.min(1, f * 3) }}>
              {g.svg}
            </svg>
          );
        })}
        <div className="bolsa" style={{ transform: `translateY(${-brinco * 18}px) scale(${1 + rebote * 0.05}, ${1 - rebote * 0.07})` }}>
          <Bolsita size={150} tinta="kiwi" className="mono" />
        </div>
        <i className="sombra" style={{ transform: `scaleX(${1 - brinco * 0.3})`, opacity: 0.35 - brinco * 0.15 }} />
      </div>
      <div className="ba-carga-barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Cargando">
        <div className="fila"><span key={texto}>{texto}</span><b>{pct}%</b></div>
        <div className="riel">
          <i style={{ width: `${pct}%` }} />
          {INGREDIENTES.map((g, i) => <em key={g.n} className={i < caidos ? 'si' : ''} style={{ left: `${(1 - (1 - inicio(i) - CAE) ** 1.6) * 100}%` }} />)}
        </div>
      </div>
      <p className="lema">come rico, a tu hora</p>
    </div>
  );
}

// ── REGISTRO (la primera vez) ───────────────────────────────────────────────
const INTRO = [
  { escena: 'oficina', t: 'Comer bien,', e: 'a tu hora.', d: 'Comida saludable de verdad, lista justo cuando la necesitas.' },
  { escena: 'casilla', t: 'Recógelo sin fila', e: 'o te lo llevamos.', d: 'Pasa por tu casilla en 2 minutos o recíbelo en tu oficina.' },
  { escena: 'bowl', t: 'Junta bocados', e: 'y come gratis.', d: 'Cada pedido suma para recompensas y comidas gratis.' },
];
const CODIGO = '482913';

function Registro({ perfil, terminar }) {
  const [paso, setPaso] = useState(0);
  const [slide, setSlide] = useState(0);
  const [p, setP] = useState(() => ({ ...PERFIL_VACIO, ...perfil, telefono: perfil.telefono || '222 418 2290', nombre: perfil.nombre || 'Ana Ramírez', correo: perfil.correo || 'ana.ramirez@correo.com' }));
  const [codigo, setCodigo] = useState('');
  const [sms, setSms] = useState(false);
  const set = (c) => setP((x) => ({ ...x, ...c }));
  const toggle = (v) => set({ evita: p.evita.includes(v) ? p.evita.filter((x) => x !== v) : [...p.evita, v] });
  const TOTAL = 6;

  // El SMS llega solo y el código se escribe solo (como el autollenado de iOS).
  useEffect(() => {
    if (paso !== 2) return undefined;
    setCodigo(''); setSms(false);
    const t1 = setTimeout(() => setSms(true), 1100);
    const ts = CODIGO.split('').map((_, i) => setTimeout(() => setCodigo(CODIGO.slice(0, i + 1)), 2300 + i * 130));
    const fin = setTimeout(() => setPaso(3), 2300 + CODIGO.length * 130 + 700);
    return () => { clearTimeout(t1); clearTimeout(fin); ts.forEach(clearTimeout); };
  }, [paso]);

  if (paso === 0) {
    const s = INTRO[slide];
    return (
      <div className="ba-intro">
        <div className="dibujo" key={s.escena}><Dibujo escena={s.escena} /></div>
        <div className="puntos">{INTRO.map((_, i) => <button key={i} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} aria-label={`Tarjeta ${i + 1}`} />)}</div>
        <div className="txt" key={slide}><h1>{s.t}<br /><em>{s.e}</em></h1><p>{s.d}</p></div>
        {slide < INTRO.length - 1 ? (
          <div className="pie fila">
            <button className="ba-link" onClick={() => setPaso(1)}>Saltar</button>
            <button className="ba-btn chico" onClick={() => setSlide(slide + 1)}>Siguiente</button>
          </div>
        ) : (
          <div className="pie">
            <button className="ba-btn ancho" onClick={() => setPaso(1)}>Crear mi cuenta</button>
            <button className="ba-link" onClick={() => setPaso(1)}>Ya tengo cuenta</button>
          </div>
        )}
      </div>
    );
  }

  const cab = (titulo, sub) => (
    <header className="ba-paso-cab">
      <div className="fila">
        <button className="ba-atras" onClick={() => setPaso(paso === 3 ? 1 : paso - 1)} aria-label="Atrás"><ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /></button>
        <div className="barrita">{Array.from({ length: TOTAL }, (_, i) => <i key={i} className={i < paso ? 'on' : ''} />)}</div>
      </div>
      <h1>{titulo}</h1>{sub && <p>{sub}</p>}
    </header>
  );

  if (paso === 7) {
    return (
      <div className="ba-paso ba-regalo">
        {/* 25-nov: más festiva — halo con rayitos que gira, hojitas que caen y los regalos como cupones */}
        <div className="centro">
          <div className="halo" aria-hidden="true">
            <svg className="rayos" viewBox="0 0 200 200">{Array.from({ length: 16 }, (_, i) => <line key={i} x1="100" y1="14" x2="100" y2={i % 2 ? 26 : 32} transform={`rotate(${i * 22.5} 100 100)`} />)}</svg>
            {[0, 1, 2, 3, 4].map((i) => <i key={i} className={`hojita h${i}`} />)}
            <div className="sello"><Bolsita size={104} /></div>
          </div>
          <small className="etq">Regalo de bienvenida</small>
          <h1>¡Listo, {p.nombre.split(' ')[0]}!</h1>
          <p>Tu cuenta ya está creada. Para tu primera vez:</p>
          <div className="dones">
            <div><span className="ic"><Gift size={18} /></span><span className="t"><b>100 bocados</b><small>Ya están en tu cuenta</small></span></div>
            <div><span className="ic"><Bike size={18} /></span><span className="t"><b>Envío gratis</b><small>En tu primer pedido a domicilio</small></span></div>
          </div>
        </div>
        <div className="ba-paso-pie"><button className="ba-btn ancho" onClick={() => terminar(p)}>Empezar a pedir</button></div>
      </div>
    );
  }

  return (
    <div className="ba-paso" key={paso}>
      {paso === 1 && (
        <>
          {cab('Crea tu cuenta', 'Con tu celular. Te mandamos un código para confirmarlo.')}
          <div className="ba-paso-cuerpo">
            <label className="ba-tel">
              <span className="lada">🇲🇽 +52</span>
              <input value={p.telefono} inputMode="tel" onChange={(ev) => set({ telefono: ev.target.value })} aria-label="Celular" />
            </label>
            <p className="ba-legal">Al continuar aceptas los Términos y el Aviso de privacidad. Prototipo: no se envía ningún SMS real.</p>
          </div>
          <div className="ba-paso-pie"><button className="ba-btn ancho" disabled={p.telefono.replace(/\D/g, '').length < 10} onClick={() => setPaso(2)}>Enviar código</button></div>
        </>
      )}
      {paso === 2 && (
        <>
          {sms && (
            <div className="ba-aviso sms">
              <span className="ic msg">SMS</span>
              <div><small>Mensajes · ahora</small><span>Tu código de el buen bocado es {CODIGO}</span></div>
            </div>
          )}
          {cab('Escribe el código', `Lo enviamos al +52 ${p.telefono}.`)}
          <div className="ba-paso-cuerpo">
            <div className="ba-codigo">{CODIGO.split('').map((_, i) => <span key={i} className={i === codigo.length ? 'actual' : ''}>{codigo[i] || ''}</span>)}</div>
            <p className="ba-legal centrado">{codigo.length === CODIGO.length ? <><Check size={14} /> Verificado</> : 'Reenviar código en 0:24'}</p>
          </div>
        </>
      )}
      {paso === 3 && (
        <>
          {cab('¿Cómo te llamas?', 'Así sabremos de quién es cada pedido.')}
          <div className="ba-paso-cuerpo">
            <label className="ba-campo"><span>Nombre</span><input value={p.nombre} onChange={(ev) => set({ nombre: ev.target.value })} /></label>
            <label className="ba-campo"><span>Correo (para tus tickets)</span><input value={p.correo} inputMode="email" onChange={(ev) => set({ correo: ev.target.value })} /></label>
          </div>
          <div className="ba-paso-pie"><button className="ba-btn ancho" disabled={!p.nombre.trim()} onClick={() => setPaso(4)}>Continuar</button></div>
        </>
      )}
      {paso === 4 && (
        <>
          {cab('¿Qué buscas al comer?', 'Te recomendamos platillos con esto en mente.')}
          <div className="ba-paso-cuerpo">
            <div className="ba-opciones">
              {OBJETIVOS.map((o) => (
                <button key={o} className={p.objetivo === o ? 'on' : ''} onClick={() => set({ objetivo: o })}>
                  <span>{o}</span><i className="ba-palomita">{p.objetivo === o && <Check size={13} strokeWidth={3} />}</i>
                </button>
              ))}
            </div>
            <h3 className="ba-sub">¿Algo que evites?</h3>
            <div className="ba-chips">{EVITA.map((v) => <button key={v} className={p.evita.includes(v) ? 'on' : ''} onClick={() => toggle(v)}>{v}</button>)}</div>
          </div>
          <div className="ba-paso-pie"><button className="ba-btn ancho" onClick={() => setPaso(5)}>Continuar</button></div>
        </>
      )}
      {paso === 5 && (
        <>
          {cab('¿Cómo lo quieres?', 'Puedes cambiarlo en cada pedido.')}
          <div className="ba-paso-cuerpo">
            <div className="ba-modos">
              <button className={p.modo === 'recoger' ? 'on' : ''} onClick={() => set({ modo: 'recoger' })}>
                <span className="ic"><Store size={20} /></span><div><b>Recoger</b><span>Sin fila, en 2 minutos</span></div><i className="ba-palomita">{p.modo === 'recoger' && <Check size={13} strokeWidth={3} />}</i>
              </button>
              <button className={p.modo === 'domicilio' ? 'on' : ''} onClick={() => set({ modo: 'domicilio' })}>
                <span className="ic"><Bike size={20} /></span><div><b>A domicilio</b><span>A tu oficina · {NEGOCIO.entrega}</span></div><i className="ba-palomita">{p.modo === 'domicilio' && <Check size={13} strokeWidth={3} />}</i>
              </button>
            </div>
            {p.modo === 'domicilio' && (
              <div className="ba-direccion">
                <Mapa progreso={0} chico />
                <div className="dato"><MapPin size={17} /><div><b>{DIRECCION_DEMO.linea}</b><span>{DIRECCION_DEMO.detalle}</span></div></div>
              </div>
            )}
          </div>
          <div className="ba-paso-pie"><button className="ba-btn ancho" onClick={() => setPaso(6)}>Continuar</button></div>
        </>
      )}
      {paso === 6 && (
        <>
          {cab('Te avisamos cuando esté.', 'Con tu número de casilla o tu repartidor en camino. Nada más.')}
          <div className="ba-paso-cuerpo">
            <div className="ba-avisos-demo">
              <div className="n"><span className="ic"><Isotipo size={24} /></span><div><small>el buen bocado · ahora</small><b>Tu bowl ya está en la casilla 04</b></div></div>
              <div className="n atras"><span className="ic bici"><Bike size={15} /></span><div><small>el buen bocado · 13:02</small><b>Tu pedido va en camino</b></div></div>
            </div>
          </div>
          <div className="ba-paso-pie">
            <button className="ba-btn ancho" onClick={() => { set({ avisos: true }); setPaso(7); }}><Bell size={17} /> Permitir avisos</button>
            <button className="ba-link" onClick={() => setPaso(7)}>Ahora no</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── MAPA (domicilio) ────────────────────────────────────────────────────────
const RUTA = [[86, 148], [86, 100], [160, 100], [160, 52], [236, 52]];
function puntoEn(t) {
  const seg = RUTA.slice(1).map((q, i) => Math.hypot(q[0] - RUTA[i][0], q[1] - RUTA[i][1]));
  let d = Math.max(0, Math.min(1, t)) * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i += 1) {
    if (d <= seg[i]) { const a = RUTA[i]; const b = RUTA[i + 1]; const k = d / seg[i]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
    d -= seg[i];
  }
  return RUTA[RUTA.length - 1];
}
export function Mapa({ progreso = 0, chico = false, enCamino = false }) {
  const [x, y] = puntoEn(progreso);
  const fin = RUTA[RUTA.length - 1];
  return (
    <svg className={`ba-mapa ${chico ? 'chico' : ''}`} viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="190" fill="#E3E6D2" />
      <g stroke="#fff" strokeWidth="9" strokeLinecap="round"><path d="M0 100H320M0 52H320M0 148H320M86 0V190M160 0V190M236 0V190" /></g>
      <g stroke="#fff" strokeWidth="4" opacity=".8"><path d="M0 18H320M120 0V190M200 0V190M290 0V190M0 125H320" /></g>
      <rect x="168" y="62" width="58" height="28" rx="5" fill="#D9E3C4" /><rect x="96" y="112" width="30" height="28" rx="5" fill="#D9E3C4" />
      <polyline points={RUTA.map((q) => q.join(',')).join(' ')} fill="none" stroke="#5E6B3F" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={enCamino ? undefined : '2 7'} opacity={enCamino ? 1 : 0.6} />
      <g transform={`translate(${RUTA[0][0]} ${RUTA[0][1]})`}><circle r="13" fill="#fff" /><circle r="9" fill="#E2553B" /><circle r="4.5" fill="#5E6B3F" /></g>
      <g transform={`translate(${fin[0]} ${fin[1]})`}><circle r="13" fill="#5E6B3F" /><circle r="4" fill="#fff" /></g>
      {enCamino && <g transform={`translate(${x} ${y})`}><circle r="16" fill="#E2553B" opacity=".18" /><circle r="9" fill="#E2553B" stroke="#fff" strokeWidth="3" /></g>}
    </svg>
  );
}

// El "+" de tarjetas y listas: agrega como viene y se vuelve palomita un momento.
// Es un span (va dentro de botones más grandes que abren la ficha).
function Mas({ onClick, clase = '' }) {
  const [ok, setOk] = useState(false);
  const tocar = (ev) => {
    ev.stopPropagation(); ev.preventDefault();
    onClick(); setOk(true); setTimeout(() => setOk(false), 900);
  };
  return (
    <span role="button" tabIndex={0} aria-label="Agregar al pedido" className={`ba-mas ${ok ? 'ok' : ''} ${clase}`}
      onClick={tocar} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') tocar(ev); }}>
      {ok ? <Check size={15} strokeWidth={3} /> : <Plus size={16} strokeWidth={2.2} />}
    </span>
  );
}
const datos = (p) => `${p.kcal} kcal${p.prot ? ` · ${p.prot} g proteína` : ''}`;

// ── INICIO ──────────────────────────────────────────────────────────────────
function Modo({ modo, cambiar }) {
  return (
    <div className="ba-seg" role="tablist">
      <span className="activo" style={{ transform: `translateX(${modo === 'domicilio' ? 100 : 0}%)` }} />
      <button className={modo === 'recoger' ? 'on' : ''} onClick={() => cambiar('recoger')}><Store size={15} /> Recoger</button>
      <button className={modo === 'domicilio' ? 'on' : ''} onClick={() => cambiar('domicilio')}><Bike size={15} /> A domicilio</button>
    </div>
  );
}

// v7 (19-nov): Inicio como el video de referencia — el sello arriba, el saludo y
// una lista de píldoras con contorno (una sola cosa por renglón) y UNA llena.
// Sin foto gigante ni carrusel: lo que antes cargaba la pantalla vive en el Menú.
function Inicio({ perfil, puntos, vivos, abrir, abrirPedido, irA, verCat }) {
  const del = platillo(delDia(diasHabiles(1)[0]));
  const proximo = vivos[0];
  const nombre = perfil.nombre.split(' ')[0] || 'tú';
  return (
    <div className={`ba-pantalla ba-inicio ${proximo ? 'con-pedido' : ''}`}>
      <header className="arriba">
        <Sello size={proximo ? 70 : 92} className="ba-sello" />
        <p>Hola, {nombre}. <button className="ba-puntos-chip" onClick={() => irA('yo')}>{puntos} bocados</button></p>
      </header>

      {proximo && <div className="ba-bloque"><h3 className="ba-sub">Tu pedido</h3><TarjetaPedido p={proximo} onClick={() => abrirPedido(proximo.id)} /></div>}

      {proximo && <h3 className="ba-sub">Explora</h3>}
      <div className="ba-explora">
        <button className="con-foto" onClick={() => abrir(del.id)}>
          <span><b>El del día</b><small>{del.nombre} · {dinero(del.precio)}</small></span>
          <Img id={del.id} />
        </button>
        <button onClick={() => verCat('parati')}><span><b>Para ti</b><small>{perfil.objetivo || 'Lo que más te va'}, sin lo que evitas.</small></span></button>
        {EXPLORA.map(([id, t, d], k) => (
          <button key={id} onClick={() => verCat(id)}>
            <span><b>{t}</b><small>{d}</small></span>
            {k === EXPLORA.length - 1 && <Isotipo size={40} tinta="linea" className="asoma" />}
          </button>
        ))}
        <button className="lleno" onClick={() => irA('semana')}><span><b>Arma tu semana</b><small>Cinco comidas en un minuto, con precio de plan.</small></span></button>
      </div>
      <Bolsita size={150} tinta="linea" className="ba-marca-agua" />
    </div>
  );
}
const EXPLORA = [
  ['bowls', 'Bowls', 'Completos y con proteína de verdad.'],
  ['wraps', 'Wraps', 'Para comer caminando entre juntas.'],
  ['bebidas', 'Bebidas', 'Aguas frescas del día, sin azúcar añadida.'],
];

function TarjetaPedido({ p, onClick }) {
  const pasos = PASOS[p.modo || 'recoger'];
  const paso = ESTADOS[p.estado]?.paso ?? 0;
  return (
    <button className={`ba-pedido est-${p.estado}`} onClick={onClick}>
      <div className="arriba">
        <span>{p.modo === 'domicilio' ? <Bike size={14} /> : <Store size={14} />} {p.dia === hoyISO() ? 'Hoy' : `${diaLargo(p.dia)} ${numDia(p.dia)}`} · {hhmm(p.hora)}</span>
        <span className="estado">{ESTADOS[p.estado].txt}</span>
      </div>
      <div className="medio">
        {p.estado === 'listo'
          ? <div className="grande"><small>Tu casilla</small><b>{p.casilla}</b></div>
          : p.estado === 'camino'
            ? <div className="grande"><small>Llega en</small><b>12<i> min</i></b></div>
            : <div className="nombre">{p.lineas.map((l) => platillo(l.id).nombre).join(' + ')}</div>}
        <Img id={p.lineas[0].id} />
      </div>
      <div className="ba-pasos">{pasos.map((t, i) => <div key={t} className={i <= paso ? 'on' : ''}><i /><span>{t}</span></div>)}</div>
    </button>
  );
}

// ── MENÚ ────────────────────────────────────────────────────────────────────
// v7: título grande, categorías como pestañas de texto y una lista limpia con
// el platillo recortado. Sin selector de días (el día se elige al pagar).
function Menu({ abrir, agregar, perfil, catInicial = 'todo' }) {
  const [cat, setCat] = useState(catInicial);
  const especial = delDia(hoyISO());
  const paraTi = PLATILLOS.filter((p) => p.cat !== 'bebidas' && !p.tiene.some((t) => perfil.evita.includes(t)))
    .sort((a, b) => (perfil.objetivo === 'Más proteína' ? b.prot - a.prot : a.kcal - b.kcal)).slice(0, 3);
  const PESTANAS = [['todo', 'Todo'], ['parati', 'Para ti'], ...CATEGORIAS];
  const grupos = cat === 'parati' ? [['parati', 'Para ti', paraTi]]
    : CATEGORIAS.filter(([id]) => cat === 'todo' || cat === id)
      .map(([id, t]) => [id, t, PLATILLOS.filter((p) => p.cat === id).sort((a, b) => (b.id === especial) - (a.id === especial))]);
  return (
    <div className="ba-pantalla">
      <header className="ba-cab"><div><h1>Menú</h1></div></header>
      <div className="ba-pestanas" role="tablist">
        {PESTANAS.map(([id, t]) => <button key={id} role="tab" aria-selected={cat === id} className={cat === id ? 'on' : ''} onClick={() => setCat(id)}>{t}</button>)}
      </div>
      {grupos.map(([id, titulo, items]) => (
        <section key={id} className="ba-seccion">
          {cat === 'todo' && <h3 className="ba-sec">{titulo}</h3>}
          {cat === 'parati' && <p className="ba-lead">{perfil.objetivo || 'Lo que más te va'}{perfil.evita.length ? `, sin ${perfil.evita.join(', ').toLowerCase()}` : ''}.</p>}
          <div className="ba-lista">
            {items.map((p) => {
              const ojo = p.tiene.some((t) => perfil.evita.includes(t));
              return (
                <button key={p.id} className="ba-item" onClick={() => abrir(p.id)}>
                  <Img id={p.id} />
                  <div className="info">
                    <b>{p.nombre}</b>
                    <span>{p.id === especial ? 'El del día · ' : ''}{datos(p)}</span>
                    {ojo && <span className="ojo">Lleva algo que evitas</span>}
                  </div>
                  <div className="lado"><b>{dinero(p.precio)}</b><Mas onClick={() => agregar(p.id)} /></div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── HOJAS ───────────────────────────────────────────────────────────────────
function Hoja({ children, cerrar, clase = '' }) {
  // Se cierra arrastrándola hacia abajo desde la parte de arriba (como en iOS).
  const [dy, setDy] = useState(0);
  const ini = useRef(null);
  const bajar = (ev) => { ini.current = ev.clientY; ev.currentTarget.setPointerCapture?.(ev.pointerId); };
  const mover = (ev) => { if (ini.current != null) setDy(Math.max(0, ev.clientY - ini.current)); };
  const soltar = () => { if (ini.current == null) return; ini.current = null; if (dy > 110) cerrar(); else setDy(0); };
  return (
    <div className="ba-hoja-fondo" onClick={cerrar} style={{ opacity: dy ? Math.max(0.35, 1 - dy / 400) : undefined }}>
      <div className={`ba-hoja ${clase} ${dy ? 'arrastra' : ''}`} onClick={(ev) => ev.stopPropagation()} role="dialog" style={dy ? { transform: `translateY(${dy}px)` } : undefined}>
        <div className="ba-asidero" onPointerDown={bajar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} aria-hidden="true"><span className="asa" /></div>
        <button className="ba-cerrar" onClick={cerrar} aria-label="Cerrar"><X size={18} /></button>
        {children}
      </div>
    </div>
  );
}

// v7: el platillo es una pantalla que ENTRA DE LADO (navegación nativa), igual al
// video de referencia: ← y ♡ arriba, nombre y descripción, una tabla de extras
// con "Agregar" por renglón, el platillo recortado al centro, nota para cocina y
// el botón con el precio. Lo de quitar ingredientes va en píldoras chicas.
const KCAL_EXTRA = { aguacate: 80, proteina: 150, agua: 40 };
function Platillo({ id, perfil, cerrar, agregar }) {
  const p = platillo(id);
  const [quitar, setQuitar] = useState([]);
  const [extras, setExtras] = useState([]);
  const [cant, setCant] = useState(1);
  const [fav, setFav] = useState(false);
  const [nota, setNota] = useState('');
  const [sale, setSale] = useState(false);
  const tog = (arr, set, v) => { toque(); set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]); };
  const total = totalLinea({ id, extras, cant });
  const extrasOk = p.cat === 'bebidas' ? [] : EXTRAS.filter((x) => !(x.id === 'proteina' && !p.prot));
  const ojo = p.tiene.filter((t) => perfil.evita.includes(t));
  const atras = () => { setSale(true); setTimeout(cerrar, 260); };
  return (
    <div className={`ba-platillo ${sale ? 'sale' : ''}`} role="dialog" aria-label={p.nombre}>
      <header className="ba-platillo-nav">
        <button onClick={atras} aria-label="Regresar"><ArrowLeft size={22} /></button>
        <button className={fav ? 'fav' : ''} onClick={() => { toque(); setFav(!fav); }} aria-label="Favorito"><Heart size={21} fill={fav ? 'currentColor' : 'none'} /></button>
      </header>
      <div className="ba-platillo-cuerpo">
        <h2>{p.nombre}</h2>
        <p className="desc">{p.desc}</p>
        <p className="datos">{datos(p)} · {p.etiquetas.join(' · ')}</p>
        {ojo.length > 0 && <p className="ba-ojo">Lleva {ojo.join(', ').toLowerCase()}, que marcaste para evitar.</p>}

        {extrasOk.length > 0 && (
          <div className="ba-tabla" role="group" aria-label="Agrégale">
            {extrasOk.map((x) => {
              const on = extras.includes(x.id);
              return (
                <div key={x.id} className="fila">
                  <span className="n">{x.nombre}</span>
                  <span className="k">+{KCAL_EXTRA[x.id] || 0} kcal</span>
                  <b>+{dinero(x.precio)}</b>
                  <button className={on ? 'on' : ''} onClick={() => tog(extras, setExtras, x.id)}>{on ? <><Check size={13} strokeWidth={3} /> Listo</> : 'Agregar'}</button>
                </div>
              );
            })}
          </div>
        )}

        <div className="ba-platillo-foto"><Img id={id} /></div>

        {p.quitar.length > 0 && (
          <div className="ba-quitar">
            <small>¿Le quitamos algo?</small>
            <div>{p.quitar.map((q) => <button key={q} className={quitar.includes(q) ? 'on' : ''} onClick={() => tog(quitar, setQuitar, q)}>Sin {q.toLowerCase()}</button>)}</div>
          </div>
        )}
        <input className="ba-nota-cocina" value={nota} onChange={(ev) => setNota(ev.target.value)} placeholder="Algo más para la cocina (opcional)" />
      </div>
      <footer className="ba-platillo-pie">
        <div className="ba-cant"><button onClick={() => setCant(Math.max(1, cant - 1))} aria-label="Menos"><Minus size={15} /></button><b>{cant}</b><button onClick={() => setCant(Math.min(9, cant + 1))} aria-label="Más"><Plus size={15} /></button></div>
        <button className="ba-btn" onClick={() => agregar({ id, quitar, extras, cant, nota: nota.trim() || undefined })}>Agregar · {dinero(total)}</button>
      </footer>
    </div>
  );
}

function cuentaDe({ sub, modo, miembro, cupon }) {
  const descuento = miembro ? MEMBRESIA.descuento : 0;
  const tras = Math.round(sub * (1 - descuento));
  const rebaja = cupon ? Math.min(tras, REBAJA[cupon.id] || 0) : 0;
  const envio = modo === 'domicilio' && !miembro && cupon?.id !== 'envio' ? NEGOCIO.envio : 0;
  return { descuento, rebaja, envio, ahorroMiembro: sub - tras, total: tras - rebaja + envio };
}

function HojaCarrito({ e, perfil, modoInicial, cambiar, cerrar, confirmar }) {
  const dias = diasHabiles(5);
  const [modo, setModo] = useState(modoInicial || 'recoger');
  const [dia, setDia] = useState(dias[0]);
  const slots = useMemo(() => horarios(dia, e.pedidos), [dia, e.pedidos]);
  const [hora, setHora] = useState(null);
  const [pagando, setPagando] = useState(false);
  const cupones = (e.cupones || []).filter((c) => c.id !== 'envio' || modo === 'domicilio');
  const [cuponK, setCuponK] = useState(() => cupones[0]?.k ?? null);
  const cupon = cupones.find((c) => c.k === cuponK) || null;
  useEffect(() => {
    const buen = slots.find((s) => !s.lleno && !s.pasado && s.m >= 13 * 60) || slots.find((s) => !s.lleno && !s.pasado);
    setHora(buen ? buen.m : null);
  }, [slots]);
  const sub = e.carrito.reduce((s, l) => s + totalLinea(l), 0);
  const cuenta = cuentaDe({ sub, modo, miembro: perfil.miembro, cupon });
  const pagar = () => { setPagando(true); setTimeout(() => confirmar({ dia, hora, modo, cupon, cuenta }), 1000); };
  // La fila de horarios se recorre sola hasta el elegido (sin scrollIntoView: movería la hoja).
  const filaHoras = useRef(null);
  useEffect(() => {
    const f = filaHoras.current; const on = f?.querySelector('.on');
    if (on) f.scrollTo({ left: Math.max(0, on.offsetLeft - 20 - (f.clientWidth - on.offsetWidth) / 2 + 20), behavior: 'smooth' });
  }, [hora, modo, dia]);
  return (
    <Hoja cerrar={cerrar} clase="carrito">
      <div className="ba-hoja-scroll">
        <div className="ba-hoja-pad arriba">
          <h2>Tu pedido</h2>
          <div className="ba-lineas">
            {e.carrito.map((l, i) => {
              const p = platillo(l.id);
              const nota = [...(l.quitar || []).map((q) => `sin ${q.toLowerCase()}`), ...(l.extras || []).map((x) => EXTRAS.find((y) => y.id === x)?.nombre.toLowerCase())].join(' · ');
              return (
                <div key={i} className="linea">
                  <Img id={l.id} />
                  <div className="info"><b>{l.cant > 1 ? `${l.cant}× ` : ''}{p.nombre}</b><span>{nota || 'Como viene'}</span></div>
                  <b className="precio">{dinero(totalLinea(l))}</b>
                  <button className="quitar" aria-label="Quitar" onClick={() => cambiar((s) => { s.carrito.splice(i, 1); })}><X size={14} /></button>
                </div>
              );
            })}
          </div>

          <h3 className="ba-sub">¿Cómo lo quieres?</h3>
          <Modo modo={modo} cambiar={setModo} />
          {modo === 'domicilio' && (
            <div className="ba-entrega"><MapPin size={17} /><div><b>{perfil.direccion?.linea}</b><span>{perfil.direccion?.detalle}</span></div></div>
          )}

          <h3 className="ba-sub">¿Qué día?</h3>
          <div className="ba-dias">{dias.map((d) => <button key={d} className={d === dia ? 'on' : ''} onClick={() => setDia(d)}><small>{d === hoyISO() ? 'Hoy' : diaCorto(d)}</small><b>{numDia(d)}</b></button>)}</div>

          <h3 className="ba-sub">{modo === 'domicilio' ? '¿A qué hora te lo llevamos?' : '¿A qué hora pasas?'}</h3>
          <div className={`ba-horas fila ${modo === 'domicilio' ? 'anchas' : ''}`} ref={filaHoras}>
            {slots.map((s) => (
              <button key={s.m} disabled={s.lleno || s.pasado} className={`${hora === s.m ? 'on' : ''} ${s.libres <= 3 && !s.lleno ? 'casi' : ''}`} onClick={() => setHora(s.m)}>
                <span>{modo === 'domicilio' ? `${hhmm(s.m)}–${hhmm(s.m + 15)}` : hhmm(s.m)}</span>
                <small>{s.pasado ? 'ya no' : s.lleno ? 'lleno' : s.libres <= 3 ? `quedan ${s.libres}` : ''}</small>
              </button>
            ))}
          </div>

          {cupones.length > 0 && (
            <>
              <h3 className="ba-sub">Tus recompensas</h3>
              <div className="ba-chips">
                {cupones.map((c) => <button key={c.k} className={cuponK === c.k ? 'on' : ''} onClick={() => setCuponK(cuponK === c.k ? null : c.k)}><Gift size={14} /> {c.nombre}</button>)}
              </div>
            </>
          )}

          <div className="ba-cuentas">
            <div><span>Subtotal</span><span>{dinero(sub)}</span></div>
            {cuenta.ahorroMiembro > 0 && <div className="verde"><span>{MEMBRESIA.nombre} −10%</span><span>−{dinero(cuenta.ahorroMiembro)}</span></div>}
            {cuenta.rebaja > 0 && <div className="verde"><span>{cupon.nombre}</span><span>−{dinero(cuenta.rebaja)}</span></div>}
            {modo === 'domicilio' && <div><span>Envío</span><span>{cuenta.envio ? dinero(cuenta.envio) : 'Gratis'}</span></div>}
          </div>
          <div className="ba-pago"><span className="ic"><CreditCard size={17} /></span><div><b>Visa •••• 4242</b><span>Tarjeta de prueba</span></div><i>Cambiar</i></div>
          <p className="ba-eco"><Leaf size={14} /> {EMPAQUE}. Sin plástico.</p>
        </div>
      </div>
      <div className="ba-hoja-pie">
        <div className="ba-total"><small>Total</small><b>{dinero(cuenta.total)}</b></div>
        <button className="ba-btn" disabled={!hora || pagando || !e.carrito.length} onClick={pagar}>
          {pagando ? 'Pagando…' : hora ? `Pagar · ${dia === hoyISO() ? 'hoy' : diaCorto(dia)} ${hhmm(hora)}` : 'Elige una hora'}
        </button>
      </div>
    </Hoja>
  );
}

function HojaPedido({ p, perfil, cerrar, cambiar, avisar }) {
  const [, setTic] = useState(0);
  useEffect(() => {
    if (p?.estado !== 'camino') return undefined;
    const t = setInterval(() => setTic((x) => x + 1), 200);
    return () => clearInterval(t);
  }, [p?.estado]);
  if (!p) return null;
  const dom = p.modo === 'domicilio';
  const hoy = p.dia === hoyISO();
  const progreso = p.estado === 'camino' ? Math.min(1, (Date.now() - (p.salio || Date.now())) / 20000) : p.estado === 'entregado' ? 1 : 0;
  const minutos = Math.max(1, Math.round(12 * (1 - progreso)));
  const recoger = () => { cambiar((s) => { s.pedidos.find((x) => x.id === p.id).estado = 'recogido'; }); avisar('¡Buen provecho!'); cerrar(); };
  const cancelar = () => {
    cambiar((s) => { const x = s.pedidos.find((y) => y.id === p.id); x.estado = 'cancelado'; s.puntos = Math.max(0, s.puntos - Math.round(totalPedido(x) / 10)); });
    avisar('Pedido cancelado. Te regresamos el pago.'); cerrar();
  };
  const paso = ESTADOS[p.estado]?.paso ?? 0;
  return (
    <Hoja cerrar={cerrar} clase="pedido">
      <div className="ba-hoja-scroll">
        {dom && p.estado !== 'cancelado' ? (
          <div className="ba-pedido-mapa">
            <Mapa progreso={progreso} enCamino={p.estado === 'camino' || p.estado === 'entregado'} />
            <div className="sobre">
              <small>{p.folio} · a domicilio</small>
              {p.estado === 'camino' && <><b>Llega en {minutos} min</b><span>Luis va en camino a {perfil.direccion?.linea}</span></>}
              {p.estado === 'entregado' && <><b>Entregado</b><span>¡Buen provecho!</span></>}
              {(p.estado === 'programado' || p.estado === 'cocina') && <><b>{hoy ? 'Hoy' : `${diaLargo(p.dia)} ${numDia(p.dia)}`} · {hhmm(p.hora)}–{hhmm(p.hora + 15)}</b><span>{p.estado === 'cocina' ? 'Lo están preparando' : 'Te avisamos cuando salga'}</span></>}
            </div>
          </div>
        ) : (
          <div className={`ba-pedido-cab est-${p.estado}`}>
            <small>{p.folio}</small>
            {p.estado === 'listo'
              ? <><span>Ya está en tu casilla</span><div className="num">{p.casilla}</div><span>Busca tu nombre, tómalo y listo.</span></>
              : p.estado === 'recogido' ? <><span>Recogido</span><div className="hora">{hhmm(p.hora)}</div></>
                : p.estado === 'cancelado' ? <><span>Cancelado</span><div className="hora">—</div></>
                  : <><span>{hoy ? 'Te esperamos hoy a las' : `Te esperamos el ${diaLargo(p.dia)} a las`}</span><div className="hora">{hhmm(p.hora)}</div><span>Casilla {p.casilla} · te avisamos cuando esté</span></>}
          </div>
        )}
        <div className="ba-hoja-pad">
          {p.estado !== 'cancelado' && <div className="ba-pasos">{PASOS[p.modo || 'recoger'].map((t, i) => <div key={t} className={i <= paso ? 'on' : ''}><i /><span>{t}</span></div>)}</div>}
          <div className="ba-lineas">
            {p.lineas.map((l, i) => <div key={i} className="linea"><Img id={l.id} /><div className="info"><b>{l.cant > 1 ? `${l.cant}× ` : ''}{platillo(l.id).nombre}</b><span>{(l.quitar || []).map((q) => `sin ${q.toLowerCase()}`).join(' · ') || 'Como viene'}</span></div><b className="precio">{dinero(totalLinea(l))}</b></div>)}
          </div>
          <div className="ba-cuentas">
            {p.envio > 0 && <div><span>Envío</span><span>{dinero(p.envio)}</span></div>}
            <div className="total"><span>{p.plan ? 'Total (precio de plan)' : 'Total pagado'}</span><b>{dinero(totalPedido(p))}</b></div>
          </div>
          <p className="ba-eco"><Leaf size={14} /> {EMPAQUE}.</p>
          {hoy && ['programado', 'cocina', 'camino'].includes(p.estado) && <p className="ba-nota">Demo: el tiempo va acelerado para que veas cómo avanza.</p>}
        </div>
      </div>
      <div className="ba-hoja-pie">
        {p.estado === 'listo' && <button className="ba-btn ancho" onClick={recoger}>Ya lo recogí</button>}
        {p.estado === 'programado' && <button className="ba-btn claro ancho" onClick={cancelar}>Cancelar pedido</button>}
        {!['listo', 'programado'].includes(p.estado) && <button className="ba-btn claro ancho" onClick={cerrar}>Cerrar</button>}
      </div>
    </Hoja>
  );
}

// ── SEMANA ──────────────────────────────────────────────────────────────────
function Semana({ e, perfil, cambiar, avisar, abrirPedido }) {
  const dias = diasHabiles(5);
  const plan = PLANES.find((x) => x.id === 'semana');
  const [eleccion, setEleccion] = useState(() => Object.fromEntries(dias.map((d) => [d, delDia(d)])));
  const [hora, setHora] = useState(13 * 60);
  const [cambiando, setCambiando] = useState(null); // día cuyo platillo se está eligiendo
  const base = dias.reduce((s, d) => s + totalLinea({ id: eleccion[d], extras: ['agua'], cant: 1 }), 0);
  const normal = base + (perfil.modo === 'domicilio' ? NEGOCIO.envio * 5 : 0);
  const delPlan = e.pedidos.filter((p) => p.plan && p.estado !== 'cancelado').sort((a, b) => a.dia.localeCompare(b.dia));
  const activar = () => {
    const descuento = 1 - plan.precio / base;
    const nuevos = dias.map((d, i) => {
      const p = nuevoPedido({ dia: d, hora, lineas: [{ id: eleccion[d], quitar: [], extras: ['agua'], cant: 1 }], plan: 'semana', descuento, n: e.pedidos.length + i, modo: perfil.modo });
      p.confirmado = Date.now();
      return p;
    });
    cambiar((s) => { s.pedidos.push(...nuevos); s.plan = { id: 'semana', desde: dias[0], hora, modo: perfil.modo }; s.puntos += Math.round(plan.precio / 10); });
    avisar('Plan activado: tu semana ya está resuelta');
  };
  if (e.plan) {
    return (
      <div className="ba-pantalla">
        <header className="ba-cab"><div><small>Plan semana · {e.plan.modo === 'domicilio' ? 'a tu oficina' : 'para recoger'}</small><h1>Tu semana</h1></div></header>
        <div className="ba-semana">
          {delPlan.map((p) => (
            <button key={p.id} className={`dia est-${p.estado}`} onClick={() => abrirPedido(p.id)}>
              <div className="d"><small>{diaCorto(p.dia)}</small><b>{numDia(p.dia)}</b></div>
              <Img id={p.lineas[0].id} />
              <div className="info"><b>{platillo(p.lineas[0].id).nombre}</b><span>{hhmm(p.hora)} · {ESTADOS[p.estado]?.txt}</span></div>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
        <p className="ba-nota">Cambia el platillo de cada día hasta las 10 am. Si sales de viaje, pausas el plan.</p>
      </div>
    );
  }
  return (
    <div className="ba-pantalla">
      <header className="ba-cab"><div><small>Plan semana</small><h1>Arma tu semana</h1></div></header>
      <div className="ba-semana">
        {dias.map((d) => (
          <button key={d} className="dia" onClick={() => setCambiando(d)} aria-label={`Cambiar el platillo del ${diaLargo(d)}`}>
            <div className="d"><small>{diaCorto(d)}</small><b>{numDia(d)}</b></div>
            <Img id={eleccion[d]} />
            <div className="info"><b>{platillo(eleccion[d]).nombre}</b><span>Cambiar</span></div>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
      {/* 25-nov: hoja PROPIA de la app (antes un <select> que abría el selector del sistema) */}
      {cambiando && (
        <Hoja cerrar={() => setCambiando(null)} clase="ba-elegir">
          <small className="ba-elegir-dia">{diaLargo(cambiando)}</small>
          <h2>¿Qué se te antoja?</h2>
          <div className="ba-elegir-lista">
            {PLATILLOS.filter((p) => p.cat !== 'bebidas').map((p) => {
              const on = eleccion[cambiando] === p.id;
              return (
                <button key={p.id} className={on ? 'on' : ''} onClick={() => { setEleccion({ ...eleccion, [cambiando]: p.id }); toque(); setTimeout(() => setCambiando(null), 180); }}>
                  <Img id={p.id} />
                  <span className="t"><b>{p.nombre}</b><small>{p.kcal} kcal · {p.prot} g proteína</small></span>
                  <i className="ba-palomita">{on && <Check size={13} strokeWidth={3} />}</i>
                </button>
              );
            })}
          </div>
        </Hoja>
      )}
      <h3 className="ba-sub">{perfil.modo === 'domicilio' ? 'Entregar a las' : 'Paso a las'}</h3>
      <div className="ba-horas cinco">{[12.5, 13, 13.5, 14, 14.5].map((h) => <button key={h} className={hora === h * 60 ? 'on' : ''} onClick={() => setHora(h * 60)}><span>{hhmm(h * 60)}</span></button>)}</div>
      <div className="ba-resumen">
        <div><span>Por separado</span><s>{dinero(normal)}</s></div>
        <div><span>Con el plan</span><b>{dinero(plan.precio)}</b></div>
        <small>Agua de pepino diaria{perfil.modo === 'domicilio' ? ' y envío' : ''} incluidos</small>
      </div>
      <button className="ba-btn ancho" onClick={activar}>Activar plan semana</button>
    </div>
  );
}

// ── PEDIDOS ─────────────────────────────────────────────────────────────────
function Pedidos({ e, vivos, abrirPedido, irA, repetir }) {
  const pasados = e.pedidos.filter((p) => !vivos.includes(p)).sort((a, b) => ordenar(b, a));
  const Fila = ({ p, viejo }) => (
    <button className={`ba-fila est-${p.estado}`} onClick={() => abrirPedido(p.id)}>
      <Img id={p.lineas[0].id} />
      <div className="info">
        <b>{p.lineas.map((l) => platillo(l.id).nombre).join(' + ')}</b>
        <span>{p.modo === 'domicilio' ? 'A domicilio' : 'Para recoger'} · {p.dia === hoyISO() ? 'hoy' : `${diaCorto(p.dia)} ${numDia(p.dia)}`} · {hhmm(p.hora)}</span>
        <span className="abajo"><i className="estado">{ESTADOS[p.estado]?.txt}</i><em>{dinero(totalPedido(p))}</em></span>
      </div>
      {viejo && p.estado !== 'cancelado'
        ? <span role="button" tabIndex={0} className="ba-repetir" onClick={(ev) => { ev.stopPropagation(); repetir(p); }}>Repetir</span>
        : <ChevronRight size={17} className="ir" />}
    </button>
  );
  return (
    <div className="ba-pantalla">
      <header className="ba-cab"><div><small>{vivos.length ? `${vivos.length} en curso` : 'Nada en curso'}</small><h1>Pedidos</h1></div></header>
      <h3 className="ba-sub">Próximos</h3>
      {vivos.length ? vivos.map((p) => <Fila key={p.id} p={p} />) : (
        <div className="ba-vacio-caja">
          <Bolsita size={64} tinta="linea" />
          <div><b>Todavía no pides hoy.</b><span>Elige tu comida y la hora: nosotros la tenemos lista.</span></div>
          <button className="ba-btn" onClick={() => irA('menu')}>Ver el menú</button>
        </div>
      )}
      {pasados.length > 0 && <h3 className="ba-sub">Anteriores</h3>}
      {pasados.map((p) => <Fila key={p.id} p={p} viejo />)}
    </div>
  );
}

// ── YO ──────────────────────────────────────────────────────────────────────
function Yo({ e, perfil, cambiar, cambiarPerfil, avisar, abrirMembresia, claves }) {
  const siguiente = RECOMPENSAS.find((r) => r.costo > e.puntos) || RECOMPENSAS[RECOMPENSAS.length - 1];
  const canjear = (r) => {
    if (e.puntos < r.costo) return;
    cambiar((s) => { s.puntos -= r.costo; s.cupones.push({ k: Date.now(), id: r.id, nombre: r.nombre }); });
    avisar(`${r.nombre}: lista para tu próximo pedido`);
  };
  const reiniciar = () => {
    guardar(sembrar(), claves.e); guardarPerfil({ ...PERFIL_VACIO }, claves.perfil);
    window.dispatchEvent(new StorageEvent('storage', { key: claves.e }));
    window.dispatchEvent(new StorageEvent('storage', { key: claves.perfil }));
  };
  const nombre = perfil.nombre || 'Ana';
  const Fila = ({ icono: Ic, t, v, onClick }) => (
    <button className="fila" onClick={onClick}><Ic size={17} /><span>{t}</span>{v && <b>{v}</b>}<ChevronRight size={15} /></button>
  );
  return (
    <div className="ba-pantalla ba-yo">
      <header className="cab">
        <span className="ba-avatar grande">{nombre[0]}</span>
        <div><h1>{nombre}</h1><small>+52 {perfil.telefono}</small></div>
      </header>

      {perfil.miembro ? (
        <div className="ba-membresia activa">
          <div className="arriba"><Isotipo size={34} /><span>{MEMBRESIA.nombre}</span><small>Activa</small></div>
          <b>Envío gratis y 10% en todo.</b>
          <span>Se renueva cada mes · {dinero(MEMBRESIA.precio)}</span>
        </div>
      ) : (
        <button className="ba-membresia" onClick={abrirMembresia}>
          <div className="arriba"><Isotipo size={34} /><span>{MEMBRESIA.nombre}</span></div>
          <b>Envío gratis y 10% en todo.</b>
          <span>{dinero(MEMBRESIA.precio)} al mes · Conocer más</span>
        </button>
      )}

      <section className="ba-bloque-yo">
        <div className="ba-puntos-yo">
          <div><small>Tus bocados</small><b>{e.puntos}</b></div>
          <span>{e.puntos >= siguiente.costo ? 'Puedes canjear' : `Te faltan ${siguiente.costo - e.puntos} para ${siguiente.nombre.toLowerCase()}`}</span>
        </div>
        <div className="ba-avance" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.round((e.puntos / siguiente.costo) * 100))}%` }} /></div>
        <div className="ba-recompensas">
          {RECOMPENSAS.map((r) => {
            const alcanza = e.puntos >= r.costo;
            return (
              <button key={r.id} className={alcanza ? 'si' : ''} onClick={() => canjear(r)} disabled={!alcanza}>
                <Img id={r.img} />
                <b>{r.nombre}</b>
                <span>{r.costo} bocados</span>
              </button>
            );
          })}
        </div>
        {(e.cupones || []).length > 0 && <p className="ba-nota"><Gift size={13} /> Por usar: {e.cupones.map((c) => c.nombre).join(', ')}</p>}
      </section>

      <h3 className="ba-sub">Pagos y direcciones</h3>
      <div className="ba-ajustes">
        <Fila icono={CreditCard} t="Visa •••• 4242" v="Principal" onClick={() => avisar('Prototipo: aquí agregarías otra tarjeta')} />
        <Fila icono={MapPin} t={perfil.direccion?.nombre || 'Oficina'} v={perfil.direccion?.linea} onClick={() => avisar('Prototipo: aquí agregarías otra dirección')} />
        <Fila icono={Store} t="Sucursal" v="San Manuel" />
      </div>

      <h3 className="ba-sub">Preferencias</h3>
      <div className="ba-ajustes">
        <Fila icono={Leaf} t="Objetivo" v={perfil.objetivo} />
        <Fila icono={X} t="Evito" v={perfil.evita.length ? perfil.evita.join(', ') : 'Nada'} />
        <Fila icono={perfil.modo === 'domicilio' ? Bike : Store} t="Por defecto" v={perfil.modo === 'domicilio' ? 'A domicilio' : 'Recoger'} onClick={() => cambiarPerfil({ modo: perfil.modo === 'domicilio' ? 'recoger' : 'domicilio' })} />
        <button className="fila" onClick={() => cambiarPerfil({ avisos: !perfil.avisos })}><Bell size={17} /><span>Avisos</span><i className={`ba-switch ${perfil.avisos ? 'on' : ''}`} /></button>
      </div>

      <h3 className="ba-sub">Cuenta</h3>
      <div className="ba-ajustes">
        <Fila icono={UserRound} t="Correo" v={perfil.correo} />
        <Fila icono={HelpCircle} t="Ayuda" onClick={() => avisar('Prototipo: aquí iría el chat de ayuda')} />
        <button className="fila peligro" onClick={() => cambiarPerfil({ listo: false })}><LogOut size={17} /><span>Cerrar sesión</span></button>
      </div>
      <button className="ba-reiniciar" onClick={reiniciar}>Reiniciar la demo</button>

    </div>
  );
}

function HojaMembresia({ cerrar, unirme }) {
  return (
    <Hoja cerrar={cerrar} clase="membresia">
      <div className="ba-hoja-scroll">
        <div className="ba-memb-cab">
          <Bolsita size={92} />
          <h2>{MEMBRESIA.nombre}</h2>
          <p>{dinero(MEMBRESIA.precio)} al mes · cancela cuando quieras</p>
        </div>
        <div className="ba-hoja-pad">
          <div className="ba-beneficios">{MEMBRESIA.beneficios.map((b) => <div key={b}><Check size={16} strokeWidth={2.6} /><span>{b}</span></div>)}</div>
          <p className="ba-nota">Si pides a domicilio 3 veces por semana, te ahorras más de $300 al mes.</p>
        </div>
      </div>
      <div className="ba-hoja-pie">
        <button className="ba-btn ancho" onClick={unirme}>Unirme por {dinero(MEMBRESIA.precio)} al mes</button>
      </div>
    </Hoja>
  );
}
