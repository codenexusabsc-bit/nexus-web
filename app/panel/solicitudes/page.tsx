import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { listPartners, listProjects, listRequests, listTags, type DocRequest } from "@/lib/carpeta";
import { createClient } from "@/lib/supabase/server";
import { firstName } from "@/lib/format";
import { NewRequestForm } from "@/components/solicitudes/NewRequestForm";
import { RequestCard } from "@/components/solicitudes/RequestCard";

export const metadata: Metadata = { title: "Solicitudes" };

export default function SolicitudesPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Solicitudes de documentos</h1>
        <p className="text-muted">Pídele un documento a tu socio; él lo sube aquí mismo y queda en la carpeta del proyecto.</p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-border/50" />}>
        <Content />
      </Suspense>
    </div>
  );
}

/** Abiertas primero (pendientes y devueltas), luego entregadas, al final aceptadas. */
const ORDER: Record<DocRequest["status"], number> = { returned: 0, pending: 1, delivered: 2, accepted: 3 };
const byStatus = (a: DocRequest, b: DocRequest) => ORDER[a.status] - ORDER[b.status];

async function Content() {
  const user = await getCurrentUser();
  const [requests, partners, projects, tags] = await Promise.all([listRequests(), listPartners(), listProjects(), listTags()]);
  const names = Object.fromEntries(partners.map((p) => [p.id, firstName(p.fullName)]));
  const projectRefs = Object.fromEntries(projects.map((p) => [p.id, p]));

  // Nombres de los archivos entregados
  const fileIds = requests.map((r) => r.deliveredFileId).filter((id): id is string => Boolean(id));
  const fileNames: Record<string, string> = {};
  if (fileIds.length) {
    const supabase = await createClient();
    const { data } = await supabase.from("files").select("id, name").in("id", fileIds);
    for (const f of (data ?? []) as { id: string; name: string }[]) fileNames[f.id] = f.name;
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const received = requests.filter((r) => r.requestedTo === user.id).sort(byStatus);
  const sent = requests.filter((r) => r.requestedBy === user.id).sort(byStatus);
  const others = partners.filter((p) => p.id !== user.id);

  const card = (r: DocRequest, role: "recibida" | "enviada") => (
    <RequestCard
      key={r.id}
      request={r}
      role={role}
      names={names}
      project={projectRefs[r.projectId]}
      deliveredFileName={r.deliveredFileId ? fileNames[r.deliveredFileId] : undefined}
      tags={tags}
      today={today}
    />
  );

  return (
    <>
      {others.length > 0 ? (
        <NewRequestForm projects={projects.filter((p) => !p.archived)} partners={others} />
      ) : (
        <p className="text-sm text-muted">Necesitas otro socio activo para enviar solicitudes.</p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">ME PIDIERON ({received.filter((r) => r.status === "pending" || r.status === "returned").length} PENDIENTES)</h2>
        {received.length ? <ul className="flex flex-col gap-3">{received.map((r) => card(r, "recibida"))}</ul> : <Empty />}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">PEDÍ YO</h2>
        {sent.length ? <ul className="flex flex-col gap-3">{sent.map((r) => card(r, "enviada"))}</ul> : <Empty />}
      </section>
    </>
  );
}

function Empty() {
  return <p className="rounded-xl border border-dashed border-border bg-white px-6 py-8 text-center text-sm text-muted">No hay solicitudes.</p>;
}
