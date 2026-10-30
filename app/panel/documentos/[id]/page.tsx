import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Copy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listPartners, listProjects } from "@/lib/carpeta";
import { getDocument, listVersions } from "@/lib/documentos";
import { firstName } from "@/lib/format";
import { DocumentEditor } from "@/components/documentos/DocumentEditor";
import { DeleteDocButton } from "@/components/documentos/DeleteDocButton";
import { duplicateDocument } from "../actions";

export const metadata: Metadata = { title: "Editor" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/panel/documentos" className="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-purple">
        <ArrowLeft size={16} /> Documentos
      </Link>
      <Suspense fallback={<div className="h-[70dvh] animate-pulse rounded-xl bg-border/50" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, getCurrentUser()]);
  if (!UUID.test(id)) notFound();
  const doc = await getDocument(id);
  if (!doc) notFound();
  const [projects, versions, partners] = await Promise.all([listProjects(), listVersions(id), listPartners()]);
  const names = Object.fromEntries(partners.map((p) => [p.id, firstName(p.fullName)]));

  return (
    <>
      <DocumentEditor
        doc={doc}
        projects={projects.filter((p) => !p.archived).map((p) => ({ id: p.id, name: p.name }))}
        partners={partners}
        versions={versions.map((v) => ({ id: v.id, version: v.version, createdAt: v.createdAt, by: names[v.createdBy ?? ""] ?? "—" }))}
      />
      <div className="flex flex-wrap gap-3 border-t border-border pt-4 text-sm">
        <form action={duplicateDocument.bind(null, doc.id)}>
          <button type="submit" className="inline-flex items-center gap-1.5 text-muted hover:text-purple">
            <Copy size={15} /> Duplicar documento
          </button>
        </form>
        {doc.status !== "firmado" && <DeleteDocButton id={doc.id} />}
      </div>
    </>
  );
}

