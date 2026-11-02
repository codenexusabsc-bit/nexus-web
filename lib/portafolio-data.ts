import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import { createClient } from "@/lib/supabase/server";
import { SITE_TAG } from "@/lib/sitio";
import { toPortfolioItem, type PortfolioItem, type PortfolioRow } from "@/lib/portafolio";

const COLUMNS = "id, title, client, summary, tags, url, image_path, color, position, visible";

/** Proyectos visibles para la landing, en caché hasta que se edite el portafolio. */
export async function getPublicPortfolio(): Promise<PortfolioItem[]> {
  "use cache";
  cacheTag(SITE_TAG);
  cacheLife("days");
  const { data, error } = await createAnonClient().from("portfolio_items").select(COLUMNS).eq("visible", true).order("position");
  if (error || !data) return [];
  return (data as PortfolioRow[]).map(toPortfolioItem);
}

/** Todos los proyectos del portafolio, para el panel. `migrated` es falso si falta la migración 011. */
export async function listPortfolio(): Promise<{ items: PortfolioItem[]; migrated: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("portfolio_items").select(COLUMNS).order("position");
  return { migrated: !error, items: ((data ?? []) as PortfolioRow[]).map(toPortfolioItem) };
}
