"use server";

import { z } from "zod";
import { createAnonClient } from "@/lib/supabase/anon";

export interface LeadState {
  error?: string;
  ok?: boolean;
}

const leadSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Escribe tu nombre." }).max(120),
    email: z.union([z.literal(""), z.email({ error: "El correo no es válido." })]),
    phone: z.string().trim().max(40),
    company: z.string().trim().max(120),
    service: z.string().trim().max(80),
    message: z.string().trim().min(5, { error: "Cuéntanos un poco más." }).max(3000),
  })
  .refine((v) => v.email !== "" || v.phone !== "", {
    error: "Déjanos un correo o un teléfono para responderte.",
  });

/** Formulario de contacto de la landing → tabla leads (solo inserción para anon). */
export async function submitLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  // Campo trampa: las personas no lo ven; los bots lo llenan.
  if (String(formData.get("website") ?? "") !== "") return { ok: true };

  const parsed = leadSchema.safeParse({
    name: formData.get("name") ?? "",
    email: String(formData.get("email") ?? "").trim(),
    phone: formData.get("phone") ?? "",
    company: formData.get("company") ?? "",
    service: formData.get("service") ?? "",
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { error } = await createAnonClient().from("leads").insert(parsed.data);
  if (error) return { error: "No pudimos enviar tu mensaje. Escríbenos por WhatsApp." };
  return { ok: true };
}
