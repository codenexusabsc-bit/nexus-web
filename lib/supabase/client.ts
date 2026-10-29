import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para Client Components.
 * Usa solo la anon key; los datos los protege RLS.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
