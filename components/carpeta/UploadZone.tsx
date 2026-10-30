"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CloudUpload, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Tag } from "@/lib/carpeta";
import { formatBytes } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { registerUpload } from "@/app/panel/carpeta/actions";
import { TagPicker } from "./TagPicker";

const MAX_BYTES = 50 * 1024 * 1024;

type ItemState = { name: string; size: number; status: "subiendo" | "listo" | "error"; error?: string };

/**
 * Zona para arrastrar y soltar archivos. Sube directo a Supabase Storage
 * (bucket privado, RLS de socios) y luego registra la versión en la base de datos.
 */
export function UploadZone({
  projectId,
  tags,
  requestId,
  single = false,
  onDone,
}: {
  projectId: string;
  tags: Tag[];
  /** Si viene de una solicitud, al subir se marca como entregada. */
  requestId?: string;
  single?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [items, setItems] = useState<ItemState[]>([]);

  async function upload(fileList: FileList | File[]) {
    const files = Array.from(fileList).slice(0, single ? 1 : 30);
    if (!files.length || busy) return;
    setBusy(true);
    setItems(files.map((f) => ({ name: f.name, size: f.size, status: "subiendo" })));
    const supabase = createClient();
    let ok = 0;

    const mark = (i: number, patch: Partial<ItemState>) =>
      setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));

    for (const [i, file] of files.entries()) {
      if (file.size > MAX_BYTES) {
        mark(i, { status: "error", error: "Supera 50 MB" });
        continue;
      }
      // Ruta opaca dentro de la carpeta del proyecto; el nombre real vive en la base de datos.
      const path = `${projectId}/${crypto.randomUUID()}`;
      const { error: upError } = await supabase.storage
        .from("archivos")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (upError) {
        mark(i, { status: "error", error: "No se pudo subir" });
        continue;
      }
      const res = await registerUpload({
        projectId,
        name: file.name,
        path,
        size: file.size,
        mime: file.type,
        note,
        tagIds,
        requestId,
      });
      if (res.error) {
        mark(i, { status: "error", error: res.error });
      } else {
        mark(i, { status: "listo" });
        ok++;
      }
    }

    setBusy(false);
    if (ok) {
      toast.success(ok === 1 ? "Archivo subido." : `${ok} archivos subidos.`);
      setNote("");
      router.refresh();
      onDone?.();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
          over ? "border-purple bg-purple/5" : "border-border bg-white hover:border-purple/50"
        }`}
      >
        {busy ? (
          <Loader2 className="animate-spin text-purple" size={28} aria-hidden="true" />
        ) : (
          <CloudUpload className="text-purple" size={28} aria-hidden="true" />
        )}
        <p className="font-medium text-navy">
          {busy ? "Subiendo…" : single ? "Arrastra el archivo aquí o haz clic" : "Arrastra archivos aquí o haz clic"}
        </p>
        <p className="text-xs text-muted">
          Hasta 50 MB por archivo. Si ya existe uno con el mismo nombre, se guarda como versión nueva.
        </p>
        <input
          ref={input}
          type="file"
          multiple={!single}
          hidden
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {!single && (
        <details className="rounded-lg border border-border bg-white px-4 py-2 text-sm">
          <summary className="cursor-pointer text-muted">Nota y etiquetas para lo que subas</summary>
          <div className="mt-3 flex flex-col gap-3 pb-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Nota opcional (p. ej. versión enviada al cliente)"
              className="rounded-lg border border-border px-3 py-2 outline-none focus:border-purple"
            />
            <TagPicker tags={tags} selected={tagIds} onChange={setTagIds} />
          </div>
        </details>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {items.map((it, i) => (
            <li key={`${it.name}-${i}`} className="flex items-center gap-2">
              {it.status === "subiendo" && <Loader2 size={14} className="animate-spin text-muted" />}
              {it.status === "listo" && <CheckCircle2 size={14} className="text-teal" />}
              {it.status === "error" && <XCircle size={14} className="text-red-600" />}
              <span className="truncate">{it.name}</span>
              <span className="text-xs text-muted">{formatBytes(it.size)}</span>
              {it.error && <span className="text-xs text-red-600">— {it.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
