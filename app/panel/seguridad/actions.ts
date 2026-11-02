"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface EnrollStart {
  error?: string;
  factorId?: string;
  qr?: string;
  secret?: string;
}

/** Paso 1: crea un factor TOTP sin verificar y devuelve el QR para la app autenticadora. */
export async function startEnroll(): Promise<EnrollStart> {
  await getCurrentUser();
  const supabase = await createClient();
  // Quita intentos anteriores abandonados; los factores ya verificados no se tocan.
  const { data: all } = await supabase.auth.mfa.listFactors();
  for (const f of all?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "Nexus Ingeniería", friendlyName: `Nexus ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data) return { error: "No se pudo iniciar. ¿Está activado el MFA (TOTP) en Supabase → Authentication?" };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Paso 2: el socio escribe el primer código para demostrar que escaneó bien el QR. */
export async function confirmEnroll(factorId: string, code: string): Promise<{ error?: string }> {
  await getCurrentUser();
  if (!z.uuid().safeParse(factorId).success || !/^\d{6}$/.test(code.replace(/\s/g, ""))) return { error: "El código tiene 6 números." };
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, "") });
  if (error) return { error: "Código incorrecto. Revisa que la hora de tu celular sea automática." };
  revalidatePath("/panel/seguridad");
  return {};
}

/** Desactiva el segundo factor. Supabase exige que la sesión ya esté verificada (aal2). */
export async function removeFactor(factorId: string): Promise<{ error?: string }> {
  await getCurrentUser();
  if (!z.uuid().safeParse(factorId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: "No se pudo desactivar." };
  revalidatePath("/panel/seguridad");
  return {};
}
