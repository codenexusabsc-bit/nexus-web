"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Tag } from "@/lib/carpeta";
import { createTag } from "@/app/panel/carpeta/actions";

/** Casillas de etiquetas, con opción de crear una nueva al vuelo. */
export function TagPicker({
  tags,
  selected,
  onChange,
}: {
  tags: Tag[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [extra, setExtra] = useState<Tag[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const all = [...tags, ...extra.filter((e) => !tags.some((t) => t.id === e.id))];

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    startTransition(async () => {
      const res = await createTag(name);
      if (res.error || !res.id) {
        toast.error(res.error ?? "No se pudo crear la etiqueta.");
        return;
      }
      const id = res.id;
      setExtra((prev) => [...prev, { id, name }]);
      if (!selected.includes(id)) onChange([...selected, id]);
      setDraft("");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {all.map((t) => {
        const on = selected.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            aria-pressed={on}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              on ? "border-purple bg-purple text-white" : "border-border bg-white text-muted hover:border-purple/50"
            }`}
          >
            {t.name}
          </button>
        );
      })}
      <span className="inline-flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Nueva etiqueta"
          maxLength={40}
          className="w-32 rounded-full border border-dashed border-border px-3 py-1 text-xs outline-none focus:border-purple"
          aria-label="Nombre de la nueva etiqueta"
        />
        <button
          type="button"
          onClick={add}
          disabled={pending || !draft.trim()}
          className="rounded-full p-1 text-purple hover:bg-purple/10 disabled:opacity-40"
          aria-label="Crear etiqueta"
        >
          <Plus size={14} />
        </button>
      </span>
    </div>
  );
}
