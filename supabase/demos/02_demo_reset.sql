-- ─────────────────────────────────────────────────────────────────────────────
-- BASE DE DEMOSTRACIONES · 02 · demo_reset()
--
-- ⚠️ SOLO para el proyecto "Demos" (qwqrbckivrkmeykiukug). NUNCA en Be Fit Lab:
-- vacía todas las tablas de datos.
--
-- Deja Studio Alma como recién abierto: clases de la semana pasada (con
-- asistencias) y de las dos que vienen, clientas con saldo, menú del café,
-- pedidos en la barra, eventos, recetas, ventas y el historial de saldo de
-- María. Las fechas son relativas a HOY, así que la maqueta nunca envejece.
--
-- Corre solo cada noche (pg_cron, 3:00 a.m. México) y con el botón
-- "Reiniciar la demostración". Borra también las cuentas que alguien haya
-- creado registrándose desde la maqueta.
-- ─────────────────────────────────────────────────────────────────────────────

-- Degradado como imagen en línea: las fotos de producto y de recetas no
-- dependen de archivos.
create or replace function public.demo_fondo(a text, b text)
returns text language sql immutable as $$
  select 'data:image/svg+xml;utf8,'
    || replace(format(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/></svg>',
      a, b), '#', '%23');
$$;

create or replace function public.demo_reset()
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_hoy date := (now() at time zone 'America/Mexico_City')::date;
  v_storage text := 'https://qwqrbckivrkmeykiukug.supabase.co/storage/v1/object/public';
  v_maria uuid := '00000000-0000-4000-a000-000000000001';
  v_admin uuid := '00000000-0000-4000-a000-000000000004';
  v_coaches uuid[] := array[
    '00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000012',
    '00000000-0000-4000-a000-000000000013', '00000000-0000-4000-a000-000000000014']::uuid[];
  v_nombres_coach text[] := array['Renata', 'Alejandra', 'Sofía', 'Diego'];
  v_clientas uuid[];
  v_horas text[] := array['7:00 AM','8:10 AM','9:20 AM','10:30 AM','5:00 PM','6:10 PM','7:20 PM','8:30 PM'];
  v_disc text[] := array['Reformer Basics','Reformer Flow','Power Reformer','Barre','Stretch & Restore'];
  v_nivel text[] := array['Principiante','Intermedio','Avanzado','Todos los niveles','Todos los niveles'];
  v_cat text[] := array['Reformer','Reformer','Reformer','Barre','Stretch'];
  v_catcolor text[] := array['#DCE8E1','#DCE8E1','#DCE8E1','#F3E3E6','#ECE6D8'];
  v_desc text[] := array[
    'La base del método en la cama de reformer: alineación, respiración y control. Ideal si vas empezando.',
    'Secuencias fluidas que conectan fuerza y movilidad. Para quien ya domina lo básico.',
    'Intensidad alta en el reformer: más resistencia, más ritmo y trabajo de core profundo.',
    'Trabajo en barra inspirado en ballet: piernas, glúteo y postura con movimientos pequeños.',
    'Estiramiento guiado y liberación miofascial para recuperar el cuerpo después de la semana.'];
  v_dia int; v_fecha date; v_slots int; v_h int; v_i int; v_coach int; v_clase uuid;
  v_cupo int; v_ocupa int; v_off int; v_pasada boolean;
  v_saldo int; r record;
begin
  -- 1 · Cuentas que alguien creó registrándose desde la maqueta: fuera.
  delete from auth.users where id not in (select id from public.demo_cuentas);
  -- Y las de la maqueta vuelven a su correo y contraseña: la contraseña es
  -- pública (va en el front), así que cualquiera podía cambiarla con
  -- updateUser y dejar ese rol sin poder entrar para todos.
  update auth.users a set
    email = d.email,
    encrypted_password = extensions.crypt('StudioAlma-Demo-2026', extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(a.email_confirmed_at, now()),
    banned_until = null
  from public.demo_cuentas d where d.id = a.id;

  -- 2 · Datos: todo vacío.
  truncate table
    reservations, sales, class_credit_ledger, notification_logs, cafe_orders,
    cafe_loyalty, event_registrations, event_photos, events, progress_photos,
    body_measurements, intentos_bloqueados, food_log, recipe_favorites,
    staff_attendance, device_tokens, meal_plan_days, nutrition_plans,
    classes, class_templates, class_categories, cafe_options, cafe_option_groups,
    cafe_products, cafe_covers, membership_plans, recipes, ingredients,
    disciplines, badges_config
  restart identity cascade;

  select array_agg(id order by id) into v_clientas
  from demo_cuentas where rol = 'CLIENT' and id <> v_maria;

  -- 3 · Perfiles a su estado inicial.
  update users u set
    email = d.email, full_name = d.full_name, role = d.rol,
    membership_status = case when d.rol = 'CLIENT' then 'ACTIVE' else 'INACTIVE' end,
    membership_plan = null, classes_remaining = 0, membership_renewal = 'active',
    plan_started_at = null, plan_expires_at = null, paused_at = null,
    avatar_url = null, bio = null, phone = null, birth_date = null,
    stripe_customer_id = null, stripe_subscription_id = null, custom_badges = null
  from demo_cuentas d where d.id = u.id;

  update users set avatar_url = v_storage || '/avatars/' || id || '/avatar.jpg',
    bio = 'Instructora certificada en Pilates Reformer.'
  where id in ('00000000-0000-4000-a000-000000000012', '00000000-0000-4000-a000-000000000013');
  update users set avatar_url = v_storage || '/avatars/' || id || '/avatar.jpg',
    bio = 'Instructor certificado en Pilates Reformer.'
  where id = '00000000-0000-4000-a000-000000000014';

  -- Clientas: planes y saldos variados; dos vencidas para que Dirección vea
  -- la lista de "Por renovar". Cumpleaños repartidos, varios en estos días.
  update users u set
    membership_plan = (array['Plan Esencial','Plan Balance','Plan Fit','Plan Ilimitado'])[1 + (x.n % 4)],
    classes_remaining = case when x.n % 4 = 3 then 9999 else (x.n * 3) % 11 end,
    membership_status = case when x.n in (5, 13) then 'EXPIRED' else 'ACTIVE' end,
    plan_started_at = now() - ((x.n % 20) + 3) * interval '1 day',
    plan_expires_at = case when x.n in (5, 13) then now() - interval '2 days'
                           else now() + ((30 - (x.n % 20)) - 3) * interval '1 day' end,
    birth_date = (v_hoy + (x.n * 9 - 6)) - interval '30 years',
    phone = '222 555 ' || lpad((1000 + x.n * 37)::text, 4, '0')
  from (select id, (row_number() over (order by id))::int as n from demo_cuentas where rol = 'CLIENT' and id <> v_maria) x
  where u.id = x.id;

  update users set birth_date = (v_hoy + 3) - interval '32 years' where id = v_maria;

  -- 4 · Catálogo.
  insert into membership_plans (name, title, subtitle, price_mxn, classes, unlimited, nutrition, meal_plan, features, stripe_lookup_base, active, sort_order) values
    ('Plan Esencial', 'Esencial', 'Para empezar a moverte', 980, 4, false, false, false, '["4 clases al mes","Reserva desde la app","Lista de espera automática"]', 'alma_esencial', true, 1),
    ('Plan Balance', 'Balance', 'Dos veces por semana', 1700, 8, false, false, false, '["8 clases al mes","Reserva desde la app","Seguimiento de progreso"]', 'alma_balance', true, 2),
    ('Plan Fit', 'Fit', 'El favorito del estudio', 2300, 12, false, true, false, '["12 clases al mes","Recetario del estudio","Seguimiento de progreso"]', 'alma_fit', true, 3),
    ('Plan Ilimitado', 'Ilimitado', 'Sin contar clases', 2999, 9999, true, true, true, '["Clases ilimitadas","Plan de alimentación","Recetario del estudio"]', 'alma_ilimitado', true, 4);

  insert into class_categories (name, color) values
    ('Reformer', '#DCE8E1'), ('Barre', '#F3E3E6'), ('Stretch', '#ECE6D8');

  insert into disciplines (name, short_desc, description, featured, sort_order)
  select v_disc[i], v_nivel[i], v_desc[i], i <= 3, i from generate_series(1, 5) i;

  insert into badges_config (icon, label, description, rule_type, rule_value, is_active) values
    ('🌱', 'Primer paso', 'Tomaste tu primera clase en el estudio.', 'TOTAL_CLASSES', 1, true),
    ('🔥', 'Fuego continuo', 'Tres clases en una sola semana.', 'WEEKLY_CLASSES', 3, true),
    ('✨', 'Constancia', 'Diez clases tomadas.', 'TOTAL_CLASSES', 10, true),
    ('🤝', 'Explora', 'Tomaste clase con tres coaches distintas.', 'DIFFERENT_COACHES', 3, true);

  -- 5 · Clases: de hace 7 días a dentro de 13. Fin de semana con horario corto.
  -- Alejandra (la coach de la vista "Coach") tiene clase TODOS los días.
  for v_dia in -7..13 loop
    v_fecha := v_hoy + v_dia;
    v_slots := case extract(dow from v_fecha) when 0 then 2 when 6 then 3 else 8 end;
    for v_h in 1..v_slots loop
      v_i := 1 + ((v_dia + 7 + v_h) % 5);
      v_coach := case when v_slots < 8 and v_h = 1 then 2 else 1 + ((v_dia + 7 + v_h) % 4) end;
      v_pasada := v_fecha < v_hoy;
      insert into classes (title, instructor, coach_id, day, day_of_week, date, class_date, time, level,
                           category, category_color, color, description, max_spots, spots)
      values (v_disc[v_i], v_nombres_coach[v_coach], v_coaches[v_coach], extract(dow from v_fecha)::int,
              extract(dow from v_fecha)::int, v_fecha, v_fecha, v_horas[v_h], v_nivel[v_i],
              v_cat[v_i], v_catcolor[v_i], 'var(--primary)', v_desc[v_i], 10, 10)
      returning id into v_clase;

      -- Ocupación creíble y FIJA (sin azar): 7:00 a.m. y 6:10 p.m. casi llenas.
      v_cupo := case when v_horas[v_h] in ('7:00 AM', '6:10 PM') then 9 else 4 + ((v_dia + 7) * 3 + v_h) % 4 end;
      -- Mañana a las 7:00 a.m. queda LLENA: así se puede enseñar la lista de espera.
      if v_dia = 1 and v_h = 1 then v_cupo := 10; end if;
      v_off := ((v_dia + 7) * 5 + v_h * 3) % array_length(v_clientas, 1);
      for v_ocupa in 0..(v_cupo - 1) loop
        insert into reservations (user_id, class_id, status, checked_in, created_at)
        values (v_clientas[1 + (v_off + v_ocupa) % array_length(v_clientas, 1)], v_clase, 'confirmed',
                v_pasada and v_ocupa % 6 <> 5,
                least((v_fecha - 2)::timestamptz + interval '10 hours', now() - (v_ocupa + 1) * interval '2 hours'))
        on conflict do nothing;
      end loop;
    end loop;
  end loop;

  -- 6 · María: la clienta de la maqueta. Fue a clase en la semana y tiene dos
  -- apartadas. Su historial de saldo se escribe a mano abajo.
  delete from reservations where user_id = v_maria;
  insert into reservations (user_id, class_id, status, checked_in, created_at)
  -- Cada clase se apartó la noche anterior; las próximas, ayer y antier
  -- (nunca con fecha en el futuro).
  select v_maria, c.id, 'confirmed', c.date < v_hoy,
    case when c.date >= v_hoy then now() - interval '36 hours' + (c.date - v_hoy) * interval '5 hours'
         else (c.date - 1)::timestamptz + interval '20 hours' end
  from classes c
  where (c.date, c.time) in (
    (v_hoy - 6, '8:10 AM'), (v_hoy - 4, '6:10 PM'), (v_hoy - 2, '8:10 AM'), (v_hoy - 1, '7:20 PM'),
    (v_hoy + 2, '6:10 PM'), (v_hoy + 3, '8:10 AM'))
  on conflict do nothing;
  -- Si alguna era la que la dejaba en 11, se quita otra para respetar el cupo.
  delete from reservations sobra using (
    select class_id from reservations where status = 'confirmed' group by class_id having count(*) > 10
  ) x where sobra.class_id = x.class_id and sobra.user_id <> v_maria
    and sobra.id = (select id from reservations where class_id = x.class_id and user_id <> v_maria order by id limit 1);

  -- `where true` a propósito: las llamadas desde la app pasan por pg_safeupdate,
  -- que rechaza UPDATE sin WHERE ("UPDATE requires a WHERE clause"). El cron y
  -- la API de administración no lo traen, por eso solo fallaba el botón.
  update classes c set spots = c.max_spots - coalesce((
    select count(*) from reservations rs where rs.class_id = c.id and rs.status in ('confirmed', 'offered')), 0)
  where true;

  -- Una clienta formada en la lista de espera de la clase llena de mañana.
  insert into reservations (user_id, class_id, status, auto_claim, enqueued_at, created_at)
  select v_clientas[3], c.id, 'waitlist', true, now() - interval '3 hours', now() - interval '3 hours'
  from classes c where c.date = v_hoy + 1 and c.time = '7:00 AM'
  on conflict do nothing;

  -- 7 · Saldo de María + su historial (la hoja "¿A dónde se fueron mis clases?").
  -- Se fija el perfil ANTES de vaciar el libro: el trigger del libro registra
  -- cada cambio de saldo y aquí se quiere solo la historia escrita a mano.
  update users set membership_plan = 'Plan Fit', membership_status = 'ACTIVE',
    plan_started_at = (v_hoy - 7)::timestamptz + interval '18 hours',
    plan_expires_at = (v_hoy + 23)::timestamptz + interval '18 hours',
    classes_remaining = 12 - (select count(*) from reservations where user_id = v_maria)
  where id = v_maria;
  truncate table class_credit_ledger;

  v_saldo := 0;
  insert into class_credit_ledger (user_id, user_name, user_email, delta, balance_before, balance_after, source, plan_name, created_at, db_role)
  values (v_maria, 'María Ramírez', 'maria@demo.studioalma.mx', 12, 0, 12, 'stripe_sistema', 'Plan Fit',
          (v_hoy - 7)::timestamptz + interval '18 hours', 'service_role');
  v_saldo := 12;
  v_i := 0;
  for r in
    select res.class_id, res.created_at from reservations res where res.user_id = v_maria order by res.created_at
  loop
    insert into class_credit_ledger (user_id, user_name, user_email, delta, balance_before, balance_after, source, plan_name, created_at, class_id, db_role)
    values (v_maria, 'María Ramírez', 'maria@demo.studioalma.mx', -1, v_saldo, v_saldo - 1, 'reserva', 'Plan Fit', r.created_at, r.class_id, 'authenticated');
    v_saldo := v_saldo - 1;
    v_i := v_i + 1;
    -- Tras la segunda, apartó otra y la canceló a tiempo: se ve que se devuelve.
    if v_i = 2 then
      insert into class_credit_ledger (user_id, user_name, user_email, delta, balance_before, balance_after, source, plan_name, created_at, db_role)
      values (v_maria, 'María Ramírez', 'maria@demo.studioalma.mx', -1, v_saldo, v_saldo - 1, 'reserva', 'Plan Fit', r.created_at + interval '1 hour', 'authenticated'),
             (v_maria, 'María Ramírez', 'maria@demo.studioalma.mx', 1, v_saldo - 1, v_saldo, 'cancelacion', 'Plan Fit', r.created_at + interval '3 hours', 'authenticated');
    end if;
  end loop;

  -- 8 · Ventas del mes (Reportes y corte del mostrador).
  insert into sales (user_id, sold_by, plan_name, amount, method, created_at, client_name, client_email)
  select u.id, v_admin, u.membership_plan,
    (select price_mxn from membership_plans p where p.name = u.membership_plan),
    case when x.n % 3 = 0 then 'efectivo' else 'tarjeta' end,
    now() - (x.n * 2) * interval '1 day', u.full_name, u.email
  from (select id, (row_number() over (order by id))::int as n from demo_cuentas where rol = 'CLIENT') x
  join users u on u.id = x.id
  where u.membership_plan is not null;

  -- 9 · Cafetería. Las fotos viven en el Storage de Demos (bucket cafe-products);
  -- si se sembraran degradados, cada reinicio dejaría el menú sin fotos.
  insert into cafe_products (name, description, price, category, image_url, cals, protein, available, sort_order) values
    ('Latte de vainilla', 'Espresso doble con leche vaporizada y vainilla natural.', 68, 'coffee', v_storage || '/cafe-products/78e62e8b-d2d4-4900-b0ac-98920823e8b8.jpg', 180, 8, true, 1),
    ('Matcha latte', 'Matcha ceremonial con leche de almendra.', 78, 'coffee', v_storage || '/cafe-products/6ab0b874-4e67-4daf-9833-61a9ff9f8acd.jpg', 150, 5, true, 2),
    ('Cold brew', 'Extracción en frío de 18 horas, suave y sin acidez.', 60, 'coffee', v_storage || '/cafe-products/48550983-eab8-4080-a597-cf0a942867a3.jpg', 15, 1, true, 3),
    ('Latte frío de avena', 'Doble espresso con leche de avena y hielo.', 75, 'coffee', v_storage || '/cafe-products/c688f9e2-afed-40d4-992d-708e8b74fde3.jpg', 170, 4, true, 4),
    ('Smoothie de frutos rojos', 'Fresa, zarzamora, plátano y yogur griego.', 85, 'smoothie', v_storage || '/cafe-products/4728bc9e-fe3c-4a52-a38a-8ec1ad8206f7.jpg', 240, 12, true, 1),
    ('Smoothie verde post-clase', 'Espinaca, piña, plátano y proteína de vainilla.', 89, 'smoothie', v_storage || '/cafe-products/97867ce2-7762-4e2c-bdad-b487ec1ddb77.jpg', 260, 24, true, 2),
    ('Bowl de açaí', 'Con granola artesanal y fruta de temporada.', 115, 'smoothie', v_storage || '/cafe-products/990ab1c2-045a-494e-9da6-6fdb121feaac.jpg', 380, 9, true, 3),
    ('Chai de temporada', 'Especias calientes con leche espumada.', 72, 'temporada', v_storage || '/cafe-products/6b0ddff7-b51b-42d8-bc50-5c79dfc262fa.jpg', 190, 6, true, 1),
    ('Pan de plátano', 'Hecho en casa, sin azúcar refinada.', 52, 'temporada', v_storage || '/cafe-products/fdd68ef7-cc13-485f-9f68-4d5ab42d91bd.jpg', 210, 5, true, 2);

  insert into cafe_option_groups (name, selection_type, required, applies_to, sort_order) values
    ('Tipo de leche', 'single', true, array['coffee', 'smoothie'], 1),
    ('Endulzante', 'single', false, array['coffee'], 2),
    ('Extras', 'multi', false, array['coffee', 'smoothie', 'temporada'], 3);
  insert into cafe_options (group_id, name, price_delta, available, sort_order)
  select g.id, o.name, o.delta, true, o.ord
  from cafe_option_groups g
  join (values
    ('Tipo de leche', 'Entera', 0, 1), ('Tipo de leche', 'Deslactosada', 0, 2),
    ('Tipo de leche', 'Almendra', 12, 3), ('Tipo de leche', 'Avena', 12, 4),
    ('Endulzante', 'Sin azúcar', 0, 1), ('Endulzante', 'Miel de agave', 0, 2), ('Endulzante', 'Stevia', 0, 3),
    ('Extras', 'Shot extra', 15, 1), ('Extras', 'Proteína', 20, 2), ('Extras', 'Canela', 0, 3)
  ) as o(grupo, name, delta, ord) on o.grupo = g.name;

  insert into cafe_covers (image_url, eyebrow, title, cta, active, sort_order) values
    (v_storage || '/cafe-products/demo/novedades.jpg', 'NUEVO', 'Ya llegó el matcha ceremonial', 'Ver el menú', true, 1);

  -- Pedidos: dos en la barra ahora mismo y dos de María ya entregados.
  insert into cafe_orders (user_id, status, items, subtotal, total, is_gift, created_at) values
    (v_clientas[2], 'paid', '[{"name":"Matcha latte","qty":1,"price":78},{"name":"Pan de plátano","qty":1,"price":52}]', 130, 130, false, now() - interval '4 minutes'),
    (v_clientas[6], 'preparing', '[{"name":"Smoothie de frutos rojos","qty":1,"price":85}]', 85, 85, false, now() - interval '11 minutes'),
    (v_maria, 'completed', '[{"name":"Latte de vainilla","qty":1,"price":68}]', 68, 68, false, now() - interval '3 days'),
    (v_maria, 'completed', '[{"name":"Bowl de açaí","qty":1,"price":115},{"name":"Pan de plátano","qty":1,"price":52}]', 167, 167, false, now() - interval '9 days');
  delete from cafe_loyalty where user_id = v_maria;
  insert into cafe_loyalty (user_id, stamps, gifts_available, total_stamps_earned) values (v_maria, 7, 1, 19);

  -- 10 · Eventos.
  insert into events (title, slug, description, event_date, location, price, capacity, registration_open, image_url) values
    ('Clase al aire libre', 'clase-aire-libre', 'Una sesión distinta al amanecer, con mat y café de por medio. Cupo limitado.',
      (v_hoy + 12)::timestamptz + interval '13 hours', 'Parque del estudio', 350, 25, true, v_storage || '/event-gallery/demo/evento-aire-libre.jpg'),
    ('Taller de respiración y movilidad', 'taller-respiracion', 'Dos horas para entender cómo respirar mientras te mueves.',
      (v_hoy + 26)::timestamptz + interval '16 hours', 'Studio Alma', 0, 18, true, v_storage || '/event-gallery/demo/evento-respiracion.jpg');
  insert into event_registrations (event_id, user_id)
  select e.id, c from events e, unnest(v_clientas[1:6]) c where e.slug = 'clase-aire-libre';
  insert into event_registrations (event_id, user_id)
  select e.id, c from events e, unnest(v_clientas[7:9]) c where e.slug = 'taller-respiracion';

  -- 11 · Recetas.
  insert into recipes (title, time, kcal, time_prep, img, ingredients, steps) values
    ('Bowl de yogur griego y frutos rojos', 'Desayuno', 320, '10 min', demo_fondo('#E8D9C5', '#C9B79C'),
      array['1 taza de yogur griego natural', '1/2 taza de frutos rojos', '2 cdas de granola', '1 cdita de miel', 'Semillas de chía'],
      array['Sirve el yogur en un tazón hondo.', 'Acomoda encima los frutos rojos.', 'Agrega la granola y las semillas.', 'Termina con un hilo de miel.']),
    ('Ensalada tibia de quinoa y aguacate', 'Comida', 480, '25 min', demo_fondo('#CBD9C8', '#9FB49B'),
      array['1 taza de quinoa cocida', '1 aguacate en cubos', 'Espinaca baby', 'Jitomate cherry', 'Limón, aceite de oliva y sal'],
      array['Cuece la quinoa y déjala entibiar.', 'Mezcla con la espinaca y el jitomate.', 'Agrega el aguacate al final.', 'Aliña con limón, aceite y sal.']),
    ('Salmón al horno con espárragos', 'Cena', 410, '30 min', demo_fondo('#E3C9BC', '#BE9A87'),
      array['1 filete de salmón', 'Un manojo de espárragos', 'Ajo picado', 'Limón', 'Aceite de oliva'],
      array['Precalienta el horno a 200 °C.', 'Acomoda el salmón y los espárragos en una charola.', 'Baña con aceite, ajo y limón.', 'Hornea 18 minutos.']),
    ('Smoothie verde post-clase', 'Snack', 210, '5 min', demo_fondo('#D3E0D0', '#A7BFA3'),
      array['1 taza de espinaca', '1 plátano congelado', '1/2 taza de piña', 'Agua de coco', 'Proteína de vainilla'],
      array['Pon todo en la licuadora.', 'Licúa hasta que quede terso.', 'Sirve de inmediato.']);

  -- 12 · Avisos en la campanita de María.
  insert into notification_logs (user_id, type, title, body, status, sent_at) values
    (v_maria, 'class_reminder', 'Tu clase es mañana', 'Power Reformer con Alejandra. Te esperamos.', 'sent', now() - interval '5 hours'),
    (v_maria, 'payment', 'Pago recibido', 'Se renovó tu Plan Fit: 12 clases para este mes.', 'sent', (v_hoy - 7)::timestamptz + interval '18 hours');

  -- 13 · Configuración: auditoría desde el inicio de la semana sembrada, y la
  -- clave de Reportes de la maqueta (la pantalla la enseña: 1234).
  insert into audit_config (id, trazable_desde) values (1, now() - interval '30 days')
    on conflict (id) do update set trazable_desde = excluded.trazable_desde;
  insert into admin_secrets (key, value, updated_at) values ('reports_passcode', crypt('1234', gen_salt('bf')), now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

-- El botón "Reiniciar la demostración" la llama con cualquier cuenta de la
-- maqueta. Sin sesión, nadie.
revoke all on function public.demo_reset() from public, anon;
grant execute on function public.demo_reset() to authenticated;

-- Cada noche a las 3:00 a.m. de México (9:00 UTC).
select cron.unschedule('demo_reset_nocturno') where exists (select 1 from cron.job where jobname = 'demo_reset_nocturno');
select cron.schedule('demo_reset_nocturno', '0 9 * * *', 'select public.demo_reset()');
