import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/AuthCard";
import { VerifyForm } from "./VerifyForm";

export const metadata: Metadata = {
  title: "Verificación en dos pasos",
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <AuthCard title="Verificación en dos pasos" footer="Si perdiste el acceso a tu app, pide a tu socio que quite tu factor desde Supabase.">
      <Suspense fallback={null}>
        <VerifyForm />
      </Suspense>
    </AuthCard>
  );
}
