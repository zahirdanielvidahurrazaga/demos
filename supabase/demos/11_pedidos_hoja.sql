-- ─────────────────────────────────────────────────────────────────────────────
-- BASE DE DEMOSTRACIONES (proyecto Supabase "Demos", qwqrbckivrkmeykiukug)
-- 11 · PEDIDOS — cuentas y reinicio de "Hoja · cocina fit". Idempotente.
--
-- ⚠️ Este archivo NUNCA se corre contra Be Fit Lab (fifaowaiokauhuqklzwe).
--
-- Las cuentas viven en demo_cuentas con rol 'PEDIDOS': así el reinicio de
-- Studio Alma (demo_reset) no las borra y tampoco las cuenta como clientas
-- suyas (filtra por rol = 'CLIENT'). Su rol en Hoja está en pedidos_miembros.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.demo_cuentas (id, email, full_name, rol, login) values
  ('00000000-0000-4000-b000-000000000001', 'ana@demo.hoja.mx',      'Ana Sofía Méndez', 'PEDIDOS', 'cliente'),
  ('00000000-0000-4000-b000-000000000002', 'cocina@demo.hoja.mx',   'Cocina',           'PEDIDOS', 'cocina'),
  ('00000000-0000-4000-b000-000000000003', 'reparto@demo.hoja.mx',  'Luis (reparto)',   'PEDIDOS', 'repartidor'),
  ('00000000-0000-4000-b000-000000000004', 'dueno@demo.hoja.mx',    'Dirección',        'PEDIDOS', 'dueno'),
  ('00000000-0000-4000-b000-000000000011', 'mariana@demo.hoja.mx',  'Mariana López',    'PEDIDOS', null),
  ('00000000-0000-4000-b000-000000000012', 'diego@demo.hoja.mx',    'Diego Ortiz',      'PEDIDOS', null),
  ('00000000-0000-4000-b000-000000000013', 'fernanda@demo.hoja.mx', 'Fernanda Ruiz',    'PEDIDOS', null),
  ('00000000-0000-4000-b000-000000000014', 'jorge@demo.hoja.mx',    'Jorge Salinas',    'PEDIDOS', null),
  ('00000000-0000-4000-b000-000000000015', 'paola@demo.hoja.mx',    'Paola Núñez',      'PEDIDOS', null),
  ('00000000-0000-4000-b000-000000000016', 'ricardo@demo.hoja.mx',  'Ricardo Peña',     'PEDIDOS', null),
  ('00000000-0000-4000-b000-000000000017', 'valeria@demo.hoja.mx',  'Valeria Soto',     'PEDIDOS', null),
  ('00000000-0000-4000-b000-000000000018', 'andres@demo.hoja.mx',   'Andrés Cruz',      'PEDIDOS', null)
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
from public.demo_cuentas d where d.rol = 'PEDIDOS'
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), d.id, d.id::text,
  jsonb_build_object('sub', d.id::text, 'email', d.email, 'email_verified', true),
  'email', now(), now(), now()
from public.demo_cuentas d
where d.rol = 'PEDIDOS'
  and not exists (select 1 from auth.identities i where i.user_id = d.id and i.provider = 'email');

-- Líneas de pedido a partir de nombres de producto (solo para sembrar).
create or replace function public.pedidos_items_demo(p_negocio text, p_nombres text[])
returns jsonb language sql stable set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'producto_id', p.id, 'nombre', p.nombre, 'foto', p.foto, 'cantidad', 1,
    'precio_base', p.precio, 'precio_unitario', p.precio, 'opciones', '[]'::jsonb,
    'nota', '', 'total', p.precio) order by n.ord), '[]')
  from unnest(p_nombres) with ordinality n(nombre, ord)
  join pedidos_productos p on p.negocio = p_negocio and p.nombre = n.nombre;
$$;
revoke all on function public.pedidos_items_demo(text, text[]) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- pedidos_reset(): deja "Hoja" recién abierta. La llama el botón "Reiniciar"
-- de la maqueta (cualquier miembro de Hoja) y el cron de cada noche.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.pedidos_reset()
returns void language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare
  v_negocio constant text := 'hoja';
  v_fotos text := 'https://qwqrbckivrkmeykiukug.supabase.co/storage/v1/object/public/pedidos/hoja/';
  c_des uuid := md5('hoja:cat:desayunos')::uuid;
  c_bow uuid := md5('hoja:cat:bowls')::uuid;
  c_wra uuid := md5('hoja:cat:wraps')::uuid;
  c_beb uuid := md5('hoja:cat:bebidas')::uuid;
  c_pos uuid := md5('hoja:cat:postres')::uuid;
  v_clientes uuid[] := array[
    '00000000-0000-4000-b000-000000000011', '00000000-0000-4000-b000-000000000012',
    '00000000-0000-4000-b000-000000000013', '00000000-0000-4000-b000-000000000014',
    '00000000-0000-4000-b000-000000000015', '00000000-0000-4000-b000-000000000016',
    '00000000-0000-4000-b000-000000000017', '00000000-0000-4000-b000-000000000018']::uuid[];
  v_combos text[][] := array[
    array['Chilaquiles verdes horneados', 'Latte de avena'],
    array['Bowl teriyaki', 'Matcha frío'],
    array['Poke de salmón', 'Jugo naranja · cúrcuma'],
    array['Toast de aguacate', 'Latte de avena'],
    array['Hot cakes de avena', 'Smoothie verde'],
    array['Wrap de pollo y hummus', 'Brownie de camote'],
    array['Bowl mexicano de quinoa', 'Matcha frío'],
    array['Omelette de claras', 'Jugo naranja · cúrcuma'],
    array['Tostadas de atún sellado', 'Parfait de yogur griego'],
    array['Chilaquiles verdes horneados', 'Smoothie verde']];
  v_ini timestamptz; v_fin timestamptz; v_t timestamptz; v_mod text; v_items jsonb;
  v_folio int := 100; v_cli uuid; v_sub numeric; v_env numeric; i int;
begin
  if auth.uid() is not null and pedidos_rol(v_negocio) is null then
    raise exception 'Sin permiso';
  end if;

  delete from pedidos_ordenes where negocio = v_negocio;
  delete from pedidos_opciones where negocio = v_negocio;
  delete from pedidos_grupos where negocio = v_negocio;
  delete from pedidos_productos where negocio = v_negocio;
  delete from pedidos_categorias where negocio = v_negocio;
  delete from pedidos_miembros where negocio = v_negocio;

  insert into pedidos_negocios (id, nombre, giro, ciudad, direccion, telefono, marca, modalidades,
    costo_envio, envio_gratis_desde, mesas, tiempo_prep_min, abierto)
  values (v_negocio, 'Hoja', 'Cocina fit y café', 'Puebla', 'Av. Juárez 2915, La Paz, Puebla', '222 000 0000',
    jsonb_build_object(
      'lema', 'Cocina fit, sin culpa',
      'primario', '#4F6B47', 'primarioOscuro', '#2F4229', 'acento', '#E2A54A',
      'fondo', '#F5F0E6', 'superficie', '#FFFFFF', 'texto', '#22301E', 'textoSuave', '#6B7564',
      'portada', v_fotos || 'portada-local.jpg'),
    '{recoger,mesa,domicilio}', 35, 300, 12, 15, true)
  on conflict (id) do update set nombre = excluded.nombre, giro = excluded.giro, ciudad = excluded.ciudad,
    direccion = excluded.direccion, telefono = excluded.telefono, marca = excluded.marca,
    modalidades = excluded.modalidades, costo_envio = excluded.costo_envio,
    envio_gratis_desde = excluded.envio_gratis_desde, mesas = excluded.mesas,
    tiempo_prep_min = excluded.tiempo_prep_min, abierto = true;

  insert into pedidos_miembros (negocio, user_id, rol, nombre) values
    (v_negocio, '00000000-0000-4000-b000-000000000001', 'cliente', 'Ana Sofía Méndez'),
    (v_negocio, '00000000-0000-4000-b000-000000000002', 'cocina', 'Cocina'),
    (v_negocio, '00000000-0000-4000-b000-000000000003', 'repartidor', 'Luis'),
    (v_negocio, '00000000-0000-4000-b000-000000000004', 'dueno', 'Dirección');
  insert into pedidos_miembros (negocio, user_id, rol, nombre)
  select v_negocio, d.id, 'cliente', d.full_name from demo_cuentas d where d.id = any(v_clientes);

  insert into pedidos_categorias (id, negocio, nombre, orden) values
    (c_des, v_negocio, 'Desayunos', 1), (c_bow, v_negocio, 'Bowls', 2), (c_wra, v_negocio, 'Wraps y tostadas', 3),
    (c_beb, v_negocio, 'Bebidas', 4), (c_pos, v_negocio, 'Postres fit', 5);

  insert into pedidos_productos (id, negocio, categoria_id, nombre, descripcion, precio, foto, etiquetas, kcal, proteina_g, destacado, orden)
  select md5('hoja:prod:' || x.nombre)::uuid, v_negocio, x.cat, x.nombre, x.descr, x.precio, v_fotos || x.foto, x.etiq, x.kcal, x.prot, x.dest, x.ord
  from (values
    (c_des, 'Chilaquiles verdes horneados', 'Totopos horneados, salsa verde, pollo deshebrado, crema ligera y queso fresco.', 145, 'chilaquiles.jpg', array['Alto en proteína'], 520, 34, true, 1),
    (c_des, 'Hot cakes de avena', 'Tres hot cakes de avena y plátano con frutos rojos y miel de agave.', 125, 'hotcakes.jpg', array['Vegetariano'], 430, 14, false, 2),
    (c_des, 'Omelette de claras', 'Claras con espinaca y champiñones, aguacate y pan integral.', 135, 'omelette.jpg', array['Alto en proteína', 'Vegetariano'], 360, 28, false, 3),
    (c_des, 'Toast de aguacate', 'Masa madre, aguacate, huevo pochado, semillas y chile en hojuela.', 129, 'toast-aguacate.jpg', array['Vegetariano'], 410, 16, false, 4),
    (c_bow, 'Bowl teriyaki', 'Pollo teriyaki, arroz integral, brócoli, edamame y zanahoria.', 159, 'bowl-teriyaki.jpg', array['Alto en proteína'], 580, 42, true, 1),
    (c_bow, 'Poke de salmón', 'Salmón, arroz, mango, pepino, aguacate, edamame y nori.', 185, 'poke-salmon.jpg', array['Alto en proteína', 'Omega 3'], 610, 36, true, 2),
    (c_bow, 'Bowl mexicano de quinoa', 'Quinoa, frijol negro, elote asado, pico de gallo y aguacate.', 149, 'bowl-quinoa.jpg', array['Vegano', 'Sin gluten'], 490, 18, false, 3),
    (c_wra, 'Wrap de pollo y hummus', 'Tortilla integral, pollo a la plancha, hummus, lechuga y jitomate.', 139, 'wrap-pollo.jpg', array['Alto en proteína'], 470, 35, false, 1),
    (c_wra, 'Tostadas de atún sellado', 'Dos tostadas horneadas con atún, aguacate, pepino y chipotle ligero.', 155, 'tostadas-atun.jpg', array['Alto en proteína', 'Sin gluten'], 390, 32, false, 2),
    (c_beb, 'Latte de avena', 'Espresso doble con leche de avena vaporizada.', 62, 'latte-avena.jpg', array['Vegano'], 140, 3, false, 1),
    (c_beb, 'Smoothie verde', 'Espinaca, piña, pepino y jengibre. Sin azúcar añadida.', 79, 'smoothie-verde.jpg', array['Vegano', 'Sin azúcar añadida'], 160, 3, false, 2),
    (c_beb, 'Jugo naranja · cúrcuma', 'Naranja, zanahoria y cúrcuma recién exprimidos.', 69, 'jugo-curcuma.jpg', array['Vegano', 'Sin azúcar añadida'], 130, 2, false, 3),
    (c_beb, 'Matcha frío', 'Matcha ceremonial sobre hielo con la leche que elijas.', 75, 'matcha-frio.jpg', array['Vegetariano'], 150, 6, false, 4),
    (c_pos, 'Brownie de camote', 'Camote, cacao y nuez. Endulzado solo con dátil.', 58, 'brownie-camote.jpg', array['Sin azúcar añadida', 'Sin gluten'], 210, 5, false, 1),
    (c_pos, 'Parfait de yogur griego', 'Yogur griego, granola de la casa y frutos rojos.', 72, 'parfait.jpg', array['Alto en proteína', 'Vegetariano'], 260, 18, false, 2)
  ) as x(cat, nombre, descr, precio, foto, etiq, kcal, prot, dest, ord);

  -- Opciones
  insert into pedidos_grupos (id, negocio, nombre, tipo, requerido, categorias, productos, orden) values
    (md5('hoja:grp:proteina')::uuid, v_negocio, 'Proteína extra', 'varias', false, array[c_des, c_bow, c_wra], '{}', 1),
    (md5('hoja:grp:base')::uuid, v_negocio, 'Base', 'una', true, '{}',
      array[md5('hoja:prod:Bowl teriyaki')::uuid, md5('hoja:prod:Poke de salmón')::uuid], 2),
    (md5('hoja:grp:leche')::uuid, v_negocio, 'Tipo de leche', 'una', true, '{}',
      array[md5('hoja:prod:Latte de avena')::uuid, md5('hoja:prod:Matcha frío')::uuid], 3),
    (md5('hoja:grp:endulzante')::uuid, v_negocio, 'Endulzante', 'una', false, array[c_beb], '{}', 4),
    (md5('hoja:grp:extras')::uuid, v_negocio, 'Extras', 'varias', false, array[c_beb, c_pos], '{}', 5);

  insert into pedidos_opciones (negocio, grupo_id, nombre, precio_extra, orden)
  select v_negocio, md5('hoja:grp:' || g)::uuid, o, p, ord from (values
    ('proteina', 'Pollo a la plancha', 35, 1), ('proteina', 'Huevo', 18, 2),
    ('proteina', 'Atún sellado', 45, 3), ('proteina', 'Tofu', 30, 4),
    ('base', 'Arroz integral', 0, 1), ('base', 'Quinoa', 15, 2), ('base', 'Mix de verdes', 0, 3),
    ('leche', 'Avena', 0, 1), ('leche', 'Almendra', 10, 2), ('leche', 'Deslactosada', 0, 3), ('leche', 'Entera', 0, 4),
    ('endulzante', 'Sin endulzar', 0, 1), ('endulzante', 'Miel de agave', 0, 2), ('endulzante', 'Stevia', 0, 3),
    ('extras', 'Shot de espresso', 18, 1), ('extras', 'Proteína en polvo', 25, 2), ('extras', 'Crema de cacahuate', 15, 3)
  ) as x(g, o, p, ord);

  -- Historial del día: de las 8:00 a.m. (México) a media hora antes de ahora.
  -- Si todavía es muy temprano, el historial queda en el día de ayer.
  v_ini := ((now() at time zone 'America/Mexico_City')::date + time '08:00') at time zone 'America/Mexico_City';
  v_fin := now() - interval '35 minutes';
  if v_fin < v_ini + interval '1 hour' then
    v_ini := v_ini - interval '1 day';
    v_fin := v_ini + interval '12 hours';
  end if;

  for i in 1..24 loop
    v_t := v_ini + (v_fin - v_ini) * (i::numeric / 25);
    v_mod := (array['recoger', 'mesa', 'mesa', 'domicilio'])[1 + (i % 4)];
    v_items := pedidos_items_demo(v_negocio, array[v_combos[1 + (i % 10)][1], v_combos[1 + (i % 10)][2]]);
    select sum((l->>'total')::numeric) into v_sub from jsonb_array_elements(v_items) l;
    v_env := case when v_mod = 'domicilio' and v_sub < 300 then 35 else 0 end;
    v_cli := v_clientes[1 + (i % 8)];
    v_folio := v_folio + 1;
    insert into pedidos_ordenes (negocio, folio, cliente_id, cliente_nombre, modalidad, mesa, direccion, items,
      subtotal, envio, total, metodo_pago, estado, pago_ref, created_at, actualizado_at)
    select v_negocio, v_folio, v_cli, d.full_name, v_mod,
      case when v_mod = 'mesa' then 1 + (i % 12) end,
      case when v_mod = 'domicilio' then 'Calle 9 Sur ' || (1900 + i * 7) || ', Col. Centro' end,
      v_items, v_sub, v_env, v_sub + v_env,
      case when i % 3 = 0 then 'efectivo' else 'tarjeta' end, 'entregado',
      case when i % 3 = 0 then null else 'prueba_hist' || i end, v_t, v_t + interval '25 minutes'
    from demo_cuentas d where d.id = v_cli;
  end loop;

  -- Pedidos en curso, para que la cocina y el reparto tengan qué mover.
  insert into pedidos_ordenes (negocio, folio, cliente_id, cliente_nombre, modalidad, mesa, direccion, referencia,
    items, subtotal, envio, total, metodo_pago, estado, pago_ref, created_at, actualizado_at)
  select v_negocio, v_folio + x.n, x.cli, d.full_name, x.modalidad, x.mesa, x.dir, x.ref,
    pedidos_items_demo(v_negocio, x.prods), x.sub, x.env, x.sub + x.env, x.metodo, x.estado,
    case when x.metodo = 'tarjeta' then 'prueba_vivo' || x.n end,
    now() - x.hace, now() - x.hace + interval '1 minute'
  from (values
    (1, v_clientes[1], 'mesa', 4, null, null, array['Chilaquiles verdes horneados', 'Latte de avena'], 207, 0, 'efectivo', 'recibido', interval '2 minutes'),
    (2, v_clientes[2], 'recoger', null, null, null, array['Bowl teriyaki', 'Matcha frío'], 234, 0, 'tarjeta', 'preparando', interval '9 minutes'),
    (3, v_clientes[3], 'domicilio', null, 'Calle 25 Poniente 3110, Col. Volcanes', 'Casa blanca con portón negro', array['Poke de salmón', 'Smoothie verde'], 264, 35, 'tarjeta', 'listo', interval '18 minutes'),
    (4, v_clientes[4], 'domicilio', null, 'Blvd. 5 de Mayo 1504, Col. Ladrillera', 'Depto 3, tocar timbre', array['Wrap de pollo y hummus', 'Brownie de camote'], 197, 35, 'efectivo', 'en_camino', interval '27 minutes')
  ) as x(n, cli, modalidad, mesa, dir, ref, prods, sub, env, metodo, estado, hace)
  join demo_cuentas d on d.id = x.cli;

  -- Dos pedidos viejos de Ana, para que "Mis pedidos" no arranque vacío.
  insert into pedidos_ordenes (negocio, folio, cliente_id, cliente_nombre, modalidad, mesa, items,
    subtotal, envio, total, metodo_pago, estado, pago_ref, created_at, actualizado_at)
  values
    (v_negocio, v_folio + 5, '00000000-0000-4000-b000-000000000001', 'Ana Sofía Méndez', 'recoger', null,
      pedidos_items_demo(v_negocio, array['Toast de aguacate', 'Latte de avena']), 191, 0, 191, 'tarjeta', 'entregado',
      'prueba_ana1', now() - interval '3 days', now() - interval '3 days' + interval '20 minutes'),
    (v_negocio, v_folio + 6, '00000000-0000-4000-b000-000000000001', 'Ana Sofía Méndez', 'mesa', 7,
      pedidos_items_demo(v_negocio, array['Poke de salmón', 'Jugo naranja · cúrcuma']), 254, 0, 254, 'efectivo', 'entregado',
      null, now() - interval '9 days', now() - interval '9 days' + interval '30 minutes');
end $$;

revoke all on function public.pedidos_reset() from public, anon;
grant execute on function public.pedidos_reset() to authenticated;

-- Cada noche a las 3:10 a.m. de México (9:10 UTC), después del de Studio Alma.
select cron.unschedule('pedidos_reset_nocturno') where exists (select 1 from cron.job where jobname = 'pedidos_reset_nocturno');
select cron.schedule('pedidos_reset_nocturno', '10 9 * * *', 'select public.pedidos_reset()');

select public.pedidos_reset();
