-- ============================================================
-- NEXUS INGENIERÍA — Plataforma web
-- 006 — Firmas electrónicas: solicitudes, firmantes y firma guardada
--       de cada socio
-- ============================================================

-- ---- Firma guardada del socio (ruta en Storage o 'sello-e') ---
alter table public.profiles add column signature_path text
  check (signature_path is null or char_length(signature_path) <= 300);
grant update (signature_path) on public.profiles to authenticated;

-- ---- Solicitudes de firma -----------------------------------
create table public.signature_requests (
  id               uuid primary key default gen_random_uuid(),
  document_id      uuid references public.documents (id) on delete set null,
  project_id       uuid references public.projects (id) on delete set null,
  title            text not null check (char_length(title) between 1 and 200),
  original_path    text not null,           -- PDF que se firma (Storage, bucket "archivos")
  original_sha256  text not null check (original_sha256 ~ '^[0-9a-f]{64}$'),
  signed_path      text,                    -- PDF sellado con certificado
  signed_sha256    text check (signed_sha256 is null or signed_sha256 ~ '^[0-9a-f]{64}$'),
  status           text not null default 'pendiente'
                   check (status in ('pendiente', 'completada', 'cancelada')),
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

create index signature_requests_signed_hash_idx on public.signature_requests (signed_sha256);
create index signature_requests_original_hash_idx on public.signature_requests (original_sha256);

-- ---- Firmantes ----------------------------------------------
create table public.signers (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid not null references public.signature_requests (id) on delete cascade,
  kind              text not null check (kind in ('socio', 'cliente')),
  profile_id        uuid references public.profiles (id) on delete set null,   -- socio
  name              text not null check (char_length(name) between 1 and 120),
  email             text not null default '' check (char_length(email) <= 200),
  id_number         text not null default '' check (char_length(id_number) <= 40), -- cédula / NIT
  token_hash        text unique check (token_hash is null or token_hash ~ '^[0-9a-f]{64}$'), -- cliente
  token_expires_at  timestamptz,
  position          integer not null default 0,
  signed_at         timestamptz,
  signature_path    text,
  ip                text not null default '' check (char_length(ip) <= 64),
  user_agent        text not null default '' check (char_length(user_agent) <= 400),
  check ((kind = 'socio' and profile_id is not null) or (kind = 'cliente' and token_hash is not null))
);

create index signers_request_idx on public.signers (request_id);

-- ---- Mientras está en firma o firmado, el documento no se edita ----
create or replace function public.save_document(
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
  v_status  text;
begin
  if not public.is_partner() then
    raise exception 'sin acceso' using errcode = '42501';
  end if;
  select status into v_status from public.documents where id = p_id;
  if v_status = 'firmado' then
    raise exception 'documento firmado: no se puede editar' using errcode = '42501';
  elsif v_status = 'en_firma' then
    raise exception 'documento en firma: cancela la solicitud para editarlo' using errcode = '42501';
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

-- ---- RLS: solo socios. Los clientes firman por un servidor con
--      service_role que valida el token (nunca desde el navegador). ----
alter table public.signature_requests enable row level security;
alter table public.signers enable row level security;

create policy "signature_requests: socios" on public.signature_requests for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));
create policy "signers: socios leen" on public.signers for select to authenticated
  using ((select public.is_partner()));
create policy "signers: socios crean" on public.signers for insert to authenticated
  with check ((select public.is_partner()));
-- Un socio solo firma su propia fila.
create policy "signers: socio firma lo suyo" on public.signers for update to authenticated
  using ((select public.is_partner()) and profile_id = (select auth.uid()))
  with check ((select public.is_partner()) and profile_id = (select auth.uid()));

revoke all on public.signature_requests, public.signers from anon;
grant select, insert, update on public.signature_requests to authenticated;
grant select, insert on public.signers to authenticated;
grant update (signed_at, signature_path, ip, user_agent) on public.signers to authenticated;
