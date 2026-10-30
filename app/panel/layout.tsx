import { Suspense } from "react";
import { Toaster } from "sonner";
import type { Metadata } from "next";
import { BrandDrawer } from "@/components/BrandDrawer";
import { ActiveNav, NavItems } from "@/components/panel/NavItems";
import { PanelShell } from "@/components/panel/PanelShell";
import { UserMenu } from "@/components/UserMenu";
import { SpaceBackground } from "@/components/space/SpaceBackground";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | Panel Nexus" },
  robots: { index: false, follow: false },
};

/**
 * Layout del panel privado: menú lateral con todas las funciones y contenido al centro.
 * El proxy ya redirige sin sesión; UserMenu vuelve a verificarla en servidor.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PanelShell
        background={<SpaceBackground stars={60} shooting={3} seed={3} />}
        nav={
          <Suspense fallback={<NavItems />}>
            <ActiveNav />
          </Suspense>
        }
        brand={<BrandDrawer />}
        userMenu={
          <Suspense fallback={<div className="h-9" />}>
            <UserMenu />
          </Suspense>
        }
      >
        {children}
      </PanelShell>
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
