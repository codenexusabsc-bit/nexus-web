"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { verifyTotp, type VerifyState } from "./actions";

export function VerifyForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, formAction, pending] = useActionState<VerifyState, FormData>(verifyTotp, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" aria-label="Verificación en dos pasos" noValidate>
      <input type="hidden" name="next" value={next} />
      <p className="text-sm text-muted">Abre tu app autenticadora y escribe el código de 6 números de Nexus.</p>
      <Field id="code" name="code" label="Código" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={7} required />
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <Button type="submit" loading={pending} className="w-full">
        {!pending && <ShieldCheck size={16} aria-hidden="true" />}
        {pending ? "Verificando…" : "Verificar"}
      </Button>
    </form>
  );
}
