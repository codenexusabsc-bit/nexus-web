import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Eye } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getEditableSite } from "@/lib/sitio";
import { LandingView } from "@/components/landing/LandingView";
import { PublishFromPreview } from "@/components/sitio/PublishFromPreview";

export const metadata: Metadata = { title: "Vista previa del sitio" };

/** La landing tal como quedaría con el borrador. Solo la ven los socios. */
export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="h-[80dvh] animate-pulse rounded-xl bg-border/50" />}>
      <Preview />
    </Suspense>
  );
}

async function Preview() {
  await getCurrentUser();
  const site = await getEditableSite();
  return (
    <div className="-mx-4 -my-6 sm:-mx-8 lg:-my-8">
      <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 bg-orange px-4 py-2.5 text-sm text-navy shadow-lg sm:px-8">
        <Eye size={17} />
        <b className="mr-auto">{site.hasDraft ? "Vista previa del borrador · todavía no está publicada" : "No hay borrador: así se ve lo publicado"}</b>
        <Link href="/panel/sitio" className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-3 py-1.5 font-semibold hover:bg-white">
          <ArrowLeft size={15} /> Seguir editando
        </Link>
        {site.hasDraft && <PublishFromPreview />}
      </div>
      {/* Contenedor que aísla la landing del layout del panel */}
      <div className="relative isolate overflow-hidden [&_header.fixed]:absolute">
        <LandingView content={site.draft.content} services={site.draft.services} preview />
      </div>
    </div>
  );
}
