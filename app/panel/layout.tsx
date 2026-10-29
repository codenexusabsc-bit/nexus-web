import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { UserMenu } from "@/components/UserMenu";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | Panel Nexus" },
  robots: { index: false, follow: false },
};

/**
 * Layout del panel privado. El proxy ya redirige sin sesión;
 * UserMenu vuelve a verificarla en servidor (getCurrentUser).
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between bg-navy px-4 py-3 sm:px-8">
        <Link href="/panel" className="flex items-center gap-3" aria-label="Inicio del panel">
          <Image src="/marca/portal.png" alt="" width={248} height={327} unoptimized className="pixelated h-auto w-7" />
          <span className="leading-tight">
            <span className="block font-pixel text-lg font-bold tracking-widest text-white">NEXUS</span>
            <span className="block font-pixel text-[0.6rem] tracking-[0.3em] text-cyan">PANEL</span>
          </span>
        </Link>
        <Suspense fallback={<div className="h-9" />}>
          <UserMenu />
        </Suspense>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
