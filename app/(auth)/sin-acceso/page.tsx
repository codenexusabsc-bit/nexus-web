import type { Metadata } from "next";
import { LogOut, ShieldAlert } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui";
import { signOut } from "../login/actions";

export const metadata: Metadata = {
  title: "Sin acceso",
  robots: { index: false, follow: false },
};

/**
 * Sesión válida pero sin perfil de socio.
 * Fuera de /panel para no volver a verificar el rol (evita bucles).
 */
export default function SinAccesoPage() {
  return (
    <AuthCard title="Tu cuenta no tiene acceso al panel">
      <div className="flex flex-col items-center gap-4 text-center">
        <ShieldAlert size={36} className="text-orange" aria-hidden="true" />
        <p className="text-sm text-muted">
          La cuenta existe, pero todavía no está autorizada como socio. Pídele a
          Sebastián que la active.
        </p>
        <form action={signOut} className="w-full">
          <Button type="submit" className="w-full">
            <LogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
