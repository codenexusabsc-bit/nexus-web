"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { portfolioImageUrl, type PortfolioItem } from "@/lib/portafolio";
import { createClient } from "@/lib/supabase/client";
import { createPortfolioItem, deletePortfolioItem, movePortfolioItem, updatePortfolioItem } from "@/app/panel/portafolio/actions";

const input = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple";
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

interface Draft {
  title: string;
  client: string;
  summary: string;
  tags: string;
  url: string;
  color: string;
  visible: boolean;
}

const EMPTY: Draft = { title: "", client: "", summary: "", tags: "", url: "", color: "#9333EA", visible: true };

/** Lista del portafolio con alta, edición, orden y visibilidad. Los cambios llegan a la landing al guardar. */
export function PortfolioManager({ items }: { items: PortfolioItem[] }) {
  const [editing, setEditing] = useState<PortfolioItem | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>, okMsg?: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else if (okMsg) toast.success(okMsg);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet">
          <Plus size={16} /> Nuevo proyecto
        </button>
        <p className="text-sm text-muted">Los proyectos visibles aparecen en la página pública, en este orden.</p>
      </div>

      {items.length === 0 && <p className="rounded-xl border border-border bg-white p-6 text-center text-muted">Aún no hay proyectos en el portafolio.</p>}

      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((p, i) => {
          const img = portfolioImageUrl(p.imagePath);
          return (
            <li key={p.id} className={`flex gap-3 rounded-xl border border-border bg-white p-3 ${p.visible ? "" : "opacity-60"}`}>
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg" style={{ backgroundColor: p.color }}>
                {img && <Image src={img} alt="" fill sizes="80px" unoptimized className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-navy">{p.title}</p>
                <p className="truncate text-xs text-purple">{[p.client, ...p.tags].filter(Boolean).join(" · ")}</p>
                <p className="line-clamp-2 text-xs text-muted">{p.summary}</p>
                <div className="mt-2 flex items-center gap-1">
                  <IconBtn label="Subir" disabled={pending || i === 0} onClick={() => run(() => movePortfolioItem(p.id, "up"))}><ArrowUp size={14} /></IconBtn>
                  <IconBtn label="Bajar" disabled={pending || i === items.length - 1} onClick={() => run(() => movePortfolioItem(p.id, "down"))}><ArrowDown size={14} /></IconBtn>
                  <IconBtn label={p.visible ? "Ocultar de la página" : "Mostrar en la página"} disabled={pending} onClick={() => run(() => updatePortfolioItem(p.id, { ...p, tags: p.tags, visible: !p.visible }, undefined))}>
                    {p.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </IconBtn>
                  <IconBtn label="Editar" onClick={() => setEditing(p)}><Pencil size={14} /></IconBtn>
                  <IconBtn
                    label="Borrar"
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`¿Borrar «${p.title}» del portafolio?`)) run(() => deletePortfolioItem(p.id), "Proyecto borrado.");
                    }}
                  >
                    <Trash2 size={14} />
                  </IconBtn>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {editing && <Editor key={editing === "new" ? "new" : editing.id} item={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className="rounded-md border border-border p-1.5 text-muted transition hover:border-purple hover:text-purple disabled:opacity-40">
      {children}
    </button>
  );
}

function Editor({ item, onClose }: { item: PortfolioItem | null; onClose: () => void }) {
  const [f, setF] = useState<Draft>(item ? { title: item.title, client: item.client, summary: item.summary, tags: item.tags.join(", "), url: item.url, color: item.color, visible: item.visible } : EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((s) => ({ ...s, [k]: v }));

  const save = () =>
    startTransition(async () => {
      let image: string | null | undefined = undefined;
      if (file) {
        const ext = EXT[file.type];
        if (!ext) return void toast.error("La imagen debe ser JPG, PNG o WebP.");
        if (file.size > 5 * 1024 * 1024) return void toast.error("La imagen pesa más de 5 MB.");
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await createClient().storage.from("portafolio").upload(path, file, { contentType: file.type });
        if (error) return void toast.error("No se pudo subir la imagen.");
        image = path;
      }
      const payload = { ...f, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) };
      const res = item ? await updatePortfolioItem(item.id, payload, image) : await createPortfolioItem(payload, image ?? null);
      if (res.error) return void toast.error(res.error);
      // Si se reemplazó la imagen, la anterior ya no la usa nadie.
      if (item?.imagePath && image) await createClient().storage.from("portafolio").remove([item.imagePath]);
      toast.success("Guardado. Ya se ve en la página pública.");
      onClose();
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/50 backdrop-blur-sm" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Proyecto del portafolio" onClick={(e) => e.stopPropagation()} className="flex h-dvh w-full max-w-md flex-col gap-3 overflow-y-auto bg-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-sm text-purple">{item ? "EDITAR PROYECTO" : "NUEVO PROYECTO"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-bg" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <Field label="Título"><input className={input} value={f.title} maxLength={80} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Cliente"><input className={input} value={f.client} maxLength={80} onChange={(e) => set("client", e.target.value)} /></Field>
        <Field label="Resumen"><textarea className={input} rows={3} value={f.summary} maxLength={400} onChange={(e) => set("summary", e.target.value)} /></Field>
        <Field label="Etiquetas (separadas por coma, máx. 6)"><input className={input} value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="web, branding" /></Field>
        <Field label="Enlace (opcional, https://)"><input className={input} value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="https://" /></Field>
        <div className="flex items-end gap-3">
          <Field label="Color"><input type="color" value={f.color} onChange={(e) => set("color", e.target.value)} className="h-9 w-14 rounded border border-border" /></Field>
          <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.visible} onChange={(e) => set("visible", e.target.checked)} /> Visible en la página</label>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted hover:border-purple">
          <ImagePlus size={18} />
          {file ? file.name : item?.imagePath ? "Cambiar imagen" : "Agregar imagen (JPG, PNG o WebP, máx. 5 MB)"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <button type="button" onClick={save} disabled={pending} className="mt-2 rounded-lg bg-purple px-4 py-2.5 font-semibold text-white hover:bg-violet disabled:opacity-50">
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
      {label}
      {children}
    </label>
  );
}
