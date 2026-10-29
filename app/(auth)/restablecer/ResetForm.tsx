"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { updatePassword, type ResetState } from "./actions";

export function ResetForm() {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(updatePassword, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted">
        Usa al menos 12 caracteres. Lo ideal es generarla y guardarla en Bitwarden.
      </p>
      <Field id="password" name="password" type="password" label="Contraseña nueva" autoComplete="new-password" minLength={12} required />
      <Field id="confirm" name="confirm" type="password" label="Repite la contraseña" autoComplete="new-password" required />
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <Button type="submit" loading={pending} className="w-full">
        {!pending && <KeyRound size={16} aria-hidden="true" />}
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
