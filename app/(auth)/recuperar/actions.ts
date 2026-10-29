"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface RecoverState {
  error?: string;
  sent?: boolean;
}

const schema = z.object({
  email: z.email({ error: "Ingresa un correo electrónico válido." }),
});

/** Envía el enlace de recuperación. La respuesta es la misma exista o no el correo. */
export async function requestReset(
  _prevState: RecoverState,
  formData: FormData
): Promise<RecoverState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/confirm?next=/restablecer`,
  });

  return { sent: true };
}
