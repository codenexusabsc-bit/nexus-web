"use client";

import { Plus, Trash2 } from "lucide-react";
import type { SiteContent } from "@/lib/sitio-shared";

const input = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple";

function Text({ label, value, onChange, rows, max }: { label: string; value: string; onChange: (v: string) => void; rows?: number; max: number }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-navy">
      {label}
      {rows ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} maxLength={max} className={input} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} maxLength={max} className={input} />
      )}
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5">
      <h3 className="font-pixel text-xs text-purple">{title}</h3>
      {children}
    </section>
  );
}

/** Lista editable de {title, text} (pasos y valores). */
function ItemList({
  items,
  onChange,
  max,
  addLabel,
}: {
  items: { title: string; text: string }[];
  onChange: (v: { title: string; text: string }[]) => void;
  max: number;
  addLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2 w-5 font-pixel text-xs text-muted">{i + 1}</span>
          <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_2fr]">
            <input value={it.title} maxLength={80} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className={input} aria-label={`Título ${i + 1}`} />
            <input value={it.text} maxLength={300} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className={input} aria-label={`Texto ${i + 1}`} />
          </div>
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="mt-1 rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Quitar">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => onChange([...items, { title: "", text: "" }])} className="inline-flex w-fit items-center gap-1 text-sm text-purple hover:underline">
          <Plus size={14} /> {addLabel}
        </button>
      )}
    </div>
  );
}

/** Edita los textos de la landing dentro del borrador. */
export function ContentEditor({ value: c, onChange }: { value: SiteContent; onChange: (v: SiteContent) => void }) {
  const set = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => onChange({ ...c, [key]: value });

  return (
    <div className="flex flex-col gap-4">
      <Card title="PORTADA">
        <Text label="Título principal" value={c.hero.title} max={80} onChange={(v) => set("hero", { ...c.hero, title: v })} />
        <Text label="Subtítulo" value={c.hero.subtitle} max={400} rows={3} onChange={(v) => set("hero", { ...c.hero, subtitle: v })} />
        <Text label="Botón principal" value={c.hero.cta} max={60} onChange={(v) => set("hero", { ...c.hero, cta: v })} />
      </Card>

      <Card title="QUIÉNES SOMOS">
        <Text label="Título" value={c.about.title} max={80} onChange={(v) => set("about", { ...c.about, title: v })} />
        <Text label="Texto (deja una línea en blanco entre párrafos)" value={c.about.body} max={2000} rows={6} onChange={(v) => set("about", { ...c.about, body: v })} />
        <p className="text-sm font-medium text-navy">Por qué elegirnos</p>
        <ItemList items={c.values} max={8} addLabel="Agregar razón" onChange={(v) => set("values", v)} />
      </Card>

      <Card title="CÓMO TRABAJAMOS">
        <ItemList items={c.steps} max={8} addLabel="Agregar paso" onChange={(v) => set("steps", v)} />
      </Card>

      <Card title="EQUIPO">
        {c.team.map((m, i) => (
          <div key={i} className="grid gap-2 rounded-lg bg-bg p-3 sm:grid-cols-2">
            <input value={m.name} maxLength={80} placeholder="Nombre" onChange={(e) => set("team", c.team.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={input} aria-label="Nombre" />
            <input value={m.title} maxLength={80} placeholder="Cargo" onChange={(e) => set("team", c.team.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className={input} aria-label="Cargo" />
            <input value={m.phone ?? ""} maxLength={30} placeholder="Teléfono (tarjeta digital)" onChange={(e) => set("team", c.team.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} className={input} aria-label="Teléfono" />
            <input value={m.email ?? ""} maxLength={200} placeholder="Correo (tarjeta digital)" onChange={(e) => set("team", c.team.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} className={input} aria-label="Correo" />
            <textarea value={m.text} maxLength={300} rows={2} placeholder="De qué se encarga" onChange={(e) => set("team", c.team.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className={`${input} sm:col-span-2`} aria-label="Descripción" />
            <button type="button" onClick={() => set("team", c.team.filter((_, j) => j !== i))} className="inline-flex w-fit items-center gap-1 text-xs text-muted hover:text-red-600">
              <Trash2 size={13} /> Quitar
            </button>
          </div>
        ))}
        {c.team.length < 6 && (
          <button type="button" onClick={() => set("team", [...c.team, { name: "", title: "", text: "" }])} className="inline-flex w-fit items-center gap-1 text-sm text-purple hover:underline">
            <Plus size={14} /> Agregar integrante
          </button>
        )}
      </Card>

      <Card title="CONTACTO">
        <div className="grid gap-3 sm:grid-cols-2">
          <Text label="Correo" value={c.contact.email} max={200} onChange={(v) => set("contact", { ...c.contact, email: v })} />
          <Text label="Ciudad o país" value={c.contact.city} max={80} onChange={(v) => set("contact", { ...c.contact, city: v })} />
          <Text label="Teléfonos (separados por coma)" value={c.contact.phones.join(", ")} max={130} onChange={(v) => set("contact", { ...c.contact, phones: v.split(",").map((p) => p.trim()).filter(Boolean) })} />
          <Text label="WhatsApp del botón (con indicativo, solo números)" value={c.contact.whatsapp} max={15} onChange={(v) => set("contact", { ...c.contact, whatsapp: v.replace(/\D/g, "") })} />
        </div>
      </Card>

    </div>
  );
}
