"use client";

import { useActionState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { submitLead, type LeadState } from "@/app/actions";

const input =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-white placeholder:text-white/40 outline-none transition focus:border-cyan focus:bg-white/10";

export function ContactForm({ services }: { services: string[] }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, {});

  if (state.ok) {
    return (
      <div className="rise flex flex-col items-center gap-3 rounded-2xl border border-cyan/30 bg-white/5 p-8 text-center">
        <CheckCircle2 size={40} className="text-cyan" aria-hidden="true" />
        <p className="text-lg font-semibold text-white">¡Mensaje recibido!</p>
        <p className="text-white/70">Te respondemos pronto. Si es urgente, escríbenos por WhatsApp.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      {/* Campo trampa para bots: oculto a personas y lectores de pantalla */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required maxLength={120} placeholder="Nombre *" aria-label="Nombre" className={input} />
        <input name="company" maxLength={120} placeholder="Empresa (opcional)" aria-label="Empresa" className={input} />
        <input name="email" type="email" maxLength={200} placeholder="Correo" aria-label="Correo" className={input} />
        <input name="phone" type="tel" maxLength={40} placeholder="Teléfono / WhatsApp" aria-label="Teléfono" className={input} />
      </div>
      <select name="service" defaultValue="" aria-label="Servicio de interés" className={`${input} [&>option]:text-navy`}>
        <option value="">¿Qué servicio te interesa?</option>
        {services.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
        <option value="Otro">Otro</option>
      </select>
      <textarea name="message" required rows={4} maxLength={3000} placeholder="Cuéntanos tu idea *" aria-label="Mensaje" className={input} />
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="shine inline-flex items-center justify-center gap-2 rounded-lg bg-violet px-5 py-3 font-semibold text-white transition hover:bg-orchid disabled:opacity-60"
      >
        <Send size={16} aria-hidden="true" />
        {pending ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
