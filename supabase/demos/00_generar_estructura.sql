-- Genera el DDL del esquema public de Be Fit Lab (solo lectura del catálogo).
-- Devuelve filas (orden, ddl) para reconstruir la estructura SIN datos.
with
tabs as (
  select c.oid, c.relname, c.relrowsecurity, c.relacl
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
cols as (
  select t.relname,
    string_agg(
      format('  %I %s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
        case when d.adbin is not null then ' default ' || pg_get_expr(d.adbin, d.adrelid) else '' end,
        case when a.attnotnull then ' not null' else '' end),
      E',\n' order by a.attnum) as defs
  from tabs t
  join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = t.oid and d.adnum = a.attnum
  group by t.relname
),
ddl as (
  -- 1. funciones (con check_function_bodies apagado, no dependen del orden)
  select 10 as orden, p.proname as nombre, pg_get_functiondef(p.oid) || ';' as sql
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f','p')
    and not exists (select 1 from pg_depend dp where dp.objid = p.oid and dp.deptype = 'e')

  -- 2. tablas
  union all
  select 20, relname, format(E'create table public.%I (\n%s\n);', relname, defs) from cols

  -- 3. PK, unique, check
  union all
  select 30, con.conname, format('alter table public.%I add constraint %I %s;', t.relname, con.conname, pg_get_constraintdef(con.oid))
  from pg_constraint con join tabs t on t.oid = con.conrelid
  where con.contype in ('p','u','c')

  -- 4. llaves foráneas
  union all
  select 40, con.conname, format('alter table public.%I add constraint %I %s;', t.relname, con.conname, pg_get_constraintdef(con.oid))
  from pg_constraint con join tabs t on t.oid = con.conrelid
  where con.contype = 'f'

  -- 5. índices que no vienen de una constraint
  union all
  select 50, i.indexname, i.indexdef || ';'
  from pg_indexes i
  where i.schemaname = 'public'
    and not exists (select 1 from pg_constraint con where con.conname = i.indexname)

  -- 6. vistas (con sus opciones, p. ej. security_invoker)
  union all
  select 60, c.relname,
    format(E'create or replace view public.%I%s as\n%s', c.relname,
      case when c.reloptions is not null then ' with (' || array_to_string(c.reloptions, ', ') || ')' else '' end,
      pg_get_viewdef(c.oid, true))
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v'

  -- 7. triggers (public + el de alta de cuentas en auth.users)
  union all
  select 70, t.tgname, pg_get_triggerdef(t.oid) || ';'
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal and (n.nspname = 'public' or (n.nspname = 'auth' and c.relname = 'users'))

  -- 8. RLS activado
  union all
  select 80, relname, format('alter table public.%I enable row level security;', relname)
  from tabs where relrowsecurity

  -- 9. políticas (public y storage)
  union all
  select 90, pol.policyname,
    format('create policy %I on %I.%I as %s for %s to %s%s%s;',
      pol.policyname, pol.schemaname, pol.tablename, pol.permissive, pol.cmd,
      array_to_string(pol.roles, ', '),
      case when pol.qual is not null then ' using (' || pol.qual || ')' else '' end,
      case when pol.with_check is not null then ' with check (' || pol.with_check || ')' else '' end)
  from pg_policies pol where pol.schemaname in ('public','storage')

  -- 10. permisos de tablas y vistas: se replica la ACL exacta
  union all
  select 100, c.relname,
    format('revoke all on public.%I from public, anon, authenticated, service_role;', c.relname)
    || coalesce((select string_agg(
         format(' grant %s on public.%I to %s;', a.privilege_type, c.relname,
           case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end), '')
       from aclexplode(c.relacl) a
       where a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon','authenticated','service_role')), '')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','v') and c.relacl is not null

  -- 11. permisos de ejecución de funciones (hay varias revocadas a anon a propósito)
  union all
  select 110, p.proname,
    format('revoke all on function public.%I(%s) from public, anon, authenticated;', p.proname, pg_get_function_identity_arguments(p.oid))
    || coalesce((select string_agg(
         format(' grant execute on function public.%I(%s) to %s;', p.proname, pg_get_function_identity_arguments(p.oid),
           case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end), '')
       from aclexplode(p.proacl) a
       where a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon','authenticated','service_role')), '')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f','p') and p.proacl is not null
    and not exists (select 1 from pg_depend dp where dp.objid = p.oid and dp.deptype = 'e')

  -- 12. buckets de Storage (sin archivos)
  union all
  select 120, b.id,
    format('insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (%L, %L, %s, %s, %s) on conflict (id) do nothing;',
      b.id, b.name, b.public, coalesce(b.file_size_limit::text, 'null'),
      coalesce(quote_literal(b.allowed_mime_types::text) || '::text[]', 'null'))
  from storage.buckets b

  -- 13. realtime
  union all
  select 130, tablename, format('alter publication supabase_realtime add table public.%I;', tablename)
  from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'
)
select orden, nombre, sql from ddl order by orden, nombre;
