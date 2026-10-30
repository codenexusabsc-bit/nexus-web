import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "@/lib/carpeta";
import { appUrl, sha256Hex } from "./util";

const NAVY = rgb(14 / 255, 10 / 255, 38 / 255);
const PURPLE = rgb(109 / 255, 40 / 255, 217 / 255);
const MUTED = rgb(107 / 255, 101 / 255, 133 / 255);
const CYAN = rgb(103 / 255, 232 / 255, 249 / 255);

/** Las fuentes estándar del PDF usan WinAnsi: se quitan caracteres que no soporta. */
function safe(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

function bogota(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(iso)) + " (hora de Colombia)";
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = safe(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export interface SignerRow {
  id: string;
  kind: "socio" | "cliente";
  name: string;
  email: string;
  id_number: string;
  signed_at: string | null;
  signature_path: string | null;
  ip: string;
  user_agent: string;
}

/** Bytes de la imagen de firma: el sello E sale del disco; las demás, de Storage. */
async function signatureBytes(admin: SupabaseClient, p: string | null): Promise<Uint8Array | null> {
  if (!p) return null;
  if (p === "sello-e") return readFile(path.join(process.cwd(), "private", "marca", "sello-e.png"));
  const { data } = await admin.storage.from(BUCKET).download(p);
  return data ? new Uint8Array(await data.arrayBuffer()) : null;
}

export type SealResult = { ok: true } | { ok: false; error: string };

/**
 * Si todos firmaron: estampa la marca de firma en cada página, agrega el certificado
 * con las evidencias, guarda el PDF sellado y lo deja en la carpeta del proyecto.
 */
export async function sealIfComplete(admin: SupabaseClient, requestId: string): Promise<SealResult> {
  const { data: req } = await admin.from("signature_requests").select("*").eq("id", requestId).single();
  if (!req) return { ok: false, error: "No se encontró la solicitud." };
  if (req.status !== "pendiente") return { ok: true };

  const { data: signerRows } = await admin.from("signers").select("*").eq("request_id", requestId).order("position");
  const signers = (signerRows ?? []) as SignerRow[];
  if (!signers.length || signers.some((s) => !s.signed_at)) return { ok: true }; // faltan firmas

  const { data: original } = await admin.storage.from(BUCKET).download(req.original_path);
  if (!original) return { ok: false, error: "No se encontró el PDF original." };
  const originalBytes = new Uint8Array(await original.arrayBuffer());
  if (sha256Hex(originalBytes) !== req.original_sha256) {
    return { ok: false, error: "El PDF original cambió desde que se envió a firmar. No se puede sellar." };
  }

  const completedAt = new Date().toISOString();
  const sigs = await Promise.all(signers.map((x) => signatureBytes(admin, x.signature_path)));
  const signed = await buildSealedPdf(originalBytes, { id: requestId, title: req.title, originalSha256: req.original_sha256 }, signers, sigs, completedAt);
  const signedHash = sha256Hex(signed);
  const signedPath = `firmas/${requestId}/firmado.pdf`;

  const up = await admin.storage.from(BUCKET).upload(signedPath, signed, { contentType: "application/pdf", upsert: true });
  if (up.error) return { ok: false, error: "No se pudo guardar el PDF firmado." };

  await admin
    .from("signature_requests")
    .update({ status: "completada", signed_path: signedPath, signed_sha256: signedHash, completed_at: completedAt })
    .eq("id", requestId)
    .eq("status", "pendiente");
  if (req.document_id) await admin.from("documents").update({ status: "firmado" }).eq("id", req.document_id);
  if (req.project_id) await copyToFolder(admin, req.project_id, req.title, signedPath, signed.length, req.created_by, requestId.slice(0, 8).toUpperCase());

  return { ok: true };
}


/** Arma el PDF sellado: marca en cada página y hojas de certificado. Sin acceso a red ni base de datos. */
export async function buildSealedPdf(
  originalBytes: Uint8Array,
  r: { id: string; title: string; originalSha256: string },
  signers: SignerRow[],
  sigImages: (Uint8Array | null)[],
  completedAt: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(originalBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const shortId = r.id.slice(0, 8).toUpperCase();
  const verifyUrl = `${appUrl()}/verificar`;

  // Marca en cada página del documento original
  for (const page of pdf.getPages()) {
    const { width } = page.getSize();
    page.drawText(safe(`Firmado electrónicamente · ID ${shortId} · Verifique en ${verifyUrl}`), {
      x: 40,
      y: 12,
      size: 6.5,
      font,
      color: MUTED,
      maxWidth: width - 80,
    });
  }

  // Certificado
  let page: PDFPage = pdf.addPage([595.28, 841.89]);
  let y = drawCertHeader(page, bold, font);
  const left = 48;
  const w = 595.28 - left * 2;

  const line = (label: string, value: string, size = 9.5) => {
    page.drawText(safe(label), { x: left, y, size, font: bold, color: NAVY });
    const lines = wrap(value, font, size, w - 150);
    lines.forEach((l, i) => page.drawText(l, { x: left + 150, y: y - i * (size + 3), size, font, color: NAVY }));
    y -= Math.max(1, lines.length) * (size + 3) + 5;
  };

  line("Documento", r.title);
  line("Identificador", r.id);
  line("Huella SHA-256 del original", r.originalSha256, 8);
  line("Sellado", bogota(completedAt));
  y -= 8;
  page.drawText("FIRMANTES", { x: left, y, size: 10, font: bold, color: PURPLE });
  y -= 16;

  for (const [idx, s] of signers.entries()) {
    const blockH = 118;
    if (y - blockH < 90) {
      page = pdf.addPage([595.28, 841.89]);
      y = drawCertHeader(page, bold, font);
    }
    page.drawRectangle({ x: left, y: y - blockH + 10, width: w, height: blockH, borderColor: rgb(0.89, 0.87, 0.96), borderWidth: 1 });
    const img = sigImages[idx];
    if (img) {
      try {
        const png = await pdf.embedPng(img);
        const dims = png.scaleToFit(150, 70);
        page.drawImage(png, { x: left + 10, y: y - 85 + (70 - dims.height) / 2, width: dims.width, height: dims.height });
      } catch {
        /* imagen ilegible: el certificado igual registra las evidencias */
      }
    }
    page.drawLine({ start: { x: left + 10, y: y - 90 }, end: { x: left + 165, y: y - 90 }, thickness: 0.6, color: MUTED });
    const tx = left + 180;
    let ty = y - 8;
    const row = (t: string, f = font, size = 8.5, color = NAVY) => {
      for (const l of wrap(t, f, size, w - 190)) {
        page.drawText(l, { x: tx, y: ty, size, font: f, color });
        ty -= size + 3;
      }
    };
    row(s.name, bold, 11);
    row(s.kind === "socio" ? "Socio de Nexus Ingeniería" : "Cliente", font, 8.5, PURPLE);
    if (s.id_number) row(`Documento: ${s.id_number}`);
    if (s.email) row(`Correo: ${s.email}`);
    row(`Firmó: ${bogota(s.signed_at!)}`);
    row(`IP: ${s.ip || "no disponible"}`);
    row(`Navegador: ${s.user_agent || "no disponible"}`, font, 7, MUTED);
    y -= blockH + 8;
  }

  const note =
    "Firma electrónica con registro de evidencias (fecha, hora, IP, navegador y huella del documento), conforme a la Ley 527 de 1999 y el Decreto 2364 de 2012. " +
    `Para comprobar que este PDF no fue modificado, súbalo en ${verifyUrl}.`;
  for (const l of wrap(note, font, 7.5, w)) {
    if (y < 40) {
      page = pdf.addPage([595.28, 841.89]);
      y = drawCertHeader(page, bold, font);
    }
    page.drawText(l, { x: left, y, size: 7.5, font, color: MUTED });
    y -= 10;
  }

  pdf.setTitle(safe(`${r.title} (firmado)`));
  pdf.setProducer("Panel Nexus Ingeniería");
  return pdf.save();
}

function drawCertHeader(page: PDFPage, bold: PDFFont, font: PDFFont): number {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: NAVY });
  page.drawText("NEXUS", { x: 48, y: height - 38, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText("INGENIERIA", { x: 48, y: height - 52, size: 7, font, color: CYAN });
  page.drawText("CERTIFICADO DE FIRMA ELECTRÓNICA".normalize("NFC"), { x: width - 48 - bold.widthOfTextAtSize("CERTIFICADO DE FIRMA ELECTRÓNICA", 11), y: height - 42, size: 11, font: bold, color: rgb(1, 1, 1) });
  return height - 100;
}

/** Copia el PDF firmado a la carpeta compartida del proyecto (archivo nuevo o versión nueva). */
async function copyToFolder(admin: SupabaseClient, projectId: string, title: string, signedPath: string, size: number, by: string | null, shortId: string) {
  const name = `${title.replace(/[\\/:*?"<>|]/g, "").slice(0, 150)} (firmado).pdf`;
  const dest = `${projectId}/${crypto.randomUUID()}`;
  const copied = await admin.storage.from(BUCKET).copy(signedPath, dest);
  if (copied.error) return;

  const { data: existing } = await admin
    .from("files")
    .select("id, current_version")
    .eq("project_id", projectId)
    .ilike("name", name)
    .is("deleted_at", null)
    .maybeSingle();
  let fileId = existing?.id as string | undefined;
  let version = 1;
  if (fileId) {
    version = (existing!.current_version as number) + 1;
    await admin.from("files").update({ current_version: version, updated_at: new Date().toISOString() }).eq("id", fileId);
  } else {
    const { data } = await admin
      .from("files")
      .insert({ project_id: projectId, name, note: `Firmado electrónicamente · ID ${shortId}`, uploaded_by: by })
      .select("id")
      .single();
    fileId = data?.id;
  }
  if (fileId) {
    await admin.from("file_versions").insert({ file_id: fileId, version, storage_path: dest, size_bytes: size, mime_type: "application/pdf", uploaded_by: by });
  }
}
