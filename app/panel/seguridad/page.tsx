import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TotpSetup } from "@/components/seguridad/TotpSetup";

export const metadata: Metadata = { title: "Seguridad" };

export default function SeguridadPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Seguridad de tu cuenta</h1>
        <p className="text-muted">Cada socio activa su propia verificación en dos pasos.</p>
      </div>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-border/50" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  return <TotpSetup factorId={data?.totp?.[0]?.id ?? null} />;
}
