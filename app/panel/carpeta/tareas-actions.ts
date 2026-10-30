"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface TResult {
  error?: string;
}

const uuid = z.uuid({ error: "Identificador inválido." });
const refresh = () => revalidatePath("/panel", "layout");

export async function createTask(projectId: string, title: string, assignedTo: string | null, dueOn: string): Promise<TResult> {
  await getCurrentUser();
  const t = title.trim();
  if (!uuid.safeParse(projectId).success || !t || t.length > 200) return { error: "Escribe la tarea." };
  if (assignedTo && !uuid.safeParse(assignedTo).success) return { error: "Datos inválidos." };
  if (dueOn && !/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) return { error: "Fecha inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({ project_id: projectId, title: t, assigned_to: assignedTo, due_on: dueOn || null, position: Date.now() / 1000 });
  if (error) return { error: "No se pudo crear la tarea. ¿Ya se aplicó la migración 009?" };
  refresh();
  return {};
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["pendiente", "en_curso", "hecha"]).optional(),
  assignedTo: uuid.nullable().optional(),
  dueOn: z.union([z.literal(""), z.iso.date()]).nullable().optional(),
  position: z.number().optional(),
});

export async function updateTask(id: string, patch: z.input<typeof patchSchema>): Promise<TResult> {
  await getCurrentUser();
  const parsed = patchSchema.safeParse(patch);
  if (!uuid.safeParse(id).success || !parsed.success) return { error: "Datos inválidos." };
  const p = parsed.data;
  const row: Record<string, unknown> = {};
  if (p.title !== undefined) row.title = p.title;
  if (p.notes !== undefined) row.notes = p.notes;
  if (p.status !== undefined) {
    row.status = p.status;
    row.completed_at = p.status === "hecha" ? new Date().toISOString() : null;
  }
  if (p.assignedTo !== undefined) row.assigned_to = p.assignedTo;
  if (p.dueOn !== undefined) row.due_on = p.dueOn || null;
  if (p.position !== undefined) row.position = p.position;
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(row).eq("id", id);
  if (error) return { error: "No se pudo actualizar la tarea." };
  refresh();
  return {};
}

export async function deleteTask(id: string): Promise<TResult> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar." };
  refresh();
  return {};
}
