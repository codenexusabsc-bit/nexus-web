"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Download, FileText, History, RotateCcw, Tags, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { FileItem, Tag } from "@/lib/carpeta";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import {
  getDownloadUrl,
  moveToTrash,
  purgeFile,
  restoreFile,
  setFileTags,
} from "@/app/panel/carpeta/actions";
import { TagPicker } from "./TagPicker";

export interface ProjectRef {
  id: string;
  name: string;
  color: string;
}

async function download(versionId: string) {
  const res = await getDownloadUrl(versionId);
  if (res.error || !res.url) {
    toast.error(res.error ?? "No se pudo descargar.");
    return;
  }
  window.location.href = res.url;
}

/** Lista de archivos con descarga, versiones, etiquetas y papelera. */
export function FileList({
  files,
  tags,
  names,
  projects,
  trash = false,
}: {
  files: FileItem[];
  tags: Tag[];
  /** id de perfil → nombre corto */
  names: Record<string, string>;
  /** Si se pasa, muestra a qué proyecto pertenece cada archivo. */
  projects?: Record<string, ProjectRef>;
  trash?: boolean;
}) {
  if (!files.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted">
        {trash ? "La papelera está vacía." : "No hay archivos que coincidan."}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
      {files.map((f) => (
        <FileRow key={f.id} file={f} tags={tags} names={names} project={projects?.[f.projectId]} trash={trash} />
      ))}
    </ul>
  );
}

function FileRow({
  file,
  tags,
  names,
  project,
  trash,
}: {
  file: FileItem;
  tags: Tag[];
  names: Record<string, string>;
  project?: ProjectRef;
  trash: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [panel, setPanel] = useState<"none" | "versions" | "tags">("none");
  const [selected, setSelected] = useState(file.tags.map((t) => t.id));
  const latest = file.versions[0];
  const by = names[latest?.uploadedBy ?? file.uploadedBy ?? ""] ?? "—";

  const run = (fn: () => Promise<{ error?: string }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else toast.success(ok);
    });

  return (
    <li className={`px-4 py-3 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <FileText size={20} className="shrink-0 text-purple" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-navy">{file.name}</span>
            {file.currentVersion > 1 && (
              <span className="rounded bg-purple/10 px-1.5 py-0.5 font-pixel text-[0.6rem] text-purple">
                V{file.currentVersion}
              </span>
            )}
            {project && (
              <Link
                href={`/panel/carpeta/${project.id}`}
                className="rounded-full px-2 py-0.5 text-[0.7rem] text-white"
                style={{ backgroundColor: project.color }}
              >
                {project.name}
              </Link>
            )}
            {file.tags.map((t) => (
              <span key={t.id} className="rounded-full border border-border px-2 py-0.5 text-[0.7rem] text-muted">
                {t.name}
              </span>
            ))}
          </p>
          <p className="text-xs text-muted">
            {latest ? formatBytes(latest.sizeBytes) : "—"} · {by} · {formatDateTime(file.updatedAt)}
            {trash && file.deletedAt && <> · en la papelera desde {formatDate(file.deletedAt)}</>}
          </p>
          {file.note && <p className="mt-0.5 text-xs text-text/80">{file.note}</p>}
        </div>

        <div className="flex items-center gap-1">
          {trash ? (
            <>
              <IconButton label="Restaurar" onClick={() => run(() => restoreFile(file.id), "Archivo restaurado.")}>
                <RotateCcw size={16} />
              </IconButton>
              <IconButton
                label="Borrar para siempre"
                danger
                onClick={() => {
                  if (confirm(`¿Borrar "${file.name}" para siempre? No se puede deshacer.`)) {
                    run(() => purgeFile(file.id), "Archivo borrado.");
                  }
                }}
              >
                <X size={16} />
              </IconButton>
            </>
          ) : (
            <>
              {latest && (
                <IconButton label="Descargar" onClick={() => download(latest.id)}>
                  <Download size={16} />
                </IconButton>
              )}
              {file.versions.length > 1 && (
                <IconButton
                  label="Versiones"
                  active={panel === "versions"}
                  onClick={() => setPanel(panel === "versions" ? "none" : "versions")}
                >
                  <History size={16} />
                </IconButton>
              )}
              <IconButton label="Etiquetas" active={panel === "tags"} onClick={() => setPanel(panel === "tags" ? "none" : "tags")}>
                <Tags size={16} />
              </IconButton>
              <IconButton label="Mover a la papelera" danger onClick={() => run(() => moveToTrash(file.id), "Movido a la papelera.")}>
                <Trash2 size={16} />
              </IconButton>
            </>
          )}
        </div>
      </div>

      {panel === "versions" && (
        <ul className="mt-3 flex flex-col gap-1 rounded-lg bg-bg p-3 text-sm">
          {file.versions.map((v) => (
            <li key={v.id} className="flex items-center gap-3">
              <span className="w-10 font-pixel text-[0.65rem] text-purple">V{v.version}</span>
              <span className="flex-1 text-muted">
                {formatDateTime(v.createdAt)} · {names[v.uploadedBy ?? ""] ?? "—"} · {formatBytes(v.sizeBytes)}
              </span>
              <button type="button" onClick={() => download(v.id)} className="text-purple hover:underline">
                Descargar
              </button>
            </li>
          ))}
        </ul>
      )}

      {panel === "tags" && (
        <div className="mt-3 flex flex-col gap-3 rounded-lg bg-bg p-3">
          <TagPicker tags={tags} selected={selected} onChange={setSelected} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                run(async () => {
                  const res = await setFileTags(file.id, selected);
                  if (!res.error) setPanel("none");
                  return res;
                }, "Etiquetas guardadas.")
              }
              className="rounded-lg bg-purple px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet"
            >
              Guardar
            </button>
            <button type="button" onClick={() => setPanel("none")} className="px-3 py-1.5 text-sm text-muted">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function IconButton({
  label,
  onClick,
  children,
  danger = false,
  active = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded-lg p-2 transition ${
        active ? "bg-purple/10 text-purple" : danger ? "text-muted hover:bg-red-50 hover:text-red-600" : "text-muted hover:bg-purple/10 hover:text-purple"
      }`}
    >
      {children}
    </button>
  );
}
