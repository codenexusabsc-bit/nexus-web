import { z } from "zod";

export interface PortfolioItem {
  id: string;
  title: string;
  client: string;
  summary: string;
  tags: string[];
  url: string;
  imagePath: string | null;
  color: string;
  position: number;
  visible: boolean;
}

export const portfolioSchema = z.object({
  title: z.string().trim().min(1, { error: "Escribe el título." }).max(80),
  client: z.string().trim().max(80),
  summary: z.string().trim().max(400),
  tags: z.array(z.string().trim().min(1).max(24)).max(6),
  url: z.union([z.literal(""), z.url({ protocol: /^https$/, error: "El enlace debe empezar por https://" })]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: "Color inválido." }),
  visible: z.boolean(),
});

export type PortfolioInput = z.input<typeof portfolioSchema>;

/** URL pública de una imagen del bucket "portafolio". */
export function portfolioImageUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/portafolio/${path}` : null;
}

export interface PortfolioRow {
  id: string;
  title: string;
  client: string;
  summary: string;
  tags: string[];
  url: string;
  image_path: string | null;
  color: string;
  position: number;
  visible: boolean;
}

export function toPortfolioItem(r: PortfolioRow): PortfolioItem {
  return {
    id: r.id,
    title: r.title,
    client: r.client,
    summary: r.summary,
    tags: r.tags ?? [],
    url: r.url,
    imagePath: r.image_path,
    color: r.color,
    position: r.position,
    visible: r.visible,
  };
}
