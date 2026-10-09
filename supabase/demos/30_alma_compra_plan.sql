-- ─────────────────────────────────────────────────────────────────────────────
-- COMPRA DE PLAN CON PASARELA DE PRUEBA (solo proyecto "Demos")
--
-- La app de clienta de Studio Alma (src/demo/alma/Planes.jsx) vende el plan
-- sin Stripe. Hace lo mismo que el webhook de Stripe al confirmar un pago de
-- membresía: activa el plan (clases + vigencia de 1 mes), registra la venta
-- para que Dirección la vea, deja el movimiento en la bitácora de saldos con
-- su origen y avisa a la clienta. Solo actúa sobre quien está en sesión.
--   · 4242 4242 4242 4242 → aprobada
--   · 4000 0000 0000 0002 → rechazada
-- SECURITY DEFINER (dueño postgres): pasa el candado enforce_user_profile_guard
-- igual que el webhook (service_role); la clienta sigue sin poder tocar su saldo
-- directo. El reinicio nocturno (demo_reset) regresa a las cuentas de ejemplo.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.demo_comprar_plan(p_plan text, p_tarjeta text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_plan membership_plans%rowtype;
  v_num text := regexp_replace(coalesce(p_tarjeta, ''), '\D', '', 'g');
  v_user users%rowtype;
  v_clases integer;
  v_vence timestamptz := now() + interval '1 month';
begin
  if v_uid is null then raise exception 'SIN_SESION'; end if;

  select * into v_plan from membership_plans where name = p_plan and active;
  if not found then raise exception 'PLAN_NO_EXISTE'; end if;

  if v_num = '4000000000000002' then raise exception 'TARJETA_RECHAZADA'; end if;
  if length(v_num) < 15 then raise exception 'TARJETA_INCOMPLETA'; end if;

  select * into v_user from users where id = v_uid;
  if not found then raise exception 'SIN_CUENTA'; end if;
  -- Solo clientas: el personal no se compra planes desde la app.
  if v_user.role is distinct from 'CLIENT' then raise exception 'SOLO_CLIENTAS'; end if;

  v_clases := case when v_plan.unlimited then 9999 else v_plan.classes end;

  -- Origen y nota para la bitácora de saldos (los lee log_class_credit_change).
  perform set_config('befit.credit_source', 'pago_prueba', true);
  perform set_config('befit.credit_note', 'Compra en la app (pasarela de prueba)', true);

  update users set
    membership_plan = v_plan.name,
    membership_status = 'ACTIVE',
    classes_remaining = v_clases,
    plan_started_at = now(),
    plan_expires_at = v_vence,
    membership_renewal = 'active'
  where id = v_uid;

  insert into sales (user_id, sold_by, plan_name, amount, method, client_name, client_email)
  values (v_uid, null, v_plan.name, v_plan.price_mxn, 'tarjeta', v_user.full_name, v_user.email);

  insert into notification_logs (user_id, type, title, body, status)
  values (v_uid, 'payment', 'Pago recibido',
    format('Se activó tu %s: %s. Vence el %s.', v_plan.name,
      case when v_plan.unlimited then 'clases ilimitadas' else v_clases || ' clases' end,
      to_char(v_vence at time zone 'America/Mexico_City', 'DD/MM/YYYY')),
    'sent');

  return jsonb_build_object('plan', v_plan.name, 'clases', v_clases, 'vence', v_vence, 'monto', v_plan.price_mxn);
end;
$$;

revoke all on function public.demo_comprar_plan(text, text) from public, anon;
grant execute on function public.demo_comprar_plan(text, text) to authenticated;
