"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { NexusDocument, renderBlocks, type PMNode } from "@/lib/pdf/nexus-document";

/** Arma el PDF con la plantilla Nexus en el navegador. */
export async function buildPdf(title: string, content: PMNode, vars: Record<string, string>): Promise<Blob> {
  const portal = `${window.location.origin}/marca/portal.png`;
  return pdf(
    <NexusDocument title={title || "Documento"} portal={portal}>
      {renderBlocks(content, vars)}
    </NexusDocument>
  ).toBlob();
}

/** Vista previa en vivo: vuelve a generar el PDF 700 ms después de dejar de escribir. */
export function PdfPreview({ title, content, vars }: { title: string; content: PMNode; vars: Record<string, string> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    const id = ++run.current;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const blob = await buildPdf(title, content, vars);
        if (id !== run.current) return;
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        setError(false);
      } catch {
        if (id === run.current) setError(true);
      } finally {
        if (id === run.current) setBusy(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [title, content, vars]);

  useEffect(() => () => {
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }, []);

  return (
    <div className="relative h-full min-h-[70dvh] overflow-hidden rounded-xl border border-border bg-[#525659]">
      {url && <iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} title="Vista previa del PDF" className="size-full min-h-[70dvh]" />}
      {busy && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-navy/80 px-3 py-1 text-xs text-white">
          <Loader2 size={13} className="animate-spin" /> Actualizando…
        </span>
      )}
      {error && (
        <p className="absolute inset-x-3 bottom-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          No se pudo generar la vista previa. Revisa el contenido o recarga la página.
        </p>
      )}
    </div>
  );
}
