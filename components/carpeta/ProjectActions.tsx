"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteProject, setProjectArchived } from "@/app/panel/carpeta/actions";

/** Archivar (ocultar sin borrar) o borrar para siempre un proyecto. */
export function ProjectActions({ id, name, archived, fileCount, compact = false }: { id: string; name: string; archived: boolean; fileCount: number; compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState("");

  const archive = () =>
    startTransition(async () => {
      const res = await setProjectArchived(id, !archived);
      if (res.error) toast.error(res.error);
      else toast.success(archived ? "Proyecto restaurado." : "Proyecto archivado. Lo encuentras abajo en «Archivados».");
    });

  const remove = () =>
    startTransition(async () => {
      const res = await deleteProject(id, typed);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Proyecto borrado.");
        setDeleting(false);
        router.push("/panel/carpeta");
      }
    });

  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm transition disabled:opacity-50";

  return (
    <>
      <div className="flex gap-2">
        <button type="button" onClick={archive} disabled={pending} className={`${btn} text-navy hover:border-purple`} title={archived ? "Volver a mostrar" : "Ocultar sin borrar nada"}>
          {archived ? <ArchiveRestore size={15} /> : <Archive size={15} />} {!compact && (archived ? "Restaurar" : "Archivar")}
        </button>
        <button type="button" onClick={() => setDeleting(true)} disabled={pending} className={`${btn} text-muted hover:border-red-300 hover:text-red-600`} title="Borrar para siempre">
          <Trash2 size={15} /> {!compact && "Borrar"}
        </button>
      </div>

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !pending && setDeleting(false)}>
          <div role="dialog" aria-modal="true" aria-label="Borrar proyecto" onClick={(e) => e.stopPropagation()} className="rise w-full max-w-md rounded-t-2xl bg-surface p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-pixel text-sm text-red-600">BORRAR PROYECTO</h2>
              <button type="button" onClick={() => setDeleting(false)} className="rounded-lg p-1.5 text-muted hover:bg-bg" aria-label="Cerrar"><X size={18} /></button>
            </div>
            <p className="text-sm text-text">
              Se borran para siempre <b>{fileCount} {fileCount === 1 ? "archivo" : "archivos"}</b> (con todas sus versiones), las tareas y las solicitudes de <b>{name}</b>. Los documentos, cotizaciones y firmas se conservan sin proyecto.
            </p>
            <p className="mt-2 text-sm text-muted">Si solo quieres que no estorbe, mejor <b>archívalo</b>: se oculta sin borrar nada.</p>
            <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-navy">
              Escribe <b>{name}</b> para confirmar
              <input value={typed} onChange={(e) => setTyped(e.target.value)} className="rounded-lg border border-border px-3 py-2 outline-none focus:border-red-400" autoFocus />
            </label>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={remove} disabled={pending || typed.trim().toLowerCase() !== name.trim().toLowerCase()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                {pending ? "Borrando…" : "Borrar para siempre"}
              </button>
              <button type="button" onClick={() => setDeleting(false)} className="px-3 text-sm text-muted">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
