-- ─────────────────────────────────────────────────────────────────────────────
-- BASE DE DEMOSTRACIONES (proyecto Supabase "Demos", qwqrbckivrkmeykiukug)
-- 21 · GIMNASIO — cuentas, datos y reinicio de "GYM Fitness Manhattan". Idempotente.
--
-- ⚠️ Este archivo NUNCA se corre contra Be Fit Lab (fifaowaiokauhuqklzwe).
--
-- Las cuentas viven en demo_cuentas con rol 'GYM': así el reinicio de Studio
-- Alma (demo_reset, que borra las cuentas que no estén ahí) las respeta y no las
-- cuenta como clientas suyas. Su rol en el gimnasio está en gym_miembros.
-- Los ~850 socios NO son cuentas: son filas de gym_socios.
-- ─────────────────────────────────────────────────────────────────────────────

-- Colores: el rojo de su Instagram, llevado al estilo "Pulso" (degradado rojo →
-- coral que brilla sobre negro). Info: lo público de su Instagram.
insert into public.gym_negocios (id, nombre, ciudad, capacidad, alerta_pct, qr_segundos, marca, info) values
  ('manhattan', 'GYM Fitness Manhattan', 'Miahuatlán, Oax.', 120, 85, 30, '{
    "primario": "#FF2E3B", "primario2": "#FF7A50", "primarioTexto": "#FFFFFF",
    "fondo": "#0B0B0D", "superficie": "#151518", "superficie2": "#222226",
    "texto": "#F4F4F5", "suave": "#9A9AA3", "tenue": "#6E6E76",
    "verde": "#34D399", "rojo": "#FF4D4F", "ambar": "#FBBF24"
  }', '{
    "direccion": "Calle 3 de Octubre 420B, Centro",
    "ciudad": "Miahuatlán de Porfirio Díaz, Oax.",
    "instagram": "gymfitnesssmanhattan",
    "clases": ["CrossFit", "Spinning", "Cardio", "Zumba"]
  }')
on conflict (id) do update set nombre = excluded.nombre, ciudad = excluded.ciudad, marca = excluded.marca,
  info = excluded.info, qr_segundos = excluded.qr_segundos;

insert into public.gym_secretos (negocio) values ('manhattan') on conflict (negocio) do nothing;

insert into public.gym_planes (negocio, id, nombre, precio, dias, hora_desde, hora_hasta, orden) values
  ('manhattan', 'mensual',    'Mensual',             650,  30,  null, null, 1),
  ('manhattan', 'trimestral', 'Trimestral',          1750, 90,  null, null, 2),
  ('manhattan', 'anual',      'Anual',               6200, 365, null, null, 3),
  ('manhattan', 'estudiante', 'Estudiante matutino', 450,  30,  6,    14,   4)
on conflict (negocio, id) do update set nombre = excluded.nombre, precio = excluded.precio, dias = excluded.dias,
  hora_desde = excluded.hora_desde, hora_hasta = excluded.hora_hasta, orden = excluded.orden;

-- ── Cuentas de la maqueta (una por rol de la barra) ─────────────────────────
insert into public.demo_cuentas (id, email, full_name, rol, login) values
  ('00000000-0000-4000-c000-000000000001', 'socio@demo.manhattan.mx',     'Carlos Ramírez', 'GYM', 'socio'),
  ('00000000-0000-4000-c000-000000000002', 'recepcion@demo.manhattan.mx', 'Recepción',      'GYM', 'recepcion'),
  ('00000000-0000-4000-c000-000000000003', 'dueno@demo.manhattan.mx',     'Dirección',      'GYM', 'dueno')
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, rol = excluded.rol, login = excluded.login;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, phone_change, phone_change_token
)
select '00000000-0000-0000-0000-000000000000', d.id, 'authenticated', 'authenticated', d.email,
  extensions.crypt('StudioAlma-Demo-2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', d.full_name), now(), now(),
  '', '', '', '', '', '', '', ''
from public.demo_cuentas d where d.rol = 'GYM'
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), d.id, d.id::text,
  jsonb_build_object('sub', d.id::text, 'email', d.email, 'email_verified', true),
  'email', now(), now(), now()
from public.demo_cuentas d
where d.rol = 'GYM'
  and not exists (select 1 from auth.identities i where i.user_id = d.id and i.provider = 'email');

insert into public.gym_miembros (negocio, user_id, rol) values
  ('manhattan', '00000000-0000-4000-c000-000000000001', 'socio'),
  ('manhattan', '00000000-0000-4000-c000-000000000002', 'recepcion'),
  ('manhattan', '00000000-0000-4000-c000-000000000003', 'dueno')
on conflict (negocio, user_id) do update set rol = excluded.rol;

-- ─────────────────────────────────────────────────────────────────────────────
-- gym_reset(): deja el gimnasio como recién abierto el día de hoy:
--   · los mismos 855 socios (semilla fija), con vencidas, adeudos y congeladas;
--   · 4 semanas de entradas y salidas con horas pico realistas;
--   · la agenda de hoy, que gym_simular() va soltando minuto a minuto;
--   · las renovaciones (pagos) que cuadran con las fechas de vencimiento.
-- La llama el botón "Reiniciar" de la maqueta y el cron de cada noche.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.gym_reset()
returns void language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare
  v_neg constant text := 'manhattan';
  v_hoy date := gym_hoy();
  v_nombres text[] := array['Ana','Sofía','Valeria','Camila','Fernanda','Mariana','Daniela','Paola','Andrea','Regina',
    'Ximena','Renata','Natalia','Gabriela','Alejandra','Karla','Lucía','Isabel','Montserrat','Diana','Jimena','Victoria',
    'Elena','Paulina','Brenda','Carolina','Luis','Carlos','Jorge','Diego','Miguel','José','Juan','Alejandro','Fernando',
    'Ricardo','Eduardo','Andrés','Sebastián','Emiliano','Santiago','Mateo','Rodrigo','Héctor','Óscar','Raúl','Arturo',
    'Iván','Pablo','Javier','Roberto','Gerardo','Manuel','Daniel','Iker','Leonardo','Adrián','Gustavo','Marco','Tomás'];
  v_apellidos text[] := array['García','Hernández','Martínez','López','González','Pérez','Rodríguez','Sánchez','Ramírez',
    'Cruz','Flores','Gómez','Morales','Vázquez','Reyes','Jiménez','Torres','Díaz','Gutiérrez','Ruiz','Mendoza','Aguilar',
    'Ortiz','Moreno','Castillo','Romero','Álvarez','Méndez','Chávez','Rivera','Juárez','Ramos','Domínguez','Herrera',
    'Medina','Castro','Vargas','Guzmán','Velázquez','Muñoz','Rojas','Contreras','Salazar','Luna','Ortega','Santiago',
    'Guerrero','Estrada','Bautista','Cortés','Soto','Alvarado','Espinoza','Lara','Navarro','Cervantes','Delgado','Ríos',
    'Ávila','Campos'];
begin
  -- El botón lo puede usar cualquiera de la maqueta; el cron entra sin sesión.
  if auth.uid() is not null and gym_rol(v_neg) is null then raise exception 'Sin acceso'; end if;

  delete from gym_agenda where negocio = v_neg;
  delete from gym_accesos where negocio = v_neg;
  delete from gym_pagos where negocio = v_neg;
  delete from gym_socios where negocio = v_neg;
  update gym_negocios set capacidad = 120, alerta_pct = 85 where id = v_neg;

  -- Socios de ejemplo (los "pases de prueba" de recepción). Carlos es la cuenta "Socio".
  insert into gym_socios (negocio, numero, nombre, user_id, plan, vence, adeudo, congelada, alta, sim_minuto, sim_frecuencia) values
    (v_neg, 1001, 'Carlos Ramírez',    '00000000-0000-4000-c000-000000000001', 'mensual', v_hoy + 12, 0, false, v_hoy - 410, 1150, 0.62),
    (v_neg, 1002, 'Lucía Torres',      null, 'mensual',    v_hoy - 3,   0,   false, v_hoy - 220, 420,  0.50),
    (v_neg, 1003, 'Miguel Ángel Ruiz', null, 'trimestral', v_hoy + 41,  650, false, v_hoy - 330, 1090, 0.50),
    (v_neg, 1004, 'Daniela Ortiz',     null, 'estudiante', v_hoy + 20,  0,   false, v_hoy - 95,  470,  0.60),
    (v_neg, 1005, 'Jorge Medina',      null, 'anual',      v_hoy + 160, 0,   true,  v_hoy - 520, 390,  0.50);

  -- El resto: misma semilla cada noche → los mismos nombres y planes.
  perform setseed(0.4242);
  insert into gym_socios (negocio, numero, nombre, plan, vence, adeudo, congelada, alta, sim_minuto, sim_frecuencia)
  select v_neg, 1005 + i,
    v_nombres[1 + floor(r1 * array_length(v_nombres, 1))::int] || ' ' || v_apellidos[1 + floor(r2 * array_length(v_apellidos, 1))::int],
    pl,
    case when r3 < 0.07 then v_hoy - (1 + floor(r4 * 40)::int)          -- vencida (recuperable)
         when r3 < 0.11 then v_hoy + floor(r4 * 8)::int                  -- vence esta semana
         when r3 < 0.135 then v_hoy + (case pl when 'trimestral' then 90 when 'anual' then 365 else 30 end)  -- renovó hoy
         else v_hoy + 8 + floor(r4 * (case pl when 'trimestral' then 82 when 'anual' then 357 else 22 end))::int end,
    case when r3 >= 0.11 and r5 < 0.03 then (case pl when 'estudiante' then 450 else 650 end) else 0 end,
    r6 < 0.01,
    v_hoy - 30 - floor(r6 * 900)::int,
    case when pl = 'estudiante' then 360 + floor(r8 * 400)::int else
      -- A qué hora suele llegar: pico fuerte de 6 a 8 p.m. y otro de 6 a 8 a.m.
      (case when r7 < .10 then 360 when r7 < .21 then 420 when r7 < .27 then 480 when r7 < .32 then 540
            when r7 < .36 then 600 when r7 < .39 then 660 when r7 < .42 then 720 when r7 < .45 then 780
            when r7 < .48 then 840 when r7 < .51 then 900 when r7 < .55 then 960 when r7 < .64 then 1020
            when r7 < .79 then 1080 when r7 < .92 then 1140 when r7 < .98 then 1200 else 1260 end) + floor(r8 * 55)::int end,
    round((0.35 + r5 * 0.65)::numeric, 2)
  from (
    select i, random() r1, random() r2, random() r3, random() r4, random() r5, random() r6, random() r7, random() r8,
      (case when random() < 0.55 then 'mensual' else (array['trimestral', 'trimestral', 'anual', 'estudiante', 'estudiante', 'mensual'])[1 + floor(random() * 6)::int] end) as pl
    from generate_series(1, 850) i
  ) x;
  perform setseed((extract(epoch from clock_timestamp())::numeric % 1 * 2 - 1)::double precision);  -- de aquí en adelante, al azar

  -- Visitas de las últimas 4 semanas (29 días: el promedio usa el mismo día de
  -- hace 7, 14, 21 y 28) y de hoy (pasadas y por venir).
  drop table if exists gym_tmp_visitas;
  create temp table gym_tmp_visitas on commit drop as
  select s.id as socio_id, s.numero, d.d,
    gym_momento(d.d, greatest(330, least(1340,
      s.sim_minuto + (case when extract(isodow from d.d) >= 6 and s.sim_minuto < 600 then 75 else 0 end)
      + floor(random() * 90 - 45)::int))) as ent,
    55 + floor(random() * 60)::int as dur,
    random() < 0.05 as sin_salida,
    null::text as motivo
  from gym_socios s
  cross join (select v_hoy - k as d from generate_series(0, 28) k) d
  where s.negocio = v_neg and not s.congelada
    and d.d <= s.vence and d.d >= s.alta
    -- lunes y martes son los días más llenos; el domingo, el más tranquilo
    and random() < s.sim_frecuencia * (array[1.1, 1.05, 1.0, 0.95, 0.8, 0.55, 0.3])[extract(isodow from d.d)::int];

  -- Los socios de ejemplo arrancan afuera y fuera de la agenda: hoy los mueve
  -- quien prueba la demo (Carlos es la cuenta "Socio"; los demás, los pases de prueba).
  delete from gym_tmp_visitas where numero between 1001 and 1005 and d = v_hoy;

  -- Lo de hoy antes de ahora sigue las mismas reglas que recepción: los que
  -- deben o llegan fuera del horario de su plan se quedaron afuera.
  update gym_tmp_visitas v set motivo = case
      when s.adeudo > 0 then 'Adeudo pendiente de $' || to_char(s.adeudo, 'FM999,990')
      when p.hora_desde is not null and (extract(hour from v.ent at time zone 'America/Mexico_City') < p.hora_desde
        or extract(hour from v.ent at time zone 'America/Mexico_City') >= p.hora_hasta)
        then 'Su plan solo entra de ' || p.hora_desde || ':00 a ' || p.hora_hasta || ':00' end
  from gym_socios s join gym_planes p on p.negocio = s.negocio and p.id = s.plan
  where s.id = v.socio_id and v.d = v_hoy and v.ent <= now();

  insert into gym_accesos (negocio, socio_id, tipo, permitido, motivo, metodo, creado)
  select v_neg, socio_id, 'entrada', motivo is null, motivo, case when random() < 0.04 then 'manual' else 'qr' end, ent
  from gym_tmp_visitas where ent <= now();

  insert into gym_accesos (negocio, socio_id, tipo, permitido, metodo, creado)
  select v_neg, socio_id, 'salida', true, 'qr', ent + make_interval(mins => dur)
  from gym_tmp_visitas where ent + make_interval(mins => dur) <= now() and not sin_salida and motivo is null;

  -- Lo que falta de hoy (y quienes siguen adentro) lo suelta gym_simular().
  insert into gym_agenda (negocio, socio_id, entra, sale, entro, salio)
  select v_neg, socio_id, ent, ent + make_interval(mins => dur), ent <= now(), sin_salida and ent <= now()
  from gym_tmp_visitas where d = v_hoy and ent + make_interval(mins => dur) > now() and motivo is null;

  -- Vencidos que igual intentan entrar (el dueño los ve en "accesos negados").
  insert into gym_accesos (negocio, socio_id, tipo, permitido, motivo, metodo, creado)
  select v_neg, s.id, 'entrada', false, 'Membresía vencida el ' || to_char(s.vence, 'DD/MM/YYYY'), 'qr',
    gym_momento(d.d, s.sim_minuto + floor(random() * 30)::int)
  from gym_socios s cross join (select v_hoy - k as d from generate_series(0, 27) k) d
  where s.negocio = v_neg and s.vence < v_hoy and d.d > s.vence and d.d <= s.vence + 10
    and random() < (case when d.d = v_hoy then 0.4 else 0.15 end)
    and gym_momento(d.d, s.sim_minuto) < now() - interval '10 minutes'
    and s.numero <> 1002;

  insert into gym_agenda (negocio, socio_id, entra, sale)
  select v_neg, s.id, gym_momento(v_hoy, s.sim_minuto + floor(random() * 30)::int),
    gym_momento(v_hoy, s.sim_minuto + 90)
  from gym_socios s
  where s.negocio = v_neg and s.vence < v_hoy and s.vence >= v_hoy - 10 and s.numero <> 1002 and random() < 0.3
    and gym_momento(v_hoy, s.sim_minuto) > now();

  -- Capturas de pantalla y QR de otro lado (unos cuantos por semana).
  insert into gym_accesos (negocio, socio_id, tipo, permitido, motivo, metodo, creado)
  select v_neg, s.id,
    'entrada', false, 'QR vencido: que abra su pase en la app (las capturas de pantalla no sirven)', 'qr',
    gym_momento(v_hoy - 1 - floor(random() * 27)::int, 400 + floor(random() * 840)::int)
  from generate_series(1, 9) k
  cross join lateral (select 1006 + floor(random() * 840)::int + k * 0 as n) r
  join gym_socios s on s.negocio = v_neg and s.numero = r.n;

  -- Y un par de capturas de pantalla hoy.
  insert into gym_accesos (negocio, socio_id, tipo, permitido, motivo, metodo, creado)
  select v_neg, s.id, 'entrada', false, 'QR vencido: que abra su pase en la app (las capturas de pantalla no sirven)', 'qr',
    gym_momento(v_hoy, 420) + random() * (now() - gym_momento(v_hoy, 420))
  from generate_series(1, 2) k
  cross join lateral (select 1006 + floor(random() * 840)::int + k * 0 as n) r
  join gym_socios s on s.negocio = v_neg and s.numero = r.n
  where now() > gym_momento(v_hoy, 480);

  -- Renovaciones que cuadran con cada vencimiento (lo que cobró el gimnasio).
  -- Las de hoy, repartidas entre las 7:00 y ahora.
  insert into gym_pagos (negocio, socio_id, monto, concepto, creado)
  select v_neg, s.id, p.precio, 'Renovación ' || p.nombre,
    case when s.vence - p.dias = v_hoy
      then gym_momento(v_hoy, 420) + random() * greatest(interval '0', now() - interval '3 minutes' - gym_momento(v_hoy, 420))
      else gym_momento(s.vence - p.dias, 420 + floor(random() * 780)::int) end
  from gym_socios s join gym_planes p on p.negocio = s.negocio and p.id = s.plan
  where s.negocio = v_neg and s.vence - p.dias between v_hoy - 45 and v_hoy
    and (s.vence - p.dias < v_hoy or now() > gym_momento(v_hoy, 425));
end $$;

revoke all on function public.gym_reset() from public, anon;
grant execute on function public.gym_reset() to authenticated;

-- Cada noche a las 3:20 a.m. de México (9:20 UTC), después de Alma y de Hoja.
select cron.unschedule('gym_reset_nocturno') where exists (select 1 from cron.job where jobname = 'gym_reset_nocturno');
select cron.schedule('gym_reset_nocturno', '20 9 * * *', 'select public.gym_reset()');

select public.gym_reset();
