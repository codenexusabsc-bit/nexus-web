"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { collectionDocument, collectionNumber, quoteDocument, quoteNumber, totals } from "@/lib/cotizaciones";
import { getBilling, getQuote, toCollection } from "@/lib/cotizaciones-data";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export interface QResult {
  error?: string;
}

const uuid = z.uuid({ error: "Identificador inválido." });
const date = z.union([z.literal(""), z.iso.date({ error: "Fecha inválida." })]);
const refresh = () => revalidatePath("/panel/cotizaciones", "layout");

export async function createQuote(formData: FormData): Promise<void> {
  await getCurrentUser();
  const client = String(formData.get("client") ?? "").trim().slice(0, 120) || "Cliente";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .insert({ client_name: client, items: [{ description: "", qty: 1, unitPrice: 0 }] })
    .select("id")
    .single();
  if (error || !data) throw new Error("No se pudo crear la cotización. ¿Ya se aplicó la migración 008?");
  refresh();
  redirect(`/panel/cotizaciones/${data.id}`);
}

const quoteSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1, { error: "Ponle un título." }).max(200),
  clientName: z.string().trim().min(1, { error: "Escribe el cliente." }).max(120),
  clientIdNumber: z.string().trim().max(40),
  clientEmail: z.union([z.literal(""), z.email({ error: "Correo inválido." })]),
  projectId: uuid.nullable(),
  items: z
    .array(
      z.object({
        description: z.string().trim().max(300),
        qty: z.number().min(0).max(100000),
        unitPrice: z.number().min(0).max(10_000_000_000),
      })
    )
    .max(50),
  discount: z.number().min(0),
  taxRate: z.number().min(0).max(100),
  notes: z.string().trim().max(2000),
  deliveryTime: z.string().trim().max(120),
  validUntil: date,
});

export async function saveQuote(input: z.input<typeof quoteSchema>): Promise<QResult> {
  await getCurrentUser();
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const q = parsed.data;
  const items = q.items.filter((it) => it.description || it.unitPrice);
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotes")
    .update({
      title: q.title,
      client_name: q.clientName,
      client_id_number: q.clientIdNumber,
      client_email: q.clientEmail,
      project_id: q.projectId,
      items,
      discount: q.discount,
      tax_rate: q.taxRate,
      total: totals(items, q.discount, q.taxRate).total,
      notes: q.notes,
      delivery_time: q.deliveryTime,
      valid_until: q.validUntil || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", q.id);
  if (error) return { error: "No se pudo guardar la cotización." };
  refresh();
  return {};
}

export async function setQuoteStatus(id: string, status: string): Promise<QResult> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success || !["borrador", "enviada", "aceptada", "rechazada"].includes(status)) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("quotes").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "No se pudo cambiar el estado." };
  refresh();
  return {};
}

export async function deleteQuote(id: string): Promise<QResult> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("quotes").delete().eq("id", id).neq("status", "aceptada");
  if (error) return { error: "No se pudo borrar." };
  refresh();
  return {};
}

/** Crea (o abre) el documento de la cotización en el editor, listo para enviar a firmar. */
export async function quoteToDocument(id: string): Promise<void> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) throw new Error("Datos inválidos.");
  const [q, billing] = await Promise.all([getQuote(id), getBilling()]);
  if (!q) throw new Error("No se encontró la cotización.");
  if (q.documentId) redirect(`/panel/documentos/${q.documentId}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: `${quoteNumber(q.number)} · ${q.title}`.slice(0, 200),
      template: "propuesta",
      project_id: q.projectId,
      content: quoteDocument(q, billing, formatDate),
      variables: { cliente: q.clientName, documento: q.clientIdNumber, valor: String(q.total) },
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("No se pudo crear el documento.");
  await supabase.from("quotes").update({ document_id: data.id, status: q.status === "borrador" ? "enviada" : q.status }).eq("id", id);
  refresh();
  redirect(`/panel/documentos/${data.id}`);
}

/** Cuenta de cobro a partir de una cotización aceptada. */
export async function collectionFromQuote(id: string): Promise<void> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) throw new Error("Datos inválidos.");
  const q = await getQuote(id);
  if (!q) throw new Error("No se encontró la cotización.");
  const supabase = await createClient();
  const { error } = await supabase.from("collection_accounts").insert({
    client_name: q.clientName,
    client_id_number: q.clientIdNumber,
    concept: `${q.title} (${quoteNumber(q.number)})`.slice(0, 500),
    amount: q.total,
    project_id: q.projectId,
    quote_id: q.id,
  });
  if (error) throw new Error("No se pudo crear la cuenta de cobro.");
  refresh();
  redirect("/panel/cotizaciones?tab=cobros");
}

// ---- Cuentas de cobro ---------------------------------------

const collectionSchema = z.object({
  clientName: z.string().trim().min(1, { error: "Escribe el cliente." }).max(120),
  clientIdNumber: z.string().trim().max(40),
  concept: z.string().trim().min(3, { error: "Escribe el concepto." }).max(500),
  amount: z.number({ error: "Valor inválido." }).positive({ error: "El valor debe ser mayor que cero." }).max(10_000_000_000),
  issuedOn: z.iso.date({ error: "Fecha inválida." }),
  dueOn: date,
  projectId: uuid.nullable(),
  notes: z.string().trim().max(1000),
});

export async function createCollection(input: z.input<typeof collectionSchema>): Promise<QResult> {
  await getCurrentUser();
  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const c = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("collection_accounts").insert({
    client_name: c.clientName,
    client_id_number: c.clientIdNumber,
    concept: c.concept,
    amount: c.amount,
    issued_on: c.issuedOn,
    due_on: c.dueOn || null,
    project_id: c.projectId,
    notes: c.notes,
  });
  if (error) return { error: "No se pudo crear la cuenta de cobro. ¿Ya se aplicó la migración 008?" };
  refresh();
  return {};
}

export async function setCollectionStatus(id: string, status: "pendiente" | "pagada" | "anulada", paidOn?: string): Promise<QResult> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_accounts")
    .update({ status, paid_on: status === "pagada" ? paidOn || new Date().toISOString().slice(0, 10) : null })
    .eq("id", id);
  if (error) return { error: "No se pudo actualizar." };
  refresh();
  return {};
}

export async function collectionToDocument(id: string): Promise<void> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) throw new Error("Datos inválidos.");
  const supabase = await createClient();
  const [{ data: row }, billing] = await Promise.all([supabase.from("collection_accounts").select("*").eq("id", id).single(), getBilling()]);
  if (!row) throw new Error("No se encontró la cuenta de cobro.");
  const c = toCollection(row);
  if (c.documentId) redirect(`/panel/documentos/${c.documentId}`);
  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: `Cuenta de cobro ${collectionNumber(c.number)} · ${c.clientName}`.slice(0, 200),
      template: "cuenta-cobro",
      project_id: c.projectId,
      content: collectionDocument(c, billing, formatDate),
      variables: {},
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("No se pudo crear el documento.");
  await supabase.from("collection_accounts").update({ document_id: data.id }).eq("id", id);
  refresh();
  redirect(`/panel/documentos/${data.id}`);
}

const billingSchema = z.object({
  issuerName: z.string().trim().min(1).max(120),
  issuerId: z.string().trim().max(40),
  issuerCity: z.string().trim().max(80),
  bankInfo: z.string().trim().max(300),
  paymentTerms: z.string().trim().max(300),
});

export async function saveBilling(input: z.input<typeof billingSchema>): Promise<QResult> {
  await getCurrentUser();
  const parsed = billingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const b = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("billing_settings")
    .update({ issuer_name: b.issuerName, issuer_id: b.issuerId, issuer_city: b.issuerCity, bank_info: b.bankInfo, payment_terms: b.paymentTerms, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { error: "No se pudieron guardar los datos." };
  refresh();
  return {};
}
