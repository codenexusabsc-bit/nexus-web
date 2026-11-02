import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ActivityAction, ActivityEntry } from "@/lib/actividad";

interface Row {
  id: number;
  at: string;
  actor: string | null;
  action: ActivityAction;
  table_name: string;
  record_id: string;
  summary: string;
}

/** Últimos movimientos, del más reciente al más antiguo. `migrated` es falso si falta la migración 010. */
export async function listActivity(limit = 200): Promise<{ items: ActivityEntry[]; migrated: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, at, actor, action, table_name, record_id, summary")
    .order("at", { ascending: false })
    .limit(limit);
  return {
    migrated: !error,
    items: ((data ?? []) as Row[]).map((r) => ({
      id: r.id,
      at: r.at,
      actor: r.actor,
      action: r.action,
      table: r.table_name,
      recordId: r.record_id,
      summary: r.summary,
    })),
  };
}
