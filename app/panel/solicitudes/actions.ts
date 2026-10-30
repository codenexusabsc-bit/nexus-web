"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/panel/carpeta/actions";

const uuid = z.uuid({ error: "Identificador inválido." });

const requestSchema = z.object({
  title: z.string().trim().min(1, { error: "Escribe qué documento necesitas." }).max(200),
  description: z.string().trim().max(2000),
  projectId: uuid,
  requestedTo: uuid,
  dueDate: z.union([z.literal(""), z.iso.date({ error: "Fecha inválida." })]),
});

export async function createRequest(_prev: ActionResult, formData: FormData): Promise<ActionResult & { ok?: number }> {
  const user = await getCurrentUser();
  const parsed = requestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    projectId: formData.get("projectId"),
    requestedTo: formData.get("requestedTo"),
    dueDate: formData.get("dueDate") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (parsed.data.requestedTo === user.id) return { error: "No puedes pedirte un documento a ti mismo." };

  const supabase = await createClient();
  const { error } = await supabase.from("doc_requests").insert({
    title: parsed.data.title,
    description: parsed.data.description,
    project_id: parsed.data.projectId,
    requested_to: parsed.data.requestedTo,
    due_date: parsed.data.dueDate || null,
  });
  if (error) return { error: "No se pudo crear la solicitud." };
  revalidatePath("/panel", "layout");
  return { ok: Date.now() };
}

/** Quien pidió acepta la entrega o la devuelve con un comentario. */
export async function reviewRequest(
  requestId: string,
  decision: "accepted" | "returned",
  comment = ""
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!uuid.safeParse(requestId).success) return { error: "Datos inválidos." };
  const clean = comment.trim().slice(0, 1000);
  if (decision === "returned" && !clean) return { error: "Explica qué falta para devolverla." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doc_requests")
    .update({
      status: decision,
      response_comment: clean,
      closed_at: decision === "accepted" ? new Date().toISOString() : null,
    })
    .eq("id", requestId)
    .eq("requested_by", user.id)
    .eq("status", "delivered")
    .select("id");
  if (error || !data?.length) return { error: "No se pudo actualizar la solicitud." };
  revalidatePath("/panel", "layout");
  return {};
}

export async function deleteRequest(requestId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!uuid.safeParse(requestId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("doc_requests").delete().eq("id", requestId).eq("requested_by", user.id);
  if (error) return { error: "No se pudo borrar la solicitud." };
  revalidatePath("/panel", "layout");
  return {};
}
