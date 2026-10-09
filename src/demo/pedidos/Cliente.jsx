import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, Bike, Check, ChevronLeft, ChevronRight, CreditCard, Home, Loader2, Lock, MapPin, Minus, Plus,
  Receipt, ShoppingBag, Store, Trash2, Utensils, Wallet, CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  pesos, MODALIDADES, ESTADOS, pasosDe, modalidadDe, gruposDe, errorLegible, useMenu, useOrdenes,
} from './datos';
import { Hoja, useAncho } from './ui';
import { Dibujo, Nombre, Precio, Pildora, Contorno, Titulo, Insignia, Carga, Bienvenida } from './tinta';
import { k, dibujoDe, estilosTinta } from './tintaBase';

// ─────────────────────────────────────────────────────────────────────────────
// APP DEL CLIENTE — menú, carrito, pago de prueba y seguimiento en vivo.
// Si se abre con ?mesa=N (el QR de la mesa) queda fija en "En mesa".
// Estilo "Tinta" (tinta.jsx): carga → bienvenida → inicio con carrusel.
// ─────────────────────────────────────────────────────────────────────────────

const ICONO_MOD = { recoger: Store, mesa: Utensils, domicilio: Bike };
const TARJETAS = [['4242 4242 4242 4242', 'Aprobada'], ['4000 0000 0000 0002', 'Rechazada']];
const FAVORITOS = 'favoritos';
const TRAZO = 1.6; // grosor de los íconos, para que acompañen al dibujo a mano

const claveCarrito = (negocio) => `pedidos_carrito_${negocio}`;
const claveBienvenida = (negocio) => `pedidos_bienvenida_${negocio}`;
const ALTO_PANTALLA = 'calc(100dvh - var(--p-alto-encabezado, 0px))';

function horariosParaLlevar(minPrep) {
  // Cada 15 min, desde el tiempo de preparación hasta 3 horas después.
  const inicio = new Date(Date.now() + minPrep * 60000);
  inicio.setSeconds(0, 0);
  inicio.setMinutes(Math.ceil(inicio.getMinutes() / 15) * 15);
  return Array.from({ length: 12 }, (_, i) => new Date(inicio.getTime() + i * 15 * 60000));
}

// La carga y la bienvenida salen una vez por pestaña.
function faseInicial(negocio) {
  try { return sessionStorage.getItem(claveBienvenida(negocio)) ? 'app' : 'carga'; } catch { return 'carga'; }
}

export default function Cliente({ negocio, mesaQR, usuario }) {
  const { menu } = useMenu(negocio.id);
  const { ordenes } = useOrdenes(negocio.id);
  const ancho = useAncho(1000);
  const [fase, setFase] = useState(() => faseInicial(negocio.id));
  const [pestana, setPestana] = useState('menu');
  const [categoria, setCategoria] = useState(FAVORITOS);
  const [verTodo, setVerTodo] = useState(false);
  const [producto, setProducto] = useState(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [ordenPago, setOrdenPago] = useState(null);
  const [seguimiento, setSeguimiento] = useState(null);
  const [agregado, setAgregado] = useState(null);
  const [modalidad, setModalidad] = useState(mesaQR ? 'mesa' : (negocio.modalidades?.[0] || 'recoger'));
  const [carrito, setCarrito] = useState(() => {
    try { return JSON.parse(localStorage.getItem(claveCarrito(negocio.id))) || []; } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(claveCarrito(negocio.id), JSON.stringify(carrito)); } catch { /* sin almacenamiento */ }
  }, [carrito, negocio.id]);

  // Si el dueño apaga la modalidad elegida, pasar a una que siga disponible.
  useEffect(() => {
    if (!mesaQR && negocio.modalidades?.length && !negocio.modalidades.includes(modalidad)) {
      setModalidad(negocio.modalidades[0]);
    }
  }, [negocio.modalidades, modalidad, mesaQR]);

  const secciones = useRef({});
  const carril = useRef(null);
  const piezas = carrito.reduce((s, l) => s + l.cantidad, 0);
  const subtotal = carrito.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);

  // El carrito sigue al menú en vivo: si el dueño agota un producto o una
  // opción, esa línea sale; si cambia un precio, la línea se recalcula. Así el
  // total que ve el cliente es el mismo que cobra pedidos_crear_orden.
  useEffect(() => {
    if (!menu) return;
    const productos = new Map(menu.productos.map((p) => [p.id, p]));
    const opciones = new Map(menu.opciones.map((o) => [o.id, o]));
    setCarrito((c) => {
      let cambio = false;
      const nuevo = c.flatMap((l) => {
        const p = productos.get(l.productoId);
        const elegidas = l.opciones.map((id) => opciones.get(id));
        if (!p?.disponible || elegidas.some((o) => !o?.disponible)) { cambio = true; return []; }
        const unitario = Number(p.precio) + elegidas.reduce((s, o) => s + Number(o.precio_extra), 0);
        if (unitario === l.precioUnitario) return [l];
        cambio = true;
        return [{ ...l, precioUnitario: unitario }];
      });
      return cambio ? nuevo : c;
    });
  }, [menu]);

  const activas = (ordenes || []).filter((o) => !['entregado', 'cancelado', 'pendiente_pago'].includes(o.estado));
  const destacados = (menu?.productos || []).filter((p) => p.destacado && p.disponible);
  const listaCategorias = useMemo(() => [
    ...(destacados.length ? [{ id: FAVORITOS, nombre: 'Los favoritos' }] : []),
    ...(menu?.categorias || []),
  ], [menu, destacados.length]);
  // Sin favoritos (todo agotado) se ve la primera categoría.
  const categoriaVista = categoria === FAVORITOS && !destacados.length ? menu?.categorias[0]?.id : categoria;
  const enCarril = categoriaVista === FAVORITOS ? destacados : (menu?.productos || []).filter((p) => p.categoria_id === categoriaVista);

  useEffect(() => { carril.current?.scrollTo({ left: 0, behavior: 'smooth' }); }, [categoria]);

  // Flechas del carrusel (compu) solo si las tarjetas no caben.
  const [desborda, setDesborda] = useState(false);
  const idsCarril = enCarril.map((p) => p.id).join();
  useEffect(() => {
    const el = carril.current;
    if (!el) return undefined;
    const medir = () => setDesborda(el.scrollWidth > el.clientWidth + 4);
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [idsCarril, verTodo, fase, pestana]);
  useEffect(() => {
    if (!agregado) return undefined;
    const t = setTimeout(() => setAgregado(null), 1800);
    return () => clearTimeout(t);
  }, [agregado]);

  const elegirCategoria = (id) => {
    setCategoria(id);
    // "Los favoritos" no tiene sección en "ver todo": se regresa al carrusel.
    if (verTodo && id === FAVORITOS) setVerTodo(false);
    else if (verTodo) secciones.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const entrar = () => {
    try { sessionStorage.setItem(claveBienvenida(negocio.id), '1'); } catch { /* sin almacenamiento */ }
    setFase('app');
  };

  const terminarPedido = (id) => {
    setCarrito([]);
    setCarritoAbierto(false);
    setOrdenPago(null);
    setSeguimiento(id);
    setPestana('pedidos');
  };

  const estilos = <style>{estilosTinta}</style>;

  if (fase !== 'app') {
    const alto = ancho ? `calc(${ALTO_PANTALLA} - 24px)` : ALTO_PANTALLA;
    return (
      <div style={ancho ? { maxWidth: 1200, margin: '0 auto', padding: '0 28px', boxSizing: 'border-box' } : undefined}>
        {estilos}
        <div style={{ borderRadius: ancho ? 32 : 0, overflow: 'hidden' }}>
          {fase === 'carga'
            ? <Carga alto={alto} alTerminar={() => setFase('bienvenida')} />
            : <Bienvenida negocio={negocio} categorias={menu?.categorias || []} mesaQR={mesaQR} alEntrar={entrar} alto={alto} ancho={ancho} />}
        </div>
      </div>
    );
  }

  const nombreCorto = (usuario || 'Invitada').split(' ').slice(0, 2).join(' ');
  const dondeTexto = mesaQR ? `Estás en la mesa ${mesaQR}: te lo llevamos`
    : modalidad === 'domicilio' ? `Envío ${pesos(negocio.costo_envio)}${negocio.envio_gratis_desde ? ` · gratis desde ${pesos(negocio.envio_gratis_desde)}` : ''}`
      : modalidad === 'mesa' ? `Para comer aquí · ${negocio.direccion}`
        : `Recoges en ${negocio.direccion}`;
  const IconoDonde = mesaQR ? Utensils : modalidad === 'domicilio' ? Bike : MapPin;

  const cabecera = (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span aria-hidden="true" style={{
        width: 46, height: 46, borderRadius: '50%', border: `1.8px solid ${k.pri}`, color: k.pri, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: k.mano, fontSize: '1.5rem',
      }}>{nombreCorto[0]}</span>
      <div style={{ flex: 1, minWidth: 0, fontFamily: k.sans, color: k.texto }}>
        <div style={{ fontWeight: 600, fontSize: '0.98rem' }}>Hola, {nombreCorto}</div>
        <div style={{ fontSize: '0.8rem', color: k.suave }}>¿Qué se te antoja hoy?</div>
      </div>
      {ancho && (
        <div style={{ display: 'flex', gap: 4, fontFamily: k.sans }}>
          {[['menu', 'Menú'], ['pedidos', 'Mis pedidos']].map(([id, texto]) => (
            <button key={id} type="button" onClick={() => setPestana(id)} aria-pressed={pestana === id} style={{
              border: 'none', borderRadius: 999, padding: '9px 16px', cursor: 'pointer', fontFamily: k.sans, fontSize: '0.92rem', fontWeight: 500,
              background: pestana === id ? k.pri : 'transparent', color: pestana === id ? '#fff' : k.texto,
            }}>{texto}</button>
          ))}
        </div>
      )}
      <button type="button" aria-label={activas.length ? 'Ver mi pedido en curso' : 'Mis pedidos'}
        onClick={() => { if (activas.length) setSeguimiento(activas[0].id); else setPestana('pedidos'); }}
        style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', border: `1.5px solid ${k.linea}`, background: 'transparent', color: k.pri, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Bell size={21} strokeWidth={TRAZO} />
        {activas.length > 0 && <span style={{ position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: '50%', background: k.pri, border: `2px solid ${k.fondo}`, animation: 'tinta-pulso 1.6s ease-out infinite' }} />}
      </button>
    </header>
  );

  // Titular: una sola idea, de izquierda a derecha, con la palabra a mano al final.
  const titular = (
    <h1 style={{
      margin: ancho ? '34px 0 0' : '24px 0 0', fontFamily: k.sans, fontWeight: 400, color: k.priOsc,
      fontSize: ancho ? '3rem' : '1.85rem', lineHeight: 1.08, letterSpacing: '-0.025em', maxWidth: ancho ? 640 : 340,
    }}>
      Cocina fit, tu pretexto para{' '}
      <span style={{ fontFamily: k.mano, color: k.pri, fontSize: '1.4em', letterSpacing: 0, whiteSpace: 'nowrap' }}>comer rico</span>
    </h1>
  );

  // Cómo lo quiere + qué implica (tiempo, dónde, envío), en un solo bloque.
  const comoLoQuieres = (
    <section aria-label="Cómo lo quieres" style={{
      marginTop: 20, padding: 14, borderRadius: 20, background: k.sup, border: `1.5px solid ${k.linea}`,
      fontFamily: k.sans, color: k.texto, maxWidth: ancho ? 560 : undefined,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: mesaQR ? 4 : 10 }}>
        <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>¿Cómo lo quieres?</span>
        <span style={{ fontSize: '0.78rem', color: k.suave }}>Listo en ~{negocio.tiempo_prep_min} min</span>
      </div>
      {!mesaQR && (
        <div role="group" style={{ display: 'grid', gridTemplateColumns: `repeat(${negocio.modalidades.length}, minmax(0, 1fr))`, gap: 4, padding: 4, borderRadius: 14, background: k.tenue }}>
          {negocio.modalidades.map((m) => {
            const Icono = ICONO_MOD[m];
            const activa = modalidad === m;
            return (
              <button key={m} type="button" onClick={() => setModalidad(m)} aria-pressed={activa} style={{
                border: 'none', borderRadius: 11, padding: '9px 4px', cursor: 'pointer', fontFamily: k.sans,
                background: activa ? k.pri : 'transparent', color: activa ? '#fff' : k.texto,
                fontWeight: 500, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: activa ? '0 4px 10px var(--p-pri-30)' : 'none',
              }}>
                <Icono size={15} strokeWidth={TRAZO} /> {MODALIDADES[m].etiqueta}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: mesaQR ? 0 : 10, fontSize: '0.8rem', color: k.suave }}>
        <IconoDonde size={14} strokeWidth={TRAZO} style={{ flexShrink: 0 }} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dondeTexto}</span>
      </div>
    </section>
  );

  const avisos = (
    <>
      {!negocio.abierto && (
        <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 16, border: `1.5px dashed ${k.pri}`, color: k.texto, fontFamily: k.sans, fontSize: '0.9rem' }}>
          <span style={{ fontFamily: k.mano, fontSize: '1.3rem', color: k.pri }}>Ahorita no </span>
          estamos recibiendo pedidos. Puedes ver el menú.
        </div>
      )}
      {activas.length > 0 && !ancho && (
        <button type="button" onClick={() => setSeguimiento(activas[0].id)} style={{
          marginTop: 14, width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: k.sans,
          display: 'flex', alignItems: 'center', gap: 12, background: k.priOsc, color: '#fff', borderRadius: 18, padding: '12px 16px',
        }}>
          <Loader2 size={20} strokeWidth={TRAZO} style={{ animation: 'spin 2s linear infinite' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Pedido #{activas[0].folio} · <span style={{ fontFamily: k.mano, fontSize: '1.25rem', fontWeight: 400 }}>{ESTADOS[activas[0].estado].toLowerCase()}</span></div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Toca para ver el seguimiento</div>
          </div>
          <ChevronRight size={20} strokeWidth={TRAZO} />
        </button>
      )}
    </>
  );

  // Categorías en una fila que se desliza; en "ver todo" saltan a su sección.
  const categorias = (
    <nav aria-label="Categorías" className="tinta-carrusel" style={{
      display: 'flex', gap: 8, overflowX: 'auto', marginTop: 24,
      padding: ancho ? 0 : '0 20px', margin: ancho ? '24px 0 0' : '24px -20px 0',
    }}>
      {listaCategorias.map((c) => {
        const activa = !verTodo && categoriaVista === c.id;
        return (
          <button key={c.id} type="button" onClick={() => elegirCategoria(c.id)} aria-pressed={activa} style={{
            flexShrink: 0, border: `1.5px solid ${activa ? k.pri : k.linea}`, borderRadius: 999, cursor: 'pointer',
            padding: '8px 15px', fontFamily: k.sans, fontSize: '0.86rem', fontWeight: 500, whiteSpace: 'nowrap',
            background: activa ? k.pri : 'transparent', color: activa ? '#fff' : k.texto, transition: 'background .15s ease',
          }}>{c.nombre}</button>
        );
      })}
    </nav>
  );

  const nombreSeccion = verTodo ? 'Todo el menú' : listaCategorias.find((c) => c.id === categoriaVista)?.nombre;
  const cuantos = verTodo ? (menu?.productos.length || 0) : enCarril.length;
  const tituloSeccion = (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 20 }}>
      <h2 style={{ margin: 0, fontFamily: k.mano, fontWeight: 400, fontSize: ancho ? '2.4rem' : '2rem', color: k.priOsc, lineHeight: 1 }}>{nombreSeccion}</h2>
      <span style={{ fontFamily: k.sans, fontSize: '0.8rem', color: k.suave, flex: 1 }}>{cuantos} {cuantos === 1 ? 'platillo' : 'platillos'}</span>
      <BotonVerTodo verTodo={verTodo} alCambiar={setVerTodo} />
    </div>
  );

  const abrirProducto = (p) => setProducto(p);

  const carrusel = (
    <div style={{ position: 'relative' }}>
      <div ref={carril} className="tinta-carrusel" style={{
        display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPadding: ancho ? 0 : '0 20px',
        padding: ancho ? '14px 0 10px' : '14px 20px 10px', margin: ancho ? 0 : '0 -20px',
      }}>
        {enCarril.map((p, i) => <Tarjeta key={p.id} p={p} invertida={i % 2 === 1} alAbrir={() => abrirProducto(p)} />)}
        {!ancho && <span aria-hidden="true" style={{ flex: '0 0 6px' }} />}
      </div>
      {ancho && desborda && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {[[-1, ChevronLeft, 'Anteriores'], [1, ChevronRight, 'Siguientes']].map(([dir, Icono, texto]) => (
            <button key={dir} type="button" aria-label={texto} onClick={() => carril.current?.scrollBy({ left: dir * 528, behavior: 'smooth' })} style={{
              width: 44, height: 44, borderRadius: '50%', border: `1.5px solid ${k.linea}`, background: 'transparent', color: k.pri,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}><Icono size={20} strokeWidth={TRAZO} /></button>
          ))}
        </div>
      )}
    </div>
  );

  const todo = menu && (
    <div>
      {menu.categorias.map((c) => {
        const lista = menu.productos.filter((p) => p.categoria_id === c.id);
        if (!lista.length) return null;
        return (
          <section key={c.id} ref={(el) => { secciones.current[c.id] = el; }}
            style={{ scrollMarginTop: 'calc(var(--p-alto-encabezado, 0px) + 12px)', paddingTop: 18 }}>
            <h2 style={{ margin: '0 0 12px', fontFamily: k.mano, fontWeight: 400, fontSize: '2rem', color: k.pri }}>{c.nombre}</h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: ancho ? 'repeat(4, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))' }}>
              {lista.map((p, i) => <Tarjeta key={p.id} p={p} compacta invertida={i % 3 === 1} alAbrir={() => abrirProducto(p)} />)}
            </div>
          </section>
        );
      })}
    </div>
  );

  const inicio = (
    <>
      {titular}
      {comoLoQuieres}
      {avisos}
      {categorias}
      {menu ? <>{tituloSeccion}{verTodo ? todo : carrusel}</> : <Cargando />}
    </>
  );

  const hojas = (
    <>
      <HojaProducto producto={producto} menu={menu} alCerrar={() => setProducto(null)}
        alAgregar={(linea) => { setCarrito((c) => [...c, linea]); setProducto(null); setAgregado(linea.nombre); }} />
      <HojaCarrito abierta={carritoAbierto} alCerrar={() => setCarritoAbierto(false)}
        negocio={negocio} carrito={carrito} setCarrito={setCarrito} modalidad={modalidad}
        setModalidad={mesaQR ? null : setModalidad} mesaQR={mesaQR} usuario={usuario}
        alCrear={(id, metodo) => (metodo === 'tarjeta' ? setOrdenPago(id) : terminarPedido(id))} />
      {ordenPago && (
        <Pasarela ordenId={ordenPago} negocio={negocio}
          alPagar={() => terminarPedido(ordenPago)}
          alCancelar={() => { setOrdenPago(null); setCarritoAbierto(true); }} />
      )}
      <Seguimiento ordenId={seguimiento} ordenes={ordenes} negocio={negocio} alCerrar={() => setSeguimiento(null)} />
    </>
  );

  const avisoAgregado = agregado && (
    <div role="status" style={{
      position: 'fixed', zIndex: 9100, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      bottom: ancho ? 28 : 'calc(152px + env(safe-area-inset-bottom, 0px))',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 999, whiteSpace: 'nowrap',
        background: k.texto, color: '#fff', fontFamily: k.sans, fontSize: '0.88rem', animation: 'tinta-entra .3s ease both',
        boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
      }}>
        <Check size={16} /> {agregado} <span style={{ fontFamily: k.mano, fontSize: '1.2rem' }}>¡listo!</span>
      </div>
    </div>
  );

  // ── Computadora: menú a la izquierda, el pedido siempre a la vista ──────────
  if (ancho) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 28px 60px', boxSizing: 'border-box' }}>
        {estilos}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 40, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>
            {cabecera}
            {pestana === 'menu' ? inicio : <MisPedidos ordenes={ordenes} abrir={setSeguimiento} />}
          </div>
          <aside style={{ position: 'sticky', top: 'calc(var(--p-alto-encabezado, 0px) + 14px)' }}>
            <ResumenPedido carrito={carrito} setCarrito={setCarrito} subtotal={subtotal} modalidad={modalidad} mesaQR={mesaQR}
              activa={activas[0]} alVerActiva={() => setSeguimiento(activas[0].id)} alContinuar={() => setCarritoAbierto(true)} />
          </aside>
        </div>
        {avisoAgregado}
        {hojas}
      </div>
    );
  }

  // ── Celular ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '4px 20px 0', paddingBottom: piezas ? 170 : 110, boxSizing: 'border-box', overflowX: 'clip' }}>
      {estilos}
      {cabecera}
      {pestana === 'menu' && (
        inicio
      )}
      {pestana === 'pedidos' && <MisPedidos ordenes={ordenes} abrir={setSeguimiento} />}

      {piezas > 0 && (
        <button type="button" onClick={() => setCarritoAbierto(true)} style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)', zIndex: 9000,
          bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', width: 'min(420px, calc(100% - 24px))',
          display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderRadius: 18, border: 'none', cursor: 'pointer',
          background: k.pri, color: '#fff', fontFamily: k.sans, fontSize: '0.95rem', fontWeight: 600,
          boxShadow: '0 14px 30px var(--p-pri-35)',
        }}>
          <span style={{ minWidth: 26, height: 26, borderRadius: 999, background: '#fff', color: k.pri, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>{piezas}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>Ver tu pedido</span>
          <span style={{ fontFamily: k.mano, fontSize: '1.45rem', fontWeight: 400 }}>{pesos(subtotal)}</span>
        </button>
      )}

      <nav style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        zIndex: 9000, width: 'min(420px, calc(100% - 24px))', display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        gap: 6, padding: 6, borderRadius: 20, boxSizing: 'border-box',
        background: 'var(--p-sup-92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        border: `1.5px solid ${k.linea}`, boxShadow: '0 12px 30px rgba(20,30,90,0.10)',
      }}>
        <ItemBarra activo={pestana === 'menu'} onClick={() => setPestana('menu')} icono={Home} texto="para ti" />
        <ItemBarra activo={pestana === 'pedidos'} onClick={() => setPestana('pedidos')} icono={Receipt} texto="pedidos" aviso={activas.length > 0} />
        <ItemBarra onClick={() => setCarritoAbierto(true)} icono={ShoppingBag} texto="carrito" cuenta={piezas} />
      </nav>
      {avisoAgregado}
      {hojas}
    </div>
  );
}

function BotonVerTodo({ verTodo, alCambiar }) {
  return (
    <button type="button" onClick={() => alCambiar((v) => !v)} style={{
      border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: k.sans, fontSize: '0.8rem',
      color: k.texto, textDecoration: 'underline', textUnderlineOffset: 3, letterSpacing: 0, whiteSpace: 'nowrap',
    }}>{verTodo ? 'ver carrusel' : 'ver todo'}</button>
  );
}

function Cargando() {
  return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: k.pri, fontFamily: k.mano, fontSize: '1.6rem' }}>
      <Loader2 size={24} strokeWidth={TRAZO} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 6px' }} />
      preparando el menú…
    </div>
  );
}

function ItemBarra({ activo, onClick, icono: Icono, texto, aviso, cuenta }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo} aria-label={activo ? undefined : texto} style={{
      position: 'relative', border: 'none', borderRadius: 14, cursor: 'pointer', height: 44,
      padding: activo ? '0 22px' : '0 14px', flex: activo ? 1.4 : 1, maxWidth: activo ? 170 : 70,
      background: activo ? k.pri : 'transparent', color: activo ? '#fff' : k.pri,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontFamily: k.sans, fontWeight: 500, fontSize: '0.86rem', transition: 'all .2s ease',
    }}>
      <Icono size={20} strokeWidth={TRAZO} />
      {activo && texto}
      {aviso && <span style={{ position: 'absolute', top: 9, right: 'calc(50% - 15px)', width: 8, height: 8, borderRadius: '50%', background: k.pri, border: '2px solid #fff' }} />}
      {cuenta > 0 && (
        <span style={{
          position: 'absolute', top: 2, right: 'calc(50% - 22px)', minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box',
          borderRadius: 999, background: k.pri, color: '#fff', fontSize: '0.68rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff',
        }}>{cuenta}</span>
      )}
    </button>
  );
}

// Tarjeta del carrusel (y, compacta, de "ver todo"): nombre a dos letras, dibujo y precio en brochazo.
function Tarjeta({ p, invertida, compacta, alAbrir }) {
  const tinta = invertida ? '#fff' : k.pri;
  return (
    <button type="button" onClick={p.disponible ? alAbrir : undefined} disabled={!p.disponible} style={{
      flex: compacta ? undefined : '0 0 min(64vw, 250px)', scrollSnapAlign: 'center', minHeight: compacta ? 250 : 340,
      borderRadius: compacta ? 18 : 22, border: `1.5px solid ${invertida ? k.pri : k.linea}`, background: invertida ? k.pri : k.sup,
      color: invertida ? '#fff' : k.texto, padding: compacta ? '12px 12px 10px' : '16px 16px 14px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', textAlign: 'left', cursor: p.disponible ? 'pointer' : 'default',
      opacity: p.disponible ? 1 : 0.5, position: 'relative', minWidth: 0,
    }}>
      <Nombre nombre={p.nombre} tam={compacta ? 0.78 : 1} />
      <div style={{ fontFamily: k.sans, fontSize: compacta ? '0.7rem' : '0.76rem', opacity: 0.75, marginTop: 6 }}>
        {p.proteina_g ? `${p.proteina_g} g proteína · ` : ''}{p.kcal} kcal
      </div>
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0', minHeight: compacta ? 110 : 160 }}>
        <Dibujo src={dibujoDe(p)} foto={p.foto} color={tinta} alto={compacta ? 104 : 158} ancho={compacta ? 120 : 180} />
        <Precio texto={p.disponible ? pesos(p.precio) : 'agotado'} invertido={invertida} tam={compacta ? 0.72 : 1}
          style={{ position: 'absolute', right: compacta ? -6 : -8, bottom: compacta ? -2 : 4 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: k.sans, fontSize: compacta ? '0.8rem' : '0.92rem' }}>
        <span>{p.disponible ? 'pedir' : 'por hoy no'}</span>
        <ChevronRight size={compacta ? 16 : 19} strokeWidth={TRAZO} />
      </div>
    </button>
  );
}

const btnRedondo = (invertido) => ({
  width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${invertido ? 'rgba(255,255,255,0.55)' : k.linea}`,
  background: 'transparent', color: invertido ? '#fff' : k.pri,
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
});

function Cantidad({ valor, alMenos, alMas, invertido, basura }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button type="button" aria-label="Quitar uno" onClick={alMenos} style={btnRedondo(invertido)}>
        {basura && valor === 1 ? <Trash2 size={14} strokeWidth={TRAZO} /> : <Minus size={14} strokeWidth={TRAZO} />}
      </button>
      <span style={{ minWidth: 22, textAlign: 'center', fontFamily: k.sans, fontWeight: 600 }}>{valor}</span>
      <button type="button" aria-label="Agregar uno" onClick={alMas} style={btnRedondo(invertido)}><Plus size={14} strokeWidth={TRAZO} /></button>
    </div>
  );
}

// Columna fija del pedido en computadora: una tarjeta azul, como la bienvenida.
function ResumenPedido({ carrito, setCarrito, subtotal, modalidad, mesaQR, activa, alVerActiva, alContinuar }) {
  const cambiar = (linea, delta) => setCarrito((c) => c
    .map((l) => (l.linea === linea ? { ...l, cantidad: l.cantidad + delta } : l))
    .filter((l) => l.cantidad > 0));
  const Icono = ICONO_MOD[modalidad];
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {activa && (
        <button type="button" onClick={alVerActiva} style={{
          border: `1.5px solid ${k.pri}`, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
          background: k.sup, color: k.texto, borderRadius: 20, padding: '12px 16px', fontFamily: k.sans,
        }}>
          <Loader2 size={20} strokeWidth={TRAZO} color="var(--p-pri)" style={{ animation: 'spin 2s linear infinite' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Pedido #{activa.folio} · <span style={{ fontFamily: k.mano, fontSize: '1.25rem', fontWeight: 400, color: k.pri }}>{ESTADOS[activa.estado].toLowerCase()}</span></div>
            <div style={{ fontSize: '0.8rem', color: k.suave }}>Ver seguimiento</div>
          </div>
          <ChevronRight size={18} strokeWidth={TRAZO} />
        </button>
      )}
      <div style={{ background: k.priOsc, color: '#fff', borderRadius: 26, padding: 22, fontFamily: k.sans }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <Titulo sans="Tu" mano="pedido" tam={0.85} color="#fff" />
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', opacity: 0.85 }}>
            <Icono size={14} strokeWidth={TRAZO} /> {mesaQR ? `Mesa ${mesaQR}` : MODALIDADES[modalidad].etiqueta}
          </span>
        </div>
        {!carrito.length ? (
          <div style={{ textAlign: 'center', padding: '22px 8px 8px' }}>
            <ShoppingBag size={34} strokeWidth={1.3} style={{ opacity: 0.8, marginBottom: 6 }} />
            <div style={{ fontSize: '0.92rem' }}>Aún no agregas nada.</div>
            <div style={{ fontFamily: k.mano, fontSize: '1.5rem', marginTop: 2 }}>elige algo rico</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', maxHeight: 'calc(100vh - 430px)', overflowY: 'auto' }}>
              {carrito.map((l) => (
                <div key={l.linea} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.22)' }}>
                  <Dibujo src={dibujoDe(l)} foto={l.foto} color="#fff" alto={44} ancho={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{l.nombre}</div>
                    {l.detalle.length > 0 && <div style={{ fontSize: '0.74rem', opacity: 0.8 }}>{l.detalle.join(' · ')}</div>}
                    <div style={{ fontFamily: k.mano, fontSize: '1.2rem' }}>{pesos(l.precioUnitario * l.cantidad)}</div>
                  </div>
                  <Cantidad valor={l.cantidad} alMenos={() => cambiar(l.linea, -1)} alMas={() => cambiar(l.linea, 1)} invertido basura />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '14px 0 14px' }}>
              <span>Subtotal</span><span style={{ fontFamily: k.mano, fontSize: '1.7rem' }}>{pesos(subtotal)}</span>
            </div>
            <Pildora invertida onClick={alContinuar} style={{ width: '100%' }}>Continuar <ChevronRight size={18} strokeWidth={TRAZO} /></Pildora>
          </>
        )}
      </div>
    </div>
  );
}

function HojaProducto({ producto: p, menu, alCerrar, alAgregar }) {
  const [elegidas, setElegidas] = useState({});
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  useEffect(() => { setElegidas({}); setCantidad(1); setNota(''); }, [p?.id]);
  if (!p || !menu) return <Hoja abierta={false} />;

  const grupos = gruposDe(p, menu.grupos);
  const opcionesDe = (g) => menu.opciones.filter((o) => o.grupo_id === g.id && o.disponible);
  const ids = Object.values(elegidas).flat();
  const extra = menu.opciones.filter((o) => ids.includes(o.id)).reduce((s, o) => s + Number(o.precio_extra), 0);
  const unitario = Number(p.precio) + extra;
  const faltan = grupos.filter((g) => g.requerido && !(elegidas[g.id] || []).length);

  const elegir = (g, o) => setElegidas((e) => {
    const actual = e[g.id] || [];
    if (g.tipo === 'una') return { ...e, [g.id]: [o.id] };
    return { ...e, [g.id]: actual.includes(o.id) ? actual.filter((x) => x !== o.id) : [...actual, o.id] };
  });

  const agregar = () => alAgregar({
    linea: Math.random().toString(36).slice(2), productoId: p.id, nombre: p.nombre, foto: p.foto,
    opciones: ids, detalle: menu.opciones.filter((o) => ids.includes(o.id)).map((o) => o.nombre),
    nota: nota.trim(), cantidad, precioUnitario: unitario,
  });

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={p.nombre}>
      <div style={{ position: 'relative', background: k.priOsc, color: '#fff', padding: '28px 22px 24px', overflow: 'hidden' }}>
        <Nombre nombre={p.nombre} tam={1.35} />
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 4px' }}>
          <div style={{ animation: 'tinta-entra .5s .05s both ease' }}>
            <Dibujo src={dibujoDe(p)} foto={p.foto} color="#fff" alto={200} ancho={250} />
          </div>
        </div>
        <Precio texto={pesos(p.precio)} invertido tam={1.15} style={{ position: 'absolute', right: 20, bottom: 22 }} />
      </div>
      <div style={{ padding: '18px 22px 10px', fontFamily: k.sans, color: k.texto }}>
        <p style={{ margin: '0 0 12px', color: k.suave, lineHeight: 1.5 }}>{p.descripcion}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Insignia>{p.kcal} kcal</Insignia>
          {p.proteina_g ? <Insignia>{p.proteina_g} g proteína</Insignia> : null}
          {(p.etiquetas || []).map((e) => <Insignia key={e}>{e}</Insignia>)}
        </div>

        {grupos.map((g) => (
          <div key={g.id} style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>{g.nombre}</span>
              <span style={{ fontFamily: k.mano, fontSize: '1.15rem', color: g.requerido ? k.pri : k.suave }}>
                {g.requerido ? 'elige 1' : g.tipo === 'una' ? 'opcional · 1' : 'opcional'}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {opcionesDe(g).map((o) => {
                const on = (elegidas[g.id] || []).includes(o.id);
                return (
                  <Contorno key={o.id} activo={on} onClick={() => elegir(g, o)}>
                    <span style={{
                      width: 20, height: 20, borderRadius: g.tipo === 'una' ? '50%' : 6, flexShrink: 0,
                      border: `1.5px solid ${on ? '#fff' : k.linea}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{on && <Check size={13} strokeWidth={3} />}</span>
                    <span style={{ flex: 1 }}>{o.nombre}</span>
                    {Number(o.precio_extra) > 0 && <span style={{ fontFamily: k.mano, fontSize: '1.15rem' }}>+{pesos(o.precio_extra)}</span>}
                  </Contorno>
                );
              })}
            </div>
          </div>
        ))}

        <label style={{ display: 'block', marginTop: 22, fontWeight: 600 }}>
          Indicaciones para cocina
          <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 200))} rows={2}
            placeholder="Ej. sin cebolla, salsa aparte" style={{ ...campo, resize: 'none', marginTop: 8 }} />
        </label>
      </div>

      <div style={{
        position: 'sticky', bottom: 0, display: 'flex', gap: 12, alignItems: 'center', padding: '12px 22px 16px',
        background: k.fondo, borderTop: `1px solid ${k.linea}`,
      }}>
        <div style={{ padding: '6px 8px', borderRadius: 999, border: `1.5px solid ${k.linea}` }}>
          <Cantidad valor={cantidad} alMenos={() => setCantidad((c) => Math.max(1, c - 1))} alMas={() => setCantidad((c) => Math.min(20, c + 1))} />
        </div>
        <Pildora onClick={agregar} disabled={faltan.length > 0} style={{ flex: 1 }}>
          {faltan.length ? `Elige ${faltan[0].nombre.toLowerCase()}` : <>Agregar <span style={{ fontFamily: k.mano, fontSize: '1.35rem', fontWeight: 400 }}>{pesos(unitario * cantidad)}</span></>}
        </Pildora>
      </div>
    </Hoja>
  );
}

const campo = {
  display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '12px 14px', borderRadius: 14,
  border: `1.5px solid ${k.linea}`, fontSize: '0.95rem', fontFamily: k.sans, background: k.sup, color: k.texto, outlineColor: k.pri,
};
const tituloSeccion = { margin: '24px 0 10px', fontFamily: k.sans, fontSize: '1rem', fontWeight: 600, color: k.texto };
const etiquetaCampo = { display: 'block', marginTop: 12, fontFamily: k.sans, fontSize: '0.85rem', fontWeight: 500, color: k.texto };

function HojaCarrito({ abierta, alCerrar, negocio, carrito, setCarrito, modalidad, setModalidad, mesaQR, usuario, alCrear }) {
  const [hora, setHora] = useState('');
  const [mesa, setMesa] = useState(mesaQR || 1);
  const [direccion, setDireccion] = useState('Calle 11 Sur 3904, Col. Gabriel Pastor, Puebla');
  const [referencia, setReferencia] = useState('');
  const [telefono, setTelefono] = useState('222 123 4567');
  const [metodo, setMetodo] = useState('tarjeta');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const horarios = useMemo(() => horariosParaLlevar(negocio.tiempo_prep_min), [negocio.tiempo_prep_min, abierta]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = carrito.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);
  const envioAplica = modalidad === 'domicilio' && !(negocio.envio_gratis_desde && subtotal >= negocio.envio_gratis_desde);
  const envio = envioAplica ? Number(negocio.costo_envio) : 0;
  const falta = negocio.envio_gratis_desde ? negocio.envio_gratis_desde - subtotal : 0;
  const efectivo = { recoger: 'Pago al recoger', mesa: 'Pagar en caja', domicilio: 'Pago contra entrega' }[modalidad];

  const cambiar = (linea, delta) => setCarrito((c) => c
    .map((l) => (l.linea === linea ? { ...l, cantidad: l.cantidad + delta } : l))
    .filter((l) => l.cantidad > 0));

  const pedir = async () => {
    if (enviando) return;
    setEnviando(true);
    setError('');
    const { data, error: e } = await supabase.rpc('pedidos_crear_orden', {
      p_negocio: negocio.id,
      p_items: carrito.map((l) => ({ producto_id: l.productoId, cantidad: l.cantidad, opciones: l.opciones, nota: l.nota })),
      p_modalidad: modalidad, p_metodo: metodo,
      p_mesa: modalidad === 'mesa' ? Number(mesa) : null,
      p_direccion: modalidad === 'domicilio' ? direccion : null,
      p_referencia: modalidad === 'domicilio' ? referencia : null,
      p_telefono: telefono || null,
      p_hora: modalidad === 'recoger' && hora ? hora : null,
      p_notas: null,
    });
    setEnviando(false);
    if (e) { setError(errorLegible(e)); return; }
    alCrear(data, metodo);
  };

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Tu pedido">
      <div style={{ padding: '24px 22px 8px', fontFamily: k.sans, color: k.texto }}>
        <Titulo sans="Tu" mano="pedido" style={{ marginBottom: 10 }} />
        {!carrito.length && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: k.suave }}>
            <ShoppingBag size={34} strokeWidth={1.3} color="var(--p-pri)" />
            <div style={{ marginTop: 6 }}>Tu carrito está vacío.</div>
            <div style={{ fontFamily: k.mano, fontSize: '1.5rem', color: k.pri }}>agrega algo rico</div>
          </div>
        )}

        {carrito.map((l) => (
          <div key={l.linea} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${k.linea}` }}>
            <span style={{ width: 58, height: 58, borderRadius: 14, border: `1.5px solid ${k.linea}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Dibujo src={dibujoDe(l)} foto={l.foto} alto={44} ancho={48} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{l.nombre}</div>
              {(l.detalle.length > 0 || l.nota) && (
                <div style={{ fontSize: '0.8rem', color: k.suave }}>{[...l.detalle, l.nota && `“${l.nota}”`].filter(Boolean).join(' · ')}</div>
              )}
              <div style={{ fontFamily: k.mano, fontSize: '1.3rem', color: k.pri }}>{pesos(l.precioUnitario * l.cantidad)}</div>
            </div>
            <Cantidad valor={l.cantidad} alMenos={() => cambiar(l.linea, -1)} alMas={() => cambiar(l.linea, 1)} basura />
          </div>
        ))}

        {carrito.length > 0 && (
          <>
            <h3 style={tituloSeccion}>¿Cómo lo quieres?</h3>
            {setModalidad ? (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${negocio.modalidades.length}, minmax(0, 1fr))`, gap: 8 }}>
                {negocio.modalidades.map((m) => {
                  const Icono = ICONO_MOD[m];
                  return (
                    <Contorno key={m} activo={modalidad === m} onClick={() => setModalidad(m)}
                      style={{ flexDirection: 'column', gap: 6, padding: '12px 6px', fontSize: '0.82rem', justifyContent: 'center', textAlign: 'center' }}>
                      <Icono size={20} strokeWidth={TRAZO} /> {MODALIDADES[m].etiqueta}
                    </Contorno>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontFamily: k.mano, fontSize: '1.5rem', color: k.pri }}>en la mesa {mesaQR}</div>
            )}

            {modalidad === 'recoger' && (
              <label style={etiquetaCampo}>Hora para recoger
                <select value={hora} onChange={(e) => setHora(e.target.value)} style={campo}>
                  <option value="">Lo antes posible (~{negocio.tiempo_prep_min} min)</option>
                  {horarios.map((h) => (
                    <option key={h.toISOString()} value={h.toISOString()}>
                      {h.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {modalidad === 'mesa' && !mesaQR && (
              <label style={etiquetaCampo}>Número de mesa
                <select value={mesa} onChange={(e) => setMesa(e.target.value)} style={campo}>
                  {Array.from({ length: negocio.mesas }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Mesa {n}</option>)}
                </select>
              </label>
            )}
            {modalidad === 'domicilio' && (
              <>
                <label style={etiquetaCampo}>Dirección de entrega
                  <input value={direccion} onChange={(e) => setDireccion(e.target.value)} style={campo} placeholder="Calle, número y colonia" />
                </label>
                <label style={etiquetaCampo}>Referencia (opcional)
                  <input value={referencia} onChange={(e) => setReferencia(e.target.value)} style={campo} placeholder="Ej. casa verde, portón negro" />
                </label>
                <label style={etiquetaCampo}>Teléfono
                  <input value={telefono} onChange={(e) => setTelefono(e.target.value)} style={campo} inputMode="tel" />
                </label>
              </>
            )}

            <h3 style={tituloSeccion}>Pago</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {[['tarjeta', 'Tarjeta', CreditCard], ['efectivo', efectivo, Wallet]].map(([id, texto, Icono]) => (
                <Contorno key={id} activo={metodo === id} onClick={() => setMetodo(id)}>
                  <Icono size={19} strokeWidth={TRAZO} /> {texto}
                  {metodo === id && <Check size={18} style={{ marginLeft: 'auto' }} />}
                </Contorno>
              ))}
            </div>

            <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 18, background: k.tenue }}>
              <Fila izq="Subtotal" der={pesos(subtotal)} />
              {modalidad === 'domicilio' && <Fila izq="Envío" der={envio ? pesos(envio) : 'Gratis'} />}
              {modalidad === 'domicilio' && envio > 0 && falta > 0 && (
                <div style={{ fontSize: '0.78rem', color: k.suave, marginTop: 2 }}>Te faltan {pesos(falta)} para envío gratis.</div>
              )}
              <div style={{ borderTop: `1px dashed ${k.linea}`, marginTop: 8, paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong style={{ fontWeight: 600 }}>Total</strong>
                <span style={{ fontFamily: k.mano, fontSize: '1.9rem', color: k.pri }}>{pesos(subtotal + envio)}</span>
              </div>
            </div>
            {usuario && <div style={{ fontSize: '0.78rem', color: k.suave, marginTop: 8 }}>Pedido a nombre de {usuario}</div>}
            {error && <p role="alert" style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: 12, background: '#FDECEC', color: '#9B1C1C', fontWeight: 600, fontSize: '0.88rem' }}>{error}</p>}
          </>
        )}
      </div>
      {carrito.length > 0 && (
        <div style={{ position: 'sticky', bottom: 0, padding: '12px 22px 16px', background: k.fondo, borderTop: `1px solid ${k.linea}` }}>
          <Pildora onClick={pedir} disabled={enviando || !negocio.abierto} style={{ width: '100%' }}>
            {enviando ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {!negocio.abierto ? 'Cerrado por ahora' : metodo === 'tarjeta' ? 'Continuar al pago' : 'Hacer pedido'}
            {negocio.abierto && <span style={{ fontFamily: k.mano, fontSize: '1.35rem', fontWeight: 400 }}>{pesos(subtotal + envio)}</span>}
          </Pildora>
        </div>
      )}
    </Hoja>
  );
}

function Fila({ izq, der }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: k.sans, fontSize: '0.95rem', color: k.texto, padding: '2px 0' }}>
      <span>{izq}</span><span>{der}</span>
    </div>
  );
}

// Pasarela de prueba: 4242… aprueba, 4000…0002 rechaza. No mueve dinero.
function Pasarela({ ordenId, negocio, alPagar, alCancelar }) {
  const [orden, setOrden] = useState(null);
  const [tarjeta, setTarjeta] = useState(TARJETAS[0][0]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [aprobado, setAprobado] = useState(false);

  useEffect(() => {
    supabase.from('pedidos_ordenes').select('id, folio, total, items, estado').eq('id', ordenId).maybeSingle()
      .then(({ data }) => setOrden(data));
  }, [ordenId]);

  const pagar = async () => {
    setEnviando(true); setError('');
    const { error: e } = await supabase.rpc('pedidos_pagar_prueba', { p_orden: ordenId, p_tarjeta: tarjeta });
    setEnviando(false);
    if (e) { setError(errorLegible(e)); return; }
    setAprobado(true);
  };
  const cancelar = async () => {
    setEnviando(true);
    await supabase.rpc('pedidos_cancelar_pago', { p_orden: ordenId });
    setEnviando(false);
    alCancelar();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9700, background: 'var(--p-pri-60)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-label="Pago" style={{ width: 'min(420px, 100%)', background: k.fondo, borderRadius: 26, padding: 24, boxSizing: 'border-box', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', color: k.texto, fontFamily: k.sans }}>
        {aprobado ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <CheckCircle2 size={60} strokeWidth={1.3} color="var(--p-pri)" style={{ marginBottom: 8 }} />
            <Titulo sans="Pago" mano="aprobado" tam={0.9} style={{ marginBottom: 8 }} />
            <p style={{ margin: '0 0 4px' }}>{pesos(orden?.total)} · tarjeta terminación {tarjeta.replace(/\D/g, '').slice(-4)}</p>
            <p style={{ margin: '0 0 20px', color: k.suave, fontSize: '0.88rem' }}>Tu pedido #{orden?.folio} ya está en la cocina.</p>
            <Pildora onClick={alPagar} style={{ width: '100%' }}>Ver mi pedido</Pildora>
          </div>
        ) : (
          <>
            <Insignia>Pasarela de prueba · no se cobra nada</Insignia>
            <div style={{ fontFamily: k.mano, fontSize: '2.4rem', color: k.pri, margin: '12px 0 0', lineHeight: 1 }}>{negocio.nombre}</div>
            <p style={{ margin: '2px 0 16px', color: k.suave, fontSize: '0.9rem' }}>Pedido #{orden?.folio ?? '…'} · {pesos(orden?.total)}</p>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500 }}>Número de tarjeta
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${k.linea}`, borderRadius: 14, padding: '0 12px', marginTop: 6, background: k.sup }}>
                <CreditCard size={18} strokeWidth={TRAZO} color="var(--p-pri)" />
                <input value={tarjeta} inputMode="numeric" autoComplete="off"
                  onChange={(e) => setTarjeta(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '))}
                  style={{ border: 'none', outline: 'none', padding: '12px 0', fontSize: '1rem', width: '100%', letterSpacing: '0.04em', color: k.texto, background: 'transparent', fontFamily: k.sans }} />
              </div>
            </label>
            <div style={{ display: 'flex', gap: 6, margin: '8px 0 12px' }}>
              {TARJETAS.map(([n, e]) => (
                <button key={n} type="button" onClick={() => setTarjeta(n)} style={{
                  border: `1.5px solid ${tarjeta === n ? k.pri : k.linea}`, borderRadius: 999, padding: '5px 11px', fontSize: '0.74rem', fontWeight: 500,
                  cursor: 'pointer', background: tarjeta === n ? k.pri : 'transparent', color: tarjeta === n ? '#fff' : k.texto, fontFamily: k.sans,
                }}>
                  {e} · {n.slice(-4)}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input readOnly value="12 / 34" aria-label="Vencimiento" style={{ ...campo, marginTop: 0, flex: 1 }} />
              <input readOnly value="123" aria-label="CVC" style={{ ...campo, marginTop: 0, flex: 1 }} />
            </div>
            {error && <p role="alert" style={{ margin: '0 0 12px', padding: '10px 12px', borderRadius: 12, background: '#FDECEC', color: '#9B1C1C', fontWeight: 600, fontSize: '0.85rem' }}>{error}</p>}
            <Pildora onClick={pagar} disabled={enviando || !orden} style={{ width: '100%' }}>
              {enviando ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={16} strokeWidth={TRAZO} />}
              {enviando ? 'Procesando…' : <>Pagar <span style={{ fontFamily: k.mano, fontSize: '1.35rem', fontWeight: 400 }}>{pesos(orden?.total)}</span></>}
            </Pildora>
            <button type="button" onClick={cancelar} disabled={enviando} style={{
              width: '100%', marginTop: 8, padding: '13px 16px', borderRadius: 999, border: `1.5px solid ${k.linea}`, background: 'transparent',
              color: k.texto, fontFamily: k.sans, fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer',
            }}>Volver al carrito</button>
          </>
        )}
      </div>
    </div>
  );
}

function MisPedidos({ ordenes, abrir }) {
  const lista = (ordenes || []).filter((o) => o.estado !== 'pendiente_pago');
  return (
    <div style={{ padding: '28px 0 0', fontFamily: k.sans }}>
      <Titulo sans="Mis" mano="pedidos" style={{ marginBottom: 16 }} />
      {!ordenes && <Cargando />}
      {ordenes && !lista.length && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: k.suave }}>
          <Receipt size={34} strokeWidth={1.3} color="var(--p-pri)" />
          <div style={{ marginTop: 6 }}>Aún no has pedido.</div>
          <div style={{ fontFamily: k.mano, fontSize: '1.5rem', color: k.pri }}>aquí aparecerán</div>
        </div>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {lista.map((o) => {
          const vivo = !['entregado', 'cancelado'].includes(o.estado);
          return (
            <button key={o.id} type="button" onClick={() => abrir(o.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 20, cursor: 'pointer', textAlign: 'left',
              border: `1.5px solid ${vivo ? k.pri : k.linea}`, background: vivo ? k.pri : k.sup, color: vivo ? '#fff' : k.texto, fontFamily: k.sans,
            }}>
              <Dibujo src={dibujoDe({ foto: o.items[0]?.foto })} color={vivo ? '#fff' : k.pri} alto={46} ancho={50} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <strong style={{ fontWeight: 600 }}>#{o.folio}</strong>
                  <span style={{ fontFamily: k.mano, fontSize: '1.25rem' }}>{ESTADOS[o.estado].toLowerCase()}</span>
                </div>
                <div style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.items.map((l) => `${l.cantidad}× ${l.nombre}`).join(', ')}
                </div>
                <div style={{ fontSize: '0.76rem', opacity: 0.75, marginTop: 2 }}>
                  {modalidadDe(o)} · {new Date(o.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
              <span style={{ fontFamily: k.mano, fontSize: '1.4rem' }}>{pesos(o.total)}</span>
              <ChevronRight size={18} strokeWidth={TRAZO} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Seguimiento({ ordenId, ordenes, negocio, alCerrar }) {
  const o = (ordenes || []).find((x) => x.id === ordenId);
  if (!ordenId || !o) return null;
  const pasos = pasosDe(o.modalidad);
  const orden = { recibido: 0, preparando: 1, listo: 2, en_camino: 2, entregado: 3 };
  const actual = o.estado === 'listo' && o.modalidad === 'domicilio' ? 1 : (orden[o.estado] ?? 0);
  const cancelado = o.estado === 'cancelado';
  const mensaje = {
    recibido: 'La cocina ya tiene tu pedido.',
    preparando: 'Lo estamos preparando con calma y con cariño.',
    listo: o.modalidad === 'mesa' ? 'Ya va en camino a tu mesa.' : o.modalidad === 'domicilio' ? 'Listo, esperando al repartidor.' : '¡Listo! Pasa a recogerlo a la barra.',
    en_camino: 'Tu pedido va en camino.',
    entregado: '¡Buen provecho!',
    cancelado: 'Este pedido se canceló.',
  }[o.estado];
  const estadoVisible = cancelado ? 'Cancelado' : ESTADOS[o.estado === 'listo' && o.modalidad === 'domicilio' ? 'preparando' : o.estado];

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={`Pedido ${o.folio}`}>
      <div style={{ position: 'relative', background: k.priOsc, color: '#fff', padding: '28px 22px 26px', overflow: 'hidden', fontFamily: k.sans }}>
        <div style={{ fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.8 }}>Pedido #{o.folio}</div>
        <div style={{ fontFamily: k.mano, fontSize: '3.2rem', lineHeight: 1, margin: '6px 0 6px', position: 'relative', zIndex: 1 }}>{estadoVisible.toLowerCase()}</div>
        <p style={{ margin: 0, maxWidth: '62%', opacity: 0.9, position: 'relative', zIndex: 1 }}>{mensaje}</p>
        <div style={{ position: 'absolute', right: -10, bottom: -14, animation: 'tinta-flota 5s ease-in-out infinite' }}>
          <Dibujo src={dibujoDe({ foto: o.items[0]?.foto })} color="#fff" alto={140} ancho={150} />
        </div>
      </div>

      <div style={{ padding: '22px 22px 24px', fontFamily: k.sans, color: k.texto }}>
        {!cancelado && (
          <div style={{ display: 'grid', marginBottom: 18 }}>
            {pasos.map(([clave, texto], i) => {
              const hecho = i < actual || o.estado === 'entregado';
              const ahora = i === actual && o.estado !== 'entregado';
              return (
                <div key={clave} style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      border: `1.8px solid ${hecho || ahora ? k.pri : k.linea}`, background: hecho ? k.pri : 'transparent', color: hecho ? '#fff' : k.pri,
                      animation: ahora ? 'tinta-pulso 1.6s ease-out infinite' : 'none',
                    }}>{hecho ? <Check size={14} strokeWidth={3} /> : ahora ? <span style={{ width: 9, height: 9, borderRadius: '50%', background: k.pri }} /> : null}</span>
                    {i < pasos.length - 1 && <span style={{ width: 0, flex: 1, minHeight: 22, borderLeft: `1.8px ${hecho ? 'solid' : 'dashed'} ${hecho ? k.pri : k.linea}` }} />}
                  </div>
                  <div style={{ paddingBottom: 16, paddingTop: 2, color: hecho || ahora ? k.texto : k.suave }}>
                    {ahora ? <span style={{ fontFamily: k.mano, fontSize: '1.45rem', color: k.pri, lineHeight: 1 }}>{texto.toLowerCase()}</span> : texto}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ padding: '14px 16px', borderRadius: 18, background: k.tenue }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 8 }}>
            {o.modalidad === 'domicilio' ? <MapPin size={16} strokeWidth={TRAZO} /> : o.modalidad === 'mesa' ? <Utensils size={16} strokeWidth={TRAZO} /> : <Store size={16} strokeWidth={TRAZO} />}
            {o.modalidad === 'domicilio' ? o.direccion : modalidadDe(o)}
          </div>
          {o.items.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '3px 0' }}>
              <span>{l.cantidad}× {l.nombre}{l.opciones?.length ? <span style={{ color: k.suave }}> · {l.opciones.map((x) => x.nombre).join(', ')}</span> : null}</span>
              <span>{pesos(l.total)}</span>
            </div>
          ))}
          {Number(o.envio) > 0 && <Fila izq="Envío" der={pesos(o.envio)} />}
          <div style={{ borderTop: `1px dashed ${k.linea}`, marginTop: 8, paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong style={{ fontWeight: 600 }}>Total</strong>
            <span style={{ fontFamily: k.mano, fontSize: '1.7rem', color: k.pri }}>{pesos(o.total)}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: k.suave, marginTop: 4 }}>
            {o.metodo_pago === 'tarjeta' ? 'Pagado con tarjeta (prueba)' : { recoger: 'Pagas al recoger', mesa: 'Pagas en caja', domicilio: 'Pagas al recibir' }[o.modalidad]}
          </div>
        </div>
        <p style={{ textAlign: 'center', color: k.suave, fontSize: '0.8rem', marginTop: 14 }}>
          {negocio.nombre} · {negocio.telefono}
        </p>
      </div>
    </Hoja>
  );
}
