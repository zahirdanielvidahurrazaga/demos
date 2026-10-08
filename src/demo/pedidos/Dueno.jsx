import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BarChart3, LayoutGrid, Printer, QrCode, Settings, Store, Bike, Utensils } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { pesos, MODALIDADES, errorLegible, useMenu, useOrdenes } from './datos';
import { t, Boton, Chip, Foto, Vacio } from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// PANEL DEL DUEÑO — ventas del día, menú (precio y agotados en vivo), los QR
// de cada mesa para imprimir y los ajustes del negocio.
// ─────────────────────────────────────────────────────────────────────────────

const PESTANAS = [
  ['hoy', 'Hoy', BarChart3], ['menu', 'Menú', LayoutGrid], ['mesas', 'Mesas QR', QrCode], ['ajustes', 'Ajustes', Settings],
];

export default function Dueno({ negocio, alCambiarNegocio }) {
  const [pestana, setPestana] = useState('hoy');
  return (
    <div style={{ padding: '18px 16px 40px', maxWidth: 980, margin: '0 auto' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: t.suave, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{negocio.nombre} · Dirección</div>
      <div style={{ fontFamily: t.serif, fontSize: '1.6rem', fontWeight: 700, color: t.texto, marginBottom: 12 }}>Tu negocio hoy</div>
      <div className="pedidos-no-imprimir" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 14, scrollbarWidth: 'none' }}>
        {PESTANAS.map(([id, texto, Icono]) => (
          <Chip key={id} activo={pestana === id} onClick={() => setPestana(id)}>
            <Icono size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />{texto}
          </Chip>
        ))}
      </div>
      {pestana === 'hoy' && <Resumen negocio={negocio} />}
      {pestana === 'menu' && <EditorMenu negocio={negocio} />}
      {pestana === 'mesas' && <Mesas negocio={negocio} />}
      {pestana === 'ajustes' && <Ajustes negocio={negocio} alCambiar={alCambiarNegocio} />}
    </div>
  );
}

function Tarjeta({ children, style }) {
  return <div style={{ background: t.sup, borderRadius: 20, padding: 16, boxShadow: '0 4px 14px rgba(0,0,0,0.04)', ...style }}>{children}</div>;
}

function Resumen({ negocio }) {
  // Fijo al montar: si cambiara en cada render, la suscripción se rehace sin parar.
  const [desde] = useState(() => new Date(Date.now() - 36 * 3600000).toISOString());
  const { ordenes } = useOrdenes(negocio.id, { desde });
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  // Se recalcula cada vez que entra o cambia un pedido.
  useEffect(() => {
    supabase.rpc('pedidos_resumen_dia', { p_negocio: negocio.id }).then(({ data, error: e }) => {
      if (e) setError(errorLegible(e)); else setR(data);
    });
  }, [negocio.id, ordenes]);

  if (error) return <Vacio titulo="No se pudo cargar el resumen" texto={error} />;
  if (!r) return <Vacio titulo="Cargando…" />;
  const maxHora = Math.max(1, ...(r.por_hora || []).map((h) => Number(h.total)));
  const totalMod = Object.values(r.por_modalidad || {}).reduce((s, n) => s + n, 0) || 1;
  const ICON = { recoger: Store, mesa: Utensils, domicilio: Bike };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {[['Ventas de hoy', pesos(r.ventas)], ['Pedidos', r.pedidos], ['Ticket promedio', pesos(r.ticket_promedio)], ['En curso ahora', r.en_curso]].map(([l, v]) => (
          <Tarjeta key={l}>
            <div style={{ fontSize: '0.8rem', color: t.suave, fontWeight: 700 }}>{l}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: t.texto, marginTop: 4 }}>{v}</div>
          </Tarjeta>
        ))}
      </div>

      {Number(r.pedidos) === 0 && (
        <p style={{ margin: 0, color: t.suave, fontSize: '0.88rem' }}>
          Todavía no hay ventas hoy. En la guía, "Reiniciar" vuelve a sembrar un día de pedidos de ejemplo.
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <Tarjeta>
          <div style={{ fontWeight: 800, color: t.texto, marginBottom: 12 }}>Ventas por hora</div>
          {!(r.por_hora || []).length ? <p style={{ color: t.suave, margin: 0 }}>Sin ventas todavía.</p> : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
              {r.por_hora.map((h) => (
                <div key={h.hora} title={`${h.hora}:00 · ${pesos(h.total)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ width: '100%', maxWidth: 28, height: `${Math.max(6, (Number(h.total) / maxHora) * 100)}%`, background: t.pri, borderRadius: 8 }} />
                  <span style={{ fontSize: '0.68rem', color: t.suave }}>{h.hora}h</span>
                </div>
              ))}
            </div>
          )}
        </Tarjeta>
        <Tarjeta>
          <div style={{ fontWeight: 800, color: t.texto, marginBottom: 12 }}>Cómo te piden</div>
          {Object.keys(MODALIDADES).map((m) => {
            const n = r.por_modalidad?.[m] || 0;
            const Icono = ICON[m];
            return (
              <div key={m} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: t.texto, marginBottom: 4 }}>
                  <span><Icono size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />{MODALIDADES[m].etiqueta}</span>
                  <strong>{n}</strong>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(0,0,0,0.06)' }}>
                  <div style={{ height: '100%', width: `${(n / totalMod) * 100}%`, borderRadius: 999, background: t.acento }} />
                </div>
              </div>
            );
          })}
        </Tarjeta>
      </div>

      <Tarjeta>
        <div style={{ fontWeight: 800, color: t.texto, marginBottom: 10 }}>Lo más pedido hoy</div>
        {!(r.top || []).length ? <p style={{ color: t.suave, margin: 0 }}>Sin ventas todavía.</p> : r.top.map((p, i) => (
          <div key={p.nombre} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? `1px solid ${t.linea}` : 'none' }}>
            <span style={{ width: 24, fontWeight: 800, color: t.suave }}>{i + 1}</span>
            <span style={{ flex: 1, color: t.texto, fontWeight: 600 }}>{p.nombre}</span>
            <span style={{ color: t.suave, fontSize: '0.88rem' }}>{p.cantidad} vendidos</span>
            <strong style={{ color: t.texto, minWidth: 80, textAlign: 'right' }}>{pesos(p.total)}</strong>
          </div>
        ))}
      </Tarjeta>
    </div>
  );
}

function EditorMenu({ negocio }) {
  const { menu, recargar } = useMenu(negocio.id);
  const [error, setError] = useState('');
  if (!menu) return <Vacio titulo="Cargando el menú…" />;

  const guardar = async (id, cambios) => {
    setError('');
    const { error: e } = await supabase.from('pedidos_productos').update(cambios).eq('id', id);
    if (e) setError(errorLegible(e));
    recargar();
  };

  return (
    <div>
      <p style={{ margin: '0 0 12px', color: t.suave, fontSize: '0.9rem' }}>
        Los cambios se ven al instante en el menú de tus clientes. Lo agotado desaparece de los carritos.
      </p>
      {error && <p role="alert" style={{ color: '#9B1C1C', fontWeight: 600 }}>{error}</p>}
      {menu.categorias.map((c) => (
        <div key={c.id} style={{ marginBottom: 18 }}>
          <h3 style={{ margin: '0 0 8px', fontFamily: t.serif, fontSize: '1.2rem', color: t.texto }}>{c.nombre}</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {menu.productos.filter((p) => p.categoria_id === c.id).map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: t.sup, borderRadius: 16, padding: 10 }}>
                <Foto src={p.foto} alt="" style={{ width: 52, height: 52, flexShrink: 0, opacity: p.disponible ? 1 : 0.5 }} redonda={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: t.texto }}>{p.nombre}</div>
                  <div style={{ fontSize: '0.78rem', color: p.disponible ? t.suave : '#9B1C1C', fontWeight: 600 }}>{p.disponible ? 'Disponible' : 'Agotado'}</div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: t.texto }}>
                  $
                  <input key={`${p.id}-${p.precio}`} type="number" min="0" step="1" defaultValue={Number(p.precio)} aria-label={`Precio de ${p.nombre}`}
                    onBlur={(e) => { const v = Number(e.target.value); if (v >= 0 && v !== Number(p.precio)) guardar(p.id, { precio: v }); }}
                    style={{ width: 72, padding: '8px 10px', borderRadius: 10, border: `1px solid ${t.linea}`, fontSize: '0.95rem', fontWeight: 700, color: t.texto }} />
                </label>
                <Interruptor activo={p.disponible} alCambiar={(v) => guardar(p.id, { disponible: v })} etiqueta={`${p.nombre} disponible`} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Interruptor({ activo, alCambiar, etiqueta }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} onClick={() => alCambiar(!activo)} style={{
      width: 48, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
      background: activo ? t.pri : 'rgba(0,0,0,0.18)', transition: 'background .2s ease',
    }}>
      <span style={{ position: 'absolute', top: 3, left: activo ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

function Mesas({ negocio }) {
  const base = `${window.location.origin}/pedidos/${negocio.id}`;
  return (
    <div>
      <style>{`@media print { body * { visibility: hidden !important; } .pedidos-qr, .pedidos-qr * { visibility: visible !important; }
        .pedidos-qr { position: absolute; inset: 0; } .pedidos-no-imprimir { display: none !important; } }`}</style>
      <div className="pedidos-no-imprimir" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, color: t.suave, fontSize: '0.9rem', flex: 1, minWidth: 220 }}>
          Cada mesa tiene su QR. El cliente lo escanea, pide desde su celular y la cocina ve el número de mesa.
        </p>
        <Boton variante="suave" onClick={() => window.print()}><Printer size={16} /> Imprimir</Boton>
      </div>
      <div className="pedidos-qr" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
        {Array.from({ length: negocio.mesas }, (_, i) => i + 1).map((n) => (
          <a key={n} href={`${base}?mesa=${n}`} target="_blank" rel="noreferrer" style={{
            background: '#fff', borderRadius: 18, padding: 14, textAlign: 'center', textDecoration: 'none', color: t.texto,
            border: `1px solid ${t.linea}`, breakInside: 'avoid',
          }}>
            <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: '1.05rem' }}>{negocio.nombre}</div>
            <QRCodeSVG value={`${base}?mesa=${n}`} size={128} fgColor="#22301E" style={{ margin: '10px auto' }} />
            <div style={{ fontWeight: 800 }}>Mesa {n}</div>
            <div style={{ fontSize: '0.72rem', color: t.suave }}>Escanea y pide desde tu mesa</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function Ajustes({ negocio, alCambiar }) {
  const [f, setF] = useState({
    abierto: negocio.abierto, costo_envio: negocio.costo_envio, envio_gratis_desde: negocio.envio_gratis_desde ?? '',
    tiempo_prep_min: negocio.tiempo_prep_min, mesas: negocio.mesas, modalidades: negocio.modalidades,
  });
  const [estado, setEstado] = useState('');

  const guardar = async () => {
    setEstado('Guardando…');
    const cambios = {
      abierto: f.abierto, costo_envio: Number(f.costo_envio) || 0,
      envio_gratis_desde: f.envio_gratis_desde === '' ? null : Number(f.envio_gratis_desde),
      tiempo_prep_min: Math.max(5, Number(f.tiempo_prep_min) || 15), mesas: Math.min(60, Math.max(1, Number(f.mesas) || 1)),
      modalidades: f.modalidades.length ? f.modalidades : ['recoger'],
    };
    const { error } = await supabase.from('pedidos_negocios').update(cambios).eq('id', negocio.id);
    if (error) { setEstado(errorLegible(error)); return; }
    setEstado('Guardado');
    alCambiar?.();
  };
  const alternar = (m) => setF((x) => ({ ...x, modalidades: x.modalidades.includes(m) ? x.modalidades.filter((y) => y !== m) : [...x.modalidades, m] }));
  const num = (k, etiqueta, sufijo) => (
    <label style={{ display: 'block', fontWeight: 700, color: t.texto, fontSize: '0.9rem' }}>{etiqueta}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <input type="number" min="0" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}
          style={{ width: 110, padding: '10px 12px', borderRadius: 12, border: `1px solid ${t.linea}`, fontSize: '1rem', color: t.texto }} />
        <span style={{ color: t.suave }}>{sufijo}</span>
      </div>
    </label>
  );

  return (
    <Tarjeta style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: t.texto }}>Recibiendo pedidos</div>
          <div style={{ fontSize: '0.82rem', color: t.suave }}>Apágalo si cierras o ya no das abasto.</div>
        </div>
        <Interruptor activo={f.abierto} alCambiar={(v) => setF({ ...f, abierto: v })} etiqueta="Recibiendo pedidos" />
      </div>
      <div>
        <div style={{ fontWeight: 700, color: t.texto, fontSize: '0.9rem', marginBottom: 6 }}>Cómo pueden pedir</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.keys(MODALIDADES).map((m) => <Chip key={m} activo={f.modalidades.includes(m)} onClick={() => alternar(m)}>{MODALIDADES[m].etiqueta}</Chip>)}
        </div>
      </div>
      {num('tiempo_prep_min', 'Tiempo de preparación', 'min')}
      {num('costo_envio', 'Costo de envío', 'MXN')}
      {num('envio_gratis_desde', 'Envío gratis desde (vacío = nunca)', 'MXN')}
      {num('mesas', 'Número de mesas', 'mesas')}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Boton onClick={guardar}>Guardar cambios</Boton>
        {estado && <span style={{ color: estado === 'Guardado' ? t.pri : t.suave, fontWeight: 700 }}>{estado}</span>}
      </div>
    </Tarjeta>
  );
}
