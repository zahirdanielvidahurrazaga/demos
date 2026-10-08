// ─────────────────────────────────────────────────────────────────────────────
// COBRAR UN PLAN — una sola implementación, dos pantallas.
//
// Se cobra desde Ventas y también desde la ficha de la clienta. Tener el flujo
// duplicado sería pedir que uno de los dos pierda los candados con el tiempo, y
// aquí los candados no son adorno: en agosto hubo 6 ventas duplicadas y en
// julio un cobro a una cuenta equivocada dejó $8,400 fantasma en el dashboard.
//
// El orden de los pasos IMPORTA:
//   1. confirmar a quién y cuánto (el cobro a la persona equivocada fue real),
//   2. avisar si el cobro le PISA un saldo vigente,
//   3. buscar un cobro idéntico reciente ANTES de activar — activar reemplaza
//      el saldo y eso ya no se deshace solo,
//   4. activar el plan,
//   5. registrar la venta y, si falla, DECIRLO (antes se tragaba en silencio y
//      al corte le faltaba dinero sin que nadie se enterara).
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

const MINUTOS_SOSPECHA = 10;

/**
 * @returns {Promise<{ok: boolean, motivo?: 'cancelado'|'sin_plan'|'error'}>}
 */
export async function cobrarPlanAClienta({
  clienta,          // fila de users (necesita id, full_name, email, membership_*)
  plan,             // objeto de PLAN_BY_NAME: { name, amount, classes }
  metodo,           // 'efectivo' | 'tarjeta' | 'transferencia'
  vendedorId,       // user.id de quien cobra
  activatePlan,     // del AuthContext
  confirmar = (m) => window.confirm(m),
  avisar = (m) => window.alert(m),
}) {
  if (!clienta?.id || !plan) return { ok: false, motivo: 'sin_plan' };

  const quien = clienta.full_name || clienta.email || 'la clienta seleccionada';
  let msg = `Cobrar ${plan.name} ($${plan.amount}) en ${metodo} a:\n\n${quien}\n${clienta.email || ''}`;

  const vigente = clienta.membership_status === 'ACTIVE' && (clienta.classes_remaining ?? 0) > 0
    && (!clienta.plan_expires_at || new Date(clienta.plan_expires_at) > new Date());
  if (vigente) {
    const saldo = clienta.classes_remaining >= 9000 ? 'ilimitadas' : `${clienta.classes_remaining}`;
    msg += `\n\nOJO: ya tiene ${clienta.membership_plan || 'un plan'} ACTIVO con ${saldo} clases sin usar.`
         + `\nAl cobrar, su saldo se REEMPLAZA por ${plan.classes} (no se suman).`;
  }
  if (!confirmar(msg)) return { ok: false, motivo: 'cancelado' };

  // Doble captura del mismo cobro: las 6 de agosto iban de 14 a 29 segundos
  // aparte. No es doble clic —son dos pasadas completas—, así que ni el candado
  // del botón ni el confirm de arriba las detienen.
  const desde = new Date(Date.now() - MINUTOS_SOSPECHA * 60 * 1000).toISOString();
  const { data: recientes } = await supabase.from('sales')
    .select('created_at')
    .eq('user_id', clienta.id).eq('plan_name', plan.name)
    .eq('voided', false).gte('created_at', desde)
    .order('created_at', { ascending: false }).limit(1);

  if (recientes?.length) {
    const seg = Math.max(1, Math.round((Date.now() - new Date(recientes[0].created_at)) / 1000));
    const cuando = seg < 90 ? `hace ${seg} segundos` : `hace ${Math.round(seg / 60)} minutos`;
    const seguir = confirmar(
      `⚠️ YA LE COBRASTE ${plan.name} a ${quien} ${cuando}.\n\n`
      + `Si le vuelves a cobrar:\n`
      + `· se registra un segundo pago de $${plan.amount} en el reporte\n`
      + `· su saldo se REEMPLAZA otra vez por ${plan.classes} clases\n\n`
      + `¿De verdad es un pago DISTINTO?`,
    );
    if (!seguir) return { ok: false, motivo: 'cancelado' };
  }

  await activatePlan(plan.name, plan.classes, clienta.id);

  const { error: ventaError } = await supabase.from('sales').insert({
    user_id: clienta.id, sold_by: vendedorId, plan_name: plan.name,
    amount: plan.amount || 0, method: metodo,
  });

  if (ventaError) {
    avisar(
      /VENTA_DUPLICADA/.test(ventaError.message || '')
        ? `El plan de ${quien} SÍ quedó activo, pero no se registró la venta porque el sistema la detectó como cobro repetido.\n\nSi era un pago distinto, regístralo de nuevo en un minuto.`
        : `El plan de ${quien} SÍ quedó activo, pero NO se pudo registrar la venta en el reporte:\n\n${ventaError.message}\n\nAvísale a Zahir para que no falte ese dinero en el corte.`,
    );
  }

  return { ok: true };
}
