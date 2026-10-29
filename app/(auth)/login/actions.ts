"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
  email?: string;
}

const loginSchema = z.object({
  email: z.email({ error: "Ingresa un correo electrónico válido." }),
  password: z.string().min(1, { error: "Ingresa tu contraseña." }),
});

export async function signIn(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const email = typeof formData.get("email") === "string"
    ? String(formData.get("email"))
    : "";

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Mensaje genérico: no revela si el correo existe.
    return { error: "Correo o contraseña incorrectos.", email };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
