"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Download, FileText, Link2, MessageCircle, PenLine, RefreshCw, Stamp, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cancelRequest, getRequestPdfUrl, regenerateLink, retrySeal, signAsPartner } from "@/app/panel/firmas/actions";

async function openPdf(requestId: string, which: "original" | "firmado") {
  const res = await getRequestPdfUrl(requestId, which);
  if (res.url) window.open(res.url, "_blank", "noopener");
  else toast.error(res.error ?? "No se pudo abrir.");
}

/** Botones de la solicitud: firmar, ver PDFs, enlaces de clientes, sellar y cancelar. */
export function RequestActions({
  requestId,
  status,
  canSign,
  allSigned,
  clientSigners,
}: {
  requestId: string;
  status: "pendiente" | "completada" | "cancelada";
  canSign: boolean;
  allSigned: boolean;
  clientSigners: { id: string; name: string; signed: boolean }[];
}) {
  const [pending, startTransition] = useTransition();
  const [links, setLinks] = useState<{ name: string; url: string }[]>([]);

  // Enlaces recién creados desde el editor (solo se muestran una vez)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`links-${requestId}`);
      if (raw) {
        sessionStorage.removeItem(`links-${requestId}`);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de sessionStorage al montar
        setLinks(JSON.parse(raw));
      }
    } catch {
      /* sin almacenamiento */
    }
  }, [requestId]);

  const run = (fn: () => Promise<{ error?: string; sealed?: boolean; links?: { name: string; url: string }[] }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.links) setLinks((prev) => [...prev.filter((l) => !res.links!.some((n) => n.name === l.name)), ...res.links!]);
      if (res.error) toast.error(res.error);
      else toast.success(res.sealed ? "¡Listo! Todos firmaron y el PDF quedó sellado." : ok);
    });

  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy transition hover:border-purple disabled:opacity-50";

  return (
    <div className={`flex flex-col gap-4 ${pending ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap gap-2">
        {status === "pendiente" && canSign && (
          <button type="button" onClick={() => run(() => signAsPartner(requestId), "Firmaste el documento.")} disabled={pending} className="shine inline-flex items-center gap-2 rounded-lg bg-purple px-5 py-2.5 font-semibold text-white hover:bg-violet">
            <PenLine size={17} /> Firmar ahora
          </button>
        )}
        {status === "completada" && (
          <button type="button" onClick={() => openPdf(requestId, "firmado")} className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 font-semibold text-navy">
            <Download size={17} /> PDF firmado
          </button>
        )}
        <button type="button" onClick={() => openPdf(requestId, "original")} className={btn}>
          <FileText size={16} /> PDF original
        </button>
        {status === "pendiente" && allSigned && (
          <button type="button" onClick={() => run(() => retrySeal(requestId), "PDF sellado.")} className={btn}>
            <Stamp size={16} /> Sellar PDF
          </button>
        )}
        {status === "pendiente" && (
          <button type="button" onClick={() => confirm("¿Cancelar la solicitud? El documento vuelve a borrador.") && run(() => cancelRequest(requestId), "Solicitud cancelada.")} className="inline-flex items-center gap-1.5 px-2 text-sm text-muted hover:text-red-600">
            <XCircle size={16} /> Cancelar
          </button>
        )}
      </div>

      {status === "pendiente" && clientSigners.some((c) => !c.signed) && (
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
            <Link2 size={16} className="text-purple" /> Enlaces para clientes
          </p>
          <p className="mb-3 text-xs text-muted">
            Por seguridad, cada enlace se muestra solo cuando se crea. Si lo perdiste, genera uno nuevo (el anterior deja de funcionar). Vencen en 15 días.
          </p>
          <ul className="flex flex-col gap-3">
            {clientSigners.filter((c) => !c.signed).map((c) => {
              const link = links.find((l) => l.name === c.name);
              return (
                <li key={c.id} className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-navy">{c.name}</p>
                  {link ? (
                    <div className="flex flex-wrap gap-2">
                      <input readOnly value={link.url} className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-xs" aria-label={`Enlace de firma de ${c.name}`} onFocus={(e) => e.target.select()} />
                      <button type="button" onClick={() => navigator.clipboard.writeText(link.url).then(() => toast.success("Enlace copiado."))} className={btn}>
                        <Copy size={15} /> Copiar
                      </button>
                      <a href={`https://wa.me/?text=${encodeURIComponent(`Hola ${c.name}, te enviamos el documento para firmar electrónicamente: ${link.url}`)}`} target="_blank" rel="noopener noreferrer" className={`${btn} text-[#128C7E]`}>
                        <MessageCircle size={15} /> WhatsApp
                      </a>
                    </div>
                  ) : (
                    <button type="button" onClick={() => run(() => regenerateLink(c.id), "Enlace nuevo generado.")} className={`${btn} w-fit`}>
                      <RefreshCw size={15} /> Generar enlace nuevo
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
