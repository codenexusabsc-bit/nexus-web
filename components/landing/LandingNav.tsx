"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#servicios", label: "Servicios" },
  { href: "#nosotros", label: "Nosotros" },
  { href: "#proceso", label: "Proceso" },
  { href: "#contacto", label: "Contacto" },
];

/** Barra superior que se vuelve sólida al hacer scroll. */
export function LandingNav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 transition-all duration-300 ${
        solid || open ? "bg-navy/90 shadow-lg shadow-black/20 backdrop-blur" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Nexus Ingeniería, inicio">
          <Image src="/marca/portal.png" alt="" width={248} height={327} unoptimized className="pixelated h-auto w-7" />
          <span className="font-pixel text-lg font-bold tracking-widest text-white">NEXUS</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Secciones">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-white/80 transition hover:text-cyan">
              {l.label}
            </a>
          ))}
          <Link href="/login" className="rounded-lg border border-white/25 px-3 py-1.5 text-sm text-white transition hover:border-cyan hover:text-cyan">
            Entrar
          </Link>
        </nav>
        <button type="button" onClick={() => setOpen(!open)} className="p-2 text-white md:hidden" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 px-4 pb-4 md:hidden" aria-label="Secciones">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-white/85 hover:bg-white/10">
              {l.label}
            </a>
          ))}
          <Link href="/login" className="rounded-lg px-3 py-2 text-cyan hover:bg-white/10">
            Entrar al panel
          </Link>
        </nav>
      )}
    </header>
  );
}
