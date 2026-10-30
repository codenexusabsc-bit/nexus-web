import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role: salta RLS. SOLO en el servidor y solo para lo que un
 * visitante sin cuenta no puede hacer por sí mismo (firmar con un enlace, verificar,
 * sellar el PDF). Nunca se importa en componentes de cliente.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Falta la variable SUPABASE_SERVICE_ROLE_KEY en el servidor.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasAdminKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
