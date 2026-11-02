-- ============================================================
-- NEXUS INGENIERÍA — Plataforma web
-- 011 — Portafolio: proyectos destacados en la landing
-- ============================================================

create table public.portfolio_items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 80),
  client      text not null default '' check (char_length(client) <= 80),
  summary     text not null default '' check (char_length(summary) <= 400),
  tags        text[] not null default '{}' check (cardinality(tags) <= 6),
  url         text not null default '' check (url = '' or url ~ '^https://'),
  image_path  text check (image_path is null or char_length(image_path) <= 200),   -- ruta en el bucket público "portafolio"
  color       text not null default '#9333EA' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position    integer not null default 0,
  visible     boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

create index portfolio_items_position_idx on public.portfolio_items (position);

alter table public.portfolio_items enable row level security;

-- El público solo ve lo visible; los socios ven y editan todo.
create policy "portfolio: anon ve lo visible" on public.portfolio_items for select to anon
  using (visible);
create policy "portfolio: socios" on public.portfolio_items for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));

revoke all on public.portfolio_items from anon, authenticated;
grant select on public.portfolio_items to anon;
grant select, insert, update, delete on public.portfolio_items to authenticated;

create trigger portfolio_items_audit
  after insert or update or delete on public.portfolio_items
  for each row execute function public.log_activity();

-- ---- Storage: bucket público "portafolio" (imágenes de la landing) ----
insert into storage.buckets (id, name, public, file_size_limit)
values ('portafolio', 'portafolio', true, 5242880)
on conflict (id) do nothing;

create policy "portafolio: socios suben" on storage.objects for insert to authenticated
  with check (bucket_id = 'portafolio' and (select public.is_partner()));
create policy "portafolio: socios borran" on storage.objects for delete to authenticated
  using (bucket_id = 'portafolio' and (select public.is_partner()));
