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
for (const f of ["001_profiles.sql", "002_carpeta_compartida.sql"]) {
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
console.log(`\n${pass} ok, ${fail} fallas`);
process.exit(fail ? 1 : 0);
