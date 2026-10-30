import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { listPartners } from "@/lib/carpeta";
import { firstName } from "@/lib/format";
import { listProspects } from "@/lib/prospectos-data";
import { ProspectsBoard } from "@/components/prospectos/ProspectsBoard";

export const metadata: Metadata = { title: "Prospectos" };

export default function ProspectosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Prospectos</h1>
        <p className="text-muted">Cada persona interesada, desde el primer mensaje hasta que se gana o se pierde.</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-border/50" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await getCurrentUser();
  const [{ items, migrated }, partners] = await Promise.all([listProspects(), listPartners()]);
  if (!migrated) return <p className="rounded-xl border border-orange/40 bg-orange/10 p-4 text-sm">Falta aplicar la migración 009 en Supabase.</p>;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  return <ProspectsBoard items={items} partners={partners.map((p) => ({ id: p.id, name: firstName(p.fullName) }))} today={today} />;
}
