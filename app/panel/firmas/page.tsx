import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { PenLine } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listRequests, mySignature } from "@/lib/firmas/data";
import { formatDateTime } from "@/lib/format";
import { MySignature } from "@/components/firmas/MySignature";

export const metadata: Metadata = { title: "Firmas" };

const STATUS = {
  pendiente: { label: "Pendiente", cls: "bg-orange/15 text-orange-700" },
  completada: { label: "Firmado", cls: "bg-teal/20 text-teal-800" },
  cancelada: { label: "Cancelada", cls: "bg-border text-muted" },
};

export default function FirmasPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Firmas</h1>
        <p className="text-muted">
          Envía a firmar desde el editor de documentos. Aquí ves el estado de cada solicitud y guardas tu firma.
        </p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-border/50" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const user = await getCurrentUser();
  const [requests, sig] = await Promise.all([listRequests(), mySignature(user.id)]);
  const mine = requests.filter((r) => r.status === "pendiente" && r.signers.some((s) => s.profileId === user.id && !s.signedAt));

  return (
    <>
      {mine.length > 0 && (
        <div className="rounded-2xl bg-navy p-5 text-white">
          <p className="font-pixel text-xs tracking-[0.25em] text-cyan">TE TOCA FIRMAR</p>
          <ul className="mt-3 flex flex-col gap-2">
            {mine.map((r) => (
              <li key={r.id}>
                <Link href={`/panel/firmas/${r.id}`} className="inline-flex items-center gap-2 font-semibold hover:text-cyan">
                  <PenLine size={16} /> {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">SOLICITUDES</h2>
        {requests.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
            {requests.map((r) => {
              const done = r.signers.filter((s) => s.signedAt).length;
              const st = STATUS[r.status];
              return (
                <li key={r.id}>
                  <Link href={`/panel/firmas/${r.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-bg">
                    <PenLine size={20} className="text-purple" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-navy">{r.title}</span>
                      <span className="block text-xs text-muted">
                        {done} de {r.signers.length} firmas · {formatDateTime(r.createdAt)}
                      </span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-white px-6 py-8 text-center text-sm text-muted">
            Aún no hay solicitudes. Abre un documento y usa «Enviar a firmar».
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">MI FIRMA</h2>
        <MySignature userId={user.id} currentUrl={sig.url} usesSello={sig.sello} />
      </section>
    </>
  );
}
