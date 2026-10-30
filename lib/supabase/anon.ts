import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente anónimo sin cookies para páginas públicas (landing, contacto).
 * Solo puede lo que RLS y los grants permiten a `anon`.
 */
export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
