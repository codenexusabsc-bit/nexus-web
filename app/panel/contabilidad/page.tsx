import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { listPartners } from "@/lib/carpeta";
import { isR2Configured } from "@/lib/almacenamiento";
import { listLedger } from "@/lib/contabilidad-data";
import { listCollections } from "@/lib/cotizaciones-data";
import { firstName } from "@/lib/format";
import { LedgerBoard } from "@/components/contabilidad/LedgerBoard";

export const metadata: Metadata = { title: "Contabilidad" };

export default function ContabilidadPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Contabilidad</h1>
        <p className="text-muted">Comprobantes de pago de los clientes y facturas de gastos, con su foto o PDF. Cada pago dice si cubre el 50 % o el valor completo de la cuenta de cobro.</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-border/50" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await getCurrentUser();
  const [{ items, migrated }, accounts, partners] = await Promise.all([listLedger(), listCollections(), listPartners()]);
  if (!migrated) return <p className="rounded-xl border border-orange/40 bg-orange/10 p-4 text-sm">Falta aplicar la migración 012 en Supabase.</p>;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  return (
    <LedgerBoard
      items={items}
      accounts={accounts.map((a) => ({ id: a.id, number: a.number, clientName: a.clientName, concept: a.concept, amount: a.amount, status: a.status }))}
      names={Object.fromEntries(partners.map((p) => [p.id, firstName(p.fullName)]))}
      r2={isR2Configured()}
      today={today}
    />
  );
}
