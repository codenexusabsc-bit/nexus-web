import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listProjects } from "@/lib/carpeta";
import { getQuote } from "@/lib/cotizaciones-data";
import { QuoteEditor } from "@/components/cotizaciones/QuoteEditor";

export const metadata: Metadata = { title: "Cotización" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/panel/cotizaciones" className="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-purple">
        <ArrowLeft size={16} /> Cotizaciones
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-border/50" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, getCurrentUser()]);
  if (!UUID.test(id)) notFound();
  const [quote, projects] = await Promise.all([getQuote(id), listProjects()]);
  if (!quote) notFound();
  return <QuoteEditor quote={quote} projects={projects.filter((p) => !p.archived).map((p) => ({ id: p.id, name: p.name }))} />;
}
