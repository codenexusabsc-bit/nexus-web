"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDownLeft, ArrowUpRight, FileImage, Paperclip, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { accountProgress, FILE_TYPES, MAX_FILE_BYTES, paymentShare, type LedgerEntry, type PaymentShare } from "@/lib/contabilidad";
import { cop } from "@/lib/cotizaciones";
import { formatBytes, formatDate } from "@/lib/format";
import { createEntry, deleteEntry, getFileUrl, requestUpload } from "@/app/panel/contabilidad/actions";

export interface AccountOption {
  id: string;
  number: number;
  clientName: string;
  concept: string;
  amount: number;
  status: "pendiente" | "pagada" | "anulada";
}

const input = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple";
const TONE: Record<string, string> = {
  half: "bg-orange/15 text-orange",
  full: "bg-green-100 text-green-700",
  partial: "bg-purple/10 text-purple",
  over: "bg-red-100 text-red-700",
  none: "bg-border text-muted",
};

/** Panel de contabilidad: resumen, avance de cada cuenta de cobro y movimientos con su comprobante. */
export function LedgerBoard({ items, accounts, names, r2, today }: { items: LedgerEntry[]; accounts: AccountOption[]; names: Record<string, string>; r2: boolean; today: string }) {
  const [adding, setAdding] = useState<"ingreso" | "gasto" | null>(null);
  const [pending, startTransition] = useTransition();
  const month = today.slice(0, 7);

  const totals = useMemo(() => {
    const m = items.filter((e) => e.entryDate.startsWith(month));
    const sum = (k: LedgerEntry["kind"], list: LedgerEntry[]) => list.filter((e) => e.kind === k).reduce((s, e) => s + e.amount, 0);
    return { inMonth: sum("ingreso", m), outMonth: sum("gasto", m), inAll: sum("ingreso", items), outAll: sum("gasto", items) };
  }, [items, month]);

  const paidByAccount = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of items) if (e.kind === "ingreso" && e.collectionAccountId) map.set(e.collectionAccountId, (map.get(e.collectionAccountId) ?? 0) + e.amount);
    return map;
  }, [items]);
  const accById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const open = (id: string) =>
    startTransition(async () => {
      const res = await getFileUrl(id);
      if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
      else toast.error(res.error ?? "No se pudo abrir.");
    });

  const remove = (e: LedgerEntry) => {
    if (!confirm(`¿Borrar «${e.concept}» (${cop(e.amount)})? También se borra su archivo.`)) return;
    startTransition(async () => {
      const res = await deleteEntry(e.id);
      if (res.error) toast.error(res.error);
      else toast.success("Movimiento borrado.");
    });
  };

  const active = accounts.filter((a) => a.status !== "anulada");

  return (
    <div className="flex flex-col gap-6">
      {!r2 && <p className="rounded-xl border border-orange/40 bg-orange/10 p-4 text-sm">Cloudflare R2 aún no está configurado: puedes registrar movimientos, pero no subir ni ver imágenes.</p>}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setAdding("ingreso")} className="inline-flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet">
          <Plus size={16} /> Comprobante de pago recibido
        </button>
        <button type="button" onClick={() => setAdding("gasto")} className="inline-flex items-center gap-1.5 rounded-lg border border-purple px-4 py-2 text-sm font-semibold text-purple hover:bg-purple/5">
          <Plus size={16} /> Factura o gasto
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Ingresos del mes" value={cop(totals.inMonth)} />
        <Stat label="Gastos del mes" value={cop(totals.outMonth)} />
        <Stat label="Balance acumulado" value={cop(totals.inAll - totals.outAll)} strong />
      </div>

      <section>
        <h2 className="mb-2 font-pixel text-sm text-purple">CUENTAS DE COBRO</h2>
        {active.length === 0 ? (
          <p className="rounded-xl border border-border bg-white p-4 text-sm text-muted">No hay cuentas de cobro. Créalas en «Cotizaciones y cobros».</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {active.map((a) => {
              const p = accountProgress(a.amount, paidByAccount.get(a.id) ?? 0);
              return (
                <li key={a.id} className="rounded-xl border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy">#{a.number} · {a.clientName}</p>
                      <p className="truncate text-xs text-muted">{a.concept}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[p.tone]}`}>{a.status === "pagada" && p.tone === "none" ? "Pagada (manual)" : p.label}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={Math.min(100, Math.round(p.percent))} aria-valuemin={0} aria-valuemax={100} aria-label={`Pagado de la cuenta ${a.number}`}>
                    <div className="h-full rounded-full bg-purple transition-all" style={{ width: `${Math.min(100, p.percent)}%` }} />
                  </div>
                  <p className="mt-2 flex justify-between text-xs text-muted">
                    <span>Pagado {cop(p.paid)} de {cop(a.amount)}</span>
                    <span>Saldo {cop(p.balance)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-pixel text-sm text-purple">MOVIMIENTOS</h2>
        {items.length === 0 ? (
          <p className="rounded-xl border border-border bg-white p-6 text-center text-muted">Aún no hay movimientos.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
            {items.map((e) => {
              const acc = e.collectionAccountId ? accById.get(e.collectionAccountId) : undefined;
              const share = acc ? paymentShare(e.amount, acc.amount) : null;
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${e.kind === "ingreso" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`} aria-hidden="true">
                    {e.kind === "ingreso" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy">{e.concept}</p>
                    <p className="truncate text-xs text-muted">
                      {[formatDate(e.entryDate), e.counterparty, e.reference && `Ref. ${e.reference}`, e.uploadedBy && `por ${names[e.uploadedBy] ?? "un socio"}`].filter(Boolean).join(" · ")}
                      {acc && ` · Cuenta #${acc.number}`}
                    </p>
                  </div>
                  {share && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[share.tone]}`}>{share.label}</span>}
                  <b className={e.kind === "ingreso" ? "text-green-700" : "text-red-700"}>{e.kind === "ingreso" ? "+" : "−"}{cop(e.amount)}</b>
                  <div className="flex gap-1">
                    {e.hasFile && (
                      <button type="button" onClick={() => open(e.id)} disabled={pending || !r2} title={`Ver ${e.fileName}`} aria-label={`Ver archivo de ${e.concept}`} className="rounded-md border border-border p-1.5 text-muted hover:border-purple hover:text-purple disabled:opacity-40">
                        <FileImage size={15} />
                      </button>
                    )}
                    <button type="button" onClick={() => remove(e)} disabled={pending} title="Borrar" aria-label={`Borrar ${e.concept}`} className="rounded-md border border-border p-1.5 text-muted hover:border-red-400 hover:text-red-600 disabled:opacity-40">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {adding && <EntryForm kind={adding} accounts={active.filter((a) => a.status === "pendiente")} paidByAccount={paidByAccount} r2={r2} today={today} onClose={() => setAdding(null)} />}
    </div>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-xl ${strong ? "font-bold text-purple" : "font-semibold text-navy"}`}>{value}</p>
    </div>
  );
}

function EntryForm({ kind, accounts, paidByAccount, r2, today, onClose }: { kind: "ingreso" | "gasto"; accounts: AccountOption[]; paidByAccount: Map<string, number>; r2: boolean; today: string; onClose: () => void }) {
  const [f, setF] = useState({ concept: "", counterparty: "", amount: "", entryDate: today, reference: "", notes: "", accountId: "" });
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const amount = Number(f.amount.replace(/[^\d.]/g, "")) || 0;
  const account = accounts.find((a) => a.id === f.accountId);
  // Vista previa de qué parte de la cuenta cubre este pago, mirando también lo ya pagado.
  const hint: { share: PaymentShare | null; balance: number } | null = account ? { share: paymentShare(amount, account.amount), balance: Math.max(0, account.amount - (paidByAccount.get(account.id) ?? 0) - amount) } : null;

  const pick = (list: FileList | null) => {
    const picked = list?.[0] ?? null;
    if (picked && !(picked.type in FILE_TYPES)) return void toast.error("Solo imágenes JPG, PNG, WebP o PDF.");
    if (picked && picked.size > MAX_FILE_BYTES) return void toast.error("El archivo pesa más de 10 MB.");
    setFile(picked);
  };

  const save = () =>
    startTransition(async () => {
      if (!f.concept.trim()) return void toast.error("Escribe el concepto.");
      if (!(amount > 0)) return void toast.error("Escribe el valor.");
      let uploaded: { key: string; name: string; mime: string; size: number } | null = null;
      if (file) {
        const req = await requestUpload({ fileName: file.name, mime: file.type, size: file.size });
        if (req.error || !req.url || !req.key) return void toast.error(req.error ?? "No se pudo preparar la subida.");
        try {
          const put = await fetch(req.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
          if (!put.ok) throw new Error(String(put.status));
        } catch {
          return void toast.error("No se pudo subir el archivo. Revisa la configuración CORS del bucket en Cloudflare.");
        }
        uploaded = { key: req.key, name: file.name.slice(0, 160), mime: file.type, size: file.size };
      }
      const res = await createEntry({
        kind, concept: f.concept, counterparty: f.counterparty, amount, entryDate: f.entryDate, reference: f.reference, notes: f.notes,
        collectionAccountId: kind === "ingreso" && f.accountId ? f.accountId : null,
        file: uploaded,
      });
      if (res.error) return void toast.error(res.error);
      toast.success("Movimiento guardado.");
      onClose();
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/50 backdrop-blur-sm" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Nuevo movimiento" onClick={(e) => e.stopPropagation()} className="flex h-dvh w-full max-w-md flex-col gap-3 overflow-y-auto bg-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-sm text-purple">{kind === "ingreso" ? "COMPROBANTE DE PAGO" : "FACTURA O GASTO"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-bg" aria-label="Cerrar"><X size={18} /></button>
        </div>

        {kind === "ingreso" && (
          <Field label="Cuenta de cobro que paga">
            <select className={input} value={f.accountId} onChange={(e) => set("accountId", e.target.value)}>
              <option value="">Ninguna / pago suelto</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>#{a.number} · {a.clientName} · {cop(a.amount)}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Concepto"><input className={input} value={f.concept} maxLength={200} onChange={(e) => set("concept", e.target.value)} placeholder={kind === "ingreso" ? "Anticipo 50 % sitio web" : "Dominio y hosting"} /></Field>
        <Field label={kind === "ingreso" ? "Cliente" : "Proveedor"}><input className={input} value={f.counterparty} maxLength={120} onChange={(e) => set("counterparty", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (COP)"><input className={input} inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="500000" /></Field>
          <Field label="Fecha"><input type="date" className={input} value={f.entryDate} max={today} onChange={(e) => set("entryDate", e.target.value)} /></Field>
        </div>
        {hint && amount > 0 && (
          <p className={`rounded-lg px-3 py-2 text-sm ${TONE[hint.share?.tone ?? "none"]}`}>
            {hint.share?.label ?? "—"}. {hint.balance > 0 ? `Quedaría un saldo de ${cop(hint.balance)}.` : "Con este pago la cuenta queda cubierta."}
          </p>
        )}
        <Field label={kind === "ingreso" ? "N.º de transferencia (opcional)" : "N.º de factura (opcional)"}><input className={input} value={f.reference} maxLength={80} onChange={(e) => set("reference", e.target.value)} /></Field>
        <Field label="Notas (opcional)"><textarea className={input} rows={2} value={f.notes} maxLength={1000} onChange={(e) => set("notes", e.target.value)} /></Field>

        <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted hover:border-purple ${r2 ? "" : "pointer-events-none opacity-50"}`}>
          <Paperclip size={18} />
          {file ? `${file.name} · ${formatBytes(file.size)}` : "Adjuntar foto o PDF (máx. 10 MB)"}
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => pick(e.target.files)} />
        </label>

        <button type="button" onClick={save} disabled={pending} className="mt-2 rounded-lg bg-purple px-4 py-2.5 font-semibold text-white hover:bg-violet disabled:opacity-50">
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
      {label}
      {children}
    </label>
  );
}
