import Link from "next/link";
import { BellRing, CalendarClock, ListTodo, Inbox, Mail, MessageSquareText, SearchCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fromBogotaWall, toBogotaWall, addDays } from "@/lib/dates";
import { firstName, formatDate, formatDateTime } from "@/lib/format";
import { QuickCheck } from "./SeenButton";

interface Row {
  id: string;
  title: string;
  notes?: string;
  starts_at?: string;
  created_by?: string;
  all_day?: boolean;
  due_date?: string | null;
  requested_by?: string;
  requested_to?: string;
  delivered_at?: string | null;
}

/** Columna de pendientes junto al calendario: lo que requiere atención hoy. */
export async function PendingList({ userId }: { userId: string }) {
  const supabase = await createClient();
  const today = toBogotaWall(new Date()).slice(0, 10);
  const endOfToday = fromBogotaWall(`${addDays(today, 1)}T00:00`);

  const [messages, reminders, toReview, toMe, partners, leads, tasks, followUps] = await Promise.all([
    supabase.from("agenda_items").select("id, title, notes, starts_at, created_by").eq("kind", "mensaje").eq("recipient", userId).is("seen_at", null).order("starts_at"),
    supabase
      .from("agenda_items")
      .select("id, title, starts_at, all_day")
      .eq("kind", "recordatorio")
      .is("done_at", null)
      .lt("starts_at", endOfToday)
      .or(`created_by.eq.${userId},shared.eq.true`)
      .order("starts_at")
      .limit(10),
    supabase.from("doc_requests").select("id, title, requested_to, delivered_at").eq("requested_by", userId).eq("status", "delivered"),
    supabase.from("doc_requests").select("id, title, requested_by, due_date").eq("requested_to", userId).in("status", ["pending", "returned"]).order("due_date", { nullsFirst: false }),
    supabase.from("profiles").select("id, full_name").eq("role", "partner"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "nuevo"),
    supabase.from("tasks").select("id, title, due_on, project_id").neq("status", "hecha").eq("assigned_to", userId).lte("due_on", today).order("due_on"),
    supabase
      .from("leads")
      .select("id, name, next_action, next_action_on")
      .not("status", "in", "(ganado,perdido)")
      .or(`assigned_to.eq.${userId},assigned_to.is.null`)
      .lte("next_action_on", today)
      .order("next_action_on"),
  ]);

  const names = Object.fromEntries(((partners.data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, firstName(p.full_name)]));
  const msgs = (messages.data ?? []) as Row[];
  const rems = (reminders.data ?? []) as Row[];
  const review = (toReview.data ?? []) as Row[];
  const owe = (toMe.data ?? []) as Row[];
  const newLeads = leads.count ?? 0;
  const myTasks = (tasks.data ?? []) as { id: string; title: string; due_on: string; project_id: string }[];
  const follow = (followUps.data ?? []) as { id: string; name: string; next_action: string; next_action_on: string }[];
  const total = msgs.length + rems.length + review.length + owe.length + newLeads + myTasks.length + follow.length;
  const empty = total === 0;

  return (
    <aside className="flex flex-col gap-3" aria-label="Pendientes">
      {/* Encabezado destacado con el total */}
      <div className="relative overflow-hidden rounded-2xl bg-navy px-5 py-4 text-white shadow-lg shadow-purple/20">
        <div className="absolute -top-8 -right-8 size-28 rounded-full bg-violet/40 blur-2xl" aria-hidden="true" />
        <p className="relative font-pixel text-xs tracking-[0.25em] text-cyan">PENDIENTES</p>
        <p className="relative mt-1 flex items-baseline gap-2">
          <span className="text-4xl font-bold">{total}</span>
          <span className="text-sm text-white/75">{empty ? "todo al día" : total === 1 ? "cosa por atender" : "cosas por atender"}</span>
        </p>
      </div>
      {empty && (
        <p className="rounded-xl border border-dashed border-border bg-white p-5 text-center text-sm text-muted">
          Nada pendiente por ahora. Cuando tu socio te escriba o te pida algo, aparece aquí.
        </p>
      )}

      {msgs.length > 0 && (
        <Group icon={<Mail size={18} />} title="Mensajes de tu socio" color="#EA580C" count={msgs.length}>
          {msgs.map((m) => (
            <li key={m.id} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-navy">{m.title}</p>
                <p className="text-xs text-muted">
                  {names[m.created_by ?? ""] ?? "Socio"} · {m.starts_at && formatDateTime(m.starts_at)}
                </p>
                {m.notes && <p className="mt-0.5 line-clamp-2 text-xs text-text/80">{m.notes}</p>}
              </div>
              <QuickCheck id={m.id} action="leido" label="Leído" />
            </li>
          ))}
        </Group>
      )}

      {review.length > 0 && (
        <Group icon={<SearchCheck size={18} />} title="Te entregaron, por revisar" color="#0891B2" count={review.length}>
          {review.map((r) => (
            <li key={r.id}>
              <Link href="/panel/solicitudes" className="block hover:text-purple">
                <p className="font-medium text-navy">{r.title}</p>
                <p className="text-xs text-muted">
                  {names[r.requested_to ?? ""]} · {r.delivered_at && formatDateTime(r.delivered_at)}
                </p>
              </Link>
            </li>
          ))}
        </Group>
      )}

      {owe.length > 0 && (
        <Group icon={<Inbox size={18} />} title="Te piden" color="#DC2626" count={owe.length}>
          {owe.map((r) => (
            <li key={r.id}>
              <Link href="/panel/solicitudes" className="block hover:text-purple">
                <p className="font-medium text-navy">{r.title}</p>
                <p className={`text-xs ${r.due_date && r.due_date < today ? "font-semibold text-red-600" : "text-muted"}`}>
                  {names[r.requested_by ?? ""]}
                  {r.due_date && ` · límite ${formatDate(r.due_date)}${r.due_date < today ? " (vencida)" : ""}`}
                </p>
              </Link>
            </li>
          ))}
        </Group>
      )}

      {rems.length > 0 && (
        <Group icon={<BellRing size={18} />} title="Recordatorios de hoy y atrasados" color="#9333EA" count={rems.length}>
          {rems.map((r) => {
            const day = r.starts_at ? toBogotaWall(r.starts_at).slice(0, 10) : today;
            return (
              <li key={r.id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy">{r.title}</p>
                  <p className={`text-xs ${day < today ? "font-semibold text-red-600" : "text-muted"}`}>
                    {day < today ? `Atrasado · ${formatDate(day)}` : r.all_day ? "Hoy" : `Hoy · ${toBogotaWall(r.starts_at!).slice(11, 16)}`}
                  </p>
                </div>
                <QuickCheck id={r.id} action="hecho" label="Hecho" />
              </li>
            );
          })}
        </Group>
      )}

      {myTasks.length > 0 && (
        <Group icon={<ListTodo size={18} />} title="Tus tareas para hoy y atrasadas" color="#4F46E5" count={myTasks.length}>
          {myTasks.map((t) => (
            <li key={t.id}>
              <Link href={`/panel/carpeta/${t.project_id}`} className="block hover:text-purple">
                <p className="font-medium text-navy">{t.title}</p>
                <p className={`text-xs ${t.due_on < today ? "font-semibold text-red-600" : "text-muted"}`}>{t.due_on < today ? `Atrasada · ${formatDate(t.due_on)}` : "Hoy"}</p>
              </Link>
            </li>
          ))}
        </Group>
      )}

      {follow.length > 0 && (
        <Group icon={<CalendarClock size={18} />} title="Seguimiento a prospectos" color="#CA8A04" count={follow.length}>
          {follow.map((l) => (
            <li key={l.id}>
              <Link href="/panel/prospectos" className="block hover:text-purple">
                <p className="font-medium text-navy">{l.next_action || "Seguimiento"}: {l.name}</p>
                <p className={`text-xs ${l.next_action_on < today ? "font-semibold text-red-600" : "text-muted"}`}>{l.next_action_on < today ? `Atrasado · ${formatDate(l.next_action_on)}` : "Hoy"}</p>
              </Link>
            </li>
          ))}
        </Group>
      )}

      {newLeads > 0 && (
        <Link href="/panel/prospectos" className="flex items-center gap-3 rounded-xl border border-violet/40 bg-violet/10 p-4 text-sm text-navy transition hover:border-violet">
          <MessageSquareText size={18} className="text-violet" />
          <span>
            <b>{newLeads}</b> {newLeads === 1 ? "mensaje nuevo desde la página" : "mensajes nuevos desde la página"}
          </span>
        </Link>
      )}
    </aside>
  );
}

function Group({ icon, title, color, count, children }: { icon: React.ReactNode; title: string; color: string; count: number; children: React.ReactNode }) {
  return (
    <section className="rise overflow-hidden rounded-xl border border-border bg-white shadow-sm" style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
      <h3 className="flex items-center gap-2.5 px-4 pt-3 pb-2 text-[0.95rem] font-bold text-navy">
        <span className="flex size-8 items-center justify-center rounded-lg text-white" style={{ backgroundColor: color }}>
          {icon}
        </span>
        <span className="flex-1">{title}</span>
        <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: color }}>
          {count}
        </span>
      </h3>
      <ul className="flex flex-col divide-y divide-border px-4 pb-2 text-sm [&>li]:py-2.5">{children}</ul>
    </section>
  );
}
