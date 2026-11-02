-- ============================================================
-- NEXUS INGENIERÍA — Plataforma web
-- 012 — Contabilidad: comprobantes de pago (ingresos) y facturas (gastos)
-- Las imágenes viven en Cloudflare R2; aquí solo se guarda la llave del objeto.
-- ============================================================

create table public.ledger_entries (
  id                     uuid primary key default gen_random_uuid(),
  kind                   text not null check (kind in ('ingreso', 'gasto')),
  concept                text not null check (char_length(concept) between 1 and 200),
  counterparty           text not null default '' check (char_length(counterparty) <= 120),   -- cliente o proveedor
  amount                 numeric(14, 2) not null check (amount > 0),
  entry_date             date not null default current_date,
  reference              text not null default '' check (char_length(reference) <= 80),        -- n.º de transferencia o de factura
  notes                  text not null default '' check (char_length(notes) <= 1000),
  collection_account_id  uuid references public.collection_accounts (id) on delete set null,
  project_id             uuid references public.projects (id) on delete set null,
  file_key               text check (file_key is null or file_key ~ '^contabilidad/[0-9a-f-]{36}/[^/]{1,120}$'),
  file_name              text not null default '' check (char_length(file_name) <= 160),
  file_mime              text not null default '' check (char_length(file_mime) <= 80),
  file_size              integer not null default 0 check (file_size between 0 and 10485760),
  uploaded_by            uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at             timestamptz not null default now(),
  -- Solo un ingreso se imputa a una cuenta de cobro.
  check (kind = 'ingreso' or collection_account_id is null)
);

create index ledger_entries_date_idx    on public.ledger_entries (entry_date desc);
create index ledger_entries_account_idx on public.ledger_entries (collection_account_id) where collection_account_id is not null;

alter table public.ledger_entries enable row level security;
create policy "ledger_entries: socios" on public.ledger_entries for all to authenticated
  using ((select public.is_partner())) with check ((select public.is_partner()));
revoke all on public.ledger_entries from anon;
grant select, insert, update, delete on public.ledger_entries to authenticated;

create trigger ledger_entries_audit
  after insert or update or delete on public.ledger_entries
  for each row execute function public.log_activity();

-- ---- Una cuenta de cobro cubierta por sus comprobantes pasa a "pagada" ----
-- Solo sube de estado: nunca devuelve a "pendiente" una cuenta marcada a mano.
create function public.sync_collection_paid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc  uuid;
  accs uuid[] := '{}';
begin
  -- OLD no existe en un INSERT ni NEW en un DELETE: se leen solo donde corresponde.
  if tg_op in ('UPDATE', 'DELETE') then accs := accs || old.collection_account_id; end if;
  if tg_op in ('INSERT', 'UPDATE') then accs := accs || new.collection_account_id; end if;
  foreach acc in array accs loop
    if acc is null then continue; end if;
    update public.collection_accounts c
    set status = 'pagada',
        paid_on = (select max(entry_date) from public.ledger_entries where collection_account_id = c.id and kind = 'ingreso')
    where c.id = acc
      and c.status = 'pendiente'
      and (select coalesce(sum(amount), 0) from public.ledger_entries where collection_account_id = c.id and kind = 'ingreso') >= c.amount;
  end loop;
  return null;
end;
$$;

create trigger ledger_entries_sync_paid
  after insert or update of amount, collection_account_id or delete on public.ledger_entries
  for each row execute function public.sync_collection_paid();
