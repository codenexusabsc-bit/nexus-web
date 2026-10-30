import { Suspense } from "react";
import type { Metadata } from "next";
import { Download, ExternalLink, QrCode } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { BRAND_ASSETS, assetUrl } from "@/lib/marca";
import { appUrl } from "@/lib/firmas/util";
import { getMembers } from "@/lib/tarjetas";
import { Palette } from "@/components/marca/Palette";
import { EmailSignature } from "@/components/marca/EmailSignature";

export const metadata: Metadata = { title: "Kit de marca" };

export default function MarcaPage() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold text-navy">Kit de marca</h1>
        <p className="text-muted">Logos, colores, firma de correo y tarjetas digitales de Nexus.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">COLORES</h2>
        <Palette />
        <p className="text-xs text-muted">Tipografías: <b>Noto Sans</b> para textos y <b>Silkscreen</b> (pixel) para títulos y la marca.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">LOGOS Y SELLOS</h2>
        {BRAND_ASSETS.map((g) => (
          <div key={g.group}>
            <p className="mb-2 text-sm font-semibold text-navy">{g.group}</p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {g.items.map((a) => {
                const url = assetUrl(a);
                return (
                  <li key={a.file} className="overflow-hidden rounded-xl border border-border bg-white">
                    <div className={`flex h-24 items-center justify-center p-2 ${a.bg === "oscuro" ? "bg-navy" : "bg-bg"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa del archivo de marca tal cual */}
                      <img src={url} alt={a.name} loading="lazy" className="pixelated max-h-full max-w-full object-contain" />
                    </div>
                    <a href={a.access === "privado" ? `${url}?descargar` : url} download={`nexus-${a.file}`} className="flex items-center gap-1 p-2 text-xs font-semibold text-purple hover:underline">
                      <Download size={12} /> {a.name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-border/50" />}>
        <People />
      </Suspense>
    </div>
  );
}

async function People() {
  await getCurrentUser();
  const members = await getMembers();
  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">FIRMA DE CORREO</h2>
        <EmailSignature site={appUrl()} people={members.map((m) => ({ name: m.name, title: m.title, phone: m.phone, email: m.email, cardUrl: m.url }))} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-sm text-purple">TARJETAS DIGITALES</h2>
        <p className="text-sm text-muted">Cada socio tiene una página con botón «Guardar contacto». Imprime el QR en tus tarjetas o compártelo por WhatsApp. Los teléfonos y correos se editan en Sitio web → Equipo.</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.slug} className="flex items-center gap-4 rounded-xl border border-border bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG generado por la ruta del QR */}
              <img src={`/tarjeta/${m.slug}/qr`} alt={`QR de la tarjeta de ${m.name}`} className="size-24 rounded-lg border border-border" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy">{m.name}</p>
                <p className="truncate text-xs text-muted">{m.url}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <a href={`/tarjeta/${m.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-navy hover:border-purple">
                    <ExternalLink size={12} /> Abrir
                  </a>
                  <a href={`/tarjeta/${m.slug}/qr`} download={`qr-${m.slug}.svg`} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-navy hover:border-purple">
                    <QrCode size={12} /> Descargar QR
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
