-- ============================================================
-- NEXUS INGENIERÍA — Plataforma web
-- 009 — Seguimiento de prospectos y tareas por proyecto
-- ============================================================

-- ---- Prospectos: seguimiento sobre la tabla leads ------------
alter table public.leads
  add column source          text not null default 'web' check (source in ('web', 'manual')),
  add column notes           text not null default '' check (char_length(notes) <= 4000),
  add column next_action     text not null default '' check (char_length(next_action) <= 200),
  add column next_action_on  date,
  add column assigned_to     uuid references public.profiles (id) on delete set null,
  add column updated_at      timestamptz not null default now();
-- anon sigue pudiendo insertar solo name, email, phone, company, service y message (migración 003).

-- ---- Tareas -------------------------------------------------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  notes         text not null default '' check (char_length(notes) <= 2000),
  status        text not null default 'pendiente' check (status in ('pendiente', 'en_curso', 'hecha')),
  assigned_to   uuid references public.profiles (id) on delete set null,
  due_on        date,
  position      double precision not null default 0,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index tasks_project_idx on public.tasks (project_id, status, position);
create index tasks_assigned_idx on public.tasks (assigned_to, due_on) where status <> 'hecha';

alter table public.tasks enable row level security;
create policy "tasks: socios" on public.tasks for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));
revoke all on public.tasks from anon;
grant select, insert, update, delete on public.tasks to authenticated;
