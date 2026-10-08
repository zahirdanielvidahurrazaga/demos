-- ─────────────────────────────────────────────────────────────────────────────
-- BASE DE DEMOSTRACIONES (proyecto Supabase "Demos", qwqrbckivrkmeykiukug)
-- 10 · PEDIDOS EN LÍNEA — estructura, permisos y funciones. Idempotente.
--
-- ⚠️ Este archivo NUNCA se corre contra Be Fit Lab (fifaowaiokauhuqklzwe).
--
-- Demo para cafeterías y restaurantes (/pedidos/<negocio>), aparte de la de
-- pilates. MULTI-NEGOCIO desde el inicio: todo lleva `negocio`, así una sola
-- base sirve para cada maqueta que se arme (Hoja, el restaurante que sigue…).
--
-- Reglas de diseño:
--   · El menú se lee sin sesión (un QR de mesa abre directo el menú).
--   · Nadie escribe órdenes desde el navegador: se crean y avanzan SOLO con las
--     funciones de abajo, que calculan el precio en el servidor y validan el rol.
--   · El pago es una PASARELA DE PRUEBA (pedidos_pagar_prueba): 4242… aprueba,
--     4000…0002 rechaza. No hay Stripe en las maquetas.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pedidos_negocios (
  id text primary key,                       -- la clave del link: /pedidos/<id>
  nombre text not null,
  giro text,
  ciudad text,
  direccion text,
  telefono text,
  marca jsonb not null default '{}',         -- colores y textos de la maqueta
  modalidades text[] not null default '{recoger,mesa,domicilio}',
  costo_envio numeric(10,2) not null default 35,
  envio_gratis_desde numeric(10,2),          -- null = el envío siempre se cobra
  mesas int not null default 10,
  tiempo_prep_min int not null default 15,
  abierto boolean not null default true
);

create table if not exists public.pedidos_miembros (
  negocio text not null references public.pedidos_negocios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol text not null check (rol in ('cliente', 'cocina', 'repartidor', 'dueno')),
  nombre text,
  primary key (negocio, user_id)
);

create table if not exists public.pedidos_categorias (
  id uuid primary key default gen_random_uuid(),
  negocio text not null references public.pedidos_negocios(id) on delete cascade,
  nombre text not null,
  orden int not null default 0
);

create table if not exists public.pedidos_productos (
  id uuid primary key default gen_random_uuid(),
  negocio text not null references public.pedidos_negocios(id) on delete cascade,
  categoria_id uuid references public.pedidos_categorias(id) on delete set null,
  nombre text not null,
  descripcion text,
  precio numeric(10,2) not null check (precio >= 0),
  foto text,
  etiquetas text[] not null default '{}',    -- "Alto en proteína", "Vegano"…
  kcal int,
  proteina_g int,
  disponible boolean not null default true,
  destacado boolean not null default false,
  orden int not null default 0
);

-- Grupo de opciones ("Proteína extra", "Tipo de leche"). Aplica a un producto
-- si su categoría está en `categorias` o el producto está en `productos`.
create table if not exists public.pedidos_grupos (
  id uuid primary key default gen_random_uuid(),
  negocio text not null references public.pedidos_negocios(id) on delete cascade,
  nombre text not null,
  tipo text not null default 'varias' check (tipo in ('una', 'varias')),
  requerido boolean not null default false,
  categorias uuid[] not null default '{}',
  productos uuid[] not null default '{}',
  orden int not null default 0
);

create table if not exists public.pedidos_opciones (
  id uuid primary key default gen_random_uuid(),
  negocio text not null references public.pedidos_negocios(id) on delete cascade,
  grupo_id uuid not null references public.pedidos_grupos(id) on delete cascade,
  nombre text not null,
  precio_extra numeric(10,2) not null default 0 check (precio_extra >= 0),
  disponible boolean not null default true,
  orden int not null default 0
);

create table if not exists public.pedidos_ordenes (
  id uuid primary key default gen_random_uuid(),
  negocio text not null references public.pedidos_negocios(id) on delete cascade,
  folio int not null,
  cliente_id uuid references auth.users(id) on delete set null,
  cliente_nombre text,
  modalidad text not null check (modalidad in ('recoger', 'mesa', 'domicilio')),
  mesa int,
  direccion text,
  referencia text,
  telefono text,
  hora_programada timestamptz,               -- null = lo antes posible
  items jsonb not null,                      -- foto del pedido con precios del momento
  subtotal numeric(10,2) not null,
  envio numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  metodo_pago text not null check (metodo_pago in ('tarjeta', 'efectivo')),
  estado text not null check (estado in
    ('pendiente_pago', 'recibido', 'preparando', 'listo', 'en_camino', 'entregado', 'cancelado')),
  pago_ref text,
  notas text,
  repartidor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  actualizado_at timestamptz not null default now(),
  unique (negocio, folio)
);
create index if not exists pedidos_ordenes_negocio_estado on public.pedidos_ordenes (negocio, estado, created_at desc);
create index if not exists pedidos_ordenes_cliente on public.pedidos_ordenes (cliente_id, created_at desc);

-- ── Rol de quien llama en un negocio (null = no es miembro) ──────────────────
create or replace function public.pedidos_rol(p_negocio text)
returns text language sql stable security definer set search_path to 'public' as $$
  select rol from pedidos_miembros where negocio = p_negocio and user_id = auth.uid();
$$;

create or replace function public.pedidos_es_staff(p_negocio text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(pedidos_rol(p_negocio) in ('cocina', 'repartidor', 'dueno'), false);
$$;

-- ── Permisos ─────────────────────────────────────────────────────────────────
alter table public.pedidos_negocios   enable row level security;
alter table public.pedidos_miembros   enable row level security;
alter table public.pedidos_categorias enable row level security;
alter table public.pedidos_productos  enable row level security;
alter table public.pedidos_grupos     enable row level security;
alter table public.pedidos_opciones   enable row level security;
alter table public.pedidos_ordenes    enable row level security;

do $$
declare t text;
begin
  -- El menú es público: lectura para todos, escritura solo para el dueño.
  foreach t in array array['pedidos_negocios', 'pedidos_categorias', 'pedidos_productos', 'pedidos_grupos', 'pedidos_opciones'] loop
    execute format('drop policy if exists "%1$s_leer" on public.%1$s', t);
    execute format('create policy "%1$s_leer" on public.%1$s for select to anon, authenticated using (true)', t);
  end loop;
  foreach t in array array['pedidos_categorias', 'pedidos_productos', 'pedidos_grupos', 'pedidos_opciones'] loop
    execute format('drop policy if exists "%1$s_dueno" on public.%1$s', t);
    execute format($p$create policy "%1$s_dueno" on public.%1$s for all to authenticated
      using (pedidos_rol(negocio) = 'dueno') with check (pedidos_rol(negocio) = 'dueno')$p$, t);
  end loop;
end $$;

drop policy if exists "pedidos_negocios_dueno" on public.pedidos_negocios;
create policy "pedidos_negocios_dueno" on public.pedidos_negocios for update to authenticated
  using (pedidos_rol(id) = 'dueno') with check (pedidos_rol(id) = 'dueno');

drop policy if exists "pedidos_miembros_leer" on public.pedidos_miembros;
create policy "pedidos_miembros_leer" on public.pedidos_miembros for select to authenticated
  using (user_id = auth.uid() or pedidos_es_staff(negocio));

-- Órdenes: cada cliente ve las suyas; el personal, todas las de su negocio.
-- Sin políticas de escritura: solo entran y cambian por las funciones.
drop policy if exists "pedidos_ordenes_leer" on public.pedidos_ordenes;
create policy "pedidos_ordenes_leer" on public.pedidos_ordenes for select to authenticated
  using (cliente_id = auth.uid() or pedidos_es_staff(negocio));

grant select on public.pedidos_negocios, public.pedidos_categorias, public.pedidos_productos,
  public.pedidos_grupos, public.pedidos_opciones to anon, authenticated;
grant select on public.pedidos_miembros, public.pedidos_ordenes to authenticated;
grant insert, update, delete on public.pedidos_categorias, public.pedidos_productos,
  public.pedidos_grupos, public.pedidos_opciones to authenticated;
grant update on public.pedidos_negocios to authenticated;
revoke insert, update, delete on public.pedidos_ordenes, public.pedidos_miembros from anon, authenticated;

-- Tiempo real: la cocina ve entrar los pedidos y el cliente su seguimiento.
do $$ begin
  begin alter publication supabase_realtime add table public.pedidos_ordenes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.pedidos_productos; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.pedidos_negocios; exception when duplicate_object then null; end;
end $$;

-- ── Crear una orden (precio 100 % del servidor) ─────────────────────────────
-- p_items: [{ "producto_id": uuid, "cantidad": int, "opciones": [uuid], "nota": text }]
create or replace function public.pedidos_crear_orden(
  p_negocio text, p_items jsonb, p_modalidad text, p_metodo text,
  p_mesa int default null, p_direccion text default null, p_referencia text default null,
  p_telefono text default null, p_hora timestamptz default null, p_notas text default null
) returns uuid language plpgsql security definer set search_path to 'public' as $$
declare
  v_neg pedidos_negocios;
  v_item jsonb; v_prod pedidos_productos; v_opc pedidos_opciones; v_grupo pedidos_grupos;
  v_cant int; v_unit numeric; v_elegidas jsonb; v_lineas jsonb := '[]'; v_ids uuid[];
  v_subtotal numeric := 0; v_envio numeric := 0; v_folio int; v_id uuid; v_nombre text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para pedir'; end if;
  select * into v_neg from pedidos_negocios where id = p_negocio;
  if v_neg.id is null then raise exception 'Negocio no encontrado'; end if;
  if not v_neg.abierto then raise exception 'El negocio no está recibiendo pedidos ahora'; end if;
  if not (p_modalidad = any(v_neg.modalidades)) then raise exception 'Modalidad no disponible'; end if;
  if p_metodo not in ('tarjeta', 'efectivo') then raise exception 'Método de pago inválido'; end if;
  if p_modalidad = 'mesa' and (p_mesa is null or p_mesa < 1 or p_mesa > v_neg.mesas) then
    raise exception 'Mesa inválida'; end if;
  if p_modalidad = 'domicilio' and length(coalesce(trim(p_direccion), '')) < 8 then
    raise exception 'Escribe la dirección de entrega'; end if;
  if p_hora is not null and (p_hora < now() - interval '5 minutes' or p_hora > now() + interval '2 days') then
    raise exception 'Hora de entrega inválida'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío'; end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'Demasiados productos'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from pedidos_productos
      where id = (v_item->>'producto_id')::uuid and negocio = p_negocio;
    if v_prod.id is null then raise exception 'Producto no encontrado'; end if;
    if not v_prod.disponible then raise exception '% ya no está disponible', v_prod.nombre; end if;
    v_cant := greatest(1, least(20, coalesce((v_item->>'cantidad')::int, 1)));
    v_unit := v_prod.precio;
    v_elegidas := '[]';
    select coalesce(array_agg(distinct x::uuid), '{}') into v_ids
      from jsonb_array_elements_text(coalesce(v_item->'opciones', '[]')) x;

    -- Cada opción tiene que ser de un grupo que aplique a ESTE producto.
    for v_opc in select * from pedidos_opciones where id = any(v_ids) loop
      select * into v_grupo from pedidos_grupos where id = v_opc.grupo_id;
      if v_opc.negocio <> p_negocio or not v_opc.disponible
         or not (coalesce(v_prod.categoria_id = any(v_grupo.categorias), false) or v_prod.id = any(v_grupo.productos)) then
        raise exception 'Opción no válida para %', v_prod.nombre;
      end if;
      v_unit := v_unit + v_opc.precio_extra;
      v_elegidas := v_elegidas || jsonb_build_object('id', v_opc.id, 'nombre', v_opc.nombre, 'grupo', v_grupo.nombre, 'precio_extra', v_opc.precio_extra);
    end loop;
    if (select count(*) from pedidos_opciones where id = any(v_ids)) <> coalesce(array_length(v_ids, 1), 0) then
      raise exception 'Opción no válida para %', v_prod.nombre;
    end if;

    -- Grupos obligatorios y de "una sola" opción.
    for v_grupo in select * from pedidos_grupos g
      where g.negocio = p_negocio and (v_prod.categoria_id = any(g.categorias) or v_prod.id = any(g.productos)) loop
      declare v_n int;
      begin
        select count(*) into v_n from pedidos_opciones where grupo_id = v_grupo.id and id = any(v_ids);
        if v_grupo.requerido and v_n = 0 then raise exception 'Elige %: %', lower(v_grupo.nombre), v_prod.nombre; end if;
        if v_grupo.tipo = 'una' and v_n > 1 then raise exception 'Solo una opción de %', lower(v_grupo.nombre); end if;
      end;
    end loop;

    v_subtotal := v_subtotal + v_unit * v_cant;
    v_lineas := v_lineas || jsonb_build_object(
      'producto_id', v_prod.id, 'nombre', v_prod.nombre, 'foto', v_prod.foto, 'cantidad', v_cant,
      'precio_base', v_prod.precio, 'precio_unitario', v_unit, 'opciones', v_elegidas,
      'nota', left(coalesce(v_item->>'nota', ''), 200), 'total', v_unit * v_cant);
  end loop;

  if p_modalidad = 'domicilio' and (v_neg.envio_gratis_desde is null or v_subtotal < v_neg.envio_gratis_desde) then
    v_envio := v_neg.costo_envio;
  end if;

  -- Folio consecutivo por negocio, sin choques entre dos pedidos al mismo tiempo.
  perform pg_advisory_xact_lock(hashtext('pedidos_folio:' || p_negocio));
  select coalesce(max(folio), 100) + 1 into v_folio from pedidos_ordenes where negocio = p_negocio;

  select coalesce(m.nombre, u.raw_user_meta_data->>'full_name', u.email) into v_nombre
    from auth.users u left join pedidos_miembros m on m.user_id = u.id and m.negocio = p_negocio
    where u.id = auth.uid();

  insert into pedidos_ordenes (negocio, folio, cliente_id, cliente_nombre, modalidad, mesa, direccion,
    referencia, telefono, hora_programada, items, subtotal, envio, total, metodo_pago, estado, notas)
  values (p_negocio, v_folio, auth.uid(), v_nombre, p_modalidad,
    case when p_modalidad = 'mesa' then p_mesa end,
    case when p_modalidad = 'domicilio' then left(trim(p_direccion), 300) end,
    case when p_modalidad = 'domicilio' then left(p_referencia, 200) end,
    left(p_telefono, 30),
    case when p_modalidad = 'mesa' then null else p_hora end,
    v_lineas, v_subtotal, v_envio, v_subtotal + v_envio, p_metodo,
    case when p_metodo = 'tarjeta' then 'pendiente_pago' else 'recibido' end,
    left(p_notas, 300))
  returning id into v_id;
  return v_id;
end $$;

-- ── Pasarela de prueba ───────────────────────────────────────────────────────
create or replace function public.pedidos_pagar_prueba(p_orden uuid, p_tarjeta text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare v_num text := regexp_replace(coalesce(p_tarjeta, ''), '\D', '', 'g'); v_ok uuid;
begin
  if not exists (select 1 from pedidos_ordenes where id = p_orden and cliente_id = auth.uid()) then
    raise exception 'Pedido no encontrado'; end if;
  if v_num = '4000000000000002' then raise exception 'Tarjeta rechazada por el banco (tarjeta de prueba de rechazo).'; end if;
  if length(v_num) < 15 then raise exception 'Número de tarjeta incompleto'; end if;
  update pedidos_ordenes set estado = 'recibido', pago_ref = 'prueba_' || left(md5(random()::text), 8), actualizado_at = now()
    where id = p_orden and cliente_id = auth.uid() and estado = 'pendiente_pago'
    returning id into v_ok;
  if v_ok is null then raise exception 'Este pedido ya no está esperando pago'; end if;
  return 'pagado';
end $$;

create or replace function public.pedidos_cancelar_pago(p_orden uuid)
returns text language plpgsql security definer set search_path to 'public' as $$
declare v_ok uuid;
begin
  update pedidos_ordenes set estado = 'cancelado', actualizado_at = now()
    where id = p_orden and cliente_id = auth.uid() and estado = 'pendiente_pago'
    returning id into v_ok;
  if v_ok is null then raise exception 'Este pedido ya no está esperando pago'; end if;
  return 'cancelado';
end $$;

-- ── Avanzar el estado (cocina, repartidor, dueño) ───────────────────────────
-- recibido → preparando → listo → entregado (recoger / mesa)
--                               → en_camino → entregado (domicilio)
-- recibido | preparando → cancelado (cocina o dueño)
create or replace function public.pedidos_avanzar(p_orden uuid, p_estado text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare v pedidos_ordenes; v_rol text; v_ok boolean := false;
begin
  select * into v from pedidos_ordenes where id = p_orden for update;
  if v.id is null then raise exception 'Pedido no encontrado'; end if;
  v_rol := pedidos_rol(v.negocio);
  if v_rol is null or v_rol = 'cliente' then raise exception 'Sin permiso'; end if;

  v_ok := case
    when v.estado = 'recibido'   and p_estado = 'preparando' then v_rol in ('cocina', 'dueno')
    when v.estado = 'preparando' and p_estado = 'listo'      then v_rol in ('cocina', 'dueno')
    when v.estado = 'listo'      and p_estado = 'entregado'  then v.modalidad <> 'domicilio' and v_rol in ('cocina', 'dueno')
    when v.estado = 'listo'      and p_estado = 'en_camino'  then v.modalidad = 'domicilio' and v_rol in ('repartidor', 'dueno')
    when v.estado = 'en_camino'  and p_estado = 'entregado'  then v_rol in ('repartidor', 'dueno')
    when v.estado in ('recibido', 'preparando') and p_estado = 'cancelado' then v_rol in ('cocina', 'dueno')
    else false end;
  if not v_ok then raise exception 'No se puede pasar de % a %', v.estado, p_estado; end if;

  update pedidos_ordenes set estado = p_estado, actualizado_at = now(),
    repartidor_id = case when p_estado = 'en_camino' then auth.uid() else repartidor_id end
    where id = p_orden;
  return p_estado;
end $$;

-- ── Resumen del día para el dueño (hora de México) ──────────────────────────
create or replace function public.pedidos_resumen_dia(p_negocio text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_hoy date := (now() at time zone 'America/Mexico_City')::date; v jsonb;
begin
  if coalesce(pedidos_rol(p_negocio), '') <> 'dueno' then raise exception 'Sin permiso'; end if;
  with del_dia as (
    select * from pedidos_ordenes
    where negocio = p_negocio and estado not in ('pendiente_pago', 'cancelado')
      and (created_at at time zone 'America/Mexico_City')::date = v_hoy
  )
  select jsonb_build_object(
    'ventas', coalesce(sum(total), 0),
    'pedidos', count(*),
    'ticket_promedio', coalesce(round(avg(total), 2), 0),
    'en_curso', count(*) filter (where estado <> 'entregado'),
    'por_modalidad', (select coalesce(jsonb_object_agg(modalidad, n), '{}') from
                        (select modalidad, count(*) n from del_dia group by modalidad) m),
    'por_hora', (select coalesce(jsonb_agg(jsonb_build_object('hora', h, 'total', t) order by h), '[]') from
                   (select extract(hour from created_at at time zone 'America/Mexico_City')::int h, sum(total) t
                    from del_dia group by 1) x),
    'top', (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'cantidad', c, 'total', t) order by c desc), '[]') from
              (select l->>'nombre' nombre, sum((l->>'cantidad')::int) c, sum((l->>'total')::numeric) t
               from del_dia, jsonb_array_elements(items) l group by 1 order by 2 desc limit 5) y)
  ) into v from del_dia;
  return v;
end $$;

revoke all on function public.pedidos_crear_orden(text, jsonb, text, text, int, text, text, text, timestamptz, text) from public, anon;
revoke all on function public.pedidos_pagar_prueba(uuid, text) from public, anon;
revoke all on function public.pedidos_cancelar_pago(uuid) from public, anon;
revoke all on function public.pedidos_avanzar(uuid, text) from public, anon;
revoke all on function public.pedidos_resumen_dia(text) from public, anon;
grant execute on function public.pedidos_crear_orden(text, jsonb, text, text, int, text, text, text, timestamptz, text) to authenticated;
grant execute on function public.pedidos_pagar_prueba(uuid, text) to authenticated;
grant execute on function public.pedidos_cancelar_pago(uuid) to authenticated;
grant execute on function public.pedidos_avanzar(uuid, text) to authenticated;
grant execute on function public.pedidos_resumen_dia(text) to authenticated;

-- ── Fotos del menú: bucket público, escribe solo el dueño de su carpeta ─────
insert into storage.buckets (id, name, public) values ('pedidos', 'pedidos', true)
  on conflict (id) do update set public = true;
drop policy if exists "pedidos_fotos_dueno" on storage.objects;
create policy "pedidos_fotos_dueno" on storage.objects for all to authenticated
  using (bucket_id = 'pedidos' and pedidos_rol((storage.foldername(name))[1]) = 'dueno')
  with check (bucket_id = 'pedidos' and pedidos_rol((storage.foldername(name))[1]) = 'dueno');
