"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, CornerUpLeft, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { DocRequest, Tag } from "@/lib/carpeta";
import { formatDate } from "@/lib/format";
import { UploadZone } from "@/components/carpeta/UploadZone";
import { deleteRequest, reviewRequest } from "@/app/panel/solicitudes/actions";

const STATUS: Record<DocRequest["status"], { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-orange/15 text-orange-700" },
  delivered: { label: "Entregada", cls: "bg-cyan/20 text-cyan-800" },
  accepted: { label: "Aceptada", cls: "bg-teal/15 text-teal-800" },
  returned: { label: "Devuelta", cls: "bg-red-100 text-red-700" },
};

export function RequestCard({
  request: r,
  role,
  names,
  project,
  deliveredFileName,
  tags,
  today,
}: {
  request: DocRequest;
  /** "recibida": me la pidieron · "enviada": la pedí yo */
  role: "recibida" | "enviada";
  names: Record<string, string>;
  project?: { id: string; name: string; color: string };
  deliveredFileName?: string;
  tags: Tag[];
  /** AAAA-MM-DD en hora de Colombia, para marcar vencidas */
  today: string;
}) {
  const [pending, startTransition] = useTransition();
  const [delivering, setDelivering] = useState(false);
  const [returning, setReturning] = useState(false);
  const [comment, setComment] = useState("");
  const st = STATUS[r.status];
  const open = r.status === "pending" || r.status === "returned";
  const overdue = open && r.dueDate !== null && r.dueDate < today;

  const run = (fn: () => Promise<{ error?: string }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else toast.success(ok);
    });

  return (
    <li className={`flex flex-col gap-3 rounded-xl border bg-white p-4 ${overdue ? "border-red-300" : "border-border"} ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-navy">{r.title}</p>
          <p className="text-xs text-muted">
            {role === "recibida" ? `Te lo pide ${names[r.requestedBy] ?? "—"}` : `Se lo pediste a ${names[r.requestedTo] ?? "—"}`}
            {" · "}
            {formatDate(r.createdAt)}
            {r.dueDate && (
              <span className={overdue ? "font-semibold text-red-600" : ""}> · límite {formatDate(r.dueDate)}{overdue && " (vencida)"}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {project && (
            <Link href={`/panel/carpeta/${project.id}`} className="rounded-full px-2 py-0.5 text-[0.7rem] text-white" style={{ backgroundColor: project.color }}>
              {project.name}
            </Link>
          )}
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
        </div>
      </div>

      {r.description && <p className="whitespace-pre-line text-sm text-text/90">{r.description}</p>}
      {r.status === "returned" && r.responseComment && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          <b>Devuelta:</b> {r.responseComment}
        </p>
      )}
      {r.deliveredFileId && deliveredFileName && r.status !== "returned" && (
        <p className="text-sm">
          Entregado: <Link href={`/panel/carpeta/${r.projectId}`} className="text-purple hover:underline">{deliveredFileName}</Link>
        </p>
      )}

      {/* Acciones de quien recibió la solicitud */}
      {role === "recibida" && open && (
        delivering ? (
          <UploadZone projectId={r.projectId} tags={tags} requestId={r.id} single onDone={() => setDelivering(false)} />
        ) : (
          <button type="button" onClick={() => setDelivering(true)} className="inline-flex w-fit items-center gap-2 rounded-lg bg-purple px-3 py-2 text-sm font-semibold text-white hover:bg-violet">
            <Upload size={16} /> Entregar documento
          </button>
        )
      )}

      {/* Acciones de quien pidió */}
      {role === "enviada" && r.status === "delivered" && (
        returning ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="¿Qué falta o qué hay que corregir?"
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => run(async () => {
                  const res = await reviewRequest(r.id, "returned", comment);
                  if (!res.error) setReturning(false);
                  return res;
                }, "Solicitud devuelta.")}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Devolver
              </button>
              <button type="button" onClick={() => setReturning(false)} className="px-3 text-sm text-muted">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => run(() => reviewRequest(r.id, "accepted"), "Entrega aceptada.")} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-navy">
              <Check size={16} /> Aceptar
            </button>
            <button type="button" onClick={() => setReturning(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-navy">
              <CornerUpLeft size={16} /> Devolver
            </button>
          </div>
        )
      )}
      {role === "enviada" && r.status !== "accepted" && (
        <button
          type="button"
          onClick={() => confirm("¿Borrar esta solicitud?") && run(() => deleteRequest(r.id), "Solicitud borrada.")}
          className="inline-flex w-fit items-center gap-1 text-xs text-muted hover:text-red-600"
        >
          <Trash2 size={13} /> Borrar solicitud
        </button>
      )}
    </li>
  );
}
