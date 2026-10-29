import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: { index: false, follow: false },
};

/**
 * Inicio de sesión del panel.
 * El registro público está deshabilitado: solo cuentas creadas por el administrador.
 */
export default function LoginPage() {
  return (
    <AuthCard title="Acceso al panel" footer="Solo los socios de Nexus Ingeniería pueden acceder.">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
