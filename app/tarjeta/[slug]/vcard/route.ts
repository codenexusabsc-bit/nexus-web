import { getMember, vcard } from "@/lib/tarjetas";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const m = await getMember((await params).slug);
  if (!m) return new Response("No encontrado", { status: 404 });
  return new Response(vcard(m), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${m.slug}.vcf"`,
    },
  });
}
