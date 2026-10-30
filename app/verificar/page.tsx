import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SpaceBackground } from "@/components/space/SpaceBackground";
import { VerifyForm } from "@/components/firmas/VerifyForm";

export const metadata: Metadata = {
  title: "Verificar documento firmado",
  description: "Comprueba que un PDF firmado por Nexus Ingeniería no fue modificado.",
};

export default function VerificarPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-navy px-4 py-10">
      <SpaceBackground stars={100} shooting={5} seed={61} />
      <div className="relative mx-auto flex max-w-xl flex-col gap-6">
        <Link href="/" className="flex items-center gap-3 text-white">
          <Image src="/marca/portal.png" alt="" width={248} height={327} unoptimized className="pixelated portal-float h-auto w-9" />
          <span className="leading-tight">
            <span className="block font-pixel text-xl font-bold tracking-widest">NEXUS</span>
            <span className="block font-pixel text-[0.6rem] tracking-[0.3em] text-cyan">VERIFICAR FIRMA</span>
          </span>
        </Link>
        <div className="rise rounded-2xl bg-surface p-6 shadow-2xl">
          <h1 className="mb-1 text-xl font-bold text-navy">¿Este PDF es auténtico?</h1>
          <p className="mb-5 text-sm text-muted">Sube un documento firmado por Nexus Ingeniería y te decimos si coincide exactamente con el que se selló.</p>
          <VerifyForm />
        </div>
      </div>
    </main>
  );
}
