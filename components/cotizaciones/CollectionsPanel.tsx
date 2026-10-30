"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, FileOutput, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { collectionNumber, cop, type CollectionAccount } from "@/lib/cotizaciones";
import { formatDate } from "@/lib/format";
import { collectionToDocument, createCollection, setCollectionStatus } from "@/app/panel/cotizaciones/actions";

const input = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple";
const BADGE = {
  pendiente: "bg-orange/15 text-orange-700",
  pagada: "bg-teal/20 text-teal-800",
  anulada: "bg-border text-muted",
};

/** Cuentas de cobro: crear, marcar pagadas o anuladas y generar el PDF. */
export function CollectionsPanel({ items, projects, today }: { items: CollectionAccount[]; projects: { id: string; name: string }[]; today: string }) {
  const [open, setOpen] = useState(items.length === 0);
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({ clientName: "", clientIdNumber: "", concept: "", amount: "", issuedOn: today, dueOn: "", projectId: "", notes: "" });

  const run = (fn: () => Promise<{ error?: string }>, ok: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        toast.success(ok);
        after?.();
      }
    });

  return (
    <div className="flex flex-col gap-4">
      {open ? (
        <form
          className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => createCollection({ ...f, amount: Number(f.amount.replace(/[^\d.]/g, "")), projectId: f.projectId || null }),
              "Cuenta de cobro creada.",
              () => {
                setF({ ...f, clientName: "", clientIdNumber: "", concept: "", amount: "", notes: "" });
                setOpen(false);
              }
            );
          }}
        >
          <input value={f.clientName} onChange={(e) => setF({ ...f, clientName: e.target.value })} placeholder="Cliente *" maxLength={120} className={input} aria-label="Cliente" required />
          <input value={f.clientIdNumber} onChange={(e) => setF({ ...f, clientIdNumber: e.target.value })} placeholder="Cédula / NIT del cliente" maxLength={40} className={input} aria-label="Cédula o NIT" />
          <textarea value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })} placeholder="Por concepto de… *" rows={2} maxLength={500} className={`${input} sm:col-span-2`} aria-label="Concepto" required />
          <input value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="Valor (COP) *" inputMode="numeric" className={input} aria-label="Valor" required />
          <select value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })} className={input} aria-label="Proyecto">
            <option value="">Sin proyecto</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Fecha<input type="date" value={f.issuedOn} onChange={(e) => setF({ ...f, issuedOn: e.target.value })} className={input} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Pagar antes de (opcional)<input type="date" value={f.dueOn} onChange={(e) => setF({ ...f, dueOn: e.target.value })} className={input} /></label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={pending} className="rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50">Crear cuenta de cobro</button>
            {items.length > 0 && <button type="button" onClick={() => setOpen(false)} className="px-3 text-sm text-muted">Cancelar</button>}
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet">
          <Plus size={16} /> Nueva cuenta de cobro
        </button>
      )}

      {items.length > 0 && (
        <ul className={`divide-y divide-border overflow-hidden rounded-xl border border-border bg-white ${pending ? "opacity-70" : ""}`}>
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="font-pixel text-xs text-purple">{collectionNumber(c.number)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-navy">{c.clientName} · {cop(c.amount)}</p>
                <p className="truncate text-xs text-muted">
                  {formatDate(c.issuedOn)} · {c.concept}
                  {c.status === "pagada" && c.paidOn && ` · pagada ${formatDate(c.paidOn)}`}
                  {c.status === "pendiente" && c.dueOn && ` · vence ${formatDate(c.dueOn)}`}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE[c.status]}`}>{c.status}</span>
              {c.status === "pendiente" && (
                <>
                  <button type="button" onClick={() => run(() => setCollectionStatus(c.id, "pagada", today), "Marcada como pagada.")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-navy hover:border-teal">
                    <CheckCircle2 size={14} /> Pagada
                  </button>
                  <button type="button" onClick={() => confirm("¿Anular esta cuenta de cobro?") && run(() => setCollectionStatus(c.id, "anulada"), "Anulada.")} className="text-muted hover:text-red-600" aria-label="Anular">
                    <XCircle size={16} />
                  </button>
                </>
              )}
              {c.status !== "pendiente" && (
                <button type="button" onClick={() => run(() => setCollectionStatus(c.id, "pendiente"), "Vuelve a pendiente.")} className="text-xs text-muted hover:text-purple">deshacer</button>
              )}
              <form action={collectionToDocument.bind(null, c.id)}>
                <button type="submit" className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-navy hover:border-purple">
                  <FileOutput size={14} /> {c.documentId ? "Ver PDF" : "Generar PDF"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
