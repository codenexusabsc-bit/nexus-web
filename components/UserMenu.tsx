import { LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/(auth)/login/actions";

/** Nombre del socio y botón de salir, al pie del menú lateral. Verifica la sesión en servidor. */
export async function UserMenu() {
  const user = await getCurrentUser();
  const name = user.fullName || user.email;
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-deep font-pixel text-xs text-white">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {user.title && <p className="truncate text-xs text-cyan">{user.title}</p>}
      </div>
      <form action={signOut}>
        <button type="submit" className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
