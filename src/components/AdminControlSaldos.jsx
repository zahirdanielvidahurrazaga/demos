import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import SearchableClientSelect from './SearchableClientSelect';
import { RefreshCw, ScrollText, Scale, Receipt, Users, Ban, Undo2, AlertTriangle, ArrowRight, Pencil, X, CheckCircle2, ChevronDown } from 'lucide-react';

// Pestaña "Auditoría" del admin — control de saldos y ventas.
// Se alimenta del libro mayor class_credit_ledger (BD lo llena sola con cada
// cambio de saldo/membresía) + el RPC admin_audit_saldos (descuadres) + sales.
// Nace del reporte de la dueña (13-jul): saldos que no cuadraban, un plan
// pagado sin activar y ventas duplicadas que inflaban el dashboard.

const PRIMARY = 'var(--primary)';

// Etiquetas humanas para la columna `source` del ledger.
const FUENTES = {
  reserva:           { label: 'Reserva (app)',              color: '#2563EB' },
  reserva_admin:     { label: 'Reserva por staff',          color: '#2563EB' },
  cancelacion:       { label: 'Cancelación (devuelta)',     color: '#059669' },
  cancelacion_admin: { label: 'Cancelación por staff',      color: '#059669' },
  promocion_espera:  { label: 'Subió de lista de espera',   color: '#7C3AED' },
  activacion_plan:   { label: 'Cobro / activación de plan', color: '#EA7A3B' },
  alta_con_plan:     { label: 'Alta con plan incluido',     color: '#EA7A3B' },
  ajuste_manual:     { label: 'Ajuste manual de staff',     color: '#DC2626' },
  stripe_sistema:    { label: 'Stripe / sistema',           color: '#0891B2' },
  baja_membresia:    { label: 'Baja de membresía',          color: '#6B7280' },
  app_clienta:       { label: 'App de la clienta',          color: '#6B7280' },
  sistema:           { label: 'Sistema',                    color: '#6B7280' },
  desconocido:       { label: '—',                          color: '#6B7280' },
};

const fmtFecha = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + ' · ' +
         d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
};

// Ojo: una fecha SIN hora ('2026-08-29') la parsea el navegador como medianoche
// UTC y en México se pinta el día anterior. Se le pega mediodía local.
const fmtDia = (iso) => {
  if (!iso) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

const plural = (n, sing, plur) => `${n} ${n === 1 ? sing : plur}`;

const norm = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

const card = { background: 'var(--surface, #fff)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '18px', padding: '18px', marginBottom: '18px' };
const h3 = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', margin: '0 0 4px', color: 'var(--black)', fontFamily: 'var(--font-display)' };
const hint = { fontSize: '0.82rem', color: 'var(--on-surface-variant)', margin: '0 0 14px', lineHeight: 1.45 };
const chip = (bg, color) => ({ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: '8px', background: bg, color, whiteSpace: 'nowrap' });
const leyenda = (bg, border) => ({ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start', background: bg, border: `1px solid ${border}`, borderRadius: '13px', padding: '11px 13px' });
const leyendaTxt = { fontSize: '0.78rem', color: 'var(--on-surface-variant)', lineHeight: 1.45 };
const thStyle = { textAlign: 'left', padding: '8px 10px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--on-surface-variant)', borderBottom: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap' };
const tdStyle = { padding: '9px 10px', fontSize: '0.85rem', color: 'var(--black)', borderBottom: '1px solid rgba(0,0,0,0.05)', verticalAlign: 'top' };

export default function AdminControlSaldos() {
  const { user, allUsers, fetchAllUsers } = useAuth();

  // ── Movimientos (ledger) ──────────────────────────────────────────────────
  const [ledgerUserId, setLedgerUserId] = useState('');
  const [verMovimientos, setVerMovimientos] = useState(false); // consulta, cerrada por defecto
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const fetchLedger = useCallback(async () => {
    setLedgerLoading(true);
    let q = supabase.from('class_credit_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(ledgerUserId ? 100 : 40);
    if (ledgerUserId) q = q.eq('user_id', ledgerUserId);
    const { data } = await q;
    setLedger(data || []);
    setLedgerLoading(false);
  }, [ledgerUserId]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  // ── Descuadres (RPC) ──────────────────────────────────────────────────────
  const [descuadres, setDescuadres] = useState(null);
  const [descLoading, setDescLoading] = useState(false);

  const fetchDescuadres = useCallback(async () => {
    setDescLoading(true);
    const { data, error } = await supabase.rpc('admin_audit_saldos');
    if (!error) setDescuadres(data || []);
    setDescLoading(false);
  }, []);

  useEffect(() => { fetchDescuadres(); }, [fetchDescuadres]);

  // Fecha desde la que el rastro clase↔cobro está completo. Antes de eso no se
  // guardaba a qué clase iba cada descuento, así que NO se audita: cualquier
  // cifra sería inventada (que es justo lo que hacía la versión anterior).
  const [trazableDesde, setTrazableDesde] = useState(null);
  useEffect(() => {
    supabase.from('audit_config').select('trazable_desde').eq('id', 1).maybeSingle()
      .then(({ data }) => setTrazableDesde(data?.trazable_desde || null));
  }, []);

  // Primero lo que le cuesta dinero al estudio (clases no cobradas), y dentro
  // de cada grupo, la clase más reciente arriba.
  const descOrdenados = useMemo(() => {
    if (!descuadres) return null;
    return [...descuadres].sort((a, b) =>
      (a.tipo === 'reserva_sin_cobro' ? 0 : 1) - (b.tipo === 'reserva_sin_cobro' ? 0 : 1)
      || String(b.fecha_clase || '').localeCompare(String(a.fecha_clase || '')));
  }, [descuadres]);

  const resumenDesc = useMemo(() => {
    if (!descuadres?.length) return null;
    const sinCobro = descuadres.filter(d => d.tipo === 'reserva_sin_cobro');
    const deMas = descuadres.filter(d => d.tipo === 'cobro_sin_reserva');
    return {
      sinCobro: sinCobro.length,
      deMas: deMas.length,
      personas: new Set(descuadres.map(d => d.user_id)).size,
    };
  }, [descuadres]);

  // ── Ventas (huérfanas / duplicadas / anular) ─────────────────────────────
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [voidBusy, setVoidBusy] = useState(null);

  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    const { data } = await supabase.from('sales')
      .select('id, user_id, plan_name, amount, method, created_at, client_name, client_email, voided')
      .order('created_at', { ascending: false })
      .limit(400);
    setSales(data || []);
    setSalesLoading(false);
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  // Sospechosas: huérfanas (sin cuenta) + posibles duplicadas (misma clienta,
  // mismo plan, con menos de 30 min entre sí).
  const ventasSospechosas = useMemo(() => {
    const flags = new Map(); // id → motivo
    for (const s of sales) {
      if (!s.user_id && !s.client_name) flags.set(s.id, 'Cuenta borrada');
      else if (!s.user_id) flags.set(s.id, `Cuenta borrada (era ${s.client_name})`);
    }
    const byKey = {};
    for (const s of sales) {
      const key = (s.user_id || norm(s.client_name || '?')) + '|' + s.plan_name;
      (byKey[key] = byKey[key] || []).push(s);
    }
    for (const group of Object.values(byKey)) {
      if (group.length < 2) continue;
      const sorted = group.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      for (let i = 1; i < sorted.length; i++) {
        const gapMin = (new Date(sorted[i].created_at) - new Date(sorted[i - 1].created_at)) / 60000;
        if (gapMin < 30) {
          const motivo = `Posible duplicada (${Math.round(gapMin) || '<1'} min después de otra igual)`;
          flags.set(sorted[i].id, flags.has(sorted[i].id) ? flags.get(sorted[i].id) + ' · ' + motivo : motivo);
          if (!flags.has(sorted[i - 1].id)) flags.set(sorted[i - 1].id, 'Tiene una posible duplicada');
        }
      }
    }
    return sales.filter(s => flags.has(s.id) || s.voided).map(s => ({ ...s, motivo: flags.get(s.id) || '' }));
  }, [sales]);

  const montoFantasma = useMemo(() =>
    ventasSospechosas.filter(s => !s.voided && /duplicada|borrada/i.test(s.motivo)).reduce((t, s) => t + (s.amount || 0), 0),
  [ventasSospechosas]);

  const toggleVoid = async (s) => {
    const accion = s.voided ? 'restaurar' : 'ANULAR';
    const quien = s.client_name || 'cuenta borrada';
    if (!confirm(`¿${accion} la venta de "${s.plan_name}" ($${s.amount}) de ${quien}?\n\n${s.voided ? 'Volverá a contar en el dashboard.' : 'Dejará de contar como ingreso en el dashboard. No se borra: queda marcada.'}`)) return;
    setVoidBusy(s.id);
    const { error } = await supabase.from('sales').update(
      s.voided ? { voided: false, voided_at: null, voided_by: null }
               : { voided: true, voided_at: new Date().toISOString(), voided_by: user?.id }
    ).eq('id', s.id);
    setVoidBusy(null);
    if (error) { alert('No se pudo actualizar: ' + error.message); return; }
    fetchSales();
  };

  // ── Cuentas duplicadas ────────────────────────────────────────────────────
  const gruposDuplicados = useMemo(() => {
    const clients = (allUsers || []).filter(u => u.role === 'CLIENT');
    const grupos = [];
    const usado = new Set();
    for (let i = 0; i < clients.length; i++) {
      if (usado.has(clients[i].id)) continue;
      const a = norm(clients[i].full_name || '');
      if (!a) continue;
      const grupo = [clients[i]];
      for (let j = i + 1; j < clients.length; j++) {
        if (usado.has(clients[j].id)) continue;
        const b = norm(clients[j].full_name || '');
        const mismoTel = clients[i].phone && clients[j].phone && clients[i].phone.replace(/\D/g, '') === clients[j].phone.replace(/\D/g, '');
        // Mismo nombre, o uno es "prefijo por palabras" del otro (≥2 palabras):
        // "margarita ruiz" ⊂ "margarita ruiz lara".
        const prefijo = (x, y) => x.split(' ').length >= 2 && (y === x || y.startsWith(x + ' '));
        if (b && (mismoTel || prefijo(a, b) || prefijo(b, a))) {
          grupo.push(clients[j]);
          usado.add(clients[j].id);
        }
      }
      if (grupo.length > 1) { grupo.forEach(g => usado.add(g.id)); grupos.push(grupo); }
    }
    return grupos;
  }, [allUsers]);

  const nombreLedger = ledgerUserId ? (allUsers || []).find(u => u.id === ledgerUserId)?.full_name : null;

  // ── Corregir saldo (con motivo → queda en el ledger) ─────────────────────
  const [fixTarget, setFixTarget] = useState(null); // { userId, nombre, saldoActual, sugerido }
  const [fixSaldo, setFixSaldo] = useState('');
  const [fixMotivo, setFixMotivo] = useState('');
  const [fixBusy, setFixBusy] = useState(false);

  const openFix = (userId, nombre, saldoActual, sugerido, motivoSugerido = '') => {
    setFixTarget({ userId, nombre, saldoActual });
    setFixSaldo(String(sugerido ?? saldoActual ?? 0));
    setFixMotivo(motivoSugerido);
  };

  const saveFix = async () => {
    const nuevo = parseInt(fixSaldo, 10);
    if (Number.isNaN(nuevo) || nuevo < 0 || nuevo > 9999) { alert('El saldo debe ser un número entre 0 y 9999.'); return; }
    if (!fixMotivo.trim()) { alert('Escribe el motivo: es lo que queda en el historial.'); return; }
    setFixBusy(true);
    const { error } = await supabase.rpc('admin_set_saldo', {
      p_user_id: fixTarget.userId, p_new_balance: nuevo, p_note: fixMotivo.trim(),
    });
    setFixBusy(false);
    if (error) {
      const msgs = { NO_AUTORIZADO: 'Solo admin/recepción pueden corregir saldos.', MOTIVO_REQUERIDO: 'Escribe el motivo.', SALDO_INVALIDO: 'Saldo inválido.', CLIENTA_NO_EXISTE: 'La clienta ya no existe.' };
      alert(msgs[error.message] || 'No se pudo corregir: ' + error.message);
      return;
    }
    setFixTarget(null);
    fetchDescuadres();
    fetchLedger();
    fetchAllUsers?.();
  };

  // Cuántas cosas piden acción de verdad. Auditoría es una BANDEJA DE
  // PENDIENTES, no un explorador de datos: su estado normal es "todo cuadra".
  // Cuando se mezclaron las dos cosas, la dueña leyó 37 renglones de ruido como
  // 37 tareas y "corrigió" 53 clases que estaban bien cobradas.
  // Las ya anuladas siguen en la lista (para poder restaurarlas) pero NO cuentan
  // como pendiente: ya se atendieron.
  const ventasPendientes = (ventasSospechosas || []).filter(v => !v.voided).length;
  const pendientes = (descuadres?.length || 0) + ventasPendientes + (gruposDuplicados?.length || 0);
  const cargando = descuadres === null;

  // El número se desglosa a propósito. Un total suelto ("15 cosas") no dice si
  // hay que corregir saldos o revisar cobros, y esa ambigüedad es la que hizo
  // que se "arreglara" a bulto lo que solo había que mirar.
  const desglose = [
    descuadres?.length ? `${plural(descuadres.length, 'clase con el cobro descuadrado', 'clases con el cobro descuadrado')}` : null,
    ventasPendientes ? `${plural(ventasPendientes, 'venta por revisar', 'ventas por revisar')}` : null,
    gruposDuplicados?.length ? `${plural(gruposDuplicados.length, 'posible cuenta duplicada', 'posibles cuentas duplicadas')}` : null,
  ].filter(Boolean);

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0, color: 'var(--black)' }}>Auditoría</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>Solo lo que necesita tu atención</span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 18px', marginBottom: '18px',
        borderRadius: '18px',
        background: cargando ? 'rgba(0,0,0,0.03)' : pendientes === 0 ? 'rgba(5,150,105,0.08)' : 'rgba(234,122,59,0.08)',
        border: `1px solid ${cargando ? 'rgba(0,0,0,0.06)' : pendientes === 0 ? 'rgba(5,150,105,0.22)' : 'rgba(234,122,59,0.25)'}`,
      }}>
        {!cargando && (pendientes === 0
          ? <CheckCircle2 size={22} color="#059669" style={{ flexShrink: 0, marginTop: '1px' }} />
          : <AlertTriangle size={22} color="#EA7A3B" style={{ flexShrink: 0, marginTop: '1px' }} />)}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--black)', fontFamily: 'var(--font-display)' }}>
            {cargando ? 'Revisando…' : pendientes === 0 ? 'Todo cuadra ✓' : desglose.join(' · ')}
          </div>
          <p style={{ margin: '5px 0 0', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--on-surface-variant)' }}>
            {cargando ? 'Un momento.' : pendientes === 0
              ? <>No hay nada que corregir. Si una clienta te reclama su saldo, <b>búscala en Clientas → Clases</b>: ahí está su historial completo y la explicación de su saldo.</>
              : <>Cada renglón de abajo es un <b>hecho concreto</b>, no una estimación: la clase o el cobro exacto. Lo que no aparezca aquí, está bien. Y <b>revisar puede terminar en "déjalo como está"</b> — no todo lo listado hay que cambiarlo.</>}
          </p>
        </div>
      </div>

      {/* ── 1. DESCUADRES ── */}
      <div style={card}>
        <h3 style={h3}><Scale size={18} color={PRIMARY} /> Saldos que no cuadran
          <button onClick={fetchDescuadres} disabled={descLoading} style={{ marginLeft: 'auto', border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--black)' }}>
            <RefreshCw size={13} style={descLoading ? { animation: 'spin 1s linear infinite' } : {}} /> Actualizar
          </button>
        </h3>
        <p style={hint}>
          Cada renglón es <b>una clase concreta</b> donde el cobro no cuadra con la reserva.
          No es un cálculo ni una estimación: es el movimiento que falta o que sobra.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div style={leyenda('rgba(220,38,38,0.07)', 'rgba(220,38,38,0.18)')}>
            <span style={chip('rgba(220,38,38,0.1)', '#DC2626')}>No se le descontó</span>
            <span style={leyendaTxt}>Tiene lugar en la clase y nunca se le cobró: <b>el estudio se la está regalando</b>.</span>
          </div>
          <div style={leyenda('rgba(234,122,59,0.07)', 'rgba(234,122,59,0.2)')}>
            <span style={chip('rgba(234,122,59,0.12)', '#EA7A3B')}>Se le descontó de más</span>
            <span style={leyendaTxt}>Se le cobró la clase y ya no tiene lugar en ella: <b>el estudio se la debe</b>.</span>
          </div>
        </div>
        <p style={{ ...hint, display: 'flex', gap: '7px', alignItems: 'flex-start', marginBottom: '14px' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px', color: '#EA7A3B' }} />
          <span>
            <b>Ojo:</b> aquí ya no aparecen los pagos en efectivo, las cortesías ni las reposiciones.
            Esas son decisiones tuyas, no errores{trazableDesde ? <> — y solo se revisa lo que pasó del <b>{fmtDia(trazableDesde)}</b> en adelante,
            que es desde cuando se guarda a qué clase fue cada descuento</> : null}.
          </span>
        </p>

        {descuadres === null ? <p style={hint}>Cargando…</p> : descuadres.length === 0 ? (
          <p style={{ ...hint, color: '#059669', fontWeight: 700, margin: 0 }}>Todo cuadra ✓</p>
        ) : (
          <>
            {resumenDesc && (
              <p style={{ ...hint, marginBottom: '12px' }}>
                <b>{plural(descuadres.length, 'clase', 'clases')}</b> por revisar
                en <b>{plural(resumenDesc.personas, 'clienta', 'clientas')}</b>:{' '}
                {resumenDesc.sinCobro > 0 && <><b>{resumenDesc.sinCobro}</b> sin descontar</>}
                {resumenDesc.sinCobro > 0 && resumenDesc.deMas > 0 && ' · '}
                {resumenDesc.deMas > 0 && <><b>{resumenDesc.deMas}</b> descontadas de más</>}.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {descOrdenados.map(d => {
                const sinCobro = d.tipo === 'reserva_sin_cobro';
                const acento = sinCobro ? '#DC2626' : '#EA7A3B';
                const motivo = sinCobro
                  ? `Cobro de la clase "${d.clase}" del ${fmtDia(d.fecha_clase)}, que había quedado sin descontar`
                  : `Devolución de la clase "${d.clase}" del ${fmtDia(d.fecha_clase)}, que se cobró sin que tuviera lugar`;
                return (
                  <div key={`${d.user_id}-${d.class_id}-${d.tipo}`} style={{ border: '1px solid rgba(0,0,0,0.08)', borderLeft: `4px solid ${acento}`, borderRadius: '14px', padding: '13px 15px', background: 'rgba(0,0,0,0.015)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap', marginBottom: '7px' }}>
                      <b style={{ fontSize: '0.95rem', color: 'var(--black)' }}>{d.nombre || d.email}</b>
                      <span style={chip(sinCobro ? 'rgba(220,38,38,0.1)' : 'rgba(234,122,59,0.12)', acento)}>
                        {sinCobro ? 'No se le descontó' : 'Se le descontó de más'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.86rem', color: 'var(--black)', margin: '0 0 9px', lineHeight: 1.5 }}>
                      {d.detalle}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '9px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                        Hoy tiene <b style={{ color: 'var(--black)' }}>{plural(d.saldo, 'clase', 'clases')}</b>
                      </span>
                      <ArrowRight size={13} color="var(--on-surface-variant)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: acento }}>
                        quedaría en {plural(d.saldo_sugerido, 'clase', 'clases')}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>
                        · {(d.plan || '').replace('Plan ', '') || 'sin plan'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button onClick={() => openFix(d.user_id, d.nombre || d.email, d.saldo, d.saldo_sugerido, motivo)}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', border: 'none', borderRadius: '10px', padding: '7px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(255,145,77,0.14)', color: PRIMARY }}>
                        <Pencil size={13} /> {sinCobro ? 'Descontarle esa clase' : 'Devolverle esa clase'}
                      </button>
                      <button onClick={() => setLedgerUserId(d.user_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        Ver sus movimientos <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── 2. MOVIMIENTOS (ledger) — CONSULTA, no pendientes ──
          Colapsado a propósito: es la parte de "explorar datos", y mezclarla con
          la de "arreglar cosas" es lo que enseñó a leer cualquier número como
          una tarea. El historial por clienta ahora vive en su ficha. */}
      <div style={card}>
        <button onClick={() => setVerMovimientos(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
          <ScrollText size={18} color="var(--on-surface-variant)" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-display)' }}>
            Movimientos de todo el estudio
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--on-surface-variant)', background: 'rgba(0,0,0,0.05)', borderRadius: '999px', padding: '3px 9px' }}>consulta</span>
          <ChevronDown size={16} color="var(--on-surface-variant)" style={{ marginLeft: 'auto', transform: verMovimientos ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }} />
        </button>
        <p style={{ ...hint, margin: '10px 0 0' }}>
          Esto <b>no son pendientes</b>. Para el historial de UNA clienta, ábrela en <b>Clientas → Clases</b>.
        </p>
      <div style={{ display: verMovimientos ? 'block' : 'none', marginTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
        <h3 style={h3}><ScrollText size={18} color={PRIMARY} /> Movimientos de saldo
          <button onClick={fetchLedger} disabled={ledgerLoading} style={{ marginLeft: 'auto', border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--black)' }}>
            <RefreshCw size={13} style={ledgerLoading ? { animation: 'spin 1s linear infinite' } : {}} /> Actualizar
          </button>
        </h3>
        <p style={hint}>
          Historial automático de <b>cada</b> cambio de clases o membresía: reservas, cancelaciones, cobros,
          ajustes manuales y Stripe — con quién lo hizo. Registra desde el 14 de julio de 2026 (lo anterior no existe).
        </p>
        <div style={{ maxWidth: '420px', marginBottom: '12px' }}>
          <SearchableClientSelect clients={allUsers || []} value={ledgerUserId} onChange={setLedgerUserId} placeholder="Filtrar por clienta (o deja vacío: últimos movimientos)…" />
        </div>
        {nombreLedger && (
          <p style={{ ...hint, marginTop: '-4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span>Mostrando movimientos de <b>{nombreLedger}</b>.</span>
            <button onClick={() => {
              const u = (allUsers || []).find(x => x.id === ledgerUserId);
              openFix(ledgerUserId, nombreLedger, u?.classes_remaining ?? 0, u?.classes_remaining ?? 0);
            }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: 'none', borderRadius: '9px', padding: '5px 9px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255,145,77,0.12)', color: PRIMARY }}>
              <Pencil size={12} /> Ajustar saldo
            </button>
          </p>
        )}
        {ledger.length === 0 ? (
          <p style={{ ...hint, margin: 0 }}>{ledgerLoading ? 'Cargando…' : 'Sin movimientos registrados todavía.'}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thStyle}>Cuándo</th>{!ledgerUserId && <th style={thStyle}>Clienta</th>}<th style={thStyle}>Cambio</th>
                <th style={thStyle}>Saldo</th><th style={thStyle}>Origen</th><th style={thStyle}>Hecho por</th><th style={thStyle}>Nota</th>
              </tr></thead>
              <tbody>
                {ledger.map(m => {
                  const f = FUENTES[m.source] || FUENTES.desconocido;
                  return (
                    <tr key={m.id}>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtFecha(m.created_at)}</td>
                      {!ledgerUserId && <td style={tdStyle}><b>{m.user_name || m.user_email || '—'}</b></td>}
                      <td style={{ ...tdStyle, fontWeight: 800, color: m.delta > 0 ? '#059669' : m.delta < 0 ? '#DC2626' : 'var(--on-surface-variant)' }}>
                        {m.delta > 0 ? `+${m.delta}` : m.delta}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{m.balance_before ?? '—'} → {m.balance_after ?? '—'}</td>
                      <td style={tdStyle}><span style={chip(f.color + '1a', f.color)}>{f.label}</span></td>
                      <td style={tdStyle}>{m.actor_name || (m.db_role === 'service_role' ? 'Servidor' : '—')}</td>
                      <td style={{ ...tdStyle, fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>{m.note || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* ── 3. VENTAS SOSPECHOSAS ── */}
      <div style={card}>
        <h3 style={h3}><Receipt size={18} color={PRIMARY} /> Ventas por revisar
          <button onClick={fetchSales} disabled={salesLoading} style={{ marginLeft: 'auto', border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--black)' }}>
            <RefreshCw size={13} style={salesLoading ? { animation: 'spin 1s linear infinite' } : {}} /> Actualizar
          </button>
        </h3>
        <p style={hint}>
          Cobros registrados a cuentas que ya se borraron y cobros repetidos del mismo plan a la misma clienta
          en menos de 30 minutos (doble click o re-cobro). <b>Anular</b> una venta la saca del dashboard financiero
          sin borrarla — úsalo con las duplicadas para que el ingreso del mes sea el real.
        </p>
        {montoFantasma > 0 && (
          <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.1)', borderRadius: '12px', padding: '10px 14px' }}>
            <AlertTriangle size={16} /> Hay ${montoFantasma.toLocaleString('es-MX')} en ventas por revisar que hoy cuentan como ingreso.
          </p>
        )}
        {ventasSospechosas.length === 0 ? (
          <p style={{ ...hint, color: '#059669', fontWeight: 700, margin: 0 }}>{salesLoading ? 'Cargando…' : 'Nada sospechoso ✓'}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thStyle}>Fecha</th><th style={thStyle}>Clienta</th><th style={thStyle}>Plan</th>
                <th style={thStyle}>Monto</th><th style={thStyle}>Método</th><th style={thStyle}>Motivo</th><th style={thStyle}></th>
              </tr></thead>
              <tbody>
                {ventasSospechosas.map(s => (
                  <tr key={s.id} style={s.voided ? { opacity: 0.45 } : {}}>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtFecha(s.created_at)}</td>
                    <td style={tdStyle}><b>{s.client_name || 'Cuenta borrada'}</b>{s.client_email ? <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>{s.client_email}</div> : null}</td>
                    <td style={tdStyle}>{s.plan_name}</td>
                    <td style={tdStyle}><b>${s.amount}</b></td>
                    <td style={tdStyle}>{s.method}</td>
                    <td style={{ ...tdStyle, fontSize: '0.78rem' }}>{s.voided ? <span style={chip('rgba(107,114,128,0.12)', '#6B7280')}>ANULADA</span> : s.motivo}</td>
                    <td style={tdStyle}>
                      <button onClick={() => toggleVoid(s)} disabled={voidBusy === s.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', border: 'none', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, background: s.voided ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.08)', color: s.voided ? '#059669' : '#DC2626' }}>
                        {s.voided ? <><Undo2 size={13} /> Restaurar</> : <><Ban size={13} /> Anular</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. CUENTAS DUPLICADAS ── */}
      <div style={card}>
        <h3 style={h3}><Users size={18} color={PRIMARY} /> Posibles cuentas duplicadas</h3>
        <p style={hint}>
          Clientas con nombre casi idéntico o el mismo teléfono. El riesgo: cobrar el plan en una cuenta mientras
          la clienta reserva desde la otra. Antes de borrar una, revisa en «Movimientos» cuál usa de verdad —
          y mejor dala de baja en lugar de borrarla (borrar deja las ventas sin nombre).
        </p>
        {gruposDuplicados.length === 0 ? (
          <p style={{ ...hint, color: '#059669', fontWeight: 700, margin: 0 }}>Sin duplicados aparentes ✓</p>
        ) : gruposDuplicados.map((grupo, gi) => (
          <div key={gi} style={{ border: '1px dashed rgba(0,0,0,0.15)', borderRadius: '14px', padding: '12px 14px', marginBottom: '10px' }}>
            {grupo.map(u => (
              <div key={u.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
                <b style={{ fontSize: '0.9rem', color: 'var(--black)' }}>{u.full_name}</b>
                <span style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>{u.email}</span>
                <span style={chip('rgba(0,0,0,0.05)', 'var(--on-surface-variant)')}>{u.membership_plan || 'Sin plan'}</span>
                <span style={chip('rgba(255,145,77,0.12)', PRIMARY)}>{(u.classes_remaining ?? 0) >= 9000 ? '∞' : (u.classes_remaining ?? 0)} clases</span>
                <button onClick={() => setLedgerUserId(u.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: PRIMARY, fontWeight: 700, fontSize: '0.75rem' }}>Ver movimientos →</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── MODAL: corregir saldo ── */}
      {fixTarget && (
        <div onClick={() => !fixBusy && setFixTarget(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '20px', padding: '22px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h3 style={{ ...h3, margin: 0 }}><Pencil size={17} color={PRIMARY} /> Corregir saldo</h3>
              <button onClick={() => setFixTarget(null)} disabled={fixBusy} style={{ border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} />
              </button>
            </div>
            <p style={{ ...hint, marginBottom: '14px' }}>
              <b>{fixTarget.nombre}</b> tiene hoy <b>{plural(fixTarget.saldoActual, 'clase', 'clases')}</b>.
              El número que escribas <b>reemplaza</b> su saldo (no se suma).
            </p>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: '5px' }}>Clases que le quedarán</label>
            <input type="number" min="0" max="9999" value={fixSaldo} onChange={(e) => setFixSaldo(e.target.value)}
              style={{ width: '100%', padding: '11px 13px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '1rem', fontWeight: 700, marginBottom: '13px', boxSizing: 'border-box' }} />
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: '5px' }}>Motivo (obligatorio)</label>
            <textarea value={fixMotivo} onChange={(e) => setFixMotivo(e.target.value)} rows={3} placeholder="Ej. Corrección por auditoría: reservas sin descontar"
              style={{ width: '100%', padding: '11px 13px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '0.88rem', resize: 'vertical', marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <p style={{ ...hint, fontSize: '0.75rem', marginBottom: '14px' }}>
              Quedará en «Movimientos» como ajuste manual, con tu nombre y este motivo.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setFixTarget(null)} disabled={fixBusy}
                style={{ flex: 1, padding: '12px', borderRadius: '13px', border: '1px solid rgba(0,0,0,0.12)', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: 'var(--black)' }}>
                Cancelar
              </button>
              <button onClick={saveFix} disabled={fixBusy || !fixMotivo.trim()}
                style={{ flex: 1, padding: '12px', borderRadius: '13px', border: 'none', background: PRIMARY, color: 'white', cursor: fixBusy ? 'wait' : 'pointer', fontWeight: 700, fontSize: '0.9rem', opacity: fixBusy || !fixMotivo.trim() ? 0.55 : 1 }}>
                {fixBusy ? 'Guardando…' : 'Guardar corrección'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
