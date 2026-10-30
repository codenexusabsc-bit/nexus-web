"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Download, PenLine } from "lucide-react";
import { submitClientSignature, type ClientSignState } from "@/app/firmar/actions";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

export function ClientSignForm({ token, defaultName, defaultId }: { token: string; defaultName: string; defaultId: string }) {
  const pad = useRef<SignaturePadHandle>(null);
  const [name, setName] = useState(defaultName);
  const [idNumber, setIdNumber] = useState(defaultId);
  const [accept, setAccept] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [state, setState] = useState<ClientSignState>({});
  const [pending, startTransition] = useTransition();

  if (state.done) {
    return (
      <div className="rise flex flex-col items-center gap-3 rounded-2xl border border-teal/40 bg-white p-8 text-center">
        <CheckCircle2 size={44} className="text-teal" />
        <p className="text-xl font-bold text-navy">¡Documento firmado!</p>
        <p className="text-muted">Gracias. Tu firma quedó registrada con fecha, hora y la huella del documento.</p>
        {state.signedUrl ? (
          <a href={state.signedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-purple px-5 py-2.5 font-semibold text-white">
            <Download size={17} /> Descargar el PDF firmado
          </a>
        ) : (
          <p className="text-sm text-muted">Cuando firmen todas las partes, Nexus Ingeniería te enviará el PDF final.</p>
        )}
      </div>
    );
  }

  const input = "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 outline-none focus:border-purple";
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const signature = pad.current?.toPng() ?? "";
          setState(await submitClientSignature({ token, name, idNumber, accept: accept as true, signature }));
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-navy">
          Nombre completo
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-navy">
          Cédula o NIT
          <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required maxLength={40} inputMode="numeric" className={input} />
        </label>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-navy">Tu firma</p>
        <SignaturePad ref={pad} onChange={setEmpty} />
      </div>
      <label className="flex items-start gap-2 text-sm text-text">
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 size-4 accent-purple" />
        <span>
          Leí el documento y acepto firmarlo electrónicamente. Entiendo que se registran mi nombre, documento, fecha, hora, dirección IP y navegador como evidencia.
        </span>
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending || empty || !accept} className="shine inline-flex items-center justify-center gap-2 rounded-lg bg-purple px-5 py-3 font-semibold text-white hover:bg-violet disabled:opacity-50">
        <PenLine size={17} /> {pending ? "Firmando…" : "Firmar documento"}
      </button>
    </form>
  );
}
