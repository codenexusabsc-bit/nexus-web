-- ============================================================
-- NEXUS INGENIERÍA — Plataforma web
-- 004 — Agenda: recordatorios y mensajes entre socios
-- ============================================================

create table public.agenda_items (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('recordatorio', 'mensaje')),
  title       text not null check (char_length(title) between 1 and 200),
  notes       text not null default '' check (char_length(notes) <= 2000),
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  created_by  uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  -- Mensaje: el socio que lo recibe. Recordatorio: siempre null.
  recipient   uuid references public.profiles (id) on delete cascade,
  -- Recordatorio compartido: lo ven los dos socios. Privado: solo quien lo creó.
  shared      boolean not null default false,
  done_at     timestamptz,
  seen_at     timestamptz,   -- mensaje leído por el destinatario
  created_at  timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  check (
    (kind = 'mensaje' and recipient is not null and recipient <> created_by and not shared)
    or (kind = 'recordatorio' and recipient is null)
  )
);

create index agenda_items_starts_idx on public.agenda_items (starts_at);
create index agenda_items_recipient_idx on public.agenda_items (recipient) where seen_at is null;

alter table public.agenda_items enable row level security;

-- Cada socio ve lo suyo, lo que le enviaron y lo compartido.
create policy "agenda: leer" on public.agenda_items for select to authenticated
  using ((select public.is_partner())
         and (created_by = (select auth.uid()) or recipient = (select auth.uid()) or shared));
create policy "agenda: crear a nombre propio" on public.agenda_items for insert to authenticated
  with check ((select public.is_partner()) and created_by = (select auth.uid()));
-- Quien lo creó lo edita; quien lo recibe (o el socio, si es compartido) lo marca hecho o leído.
create policy "agenda: actualizar" on public.agenda_items for update to authenticated
  using ((select public.is_partner())
         and (created_by = (select auth.uid()) or recipient = (select auth.uid()) or shared))
  with check ((select public.is_partner()));
create policy "agenda: borrar lo propio" on public.agenda_items for delete to authenticated
  using ((select public.is_partner()) and created_by = (select auth.uid()));

revoke all on public.agenda_items from anon;
grant select, insert, update, delete on public.agenda_items to authenticated;
