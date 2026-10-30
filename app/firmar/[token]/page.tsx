import { Suspense } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { BUCKET } from "@/lib/carpeta";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { isExpired, isToken, sha256Hex } from "@/lib/firmas/util";
import { formatDateTime } from "@/lib/format";
import { SpaceBackground } from "@/components/space/SpaceBackground";
import { ClientSignForm } from "@/components/firmas/ClientSignForm";

export const metadata: Metadata = {
  title: "Firmar documento",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function FirmarPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-navy px-4 py-10">
      <SpaceBackground stars={90} shooting={4} seed={52} />
      <div className="relative mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-3 text-white">
          <Image src="/marca/portal.png" alt="" width={248} height={327} unoptimized className="pixelated portal-float h-auto w-9" />
          <span className="leading-tight">
            <span className="block font-pixel text-xl font-bold tracking-widest">NEXUS</span>
            <span className="block font-pixel text-[0.6rem] tracking-[0.3em] text-cyan">FIRMA ELECTRÓNICA</span>
          </span>
        </div>
        <div className="rise rounded-2xl bg-surface p-5 shadow-2xl sm:p-7">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-border/50" />}>
            <Content params={params} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-2 text-center">
      <p className="text-xl font-bold text-navy">{title}</p>
      <p className="text-muted">{text}</p>
    </div>
  );
}

async function Content({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isToken(token)) return <Message title="Enlace inválido" text="Revisa que copiaste el enlace completo." />;
  if (!hasAdminKey()) return <Message title="No disponible" text="La firma por enlace aún no está habilitada. Contacta a Nexus Ingeniería." />;

  const admin = createAdminClient();
  const { data: signer } = await admin
    .from("signers")
    .select("name, id_number, signed_at, token_expires_at, signature_requests ( title, status, original_path, created_at )")
    .eq("token_hash", sha256Hex(token))
    .maybeSingle();
  const req = signer?.signature_requests as unknown as { title: string; status: string; original_path: string; created_at: string } | null;

  if (!signer || !req) return <Message title="Enlace no válido" text="Este enlace no existe o fue reemplazado por uno nuevo. Pide a Nexus Ingeniería un enlace actualizado." />;
  if (signer.signed_at) return <Message title="Ya firmaste" text={`Firmaste este documento el ${formatDateTime(signer.signed_at)}.`} />;
  if (req.status !== "pendiente") return <Message title="Solicitud inactiva" text="Esta solicitud de firma fue cancelada o ya se completó." />;
  if (isExpired(signer.token_expires_at)) {
    return <Message title="Enlace vencido" text="Pide a Nexus Ingeniería un enlace nuevo." />;
  }

  const { data: pdf } = await admin.storage.from(BUCKET).createSignedUrl(req.original_path, 1800);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-pixel text-xs text-purple">DOCUMENTO PARA FIRMAR</p>
        <h1 className="mt-1 text-2xl font-bold text-navy">{req.title}</h1>
        <p className="text-sm text-muted">Hola, {signer.name}. Lee el documento completo antes de firmar.</p>
      </div>
      {pdf?.signedUrl && (
        <>
          <iframe src={`${pdf.signedUrl}#view=FitH`} title={`Documento: ${req.title}`} className="hidden h-[60dvh] w-full rounded-xl border border-border sm:block" />
          <a href={pdf.signedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-navy hover:border-purple">
            <FileText size={16} /> Abrir el documento (PDF)
          </a>
        </>
      )}
      <ClientSignForm token={token} defaultName={signer.name} defaultId={signer.id_number} />
    </div>
  );
}
