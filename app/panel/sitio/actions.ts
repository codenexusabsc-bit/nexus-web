"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { SITE_TAG, draftSchema } from "@/lib/sitio";
import type { SiteDraft } from "@/lib/sitio-shared";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/panel/carpeta/actions";

const uuid = z.uuid({ error: "Identificador inválido." });

function describe(error: z.ZodError): string {
  const issue = error.issues[0];
  const where = issue?.path.join(" › ");
  return `${where ? `${where}: ` : ""}${issue?.message ?? "contenido inválido"}`;
}

/** Guarda el borrador (no cambia la página pública). */
export async function saveDraft(draft: SiteDraft): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success) return { error: describe(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .update({ draft: parsed.data, draft_updated_at: new Date().toISOString(), draft_updated_by: user.id })
    .eq("id", true)
    .select("id");
  if (error || !data?.length) return { error: "No se pudo guardar el borrador. ¿Ya se aplicó la migración 007?" };
  revalidatePath("/panel/sitio", "layout");
  return {};
}

/** Publica el borrador: la página pública y el PDF lo muestran en la siguiente visita. */
export async function publishSite(draft: SiteDraft): Promise<ActionResult> {
  const saved = await saveDraft(draft);
  if (saved.error) return saved;
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_site");
  if (error) return { error: "No se pudo publicar." };
  updateTag(SITE_TAG);
  revalidatePath("/panel/sitio", "layout");
  return {};
}

export async function discardDraft(): Promise<ActionResult> {
  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({ draft: null, draft_updated_at: null, draft_updated_by: null })
    .eq("id", true);
  if (error) return { error: "No se pudo descartar el borrador." };
  revalidatePath("/panel/sitio", "layout");
  return {};
}

const LEAD_STATUS = ["nuevo", "contactado", "cotizado", "ganado", "perdido"] as const;

export async function setLeadStatus(id: string, status: string): Promise<ActionResult> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success || !LEAD_STATUS.includes(status as (typeof LEAD_STATUS)[number])) {
    return { error: "Datos inválidos." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) return { error: "No se pudo actualizar el mensaje." };
  revalidatePath("/panel", "layout");
  return {};
}

/** Publica el borrador ya guardado (desde la vista previa). */
export async function publishCurrentDraft(): Promise<ActionResult> {
  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_site");
  if (error) return { error: "No se pudo publicar." };
  updateTag(SITE_TAG);
  revalidatePath("/panel/sitio", "layout");
  return {};
}
