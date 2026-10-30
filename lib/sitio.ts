import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { createAnonClient } from "@/lib/supabase/anon";

/** Etiqueta de caché del contenido público: se invalida al guardar desde /panel/sitio. */
export const SITE_TAG = "sitio";

const item = z.object({
  title: z.string().trim().min(1).max(80),
  text: z.string().trim().max(300),
});

export const contentSchema = z.object({
  hero: z.object({
    title: z.string().trim().min(1).max(80),
    subtitle: z.string().trim().max(400),
    cta: z.string().trim().min(1).max(60),
  }),
  about: z.object({
    title: z.string().trim().min(1).max(80),
    body: z.string().trim().max(2000),
  }),
  steps: z.array(item).min(1).max(8),
  team: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        title: z.string().trim().max(80),
        text: z.string().trim().max(300),
      })
    )
    .max(6),
  values: z.array(item).max(8),
  contact: z.object({
    email: z.union([z.literal(""), z.email({ error: "Correo de contacto inválido." })]),
    phones: z.array(z.string().trim().min(1).max(30)).max(4),
    whatsapp: z.string().regex(/^\d{8,15}$/, { error: "WhatsApp: solo números con indicativo, p. ej. 573219543616." }),
    city: z.string().trim().max(80),
  }),
});

export type SiteContent = z.infer<typeof contentSchema>;

export const draftServiceSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, { error: "Cada servicio necesita nombre." }).max(80),
  description: z.string().trim().max(400),
  idealFor: z.string().trim().max(200),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: "Color de servicio inválido." }),
  position: z.number().int(),
  visible: z.boolean(),
});

export const draftSchema = z.object({
  content: contentSchema,
  services: z.array(draftServiceSchema).max(20),
});

export interface Service {
  id: string;
  name: string;
  description: string;
  idealFor: string;
  color: string;
  position: number;
  visible: boolean;
}

/** Contenido de respaldo (el de la Presentación), por si la base de datos no responde. */
export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    title: "Construimos su mundo digital",
    subtitle:
      "Páginas web, software a la medida, branding y redes para negocios que quieren crecer en digital, con dos ingenieros a cargo de cada proyecto de principio a fin.",
    cta: "Primera consulta sin costo",
  },
  about: {
    title: "Quiénes somos",
    body: "Somos una empresa de ingeniería que une la electrónica, las telecomunicaciones y el desarrollo de software. Convertimos la idea de cada cliente en una herramienta digital que funciona, se ve bien y es fácil de usar.\n\nTrabajamos directo con usted, sin intermediarios: quien le escucha es quien construye. Cada proyecto se entrega con capacitación y un manual de uso.",
  },
  steps: [
    { title: "Reunión inicial", text: "Conocemos su negocio, sus necesidades y su presupuesto." },
    { title: "Propuesta", text: "Le enviamos alcance, cronograma y precio por escrito." },
    { title: "Diseño", text: "Le mostramos cómo se verá y ajustamos hasta que le guste." },
    { title: "Desarrollo y pruebas", text: "Construimos y probamos en computador y celular." },
    { title: "Entrega", text: "Publicamos, le capacitamos y le dejamos un manual." },
  ],
  team: [
    { name: "Sebastián Claros", title: "Ingeniero electrónico", text: "Desarrollo de software y páginas web, automatización e integración de sistemas y dispositivos." },
    { name: "Álvaro Javier Bermúdez", title: "Ingeniero en telecomunicaciones", text: "Redes y conectividad, infraestructura en la nube, hosting y seguridad." },
  ],
  values: [
    { title: "Ingeniería real", text: "Software, hardware y redes bajo un mismo equipo." },
    { title: "Todo a la medida", text: "Cada solución parte de cómo trabaja usted." },
    { title: "Entrega completa", text: "Capacitación, manual y acompañamiento." },
    { title: "Trato directo", text: "Siempre habla con quien construye su proyecto." },
  ],
  contact: {
    email: "codenexus.absc@gmail.com",
    phones: ["321 954 3616", "320 322 6265"],
    whatsapp: "573219543616",
    city: "Colombia",
  },
};

const DEFAULT_SERVICES: Service[] = [
  ["Páginas web", "Sitio corporativo o landing page adaptado a celular, con dominio, hosting y formulario de contacto.", "Empresas y profesionales que necesitan presencia en internet.", "#9333EA"],
  ["Software personalizado", "Paneles, sistemas de gestión y plataformas a la medida: clientes, citas, documentos, inventario.", "Negocios con procesos propios que una app genérica no resuelve.", "#6366F1"],
  ["Branding", "Logo, paleta de colores, tipografía, sellos y manual de marca.", "Empresas nuevas o que quieren renovar su imagen.", "#F472B6"],
  ["Tiendas en línea", "Catálogo, carrito de compras, pagos en línea y gestión de pedidos.", "Comercios que quieren vender por internet.", "#FB923C"],
  ["Automatización", "Conexión con WhatsApp, correo, calendarios y formularios; reportes automáticos.", "Equipos que pierden tiempo en tareas repetitivas.", "#2DD4BF"],
  ["Redes y telecomunicaciones", "Diseño e instalación de redes Wi-Fi y cableado, configuración de equipos y cámaras IP.", "Oficinas, locales y conjuntos residenciales.", "#67E8F9"],
  ["Soporte y mantenimiento", "Actualizaciones, copias de seguridad, seguridad del sitio y atención a incidencias.", "Clientes que quieren su plataforma siempre funcionando.", "#C04CF5"],
].map(([name, description, idealFor, color], i) => ({
  id: `default-${i}`,
  name,
  description,
  idealFor,
  color,
  position: i + 1,
  visible: true,
}));

interface ServiceRow {
  id: string;
  name: string;
  description: string;
  ideal_for: string;
  color: string;
  position: number;
  visible: boolean;
}

export function toService(r: ServiceRow): Service {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    idealFor: r.ideal_for,
    color: r.color,
    position: r.position,
    visible: r.visible,
  };
}

/** Contenido público de la landing, en caché hasta que se edite desde el panel. */
export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheTag(SITE_TAG);
  cacheLife("days");
  const { data } = await createAnonClient().from("site_settings").select("content").maybeSingle();
  const parsed = contentSchema.safeParse(data?.content);
  return parsed.success ? parsed.data : DEFAULT_CONTENT;
}

/** Servicios visibles, en el orden elegido. */
export async function getPublicServices(): Promise<Service[]> {
  "use cache";
  cacheTag(SITE_TAG);
  cacheLife("days");
  const { data, error } = await createAnonClient()
    .from("services")
    .select("id, name, description, ideal_for, color, position, visible")
    .eq("visible", true)
    .order("position");
  if (error || !data) return DEFAULT_SERVICES;
  return (data as ServiceRow[]).map(toService);
}

export { whatsappUrl } from "@/lib/sitio-shared";

/** Para el panel: el borrador si existe; si no, lo publicado (con sesión de socio). */
export async function getEditableSite(): Promise<{
  draft: import("@/lib/sitio-shared").SiteDraft;
  hasDraft: boolean;
  draftAt: string | null;
  draftBy: string | null;
  migrated: boolean;
}> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const [{ data: settings, error }, { data: services }] = await Promise.all([
    supabase.from("site_settings").select("content, draft, draft_updated_at, draft_updated_by").maybeSingle(),
    supabase.from("services").select("id, name, description, ideal_for, color, position, visible").order("position"),
  ]);
  const published = {
    content: contentSchema.safeParse(settings?.content).data ?? DEFAULT_CONTENT,
    services: ((services ?? []) as ServiceRow[]).map(toService),
  };
  const draft = draftSchema.safeParse(settings?.draft);
  return {
    draft: draft.success ? draft.data : published,
    hasDraft: draft.success,
    draftAt: (settings?.draft_updated_at as string | null) ?? null,
    draftBy: (settings?.draft_updated_by as string | null) ?? null,
    migrated: !error,
  };
}
