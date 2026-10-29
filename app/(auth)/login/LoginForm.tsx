"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const changed = searchParams.get("cambio") === "1";

  const [state, formAction, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" aria-label="Formulario de inicio de sesión" noValidate>
      <input type="hidden" name="next" value={next} />

      {changed && !state.error && (
        <Alert kind="ok">Contraseña actualizada. Ya puedes iniciar sesión.</Alert>
      )}

      <Field
        id="email"
        name="email"
        type="email"
        label="Correo electrónico"
        placeholder="correo@ejemplo.com"
        autoComplete="email"
        defaultValue={state.email}
        required
      />
      <Field
        id="password"
        name="password"
        type="password"
        label="Contraseña"
        placeholder="••••••••"
        autoComplete="current-password"
        required
      />

      {state.error && <Alert kind="error">{state.error}</Alert>}

      <Button type="submit" loading={pending} className="w-full">
        {!pending && <LogIn size={16} aria-hidden="true" />}
        {pending ? "Ingresando…" : "Iniciar sesión"}
      </Button>

      <Link href="/recuperar" className="text-center text-sm text-purple underline-offset-4 hover:underline">
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}
