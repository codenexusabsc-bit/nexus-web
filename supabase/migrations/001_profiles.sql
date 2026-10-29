-- ============================================================
-- NEXUS INGENIERÍA — Plataforma web
-- 001 — Perfiles de los socios, rol y RLS
-- ============================================================

-- ---- Tabla de perfiles --------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  title       text not null default '',   -- cargo, p. ej. "Ingeniero electrónico"
  phone       text not null default '',
  -- Por defecto sin acceso. El rol 'partner' solo se asigna por
  -- procedimiento administrativo (SQL en Supabase, ver README).
  role        text not null default 'none'
              check (role in ('partner', 'none')),
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil de cada usuario autenticado. El rol no es modificable por el propio usuario.';

-- ---- Alta automática del perfil -----------------------------
-- Se ejecuta al crear un usuario en auth.users (desde el panel de Supabase).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Helper para las políticas RLS de las fases siguientes ---
create function public.is_partner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'partner'
  );
$$;

revoke execute on function public.is_partner() from public, anon;
grant execute on function public.is_partner() to authenticated;

-- ---- Row Level Security -------------------------------------
alter table public.profiles enable row level security;

-- Los socios se ven entre sí (para nombres en la carpeta compartida,
-- solicitudes y firmas); cualquier otro usuario solo ve su propio perfil.
create policy "profiles: leer el propio perfil o, si es socio, todos"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_partner()));

create policy "profiles: actualizar el propio perfil"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Sin políticas de insert/delete: solo el trigger y el administrador.

-- ---- Privilegios por columna --------------------------------
-- Un usuario edita su nombre, cargo y teléfono; nunca su rol ni su id.
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, title, phone) on public.profiles to authenticated;
