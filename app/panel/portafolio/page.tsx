import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { listPortfolio } from "@/lib/portafolio-data";
import { PortfolioManager } from "@/components/portafolio/PortfolioManager";

export const metadata: Metadata = { title: "Portafolio" };

export default function PortafolioPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Portafolio</h1>
        <p className="text-muted">Proyectos destacados que se muestran en la página pública.</p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-border/50" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await getCurrentUser();
  const { items, migrated } = await listPortfolio();
  if (!migrated) return <p className="rounded-xl border border-orange/40 bg-orange/10 p-4 text-sm">Falta aplicar la migración 011 en Supabase.</p>;
  return <PortfolioManager items={items} />;
}
