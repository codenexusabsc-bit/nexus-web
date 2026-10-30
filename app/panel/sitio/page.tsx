import { Suspense } from "react";
import type { Metadata } from "next";
import { ExternalLink, FileDown } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_CONTENT, contentSchema, toService } from "@/lib/sitio";
import { createClient } from "@/lib/supabase/server";
import { ContentEditor } from "@/components/sitio/ContentEditor";
import { ServicesEditor } from "@/components/sitio/ServicesEditor";
import { LeadsList, type Lead } from "@/components/sitio/LeadsList";

export const metadata: Metadata = { title: "Sitio web" };

export default function SitioPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Sitio web</h1>
          <p className="text-muted">Lo que cambies aquí se ve en la página pública y en el PDF de presentación.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <a href="/" target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 hover:border-purple">
            <ExternalLink size={16} /> Ver página
          </a>
          <a href="/presentacion" target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 hover:border-purple">
            <FileDown size={16} /> Ver PDF
          </a>
        </div>
      </div>
      <nav className="flex gap-2 text-sm" aria-label="Secciones del editor">
        {[["#mensajes", "Mensajes"], ["#servicios", "Servicios"], ["#textos", "Textos y contacto"]].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full bg-purple/10 px-3 py-1 text-purple hover:bg-purple/20">
            {label}
          </a>
        ))}
      </nav>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-border/50" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await getCurrentUser();
  const supabase = await createClient();
  const [{ data: settings, error: settingsError }, { data: services }, { data: leads }] = await Promise.all([
    supabase.from("site_settings").select("content").maybeSingle(),
    supabase.from("services").select("id, name, description, ideal_for, color, position, visible").order("position"),
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(100),
  ]);

  if (settingsError) {
    return (
      <p className="rounded-xl border border-orange/40 bg-orange/10 p-4 text-sm text-navy">
        Falta aplicar la migración <code>003_sitio.sql</code> en Supabase para poder editar el sitio.
      </p>
    );
  }
  const parsed = contentSchema.safeParse(settings?.content);
  const leadList: Lead[] = ((leads ?? []) as (Omit<Lead, "createdAt"> & { created_at: string })[]).map((l) => ({
    ...l,
    createdAt: l.created_at,
  }));

  return (
    <>
      <section id="mensajes" className="flex scroll-mt-20 flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">
          MENSAJES DE LA PÁGINA ({leadList.filter((l) => l.status === "nuevo").length} NUEVOS)
        </h2>
        <LeadsList leads={leadList} />
      </section>
      <section id="servicios" className="flex scroll-mt-20 flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">SERVICIOS</h2>
        <ServicesEditor services={(services ?? []).map(toService)} />
      </section>
      <section id="textos" className="flex scroll-mt-20 flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">TEXTOS Y CONTACTO</h2>
        <ContentEditor initial={parsed.success ? parsed.data : DEFAULT_CONTENT} />
      </section>
    </>
  );
}
