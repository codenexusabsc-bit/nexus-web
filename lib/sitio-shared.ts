/** Tipos y utilidades del sitio que se usan tanto en servidor como en cliente. */
import type { SiteContent, Service } from "@/lib/sitio";

export type { SiteContent, Service };

/** Enlace de WhatsApp con mensaje inicial. */
export function whatsappUrl(number: string, text = "Hola, quiero información sobre los servicios de Nexus Ingeniería."): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** Borrador del sitio: contenido más la lista completa de servicios en orden. */
export interface SiteDraft {
  content: SiteContent;
  services: Service[];
}

/** "Álvaro Javier Bermúdez" → "alvaro-javier-bermudez" (dirección de la tarjeta digital). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
