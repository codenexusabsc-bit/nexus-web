"use client";

import { toast } from "sonner";

const COLORS = [
  ["Azul noche", "#0E0A26", "Fondos y textos principales"],
  ["Morado", "#6D28D9", "Botones y títulos"],
  ["Violeta", "#9333EA", "Acentos y énfasis"],
  ["Orquídea", "#C04CF5", "Brillos y detalles"],
  ["Cian", "#67E8F9", "Núcleo del portal y resaltados"],
  ["Turquesa", "#2DD4BF", "Planeta con anillo"],
  ["Naranja", "#FB923C", "Planeta naranja"],
  ["Rosa", "#F472B6", "Planeta rosa"],
  ["Lavanda", "#F6F4FF", "Fondos claros"],
];

/** Paleta de la marca: clic para copiar el código del color. */
export function Palette() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {COLORS.map(([name, hex, use]) => (
        <li key={hex}>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(hex).then(() => toast.success(`${hex} copiado.`))}
            className="group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-white text-left transition hover:-translate-y-0.5 hover:shadow"
          >
            <span className="h-16 w-full" style={{ backgroundColor: hex }} />
            <span className="p-2.5">
              <span className="block text-sm font-semibold text-navy">{name}</span>
              <code className="text-xs text-purple">{hex}</code>
              <span className="block text-[0.7rem] text-muted">{use}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
