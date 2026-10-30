import { connection } from "next/server";
import { getPublicServices, getSiteContent } from "@/lib/sitio";
import { renderPresentacion } from "@/lib/presentacion-pdf";

/** PDF de presentación, siempre con el contenido actual del sitio. */
export async function GET() {
  await connection();
  const [content, services] = await Promise.all([getSiteContent(), getPublicServices()]);
  const pdf = await renderPresentacion(content, services);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Presentacion-Nexus-Ingenieria.pdf"',
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
