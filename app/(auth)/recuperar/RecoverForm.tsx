"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { requestReset, type RecoverState } from "./actions";

export function RecoverForm() {
  const badLink = useSearchParams().get("error") === "enlace";
  const [state, formAction, pending] = useActionState<RecoverState, FormData>(requestReset, {});

  if (state.sent) {
    return (
      <div className="flex flex-col gap-4">
        <Alert kind="ok">
          Si el correo pertenece a un socio, te llegará un enlace para crear una
          contraseña nueva. Revisa también la carpeta de spam.
        </Alert>
        <Link href="/login" className="text-center text-sm text-purple hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {badLink && (
        <Alert kind="error">El enlace venció o ya se usó. Pide uno nuevo.</Alert>
      )}
      <p className="text-sm text-muted">
        Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.
      </p>
      <Field id="email" name="email" type="email" label="Correo electrónico" autoComplete="email" required />
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <Button type="submit" loading={pending} className="w-full">
        {!pending && <Mail size={16} aria-hidden="true" />}
        {pending ? "Enviando…" : "Enviar enlace"}
      </Button>
      <Link href="/login" className="text-center text-sm text-purple hover:underline">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
