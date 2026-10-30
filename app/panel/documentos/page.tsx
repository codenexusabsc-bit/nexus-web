import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { FilePen, FilePlus2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listPartners, listProjects } from "@/lib/carpeta";
import { listDocuments } from "@/lib/documentos";
import { firstName, formatDateTime } from "@/lib/format";
import { TEMPLATES } from "@/lib/plantillas";
import { createDocument } from "./actions";

export const metadata: Metadata = { title: "Documentos" };

const STATUS = {
  borrador: { label: "Borrador", cls: "bg-border text-navy" },
  en_firma: { label: "En firma", cls: "bg-orange/15 text-orange-700" },
  firmado: { label: "Firmado", cls: "bg-teal/20 text-teal-800" },
};

export default function DocumentosPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Documentos</h1>
        <p className="text-muted">Escribe a la izquierda y mira el PDF con la plantilla de Nexus a la derecha.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">NUEVO DOCUMENTO</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t, i) => (
            <li key={t.id} className="rise" style={{ animationDelay: `${i * 50}ms` }}>
              <form action={createDocument} className="h-full">
                <input type="hidden" name="template" value={t.id} />
                <button type="submit" className="group flex h-full w-full gap-3 rounded-xl border border-border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-purple hover:shadow-md">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple/10 text-purple transition group-hover:bg-purple group-hover:text-white">
                    <FilePlus2 size={20} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold text-navy">{t.name}</span>
                    <span className="block text-sm text-muted">{t.desc}</span>
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">MIS DOCUMENTOS</h2>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-border/50" />}>
          <DocList />
        </Suspense>
      </section>
    </div>
  );
}

async function DocList() {
  await getCurrentUser();
  const [docs, projects, partners] = await Promise.all([listDocuments(), listProjects(), listPartners()]);
  const projectNames = Object.fromEntries(projects.map((p) => [p.id, p]));
  const names = Object.fromEntries(partners.map((p) => [p.id, firstName(p.fullName)]));

  if (!docs.length) {
    return <p className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted">Todavía no hay documentos. Elige una plantilla arriba para empezar.</p>;
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
      {docs.map((d) => {
        const p = d.projectId ? projectNames[d.projectId] : null;
        const st = STATUS[d.status];
        return (
          <li key={d.id}>
            <Link href={`/panel/documentos/${d.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-bg">
              <FilePen size={20} className="text-purple" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-navy">{d.title}</span>
                <span className="block text-xs text-muted">
                  v{d.version} · {names[d.updatedBy ?? ""] ?? "—"} · {formatDateTime(d.updatedAt)}
                </span>
              </span>
              {p && (
                <span className="rounded-full px-2 py-0.5 text-[0.7rem] text-white" style={{ backgroundColor: p.color }}>
                  {p.name}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
