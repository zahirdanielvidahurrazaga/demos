-- ─────────────────────────────────────────────────────────────────────────────
-- BASE DE DEMOSTRACIONES (proyecto Supabase "Demos", qwqrbckivrkmeykiukug)
-- 01 · CUENTAS DE PRUEBA — se corre UNA vez (idempotente).
--
-- ⚠️ Este archivo NUNCA se corre contra Be Fit Lab (fifaowaiokauhuqklzwe).
--
-- Una cuenta por rol para que la barra de la maqueta salte de rol con un clic
-- (la app inicia sesión con la cuenta de ese rol), más las coaches y clientas
-- que pueblan clases y listas. Ids fijos: demo_reset() las regresa a su estado
-- inicial cada noche y borra cualquier cuenta que no esté aquí.
--
-- La contraseña es la misma para todas y va en el código de la maqueta: son
-- cuentas de prueba sobre datos inventados que se restablecen cada noche.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.demo_cuentas (
  id uuid primary key,
  email text not null unique,
  full_name text not null,
  rol text not null,              -- CLIENT | RECEPCION | COACH | BARISTA | ADMIN
  login text                      -- clienta | recepcion | coach | barista | admin (la que usa la barra)
);
alter table public.demo_cuentas enable row level security;  -- sin políticas: nadie la lee por la API

insert into public.demo_cuentas (id, email, full_name, rol, login) values
  ('00000000-0000-4000-a000-000000000001', 'maria@demo.studioalma.mx',      'María Ramírez',      'CLIENT',    'clienta'),
  ('00000000-0000-4000-a000-000000000002', 'mostrador@demo.studioalma.mx',  'Mostrador',          'RECEPCION', 'recepcion'),
  ('00000000-0000-4000-a000-000000000003', 'barra@demo.studioalma.mx',      'Barra',              'BARISTA',   'barista'),
  ('00000000-0000-4000-a000-000000000004', 'direccion@demo.studioalma.mx',  'Dirección',          'ADMIN',     'admin'),
  ('00000000-0000-4000-a000-000000000011', 'renata@demo.studioalma.mx',     'Renata',             'COACH',     null),
  ('00000000-0000-4000-a000-000000000012', 'alejandra@demo.studioalma.mx',  'Alejandra',          'COACH',     'coach'),
  ('00000000-0000-4000-a000-000000000013', 'sofia@demo.studioalma.mx',      'Sofía',              'COACH',     null),
  ('00000000-0000-4000-a000-000000000014', 'diego@demo.studioalma.mx',      'Diego',              'COACH',     null),
  ('00000000-0000-4000-a000-000000000021', 'regina@demo.studioalma.mx',     'Regina Torres',      'CLIENT', null),
  ('00000000-0000-4000-a000-000000000022', 'valeria@demo.studioalma.mx',    'Valeria Vega',       'CLIENT', null),
  ('00000000-0000-4000-a000-000000000023', 'ximena@demo.studioalma.mx',     'Ximena Herrera',     'CLIENT', null),
  ('00000000-0000-4000-a000-000000000024', 'fernanda@demo.studioalma.mx',   'Fernanda Lozano',    'CLIENT', null),
  ('00000000-0000-4000-a000-000000000025', 'andrea@demo.studioalma.mx',     'Andrea Cárdenas',    'CLIENT', null),
  ('00000000-0000-4000-a000-000000000026', 'paulina@demo.studioalma.mx',    'Paulina Ibarra',     'CLIENT', null),
  ('00000000-0000-4000-a000-000000000027', 'mariana@demo.studioalma.mx',    'Mariana Del Valle',  'CLIENT', null),
  ('00000000-0000-4000-a000-000000000028', 'daniela@demo.studioalma.mx',    'Daniela Sandoval',   'CLIENT', null),
  ('00000000-0000-4000-a000-000000000029', 'isabela@demo.studioalma.mx',    'Isabela Quintero',   'CLIENT', null),
  ('00000000-0000-4000-a000-000000000030', 'natalia@demo.studioalma.mx',    'Natalia Moreno',     'CLIENT', null),
  ('00000000-0000-4000-a000-000000000031', 'carolina@demo.studioalma.mx',   'Carolina Bautista',  'CLIENT', null),
  ('00000000-0000-4000-a000-000000000032', 'emilia@demo.studioalma.mx',     'Emilia Ramírez',     'CLIENT', null),
  ('00000000-0000-4000-a000-000000000033', 'julieta@demo.studioalma.mx',    'Julieta Torres',     'CLIENT', null),
  ('00000000-0000-4000-a000-000000000034', 'victoria@demo.studioalma.mx',   'Victoria Vega',      'CLIENT', null),
  ('00000000-0000-4000-a000-000000000035', 'lucia@demo.studioalma.mx',      'Lucía Herrera',      'CLIENT', null),
  ('00000000-0000-4000-a000-000000000036', 'elena@demo.studioalma.mx',      'Elena Lozano',       'CLIENT', null),
  ('00000000-0000-4000-a000-000000000037', 'camila@demo.studioalma.mx',     'Camila Cárdenas',    'CLIENT', null),
  ('00000000-0000-4000-a000-000000000038', 'renata.i@demo.studioalma.mx',   'Renata Ibarra',      'CLIENT', null)
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, rol = excluded.rol, login = excluded.login;

-- Cuentas de Auth. Se insertan directo porque el proyecto no tiene la llave de
-- servicio a la mano aquí; los campos de token van en '' (GoTrue falla con NULL).
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
from public.demo_cuentas d
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), d.id, d.id::text,
  jsonb_build_object('sub', d.id::text, 'email', d.email, 'email_verified', true),
  'email', now(), now(), now()
from public.demo_cuentas d
where not exists (select 1 from auth.identities i where i.user_id = d.id and i.provider = 'email');
