import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/** Tarjeta de las pantallas de acceso, sobre el fondo espacial de la marca. */
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
    <main className="flex min-h-dvh items-center justify-center bg-navy p-6">
      <div className="w-full max-w-sm rounded-2xl bg-surface px-8 py-10 shadow-2xl shadow-black/40">
        <Link href="/" className="mb-6 flex flex-col items-center gap-3" aria-label="Ir al inicio">
          <Image
            src="/marca/portal.png"
            alt=""
            width={248}
            height={327}
            unoptimized
            className="pixelated h-auto w-14"
          />
          <span className="font-pixel text-2xl font-bold tracking-widest text-navy">NEXUS</span>
        </Link>
        <div className="mb-6 h-0.5 rounded-full bg-gradient-to-r from-transparent via-cyan to-transparent" />
        <h1 className="mb-6 text-center text-lg font-semibold text-navy">{title}</h1>
        {children}
        {footer && <div className="mt-6 text-center text-xs text-muted">{footer}</div>}
      </div>
    </main>
  );
}
