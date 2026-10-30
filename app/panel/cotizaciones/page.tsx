import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { FilePlus2, Receipt } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listProjects } from "@/lib/carpeta";
import { cop, quoteNumber } from "@/lib/cotizaciones";
import { getBilling, listCollections, listQuotes } from "@/lib/cotizaciones-data";
import { formatDate } from "@/lib/format";
import { one, type SearchParams } from "@/lib/search-params";
import { BillingForm } from "@/components/cotizaciones/BillingForm";
import { CollectionsPanel } from "@/components/cotizaciones/CollectionsPanel";
import { createQuote } from "./actions";

export const metadata: Metadata = { title: "Cotizaciones y cobros" };

const QSTATUS = {
  borrador: "bg-border text-navy",
  enviada: "bg-cyan/20 text-cyan-800",
  aceptada: "bg-teal/20 text-teal-800",
  rechazada: "bg-red-100 text-red-700",
};

export default function CotizacionesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Cotizaciones y cobros</h1>
        <p className="text-muted">Cotiza, envía a firmar y, cuando el cliente acepta, genera la cuenta de cobro.</p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-border/50" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const [sp] = await Promise.all([searchParams, getCurrentUser()]);
  const tab = one(sp.tab) ?? "cotizaciones";
  const [quotes, collections, billing, projects] = await Promise.all([listQuotes(), listCollections(), getBilling(), listProjects()]);
  const projectOpts = projects.filter((p) => !p.archived).map((p) => ({ id: p.id, name: p.name }));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const month = today.slice(0, 7);
  const paidMonth = collections.filter((c) => c.status === "pagada" && c.paidOn?.startsWith(month)).reduce((s, c) => s + c.amount, 0);
  const pendingTotal = collections.filter((c) => c.status === "pendiente").reduce((s, c) => s + c.amount, 0);
  const accepted = quotes.filter((q) => q.status === "aceptada").reduce((s, q) => s + q.total, 0);

  const tabs = [
    ["cotizaciones", "Cotizaciones"],
    ["cobros", "Cuentas de cobro"],
    ["datos", "Datos de facturación"],
  ];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cobrado este mes" value={cop(paidMonth)} color="#0F766E" />
        <Stat label="Por cobrar" value={cop(pendingTotal)} color="#EA580C" />
        <Stat label="Cotizaciones aceptadas" value={cop(accepted)} color="#6D28D9" />
      </div>

      <nav className="flex gap-1 rounded-lg bg-border/60 p-1" aria-label="Secciones">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/panel/cotizaciones?tab=${k}`} className={`flex-1 rounded-md py-1.5 text-center text-sm ${tab === k ? "bg-white font-semibold text-navy shadow" : "text-muted"}`}>
            {l}
          </Link>
        ))}
      </nav>

      {tab === "cotizaciones" && (
        <section className="flex flex-col gap-3">
          <form action={createQuote} className="flex flex-wrap gap-2">
            <input name="client" placeholder="Cliente de la nueva cotización" maxLength={120} className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple sm:max-w-sm" aria-label="Cliente" />
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet">
              <FilePlus2 size={16} /> Nueva cotización
            </button>
          </form>
          {quotes.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
              {quotes.map((q) => (
                <li key={q.id}>
                  <Link href={`/panel/cotizaciones/${q.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-bg">
                    <span className="font-pixel text-xs text-purple">{quoteNumber(q.number)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-navy">{q.clientName} · {q.title}</span>
                      <span className="block text-xs text-muted">{formatDate(q.createdAt)}</span>
                    </span>
                    <span className="font-semibold text-navy">{cop(q.total)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${QSTATUS[q.status]}`}>{q.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-white px-6 py-8 text-center text-sm text-muted">Aún no hay cotizaciones.</p>
          )}
        </section>
      )}

      {tab === "cobros" && <CollectionsPanel items={collections} projects={projectOpts} today={today} />}

      {tab === "datos" && (
        <section className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Receipt size={16} className="text-purple" /> Estos datos salen en las cotizaciones y cuentas de cobro.
          </p>
          <BillingForm initial={billing} />
        </section>
      )}
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
