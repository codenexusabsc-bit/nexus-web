import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PRIVATE_BRAND_FILES } from "@/lib/marca";

/**
 * Sirve los sellos de firma solo a socios con sesión.
 * No están en /public para que nadie los descargue desde la web y los use en documentos falsos.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await params;
  if (!PRIVATE_BRAND_FILES.has(archivo)) {
    return new Response("No encontrado", { status: 404 });
  }
  await getCurrentUser();

  const data = await readFile(path.join(process.cwd(), "private", "marca", archivo));
  const download = request.nextUrl.searchParams.has("descargar");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
      ...(download ? { "Content-Disposition": `attachment; filename="nexus-${archivo}"` } : {}),
    },
  });
}
