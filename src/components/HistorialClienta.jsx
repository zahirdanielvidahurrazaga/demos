// ─────────────────────────────────────────────────────────────────────────────
// Historial completo de una clienta — dentro de su propia ficha.
//
// Los reclamos de la dueña empiezan con un NOMBRE ("Andrea Pérez dice que no se
// le descuentan"). Hasta hoy su ficha tenía los controles para MODIFICAR el
// saldo y cero evidencia de cómo llegó a ese número: por eso se hicieron 15
// correcciones a ciegas que quitaron 53 clases bien cobradas.
//
// Junta las tres fuentes porque las dudas cruzan las tres:
//   ventas ("pagó y no se activó") · saldo ("no se descuenta") · asistencias
//   ("vino y no se le marcó").
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowUpRight, Banknote, CheckCircle2, CalendarClock,
  AlertTriangle, Eye, RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const INK = '#1A1C1E';
const PRIMARY = '#FF914D';

const money = (n) => `$${Math.round(n || 0).toLocaleString('es-MX')}`;

const fmtDiaHora = (iso) => new Date(iso).toLocaleString('es-MX', {
  day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
});

// Una fecha sin hora se parsea como medianoche UTC y en México se pinta el día
// anterior. Se le pega mediodía local.
const fmtDia = (d) => d
  ? new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  : null;

const MOTIVOS = {
  reserva: 'Reservó su lugar',
  reserva_admin: 'El estudio le apartó lugar',
  cancelacion: 'Canceló — se le devolvió',
  cancelacion_admin: 'El estudio canceló — se le devolvió',
  promocion_espera: 'Entró desde la lista de espera',
  aceptacion_espera: 'Confirmó su lugar de la lista de espera',
  activacion_plan: 'Activación de plan',
  stripe_sistema: 'Compra / renovación del plan',
  alta_con_plan: 'Plan de bienvenida',
  vencimiento_membresia: 'Venció la vigencia del plan',
  baja_membresia: 'Baja de membresía',
  restitucion_auditoria: 'Clases repuestas por el estudio',
  correccion_reanudacion: 'Vigencia extendida por el estudio',
  ajuste_manual: 'Ajuste hecho a mano',
};

// Categorías para la frase que explica el saldo.
export const COMPRA = ['activacion_plan', 'stripe_sistema', 'alta_con_plan'];
const USO = ['reserva', 'reserva_admin', 'promocion_espera', 'aceptacion_espera'];
const DEVUELTO = ['cancelacion', 'cancelacion_admin'];
const AJUSTE = ['ajuste_manual', 'restitucion_auditoria'];
const CADUCADO = ['vencimiento_membresia', 'baja_membresia'];

// Se exporta porque la pestaña Resumen muestra la MISMA frase: si el cálculo
// viviera dos veces, un día dirían cosas distintas sobre el mismo saldo.
export function resumirSaldo(rows, saldoActual) {
  if (!rows) return null;
  const movs = rows.filter(r => r.tipo === 'movimiento'); // del más nuevo al más viejo
  const idx = movs.findIndex(m => COMPRA.includes(m.fuente));
  if (idx === -1) return null; // sin un alta de plan que anclar, no se inventa una frase

  const ancla = movs[idx];
  const posteriores = movs.slice(0, idx); // lo que pasó DESPUÉS de recibir las clases
  const sum = (fuentes) => posteriores
    .filter(m => fuentes.includes(m.fuente))
    .reduce((s, m) => s + (m.delta || 0), 0);

  const r = {
    comprado: ancla.saldo_despues ?? 0,
    usado: -sum(USO),
    devuelto: sum(DEVUELTO),
    ajustes: sum(AJUSTE),
    caducado: -sum(CADUCADO),
    desdeCuando: ancla.cuando,
  };

  // Si la cuenta no cierra, NO se muestra. Un número que no cuadra fue
  // exactamente lo que rompió los saldos de 11 clientas en julio y agosto.
  const cierra = r.comprado - r.usado + r.devuelto + r.ajustes - r.caducado;
  if (cierra !== (saldoActual ?? 0)) return null;
  return r;
}

export default function HistorialClienta({ client, onVerComoElla, rowsExternas, alRecargar }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [soloSaldo, setSoloSaldo] = useState(false);
  const [recargando, setRecargando] = useState(false);

  const cargar = async () => {
    setRecargando(true);
    const { data, error } = await supabase.rpc('admin_historial_clienta', {
      p_user_id: client.id, p_limite: 300,
    });
    if (error) setError(error.message); else { setRows(data || []); setError(null); }
    setRecargando(false);
  };

  // Si el padre ya trajo el historial, se reutiliza: la ficha lo pide UNA vez
  // y lo comparten el Resumen y esta pestaña.
  useEffect(() => {
    if (rowsExternas) { setRows(rowsExternas); setError(null); return; }
    cargar(); /* eslint-disable-next-line */
  }, [client.id, rowsExternas]);

  // ── La frase que explica el saldo de hoy ──────────────────────────────────
  // Es lo que cierra la discusión sin leer un solo renglón.
  //
  // ⚠️ NO se ancla en `users.plan_started_at`: esa fecha la escribe la app/edge
  // function y llega hasta ~2 s DESPUÉS del movimiento que otorga las clases
  // (el ledger usa clock_timestamp()). Medido en Andrea Pérez: el +20 quedó
  // 1.837 s antes de su plan_started_at → filtrar por fecha se comía justo la
  // compra y la frase decía "0 clases del plan". Se ancla en el MOVIMIENTO que
  // dio las clases y se arranca de su `saldo_despues`, que es el saldo corrido
  // real: así la cuenta cierra por construcción.
  const resumen = useMemo(() => resumirSaldo(rows, client.classes_remaining), [rows, client.classes_remaining]);

  const visibles = useMemo(() => {
    if (!rows) return null;
    return soloSaldo ? rows.filter(r => r.tipo === 'movimiento') : rows;
  }, [rows, soloSaldo]);

  const saldo = client.classes_remaining ?? 0;
  const ilimitada = saldo >= 9000;

  return (
    <div style={{ marginTop: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: INK, fontFamily: 'var(--font-display)' }}>
          Historial de {(client.full_name || '').split(' ')[0] || 'la clienta'}
        </h4>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => onVerComoElla?.(client)} title="Abre la pantalla exacta que ve la clienta en su app"
            style={btnSec}>
            <Eye size={13} /> Ver lo que ve ella
          </button>
          <button onClick={() => (alRecargar ? alRecargar() : cargar())} style={btnSec}>
            <RefreshCw size={13} style={recargando ? { animation: 'spin 1s linear infinite' } : {}} /> Actualizar
          </button>
        </div>
      </div>

      {/* ── La frase ─────────────────────────────────────────────────────── */}
      {resumen && !ilimitada && (
        <div style={{ background: 'rgba(255,145,77,0.07)', border: '1px solid rgba(255,145,77,0.2)', borderRadius: '14px', padding: '12px 14px', marginBottom: '12px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, color: INK }}>
            Desde que se le cargaron sus clases ({fmtDiaHora(resumen.desdeCuando)}): quedó con <b>{resumen.comprado}</b>
            {resumen.usado > 0 && <> · usó <b>{resumen.usado}</b></>}
            {resumen.devuelto > 0 && <> · canceló <b>{resumen.devuelto}</b> (devueltas)</>}
            {resumen.ajustes !== 0 && <> · el estudio le ajustó <b>{resumen.ajustes > 0 ? `+${resumen.ajustes}` : resumen.ajustes}</b></>}
            {resumen.caducado > 0 && <> · caducaron <b>{resumen.caducado}</b></>}
            {' → '}<b style={{ color: PRIMARY }}>hoy tiene {saldo}</b>.
          </p>
        </div>
      )}
      {ilimitada && (
        <p style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', margin: '0 0 12px' }}>
          Plan <b>ilimitado</b>: sus reservas no descuentan clases, por eso no verás movimientos de saldo por reservar.
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <button onClick={() => setSoloSaldo(false)} style={chipBtn(!soloSaldo)}>Todo</button>
        <button onClick={() => setSoloSaldo(true)} style={chipBtn(soloSaldo)}>Solo movimientos de clases</button>
      </div>

      {error && <p style={{ fontSize: '0.83rem', color: '#DC2626' }}>No se pudo cargar: {error}</p>}
      {!error && rows === null && <p style={{ fontSize: '0.83rem', color: 'var(--on-surface-variant)' }}>Cargando…</p>}
      {!error && rows?.length === 0 && <p style={{ fontSize: '0.83rem', color: 'var(--on-surface-variant)' }}>Todavía no hay historial.</p>}

      <div style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
        {visibles?.map((r, i) => <Fila key={i} r={r} ultima={i === visibles.length - 1} />)}
      </div>

      {rows?.length > 0 && (
        <p style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', margin: '10px 0 0', display: 'flex', gap: '6px', lineHeight: 1.45 }}>
          <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>El registro de movimientos de saldo empieza el <b>14 de julio de 2026</b>. Lo anterior no se guardaba, así que aquí solo verás sus reservas de esa época.</span>
        </p>
      )}
    </div>
  );
}

function Fila({ r, ultima }) {
  const cfg = {
    venta: {
      icon: <Banknote size={14} />, color: '#059669', fondo: 'rgba(5,150,105,0.12)',
      titulo: `Pagó ${money(r.monto)}${r.metodo ? ` en ${r.metodo}` : ''}`,
      sub: [r.actor ? `Cobró: ${r.actor}` : null, r.anulada ? 'VENTA ANULADA' : null].filter(Boolean).join(' · '),
    },
    asistencia: {
      icon: <CheckCircle2 size={14} />, color: '#2563EB', fondo: 'rgba(37,99,235,0.12)',
      titulo: `Asistió a ${r.clase || 'su clase'}`,
      sub: [fmtDia(r.fecha_clase), r.hora_clase].filter(Boolean).join(' · '),
    },
    reserva_sin_cobro: {
      icon: <CalendarClock size={14} />, color: '#8B7355', fondo: 'rgba(139,115,85,0.12)',
      titulo: `Reservó ${r.clase || 'una clase'}`,
      sub: `${[fmtDia(r.fecha_clase), r.hora_clase].filter(Boolean).join(' · ')} · sin movimiento de saldo`,
    },
    movimiento: {
      icon: (r.delta || 0) > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />,
      color: (r.delta || 0) > 0 ? '#059669' : '#EA7A3B',
      fondo: (r.delta || 0) > 0 ? 'rgba(5,150,105,0.12)' : 'rgba(234,122,59,0.12)',
      titulo: MOTIVOS[r.fuente] || 'Movimiento de clases',
      sub: [
        r.clase ? `${r.clase}${fmtDia(r.fecha_clase) ? ` · ${fmtDia(r.fecha_clase)}` : ''}` : null,
        r.actor || null,
        r.nota || null,
      ].filter(Boolean).join(' · '),
    },
  }[r.tipo] || { icon: null, color: INK, fondo: 'rgba(0,0,0,0.06)', titulo: 'Evento', sub: '' };

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 0', borderBottom: ultima ? 'none' : '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.fondo, color: cfg.color }}>
        {cfg.icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: INK, textDecoration: r.anulada ? 'line-through' : 'none' }}>{cfg.titulo}</div>
        {cfg.sub && <div style={{ fontSize: '0.73rem', color: 'var(--on-surface-variant)', marginTop: 2, lineHeight: 1.4 }}>{cfg.sub}</div>}
        <div style={{ fontSize: '0.68rem', color: 'var(--on-surface-variant)', marginTop: 3, opacity: 0.8 }}>{fmtDiaHora(r.cuando)}</div>
      </div>
      {r.tipo === 'movimiento' && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 900, color: (r.delta || 0) > 0 ? '#059669' : INK }}>
            {(r.delta || 0) > 0 ? `+${r.delta}` : r.delta}
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--on-surface-variant)' }}>
            quedan {r.saldo_despues >= 9000 ? '∞' : r.saldo_despues}
          </div>
        </div>
      )}
    </div>
  );
}

const btnSec = {
  display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid rgba(0,0,0,0.1)',
  background: '#fff', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer',
  fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)',
};

const chipBtn = (active) => ({
  border: 'none', borderRadius: '999px', padding: '6px 12px', cursor: 'pointer',
  fontSize: '0.74rem', fontWeight: 700,
  background: active ? 'rgba(255,145,77,0.16)' : 'rgba(0,0,0,0.05)',
  color: active ? PRIMARY : 'var(--on-surface-variant)',
});
