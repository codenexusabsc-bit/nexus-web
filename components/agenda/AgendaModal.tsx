"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Inbox, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { CalendarEntry } from "@/lib/agenda";
import { CATEGORIES } from "@/lib/agenda";
import { addDays, toBogotaWall } from "@/lib/dates";
import { formatDateTime } from "@/lib/format";
import type { Partner } from "@/lib/carpeta";
import {
  deleteAgendaItem,
  markMessageSeen,
  saveAgendaItem,
  setAgendaDone,
  type AgendaInput,
} from "@/app/panel/agenda-actions";

export interface Draft {
  id?: string;
  type: "privado" | "compartido" | "mensaje";
  recipient?: string;
  title: string;
  notes: string;
  allDay: boolean;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

const input = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple";

/** Ventana para crear o ver un recordatorio, mensaje o solicitud del calendario. */
export function AgendaModal({
  entry,
  draft,
  partners,
  userId,
  names,
  onClose,
  onChanged,
}: {
  /** Evento existente (modo ver); null = crear */
  entry: CalendarEntry | null;
  draft: Draft;
  partners: Partner[];
  userId: string;
  names: Record<string, string>;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(entry === null);
  const [d, setD] = useState<Draft>(draft);
  const [pending, startTransition] = useTransition();
  const others = partners.filter((p) => p.id !== userId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Al abrir un mensaje recibido, se marca como leído.
  const unseenId =
    entry?.source === "agenda" && entry.category === "mensaje-recibido" && !entry.item.seenAt ? entry.item.id : null;
  useEffect(() => {
    if (unseenId) markMessageSeen(unseenId).then((r) => !r.error && onChanged());
  }, [unseenId, onChanged]);

  const run = (fn: () => Promise<{ error?: string }>, ok: string, close = true) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        toast.success(ok);
        onChanged();
        if (close) onClose();
      }
    });

  const save = () => run(() => saveAgendaItem(d as AgendaInput), d.id ? "Cambios guardados." : d.type === "mensaje" ? "Mensaje enviado." : "Recordatorio agendado.");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Agendar" : "Detalle"}
        onClick={(e) => e.stopPropagation()}
        className="rise max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-pixel text-sm text-purple">{editing ? (d.id ? "EDITAR" : "AGENDAR") : "DETALLE"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-bg" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* ---- Ver ---- */}
        {!editing && entry?.source === "solicitud" && (
          <div className="flex flex-col gap-3">
            <Badge category={entry.category} />
            <p className="text-lg font-semibold text-navy">{entry.title}</p>
            <p className="text-sm text-muted">
              {entry.category === "entregar" && `${entry.who} te pidió este documento.`}
              {entry.category === "revisar" && `${entry.who} ya lo entregó: revísalo y acéptalo o devuélvelo.`}
              {entry.category === "esperando" && `Se lo pediste a ${entry.who}; vence este día.`}
              {entry.projectName && ` Proyecto: ${entry.projectName}.`}
            </p>
            <Link href="/panel/solicitudes" className="inline-flex w-fit items-center gap-2 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet">
              <Inbox size={16} /> Ir a solicitudes
            </Link>
          </div>
        )}

        {!editing && entry?.source === "agenda" && (
          <div className={`flex flex-col gap-3 ${pending ? "opacity-60" : ""}`}>
            <Badge category={entry.category} />
            <p className={`text-lg font-semibold text-navy ${entry.item.doneAt ? "line-through opacity-60" : ""}`}>{entry.item.title}</p>
            <p className="text-sm text-muted">
              {entry.item.allDay ? `Todo el día · ${toBogotaWall(entry.item.startsAt).slice(0, 10)}` : formatDateTime(entry.item.startsAt)}
              {entry.item.kind === "mensaje" &&
                (entry.category === "mensaje-recibido"
                  ? ` · de ${names[entry.item.createdBy] ?? "tu socio"}`
                  : ` · para ${names[entry.item.recipient ?? ""] ?? "tu socio"}${entry.item.seenAt ? " · leído" : " · sin leer"}`)}
            </p>
            {entry.item.notes && <p className="whitespace-pre-line rounded-lg bg-bg p-3 text-sm">{entry.item.notes}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => run(() => setAgendaDone(entry.item.id, !entry.item.doneAt), entry.item.doneAt ? "Marcado como pendiente." : "¡Hecho!")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-navy"
              >
                <Check size={16} /> {entry.item.doneAt ? "Marcar pendiente" : "Marcar hecho"}
              </button>
              {entry.item.createdBy === userId && (
                <>
                  <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-navy">
                    <Pencil size={15} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => confirm("¿Borrar de la agenda?") && run(() => deleteAgendaItem(entry.item.id), "Borrado.")}
                    className="inline-flex items-center gap-1.5 px-2 text-sm text-muted hover:text-red-600"
                  >
                    <Trash2 size={15} /> Borrar
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ---- Crear / editar ---- */}
        {editing && (
          <div className="flex flex-col gap-3">
            {!d.id && (
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo">
                {(
                  [
                    ["privado", "Para mí"],
                    ["compartido", "Compartido"],
                    ["mensaje", "Mensaje"],
                  ] as const
                ).map(([value, label]) => {
                  const color = CATEGORIES[value === "mensaje" ? "mensaje-enviado" : value].color;
                  const on = d.type === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setD({ ...d, type: value, recipient: value === "mensaje" ? (d.recipient ?? others[0]?.id) : undefined })}
                      className={`rounded-lg border-2 px-2 py-2 text-sm transition ${on ? "text-white" : "border-border text-navy"}`}
                      style={on ? { backgroundColor: color, borderColor: color } : undefined}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted">
              {d.type === "privado" && "Solo tú lo ves."}
              {d.type === "compartido" && "Lo ven los dos socios en su calendario."}
              {d.type === "mensaje" && "Le aparece a tu socio en su calendario y en sus pendientes hasta que lo lea."}
            </p>
            {d.type === "mensaje" && others.length > 1 && (
              <select value={d.recipient} onChange={(e) => setD({ ...d, recipient: e.target.value })} className={input} aria-label="Para">
                {others.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            )}
            <input
              value={d.title}
              onChange={(e) => setD({ ...d, title: e.target.value })}
              maxLength={200}
              placeholder={d.type === "mensaje" ? "Ej.: Revisa la cotización de Bonett" : "Ej.: Llamar al cliente"}
              className={`${input} text-base font-semibold`}
              aria-label="Título"
              autoFocus
            />
            <textarea value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} rows={3} maxLength={2000} placeholder="Detalles (opcional)" className={input} aria-label="Detalles" />
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-navy">
                Fecha
                <input type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} className={input} />
              </label>
              {d.allDay ? (
                <label className="flex flex-col gap-1 text-xs font-medium text-navy">
                  Hasta (opcional)
                  <input type="date" value={d.endDate} min={d.date} onChange={(e) => setD({ ...d, endDate: e.target.value })} className={input} />
                </label>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-navy">
                    Hora
                    <input type="time" value={d.startTime} onChange={(e) => setD({ ...d, startTime: e.target.value })} className={input} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-navy">
                    Fin
                    <input type="time" value={d.endTime} onChange={(e) => setD({ ...d, endTime: e.target.value })} className={input} />
                  </label>
                </div>
              )}
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-navy">
              <input type="checkbox" checked={d.allDay} onChange={(e) => setD({ ...d, allDay: e.target.checked, startTime: e.target.checked ? "" : d.startTime || "09:00" })} className="size-4 accent-purple" />
              Todo el día
            </label>
            <div className="flex gap-2 pt-1">
              <button type="button" disabled={pending} onClick={save} className="shine rounded-lg bg-purple px-5 py-2.5 font-semibold text-white hover:bg-violet disabled:opacity-60">
                {pending ? "Guardando…" : d.type === "mensaje" && !d.id ? "Enviar" : "Guardar"}
              </button>
              <button type="button" onClick={() => (entry ? setEditing(false) : onClose())} className="px-3 text-sm text-muted">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ category }: { category: keyof typeof CATEGORIES }) {
  const c = CATEGORIES[category];
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: c.color }}>
      {c.label}
    </span>
  );
}

/** Borrador a partir de un evento existente (para editar). */
export function draftFromEntry(entry: CalendarEntry): Draft | null {
  if (entry.source !== "agenda") return null;
  const it = entry.item;
  const start = toBogotaWall(it.startsAt);
  const end = it.endsAt ? toBogotaWall(it.endsAt) : "";
  return {
    id: it.id,
    type: it.kind === "mensaje" ? "mensaje" : it.shared ? "compartido" : "privado",
    recipient: it.recipient ?? undefined,
    title: it.title,
    notes: it.notes,
    allDay: it.allDay,
    date: start.slice(0, 10),
    endDate: it.allDay && end ? addDays(end.slice(0, 10), -1) : "",
    startTime: it.allDay ? "" : start.slice(11, 16),
    endTime: !it.allDay && end ? end.slice(11, 16) : "",
  };
}
