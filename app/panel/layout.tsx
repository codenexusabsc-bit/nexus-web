import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Toaster } from "sonner";
import type { Metadata } from "next";
import { BrandDrawer } from "@/components/BrandDrawer";
import { NavLinks, PanelNav } from "@/components/PanelNav";
import { UserMenu } from "@/components/UserMenu";
import { SpaceBackground } from "@/components/space/SpaceBackground";

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
      <header className="relative flex items-center justify-between overflow-hidden bg-navy px-4 py-3 sm:px-8">
        <SpaceBackground stars={45} shooting={2} seed={3} />
        <Link href="/panel" className="relative flex items-center gap-3" aria-label="Inicio del panel">
          <Image src="/marca/portal.png" alt="" width={248} height={327} unoptimized className="pixelated portal-float h-auto w-7" />
          <span className="leading-tight">
            <span className="block font-pixel text-lg font-bold tracking-widest text-white">NEXUS</span>
            <span className="block font-pixel text-[0.6rem] tracking-[0.3em] text-cyan">PANEL</span>
          </span>
        </Link>
        <div className="relative flex items-center gap-2">
          <BrandDrawer />
          <Suspense fallback={<div className="h-9" />}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <Suspense fallback={<NavLinks />}>
        <PanelNav />
      </Suspense>
      <main className="rise mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
