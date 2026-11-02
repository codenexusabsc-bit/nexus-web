"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SITE_TAG } from "@/lib/sitio";
import { portfolioSchema, type PortfolioInput } from "@/lib/portafolio";

export interface PResult {
  error?: string;
}

const uuid = z.uuid({ error: "Identificador inválido." });
// Ruta dentro del bucket público: carpeta aleatoria + nombre seguro, sin saltos de directorio.
const imagePath = z.string().regex(/^[0-9a-f-]{36}\.(jpg|png|webp)$/, { error: "Imagen inválida." });

/** La landing es pública y está en caché: hay que invalidarla al cambiar el portafolio. */
function refresh() {
  updateTag(SITE_TAG);
  revalidatePath("/panel", "layout");
}

export async function createPortfolioItem(input: PortfolioInput, image: string | null): Promise<PResult> {
  await getCurrentUser();
  const parsed = portfolioSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  if (image !== null && !imagePath.safeParse(image).success) return { error: "Imagen inválida." };
  const supabase = await createClient();
  const { data: last } = await supabase.from("portfolio_items").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const d = parsed.data;
  const { error } = await supabase.from("portfolio_items").insert({
    title: d.title, client: d.client, summary: d.summary, tags: d.tags, url: d.url, color: d.color, visible: d.visible,
    image_path: image, position: ((last?.position as number | undefined) ?? 0) + 1,
  });
  if (error) return { error: "No se pudo crear. ¿Ya se aplicó la migración 011?" };
  refresh();
  return {};
}

export async function updatePortfolioItem(id: string, input: PortfolioInput, image: string | null | undefined): Promise<PResult> {
  await getCurrentUser();
  const parsed = portfolioSchema.safeParse(input);
  if (!uuid.safeParse(id).success || !parsed.success) return { error: parsed.success ? "Datos inválidos." : (parsed.error.issues[0]?.message ?? "Datos inválidos.") };
  if (image && !imagePath.safeParse(image).success) return { error: "Imagen inválida." };
  const d = parsed.data;
  const row: Record<string, unknown> = { title: d.title, client: d.client, summary: d.summary, tags: d.tags, url: d.url, color: d.color, visible: d.visible };
  if (image !== undefined) row.image_path = image;
  const supabase = await createClient();
  const { error } = await supabase.from("portfolio_items").update(row).eq("id", id);
  if (error) return { error: "No se pudo guardar." };
  refresh();
  return {};
}

export async function movePortfolioItem(id: string, direction: "up" | "down"): Promise<PResult> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { data } = await supabase.from("portfolio_items").select("id, position").order("position");
  const rows = (data ?? []) as { id: string; position: number }[];
  const i = rows.findIndex((r) => r.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return {};
  // Se intercambian las posiciones; si coinciden, se reasignan por orden para que el cambio se note.
  const a = rows[i]!, b = rows[j]!;
  const [pa, pb] = a.position === b.position ? [j + 1, i + 1] : [b.position, a.position];
  const r1 = await supabase.from("portfolio_items").update({ position: pa }).eq("id", a.id);
  const r2 = await supabase.from("portfolio_items").update({ position: pb }).eq("id", b.id);
  if (r1.error || r2.error) return { error: "No se pudo mover." };
  refresh();
  return {};
}

export async function deletePortfolioItem(id: string): Promise<PResult> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { data: item } = await supabase.from("portfolio_items").select("image_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar." };
  // La imagen ya no se usa en ninguna otra fila; si falla el borrado queda un archivo huérfano, sin riesgo.
  if (item?.image_path) await supabase.storage.from("portafolio").remove([item.image_path as string]);
  refresh();
  return {};
}
