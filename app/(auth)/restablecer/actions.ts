"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface ResetState {
  error?: string;
}

const schema = z
  .object({
    password: z.string().min(12, { error: "Usa al menos 12 caracteres." }),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    error: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

/** Cambia la contraseña con la sesión abierta por el enlace de recuperación. */
export async function updatePassword(
  _prevState: ResetState,
  formData: FormData
): Promise<ResetState> {
  const parsed = schema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "La contraseña nueva debe ser distinta de la anterior."
          : "No se pudo cambiar la contraseña. Pide un enlace nuevo e inténtalo otra vez.",
    };
  }

  // Cierra la sesión del enlace: se vuelve a entrar con la contraseña nueva.
  await supabase.auth.signOut();
  redirect("/login?cambio=1");
}
