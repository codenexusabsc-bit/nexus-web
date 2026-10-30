import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PMNode } from "@/lib/pdf/nexus-document";

export interface DocumentSummary {
  id: string;
  title: string;
  template: string;
  projectId: string | null;
  status: "borrador" | "en_firma" | "firmado";
  version: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface DocumentFull extends DocumentSummary {
  content: PMNode;
  variables: Record<string, string>;
}

export interface DocumentVersion {
  id: string;
  version: number;
  title: string;
  createdAt: string;
  createdBy: string | null;
}

interface Row {
  id: string;
  title: string;
  template: string;
  project_id: string | null;
  status: DocumentSummary["status"];
  version: number;
  updated_at: string;
  updated_by: string | null;
  content?: PMNode;
  variables?: Record<string, string>;
}

const summary = (r: Row): DocumentSummary => ({
  id: r.id,
  title: r.title,
  template: r.template,
  projectId: r.project_id,
  status: r.status,
  version: r.version,
  updatedAt: r.updated_at,
  updatedBy: r.updated_by,
});

export async function listDocuments(): Promise<DocumentSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id, title, template, project_id, status, version, updated_at, updated_by")
    .order("updated_at", { ascending: false });
  return ((data ?? []) as Row[]).map(summary);
}

export async function getDocument(id: string): Promise<DocumentFull | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const r = data as Row;
  return { ...summary(r), content: r.content ?? { type: "doc", content: [] }, variables: r.variables ?? {} };
}

export async function listVersions(documentId: string): Promise<DocumentVersion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_versions")
    .select("id, version, title, created_at, created_by")
    .eq("document_id", documentId)
    .order("version", { ascending: false })
    .limit(50);
  return ((data ?? []) as { id: string; version: number; title: string; created_at: string; created_by: string | null }[]).map((v) => ({
    id: v.id,
    version: v.version,
    title: v.title,
    createdAt: v.created_at,
    createdBy: v.created_by,
  }));
}
