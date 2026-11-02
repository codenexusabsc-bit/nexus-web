import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { listPartners } from "@/lib/carpeta";
import { ACTION_LABEL, TABLE_LABEL } from "@/lib/actividad";
import { listActivity } from "@/lib/actividad-data";
import { firstName, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Actividad" };

export default function ActividadPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Registro de actividad</h1>
        <p className="text-muted">Quién creó, editó, borró o firmó cada cosa. Se llena solo y nadie puede modificarlo.</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-border/50" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await getCurrentUser();
  const [{ items, migrated }, partners] = await Promise.all([listActivity(), listPartners()]);
  if (!migrated) return <p className="rounded-xl border border-orange/40 bg-orange/10 p-4 text-sm">Falta aplicar la migración 010 en Supabase.</p>;
  if (items.length === 0) return <p className="rounded-xl border border-border bg-white p-6 text-center text-muted">Todavía no hay movimientos.</p>;
  const names = Object.fromEntries(partners.map((p) => [p.id, firstName(p.fullName)]));

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
      {items.map((e) => {
        const t = TABLE_LABEL[e.table] ?? { label: e.table };
        const who = e.actor ? (names[e.actor] ?? "Un socio") : e.table === "leads" ? "Un visitante" : "El sistema";
        return (
          <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm">
            <time dateTime={e.at} className="w-28 shrink-0 text-xs text-muted">
              {formatDateTime(e.at)}
            </time>
            <span>
              <b className="text-navy">{who}</b> {ACTION_LABEL[e.action]} {t.label}
              {e.summary && (
                <>
                  : <span className="text-text">«{e.summary}»</span>
                </>
              )}
            </span>
            {t.href && e.action !== "borrar" && (
              <Link href={t.href} className="ml-auto text-xs text-purple hover:underline">
                Ver sección
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
