"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export interface SignaturePerson {
  name: string;
  title: string;
  phone: string;
  email: string;
  cardUrl: string;
}

/** HTML con estilos en línea: es lo único que Gmail y Outlook respetan en una firma. */
function signatureHtml(p: SignaturePerson, site: string): string {
  const logo = `${site}/marca/logo-fondo-blanco.png`;
  return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;color:#2A2540;font-size:13px;line-height:1.45">
<tr><td style="padding-right:14px;border-right:3px solid #9333EA;vertical-align:middle"><a href="${site}"><img src="${logo}" alt="Nexus Ingeniería" width="150" style="display:block;width:150px;height:auto;border:0"></a></td>
<td style="padding-left:14px;vertical-align:middle">
<div style="font-size:15px;font-weight:bold;color:#0E0A26">${p.name}</div>
<div style="color:#6D28D9">${p.title} · Nexus Ingeniería</div>
<div style="margin-top:4px">${p.phone ? `📱 ${p.phone}&nbsp;&nbsp;` : ""}${p.email ? `✉️ <a href="mailto:${p.email}" style="color:#2A2540;text-decoration:none">${p.email}</a>` : ""}</div>
<div><a href="${p.cardUrl}" style="color:#0891B2">Mi tarjeta digital</a> · <a href="${site}" style="color:#0891B2">Nuestros servicios</a></div>
</td></tr></table>`;
}

/** Genera la firma de correo de cada socio y la copia lista para pegar en Gmail. */
export function EmailSignature({ people, site }: { people: SignaturePerson[]; site: string }) {
  const [i, setI] = useState(0);
  const p = people[i];
  if (!p) return <p className="text-sm text-muted">Agrega integrantes en Sitio web → Equipo.</p>;
  const html = signatureHtml(p, site);

  async function copy() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([`${p.name}\n${p.title} · Nexus Ingeniería\n${p.phone}  ${p.email}`], { type: "text/plain" }) })]);
      toast.success("Firma copiada. Pégala en Gmail → Configuración → Firma.");
    } catch {
      await navigator.clipboard.writeText(html);
      toast.info("Se copió el HTML de la firma.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {people.map((x, j) => (
          <button key={x.name} type="button" onClick={() => setI(j)} className={`rounded-full px-3 py-1 text-sm ${i === j ? "bg-navy text-white" : "border border-border bg-white text-navy"}`}>
            {x.name}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-white p-5" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet">
          <Copy size={15} /> Copiar firma
        </button>
        <p className="text-xs text-muted">En Gmail: ⚙️ Configuración → Ver toda la configuración → General → Firma → pegar (Ctrl+V) → Guardar cambios.</p>
      </div>
    </div>
  );
}
