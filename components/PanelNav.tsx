"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/panel", label: "Inicio" },
  { href: "/panel/carpeta", label: "Carpeta" },
  { href: "/panel/solicitudes", label: "Solicitudes" },
];

/** Pestañas del panel con la sección actual resaltada (lee la URL: va dentro de <Suspense>). */
export function PanelNav() {
  return <NavLinks path={usePathname()} />;
}

/** Versión sin resaltar, para el fallback mientras llega la URL. */
export function NavLinks({ path = "" }: { path?: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto bg-deep px-4 sm:px-8" aria-label="Secciones del panel">
      {LINKS.map((l) => {
        const active = l.href === "/panel" ? path === "/panel" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition ${
              active ? "border-cyan text-white" : "border-transparent text-white/70 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
