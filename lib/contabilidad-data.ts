import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LedgerEntry } from "@/lib/contabilidad";

interface Row {
  id: string;
  kind: LedgerEntry["kind"];
  concept: string;
  counterparty: string;
  amount: number | string;
  entry_date: string;
  reference: string;
  notes: string;
  collection_account_id: string | null;
  project_id: string | null;
  file_key: string | null;
  file_name: string;
  file_mime: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
}

/** Últimos movimientos. `migrated` es falso si falta la migración 012. */
export async function listLedger(limit = 300): Promise<{ items: LedgerEntry[]; migrated: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ledger_entries").select("*").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  return {
    migrated: !error,
    items: ((data ?? []) as Row[]).map((r) => ({
      id: r.id,
      kind: r.kind,
      concept: r.concept,
      counterparty: r.counterparty,
      amount: Number(r.amount),
      entryDate: r.entry_date,
      reference: r.reference,
      notes: r.notes,
      collectionAccountId: r.collection_account_id,
      projectId: r.project_id,
      hasFile: Boolean(r.file_key),
      fileName: r.file_name,
      fileMime: r.file_mime,
      fileSize: r.file_size,
      uploadedBy: r.uploaded_by,
      createdAt: r.created_at,
    })),
  };
}
