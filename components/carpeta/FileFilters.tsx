import { Search } from "lucide-react";
import type { Tag } from "@/lib/carpeta";

/** Filtros por GET: búsqueda, etiqueta y quién subió. Funcionan sin JavaScript. */
export function FileFilters({
  tags,
  q,
  tagId,
  by,
}: {
  tags: Tag[];
  q?: string;
  tagId?: string;
  by?: string;
}) {
  const select = "rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple";
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <label className="relative flex-1 sm:max-w-xs">
        <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o nota"
          aria-label="Buscar archivos"
          className="w-full rounded-lg border border-border bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-purple"
        />
      </label>
      <select name="etiqueta" defaultValue={tagId ?? ""} aria-label="Filtrar por etiqueta" className={select}>
        <option value="">Todas las etiquetas</option>
        {tags.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <select name="por" defaultValue={by ?? ""} aria-label="Filtrar por quién subió" className={select}>
        <option value="">Subido por cualquiera</option>
        <option value="yo">Subido por mí</option>
        <option value="socio">Subido por mi socio</option>
      </select>
      <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
        Filtrar
      </button>
    </form>
  );
}
