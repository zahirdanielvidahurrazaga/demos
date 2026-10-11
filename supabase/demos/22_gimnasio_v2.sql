-- ─────────────────────────────────────────────────────────────────────────────
-- BASE DE DEMOSTRACIONES (proyecto Supabase "Demos", qwqrbckivrkmeykiukug)
-- 22 · GIMNASIO v2 — báscula del gym, equipo, alta/edición de socios, planes y
-- reportes. Idempotente. Va DESPUÉS de 20_gimnasio.sql y 21_gimnasio_manhattan.sql
-- (gym_reset() llama a gym_reset_v2() al final si existe).
--
-- ⚠️ Este archivo NUNCA se corre contra Be Fit Lab (fifaowaiokauhuqklzwe).
--
-- La báscula es del gimnasio: cada socio se sube y la medición cae a su app
-- (en la web se simula; en la app nativa sería la de Bluetooth de Be Fit).
-- La composición corporal la calcula la app (src/lib/bodyComposition.js) y aquí
-- solo se valida y se guarda.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Datos del socio que pide la báscula (y el alta) ─────────────────────────
alter table public.gym_socios add column if not exists telefono text;
alter table public.gym_socios add column if not exists sexo text check (sexo in ('F', 'M'));
alter table public.gym_socios add column if not exists nacimiento date;
alter table public.gym_socios add column if not exists estatura_cm int check (estatura_cm between 120 and 230);
-- Cambio de plan pendiente: el que ya pagó sigue con su plan; el nuevo entra al renovar.
alter table public.gym_socios add column if not exists plan_siguiente text;
do $$ begin
  alter table public.gym_socios add constraint gym_socios_plan_siguiente_fk
    foreign key (negocio, plan_siguiente) references public.gym_planes(negocio, id);
exception when duplicate_object then null; end $$;

-- ── Equipo (recepción, coaches, dirección). No son cuentas, salvo los de la
-- maqueta (user_id). Los coaches los usan las clases de la fase 2.
create table if not exists public.gym_staff (
  id uuid primary key default gen_random_uuid(),
  negocio text not null references public.gym_negocios(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('dueno', 'recepcion', 'coach')),
  telefono text,
  turno text,                                -- 'Mañana', 'Tarde'…
  especialidad text,                         -- coaches: CrossFit, Spinning…
  activo boolean not null default true,
  user_id uuid references auth.users(id) on delete set null,
  alta date not null default current_date
);
create index if not exists gym_staff_negocio on public.gym_staff (negocio);

-- Quién del equipo está usando la app (para firmar cobros y accesos a mano).
create or replace function public.gym_staff_yo() returns uuid
language sql stable security definer set search_path to 'public' as $$
  select id from gym_staff where user_id = auth.uid() and activo order by alta limit 1
$$;

revoke all on function public.gym_staff_yo() from public, anon;
grant execute on function public.gym_staff_yo() to authenticated;

alter table public.gym_pagos add column if not exists staff_id uuid references public.gym_staff(id) on delete set null;
alter table public.gym_accesos add column if not exists staff_id uuid references public.gym_staff(id) on delete set null;
alter table public.gym_pagos alter column staff_id set default public.gym_staff_yo();
alter table public.gym_accesos alter column staff_id set default public.gym_staff_yo();

-- ── Mediciones de la báscula ────────────────────────────────────────────────
create table if not exists public.gym_mediciones (
  id bigint generated always as identity primary key,
  negocio text not null references public.gym_negocios(id) on delete cascade,
  socio_id uuid not null references public.gym_socios(id) on delete cascade,
  peso numeric(5,1) not null check (peso between 30 and 250),
  imc numeric(4,1),
  grasa_pct numeric(4,1) check (grasa_pct between 3 and 75),
  musculo_pct numeric(4,1) check (musculo_pct between 10 and 80),
  agua_pct numeric(4,1) check (agua_pct between 20 and 80),
  visceral int check (visceral between 1 and 30),
  metabolismo int check (metabolismo between 600 and 4500),
  staff_id uuid references public.gym_staff(id) on delete set null default public.gym_staff_yo(),
  creado timestamptz not null default now()
);
create index if not exists gym_mediciones_socio on public.gym_mediciones (socio_id, creado desc);

alter table public.gym_staff enable row level security;
alter table public.gym_mediciones enable row level security;
drop policy if exists gym_staff_leer on public.gym_staff;
create policy gym_staff_leer on public.gym_staff for select to authenticated using (gym_es_staff(negocio));
drop policy if exists gym_mediciones_leer on public.gym_mediciones;
create policy gym_mediciones_leer on public.gym_mediciones for select to authenticated
  using (gym_es_staff(negocio) or socio_id in (select id from public.gym_socios where user_id = auth.uid()));

-- ── El socio completa sus datos para la báscula ─────────────────────────────
create or replace function public.gym_mi_perfil(p_negocio text, p_sexo text, p_nacimiento date, p_estatura int)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if p_sexo not in ('F', 'M') or p_estatura not between 120 and 230
     or p_nacimiento not between gym_hoy() - 36500 and gym_hoy() - 3650 then raise exception 'Datos inválidos'; end if;
  update gym_socios set sexo = p_sexo, nacimiento = p_nacimiento, estatura_cm = p_estatura
  where negocio = p_negocio and user_id = auth.uid();
  if not found then raise exception 'No eres socio de este gimnasio'; end if;
end $$;

-- ── Guardar una medición (el socio la suya; el equipo, la de cualquiera) ────
create or replace function public.gym_medir(p_negocio text, p_socio uuid, p_peso numeric, p_imc numeric,
  p_grasa numeric, p_musculo numeric, p_agua numeric, p_visceral int, p_metabolismo int)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_socio uuid;
  v_m gym_mediciones;
begin
  if p_socio is null then
    select id into v_socio from gym_socios where negocio = p_negocio and user_id = auth.uid();
    if v_socio is null then raise exception 'No eres socio de este gimnasio'; end if;
  else
    if not gym_es_staff(p_negocio) then raise exception 'Solo el equipo puede pesar a otro socio'; end if;
    select id into v_socio from gym_socios where id = p_socio and negocio = p_negocio;
    if v_socio is null then raise exception 'Socio no encontrado'; end if;
  end if;
  -- Una báscula no pesa dos veces en 30 s a la misma persona.
  if exists (select 1 from gym_mediciones where socio_id = v_socio and creado > now() - interval '30 seconds') then
    raise exception 'Ya se guardó esta medición';
  end if;
  insert into gym_mediciones (negocio, socio_id, peso, imc, grasa_pct, musculo_pct, agua_pct, visceral, metabolismo)
  values (p_negocio, v_socio, p_peso, p_imc, p_grasa, p_musculo, p_agua, p_visceral, p_metabolismo)
  returning * into v_m;
  return to_jsonb(v_m);
end $$;

-- ── Alta y edición de socios (recepción y dueño) ────────────────────────────
create or replace function public.gym_alta_socio(p_negocio text, p_nombre text, p_telefono text, p_plan text,
  p_sexo text default null, p_nacimiento date default null, p_estatura int default null, p_inscripcion numeric default 0)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_p gym_planes;
  v_id uuid;
  v_num int;
begin
  if not gym_es_staff(p_negocio) then raise exception 'Solo el equipo puede dar de alta socios'; end if;
  if length(trim(coalesce(p_nombre, ''))) < 3 then raise exception 'Escribe el nombre completo'; end if;
  if p_inscripcion not between 0 and 5000 then raise exception 'Inscripción fuera de rango'; end if;
  select * into v_p from gym_planes where negocio = p_negocio and id = p_plan;
  if not found then raise exception 'Plan no encontrado'; end if;
  perform pg_advisory_xact_lock(hashtext('gym_alta_' || p_negocio));
  select coalesce(max(numero), 1000) + 1 into v_num from gym_socios where negocio = p_negocio;
  insert into gym_socios (negocio, numero, nombre, telefono, plan, vence, sexo, nacimiento, estatura_cm, alta)
  values (p_negocio, v_num, trim(p_nombre), nullif(trim(p_telefono), ''), p_plan, gym_hoy() + v_p.dias,
    p_sexo, p_nacimiento, p_estatura, gym_hoy())
  returning id into v_id;
  insert into gym_pagos (negocio, socio_id, monto, concepto) values (p_negocio, v_id, v_p.precio, 'Alta ' || v_p.nombre);
  if p_inscripcion > 0 then
    insert into gym_pagos (negocio, socio_id, monto, concepto) values (p_negocio, v_id, p_inscripcion, 'Inscripción');
  end if;
  return gym_socio_json(v_id) || jsonb_build_object('cobrado', v_p.precio + p_inscripcion);
end $$;

-- Cambia datos y deja el plan nuevo pendiente: aplica en la siguiente renovación
-- (gym_regularizar), para no cambiarle horario ni días a lo que ya pagó. No cobra.
create or replace function public.gym_editar_socio(p_negocio text, p_socio uuid, p_nombre text, p_telefono text,
  p_plan text, p_sexo text, p_nacimiento date, p_estatura int)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not gym_es_staff(p_negocio) then raise exception 'Solo el equipo puede editar socios'; end if;
  if length(trim(coalesce(p_nombre, ''))) < 3 then raise exception 'Escribe el nombre completo'; end if;
  if not exists (select 1 from gym_planes where negocio = p_negocio and id = p_plan) then raise exception 'Plan no encontrado'; end if;
  update gym_socios set nombre = trim(p_nombre), telefono = nullif(trim(p_telefono), ''),
    plan_siguiente = case when p_plan = plan then null else p_plan end,
    sexo = p_sexo, nacimiento = p_nacimiento, estatura_cm = p_estatura
  where id = p_socio and negocio = p_negocio;
  if not found then raise exception 'Socio no encontrado'; end if;
  return gym_socio_json(p_socio);
end $$;

create or replace function public.gym_congelar(p_negocio text, p_socio uuid, p_congelar boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not gym_es_staff(p_negocio) then raise exception 'Solo el equipo puede congelar membresías'; end if;
  update gym_socios set congelada = p_congelar where id = p_socio and negocio = p_negocio;
  if not found then raise exception 'Socio no encontrado'; end if;
  return gym_socio_json(p_socio);
end $$;

-- ── Planes (solo el dueño) ──────────────────────────────────────────────────
create or replace function public.gym_guardar_plan(p_negocio text, p_id text, p_nombre text, p_precio numeric,
  p_dias int, p_hora_desde int, p_hora_hasta int)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_id text := p_id;
begin
  if gym_rol(p_negocio) is distinct from 'dueno' then raise exception 'Solo el dueño puede cambiar los planes'; end if;
  if length(trim(coalesce(p_nombre, ''))) < 3 then raise exception 'Ponle nombre al plan'; end if;
  if p_precio not between 0 and 100000 or p_dias not between 1 and 730 then raise exception 'Precio o días fuera de rango'; end if;
  if (p_hora_desde is null) <> (p_hora_hasta is null)
     or (p_hora_desde is not null and (p_hora_desde not between 0 and 23 or p_hora_hasta not between 1 and 24 or p_hora_hasta <= p_hora_desde))
    then raise exception 'Horario inválido'; end if;
  if v_id is null then
    v_id := trim(both '-' from regexp_replace(translate(lower(trim(p_nombre)), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', '-', 'g'));
    if exists (select 1 from gym_planes where negocio = p_negocio and id = v_id) then
      v_id := v_id || '-' || substr(md5(random()::text), 1, 4);
    end if;
    insert into gym_planes (negocio, id, nombre, precio, dias, hora_desde, hora_hasta, orden)
    values (p_negocio, v_id, trim(p_nombre), p_precio, p_dias, p_hora_desde, p_hora_hasta,
      (select coalesce(max(orden), 0) + 1 from gym_planes where negocio = p_negocio));
  else
    update gym_planes set nombre = trim(p_nombre), precio = p_precio, dias = p_dias, hora_desde = p_hora_desde, hora_hasta = p_hora_hasta
    where negocio = p_negocio and id = v_id;
    if not found then raise exception 'Plan no encontrado'; end if;
  end if;
end $$;

create or replace function public.gym_borrar_plan(p_negocio text, p_id text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if gym_rol(p_negocio) is distinct from 'dueno' then raise exception 'Solo el dueño puede borrar planes'; end if;
  if exists (select 1 from gym_socios where negocio = p_negocio and (plan = p_id or plan_siguiente = p_id)) then
    raise exception 'Hay socios con este plan: cámbialos de plan antes de borrarlo';
  end if;
  delete from gym_planes where negocio = p_negocio and id = p_id;
end $$;

-- ── Equipo (solo el dueño lo edita) ─────────────────────────────────────────
create or replace function public.gym_guardar_staff(p_negocio text, p_id uuid, p_nombre text, p_rol text,
  p_telefono text, p_turno text, p_especialidad text, p_activo boolean)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if gym_rol(p_negocio) is distinct from 'dueno' then raise exception 'Solo el dueño puede cambiar el equipo'; end if;
  if length(trim(coalesce(p_nombre, ''))) < 3 then raise exception 'Escribe el nombre'; end if;
  if p_rol not in ('dueno', 'recepcion', 'coach') then raise exception 'Rol inválido'; end if;
  if p_id is null then
    insert into gym_staff (negocio, nombre, rol, telefono, turno, especialidad, activo)
    values (p_negocio, trim(p_nombre), p_rol, nullif(trim(p_telefono), ''), nullif(p_turno, ''), nullif(trim(p_especialidad), ''), coalesce(p_activo, true));
  else
    -- Las cuentas de la maqueta no se desactivan ni cambian de rol (si no, la demo se rompe).
    update gym_staff set nombre = trim(p_nombre),
      rol = case when user_id is null then p_rol else rol end,
      telefono = nullif(trim(p_telefono), ''), turno = nullif(p_turno, ''), especialidad = nullif(trim(p_especialidad), ''),
      activo = case when user_id is null then coalesce(p_activo, true) else true end
    where id = p_id and negocio = p_negocio;
    if not found then raise exception 'No está en el equipo'; end if;
  end if;
end $$;

-- Equipo con lo que hizo cada quien hoy y en el mes.
create or replace function public.gym_equipo(p_negocio text) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_ini timestamptz := gym_momento(gym_hoy(), 0);
  v_mes timestamptz := gym_momento(date_trunc('month', gym_hoy())::date, 0);
begin
  if gym_rol(p_negocio) is distinct from 'dueno' then raise exception 'Solo el dueño'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', st.id, 'nombre', st.nombre, 'rol', st.rol, 'telefono', st.telefono, 'turno', st.turno,
      'especialidad', st.especialidad, 'activo', st.activo, 'cuenta', st.user_id is not null, 'alta', st.alta,
      'cobros_hoy', (select coalesce(sum(monto), 0) from gym_pagos where staff_id = st.id and creado >= v_ini),
      'cobros_mes', (select coalesce(sum(monto), 0) from gym_pagos where staff_id = st.id and creado >= v_mes),
      'n_cobros_mes', (select count(*) from gym_pagos where staff_id = st.id and creado >= v_mes),
      'manuales_mes', (select count(*) from gym_accesos where staff_id = st.id and metodo = 'manual' and creado >= v_mes),
      'mediciones_mes', (select count(*) from gym_mediciones where staff_id = st.id and creado >= v_mes))
    order by case st.rol when 'dueno' then 0 when 'recepcion' then 1 else 2 end, st.nombre)
    from gym_staff st where st.negocio = p_negocio), '[]');
end $$;

-- ── Reportes del dueño (últimos 6 meses) ────────────────────────────────────
-- "Baja" = venció y no renovó en 30 días (se cuenta en el mes en que venció).
-- "En riesgo" = activo que no ha venido en 14 días o más.
create or replace function public.gym_reportes(p_negocio text) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_hoy date := gym_hoy();
  v_res jsonb;
begin
  if gym_rol(p_negocio) is distinct from 'dueno' then raise exception 'Solo el dueño'; end if;
  with meses as (
    select (date_trunc('month', v_hoy) - make_interval(months => k))::date as ini
    from generate_series(5, 0, -1) k),
  m as (
    select ini, least((ini + interval '1 month' - interval '1 day')::date, v_hoy) as fin from meses),
  serie as (
    select m.ini,
      (select coalesce(sum(monto), 0) from gym_pagos p where p.negocio = p_negocio
        and p.creado >= gym_momento(m.ini, 0) and p.creado < gym_momento(m.fin + 1, 0)) as ingresos,
      (select count(*) from gym_socios s where s.negocio = p_negocio and s.alta between m.ini and m.fin) as altas,
      (select count(*) from gym_socios s where s.negocio = p_negocio and s.vence between m.ini and m.fin and s.vence < v_hoy - 30) as bajas,
      (select count(*) from gym_pagos p where p.negocio = p_negocio and p.concepto like 'Renovación%'
        and p.creado >= gym_momento(m.ini, 0) and p.creado < gym_momento(m.fin + 1, 0)) as renovaciones,
      (select count(*) from gym_socios s where s.negocio = p_negocio and s.alta <= m.fin and s.vence >= m.fin and not s.congelada) as activos
    from m)
  select jsonb_build_object(
    'meses', (select jsonb_agg(jsonb_build_object('mes', to_char(ini, 'YYYY-MM'), 'ingresos', ingresos, 'altas', altas, 'bajas', bajas,
        'renovaciones', renovaciones, 'activos', activos,
        'retencion', case when renovaciones + bajas > 0 then round(100.0 * renovaciones / (renovaciones + bajas)) end) order by ini) from serie),
    'por_plan', (select jsonb_agg(jsonb_build_object('plan', pl.nombre, 'socios', n, 'ingresos', ing) order by ing desc) from (
        select pl.nombre, pl.id,
          (select count(*) from gym_socios s where s.negocio = p_negocio and s.plan = pl.id and s.vence >= v_hoy and not s.congelada) as n,
          (select coalesce(sum(p.monto), 0) from gym_pagos p join gym_socios s on s.id = p.socio_id
            where p.negocio = p_negocio and s.plan = pl.id and p.creado >= gym_momento(v_hoy - 90, 0)) as ing
        from gym_planes pl where pl.negocio = p_negocio) pl),
    'dias', (select jsonb_agg(jsonb_build_object('dia', d, 'visitas', n) order by d) from (
        select extract(isodow from fecha)::int as d, round(count(*) / 4.0) as n
        from gym_visitas(p_negocio, gym_momento(v_hoy - 28, 0), gym_momento(v_hoy, 0)) group by 1) x),
    'en_riesgo', (select jsonb_build_object('total', count(*), 'lista', coalesce(jsonb_agg(x order by (x->>'dias')::int desc) filter (where rn <= 12), '[]')) from (
        select jsonb_build_object('id', s.id, 'nombre', s.nombre, 'numero', s.numero, 'telefono', s.telefono, 'plan', pl.nombre,
            'dias', coalesce(v_hoy - (select max((a.creado at time zone 'America/Mexico_City')::date) from gym_accesos a
              where a.socio_id = s.id and a.permitido and a.tipo = 'entrada'), least(v_hoy - s.alta, 28)),
            -- inscrito hace poco y todavía no viene (las visitas guardadas cubren 4 semanas)
            'nunca', s.alta >= v_hoy - 28 and not exists (select 1 from gym_accesos a where a.socio_id = s.id and a.permitido)) as x,
          row_number() over (order by (select max(a.creado) from gym_accesos a where a.socio_id = s.id and a.permitido) nulls first) as rn
        from gym_socios s join gym_planes pl on pl.negocio = s.negocio and pl.id = s.plan
        where s.negocio = p_negocio and not s.congelada and s.vence >= v_hoy and s.alta < v_hoy - 14
          and not exists (select 1 from gym_accesos a where a.socio_id = s.id and a.permitido and a.tipo = 'entrada'
            and a.creado >= gym_momento(v_hoy - 14, 0))) r),
    'mediciones', (select jsonb_build_object('mes', count(*) filter (where creado >= gym_momento(date_trunc('month', v_hoy)::date, 0)),
        'socios', count(distinct socio_id)) from gym_mediciones where negocio = p_negocio)
  ) into v_res;
  return v_res;
end $$;

revoke all on function public.gym_mi_perfil(text, text, date, int) from public, anon;
revoke all on function public.gym_medir(text, uuid, numeric, numeric, numeric, numeric, numeric, int, int) from public, anon;
revoke all on function public.gym_alta_socio(text, text, text, text, text, date, int, numeric) from public, anon;
revoke all on function public.gym_editar_socio(text, uuid, text, text, text, text, date, int) from public, anon;
revoke all on function public.gym_congelar(text, uuid, boolean) from public, anon;
revoke all on function public.gym_guardar_plan(text, text, text, numeric, int, int, int) from public, anon;
revoke all on function public.gym_borrar_plan(text, text) from public, anon;
revoke all on function public.gym_guardar_staff(text, uuid, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.gym_equipo(text) from public, anon;
revoke all on function public.gym_reportes(text) from public, anon;
grant execute on function public.gym_mi_perfil(text, text, date, int) to authenticated;
grant execute on function public.gym_medir(text, uuid, numeric, numeric, numeric, numeric, numeric, int, int) to authenticated;
grant execute on function public.gym_alta_socio(text, text, text, text, text, date, int, numeric) to authenticated;
grant execute on function public.gym_editar_socio(text, uuid, text, text, text, text, date, int) to authenticated;
grant execute on function public.gym_congelar(text, uuid, boolean) to authenticated;
grant execute on function public.gym_guardar_plan(text, text, text, numeric, int, int, int) to authenticated;
grant execute on function public.gym_borrar_plan(text, text) to authenticated;
grant execute on function public.gym_guardar_staff(text, uuid, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.gym_equipo(text) to authenticated;
grant execute on function public.gym_reportes(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- gym_reset_v2(): lo que agrega la v2 al reinicio (la llama gym_reset al final).
--   · equipo con nombres de ejemplo; la cuenta Recepción es "Karen" (mañana);
--   · sexo, edad y estatura para todos los socios;
--   · 90 ex-socios (vencieron hace 1 a 6 meses y no volvieron) y 30 altas del
--     último mes, para que Reportes tenga altas y bajas;
--   · 6 meses de cobros (renovaciones, altas e inscripciones), firmados por recepción;
--   · ~35 socios activos que dejaron de venir hace 2+ semanas ("en riesgo");
--   · mediciones de báscula: Carlos con su historial y ~170 socios con 1 a 3.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.gym_reset_v2()
returns void language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare
  v_neg constant text := 'manhattan';
  v_hoy date := gym_hoy();
  v_mananera uuid;
  v_tarde uuid;
  v_mujeres text[] := array['Ana','Sofía','Valeria','Camila','Fernanda','Mariana','Daniela','Paola','Andrea','Regina',
    'Ximena','Renata','Natalia','Gabriela','Alejandra','Karla','Lucía','Isabel','Montserrat','Diana','Jimena','Victoria',
    'Elena','Paulina','Brenda','Carolina'];
  v_carlos uuid;
begin
  if auth.uid() is not null and gym_rol(v_neg) is null then raise exception 'Sin acceso'; end if;

  -- Equipo
  delete from gym_staff where negocio = v_neg;
  insert into gym_staff (negocio, nombre, rol, telefono, turno, especialidad, user_id, alta) values
    (v_neg, 'Dirección',      'dueno',     '951 100 0001', null,     null,       '00000000-0000-4000-c000-000000000003', v_hoy - 1400),
    (v_neg, 'Karen Soto',     'recepcion', '951 100 0002', 'Mañana', null,       '00000000-0000-4000-c000-000000000002', v_hoy - 610),
    (v_neg, 'Luis Pérez',     'recepcion', '951 100 0003', 'Tarde',  null,       null, v_hoy - 280),
    (v_neg, 'Andrea Ruiz',    'coach',     '951 100 0004', 'Mañana', 'CrossFit', null, v_hoy - 720),
    (v_neg, 'Toño Méndez',    'coach',     '951 100 0005', 'Tarde',  'Spinning', null, v_hoy - 450),
    (v_neg, 'Fernanda García','coach',     '951 100 0006', 'Tarde',  'Cardio',   null, v_hoy - 300),
    (v_neg, 'Paty Luna',      'coach',     '951 100 0007', 'Tarde',  'Zumba',    null, v_hoy - 190);
  select id into v_mananera from gym_staff where negocio = v_neg and nombre = 'Karen Soto';
  select id into v_tarde from gym_staff where negocio = v_neg and nombre = 'Luis Pérez';

  -- Datos de los socios
  update gym_socios set
    sexo = case when split_part(nombre, ' ', 1) = any(v_mujeres) then 'F' else 'M' end,
    nacimiento = v_hoy - (365 * (17 + floor(random() * 33)::int) + floor(random() * 365)::int),
    telefono = '951 ' || lpad((100 + floor(random() * 900))::text, 3, '0') || ' ' || lpad(floor(random() * 10000)::text, 4, '0')
  where negocio = v_neg;
  update gym_socios set estatura_cm = case sexo when 'F' then 150 + floor(random() * 22)::int else 162 + floor(random() * 24)::int end
  where negocio = v_neg;
  update gym_socios set sexo = 'M', nacimiento = make_date(extract(year from v_hoy)::int - 32, 3, 14), estatura_cm = 176
  where negocio = v_neg and numero = 1001;
  update gym_socios set sexo = 'F' where negocio = v_neg and numero in (1002, 1004);

  -- Ex-socios: vencieron hace 31 a 185 días y no renovaron (las "bajas").
  insert into gym_socios (negocio, numero, nombre, plan, vence, adeudo, congelada, alta, sexo, nacimiento, estatura_cm, telefono)
  select v_neg, 1855 + i, nom || ' ' || ape, pl, v_hoy - 31 - floor(r1 * 155)::int, 0, false,
    v_hoy - 220 - floor(r2 * 600)::int,
    case when nom = any(v_mujeres) then 'F' else 'M' end,
    v_hoy - (365 * (18 + floor(r3 * 30)::int)), 155 + floor(r3 * 30)::int,
    '951 ' || lpad((100 + floor(r4 * 900))::text, 3, '0') || ' ' || lpad(floor(r2 * 10000)::text, 4, '0')
  from (
    select i, random() r1, random() r2, random() r3, random() r4,
      (array['Ana','Valeria','Camila','Paola','Regina','Karla','Diana','Elena','Luis','Jorge','Diego','José','Juan','Ricardo',
        'Eduardo','Andrés','Rodrigo','Óscar','Raúl','Iván','Pablo','Javier','Gerardo','Manuel','Marco','Tomás'])[1 + floor(random() * 26)::int] as nom,
      (array['García','Hernández','Martínez','López','Pérez','Sánchez','Cruz','Flores','Gómez','Morales','Reyes','Torres',
        'Ruiz','Mendoza','Ortiz','Castillo','Romero','Méndez','Rivera','Ramos'])[1 + floor(random() * 20)::int] as ape,
      (case when random() < 0.7 then 'mensual' when random() < 0.6 then 'trimestral' else 'estudiante' end) as pl
    from generate_series(1, 90) i
  ) x;

  -- Altas del último mes (todavía sin visitas: llevan días de inscritos).
  insert into gym_socios (negocio, numero, nombre, plan, vence, adeudo, congelada, alta, sexo, nacimiento, estatura_cm, telefono)
  select v_neg, 1945 + i, nom || ' ' || ape, pl, a + (case pl when 'trimestral' then 90 else 30 end), 0, false, a,
    case when nom = any(v_mujeres) then 'F' else 'M' end,
    v_hoy - (365 * (17 + floor(r3 * 25)::int)), 155 + floor(r3 * 30)::int,
    '951 ' || lpad((100 + floor(r4 * 900))::text, 3, '0') || ' ' || lpad(floor(r3 * 10000)::text, 4, '0')
  from (
    select i, v_hoy - 1 - floor(random() * 29)::int as a, random() r3, random() r4,
      (array['Sofía','Mariana','Fernanda','Natalia','Ximena','Renata','Victoria','Brenda','Mateo','Santiago','Emiliano',
        'Leonardo','Adrián','Héctor','Arturo','Daniel'])[1 + floor(random() * 16)::int] as nom,
      (array['Aguilar','Vázquez','Jiménez','Gutiérrez','Moreno','Álvarez','Chávez','Juárez','Domínguez','Herrera',
        'Vargas','Guzmán','Contreras','Salazar','Luna','Soto'])[1 + floor(random() * 16)::int] as ape,
      (case when random() < 0.8 then 'mensual' else 'trimestral' end) as pl
    from generate_series(1, 30) i
  ) x;
  insert into gym_pagos (negocio, socio_id, monto, concepto, creado)
  select v_neg, s.id, p.precio, 'Alta ' || p.nombre, gym_momento(s.alta, 420 + floor(random() * 780)::int)
  from gym_socios s join gym_planes p on p.negocio = s.negocio and p.id = s.plan
  where s.negocio = v_neg and s.numero > 1945;

  -- En riesgo: socios al corriente que dejaron de venir (se borran sus visitas de las últimas 2-3 semanas).
  with elegidos as (
    select id, 14 + floor(random() * 10)::int as dias from gym_socios
    where negocio = v_neg and numero between 1006 and 1855 and not congelada and vence >= v_hoy + 3 and adeudo = 0
    order by random() limit 35)
  delete from gym_accesos a using elegidos e
  where a.socio_id = e.id and a.creado >= gym_momento(v_hoy - e.dias, 0);
  delete from gym_agenda g
  where g.negocio = v_neg and not exists (select 1 from gym_accesos a where a.socio_id = g.socio_id and a.creado >= gym_momento(v_hoy - 13, 0))
    and g.socio_id in (select id from gym_socios where negocio = v_neg and numero between 1006 and 1855 and vence >= v_hoy + 3);

  -- Cobros de los últimos 6 meses (gym_reset ya puso los de los últimos 45 días
  -- de los socios activos): renovaciones anteriores, las de los ex-socios y las inscripciones.
  insert into gym_pagos (negocio, socio_id, monto, concepto, creado)
  select v_neg, s.id, p.precio, 'Renovación ' || p.nombre, gym_momento(f.d, 420 + floor(random() * 780)::int)
  from gym_socios s join gym_planes p on p.negocio = s.negocio and p.id = s.plan
  cross join lateral (select s.vence - p.dias * k as d from generate_series(1, 7) k) f
  where s.negocio = v_neg and f.d >= greatest(s.alta + 1, v_hoy - 185) and f.d <= v_hoy and s.numero <= 1945
    -- gym_reset ya puso el cobro más reciente si cayó en los últimos 45 días
    and not (f.d = s.vence - p.dias and f.d >= v_hoy - 45);
  insert into gym_pagos (negocio, socio_id, monto, concepto, creado)
  select v_neg, s.id, 250, 'Inscripción', gym_momento(s.alta, 420 + floor(random() * 780)::int)
  from gym_socios s where s.negocio = v_neg and s.alta >= v_hoy - 185 and s.alta < v_hoy;

  -- ¿Quién cobró? Karen en la mañana, Luis en la tarde (los de hoy en adelante los firma quien use la app).
  update gym_pagos set staff_id = case when extract(hour from creado at time zone 'America/Mexico_City') < 15 then v_mananera else v_tarde end
  where negocio = v_neg and staff_id is null;
  update gym_accesos set staff_id = case when extract(hour from creado at time zone 'America/Mexico_City') < 15 then v_mananera else v_tarde end
  where negocio = v_neg and metodo = 'manual' and staff_id is null;

  -- Mediciones de la báscula. Carlos: ~10 semanas bajando grasa.
  select id into v_carlos from gym_socios where negocio = v_neg and numero = 1001;
  insert into gym_mediciones (negocio, socio_id, peso, imc, grasa_pct, musculo_pct, agua_pct, visceral, metabolismo, staff_id, creado)
  select v_neg, v_carlos, peso, round(peso / (1.76 * 1.76), 1), grasa, round(49 + (24.6 - grasa) * 0.55, 1),
    round((100 - grasa) * 0.72, 1), greatest(1, round(12 - (24.6 - grasa) * 0.9)::int),
    round(10 * peso + 6.25 * 176 - 5 * 32 + 5)::int, null, gym_momento(v_hoy - 7 * k - 1, 1150 + floor(random() * 40)::int)
  from (
    select k, round((78.6 + k * 0.42 + (random() - 0.5) * 0.5)::numeric, 1) as peso,
      round((20.4 + k * 0.42 + (random() - 0.5) * 0.4)::numeric, 1) as grasa
    from generate_series(0, 9) k
  ) c;

  -- Otros socios: 1 a 3 mediciones en las últimas semanas.
  insert into gym_mediciones (negocio, socio_id, peso, imc, grasa_pct, musculo_pct, agua_pct, visceral, metabolismo, staff_id, creado)
  select v_neg, s.id, b.peso, round(b.peso / power(s.estatura_cm / 100.0, 2), 1), b.grasa,
    round(case s.sexo when 'F' then 40 else 47 end + (30 - b.grasa) * 0.35, 1), round((100 - b.grasa) * 0.72, 1),
    greatest(1, least(20, round(b.grasa / 3 - (case s.sexo when 'F' then 3 else 0 end))::int)),
    round(10 * b.peso + 6.25 * s.estatura_cm - 5 * extract(year from age(v_hoy, s.nacimiento)) + (case s.sexo when 'F' then -161 else 5 end))::int,
    null, gym_momento(v_hoy - (n * 9 + floor(random() * 6))::int, 400 + floor(random() * 840)::int)
  from gym_socios s
  cross join lateral generate_series(0, floor(random() * 3)::int) n
  cross join lateral (select
      round((power(s.estatura_cm / 100.0, 2) * (21 + random() * 9) + n * 0.4)::numeric, 1) as peso,
      round((case s.sexo when 'F' then 24 else 16 end + random() * 12 + n * 0.3)::numeric, 1) as grasa) b
  where s.negocio = v_neg and s.numero > 1005 and s.vence >= v_hoy and not s.congelada and s.estatura_cm is not null
    and random() < 0.2;
end $$;

-- Solo la llama gym_reset() (que corre como dueño de la base); nadie la llama directo.
revoke all on function public.gym_reset_v2() from public, anon, authenticated;

-- El socio en JSON ahora trae lo que pide la báscula y el teléfono (para la ficha).
create or replace function public.gym_socio_json(p_socio uuid) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'id', s.id, 'numero', s.numero, 'nombre', s.nombre, 'foto', s.foto,
    'plan', p.nombre, 'plan_id', p.id, 'precio', p.precio, 'vence', s.vence,
    'dias', s.vence - gym_hoy(), 'adeudo', s.adeudo, 'congelada', s.congelada,
    'plan_siguiente', (select nombre from gym_planes where negocio = s.negocio and id = s.plan_siguiente),
    'telefono', s.telefono, 'sexo', s.sexo, 'nacimiento', s.nacimiento, 'estatura_cm', s.estatura_cm, 'alta', s.alta,
    'horario', case when p.hora_desde is null then 'Horario libre'
      else lpad(p.hora_desde::text, 2, '0') || ':00 a ' || lpad(p.hora_hasta::text, 2, '0') || ':00' end,
    'estado', case when s.congelada then 'congelada' when s.vence < gym_hoy() then 'vencida'
      when s.adeudo > 0 then 'adeudo' else 'activa' end)
  from gym_socios s join gym_planes p on p.negocio = s.negocio and p.id = s.plan
  where s.id = p_socio
$$;

-- Renovar / cobrar / reactivar (reemplaza la de 20_gimnasio.sql): igual que antes,
-- pero si hay un cambio de plan pendiente, la renovación ya cobra y aplica el plan nuevo.
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
  select * into v_p from gym_planes where negocio = p_negocio and id = coalesce(v_s.plan_siguiente, v_s.plan);

  if v_s.congelada then
    update gym_socios set congelada = false where id = p_socio;
    v_concepto := 'Reactivación de membresía';
  elsif v_s.vence < gym_hoy() then
    v_monto := v_p.precio + v_s.adeudo;
    update gym_socios set vence = gym_hoy() + v_p.dias, adeudo = 0, plan = v_p.id, plan_siguiente = null where id = p_socio;
    v_concepto := 'Renovación ' || v_p.nombre;
  elsif v_s.adeudo > 0 then
    v_monto := v_s.adeudo;
    update gym_socios set adeudo = 0 where id = p_socio;
    v_concepto := 'Pago de adeudo';
  else
    v_monto := v_p.precio;
    update gym_socios set vence = vence + v_p.dias, plan = v_p.id, plan_siguiente = null where id = p_socio;
    v_concepto := 'Renovación anticipada ' || v_p.nombre;
  end if;

  if v_monto > 0 then
    insert into gym_pagos (negocio, socio_id, monto, concepto) values (p_negocio, p_socio, v_monto, v_concepto);
  end if;
  return jsonb_build_object('concepto', v_concepto, 'monto', v_monto, 'socio', gym_socio_json(p_socio));
end $$;
revoke all on function public.gym_regularizar(text, uuid) from public, anon;
grant execute on function public.gym_regularizar(text, uuid) to authenticated;
