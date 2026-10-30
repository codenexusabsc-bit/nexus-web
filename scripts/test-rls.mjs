// Pruebas de permisos (RLS) de las migraciones en PGlite. Uso: pnpm test:rls
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const db = new PGlite();
const M = new URL("../supabase/migrations/", import.meta.url).pathname;
// Stubs mínimos de Supabase (auth.uid, auth.users, storage) para probar RLS sin servidor
await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth; create schema storage;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth, storage, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant select, insert, delete on storage.objects to authenticated;
`);
for (const f of ["001_profiles.sql", "002_carpeta_compartida.sql", "003_sitio.sql", "004_agenda.sql", "005_documentos.sql", "006_firmas.sql", "007_sitio_borrador.sql", "008_cotizaciones.sql"]) {
  await db.exec(readFileSync(M + f, "utf8")); console.log("✓", f);
}
const A = "11111111-1111-1111-1111-111111111111", B = "22222222-2222-2222-2222-222222222222", X = "33333333-3333-3333-3333-333333333333";
await db.exec(`insert into auth.users (id, email) values ('${A}','a@x'),('${B}','b@x'),('${X}','x@x');
update public.profiles set role='partner' where id in ('${A}','${B}');`);
const as = async (uid, sql) => {
  await db.exec(`set role authenticated; select set_config('test.uid','${uid}',false);`);
  try { return await db.query(sql); } finally { await db.exec("reset role;"); }
};
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else fail++; console.log(c ? "  ok " : "  FALLA", m); };
const proj = (await db.query("select id from public.projects where name='Interno Nexus'")).rows[0].id;
ok((await as(A, "select * from public.projects")).rows.length === 3, "socio ve 3 proyectos");
ok((await as(X, "select * from public.projects")).rows.length === 0, "no socio no ve proyectos");
ok((await as(A, "select * from public.profiles")).rows.length === 3, "socio ve perfiles");
ok((await as(X, "select * from public.profiles")).rows.length === 1, "no socio solo su perfil");
const f1 = (await as(A, `select public.register_file_version('${proj}','RUT.pdf','${proj}/a1',100,'application/pdf','nota') id`)).rows[0].id;
const f2 = (await as(B, `select public.register_file_version('${proj}','rut.PDF','${proj}/a2',200,'application/pdf','') id`)).rows[0].id;
ok(f1 === f2, "mismo nombre (sin mayúsculas) = misma ficha");
const v = (await as(A, `select current_version, note from public.files where id='${f1}'`)).rows[0];
ok(v.current_version === 2 && v.note === "nota", "versión 2 y conserva nota");
let err = null; try { await as(A, `select public.register_file_version('${proj}','x.pdf','otro/a3',1,'','')`); } catch (e) { err = e.message; }
ok(err && err.includes("ruta"), "ruta fuera del proyecto rechazada");
err = null; try { await as(X, `select public.register_file_version('${proj}','y.pdf','${proj}/a4',1,'','')`); } catch (e) { err = e.message; }
ok(err !== null, "no socio no registra");
err = null; try { await as(A, `select public.register_file_version('${proj}','big.zip','${proj}/a5',60000000,'','')`); } catch (e) { err = e.message; }
ok(err !== null, "más de 50 MB rechazado");
// papelera y nombre reutilizable
await as(A, `update public.files set deleted_at=now() where id='${f1}'`);
const f3 = (await as(A, `select public.register_file_version('${proj}','RUT.pdf','${proj}/a6',1,'','') id`)).rows[0].id;
ok(f3 !== f1, "tras borrar, el nombre crea ficha nueva");
// solicitudes
await as(A, `insert into public.doc_requests (project_id, requested_to, title) values ('${proj}','${B}','RUT')`);
err = null; try { await as(A, `insert into public.doc_requests (project_id, requested_by, requested_to, title) values ('${proj}','${B}','${A}','falsa')`); } catch (e) { err = e.message; }
ok(err !== null, "no se puede pedir a nombre de otro");
err = null; try { await as(X, `insert into public.doc_requests (project_id, requested_to, title) values ('${proj}','${A}','x')`); } catch (e) { err = e.message; }
ok(err !== null, "no socio no crea solicitudes");
const up = await as(B, `update public.doc_requests set status='delivered' returning id`);
ok(up.rows.length === 1, "destinatario puede entregar");
const delB = await as(B, `delete from public.doc_requests returning id`);
ok(delB.rows.length === 0, "destinatario no puede borrar");
ok((await as(A, `select 1 from storage.objects`)).rows.length === 0 || true, "storage consultable");
await as(A, `insert into storage.objects (bucket_id, name) values ('archivos','${proj}/z')`);
err = null; try { await as(X, `insert into storage.objects (bucket_id, name) values ('archivos','${proj}/w')`); } catch (e) { err = e.message; }
ok(err !== null, "no socio no sube a storage");
await db.exec("set role anon;"); err = null; try { await db.query("select * from public.files"); } catch (e) { err = e.message; } await db.exec("reset role;");
ok(err !== null, "anon sin acceso a files");
// ---- 003: sitio público ----
const asAnon = async (sql) => { await db.exec("set role anon;"); try { return await db.query(sql); } finally { await db.exec("reset role;"); } };
ok((await asAnon("select content from public.site_settings")).rows.length === 1, "anon lee el contenido del sitio");
ok((await asAnon("select * from public.services")).rows.length === 7, "anon lee los 7 servicios");
await as(A, "update public.services set visible = false where name = 'Branding'");
ok((await asAnon("select * from public.services")).rows.length === 6, "anon no ve servicios ocultos");
ok((await as(A, "select * from public.services")).rows.length === 7, "socio ve también los ocultos");
await asAnon("insert into public.leads (name, email, message) values ('Ana', 'ana@x.co', 'Hola')");
ok((await db.query("select count(*)::int n from public.leads")).rows[0].n === 1, "anon envía un mensaje");
err = null; try { await asAnon("select * from public.leads"); } catch (e) { err = e.message; }
ok(err !== null, "anon no lee mensajes");
err = null; try { await asAnon("insert into public.leads (name, email, message, status) values ('B', 'b@x.co', 'x', 'ganado')"); } catch (e) { err = e.message; }
ok(err !== null, "anon no elige el estado del mensaje");
err = null; try { await asAnon("insert into public.leads (name, message) values ('C', 'sin contacto')"); } catch (e) { err = e.message; }
ok(err !== null, "mensaje sin correo ni teléfono rechazado");
ok((await as(X, "select * from public.leads")).rows.length === 0, "no socio no lee mensajes");
ok((await as(A, "select * from public.leads")).rows.length === 1, "socio lee mensajes");
ok((await as(X, "update public.site_settings set content = '{}' returning id")).rows.length === 0, "no socio no edita el sitio");
err = null; try { await asAnon("update public.site_settings set content = '{}'"); } catch (e) { err = e.message; }
ok(err !== null, "anon no edita el sitio");
ok((await as(A, "update public.site_settings set updated_at = now() returning id")).rows.length === 1, "socio edita el sitio");
// ---- 004: agenda ----
await as(A, "insert into public.agenda_items (kind, title, starts_at) values ('recordatorio', 'privado de A', now())");
await as(A, "insert into public.agenda_items (kind, title, starts_at, shared) values ('recordatorio', 'compartido', now(), true)");
await as(A, `insert into public.agenda_items (kind, title, starts_at, recipient) values ('mensaje', 'para B', now(), '${B}')`);
ok((await as(A, "select * from public.agenda_items")).rows.length === 3, "A ve sus 3 ítems");
ok((await as(B, "select title from public.agenda_items order by title")).rows.map((r) => r.title).join() === "compartido,para B", "B ve el compartido y su mensaje, no el privado");
ok((await as(X, "select * from public.agenda_items")).rows.length === 0, "no socio no ve la agenda");
ok((await as(B, "update public.agenda_items set seen_at = now() where kind = 'mensaje' returning id")).rows.length === 1, "destinatario marca leído");
ok((await as(B, "update public.agenda_items set done_at = now() where title = 'privado de A' returning id")).rows.length === 0, "B no toca el privado de A");
ok((await as(B, "delete from public.agenda_items where title = 'para B' returning id")).rows.length === 0, "destinatario no borra el mensaje");
err = null; try { await as(B, `insert into public.agenda_items (kind, title, starts_at, created_by) values ('recordatorio', 'falso', now(), '${A}')`); } catch (e) { err = e.message; }
ok(err !== null, "no se crea a nombre del otro");
err = null; try { await as(A, `insert into public.agenda_items (kind, title, starts_at, recipient) values ('mensaje', 'a mí', now(), '${A}')`); } catch (e) { err = e.message; }
ok(err !== null, "no se envía un mensaje a uno mismo");
// ---- 005: documentos ----
const doc = (await as(A, "insert into public.documents (title) values ('Propuesta') returning id")).rows[0].id;
const v2 = (await as(B, `select public.save_document('${doc}', 'Propuesta v2', '{"type":"doc","content":[]}', '{"cliente":"Bonett"}', null) v`)).rows[0].v;
ok(v2 === 2, "guardar sube la versión");
ok((await as(A, `select count(*)::int n from public.document_versions where document_id = '${doc}'`)).rows[0].n === 1, "guardar deja copia en versiones");
ok((await as(X, "select * from public.documents")).rows.length === 0, "no socio no ve documentos");
err = null; try { await as(X, `select public.save_document('${doc}', 'x', '{}', '{}', null)`); } catch (e) { err = e.message; }
ok(err !== null, "no socio no guarda");
await db.exec(`update public.documents set status = 'firmado' where id = '${doc}'`);
err = null; try { await as(A, `select public.save_document('${doc}', 'cambio', '{}', '{}', null)`); } catch (e) { err = e.message; }
ok(err && err.includes("firmado"), "un documento firmado no se edita");
err = null; try { await as(A, `update public.document_versions set title = 'x'`); } catch (e) { err = e.message; }
ok(err !== null, "las versiones no se modifican");
// ---- 006: firmas ----
const H = "a".repeat(64);
const doc2 = (await as(A, "insert into public.documents (title) values ('Contrato') returning id")).rows[0].id;
const req = (await as(A, `insert into public.signature_requests (document_id, title, original_path, original_sha256) values ('${doc2}', 'Contrato', 'firmas/x/original.pdf', '${H}') returning id`)).rows[0].id;
await as(A, `insert into public.signers (request_id, kind, profile_id, name) values ('${req}', 'socio', '${A}', 'A'), ('${req}', 'socio', '${B}', 'B')`);
await as(A, `insert into public.signers (request_id, kind, name, token_hash) values ('${req}', 'cliente', 'Cliente', '${"b".repeat(64)}')`);
ok((await as(A, `update public.signers set signed_at = now() where profile_id = '${A}' returning id`)).rows.length === 1, "socio firma su fila");
ok((await as(A, `update public.signers set signed_at = now() where profile_id = '${B}' returning id`)).rows.length === 0, "socio no firma por el otro");
ok((await as(A, `update public.signers set signed_at = now() where kind = 'cliente' returning id`)).rows.length === 0, "socio no firma por el cliente");
err = null; try { await as(A, `update public.signers set name = 'otro' where profile_id = '${A}'`); } catch (e) { err = e.message; }
ok(err !== null, "no se cambia el nombre del firmante");
await db.exec("set role anon;"); err = null; try { await db.query("select * from public.signers"); } catch (e) { err = e.message; } await db.exec("reset role;");
ok(err !== null, "anon no ve firmantes ni tokens");
await db.exec(`update public.documents set status = 'en_firma' where id = '${doc2}'`);
err = null; try { await as(A, `select public.save_document('${doc2}', 'x', '{}', '{}', null)`); } catch (e) { err = e.message; }
ok(err && err.includes("en firma"), "documento en firma no se edita");
err = null; try { await as(A, `update public.profiles set role = 'partner', signature_path = 'x' where id = '${A}'`); } catch (e) { err = e.message; }
ok(err !== null, "no se cambia el rol al guardar la firma");
ok((await as(A, `update public.profiles set signature_path = 'sello-e' where id = '${A}' returning id`)).rows.length === 1, "socio guarda su firma");
// ---- 007: borrador del sitio ----
const svc = (await db.query("select id from public.services order by position limit 1")).rows[0].id;
const draft = { content: { hero: { title: "Nuevo título" } }, services: [{ id: svc, name: "Webs", description: "d", idealFor: "", color: "#112233", visible: true }, { id: "99999999-9999-4999-8999-999999999999", name: "Nuevo servicio", color: "#445566", visible: true }] };
await as(A, `update public.site_settings set draft = '${JSON.stringify(draft)}'`);
ok((await asAnon("select content from public.site_settings")).rows.length === 1, "anon sigue leyendo lo publicado");
err = null; try { await asAnon("select draft from public.site_settings"); } catch (e) { err = e.message; }
ok(err !== null, "anon no lee el borrador");
err = null; try { await as(X, "select public.publish_site()"); } catch (e) { err = e.message; }
ok(err !== null, "no socio no publica");
await as(A, "select public.publish_site()");
const pub = (await db.query("select content->'hero'->>'title' t, draft from public.site_settings")).rows[0];
ok(pub.t === "Nuevo título" && pub.draft === null, "publicar aplica el contenido y limpia el borrador");
const names = (await db.query("select name from public.services order by position")).rows.map((r) => r.name).join();
ok(names === "Webs,Nuevo servicio", "publicar sincroniza servicios (renombra, crea y quita)");
// ---- 008: cotizaciones y cobros ----
const docQ = (await as(A, "insert into public.documents (title) values ('Cotización 1') returning id")).rows[0].id;
const q1 = (await as(A, `insert into public.quotes (client_name, items, total, document_id) values ('Bonett', '[{"description":"Web","qty":1,"unitPrice":1000000}]', 1000000, '${docQ}') returning number`)).rows[0].number;
const q2 = (await as(B, "insert into public.quotes (client_name) values ('Otro') returning number")).rows[0].number;
ok(q2 === q1 + 1, "las cotizaciones se numeran consecutivo");
ok((await as(X, "select * from public.quotes")).rows.length === 0, "no socio no ve cotizaciones");
await db.exec(`update public.documents set status = 'firmado' where id = '${docQ}'`);
ok((await db.query(`select status from public.quotes where document_id = '${docQ}'`)).rows[0].status === "aceptada", "firmar el documento acepta la cotización");
const c1 = (await as(A, "insert into public.collection_accounts (client_name, concept, amount) values ('Bonett', 'Desarrollo web', 500000) returning number")).rows[0].number;
ok(c1 === 1, "la primera cuenta de cobro es la número 1");
err = null; try { await as(A, "update public.collection_accounts set status = 'pagada'"); } catch (e) { err = e.message; }
ok(err !== null, "pagada exige fecha de pago");
err = null; try { await as(A, "insert into public.collection_accounts (client_name, concept, amount) values ('x', 'y', 0)"); } catch (e) { err = e.message; }
ok(err !== null, "valor debe ser mayor que cero");
ok((await as(X, "select * from public.billing_settings")).rows.length === 0, "no socio no ve datos de facturación");
console.log(`\n${pass} ok, ${fail} fallas`);
process.exit(fail ? 1 : 0);
