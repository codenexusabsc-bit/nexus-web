import { Suspense } from "react";
import Link from "next/link";
import { after } from "next/server";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { BUCKET, TRASH_DAYS, expiredTrash, listPartners, listProjects, listTags, listTrash } from "@/lib/carpeta";
import { firstName } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FileList } from "@/components/carpeta/FileList";

export const metadata: Metadata = { title: "Papelera" };

export default function TrashPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/panel/carpeta" className="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-purple">
        <ArrowLeft size={16} /> Carpeta compartida
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-navy">Papelera</h1>
        <p className="text-muted">
          Lo que se borra queda aquí {TRASH_DAYS} días y después se elimina para siempre.
        </p>
      </div>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-border/50" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await getCurrentUser();
  const [files, tags, partners, projects] = await Promise.all([listTrash(), listTags(), listPartners(), listProjects()]);
  const names = Object.fromEntries(partners.map((p) => [p.id, firstName(p.fullName)]));
  const projectRefs = Object.fromEntries(projects.map((p) => [p.id, p]));

  const expired = expiredTrash(files);
  // Purga los vencidos después de responder, para no demorar la página.
  // El cliente se crea aquí: dentro de after() un Server Component ya no puede leer cookies.
  if (expired.length) {
    const supabase = await createClient();
    after(() => purgeExpired(supabase, expired.map((f) => f.id)));
  }

  return (
    <FileList
      files={files.filter((f) => !expired.includes(f))}
      tags={tags}
      names={names}
      projects={projectRefs}
      trash
    />
  );
}

async function purgeExpired(supabase: Awaited<ReturnType<typeof createClient>>, fileIds: string[]) {
  const { data } = await supabase.from("file_versions").select("storage_path").in("file_id", fileIds);
  const paths = (data ?? []).map((v: { storage_path: string }) => v.storage_path);
  if (paths.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) return;
  }
  await supabase.from("files").delete().in("id", fileIds).not("deleted_at", "is", null);
}
