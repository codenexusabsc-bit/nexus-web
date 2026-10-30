import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Billing, CollectionAccount, Quote, QuoteItem } from "@/lib/cotizaciones";

interface QuoteRow {
  id: string;
  number: number;
  title: string;
  client_name: string;
  client_id_number: string;
  client_email: string;
  project_id: string | null;
  items: QuoteItem[];
  discount: number | string;
  tax_rate: number | string;
  total: number | string;
  notes: string;
  delivery_time: string;
  valid_until: string | null;
  status: Quote["status"];
  document_id: string | null;
  created_at: string;
}

export const toQuote = (r: QuoteRow): Quote => ({
  id: r.id,
  number: r.number,
  title: r.title,
  clientName: r.client_name,
  clientIdNumber: r.client_id_number,
  clientEmail: r.client_email,
  projectId: r.project_id,
  items: Array.isArray(r.items) ? r.items : [],
  discount: Number(r.discount),
  taxRate: Number(r.tax_rate),
  total: Number(r.total),
  notes: r.notes,
  deliveryTime: r.delivery_time,
  validUntil: r.valid_until,
  status: r.status,
  documentId: r.document_id,
  createdAt: r.created_at,
});

interface CollectionRow {
  id: string;
  number: number;
  client_name: string;
  client_id_number: string;
  concept: string;
  amount: number | string;
  issued_on: string;
  due_on: string | null;
  status: CollectionAccount["status"];
  paid_on: string | null;
  project_id: string | null;
  document_id: string | null;
  notes: string;
}

export const toCollection = (r: CollectionRow): CollectionAccount => ({
  id: r.id,
  number: r.number,
  clientName: r.client_name,
  clientIdNumber: r.client_id_number,
  concept: r.concept,
  amount: Number(r.amount),
  issuedOn: r.issued_on,
  dueOn: r.due_on,
  status: r.status,
  paidOn: r.paid_on,
  projectId: r.project_id,
  documentId: r.document_id,
  notes: r.notes,
});

export async function listQuotes(): Promise<Quote[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("*").order("number", { ascending: false });
  return ((data ?? []) as QuoteRow[]).map(toQuote);
}

export async function getQuote(id: string): Promise<Quote | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  return data ? toQuote(data as QuoteRow) : null;
}

export async function listCollections(): Promise<CollectionAccount[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("collection_accounts").select("*").order("number", { ascending: false });
  return ((data ?? []) as CollectionRow[]).map(toCollection);
}

export async function getBilling(): Promise<Billing> {
  const supabase = await createClient();
  const { data } = await supabase.from("billing_settings").select("*").maybeSingle();
  return {
    issuerName: data?.issuer_name ?? "Nexus Ingeniería",
    issuerId: data?.issuer_id ?? "",
    issuerCity: data?.issuer_city ?? "",
    bankInfo: data?.bank_info ?? "",
    paymentTerms: data?.payment_terms ?? "50 % al aprobar y 50 % a la entrega.",
  };
}
