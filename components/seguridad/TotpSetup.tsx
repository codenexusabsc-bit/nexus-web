"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { confirmEnroll, removeFactor, startEnroll, type EnrollStart } from "@/app/panel/seguridad/actions";

const input = "w-40 rounded-lg border border-border bg-white px-3 py-2 text-center text-lg tracking-[0.3em] outline-none focus:border-purple";

/** Activar o desactivar el segundo factor (TOTP) del socio que tiene la sesión abierta. */
export function TotpSetup({ factorId }: { factorId: string | null }) {
  const [enroll, setEnroll] = useState<EnrollStart | null>(null);
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();

  if (factorId) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50 p-5">
        <p className="flex items-center gap-2 font-semibold text-green-800"><ShieldCheck size={18} /> Verificación en dos pasos activada</p>
        <p className="text-sm text-green-900/80">Al iniciar sesión, además de la contraseña se pide el código de tu app autenticadora.</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("¿Desactivar la verificación en dos pasos? Tu cuenta quedará protegida solo por la contraseña.")) return;
            startTransition(async () => {
              const res = await removeFactor(factorId);
              if (res.error) toast.error(res.error);
              else toast.success("Verificación en dos pasos desactivada.");
            });
          }}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <ShieldOff size={15} /> Desactivar
        </button>
      </div>
    );
  }

  if (!enroll?.factorId) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5">
        <p className="font-semibold text-navy">Verificación en dos pasos: desactivada</p>
        <p className="text-sm text-muted">Necesitas una app autenticadora en el celular (Google Authenticator, Microsoft Authenticator, Authy…). Un código que cambia cada 30 segundos protege tu cuenta aunque alguien conozca tu contraseña.</p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await startEnroll();
              if (res.error) toast.error(res.error);
              else setEnroll(res);
            })
          }
          className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50"
        >
          <ShieldCheck size={16} /> Activar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-5">
      <p className="font-semibold text-navy">1. Escanea el QR con tu app autenticadora</p>
      {/* El QR llega como imagen SVG en una URL de datos: next/image no aporta nada aquí. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={enroll.qr} alt="Código QR para la app autenticadora" width={176} height={176} className="size-44 rounded-lg border border-border bg-white p-2" />
      <p className="text-xs text-muted">¿No puedes escanear? Escribe esta clave en la app: <code className="rounded bg-bg px-1.5 py-0.5 break-all text-navy">{enroll.secret}</code></p>
      <p className="font-semibold text-navy">2. Escribe el código de 6 números que muestra la app</p>
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await confirmEnroll(enroll.factorId!, code);
            if (res.error) toast.error(res.error);
            else {
              toast.success("¡Listo! La verificación en dos pasos quedó activa.");
              setEnroll(null);
              setCode("");
            }
          });
        }}
      >
        <input className={input} inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" aria-label="Código de 6 números" />
        <button type="submit" disabled={pending || code.replace(/\s/g, "").length !== 6} className="rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50">
          Confirmar
        </button>
        <button type="button" onClick={() => setEnroll(null)} className="text-sm text-muted hover:underline">Cancelar</button>
      </form>
    </div>
  );
}
