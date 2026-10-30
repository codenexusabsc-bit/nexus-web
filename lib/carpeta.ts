import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Días que un archivo permanece en la papelera antes de purgarse. */
export const TRASH_DAYS = 30;
/** Límite por archivo del plan Free de Supabase Storage. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const BUCKET = "archivos";

export interface Project {
  id: string;
  name: string;
  client: string;
  color: string;
  archived: boolean;
}

export interface ProjectSummary extends Project {
  fileCount: number;
  lastUpdate: string | null;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Partner {
  id: string;
  fullName: string;
}

export interface FileVersion {
  id: string;
  version: number;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: string | null;
}

export interface FileItem {
  id: string;
  projectId: string;
  name: string;
  note: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string | null;
  deletedAt: string | null;
  versions: FileVersion[]; // de la más nueva a la más vieja
  tags: Tag[];
}

export interface FileFilters {
  q?: string;
  tagId?: string;
  /** "yo" | "socio": quién subió la última versión */
  by?: string;
  userId?: string;
}

const FILE_SELECT = `
  id, project_id, name, note, current_version, created_at, updated_at, uploaded_by, deleted_at,
  file_versions ( id, version, size_bytes, mime_type, created_at, uploaded_by ),
  file_tags ( tags ( id, name ) )
`;

interface FileRow {
  id: string;
  project_id: string;
  name: string;
  note: string;
  current_version: number;
  created_at: string;
  updated_at: string;
  uploaded_by: string | null;
  deleted_at: string | null;
  file_versions: {
    id: string;
    version: number;
    size_bytes: number;
    mime_type: string;
    created_at: string;
    uploaded_by: string | null;
  }[];
  file_tags: { tags: Tag | null }[];
}

function toFileItem(row: FileRow): FileItem {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    note: row.note,
    currentVersion: row.current_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uploadedBy: row.uploaded_by,
    deletedAt: row.deleted_at,
    versions: row.file_versions
      .map((v) => ({
        id: v.id,
        version: v.version,
        sizeBytes: Number(v.size_bytes),
        mimeType: v.mime_type,
        createdAt: v.created_at,
        uploadedBy: v.uploaded_by,
      }))
      .sort((a, b) => b.version - a.version),
    tags: row.file_tags
      .map((t) => t.tags)
      .filter((t): t is Tag => t !== null)
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
  };
}

function applyFilters(files: FileItem[], f: FileFilters): FileItem[] {
  const q = f.q?.trim().toLowerCase();
  return files.filter((file) => {
    if (q && !file.name.toLowerCase().includes(q) && !file.note.toLowerCase().includes(q)) return false;
    if (f.tagId && !file.tags.some((t) => t.id === f.tagId)) return false;
    const lastBy = file.versions[0]?.uploadedBy ?? file.uploadedBy;
    if (f.by === "yo" && lastBy !== f.userId) return false;
    if (f.by === "socio" && lastBy === f.userId) return false;
    return true;
  });
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const supabase = await createClient();
  const [{ data: projects }, { data: files }] = await Promise.all([
    supabase.from("projects").select("id, name, client, color, archived").order("name"),
    supabase.from("files").select("project_id, updated_at").is("deleted_at", null),
  ]);

  const stats = new Map<string, { count: number; last: string | null }>();
  for (const f of (files ?? []) as { project_id: string; updated_at: string }[]) {
    const s = stats.get(f.project_id) ?? { count: 0, last: null };
    s.count++;
    if (!s.last || f.updated_at > s.last) s.last = f.updated_at;
    stats.set(f.project_id, s);
  }

  return ((projects ?? []) as Project[]).map((p) => ({
    ...p,
    fileCount: stats.get(p.id)?.count ?? 0,
    lastUpdate: stats.get(p.id)?.last ?? null,
  }));
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, client, color, archived")
    .eq("id", id)
    .maybeSingle();
  return (data as Project | null) ?? null;
}

/** Archivos vivos de un proyecto (o de todos si projectId es null), más recientes primero. */
export async function listFiles(projectId: string | null, filters: FileFilters = {}, limit?: number) {
  const supabase = await createClient();
  let query = supabase
    .from("files")
    .select(FILE_SELECT)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return applyFilters(((data ?? []) as unknown as FileRow[]).map(toFileItem), filters);
}

export async function listTrash(): Promise<FileItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("files")
    .select(FILE_SELECT)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  return ((data ?? []) as unknown as FileRow[]).map(toFileItem);
}

export async function listTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("id, name").order("name");
  return (data ?? []) as Tag[];
}

export async function listPartners(): Promise<Partner[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "partner")
    .order("full_name");
  return ((data ?? []) as { id: string; full_name: string }[]).map((p) => ({
    id: p.id,
    fullName: p.full_name,
  }));
}

// ---- Solicitudes de documentos -------------------------------

export type RequestStatus = "pending" | "delivered" | "accepted" | "returned";

export interface DocRequest {
  id: string;
  projectId: string;
  requestedBy: string;
  requestedTo: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: RequestStatus;
  responseComment: string;
  deliveredFileId: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

interface RequestRow {
  id: string;
  project_id: string;
  requested_by: string;
  requested_to: string;
  title: string;
  description: string;
  due_date: string | null;
  status: RequestStatus;
  response_comment: string;
  delivered_file_id: string | null;
  delivered_at: string | null;
  created_at: string;
}

export async function listRequests(): Promise<DocRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("doc_requests")
    .select("*")
    .order("created_at", { ascending: false });
  return ((data ?? []) as RequestRow[]).map((r) => ({
    id: r.id,
    projectId: r.project_id,
    requestedBy: r.requested_by,
    requestedTo: r.requested_to,
    title: r.title,
    description: r.description,
    dueDate: r.due_date,
    status: r.status,
    responseComment: r.response_comment,
    deliveredFileId: r.delivered_file_id,
    deliveredAt: r.delivered_at,
    createdAt: r.created_at,
  }));
}

/** Contadores para el inicio del panel. */
export async function requestCounts(userId: string) {
  const supabase = await createClient();
  const [toMe, toReview] = await Promise.all([
    supabase
      .from("doc_requests")
      .select("id", { count: "exact", head: true })
      .eq("requested_to", userId)
      .in("status", ["pending", "returned"]),
    supabase
      .from("doc_requests")
      .select("id", { count: "exact", head: true })
      .eq("requested_by", userId)
      .eq("status", "delivered"),
  ]);
  return { toMe: toMe.count ?? 0, toReview: toReview.count ?? 0 };
}

/** Archivos de la papelera que ya cumplieron TRASH_DAYS y deben purgarse. */
export function expiredTrash(files: FileItem[], now = Date.now()): FileItem[] {
  const limit = now - TRASH_DAYS * 24 * 60 * 60 * 1000;
  return files.filter((f) => f.deletedAt !== null && Date.parse(f.deletedAt) < limit);
}
