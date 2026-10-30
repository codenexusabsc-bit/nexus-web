import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, categoryOf, toAgendaItem, type AgendaRow, type CalendarEntry } from "@/lib/agenda";
import { fromBogotaWall, isWallDate, isWallDateTime, toBogotaWall } from "@/lib/dates";
import { firstName } from "@/lib/format";

/**
 * Eventos del calendario entre start y end (horas de pared de Colombia, como las
 * envía FullCalendar con timeZone "UTC"): recordatorios, mensajes y solicitudes.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return Response.json({ error: "Sin sesión" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const start = (sp.get("start") ?? "").slice(0, 19);
  const end = (sp.get("end") ?? "").slice(0, 19);
  if (!(isWallDateTime(start) || isWallDate(start)) || !(isWallDateTime(end) || isWallDate(end))) {
    return Response.json({ error: "Rango inválido" }, { status: 400 });
  }
  const from = fromBogotaWall(start.length === 10 ? `${start}T00:00` : start);
  const to = fromBogotaWall(end.length === 10 ? `${end}T00:00` : end);
  const fromDate = start.slice(0, 10);
  const toDate = end.slice(0, 10);

  const [agenda, requests, partners, projects, tasks, leads] = await Promise.all([
    supabase.from("agenda_items").select("*").gte("starts_at", from).lt("starts_at", to),
    supabase
      .from("doc_requests")
      .select("id, title, status, due_date, delivered_at, requested_by, requested_to, project_id")
      .or(`requested_to.eq.${userId},requested_by.eq.${userId}`)
      .neq("status", "accepted"),
    supabase.from("profiles").select("id, full_name").eq("role", "partner"),
    supabase.from("projects").select("id, name"),
    supabase
      .from("tasks")
      .select("id, title, project_id, due_on")
      .neq("status", "hecha")
      .or(`assigned_to.eq.${userId},assigned_to.is.null`)
      .gte("due_on", fromDate)
      .lt("due_on", toDate),
    supabase
      .from("leads")
      .select("id, name, next_action, next_action_on")
      .not("status", "in", "(ganado,perdido)")
      .or(`assigned_to.eq.${userId},assigned_to.is.null`)
      .gte("next_action_on", fromDate)
      .lt("next_action_on", toDate),
  ]);

  const names = Object.fromEntries(((partners.data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, firstName(p.full_name)]));
  const projectNames = Object.fromEntries(((projects.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
  const events: object[] = [];

  for (const row of (agenda.data ?? []) as AgendaRow[]) {
    const item = toAgendaItem(row);
    const category = categoryOf(item, userId);
    const unseen = category === "mensaje-recibido" && !item.seenAt;
    const startWall = toBogotaWall(item.startsAt);
    events.push({
      id: item.id,
      title: `${item.kind === "mensaje" ? "✉ " : ""}${item.title}`,
      start: item.allDay ? startWall.slice(0, 10) : startWall,
      end: item.endsAt ? (item.allDay ? toBogotaWall(item.endsAt).slice(0, 10) : toBogotaWall(item.endsAt)) : undefined,
      allDay: item.allDay,
      backgroundColor: CATEGORIES[category].color,
      borderColor: CATEGORIES[category].color,
      editable: item.createdBy === userId,
      classNames: [item.doneAt ? "is-done" : "", unseen ? "is-unseen" : ""].filter(Boolean),
      extendedProps: { entry: { source: "agenda", category, item } satisfies CalendarEntry },
    });
  }

  for (const r of (requests.data ?? []) as {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
    delivered_at: string | null;
    requested_by: string;
    requested_to: string;
    project_id: string;
  }[]) {
    const open = r.status === "pending" || r.status === "returned";
    let category: "entregar" | "revisar" | "esperando" | null = null;
    let date: string | null = null;
    if (r.requested_to === userId && open && r.due_date) {
      category = "entregar";
      date = r.due_date;
    } else if (r.requested_by === userId && r.status === "delivered" && r.delivered_at) {
      category = "revisar";
      date = toBogotaWall(r.delivered_at).slice(0, 10);
    } else if (r.requested_by === userId && open && r.due_date) {
      category = "esperando";
      date = r.due_date;
    }
    if (!category || !date || date < fromDate || date >= toDate) continue;
    const prefix = { entregar: "Entregar", revisar: "Revisar", esperando: "Espero" }[category];
    events.push({
      id: `sol-${r.id}`,
      title: `${prefix}: ${r.title}`,
      start: date,
      allDay: true,
      editable: false,
      backgroundColor: CATEGORIES[category].color,
      borderColor: CATEGORIES[category].color,
      extendedProps: {
        entry: {
          source: "solicitud",
          category,
          requestId: r.id,
          title: r.title,
          projectName: projectNames[r.project_id] ?? "",
          who: names[r.requested_to === userId ? r.requested_by : r.requested_to] ?? "",
        } satisfies CalendarEntry,
      },
    });
  }

  // Tareas y seguimientos (si la migración 009 aún no está, estas consultas fallan sin romper la agenda)
  for (const t of (tasks.data ?? []) as { id: string; title: string; project_id: string; due_on: string }[]) {
    events.push({
      id: `tarea-${t.id}`,
      title: `Tarea: ${t.title}`,
      start: t.due_on,
      allDay: true,
      editable: false,
      backgroundColor: CATEGORIES.tarea.color,
      borderColor: CATEGORIES.tarea.color,
      extendedProps: {
        entry: { source: "tarea", category: "tarea", taskId: t.id, projectId: t.project_id, title: t.title, projectName: projectNames[t.project_id] ?? "" } satisfies CalendarEntry,
      },
    });
  }
  for (const l of (leads.data ?? []) as { id: string; name: string; next_action: string; next_action_on: string }[]) {
    events.push({
      id: `lead-${l.id}`,
      title: `${l.next_action || "Seguimiento"}: ${l.name}`,
      start: l.next_action_on,
      allDay: true,
      editable: false,
      backgroundColor: CATEGORIES.seguimiento.color,
      borderColor: CATEGORIES.seguimiento.color,
      extendedProps: {
        entry: { source: "prospecto", category: "seguimiento", leadId: l.id, title: l.name, action: l.next_action } satisfies CalendarEntry,
      },
    });
  }

  return Response.json(events);
}
