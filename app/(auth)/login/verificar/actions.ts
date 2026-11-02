"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface VerifyState {
  error?: string;
}

const codeSchema = z.string().regex(/^\d{6}$/, { error: "El código tiene 6 números." });

/** Segundo paso del inicio de sesión: valida el código de la app autenticadora. */
export async function verifyTotp(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const code = codeSchema.safeParse(String(formData.get("code") ?? "").replace(/\s/g, ""));
  if (!code.success) return { error: code.error.issues[0]?.message };

  const supabase = await createClient();
  // Sin sesión de contraseña no hay nada que verificar.
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0]; // solo incluye factores ya verificados
  if (!factor) redirect("/panel");

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.data });
  if (error) return { error: "Código incorrecto o vencido. Prueba con el siguiente." };

  redirect(safeNextPath(formData.get("next")));
}
