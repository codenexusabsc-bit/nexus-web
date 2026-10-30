"use client";

import { useActionState, useState } from "react";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { Alert, Button, Field } from "@/components/ui";
import { createProject, type ActionResult } from "@/app/panel/carpeta/actions";

const COLORS = ["#6D28D9", "#2563EB", "#0F766E", "#EA580C", "#DB2777", "#0B1F3A", "#CA8A04"];

export function NewProjectForm() {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [state, action, pending] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const res = await createProject(prev, fd);
    if (!res.error) {
      toast.success("Proyecto creado.");
      setOpen(false);
    }
    return res;
  }, {});

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <FolderPlus size={16} aria-hidden="true" /> Nuevo proyecto
      </Button>
    );
  }

  return (
    <form action={action} className="flex w-full flex-col gap-3 rounded-xl border border-border bg-white p-4 sm:max-w-md">
      <Field id="name" name="name" label="Nombre del proyecto" required maxLength={80} />
      <Field id="client" name="client" label="Cliente (opcional)" maxLength={120} />
      <fieldset className="flex flex-col gap-1.5 text-sm font-medium">
        <legend className="mb-1.5">Color</legend>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              className={`size-7 rounded-full ring-offset-2 ${color === c ? "ring-2 ring-navy" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
      </fieldset>
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>Crear</Button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 text-sm text-muted">
          Cancelar
        </button>
      </div>
    </form>
  );
}
