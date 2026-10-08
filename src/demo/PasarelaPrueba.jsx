import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, Lock, X } from 'lucide-react';
import { supabase, errorDeFuncion } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// PASARELA DE PRUEBA
//
// La maqueta no usa Stripe. Cuando la cafetería manda a pagar, la versión de
// demostración de `stripe-cafe-checkout` crea el pedido real (pendiente de
// pago) y regresa aquí en vez de a Stripe Checkout. Esta hoja imita un cobro
// con tarjeta: la función `pago-prueba` lo aprueba o lo rechaza según la
// tarjeta de prueba y deja el pedido exactamente como lo dejaría el webhook.
// No se mueve dinero ni se guarda ningún número de tarjeta.
// ─────────────────────────────────────────────────────────────────────────────

const TARJETAS = [
  { numero: '4242 4242 4242 4242', etiqueta: 'Aprobada' },
  { numero: '4000 0000 0000 0002', etiqueta: 'Rechazada' },
];

const formatoTarjeta = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const pesos = (n) => `$${Number(n || 0).toLocaleString('es-MX')}`;

export default function PasarelaPrueba({ ordenId, cfg, alTerminar }) {
  const [pedido, setPedido] = useState(null);
  const [tarjeta, setTarjeta] = useState(TARJETAS[0].numero);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [aprobado, setAprobado] = useState(false);

  useEffect(() => {
    let vivo = true;
    supabase.from('cafe_orders').select('id, items, total, status').eq('id', ordenId).maybeSingle()
      .then(({ data }) => {
        if (!vivo) return;
        if (!data) setError('No encontramos este pedido.');
        else if (data.status !== 'pending_payment') setError('Este pedido ya no está esperando pago.');
        setPedido(data);
      });
    return () => { vivo = false; };
  }, [ordenId]);

  const enviar = async (accion) => {
    if (enviando) return;
    setEnviando(true);
    setError('');
    const { data, error: fallo } = await supabase.functions.invoke('pago-prueba', {
      body: { orderId: ordenId, accion, tarjeta },
    });
    if (fallo || data?.error) {
      setError(await errorDeFuncion(fallo, data, 'No se pudo procesar el pago de prueba.'));
      setEnviando(false);
      return;
    }
    if (accion === 'pagar') { setAprobado(true); setEnviando(false); return; }
    alTerminar('cancelado');
  };

  const c = cfg?.colores || {};
  const tinta = c.texto || '#1A1C1E';
  const marca = c.primarioVivo || '#1A1C1E';
  const pagable = pedido?.status === 'pending_payment' && !aprobado;

  if (aprobado) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9700, background: 'rgba(15,15,15,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}>
        <div role="dialog" aria-label="Pago aprobado" style={{
          width: 'min(380px, 100%)', background: '#fff', borderRadius: '24px', padding: '30px 22px',
          color: tinta, textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', boxSizing: 'border-box',
        }}>
          <CheckCircle2 size={56} color={marca} style={{ marginBottom: '12px' }} />
          <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 800 }}>Pago aprobado</h2>
          <p style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>{pesos(pedido?.total)} · tarjeta terminación {tarjeta.replace(/\D/g, '').slice(-4)}</p>
          <p style={{ margin: '0 0 22px', fontSize: '0.85rem', opacity: 0.7 }}>
            Tu pedido ya llegó a la barra. Síguelo en "Pedidos".
          </p>
          <button type="button" onClick={() => alTerminar('pagado')}
            style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '15px', cursor: 'pointer', background: marca, color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
            Volver a la cafetería
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9700, background: 'rgba(15,15,15,0.55)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div role="dialog" aria-label="Pasarela de pago de prueba" style={{
        width: 'min(420px, 100%)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
        background: '#fff', borderRadius: '24px', padding: '22px', color: tinta,
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
            background: '#FFF4D6', color: '#7A5B00', padding: '5px 10px', borderRadius: '999px',
          }}>
            Pasarela de prueba · no se cobra nada
          </span>
          <button type="button" aria-label="Cancelar el pago" disabled={enviando}
            onClick={() => (pagable ? enviar('cancelar') : alTerminar('cancelado'))}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: tinta, display: 'flex', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <h2 style={{ margin: '0 0 2px', fontSize: '1.35rem', fontWeight: 800 }}>{cfg?.nombreCafeteria || cfg?.nombre}</h2>
        <p style={{ margin: '0 0 16px', fontSize: '0.85rem', opacity: 0.7 }}>Pago con tarjeta</p>

        {!pedido && !error && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {pedido && (
          <div style={{ background: '#F6F4F1', borderRadius: '16px', padding: '12px 14px', marginBottom: '16px' }}>
            {(pedido.items || []).map((i, k) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '3px 0' }}>
                <span>{i.qty}× {i.name}{i.options?.length ? ` · ${i.options.map((o) => o.name).join(', ')}` : ''}</span>
                <span style={{ fontWeight: 700 }}>{pesos(i.line_total)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: '8px', paddingTop: '8px', fontWeight: 800 }}>
              <span>Total</span><span>{pesos(pedido.total)}</span>
            </div>
          </div>
        )}

        {pagable && (
          <>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>Número de tarjeta</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '12px', padding: '0 12px', marginBottom: '8px' }}>
              <CreditCard size={18} style={{ opacity: 0.6, flexShrink: 0 }} />
              <input
                inputMode="numeric" autoComplete="off" value={tarjeta}
                onChange={(e) => setTarjeta(formatoTarjeta(e.target.value))}
                style={{ border: 'none', outline: 'none', padding: '12px 0', fontSize: '1rem', width: '100%', background: 'transparent', color: tinta, letterSpacing: '0.04em' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {TARJETAS.map((t) => (
                <button key={t.numero} type="button" onClick={() => setTarjeta(t.numero)}
                  style={{
                    border: '1px solid rgba(0,0,0,0.12)', borderRadius: '999px', padding: '5px 10px', cursor: 'pointer',
                    fontSize: '0.72rem', fontWeight: 700, color: tinta,
                    background: tarjeta === t.numero ? '#F0ECE6' : '#fff',
                  }}>
                  {t.etiqueta} · {t.numero.slice(-4)}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>Vence</label>
                <input readOnly value="12 / 34" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '12px', padding: '12px', fontSize: '1rem', color: tinta, background: '#fff' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>CVC</label>
                <input readOnly value="123" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '12px', padding: '12px', fontSize: '1rem', color: tinta, background: '#fff' }} />
              </div>
            </div>
          </>
        )}

        {error && (
          <p role="alert" style={{ margin: '0 0 14px', padding: '10px 12px', borderRadius: '12px', background: '#FDECEC', color: '#9B1C1C', fontSize: '0.85rem', fontWeight: 600 }}>
            {error}
          </p>
        )}

        {pagable ? (
          <button type="button" onClick={() => enviar('pagar')} disabled={enviando}
            style={{
              width: '100%', border: 'none', borderRadius: '16px', padding: '15px', cursor: enviando ? 'default' : 'pointer',
              background: marca, color: '#fff', fontSize: '1rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: enviando ? 0.75 : 1,
            }}>
            {enviando ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={16} />}
            {enviando ? 'Procesando…' : `Pagar ${pesos(pedido.total)}`}
          </button>
        ) : (pedido || error) && (
          <button type="button" onClick={() => alTerminar('cancelado')}
            style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '15px', cursor: 'pointer', background: marca, color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
            Volver a la cafetería
          </button>
        )}
      </div>
    </div>
  );
}
