"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Service } from "@/lib/sitio";
import { deleteService, reorderServices, saveService } from "@/app/panel/sitio/actions";

const input = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple";
const EMPTY = { name: "", description: "", idealFor: "", color: "#9333EA", visible: true };

/** Servicios de la landing: editar, ocultar, ordenar, crear y borrar. */
export function ServicesEditor({ services }: { services: Service[] }) {
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);

  const run = (fn: () => Promise<{ error?: string }>, ok: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        toast.success(ok);
        after?.();
      }
    });

  const move = (i: number, dir: -1 | 1) => {
    const ids = services.map((s) => s.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    run(() => reorderServices(ids), "Orden guardado.");
  };

  return (
    <div className={`flex flex-col gap-3 ${pending ? "opacity-70" : ""}`}>
      {services.map((s, i) => (
        <ServiceRow
          key={s.id}
          service={s}
          first={i === 0}
          last={i === services.length - 1}
          onMove={(d) => move(i, d)}
          onSave={(v) => run(() => saveService({ ...v, id: s.id }), "Servicio guardado.")}
          onDelete={() => confirm(`¿Borrar "${s.name}"?`) && run(() => deleteService(s.id), "Servicio borrado.")}
        />
      ))}
      {adding ? (
        <ServiceRow
          service={{ id: "", position: 0, ...EMPTY }}
          isNew
          onSave={(v) => run(() => saveService(v), "Servicio creado.", () => setAdding(false))}
          onDelete={() => setAdding(false)}
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-purple/50 px-4 py-2 text-sm text-purple hover:bg-purple/5">
          <Plus size={15} /> Agregar servicio
        </button>
      )}
    </div>
  );
}

function ServiceRow({
  service,
  first,
  last,
  isNew = false,
  onMove,
  onSave,
  onDelete,
}: {
  service: Service;
  first?: boolean;
  last?: boolean;
  isNew?: boolean;
  onMove?: (dir: -1 | 1) => void;
  onSave: (v: typeof EMPTY) => void;
  onDelete: () => void;
}) {
  const [v, setV] = useState({
    name: service.name,
    description: service.description,
    idealFor: service.idealFor,
    color: service.color,
    visible: service.visible,
  });
  const dirty =
    isNew ||
    v.name !== service.name ||
    v.description !== service.description ||
    v.idealFor !== service.idealFor ||
    v.color !== service.color ||
    v.visible !== service.visible;

  return (
    <div className={`flex gap-3 rounded-xl border bg-white p-4 ${v.visible ? "border-border" : "border-dashed border-border opacity-70"}`}>
      <span className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: v.color }} aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input value={v.name} maxLength={80} placeholder="Nombre del servicio" onChange={(e) => setV({ ...v, name: e.target.value })} className={`${input} flex-1 font-semibold`} aria-label="Nombre" />
          <input type="color" value={v.color} onChange={(e) => setV({ ...v, color: e.target.value.toUpperCase() })} className="h-9 w-12 cursor-pointer rounded-lg border border-border" aria-label="Color" />
        </div>
        <textarea value={v.description} maxLength={400} rows={2} placeholder="Qué incluye" onChange={(e) => setV({ ...v, description: e.target.value })} className={input} aria-label="Descripción" />
        <input value={v.idealFor} maxLength={200} placeholder="Ideal para…" onChange={(e) => setV({ ...v, idealFor: e.target.value })} className={input} aria-label="Ideal para" />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!dirty} onClick={() => onSave(v)} className="inline-flex items-center gap-1.5 rounded-lg bg-purple px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
            <Save size={14} /> {isNew ? "Crear" : "Guardar"}
          </button>
          {!isNew && (
            <button type="button" onClick={() => setV({ ...v, visible: !v.visible })} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-navy" aria-pressed={!v.visible}>
              {v.visible ? <EyeOff size={14} /> : <Eye size={14} />} {v.visible ? "Ocultar" : "Mostrar"}
            </button>
          )}
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 px-2 text-sm text-muted hover:text-red-600">
            <Trash2 size={14} /> {isNew ? "Cancelar" : "Borrar"}
          </button>
        </div>
      </div>
      {!isNew && onMove && (
        <div className="flex flex-col gap-1">
          <button type="button" disabled={first} onClick={() => onMove(-1)} className="rounded-lg p-1.5 text-muted hover:bg-purple/10 disabled:opacity-30" aria-label="Subir">
            <ArrowUp size={15} />
          </button>
          <button type="button" disabled={last} onClick={() => onMove(1)} className="rounded-lg p-1.5 text-muted hover:bg-purple/10 disabled:opacity-30" aria-label="Bajar">
            <ArrowDown size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
