import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Globe, Mail, MessageCircle, Phone, UserPlus } from "lucide-react";
import { getMember, qrSvg } from "@/lib/tarjetas";
import { SpaceBackground } from "@/components/space/SpaceBackground";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = await getMember((await params).slug);
  return m ? { title: m.name, description: `${m.title} en Nexus Ingeniería` } : { title: "Tarjeta" };
}

/** Tarjeta digital pública de cada socio, con botón para guardar el contacto y QR. */
export default function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-navy p-5">
      <SpaceBackground stars={130} shooting={6} seed={71} />
      <Suspense fallback={<div className="h-[70dvh] w-full max-w-sm animate-pulse rounded-3xl bg-white/10" />}>
        <Card params={params} />
      </Suspense>
    </main>
  );
}

async function Card({ params }: { params: Promise<{ slug: string }> }) {
  const m = await getMember((await params).slug);
  if (!m) notFound();
  const qr = await qrSvg(m.url);
  const initials = m.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
  const btn = "flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white transition hover:-translate-y-0.5 hover:border-cyan hover:bg-white/10";

  return (
    <div className="rise relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-navy/80 p-6 shadow-2xl shadow-purple/30 backdrop-blur">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <Image src="/marca/portal.png" alt="" width={248} height={327} unoptimized className="pixelated portal-float h-auto w-24 drop-shadow-[0_0_24px_rgba(147,51,234,0.6)]" />
          <span className="absolute -right-3 -bottom-1 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet to-deep font-pixel text-sm text-white ring-4 ring-navy">{initials}</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{m.name}</h1>
          <p className="text-cyan">{m.title}</p>
          <p className="mt-1 font-pixel text-[0.65rem] tracking-[0.3em] text-white/50">NEXUS INGENIERÍA</p>
        </div>
        {m.text && <p className="text-sm text-white/70">{m.text}</p>}
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        <a href={`/tarjeta/${m.slug}/vcard`} className="shine flex items-center justify-center gap-2 rounded-xl bg-violet px-4 py-3 font-semibold text-white hover:bg-orchid">
          <UserPlus size={18} /> Guardar contacto
        </a>
        {m.whatsapp && (
          <a href={`https://wa.me/${m.whatsapp}?text=${encodeURIComponent(`Hola ${m.name.split(" ")[0]}, vi tu tarjeta de Nexus Ingeniería.`)}`} target="_blank" rel="noopener noreferrer" className={btn}>
            <MessageCircle size={18} className="text-[#25D366]" /> WhatsApp
          </a>
        )}
        {m.phone && (
          <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className={btn}>
            <Phone size={18} className="text-cyan" /> {m.phone}
          </a>
        )}
        {m.email && (
          <a href={`mailto:${m.email}`} className={btn}>
            <Mail size={18} className="text-cyan" /> {m.email}
          </a>
        )}
        <Link href="/" className={btn}>
          <Globe size={18} className="text-cyan" /> Ver servicios
        </Link>
      </div>

      <details className="mt-5 text-center text-xs text-white/60">
        <summary className="cursor-pointer">Mostrar código QR</summary>
        <div className="mx-auto mt-3 w-40 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
      </details>
    </div>
  );
}
