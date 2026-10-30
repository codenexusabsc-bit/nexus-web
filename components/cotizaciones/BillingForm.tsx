"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { Billing } from "@/lib/cotizaciones";
import { saveBilling } from "@/app/panel/cotizaciones/actions";

const input = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple";

/** Datos del emisor que salen en cotizaciones y cuentas de cobro. */
export function BillingForm({ initial }: { initial: Billing }) {
  const [b, setB] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveBilling(b);
          if (res.error) toast.error(res.error);
          else toast.success("Datos guardados.");
        });
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-semibold text-navy">A nombre de<input value={b.issuerName} onChange={(e) => setB({ ...b, issuerName: e.target.value })} maxLength={120} className={input} /></label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Cédula o NIT<input value={b.issuerId} onChange={(e) => setB({ ...b, issuerId: e.target.value })} maxLength={40} className={input} /></label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Ciudad<input value={b.issuerCity} onChange={(e) => setB({ ...b, issuerCity: e.target.value })} maxLength={80} className={input} /></label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Forma de pago<input value={b.paymentTerms} onChange={(e) => setB({ ...b, paymentTerms: e.target.value })} maxLength={300} className={input} /></label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-navy sm:col-span-2">Cuenta para consignar (banco, tipo y número)<input value={b.bankInfo} onChange={(e) => setB({ ...b, bankInfo: e.target.value })} maxLength={300} className={input} /></label>
      <button type="submit" disabled={pending} className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50"><Save size={15} /> Guardar datos</button>
    </form>
  );
}
