import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─────────────────────────────────────────────────────────────────────────────
// PASARELA DE PRUEBA de la maqueta (solo proyecto "Demos").
//
// Sustituye a Stripe: no mueve dinero, pero el pedido sigue el camino real.
// "Pagar" hace lo mismo que el webhook de Stripe con un checkout de cafetería:
// marca el pedido como pagado (de forma idempotente) y avisa a la clienta, a la
// barra y, si es regalo, a quien lo recibe. Como en Stripe en modo prueba:
//   · 4242 4242 4242 4242 → aprobada
//   · 4000 0000 0000 0002 → rechazada (el pedido sigue esperando pago)
// "Cancelar" deja el pedido como cancelado.
// ─────────────────────────────────────────────────────────────────────────────

const TARJETA_RECHAZADA = '4000000000000002';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { orderId, accion, tarjeta } = await req.json();
    if (!orderId || !['pagar', 'cancelar'].includes(accion)) {
      return Response.json({ error: 'Solicitud inválida' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.id) return Response.json({ error: 'Inicia sesión para pagar' }, { status: 401, headers: corsHeaders });

    const { data: pedido } = await supabase.from('cafe_orders')
      .select('id, user_id, status').eq('id', orderId).maybeSingle();
    if (!pedido || pedido.user_id !== user.id) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404, headers: corsHeaders });
    }
    if (pedido.status !== 'pending_payment') {
      return Response.json({ error: 'Este pedido ya no está esperando pago' }, { status: 409, headers: corsHeaders });
    }

    if (accion === 'cancelar') {
      const { data: cancelado, error: cancelErr } = await supabase.from('cafe_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId).eq('status', 'pending_payment')
        .select('id').maybeSingle();
      if (cancelErr) throw cancelErr;
      if (!cancelado) return Response.json({ error: 'Este pedido ya no está esperando pago' }, { status: 409, headers: corsHeaders });
      return Response.json({ ok: true, estado: 'cancelado' }, { headers: corsHeaders });
    }

    const numero = String(tarjeta || '').replace(/\D/g, '');
    if (numero === TARJETA_RECHAZADA) {
      return Response.json({ error: 'Tarjeta rechazada por el banco (tarjeta de prueba de rechazo).' }, { status: 402, headers: corsHeaders });
    }
    if (numero.length < 15) {
      return Response.json({ error: 'Número de tarjeta incompleto' }, { status: 400, headers: corsHeaders });
    }

    // Idempotente: solo pasa si seguía pendiente (igual que el webhook).
    const { data: order } = await supabase.from('cafe_orders')
      .update({ status: 'paid', payment_intent_id: `prueba_${crypto.randomUUID().slice(0, 8)}` })
      .eq('id', orderId).eq('status', 'pending_payment')
      .select('*').maybeSingle();
    if (!order) return Response.json({ error: 'Este pedido ya no está esperando pago' }, { status: 409, headers: corsHeaders });

    const resumen = (order.items || []).map((i: any) => `${i.qty}× ${i.name}`).join(', ');
    const avisos: any[] = [{
      user_id: user.id, type: 'payment', title: 'Pedido confirmado',
      body: `${resumen ? resumen + '. ' : ''}¡Ya lo estamos preparando!`, status: 'sent',
    }];
    const { data: baristas } = await supabase.from('users').select('id').eq('role', 'BARISTA');
    for (const b of baristas ?? []) {
      avisos.push({ user_id: b.id, type: 'general', title: 'Nuevo pedido', body: resumen || 'Tienes un pedido nuevo por preparar.', status: 'sent' });
    }
    if (order.gift_recipient_user_id && order.gift_recipient_user_id !== user.id) {
      avisos.push({
        user_id: order.gift_recipient_user_id, type: 'payment', title: '¡Te enviaron un regalo!',
        body: order.gift_message || `Te regalaron: ${resumen || 'un pedido de la cafetería'}`, status: 'sent',
      });
    }
    const { error: avisoErr } = await supabase.from('notification_logs').insert(avisos);
    if (avisoErr) console.error('pago-prueba: avisos', avisoErr.message);

    return Response.json({ ok: true, estado: 'pagado', total: order.total }, { headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('pago-prueba error:', message);
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
