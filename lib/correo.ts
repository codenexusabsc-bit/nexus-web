import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

/**
 * Correo saliente por Gmail SMTP (cuenta de Nexus + contraseña de aplicación).
 * Variables: SMTP_USER, SMTP_PASSWORD, opcional SMTP_FROM_NAME y SITE_URL.
 * Gmail permite unos 500 correos al día: de sobra para avisos entre socios.
 */
export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

async function sendMail(msg: { to: string; subject: string; text: string; html: string }): Promise<void> {
  const { SMTP_USER, SMTP_PASSWORD, SMTP_FROM_NAME } = process.env;
  const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: SMTP_USER, pass: SMTP_PASSWORD } });
  await transport.sendMail({ from: { name: SMTP_FROM_NAME || "Nexus Ingeniería", address: SMTP_USER! }, ...msg });
}

/** Correo de acceso del socio. Vive en auth.users, así que se lee con la clave de servidor. */
async function partnerEmail(profileId: string): Promise<string | null> {
  if (!hasAdminKey()) return null;
  const { data } = await createAdminClient().auth.admin.getUserById(profileId);
  return data.user?.email ?? null;
}

export interface TaskAssignedInfo {
  assigneeId: string;
  assignedBy: string;
  title: string;
  notes?: string;
  projectId: string;
  projectName: string;
  dueOn: string | null;
}

/**
 * Avisa por correo al socio al que se le asigna una tarea. Nunca lanza: un fallo de correo
 * no debe deshacer ni demorar la asignación; queda en el registro del servidor.
 */
export async function notifyTaskAssigned(t: TaskAssignedInfo): Promise<void> {
  try {
    if (!isMailConfigured()) return;
    const to = await partnerEmail(t.assigneeId);
    if (!to) return;
    const base = (process.env.SITE_URL || "https://nexus-ingenieria1.netlify.app").replace(/\/$/, "");
    const link = `${base}/panel/carpeta/${t.projectId}`;
    const due = t.dueOn ? new Date(`${t.dueOn}T12:00:00-05:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" }) : null;
    const lines = [`${t.assignedBy} te asignó una tarea en «${t.projectName}»:`, "", t.title, ...(t.notes ? ["", t.notes] : []), ...(due ? ["", `Fecha límite: ${due}`] : []), "", `Ábrela aquí: ${link}`];
    await sendMail({
      to,
      subject: `Nueva tarea: ${t.title}`.slice(0, 150).replace(/[\r\n]+/g, " "),
      text: lines.join("\n"),
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;color:#1f2937">
  <p style="color:#6d28d9;font-weight:bold;letter-spacing:2px;margin:0 0 12px">NEXUS INGENIERÍA</p>
  <p><b>${escapeHtml(t.assignedBy)}</b> te asignó una tarea en <b>${escapeHtml(t.projectName)}</b>:</p>
  <p style="font-size:18px;font-weight:bold;margin:12px 0">${escapeHtml(t.title)}</p>
  ${t.notes ? `<p style="white-space:pre-wrap">${escapeHtml(t.notes)}</p>` : ""}
  ${due ? `<p><b>Fecha límite:</b> ${escapeHtml(due)}</p>` : ""}
  <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#6d28d9;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Abrir el proyecto</a></p>
</div>`,
    });
  } catch (e) {
    console.error("No se pudo enviar el aviso de tarea:", e instanceof Error ? e.message : e);
  }
}
