/** Tipos de prospectos y tareas (compartidos entre servidor y cliente). */

export const LEAD_STAGES = [
  { id: "nuevo", label: "Nuevos", color: "#0891B2" },
  { id: "contactado", label: "Contactados", color: "#6D28D9" },
  { id: "cotizado", label: "Cotizados", color: "#EA580C" },
  { id: "ganado", label: "Ganados", color: "#0F766E" },
  { id: "perdido", label: "Perdidos", color: "#64748B" },
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number]["id"];

export interface Prospect {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  message: string;
  status: LeadStage;
  source: "web" | "manual";
  notes: string;
  nextAction: string;
  nextActionOn: string | null;
  assignedTo: string | null;
  createdAt: string;
}

export const TASK_STAGES = [
  { id: "pendiente", label: "Por hacer", color: "#6D28D9" },
  { id: "en_curso", label: "En curso", color: "#EA580C" },
  { id: "hecha", label: "Hechas", color: "#0F766E" },
] as const;

export type TaskStage = (typeof TASK_STAGES)[number]["id"];

export interface Task {
  id: string;
  projectId: string;
  title: string;
  notes: string;
  status: TaskStage;
  assignedTo: string | null;
  dueOn: string | null;
  position: number;
}

/** WhatsApp con indicativo de Colombia si el número tiene 10 dígitos. */
export function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `57${d}` : d;
}
