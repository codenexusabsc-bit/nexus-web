import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { listProjects } from "@/lib/carpeta";
import { getSiteContent } from "@/lib/sitio";
import { PieceGenerator } from "@/components/piezas/PieceGenerator";

export const metadata: Metadata = { title: "Piezas para redes" };

export default function PiezasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Piezas para redes</h1>
        <p className="text-muted">Elige una plantilla, cambia los textos y descarga la imagen lista para Instagram, Facebook o WhatsApp.</p>
      </div>
      <Suspense fallback={<div className="h-[70dvh] animate-pulse rounded-xl bg-border/50" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await getCurrentUser();
  const [projects, site] = await Promise.all([listProjects(), getSiteContent()]);
  const contact = [site.contact.email, site.contact.phones.join("  ·  ")].filter(Boolean).join("\n");
  return <PieceGenerator contact={contact} projects={projects.filter((p) => !p.archived).map((p) => ({ id: p.id, name: p.name }))} />;
}
