import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  title: string;
}

/**
 * Capa de acceso a la sesión (DAL).
 * Devuelve el socio autenticado o redirige a /login o /sin-acceso.
 * Lee cookies: llamarla siempre dentro de un <Suspense>.
 * `cache` evita repetir la consulta dentro de la misma petición.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, title, role")
    .eq("id", claims.sub)
    .single();

  // Sin perfil o sin rol de socio no hay acceso: el alta es administrativa
  // (ver README). No redirigir a /login: el proxy devolvería al panel (bucle).
  if (!profile || profile.role !== "partner") {
    redirect("/sin-acceso");
  }

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    fullName: profile.full_name,
    title: profile.title,
  };
});

/** Solo se permiten rutas internas para evitar redirecciones abiertas. */
export function safeNextPath(value: unknown, fallback = "/panel"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  if (value === "/login" || value.startsWith("/login?")) return fallback;
  return value;
}
