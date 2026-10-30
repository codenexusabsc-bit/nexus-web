"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Download, FolderUp, History, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { PMNode } from "@/lib/pdf/nexus-document";
import { detectVariables, getTemplate } from "@/lib/plantillas";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { loadVersion, saveDocument } from "@/app/panel/documentos/actions";
import { registerUpload } from "@/app/panel/carpeta/actions";
import { SendToSign } from "@/components/firmas/SendToSign";
import { PageBreak } from "./page-break";
import { PdfPreview, buildPdf } from "./PdfPreview";
import { Toolbar } from "./Toolbar";

export interface EditorDoc {
  id: string;
  title: string;
  template: string;
  projectId: string | null;
  status: "borrador" | "en_firma" | "firmado";
  version: number;
  content: PMNode;
  variables: Record<string, string>;
}

interface Props {
  doc: EditorDoc;
  projects: { id: string; name: string }[];
  partners: { id: string; fullName: string }[];
  versions: { id: string; version: number; createdAt: string; by: string }[];
}

const isEmpty = (c: PMNode) => !c.content?.length || (c.content.length === 1 && c.content[0].type === "paragraph" && !c.content[0].content?.length);

function slug(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "documento";
}

/** Editor tipo Overleaf, modo visual: a la izquierda se escribe, a la derecha el PDF con la plantilla Nexus. */
export function DocumentEditor({ doc, projects, partners, versions }: Props) {
  const template = getTemplate(doc.template);
  const readOnly = doc.status !== "borrador";
  const [title, setTitle] = useState(doc.title);
  const [projectId, setProjectId] = useState<string | null>(doc.projectId);
  const [vars, setVars] = useState<Record<string, string>>(doc.variables);
  const [content, setContent] = useState<PMNode>(doc.content);
  const [dirty, setDirty] = useState(false);
  const [version, setVersion] = useState(doc.version);
  const [tab, setTab] = useState<"editor" | "pdf">("editor");
  const [showVersions, setShowVersions] = useState(false);
  const [saving, startSaving] = useTransition();
  const [exporting, setExporting] = useState(false);
  const [startedEmpty] = useState(() => isEmpty(doc.content));

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TableKit.configure({ table: { resizable: false } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      PageBreak,
    ],
    content: startedEmpty ? template.html : (doc.content as object),
    editorProps: { attributes: { class: "tiptap-doc", "aria-label": "Contenido del documento" } },
    onCreate: ({ editor: e }) => {
      // Documento nuevo: arranca con la plantilla y queda pendiente de guardar.
      if (startedEmpty) {
        setContent(e.getJSON() as PMNode);
        setDirty(true);
      }
    },
    onUpdate: ({ editor: e }) => {
      setContent(e.getJSON() as PMNode);
      setDirty(true);
    },
  });

  // Variables: las de la plantilla más las que se escriban en el texto como {nombre}.
  const varList = useMemo(() => {
    const labels = new Map(template.variables.map((v) => [v.key, v.label]));
    for (const k of detectVariables(JSON.stringify(content))) if (!labels.has(k)) labels.set(k, k.replace(/_/g, " "));
    return [...labels.entries()].map(([key, label]) => ({ key, label }));
  }, [content, template]);

  const save = useCallback(() => {
    if (!editor || readOnly) return;
    startSaving(async () => {
      const res = await saveDocument({ id: doc.id, title, content: editor.getJSON() as PMNode, variables: vars, projectId });
      if (res.error) toast.error(res.error);
      else {
        setDirty(false);
        if (res.version) setVersion(res.version);
        toast.success(`Guardado (versión ${res.version}).`);
      }
    });
  }, [editor, readOnly, doc.id, title, vars, projectId]);

  // Ctrl/Cmd + S guarda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  // Aviso al salir con cambios sin guardar
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  async function download() {
    setExporting(true);
    try {
      const blob = await buildPdf(title, content, vars);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${slug(title)}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setExporting(false);
    }
  }

  async function sendToFolder() {
    if (!projectId) {
      toast.error("Elige primero el proyecto del documento.");
      return;
    }
    setExporting(true);
    try {
      const blob = await buildPdf(title, content, vars);
      const path = `${projectId}/${crypto.randomUUID()}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("archivos").upload(path, blob, { contentType: "application/pdf" });
      if (error) throw error;
      const res = await registerUpload({
        projectId,
        name: `${slug(title)}.pdf`,
        path,
        size: blob.size,
        mime: "application/pdf",
        note: `Generado desde el editor (versión ${version}${dirty ? ", con cambios sin guardar" : ""})`,
      });
      if (res.error) throw new Error(res.error);
      toast.success("PDF guardado en la carpeta del proyecto.");
    } catch {
      toast.error("No se pudo guardar el PDF en la carpeta.");
    } finally {
      setExporting(false);
    }
  }

  async function restore(versionId: string, n: number) {
    if (!editor) return;
    if (dirty && !confirm("Tienes cambios sin guardar. ¿Cargar la versión anterior de todos modos?")) return;
    const res = await loadVersion(versionId);
    if (res.error || !res.content) {
      toast.error(res.error ?? "No se pudo cargar la versión.");
      return;
    }
    editor.commands.setContent(res.content as object);
    setTitle(res.title ?? title);
    setVars(res.variables ?? {});
    setContent(res.content);
    setDirty(true);
    setShowVersions(false);
    toast.info(`Versión ${n} cargada. Guarda para dejarla como la actual.`);
  }

  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy transition hover:border-purple disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          maxLength={200}
          disabled={readOnly}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-bold text-navy outline-none hover:border-border focus:border-purple focus:bg-white"
          aria-label="Título del documento"
        />
        <span className="text-xs text-muted">
          {doc.status === "firmado" ? "Firmado · solo lectura" : doc.status === "en_firma" ? "En firma · solo lectura" : dirty ? "Cambios sin guardar" : `Guardado · v${version}`}
        </span>
        {!readOnly && (
          <button type="button" onClick={save} disabled={saving || !dirty} className="shine inline-flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50" title="Ctrl + S">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
          </button>
        )}
        <button type="button" onClick={download} disabled={exporting} className={btn}>
          <Download size={16} /> PDF
        </button>
        <button type="button" onClick={sendToFolder} disabled={exporting} className={btn} title="Guarda el PDF en la carpeta compartida del proyecto">
          <FolderUp size={16} /> A la carpeta
        </button>
        {doc.status === "borrador" && (
          <SendToSign
            documentId={doc.id}
            title={title}
            content={content}
            vars={vars}
            partners={partners}
            disabled={dirty ? "Guarda los cambios antes de enviar a firmar." : undefined}
          />
        )}
        <button type="button" onClick={() => setShowVersions(!showVersions)} className={btn} aria-expanded={showVersions}>
          <History size={16} /> Versiones
        </button>
      </div>

      {showVersions && (
        <div className="rise rounded-xl border border-border bg-white p-4">
          <p className="mb-2 font-pixel text-xs text-purple">VERSIONES GUARDADAS</p>
          {versions.length ? (
            <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto text-sm">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center gap-3">
                  <span className="w-10 font-pixel text-[0.65rem] text-purple">V{v.version}</span>
                  <span className="flex-1 text-muted">{formatDateTime(v.createdAt)} · {v.by}</span>
                  {!readOnly && (
                    <button type="button" onClick={() => restore(v.id, v.version)} className="text-purple hover:underline">
                      Cargar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Aún no hay versiones: cada vez que guardes se crea una.</p>
          )}
        </div>
      )}

      {/* Pestañas en celular */}
      <div className="flex gap-1 rounded-lg bg-border/60 p-1 lg:hidden" role="tablist">
        {(["editor", "pdf"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 rounded-md py-1.5 text-sm ${tab === t ? "bg-white font-semibold text-navy shadow" : "text-muted"}`}>
            {t === "editor" ? "Escribir" : "Vista PDF"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`flex flex-col gap-4 ${tab === "pdf" ? "hidden lg:flex" : ""}`}>
          {/* Datos del documento */}
          <div className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-navy sm:col-span-2">
              Proyecto
              <select
                value={projectId ?? ""}
                disabled={readOnly}
                onChange={(e) => {
                  setProjectId(e.target.value || null);
                  setDirty(true);
                }}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {varList.map((v) => (
              <label key={v.key} className="flex flex-col gap-1 text-xs font-medium text-navy">
                <span>
                  {v.label} <code className="text-purple">{`{${v.key}}`}</code>
                </span>
                <input
                  value={vars[v.key] ?? ""}
                  disabled={readOnly}
                  onChange={(e) => {
                    setVars({ ...vars, [v.key]: e.target.value });
                    setDirty(true);
                  }}
                  maxLength={500}
                  className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-purple"
                />
              </label>
            ))}
            {!varList.length && (
              <p className="text-xs text-muted sm:col-span-2">
                Escribe <code className="text-purple">{"{cliente}"}</code> en el texto para crear un campo que se llena aquí.
              </p>
            )}
          </div>

          {/* Editor */}
          <div className="rounded-xl border border-border bg-white">
            {editor && !readOnly && <Toolbar editor={editor} variables={varList.map((v) => v.key)} />}
            <EditorContent editor={editor} />
            {!editor && <div className="h-96 animate-pulse" />}
          </div>
        </div>

        <div className={`lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] ${tab === "editor" ? "hidden lg:block" : ""}`}>
          <PdfPreview title={title} content={content} vars={vars} />
        </div>
      </div>
    </div>
  );
}
