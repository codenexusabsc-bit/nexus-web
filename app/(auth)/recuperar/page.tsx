import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { RecoverForm } from "./RecoverForm";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
};

export default function RecoverPage() {
  return (
    <AuthCard title="Recuperar contraseña">
      <Suspense fallback={null}>
        <RecoverForm />
      </Suspense>
    </AuthCard>
  );
}
