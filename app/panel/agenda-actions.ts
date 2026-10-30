"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { addDays, fromBogotaWall, isWallDate, isWallTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export interface AgendaResult {
  error?: string;
}

const uuid = z.uuid({ error: "Identificador inválido." });

const itemSchema = z
  .object({
    id: uuid.optional(),
    type: z.enum(["privado", "compartido", "mensaje"]),
    recipient: uuid.optional(),
    title: z.string().trim().min(1, { error: "Escribe un título." }).max(200),
    notes: z.string().trim().max(2000),
    allDay: z.boolean(),
    date: z.string().refine(isWallDate, { error: "Fecha inválida." }),
    endDate: z.string().refine((v) => v === "" || isWallDate(v), { error: "Fecha final inválida." }),
    startTime: z.string().refine((v) => v === "" || isWallTime(v), { error: "Hora inválida." }),
    endTime: z.string().refine((v) => v === "" || isWallTime(v), { error: "Hora final inválida." }),
  })
  .refine((v) => v.type !== "mensaje" || v.recipient, { error: "Elige a quién va el mensaje.", path: ["recipient"] })
  .refine((v) => v.allDay || v.startTime !== "", { error: "Pon la hora o marca «todo el día».", path: ["startTime"] });

export type AgendaInput = z.input<typeof itemSchema>;

/** Convierte el formulario (horas de Colombia) en instantes para la base de datos. */
function toInstants(v: z.infer<typeof itemSchema>) {
  if (v.allDay) {
    const last = v.endDate && v.endDate > v.date ? v.endDate : v.date;
    return {
      starts_at: fromBogotaWall(`${v.date}T00:00`),
      // fin exclusivo, como lo maneja el calendario
      ends_at: last > v.date ? fromBogotaWall(`${addDays(last, 1)}T00:00`) : null,
    };
  }
  const starts_at = fromBogotaWall(`${v.date}T${v.startTime}`);
  const ends_at = v.endTime && v.endTime > v.startTime ? fromBogotaWall(`${v.date}T${v.endTime}`) : null;
  return { starts_at, ends_at };
}

export async function saveAgendaItem(input: AgendaInput): Promise<AgendaResult> {
  const user = await getCurrentUser();
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const v = parsed.data;
  if (v.type === "mensaje" && v.recipient === user.id) return { error: "No puedes enviarte un mensaje a ti mismo." };

  const row = {
    kind: v.type === "mensaje" ? "mensaje" : "recordatorio",
    title: v.title,
    notes: v.notes,
    all_day: v.allDay,
    shared: v.type === "compartido",
    recipient: v.type === "mensaje" ? v.recipient : null,
    ...toInstants(v),
  };

  const supabase = await createClient();
  const { error } = v.id
    ? await supabase.from("agenda_items").update({ ...row, seen_at: null }).eq("id", v.id).eq("created_by", user.id)
    : await supabase.from("agenda_items").insert(row);
  if (error) return { error: "No se pudo guardar. ¿Ya se aplicó la migración 004?" };
  revalidatePath("/panel");
  return {};
}

/** Arrastrar en el calendario: nuevas fechas en hora de pared de Colombia. */
export async function moveAgendaItem(id: string, start: string, end: string | null, allDay: boolean): Promise<AgendaResult> {
  const user = await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const toInstant = (w: string) => fromBogotaWall(w.length === 10 ? `${w}T00:00` : w);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agenda_items")
    .update({ starts_at: toInstant(start), ends_at: end ? toInstant(end) : null, all_day: allDay })
    .eq("id", id)
    .eq("created_by", user.id)
    .select("id");
  if (error || !data?.length) return { error: "No se pudo mover." };
  revalidatePath("/panel");
  return {};
}

export async function setAgendaDone(id: string, done: boolean): Promise<AgendaResult> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("agenda_items")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: "No se pudo actualizar." };
  revalidatePath("/panel");
  return {};
}

export async function markMessageSeen(id: string): Promise<AgendaResult> {
  const user = await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("agenda_items")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient", user.id)
    .is("seen_at", null);
  if (error) return { error: "No se pudo marcar como leído." };
  revalidatePath("/panel");
  return {};
}

export async function deleteAgendaItem(id: string): Promise<AgendaResult> {
  const user = await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_items").delete().eq("id", id).eq("created_by", user.id);
  if (error) return { error: "No se pudo borrar." };
  revalidatePath("/panel");
  return {};
}
