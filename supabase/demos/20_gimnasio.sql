-- ─────────────────────────────────────────────────────────────────────────────
-- BASE DE DEMOSTRACIONES (proyecto Supabase "Demos", qwqrbckivrkmeykiukug)
-- 20 · GIMNASIO — control de acceso con QR y aforo en vivo. Idempotente.
--
-- ⚠️ Este archivo NUNCA se corre contra Be Fit Lab (fifaowaiokauhuqklzwe).
--
-- Demo para gimnasios (/gimnasio/<negocio>). MULTI-NEGOCIO como la de pedidos:
-- todo lleva `negocio`.
--
-- Reglas de diseño:
--   · El QR del socio NO es fijo: es un token firmado (HMAC) que cambia cada
--     `qr_segundos`. Se firma en el servidor (la llave nunca sale de la base),
--     así que una captura de pantalla deja de servir en segundos.
--   · Nadie escribe accesos desde el navegador: todo pasa por las funciones de
--     abajo, que validan rol, membresía, horario del plan, anti-passback y aforo.
--   · "Adentro" = su último acceso permitido de las últimas 3 h es una entrada
--     (si no registró salida, a las 3 h cuenta como salida automática).
--   · Para que el aforo se vea vivo, gym_simular() (cron cada minuto) va
--     dejando entrar y salir a los socios según la agenda del día que arma el
--     reinicio nocturno (21_gimnasio_manhattan.sql).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.gym_negocios (
  id text primary key,                       -- la clave del link: /gimnasio/<id>
  nombre text not null,
  ciudad text,
  capacidad int not null default 120,        -- aforo máximo
  alerta_pct int not null default 85,        -- % de aforo que enciende la alerta
  qr_segundos int not null default 30,       -- cada cuánto cambia el QR del socio
  marca jsonb not null default '{}'
);

create table if not exists public.gym_miembros (
  negocio text not null references public.gym_negocios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol text not null check (rol in ('socio', 'recepcion', 'dueno')),
  primary key (negocio, user_id)
);

create table if not exists public.gym_planes (
  negocio text not null references public.gym_negocios(id) on delete cascade,
  id text not null,
  nombre text not null,
  precio numeric(10,2) not null,
  dias int not null,
  hora_desde int,                            -- null = horario libre
  hora_hasta int,                            -- (horas de México, [desde, hasta))
  orden int not null default 0,
  primary key (negocio, id)
);

create table if not exists public.gym_socios (
  id uuid primary key default gen_random_uuid(),
  negocio text not null references public.gym_negocios(id) on delete cascade,
  numero int not null,                       -- número de socio (va en el QR)
  nombre text not null,
  user_id uuid references auth.users(id) on delete set null,  -- solo el socio de la maqueta
  plan text not null,
  vence date not null,
  adeudo numeric(10,2) not null default 0,
  congelada boolean not null default false,
  foto text,
  alta date not null default current_date,
  sim_minuto int,                            -- simulación: a qué hora suele llegar (min del día)
  sim_frecuencia numeric(4,2),               -- simulación: probabilidad de venir un día cualquiera
  unique (negocio, numero),
  foreign key (negocio, plan) references public.gym_planes(negocio, id)
);

create table if not exists public.gym_accesos (
  id bigint generated always as identity primary key,
  negocio text not null references public.gym_negocios(id) on delete cascade,
  socio_id uuid references public.gym_socios(id) on delete cascade,  -- null = QR que no es de nadie
  tipo text not null check (tipo in ('entrada', 'salida')),
  permitido boolean not null,
  motivo text,                               -- por qué se negó (o nota de recepción)
  metodo text not null default 'qr' check (metodo in ('qr', 'lector', 'manual')),
  creado timestamptz not null default now()
);
create index if not exists gym_accesos_negocio_creado on public.gym_accesos (negocio, creado desc);
create index if not exists gym_accesos_socio_creado on public.gym_accesos (socio_id, creado desc);

create table if not exists public.gym_pagos (
  id bigint generated always as identity primary key,
  negocio text not null references public.gym_negocios(id) on delete cascade,
  socio_id uuid references public.gym_socios(id) on delete cascade,
  monto numeric(10,2) not null,
  concepto text not null,
  creado timestamptz not null default now()
);
create index if not exists gym_pagos_negocio_creado on public.gym_pagos (negocio, creado desc);

-- Llave con la que se firman los QR. Sin políticas: nadie la lee por la API.
create table if not exists public.gym_secretos (
  negocio text primary key references public.gym_negocios(id) on delete cascade,
  llave text not null default encode(extensions.gen_random_bytes(32), 'hex')
);

-- Agenda de la simulación del día (quién llega y a qué hora). Sin políticas.
create table if not exists public.gym_agenda (
  id bigint generated always as identity primary key,
  negocio text not null references public.gym_negocios(id) on delete cascade,
  socio_id uuid not null references public.gym_socios(id) on delete cascade,
  entra timestamptz not null,
  sale timestamptz not null,
  entro boolean not null default false,
  salio boolean not null default false
);
create index if not exists gym_agenda_pendientes on public.gym_agenda (entra) where not entro;

-- ── Utilidades de fecha (todo el gimnasio vive en hora de México) ───────────
create or replace function public.gym_hoy() returns date
language sql stable as $$ select (now() at time zone 'America/Mexico_City')::date $$;

create or replace function public.gym_momento(p_dia date, p_minuto int) returns timestamptz
language sql immutable as $$
  select (p_dia::timestamp + make_interval(mins => p_minuto)) at time zone 'America/Mexico_City'
$$;

-- ── Roles ───────────────────────────────────────────────────────────────────
create or replace function public.gym_rol(p_negocio text) returns text
language sql stable security definer set search_path to 'public' as $$
  select rol from gym_miembros where negocio = p_negocio and user_id = auth.uid()
$$;

create or replace function public.gym_es_staff(p_negocio text) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select coalesce(gym_rol(p_negocio) in ('recepcion', 'dueno'), false)
$$;

-- ── Permisos de lectura (escribir: solo por funciones) ──────────────────────
alter table public.gym_negocios enable row level security;
alter table public.gym_miembros enable row level security;
alter table public.gym_planes enable row level security;
alter table public.gym_socios enable row level security;
alter table public.gym_accesos enable row level security;
alter table public.gym_pagos enable row level security;
alter table public.gym_secretos enable row level security;
alter table public.gym_agenda enable row level security;

drop policy if exists gym_negocios_leer on public.gym_negocios;
create policy gym_negocios_leer on public.gym_negocios for select using (true);
drop policy if exists gym_planes_leer on public.gym_planes;
create policy gym_planes_leer on public.gym_planes for select using (true);
drop policy if exists gym_miembros_leer on public.gym_miembros;
create policy gym_miembros_leer on public.gym_miembros for select to authenticated using (user_id = auth.uid());
drop policy if exists gym_socios_leer on public.gym_socios;
create policy gym_socios_leer on public.gym_socios for select to authenticated
  using (gym_es_staff(negocio) or user_id = auth.uid());
drop policy if exists gym_accesos_leer on public.gym_accesos;
create policy gym_accesos_leer on public.gym_accesos for select to authenticated
  using (gym_es_staff(negocio) or socio_id in (select id from gym_socios where user_id = auth.uid()));
drop policy if exists gym_pagos_leer on public.gym_pagos;
create policy gym_pagos_leer on public.gym_pagos for select to authenticated using (gym_es_staff(negocio));

do $$ begin
  begin alter publication supabase_realtime add table public.gym_accesos; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.gym_negocios; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.gym_socios; exception when duplicate_object then null; end;
end $$;

-- ── Socio en JSON (lo que ve recepción al escanear y el socio en su app) ────
create or replace function public.gym_socio_json(p_socio uuid) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'id', s.id, 'numero', s.numero, 'nombre', s.nombre, 'foto', s.foto,
    'plan', p.nombre, 'plan_id', p.id, 'precio', p.precio, 'vence', s.vence,
    'dias', s.vence - gym_hoy(), 'adeudo', s.adeudo, 'congelada', s.congelada,
    'horario', case when p.hora_desde is null then 'Horario libre'
      else lpad(p.hora_desde::text, 2, '0') || ':00 a ' || lpad(p.hora_hasta::text, 2, '0') || ':00' end,
    'estado', case when s.congelada then 'congelada' when s.vence < gym_hoy() then 'vencida'
      when s.adeudo > 0 then 'adeudo' else 'activa' end)
  from gym_socios s join gym_planes p on p.negocio = s.negocio and p.id = s.plan
  where s.id = p_socio
$$;

-- ── ¿Quién está adentro? ────────────────────────────────────────────────────
create or replace function public.gym_dentro_desde(p_socio uuid) returns timestamptz
language sql stable security definer set search_path to 'public' as $$
  select case when a.tipo = 'entrada' then a.creado end
  from gym_accesos a
  where a.socio_id = p_socio and a.permitido and a.creado > now() - interval '3 hours'
  order by a.creado desc limit 1
$$;

create or replace function public.gym_adentro(p_negocio text)
returns table (socio_id uuid, desde timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select u.socio_id, u.creado from (
    select distinct on (a.socio_id) a.socio_id, a.tipo, a.creado
    from gym_accesos a
    where a.negocio = p_negocio and a.permitido and a.socio_id is not null
      and a.creado > now() - interval '3 hours'
    order by a.socio_id, a.creado desc
  ) u where u.tipo = 'entrada'
$$;

-- Visitas (entrada → salida) para calcular aforos de horas pasadas.
create or replace function public.gym_visitas(p_negocio text, p_desde timestamptz, p_hasta timestamptz)
returns table (socio_id uuid, ent timestamptz, sal timestamptz, fecha date)
language sql stable security definer set search_path to 'public' as $$
  with acc as (
    select a.socio_id, a.tipo, a.creado,
      lead(a.creado) over w as sig, lead(a.tipo) over w as sig_tipo
    from gym_accesos a
    where a.negocio = p_negocio and a.permitido and a.socio_id is not null
      and a.creado >= p_desde - interval '3 hours' and a.creado < p_hasta
    window w as (partition by a.socio_id order by a.creado)
  )
  select socio_id, creado,
    case when sig_tipo = 'salida' then sig
         else least(creado + interval '3 hours', coalesce(sig, creado + interval '3 hours')) end,
    (creado at time zone 'America/Mexico_City')::date
  from acc where tipo = 'entrada' and creado >= p_desde - interval '3 hours'
$$;

-- ── El QR: token firmado que cambia cada `qr_segundos` ──────────────────────
create or replace function public.gym_token(p_negocio text, p_numero int, p_ventana bigint) returns text
language sql stable security definer set search_path to 'public', 'extensions' as $$
  select 'GYM1.' || p_numero || '.' || p_ventana || '.' ||
    substr(encode(extensions.hmac(p_negocio || ':' || p_numero || ':' || p_ventana, s.llave, 'sha256'), 'hex'), 1, 12)
  from gym_secretos s where s.negocio = p_negocio
$$;

create or replace function public.gym_pase_de(p_negocio text, p_socio uuid) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_seg int;
  v_epoch numeric := extract(epoch from now());
  v_w bigint;
  v_num int;
begin
  select qr_segundos into v_seg from gym_negocios where id = p_negocio;
  select numero into v_num from gym_socios where id = p_socio and negocio = p_negocio;
  if v_num is null then raise exception 'Socio no encontrado'; end if;
  v_w := floor(v_epoch / v_seg);
  return jsonb_build_object('token', gym_token(p_negocio, v_num, v_w), 'segundos', v_seg,
    'restan_ms', round(((v_w + 1) * v_seg - v_epoch) * 1000), 'socio', gym_socio_json(p_socio));
end $$;

-- El pase del socio que tiene la sesión.
create or replace function public.gym_mi_pase(p_negocio text) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare v_socio uuid;
begin
  select id into v_socio from gym_socios where negocio = p_negocio and user_id = auth.uid();
  if v_socio is null then raise exception 'No eres socio de este gimnasio'; end if;
  return gym_pase_de(p_negocio, v_socio) || jsonb_build_object('adentro_desde', gym_dentro_desde(v_socio));
end $$;

-- SOLO MAQUETA: recepción pide el pase de los socios de ejemplo para probar
-- sin un segundo celular (vencida, adeudo, horario…). En un gimnasio real no existe.
create or replace function public.gym_pase_prueba(p_negocio text, p_numero int) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare v_socio uuid;
begin
  if not gym_es_staff(p_negocio) then raise exception 'Solo recepción'; end if;
  select id into v_socio from gym_socios where negocio = p_negocio and numero = p_numero;
  return gym_pase_de(p_negocio, v_socio);
end $$;

-- ── El corazón: ¿pasa o no pasa? (interna; la usan recepción y la simulación)
create or replace function public.gym_evaluar(
  p_negocio text, p_socio uuid, p_tipo text, p_metodo text,
  p_forzar boolean default false, p_cuando timestamptz default now()
) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_s gym_socios;
  v_p gym_planes;
  v_n gym_negocios;
  v_desde timestamptz;
  v_tipo text;
  v_motivo text;
  v_adentro int;
  v_hora int := extract(hour from now() at time zone 'America/Mexico_City');
  v_ultimo timestamptz;
begin
  select * into v_s from gym_socios where id = p_socio and negocio = p_negocio;
  if not found then return jsonb_build_object('resultado', 'invalido', 'motivo', 'Socio no encontrado'); end if;
  select * into v_p from gym_planes where negocio = p_negocio and id = v_s.plan;
  select * into v_n from gym_negocios where id = p_negocio;

  -- La cámara lee el mismo QR varias veces seguidas: no se registra dos veces.
  if p_metodo in ('qr', 'lector') and not p_forzar then
    select creado into v_ultimo from gym_accesos where socio_id = p_socio order by creado desc limit 1;
    if v_ultimo > now() - interval '12 seconds' then
      return jsonb_build_object('resultado', 'repetido', 'socio', gym_socio_json(p_socio));
    end if;
  end if;

  v_desde := gym_dentro_desde(p_socio);
  v_tipo := case when p_tipo = 'auto' then case when v_desde is null then 'entrada' else 'salida' end else p_tipo end;

  if v_tipo = 'entrada' then
    select count(*) into v_adentro from gym_adentro(p_negocio);
    v_motivo := case
      when v_s.congelada then 'Membresía congelada'
      when v_s.vence < gym_hoy() then 'Membresía vencida el ' || to_char(v_s.vence, 'DD/MM/YYYY')
      when v_s.adeudo > 0 then 'Adeudo pendiente de $' || to_char(v_s.adeudo, 'FM999,990')
      when v_p.hora_desde is not null and (v_hora < v_p.hora_desde or v_hora >= v_p.hora_hasta)
        then 'Su plan solo entra de ' || v_p.hora_desde || ':00 a ' || v_p.hora_hasta || ':00'
      when v_desde is not null
        then 'Ya está adentro desde las ' || to_char(v_desde at time zone 'America/Mexico_City', 'HH24:MI')
      when v_adentro >= v_n.capacidad then 'Aforo completo (' || v_adentro || '/' || v_n.capacidad || ')'
    end;
  end if;

  insert into gym_accesos (negocio, socio_id, tipo, permitido, motivo, metodo, creado)
  values (p_negocio, p_socio, v_tipo, v_motivo is null or p_forzar,
    case when v_motivo is not null and p_forzar then 'Autorizado por recepción · ' || v_motivo else v_motivo end,
    p_metodo, p_cuando);

  select count(*) into v_adentro from gym_adentro(p_negocio);
  return jsonb_build_object(
    'resultado', case when v_motivo is null or p_forzar then 'ok' else 'denegado' end,
    'tipo', v_tipo, 'motivo', v_motivo, 'forzado', v_motivo is not null and p_forzar,
    'desde', v_desde, 'socio', gym_socio_json(p_socio),
    'aforo', jsonb_build_object('adentro', v_adentro, 'capacidad', v_n.capacidad));
end $$;

-- Recepción escanea un QR (cámara o lector USB, que "teclea" el código).
create or replace function public.gym_registrar(p_negocio text, p_codigo text, p_tipo text default 'auto', p_metodo text default 'qr')
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_partes text[] := string_to_array(trim(coalesce(p_codigo, '')), '.');
  v_num int;
  v_w bigint;
  v_ahora bigint;
  v_socio uuid;
  v_motivo text;
begin
  if not gym_es_staff(p_negocio) then raise exception 'Solo recepción puede registrar accesos'; end if;
  if p_tipo not in ('auto', 'entrada', 'salida') or p_metodo not in ('qr', 'lector') then raise exception 'Parámetros inválidos'; end if;

  if coalesce(array_length(v_partes, 1), 0) <> 4 or v_partes[1] <> 'GYM1'
     or v_partes[2] !~ '^\d{1,7}$' or v_partes[3] !~ '^\d{1,12}$' then
    v_motivo := 'Código QR no reconocido';
  else
    v_num := v_partes[2]::int;
    v_w := v_partes[3]::bigint;
    select id into v_socio from gym_socios where negocio = p_negocio and numero = v_num;
    select floor(extract(epoch from now()) / qr_segundos) into v_ahora from gym_negocios where id = p_negocio;
    if v_socio is null or gym_token(p_negocio, v_num, v_w) is distinct from trim(p_codigo) then
      v_socio := null;
      v_motivo := 'Código QR no reconocido';
    elsif v_w < v_ahora - 1 or v_w > v_ahora + 1 then
      v_motivo := 'QR vencido: que abra su pase en la app (las capturas de pantalla no sirven)';
    end if;
  end if;

  if v_motivo is not null then
    -- También queda registrado (el dueño ve QR falsos y capturas), sin repetirlo por cada lectura.
    if not exists (select 1 from gym_accesos where negocio = p_negocio and not permitido and motivo = v_motivo
                   and socio_id is not distinct from v_socio and creado > now() - interval '10 seconds') then
      insert into gym_accesos (negocio, socio_id, tipo, permitido, motivo, metodo)
      values (p_negocio, v_socio, 'entrada', false, v_motivo, p_metodo);
    end if;
    return jsonb_build_object('resultado', 'invalido', 'motivo', v_motivo,
      'socio', case when v_socio is not null then gym_socio_json(v_socio) end);
  end if;

  return gym_evaluar(p_negocio, v_socio, p_tipo, p_metodo);
end $$;

-- Recepción registra a mano (olvidó el celular) o deja pasar de todos modos.
create or replace function public.gym_registrar_manual(p_negocio text, p_socio uuid, p_tipo text default 'auto', p_forzar boolean default false)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not gym_es_staff(p_negocio) then raise exception 'Solo recepción puede registrar accesos'; end if;
  if p_tipo not in ('auto', 'entrada', 'salida') then raise exception 'Parámetros inválidos'; end if;
  return gym_evaluar(p_negocio, p_socio, p_tipo, 'manual', p_forzar);
end $$;

-- Recepción pone al corriente a un socio: renueva la vencida, cobra el adeudo
-- o reactiva la congelada. Devuelve qué se cobró.
create or replace function public.gym_regularizar(p_negocio text, p_socio uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_s gym_socios;
  v_p gym_planes;
  v_concepto text;
  v_monto numeric := 0;
begin
  if not gym_es_staff(p_negocio) then raise exception 'Solo recepción'; end if;
  select * into v_s from gym_socios where id = p_socio and negocio = p_negocio for update;
  if not found then raise exception 'Socio no encontrado'; end if;
  select * into v_p from gym_planes where negocio = p_negocio and id = v_s.plan;

  if v_s.congelada then
    update gym_socios set congelada = false where id = p_socio;
    v_concepto := 'Reactivación de membresía';
  elsif v_s.vence < gym_hoy() then
    v_monto := v_p.precio + v_s.adeudo;
    update gym_socios set vence = gym_hoy() + v_p.dias, adeudo = 0 where id = p_socio;
    v_concepto := 'Renovación ' || v_p.nombre;
  elsif v_s.adeudo > 0 then
    v_monto := v_s.adeudo;
    update gym_socios set adeudo = 0 where id = p_socio;
    v_concepto := 'Pago de adeudo';
  else
    v_monto := v_p.precio;
    update gym_socios set vence = vence + v_p.dias where id = p_socio;
    v_concepto := 'Renovación anticipada ' || v_p.nombre;
  end if;

  if v_monto > 0 then
    insert into gym_pagos (negocio, socio_id, monto, concepto) values (p_negocio, p_socio, v_monto, v_concepto);
  end if;
  return jsonb_build_object('concepto', v_concepto, 'monto', v_monto, 'socio', gym_socio_json(p_socio));
end $$;

-- El dueño ajusta el aforo máximo y la alerta.
create or replace function public.gym_ajustar(p_negocio text, p_capacidad int, p_alerta_pct int)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if gym_rol(p_negocio) is distinct from 'dueno' then raise exception 'Solo el dueño puede cambiar el aforo'; end if;
  if p_capacidad not between 10 and 2000 or p_alerta_pct not between 50 and 100 then raise exception 'Valores fuera de rango'; end if;
  update gym_negocios set capacidad = p_capacidad, alerta_pct = p_alerta_pct where id = p_negocio;
end $$;

-- ── Aforo (lo ve cualquiera de la maqueta, también el socio) ────────────────
-- Personas adentro a la media hora de cada hora: hoy y el promedio de los
-- mismos días de la semana de las 4 semanas anteriores.
create or replace function public.gym_aforo(p_negocio text) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_n gym_negocios;
  v_hoy date := gym_hoy();
  v_adentro int;
  v_hoy_serie jsonb;
  v_prom jsonb;
begin
  if gym_rol(p_negocio) is null then raise exception 'Sin acceso'; end if;
  select * into v_n from gym_negocios where id = p_negocio;
  select count(*) into v_adentro from gym_adentro(p_negocio);

  with muestras as (
    select v_hoy - 7 * k as d, h, gym_momento(v_hoy - 7 * k, h * 60 + 30) as t
    from generate_series(1, 4) k cross join generate_series(5, 23) h),
  vis as (select * from gym_visitas(p_negocio, gym_momento(v_hoy - 28, 0), gym_momento(v_hoy - 6, 0))),
  conteo as (
    select m.d, m.h, count(v.socio_id) as c
    from muestras m left join vis v on v.fecha = m.d and v.ent <= m.t and v.sal > m.t
    group by m.d, m.h)
  select jsonb_agg(jsonb_build_object('h', h, 'personas', round(p)) order by h) into v_prom
  from (select h, avg(c) as p from conteo group by h) t;

  with horas as (select generate_series(5, 23) as h),
  vis as (select * from gym_visitas(p_negocio, gym_momento(v_hoy, 0), now() + interval '1 minute'))
  select jsonb_agg(jsonb_build_object('h', h, 'personas', c) order by h) into v_hoy_serie
  from (
    select hr.h, (select count(*) from vis v
      where v.ent <= least(gym_momento(v_hoy, hr.h * 60 + 30), now())
        and v.sal > least(gym_momento(v_hoy, hr.h * 60 + 30), now())) as c
    from horas hr where gym_momento(v_hoy, hr.h * 60) <= now()
  ) t;

  return jsonb_build_object('adentro', v_adentro, 'capacidad', v_n.capacidad, 'alerta_pct', v_n.alerta_pct,
    'hoy', coalesce(v_hoy_serie, '[]'), 'promedio', coalesce(v_prom, '[]'),
    'hora', extract(hour from now() at time zone 'America/Mexico_City'));
end $$;

-- ── Tablero del dueño (y de recepción) ──────────────────────────────────────
create or replace function public.gym_tablero(p_negocio text) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_hoy date := gym_hoy();
  v_ini timestamptz := gym_momento(gym_hoy(), 0);
  v_res jsonb;
begin
  if not gym_es_staff(p_negocio) then raise exception 'Solo personal del gimnasio'; end if;

  select jsonb_build_object(
    'aforo', gym_aforo(p_negocio),
    'adentro', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'nombre', s.nombre, 'numero', s.numero, 'desde', a.desde) order by a.desde desc)
      from gym_adentro(p_negocio) a join gym_socios s on s.id = a.socio_id), '[]'),
    'hoy', (select jsonb_build_object(
        'entradas', count(*) filter (where permitido and tipo = 'entrada'),
        'unicos', count(distinct socio_id) filter (where permitido and tipo = 'entrada'),
        'denegados', count(*) filter (where not permitido),
        'manuales', count(*) filter (where metodo = 'manual'))
      from gym_accesos where negocio = p_negocio and creado >= v_ini),
    'estancia_min', (select round(avg(extract(epoch from (sal - ent)) / 60)) from gym_visitas(p_negocio, v_ini - interval '7 days', now()) where sal <= now()),
    'motivos', coalesce((select jsonb_agg(jsonb_build_object('motivo', m, 'n', n) order by n desc) from (
        select case when motivo like 'QR vencido%' then 'Captura de pantalla o QR vencido'
                    when motivo like 'Código QR%' then 'QR no reconocido'
                    else regexp_replace(motivo, '( el | de \$| desde | \().*$', '') end as m, count(*) as n
        from gym_accesos where negocio = p_negocio and creado >= v_ini and not permitido group by 1) x), '[]'),
    'socios', (select jsonb_build_object(
        'total', count(*),
        'activos', count(*) filter (where not congelada and vence >= v_hoy and adeudo = 0),
        'por_vencer', count(*) filter (where not congelada and vence between v_hoy and v_hoy + 7),
        'vencidos', count(*) filter (where vence < v_hoy and vence >= v_hoy - 30),
        'adeudo', count(*) filter (where adeudo > 0 and vence >= v_hoy),
        'congelados', count(*) filter (where congelada))
      from gym_socios where negocio = p_negocio),
    'avisos', coalesce((select jsonb_agg(x order by x->>'vence') from (
        select gym_socio_json(s.id) as x from gym_socios s
        where s.negocio = p_negocio and not s.congelada
          and (s.vence between v_hoy - 15 and v_hoy + 7 or s.adeudo > 0)
        order by s.vence limit 40) q), '[]'),
    'ingresos', (select jsonb_build_object(
        'hoy', coalesce(sum(monto) filter (where creado >= v_ini), 0),
        'mes', coalesce(sum(monto) filter (where creado >= gym_momento(date_trunc('month', v_hoy)::date, 0)), 0))
      from gym_pagos where negocio = p_negocio)
  ) into v_res;
  return v_res;
end $$;

-- Mapa de calor de las últimas 4 semanas: personas adentro en promedio por día
-- de la semana y hora. No cambia en el día, así que va aparte del tablero (que
-- se recalcula con cada acceso).
create or replace function public.gym_calor(p_negocio text) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_hoy date := gym_hoy();
  v_res jsonb;
begin
  if not gym_es_staff(p_negocio) then raise exception 'Solo personal del gimnasio'; end if;
  with muestras as (
    select (v_hoy - k) as d, h, gym_momento(v_hoy - k, h * 60 + 30) as t
    from generate_series(1, 28) k cross join generate_series(5, 22) h),
  vis as (select * from gym_visitas(p_negocio, gym_momento(v_hoy - 28, 0), gym_momento(v_hoy, 0))),
  conteo as (
    select m.d, m.h, count(v.socio_id) as c
    from muestras m left join vis v on v.fecha = m.d and v.ent <= m.t and v.sal > m.t
    group by m.d, m.h)
  select jsonb_agg(jsonb_build_object('dia', dia, 'h', h, 'personas', p) order by dia, h) into v_res
  from (select extract(isodow from d)::int as dia, h, round(avg(c)) as p from conteo group by 1, 2) t;
  return coalesce(v_res, '[]');
end $$;

-- ── Simulación: la gente de la agenda va entrando y saliendo ────────────────
create or replace function public.gym_simular() returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  r record;
  v_res jsonb;
begin
  for r in select * from gym_agenda where entro and not salio and sale <= now() order by sale loop
    if gym_dentro_desde(r.socio_id) is not null then
      insert into gym_accesos (negocio, socio_id, tipo, permitido, metodo, creado)
      values (r.negocio, r.socio_id, 'salida', true, 'qr', r.sale);
    end if;
    update gym_agenda set salio = true where id = r.id;
  end loop;

  -- Las entradas pasan por las MISMAS reglas que en recepción: vencidas,
  -- adeudos, horario del plan y aforo (si el dueño baja el aforo, se niegan).
  for r in select * from gym_agenda where not entro and entra <= now() order by entra loop
    if gym_dentro_desde(r.socio_id) is null then
      v_res := gym_evaluar(r.negocio, r.socio_id, 'entrada', 'qr', false, r.entra);
      update gym_agenda set entro = true, salio = (v_res->>'resultado') <> 'ok' where id = r.id;
    else
      update gym_agenda set entro = true, salio = true where id = r.id;
    end if;
  end loop;
end $$;

-- ── Quién puede llamar qué ──────────────────────────────────────────────────
revoke all on function public.gym_token(text, int, bigint) from public, anon, authenticated;
revoke all on function public.gym_pase_de(text, uuid) from public, anon, authenticated;
revoke all on function public.gym_evaluar(text, uuid, text, text, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.gym_simular() from public, anon, authenticated;
revoke all on function public.gym_visitas(text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.gym_adentro(text) from public, anon, authenticated;
revoke all on function public.gym_dentro_desde(uuid) from public, anon, authenticated;
revoke all on function public.gym_socio_json(uuid) from public, anon, authenticated;
revoke all on function public.gym_mi_pase(text) from public, anon;
revoke all on function public.gym_pase_prueba(text, int) from public, anon;
revoke all on function public.gym_registrar(text, text, text, text) from public, anon;
revoke all on function public.gym_registrar_manual(text, uuid, text, boolean) from public, anon;
revoke all on function public.gym_regularizar(text, uuid) from public, anon;
revoke all on function public.gym_ajustar(text, int, int) from public, anon;
revoke all on function public.gym_aforo(text) from public, anon;
revoke all on function public.gym_tablero(text) from public, anon;
revoke all on function public.gym_calor(text) from public, anon;
grant execute on function public.gym_mi_pase(text), public.gym_pase_prueba(text, int),
  public.gym_registrar(text, text, text, text), public.gym_registrar_manual(text, uuid, text, boolean),
  public.gym_regularizar(text, uuid), public.gym_ajustar(text, int, int),
  public.gym_aforo(text), public.gym_tablero(text), public.gym_calor(text) to authenticated;

select cron.unschedule('gym_simular_minuto') where exists (select 1 from cron.job where jobname = 'gym_simular_minuto');
select cron.schedule('gym_simular_minuto', '* * * * *', 'select public.gym_simular()');
