"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TASK_STAGES, type Task } from "@/lib/prospectos";
import { formatDate } from "@/lib/format";
import { Kanban } from "@/components/Kanban";
import { createTask, deleteTask, updateTask } from "@/app/panel/carpeta/tareas-actions";

/** Tareas del proyecto en tres columnas: por hacer, en curso y hechas. */
export function TasksBoard({ projectId, tasks, partners, today }: { projectId: string; tasks: Task[]; partners: { id: string; name: string }[]; today: string }) {
  const [title, setTitle] = useState("");
  const [assigned, setAssigned] = useState("");
  const [due, setDue] = useState("");
  const [pending, startTransition] = useTransition();
  const names = Object.fromEntries(partners.map((p) => [p.id, p.name]));

  const add = () =>
    startTransition(async () => {
      const res = await createTask(projectId, title, assigned || null, due);
      if (res.error) toast.error(res.error);
      else {
        setTitle("");
        setDue("");
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) add();
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Nueva tarea…" className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple" aria-label="Nueva tarea" />
        <select value={assigned} onChange={(e) => setAssigned(e.target.value)} className="rounded-lg border border-border bg-white px-2 py-2 text-sm" aria-label="Responsable">
          <option value="">Sin asignar</option>
          {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="rounded-lg border border-border bg-white px-2 py-2 text-sm" aria-label="Fecha límite" />
        <button type="submit" disabled={pending || !title.trim()} className="inline-flex items-center gap-1 rounded-lg bg-purple px-3 py-2 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50">
          <Plus size={15} /> Agregar
        </button>
      </form>
      <Kanban
        columns={TASK_STAGES}
        items={tasks}
        columnOf={(t) => t.status}
        onMove={async (t, to) => {
          const res = await updateTask(t.id, { status: to as Task["status"] });
          if (res.error) toast.error(res.error);
          return !res.error;
        }}
        renderCard={(t, move) => {
          const overdue = t.dueOn !== null && t.dueOn < today && t.status !== "hecha";
          return (
            <div className={`group rounded-lg border border-border bg-white p-3 shadow-sm ${t.status === "hecha" ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={t.status === "hecha"}
                  onChange={(e) => move(e.target.checked ? "hecha" : "pendiente")}
                  className="mt-0.5 size-4 accent-teal"
                  aria-label="Marcar hecha"
                />
                <p className={`flex-1 text-sm font-medium text-navy ${t.status === "hecha" ? "line-through" : ""}`}>{t.title}</p>
                <button
                  type="button"
                  onClick={() => confirm("¿Borrar la tarea?") && deleteTask(t.id).then((r) => r.error && toast.error(r.error))}
                  className="text-muted opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                  aria-label="Borrar tarea"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 pl-6 text-[0.7rem] text-muted">
                {t.assignedTo && <span className="rounded bg-purple/10 px-1 text-purple">{names[t.assignedTo]}</span>}
                {t.dueOn && (
                  <span className={`inline-flex items-center gap-0.5 ${overdue ? "font-semibold text-red-600" : ""}`}>
                    <CalendarClock size={11} /> {formatDate(t.dueOn)}
                  </span>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
