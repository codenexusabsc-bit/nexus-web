import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SpaceBackground } from "@/components/space/SpaceBackground";

/** Tarjeta de las pantallas de acceso, sobre el fondo espacial animado de la marca. */
export function AuthCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-navy p-6">
      <SpaceBackground stars={140} shooting={6} seed={11} />

      <div className="rise relative w-full max-w-sm rounded-2xl border border-white/10 bg-surface/95 px-8 py-10 shadow-2xl shadow-purple/30 backdrop-blur">
        <Link href="/" className="mb-6 flex flex-col items-center gap-3" aria-label="Ir al inicio">
          <Image
            src="/marca/portal.png"
            alt=""
            width={248}
            height={327}
            unoptimized
            className="pixelated portal-float h-auto w-16 drop-shadow-[0_0_18px_rgba(147,51,234,0.55)]"
          />
          <span className="font-pixel text-2xl font-bold tracking-widest text-navy">NEXUS</span>
        </Link>
        <div className="mb-6 h-0.5 rounded-full bg-gradient-to-r from-transparent via-cyan to-transparent" />
        <h1 className="rise rise-1 mb-6 text-center text-lg font-semibold text-navy">{title}</h1>
        <div className="rise rise-2">{children}</div>
        {footer && <div className="mt-6 text-center text-xs text-muted">{footer}</div>}
      </div>
    </main>
  );
}
