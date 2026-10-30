"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Rocket, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { SiteDraft } from "@/lib/sitio-shared";
import { formatDateTime } from "@/lib/format";
import { discardDraft, publishSite, saveDraft } from "@/app/panel/sitio/actions";
import { ContentEditor } from "./ContentEditor";
import { ServicesEditor } from "./ServicesEditor";

/**
 * Editor del sitio por borrador: guardar, ver la vista previa y publicar.
 * Nada cambia en la página pública hasta que se publica.
 */
export function SiteDraftEditor({
  initial,
  hasDraft,
  draftInfo,
}: {
  initial: SiteDraft;
  hasDraft: boolean;
  draftInfo: { at: string; by: string } | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const change = (next: SiteDraft) => {
    setDraft(next);
    setDirty(true);
  };

  const run = (fn: () => Promise<{ error?: string }>, ok: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        setDirty(false);
        toast.success(ok);
        after?.();
        router.refresh();
      }
    });

  const preview = () =>
    run(() => saveDraft(draft), "Borrador guardado. Abriendo la vista previa…", () => window.open("/panel/sitio/vista-previa", "_blank"));

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white/95 p-3 shadow-lg shadow-purple/10 backdrop-blur">
        <span className="mr-auto text-sm">
          {dirty ? (
            <b className="text-orange-700">Cambios sin guardar</b>
          ) : hasDraft && draftInfo ? (
            <span className="text-navy">
              <b>Borrador sin publicar</b> · {draftInfo.by} · {formatDateTime(draftInfo.at)}
            </span>
          ) : (
            <span className="text-muted">Igual a lo publicado</span>
          )}
        </span>
        <button type="button" disabled={pending || !dirty} onClick={() => run(() => saveDraft(draft), "Borrador guardado.")} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-navy hover:border-purple disabled:opacity-40">
          <Save size={15} /> Guardar borrador
        </button>
        <button type="button" disabled={pending} onClick={preview} className="inline-flex items-center gap-1.5 rounded-lg border border-purple/40 bg-purple/5 px-3 py-2 text-sm font-semibold text-purple hover:bg-purple hover:text-white disabled:opacity-40">
          <Eye size={15} /> Vista previa
        </button>
        <button
          type="button"
          disabled={pending || (!dirty && !hasDraft)}
          onClick={() => confirm("¿Publicar? La página pública y el PDF cambiarán para todos.") && run(() => publishSite(draft), "¡Publicado! Ya se ve en la página pública.")}
          className="shine inline-flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet disabled:opacity-40"
        >
          <Rocket size={15} /> Publicar
        </button>
        {hasDraft && (
          <button type="button" disabled={pending} onClick={() => confirm("¿Descartar el borrador y volver a lo publicado?") && run(discardDraft, "Borrador descartado.", () => window.location.reload())} className="inline-flex items-center gap-1 px-2 text-sm text-muted hover:text-red-600">
            <Undo2 size={15} /> Descartar
          </button>
        )}
      </div>

      <section id="servicios" className="flex scroll-mt-24 flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">SERVICIOS</h2>
        <ServicesEditor value={draft.services} onChange={(services) => change({ ...draft, services })} />
      </section>
      <section id="textos" className="flex scroll-mt-24 flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">TEXTOS Y CONTACTO</h2>
        <ContentEditor value={draft.content} onChange={(content) => change({ ...draft, content })} />
      </section>
    </div>
  );
}
