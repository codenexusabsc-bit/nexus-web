-- ============================================================
-- NEXUS INGENIERÍA — Plataforma web
-- 010 — Registro de actividad (quién creó, editó, borró o firmó)
-- ============================================================

create table public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid references public.profiles (id) on delete set null,   -- null = visitante o sistema
  action      text not null check (action in ('crear', 'editar', 'borrar', 'firmar')),
  table_name  text not null,
  record_id   text not null,
  summary     text not null default '' check (char_length(summary) <= 160)
);

create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id);

-- Solo los socios leen; nadie escribe directo (lo hacen los triggers).
alter table public.audit_log enable row level security;
create policy "audit_log: socios leen" on public.audit_log for select to authenticated
  using ((select public.is_partner()));
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- ---- Trigger genérico ----------------------------------------
-- SECURITY DEFINER para poder escribir aunque quien actúa no tenga permiso sobre audit_log
-- (incluido el visitante que envía el formulario de contacto).
create function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  j       jsonb;
  act     text;
  rid     text;
  label   text;
begin
  if tg_op = 'DELETE' then
    j := to_jsonb(old); act := 'borrar';
  elsif tg_op = 'INSERT' then
    j := to_jsonb(new); act := 'crear';
  else
    j := to_jsonb(new); act := 'editar';
  end if;

  rid := coalesce(j ->> 'id', '');
  label := coalesce(
    nullif(j ->> 'title', ''), nullif(j ->> 'name', ''), nullif(j ->> 'client_name', ''),
    nullif(j ->> 'concept', ''), ''
  );

  insert into public.audit_log (actor, action, table_name, record_id, summary)
  values (auth.uid(), act, tg_table_name, rid, left(label, 160));

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Una firma es un evento propio, no una edición. Función aparte: plpgsql no permite
-- nombrar signed_at en una función que también dispara desde tablas que no lo tienen.
create function public.log_signature()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.signed_at is null and new.signed_at is not null then
    insert into public.audit_log (actor, action, table_name, record_id, summary)
    values (auth.uid(), 'firmar', 'signers', new.id::text, left(coalesce(new.name, ''), 160));
  end if;
  return new;
end;
$$;

-- Las tablas con valor de negocio. Los movimientos de agenda y las versiones internas no se registran.
create trigger projects_audit            after insert or update or delete on public.projects            for each row execute function public.log_activity();
create trigger files_audit               after insert or update or delete on public.files               for each row execute function public.log_activity();
create trigger doc_requests_audit        after insert or update or delete on public.doc_requests        for each row execute function public.log_activity();
create trigger documents_audit           after insert or update or delete on public.documents           for each row execute function public.log_activity();
create trigger signature_requests_audit  after insert or update or delete on public.signature_requests  for each row execute function public.log_activity();
create trigger signers_audit             after update of signed_at on public.signers                    for each row execute function public.log_signature();
create trigger quotes_audit              after insert or update or delete on public.quotes              for each row execute function public.log_activity();
create trigger collection_accounts_audit after insert or update or delete on public.collection_accounts for each row execute function public.log_activity();
create trigger leads_audit               after insert or update or delete on public.leads               for each row execute function public.log_activity();
create trigger tasks_audit               after insert or update or delete on public.tasks               for each row execute function public.log_activity();
