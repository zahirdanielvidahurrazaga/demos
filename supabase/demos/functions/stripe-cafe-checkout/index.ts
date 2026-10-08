import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─────────────────────────────────────────────────────────────────────────────
// VERSIÓN DE DEMOSTRACIÓN de stripe-cafe-checkout (solo proyecto "Demos").
//
// Se llama IGUAL que la de Be Fit para que Cafeteria.jsx funcione sin tocarlo,
// pero no habla con Stripe: calcula el precio en el servidor y crea el pedido
// `pending_payment` exactamente como la real, y en vez de la URL de Stripe
// Checkout devuelve la de la PASARELA DE PRUEBA de la maqueta (/pago-prueba),
// donde se "paga" con una tarjeta de prueba. El pedido lo marca pagado la
// función `pago-prueba`, que hace lo mismo que el webhook de Stripe.
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { items, gift, pickupTime, noStraw, returnUrl } = await req.json();

    const raw = Array.isArray(items) ? items : (items ? [items] : []);
    const list = raw.map((it: any) => ({
      product_id: it.product_id ?? it.id,
      quantity: it.quantity ?? it.qty ?? 1,
      option_ids: it.option_ids || [],
      notes: it.notes || '',
    })).filter((it: any) => it.product_id);
    if (list.length === 0) {
      return Response.json({ error: 'Se requiere al menos un producto' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // El dueño del pedido sale SOLO del token: en la pasarela se comprueba que
    // quien paga sea quien pidió.
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: { user: authUser } } = await supabase.auth.getUser(token);
    if (!authUser?.id) {
      return Response.json({ error: 'Inicia sesión para pedir' }, { status: 401, headers: corsHeaders });
    }

    const productIds = [...new Set(list.map((i: any) => i.product_id))];
    const optionIds = [...new Set(list.flatMap((i: any) => i.option_ids).filter(Boolean))];

    const [{ data: products, error: pErr }, { data: options, error: oErr }] = await Promise.all([
      supabase.from('cafe_products').select('id, name, price, available').in('id', productIds),
      optionIds.length ? supabase.from('cafe_options').select('id, name, price_delta, available').in('id', optionIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (pErr) throw pErr;
    if (oErr) throw oErr;
    const prodById = new Map((products ?? []).map((p) => [p.id, p]));
    const optById = new Map((options ?? []).map((o) => [o.id, o]));

    let total = 0;
    const snapshot: any[] = [];
    for (const it of list) {
      const p = prodById.get(it.product_id);
      if (!p) throw new Error(`Producto no encontrado: ${it.product_id}`);
      if (!p.available) throw new Error(`Producto no disponible: ${p.name}`);
      const qty = Math.max(1, parseInt(it.quantity ?? 1, 10) || 1);
      let unit = Number(p.price);
      const chosen: any[] = [];
      for (const oid of it.option_ids) {
        const o = optById.get(oid);
        if (!o || o.available === false) continue;
        unit += Number(o.price_delta || 0);
        chosen.push({ id: o.id, name: o.name, price_delta: o.price_delta || 0 });
      }
      const notes = (it.notes || '').toString().slice(0, 200);
      const lineTotal = unit * qty;
      total += lineTotal;
      snapshot.push({ product_id: p.id, name: p.name, qty, base_price: p.price, options: chosen, notes, line_total: lineTotal });
    }
    if (total <= 0) throw new Error('Total inválido');

    const giftObj = gift && gift.is_gift ? gift : null;
    const { data: order, error: ordErr } = await supabase.from('cafe_orders').insert({
      user_id: authUser.id,
      status: 'pending_payment',
      items: snapshot,
      subtotal: total,
      total,
      pickup_time: pickupTime || null,
      is_gift: !!giftObj,
      gift_recipient_name: giftObj?.recipient_name || null,
      gift_recipient_user_id: giftObj?.recipient_user_id || null,
      gift_message: giftObj?.message || null,
      no_straw: !!noStraw,
    }).select('id').single();
    if (ordErr) throw ordErr;

    // Mismo dominio desde donde se pidió (la maqueta), nunca uno arbitrario.
    const appUrl = (typeof returnUrl === 'string' && /^https?:\/\/[^/]+$/.test(returnUrl.replace(/\/$/, '')))
      ? returnUrl.replace(/\/$/, '')
      : '';
    const url = `${appUrl}/pago-prueba?orden=${order.id}`;

    return Response.json({ url, orderId: order.id }, { headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('stripe-cafe-checkout (demo) error:', message);
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
