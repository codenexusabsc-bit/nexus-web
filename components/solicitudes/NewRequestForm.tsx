"use client";

import { useActionState, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import type { Partner, Project } from "@/lib/carpeta";
import { Alert, Button, Field } from "@/components/ui";
import { createRequest } from "@/app/panel/solicitudes/actions";

export function NewRequestForm({ projects, partners }: { projects: Project[]; partners: Partner[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: { error?: string }, fd: FormData) => {
    const res = await createRequest(prev, fd);
    if (!res.error) {
      toast.success("Solicitud enviada.");
      setOpen(false);
    }
    return res;
  }, {});

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Send size={16} aria-hidden="true" /> Pedir un documento
      </Button>
    );
  }

  const select = "rounded-lg border border-border bg-white px-3.5 py-2.5 text-base font-normal outline-none focus:border-purple";
  return (
    <form action={action} className="flex w-full flex-col gap-3 rounded-xl border border-border bg-white p-4">
      <Field id="title" name="title" label="¿Qué documento necesitas?" placeholder="RUT actualizado de Bonett" required maxLength={200} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          A quién
          <select name="requestedTo" required className={select} defaultValue={partners[0]?.id}>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Proyecto
          <select name="projectId" required className={select}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <Field id="dueDate" name="dueDate" type="date" label="Fecha límite (opcional)" />
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Detalles (opcional)
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          className="rounded-lg border border-border px-3.5 py-2.5 text-base font-normal outline-none focus:border-purple"
        />
      </label>
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>Enviar solicitud</Button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 text-sm text-muted">
          Cancelar
        </button>
      </div>
    </form>
  );
}
