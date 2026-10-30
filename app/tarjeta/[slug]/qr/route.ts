import { getMember, qrSvg } from "@/lib/tarjetas";

/** QR de la tarjeta digital en SVG (para imprimir en tarjetas físicas o en el local). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const m = await getMember((await params).slug);
  if (!m) return new Response("No encontrado", { status: 404 });
  return new Response(await qrSvg(m.url), {
    headers: { "Content-Type": "image/svg+xml", "Content-Disposition": `inline; filename="qr-${m.slug}.svg"` },
  });
}
