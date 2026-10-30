"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { SITE_TAG, contentSchema, type SiteContent } from "@/lib/sitio";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/panel/carpeta/actions";

const uuid = z.uuid({ error: "Identificador inválido." });

function published() {
  updateTag(SITE_TAG); // la landing y el PDF muestran el cambio en la siguiente visita
  revalidatePath("/panel/sitio");
}

export async function saveContent(content: SiteContent): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = contentSchema.safeParse(content);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue?.path.join(" › ") || "Contenido"}: ${issue?.message ?? "inválido"}` };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .update({ content: parsed.data, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", true)
    .select("id");
  if (error || !data?.length) return { error: "No se pudo guardar. ¿Ya se aplicó la migración 003?" };
  published();
  return {};
}

const serviceSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, { error: "El servicio necesita nombre." }).max(80),
  description: z.string().trim().max(400),
  idealFor: z.string().trim().max(200),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: "Color inválido." }),
  visible: z.boolean(),
});

export async function saveService(input: z.input<typeof serviceSchema>): Promise<ActionResult> {
  await getCurrentUser();
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { id, idealFor, ...rest } = parsed.data;
  const row = { ...rest, ideal_for: idealFor };

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("services").update(row).eq("id", id);
    if (error) return { error: "No se pudo guardar el servicio." };
  } else {
    const { data: last } = await supabase.from("services").select("position").order("position", { ascending: false }).limit(1);
    const position = ((last?.[0] as { position: number } | undefined)?.position ?? 0) + 1;
    const { error } = await supabase.from("services").insert({ ...row, position });
    if (error) return { error: "No se pudo crear el servicio." };
  }
  published();
  return {};
}

/** Guarda el orden: la lista de ids en el orden deseado. */
export async function reorderServices(ids: string[]): Promise<ActionResult> {
  await getCurrentUser();
  if (!ids.every((i) => uuid.safeParse(i).success)) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const results = await Promise.all(
    ids.map((id, i) => supabase.from("services").update({ position: i + 1 }).eq("id", id))
  );
  if (results.some((r) => r.error)) return { error: "No se pudo guardar el orden." };
  published();
  return {};
}

export async function deleteService(id: string): Promise<ActionResult> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar el servicio." };
  published();
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
