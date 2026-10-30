/** Tipos y colores de la agenda (compartidos entre servidor y cliente). */

export type AgendaKind = "recordatorio" | "mensaje";

export interface AgendaItem {
  id: string;
  kind: AgendaKind;
  title: string;
  notes: string;
  startsAt: string; // instante ISO
  endsAt: string | null;
  allDay: boolean;
  createdBy: string;
  recipient: string | null;
  shared: boolean;
  doneAt: string | null;
  seenAt: string | null;
}

export interface AgendaRow {
  id: string;
  kind: AgendaKind;
  title: string;
  notes: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  created_by: string;
  recipient: string | null;
  shared: boolean;
  done_at: string | null;
  seen_at: string | null;
}

export function toAgendaItem(r: AgendaRow): AgendaItem {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    notes: r.notes,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    allDay: r.all_day,
    createdBy: r.created_by,
    recipient: r.recipient,
    shared: r.shared,
    doneAt: r.done_at,
    seenAt: r.seen_at,
  };
}

/** Categoría visual de cada evento del calendario. */
export type AgendaCategory =
  | "privado"
  | "compartido"
  | "mensaje-recibido"
  | "mensaje-enviado"
  | "entregar"
  | "revisar"
  | "esperando";

export const CATEGORIES: Record<AgendaCategory, { label: string; color: string }> = {
  privado: { label: "Mis recordatorios", color: "#9333EA" },
  compartido: { label: "Compartidos", color: "#0F766E" },
  "mensaje-recibido": { label: "Mensajes de mi socio", color: "#EA580C" },
  "mensaje-enviado": { label: "Mensajes que envié", color: "#DB2777" },
  entregar: { label: "Documentos que me piden", color: "#DC2626" },
  revisar: { label: "Entregas por revisar", color: "#0891B2" },
  esperando: { label: "Documentos que pedí", color: "#64748B" },
};

export function categoryOf(item: AgendaItem, userId: string): AgendaCategory {
  if (item.kind === "mensaje") return item.recipient === userId ? "mensaje-recibido" : "mensaje-enviado";
  return item.shared ? "compartido" : "privado";
}

/** Lo que el calendario recibe de /api/agenda. */
export type CalendarEntry =
  | { source: "agenda"; category: AgendaCategory; item: AgendaItem }
  | {
      source: "solicitud";
      category: "entregar" | "revisar" | "esperando";
      requestId: string;
      title: string;
      projectName: string;
      who: string;
    };
