"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface PResult {
  error?: string;
}

const uuid = z.uuid({ error: "Identificador inválido." });
const refresh = () => revalidatePath("/panel", "layout");

const patchSchema = z.object({
  status: z.enum(["nuevo", "contactado", "cotizado", "ganado", "perdido"]).optional(),
  notes: z.string().max(4000).optional(),
  nextAction: z.string().trim().max(200).optional(),
  nextActionOn: z.union([z.literal(""), z.iso.date()]).nullable().optional(),
  assignedTo: uuid.nullable().optional(),
});

export async function updateProspect(id: string, patch: z.input<typeof patchSchema>): Promise<PResult> {
  await getCurrentUser();
  const parsed = patchSchema.safeParse(patch);
  if (!uuid.safeParse(id).success || !parsed.success) return { error: "Datos inválidos." };
  const p = parsed.data;
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (p.status !== undefined) row.status = p.status;
  if (p.notes !== undefined) row.notes = p.notes;
  if (p.nextAction !== undefined) row.next_action = p.nextAction;
  if (p.nextActionOn !== undefined) row.next_action_on = p.nextActionOn || null;
  if (p.assignedTo !== undefined) row.assigned_to = p.assignedTo;
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update(row).eq("id", id);
  if (error) return { error: "No se pudo guardar. ¿Ya se aplicó la migración 009?" };
  refresh();
  return {};
}

const newSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Escribe el nombre." }).max(120),
    company: z.string().trim().max(120),
    email: z.union([z.literal(""), z.email({ error: "Correo inválido." })]),
    phone: z.string().trim().max(40),
    service: z.string().trim().max(80),
    message: z.string().trim().min(1, { error: "Escribe de qué se trata." }).max(3000),
  })
  .refine((v) => v.email || v.phone, { error: "Pon un correo o un teléfono." });

export async function createProspect(input: z.input<typeof newSchema>): Promise<PResult> {
  await getCurrentUser();
  const parsed = newSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({ ...parsed.data, source: "manual" });
  if (error) return { error: "No se pudo crear el prospecto." };
  refresh();
  return {};
}

export async function deleteProspect(id: string): Promise<PResult> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar." };
  refresh();
  return {};
}

/** Crea una cotización con los datos del prospecto y lo pasa a "cotizado". */
export async function prospectToQuote(id: string): Promise<void> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) throw new Error("Datos inválidos.");
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("name, company, email, service").eq("id", id).single();
  if (!lead) throw new Error("No se encontró el prospecto.");
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      client_name: (lead.company || lead.name).slice(0, 120),
      client_email: lead.email ?? "",
      title: lead.service ? `Cotización · ${lead.service}`.slice(0, 200) : "Cotización",
      lead_id: id,
      items: [{ description: lead.service ?? "", qty: 1, unitPrice: 0 }],
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("No se pudo crear la cotización. ¿Ya se aplicó la migración 008?");
  await supabase.from("leads").update({ status: "cotizado", updated_at: new Date().toISOString() }).eq("id", id);
  refresh();
  redirect(`/panel/cotizaciones/${data.id}`);
}
