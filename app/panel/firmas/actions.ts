"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { BUCKET } from "@/lib/carpeta";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sealIfComplete } from "@/lib/firmas/sellar";
import { LINK_DAYS, appUrl, clientIp, newToken, sha256Hex, userAgent } from "@/lib/firmas/util";

export interface SignResult {
  error?: string;
  /** Enlaces de firma de los clientes (solo se muestran al crearlos o regenerarlos) */
  links?: { name: string; url: string }[];
  sealed?: boolean;
}

const uuid = z.uuid({ error: "Identificador inválido." });

const createSchema = z.object({
  requestId: uuid,
  documentId: uuid,
  path: z.string().regex(/^firmas\/[0-9a-f-]{36}\/original\.pdf$/),
  partnerIds: z.array(uuid).max(5),
  clients: z
    .array(
      z.object({
        name: z.string().trim().min(2, { error: "Escribe el nombre del cliente." }).max(120),
        email: z.union([z.literal(""), z.email({ error: "Correo del cliente inválido." })]),
        idNumber: z.string().trim().max(40),
      })
    )
    .max(5),
});

/** Crea la solicitud con el PDF que el navegador ya subió; calcula su huella aquí, no en el cliente. */
export async function createSignatureRequest(input: z.input<typeof createSchema>): Promise<SignResult> {
  await getCurrentUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (!d.path.startsWith(`firmas/${d.requestId}/`)) return { error: "Ruta inválida." };
  if (!d.partnerIds.length && !d.clients.length) return { error: "Elige al menos un firmante." };

  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("title, project_id, status").eq("id", d.documentId).single();
  if (!doc) return { error: "No se encontró el documento." };
  if (doc.status !== "borrador") return { error: "Este documento ya está en firma o firmado." };

  const { data: file } = await supabase.storage.from(BUCKET).download(d.path);
  if (!file) return { error: "No se encontró el PDF subido." };
  const hash = sha256Hex(new Uint8Array(await file.arrayBuffer()));

  const { data: partners } = await supabase.from("profiles").select("id, full_name").in("id", d.partnerIds).eq("role", "partner");
  if ((partners ?? []).length !== d.partnerIds.length) return { error: "Algún socio no es válido." };

  const { error: reqErr } = await supabase.from("signature_requests").insert({
    id: d.requestId,
    document_id: d.documentId,
    project_id: doc.project_id,
    title: doc.title,
    original_path: d.path,
    original_sha256: hash,
  });
  if (reqErr) return { error: "No se pudo crear la solicitud. ¿Ya se aplicó la migración 006?" };

  const expires = new Date(Date.now() + LINK_DAYS * 86_400_000).toISOString();
  const links: { name: string; url: string }[] = [];
  const rows = [
    ...(partners ?? []).map((p: { id: string; full_name: string }, i: number) => ({
      request_id: d.requestId,
      kind: "socio",
      profile_id: p.id,
      name: p.full_name || "Socio",
      position: i,
    })),
    ...d.clients.map((c, i) => {
      const t = newToken();
      links.push({ name: c.name, url: `${appUrl()}/firmar/${t.token}` });
      return {
        request_id: d.requestId,
        kind: "cliente",
        name: c.name,
        email: c.email,
        id_number: c.idNumber,
        token_hash: t.hash,
        token_expires_at: expires,
        position: 10 + i,
      };
    }),
  ];
  const { error: sErr } = await supabase.from("signers").insert(rows);
  if (sErr) {
    await supabase.from("signature_requests").update({ status: "cancelada" }).eq("id", d.requestId);
    return { error: "No se pudieron registrar los firmantes." };
  }
  await supabase.from("documents").update({ status: "en_firma" }).eq("id", d.documentId);
  revalidatePath("/panel", "layout");
  return { links };
}

/** El socio firma con su firma guardada. Si era el último, se sella el PDF. */
export async function signAsPartner(requestId: string): Promise<SignResult> {
  const user = await getCurrentUser();
  if (!uuid.safeParse(requestId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("signature_path").eq("id", user.id).single();
  if (!profile?.signature_path) return { error: "Primero guarda tu firma en Firmas → Mi firma." };

  const { data: req } = await supabase.from("signature_requests").select("status").eq("id", requestId).single();
  if (req?.status !== "pendiente") return { error: "Esta solicitud ya no está pendiente." };

  // Copia la firma a la carpeta de la solicitud: si el socio cambia su firma después, esta no cambia.
  let signaturePath = profile.signature_path as string;
  if (signaturePath !== "sello-e") {
    const dest = `firmas/${requestId}/socio-${user.id}.png`;
    const { error } = await supabase.storage.from(BUCKET).copy(signaturePath, dest);
    if (error) return { error: "No se pudo usar tu firma guardada. Vuelve a guardarla." };
    signaturePath = dest;
  }

  const h = await headers();
  const { data, error } = await supabase
    .from("signers")
    .update({ signed_at: new Date().toISOString(), signature_path: signaturePath, ip: clientIp(h), user_agent: userAgent(h) })
    .eq("request_id", requestId)
    .eq("profile_id", user.id)
    .is("signed_at", null)
    .select("id");
  if (error || !data?.length) return { error: "No tienes una firma pendiente en esta solicitud." };

  const sealed = await trySeal(requestId);
  revalidatePath("/panel", "layout");
  return sealed;
}

/** Sella si ya firmaron todos. Requiere la clave de servidor (service_role). */
async function trySeal(requestId: string): Promise<SignResult> {
  if (!hasAdminKey()) {
    return { error: "Tu firma quedó registrada, pero falta configurar SUPABASE_SERVICE_ROLE_KEY para sellar el PDF." };
  }
  const res = await sealIfComplete(createAdminClient(), requestId);
  return res.ok ? { sealed: true } : { error: res.error };
}

export async function retrySeal(requestId: string): Promise<SignResult> {
  await getCurrentUser();
  if (!uuid.safeParse(requestId).success) return { error: "Datos inválidos." };
  const res = await trySeal(requestId);
  revalidatePath("/panel", "layout");
  return res;
}

/** Nuevo enlace para un cliente (el anterior deja de servir). */
export async function regenerateLink(signerId: string): Promise<SignResult> {
  await getCurrentUser();
  if (!uuid.safeParse(signerId).success) return { error: "Datos inválidos." };
  if (!hasAdminKey()) return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY." };
  const admin = createAdminClient();
  const { data: s } = await admin.from("signers").select("name, kind, signed_at, request_id").eq("id", signerId).single();
  if (!s || s.kind !== "cliente" || s.signed_at) return { error: "Este firmante ya firmó o no es un cliente." };
  const t = newToken();
  const { error } = await admin
    .from("signers")
    .update({ token_hash: t.hash, token_expires_at: new Date(Date.now() + LINK_DAYS * 86_400_000).toISOString() })
    .eq("id", signerId);
  if (error) return { error: "No se pudo generar el enlace." };
  return { links: [{ name: s.name, url: `${appUrl()}/firmar/${t.token}` }] };
}

export async function cancelRequest(requestId: string): Promise<SignResult> {
  await getCurrentUser();
  if (!uuid.safeParse(requestId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { data } = await supabase
    .from("signature_requests")
    .update({ status: "cancelada" })
    .eq("id", requestId)
    .eq("status", "pendiente")
    .select("document_id");
  if (!data?.length) return { error: "No se pudo cancelar." };
  const docId = (data[0] as { document_id: string | null }).document_id;
  if (docId) await supabase.from("documents").update({ status: "borrador" }).eq("id", docId).eq("status", "en_firma");
  revalidatePath("/panel", "layout");
  return {};
}

/** Guarda la firma del socio: una imagen ya subida a Storage o el sello E. */
export async function saveMySignature(pathOrSello: string): Promise<SignResult> {
  const user = await getCurrentUser();
  const ok = pathOrSello === "sello-e" || new RegExp(`^firmas/socios/${user.id}/[0-9a-f-]{36}\\.png$`).test(pathOrSello);
  if (!ok) return { error: "Firma inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ signature_path: pathOrSello }).eq("id", user.id);
  if (error) return { error: "No se pudo guardar tu firma. ¿Ya se aplicó la migración 006?" };
  revalidatePath("/panel/firmas");
  return {};
}

/** URL firmada de 5 minutos para ver un PDF de la solicitud. */
export async function getRequestPdfUrl(requestId: string, which: "original" | "firmado"): Promise<{ url?: string; error?: string }> {
  await getCurrentUser();
  if (!uuid.safeParse(requestId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { data: req } = await supabase.from("signature_requests").select("original_path, signed_path, title").eq("id", requestId).single();
  const p = which === "firmado" ? req?.signed_path : req?.original_path;
  if (!p) return { error: "Aún no hay PDF firmado." };
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p, 300);
  return data ? { url: data.signedUrl } : { error: "No se pudo abrir el PDF." };
}
