"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteObject, isR2Configured, presignDownload, presignUpload } from "@/lib/almacenamiento";
import { FILE_KEY_RE, FILE_TYPES, MAX_FILE_BYTES, safeFileName } from "@/lib/contabilidad";

export interface CResult {
  error?: string;
}

const uuid = z.uuid({ error: "Identificador inválido." });
const refresh = () => revalidatePath("/panel", "layout");

const uploadSchema = z.object({
  fileName: z.string().min(1).max(200),
  mime: z.string().refine((m) => m in FILE_TYPES, { error: "Solo se aceptan imágenes JPG, PNG, WebP o PDF." }),
  size: z.number().int().positive().max(MAX_FILE_BYTES, { error: "El archivo pesa más de 10 MB." }),
});

/** Paso 1 de una subida: el servidor valida y entrega una URL firmada para subir directo a R2. */
export async function requestUpload(input: z.input<typeof uploadSchema>): Promise<{ error?: string; key?: string; url?: string }> {
  await getCurrentUser();
  if (!isR2Configured()) return { error: "Falta configurar Cloudflare R2 en el servidor." };
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Archivo inválido." };
  const { fileName, mime, size } = parsed.data;
  const key = `contabilidad/${crypto.randomUUID()}/${safeFileName(fileName)}`;
  try {
    return { key, url: await presignUpload(key, mime, size) };
  } catch {
    return { error: "No se pudo preparar la subida." };
  }
}

const entrySchema = z
  .object({
    kind: z.enum(["ingreso", "gasto"]),
    concept: z.string().trim().min(1, { error: "Escribe el concepto." }).max(200),
    counterparty: z.string().trim().max(120),
    amount: z.number({ error: "Escribe el valor." }).positive({ error: "El valor debe ser mayor que cero." }).max(100_000_000_000),
    entryDate: z.iso.date({ error: "Fecha inválida." }),
    reference: z.string().trim().max(80),
    notes: z.string().trim().max(1000),
    collectionAccountId: uuid.nullable(),
    file: z.object({ key: z.string().regex(FILE_KEY_RE), name: z.string().max(160), mime: z.string().refine((m) => m in FILE_TYPES), size: z.number().int().min(0).max(MAX_FILE_BYTES) }).nullable(),
  })
  .refine((v) => v.kind === "ingreso" || v.collectionAccountId === null, { error: "Un gasto no se imputa a una cuenta de cobro." });

/** Paso 2: registra el movimiento (y su archivo, ya subido) en la base de datos. */
export async function createEntry(input: z.input<typeof entrySchema>): Promise<CResult> {
  await getCurrentUser();
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("ledger_entries").insert({
    kind: d.kind,
    concept: d.concept,
    counterparty: d.counterparty,
    amount: d.amount,
    entry_date: d.entryDate,
    reference: d.reference,
    notes: d.notes,
    collection_account_id: d.collectionAccountId,
    file_key: d.file?.key ?? null,
    file_name: d.file?.name ?? "",
    file_mime: d.file?.mime ?? "",
    file_size: d.file?.size ?? 0,
  });
  if (error) {
    // El objeto ya está en R2 pero no quedó registrado: se retira para no dejar archivos huérfanos.
    if (d.file) await deleteObject(d.file.key).catch(() => {});
    return { error: "No se pudo guardar. ¿Ya se aplicó la migración 012?" };
  }
  refresh();
  return {};
}

export async function deleteEntry(id: string): Promise<CResult> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { data: row } = await supabase.from("ledger_entries").select("file_key").eq("id", id).maybeSingle();
  const { error } = await supabase.from("ledger_entries").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar." };
  if (row?.file_key && isR2Configured()) await deleteObject(row.file_key as string).catch(() => {});
  refresh();
  return {};
}

/** URL temporal para ver el comprobante. RLS garantiza que solo un socio lee la llave. */
export async function getFileUrl(id: string): Promise<{ error?: string; url?: string }> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  if (!isR2Configured()) return { error: "Falta configurar Cloudflare R2 en el servidor." };
  const supabase = await createClient();
  const { data } = await supabase.from("ledger_entries").select("file_key").eq("id", id).maybeSingle();
  if (!data?.file_key) return { error: "Este movimiento no tiene archivo." };
  try {
    return { url: await presignDownload(data.file_key as string) };
  } catch {
    return { error: "No se pudo abrir el archivo." };
  }
}
