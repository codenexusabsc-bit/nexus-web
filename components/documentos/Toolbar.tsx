"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Scissors,
  Strikethrough,
  Table,
  Underline,
  Undo2,
} from "lucide-react";

function Btn({ on, label, onClick, children, disabled }: { on?: boolean; label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={on}
      className={`rounded-md p-1.5 transition disabled:opacity-30 ${on ? "bg-purple text-white" : "text-navy hover:bg-purple/10"}`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />;

/** Barra de formato del editor. */
export function Toolbar({ editor, variables }: { editor: Editor; variables: string[] }) {
  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      left: e.isActive({ textAlign: "left" }),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
      justify: e.isActive({ textAlign: "justify" }),
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  const s = st ?? ({} as Record<string, boolean>);

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-border bg-white/95 px-2 py-1.5 backdrop-blur" role="toolbar" aria-label="Formato">
      <Btn label="Deshacer" disabled={!s.canUndo} onClick={() => c().undo().run()}><Undo2 size={16} /></Btn>
      <Btn label="Rehacer" disabled={!s.canRedo} onClick={() => c().redo().run()}><Redo2 size={16} /></Btn>
      <Sep />
      <Btn label="Título 1" on={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()}><Heading1 size={16} /></Btn>
      <Btn label="Título 2" on={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></Btn>
      <Btn label="Título 3" on={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></Btn>
      <Sep />
      <Btn label="Negrita" on={s.bold} onClick={() => c().toggleBold().run()}><Bold size={16} /></Btn>
      <Btn label="Cursiva" on={s.italic} onClick={() => c().toggleItalic().run()}><Italic size={16} /></Btn>
      <Btn label="Subrayado" on={s.underline} onClick={() => c().toggleUnderline().run()}><Underline size={16} /></Btn>
      <Btn label="Tachado" on={s.strike} onClick={() => c().toggleStrike().run()}><Strikethrough size={16} /></Btn>
      <Sep />
      <Btn label="Alinear a la izquierda" on={s.left} onClick={() => c().setTextAlign("left").run()}><AlignLeft size={16} /></Btn>
      <Btn label="Centrar" on={s.center} onClick={() => c().setTextAlign("center").run()}><AlignCenter size={16} /></Btn>
      <Btn label="Alinear a la derecha" on={s.right} onClick={() => c().setTextAlign("right").run()}><AlignRight size={16} /></Btn>
      <Btn label="Justificar" on={s.justify} onClick={() => c().setTextAlign("justify").run()}><AlignJustify size={16} /></Btn>
      <Sep />
      <Btn label="Lista con viñetas" on={s.bullet} onClick={() => c().toggleBulletList().run()}><List size={16} /></Btn>
      <Btn label="Lista numerada" on={s.ordered} onClick={() => c().toggleOrderedList().run()}><ListOrdered size={16} /></Btn>
      <Btn label="Cita" on={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote size={16} /></Btn>
      <Sep />
      <Btn label="Insertar tabla" on={s.table} onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table size={16} /></Btn>
      {s.table && (
        <>
          <button type="button" onClick={() => c().addRowAfter().run()} className="rounded-md px-1.5 py-1 text-xs text-navy hover:bg-purple/10">+ fila</button>
          <button type="button" onClick={() => c().addColumnAfter().run()} className="rounded-md px-1.5 py-1 text-xs text-navy hover:bg-purple/10">+ columna</button>
          <button type="button" onClick={() => c().deleteRow().run()} className="rounded-md px-1.5 py-1 text-xs text-navy hover:bg-red-50">− fila</button>
          <button type="button" onClick={() => c().deleteColumn().run()} className="rounded-md px-1.5 py-1 text-xs text-navy hover:bg-red-50">− columna</button>
          <button type="button" onClick={() => c().deleteTable().run()} className="rounded-md px-1.5 py-1 text-xs text-red-600 hover:bg-red-50">quitar tabla</button>
        </>
      )}
      <Btn label="Línea divisoria" onClick={() => c().setHorizontalRule().run()}><Minus size={16} /></Btn>
      <Btn label="Salto de página" onClick={() => c().setPageBreak().run()}><Scissors size={16} /></Btn>
      <Sep />
      <label className="inline-flex items-center gap-1 text-xs text-navy">
        <Braces size={15} className="text-purple" aria-hidden="true" />
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value === "__nueva" ? prompt("Nombre de la variable (sin espacios), p. ej. telefono")?.trim().toLowerCase().replace(/\s+/g, "_") : e.target.value;
            if (v) c().insertContent(`{${v}}`).run();
          }}
          className="rounded-md border border-border bg-white px-1 py-1 text-xs"
          aria-label="Insertar variable"
        >
          <option value="">Insertar variable</option>
          {variables.map((v) => (
            <option key={v} value={v}>{`{${v}}`}</option>
          ))}
          <option value="__nueva">Nueva variable…</option>
        </select>
      </label>
    </div>
  );
}
