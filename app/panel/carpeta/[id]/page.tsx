import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getProject, listFiles, listPartners, listTags } from "@/lib/carpeta";
import { firstName } from "@/lib/format";
import { one, type SearchParams } from "@/lib/search-params";
import { FileFilters } from "@/components/carpeta/FileFilters";
import { FileList } from "@/components/carpeta/FileList";
import { UploadZone } from "@/components/carpeta/UploadZone";
import { ZipButton } from "@/components/carpeta/ZipButton";

export const metadata: Metadata = { title: "Proyecto" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/panel/carpeta" className="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-purple">
        <ArrowLeft size={16} /> Carpeta compartida
      </Link>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-border/50" />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  if (!UUID.test(id)) notFound();
  const project = await getProject(id);
  if (!project) notFound();

  const filters = { q: one(sp.q), tagId: one(sp.etiqueta), by: one(sp.por), userId: user.id };
  const [files, tags, partners] = await Promise.all([listFiles(id, filters), listTags(), listPartners()]);
  const names = Object.fromEntries(partners.map((p) => [p.id, firstName(p.fullName)]));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="size-4 rounded-full" style={{ backgroundColor: project.color }} aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-navy">{project.name}</h1>
            {project.client && <p className="text-sm text-muted">{project.client}</p>}
          </div>
        </div>
        <ZipButton projectId={project.id} projectName={project.name} />
      </div>

      <UploadZone projectId={project.id} tags={tags} />

      <FileFilters tags={tags} q={filters.q} tagId={filters.tagId} by={filters.by} />
      <FileList files={files} tags={tags} names={names} />
    </>
  );
}
