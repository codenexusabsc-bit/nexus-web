"use server";

import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

export interface VerifyResult {
  error?: string;
  match?: "firmado" | "original" | "ninguno";
  title?: string;
  completedAt?: string | null;
  signers?: { name: string; kind: string; signedAt: string | null }[];
}

/** Busca la huella SHA-256 (calculada en el navegador) entre los PDF firmados y originales. */
export async function verifyHash(hash: string): Promise<VerifyResult> {
  if (!/^[0-9a-f]{64}$/.test(hash)) return { error: "Huella inválida." };
  if (!hasAdminKey()) return { error: "La verificación aún no está habilitada." };
  const admin = createAdminClient();
  const { data } = await admin
    .from("signature_requests")
    .select("title, status, completed_at, signed_sha256, original_sha256, signers ( name, kind, signed_at, position )")
    .or(`signed_sha256.eq.${hash},original_sha256.eq.${hash}`)
    .limit(1)
    .maybeSingle();
  if (!data) return { match: "ninguno" };
  const signers = ((data.signers ?? []) as { name: string; kind: string; signed_at: string | null; position: number }[])
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ name: s.name, kind: s.kind, signedAt: s.signed_at }));
  return {
    match: data.signed_sha256 === hash ? "firmado" : "original",
    title: data.title,
    completedAt: data.completed_at,
    signers,
  };
}
