"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FilePen,
  FolderOpen,
  Globe,
  Inbox,
  Megaphone,
  PenLine,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Fase en la que se activa; sin fase = ya disponible */
  soon?: number;
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Trabajo",
    items: [
      { href: "/panel", label: "Agenda", icon: CalendarDays },
      { href: "/panel/carpeta", label: "Carpeta compartida", icon: FolderOpen },
      { href: "/panel/solicitudes", label: "Solicitudes", icon: Inbox },
    ],
  },
  {
    title: "Clientes",
    items: [
      { href: "/panel/sitio", label: "Sitio web y mensajes", icon: Globe },
      { href: "/panel/prospectos", label: "Prospectos", icon: Users, soon: 8 },
      { href: "/panel/cotizaciones", label: "Cotizaciones y cobros", icon: Receipt, soon: 7 },
    ],
  },
  {
    title: "Documentos y marca",
    items: [
      { href: "/panel/documentos", label: "Documentos", icon: FilePen },
      { href: "/panel/firmas", label: "Firmas", icon: PenLine },
      { href: "/panel/piezas", label: "Piezas para redes", icon: Megaphone, soon: 6 },
    ],
  },
];

/** Menú lateral con la sección actual resaltada (lee la URL: va dentro de <Suspense>). */
export function ActiveNav() {
  return <NavItems path={usePathname()} />;
}

/** Menú sin resaltar, para el fallback mientras llega la URL. */
export function NavItems({ path = "" }: { path?: string }) {
  return (
    <nav className="flex flex-col gap-5" aria-label="Funciones del panel">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 font-pixel text-[0.6rem] tracking-[0.25em] text-white/40">{g.title.toUpperCase()}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map(({ href, label, icon: Icon, soon }) => {
              const active = href === "/panel" ? path === "/panel" : path.startsWith(href);
              if (soon) {
                return (
                  <li key={href}>
                    <span className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/35" title={`Llega en la fase ${soon}`}>
                      <Icon size={17} aria-hidden="true" />
                      <span className="flex-1">{label}</span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.6rem]">F{soon}</span>
                    </span>
                  </li>
                );
              }
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {active && <span className="absolute top-1.5 bottom-1.5 left-0 w-1 rounded-full bg-cyan" aria-hidden="true" />}
                    <Icon size={17} className={`transition group-hover:scale-110 ${active ? "text-cyan" : ""}`} aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
