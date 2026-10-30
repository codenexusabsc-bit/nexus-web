import "server-only";
import QRCode from "qrcode";
import { getSiteContent } from "@/lib/sitio";
import { slugify } from "@/lib/sitio-shared";
import { appUrl } from "@/lib/firmas/util";

export interface Member {
  slug: string;
  name: string;
  title: string;
  text: string;
  phone: string;
  email: string;
  whatsapp: string;
  url: string;
}

/** Integrantes del equipo (del contenido publicado) con sus datos de contacto. */
export async function getMembers(): Promise<Member[]> {
  const site = await getSiteContent();
  return site.team.map((m, i) => {
    const phone = m.phone || site.contact.phones[i] || site.contact.phones[0] || "";
    const digits = phone.replace(/\D/g, "");
    const slug = slugify(m.name);
    return {
      slug,
      name: m.name,
      title: m.title,
      text: m.text,
      phone,
      email: m.email || site.contact.email,
      whatsapp: digits.length === 10 ? `57${digits}` : digits || site.contact.whatsapp,
      url: `${appUrl()}/tarjeta/${slug}`,
    };
  });
}

export async function getMember(slug: string): Promise<Member | null> {
  return (await getMembers()).find((m) => m.slug === slug) ?? null;
}

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0E0A26", light: "#FFFFFF" } });
}

/** vCard 3.0 para "Guardar contacto" en el celular. */
export function vcard(m: Member): string {
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1");
  const [first, ...rest] = m.name.split(/\s+/);
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(rest.join(" "))};${esc(first)};;;`,
    `FN:${esc(m.name)}`,
    "ORG:Nexus Ingeniería",
    `TITLE:${esc(m.title)}`,
    m.phone ? `TEL;TYPE=CELL:${m.phone.replace(/\D/g, "").length === 10 ? `+57${m.phone.replace(/\D/g, "")}` : m.phone.replace(/[^\d+]/g, "")}` : "",
    m.email ? `EMAIL;TYPE=WORK:${m.email}` : "",
    `URL:${appUrl()}`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\r\n");
}
