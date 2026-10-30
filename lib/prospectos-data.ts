import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Prospect, Task } from "@/lib/prospectos";

interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  message: string;
  status: Prospect["status"];
  source?: Prospect["source"];
  notes?: string;
  next_action?: string;
  next_action_on?: string | null;
  assigned_to?: string | null;
  created_at: string;
}

export async function listProspects(): Promise<{ items: Prospect[]; migrated: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(300);
  return {
    migrated: !error,
    items: ((data ?? []) as LeadRow[]).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      company: r.company,
      service: r.service,
      message: r.message,
      status: r.status,
      source: r.source ?? "web",
      notes: r.notes ?? "",
      nextAction: r.next_action ?? "",
      nextActionOn: r.next_action_on ?? null,
      assignedTo: r.assigned_to ?? null,
      createdAt: r.created_at,
    })),
  };
}

export async function listTasks(projectId: string): Promise<Task[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("*").eq("project_id", projectId).order("position");
  return ((data ?? []) as { id: string; project_id: string; title: string; notes: string; status: Task["status"]; assigned_to: string | null; due_on: string | null; position: number }[]).map((t) => ({
    id: t.id,
    projectId: t.project_id,
    title: t.title,
    notes: t.notes,
    status: t.status,
    assignedTo: t.assigned_to,
    dueOn: t.due_on,
    position: t.position,
  }));
}
