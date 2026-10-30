-- ============================================================
-- NEXUS INGENIERÍA — Plataforma web
-- 002 — Carpeta compartida: proyectos, archivos con versiones,
--       etiquetas, papelera y solicitudes de documentos
-- ============================================================

-- ---- Proyectos ----------------------------------------------
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  client      text not null default '' check (char_length(client) <= 120),
  color       text not null default '#6D28D9' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  archived    boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

create unique index projects_name_key on public.projects (lower(name));

-- ---- Etiquetas ----------------------------------------------
create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 40),
  created_at  timestamptz not null default now()
);

create unique index tags_name_key on public.tags (lower(name));

-- ---- Archivos (lógicos) y sus versiones ----------------------
create table public.files (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects (id) on delete restrict,
  name             text not null check (char_length(name) between 1 and 200),
  note             text not null default '' check (char_length(note) <= 500),
  current_version  integer not null default 1,
  uploaded_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,          -- papelera: se purga a los 30 días
  deleted_by       uuid references public.profiles (id) on delete set null
);

-- Un nombre por proyecto entre los archivos vivos: subir el mismo nombre crea versión.
create unique index files_project_name_key
  on public.files (project_id, lower(name)) where deleted_at is null;
create index files_project_idx on public.files (project_id) where deleted_at is null;
create index files_deleted_idx on public.files (deleted_at) where deleted_at is not null;

create table public.file_versions (
  id            uuid primary key default gen_random_uuid(),
  file_id       uuid not null references public.files (id) on delete cascade,
  version       integer not null check (version >= 1),
  storage_path  text not null unique,
  size_bytes    bigint not null check (size_bytes between 0 and 52428800),  -- 50 MB (límite Free)
  mime_type     text not null default 'application/octet-stream',
  uploaded_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  unique (file_id, version)
);

create table public.file_tags (
  file_id  uuid not null references public.files (id) on delete cascade,
  tag_id   uuid not null references public.tags (id) on delete cascade,
  primary key (file_id, tag_id)
);

-- ---- Solicitudes de documentos entre socios ------------------
create table public.doc_requests (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects (id) on delete restrict,
  requested_by       uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  requested_to       uuid not null references public.profiles (id) on delete cascade,
  title              text not null check (char_length(title) between 1 and 200),
  description        text not null default '' check (char_length(description) <= 2000),
  due_date           date,
  status             text not null default 'pending'
                     check (status in ('pending', 'delivered', 'accepted', 'returned')),
  response_comment   text not null default '' check (char_length(response_comment) <= 1000),
  delivered_file_id  uuid references public.files (id) on delete set null,
  delivered_at       timestamptz,
  closed_at          timestamptz,
  created_at         timestamptz not null default now(),
  check (requested_by <> requested_to)
);

create index doc_requests_to_idx on public.doc_requests (requested_to, status);
create index doc_requests_by_idx on public.doc_requests (requested_by, status);

-- ---- Registrar una subida (crea archivo o versión nueva) -----
-- El navegador sube el objeto a Storage y luego llama a esta función.
-- Corre con los permisos del socio (security invoker): RLS aplica igual.
create function public.register_file_version(
  p_project_id  uuid,
  p_name        text,
  p_path        text,
  p_size        bigint,
  p_mime        text,
  p_note        text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_file_id  uuid;
  v_version  integer;
begin
  if not public.is_partner() then
    raise exception 'sin acceso' using errcode = '42501';
  end if;
  -- La ruta debe estar dentro de la carpeta del proyecto.
  if p_path not like p_project_id::text || '/%' then
    raise exception 'ruta inválida' using errcode = '22023';
  end if;

  select id, current_version + 1 into v_file_id, v_version
  from public.files
  where project_id = p_project_id and lower(name) = lower(p_name) and deleted_at is null
  for update;

  if v_file_id is null then
    insert into public.files (project_id, name, note)
    values (p_project_id, p_name, coalesce(p_note, ''))
    returning id into v_file_id;
    v_version := 1;
  else
    update public.files
    set current_version = v_version,
        updated_at = now(),
        note = case when coalesce(p_note, '') <> '' then p_note else note end
    where id = v_file_id;
  end if;

  insert into public.file_versions (file_id, version, storage_path, size_bytes, mime_type)
  values (v_file_id, v_version, p_path, p_size, coalesce(nullif(p_mime, ''), 'application/octet-stream'));

  return v_file_id;
end;
$$;

revoke execute on function public.register_file_version(uuid, text, text, bigint, text, text) from public, anon;
grant execute on function public.register_file_version(uuid, text, text, bigint, text, text) to authenticated;

-- ---- Row Level Security: solo socios -------------------------
alter table public.projects      enable row level security;
alter table public.tags          enable row level security;
alter table public.files         enable row level security;
alter table public.file_versions enable row level security;
alter table public.file_tags     enable row level security;
alter table public.doc_requests  enable row level security;

create policy "projects: socios" on public.projects for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));
create policy "tags: socios" on public.tags for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));
create policy "files: socios" on public.files for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));
create policy "file_versions: socios" on public.file_versions for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));
create policy "file_tags: socios" on public.file_tags for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));

-- Solicitudes: las ve cualquier socio; las crea quien pide (a nombre propio).
create policy "doc_requests: leer" on public.doc_requests for select to authenticated
  using ((select public.is_partner()));
create policy "doc_requests: crear" on public.doc_requests for insert to authenticated
  with check ((select public.is_partner()) and requested_by = (select auth.uid()));
create policy "doc_requests: actualizar las propias" on public.doc_requests for update to authenticated
  using ((select public.is_partner())
         and (select auth.uid()) in (requested_by, requested_to))
  with check ((select public.is_partner()));
create policy "doc_requests: borrar las que pedí" on public.doc_requests for delete to authenticated
  using ((select public.is_partner()) and requested_by = (select auth.uid()));

revoke all on public.projects, public.tags, public.files, public.file_versions,
              public.file_tags, public.doc_requests from anon;
grant select, insert, update, delete on public.projects, public.tags, public.files,
      public.file_versions, public.file_tags, public.doc_requests to authenticated;

-- ---- Storage: bucket privado "archivos" ----------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('archivos', 'archivos', false, 52428800);

create policy "archivos: socios leen" on storage.objects for select to authenticated
  using (bucket_id = 'archivos' and (select public.is_partner()));
create policy "archivos: socios suben" on storage.objects for insert to authenticated
  with check (bucket_id = 'archivos' and (select public.is_partner()));
create policy "archivos: socios borran" on storage.objects for delete to authenticated
  using (bucket_id = 'archivos' and (select public.is_partner()));

-- ---- Datos iniciales ----------------------------------------
insert into public.projects (name, client, color, created_by) values
  ('Bonett Asociados', 'Oscar Eduardo Bonett Sarabia', '#0B1F3A', null),
  ('Interno Nexus',    'Nexus Ingeniería',             '#6D28D9', null),
  ('Marca',            'Nexus Ingeniería',             '#F472B6', null);

insert into public.tags (name) values
  ('Contrato'), ('Factura'), ('Diseño'), ('Documento legal'), ('Pendiente de revisar');
