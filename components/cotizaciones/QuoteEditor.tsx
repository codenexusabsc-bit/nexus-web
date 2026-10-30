"use client";

import { useState, useTransition } from "react";
import { FileOutput, Plus, Receipt, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cop, quoteNumber, totals, type Quote } from "@/lib/cotizaciones";
import { collectionFromQuote, quoteToDocument, saveQuote, setQuoteStatus } from "@/app/panel/cotizaciones/actions";

const input = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple";
const STATUS = [
  ["borrador", "Borrador"],
  ["enviada", "Enviada"],
  ["aceptada", "Aceptada"],
  ["rechazada", "Rechazada"],
] as const;

/** Editor de cotización con ítems, totales en vivo y paso a documento para firmar. */
export function QuoteEditor({ quote, projects }: { quote: Quote; projects: { id: string; name: string }[] }) {
  const [q, setQ] = useState(quote);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const tt = totals(q.items, q.discount, q.taxRate);
  const set = <K extends keyof Quote>(k: K, v: Quote[K]) => {
    setQ((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };
  const setItem = (i: number, patch: Partial<Quote["items"][number]>) => set("items", q.items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const save = () =>
    startTransition(async () => {
      const res = await saveQuote({ ...q, validUntil: q.validUntil ?? "" });
      if (res.error) toast.error(res.error);
      else {
        setDirty(false);
        toast.success("Cotización guardada.");
      }
    });

  const num = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-navy px-3 py-1.5 font-pixel text-xs text-white">{quoteNumber(q.number)}</span>
        <input value={q.title} onChange={(e) => set("title", e.target.value)} maxLength={200} className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-xl font-bold text-navy outline-none hover:border-border focus:border-purple" aria-label="Título" />
        <select
          value={q.status}
          onChange={(e) =>
            startTransition(async () => {
              const res = await setQuoteStatus(q.id, e.target.value);
              if (res.error) toast.error(res.error);
              else setQ((p) => ({ ...p, status: e.target.value as Quote["status"] }));
            })
          }
          className="rounded-lg border border-border bg-white px-2 py-2 text-sm"
          aria-label="Estado"
        >
          {STATUS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button type="button" onClick={save} disabled={pending || !dirty} className="shine inline-flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50">
          <Save size={16} /> Guardar
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy sm:col-span-2">Cliente<input value={q.clientName} onChange={(e) => set("clientName", e.target.value)} maxLength={120} className={input} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Cédula / NIT<input value={q.clientIdNumber} onChange={(e) => set("clientIdNumber", e.target.value)} maxLength={40} className={input} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Correo<input value={q.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} type="email" maxLength={200} className={input} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Proyecto
          <select value={q.projectId ?? ""} onChange={(e) => set("projectId", e.target.value || null)} className={input}>
            <option value="">Sin proyecto</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Válida hasta<input type="date" value={q.validUntil ?? ""} onChange={(e) => set("validUntil", e.target.value || null)} className={input} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy sm:col-span-2">Tiempo de entrega<input value={q.deliveryTime} onChange={(e) => set("deliveryTime", e.target.value)} maxLength={120} placeholder="Ej.: 4 semanas" className={input} /></label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-bg text-left text-xs text-navy">
            <tr>
              <th className="px-3 py-2">Descripción</th>
              <th className="w-20 px-3 py-2">Cant.</th>
              <th className="w-40 px-3 py-2">Valor unitario</th>
              <th className="w-36 px-3 py-2 text-right">Total</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {q.items.map((it, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-2 py-1.5"><input value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} maxLength={300} placeholder="Ej.: Diseño y desarrollo de página web" className={input} aria-label="Descripción" /></td>
                <td className="px-2 py-1.5"><input value={it.qty} onChange={(e) => setItem(i, { qty: num(e.target.value) })} inputMode="decimal" className={input} aria-label="Cantidad" /></td>
                <td className="px-2 py-1.5"><input value={it.unitPrice || ""} onChange={(e) => setItem(i, { unitPrice: num(e.target.value) })} inputMode="numeric" placeholder="0" className={input} aria-label="Valor unitario" /></td>
                <td className="px-3 py-1.5 text-right font-medium text-navy">{cop(it.qty * it.unitPrice)}</td>
                <td className="px-1"><button type="button" onClick={() => set("items", q.items.filter((_, j) => j !== i))} className="rounded p-1.5 text-muted hover:text-red-600" aria-label="Quitar ítem"><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-start justify-between gap-4 border-t border-border p-3">
          <button type="button" onClick={() => set("items", [...q.items, { description: "", qty: 1, unitPrice: 0 }])} className="inline-flex items-center gap-1 text-sm text-purple hover:underline"><Plus size={14} /> Agregar ítem</button>
          <dl className="grid min-w-64 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted">Subtotal</dt><dd className="text-right">{cop(tt.subtotal)}</dd>
            <dt className="text-muted">Descuento</dt><dd><input value={q.discount || ""} onChange={(e) => set("discount", num(e.target.value))} placeholder="0" inputMode="numeric" className="w-32 rounded border border-border px-2 py-1 text-right text-sm" aria-label="Descuento" /></dd>
            <dt className="text-muted">IVA %</dt><dd><input value={q.taxRate || ""} onChange={(e) => set("taxRate", Math.min(100, num(e.target.value)))} placeholder="0" inputMode="decimal" className="w-32 rounded border border-border px-2 py-1 text-right text-sm" aria-label="IVA" /></dd>
            {q.taxRate > 0 && (<><dt className="text-muted">IVA</dt><dd className="text-right">{cop(tt.tax)}</dd></>)}
            <dt className="font-bold text-navy">Total</dt><dd className="text-right text-lg font-bold text-purple">{cop(tt.total)}</dd>
          </dl>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Notas y condiciones adicionales
        <textarea value={q.notes} onChange={(e) => set("notes", e.target.value)} rows={3} maxLength={2000} className={input} />
      </label>

      <div className="flex flex-wrap gap-2 rounded-xl border border-purple/30 bg-purple/5 p-4">
        <p className="w-full text-sm text-navy">
          Pasa la cotización al editor para ajustar el texto y <b>enviarla a firmar</b>: cuando el cliente firma, queda <b>aceptada</b> sola.
        </p>
        <form action={quoteToDocument.bind(null, q.id)}>
          <button type="submit" disabled={dirty} title={dirty ? "Guarda primero" : undefined} className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <FileOutput size={16} /> {q.documentId ? "Abrir documento" : "Crear documento para firmar"}
          </button>
        </form>
        {q.status === "aceptada" && (
          <form action={collectionFromQuote.bind(null, q.id)}>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm text-navy hover:border-purple">
              <Receipt size={16} /> Crear cuenta de cobro
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
