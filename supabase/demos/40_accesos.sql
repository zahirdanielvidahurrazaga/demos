-- ─────────────────────────────────────────────────────────────────────────────
-- CANDADO DE LAS DEMOS (códigos de acceso por prospecto)
--
-- Cada prospecto recibe un link personal  /d/<CÓDIGO>  que vence (7 días por
-- default). Sin código válido, el sitio solo enseña la pantalla del candado.
-- Se administra con  node supabase/demos/accesos.mjs  (nuevo · lista · apagar ·
-- extender), nunca desde el navegador: las tablas no tienen políticas y el
-- cliente solo puede llamar a demo_entrar().
--
-- No lo toca ningún reinicio nocturno (ni demo_reset, ni pedidos, ni gimnasio).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.demo_accesos (
  -- 8 caracteres sin los que se confunden (0/O, 1/I/L): 32^8 ≈ 1.1 billones.
  codigo    text primary key check (codigo ~ '^[A-HJKMNP-Z2-9]{8}$'),
  prospecto text not null,
  -- Rutas que abre, como 'gimnasio/manhattan'. NULL = todas (incluye el índice).
  demos     text[],
  vence     timestamptz not null default now() + interval '7 days',
  activo    boolean not null default true,
  nota      text,
  creado    timestamptz not null default now()
);

create table if not exists public.demo_visitas (
  id      bigserial primary key,
  codigo  text references public.demo_accesos(codigo) on delete cascade,
  ruta    text,
  ok      boolean not null,
  ip      text,
  creado  timestamptz not null default now()
);
create index if not exists demo_visitas_codigo on public.demo_visitas (codigo, creado desc);
create index if not exists demo_visitas_fallidas on public.demo_visitas (ip, creado desc) where not ok;

alter table public.demo_accesos enable row level security;
alter table public.demo_visitas enable row level security;
revoke all on public.demo_accesos, public.demo_visitas from anon, authenticated;
revoke all on sequence public.demo_visitas_id_seq from anon, authenticated;

-- IP del visitante según las cabeceras que pasa PostgREST (Cloudflare delante).
create or replace function public.demo_ip() returns text
language sql stable as $$
  select nullif(split_part(coalesce(
    nullif(current_setting('request.headers', true), '')::json->>'cf-connecting-ip',
    nullif(current_setting('request.headers', true), '')::json->>'x-forwarded-for',
    ''), ',', 1), '')
$$;
revoke all on function public.demo_ip() from public, anon, authenticated;

-- Valida un código. Devuelve {ok, prospecto, demos, vence} o {ok:false, motivo}.
--   motivo: 'invalido' (no existe o apagado) · 'vencido' · 'espera' (demasiados
--   intentos fallidos desde la misma IP en 10 min).
-- p_registrar = false → solo valida, no deja huella (revalidar al navegar).
create or replace function public.demo_entrar(p_codigo text, p_ruta text default null, p_registrar boolean default true)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
  v_ip     text := demo_ip();
  v_ruta   text := left(p_ruta, 200);
  a        demo_accesos;
begin
  if v_ip is not null and (
    select count(*) from demo_visitas
    where ip = v_ip and not ok and creado > now() - interval '10 minutes'
  ) >= 20 then
    return json_build_object('ok', false, 'motivo', 'espera');
  end if;

  select * into a from demo_accesos where codigo = v_codigo;

  if not found or not a.activo then
    insert into demo_visitas (codigo, ruta, ok, ip) values (null, v_ruta, false, v_ip);
    return json_build_object('ok', false, 'motivo', 'invalido');
  end if;

  if a.vence < now() then
    if p_registrar then
      insert into demo_visitas (codigo, ruta, ok, ip) values (a.codigo, v_ruta, false, v_ip);
    end if;
    return json_build_object('ok', false, 'motivo', 'vencido');
  end if;

  -- Una visita por código y ruta cada 10 min: llamar la RPC en bucle no infla
  -- la bitácora ni las métricas.
  if p_registrar and not exists (
    select 1 from demo_visitas
    where codigo = a.codigo and ok and ruta is not distinct from v_ruta
      and creado > now() - interval '10 minutes'
  ) then
    insert into demo_visitas (codigo, ruta, ok, ip) values (a.codigo, v_ruta, true, v_ip);
  end if;
  return json_build_object('ok', true, 'codigo', a.codigo, 'prospecto', a.prospecto,
                           'demos', a.demos, 'vence', a.vence);
end;
$$;
revoke all on function public.demo_entrar(text, text, boolean) from public;
grant execute on function public.demo_entrar(text, text, boolean) to anon, authenticated;

-- Limpieza: visitas fallidas de más de 30 días (las buenas se quedan: son el
-- historial de interés de cada prospecto).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'demo_visitas_limpieza';
    perform cron.schedule('demo_visitas_limpieza', '40 9 * * *',
      $c$delete from public.demo_visitas where not ok and creado < now() - interval '30 days'$c$);
  end if;
end $$;
