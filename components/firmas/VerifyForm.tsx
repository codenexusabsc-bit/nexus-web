"use client";

import { useState } from "react";
import { CheckCircle2, FileSearch, HelpCircle, Info } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { verifyHash, type VerifyResult } from "@/app/verificar/actions";

/** Calcula la huella del PDF en el navegador (el archivo no se sube) y la consulta. */
export function VerifyForm() {
  const [res, setRes] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  async function check(file: File) {
    setBusy(true);
    setName(file.name);
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    setRes(await verifyHash(hex));
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-purple/40 bg-white px-6 py-10 text-center transition hover:border-purple">
        <FileSearch size={32} className="text-purple" />
        <span className="font-semibold text-navy">{busy ? "Revisando…" : "Elige el PDF que quieres verificar"}</span>
        <span className="text-xs text-muted">El archivo no sale de tu equipo: solo se compara su huella digital.</span>
        <input type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && check(e.target.files[0])} />
      </label>

      {res?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{res.error}</p>}

      {res?.match === "firmado" && (
        <div className="rise flex flex-col gap-3 rounded-xl border border-teal/50 bg-teal/5 p-5">
          <p className="flex items-center gap-2 text-lg font-bold text-navy">
            <CheckCircle2 className="text-teal" /> Documento firmado y sin modificaciones
          </p>
          <p className="text-sm">
            <b>{res.title}</b> · sellado {res.completedAt && formatDateTime(res.completedAt)}
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {res.signers?.map((s, i) => (
              <li key={i}>
                ✓ {s.name} ({s.kind === "socio" ? "Nexus Ingeniería" : "cliente"}) · {s.signedAt && formatDateTime(s.signedAt)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {res?.match === "original" && (
        <div className="rise flex gap-3 rounded-xl border border-orange/50 bg-orange/5 p-5 text-sm">
          <Info className="shrink-0 text-orange" />
          <p>
            <b>{res.title}</b>: este es el documento <b>original sin sellar</b>. La versión con validez es el PDF firmado, que incluye la hoja de certificado.
          </p>
        </div>
      )}
      {res?.match === "ninguno" && (
        <div className="rise flex gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <HelpCircle className="shrink-0" />
          <p>
            <b>{name}</b> no coincide con ningún documento firmado en Nexus Ingeniería. Si se modificó aunque sea un carácter, la huella cambia.
          </p>
        </div>
      )}
    </div>
  );
}
