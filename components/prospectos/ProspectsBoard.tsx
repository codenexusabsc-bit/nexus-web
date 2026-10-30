"use client";

import { useState, useTransition } from "react";
import { CalendarClock, FileText, Mail, MessageCircle, Phone, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { LEAD_STAGES, waNumber, type Prospect } from "@/lib/prospectos";
import { formatDate, formatDateTime } from "@/lib/format";
import { Kanban } from "@/components/Kanban";
import { createProspect, deleteProspect, prospectToQuote, updateProspect } from "@/app/panel/prospectos/actions";

const input = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple";

/** Tablero de prospectos por etapa, con ficha de seguimiento. */
export function ProspectsBoard({ items, partners, today }: { items: Prospect[]; partners: { id: string; name: string }[]; today: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const open = items.find((p) => p.id === openId) ?? null;
  const names = Object.fromEntries(partners.map((p) => [p.id, p.name]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet">
          <Plus size={16} /> Prospecto manual
        </button>
        <p className="text-sm text-muted">Arrastra las tarjetas entre columnas. Los mensajes de la página entran solos en «Nuevos».</p>
      </div>

      <Kanban
        columns={LEAD_STAGES}
        items={items}
        columnOf={(p) => p.status}
        onMove={async (p, to) => {
          const res = await updateProspect(p.id, { status: to as Prospect["status"] });
          if (res.error) toast.error(res.error);
          return !res.error;
        }}
        renderCard={(p) => {
          const overdue = p.nextActionOn !== null && p.nextActionOn < today;
          return (
            <button type="button" onClick={() => setOpenId(p.id)} className="w-full rounded-lg border border-border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-purple hover:shadow">
              <p className="font-semibold text-navy">{p.name}</p>
              {(p.company || p.service) && <p className="truncate text-xs text-purple">{[p.company, p.service].filter(Boolean).join(" · ")}</p>}
              <p className="mt-1 line-clamp-2 text-xs text-muted">{p.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.7rem] text-muted">
                <span>{formatDate(p.createdAt)}</span>
                {p.source === "manual" && <span className="rounded bg-border px-1">manual</span>}
                {p.assignedTo && <span className="rounded bg-purple/10 px-1 text-purple">{names[p.assignedTo]}</span>}
                {p.nextActionOn && (
                  <span className={`inline-flex items-center gap-0.5 ${overdue ? "font-semibold text-red-600" : ""}`}>
                    <CalendarClock size={11} /> {formatDate(p.nextActionOn)}
                  </span>
                )}
              </div>
            </button>
          );
        }}
      />

      {open && <ProspectDrawer key={open.id} p={open} partners={partners} onClose={() => setOpenId(null)} />}
      {adding && <NewProspect onClose={() => setAdding(false)} />}
    </div>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy/50 backdrop-blur-sm" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="flex h-dvh w-full max-w-md flex-col overflow-y-auto bg-surface p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-pixel text-sm text-purple">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-bg" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function ProspectDrawer({ p, partners, onClose }: { p: Prospect; partners: { id: string; name: string }[]; onClose: () => void }) {
  const [f, setF] = useState({ notes: p.notes, nextAction: p.nextAction, nextActionOn: p.nextActionOn ?? "", assignedTo: p.assignedTo ?? "", status: p.status });
  const [pending, startTransition] = useTransition();
  const wa = p.phone ? waNumber(p.phone) : "";

  const save = () =>
    startTransition(async () => {
      const res = await updateProspect(p.id, { ...f, assignedTo: f.assignedTo || null });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Seguimiento guardado.");
        onClose();
      }
    });

  return (
    <Drawer title="PROSPECTO" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xl font-bold text-navy">{p.name}</p>
          {(p.company || p.service) && <p className="text-sm text-purple">{[p.company, p.service].filter(Boolean).join(" · ")}</p>}
          <p className="text-xs text-muted">{p.source === "web" ? "Desde la página" : "Agregado a mano"} · {formatDateTime(p.createdAt)}</p>
        </div>
        <p className="whitespace-pre-line rounded-lg bg-bg p-3 text-sm">{p.message}</p>
        <div className="flex flex-wrap gap-2 text-sm">
          {wa && (
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola ${p.name}, te escribimos de Nexus Ingeniería.`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[#128C7E] hover:border-[#128C7E]">
              <MessageCircle size={15} /> WhatsApp
            </a>
          )}
          {p.phone && (
            <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-navy hover:border-purple">
              <Phone size={15} /> {p.phone}
            </a>
          )}
          {p.email && (
            <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-navy hover:border-purple">
              <Mail size={15} /> Correo
            </a>
          )}
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Etapa
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Prospect["status"] })} className={input}>
            {LEAD_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Responsable
          <select value={f.assignedTo} onChange={(e) => setF({ ...f, assignedTo: e.target.value })} className={input}>
            <option value="">Sin asignar</option>
            {partners.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Próxima acción<input value={f.nextAction} onChange={(e) => setF({ ...f, nextAction: e.target.value })} maxLength={200} placeholder="Ej.: Llamar para agendar reunión" className={input} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Fecha<input type="date" value={f.nextActionOn} onChange={(e) => setF({ ...f, nextActionOn: e.target.value })} className={input} /></label>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy">Notas internas
          <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={5} maxLength={4000} className={input} />
        </label>
        <p className="text-xs text-muted">La próxima acción aparece en la agenda del responsable el día elegido.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50">Guardar</button>
          <form action={prospectToQuote.bind(null, p.id)}>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-navy hover:border-purple">
              <FileText size={15} /> Crear cotización
            </button>
          </form>
          <button
            type="button"
            onClick={() =>
              confirm("¿Borrar este prospecto?") &&
              startTransition(async () => {
                const res = await deleteProspect(p.id);
                if (res.error) toast.error(res.error);
                else onClose();
              })
            }
            className="inline-flex items-center gap-1 px-2 text-sm text-muted hover:text-red-600"
          >
            <Trash2 size={15} /> Borrar
          </button>
        </div>
      </div>
    </Drawer>
  );
}

function NewProspect({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ name: "", company: "", email: "", phone: "", service: "", message: "" });
  const [pending, startTransition] = useTransition();
  return (
    <Drawer title="NUEVO PROSPECTO" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await createProspect(f);
            if (res.error) toast.error(res.error);
            else {
              toast.success("Prospecto creado.");
              onClose();
            }
          });
        }}
      >
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nombre *" maxLength={120} className={input} aria-label="Nombre" required />
        <input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Empresa" maxLength={120} className={input} aria-label="Empresa" />
        <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Teléfono / WhatsApp" maxLength={40} className={input} aria-label="Teléfono" />
        <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Correo" type="email" maxLength={200} className={input} aria-label="Correo" />
        <input value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} placeholder="Servicio de interés" maxLength={80} className={input} aria-label="Servicio" />
        <textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="¿De qué se trata? *" rows={4} maxLength={3000} className={input} aria-label="Descripción" required />
        <button type="submit" disabled={pending} className="rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50">Crear prospecto</button>
      </form>
    </Drawer>
  );
}
