"use client";

import { useTransition } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import { setLeadStatus } from "@/app/panel/sitio/actions";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  message: string;
  status: string;
  createdAt: string;
}

const STATUS = [
  ["nuevo", "Nuevo"],
  ["contactado", "Contactado"],
  ["cotizado", "Cotizado"],
  ["ganado", "Ganado"],
  ["perdido", "Perdido"],
] as const;

/** Mensajes del formulario de contacto. El tablero completo de prospectos llega en la Fase 8. */
export function LeadsList({ leads }: { leads: Lead[] }) {
  const [pending, startTransition] = useTransition();
  if (!leads.length) {
    return <p className="rounded-xl border border-dashed border-border bg-white px-6 py-8 text-center text-sm text-muted">Todavía no llegan mensajes desde la página.</p>;
  }
  return (
    <ul className={`flex flex-col gap-3 ${pending ? "opacity-70" : ""}`}>
      {leads.map((l) => {
        const digits = l.phone.replace(/\D/g, "");
        return (
          <li key={l.id} className={`flex flex-col gap-2 rounded-xl border bg-white p-4 ${l.status === "nuevo" ? "border-cyan" : "border-border"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-navy">
                  {l.name}
                  {l.company && <span className="font-normal text-muted"> · {l.company}</span>}
                </p>
                <p className="text-xs text-muted">
                  {formatDateTime(l.createdAt)}
                  {l.service && <> · {l.service}</>}
                </p>
              </div>
              <select
                value={l.status}
                onChange={(e) =>
                  startTransition(async () => {
                    const res = await setLeadStatus(l.id, e.target.value);
                    if (res.error) toast.error(res.error);
                  })
                }
                className="rounded-lg border border-border px-2 py-1 text-sm"
                aria-label="Estado del mensaje"
              >
                {STATUS.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <p className="whitespace-pre-line text-sm">{l.message}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {l.email && (
                <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 text-purple hover:underline">
                  <Mail size={14} /> {l.email}
                </a>
              )}
              {digits && (
                <>
                  <a href={`tel:${digits}`} className="inline-flex items-center gap-1 text-purple hover:underline">
                    <Phone size={14} /> {l.phone}
                  </a>
                  <a href={`https://wa.me/${digits.length === 10 ? `57${digits}` : digits}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#128C7E] hover:underline">
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
