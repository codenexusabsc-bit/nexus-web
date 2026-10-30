"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { BUCKET } from "@/lib/carpeta";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { sealIfComplete } from "@/lib/firmas/sellar";
import { clientIp, isToken, pngFromDataUrl, sha256Hex, userAgent } from "@/lib/firmas/util";

export interface ClientSignState {
  error?: string;
  done?: boolean;
  /** URL temporal del PDF sellado, si con esta firma se completó */
  signedUrl?: string;
}

const schema = z.object({
  token: z.string().refine(isToken, { error: "Enlace inválido." }),
  name: z.string().trim().min(3, { error: "Escribe tu nombre completo." }).max(120),
  idNumber: z.string().trim().min(4, { error: "Escribe tu número de documento." }).max(40),
  accept: z.literal(true, { error: "Debes aceptar firmar electrónicamente." }),
  signature: z.string().min(30, { error: "Dibuja tu firma." }),
});

/** Firma de un cliente desde su enlace. El servidor valida el token; el navegador nunca toca la base de datos. */
export async function submitClientSignature(input: z.input<typeof schema>): Promise<ClientSignState> {
  if (!hasAdminKey()) return { error: "La firma por enlace aún no está habilitada. Contacta a Nexus." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const png = pngFromDataUrl(d.signature);
  if (!png) return { error: "La firma no es válida. Vuelve a dibujarla." };

  const admin = createAdminClient();
  const { data: signer } = await admin
    .from("signers")
    .select("id, request_id, signed_at, token_expires_at, signature_requests ( status )")
    .eq("token_hash", sha256Hex(d.token))
    .maybeSingle();
  const req = signer?.signature_requests as unknown as { status: string } | null;
  if (!signer || !req) return { error: "Este enlace no existe o fue reemplazado por uno nuevo." };
  if (signer.signed_at) return { error: "Este documento ya fue firmado con este enlace." };
  if (req.status !== "pendiente") return { error: "Esta solicitud de firma ya no está activa." };
  if (signer.token_expires_at && Date.parse(signer.token_expires_at) < Date.now()) {
    return { error: "El enlace venció. Pide uno nuevo a Nexus Ingeniería." };
  }

  const sigPath = `firmas/${signer.request_id}/cliente-${signer.id}.png`;
  const up = await admin.storage.from(BUCKET).upload(sigPath, png, { contentType: "image/png", upsert: true });
  if (up.error) return { error: "No se pudo guardar la firma. Intenta de nuevo." };

  const h = await headers();
  const { data: updated } = await admin
    .from("signers")
    .update({ name: d.name, id_number: d.idNumber, signed_at: new Date().toISOString(), signature_path: sigPath, ip: clientIp(h), user_agent: userAgent(h) })
    .eq("id", signer.id)
    .is("signed_at", null)
    .select("id");
  if (!updated?.length) return { error: "Este documento ya fue firmado con este enlace." };

  const sealed = await sealIfComplete(admin, signer.request_id);
  if (!sealed.ok) return { done: true };
  const { data: r } = await admin.from("signature_requests").select("status, signed_path").eq("id", signer.request_id).single();
  if (r?.status === "completada" && r.signed_path) {
    const { data: url } = await admin.storage.from(BUCKET).createSignedUrl(r.signed_path, 600);
    return { done: true, signedUrl: url?.signedUrl };
  }
  return { done: true };
}
