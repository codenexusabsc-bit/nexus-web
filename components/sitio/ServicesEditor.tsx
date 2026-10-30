"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { Service } from "@/lib/sitio-shared";

const input = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple";

/** Servicios del borrador: editar, ocultar, ordenar, crear y quitar (se aplica al publicar). */
export function ServicesEditor({ value: services, onChange }: { value: Service[]; onChange: (v: Service[]) => void }) {
  const update = (i: number, patch: Partial<Service>) => onChange(services.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...services];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next.map((s, k) => ({ ...s, position: k + 1 })));
  };

  return (
    <div className="flex flex-col gap-3">
      {services.map((s, i) => (
        <div key={s.id} className={`flex gap-3 rounded-xl border bg-white p-4 ${s.visible ? "border-border" : "border-dashed border-border opacity-70"}`}>
          <span className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <input value={s.name} maxLength={80} placeholder="Nombre del servicio" onChange={(e) => update(i, { name: e.target.value })} className={`${input} flex-1 font-semibold`} aria-label="Nombre" />
              <input type="color" value={s.color} onChange={(e) => update(i, { color: e.target.value.toUpperCase() })} className="h-9 w-12 cursor-pointer rounded-lg border border-border" aria-label="Color" />
            </div>
            <textarea value={s.description} maxLength={400} rows={2} placeholder="Qué incluye" onChange={(e) => update(i, { description: e.target.value })} className={input} aria-label="Descripción" />
            <input value={s.idealFor} maxLength={200} placeholder="Ideal para…" onChange={(e) => update(i, { idealFor: e.target.value })} className={input} aria-label="Ideal para" />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => update(i, { visible: !s.visible })} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-navy" aria-pressed={!s.visible}>
                {s.visible ? <EyeOff size={14} /> : <Eye size={14} />} {s.visible ? "Ocultar" : "Mostrar"}
              </button>
              <button type="button" onClick={() => confirm(`¿Quitar "${s.name || "este servicio"}"?`) && onChange(services.filter((_, j) => j !== i))} className="inline-flex items-center gap-1 px-2 text-sm text-muted hover:text-red-600">
                <Trash2 size={14} /> Quitar
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg p-1.5 text-muted hover:bg-purple/10 disabled:opacity-30" aria-label="Subir">
              <ArrowUp size={15} />
            </button>
            <button type="button" disabled={i === services.length - 1} onClick={() => move(i, 1)} className="rounded-lg p-1.5 text-muted hover:bg-purple/10 disabled:opacity-30" aria-label="Bajar">
              <ArrowDown size={15} />
            </button>
          </div>
        </div>
      ))}
      {services.length < 20 && (
        <button
          type="button"
          onClick={() => onChange([...services, { id: crypto.randomUUID(), name: "", description: "", idealFor: "", color: "#9333EA", position: services.length + 1, visible: true }])}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-purple/50 px-4 py-2 text-sm text-purple hover:bg-purple/5"
        >
          <Plus size={15} /> Agregar servicio
        </button>
      )}
    </div>
  );
}
