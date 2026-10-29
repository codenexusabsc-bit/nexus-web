import { connection } from "next/server";

/**
 * Verificación de la Fase 0: confirma que el sitio en Netlify llega a Supabase.
 * Solo consulta el endpoint público de salud de Auth; no expone datos.
 */
export async function GET() {
  await connection();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json({ supabase: "sin configurar" }, { status: 500 });
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
    });
    return Response.json(
      { supabase: res.ok ? "ok" : `error ${res.status}` },
      { status: res.ok ? 200 : 502 }
    );
  } catch {
    return Response.json({ supabase: "sin conexión" }, { status: 502 });
  }
}
