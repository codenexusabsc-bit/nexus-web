"use client";

import { useEffect, useState } from "react";
import { Download, Palette, X } from "lucide-react";
import { BRAND_ASSETS, assetUrl } from "@/lib/marca";

/** Botón "Logos y sellos" del menú lateral: despliega un panel con todos los recursos de marca. */
export function BrandDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Palette size={17} className="transition group-hover:scale-110" aria-hidden="true" />
        Logos y sellos
      </button>

      <div
        className={`fixed inset-0 z-40 bg-navy/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Logos y sellos de Nexus"
        className={`fixed top-0 right-0 z-50 flex h-dvh w-full max-w-md flex-col bg-bg shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between bg-navy px-5 py-4">
          <h2 className="font-pixel text-sm tracking-widest text-white">LOGOS Y SELLOS</h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white hover:bg-white/10" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {open &&
            BRAND_ASSETS.map((group) => (
              <section key={group.group} className="mb-6">
                <h3 className="mb-3 font-pixel text-xs text-purple">{group.group.toUpperCase()}</h3>
                <ul className="grid grid-cols-2 gap-3">
                  {group.items.map((a, i) => {
                    const url = assetUrl(a);
                    const href = a.access === "privado" ? `${url}?descargar` : url;
                    return (
                      <li
                        key={a.file}
                        className="rise flex flex-col overflow-hidden rounded-xl border border-border bg-white"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <div className={`flex h-28 items-center justify-center p-3 ${a.bg === "oscuro" ? "bg-navy" : "bg-[conic-gradient(#f1eefc_25%,#fff_0_50%,#f1eefc_0_75%,#fff_0)] bg-[length:16px_16px]"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de archivos de marca tal cual */}
                          <img src={url} alt={a.name} className="pixelated max-h-full max-w-full object-contain" loading="lazy" />
                        </div>
                        <div className="flex flex-1 flex-col gap-1 p-3">
                          <p className="text-sm font-semibold text-navy">{a.name}</p>
                          <p className="flex-1 text-xs text-muted">{a.desc}</p>
                          <a href={href} download={`nexus-${a.file}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-purple hover:underline">
                            <Download size={13} /> Descargar
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          <p className="text-xs text-muted">Los sellos de firma solo se descargan con sesión iniciada; no están publicados en la web.</p>
        </div>
      </aside>
    </>
  );
}
