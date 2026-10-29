import { LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/(auth)/login/actions";

/** Nombre del socio y botón de salir. Verifica la sesión en servidor. */
export async function UserMenu() {
  const user = await getCurrentUser();
  const name = user.fullName || user.email;

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-semibold text-white">{name}</p>
        {user.title && <p className="text-xs text-cyan">{user.title}</p>}
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
          aria-label="Cerrar sesión"
        >
          <LogOut size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </form>
    </div>
  );
}
