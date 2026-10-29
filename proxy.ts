import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Proxy (antes "middleware" en Next.js < 16).
 * Refresca la sesión y protege las rutas privadas del panel.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Solo donde importa la sesión: panel, autenticación y recuperación.
    // La landing y demás páginas públicas no pasan por aquí (las sirve la CDN).
    "/panel/:path*",
    "/login",
    "/restablecer",
  ],
};
