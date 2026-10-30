"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { PMNode } from "@/lib/pdf/nexus-document";
import { createClient } from "@/lib/supabase/client";
import { createSignatureRequest } from "@/app/panel/firmas/actions";
import { buildPdf } from "@/components/documentos/PdfPreview";

interface ClientRow {
  name: string;
  email: string;
  idNumber: string;
}

/** Botón del editor: congela el PDF actual y lo envía a firmar a socios y clientes. */
export function SendToSign({
  documentId,
  title,
  content,
  vars,
  partners,
  disabled,
}: {
  documentId: string;
  title: string;
  content: PMNode;
  vars: Record<string, string>;
  partners: { id: string; fullName: string }[];
  disabled?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>(partners.map((p) => p.id));
  const [clients, setClients] = useState<ClientRow[]>([{ name: vars.cliente ?? "", email: "", idNumber: vars.documento ?? "" }]);

  async function send() {
    setBusy(true);
    try {
      const requestId = crypto.randomUUID();
      const blob = await buildPdf(title, content, vars);
      const path = `firmas/${requestId}/original.pdf`;
      const { error } = await createClient().storage.from("archivos").upload(path, blob, { contentType: "application/pdf" });
      if (error) throw new Error("No se pudo subir el PDF.");
      const res = await createSignatureRequest({
        requestId,
        documentId,
        path,
        partnerIds: selected,
        clients: clients.filter((c) => c.name.trim()),
      });
      if (res.error) throw new Error(res.error);
      if (res.links?.length) {
        try {
          sessionStorage.setItem(`links-${requestId}`, JSON.stringify(res.links));
        } catch {
          /* sin almacenamiento: los enlaces se pueden regenerar */
        }
      }
      toast.success("Documento enviado a firmar.");
      router.push(`/panel/firmas/${requestId}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  const input = "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-purple";

  return (
    <>
      <button
        type="button"
        onClick={() => (disabled ? toast.info(disabled) : setOpen(true))}
        className="inline-flex items-center gap-1.5 rounded-lg border border-purple/40 bg-purple/5 px-3 py-2 text-sm font-semibold text-purple transition hover:bg-purple hover:text-white"
      >
        <PenLine size={16} /> Enviar a firmar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Enviar a firmar" onClick={(e) => e.stopPropagation()} className="rise max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-pixel text-sm text-purple">ENVIAR A FIRMAR</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-bg" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted">
              Se congela el PDF tal como se ve ahora. Mientras esté en firma, el documento no se puede editar (puedes cancelar la solicitud).
            </p>

            <p className="mb-2 text-sm font-semibold text-navy">Socios que firman</p>
            <div className="mb-4 flex flex-col gap-1.5">
              {partners.map((p) => (
                <label key={p.id} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((x) => x !== p.id))}
                    className="size-4 accent-purple"
                  />
                  {p.fullName}
                </label>
              ))}
            </div>

            <p className="mb-2 text-sm font-semibold text-navy">Clientes que firman (reciben un enlace)</p>
            <div className="flex flex-col gap-2">
              {clients.map((c, i) => (
                <div key={i} className="grid gap-2 rounded-lg bg-bg p-3 sm:grid-cols-2">
                  <input value={c.name} onChange={(e) => setClients(clients.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Nombre completo" maxLength={120} className={`${input} sm:col-span-2`} aria-label="Nombre del cliente" />
                  <input value={c.idNumber} onChange={(e) => setClients(clients.map((x, j) => (j === i ? { ...x, idNumber: e.target.value } : x)))} placeholder="Cédula o NIT (opcional)" maxLength={40} className={input} aria-label="Cédula o NIT" />
                  <input value={c.email} onChange={(e) => setClients(clients.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} placeholder="Correo (opcional)" type="email" maxLength={200} className={input} aria-label="Correo" />
                  <button type="button" onClick={() => setClients(clients.filter((_, j) => j !== i))} className="inline-flex w-fit items-center gap-1 text-xs text-muted hover:text-red-600">
                    <Trash2 size={13} /> Quitar
                  </button>
                </div>
              ))}
              {clients.length < 5 && (
                <button type="button" onClick={() => setClients([...clients, { name: "", email: "", idNumber: "" }])} className="inline-flex w-fit items-center gap-1 text-sm text-purple hover:underline">
                  <Plus size={14} /> Agregar cliente
                </button>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={send} disabled={busy || (!selected.length && !clients.some((c) => c.name.trim()))} className="shine rounded-lg bg-purple px-5 py-2.5 font-semibold text-white hover:bg-violet disabled:opacity-50">
                {busy ? "Preparando…" : "Enviar a firmar"}
              </button>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="px-3 text-sm text-muted">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
