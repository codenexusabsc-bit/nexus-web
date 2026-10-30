-- ============================================================
-- NEXUS INGENIERÍA — Plataforma web
-- 005 — Documentos del editor (plantilla Nexus) y sus versiones
-- ============================================================

create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 200),
  template    text not null default 'blanco' check (char_length(template) <= 40),
  project_id  uuid references public.projects (id) on delete set null,
  content     jsonb not null default '{"type":"doc","content":[]}'::jsonb,   -- JSON del editor (TipTap)
  variables   jsonb not null default '{}'::jsonb,                            -- {cliente: "...", fecha: "..."}
  status      text not null default 'borrador'
              check (status in ('borrador', 'en_firma', 'firmado')),         -- firmas: Fase 5
  version     integer not null default 1,
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (pg_column_size(content) <= 1048576)                                 -- 1 MB de contenido
);

create index documents_updated_idx on public.documents (updated_at desc);

create table public.document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents (id) on delete cascade,
  version      integer not null check (version >= 1),
  title        text not null,
  content      jsonb not null,
  variables    jsonb not null default '{}'::jsonb,
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  unique (document_id, version)
);

-- ---- Guardar: actualiza el documento y deja copia como versión nueva ----
create function public.save_document(
  p_id         uuid,
  p_title      text,
  p_content    jsonb,
  p_variables  jsonb,
  p_project_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version integer;
begin
  if not public.is_partner() then
    raise exception 'sin acceso' using errcode = '42501';
  end if;
  if (select status from public.documents where id = p_id) = 'firmado' then
    raise exception 'documento firmado: no se puede editar' using errcode = '42501';
  end if;

  update public.documents
  set title = p_title, content = p_content, variables = p_variables, project_id = p_project_id,
      version = version + 1, updated_by = auth.uid(), updated_at = now()
  where id = p_id
  returning version into v_version;

  if v_version is null then
    raise exception 'documento no encontrado' using errcode = 'P0002';
  end if;

  insert into public.document_versions (document_id, version, title, content, variables)
  values (p_id, v_version, p_title, p_content, p_variables);

  return v_version;
end;
$$;

revoke execute on function public.save_document(uuid, text, jsonb, jsonb, uuid) from public, anon;
grant execute on function public.save_document(uuid, text, jsonb, jsonb, uuid) to authenticated;

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;

create policy "documents: socios" on public.documents for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));
create policy "document_versions: socios leen" on public.document_versions for select to authenticated
  using ((select public.is_partner()));
create policy "document_versions: socios crean" on public.document_versions for insert to authenticated
  with check ((select public.is_partner()));

revoke all on public.documents, public.document_versions from anon;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert on public.document_versions to authenticated;
