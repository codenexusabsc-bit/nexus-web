"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

/**
 * Estructura del panel: menú lateral fijo a la izquierda en pantallas grandes
 * y desplegable en el celular. El contenido de servidor llega por props.
 */
export function PanelShell({
  nav,
  brand,
  userMenu,
  background,
  children,
}: {
  nav: ReactNode;
  brand: ReactNode;
  userMenu: ReactNode;
  background: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const logo = (
    <Link href="/panel" className="flex items-center gap-3" aria-label="Agenda del panel">
      <Image src="/marca/portal.png" alt="" width={248} height={327} unoptimized className="pixelated portal-float h-auto w-8" />
      <span className="leading-tight">
        <span className="block font-pixel text-lg font-bold tracking-widest text-white">NEXUS</span>
        <span className="block font-pixel text-[0.6rem] tracking-[0.3em] text-cyan">PANEL</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Barra superior en celular */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-navy px-4 py-3 lg:hidden">
        {logo}
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Abrir menú" aria-expanded={open}>
          <Menu size={22} />
        </button>
      </header>

      {/* Fondo oscuro detrás del menú en celular */}
      <div
        className={`fixed inset-0 z-40 bg-navy/60 backdrop-blur-sm transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-hidden bg-navy transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menú del panel"
      >
        {background}
        <div className="relative flex items-center justify-between px-5 pt-5 pb-6">
          {logo}
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white hover:bg-white/10 lg:hidden" aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>
        {/* Cerrar el menú del celular al elegir una sección */}
        <div
          className="relative flex-1 overflow-y-auto px-3"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {nav}
          <div className="mt-5 border-t border-white/10 pt-4">{brand}</div>
        </div>
        <div className="relative border-t border-white/10 px-4 py-4">{userMenu}</div>
      </aside>

      <main className="rise mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 lg:py-8">{children}</main>
    </div>
  );
}
