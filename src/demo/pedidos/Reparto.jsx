import { useState } from 'react';
import { Bike, MapPin, Navigation, Phone, Wallet, CreditCard, Loader2, PackageCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { pesos, minutosDesde, errorLegible, useOrdenes, useAhora } from './datos';
import { t, Boton, Etiqueta, Vacio } from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// REPARTO — los pedidos a domicilio que la cocina dejó listos, y los que van
// en camino. "Salir a entregar" y "Entregado" avisan al cliente en vivo.
// ─────────────────────────────────────────────────────────────────────────────

export default function Reparto({ negocio }) {
  // Fijo al montar: si cambiara en cada render, la suscripción se rehace sin parar.
  const [desde] = useState(() => new Date(Date.now() - 36 * 3600000).toISOString());
  const { ordenes, recargar } = useOrdenes(negocio.id, { desde });
  const ahora = useAhora(20000);
  const domicilio = (ordenes || []).filter((o) => o.modalidad === 'domicilio');
  const porSalir = domicilio.filter((o) => o.estado === 'listo');
  const enCamino = domicilio.filter((o) => o.estado === 'en_camino');
  const enCocina = domicilio.filter((o) => ['recibido', 'preparando'].includes(o.estado));
  const entregadosHoy = domicilio.filter((o) => o.estado === 'entregado'
    && new Date(o.actualizado_at).toDateString() === new Date().toDateString()).length;

  return (
    <div style={{ padding: '18px 16px 40px', maxWidth: 620, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <span style={{ width: 44, height: 44, borderRadius: 14, background: t.priOsc, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bike size={22} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: t.suave, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{negocio.nombre} · Reparto</div>
          <div style={{ fontFamily: t.serif, fontSize: '1.5rem', fontWeight: 700, color: t.texto }}>Entregas</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: t.suave }}>
          <strong style={{ display: 'block', fontSize: '1.2rem', color: t.texto }}>{entregadosHoy}</strong> entregados hoy
        </div>
      </div>

      {!ordenes && <Vacio titulo="Cargando…" />}

      {ordenes && (
        <>
          <Seccion titulo="En camino" lista={enCamino} ahora={ahora} accion="entregado" textoAccion="Marcar entregado" alCambiar={recargar} />
          <Seccion titulo="Listos para salir" lista={porSalir} ahora={ahora} accion="en_camino" textoAccion="Salir a entregar" alCambiar={recargar} />
          {enCocina.length > 0 && (
            <p style={{ color: t.suave, fontSize: '0.88rem', textAlign: 'center', marginTop: 18 }}>
              {enCocina.length} {enCocina.length === 1 ? 'pedido se está preparando' : 'pedidos se están preparando'} en cocina.
            </p>
          )}
          {!porSalir.length && !enCamino.length && (
            <Vacio icono={PackageCheck} titulo="Todo entregado" texto="Cuando la cocina termine un pedido a domicilio, aparecerá aquí." />
          )}
        </>
      )}
    </div>
  );
}

function Seccion({ titulo, lista, ahora, accion, textoAccion, alCambiar }) {
  if (!lista.length) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 800, color: t.texto }}>{titulo} · {lista.length}</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {lista.map((o) => <Entrega key={o.id} o={o} ahora={ahora} accion={accion} textoAccion={textoAccion} alCambiar={alCambiar} />)}
      </div>
    </div>
  );
}

function Entrega({ o, ahora, accion, textoAccion, alCambiar }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.direccion || '')}`;

  const avanzar = async () => {
    setEnviando(true); setError('');
    const { error: e } = await supabase.rpc('pedidos_avanzar', { p_orden: o.id, p_estado: accion });
    setEnviando(false);
    if (e) setError(errorLegible(e));
    else alCambiar();
  };

  return (
    <div style={{ background: t.sup, borderRadius: 20, padding: 16, boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: '1.1rem', color: t.texto }}>#{o.folio}</strong>
        <span style={{ color: t.texto, fontWeight: 700 }}>{o.cliente_nombre}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: t.suave, fontWeight: 700 }}>hace {minutosDesde(o.created_at, ahora)} min</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: t.texto, marginBottom: 4 }}>
        <MapPin size={17} style={{ flexShrink: 0, marginTop: 2 }} color={t.pri} />
        <div>
          <div style={{ fontWeight: 700 }}>{o.direccion}</div>
          {o.referencia && <div style={{ fontSize: '0.85rem', color: t.suave }}>{o.referencia}</div>}
        </div>
      </div>
      <div style={{ fontSize: '0.85rem', color: t.suave, margin: '6px 0 10px' }}>
        {o.items.map((l) => `${l.cantidad}× ${l.nombre}`).join(', ')}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        {o.metodo_pago === 'tarjeta'
          ? <Etiqueta><CreditCard size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />Pagado</Etiqueta>
          : <Etiqueta color="#9A3412" fondo="rgba(194,65,12,0.1)"><Wallet size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />Cobrar {pesos(o.total)}</Etiqueta>}
        {o.telefono && <a href={`tel:${o.telefono.replace(/\s/g, '')}`} style={{ fontSize: '0.82rem', color: t.priOsc, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}><Phone size={13} /> {o.telefono}</a>}
      </div>
      {error && <p role="alert" style={{ margin: '0 0 8px', color: '#9B1C1C', fontSize: '0.82rem', fontWeight: 600 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <a href={mapa} target="_blank" rel="noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 14px', borderRadius: 16,
          background: 'var(--p-pri-10)', color: t.priOsc, fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem',
        }}><Navigation size={16} /> Mapa</a>
        <Boton onClick={avanzar} disabled={enviando} style={{ flex: 1, fontSize: '0.92rem' }}>
          {enviando && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />} {textoAccion}
        </Boton>
      </div>
    </div>
  );
}
