"use client";

import { useState } from "react";
import { FileArchive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { zipSync } from "fflate";
import { getProjectZipEntries } from "@/app/panel/carpeta/actions";

/** Descarga todos los archivos del proyecto (última versión) en un ZIP armado en el navegador. */
export function ZipButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await getProjectZipEntries(projectId);
      if (res.error || !res.entries) {
        toast.error(res.error ?? "No se pudo preparar el ZIP.");
        return;
      }
      const content: Record<string, Uint8Array> = {};
      for (const e of res.entries) {
        const r = await fetch(e.url);
        if (!r.ok) throw new Error(e.name);
        content[e.name] = new Uint8Array(await r.arrayBuffer());
      }
      const zip = zipSync(content, { level: 0 });
      const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Falló la descarga de algún archivo. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy transition hover:border-purple disabled:opacity-60"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <FileArchive size={16} />}
      {busy ? "Preparando…" : "Descargar ZIP"}
    </button>
  );
}
