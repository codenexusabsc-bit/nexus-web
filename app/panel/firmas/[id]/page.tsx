import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getRequest } from "@/lib/firmas/data";
import { formatDateTime } from "@/lib/format";
import { RequestActions } from "@/components/firmas/RequestActions";

export const metadata: Metadata = { title: "Solicitud de firma" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/panel/firmas" className="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-purple">
        <ArrowLeft size={16} /> Firmas
      </Link>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-border/50" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!UUID.test(id)) notFound();
  const r = await getRequest(id);
  if (!r) notFound();
  const done = r.signers.filter((s) => s.signedAt).length;
  const canSign = r.signers.some((s) => s.profileId === user.id && !s.signedAt);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-navy">{r.title}</h1>
        <p className="text-sm text-muted">
          Enviado {formatDateTime(r.createdAt)} · {done} de {r.signers.length} firmas
          {r.documentId && (
            <>
              {" · "}
              <Link href={`/panel/documentos/${r.documentId}`} className="text-purple hover:underline">ver documento</Link>
            </>
          )}
        </p>
      </div>

      {/* Progreso */}
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-gradient-to-r from-violet to-cyan transition-all duration-700" style={{ width: `${(done / Math.max(1, r.signers.length)) * 100}%` }} />
      </div>

      <RequestActions
        requestId={r.id}
        status={r.status}
        canSign={canSign}
        allSigned={done === r.signers.length}
        clientSigners={r.signers.filter((s) => s.kind === "cliente").map((s) => ({ id: s.id, name: s.name, signed: Boolean(s.signedAt) }))}
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {r.signers.map((s) => (
          <li key={s.id} className={`flex gap-3 rounded-xl border bg-white p-4 ${s.signedAt ? "border-teal/50" : "border-border"}`}>
            {s.signedAt ? <CheckCircle2 className="shrink-0 text-teal" size={22} /> : <Clock className="shrink-0 text-orange" size={22} />}
            <div className="min-w-0">
              <p className="font-semibold text-navy">{s.name}</p>
              <p className="text-xs text-purple">{s.kind === "socio" ? "Socio" : "Cliente"}{s.idNumber && ` · ${s.idNumber}`}</p>
              <p className="text-xs text-muted">
                {s.signedAt ? `Firmó ${formatDateTime(s.signedAt)}` : s.kind === "cliente" && s.tokenExpiresAt ? `Pendiente · el enlace vence ${formatDateTime(s.tokenExpiresAt)}` : "Pendiente"}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-3 rounded-xl border border-border bg-white p-4 text-xs text-muted">
        <ShieldCheck size={18} className="shrink-0 text-purple" />
        <div className="min-w-0 break-all">
          <p>Huella SHA-256 del original: <code>{r.originalSha256}</code></p>
          {r.signedSha256 && <p className="mt-1">Huella del PDF firmado: <code>{r.signedSha256}</code></p>}
          <p className="mt-1">Cualquiera puede comprobar el PDF firmado en <Link href="/verificar" className="text-purple hover:underline">/verificar</Link>.</p>
        </div>
      </div>
    </>
  );
}
