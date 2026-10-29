import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  robots: { index: false, follow: false },
};

/** Llega aquí desde el enlace de recuperación; el proxy exige la sesión de ese enlace. */
export default function ResetPage() {
  return (
    <AuthCard title="Crea tu contraseña nueva">
      <ResetForm />
    </AuthCard>
  );
}
