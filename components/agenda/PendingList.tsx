import Link from "next/link";
import { BellRing, Inbox, Mail, MessageSquareText, SearchCheck } from "lucide-react";
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

  const [messages, reminders, toReview, toMe, partners, leads] = await Promise.all([
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
  ]);

  const names = Object.fromEntries(((partners.data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, firstName(p.full_name)]));
  const msgs = (messages.data ?? []) as Row[];
  const rems = (reminders.data ?? []) as Row[];
  const review = (toReview.data ?? []) as Row[];
  const owe = (toMe.data ?? []) as Row[];
  const newLeads = leads.count ?? 0;
  const empty = !msgs.length && !rems.length && !review.length && !owe.length && !newLeads;

  return (
    <aside className="flex flex-col gap-4" aria-label="Pendientes">
      <h2 className="font-pixel text-sm text-purple">PENDIENTES</h2>
      {empty && (
        <p className="rounded-xl border border-dashed border-border bg-white p-5 text-center text-sm text-muted">
          Todo al día. Nada pendiente por ahora.
        </p>
      )}

      {msgs.length > 0 && (
        <Group icon={<Mail size={15} />} title="Mensajes de tu socio" color="#EA580C">
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
        <Group icon={<SearchCheck size={15} />} title="Te entregaron, por revisar" color="#0891B2">
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
        <Group icon={<Inbox size={15} />} title="Te piden" color="#DC2626">
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
        <Group icon={<BellRing size={15} />} title="Recordatorios de hoy y atrasados" color="#9333EA">
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

      {newLeads > 0 && (
        <Link href="/panel/sitio#mensajes" className="flex items-center gap-3 rounded-xl border border-violet/40 bg-violet/10 p-4 text-sm text-navy transition hover:border-violet">
          <MessageSquareText size={18} className="text-violet" />
          <span>
            <b>{newLeads}</b> {newLeads === 1 ? "mensaje nuevo desde la página" : "mensajes nuevos desde la página"}
          </span>
        </Link>
      )}
    </aside>
  );
}

function Group({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-white p-4" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color }}>
        {icon} {title}
      </h3>
      <ul className="flex flex-col gap-3 text-sm">{children}</ul>
    </section>
  );
}
