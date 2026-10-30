import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SignerView {
  id: string;
  kind: "socio" | "cliente";
  profileId: string | null;
  name: string;
  email: string;
  idNumber: string;
  signedAt: string | null;
  tokenExpiresAt: string | null;
}

export interface RequestView {
  id: string;
  title: string;
  documentId: string | null;
  projectId: string | null;
  status: "pendiente" | "completada" | "cancelada";
  createdAt: string;
  completedAt: string | null;
  originalSha256: string;
  signedSha256: string | null;
  signers: SignerView[];
}

interface Row {
  id: string;
  title: string;
  document_id: string | null;
  project_id: string | null;
  status: RequestView["status"];
  created_at: string;
  completed_at: string | null;
  original_sha256: string;
  signed_sha256: string | null;
  signers: {
    id: string;
    kind: "socio" | "cliente";
    profile_id: string | null;
    name: string;
    email: string;
    id_number: string;
    signed_at: string | null;
    token_expires_at: string | null;
    position: number;
  }[];
}

const SELECT = "id, title, document_id, project_id, status, created_at, completed_at, original_sha256, signed_sha256, signers ( id, kind, profile_id, name, email, id_number, signed_at, token_expires_at, position )";

function toView(r: Row): RequestView {
  return {
    id: r.id,
    title: r.title,
    documentId: r.document_id,
    projectId: r.project_id,
    status: r.status,
    createdAt: r.created_at,
    completedAt: r.completed_at,
    originalSha256: r.original_sha256,
    signedSha256: r.signed_sha256,
    signers: [...r.signers]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        id: s.id,
        kind: s.kind,
        profileId: s.profile_id,
        name: s.name,
        email: s.email,
        idNumber: s.id_number,
        signedAt: s.signed_at,
        tokenExpiresAt: s.token_expires_at,
      })),
  };
}

export async function listRequests(): Promise<RequestView[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("signature_requests").select(SELECT).order("created_at", { ascending: false }).limit(100);
  return ((data ?? []) as unknown as Row[]).map(toView);
}

export async function getRequest(id: string): Promise<RequestView | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("signature_requests").select(SELECT).eq("id", id).maybeSingle();
  return data ? toView(data as unknown as Row) : null;
}

/** Firma guardada del socio: URL para verla (firmada, 5 min) y si es el sello. */
export async function mySignature(userId: string): Promise<{ url: string | null; sello: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("signature_path").eq("id", userId).single();
  const p = data?.signature_path as string | null;
  if (!p) return { url: null, sello: false };
  if (p === "sello-e") return { url: "/panel/marca/sello-e.png", sello: true };
  const { data: signed } = await supabase.storage.from("archivos").createSignedUrl(p, 300);
  return { url: signed?.signedUrl ?? null, sello: false };
}
