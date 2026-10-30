import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Folder, Inbox, Trash2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listFiles, listPartners, listProjects, listTags } from "@/lib/carpeta";
import { firstName, formatDate } from "@/lib/format";
import { one, type SearchParams } from "@/lib/search-params";
import { FileFilters } from "@/components/carpeta/FileFilters";
import { FileList } from "@/components/carpeta/FileList";
import { NewProjectForm } from "@/components/carpeta/NewProjectForm";
import { ProjectActions } from "@/components/carpeta/ProjectActions";

export const metadata: Metadata = { title: "Carpeta compartida" };

export default function CarpetaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Carpeta compartida</h1>
          <p className="text-muted">Archivos de los dos socios, ordenados por proyecto.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/panel/solicitudes" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 hover:border-purple">
            <Inbox size={16} /> Solicitudes
          </Link>
          <Link href="/panel/carpeta/papelera" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 hover:border-purple">
            <Trash2 size={16} /> Papelera
          </Link>
        </div>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-border/50" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const filters = { q: one(sp.q), tagId: one(sp.etiqueta), by: one(sp.por), userId: user.id };
  const filtering = Boolean(filters.q || filters.tagId || filters.by);

  const [projects, tags, partners, files] = await Promise.all([
    listProjects(),
    listTags(),
    listPartners(),
    listFiles(null, filters, filtering ? undefined : 15),
  ]);
  const names = Object.fromEntries(partners.map((p) => [p.id, firstName(p.fullName)]));
  const projectRefs = Object.fromEntries(projects.map((p) => [p.id, p]));
  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-pixel text-sm text-purple">PROYECTOS</h2>
          <NewProjectForm />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((p) => (
            <li key={p.id}>
              <Link
                href={`/panel/carpeta/${p.id}`}
                className="flex h-full gap-3 rounded-xl border border-border bg-white p-4 transition hover:border-purple hover:shadow-sm"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: p.color }}>
                  <Folder size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-navy">{p.name}</span>
                  {p.client && <span className="block truncate text-xs text-muted">{p.client}</span>}
                  <span className="mt-1 block text-xs text-muted">
                    {p.fileCount} {p.fileCount === 1 ? "archivo" : "archivos"}
                    {p.lastUpdate && <> · {formatDate(p.lastUpdate)}</>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {archived.length > 0 && (
          <details className="rounded-xl border border-border bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-navy">Archivados ({archived.length})</summary>
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {archived.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
                  <Link href={`/panel/carpeta/${p.id}`} className="min-w-0 flex-1 truncate text-sm text-navy hover:text-purple">
                    {p.name} <span className="text-xs text-muted">· {p.fileCount} {p.fileCount === 1 ? "archivo" : "archivos"}</span>
                  </Link>
                  <ProjectActions id={p.id} name={p.name} archived fileCount={p.fileCount} compact />
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-pixel text-sm text-purple">{filtering ? "RESULTADOS" : "RECIENTES"}</h2>
        <FileFilters tags={tags} q={filters.q} tagId={filters.tagId} by={filters.by} />
        <FileList files={files} tags={tags} names={names} projects={projectRefs} />
      </section>
    </>
  );
}
