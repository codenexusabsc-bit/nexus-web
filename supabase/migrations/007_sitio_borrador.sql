-- ============================================================
-- NEXUS INGENIERÍA — Plataforma web
-- 007 — Borrador del sitio: se edita, se previsualiza y luego se publica
-- ============================================================

alter table public.site_settings
  add column draft            jsonb,          -- {content: {...}, services: [...]} sin publicar
  add column draft_updated_at timestamptz,
  add column draft_updated_by uuid references public.profiles (id) on delete set null;

-- El público solo puede leer lo publicado, nunca el borrador.
revoke select on public.site_settings from anon;
grant select (id, content, updated_at) on public.site_settings to anon;

-- ---- Publicar: el borrador pasa a ser el contenido y los servicios ----
create function public.publish_site()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_draft jsonb;
  v_ids   uuid[];
begin
  if not public.is_partner() then
    raise exception 'sin acceso' using errcode = '42501';
  end if;
  select draft into v_draft from public.site_settings where id;
  if v_draft is null then
    raise exception 'no hay borrador para publicar' using errcode = 'P0002';
  end if;

  update public.site_settings
  set content = v_draft -> 'content', updated_at = now(), updated_by = auth.uid(),
      draft = null, draft_updated_at = null, draft_updated_by = null
  where id;

  select coalesce(array_agg((s ->> 'id')::uuid), '{}') into v_ids
  from jsonb_array_elements(coalesce(v_draft -> 'services', '[]'::jsonb)) s;

  delete from public.services where not (id = any (v_ids));

  insert into public.services (id, name, description, ideal_for, color, position, visible)
  select (s ->> 'id')::uuid, s ->> 'name', coalesce(s ->> 'description', ''), coalesce(s ->> 'idealFor', ''),
         coalesce(s ->> 'color', '#9333EA'), ord::integer, coalesce((s ->> 'visible')::boolean, true)
  from jsonb_array_elements(coalesce(v_draft -> 'services', '[]'::jsonb)) with ordinality as t(s, ord)
  on conflict (id) do update
  set name = excluded.name, description = excluded.description, ideal_for = excluded.ideal_for,
      color = excluded.color, position = excluded.position, visible = excluded.visible;
end;
$$;

revoke execute on function public.publish_site() from public, anon;
grant execute on function public.publish_site() to authenticated;
