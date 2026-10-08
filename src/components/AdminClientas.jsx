import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Cake, Crown, UserX, UserCheck, Shield, Coffee, Dumbbell, ChevronDown, ChevronLeft, ChevronRight, Phone, QrCode, Trash2, CalendarPlus, Plus, Minus, X, Check, Camera, MoreHorizontal, SlidersHorizontal, ArrowDownWideNarrow, ArrowLeft, MessageCircle, Mail, Banknote, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import HistorialClienta, { resumirSaldo } from './HistorialClienta';
import MisClasesMovimientos from './MisClasesMovimientos';
import { supabase } from '../lib/supabase';
import { cobrarPlanAClienta } from '../lib/cobrarPlan';
import { todayLocalStr } from '../lib/dates';
import { isPlanExpired, formatPlanDate } from '../lib/membership';
import { uploadAvatar } from '../lib/avatar';

const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const isUnlimitedClient = (u) => (u.classes_remaining ?? 0) >= 9000 || ['Plan Premium', 'Premium'].includes(u.membership_plan);

// "7:00 AM" → minutos desde medianoche (para ordenar bien; el orden alfabético rompe con AM/PM).
const timeToMin = (t = '') => {
  const m = String(t).match(/(\d{1,2}):(\d{2})\s*(a|p)\.?\s*m/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const pm = m[3].toLowerCase() === 'p';
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return h * 60 + min;
};

// Etiqueta legible de una clase del horario (fechada o recurrente semanal).
const classLabel = (c) => {
  if (c.date) {
    const dow = new Date(c.date + 'T12:00:00').getDay();
    const [, mo, d] = c.date.split('-');
    return `${DAYS_SHORT[dow]} ${parseInt(d, 10)} ${MESES_SHORT[parseInt(mo, 10) - 1]}`;
  }
  return `Cada ${DAYS_FULL[c.day] ?? '—'}`;
};

// Traduce los errores que lanza admin_book_class a algo entendible para la dueña.
const bookErrMsg = (raw = '') => {
  const m = String(raw).toUpperCase();
  if (m.includes('SIN_CLASES')) return 'La clienta no tiene clases disponibles. Súmale clases arriba y vuelve a intentar.';
  if (m.includes('SIN_CUPO')) return 'Esa clase ya no tiene cupo.';
  if (m.includes('YA_RESERVADA')) return 'La clienta ya estaba reservada en esa clase.';
  if (m.includes('NO_AUTORIZADO')) return 'No tienes permiso para reservar clases.';
  if (m.includes('CLASE_NO_EXISTE')) return 'Esa clase ya no existe.';
  if (m.includes('CLIENTA_NO_EXISTE')) return 'No se encontró a la clienta.';
  return 'No se pudo reservar: ' + raw;
};

const PRIMARY = '#FF914D';
const INK = '#1A1C1E';

const plural = (n, sing, plur) => `${n} ${n === 1 ? sing : plur}`;

const h3Ficha = {
  fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
  color: 'var(--on-surface-variant)', margin: '0 0 10px',
};

const selectFicha = {
  border: '1px solid rgba(0,0,0,0.12)', borderRadius: '11px', padding: '10px',
  background: '#fff', fontSize: '0.85rem', fontWeight: 600, color: INK, cursor: 'pointer', minWidth: 0,
};

const enlaceContacto = {
  display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none',
  background: 'rgba(0,0,0,0.04)', color: INK, borderRadius: '10px', padding: '8px 11px',
  fontSize: '0.8rem', fontWeight: 700,
};

const btnCuenta = {
  display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(0,0,0,0.12)',
  background: '#fff', borderRadius: '10px', padding: '8px 12px', fontWeight: 700,
  fontSize: '0.78rem', cursor: 'pointer', color: 'var(--on-surface-variant)',
};

const chipQuitable = {
  display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,145,77,0.4)',
  background: 'rgba(255,145,77,0.1)', color: PRIMARY, borderRadius: '999px', padding: '5px 11px',
  fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
};

const etiquetaFiltro = {
  fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
  color: 'var(--on-surface-variant)', marginBottom: '8px',
};

const ROLES = [
  { value: 'CLIENT', label: 'Clienta', Icon: Dumbbell },
  { value: 'COACH', label: 'Coach', Icon: Crown },
  { value: 'BARISTA', label: 'Barista', Icon: Coffee },
  { value: 'RECEPCION', label: 'Recepción', Icon: QrCode },
  { value: 'ADMIN', label: 'Admin', Icon: Shield },
];
const roleMeta = (r) => ROLES.find(x => x.value === r) || ROLES[0];

const fmtBday = (d) => {
  if (!d) return null;
  const [, m, day] = d.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(day, 10)} ${meses[parseInt(m, 10) - 1]}`;
};

// "Por renovar" y "Sin clases" no son estados: son las dos LISTAS DE TRABAJO
// del estudio (a quién llamar para que renueve, y quién ya puede comprar otro
// paquete). Ordenar 198 nombres alfabéticamente no contesta ninguna de las dos.
// "Por renovar" incluye a las que vencen dentro de la ventana Y a las que ya
// vencieron pero siguen ACTIVE: a todas hay que hacerles la misma llamada, y
// llamarle "Por vencer" a alguien que venció en julio sería mentir.
const DIAS_POR_VENCER = 7;
const FILTERS = [
  ['all', 'Todas'], ['active', 'Activas'],
  ['porvencer', 'Por renovar'], ['sinclases', 'Sin clases'],
  ['inactive', 'Sin plan'], ['staff', 'Staff'],
];

// 'YYYY-MM' del alta, en hora de México (no del navegador: la dueña puede
// abrir esto desde cualquier lado y una alta del día 1 no debe caer en el mes
// anterior).
const mesDeAlta = (iso) => {
  if (!iso) return null;
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit' })
    .formatToParts(new Date(iso));
  const y = p.find(x => x.type === 'year')?.value;
  const m = p.find(x => x.type === 'month')?.value;
  return y && m ? `${y}-${m}` : null;
};

const nombreMes = (ym) => {
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 15);
  const s = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Liquid glass pill
function Pill({ active, onClick, children }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.95 }}
      style={{ padding: '8px 15px', borderRadius: '999px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', flexShrink: 0,
        border: active ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.55)',
        background: active ? 'linear-gradient(135deg, #FF914D, #E68245)' : 'rgba(255,255,255,0.55)',
        color: active ? '#fff' : 'var(--on-surface-variant)',
        backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: active ? '0 8px 20px rgba(255,145,77,0.35)' : '0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)' }}>
      {children}
    </motion.button>
  );
}

// Un RENGLÓN por persona, no una tarjeta.
//
// La versión de tarjetas metía 5 chips de 5 colores + 3 botones en cada una de
// las 197 personas: todo pesaba igual, así que nada destacaba, y las alturas
// distintas (según tuviera teléfono o cumpleaños) rompían la cuadrícula.
// Aquí el estado va en UNA línea y el color aparece SOLO cuando hay problema.
// Cumpleaños y teléfono se fueron a la ficha: no son datos de escaneo.
//
// Y "Eliminar" ya no vive a un clic en las 197 filas — es la acción más
// destructiva del sistema y estaba con el mismo peso visual que "Clases".
function ClientRow({ u, onRole, onBaja, onReactivar, onDelete, onManage, busy, currentUserId, seleccionada, compacta }) {
  const [menu, setMenu] = useState(false);
  const rm = roleMeta(u.role);
  const active = u.membership_status === 'ACTIVE';
  const isClient = u.role === 'CLIENT';
  const canDelete = u.id !== currentUserId;
  const vencido = u.plan_expires_at && isPlanExpired(u.plan_expires_at);
  const sinClases = active && !isUnlimitedClient(u) && (u.classes_remaining ?? 0) <= 0;

  // El estado en una sola frase. Gris salvo que haya algo que atender.
  const estado = !isClient ? null
    : !active ? { txt: 'Sin plan', alerta: true }
    : { txt: `${u.membership_plan || 'Activa'} · ${isUnlimitedClient(u) ? 'ilimitadas' : plural(u.classes_remaining ?? 0, 'clase', 'clases')}`, alerta: sinClases };

  const vigencia = isClient && active && u.plan_expires_at
    ? { txt: `${vencido ? 'VENCIDO' : 'vence'} ${formatPlanDate(u.plan_expires_at, true)}`, alerta: vencido }
    : null;

  return (
    <div
      onClick={() => isClient && onManage(u)}
      className={`fila-clienta${compacta ? ' es-compacta' : ''}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: seleccionada ? 'rgba(255,145,77,0.09)' : '#fff',
        boxShadow: seleccionada ? `inset 3px 0 0 ${PRIMARY}` : 'none',
        cursor: isClient ? 'pointer' : 'default',
      }}
      onMouseEnter={e => { if (isClient && !seleccionada) e.currentTarget.style.background = 'rgba(255,145,77,0.04)'; }}
      onMouseLeave={e => { if (!seleccionada) e.currentTarget.style.background = '#fff'; }}
    >
      {u.avatar_url
        ? <img src={u.avatar_url} alt="" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,145,77,0.14)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0, fontSize: '0.9rem' }}>{(u.full_name || u.email || '?').charAt(0).toUpperCase()}</div>}

      {/* Identidad */}
      <div className="fc-id" style={{ flex: '2 1 190px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: INK, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || 'Sin nombre'}</span>
          {/* El rol solo se anuncia cuando NO es clienta: son 16 de 197. */}
          {!isClient && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0, fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '7px', background: 'rgba(255,145,77,0.12)', color: PRIMARY }}>
              <rm.Icon size={11} /> {rm.label}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
      </div>

      {/* Estado — una línea, color solo si hay algo que atender */}
      {/* Solo si hay algo que decir. En modo compacto este bloque se lleva un
          renglón entero, así que en las filas de staff (que no tienen plan ni
          vencimiento) dejaba un hueco grande con el "···" colgando abajo.
          La alineación vive en index.css: en línea ganaría siempre y en móvil
          el estado se quedaría pegado a la derecha. */}
      {(estado || vigencia) && (
      <div className="fc-estado" style={{ flex: '1 1 150px', minWidth: 0 }}>
        {estado && (
          <div style={{ fontSize: '0.82rem', fontWeight: estado.alerta ? 800 : 600, color: estado.alerta ? '#EA7A3B' : INK, lineHeight: 1.3 }}>
            {estado.txt}
          </div>
        )}
        {vigencia && (
          <div style={{ fontSize: '0.73rem', fontWeight: vigencia.alerta ? 800 : 500, color: vigencia.alerta ? '#DC2626' : 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>
            {vigencia.txt}
          </div>
        )}
      </div>
      )}

      {/* Acciones — detrás del menú, no en la cara de las 197 filas */}
      <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button onClick={() => setMenu(m => !m)} disabled={busy} title="Más acciones"
          style={{ border: 'none', background: menu ? 'rgba(0,0,0,0.07)' : 'transparent', borderRadius: '9px', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
          <MoreHorizontal size={17} />
        </button>
        {menu && (
          <>
            <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 11, background: '#fff', borderRadius: '12px', boxShadow: '0 12px 30px rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', minWidth: '196px' }}>
              {isClient && (
                <MenuItem icon={<CalendarPlus size={15} />} onClick={() => { setMenu(false); onManage(u); }}>Abrir ficha</MenuItem>
              )}
              {isClient && (active
                ? <MenuItem icon={<UserX size={15} />} onClick={() => { setMenu(false); onBaja(u); }}>Dar de baja</MenuItem>
                : <MenuItem icon={<UserCheck size={15} />} color="#16A34A" onClick={() => { setMenu(false); onReactivar(u); }}>Reactivar plan</MenuItem>)}

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '7px 12px 4px', fontSize: '0.64rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>Rol</div>
              {ROLES.map(r => (
                <MenuItem key={r.value} icon={<r.Icon size={15} />} activo={r.value === u.role}
                  onClick={() => { setMenu(false); if (r.value !== u.role) onRole(u, r.value); }}>{r.label}</MenuItem>
              ))}

              {canDelete && (
                <>
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} />
                  <MenuItem icon={<Trash2 size={15} />} color="#ba1a1a" onClick={() => { setMenu(false); onDelete(u); }}>Eliminar cuenta</MenuItem>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MenuItem({ icon, children, onClick, color, activo }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', padding: '9px 12px', border: 'none', background: activo ? 'rgba(255,145,77,0.09)' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.81rem', color: color || (activo ? PRIMARY : INK), textAlign: 'left' }}>
      {icon} {children}
    </button>
  );
}

// Modal para gestionar las clases de UNA clienta:
//  1) ajustar sus clases disponibles (classes_remaining) y
//  2) reservarla / quitarla en clases del horario.
// Cobro automático de la clienta, gestionable por la dueña.
// Nació de un reporte real: las clientas cancelaban desde la app y les seguían
// cobrando. La causa era que quedaban DOS suscripciones vivas y la app solo
// conocía una; por eso aquí se listan todas y se puede cerrar la que sobra.
function CobroAutomatico({ clientId }) {
  const [estado, setEstado] = useState({ cargando: true });
  const [ocupado, setOcupado] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = React.useCallback(async () => {
    setEstado(e => ({ ...e, cargando: true }));
    const { data, error } = await supabase.functions.invoke('admin-membership', {
      body: { action: 'list', userId: clientId },
    });
    if (error || data?.error) {
      setEstado({ cargando: false, error: data?.error || 'No se pudo consultar el cobro' });
    } else if (!data || (!Array.isArray(data.suscripciones) && !data.sinCobroAutomatico)) {
      // Sin esta rama, una respuesta con otra forma llegaba al render y
      // `estado.suscripciones.map` reventaba: la pestaña Clientas COMPLETA se
      // iba a blanco (no hay error boundary). Encontrado al abrir una ficha en
      // la maqueta, pero cualquier respuesta rara de la edge function lo
      // provoca igual en producción.
      setEstado({ cargando: false, error: 'No se pudo leer el cobro automático de esta clienta.' });
    } else {
      setEstado({ cargando: false, ...data });
    }
  }, [clientId]);

  useEffect(() => { cargar(); }, [cargar]);

  const ejecutar = async (action, subscriptionId, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setOcupado(subscriptionId + action);
    setAviso(null);
    const { data, error } = await supabase.functions.invoke('admin-membership', {
      body: { action, userId: clientId, subscriptionId },
    });
    setOcupado(null);
    if (error || data?.error) { setAviso({ mal: true, texto: data?.error || 'No se pudo completar' }); return; }
    setAviso({ mal: false, texto: data.resultado });
    cargar();
  };

  const fecha = (ts) => ts
    ? new Date(ts * 1000).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const titulo = (
    <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', margin: '0 0 10px' }}>
      Cobro automático
    </h3>
  );
  const caja = (contenido) => (
    <>
      {titulo}
      <div style={{ background: 'rgba(0,0,0,0.025)', borderRadius: '14px', padding: '14px', marginBottom: '24px' }}>{contenido}</div>
    </>
  );

  if (estado.cargando) return caja(<div style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Consultando…</div>);
  if (estado.error) return caja(<div style={{ fontSize: '0.85rem', color: '#ba1a1a' }}>{estado.error}</div>);
  if (estado.sinCobroAutomatico) {
    return caja(
      <div style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
        No tiene cobro automático. Paga en efectivo o le diste de alta la membresía a mano,
        así que no se le va a cobrar nada sola.
      </div>,
    );
  }

  return caja(
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {estado.duplicadas > 0 && (
        <div style={{ background: 'rgba(186,26,26,0.08)', color: '#ba1a1a', borderRadius: '10px', padding: '10px 12px', fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.45 }}>
          Tiene {estado.duplicadas + 1} cobros abiertos al mismo tiempo. Solo uno debería estar
          activo — cierra los que digan “sobra”.
        </div>
      )}

      {(estado.suscripciones || []).map(s => (
        <div key={s.id} style={{ background: '#fff', borderRadius: '12px', padding: '12px', border: `1px solid ${s.esLaDeLaApp ? 'rgba(0,0,0,0.10)' : 'rgba(186,26,26,0.35)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: INK }}>
              ${s.monto.toLocaleString('es-MX')} <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>al mes</span>
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '3px 8px', borderRadius: '99px', background: s.esLaDeLaApp ? 'rgba(22,163,74,0.12)' : 'rgba(186,26,26,0.12)', color: s.esLaDeLaApp ? '#16A34A' : '#ba1a1a' }}>
              {s.esLaDeLaApp ? 'El bueno' : 'Sobra'}
            </span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '5px', lineHeight: 1.5 }}>
            {s.pausada
              ? 'Pausado — no se le está cobrando.'
              : s.terminaAlVencer
                ? `Se cancela el ${fecha(s.proximoCobro)} y ya no se le vuelve a cobrar.`
                : `Siguiente cobro: ${fecha(s.proximoCobro)}.`}
            {s.estado === 'past_due' && ' Su último cobro falló.'}
          </div>

          {/* Cobro caído que Stripe sigue reintentando. Pausar o cancelar NO lo
              detenía: por eso a Berenice Gómez le entró el cargo el 6-sep-2026,
              cuatro días después de darse de baja. Ahora las dos acciones lo
              anulan, pero conviene verlo antes de contestarle a la clienta. */}
          {s.pendiente > 0 && (
            <div style={{ marginTop: '8px', background: 'rgba(186,26,26,0.07)', border: '1px solid rgba(186,26,26,0.22)', borderRadius: '10px', padding: '8px 10px', fontSize: '0.75rem', color: '#ba1a1a', fontWeight: 600, lineHeight: 1.45 }}>
              ⚠️ Cobro caído de ${s.pendiente.toLocaleString('es-MX')} pendiente
              {s.pendienteProximoIntento ? `. Stripe lo reintenta el ${fecha(s.pendienteProximoIntento)}` : '. Stripe ya no lo reintenta'}.
              Si la das de baja o la pausas aquí, se anula.
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            {!s.esLaDeLaApp ? (
              <button
                onClick={() => ejecutar('cancel_now', s.id, `¿Cerrar este cobro de $${s.monto} al mes?\n\nEs un cobro duplicado: su membresía y sus clases NO se tocan.`)}
                disabled={!!ocupado}
                style={{ ...quickBtnRojo, opacity: ocupado ? 0.5 : 1 }}
              >
                {ocupado === s.id + 'cancel_now' ? '…' : 'Cerrar este cobro'}
              </button>
            ) : (
              <>
                {s.pausada ? (
                  <button onClick={() => ejecutar('resume', s.id)} disabled={!!ocupado} style={{ ...quickBtnChico, opacity: ocupado ? 0.5 : 1 }}>
                    {ocupado === s.id + 'resume' ? '…' : 'Reactivar cobro'}
                  </button>
                ) : (
                  <button onClick={() => ejecutar('pause', s.id, '¿Pausar el cobro?\n\nNo se le cobrará la próxima renovación y conserva sus clases. Puedes reactivarlo cuando ella quiera.')} disabled={!!ocupado} style={{ ...quickBtnChico, opacity: ocupado ? 0.5 : 1 }}>
                    {ocupado === s.id + 'pause' ? '…' : 'Pausar cobro'}
                  </button>
                )}
                {s.terminaAlVencer ? (
                  <button onClick={() => ejecutar('resume', s.id)} disabled={!!ocupado} style={{ ...quickBtnChico, opacity: ocupado ? 0.5 : 1 }}>
                    {ocupado === s.id + 'resume' ? '…' : 'Que siga renovándose'}
                  </button>
                ) : (
                  <button onClick={() => ejecutar('cancel', s.id, '¿Cancelar el cobro automático?\n\nConserva su acceso hasta que se le venza el plan, y ya no se le vuelve a cobrar.')} disabled={!!ocupado} style={{ ...quickBtnRojo, opacity: ocupado ? 0.5 : 1 }}>
                    {ocupado === s.id + 'cancel' ? '…' : 'Cancelar cobro'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {aviso && (
        <div style={{ fontSize: '0.79rem', fontWeight: 700, color: aviso.mal ? '#ba1a1a' : '#16A34A', lineHeight: 1.45 }}>
          {aviso.mal ? '' : '✓ '}{aviso.texto}
        </div>
      )}
    </div>,
  );
}

const quickBtnChico = { border: 'none', borderRadius: '10px', padding: '8px 12px', fontWeight: 800, fontSize: '0.79rem', cursor: 'pointer', background: 'rgba(255,145,77,0.14)', color: PRIMARY };
const quickBtnRojo = { border: 'none', borderRadius: '10px', padding: '8px 12px', fontWeight: 800, fontSize: '0.79rem', cursor: 'pointer', background: 'rgba(186,26,26,0.10)', color: '#ba1a1a' };

function FichaClienta({ client, onClose, patch, applyLocal, onRole, onBaja, onReactivar, onDelete, currentUserId }) {
  const { globalClasses, fetchGlobalClasses, fetchAllUsers, allPlans, activatePlan, user } = useAuth();

  // El historial se pide UNA vez por ficha y lo comparten el Resumen (la frase
  // que explica el saldo) y la pestaña Historial.
  const [historial, setHistorial] = useState(null);
  const cargarHistorial = React.useCallback(async () => {
    const { data } = await supabase.rpc('admin_historial_clienta', { p_user_id: client.id, p_limite: 300 });
    setHistorial(data || []);
  }, [client.id]);
  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);
  const comoVa = useMemo(() => resumirSaldo(historial, client.classes_remaining), [historial, client.classes_remaining]);

  // Cobrar desde aquí: antes había que salirse a Ventas y BUSCARLA otra vez.
  const planesActivos = (allPlans || []).filter(p => p.active !== false);
  const [planCobro, setPlanCobro] = useState('');
  const [metodoCobro, setMetodoCobro] = useState('efectivo');
  const [cobrando, setCobrando] = useState(false);
  const planElegido = planesActivos.find(p => p.name === planCobro);
  // "Ver lo que ve ella": abre la pantalla EXACTA de la clienta. La mitad de
  // estas discusiones son "es que la app me dice otra cosa".
  const [verComoElla, setVerComoElla] = useState(false);
  const [tab, setTab] = useState('resumen');
  const unlimited = isUnlimitedClient(client);
  // El saldo YA NO se escribe al instante: se ajusta en pantalla y se guarda con
  // motivo (RPC admin_set_saldo) para que todo ajuste quede explicado en el
  // libro mayor. Sin esto, los ajustes a mano aparecían después en Auditoría
  // como "descuadres" sin forma de saber si fueron un error o algo a propósito.
  const [credits, setCredits] = useState(client.classes_remaining ?? 0);
  const [savedCredits, setSavedCredits] = useState(client.classes_remaining ?? 0);
  const [motivo, setMotivo] = useState('');
  const [savingCredits, setSavingCredits] = useState(false);
  const creditsDirty = credits !== savedCredits;

  // Foto de perfil de la clienta (la dueña puede ponérsela desde admin).
  const [avatar, setAvatar] = useState(client.avatar_url || null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInputRef = useRef(null);

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permitir re-elegir el mismo archivo
    if (!file) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url, error } = await uploadAvatar(client.id, dataUrl);
      if (error || !url) { alert('No se pudo subir la foto. Intenta de nuevo.'); return; }
      await patch(client.id, { avatar_url: url });
      applyLocal?.(client.id, { avatar_url: url });
      setAvatar(url);
    } catch (_) {
      alert('No se pudo procesar la imagen.');
    } finally {
      setPhotoBusy(false);
    }
  };
  const [reserved, setReserved] = useState(null); // Set de class_id (null = cargando)
  const [busyId, setBusyId] = useState(null);

  // Edición de la fecha de vencimiento de la membresía (admin).
  const toDateInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [expiryInput, setExpiryInput] = useState(toDateInput(client.plan_expires_at));
  const [savedExpiry, setSavedExpiry] = useState(toDateInput(client.plan_expires_at));
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [expirySaved, setExpirySaved] = useState(false);

  const saveExpiry = async () => {
    setSavingExpiry(true); setExpirySaved(false);
    // Guardamos al final del día (23:59 local) para que "vence el X" abarque todo ese día.
    const iso = expiryInput ? new Date(expiryInput + 'T23:59:59').toISOString() : null;
    await patch(client.id, { plan_expires_at: iso });
    applyLocal?.(client.id, { plan_expires_at: iso });
    setSavedExpiry(expiryInput);
    setSavingExpiry(false); setExpirySaved(true);
    setTimeout(() => setExpirySaved(false), 2500);
  };

  // Reservas actuales de la clienta (para marcar "Reservada" y permitir quitar).
  useEffect(() => {
    let alive = true;
    supabase.from('reservations').select('class_id').eq('user_id', client.id)
      .then(({ data }) => { if (alive) setReserved(new Set((data || []).map(r => r.class_id))); });
    return () => { alive = false; };
  }, [client.id]);

  const today = todayLocalStr();
  const [selectedDate, setSelectedDate] = useState(null); // día visible en "Reservar"

  // Días futuros que tienen al menos una clase (para navegar con ◀ ▶, sin scrollear todo el mes).
  const datesWithClasses = useMemo(() => {
    const set = new Set((globalClasses || []).filter(c => c.date && c.date >= today).map(c => c.date));
    return [...set].sort();
  }, [globalClasses, today]);

  const effectiveDate = selectedDate || datesWithClasses[0] || today;
  const dateIdx = datesWithClasses.indexOf(effectiveDate);

  // Clases SOLO del día visible (fechadas en ese día + recurrentes que caen ese día de la semana).
  const dayClasses = useMemo(() => {
    const dow = new Date(effectiveDate + 'T12:00:00').getDay();
    return (globalClasses || [])
      .filter(c => c.date === effectiveDate || (!c.date && c.day === dow))
      .sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
  }, [globalClasses, effectiveDate]);

  const goPrevDate = () => { if (dateIdx > 0) setSelectedDate(datesWithClasses[dateIdx - 1]); };
  const goNextDate = () => { if (dateIdx >= 0 && dateIdx < datesWithClasses.length - 1) setSelectedDate(datesWithClasses[dateIdx + 1]); };
  const dateTitle = new Date(effectiveDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  // Solo mueve el número en pantalla — no toca la BD hasta que haya motivo.
  const applyCredits = (newVal) => setCredits(Math.max(0, parseInt(newVal, 10) || 0));

  const saveCredits = async () => {
    if (!motivo.trim()) { alert('Escribe el motivo del ajuste: queda en el historial de la clienta.'); return; }
    setSavingCredits(true);
    const { error } = await supabase.rpc('admin_set_saldo', {
      p_user_id: client.id, p_new_balance: credits, p_note: motivo.trim(),
    });
    setSavingCredits(false);
    if (error) {
      const msgs = { NO_AUTORIZADO: 'Solo admin/recepción pueden ajustar clases.', MOTIVO_REQUERIDO: 'Escribe el motivo.', SALDO_INVALIDO: 'El número de clases no es válido.', CLIENTA_NO_EXISTE: 'La clienta ya no existe.' };
      alert(msgs[error.message] || 'No se pudo guardar: ' + error.message);
      return;
    }
    setSavedCredits(credits);
    applyLocal?.(client.id, { classes_remaining: credits });
    setMotivo('');
    fetchAllUsers?.();
  };

  const cancelCredits = () => { setCredits(savedCredits); setMotivo(''); };

  const book = async (c) => {
    setBusyId(c.id);
    const { error } = await supabase.rpc('admin_book_class', { p_user_id: client.id, p_class_id: c.id });
    if (error) {
      alert(bookErrMsg(error.message));
    } else {
      setReserved(prev => new Set(prev).add(c.id));
      if (!unlimited) {
        const nv = Math.max(0, (parseInt(credits, 10) || 0) - 1);
        setCredits(nv); setSavedCredits(nv); // la reserva ya descontó en BD
        applyLocal(client.id, { classes_remaining: nv }); // refleja en la tarjeta de fondo (sin re-escribir DB)
      }
      fetchGlobalClasses?.();
      fetchAllUsers?.();
    }
    setBusyId(null);
  };

  const unbook = async (c) => {
    setBusyId(c.id);
    const { error } = await supabase.rpc('admin_cancel_class', { p_user_id: client.id, p_class_id: c.id });
    if (error) {
      alert('No se pudo quitar la reserva: ' + error.message);
    } else {
      setReserved(prev => { const n = new Set(prev); n.delete(c.id); return n; });
      if (!unlimited) {
        const nv = (parseInt(credits, 10) || 0) + 1;
        setCredits(nv); setSavedCredits(nv); // la cancelación ya devolvió en BD
        applyLocal(client.id, { classes_remaining: nv });
      }
      fetchGlobalClasses?.();
      fetchAllUsers?.();
    }
    setBusyId(null);
  };

  const noClasses = !unlimited && (parseInt(credits, 10) || 0) <= 0;
  const quickBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: 'none', borderRadius: '10px', padding: '8px 12px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', background: 'rgba(255,145,77,0.12)', color: PRIMARY };

  // PANEL, no modal. Como modal tapaba la lista y obligaba a cerrar para pasar a
  // la siguiente clienta; aquí la lista se queda al lado y se puede ir saltando.
  // En pantallas angostas `.col-ficha` (index.css) lo pone a pantalla completa.
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.16 }}
      className="ficha-panel"
      style={{ background: 'var(--app-surface-solid, #fff)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '18px', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 'calc(100vh - 40px)', position: 'sticky', top: '16px' }}
    >
      <>
        {/* En móvil el panel tapa la lista (index.css), así que ahí necesita su
            propia salida: sin esto la dueña queda encerrada en la ficha. */}
        <button onClick={onClose} className="ficha-volver"
          style={{ display: 'none', alignItems: 'center', gap: '6px', border: 'none', background: 'rgba(0,0,0,0.04)', width: '100%', padding: '11px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: 'var(--on-surface-variant)', textAlign: 'left' }}>
          <ArrowLeft size={16} /> Volver a la lista
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 18px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          {/* Avatar con botón de cámara para ponerle/cambiar la foto a la clienta */}
          <button
            type="button"
            onClick={() => !photoBusy && photoInputRef.current?.click()}
            title="Cambiar foto de perfil"
            style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0, border: 'none', background: 'transparent', padding: 0, cursor: photoBusy ? 'default' : 'pointer', borderRadius: '50%' }}
          >
            {avatar
              ? <img src={avatar} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,145,77,0.14)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{(client.full_name || client.email || '?').charAt(0).toUpperCase()}</div>}
            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderRadius: '50%', background: PRIMARY, border: '2px solid var(--app-surface-solid, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {photoBusy
                ? <div style={{ width: '9px', height: '9px', border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <Camera size={11} color="#fff" />}
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={onPickPhoto} style={{ display: 'none' }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: INK, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.full_name || 'Sin nombre'}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--on-surface-variant)' }}>{client.membership_plan || 'Sin plan'}</div>
            {client.plan_expires_at && (
              <div style={{ fontSize: '0.72rem', fontWeight: 700, marginTop: '2px', color: isPlanExpired(client.plan_expires_at) ? '#EF4444' : 'var(--on-surface-variant)' }}>
                {isPlanExpired(client.plan_expires_at)
                  ? `Venció el ${formatPlanDate(client.plan_expires_at, true)}`
                  : `${client.plan_started_at ? `Pagó ${formatPlanDate(client.plan_started_at, true)} · ` : ''}Vence ${formatPlanDate(client.plan_expires_at, true)}`}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} color={INK} /></button>
        </div>

        {/* Pestañas. Antes todo esto era UN scroll largo con cinco temas sin
            relación, al que además se entraba por un botón que decía "Clases"
            aunque adentro hubiera saldo, vencimiento, cobro e historial. */}
        <div style={{ display: 'flex', gap: '6px', padding: '0 18px', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
          {[['resumen', 'Resumen'], ['historial', 'Historial'], ['reservas', 'Reservas']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{
                border: 'none', background: 'none', cursor: 'pointer', padding: '11px 12px',
                fontSize: '0.86rem', fontWeight: 800,
                color: tab === id ? PRIMARY : 'var(--on-surface-variant)',
                borderBottom: `2px solid ${tab === id ? PRIMARY : 'transparent'}`, marginBottom: '-1px',
              }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', padding: '18px' }}>
          <div style={{ display: tab === 'resumen' ? 'block' : 'none' }}>

          {/* ── CÓMO VA — lo primero es el CONTEXTO, no el control que cambia
              el saldo. Ese control, puesto arriba y en grande, es el que se usó
              15 veces a ciegas y quitó 53 clases bien cobradas. ── */}
          <h3 style={h3Ficha}>Cómo va</h3>
          <div style={{ background: 'rgba(255,145,77,0.07)', border: '1px solid rgba(255,145,77,0.2)', borderRadius: '14px', padding: '13px 15px', marginBottom: '22px' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: INK, marginBottom: comoVa || unlimited ? '6px' : 0 }}>
              {client.membership_plan || (client.membership_status === 'ACTIVE' ? 'Activa' : 'Sin plan')}
              {' · '}
              {unlimited ? 'clases ilimitadas' : plural(client.classes_remaining ?? 0, 'clase', 'clases')}
              {client.plan_expires_at && (
                <span style={{ fontWeight: 700, color: isPlanExpired(client.plan_expires_at) ? '#DC2626' : 'var(--on-surface-variant)' }}>
                  {' · '}{isPlanExpired(client.plan_expires_at) ? 'VENCIDO' : 'vence'} {formatPlanDate(client.plan_expires_at, true)}
                </span>
              )}
            </div>
            {comoVa && !unlimited && (
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--on-surface-variant)' }}>
                Quedó con <b style={{ color: INK }}>{comoVa.comprado}</b>
                {comoVa.usado > 0 && <> · usó <b style={{ color: INK }}>{comoVa.usado}</b></>}
                {comoVa.devuelto > 0 && <> · canceló <b style={{ color: INK }}>{comoVa.devuelto}</b></>}
                {comoVa.ajustes !== 0 && <> · el estudio le ajustó <b style={{ color: INK }}>{comoVa.ajustes > 0 ? `+${comoVa.ajustes}` : comoVa.ajustes}</b></>}
                {comoVa.caducado > 0 && <> · caducaron <b style={{ color: INK }}>{comoVa.caducado}</b></>}
                {' → hoy tiene '}<b style={{ color: PRIMARY }}>{client.classes_remaining ?? 0}</b>.
              </p>
            )}
            {historial === null && <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>Revisando su historial…</p>}
          </div>

          {/* ── COBRAR — antes había que salirse a Ventas y BUSCARLA otra vez.
              Ese salto es donde nacieron las 6 ventas duplicadas de agosto. ── */}
          <h3 style={h3Ficha}>Cobrar un plan</h3>
          <div style={{ background: 'rgba(0,0,0,0.025)', borderRadius: '14px', padding: '14px', marginBottom: '22px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <select value={planCobro} onChange={e => setPlanCobro(e.target.value)} style={{ ...selectFicha, flex: '2 1 150px' }}>
                <option value="">Elige el plan…</option>
                {planesActivos.map(p => <option key={p.name} value={p.name}>{p.name} — ${p.price_mxn ?? p.amount}</option>)}
              </select>
              <select value={metodoCobro} onChange={e => setMetodoCobro(e.target.value)} style={{ ...selectFicha, flex: '1 1 110px' }}>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            <button
              disabled={!planElegido || cobrando}
              onClick={async () => {
                if (!planElegido || cobrando) return;
                setCobrando(true);
                try {
                  const { ok } = await cobrarPlanAClienta({
                    clienta: client,
                    plan: { name: planElegido.name, amount: planElegido.price_mxn ?? planElegido.amount, classes: planElegido.classes },
                    metodo: metodoCobro, vendedorId: user?.id, activatePlan,
                  });
                  if (ok) { setPlanCobro(''); fetchAllUsers?.(); cargarHistorial(); }
                } finally { setCobrando(false); }
              }}
              style={{ width: '100%', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 800, fontSize: '0.9rem',
                       cursor: (!planElegido || cobrando) ? 'not-allowed' : 'pointer',
                       background: (!planElegido || cobrando) ? 'rgba(0,0,0,0.06)' : PRIMARY,
                       color: (!planElegido || cobrando) ? 'var(--on-surface-variant)' : '#fff' }}>
              {cobrando ? 'Cobrando…' : planElegido ? `Cobrar $${(planElegido.price_mxn ?? planElegido.amount).toLocaleString('es-MX')}` : 'Cobrar'}
            </button>
            <p style={{ margin: '9px 0 0', fontSize: '0.73rem', color: 'var(--on-surface-variant)', lineHeight: 1.45 }}>
              Cobrar <b>reemplaza</b> su saldo por el del plan, no lo suma. Te avisa antes si ya le cobraste esto mismo hace poco.
            </p>
          </div>

          {/* ── CONTACTO ── */}
          <h3 style={h3Ficha}>Contacto</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '22px' }}>
            {client.phone ? (
              <a href={`https://wa.me/52${String(client.phone).replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer" style={enlaceContacto}>
                <MessageCircle size={14} /> {client.phone}
              </a>
            ) : <span style={{ ...enlaceContacto, opacity: 0.55 }}><Phone size={14} /> Sin teléfono</span>}
            {client.email && (
              <a href={`mailto:${client.email}`} style={enlaceContacto}><Mail size={14} /> {client.email}</a>
            )}
            {client.birth_date && (
              <span style={enlaceContacto}><Cake size={14} /> {fmtBday(client.birth_date)}</span>
            )}
          </div>

          <h3 style={h3Ficha}>Ajustes de la membresía</h3>
          {/* SECCIÓN 1 — Clases disponibles */}
          <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', margin: '0 0 10px' }}>Clases disponibles</h3>
          {unlimited ? (
            <div style={{ background: 'rgba(255,145,77,0.08)', borderRadius: '14px', padding: '16px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: PRIMARY }}>∞</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>Plan ilimitado — no necesita clases sueltas</div>
            </div>
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.025)', borderRadius: '14px', padding: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
                <button disabled={savingCredits || credits <= 0} onClick={() => applyCredits(credits - 1)} style={{ ...quickBtn, width: '40px', height: '40px', opacity: credits <= 0 ? 0.4 : 1 }}><Minus size={18} /></button>
                <div style={{ minWidth: '64px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: INK, lineHeight: 1 }}>{credits}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>clases</div>
                </div>
                <button disabled={savingCredits} onClick={() => applyCredits(credits + 1)} style={{ ...quickBtn, width: '40px', height: '40px' }}><Plus size={18} /></button>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {[4, 8, 12].map(n => (
                  <button key={n} disabled={savingCredits} onClick={() => applyCredits(credits + n)} style={quickBtn}>+{n}</button>
                ))}
              </div>

              {!creditsDirty ? (
                <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: '10px' }}>
                  Ajusta el número y escribe el motivo para guardar.
                </div>
              ) : (
                <div style={{ marginTop: '14px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '13px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: INK, textAlign: 'center', marginBottom: '10px' }}>
                    {savedCredits} → {credits} clases{' '}
                    <span style={{ color: credits > savedCredits ? '#059669' : '#DC2626' }}>
                      ({credits > savedCredits ? '+' : ''}{credits - savedCredits})
                    </span>
                  </div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: 'var(--on-surface-variant)', marginBottom: '6px' }}>
                    ¿Por qué? (obligatorio)
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {['Clase de cortesía', 'Repone clase cancelada', 'Corrección de saldo', 'Pagó en efectivo'].map(m => (
                      <button key={m} type="button" onClick={() => setMotivo(m)}
                        style={{ border: '1px solid rgba(0,0,0,0.12)', background: motivo === m ? 'rgba(255,145,77,0.16)' : 'white', color: motivo === m ? PRIMARY : 'var(--on-surface-variant)', borderRadius: '999px', padding: '5px 11px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="…o escríbelo tú"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '11px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '0.86rem', boxSizing: 'border-box', marginBottom: '10px', fontFamily: 'inherit' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={cancelCredits} disabled={savingCredits}
                      style={{ flex: 1, padding: '10px', borderRadius: '11px', border: '1px solid rgba(0,0,0,0.12)', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', color: INK }}>
                      Cancelar
                    </button>
                    <button onClick={saveCredits} disabled={savingCredits || !motivo.trim()}
                      style={{ flex: 1.4, padding: '10px', borderRadius: '11px', border: 'none', background: PRIMARY, color: 'white', cursor: savingCredits ? 'wait' : 'pointer', fontWeight: 800, fontSize: '0.84rem', opacity: savingCredits || !motivo.trim() ? 0.5 : 1 }}>
                      {savingCredits ? 'Guardando…' : 'Guardar ajuste'}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', textAlign: 'center', marginTop: '8px' }}>
                    Queda registrado en Auditoría con tu nombre y este motivo.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN — Vencimiento de la membresía (editable por admin) */}
          <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', margin: '0 0 10px' }}>Vencimiento de la membresía</h3>
          <div style={{ background: 'rgba(0,0,0,0.025)', borderRadius: '14px', padding: '14px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={expiryInput}
                onChange={(e) => setExpiryInput(e.target.value)}
                style={{ flex: 1, padding: '11px 12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.9rem', color: INK, background: '#fff', fontFamily: 'inherit', WebkitAppearance: 'none', appearance: 'none' }}
              />
              <button onClick={saveExpiry} disabled={savingExpiry || expiryInput === savedExpiry} style={{ ...quickBtn, padding: '11px 16px', opacity: (savingExpiry || expiryInput === savedExpiry) ? 0.45 : 1 }}>
                {savingExpiry ? '…' : 'Guardar'}
              </button>
            </div>
            <div style={{ fontSize: '0.74rem', color: expirySaved ? '#16A34A' : 'var(--on-surface-variant)', marginTop: '10px', fontWeight: expirySaved ? 700 : 400, lineHeight: 1.45 }}>
              {expirySaved
                ? '✓ Fecha de vencimiento actualizada'
                : 'Cambia la fecha en que se le vence la membresía a la clienta. Vacío = sin vencimiento.'}
            </div>
          </div>

          {/* SECCIÓN — Cobro automático (pausar/cancelar y cerrar duplicados) */}
          <CobroAutomatico clientId={client.id} />

          {/* ── CUENTA — hasta el fondo A PROPÓSITO: es lo único de la ficha
              que no se deshace. Arriba va lo que se hace a diario. ── */}
          <h3 style={{ ...h3Ficha, color: '#ba1a1a' }}>Cuenta</h3>
          <div style={{ background: 'rgba(186,26,26,0.04)', border: '1px solid rgba(186,26,26,0.15)', borderRadius: '14px', padding: '14px', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Rol en el sistema</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {ROLES.map(r => (
                <button key={r.value} onClick={() => r.value !== client.role && onRole?.(client, r.value)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', border: `1px solid ${r.value === client.role ? PRIMARY : 'rgba(0,0,0,0.12)'}`,
                           background: r.value === client.role ? 'rgba(255,145,77,0.12)' : '#fff',
                           color: r.value === client.role ? PRIMARY : 'var(--on-surface-variant)',
                           borderRadius: '10px', padding: '6px 10px', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer' }}>
                  <r.Icon size={13} /> {r.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {client.role === 'CLIENT' && (client.membership_status === 'ACTIVE'
                ? <button onClick={() => onBaja?.(client)} style={btnCuenta}><UserX size={14} /> Dar de baja</button>
                : <button onClick={() => onReactivar?.(client)} style={{ ...btnCuenta, color: '#16A34A' }}><UserCheck size={14} /> Reactivar plan</button>)}
              {client.id !== currentUserId && (
                <button onClick={() => onDelete?.(client)} style={{ ...btnCuenta, color: '#ba1a1a', marginLeft: 'auto' }}>
                  <Trash2 size={14} /> Eliminar cuenta
                </button>
              )}
            </div>
          </div>

          </div>

          {/* Historial: el contexto que faltaba junto al control que modifica
              el saldo. Se monta solo al abrir la pestaña para no pedirle a la
              BD el historial de cada clienta que se asome a su ficha. */}
          <div style={{ display: tab === 'historial' ? 'block' : 'none' }}>
            {tab === 'historial' && <HistorialClienta client={client} onVerComoElla={() => setVerComoElla(true)} rowsExternas={historial} alRecargar={cargarHistorial} />}
          </div>

          <div style={{ display: tab === 'reservas' ? 'block' : 'none' }}>
          {/* SECCIÓN 2 — Reservar en una clase */}
          <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', margin: '0 0 10px' }}>Reservar en una clase</h3>
          {noClasses && (
            <div style={{ background: 'rgba(186,26,26,0.07)', color: '#ba1a1a', borderRadius: '12px', padding: '10px 12px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px' }}>
              La clienta no tiene clases disponibles. Súmale clases arriba para poder reservarla.
            </div>
          )}
          {reserved === null ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--on-surface-variant)' }}>Cargando horario…</div>
          ) : datesWithClasses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--on-surface-variant)', fontSize: '0.88rem' }}>No hay clases próximas en el horario.</div>
          ) : (
            <>
              {/* Navegador de día: ◀ [viernes 27 de junio] ▶ — solo entre días con clases */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <button onClick={goPrevDate} disabled={dateIdx <= 0} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: dateIdx <= 0 ? 'default' : 'pointer', opacity: dateIdx <= 0 ? 0.35 : 1, flexShrink: 0 }}><ChevronLeft size={18} color={INK} /></button>
                <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: INK, fontSize: '0.92rem', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dateTitle}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>{dayClasses.length} {dayClasses.length === 1 ? 'clase' : 'clases'}</div>
                </div>
                <button onClick={goNextDate} disabled={dateIdx < 0 || dateIdx >= datesWithClasses.length - 1} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (dateIdx < 0 || dateIdx >= datesWithClasses.length - 1) ? 'default' : 'pointer', opacity: (dateIdx < 0 || dateIdx >= datesWithClasses.length - 1) ? 0.35 : 1, flexShrink: 0 }}><ChevronRight size={18} color={INK} /></button>
              </div>

              {dayClasses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--on-surface-variant)', fontSize: '0.86rem' }}>Sin clases este día.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dayClasses.map(c => {
                    const isReserved = reserved.has(c.id);
                    const full = (c.spots ?? 0) <= 0;
                    const busyThis = busyId === c.id;
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderLeft: `4px solid ${c.category_color || PRIMARY}`, borderRadius: '14px', padding: '10px 12px', opacity: full && !isReserved ? 0.7 : 1 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: INK, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                          <div style={{ fontSize: '0.74rem', color: full ? '#ba1a1a' : 'var(--on-surface-variant)', fontWeight: 600 }}>
                            {c.time}{c.instructor ? ` · ${c.instructor}` : ''} · {full ? 'Sin cupos' : `${c.spots} cupos`}
                          </div>
                        </div>
                        {isReserved ? (
                          <button disabled={busyThis} onClick={() => unbook(c)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(34,197,94,0.12)', color: '#16A34A', border: 'none', borderRadius: '10px', padding: '8px 11px', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer', flexShrink: 0 }}>
                            <Check size={14} /> {busyThis ? '…' : 'Reservada'}
                          </button>
                        ) : (
                          <button disabled={busyThis || full || noClasses} onClick={() => book(c)} title={full ? 'Sin cupos' : (noClasses ? 'Sin clases disponibles' : 'Reservar')} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: full ? 'rgba(186,26,26,0.1)' : PRIMARY, color: full ? '#ba1a1a' : '#fff', border: 'none', borderRadius: '10px', padding: '8px 11px', fontWeight: 800, fontSize: '0.76rem', cursor: (full || noClasses) ? 'not-allowed' : 'pointer', opacity: (full || noClasses) && !full ? 0.45 : 1, flexShrink: 0 }}>
                            {busyThis ? '…' : (full ? 'Lleno' : 'Reservar')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </>

      <MisClasesMovimientos
        abierto={verComoElla}
        onCerrar={() => setVerComoElla(false)}
        saldoActual={client.classes_remaining ?? 0}
        userId={client.id}
        nombre={(client.full_name || '').split(' ')[0] || 'la clienta'}
      />
    </motion.div>
  );
}

export default function AdminClientas() {
  const { user, fetchAllUsers, allPlans } = useAuth();
  const [users, setUsers] = useState(null); // TODOS los usuarios (no solo clientas)
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  // Pedido de la dueña: "quiero ver cuántas chicas y quiénes se inscribieron en
  // agosto". '' = todos los meses; si no, 'YYYY-MM' sobre created_at.
  const [mesAlta, setMesAlta] = useState('');
  const [verFiltros, setVerFiltros] = useState(false);
  const [orden, setOrden] = useState('nombre');
  const [planFilter, setPlanFilter] = useState('all');
  // Va DESPUÉS de planFilter: leerlo antes de su declaración es un
  // ReferenceError de TDZ que tumba la pestaña completa y que el build no ve.
  const filtrosActivos = (planFilter !== 'all' ? 1 : 0) + (mesAlta ? 1 : 0);
  const [busy, setBusy] = useState(false);
  const [managing, setManaging] = useState(null); // clienta cuyo modal de clases está abierto

  // Actualiza SOLO la lista de fondo (sin escribir a DB). Lo usa el modal tras
  // reservar/cancelar, donde la RPC ya tocó la DB y solo falta reflejarlo aquí.
  const applyLocal = (id, updates) => setUsers(prev => (prev || []).map(u => u.id === id ? { ...u, ...updates } : u));

  const plans = useMemo(() => {
    // Siempre mostramos todos los planes del catálogo (en su orden), aunque aún
    // nadie los tenga, para poder filtrar por planes nuevos como "Principiante".
    const canonical = (allPlans || []).map(p => p.name);
    const inUse = new Set();
    (users || []).forEach(u => { if (u.role === 'CLIENT' && u.membership_status === 'ACTIVE' && u.membership_plan) inUse.add(u.membership_plan); });
    // Añadimos al final cualquier plan en uso que no esté en el catálogo (legacy).
    const extras = [...inUse].filter(p => !canonical.includes(p));
    return [...canonical, ...extras];
  }, [users, allPlans]);

  const load = async () => {
    const { data } = await supabase.from('users')
      .select('id, full_name, email, role, membership_status, membership_plan, classes_remaining, plan_started_at, plan_expires_at, birth_date, phone, avatar_url, created_at')
      .order('full_name', { ascending: true });
    setUsers(data || []);
  };
  useEffect(() => { load(); }, []);

  const patch = async (id, updates) => {
    setBusy(true);
    setUsers(prev => (prev || []).map(u => u.id === id ? { ...u, ...updates } : u)); // optimista
    const { error } = await supabase.from('users').update(updates).eq('id', id);
    if (error) { alert('No se pudo actualizar: ' + error.message); await load(); }
    fetchAllUsers?.(); // mantener el contexto al día (clientas)
    setBusy(false);
  };

  const onRole = (u, role) => { if (confirm(`¿Cambiar a "${u.full_name || u.email}" al rol de ${roleMeta(role).label}?`)) patch(u.id, { role }); };
  const onBaja = (u) => { if (confirm(`¿Dar de baja la membresía de "${u.full_name || u.email}"?`)) patch(u.id, { membership_status: 'INACTIVE', classes_remaining: 0, plan_expires_at: null, membership_renewal: 'active' }); };
  const onReactivar = (u) => {
    if (!confirm(`¿Reactivar la membresía de "${u.full_name || u.email}"? Vencerá en un mes.`)) return;
    // Reactivar = nuevo periodo: pago = hoy, vence = +1 mes (regla automática).
    const started = new Date();
    const expires = new Date(started); expires.setMonth(expires.getMonth() + 1);
    patch(u.id, { membership_status: 'ACTIVE', plan_started_at: started.toISOString(), plan_expires_at: expires.toISOString(), membership_renewal: 'active' });
  };

  // Eliminación DEFINITIVA (cuenta + datos). Doble confirmación por ser destructivo.
  const onDelete = async (u) => {
    const quien = u.full_name || u.email;
    if (u.id === user?.id) { alert('No puedes eliminar tu propia cuenta.'); return; }

    // Historial de la cuenta: borrar una cuenta con ventas deja esos cobros
    // "huérfanos" en el dashboard (pasó con cuentas duplicadas: se cobró en
    // una, se borró, y el plan "desapareció"). Enseñarlo ANTES de confirmar.
    let historial = '';
    try {
      const [{ count: nVentas }, { count: nReservas }] = await Promise.all([
        supabase.from('sales').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
      ]);
      if (nVentas || nReservas) {
        historial = `\n\nOJO: esta cuenta tiene ${nVentas || 0} cobro(s) registrado(s) y ${nReservas || 0} reserva(s).`
          + `\nSi es una cuenta duplicada, revisa en Auditoría cuál usa la clienta antes de borrar.`
          + `\nSi solo quieres quitarle el acceso, mejor usa "Dar de baja".`;
      }
    } catch (e) { /* sin bloqueo: si falla el conteo, se confirma igual */ }

    if (!confirm(`¿ELIMINAR para siempre a "${quien}"?\n\nSe borrará su cuenta, reservas, fotos, métricas y datos. Esta acción NO se puede deshacer.${historial}`)) return;
    if (!confirm(`Última confirmación: eliminar definitivamente a ${quien}.`)) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('admin-delete-client', { body: { userId: u.id } });
    setBusy(false);
    if (error || data?.error) {
      let motivo = data?.error;
      if (!motivo && error?.context && typeof error.context.json === 'function') {
        try { motivo = (await error.context.json())?.error; } catch (_) { /* cuerpo no-JSON */ }
      }
      alert(motivo || error?.message || 'No se pudo eliminar.');
      return;
    }
    setUsers(prev => (prev || []).filter(x => x.id !== u.id)); // quitar de la lista
    // Si su ficha estaba abierta hay que cerrarla: el panel cae al objeto viejo
    // cuando ya no está en la lista y se quedaría mostrando a alguien borrado.
    setManaging(prev => (prev?.id === u.id ? null : prev));
    fetchAllUsers?.();
    if (data?.warning) alert(data.warning);
  };

  const list = useMemo(() => {
    let arr = users || [];
    if (filter === 'active') arr = arr.filter(u => u.membership_status === 'ACTIVE' && u.role === 'CLIENT');
    else if (filter === 'inactive') arr = arr.filter(u => u.membership_status !== 'ACTIVE' && u.role === 'CLIENT');
    else if (filter === 'staff') arr = arr.filter(u => ['COACH', 'BARISTA', 'RECEPCION', 'ADMIN'].includes(u.role));
    else if (filter === 'porvencer') {
      const limite = Date.now() + DIAS_POR_VENCER * 86400000;
      arr = arr.filter(u => u.role === 'CLIENT' && u.membership_status === 'ACTIVE' && u.plan_expires_at
        && new Date(u.plan_expires_at).getTime() <= limite);
    } else if (filter === 'sinclases') {
      arr = arr.filter(u => u.role === 'CLIENT' && u.membership_status === 'ACTIVE'
        && !isUnlimitedClient(u) && (u.classes_remaining ?? 0) <= 0);
    }
    if (planFilter !== 'all') arr = arr.filter(u => (u.membership_plan || '') === planFilter && u.membership_status === 'ACTIVE');
    if (mesAlta) arr = arr.filter(u => mesDeAlta(u.created_at) === mesAlta);
    const s = q.trim().toLowerCase();
    if (s) arr = arr.filter(u => (u.full_name || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s));

    // Ordenar. Las que no aplican al criterio se van al final en vez de
    // colarse arriba: quien no tiene vencimiento no es "la más urgente".
    const alFinal = Number.MAX_SAFE_INTEGER;
    const porNombre = (a, b) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '', 'es');
    arr = [...arr].sort((a, b) => {
      if (orden === 'vence') {
        // Tres grupos: primero lo que está POR vencer (de hoy hacia adelante),
        // luego lo ya vencido (lo más reciente arriba) y al final quien no
        // tiene fecha. Ordenar por fecha a secas subía hasta arriba a las que
        // vencieron hace meses y ya no vuelven, tapando a las que vencen
        // mañana, que son las que todavía se pueden salvar.
        const ahora = Date.now();
        const info = (u) => {
          if (!u.plan_expires_at) return { grupo: 2, t: 0 };
          const t = new Date(u.plan_expires_at).getTime();
          return t >= ahora ? { grupo: 0, t } : { grupo: 1, t: -t };
        };
        const ia = info(a), ib = info(b);
        return ia.grupo - ib.grupo || ia.t - ib.t || porNombre(a, b);
      }
      if (orden === 'saldo') {
        const sa = isUnlimitedClient(a) ? alFinal : (a.classes_remaining ?? alFinal);
        const sb = isUnlimitedClient(b) ? alFinal : (b.classes_remaining ?? alFinal);
        return sa - sb || porNombre(a, b);
      }
      if (orden === 'alta') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0) || porNombre(a, b);
      }
      return porNombre(a, b);
    });
    return arr;
  }, [users, filter, planFilter, q, mesAlta, orden]);

  // Meses con altas, del más reciente al más viejo (solo clientas).
  const mesesConAltas = useMemo(() => {
    const cuenta = new Map();
    for (const u of users || []) {
      if (u.role !== 'CLIENT') continue;
      const m = mesDeAlta(u.created_at);
      if (m) cuenta.set(m, (cuenta.get(m) || 0) + 1);
    }
    return [...cuenta.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  }, [users]);

  const conteoTrabajo = useMemo(() => {
    const limite = Date.now() + DIAS_POR_VENCER * 86400000;
    const cl = (users || []).filter(u => u.role === 'CLIENT' && u.membership_status === 'ACTIVE');
    return {
      porvencer: cl.filter(u => u.plan_expires_at && new Date(u.plan_expires_at).getTime() <= limite).length,
      sinclases: cl.filter(u => !isUnlimitedClient(u) && (u.classes_remaining ?? 0) <= 0).length,
    };
  }, [users]);

  const counts = useMemo(() => {
    const all = users || [];
    const clients = all.filter(u => u.role === 'CLIENT');
    return {
      total: all.length,
      active: clients.filter(u => u.membership_status === 'ACTIVE').length,
      clients: clients.length,
      staff: all.filter(u => ['COACH', 'BARISTA', 'RECEPCION', 'ADMIN'].includes(u.role)).length,
    };
  }, [users]);

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0, color: INK }}>Clientas & Staff</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{counts.clients} clientas · {counts.active} activas · {counts.staff} staff</span>
      </div>

      {/* Maestro-detalle: la lista a la izquierda, la ficha al lado. Antes la
          ficha era un modal centrado que TAPABA la lista y obligaba a cerrarla
          para pasar a la siguiente clienta. */}
      <div className="clientas-split" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <div className="col-lista" style={{ flex: managing ? '0 0 400px' : '1 1 auto', minWidth: 0 }}>

      {/* Buscar + filtros. Los secundarios (membresía y mes de alta) van
          PLEGADOS: antes eran 3 filas de pastillas siempre visibles, ~180 px de
          adorno antes del primer dato, cuando lo que la dueña hace casi siempre
          es escribir un nombre. */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o correo…"
            style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.1)', background: 'white', fontSize: '0.92rem', boxSizing: 'border-box' }} />
        </div>
        <button onClick={() => setVerFiltros(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0, border: `1px solid ${filtrosActivos ? 'rgba(255,145,77,0.45)' : 'rgba(0,0,0,0.1)'}`, background: filtrosActivos ? 'rgba(255,145,77,0.08)' : '#fff', color: filtrosActivos ? PRIMARY : 'var(--on-surface-variant)', borderRadius: '14px', padding: '0 16px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
          <SlidersHorizontal size={16} /> Filtros{filtrosActivos ? ` · ${filtrosActivos}` : ''}
        </button>
      </div>

      {/* Estado de la membresía: es lo único que se consulta a diario. */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '12px' }}>
        {FILTERS.map(([id, label]) => {
          const n = conteoTrabajo[id];
          return (
            <Pill key={id} active={filter === id} onClick={() => {
              setFilter(id);
              // Una lista de trabajo sin el orden que la hace útil no sirve de
              // nada: se elige solo, y se puede cambiar después.
              if (id === 'porvencer') setOrden('vence');
              if (id === 'sinclases') setOrden('saldo');
            }}>
              {label}{n ? ` · ${n}` : ''}
            </Pill>
          );
        })}
      </div>

      {/* Lo que esté filtrado se ve como pastilla quitable, aunque el panel esté
          cerrado: si no, se filtra sin darse cuenta y la lista "miente". */}
      {(planFilter !== 'all' || mesAlta) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
          {planFilter !== 'all' && (
            <button onClick={() => setPlanFilter('all')} style={chipQuitable}>{planFilter} <X size={12} /></button>
          )}
          {mesAlta && (
            <button onClick={() => setMesAlta('')} style={chipQuitable}>Se inscribieron en {nombreMes(mesAlta)} <X size={12} /></button>
          )}
        </div>
      )}

      {verFiltros && (
        <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '14px', marginBottom: '16px' }}>
          {plans.length > 0 && (
            <>
              <div style={etiquetaFiltro}>Membresía</div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: mesesConAltas.length ? '14px' : 0 }}>
                <Pill active={planFilter === 'all'} onClick={() => setPlanFilter('all')}>Todas</Pill>
                {plans.map(p => <Pill key={p} active={planFilter === p} onClick={() => setPlanFilter(p)}>{p}</Pill>)}
              </div>
            </>
          )}
          {mesesConAltas.length > 0 && (
            <>
              <div style={etiquetaFiltro}>Se inscribieron en</div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                <Pill active={mesAlta === ''} onClick={() => setMesAlta('')}>Cualquier mes</Pill>
                {mesesConAltas.map(([ym, n]) => (
                  <Pill key={ym} active={mesAlta === ym} onClick={() => setMesAlta(ym)}>{nombreMes(ym)} · {n}</Pill>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
          {users === null ? '' : <>{plural(list.length, 'persona', 'personas')}{mesAlta ? <> que se dieron de alta en <b style={{ color: INK }}>{nombreMes(mesAlta)}</b></> : null}</>}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
          <ArrowDownWideNarrow size={14} />
          <select value={orden} onChange={e => setOrden(e.target.value)}
            style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px', padding: '6px 8px', background: '#fff', fontSize: '0.78rem', fontWeight: 700, color: INK, cursor: 'pointer' }}>
            <option value="nombre">Nombre (A–Z)</option>
            <option value="vence">Vence primero</option>
            <option value="saldo">Menos clases</option>
            <option value="alta">Se inscribió al último</option>
          </select>
        </label>
      </div>

      {users === null ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--on-surface-variant)' }}>Cargando…</div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--on-surface-variant)' }}>
          <UserX size={34} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ margin: 0, fontWeight: 700, color: INK }}>Sin resultados</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {list.map(u => (
            <ClientRow key={u.id} u={u} onRole={onRole} onBaja={onBaja} onReactivar={onReactivar} onDelete={onDelete}
              onManage={setManaging} busy={busy} currentUserId={user?.id}
              seleccionada={managing?.id === u.id} compacta={!!managing} />
          ))}
        </div>
      )}

      </div>

      <AnimatePresence>
        {managing && (
          <div className="col-ficha" style={{ flex: '1 1 auto', minWidth: 0 }}>
            <FichaClienta
              key={managing.id}
              client={(users || []).find(u => u.id === managing.id) || managing}
              onClose={() => setManaging(null)}
              patch={patch}
              applyLocal={applyLocal}
              onRole={onRole} onBaja={onBaja} onReactivar={onReactivar} onDelete={onDelete}
              currentUserId={user?.id}
            />
          </div>
        )}
      </AnimatePresence>
      </div>
    </section>
  );
}
