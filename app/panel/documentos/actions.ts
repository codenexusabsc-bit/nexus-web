"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { TEMPLATES } from "@/lib/plantillas";
import { createClient } from "@/lib/supabase/server";
import type { PMNode } from "@/lib/pdf/nexus-document";

export interface DocResult {
  error?: string;
  version?: number;
}

const uuid = z.uuid({ error: "Identificador inválido." });

export async function createDocument(formData: FormData): Promise<void> {
  await getCurrentUser();
  const template = String(formData.get("template") ?? "blanco");
  const tpl = TEMPLATES.find((t) => t.id === template);
  if (!tpl) throw new Error("Plantilla desconocida");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200) || tpl.name;

  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").insert({ title, template: tpl.id }).select("id").single();
  if (error || !data) throw new Error("No se pudo crear el documento. ¿Ya se aplicó la migración 005?");
  revalidatePath("/panel/documentos");
  redirect(`/panel/documentos/${data.id}`);
}

const varsSchema = z.record(z.string().max(40), z.string().max(500));

const saveSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1, { error: "El documento necesita un título." }).max(200),
  content: z.custom<PMNode>((v) => typeof v === "object" && v !== null && (v as PMNode).type === "doc", {
    error: "Contenido inválido.",
  }),
  variables: varsSchema,
  projectId: uuid.nullable(),
});

export async function saveDocument(input: z.input<typeof saveSchema>): Promise<DocResult> {
  await getCurrentUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (JSON.stringify(d.content).length > 900_000) return { error: "El documento es demasiado grande." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_document", {
    p_id: d.id,
    p_title: d.title,
    p_content: d.content,
    p_variables: d.variables,
    p_project_id: d.projectId,
  });
  if (error) {
    return { error: error.message.includes("firmado") ? "Este documento ya está firmado y no se puede editar." : "No se pudo guardar." };
  }
  revalidatePath("/panel/documentos");
  return { version: data as number };
}

/** Trae el contenido de una versión anterior para cargarlo en el editor (no guarda nada). */
export async function loadVersion(versionId: string): Promise<{ error?: string; title?: string; content?: PMNode; variables?: Record<string, string> }> {
  await getCurrentUser();
  if (!uuid.safeParse(versionId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { data } = await supabase.from("document_versions").select("title, content, variables").eq("id", versionId).single();
  if (!data) return { error: "No se encontró la versión." };
  return { title: data.title, content: data.content as PMNode, variables: (data.variables ?? {}) as Record<string, string> };
}

export async function duplicateDocument(id: string): Promise<void> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) throw new Error("Datos inválidos.");
  const supabase = await createClient();
  const { data: src } = await supabase.from("documents").select("title, template, project_id, content, variables").eq("id", id).single();
  if (!src) throw new Error("No se encontró el documento.");
  const { data, error } = await supabase
    .from("documents")
    .insert({ ...src, title: `${src.title} (copia)`.slice(0, 200) })
    .select("id")
    .single();
  if (error || !data) throw new Error("No se pudo duplicar.");
  revalidatePath("/panel/documentos");
  redirect(`/panel/documentos/${data.id}`);
}

export async function deleteDocument(id: string): Promise<DocResult> {
  await getCurrentUser();
  if (!uuid.safeParse(id).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("documents").delete().eq("id", id).neq("status", "firmado");
  if (error) return { error: "No se pudo borrar." };
  revalidatePath("/panel/documentos");
  return {};
}
