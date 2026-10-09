import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Clock, Coffee, Gift, Leaf } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { a, vidrio } from '../estilo';
import { Chip } from '../ui';
import { Encabezado } from './Panel';

// ─────────────────────────────────────────────────────────────────────────────
// BARRA (cafetería) — Studio Alma. Misma lógica que Barista.jsx de Be Fit:
// pedidos pagados en tiempo real; Preparar → Marcar listo → Entregado. Al
// quedar listo se avisa a quien recoge (en un regalo, a la persona regalada).
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNAS = [
  { clave: 'paid', titulo: 'Nuevos', siguiente: 'preparing', accion: 'Preparar', punto: '#CDB896' },
  { clave: 'preparing', titulo: 'Preparando', siguiente: 'ready', accion: 'Marcar listo', punto: '#889063' },
  { clave: 'ready', titulo: 'Listos', siguiente: 'completed', accion: 'Entregado', punto: '#354024' },
];
const POR_CLAVE = Object.fromEntries(COLUMNAS.map((c) => [c.clave, c]));

const hace = (iso, ahora) => {
  const m = Math.floor((ahora - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
};
const ahoraMs = () => Date.now();

export default function Barra({ seccion }) {
  const [pedidos, setPedidos] = useState(null);
  const [ahora, setAhora] = useState(ahoraMs);

  const cargar = async () => {
    const { data } = await supabase.from('cafe_orders').select('*, buyer:user_id(full_name)')
      .neq('status', 'pending_payment').order('created_at', { ascending: false }).limit(120);
    setPedidos(data || []);
  };

  useEffect(() => {
    cargar();
    const canal = supabase.channel(`alma-barra-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_orders' }, () => cargar())
      .subscribe();
    const reloj = setInterval(() => setAhora(ahoraMs()), 30000);
    return () => { supabase.removeChannel(canal); clearInterval(reloj); };
  }, []);

  const avanzar = async (p) => {
    const siguiente = POR_CLAVE[p.status]?.siguiente;
    if (!siguiente) return;
    setPedidos((ps) => ps.map((o) => (o.id === p.id ? { ...o, status: siguiente } : o)));
    const { error } = await supabase.from('cafe_orders').update({ status: siguiente }).eq('id', p.id);
    if (error) { cargar(); return; }
    if (siguiente === 'ready') {
      const destino = p.gift_recipient_user_id || p.user_id;
      if (destino) {
        supabase.functions.invoke('send-push', {
          body: { userId: destino, title: '¡Tu pedido está listo!', body: 'Pásalo a recoger en la barra.', type: 'payment' },
        }).catch(() => {});
      }
    }
  };

  const porEstado = useMemo(() => {
    const g = { paid: [], preparing: [], ready: [] };
    (pedidos || []).forEach((o) => { if (g[o.status]) g[o.status].push(o); });
    Object.values(g).forEach((l) => l.sort((x, y) => new Date(x.created_at) - new Date(y.created_at)));
    return g;
  }, [pedidos]);
  const activos = porEstado.paid.length + porEstado.preparing.length + porEstado.ready.length;
  const historial = (pedidos || []).filter((o) => o.status === 'completed' || o.status === 'cancelled');

  if (seccion === 'historial') {
    return (
      <>
        <Encabezado ligero="Pedidos" fuerte="entregados" sub="Los últimos pedidos de la cafetería." />
        {!historial.length && <Vacio texto="Sin historial todavía." />}
        <div style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
          {historial.map((p) => <Pedido key={p.id} p={p} ahora={ahora} />)}
        </div>
      </>
    );
  }

  return (
    <>
      <Encabezado ligero="La" fuerte="barra" sub={pedidos === null ? 'Cargando pedidos…' : `${activos} ${activos === 1 ? 'pedido activo' : 'pedidos activos'} · llegan en tiempo real.`} />
      {pedidos !== null && !activos && <Vacio texto="Sin pedidos activos" sub="Los pedidos nuevos aparecen aquí al instante." />}
      {activos > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, alignItems: 'start' }}>
          {COLUMNAS.map((col) => (
            <section key={col.clave} style={{ ...vidrio, borderRadius: 30, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 12px' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: col.punto }} />
                <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{col.titulo}</h2>
                <span style={{ marginLeft: 'auto', fontSize: '1.3rem', fontWeight: 300 }}>{porEstado[col.clave].length}</span>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {!porEstado[col.clave].length && <div style={{ textAlign: 'center', color: a.suave, fontSize: '0.84rem', padding: '18px 0' }}>—</div>}
                {porEstado[col.clave].map((p) => <Pedido key={p.id} p={p} ahora={ahora} alAvanzar={() => avanzar(p)} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Pedido({ p, ahora, alAvanzar }) {
  const col = POR_CLAVE[p.status];
  return (
    <div style={{ background: a.solido, borderRadius: 22, padding: 14, boxShadow: '0 6px 18px var(--a-sombra)', animation: 'alma-entra .35s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontWeight: 700, flex: 1 }}>{p.buyer?.full_name || 'Clienta'}</span>
        <span style={{ fontSize: '0.72rem', color: a.suave }}>{hace(p.created_at, ahora)} · #{p.id.slice(0, 4)}</span>
      </div>
      {(p.pickup_time || p.no_straw || p.is_gift) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {p.pickup_time && <Chip claro><Clock size={12} /> {new Date(p.pickup_time).toLocaleString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</Chip>}
          {p.no_straw && <Chip claro><Leaf size={12} /> Sin popote</Chip>}
          {p.is_gift && <Chip claro><Gift size={12} /> Regalo{p.gift_recipient_name ? ` · ${p.gift_recipient_name}` : ''}</Chip>}
        </div>
      )}
      <div style={{ display: 'grid', gap: 8, margin: '12px 0' }}>
        {(p.items || []).map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 10 }}>
            <span style={{ minWidth: 26, height: 26, borderRadius: 9, background: a.tenue, fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.qty}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{it.name}</div>
              {it.options?.length > 0 && <div style={{ fontSize: '0.78rem', color: a.suave }}>{it.options.map((o) => o.name).join(' · ')}</div>}
              {it.notes && <div style={{ fontSize: '0.76rem', color: a.suave, fontStyle: 'italic' }}>“{it.notes}”</div>}
            </div>
          </div>
        ))}
      </div>
      {p.gift_message && <div style={{ fontSize: '0.82rem', background: a.tenue, borderRadius: 12, padding: '8px 10px', marginBottom: 10 }}>“{p.gift_message}”</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--a-linea)', paddingTop: 10 }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 300 }}>${p.total}</span>
        {col && alAvanzar ? (
          <button type="button" onClick={alAvanzar} style={{
            border: 'none', cursor: 'pointer', background: a.tinta, color: a.sobreTinta, fontWeight: 600, fontSize: '0.86rem',
            padding: '10px 16px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {p.status === 'ready' && <CheckCircle2 size={15} />}{col.accion}<ChevronRight size={15} />
          </button>
        ) : (
          <span style={{ fontSize: '0.78rem', color: a.suave }}>{p.status === 'cancelled' ? 'Cancelado' : 'Entregado'}</span>
        )}
      </div>
    </div>
  );
}

function Vacio({ texto, sub }) {
  return (
    <div style={{ ...vidrio, borderRadius: 30, padding: '50px 20px', textAlign: 'center', color: a.suave }}>
      <Coffee size={30} />
      <div style={{ fontWeight: 700, color: a.tinta, marginTop: 10 }}>{texto}</div>
      {sub && <div style={{ fontSize: '0.86rem', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
