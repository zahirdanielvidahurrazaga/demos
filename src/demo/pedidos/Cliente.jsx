import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bike, Check, ChevronRight, Clock, CreditCard, Flame, Loader2, Lock, MapPin, Minus, Plus,
  Receipt, ShoppingBag, Store, Trash2, Utensils, Wallet, Leaf, CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  pesos, MODALIDADES, ESTADOS, pasosDe, modalidadDe, gruposDe, errorLegible, useMenu, useOrdenes,
} from './datos';
import { t, Foto, Boton, Chip, Etiqueta, Hoja, Vacio, useAncho } from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// APP DEL CLIENTE — menú, carrito, pago de prueba y seguimiento en vivo.
// Si se abre con ?mesa=N (el QR de la mesa) queda fija en "En mesa".
// ─────────────────────────────────────────────────────────────────────────────

const ICONO_MOD = { recoger: Store, mesa: Utensils, domicilio: Bike };
const TARJETAS = [['4242 4242 4242 4242', 'Aprobada'], ['4000 0000 0000 0002', 'Rechazada']];

const claveCarrito = (negocio) => `pedidos_carrito_${negocio}`;

function horariosParaLlevar(minPrep) {
  // Cada 15 min, desde el tiempo de preparación hasta 3 horas después.
  const inicio = new Date(Date.now() + minPrep * 60000);
  inicio.setSeconds(0, 0);
  inicio.setMinutes(Math.ceil(inicio.getMinutes() / 15) * 15);
  return Array.from({ length: 12 }, (_, i) => new Date(inicio.getTime() + i * 15 * 60000));
}

export default function Cliente({ negocio, mesaQR, usuario }) {
  const { menu } = useMenu(negocio.id);
  const { ordenes } = useOrdenes(negocio.id);
  const ancho = useAncho(1000);
  const [pestana, setPestana] = useState('menu');
  const [categoria, setCategoria] = useState(null);
  const [producto, setProducto] = useState(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [ordenPago, setOrdenPago] = useState(null);
  const [seguimiento, setSeguimiento] = useState(null);
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
  const marca = negocio.marca || {};
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

  const irACategoria = (id) => {
    setCategoria(id);
    secciones.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const terminarPedido = (id) => {
    setCarrito([]);
    setCarritoAbierto(false);
    setOrdenPago(null);
    setSeguimiento(id);
    setPestana('pedidos');
  };

  // Categoría activa según lo que se ve al hacer scroll.
  useEffect(() => {
    if (!menu || pestana !== 'menu') return undefined;
    const obs = new IntersectionObserver((entradas) => {
      const visible = entradas.filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setCategoria(visible.target.dataset.cat);
    }, { rootMargin: '-180px 0px -55% 0px' });
    Object.values(secciones.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [menu, pestana]);

  const portada = (
    <div style={{
      position: 'relative', height: ancho ? 300 : 230, overflow: 'hidden',
      borderRadius: ancho ? 28 : '0 0 28px 28px',
    }}>
      <Foto src={marca.portada} alt="" redonda={0} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 30%, rgba(20,30,18,0.8))' }} />
      <div style={{ position: 'absolute', left: ancho ? 32 : 20, right: 20, bottom: ancho ? 26 : 18, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <Leaf size={ancho ? 28 : 22} />
          <span style={{ fontFamily: t.serif, fontSize: ancho ? '2.8rem' : '2rem', fontWeight: 700, letterSpacing: '-0.01em' }}>{negocio.nombre}</span>
        </div>
        <div style={{ fontSize: ancho ? '1.05rem' : '0.92rem', opacity: 0.92 }}>{marca.lema} · {negocio.ciudad}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.82rem', opacity: 0.9, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> Listo en ~{negocio.tiempo_prep_min} min</span>
          {negocio.envio_gratis_desde && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Bike size={14} /> Envío gratis desde {pesos(negocio.envio_gratis_desde)}</span>}
        </div>
      </div>
    </div>
  );

  const selectorModalidad = mesaQR ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: t.sup, borderRadius: 18, padding: '12px 14px', border: `1px solid ${t.linea}` }}>
      <Utensils size={20} color={t.pri} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, color: t.texto }}>Estás en la mesa {mesaQR}</div>
        <div style={{ fontSize: '0.82rem', color: t.suave }}>Pide desde aquí y te lo llevamos.</div>
      </div>
    </div>
  ) : (
    <div style={{ display: 'flex', gap: 8, background: t.sup, padding: 5, borderRadius: 999, border: `1px solid ${t.linea}`, maxWidth: ancho ? 520 : undefined }}>
      {negocio.modalidades.map((m) => {
        const Icono = ICONO_MOD[m];
        const activa = modalidad === m;
        return (
          <button key={m} type="button" onClick={() => setModalidad(m)} aria-pressed={activa} style={{
            flex: 1, border: 'none', borderRadius: 999, padding: '10px 6px', cursor: 'pointer',
            background: activa ? t.priOsc : 'transparent', color: activa ? '#fff' : t.texto,
            fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icono size={16} /> {MODALIDADES[m].etiqueta}
          </button>
        );
      })}
    </div>
  );

  const menuCompleto = menu && (
    <>
      {destacados.length > 0 && (
        <div style={{ padding: ancho ? '24px 0 4px' : '20px 0 4px' }}>
          <h2 style={{ margin: ancho ? '0 0 12px' : '0 16px 10px', fontFamily: t.serif, fontSize: ancho ? '1.6rem' : '1.35rem', color: t.texto }}>Los favoritos</h2>
          <div style={ancho
            ? { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }
            : { display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 6px', scrollbarWidth: 'none' }}>
            {destacados.map((p) => (
              <button key={p.id} type="button" onClick={() => setProducto(p)} style={{
                flex: ancho ? undefined : '0 0 200px', border: 'none', padding: 0, background: t.sup, borderRadius: 20, cursor: 'pointer',
                textAlign: 'left', overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
              }}>
                <Foto src={p.foto} alt={p.nombre} redonda={0} style={{ width: '100%', height: ancho ? 170 : 130 }} />
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ fontWeight: 800, color: t.texto, fontSize: '0.95rem' }}>{p.nombre}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.85rem' }}>
                    <span style={{ color: t.suave }}>{p.proteina_g ? `${p.proteina_g} g proteína` : `${p.kcal} kcal`}</span>
                    <span style={{ fontWeight: 800, color: t.priOsc }}>{pesos(p.precio)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categorías: se quedan arriba y marcan en cuál vas */}
      <div style={{
        position: 'sticky', top: 'var(--p-alto-encabezado, 0px)', zIndex: 5, background: t.fondo,
        display: 'flex', gap: 8, overflowX: 'auto', padding: ancho ? '14px 0 12px' : '12px 16px', scrollbarWidth: 'none',
        boxShadow: '0 10px 12px -12px rgba(0,0,0,0.25)',
      }}>
        {menu.categorias.map((c) => (
          <Chip key={c.id} activo={categoria === c.id} onClick={() => irACategoria(c.id)}>{c.nombre}</Chip>
        ))}
      </div>

      {menu.categorias.map((c) => {
        const lista = menu.productos.filter((p) => p.categoria_id === c.id);
        if (!lista.length) return null;
        return (
          <section key={c.id} data-cat={c.id} ref={(el) => { secciones.current[c.id] = el; }}
            style={{ padding: ancho ? '6px 0 4px' : '6px 16px 4px', scrollMarginTop: 'calc(var(--p-alto-encabezado, 0px) + 68px)' }}>
            <h2 style={{ margin: '14px 0 10px', fontFamily: t.serif, fontSize: ancho ? '1.5rem' : '1.3rem', color: t.texto }}>{c.nombre}</h2>
            <div style={{ display: 'grid', gap: ancho ? 14 : 10, gridTemplateColumns: ancho ? 'repeat(2, minmax(0, 1fr))' : '1fr' }}>
              {lista.map((p) => <TarjetaProducto key={p.id} p={p} alAbrir={() => setProducto(p)} grande={ancho} />)}
            </div>
          </section>
        );
      })}
    </>
  );

  const avisos = (
    <>
      {!negocio.abierto && (
        <div style={{ margin: ancho ? '14px 0 0' : '12px 16px 0', padding: '12px 14px', borderRadius: 14, background: '#FFF4D6', color: '#7A5B00', fontWeight: 700, fontSize: '0.9rem' }}>
          Por ahora no estamos recibiendo pedidos. Puedes ver el menú.
        </div>
      )}
      {activas.length > 0 && !ancho && (
        <button type="button" onClick={() => { setSeguimiento(activas[0].id); setPestana('pedidos'); }} style={{
          margin: '14px 16px 0', width: 'calc(100% - 32px)', border: 'none', cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 12, background: t.priOsc, color: '#fff', borderRadius: 18, padding: '14px 16px',
        }}>
          <Loader2 size={20} style={{ animation: 'spin 2s linear infinite' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>Pedido #{activas[0].folio} · {ESTADOS[activas[0].estado]}</div>
            <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>Toca para ver el seguimiento</div>
          </div>
          <ChevronRight size={20} />
        </button>
      )}
    </>
  );

  const hojas = (
    <>
      <HojaProducto producto={producto} menu={menu} alCerrar={() => setProducto(null)}
        alAgregar={(linea) => { setCarrito((c) => [...c, linea]); setProducto(null); }} />
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

  // ── Computadora: menú a la izquierda, el pedido siempre a la vista ──────────
  if (ancho) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 28px 60px', boxSizing: 'border-box' }}>
        {portada}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 32, alignItems: 'start', marginTop: 20 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 320 }}>{selectorModalidad}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Chip activo={pestana === 'menu'} onClick={() => setPestana('menu')}>Menú</Chip>
                <Chip activo={pestana === 'pedidos'} onClick={() => setPestana('pedidos')}>
                  Mis pedidos{activas.length ? ` · ${activas.length} en curso` : ''}
                </Chip>
              </div>
            </div>
            {avisos}
            {pestana === 'menu' ? (menu ? menuCompleto : <Vacio titulo="Cargando el menú…" />)
              : <MisPedidos ordenes={ordenes} abrir={setSeguimiento} sinPadding />}
          </div>
          <aside style={{ position: 'sticky', top: 'calc(var(--p-alto-encabezado, 0px) + 14px)' }}>
            <ResumenPedido carrito={carrito} setCarrito={setCarrito} subtotal={subtotal} modalidad={modalidad} mesaQR={mesaQR}
              activa={activas[0]} alVerActiva={() => setSeguimiento(activas[0].id)} alContinuar={() => setCarritoAbierto(true)} />
          </aside>
        </div>
        {hojas}
      </div>
    );
  }

  // ── Celular ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 110, minHeight: '100%' }}>
      {pestana === 'menu' && (
        <>
          {portada}
          <div style={{ padding: '16px 16px 4px' }}>{selectorModalidad}</div>
          {avisos}
          {menu ? menuCompleto : <Vacio titulo="Cargando el menú…" />}
        </>
      )}
      {pestana === 'pedidos' && <MisPedidos ordenes={ordenes} abrir={setSeguimiento} />}

      <nav style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        zIndex: 9000, width: 'min(420px, calc(100% - 24px))', display: 'flex', gap: 6, padding: 6, borderRadius: 999,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.14)', boxSizing: 'border-box',
      }}>
        <BotonBarra activo={pestana === 'menu'} onClick={() => setPestana('menu')} icono={Leaf} texto="Menú" />
        <button type="button" onClick={() => setCarritoAbierto(true)} style={{
          flex: 1.3, border: 'none', borderRadius: 999, cursor: 'pointer', padding: '10px 12px',
          background: piezas ? t.pri : 'rgba(0,0,0,0.05)', color: piezas ? '#fff' : t.suave,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: '0.88rem',
        }}>
          <ShoppingBag size={18} /> {piezas ? `${piezas} · ${pesos(subtotal)}` : 'Carrito'}
        </button>
        <BotonBarra activo={pestana === 'pedidos'} onClick={() => setPestana('pedidos')} icono={Receipt} texto="Pedidos"
          aviso={activas.length > 0} />
      </nav>
      {hojas}
    </div>
  );
}

// Columna fija del pedido en computadora.
function ResumenPedido({ carrito, setCarrito, subtotal, modalidad, mesaQR, activa, alVerActiva, alContinuar }) {
  const cambiar = (linea, delta) => setCarrito((c) => c
    .map((l) => (l.linea === linea ? { ...l, cantidad: l.cantidad + delta } : l))
    .filter((l) => l.cantidad > 0));
  const Icono = ICONO_MOD[modalidad];
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {activa && (
        <button type="button" onClick={alVerActiva} style={{
          border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
          background: t.priOsc, color: '#fff', borderRadius: 20, padding: '14px 16px',
        }}>
          <Loader2 size={20} style={{ animation: 'spin 2s linear infinite' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>Pedido #{activa.folio} · {ESTADOS[activa.estado]}</div>
            <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>Ver seguimiento</div>
          </div>
          <ChevronRight size={18} />
        </button>
      )}
      <div style={{ background: t.sup, borderRadius: 24, padding: 18, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: t.serif, fontSize: '1.35rem', fontWeight: 700, color: t.texto }}>Tu pedido</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 700, color: t.suave }}>
            <Icono size={14} /> {mesaQR ? `Mesa ${mesaQR}` : MODALIDADES[modalidad].etiqueta}
          </span>
        </div>
        {!carrito.length ? (
          <div style={{ textAlign: 'center', padding: '26px 8px 12px', color: t.suave }}>
            <ShoppingBag size={30} style={{ opacity: 0.5, marginBottom: 8 }} />
            <div style={{ fontWeight: 700, color: t.texto }}>Aún no agregas nada</div>
            <div style={{ fontSize: '0.85rem', marginTop: 2 }}>Elige algo rico del menú.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', maxHeight: 'calc(100vh - 420px)', overflowY: 'auto' }}>
              {carrito.map((l) => (
                <div key={l.linea} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${t.linea}` }}>
                  <Foto src={l.foto} alt="" style={{ width: 44, height: 44, flexShrink: 0 }} redonda={10} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: t.texto, fontSize: '0.9rem' }}>{l.nombre}</div>
                    {l.detalle.length > 0 && <div style={{ fontSize: '0.75rem', color: t.suave }}>{l.detalle.join(' · ')}</div>}
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: t.priOsc }}>{pesos(l.precioUnitario * l.cantidad)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button type="button" aria-label="Quitar uno" onClick={() => cambiar(l.linea, -1)} style={{ ...btnRedondo, width: 28, height: 28 }}>
                      {l.cantidad === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                    </button>
                    <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 800, fontSize: '0.9rem' }}>{l.cantidad}</span>
                    <button type="button" aria-label="Agregar uno" onClick={() => cambiar(l.linea, 1)} style={{ ...btnRedondo, width: 28, height: 28 }}><Plus size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '14px 0 12px', fontWeight: 800, color: t.texto }}>
              <span>Subtotal</span><span>{pesos(subtotal)}</span>
            </div>
            <Boton onClick={alContinuar} style={{ width: '100%' }}>Continuar</Boton>
          </>
        )}
      </div>
    </div>
  );
}

function BotonBarra({ activo, onClick, icono: Icono, texto, aviso }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo} style={{
      flex: 1, border: 'none', borderRadius: 999, cursor: 'pointer', padding: '10px 8px', position: 'relative',
      background: activo ? 'rgba(79,107,71,0.12)' : 'transparent', color: activo ? t.priOsc : t.suave,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 800, fontSize: '0.85rem',
    }}>
      <Icono size={18} /> {texto}
      {aviso && <span style={{ position: 'absolute', top: 7, right: 14, width: 8, height: 8, borderRadius: '50%', background: t.acento }} />}
    </button>
  );
}

function TarjetaProducto({ p, alAbrir, grande }) {
  return (
    <button type="button" onClick={p.disponible ? alAbrir : undefined} disabled={!p.disponible} style={{
      display: 'flex', gap: 12, alignItems: 'stretch', textAlign: 'left', border: 'none', padding: 10,
      background: t.sup, borderRadius: 20, cursor: p.disponible ? 'pointer' : 'default',
      boxShadow: '0 4px 14px rgba(0,0,0,0.04)', opacity: p.disponible ? 1 : 0.55, width: '100%',
    }}>
      <Foto src={p.foto} alt={p.nombre} style={{ width: grande ? 120 : 96, height: grande ? 120 : 96, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 800, color: t.texto, fontSize: '0.98rem' }}>{p.nombre}</div>
        <div style={{
          fontSize: '0.82rem', color: t.suave, marginTop: 2, lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{p.descripcion}</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {(p.etiquetas || []).slice(0, 2).map((e) => <Etiqueta key={e}>{e}</Etiqueta>)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6 }}>
          <span style={{ fontSize: '0.78rem', color: t.suave, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Flame size={13} /> {p.kcal} kcal{p.proteina_g ? ` · ${p.proteina_g} g prot.` : ''}
          </span>
          <span style={{ fontWeight: 800, color: t.priOsc }}>{p.disponible ? pesos(p.precio) : 'Agotado'}</span>
        </div>
      </div>
    </button>
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
      <Foto src={p.foto} alt={p.nombre} redonda={0} style={{ width: '100%', height: 260 }} />
      <div style={{ padding: '18px 18px 10px' }}>
        <h2 style={{ margin: 0, fontFamily: t.serif, fontSize: '1.6rem', color: t.texto }}>{p.nombre}</h2>
        <p style={{ margin: '6px 0 10px', color: t.suave, lineHeight: 1.45 }}>{p.descripcion}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Etiqueta color="#7A4A12" fondo="rgba(226,165,74,0.18)">{p.kcal} kcal</Etiqueta>
          {p.proteina_g ? <Etiqueta color="#7A4A12" fondo="rgba(226,165,74,0.18)">{p.proteina_g} g proteína</Etiqueta> : null}
          {(p.etiquetas || []).map((e) => <Etiqueta key={e}>{e}</Etiqueta>)}
        </div>

        {grupos.map((g) => (
          <div key={g.id} style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontWeight: 800, color: t.texto }}>{g.nombre}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: g.requerido ? '#9B5A00' : t.suave }}>
                {g.requerido ? 'Obligatorio · elige 1' : g.tipo === 'una' ? 'Opcional · elige 1' : 'Opcional'}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {opcionesDe(g).map((o) => {
                const on = (elegidas[g.id] || []).includes(o.id);
                return (
                  <button key={o.id} type="button" onClick={() => elegir(g, o)} aria-pressed={on} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                    border: on ? `2px solid ${t.pri}` : `1px solid ${t.linea}`, background: t.sup, textAlign: 'left',
                  }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: g.tipo === 'una' ? '50%' : 6, flexShrink: 0,
                      border: on ? 'none' : `2px solid ${t.linea}`, background: on ? t.pri : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{on && <Check size={13} color="#fff" strokeWidth={3} />}</span>
                    <span style={{ flex: 1, color: t.texto, fontWeight: 600 }}>{o.nombre}</span>
                    {Number(o.precio_extra) > 0 && <span style={{ color: t.suave, fontWeight: 700 }}>+{pesos(o.precio_extra)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <label style={{ display: 'block', marginTop: 18, fontWeight: 800, color: t.texto }}>
          Indicaciones para cocina
          <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 200))} rows={2}
            placeholder="Ej. sin cebolla, salsa aparte"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 8, padding: 12, borderRadius: 14, border: `1px solid ${t.linea}`, fontSize: '0.95rem', fontFamily: 'inherit', resize: 'none', background: t.sup, color: t.texto }} />
        </label>
      </div>

      <div style={{
        position: 'sticky', bottom: 0, display: 'flex', gap: 12, alignItems: 'center', padding: '12px 18px 16px',
        background: t.fondo, borderTop: `1px solid ${t.linea}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.sup, borderRadius: 999, padding: 4, border: `1px solid ${t.linea}` }}>
          <button type="button" aria-label="Menos" onClick={() => setCantidad((c) => Math.max(1, c - 1))} style={btnRedondo}><Minus size={16} /></button>
          <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 800 }}>{cantidad}</span>
          <button type="button" aria-label="Más" onClick={() => setCantidad((c) => Math.min(20, c + 1))} style={btnRedondo}><Plus size={16} /></button>
        </div>
        <Boton onClick={agregar} disabled={faltan.length > 0} style={{ flex: 1 }}>
          {faltan.length ? `Elige ${faltan[0].nombre.toLowerCase()}` : `Agregar · ${pesos(unitario * cantidad)}`}
        </Boton>
      </div>
    </Hoja>
  );
}

const btnRedondo = {
  width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.05)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#22301E',
};

const campo = {
  display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '12px 14px', borderRadius: 14,
  border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.95rem', fontFamily: 'inherit', background: '#fff', color: '#22301E',
};

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
      <div style={{ padding: '20px 18px 8px' }}>
        <h2 style={{ margin: '0 0 14px', fontFamily: t.serif, fontSize: '1.6rem', color: t.texto }}>Tu pedido</h2>
        {!carrito.length && <Vacio icono={ShoppingBag} titulo="Tu carrito está vacío" texto="Agrega algo rico del menú." />}

        {carrito.map((l) => (
          <div key={l.linea} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${t.linea}` }}>
            <Foto src={l.foto} alt="" style={{ width: 56, height: 56, flexShrink: 0 }} redonda={12} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: t.texto }}>{l.nombre}</div>
              {(l.detalle.length > 0 || l.nota) && (
                <div style={{ fontSize: '0.8rem', color: t.suave }}>{[...l.detalle, l.nota && `“${l.nota}”`].filter(Boolean).join(' · ')}</div>
              )}
              <div style={{ fontWeight: 700, color: t.priOsc, fontSize: '0.9rem', marginTop: 2 }}>{pesos(l.precioUnitario * l.cantidad)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button type="button" aria-label="Quitar uno" onClick={() => cambiar(l.linea, -1)} style={btnRedondo}>
                {l.cantidad === 1 ? <Trash2 size={15} /> : <Minus size={15} />}
              </button>
              <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 800 }}>{l.cantidad}</span>
              <button type="button" aria-label="Agregar uno" onClick={() => cambiar(l.linea, 1)} style={btnRedondo}><Plus size={15} /></button>
            </div>
          </div>
        ))}

        {carrito.length > 0 && (
          <>
            <h3 style={tituloSeccion}>¿Cómo lo quieres?</h3>
            {setModalidad ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {negocio.modalidades.map((m) => {
                  const Icono = ICONO_MOD[m];
                  return <Chip key={m} activo={modalidad === m} onClick={() => setModalidad(m)}><Icono size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />{MODALIDADES[m].etiqueta}</Chip>;
                })}
              </div>
            ) : (
              <div style={{ fontWeight: 700, color: t.texto }}>En la mesa {mesaQR}</div>
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
                <button key={id} type="button" onClick={() => setMetodo(id)} aria-pressed={metodo === id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 14, cursor: 'pointer',
                  border: metodo === id ? `2px solid ${t.pri}` : `1px solid ${t.linea}`, background: t.sup, color: t.texto, fontWeight: 700,
                }}>
                  <Icono size={18} color={t.pri} /> {texto}
                  {metodo === id && <Check size={18} color={t.pri} style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 18, padding: 14, borderRadius: 16, background: t.sup, border: `1px solid ${t.linea}` }}>
              <Fila izq="Subtotal" der={pesos(subtotal)} />
              {modalidad === 'domicilio' && <Fila izq="Envío" der={envio ? pesos(envio) : 'Gratis'} />}
              {modalidad === 'domicilio' && envio > 0 && falta > 0 && (
                <div style={{ fontSize: '0.78rem', color: t.suave, marginTop: 2 }}>Te faltan {pesos(falta)} para envío gratis.</div>
              )}
              <div style={{ borderTop: `1px solid ${t.linea}`, marginTop: 8, paddingTop: 8 }}>
                <Fila izq={<strong>Total</strong>} der={<strong>{pesos(subtotal + envio)}</strong>} />
              </div>
            </div>
            {usuario && <div style={{ fontSize: '0.78rem', color: t.suave, marginTop: 8 }}>Pedido a nombre de {usuario}</div>}
            {error && <p role="alert" style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: 12, background: '#FDECEC', color: '#9B1C1C', fontWeight: 600, fontSize: '0.88rem' }}>{error}</p>}
          </>
        )}
      </div>
      {carrito.length > 0 && (
        <div style={{ position: 'sticky', bottom: 0, padding: '12px 18px 16px', background: t.fondo, borderTop: `1px solid ${t.linea}` }}>
          <Boton onClick={pedir} disabled={enviando || !negocio.abierto} style={{ width: '100%' }}>
            {enviando ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {!negocio.abierto ? 'Cerrado por ahora' : metodo === 'tarjeta' ? `Continuar al pago · ${pesos(subtotal + envio)}` : `Hacer pedido · ${pesos(subtotal + envio)}`}
          </Boton>
        </div>
      )}
    </Hoja>
  );
}

const tituloSeccion = { margin: '22px 0 10px', fontSize: '1rem', fontWeight: 800, color: '#22301E' };
const etiquetaCampo = { display: 'block', marginTop: 12, fontSize: '0.85rem', fontWeight: 700, color: '#22301E' };

function Fila({ izq, der }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: t.texto, padding: '2px 0' }}>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9700, background: 'rgba(15,20,14,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-label="Pago" style={{ width: 'min(420px, 100%)', background: '#fff', borderRadius: 24, padding: 22, boxSizing: 'border-box', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', color: t.texto }}>
        {aprobado ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <CheckCircle2 size={58} color={t.pri} style={{ marginBottom: 10 }} />
            <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem' }}>Pago aprobado</h2>
            <p style={{ margin: '0 0 4px' }}>{pesos(orden?.total)} · tarjeta terminación {tarjeta.replace(/\D/g, '').slice(-4)}</p>
            <p style={{ margin: '0 0 20px', color: t.suave, fontSize: '0.88rem' }}>Tu pedido #{orden?.folio} ya está en la cocina.</p>
            <Boton onClick={alPagar} style={{ width: '100%' }}>Ver mi pedido</Boton>
          </div>
        ) : (
          <>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', background: '#FFF4D6', color: '#7A5B00', padding: '5px 10px', borderRadius: 999 }}>
              Pasarela de prueba · no se cobra nada
            </span>
            <h2 style={{ margin: '14px 0 2px', fontSize: '1.3rem' }}>{negocio.nombre}</h2>
            <p style={{ margin: '0 0 14px', color: t.suave, fontSize: '0.88rem' }}>Pedido #{orden?.folio ?? '…'} · {pesos(orden?.total)}</p>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700 }}>Número de tarjeta
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${t.linea}`, borderRadius: 12, padding: '0 12px', marginTop: 6 }}>
                <CreditCard size={18} style={{ opacity: 0.6 }} />
                <input value={tarjeta} inputMode="numeric" autoComplete="off"
                  onChange={(e) => setTarjeta(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '))}
                  style={{ border: 'none', outline: 'none', padding: '12px 0', fontSize: '1rem', width: '100%', letterSpacing: '0.04em', color: t.texto }} />
              </div>
            </label>
            <div style={{ display: 'flex', gap: 6, margin: '8px 0 12px' }}>
              {TARJETAS.map(([n, e]) => (
                <button key={n} type="button" onClick={() => setTarjeta(n)} style={{ border: `1px solid ${t.linea}`, borderRadius: 999, padding: '5px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', background: tarjeta === n ? '#F0ECE6' : '#fff', color: t.texto }}>
                  {e} · {n.slice(-4)}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <input readOnly value="12 / 34" aria-label="Vencimiento" style={{ ...campo, marginTop: 0, flex: 1 }} />
              <input readOnly value="123" aria-label="CVC" style={{ ...campo, marginTop: 0, flex: 1 }} />
            </div>
            {error && <p role="alert" style={{ margin: '0 0 12px', padding: '10px 12px', borderRadius: 12, background: '#FDECEC', color: '#9B1C1C', fontWeight: 600, fontSize: '0.85rem' }}>{error}</p>}
            <Boton onClick={pagar} disabled={enviando || !orden} style={{ width: '100%' }}>
              {enviando ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={16} />}
              {enviando ? 'Procesando…' : `Pagar ${pesos(orden?.total)}`}
            </Boton>
            <Boton variante="borde" onClick={cancelar} disabled={enviando} style={{ width: '100%', marginTop: 8 }}>Volver al carrito</Boton>
          </>
        )}
      </div>
    </div>
  );
}

function MisPedidos({ ordenes, abrir, sinPadding }) {
  const lista = (ordenes || []).filter((o) => o.estado !== 'pendiente_pago');
  return (
    <div style={{ padding: sinPadding ? '24px 0' : '24px 16px' }}>
      <h1 style={{ margin: '0 0 14px', fontFamily: t.serif, fontSize: '1.9rem', color: t.texto }}>Mis pedidos</h1>
      {!ordenes && <Vacio titulo="Cargando…" />}
      {ordenes && !lista.length && <Vacio icono={Receipt} titulo="Aún no has pedido" texto="Tus pedidos aparecerán aquí." />}
      <div style={{ display: 'grid', gap: 10 }}>
        {lista.map((o) => {
          const vivo = !['entregado', 'cancelado'].includes(o.estado);
          return (
            <button key={o.id} type="button" onClick={() => abrir(o.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, border: vivo ? `2px solid ${t.pri}` : 'none',
              background: t.sup, textAlign: 'left', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                  <strong style={{ color: t.texto }}>#{o.folio}</strong>
                  <Etiqueta color={vivo ? '#fff' : t.suave} fondo={vivo ? t.pri : 'rgba(0,0,0,0.06)'}>{ESTADOS[o.estado]}</Etiqueta>
                </div>
                <div style={{ fontSize: '0.85rem', color: t.texto, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.items.map((l) => `${l.cantidad}× ${l.nombre}`).join(', ')}
                </div>
                <div style={{ fontSize: '0.78rem', color: t.suave, marginTop: 2 }}>
                  {modalidadDe(o)} · {new Date(o.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
              <strong style={{ color: t.priOsc }}>{pesos(o.total)}</strong>
              <ChevronRight size={18} color={t.suave} />
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

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={`Pedido ${o.folio}`}>
      <div style={{ padding: '26px 20px 24px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: t.suave, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pedido #{o.folio}</div>
        <h2 style={{ margin: '4px 0 4px', fontFamily: t.serif, fontSize: '1.7rem', color: t.texto }}>
          {cancelado ? 'Cancelado' : ESTADOS[o.estado === 'listo' && o.modalidad === 'domicilio' ? 'preparando' : o.estado]}
        </h2>
        <p style={{ margin: '0 0 18px', color: t.suave }}>{mensaje}</p>

        {!cancelado && (
          <div style={{ display: 'grid', gap: 0, marginBottom: 18 }}>
            {pasos.map(([clave, texto], i) => {
              const hecho = i < actual || o.estado === 'entregado';
              const ahora = i === actual && o.estado !== 'entregado';
              return (
                <div key={clave} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: hecho ? t.pri : ahora ? t.acento : 'rgba(0,0,0,0.08)', color: '#fff', flexShrink: 0,
                      boxShadow: ahora ? '0 0 0 6px rgba(226,165,74,0.22)' : 'none',
                    }}>{hecho ? <Check size={15} strokeWidth={3} /> : ahora ? <Loader2 size={14} style={{ animation: 'spin 1.6s linear infinite' }} /> : null}</span>
                    {i < pasos.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 22, background: hecho ? t.pri : 'rgba(0,0,0,0.08)' }} />}
                  </div>
                  <div style={{ paddingBottom: 16, fontWeight: ahora ? 800 : 600, color: hecho || ahora ? t.texto : t.suave }}>{texto}</div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ padding: 14, borderRadius: 16, background: t.sup, border: `1px solid ${t.linea}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: t.texto, marginBottom: 8 }}>
            {o.modalidad === 'domicilio' ? <MapPin size={16} /> : o.modalidad === 'mesa' ? <Utensils size={16} /> : <Store size={16} />}
            {o.modalidad === 'domicilio' ? o.direccion : modalidadDe(o)}
          </div>
          {o.items.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '3px 0', color: t.texto }}>
              <span>{l.cantidad}× {l.nombre}{l.opciones?.length ? <span style={{ color: t.suave }}> · {l.opciones.map((x) => x.nombre).join(', ')}</span> : null}</span>
              <span>{pesos(l.total)}</span>
            </div>
          ))}
          {Number(o.envio) > 0 && <Fila izq="Envío" der={pesos(o.envio)} />}
          <div style={{ borderTop: `1px solid ${t.linea}`, marginTop: 8, paddingTop: 8 }}>
            <Fila izq={<strong>Total</strong>} der={<strong>{pesos(o.total)}</strong>} />
          </div>
          <div style={{ fontSize: '0.8rem', color: t.suave, marginTop: 6 }}>
            {o.metodo_pago === 'tarjeta' ? 'Pagado con tarjeta (prueba)' : { recoger: 'Pagas al recoger', mesa: 'Pagas en caja', domicilio: 'Pagas al recibir' }[o.modalidad]}
          </div>
        </div>
        <p style={{ textAlign: 'center', color: t.suave, fontSize: '0.8rem', marginTop: 14 }}>
          {negocio.nombre} · {negocio.telefono}
        </p>
      </div>
    </Hoja>
  );
}
