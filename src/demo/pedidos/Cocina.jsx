import { useEffect, useRef, useState } from 'react';
import { Bike, ChefHat, Clock, Store, Utensils, Wallet, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { pesos, modalidadDe, minutosDesde, errorLegible, useOrdenes, useAhora } from './datos';
import { t, Boton, Etiqueta, Vacio } from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// TABLERO DE COCINA — los pedidos entran solos (tiempo real). Cada tarjeta
// avanza con un toque; los de domicilio, al quedar listos, pasan al reparto.
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNAS = [
  { estado: 'recibido', titulo: 'Nuevos', accion: 'preparando', textoAccion: 'Empezar' },
  { estado: 'preparando', titulo: 'Preparando', accion: 'listo', textoAccion: 'Marcar listo' },
  { estado: 'listo', titulo: 'Listos', accion: 'entregado', textoAccion: 'Entregado' },
];

const ICONO = { recoger: Store, mesa: Utensils, domicilio: Bike };

export default function Cocina({ negocio }) {
  // Fijo al montar: si cambiara en cada render, la suscripción se rehace sin parar.
  const [desde] = useState(() => new Date(Date.now() - 36 * 3600000).toISOString());
  const { ordenes, recargar } = useOrdenes(negocio.id, { desde });
  const ahora = useAhora(20000);
  const [movil, setMovil] = useState(window.innerWidth < 900);
  const [columnaMovil, setColumnaMovil] = useState('recibido');
  const [nuevos, setNuevos] = useState(new Set());
  const vistos = useRef(null);

  useEffect(() => {
    const r = () => setMovil(window.innerWidth < 900);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  // Resalta lo que entra mientras la pantalla está abierta.
  useEffect(() => {
    if (!ordenes) return;
    const ids = ordenes.filter((o) => o.estado === 'recibido').map((o) => o.id);
    if (vistos.current) {
      const llegaron = ids.filter((id) => !vistos.current.has(id));
      if (llegaron.length) {
        setNuevos((s) => new Set([...s, ...llegaron]));
        setTimeout(() => setNuevos((s) => { const c = new Set(s); llegaron.forEach((id) => c.delete(id)); return c; }), 6000);
      }
    }
    vistos.current = new Set(ids);
  }, [ordenes]);

  const porEstado = (e) => (ordenes || []).filter((o) => o.estado === e)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const hoy = (ordenes || []).filter((o) => o.estado === 'entregado'
    && new Date(o.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <div style={{ padding: '18px 16px 40px', maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span style={{ width: 44, height: 44, borderRadius: 14, background: t.priOsc, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChefHat size={22} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: t.suave, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{negocio.nombre} · Cocina</div>
          <div style={{ fontFamily: t.serif, fontSize: '1.5rem', fontWeight: 700, color: t.texto }}>Pedidos</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: t.suave }}>
          <strong style={{ display: 'block', fontSize: '1.2rem', color: t.texto }}>{hoy}</strong> entregados hoy
        </div>
      </div>

      {movil && (
        <div style={{ display: 'flex', gap: 6, background: t.sup, padding: 5, borderRadius: 999, marginBottom: 14, border: `1px solid ${t.linea}` }}>
          {COLUMNAS.map((c) => {
            const n = porEstado(c.estado).length;
            const activa = columnaMovil === c.estado;
            return (
              <button key={c.estado} type="button" onClick={() => setColumnaMovil(c.estado)} style={{
                flex: 1, border: 'none', borderRadius: 999, padding: '9px 4px', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem',
                background: activa ? t.priOsc : 'transparent', color: activa ? '#fff' : t.texto,
              }}>{c.titulo} {n > 0 && `(${n})`}</button>
            );
          })}
        </div>
      )}

      {!ordenes ? <Vacio titulo="Cargando pedidos…" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: movil ? '1fr' : 'repeat(3, 1fr)', gap: 14, alignItems: 'start' }}>
          {COLUMNAS.filter((c) => !movil || c.estado === columnaMovil).map((c) => {
            const lista = porEstado(c.estado);
            return (
              <div key={c.estado} style={{ background: 'var(--p-pri-6)', borderRadius: 22, padding: 12, minHeight: 200 }}>
                {!movil && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 6px 10px' }}>
                    <span style={{ fontWeight: 800, color: t.texto }}>{c.titulo}</span>
                    <span style={{ fontWeight: 800, color: t.suave }}>{lista.length}</span>
                  </div>
                )}
                {!lista.length && <p style={{ textAlign: 'center', color: t.suave, fontSize: '0.88rem', margin: '30px 0' }}>Sin pedidos</p>}
                <div style={{ display: 'grid', gap: 10 }}>
                  {lista.map((o) => <Ticket key={o.id} o={o} col={c} ahora={ahora} negocio={negocio} nuevo={nuevos.has(o.id)} alCambiar={recargar} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Ticket({ o, col, ahora, negocio, nuevo, alCambiar }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const min = minutosDesde(o.created_at, ahora);
  const tarde = o.estado !== 'listo' && min > negocio.tiempo_prep_min;
  const Icono = ICONO[o.modalidad];
  const esperaReparto = o.estado === 'listo' && o.modalidad === 'domicilio';

  const avanzar = async (estado) => {
    setEnviando(true); setError('');
    const { error: e } = await supabase.rpc('pedidos_avanzar', { p_orden: o.id, p_estado: estado });
    setEnviando(false);
    if (e) setError(errorLegible(e));
    else alCambiar();
  };

  return (
    <div style={{
      background: t.sup, borderRadius: 18, padding: 14, boxShadow: nuevo ? '0 0 0 3px #E2A54A, 0 10px 24px rgba(226,165,74,0.35)' : '0 4px 14px rgba(0,0,0,0.05)',
      transition: 'box-shadow .3s ease', borderLeft: `5px solid ${tarde ? '#C2410C' : 'transparent'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: '1.15rem', color: t.texto }}>#{o.folio}</strong>
        <Etiqueta color="#fff" fondo={o.modalidad === 'mesa' ? 'var(--p-pri)' : o.modalidad === 'domicilio' ? '#9A6A1F' : 'var(--p-pri-osc)'}>
          <Icono size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />{modalidadDe(o)}
        </Etiqueta>
        {nuevo && <Etiqueta color="#7A4A12" fondo="rgba(226,165,74,0.25)">Nuevo</Etiqueta>}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 800, color: tarde ? '#C2410C' : t.suave }}>
          <Clock size={14} /> {min} min
        </span>
      </div>
      <div style={{ fontSize: '0.85rem', color: t.suave, marginBottom: 8 }}>{o.cliente_nombre}</div>
      <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
        {o.items.map((l, i) => (
          <div key={i} style={{ fontSize: '0.95rem', color: t.texto }}>
            <strong>{l.cantidad}×</strong> {l.nombre}
            {l.opciones?.length > 0 && <div style={{ fontSize: '0.8rem', color: t.suave, marginLeft: 22 }}>{l.opciones.map((x) => x.nombre).join(' · ')}</div>}
            {l.nota && <div style={{ fontSize: '0.8rem', color: '#9A3412', fontWeight: 700, marginLeft: 22 }}>“{l.nota}”</div>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: o.metodo_pago === 'tarjeta' ? 'var(--p-pri-osc)' : '#9A3412', marginBottom: 10 }}>
        {o.metodo_pago === 'tarjeta' ? <><CreditCard size={14} /> Pagado</> : <><Wallet size={14} /> Cobrar {pesos(o.total)} en efectivo</>}
      </div>
      {error && <p role="alert" style={{ margin: '0 0 8px', color: '#9B1C1C', fontSize: '0.82rem', fontWeight: 600 }}>{error}</p>}
      {esperaReparto ? (
        <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#9A6A1F', padding: 8, background: 'rgba(226,165,74,0.14)', borderRadius: 12 }}>
          Esperando al repartidor
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <Boton onClick={() => avanzar(col.accion)} disabled={enviando} style={{ flex: 1, padding: '11px 14px', fontSize: '0.92rem' }}>
            {enviando && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />} {col.textoAccion}
          </Boton>
          {o.estado !== 'listo' && (
            <Boton variante="peligro" onClick={() => avanzar('cancelado')} disabled={enviando} style={{ padding: '11px 12px', fontSize: '0.85rem' }}>
              Cancelar
            </Boton>
          )}
        </div>
      )}
    </div>
  );
}
