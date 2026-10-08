// ─────────────────────────────────────────────────────────────────────────────
// "¿A dónde se fueron mis clases?"
//
// El reclamo que más se repite ("no me están descontando las clases") no era un
// error de cobro: el sistema descuenta AL RESERVAR, no al asistir. Quien aparta
// su semana completa de un jalón ve caer el saldo una vez y luego lo ve quieto
// toda la semana mientras va a clases. Sin este historial no hay forma de que
// se dé cuenta, y termina reclamando en recepción — donde le "corrigen" el
// saldo a mano y se rompe de verdad.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDownRight, ArrowUpRight, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

const fmtFechaHora = (iso) => new Date(iso).toLocaleString('es-MX', {
  day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
});

// Una fecha sin hora se parsea como medianoche UTC y en México se pinta el día
// anterior. Se le pega mediodía local.
const fmtDia = (d) => d
  ? new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
  : null;

// `userId` solo lo usa el panel de admin para ver la pantalla de una clienta;
// el servidor exige rol de staff para aceptarlo. Sin él, cada quien ve lo suyo.
export default function MisClasesMovimientos({ abierto, onCerrar, saldoActual, userId = null, nombre = null }) {
  const [movs, setMovs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    setMovs(null); setError(null);
    supabase.rpc('mis_movimientos_de_clases', { p_limite: 60, p_user_id: userId }).then(({ data, error }) => {
      if (!vivo) return;
      if (error) setError(error.message); else setMovs(data || []);
    });
    return () => { vivo = false; };
  }, [abierto, userId]);

  return (
    <AnimatePresence>
      {abierto && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCerrar}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', zIndex: 1400 }}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1401,
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              background: 'var(--app-surface-solid, #fff)',
              borderTopLeftRadius: '26px', borderTopRightRadius: '26px',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--fill-subtle, rgba(0,0,0,0.07))' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}>
                  {nombre ? `Lo que ve ${nombre}` : '¿A dónde se fueron mis clases?'}
                </h2>
                <button onClick={onCerrar} aria-label="Cerrar"
                  style={{ border: 'none', background: 'var(--fill-subtle, rgba(0,0,0,0.06))', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--on-surface)', flexShrink: 0 }}>
                  <X size={17} />
                </button>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--on-surface-variant)', display: 'flex', gap: '7px' }}>
                <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  {nombre ? 'Esta es la pantalla exacta que ella abre en su app. ' : ''}
                  {nombre ? 'La' : 'Tu'} clase se descuenta <b>cuando {nombre ? 'reserva' : 'reservas'}</b>, no el día que {nombre ? 'asiste' : 'asistes'}.
                  Por eso, si {nombre ? 'aparta' : 'apartas'} varias de una vez, el saldo baja ese día y luego
                  ya no se mueve aunque {nombre ? 'vaya' : 'vayas'} a clase.
                </span>
              </p>
            </div>

            <div style={{ overflowY: 'auto', padding: '8px 20px 24px', flex: 1 }}>
              {error && <p style={{ fontSize: '0.85rem', color: '#DC2626' }}>No se pudo cargar tu historial: {error}</p>}
              {!error && movs === null && <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Cargando…</p>}
              {!error && movs?.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Todavía no hay movimientos.</p>}

              {movs?.map((m, i) => {
                const suma = m.delta > 0;
                const dia = fmtDia(m.fecha_clase);
                return (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 0', borderBottom: i < movs.length - 1 ? '1px solid var(--fill-subtle, rgba(0,0,0,0.05))' : 'none' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: suma ? 'rgba(5,150,105,0.12)' : 'rgba(234,122,59,0.12)',
                      color: suma ? '#059669' : '#EA7A3B',
                    }}>
                      {suma ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--on-surface)' }}>{m.motivo}</div>
                      {m.clase && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: 2 }}>
                          {m.clase}{dia ? ` · ${dia}` : ''}{m.hora_clase ? ` · ${m.hora_clase}` : ''}
                        </div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', marginTop: 3, opacity: 0.85 }}>
                        {fmtFechaHora(m.cuando)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: suma ? '#059669' : 'var(--on-surface)' }}>
                        {suma ? `+${m.delta}` : m.delta}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--on-surface-variant)', marginTop: 1 }}>
                        quedan {m.saldo_final >= 9000 ? '∞' : m.saldo_final}
                      </div>
                    </div>
                  </div>
                );
              })}

              {movs?.length > 0 && Number.isFinite(saldoActual) && (
                <p style={{ marginTop: '16px', fontSize: '0.78rem', color: 'var(--on-surface-variant)', textAlign: 'center' }}>
                  {nombre ? 'Hoy tiene' : 'Hoy tienes'} <b style={{ color: 'var(--on-surface)' }}>{saldoActual >= 9000 ? 'clases ilimitadas' : `${saldoActual} clases`}</b>.
                  {nombre ? '' : ' Si algo no te cuadra, enséñale esta pantalla a recepción.'}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
