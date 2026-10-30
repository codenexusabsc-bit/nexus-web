"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { BUCKET, MAX_FILE_BYTES } from "@/lib/carpeta";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

export interface ActionResult {
  error?: string;
}

const uuid = z.uuid({ error: "Identificador inválido." });

function refresh() {
  revalidatePath("/panel", "layout");
}

// ---- Proyectos ----------------------------------------------

const projectSchema = z.object({
  name: z.string().trim().min(1, { error: "Ponle un nombre al proyecto." }).max(80),
  client: z.string().trim().max(120),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: "Color inválido." }),
});

export async function createProject(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await getCurrentUser();
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    client: formData.get("client") ?? "",
    color: formData.get("color"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").insert(parsed.data);
  if (error) {
    return { error: error.code === "23505" ? "Ya existe un proyecto con ese nombre." : "No se pudo crear el proyecto." };
  }
  refresh();
  return {};
}

// ---- Etiquetas ----------------------------------------------

export async function createTag(name: string): Promise<ActionResult & { id?: string }> {
  await getCurrentUser();
  const clean = name.trim();
  if (!clean || clean.length > 40) return { error: "La etiqueta debe tener entre 1 y 40 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").insert({ name: clean }).select("id").single();
  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase.from("tags").select("id").ilike("name", clean).single();
      return { id: existing?.id };
    }
    return { error: "No se pudo crear la etiqueta." };
  }
  refresh();
  return { id: data.id };
}

export async function setFileTags(fileId: string, tagIds: string[]): Promise<ActionResult> {
  await getCurrentUser();
  if (!uuid.safeParse(fileId).success || !tagIds.every((t) => uuid.safeParse(t).success)) {
    return { error: "Datos inválidos." };
  }
  const supabase = await createClient();
  const { error: delError } = await supabase.from("file_tags").delete().eq("file_id", fileId);
  if (delError) return { error: "No se pudieron guardar las etiquetas." };
  if (tagIds.length) {
    const { error } = await supabase
      .from("file_tags")
      .insert(tagIds.map((tag_id) => ({ file_id: fileId, tag_id })));
    if (error) return { error: "No se pudieron guardar las etiquetas." };
  }
  refresh();
  return {};
}

// ---- Subidas ------------------------------------------------

const uploadSchema = z.object({
  projectId: uuid,
  name: z.string().trim().min(1).max(200),
  path: z.string().min(1).max(300),
  size: z.number().int().min(0).max(MAX_FILE_BYTES, { error: "El archivo supera 50 MB." }),
  mime: z.string().max(200),
  note: z.string().trim().max(500).default(""),
  tagIds: z.array(uuid).max(20).default([]),
  requestId: uuid.optional(),
});

/**
 * Registra un archivo que el navegador ya subió a Storage.
 * Si existe un archivo vivo con el mismo nombre en el proyecto, crea una versión nueva.
 * Si viene de una solicitud, la marca como entregada.
 */
export async function registerUpload(input: z.input<typeof uploadSchema>): Promise<ActionResult & { fileId?: string }> {
  const user = await getCurrentUser();
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: fileId, error } = await supabase.rpc("register_file_version", {
    p_project_id: d.projectId,
    p_name: d.name,
    p_path: d.path,
    p_size: d.size,
    p_mime: d.mime,
    p_note: d.note,
  });
  if (error || !fileId) {
    await supabase.storage.from(BUCKET).remove([d.path]);
    return { error: "No se pudo registrar el archivo." };
  }

  if (d.tagIds.length) {
    await supabase
      .from("file_tags")
      .upsert(d.tagIds.map((tag_id) => ({ file_id: fileId, tag_id })), { ignoreDuplicates: true });
  }

  if (d.requestId) {
    const { error: reqError } = await supabase
      .from("doc_requests")
      .update({
        status: "delivered",
        delivered_file_id: fileId,
        delivered_at: new Date().toISOString(),
        response_comment: "",
      })
      .eq("id", d.requestId)
      .eq("requested_to", user.id)
      .in("status", ["pending", "returned"]);
    if (reqError) return { error: "El archivo se subió, pero no se pudo marcar la solicitud como entregada.", fileId };
  }

  refresh();
  return { fileId };
}

// ---- Descargas ----------------------------------------------

/** URL firmada de 60 s para descargar una versión con su nombre original. */
export async function getDownloadUrl(versionId: string): Promise<ActionResult & { url?: string }> {
  await getCurrentUser();
  if (!uuid.safeParse(versionId).success) return { error: "Datos inválidos." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("file_versions")
    .select("storage_path, version, files ( name, current_version )")
    .eq("id", versionId)
    .single();
  const file = data?.files as unknown as { name: string; current_version: number } | null;
  if (!data || !file) return { error: "No se encontró el archivo." };

  const name =
    data.version === file.current_version ? file.name : withVersionSuffix(file.name, data.version);
  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(data.storage_path, 60, { download: name });
  if (error || !signed) return { error: "No se pudo generar la descarga." };
  return { url: signed.signedUrl };
}

function withVersionSuffix(name: string, version: number): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? `${name.slice(0, dot)} (v${version})${name.slice(dot)}` : `${name} (v${version})`;
}

/** URLs firmadas de la última versión de cada archivo del proyecto, para armar el ZIP en el navegador. */
export async function getProjectZipEntries(
  projectId: string
): Promise<ActionResult & { entries?: { name: string; url: string }[] }> {
  await getCurrentUser();
  if (!uuid.safeParse(projectId).success) return { error: "Datos inválidos." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("files")
    .select("name, current_version, file_versions ( version, storage_path )")
    .eq("project_id", projectId)
    .is("deleted_at", null);
  const rows = (data ?? []) as {
    name: string;
    current_version: number;
    file_versions: { version: number; storage_path: string }[];
  }[];
  const current = rows
    .map((r) => ({ name: r.name, path: r.file_versions.find((v) => v.version === r.current_version)?.storage_path }))
    .filter((r): r is { name: string; path: string } => Boolean(r.path));
  if (!current.length) return { error: "Este proyecto no tiene archivos." };

  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(current.map((c) => c.path), 120);
  if (error || !signed) return { error: "No se pudo preparar el ZIP." };
  return {
    entries: current.flatMap((c, i) => (signed[i]?.signedUrl ? [{ name: c.name, url: signed[i].signedUrl }] : [])),
  };
}

// ---- Papelera -----------------------------------------------

export async function moveToTrash(fileId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!uuid.safeParse(fileId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("files")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", fileId)
    .is("deleted_at", null);
  if (error) return { error: "No se pudo mover a la papelera." };
  refresh();
  return {};
}

export async function restoreFile(fileId: string): Promise<ActionResult> {
  await getCurrentUser();
  if (!uuid.safeParse(fileId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("files")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", fileId);
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya hay un archivo con ese nombre en el proyecto. Renómbralo o bórralo antes de restaurar."
          : "No se pudo restaurar.",
    };
  }
  refresh();
  return {};
}

/** Borra para siempre: los objetos de Storage de todas sus versiones y la ficha. */
export async function purgeFile(fileId: string): Promise<ActionResult> {
  await getCurrentUser();
  if (!uuid.safeParse(fileId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { data: versions } = await supabase.from("file_versions").select("storage_path").eq("file_id", fileId);
  const paths = (versions ?? []).map((v: { storage_path: string }) => v.storage_path);
  if (paths.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) return { error: "No se pudo borrar el archivo del almacenamiento." };
  }
  const { error } = await supabase.from("files").delete().eq("id", fileId).not("deleted_at", "is", null);
  if (error) return { error: "No se pudo borrar la ficha del archivo." };
  refresh();
  return {};
}

// ---- Archivar / borrar proyectos -----------------------------

export async function setProjectArchived(projectId: string, archived: boolean): Promise<ActionResult> {
  await getCurrentUser();
  if (!uuid.safeParse(projectId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ archived }).eq("id", projectId);
  if (error) return { error: "No se pudo actualizar el proyecto." };
  refresh();
  return {};
}

/**
 * Borra el proyecto para siempre: sus archivos (también de Storage), sus solicitudes
 * y sus tareas. Documentos, cotizaciones y firmas quedan, pero sin proyecto.
 */
export async function deleteProject(projectId: string, confirmName: string): Promise<ActionResult> {
  await getCurrentUser();
  if (!uuid.safeParse(projectId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).single();
  if (!project) return { error: "No se encontró el proyecto." };
  if (confirmName.trim().toLowerCase() !== project.name.trim().toLowerCase()) {
    return { error: "El nombre no coincide. No se borró nada." };
  }

  const { data: files } = await supabase.from("files").select("id, file_versions ( storage_path )").eq("project_id", projectId);
  const paths = ((files ?? []) as { file_versions: { storage_path: string }[] }[]).flatMap((f) => f.file_versions.map((v) => v.storage_path));
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (error) return { error: "No se pudieron borrar los archivos del almacenamiento." };
  }
  if (files?.length) {
    const { error } = await supabase.from("files").delete().eq("project_id", projectId);
    if (error) return { error: "No se pudieron borrar los archivos del proyecto." };
  }

  // Las solicitudes de documentos solo las puede borrar quien las pidió: se usa la clave
  // de servidor para quitar también las del socio (el usuario ya se verificó arriba).
  const { count } = await supabase.from("doc_requests").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  if (count) {
    if (!hasAdminKey()) return { error: "El proyecto tiene solicitudes de documentos; bórralas primero en Solicitudes." };
    const { error } = await createAdminClient().from("doc_requests").delete().eq("project_id", projectId);
    if (error) return { error: "No se pudieron borrar las solicitudes del proyecto." };
  }

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { error: "No se pudo borrar el proyecto." };
  refresh();
  return {};
}
