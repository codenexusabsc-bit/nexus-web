-- ============================================================
-- NEXUS INGENIERÍA — Plataforma web
-- 008 — Cotizaciones, cuentas de cobro y datos de facturación
-- ============================================================

-- ---- Datos del emisor (una sola fila) ------------------------
create table public.billing_settings (
  id           boolean primary key default true check (id),
  issuer_name  text not null default 'Nexus Ingeniería' check (char_length(issuer_name) <= 120),
  issuer_id    text not null default '' check (char_length(issuer_id) <= 40),     -- cédula o NIT
  issuer_city  text not null default '' check (char_length(issuer_city) <= 80),
  bank_info    text not null default '' check (char_length(bank_info) <= 300),    -- banco, tipo y número
  payment_terms text not null default '50 % al aprobar y 50 % a la entrega.' check (char_length(payment_terms) <= 300),
  updated_at   timestamptz not null default now()
);
insert into public.billing_settings default values;

-- ---- Cotizaciones -------------------------------------------
create sequence public.quote_number_seq start 1;

create table public.quotes (
  id               uuid primary key default gen_random_uuid(),
  number           integer not null unique default nextval('public.quote_number_seq'),
  title            text not null default 'Cotización' check (char_length(title) between 1 and 200),
  client_name      text not null check (char_length(client_name) between 1 and 120),
  client_id_number text not null default '' check (char_length(client_id_number) <= 40),
  client_email     text not null default '' check (char_length(client_email) <= 200),
  project_id       uuid references public.projects (id) on delete set null,
  lead_id          uuid references public.leads (id) on delete set null,
  items            jsonb not null default '[]'::jsonb,   -- [{description, qty, unitPrice}]
  discount         numeric(14, 2) not null default 0 check (discount >= 0),
  tax_rate         numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  total            numeric(14, 2) not null default 0 check (total >= 0),
  notes            text not null default '' check (char_length(notes) <= 2000),
  delivery_time    text not null default '' check (char_length(delivery_time) <= 120),
  valid_until      date,
  status           text not null default 'borrador'
                   check (status in ('borrador', 'enviada', 'aceptada', 'rechazada')),
  document_id      uuid references public.documents (id) on delete set null,
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 50)
);

alter sequence public.quote_number_seq owned by public.quotes.number;

-- ---- Cuentas de cobro ---------------------------------------
create sequence public.collection_number_seq start 1;

create table public.collection_accounts (
  id               uuid primary key default gen_random_uuid(),
  number           integer not null unique default nextval('public.collection_number_seq'),
  client_name      text not null check (char_length(client_name) between 1 and 120),
  client_id_number text not null default '' check (char_length(client_id_number) <= 40),
  concept          text not null check (char_length(concept) between 1 and 500),
  amount           numeric(14, 2) not null check (amount > 0),
  issued_on        date not null default current_date,
  due_on           date,
  status           text not null default 'pendiente' check (status in ('pendiente', 'pagada', 'anulada')),
  paid_on          date,
  project_id       uuid references public.projects (id) on delete set null,
  quote_id         uuid references public.quotes (id) on delete set null,
  document_id      uuid references public.documents (id) on delete set null,
  notes            text not null default '' check (char_length(notes) <= 1000),
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  check (status <> 'pagada' or paid_on is not null)
);

alter sequence public.collection_number_seq owned by public.collection_accounts.number;
create index collection_accounts_issued_idx on public.collection_accounts (issued_on desc);

-- ---- Una cotización cuyo documento se firma queda aceptada ----
create function public.accept_quote_on_signed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'firmado' and old.status is distinct from 'firmado' then
    update public.quotes set status = 'aceptada', updated_at = now()
    where document_id = new.id and status in ('borrador', 'enviada');
  end if;
  return new;
end;
$$;

create trigger documents_accept_quote
  after update of status on public.documents
  for each row execute function public.accept_quote_on_signed();

-- ---- RLS: solo socios ----------------------------------------
alter table public.billing_settings    enable row level security;
alter table public.quotes              enable row level security;
alter table public.collection_accounts enable row level security;

create policy "billing_settings: socios" on public.billing_settings for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));
create policy "quotes: socios" on public.quotes for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));
create policy "collection_accounts: socios" on public.collection_accounts for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));

revoke all on public.billing_settings, public.quotes, public.collection_accounts from anon;
revoke all on sequence public.quote_number_seq, public.collection_number_seq from anon;
grant select, update on public.billing_settings to authenticated;
grant select, insert, update, delete on public.quotes, public.collection_accounts to authenticated;
grant usage on sequence public.quote_number_seq, public.collection_number_seq to authenticated;
