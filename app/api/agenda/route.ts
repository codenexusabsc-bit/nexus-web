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

  const [agenda, requests, partners, projects] = await Promise.all([
    supabase.from("agenda_items").select("*").gte("starts_at", from).lt("starts_at", to),
    supabase
      .from("doc_requests")
      .select("id, title, status, due_date, delivered_at, requested_by, requested_to, project_id")
      .or(`requested_to.eq.${userId},requested_by.eq.${userId}`)
      .neq("status", "accepted"),
    supabase.from("profiles").select("id, full_name").eq("role", "partner"),
    supabase.from("projects").select("id, name"),
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

  return Response.json(events);
}
